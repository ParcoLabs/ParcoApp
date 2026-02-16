import prisma from '../lib/prisma';

interface EligibilityCheckResult {
  key: string;
  status: 'PASS' | 'FAIL' | 'NEEDS_REVIEW';
  details: string | null;
}

interface EligibilityRunResult {
  caseId: string;
  eligibilityStatus: 'PASS' | 'FAIL' | 'NEEDS_REVIEW';
  checks: EligibilityCheckResult[];
}

interface TemplateRules {
  requiredDocTypes: string[];
  criticalKeys: string[];
  approvals: string[];
  defaultPriceCapCents: number | null;
  maxInvestors: number | null;
  accreditationRequired: boolean;
}

export async function runEligibility(caseId: string): Promise<EligibilityRunResult> {
  const issuanceCase = await prisma.issuanceCase.findUnique({
    where: { id: caseId },
    include: {
      submission: true,
      documents: true,
    },
  });

  if (!issuanceCase) {
    throw new Error(`IssuanceCase not found: ${caseId}`);
  }

  const template = await prisma.issuanceTemplate.findUnique({
    where: { track: issuanceCase.track },
  });

  const rules: TemplateRules | null = template
    ? (template.rules as unknown as TemplateRules)
    : null;

  const checks: EligibilityCheckResult[] = [];

  checks.push(await checkStateEnabled(issuanceCase));
  checks.push(await checkPriceCap(issuanceCase));
  checks.push(checkDocSetComplete(issuanceCase, rules));
  checks.push(checkCriticalFieldsPresent(issuanceCase, rules));

  for (const check of checks) {
    await prisma.eligibilityCheck.upsert({
      where: { caseId_key: { caseId, key: check.key } },
      create: {
        caseId,
        key: check.key,
        status: check.status,
        details: check.details,
      },
      update: {
        status: check.status,
        details: check.details,
      },
    });
  }

  let eligibilityStatus: 'PASS' | 'FAIL' | 'NEEDS_REVIEW' = 'PASS';
  if (checks.some((c) => c.status === 'FAIL')) {
    eligibilityStatus = 'FAIL';
  } else if (checks.some((c) => c.status === 'NEEDS_REVIEW')) {
    eligibilityStatus = 'NEEDS_REVIEW';
  }

  await prisma.issuanceCase.update({
    where: { id: caseId },
    data: { eligibilityStatus },
  });

  return { caseId, eligibilityStatus, checks };
}

async function checkStateEnabled(issuanceCase: any): Promise<EligibilityCheckResult> {
  if (issuanceCase.track !== 'SERIES_LLC') {
    return { key: 'state_enabled', status: 'PASS', details: `Track ${issuanceCase.track} does not require state LLC profile` };
  }

  const stateProfile = await prisma.stateSeriesLlcProfile.findUnique({
    where: { state: issuanceCase.targetState },
  });

  if (!stateProfile) {
    return { key: 'state_enabled', status: 'FAIL', details: `No state profile found for ${issuanceCase.targetState}` };
  }

  if (!stateProfile.isEnabled) {
    return { key: 'state_enabled', status: 'FAIL', details: `State ${issuanceCase.targetState} is not enabled for Series LLC` };
  }

  return { key: 'state_enabled', status: 'PASS', details: `State ${issuanceCase.targetState} is enabled` };
}

async function checkPriceCap(issuanceCase: any): Promise<EligibilityCheckResult> {
  if (!issuanceCase.maxPropertyPriceCents) {
    return { key: 'price_cap', status: 'NEEDS_REVIEW', details: 'No cap set' };
  }

  let propertyValueCents: number | null = null;

  if (issuanceCase.submission?.totalValue) {
    const totalValue = parseFloat(String(issuanceCase.submission.totalValue));
    if (!isNaN(totalValue) && totalValue > 0) {
      propertyValueCents = Math.round(totalValue * 100);
    }
  }

  if (propertyValueCents === null) {
    return { key: 'price_cap', status: 'NEEDS_REVIEW', details: 'No property value found on submission' };
  }

  if (propertyValueCents <= issuanceCase.maxPropertyPriceCents) {
    return {
      key: 'price_cap',
      status: 'PASS',
      details: `Property value $${(propertyValueCents / 100).toLocaleString()} <= cap $${(issuanceCase.maxPropertyPriceCents / 100).toLocaleString()}`,
    };
  }

  return {
    key: 'price_cap',
    status: 'FAIL',
    details: `Property value $${(propertyValueCents / 100).toLocaleString()} exceeds cap $${(issuanceCase.maxPropertyPriceCents / 100).toLocaleString()}`,
  };
}

function checkDocSetComplete(issuanceCase: any, rules: TemplateRules | null): EligibilityCheckResult {
  if (!rules || !rules.requiredDocTypes || rules.requiredDocTypes.length === 0) {
    return { key: 'doc_set_complete', status: 'PASS', details: 'No required document types defined' };
  }

  const existingDocTypes = new Set(
    (issuanceCase.documents || []).map((doc: any) => doc.type),
  );

  const missing = rules.requiredDocTypes.filter((t: string) => !existingDocTypes.has(t));

  if (missing.length === 0) {
    return { key: 'doc_set_complete', status: 'PASS', details: `All ${rules.requiredDocTypes.length} required document types present` };
  }

  return {
    key: 'doc_set_complete',
    status: 'NEEDS_REVIEW',
    details: `Missing document types: ${missing.join(', ')}`,
  };
}

function checkCriticalFieldsPresent(issuanceCase: any, rules: TemplateRules | null): EligibilityCheckResult {
  if (!rules || !rules.criticalKeys || rules.criticalKeys.length === 0) {
    return { key: 'critical_fields_present', status: 'PASS', details: 'No critical fields defined' };
  }

  const submission = issuanceCase.submission;
  if (!submission) {
    return { key: 'critical_fields_present', status: 'NEEDS_REVIEW', details: 'No submission linked to case' };
  }

  const presentKeys = new Set<string>();

  if (submission.propertyName) presentKeys.add('title_clear');
  if (submission.totalValue && parseFloat(String(submission.totalValue)) > 0) presentKeys.add('property_appraisal');
  if (submission.ownershipProof) presentKeys.add('operating_agreement');
  if (submission.legalDocuments && submission.legalDocuments.length > 0) presentKeys.add('llc_formation');

  if (submission.financialStatements && submission.financialStatements.length > 0) {
    presentKeys.add('financial_statements_reviewed');
    presentKeys.add('audited_financials');
  }

  if (submission.documents && submission.documents.length > 0) {
    presentKeys.add('accreditation_verification');
    presentKeys.add('ppm_filing');
    presentKeys.add('form_d_sec');
    presentKeys.add('subscription_agreement');
    presentKeys.add('form_c_filing');
    presentKeys.add('portal_agreement');
    presentKeys.add('investor_limits');
    presentKeys.add('form_1a_filing');
    presentKeys.add('sec_qualification');
    presentKeys.add('offering_circular');
  }

  const missing = rules.criticalKeys.filter((k: string) => !presentKeys.has(k));

  if (missing.length === 0) {
    return { key: 'critical_fields_present', status: 'PASS', details: `All ${rules.criticalKeys.length} critical fields present` };
  }

  return {
    key: 'critical_fields_present',
    status: 'NEEDS_REVIEW',
    details: `Missing critical fields: ${missing.map(k => k.replace(/_/g, ' ')).join(', ')}`,
  };
}

export function mockRunEligibility(caseId: string, targetState = 'NV'): EligibilityRunResult {
  const fakePropertyValue = 45000000;
  const fakePriceCap = 50000000;

  const stateEnabled = targetState === 'NV' || targetState === 'FL' || targetState === 'WY';

  const checks: EligibilityCheckResult[] = [
    {
      key: 'state_enabled',
      status: stateEnabled ? 'PASS' : 'FAIL',
      details: stateEnabled
        ? `State ${targetState} is enabled`
        : `State ${targetState} is not enabled for Series LLC`,
    },
    {
      key: 'price_cap',
      status: fakePropertyValue <= fakePriceCap ? 'PASS' : 'FAIL',
      details: `Property value $${(fakePropertyValue / 100).toLocaleString()} <= cap $${(fakePriceCap / 100).toLocaleString()}`,
    },
    {
      key: 'doc_set_complete',
      status: 'NEEDS_REVIEW',
      details: 'Missing document types: FINANCIAL',
    },
    {
      key: 'critical_fields_present',
      status: 'PASS',
      details: 'All 4 critical fields present',
    },
  ];

  let eligibilityStatus: 'PASS' | 'FAIL' | 'NEEDS_REVIEW' = 'PASS';
  if (checks.some((c) => c.status === 'FAIL')) {
    eligibilityStatus = 'FAIL';
  } else if (checks.some((c) => c.status === 'NEEDS_REVIEW')) {
    eligibilityStatus = 'NEEDS_REVIEW';
  }

  return { caseId, eligibilityStatus, checks };
}
