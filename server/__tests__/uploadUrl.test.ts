import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_ADMIN_USER, createMockPrisma } from './helpers';

const mockPrisma = createMockPrisma();
vi.mock('../lib/prisma', () => ({ default: mockPrisma }));
vi.mock('../storage/storage', () => ({
  isR2Configured: vi.fn().mockReturnValue(true),
  getSignedUploadUrl: vi.fn().mockResolvedValue('https://r2.example.com/signed-upload?sig=abc'),
  getSignedDownloadUrl: vi.fn().mockResolvedValue('https://r2.example.com/signed-download?sig=def'),
  isLegacyUrl: vi.fn().mockReturnValue(false),
  buildObjectKey: vi.fn().mockReturnValue('issuance/case1/1234-test.pdf'),
}));
vi.mock('../observability', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  AppError: class extends Error { statusCode: number; constructor(msg: string, code: number) { super(msg); this.statusCode = code; } },
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
  const storageModule = await import('../routes/storage');
  app.use('/api/storage', storageModule.default);
});

describe('POST /api/storage/issuance-docs/upload-url', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/storage/issuance-docs/upload-url')
      .set('x-test-clerk-id', 'none')
      .send({ caseId: 'c1', docType: 'DEED', filename: 'test.pdf', mimeType: 'application/pdf' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/storage/issuance-docs/upload-url')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send({ caseId: 'c1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing required fields');
  });

  it('returns 400 for invalid mime type', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);

    const res = await request(app)
      .post('/api/storage/issuance-docs/upload-url')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send({ caseId: 'c1', docType: 'DEED', filename: 'test.exe', mimeType: 'application/x-msdownload' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid file type');
  });

  it('returns 404 for non-existent case', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.issuanceCase.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/storage/issuance-docs/upload-url')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send({ caseId: 'nonexistent', docType: 'DEED', filename: 'test.pdf', mimeType: 'application/pdf' });

    expect(res.status).toBe(404);
  });

  it('returns signed upload URL for authorized admin', async () => {
    const doc = { id: 'doc_1', caseId: 'c1', type: 'DEED', name: 'test.pdf', url: 'issuance/c1/test.pdf' };
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.issuanceCase.findUnique.mockResolvedValue({
      id: 'c1',
      submission: { tokenizerId: TEST_ADMIN_USER.id },
    });
    mockPrisma.issuanceDocument.create.mockResolvedValue(doc);

    const res = await request(app)
      .post('/api/storage/issuance-docs/upload-url')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send({ caseId: 'c1', docType: 'DEED', filename: 'test.pdf', mimeType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.docId).toBe('doc_1');
    expect(res.body.signedUploadUrl).toContain('signed-upload');
    expect(mockPrisma.issuanceDocument.create).toHaveBeenCalled();
  });

  it('returns 403 for unauthorized tokenizer', async () => {
    const otherUser = { ...TEST_ADMIN_USER, id: 'other_id', role: 'USER' };
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(otherUser)
      .mockResolvedValueOnce({ ...otherUser, role: 'USER' });
    mockPrisma.issuanceCase.findUnique.mockResolvedValue({
      id: 'c1',
      submission: { tokenizerId: 'different_tokenizer_id' },
    });

    const res = await request(app)
      .post('/api/storage/issuance-docs/upload-url')
      .set('x-test-clerk-id', otherUser.clerkId)
      .send({ caseId: 'c1', docType: 'DEED', filename: 'test.pdf', mimeType: 'application/pdf' });

    expect(res.status).toBe(403);
  });
});
