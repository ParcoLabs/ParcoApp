import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { isDemoMode } from '../utils/demoMode';

const router = Router();

const ALLOWED_MIMES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const { submissionId, docKey } = req.params;
    const dir = path.join(process.cwd(), 'attached_assets', 'uploads', submissionId, docKey);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: PDF, PNG, JPEG`));
    }
  },
});

const DOC_KEY_MAP: Record<string, 'ownershipProof' | 'legalDocuments' | 'financialStatements' | 'documents'> = {
  ownershipProof: 'ownershipProof',
  taxRecords: 'financialStatements',
  bankStatements: 'financialStatements',
  leaseAgreements: 'legalDocuments',
  rentalStatements: 'financialStatements',
  valuation: 'documents',
};

const DOC_KEY_TO_ISSUANCE_TYPE: Record<string, string> = {
  ownershipProof: 'OWNERSHIP',
  taxRecords: 'FINANCIAL',
  bankStatements: 'FINANCIAL',
  leaseAgreements: 'LEGAL',
  rentalStatements: 'FINANCIAL',
  valuation: 'PROPERTY',
};

async function createIssuanceDocument(submissionId: string, docKey: string, url: string, fileName: string) {
  try {
    let issuanceCase = await prisma.issuanceCase.findUnique({
      where: { submissionId },
    });

    if (!issuanceCase) {
      issuanceCase = await prisma.issuanceCase.create({
        data: { submissionId, status: 'DRAFT' },
      });
    }

    const docType = DOC_KEY_TO_ISSUANCE_TYPE[docKey] || 'OTHER';

    await prisma.issuanceDocument.create({
      data: {
        caseId: issuanceCase.id,
        type: docType as any,
        name: fileName,
        url,
      },
    });
  } catch (err) {
    console.error('[uploads] Failed to create IssuanceDocument:', err);
  }
}

router.post(
  '/tokenization/:submissionId/:docKey',
  async (req: Request, res: Response) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { submissionId, docKey } = req.params;

      const user = await prisma.user.findUnique({ where: { clerkId: auth.userId } });
      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const submission = await prisma.tokenizationSubmission.findUnique({
        where: { id: submissionId },
      });

      if (!submission) {
        return res.status(404).json({ success: false, error: 'Submission not found' });
      }

      if (submission.tokenizerId !== user.id) {
        return res.status(403).json({ success: false, error: 'Not authorized for this submission' });
      }

      if (isDemoMode(req)) {
        const fakeUrl = `/attached_assets/uploads/${submissionId}/${docKey}/${Date.now()}-demo-document.pdf`;
        const field = DOC_KEY_MAP[docKey] || 'documents';

        if (field === 'ownershipProof') {
          await prisma.tokenizationSubmission.update({
            where: { id: submissionId },
            data: { ownershipProof: fakeUrl },
          });
        } else {
          const current = (submission as any)[field] as string[] || [];
          await prisma.tokenizationSubmission.update({
            where: { id: submissionId },
            data: { [field]: [...current, fakeUrl] },
          });
        }

        await createIssuanceDocument(submissionId, docKey, fakeUrl, `demo-${docKey}-document.pdf`);

        return res.json({ success: true, url: fakeUrl });
      }

      upload.single('file')(req, res, async (err) => {
        if (err) {
          const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
            ? 'File too large. Maximum size is 15MB.'
            : err.message || 'Upload failed';
          return res.status(400).json({ success: false, error: message });
        }

        if (!req.file) {
          return res.status(400).json({ success: false, error: 'No file provided' });
        }

        const url = `/attached_assets/uploads/${submissionId}/${docKey}/${req.file.filename}`;
        const field = DOC_KEY_MAP[docKey] || 'documents';

        try {
          if (field === 'ownershipProof') {
            await prisma.tokenizationSubmission.update({
              where: { id: submissionId },
              data: { ownershipProof: url },
            });
          } else {
            const current = (submission as any)[field] as string[] || [];
            await prisma.tokenizationSubmission.update({
              where: { id: submissionId },
              data: { [field]: [...current, url] },
            });
          }

          await createIssuanceDocument(submissionId, docKey, url, req.file.originalname);

          return res.json({ success: true, url });
        } catch (dbError: any) {
          console.error('[uploads] DB update error:', dbError);
          return res.status(500).json({ success: false, error: 'Failed to save document reference' });
        }
      });
    } catch (error: any) {
      console.error('[uploads] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

export default router;
