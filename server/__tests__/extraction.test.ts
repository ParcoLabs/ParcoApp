import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_ADMIN_USER, createMockPrisma } from './helpers';

const mockPrisma = createMockPrisma();
vi.mock('../lib/prisma', () => ({ default: mockPrisma }));
vi.mock('../services/templateSeeder', () => ({
  seedCaseFromTemplate: vi.fn().mockResolvedValue({ requiredDocTypes: [] }),
  mockSeedResult: vi.fn(),
}));
vi.mock('../services/eligibilityEngine', () => ({
  runEligibility: vi.fn(),
  mockRunEligibility: vi.fn(),
}));

const mockExtractText = vi.fn();
vi.mock('../services/docTextExtractor', () => ({
  extractTextFromIssuanceDocument: mockExtractText,
}));

const mockExtractFields = vi.fn();
vi.mock('../services/llmExtraction', () => ({
  extractFieldsFromText: mockExtractFields,
}));

vi.mock('../services/criticalFields', () => ({
  getCriticalKeys: vi.fn().mockReturnValue([]),
  checkCriticalFieldsVerified: vi.fn().mockReturnValue(true),
}));
vi.mock('../services/offeringPacket', () => ({
  generateOfferingPacket: vi.fn(),
}));

const mockComputeQuality = vi.fn();
vi.mock('../services/extractionQuality', () => ({
  computeExtractionQuality: mockComputeQuality,
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

describe('POST /api/issuance/case/:caseId/extract', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/issuance/case/case1/extract')
      .set('x-test-clerk-id', 'none')
      .send();

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...TEST_ADMIN_USER,
      role: 'USER',
    });

    const res = await request(app)
      .post('/api/issuance/case/case1/extract')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    expect(res.status).toBe(403);
  });

  it('runs extraction and creates run record', async () => {
    const caseId = 'case_extract_1';
    const doc1 = { id: 'doc1', name: 'deed.pdf', type: 'DEED', url: 'issuance/case1/deed.pdf', caseId };
    const extractionRun = { id: 'run_1', caseId, status: 'RUNNING', startedAt: new Date() };

    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.issuanceDocument.findMany.mockResolvedValue([doc1]);
    mockPrisma.extractionRun.create.mockResolvedValue(extractionRun);
    mockPrisma.extractionRun.update.mockResolvedValue({ ...extractionRun, status: 'SUCCEEDED' });
    mockPrisma.issuanceCase.findUnique.mockResolvedValue({ id: caseId, status: 'INTAKE_COMPLETE', documents: [doc1] });
    mockPrisma.issuanceCase.update = vi.fn().mockResolvedValue({ id: caseId, status: 'EXTRACTION_RUNNING' });

    mockExtractText.mockResolvedValue({ status: 'EXTRACTED', text: 'Deed text content' });
    mockPrisma.issuanceDocument.findMany.mockResolvedValue([{ ...doc1, textContent: 'Deed text content', textStatus: 'EXTRACTED' }]);
    mockExtractFields.mockResolvedValue({
      method: 'regex-fallback',
      fields: [{ key: 'property_address', value: '123 Main St', confidence: 0.95 }],
    });
    mockPrisma.extractedField.create.mockResolvedValue({});
    mockPrisma.auditEvent.create.mockResolvedValue({});
    mockComputeQuality.mockResolvedValue({ score: 0.9, grade: 'A', extractionScore: 0.9, extractionQualityStatus: 'GOOD', details: {} });

    const res = await request(app)
      .post(`/api/issuance/case/${caseId}/extract`)
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.extractionRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ caseId, status: 'RUNNING' }),
      }),
    );
  });

  it('is idempotent — second call creates a new run', async () => {
    const caseId = 'case_idem_1';
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.issuanceCase.findUnique.mockResolvedValue({ id: caseId, status: 'EXTRACTION_COMPLETE', documents: [] });
    mockPrisma.issuanceCase.update = vi.fn().mockResolvedValue({ id: caseId, status: 'EXTRACTION_RUNNING' });

    const run1 = { id: 'run_1', caseId, status: 'RUNNING', startedAt: new Date() };
    const run2 = { id: 'run_2', caseId, status: 'RUNNING', startedAt: new Date() };

    mockPrisma.extractionRun.create
      .mockResolvedValueOnce(run1)
      .mockResolvedValueOnce(run2);
    mockPrisma.extractionRun.update.mockResolvedValue({ status: 'SUCCEEDED' });
    mockComputeQuality.mockResolvedValue({ score: 1.0, grade: 'A', extractionScore: 1.0, extractionQualityStatus: 'GOOD', details: {} });

    const res1 = await request(app)
      .post(`/api/issuance/case/${caseId}/extract`)
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    const res2 = await request(app)
      .post(`/api/issuance/case/${caseId}/extract`)
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(mockPrisma.extractionRun.create).toHaveBeenCalledTimes(2);
  });
});
