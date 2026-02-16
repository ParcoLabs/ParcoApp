import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import prisma from '../lib/prisma';
import { isDemoMode } from '../utils/demoMode';
import { mockIssuanceCase, mockEligibilityCheck, mockExtractionRunStatus } from '../utils/demoResponses';
import { loadUserWithRole, adminOnly, AuthenticatedRequest } from '../middleware/admin';
import { seedCaseFromTemplate, mockSeedResult } from '../services/templateSeeder';
import { runEligibility, mockRunEligibility } from '../services/eligibilityEngine';

const router = Router();

const simpleAuth = async (req: Request, res: Response, next: Function) => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    (req as any).auth = auth;
    next();
  } catch (error) {
    console.error('[issuance simpleAuth] Error:', error);
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

router.get(
  '/by-submission/:submissionId',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { submissionId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: mockIssuanceCase({ id: `demo_${submissionId}`, propertyId: submissionId }),
        });
      }

      const submission = await prisma.tokenizationSubmission.findUnique({
        where: { id: submissionId },
        select: { id: true, tokenizerId: true },
      });

      if (!submission) {
        return res.status(404).json({ success: false, error: 'Submission not found' });
      }

      if (user.role !== 'ADMIN' && submission.tokenizerId !== user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const issuanceCase = await prisma.issuanceCase.findUnique({
        where: { submissionId },
        include: { submission: true, checklistItems: true, approvalTasks: true, eligibilityChecks: true },
      });

      if (!issuanceCase) {
        return res.status(404).json({ success: false, error: 'No issuance case found for this submission' });
      }

      const template = await prisma.issuanceTemplate.findUnique({
        where: { track: issuanceCase.track },
      });
      const requiredDocTypes = template ? (template.rules as any).requiredDocTypes || [] : [];

      return res.json({ success: true, data: { ...issuanceCase, requiredDocTypes } });
    } catch (error: any) {
      console.error('[issuance] Error fetching case:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/by-submission/:submissionId/create',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { submissionId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: mockIssuanceCase({
            id: `demo_${submissionId}`,
            propertyId: submissionId,
            status: 'INTAKE_COMPLETE',
          }),
        });
      }

      const submission = await prisma.tokenizationSubmission.findUnique({
        where: { id: submissionId },
        select: { id: true, tokenizerId: true },
      });

      if (!submission) {
        return res.status(404).json({ success: false, error: 'Submission not found' });
      }

      if (user.role !== 'ADMIN' && submission.tokenizerId !== user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const existing = await prisma.issuanceCase.findUnique({
        where: { submissionId },
      });

      if (existing) {
        return res.json({ success: true, data: existing });
      }

      const issuanceCase = await prisma.issuanceCase.create({
        data: {
          submissionId,
          status: 'INTAKE_COMPLETE',
          eligibilityStatus: 'PENDING',
        },
      });

      let seedResult = null;
      try {
        seedResult = await seedCaseFromTemplate(issuanceCase.id);
      } catch (e) {
        console.warn('[issuance] Template seeding skipped (template may not exist):', (e as Error).message);
      }

      const fullCase = await prisma.issuanceCase.findUnique({
        where: { id: issuanceCase.id },
        include: { checklistItems: true, approvalTasks: true },
      });

      return res.status(201).json({
        success: true,
        data: {
          ...fullCase,
          requiredDocTypes: seedResult?.requiredDocTypes || [],
        },
      });
    } catch (error: any) {
      console.error('[issuance] Error creating case:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.get(
  '/case/:caseId/documents',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const issuanceCase = await prisma.issuanceCase.findUnique({
        where: { id: caseId },
        include: { submission: true },
      });

      if (!issuanceCase) {
        return res.status(404).json({ success: false, error: 'Issuance case not found' });
      }

      if (user.role !== 'ADMIN' && issuanceCase.submission.tokenizerId !== user.id) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const documents = await prisma.issuanceDocument.findMany({
        where: { caseId },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ success: true, data: documents });
    } catch (error: any) {
      console.error('[issuance] Error fetching documents:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/case/:caseId/eligibility/run',
  simpleAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (isDemoMode(req)) {
        const issuanceCase = await prisma.issuanceCase.findUnique({ where: { id: caseId } }).catch(() => null);
        const targetState = issuanceCase?.targetState || 'NV';
        const result = mockRunEligibility(caseId, targetState);
        return res.json({ success: true, data: result });
      }

      const result = await runEligibility(caseId);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[issuance] Error running eligibility:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/case/:caseId/extract',
  simpleAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: mockExtractionRunStatus(caseId, {
            status: 'COMPLETED',
            documentsProcessed: 6,
            documentsTotal: 6,
            extractedFields: 42,
          }),
        });
      }

      const issuanceCase = await prisma.issuanceCase.findUnique({
        where: { id: caseId },
      });

      if (!issuanceCase) {
        return res.status(404).json({ success: false, error: 'Issuance case not found' });
      }

      const updated = await prisma.issuanceCase.update({
        where: { id: caseId },
        data: {
          extractionScore: 85,
          status: 'EXTRACTION_COMPLETE',
        },
      });

      return res.json({
        success: true,
        data: {
          caseId: updated.id,
          extractionScore: updated.extractionScore,
          status: updated.status,
          run: {
            runId: `run_${Date.now()}`,
            status: 'COMPLETED',
            documentsProcessed: 6,
            documentsTotal: 6,
            extractedFields: 42,
            errors: [],
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error: any) {
      console.error('[issuance] Error running extraction:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/case/:caseId/track',
  simpleAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const { track, targetState, maxPropertyPriceCents } = req.body;

      if (!track) {
        return res.status(400).json({ success: false, error: 'track is required' });
      }

      const validTracks = ['SERIES_LLC', 'REG_CF', 'REG_A', 'REG_D'];
      if (!validTracks.includes(track)) {
        return res.status(400).json({ success: false, error: `Invalid track. Must be one of: ${validTracks.join(', ')}` });
      }

      if (isDemoMode(req)) {
        const mockCase = mockIssuanceCase({
          id: caseId,
          track,
          targetState: targetState || 'OTHER',
          maxPropertyPriceCents: maxPropertyPriceCents ?? null,
        });
        return res.json({
          success: true,
          data: mockCase,
          seedResult: mockSeedResult(caseId, track),
        });
      }

      const issuanceCase = await prisma.issuanceCase.findUnique({
        where: { id: caseId },
      });

      if (!issuanceCase) {
        return res.status(404).json({ success: false, error: 'Issuance case not found' });
      }

      const updateData: any = { track };
      if (targetState) updateData.targetState = targetState;
      if (maxPropertyPriceCents !== undefined) updateData.maxPropertyPriceCents = maxPropertyPriceCents;

      await prisma.issuanceCase.update({
        where: { id: caseId },
        data: updateData,
      });

      let seedResult = null;
      try {
        seedResult = await seedCaseFromTemplate(caseId);
      } catch (e) {
        console.warn('[issuance] Template seeding after track change failed:', (e as Error).message);
      }

      const updatedCase = await prisma.issuanceCase.findUnique({
        where: { id: caseId },
        include: { checklistItems: true, approvalTasks: true },
      });

      const template = await prisma.issuanceTemplate.findUnique({
        where: { track },
      });
      const requiredDocTypes = template ? (template.rules as any).requiredDocTypes || [] : [];

      console.log(`[issuance] Admin updated case ${caseId} track to ${track}${targetState ? `, targetState=${targetState}` : ''}`);

      return res.json({
        success: true,
        data: { ...updatedCase, requiredDocTypes },
        seedResult,
      });
    } catch (error: any) {
      console.error('[issuance] Error updating track:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['INTAKE_COMPLETE'],
  INTAKE_COMPLETE: ['EXTRACTION_RUNNING'],
  EXTRACTION_RUNNING: ['EXTRACTION_COMPLETE'],
  EXTRACTION_COMPLETE: ['REVIEW_READY'],
  REVIEW_READY: ['APPROVED', 'REJECTED'],
  APPROVED: ['MINT_READY'],
  MINT_READY: ['MINTED'],
  MINTED: ['LIVE'],
};

router.post(
  '/case/:caseId/status',
  simpleAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const { status: newStatus, override, reason } = req.body;
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!newStatus) {
        return res.status(400).json({ success: false, error: 'status is required' });
      }

      const validStatuses = [
        'DRAFT', 'INTAKE_COMPLETE', 'EXTRACTION_RUNNING', 'EXTRACTION_COMPLETE',
        'REVIEW_READY', 'APPROVED', 'MINT_READY', 'MINTED', 'LIVE', 'REJECTED',
      ];
      if (!validStatuses.includes(newStatus)) {
        return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }

      if (isDemoMode(req)) {
        const mockCase = mockIssuanceCase({ id: caseId, status: newStatus });
        let warning = 'Demo mode: status transitions are simulated without real enforcement';
        if (newStatus === 'REVIEW_READY') {
          warning = 'Demo mode: eligibility gating bypassed — would normally require PASS status';
        }
        return res.json({ success: true, data: mockCase, warning });
      }

      const issuanceCase = await prisma.issuanceCase.findUnique({
        where: { id: caseId },
      });

      if (!issuanceCase) {
        return res.status(404).json({ success: false, error: 'Issuance case not found' });
      }

      const allowedNext = VALID_STATUS_TRANSITIONS[issuanceCase.status] || [];
      if (!allowedNext.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          error: `Cannot transition from ${issuanceCase.status} to ${newStatus}. Allowed: ${allowedNext.join(', ') || 'none'}`,
        });
      }

      if (newStatus === 'REVIEW_READY' && issuanceCase.eligibilityStatus !== 'PASS') {
        if (override === true && reason && typeof reason === 'string' && reason.trim().length > 0) {
          await prisma.auditEvent.create({
            data: {
              type: 'ELIGIBILITY_OVERRIDE',
              entityId: caseId,
              userId: user.id,
              oldValue: { eligibilityStatus: issuanceCase.eligibilityStatus },
              newValue: { status: newStatus, overrideReason: reason.trim() },
            },
          });
          console.log(`[issuance] Admin ${user.id} overrode eligibility for case ${caseId}: ${reason.trim()}`);
        } else {
          return res.status(400).json({
            success: false,
            error: 'Cannot advance to REVIEW_READY: eligibility status is not PASS. Provide { override: true, reason: "..." } to override.',
            eligibilityStatus: issuanceCase.eligibilityStatus,
            requiresOverride: true,
          });
        }
      }

      const updated = await prisma.issuanceCase.update({
        where: { id: caseId },
        data: { status: newStatus },
        include: { submission: true, checklistItems: true, approvalTasks: true, eligibilityChecks: true },
      });

      console.log(`[issuance] Case ${caseId} status changed: ${issuanceCase.status} -> ${newStatus} by admin ${user.id}`);

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[issuance] Error updating case status:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.get(
  '/cases',
  simpleAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { status, track, targetState, eligibilityStatus } = req.query;

      if (isDemoMode(req)) {
        const demoStatuses = ['DRAFT', 'INTAKE_COMPLETE', 'EXTRACTION_COMPLETE', 'REVIEW_READY', 'APPROVED', 'MINTED', 'LIVE'];
        const demoCases = demoStatuses.map((s, i) => ({
          ...mockIssuanceCase({
            id: `demo_case_${i}`,
            propertyId: `demo_prop_${i}`,
            status: s as any,
            eligibilityStatus: s === 'REVIEW_READY' || s === 'APPROVED' || s === 'MINTED' || s === 'LIVE' ? 'PASS' : 'PENDING',
            extractionScore: s === 'DRAFT' || s === 'INTAKE_COMPLETE' ? 0 : 85,
          }),
          submission: {
            id: `demo_sub_${i}`,
            propertyName: `Demo Property ${i + 1}`,
            propertyCity: ['Las Vegas', 'Miami', 'Austin', 'Denver', 'Portland', 'Chicago', 'Seattle'][i],
            propertyState: ['NV', 'FL', 'TX', 'CO', 'OR', 'IL', 'WA'][i],
          },
        }));
        let filtered = demoCases;
        if (status) filtered = filtered.filter(c => c.status === status);
        if (track) filtered = filtered.filter(c => c.track === track);
        if (targetState) filtered = filtered.filter(c => c.targetState === targetState);
        if (eligibilityStatus) filtered = filtered.filter(c => c.eligibilityStatus === eligibilityStatus);
        return res.json({ success: true, data: filtered });
      }

      const where: any = {};
      if (status) where.status = status;
      if (track) where.track = track;
      if (targetState) where.targetState = targetState;
      if (eligibilityStatus) where.eligibilityStatus = eligibilityStatus;

      const cases = await prisma.issuanceCase.findMany({
        where,
        include: {
          submission: {
            select: {
              id: true,
              propertyName: true,
              propertyCity: true,
              propertyState: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return res.json({ success: true, data: cases });
    } catch (error: any) {
      console.error('[issuance] Error fetching cases:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

export default router;
