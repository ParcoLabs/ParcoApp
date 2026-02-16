import prisma from '../lib/prisma';

interface ComplianceRule {
  key: string;
  label: string;
  cadence: string;
}

interface CompliancePackRules {
  requirements: ComplianceRule[];
}

function getNextDueDate(cadence: string): Date {
  const now = new Date();
  switch (cadence) {
    case 'MONTHLY':
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    case 'QUARTERLY':
      const nextQ = Math.ceil((now.getMonth() + 1) / 3) * 3;
      return new Date(now.getFullYear(), nextQ, 1);
    case 'ANNUAL':
      return new Date(now.getFullYear() + 1, 0, 1);
    case 'SEMI_ANNUAL':
      const nextHalf = now.getMonth() < 6 ? 6 : 12;
      const year = nextHalf === 12 ? now.getFullYear() + 1 : now.getFullYear();
      return new Date(year, nextHalf % 12, 1);
    default:
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
}

export async function applyCompliancePack(caseId: string, propertyId: string) {
  const issuanceCase = await prisma.issuanceCase.findUnique({
    where: { id: caseId },
  });

  if (!issuanceCase) {
    throw new Error(`IssuanceCase not found: ${caseId}`);
  }

  const template = await prisma.compliancePackTemplate.findUnique({
    where: { track: issuanceCase.track },
  });

  if (!template) {
    throw new Error(`CompliancePackTemplate not found for track: ${issuanceCase.track}`);
  }

  const rules = template.rules as unknown as CompliancePackRules;
  const created: any[] = [];

  for (const req of rules.requirements) {
    const existing = await prisma.complianceRequirement.findFirst({
      where: { propertyId, key: req.key },
    });

    if (existing) continue;

    const item = await prisma.complianceRequirement.create({
      data: {
        propertyId,
        caseId,
        key: req.key,
        label: req.label,
        cadence: req.cadence,
        status: 'PENDING',
        dueAt: getNextDueDate(req.cadence),
      },
    });
    created.push(item);
  }

  return {
    propertyId,
    caseId,
    track: issuanceCase.track,
    requirementsCreated: created.length,
    totalRequirements: rules.requirements.length,
  };
}

export function mockComplianceRequirements(propertyId: string) {
  const now = new Date();
  return [
    {
      id: `demo_cr_1`,
      propertyId,
      caseId: null,
      key: 'monthly_kpi',
      label: 'Monthly KPI Report',
      cadence: 'MONTHLY',
      status: 'PENDING',
      dueAt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      notes: null,
      evidence: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: `demo_cr_2`,
      propertyId,
      caseId: null,
      key: 'quarterly_ops_update',
      label: 'Quarterly Operations Update',
      cadence: 'QUARTERLY',
      status: 'COMPLETED',
      dueAt: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      notes: 'Q4 report submitted on time',
      evidence: [
        { id: 'demo_ev_1', name: 'Q4_ops_report.pdf', url: '/uploads/demo/q4_ops_report.pdf', createdAt: now.toISOString() },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: `demo_cr_3`,
      propertyId,
      caseId: null,
      key: 'annual_summary',
      label: 'Annual Financial Summary',
      cadence: 'ANNUAL',
      status: 'PENDING',
      dueAt: new Date(now.getFullYear() + 1, 0, 1).toISOString(),
      notes: null,
      evidence: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: `demo_cr_4`,
      propertyId,
      caseId: null,
      key: 'investor_notice',
      label: 'Annual Investor Notice',
      cadence: 'ANNUAL',
      status: 'OVERDUE',
      dueAt: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString(),
      notes: null,
      evidence: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: `demo_cr_5`,
      propertyId,
      caseId: null,
      key: 'transfer_restriction_review',
      label: 'Transfer Restriction Review',
      cadence: 'SEMI_ANNUAL',
      status: 'PENDING',
      dueAt: new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString(),
      notes: null,
      evidence: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
}
