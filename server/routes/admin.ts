import { Router, Request, Response } from 'express';
import { requireAuth } from '@clerk/express';
import prisma from '../lib/prisma';
import { adminOnly, loadUserWithRole, AuthenticatedRequest } from '../middleware/admin';

const router = Router();

router.post('/user/set-role', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;
    const admin = (req as AuthenticatedRequest).user;

    if (!userId || !role) {
      return res.status(400).json({ error: 'userId and role are required' });
    }

    if (!['USER', 'TOKENIZER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be USER, TOKENIZER, or ADMIN' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role as 'USER' | 'TOKENIZER' | 'ADMIN' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    console.log(`[Admin] User ${admin?.email} changed role of ${updatedUser.email} to ${role}`);

    return res.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error setting user role:', error);
    return res.status(500).json({ error: 'Failed to set user role' });
  }
});

router.get('/user/role', requireAuth, loadUserWithRole, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    return res.json({
      role: user?.role || 'USER',
      isAdmin: user?.role === 'ADMIN',
      isTokenizer: user?.role === 'TOKENIZER',
    });
  } catch (error) {
    console.error('Error getting user role:', error);
    return res.status(500).json({ error: 'Failed to get user role' });
  }
});

router.get('/users', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { search, role, page = '1', limit = '20' } = req.query;
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    if (role && ['USER', 'TOKENIZER', 'ADMIN'].includes(role as string)) {
      where.role = role as string;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          kycStatus: true,
          createdAt: true,
          _count: {
            select: {
              holdings: true,
              transactions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/tokenizations', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (status && ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED'].includes(status as string)) {
      where.status = status as string;
    }

    const [submissions, total] = await Promise.all([
      prisma.tokenizationSubmission.findMany({
        where,
        include: {
          tokenizer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.tokenizationSubmission.count({ where }),
    ]);

    return res.json({
      submissions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching tokenizations:', error);
    return res.status(500).json({ error: 'Failed to fetch tokenizations' });
  }
});

router.get('/tokenizations/:id', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const submission = await prisma.tokenizationSubmission.findUnique({
      where: { id },
      include: {
        tokenizer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            kycStatus: true,
          },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Tokenization submission not found' });
    }

    return res.json({ submission });
  } catch (error) {
    console.error('Error fetching tokenization:', error);
    return res.status(500).json({ error: 'Failed to fetch tokenization' });
  }
});

router.post('/tokenizations/:id/approve', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const admin = (req as AuthenticatedRequest).user;

    const submission = await prisma.tokenizationSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Tokenization submission not found' });
    }

    if (submission.status !== 'SUBMITTED' && submission.status !== 'IN_REVIEW') {
      return res.status(400).json({ 
        error: `Cannot approve submission with status ${submission.status}. Must be SUBMITTED or IN_REVIEW.` 
      });
    }

    const updatedSubmission = await prisma.tokenizationSubmission.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: admin?.id,
        reviewNotes: notes,
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
      include: {
        tokenizer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`[Admin] Tokenization ${id} approved by ${admin?.email}`);

    return res.json({
      success: true,
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error('Error approving tokenization:', error);
    return res.status(500).json({ error: 'Failed to approve tokenization' });
  }
});

router.post('/tokenizations/:id/reject', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;
    const admin = (req as AuthenticatedRequest).user;

    const submission = await prisma.tokenizationSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Tokenization submission not found' });
    }

    if (submission.status !== 'SUBMITTED' && submission.status !== 'IN_REVIEW') {
      return res.status(400).json({ 
        error: `Cannot reject submission with status ${submission.status}. Must be SUBMITTED or IN_REVIEW.` 
      });
    }

    const updatedSubmission = await prisma.tokenizationSubmission.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: admin?.id,
        reviewNotes: notes,
        rejectionReason: reason || 'Rejected by admin',
        reviewedAt: new Date(),
      },
      include: {
        tokenizer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`[Admin] Tokenization ${id} rejected by ${admin?.email}: ${reason}`);

    return res.json({
      success: true,
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error('Error rejecting tokenization:', error);
    return res.status(500).json({ error: 'Failed to reject tokenization' });
  }
});

router.post('/tokenizations/:id/start-review', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = (req as AuthenticatedRequest).user;

    const submission = await prisma.tokenizationSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Tokenization submission not found' });
    }

    if (submission.status !== 'SUBMITTED') {
      return res.status(400).json({ 
        error: `Cannot start review for submission with status ${submission.status}. Must be SUBMITTED.` 
      });
    }

    const updatedSubmission = await prisma.tokenizationSubmission.update({
      where: { id },
      data: {
        status: 'IN_REVIEW',
        reviewedById: admin?.id,
      },
      include: {
        tokenizer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`[Admin] Tokenization ${id} review started by ${admin?.email}`);

    return res.json({
      success: true,
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error('Error starting tokenization review:', error);
    return res.status(500).json({ error: 'Failed to start review' });
  }
});

router.get('/stats', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalProperties,
      totalTokenizations,
      pendingTokenizations,
      usersByRole,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.tokenizationSubmission.count(),
      prisma.tokenizationSubmission.count({ where: { status: 'SUBMITTED' } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
    ]);

    return res.json({
      stats: {
        totalUsers,
        totalProperties,
        totalTokenizations,
        pendingTokenizations,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = item._count.role;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
