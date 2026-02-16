import prisma from '../lib/prisma';

interface TemplateRules {
  requiredDocTypes: string[];
  criticalKeys: string[];
  approvals: string[];
  defaultPriceCapCents: number | null;
  maxInvestors: number | null;
  accreditationRequired: boolean;
}

interface SeedResult {
  caseId: string;
  track: string;
  checklistItemsCreated: number;
  approvalTasksCreated: number;
  requiredDocTypes: string[];
}

const CHECKLIST_LABELS: Record<string, { label: string; ownerRole: string }> = {
  title_clear: { label: 'Clear Title Verification', ownerRole: 'LEGAL' },
  llc_formation: { label: 'LLC Formation Filing', ownerRole: 'LEGAL' },
  operating_agreement: { label: 'Operating Agreement Drafting', ownerRole: 'LEGAL' },
  property_appraisal: { label: 'Property Appraisal Report', ownerRole: 'OPS' },
  accreditation_verification: { label: 'Investor Accreditation Verification', ownerRole: 'COMPLIANCE' },
  ppm_filing: { label: 'Private Placement Memorandum', ownerRole: 'LEGAL' },
  form_d_sec: { label: 'SEC Form D Filing', ownerRole: 'COMPLIANCE' },
  subscription_agreement: { label: 'Subscription Agreement', ownerRole: 'LEGAL' },
  form_c_filing: { label: 'SEC Form C Filing', ownerRole: 'COMPLIANCE' },
  portal_agreement: { label: 'Funding Portal Agreement', ownerRole: 'OPS' },
  financial_statements_reviewed: { label: 'Financial Statements Review', ownerRole: 'ACCOUNTING' },
  investor_limits: { label: 'Investor Limits Validation', ownerRole: 'COMPLIANCE' },
  form_1a_filing: { label: 'SEC Form 1-A Filing', ownerRole: 'COMPLIANCE' },
  sec_qualification: { label: 'SEC Qualification Review', ownerRole: 'LEGAL' },
  audited_financials: { label: 'Audited Financial Statements', ownerRole: 'ACCOUNTING' },
  offering_circular: { label: 'Offering Circular Preparation', ownerRole: 'LEGAL' },
};

export async function seedCaseFromTemplate(caseId: string): Promise<SeedResult> {
  const issuanceCase = await prisma.issuanceCase.findUnique({
    where: { id: caseId },
    include: {
      checklistItems: true,
      approvalTasks: true,
    },
  });

  if (!issuanceCase) {
    throw new Error(`IssuanceCase not found: ${caseId}`);
  }

  const template = await prisma.issuanceTemplate.findUnique({
    where: { track: issuanceCase.track },
  });

  if (!template) {
    throw new Error(`IssuanceTemplate not found for track: ${issuanceCase.track}`);
  }

  const rules = template.rules as unknown as TemplateRules;
  const existingChecklistKeys = new Set(issuanceCase.checklistItems.map(c => c.key));
  const existingApprovalRoles = new Set(issuanceCase.approvalTasks.map(a => a.role));

  let checklistItemsCreated = 0;
  for (const key of rules.criticalKeys) {
    if (existingChecklistKeys.has(key)) continue;

    const meta = CHECKLIST_LABELS[key] || { label: key.replace(/_/g, ' '), ownerRole: 'OPS' };

    await prisma.checklistItem.create({
      data: {
        caseId,
        key,
        label: meta.label,
        ownerRole: meta.ownerRole as any,
        status: 'PENDING',
      },
    });
    checklistItemsCreated++;
  }

  let approvalTasksCreated = 0;
  for (const role of rules.approvals) {
    if (existingApprovalRoles.has(role as any)) continue;

    await prisma.approvalTask.create({
      data: {
        caseId,
        role: role as any,
        status: 'PENDING',
      },
    });
    approvalTasksCreated++;
  }

  if (rules.defaultPriceCapCents && !issuanceCase.maxPropertyPriceCents) {
    await prisma.issuanceCase.update({
      where: { id: caseId },
      data: { maxPropertyPriceCents: rules.defaultPriceCapCents },
    });
  }

  return {
    caseId,
    track: issuanceCase.track,
    checklistItemsCreated,
    approvalTasksCreated,
    requiredDocTypes: rules.requiredDocTypes,
  };
}

export function mockSeedResult(caseId: string, track = 'SERIES_LLC'): SeedResult {
  const trackRules: Record<string, { criticalKeys: string[]; approvals: string[]; requiredDocTypes: string[] }> = {
    SERIES_LLC: {
      criticalKeys: ['title_clear', 'llc_formation', 'operating_agreement', 'property_appraisal'],
      approvals: ['OPS', 'LEGAL', 'ACCOUNTING', 'COMPLIANCE'],
      requiredDocTypes: ['OWNERSHIP', 'LEGAL', 'FINANCIAL', 'PROPERTY'],
    },
    REG_D: {
      criticalKeys: ['accreditation_verification', 'ppm_filing', 'form_d_sec', 'subscription_agreement'],
      approvals: ['OPS', 'LEGAL', 'ACCOUNTING', 'COMPLIANCE'],
      requiredDocTypes: ['OWNERSHIP', 'LEGAL', 'FINANCIAL', 'PROPERTY', 'IDENTITY'],
    },
    REG_CF: {
      criticalKeys: ['form_c_filing', 'portal_agreement', 'financial_statements_reviewed', 'investor_limits'],
      approvals: ['OPS', 'LEGAL', 'ACCOUNTING', 'COMPLIANCE'],
      requiredDocTypes: ['OWNERSHIP', 'LEGAL', 'FINANCIAL', 'PROPERTY'],
    },
    REG_A: {
      criticalKeys: ['form_1a_filing', 'sec_qualification', 'audited_financials', 'offering_circular'],
      approvals: ['OPS', 'LEGAL', 'ACCOUNTING', 'COMPLIANCE'],
      requiredDocTypes: ['OWNERSHIP', 'LEGAL', 'FINANCIAL', 'PROPERTY', 'IDENTITY'],
    },
  };

  const rules = trackRules[track] || trackRules.SERIES_LLC;
  return {
    caseId,
    track,
    checklistItemsCreated: rules.criticalKeys.length,
    approvalTasksCreated: rules.approvals.length,
    requiredDocTypes: rules.requiredDocTypes,
  };
}
