import { Router, Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import prisma from '../lib/prisma';
import { isDemoMode } from '../utils/demoMode';
import {
  isR2Configured,
  getSignedUploadUrl,
  getSignedDownloadUrl,
  isLegacyUrl,
  buildObjectKey,
} from '../storage/storage';
import { logger, AppError } from '../observability';

const router = Router();

const ALLOWED_MIMES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 15 * 1024 * 1024;

router.post('/issuance-docs/upload-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { caseId, docType, filename, mimeType } = req.body;

    if (!caseId || !docType || !filename || !mimeType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: caseId, docType, filename, mimeType',
      });
    }

    if (!ALLOWED_MIMES.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid file type: ${mimeType}. Allowed: PDF, PNG, JPEG`,
      });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: auth.userId } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const issuanceCase = await prisma.issuanceCase.findUnique({
      where: { id: caseId },
      include: { submission: true },
    });

    if (!issuanceCase) {
      return res.status(404).json({ success: false, error: 'Issuance case not found' });
    }

    if (issuanceCase.submission && issuanceCase.submission.tokenizerId !== user.id) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Not authorized for this case' });
      }
    }

    if (isDemoMode(req)) {
      const fakeKey = `issuance/${caseId}/${Date.now()}-demo-${filename}`;
      const doc = await prisma.issuanceDocument.create({
        data: {
          caseId,
          type: docType as any,
          name: filename,
          url: fakeKey,
          mimeType,
        },
      });

      return res.json({
        success: true,
        docId: doc.id,
        key: fakeKey,
        signedUploadUrl: `https://demo-storage.example.com/${fakeKey}?X-Amz-Signature=demo`,
      });
    }

    if (!isR2Configured()) {
      return res.status(503).json({
        success: false,
        error: 'Object storage is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.',
      });
    }

    const key = buildObjectKey(`issuance/${caseId}`, filename);

    const doc = await prisma.issuanceDocument.create({
      data: {
        caseId,
        type: docType as any,
        name: filename,
        url: key,
        mimeType,
      },
    });

    const signedUploadUrl = await getSignedUploadUrl(key, mimeType);

    return res.json({
      success: true,
      docId: doc.id,
      key,
      signedUploadUrl,
    });
  } catch (error: any) {
    logger.error({ err: error, requestId: req.requestId }, 'upload-url error');
    return next(error);
  }
});

router.get('/issuance-docs/:docId/download-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { docId } = req.params;

    const doc = await prisma.issuanceDocument.findUnique({
      where: { id: docId },
      include: {
        case: {
          include: { submission: true },
        },
      },
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: auth.userId } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    if (doc.case.submission && doc.case.submission.tokenizerId !== user.id) {
      if (user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
    }

    if (isDemoMode(req)) {
      return res.json({
        success: true,
        downloadUrl: `https://demo-storage.example.com/${doc.url}?download=true`,
        isLegacy: false,
      });
    }

    if (isLegacyUrl(doc.url)) {
      return res.json({
        success: true,
        downloadUrl: doc.url,
        isLegacy: true,
      });
    }

    if (!isR2Configured()) {
      return res.status(503).json({
        success: false,
        error: 'Object storage is not configured',
      });
    }

    const downloadUrl = await getSignedDownloadUrl(doc.url);

    return res.json({
      success: true,
      downloadUrl,
      isLegacy: false,
    });
  } catch (error: any) {
    logger.error({ err: error, requestId: req.requestId }, 'download-url error');
    return next(error);
  }
});

export default router;
