import { vi } from 'vitest';

export function createMockPrisma() {
  const mock: any = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    property: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    tokenizationSubmission: {
      findUnique: vi.fn(),
    },
    issuanceCase: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    issuanceDocument: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    extractionRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
    extractedField: {
      create: vi.fn().mockResolvedValue({}),
      createMany: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({}),
      findMany: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    servicingReportRun: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    reportApproval: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    holding: {
      findFirst: vi.fn(),
    },
    blockchainActionRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $disconnect: vi.fn(),
  };
  return mock;
}

export const TEST_ADMIN_USER = {
  id: 'test_admin_db_id',
  clerkId: 'test_clerk_admin_1',
  email: 'admin@test.com',
  role: 'ADMIN' as const,
  firstName: 'Test',
  lastName: 'Admin',
};

export const TEST_TOKENIZER_USER = {
  id: 'test_tokenizer_db_id',
  clerkId: 'test_clerk_tokenizer_1',
  email: 'tokenizer@test.com',
  role: 'TOKENIZER' as const,
  firstName: 'Test',
  lastName: 'Tokenizer',
};

export const TEST_USER = {
  id: 'test_user_db_id',
  clerkId: 'test_clerk_user_1',
  email: 'user@test.com',
  role: 'USER' as const,
  firstName: 'Test',
  lastName: 'User',
};
