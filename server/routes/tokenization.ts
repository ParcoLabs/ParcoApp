import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from '../lib/prisma';
import { isDemoMode } from '../utils/demoMode';
import { getDemoTokenizationOverrides } from './demo';

const router = Router();

const demoSubmissionOverrides = new Map<string, Record<string, any>>();

function getAllDemoOverrides(id: string): Record<string, any> {
  const local = demoSubmissionOverrides.get(id) || {};
  const fromDemo = getDemoTokenizationOverrides().get(id) || {};
  return { ...local, ...fromDemo };
}

const DEMO_SEED_SUBMISSIONS = [
  {
    id: 'demo-sub-001',
    propertyName: 'Sunset Ridge Apartments',
    propertyAddress: '1420 Sunset Ridge Blvd',
    propertyCity: 'Austin',
    propertyState: 'TX',
    propertyCountry: 'USA',
    propertyZipCode: '78701',
    propertyType: 'RESIDENTIAL',
    status: 'SUBMITTED',
    totalValue: 1250000,
    tokenPrice: 50,
    totalTokens: 25000,
    annualYield: 8.2,
    monthlyRent: 8500,
    description: 'Modern 12-unit apartment complex near downtown Austin with strong rental demand.',
    squareFeet: 9600,
    bedrooms: 24,
    bathrooms: 12,
    yearBuilt: 2018,
    ownershipProof: '/attached_assets/uploads/demo-sub-001/ownershipProof/deed.pdf',
    legalDocuments: ['/attached_assets/uploads/demo-sub-001/legalDocuments/lease-master.pdf'],
    financialStatements: ['/attached_assets/uploads/demo-sub-001/financialStatements/income-2024.pdf'],
    images: ['/attached_assets/uploads/demo-sub-001/images/front.jpg', '/attached_assets/uploads/demo-sub-001/images/interior.jpg'],
    documents: [],
    imageUrl: null,
    submittedAt: new Date('2026-02-10').toISOString(),
    reviewedAt: null,
    approvedAt: null,
    publishedAt: null,
    rejectionReason: null,
    createdAt: new Date('2026-01-28').toISOString(),
    updatedAt: new Date('2026-02-10').toISOString(),
    progress: 100,
  },
  {
    id: 'demo-sub-002',
    propertyName: 'Harbor View Office Park',
    propertyAddress: '88 Harbor View Dr',
    propertyCity: 'San Diego',
    propertyState: 'CA',
    propertyCountry: 'USA',
    propertyZipCode: '92101',
    propertyType: 'COMMERCIAL',
    status: 'IN_REVIEW',
    totalValue: 3400000,
    tokenPrice: 100,
    totalTokens: 34000,
    annualYield: 6.5,
    monthlyRent: 22000,
    description: 'Class A office space with ocean views. Fully leased to tech tenants.',
    squareFeet: 18000,
    bedrooms: null,
    bathrooms: 4,
    yearBuilt: 2015,
    ownershipProof: '/attached_assets/uploads/demo-sub-002/ownershipProof/title.pdf',
    legalDocuments: ['/attached_assets/uploads/demo-sub-002/legalDocuments/lease.pdf', '/attached_assets/uploads/demo-sub-002/legalDocuments/zoning.pdf'],
    financialStatements: ['/attached_assets/uploads/demo-sub-002/financialStatements/pnl-2024.pdf'],
    images: ['/attached_assets/uploads/demo-sub-002/images/exterior.jpg'],
    documents: [],
    imageUrl: null,
    submittedAt: new Date('2026-02-05').toISOString(),
    reviewedAt: new Date('2026-02-12').toISOString(),
    approvedAt: null,
    publishedAt: null,
    rejectionReason: null,
    createdAt: new Date('2026-01-20').toISOString(),
    updatedAt: new Date('2026-02-12').toISOString(),
    progress: 100,
  },
  {
    id: 'demo-sub-003',
    propertyName: 'Maple Street Duplex',
    propertyAddress: '312 Maple St',
    propertyCity: 'Nashville',
    propertyState: 'TN',
    propertyCountry: 'USA',
    propertyZipCode: '37203',
    propertyType: 'RESIDENTIAL',
    status: 'DRAFT',
    totalValue: 485000,
    tokenPrice: 25,
    totalTokens: 19400,
    annualYield: 7.8,
    monthlyRent: 3100,
    description: 'Charming duplex in East Nashville. Both units rented with long-term tenants.',
    squareFeet: 2200,
    bedrooms: 4,
    bathrooms: 2,
    yearBuilt: 1995,
    ownershipProof: null,
    legalDocuments: [],
    financialStatements: [],
    images: [],
    documents: [],
    imageUrl: null,
    submittedAt: null,
    reviewedAt: null,
    approvedAt: null,
    publishedAt: null,
    rejectionReason: null,
    createdAt: new Date('2026-02-14').toISOString(),
    updatedAt: new Date('2026-02-14').toISOString(),
    progress: 63,
  },
  {
    id: 'demo-sub-004',
    propertyName: 'Untitled Property',
    propertyAddress: '',
    propertyCity: '',
    propertyState: '',
    propertyCountry: 'USA',
    propertyZipCode: null,
    propertyType: 'RESIDENTIAL',
    status: 'DRAFT',
    totalValue: 0,
    tokenPrice: 0,
    totalTokens: 0,
    annualYield: 0,
    monthlyRent: 0,
    description: null,
    squareFeet: null,
    bedrooms: null,
    bathrooms: null,
    yearBuilt: null,
    ownershipProof: null,
    legalDocuments: [],
    financialStatements: [],
    images: [],
    documents: [],
    imageUrl: null,
    submittedAt: null,
    reviewedAt: null,
    approvedAt: null,
    publishedAt: null,
    rejectionReason: null,
    createdAt: new Date('2026-02-16').toISOString(),
    updatedAt: new Date('2026-02-16').toISOString(),
    progress: 0,
  },
];

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

    const computeProgress = (s: any): number => {
      let completedSteps = 0;
      const totalSteps = 8;
      if (s.propertyAddress && s.propertyCity && s.propertyState) completedSteps++;
      if (s.propertyType) completedSteps++;
      if (s.totalValue && s.tokenPrice && s.totalTokens) completedSteps++;
      if (s.annualYield) completedSteps++;
      if (s.description) completedSteps++;
      if (s.imageUrl || (s.images && s.images.length > 0)) completedSteps++;
      if (s.ownershipProof) completedSteps++;
      if (s.legalDocuments && s.legalDocuments.length > 0) completedSteps++;
      return Math.round((completedSteps / totalSteps) * 100);
    };

    const formatSubmission = (s: any) => ({
      ...s,
      progress: computeProgress(s),
      totalValue: s.totalValue ? Number(s.totalValue) : null,
      tokenPrice: s.tokenPrice ? Number(s.tokenPrice) : null,
      annualYield: s.annualYield ? Number(s.annualYield) : null,
      bathrooms: s.bathrooms ? Number(s.bathrooms) : null,
    });

    const submissionsWithProgress = submissions.map(sub => {
      const overrides = isDemoMode(req) ? getAllDemoOverrides(sub.id) : {};
      const merged = { ...sub, ...overrides };
      return formatSubmission(merged);
    });

    if (isDemoMode(req)) {
      const realIds = new Set(submissionsWithProgress.map((s: any) => s.id));
      const seeds = DEMO_SEED_SUBMISSIONS
        .filter(s => !realIds.has(s.id))
        .map(s => {
          const overrides = getAllDemoOverrides(s.id);
          const merged = { ...s, ...overrides };
          return formatSubmission(merged);
        });
      return res.json({ submissions: [...submissionsWithProgress, ...seeds] });
    }

    return res.json({ submissions: submissionsWithProgress });
  } catch (error) {
    console.error('[Tokenization] Error fetching my properties:', error);
    return res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

router.post('/create', simpleAuth, tokenizerOrAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user!;

    if (isDemoMode(req)) {
      const demoId = `demo-new-${Date.now()}`;
      const now = new Date().toISOString();
      const demoSub = {
        id: demoId,
        propertyName: 'Untitled Property',
        propertyAddress: '',
        propertyCity: '',
        propertyState: '',
        propertyCountry: 'USA',
        propertyZipCode: null,
        propertyType: 'RESIDENTIAL',
        status: 'DRAFT',
        totalValue: 0,
        tokenPrice: 0,
        totalTokens: 0,
        annualYield: 0,
        monthlyRent: 0,
        description: null,
        squareFeet: null,
        bedrooms: null,
        bathrooms: null,
        yearBuilt: null,
        ownershipProof: null,
        legalDocuments: [],
        financialStatements: [],
        images: [],
        documents: [],
        imageUrl: null,
        submittedAt: null,
        reviewedAt: null,
        approvedAt: null,
        publishedAt: null,
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
        progress: 0,
      };
      DEMO_SEED_SUBMISSIONS.push(demoSub);
      return res.json({
        success: true,
        submission: { id: demoId, status: 'DRAFT', createdAt: now }
      });
    }
    
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
    
    const where = user.role === 'ADMIN' ? { id } : { id, tokenizerId: user.id };
    const submission = await prisma.tokenizationSubmission.findFirst({ where });

    if (!submission && isDemoMode(req)) {
      const seed = DEMO_SEED_SUBMISSIONS.find(s => s.id === id);
      if (seed) {
        const overrides = getAllDemoOverrides(id);
        const merged = { ...seed, ...overrides };
        return res.json({ submission: merged });
      }
    }

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const demoOverrides = isDemoMode(req) ? getAllDemoOverrides(id) : {};
    const merged = { ...submission, ...demoOverrides };

    return res.json({ 
      submission: {
        ...merged,
        totalValue: merged.totalValue ? Number(merged.totalValue) : null,
        tokenPrice: merged.tokenPrice ? Number(merged.tokenPrice) : null,
        annualYield: merged.annualYield ? Number(merged.annualYield) : null,
        monthlyRent: merged.monthlyRent ? Number(merged.monthlyRent) : null,
        bathrooms: merged.bathrooms ? Number(merged.bathrooms) : null,
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
    
    const where = user.role === 'ADMIN'
      ? { id, status: 'DRAFT' as const }
      : { id, tokenizerId: user.id, status: 'DRAFT' as const };
    const existing = await prisma.tokenizationSubmission.findFirst({ where });

    const demoSeed = isDemoMode(req) ? DEMO_SEED_SUBMISSIONS.find(s => s.id === id && s.status === 'DRAFT') : null;

    if (!existing && !demoSeed) {
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

    if (isDemoMode(req)) {
      const base = existing || demoSeed!;
      const prev = demoSubmissionOverrides.get(id) || {};
      demoSubmissionOverrides.set(id, { ...prev, ...updateData });
      const merged = { ...base, ...prev, ...updateData };
      return res.json({
        success: true,
        submission: {
          ...merged,
          totalValue: merged.totalValue ? Number(merged.totalValue) : null,
          tokenPrice: merged.tokenPrice ? Number(merged.tokenPrice) : null,
          annualYield: merged.annualYield ? Number(merged.annualYield) : null,
          monthlyRent: merged.monthlyRent ? Number(merged.monthlyRent) : null,
          bathrooms: merged.bathrooms ? Number(merged.bathrooms) : null,
        }
      });
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

    let issuanceCase = null;
    if (!isDemoMode(req)) {
      const existingCase = await prisma.issuanceCase.findUnique({
        where: { submissionId: id },
      });
      if (!existingCase) {
        issuanceCase = await prisma.issuanceCase.create({
          data: {
            submissionId: id,
            status: 'INTAKE_COMPLETE',
            eligibilityStatus: 'PENDING',
          },
        });
        console.log(`[Tokenization] IssuanceCase created for submission ${id}`);
      } else {
        issuanceCase = existingCase;
      }
    }

    return res.json({ 
      success: true, 
      message: 'Submission sent for review',
      submission: {
        id: updated.id,
        status: updated.status,
        submittedAt: updated.submittedAt
      },
      issuanceCase: issuanceCase ? { id: issuanceCase.id, status: issuanceCase.status } : undefined,
    });
  } catch (error) {
    console.error('[Tokenization] Error submitting:', error);
    return res.status(500).json({ error: 'Failed to submit for review' });
  }
});

export default router;
