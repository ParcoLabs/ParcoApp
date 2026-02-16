export interface DemoIssuanceCase {
  id: string;
  propertyId: string;
  status: 'DRAFT' | 'INTAKE_COMPLETE' | 'EXTRACTION_RUNNING' | 'EXTRACTION_COMPLETE' | 'REVIEW_READY' | 'APPROVED' | 'MINT_READY' | 'MINTED' | 'LIVE' | 'REJECTED';
  eligibilityStatus: 'PENDING' | 'PASS' | 'FAIL' | 'NEEDS_REVIEW';
  extractionScore: number;
  tokenSymbol: string;
  totalTokens: number;
  tokenPrice: number;
  totalValue: number;
  track: string;
  targetState: string;
  maxPropertyPriceCents: number | null;
  eligibilityNotes: string | null;
  checklistItems: Array<{ id: string; key: string; label: string; ownerRole: string; status: string }>;
  approvalTasks: Array<{ id: string; role: string; status: string }>;
  requiredDocTypes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DemoEligibilityResult {
  eligible: boolean;
  userId: string;
  kycLevel: string;
  accreditationStatus: string;
  maxInvestment: number;
  reasons: string[];
}

export interface DemoExtractionRunStatus {
  runId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  documentsProcessed: number;
  documentsTotal: number;
  extractedFields: number;
  errors: string[];
  startedAt: string;
  completedAt: string | null;
}

export function mockIssuanceCase(overrides?: Partial<DemoIssuanceCase>): DemoIssuanceCase {
  const now = new Date().toISOString();
  const track = overrides?.track || 'SERIES_LLC';
  return {
    id: `demo_issuance_${Date.now()}`,
    propertyId: 'demo_property_001',
    status: 'DRAFT',
    eligibilityStatus: 'PENDING',
    extractionScore: 0,
    tokenSymbol: 'PRCO-001',
    totalTokens: 1000,
    tokenPrice: 50,
    totalValue: 50000,
    track,
    targetState: 'OTHER',
    maxPropertyPriceCents: track === 'SERIES_LLC' ? 50000000 : null,
    eligibilityNotes: null,
    checklistItems: getMockChecklistItems(track),
    approvalTasks: getMockApprovalTasks(),
    requiredDocTypes: getMockRequiredDocTypes(track),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function getMockChecklistItems(track: string) {
  const keysByTrack: Record<string, Array<{ key: string; label: string; ownerRole: string }>> = {
    SERIES_LLC: [
      { key: 'title_clear', label: 'Clear Title Verification', ownerRole: 'LEGAL' },
      { key: 'llc_formation', label: 'LLC Formation Filing', ownerRole: 'LEGAL' },
      { key: 'operating_agreement', label: 'Operating Agreement Drafting', ownerRole: 'LEGAL' },
      { key: 'property_appraisal', label: 'Property Appraisal Report', ownerRole: 'OPS' },
    ],
    REG_D: [
      { key: 'accreditation_verification', label: 'Investor Accreditation Verification', ownerRole: 'COMPLIANCE' },
      { key: 'ppm_filing', label: 'Private Placement Memorandum', ownerRole: 'LEGAL' },
      { key: 'form_d_sec', label: 'SEC Form D Filing', ownerRole: 'COMPLIANCE' },
      { key: 'subscription_agreement', label: 'Subscription Agreement', ownerRole: 'LEGAL' },
    ],
    REG_CF: [
      { key: 'form_c_filing', label: 'SEC Form C Filing', ownerRole: 'COMPLIANCE' },
      { key: 'portal_agreement', label: 'Funding Portal Agreement', ownerRole: 'OPS' },
      { key: 'financial_statements_reviewed', label: 'Financial Statements Review', ownerRole: 'ACCOUNTING' },
      { key: 'investor_limits', label: 'Investor Limits Validation', ownerRole: 'COMPLIANCE' },
    ],
    REG_A: [
      { key: 'form_1a_filing', label: 'SEC Form 1-A Filing', ownerRole: 'COMPLIANCE' },
      { key: 'sec_qualification', label: 'SEC Qualification Review', ownerRole: 'LEGAL' },
      { key: 'audited_financials', label: 'Audited Financial Statements', ownerRole: 'ACCOUNTING' },
      { key: 'offering_circular', label: 'Offering Circular Preparation', ownerRole: 'LEGAL' },
    ],
  };
  const items = keysByTrack[track] || keysByTrack.SERIES_LLC;
  return items.map((item, i) => ({
    id: `demo_checklist_${i}`,
    ...item,
    status: 'PENDING',
  }));
}

function getMockApprovalTasks() {
  return ['OPS', 'LEGAL', 'ACCOUNTING', 'COMPLIANCE'].map((role, i) => ({
    id: `demo_approval_${i}`,
    role,
    status: 'PENDING',
  }));
}

function getMockRequiredDocTypes(track: string) {
  const base = ['OWNERSHIP', 'LEGAL', 'FINANCIAL', 'PROPERTY'];
  if (track === 'REG_D' || track === 'REG_A') return [...base, 'IDENTITY'];
  return base;
}

export function mockEligibilityCheck(
  userId: string,
  overrides?: Partial<DemoEligibilityResult>,
): DemoEligibilityResult {
  return {
    eligible: true,
    userId,
    kycLevel: 'VERIFIED',
    accreditationStatus: 'ACCREDITED',
    maxInvestment: 50000,
    reasons: [],
    ...overrides,
  };
}

export function mockExtractionRunStatus(
  runId?: string,
  overrides?: Partial<DemoExtractionRunStatus>,
): DemoExtractionRunStatus {
  const now = new Date().toISOString();
  return {
    runId: runId || `demo_run_${Date.now()}`,
    status: 'COMPLETED',
    documentsProcessed: 5,
    documentsTotal: 5,
    extractedFields: 42,
    errors: [],
    startedAt: now,
    completedAt: now,
    ...overrides,
  };
}
