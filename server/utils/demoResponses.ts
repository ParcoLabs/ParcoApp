export interface DemoIssuanceCase {
  id: string;
  propertyId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  tokenSymbol: string;
  totalTokens: number;
  tokenPrice: number;
  totalValue: number;
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
  return {
    id: `demo_issuance_${Date.now()}`,
    propertyId: 'demo_property_001',
    status: 'DRAFT',
    tokenSymbol: 'PRCO-001',
    totalTokens: 1000,
    tokenPrice: 50,
    totalValue: 50000,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
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
