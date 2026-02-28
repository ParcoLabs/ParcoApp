import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_ADMIN_USER, TEST_TOKENIZER_USER, createMockPrisma } from './helpers';

const mockPrisma = createMockPrisma();
vi.mock('../lib/prisma', () => ({ default: mockPrisma }));
vi.mock('../services/templateSeeder', () => ({
  seedCaseFromTemplate: vi.fn().mockResolvedValue({ requiredDocTypes: ['DEED', 'APPRAISAL'] }),
  mockSeedResult: vi.fn(),
}));
vi.mock('../services/eligibilityEngine', () => ({
  runEligibility: vi.fn(),
  mockRunEligibility: vi.fn(),
}));
vi.mock('../services/docTextExtractor', () => ({
  extractTextFromIssuanceDocument: vi.fn(),
}));
vi.mock('../services/llmExtraction', () => ({
  extractFieldsFromText: vi.fn(),
}));
vi.mock('../services/criticalFields', () => ({
  getCriticalKeys: vi.fn().mockReturnValue([]),
  checkCriticalFieldsVerified: vi.fn().mockReturnValue(true),
}));
vi.mock('../services/offeringPacket', () => ({
  generateOfferingPacket: vi.fn(),
}));
vi.mock('../services/extractionQuality', () => ({
  computeExtractionQuality: vi.fn(),
}));

import request from 'supertest';
import express from 'express';

let app: express.Express;

beforeEach(async () => {
  vi.clearAllMocks();
  app = express();
  app.use(express.json());
  const { clerkMiddleware } = await import('@clerk/express');
  app.use(clerkMiddleware({ publishableKey: 'pk_test_fake', secretKey: 'sk_test_fake' }));
  const issuanceModule = await import('../routes/issuance');
  app.use('/api/issuance', issuanceModule.default);
});

describe('POST /api/issuance/by-submission/:submissionId/create', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/issuance/by-submission/sub1/create')
      .set('x-test-clerk-id', 'none')
      .send();

    expect(res.status).toBe(401);
  });

  it('returns 404 when submission does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.tokenizationSubmission.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/issuance/by-submission/nonexistent/create')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns existing case if one already exists', async () => {
    const existingCase = { id: 'case_1', submissionId: 'sub1', status: 'INTAKE_COMPLETE' };
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.tokenizationSubmission.findUnique.mockResolvedValue({
      id: 'sub1',
      tokenizerId: TEST_ADMIN_USER.id,
    });
    mockPrisma.issuanceCase.findUnique.mockResolvedValue(existingCase);

    const res = await request(app)
      .post('/api/issuance/by-submission/sub1/create')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('case_1');
  });

  it('creates a new issuance case for admin', async () => {
    const newCase = { id: 'case_new', submissionId: 'sub2', status: 'INTAKE_COMPLETE', eligibilityStatus: 'PENDING' };
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.tokenizationSubmission.findUnique.mockResolvedValue({
      id: 'sub2',
      tokenizerId: TEST_TOKENIZER_USER.id,
    });
    mockPrisma.issuanceCase.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...newCase, checklistItems: [], approvalTasks: [] });
    mockPrisma.issuanceCase.create.mockResolvedValue(newCase);

    const res = await request(app)
      .post('/api/issuance/by-submission/sub2/create')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requiredDocTypes).toEqual(['DEED', 'APPRAISAL']);
    expect(mockPrisma.issuanceCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ submissionId: 'sub2', status: 'INTAKE_COMPLETE' }),
      }),
    );
  });

  it('returns 403 when tokenizer tries to create case for another submission', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_TOKENIZER_USER);
    mockPrisma.tokenizationSubmission.findUnique.mockResolvedValue({
      id: 'sub3',
      tokenizerId: 'other_tokenizer_id',
    });

    const res = await request(app)
      .post('/api/issuance/by-submission/sub3/create')
      .set('x-test-clerk-id', TEST_TOKENIZER_USER.clerkId)
      .send();

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
