import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_ADMIN_USER, createMockPrisma } from './helpers';

const mockPrisma = createMockPrisma();
vi.mock('../lib/prisma', () => ({ default: mockPrisma }));
vi.mock('../services/compliancePack', () => ({
  applyCompliancePack: vi.fn(),
  mockComplianceRequirements: vi.fn().mockReturnValue([]),
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
  const servicingModule = await import('../routes/servicing');
  app.use('/api/servicing', servicingModule.default);
});

describe('Monthly Close: start → submit → approve → publish', () => {
  const propertyId = 'prop_1';

  it('POST /property/:propertyId/monthly-close/start creates DRAFT report', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.property.findUnique.mockResolvedValue({
      id: propertyId,
      name: 'Test Property',
      totalValue: 500000,
      monthlyRent: 5000,
      annualYield: 8,
      totalTokens: 1000,
      availableTokens: 200,
    });

    const reportRun = {
      id: 'report_1',
      propertyId,
      status: 'DRAFT',
      draftText: 'MONTHLY CLOSE REPORT',
      periodStart: new Date(),
      periodEnd: new Date(),
      createdAt: new Date(),
    };
    mockPrisma.servicingReportRun.create.mockResolvedValue(reportRun);
    mockPrisma.reportApproval.create.mockResolvedValue({});
    mockPrisma.auditEvent.create.mockResolvedValue({});

    const res = await request(app)
      .post(`/api/servicing/property/${propertyId}/monthly-close/start`)
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DRAFT');
    expect(mockPrisma.servicingReportRun.create).toHaveBeenCalled();
  });

  it('POST /report-run/:id/submit transitions DRAFT to IN_REVIEW', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.servicingReportRun.findUnique.mockResolvedValue({
      id: 'report_1',
      propertyId,
      status: 'DRAFT',
    });
    mockPrisma.servicingReportRun.update.mockResolvedValue({
      id: 'report_1',
      status: 'IN_REVIEW',
      approvals: [],
    });
    mockPrisma.auditEvent.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/servicing/report-run/report_1/submit')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('IN_REVIEW');
  });

  it('POST /report-run/:id/submit rejects if not DRAFT', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.servicingReportRun.findUnique.mockResolvedValue({
      id: 'report_1',
      propertyId,
      status: 'IN_REVIEW',
    });

    const res = await request(app)
      .post('/api/servicing/report-run/report_1/submit')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('DRAFT');
  });

  it('POST /report-run/:id/approve/:approvalId approves specific role', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.reportApproval.findUnique.mockResolvedValue({
      id: 'approval_ops',
      reportRunId: 'report_1',
      role: 'OPS',
      status: 'PENDING',
    });
    mockPrisma.reportApproval.update.mockResolvedValue({
      id: 'approval_ops',
      status: 'APPROVED',
      approvedByUserId: TEST_ADMIN_USER.id,
    });
    mockPrisma.auditEvent.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/servicing/report-run/report_1/approve/approval_ops')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send({ notes: 'LGTM' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
  });

  it('POST /report-run/:id/publish fails if not all approved', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.servicingReportRun.findUnique.mockResolvedValue({
      id: 'report_1',
      propertyId,
      status: 'IN_REVIEW',
      approvals: [
        { id: 'a1', role: 'OPS', status: 'APPROVED' },
        { id: 'a2', role: 'ACCOUNTING', status: 'PENDING' },
        { id: 'a3', role: 'COMPLIANCE', status: 'APPROVED' },
      ],
    });

    const res = await request(app)
      .post('/api/servicing/report-run/report_1/publish')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('All approvals');
  });

  it('POST /report-run/:id/publish succeeds when all approved', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.servicingReportRun.findUnique.mockResolvedValue({
      id: 'report_1',
      propertyId,
      status: 'IN_REVIEW',
      approvals: [
        { id: 'a1', role: 'OPS', status: 'APPROVED' },
        { id: 'a2', role: 'ACCOUNTING', status: 'APPROVED' },
        { id: 'a3', role: 'COMPLIANCE', status: 'APPROVED' },
      ],
    });
    mockPrisma.servicingReportRun.update.mockResolvedValue({
      id: 'report_1',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      approvals: [],
    });
    mockPrisma.auditEvent.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/servicing/report-run/report_1/publish')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PUBLISHED');
    expect(res.body.data.publishedAt).toBeTruthy();
  });

  it('POST /report-run/:id/publish rejects if not IN_REVIEW', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_ADMIN_USER);
    mockPrisma.servicingReportRun.findUnique.mockResolvedValue({
      id: 'report_1',
      propertyId,
      status: 'DRAFT',
      approvals: [],
    });

    const res = await request(app)
      .post('/api/servicing/report-run/report_1/publish')
      .set('x-test-clerk-id', TEST_ADMIN_USER.clerkId)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('IN_REVIEW');
  });
});
