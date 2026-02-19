import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import prisma from '../lib/prisma';
import { isDemoMode } from '../utils/demoMode';
import { mockIssuanceCase, mockEligibilityCheck, mockExtractionRunStatus } from '../utils/demoResponses';
import { loadUserWithRole, adminOnly, AuthenticatedRequest } from '../middleware/admin';
import { seedCaseFromTemplate, mockSeedResult } from '../services/templateSeeder';
import { runEligibility, mockRunEligibility } from '../services/eligibilityEngine';
import { extractTextFromIssuanceDocument } from '../services/docTextExtractor';
import { extractFieldsFromText } from '../services/llmExtraction';
import { getCriticalKeys, checkCriticalFieldsVerified } from '../services/criticalFields';

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
        const demoTexts: Record<string, string> = {
          OPERATING_AGREEMENT: 'OPERATING AGREEMENT\nThis Operating Agreement is entered into as of January 15, 2025, by and among the Members listed herein.\nArticle I - Organization\nThe Company is organized as a Series LLC under the laws of Delaware.\nRegistered Agent: National Registered Agents, Inc.\nPrincipal Office: 1209 Orange Street, Wilmington, DE 19801\nArticle II - Purpose\nThe purpose of the Company is to acquire, hold, and manage real property.',
          DEED: 'SPECIAL WARRANTY DEED\nGrant Date: March 1, 2025\nGrantor: Acme Properties LLC\nGrantee: Parco Series 1 LLC\nProperty Address: 742 Evergreen Terrace, Springfield, IL 62704\nLegal Description: LOT 12, BLOCK 3, SPRINGFIELD ESTATES SUBDIVISION\nConsideration: $450,000.00\nRecording Reference: Document No. 2025-00012345',
          APPRAISAL: 'UNIFORM RESIDENTIAL APPRAISAL REPORT\nProperty Address: 742 Evergreen Terrace, Springfield, IL 62704\nAppraised Value: $475,000\nEffective Date: February 15, 2025\nAppraiser: Jane Smith, MAI\nLicense No: IL-553-001234\nGross Living Area: 2,400 sq ft\nSite Area: 0.35 acres\nYear Built: 1998\nCondition: Good\nApproach: Sales Comparison and Income',
          TITLE_REPORT: 'PRELIMINARY TITLE REPORT\nOrder No: 2025-TR-98765\nEffective Date: February 20, 2025\nProperty: 742 Evergreen Terrace, Springfield, IL 62704\nVesting: Parco Series 1 LLC, a Delaware Series LLC\nEncumbrances: None\nTaxes: Current, no delinquencies\nEasements: Standard utility easement along east boundary',
          INSURANCE: 'CERTIFICATE OF INSURANCE\nPolicy Number: HO-2025-445566\nInsured: Parco Series 1 LLC\nProperty: 742 Evergreen Terrace, Springfield, IL 62704\nCoverage A - Dwelling: $475,000\nCoverage B - Other Structures: $47,500\nCoverage C - Personal Property: $237,500\nLiability: $1,000,000\nEffective: March 1, 2025 to March 1, 2026',
          TAX_RETURN: 'PROPERTY TAX STATEMENT\nTax Year: 2024\nParcel ID: 17-03-12-200-003\nOwner: Parco Series 1 LLC\nProperty: 742 Evergreen Terrace, Springfield, IL 62704\nAssessed Value: $380,000\nTax Rate: 2.15%\nTotal Tax: $8,170.00\nStatus: Paid in Full',
        };

        const now = new Date();
        const demoDocs = await prisma.issuanceDocument.findMany({ where: { caseId } });

        const run = await (prisma as any).extractionRun.create({
          data: { caseId, status: 'RUNNING', startedAt: now },
        });

        const documentResults: Array<{ id: string; name: string; textStatus: string }> = [];

        if (demoDocs.length > 0) {
          for (const doc of demoDocs) {
            const fakeText = demoTexts[doc.type] || `Demo extracted text for document: ${doc.name}`;
            await (prisma as any).issuanceDocument.update({
              where: { id: doc.id },
              data: { textContent: fakeText, textStatus: 'EXTRACTED', lastProcessedAt: now, processingError: null },
            });
            documentResults.push({ id: doc.id, name: doc.name, textStatus: 'EXTRACTED' });
          }
        } else {
          const demoDocTypes = ['OPERATING_AGREEMENT', 'DEED', 'APPRAISAL', 'TITLE_REPORT', 'INSURANCE', 'TAX_RETURN'];
          for (const type of demoDocTypes) {
            documentResults.push({
              id: `demo_doc_${type}`,
              name: `${type.toLowerCase().replace(/_/g, '-')}.pdf`,
              textStatus: 'EXTRACTED',
            });
          }
        }

        const demoFields = [
          { key: 'property_address', value: '742 Evergreen Terrace, Springfield, IL 62704', confidence: 0.95 },
          { key: 'property_city', value: 'Springfield', confidence: 0.95 },
          { key: 'property_state', value: 'IL', confidence: 0.95 },
          { key: 'property_zip', value: '62704', confidence: 0.95 },
          { key: 'entity_name', value: 'Parco Series 1 LLC', confidence: 0.90 },
          { key: 'entity_state', value: 'Delaware', confidence: 0.85 },
          { key: 'estimated_property_value', value: '475000', confidence: 0.90 },
          { key: 'ownership_evidence_present', value: 'true', confidence: 0.85 },
          { key: 'rent_estimate_monthly', value: '3200', confidence: 0.70 },
          { key: 'expense_estimate_monthly', value: '1100', confidence: 0.65 },
        ];

        for (const field of demoFields) {
          await (prisma as any).extractedField.create({
            data: {
              caseId,
              key: field.key,
              value: field.value,
              confidence: field.confidence,
              sourceDocumentId: documentResults[0]?.id?.startsWith('demo_doc_') ? null : (documentResults[0]?.id || null),
              metadata: { sourceQuote: `Demo: ${field.key}` },
            },
          });
        }

        await (prisma as any).auditEvent.create({
          data: {
            type: 'FIELDS_EXTRACTED',
            entityId: caseId,
            userId: user.id,
            newValue: { fieldsExtracted: demoFields.length, runId: run.id, demo: true },
          },
        });

        await (prisma as any).extractionRun.update({
          where: { id: run.id },
          data: { status: 'SUCCEEDED', finishedAt: new Date(), modelName: 'demo-mode' },
        });

        await prisma.issuanceCase.update({
          where: { id: caseId },
          data: { status: 'EXTRACTION_COMPLETE' },
        });

        return res.json({
          success: true,
          data: {
            runId: run.id,
            caseId,
            status: 'SUCCEEDED',
            documentsProcessed: documentResults.length,
            documentsTotal: documentResults.length,
            fieldsExtracted: demoFields.length,
            documentResults,
            errors: [],
            startedAt: run.startedAt,
            finishedAt: new Date().toISOString(),
          },
        });
      }

      const issuanceCase = await prisma.issuanceCase.findUnique({
        where: { id: caseId },
        include: { documents: true },
      });

      if (!issuanceCase) {
        return res.status(404).json({ success: false, error: 'Issuance case not found' });
      }

      const docs = issuanceCase.documents;
      const now = new Date();

      await prisma.issuanceCase.update({
        where: { id: caseId },
        data: { status: 'EXTRACTION_RUNNING' },
      });

      const run = await (prisma as any).extractionRun.create({
        data: {
          caseId,
          status: 'RUNNING',
          startedAt: now,
        },
      });

      const results: Array<{ id: string; name: string; textStatus: string; error?: string }> = [];
      let extractedCount = 0;
      let failedCount = 0;

      for (const doc of docs) {
        const extraction = await extractTextFromIssuanceDocument({
          id: doc.id,
          url: doc.url,
          mimeType: (doc as any).mimeType || null,
          name: doc.name,
        });

        await (prisma as any).issuanceDocument.update({
          where: { id: doc.id },
          data: {
            textContent: extraction.text || null,
            textStatus: extraction.status,
            lastProcessedAt: now,
            processingError: extraction.error || null,
          },
        });

        results.push({
          id: doc.id,
          name: doc.name,
          textStatus: extraction.status,
          ...(extraction.error ? { error: extraction.error } : {}),
        });

        if (extraction.status === 'EXTRACTED') extractedCount++;
        else failedCount++;
      }

      const allFailed = docs.length === 0 || extractedCount === 0;

      let totalFieldsExtracted = 0;
      if (!allFailed) {
        const extractedDocs = await (prisma as any).issuanceDocument.findMany({
          where: { caseId, textStatus: 'EXTRACTED' },
        });

        await (prisma as any).extractedField.deleteMany({
          where: { caseId },
        });

        let actualMethod: string = 'regex-fallback';

        for (const doc of extractedDocs) {
          const textContent = (doc as any).textContent;
          if (!textContent) continue;

          try {
            const llmResult = await extractFieldsFromText({
              docType: doc.type,
              track: issuanceCase.track,
              text: textContent,
            });

            if (llmResult.method === 'openai') actualMethod = 'gpt-4.1-mini';

            for (const field of llmResult.fields) {
              await (prisma as any).extractedField.create({
                data: {
                  caseId,
                  key: field.key,
                  value: field.value,
                  confidence: field.confidence,
                  sourceDocumentId: doc.id,
                  extractionRunId: run.id,
                  metadata: field.metadata || undefined,
                },
              });
              totalFieldsExtracted++;
            }
          } catch (fieldErr: any) {
            console.error(`[issuance] Field extraction error for doc ${doc.id}:`, fieldErr.message);
          }
        }

        if (totalFieldsExtracted > 0) {
          await (prisma as any).auditEvent.create({
            data: {
              type: 'FIELDS_EXTRACTED',
              entityId: caseId,
              userId: user.id,
              newValue: { fieldsExtracted: totalFieldsExtracted, runId: run.id },
            },
          });
        }
      }

      const runStatus = allFailed ? 'FAILED' : 'SUCCEEDED';
      const lastError = allFailed
        ? (docs.length === 0 ? 'No documents to process' : 'All documents failed extraction')
        : null;

      await (prisma as any).extractionRun.update({
        where: { id: run.id },
        data: {
          status: runStatus,
          finishedAt: new Date(),
          lastError,
          modelName: allFailed ? 'none' : (typeof actualMethod !== 'undefined' ? actualMethod : 'regex-fallback'),
        },
      });

      if (!allFailed) {
        await prisma.issuanceCase.update({
          where: { id: caseId },
          data: { status: 'EXTRACTION_COMPLETE' },
        });
      }

      return res.json({
        success: true,
        data: {
          runId: run.id,
          caseId,
          status: runStatus,
          documentsProcessed: extractedCount,
          documentsTotal: docs.length,
          fieldsExtracted: totalFieldsExtracted,
          documentResults: results,
          errors: results.filter(r => r.error).map(r => ({ docId: r.id, name: r.name, error: r.error })),
          startedAt: run.startedAt,
          finishedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('[issuance] Error running extraction:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.get(
  '/case/:caseId/fields',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;

      const issuanceCase = await prisma.issuanceCase.findUnique({
        where: { id: caseId },
        select: { track: true },
      });

      if (!issuanceCase) {
        return res.status(404).json({ success: false, error: 'Issuance case not found' });
      }

      const criticalKeys = getCriticalKeys(issuanceCase.track);

      const extractedFields = await (prisma as any).extractedField.findMany({
        where: { caseId },
        orderBy: { confidence: 'desc' },
      });

      const verifiedFields = await (prisma as any).verifiedField.findMany({
        where: { caseId },
      });

      return res.json({
        success: true,
        data: {
          extractedFields,
          verifiedFields,
          criticalKeys,
        },
      });
    } catch (error: any) {
      console.error('[issuance] Error fetching fields:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/case/:caseId/fields/:key/verify',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { caseId, key } = req.params;
      const { value } = req.body;
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const issuanceCase = await prisma.issuanceCase.findUnique({
        where: { id: caseId },
        select: { id: true },
      });

      if (!issuanceCase) {
        return res.status(404).json({ success: false, error: 'Issuance case not found' });
      }

      const bestExtracted = await (prisma as any).extractedField.findFirst({
        where: { caseId, key },
        orderBy: { confidence: 'desc' },
      });

      const resolvedValue = (value !== undefined && value !== null && String(value).trim() !== '')
        ? String(value).trim()
        : bestExtracted?.value;

      if (!resolvedValue) {
        return res.status(400).json({
          success: false,
          error: 'No value provided and no extracted field found for this key',
        });
      }

      const verified = await (prisma as any).verifiedField.upsert({
        where: { caseId_key: { caseId, key } },
        create: {
          caseId,
          key,
          value: resolvedValue,
          verifiedByUserId: user.id,
          verifiedAt: new Date(),
          sourceExtractedFieldId: bestExtracted?.id || null,
        },
        update: {
          value: resolvedValue,
          verifiedByUserId: user.id,
          verifiedAt: new Date(),
          sourceExtractedFieldId: bestExtracted?.id || null,
        },
      });

      return res.json({
        success: true,
        data: verified,
      });
    } catch (error: any) {
      console.error('[issuance] Error verifying field:', error);
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

      let transferPolicyResult = null;
      if (track === 'REG_D') {
        const caseWithSubmission = await prisma.issuanceCase.findUnique({
          where: { id: caseId },
          include: { submission: true },
        });
        const propId = (caseWithSubmission?.submission as any)?.propertyId;
        if (propId) {
          const existing = await (prisma as any).transferPolicy.findUnique({ where: { propertyId: propId } });
          if (!existing) {
            const lockupEndsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            await (prisma as any).transferPolicy.create({
              data: {
                propertyId: propId,
                type: 'REG_D_12M_LOCKUP',
                lockupEndsAt,
              },
            });
            transferPolicyResult = { created: true, type: 'REG_D_12M_LOCKUP', lockupEndsAt: lockupEndsAt.toISOString() };
            console.log(`[issuance] REG_D preset: Created TransferPolicy REG_D_12M_LOCKUP for property ${propId}`);
          } else {
            transferPolicyResult = { exists: true, type: existing.type };
          }
        }
      }

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
        transferPolicyResult,
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
      const { overrideReason, criticalFieldsOverrideReason } = req.body;
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

      const criticalCheck = await checkCriticalFieldsVerified(caseId, issuanceCase.track);
      if (!criticalCheck.passed) {
        if (criticalFieldsOverrideReason && typeof criticalFieldsOverrideReason === 'string' && criticalFieldsOverrideReason.trim().length > 0) {
          await prisma.auditEvent.create({
            data: {
              type: 'CRITICAL_FIELDS_OVERRIDE',
              entityId: caseId,
              userId: user.id,
              oldValue: { missingKeys: criticalCheck.missingKeys },
              newValue: { action: 'MINT_AND_ACTIVATE', overrideReason: criticalFieldsOverrideReason.trim() },
            },
          });
          auditEvents.push({ type: 'CRITICAL_FIELDS_OVERRIDE', details: criticalFieldsOverrideReason.trim() });
        } else {
          return res.status(400).json({
            success: false,
            error: `Critical fields not verified: ${criticalCheck.missingKeys.join(', ')}. Provide criticalFieldsOverrideReason to proceed.`,
            missingCriticalFields: criticalCheck.missingKeys,
            verifiedFields: criticalCheck.verifiedKeys,
            totalRequired: criticalCheck.totalRequired,
            requiresCriticalFieldsOverride: true,
          });
        }
      } else {
        auditEvents.push({ type: 'CRITICAL_FIELDS_VERIFIED', details: `${criticalCheck.totalRequired} fields verified` });
      }

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
