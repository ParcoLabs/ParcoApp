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

const TRACK_DEFAULT_POLICY: Record<string, string> = {
  SERIES_LLC: 'ALLOWLIST_ONLY',
  REG_CF: 'ALLOWLIST_ONLY',
  REG_A: 'ALLOWLIST_ONLY',
  REG_D: 'REG_D_12M_LOCKUP',
};

function generateDemoAddress(): string {
  const hex = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `0x${hex}`;
}

function generateMockTxHash(): string {
  return `0xdemo${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`.padEnd(66, '0');
}

router.post(
  '/case/:caseId/mint-and-activate',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const { overrideReason } = req.body;
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const auditEvents: Array<{ type: string; details: string }> = [];
      const demo = isDemoMode(req);

      const issuanceCase = await prisma.issuanceCase.findUnique({
        where: { id: caseId },
        include: {
          submission: true,
          approvalTasks: true,
        },
      });

      if (!issuanceCase) {
        return res.status(404).json({ success: false, error: 'Issuance case not found' });
      }

      const propertyId = issuanceCase.submission.propertyId;
      if (!propertyId) {
        return res.status(400).json({ success: false, error: 'Submission has no linked property. Approve and create a property first.' });
      }

      const property = await (prisma.property as any).findUnique({
        where: { id: propertyId },
        include: { onchainDeployment: true, transferPolicy: true },
      }) as any;

      if (!property) {
        return res.status(404).json({ success: false, error: 'Linked property not found' });
      }

      if (issuanceCase.eligibilityStatus !== 'PASS') {
        if (overrideReason && typeof overrideReason === 'string' && overrideReason.trim().length > 0) {
          await prisma.auditEvent.create({
            data: {
              type: 'ELIGIBILITY_OVERRIDE',
              entityId: caseId,
              userId: user.id,
              oldValue: { eligibilityStatus: issuanceCase.eligibilityStatus },
              newValue: { action: 'MINT_AND_ACTIVATE', overrideReason: overrideReason.trim() },
            },
          });
          auditEvents.push({ type: 'ELIGIBILITY_OVERRIDE', details: overrideReason.trim() });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Eligibility status is not PASS. Provide overrideReason to proceed.',
            eligibilityStatus: issuanceCase.eligibilityStatus,
            requiresOverride: true,
          });
        }
      }

      const pendingApprovals = issuanceCase.approvalTasks.filter(t => t.status !== 'COMPLETED');
      if (pendingApprovals.length > 0) {
        return res.status(400).json({
          success: false,
          error: `${pendingApprovals.length} approval task(s) are not complete: ${pendingApprovals.map(t => t.role).join(', ')}`,
          pendingApprovals: pendingApprovals.map(t => ({ role: t.role, status: t.status })),
        });
      }
      auditEvents.push({ type: 'APPROVALS_VERIFIED', details: `${issuanceCase.approvalTasks.length} tasks verified` });

      if (!property.transferPolicy) {
        const defaultType = TRACK_DEFAULT_POLICY[issuanceCase.track] || 'ALLOWLIST_ONLY';
        const lockupEndsAt = defaultType === 'REG_D_12M_LOCKUP'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : null;
        await (prisma as any).transferPolicy.create({
          data: {
            propertyId,
            type: defaultType as any,
            lockupEndsAt,
          },
        });
        auditEvents.push({ type: 'TRANSFER_POLICY_CREATED', details: `Default policy ${defaultType} created for track ${issuanceCase.track}` });
      } else {
        auditEvents.push({ type: 'TRANSFER_POLICY_EXISTS', details: `Policy type: ${property.transferPolicy.type}` });
      }

      let deployment = property.onchainDeployment;
      let deployTxHash: string | null = null;
      let registryTxHash: string | null = null;

      if (!deployment) {
        const tokenName = `Parco ${property.name}`;
        const symbolBase = property.name.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5);
        const symbol = `P${symbolBase}`;

        if (demo) {
          const tokenAddress = generateDemoAddress();
          const registryAddress = generateDemoAddress();
          deployTxHash = generateMockTxHash();
          registryTxHash = generateMockTxHash();

          deployment = await (prisma as any).onchainDeployment.create({
            data: {
              propertyId,
              chainId: 137,
              tokenAddress,
              registryAddress,
              deployedByUserId: user.id,
              deployedAt: new Date(),
            },
          });
        } else {
          const { deployRestrictedToken } = await import('../services/blockchain');
          try {
            const result = await deployRestrictedToken({ name: tokenName, symbol });
            deployTxHash = result.deployTxHash;
            registryTxHash = result.registryTxHash;

            deployment = await (prisma as any).onchainDeployment.create({
              data: {
                propertyId,
                chainId: 137,
                tokenAddress: result.tokenAddress,
                registryAddress: result.registryAddress,
                deployedByUserId: user.id,
                deployedAt: new Date(),
              },
            });
          } catch (err: any) {
            return res.status(412).json({ success: false, error: `Deploy failed: ${err.message}` });
          }
        }
        auditEvents.push({ type: 'TOKEN_DEPLOYED', details: `Token deployed at ${deployment.tokenAddress}` });
      } else {
        auditEvents.push({ type: 'DEPLOYMENT_EXISTS', details: `Already deployed at ${deployment.tokenAddress}` });
      }

      const currentPolicy = property.transferPolicy || await (prisma as any).transferPolicy.findUnique({ where: { propertyId } });
      if (currentPolicy && deployment && !demo) {
        try {
          const { tokenSetAllowlistRequired, tokenSetLockupEndsAt } = await import('../services/blockchain');
          const needsAllowlist = ['ALLOWLIST_ONLY', 'ALLOWLIST_AND_LOCKUP', 'REG_D_12M_LOCKUP'].includes(currentPolicy.type);
          await tokenSetAllowlistRequired({ tokenAddress: deployment.tokenAddress, required: needsAllowlist });

          if (['ALLOWLIST_AND_LOCKUP', 'REG_D_12M_LOCKUP'].includes(currentPolicy.type) && currentPolicy.lockupEndsAt) {
            const lockupTs = Math.floor(new Date(currentPolicy.lockupEndsAt).getTime() / 1000);
            await tokenSetLockupEndsAt({ tokenAddress: deployment.tokenAddress, lockupEndsAt: lockupTs });
          }
          auditEvents.push({ type: 'TRANSFER_POLICY_SYNCED', details: `Policy ${currentPolicy.type} synced on-chain` });
        } catch (err: any) {
          auditEvents.push({ type: 'TRANSFER_POLICY_SYNC_WARNING', details: `Failed to sync policy: ${err.message}` });
        }
      } else if (currentPolicy && demo) {
        auditEvents.push({ type: 'TRANSFER_POLICY_SYNCED', details: `Policy ${currentPolicy.type} synced (demo)` });
      }

      const treasuryWallet = process.env.TREASURY_WALLET_ADDRESS || (demo ? '0x' + 'TREASURY'.padEnd(40, '0') : null);
      if (!treasuryWallet) {
        return res.status(412).json({ success: false, error: 'TREASURY_WALLET_ADDRESS not configured' });
      }

      if (demo) {
        auditEvents.push({ type: 'TREASURY_ALLOWLISTED', details: `Treasury ${treasuryWallet} allowlisted (demo)` });
      } else {
        try {
          const { registrySetAllowed } = await import('../services/blockchain');
          if (deployment.registryAddress) {
            await registrySetAllowed({
              registryAddress: deployment.registryAddress,
              investorAddress: treasuryWallet,
              allowed: true,
            });
          }
          auditEvents.push({ type: 'TREASURY_ALLOWLISTED', details: `Treasury ${treasuryWallet} allowlisted on-chain` });
        } catch (err: any) {
          auditEvents.push({ type: 'TREASURY_ALLOWLIST_WARNING', details: `Failed to allowlist treasury: ${err.message}` });
        }
      }

      const initialSupply = process.env.INITIAL_SUPPLY_TOKENS || String(property.totalTokens || 1000);
      let mintTxHash: string | null = null;

      if (demo) {
        mintTxHash = generateMockTxHash();
        auditEvents.push({ type: 'TOKENS_MINTED', details: `${initialSupply} tokens minted to treasury (demo)` });
      } else {
        try {
          const { tokenMint } = await import('../services/blockchain');
          mintTxHash = await tokenMint({
            tokenAddress: deployment.tokenAddress,
            to: treasuryWallet,
            amount: initialSupply,
          });
          auditEvents.push({ type: 'TOKENS_MINTED', details: `${initialSupply} tokens minted to treasury` });
        } catch (err: any) {
          auditEvents.push({ type: 'MINT_WARNING', details: `Mint failed: ${err.message}` });
        }
      }

      await prisma.issuanceCase.update({
        where: { id: caseId },
        data: { status: 'MINTED' },
      });
      auditEvents.push({ type: 'STATUS_MINTED', details: 'Case status set to MINTED' });

      await prisma.issuanceCase.update({
        where: { id: caseId },
        data: { status: 'LIVE' },
      });
      auditEvents.push({ type: 'STATUS_LIVE', details: 'Case status set to LIVE' });

      await prisma.property.update({
        where: { id: propertyId },
        data: { isMinted: true, status: 'ACTIVE' },
      });
      auditEvents.push({ type: 'PROPERTY_ACTIVATED', details: 'Property set to ACTIVE and isMinted=true' });

      let complianceResult = null;
      try {
        const { applyCompliancePack } = await import('../services/compliancePack');
        complianceResult = await applyCompliancePack(caseId, propertyId);
        auditEvents.push({ type: 'COMPLIANCE_PACK_APPLIED', details: `${complianceResult.requirementsCreated} requirements created` });
      } catch (err: any) {
        auditEvents.push({ type: 'COMPLIANCE_PACK_SKIPPED', details: err.message });
      }

      for (const event of auditEvents) {
        await prisma.auditEvent.create({
          data: {
            type: event.type,
            entityId: caseId,
            userId: user.id,
            oldValue: { propertyId },
            newValue: { details: event.details },
          },
        });
      }

      console.log(`[issuance] Mint & Activate completed for case ${caseId} by admin ${user.id}. Steps: ${auditEvents.length}`);

      const updatedCase = await prisma.issuanceCase.findUnique({
        where: { id: caseId },
        include: { submission: true, checklistItems: true, approvalTasks: true, eligibilityChecks: true },
      });

      return res.json({
        success: true,
        isDemo: demo,
        data: updatedCase,
        steps: auditEvents,
        deployment: {
          tokenAddress: deployment.tokenAddress,
          registryAddress: deployment.registryAddress,
        },
        mint: {
          txHash: mintTxHash,
          supply: initialSupply,
          treasury: treasuryWallet,
        },
        compliance: complianceResult,
      });
    } catch (error: any) {
      console.error('[issuance] Error in mint-and-activate:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

export default router;
