import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from '../lib/prisma';

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    email: string;
    role: string;
  };
}

const simpleAuth = async (req: Request, res: Response, next: Function) => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = await prisma.user.findUnique({
      where: { clerkId: auth.userId },
      select: { id: true, clerkId: true, email: true, role: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    console.error('[Tokenization Auth] Error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

const tokenizerOrAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as AuthenticatedRequest).user;
  if (!user || (user.role !== 'TOKENIZER' && user.role !== 'ADMIN')) {
    return res.status(403).json({ error: 'Tokenizer or Admin role required' });
  }
  next();
};

router.get('/my-properties', simpleAuth, tokenizerOrAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    
    const submissions = await prisma.tokenizationSubmission.findMany({
      where: { tokenizerId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        propertyName: true,
        propertyAddress: true,
        propertyCity: true,
        propertyState: true,
        propertyCountry: true,
        propertyType: true,
        status: true,
        totalValue: true,
        tokenPrice: true,
        totalTokens: true,
        annualYield: true,
        description: true,
        imageUrl: true,
        images: true,
        documents: true,
        squareFeet: true,
        bedrooms: true,
        bathrooms: true,
        yearBuilt: true,
        ownershipProof: true,
        legalDocuments: true,
        financialStatements: true,
        submittedAt: true,
        reviewedAt: true,
        approvedAt: true,
        publishedAt: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    const submissionsWithProgress = submissions.map(sub => {
      let progress = 0;
      let completedSteps = 0;
      const totalSteps = 8;

      if (sub.propertyAddress && sub.propertyCity && sub.propertyState) completedSteps++;
      if (sub.propertyType) completedSteps++;
      if (sub.totalValue && sub.tokenPrice && sub.totalTokens) completedSteps++;
      if (sub.annualYield) completedSteps++;
      if (sub.description) completedSteps++;
      if (sub.imageUrl || (sub.images && sub.images.length > 0)) completedSteps++;
      if (sub.ownershipProof) completedSteps++;
      if (sub.legalDocuments && sub.legalDocuments.length > 0) completedSteps++;

      progress = Math.round((completedSteps / totalSteps) * 100);

      return {
        ...sub,
        progress,
        totalValue: sub.totalValue ? Number(sub.totalValue) : null,
        tokenPrice: sub.tokenPrice ? Number(sub.tokenPrice) : null,
        annualYield: sub.annualYield ? Number(sub.annualYield) : null,
        bathrooms: sub.bathrooms ? Number(sub.bathrooms) : null,
      };
    });

    return res.json({ submissions: submissionsWithProgress });
  } catch (error) {
    console.error('[Tokenization] Error fetching my properties:', error);
    return res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

router.post('/create', simpleAuth, tokenizerOrAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    
    const submission = await prisma.tokenizationSubmission.create({
      data: {
        tokenizerId: user.id,
        status: 'DRAFT',
        propertyName: 'Untitled Property',
        propertyAddress: '',
        propertyCity: '',
        propertyState: '',
        propertyCountry: 'USA',
        propertyType: 'RESIDENTIAL',
        totalValue: 0,
        tokenPrice: 0,
        totalTokens: 0,
        annualYield: 0,
      }
    });

    return res.json({ 
      success: true, 
      submission: {
        id: submission.id,
        status: submission.status,
        createdAt: submission.createdAt,
      }
    });
  } catch (error) {
    console.error('[Tokenization] Error creating submission:', error);
    return res.status(500).json({ error: 'Failed to create submission' });
  }
});

router.get('/:id', simpleAuth, tokenizerOrAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { id } = req.params;
    
    const submission = await prisma.tokenizationSubmission.findFirst({
      where: { 
        id,
        tokenizerId: user.id 
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.json({ 
      submission: {
        ...submission,
        totalValue: submission.totalValue ? Number(submission.totalValue) : null,
        tokenPrice: submission.tokenPrice ? Number(submission.tokenPrice) : null,
        annualYield: submission.annualYield ? Number(submission.annualYield) : null,
        monthlyRent: submission.monthlyRent ? Number(submission.monthlyRent) : null,
        bathrooms: submission.bathrooms ? Number(submission.bathrooms) : null,
      }
    });
  } catch (error) {
    console.error('[Tokenization] Error fetching submission:', error);
    return res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

router.patch('/:id', simpleAuth, tokenizerOrAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { id } = req.params;
    
    const existing = await prisma.tokenizationSubmission.findFirst({
      where: { 
        id,
        tokenizerId: user.id,
        status: 'DRAFT'
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Draft submission not found or not editable' });
    }

    const allowedFields = [
      'propertyName', 'propertyAddress', 'propertyCity', 'propertyState',
      'propertyCountry', 'propertyZipCode', 'propertyType', 'totalValue',
      'tokenPrice', 'totalTokens', 'annualYield', 'monthlyRent', 'description',
      'imageUrl', 'images', 'documents', 'squareFeet', 'bedrooms', 'bathrooms',
      'yearBuilt', 'ownershipProof', 'legalDocuments', 'financialStatements'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updated = await prisma.tokenizationSubmission.update({
      where: { id },
      data: updateData
    });

    return res.json({ 
      success: true, 
      submission: {
        ...updated,
        totalValue: updated.totalValue ? Number(updated.totalValue) : null,
        tokenPrice: updated.tokenPrice ? Number(updated.tokenPrice) : null,
        annualYield: updated.annualYield ? Number(updated.annualYield) : null,
        monthlyRent: updated.monthlyRent ? Number(updated.monthlyRent) : null,
        bathrooms: updated.bathrooms ? Number(updated.bathrooms) : null,
      }
    });
  } catch (error) {
    console.error('[Tokenization] Error updating submission:', error);
    return res.status(500).json({ error: 'Failed to update submission' });
  }
});

router.post('/:id/submit', simpleAuth, tokenizerOrAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { id } = req.params;
    
    const existing = await prisma.tokenizationSubmission.findFirst({
      where: { 
        id,
        tokenizerId: user.id,
        status: 'DRAFT'
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Draft submission not found' });
    }

    if (!existing.propertyAddress || !existing.propertyCity || !existing.propertyState) {
      return res.status(400).json({ error: 'Property address is required' });
    }
    if (!existing.totalValue || Number(existing.totalValue) <= 0) {
      return res.status(400).json({ error: 'Valid total value is required' });
    }
    if (!existing.tokenPrice || Number(existing.tokenPrice) <= 0) {
      return res.status(400).json({ error: 'Valid token price is required' });
    }
    if (!existing.totalTokens || existing.totalTokens <= 0) {
      return res.status(400).json({ error: 'Valid token count is required' });
    }

    const updated = await prisma.tokenizationSubmission.update({
      where: { id },
      data: { 
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });

    return res.json({ 
      success: true, 
      message: 'Submission sent for review',
      submission: {
        id: updated.id,
        status: updated.status,
        submittedAt: updated.submittedAt
      }
    });
  } catch (error) {
    console.error('[Tokenization] Error submitting:', error);
    return res.status(500).json({ error: 'Failed to submit for review' });
  }
});

export default router;
