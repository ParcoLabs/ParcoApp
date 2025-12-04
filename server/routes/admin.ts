import { Router, Request, Response } from 'express';
import { requireAuth } from '@clerk/express';
import prisma from '../lib/prisma';
import { adminOnly, loadUserWithRole, AuthenticatedRequest } from '../middleware/admin';
import { isDemoMode, generateMockTxHash } from '../lib/demoMode';
import { rentDistributionService } from '../services/rentDistribution';

const router = Router();

const DEMO_MODE = process.env.DEMO_MODE === 'true';

router.get('/debug/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        clerkId: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return res.json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users', details: String(error) });
  }
});

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

router.get('/properties', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (status && ['DRAFT', 'PENDING_APPROVAL', 'FUNDING', 'FUNDED', 'ACTIVE', 'SOLD', 'DELISTED'].includes(status as string)) {
      where.status = status as string;
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          token: true,
          _count: {
            select: {
              holdings: true,
              rentPayments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.property.count({ where }),
    ]);

    return res.json({
      properties: properties.map(p => ({
        ...p,
        totalValue: Number(p.totalValue),
        tokenPrice: Number(p.tokenPrice),
        annualYield: Number(p.annualYield),
        monthlyRent: p.monthlyRent ? Number(p.monthlyRent) : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

router.get('/properties/:id', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        token: true,
        holdings: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        rentPayments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    return res.json({
      property: {
        ...property,
        totalValue: Number(property.totalValue),
        tokenPrice: Number(property.tokenPrice),
        annualYield: Number(property.annualYield),
        monthlyRent: property.monthlyRent ? Number(property.monthlyRent) : null,
      },
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    return res.status(500).json({ error: 'Failed to fetch property' });
  }
});

router.post('/properties/:propertyId/mint-and-list', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const admin = (req as AuthenticatedRequest).user;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { token: true },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.isMinted) {
      return res.status(400).json({ error: 'Property is already minted' });
    }

    if (property.status !== 'PENDING_APPROVAL' && property.status !== 'DRAFT') {
      return res.status(400).json({ 
        error: `Cannot mint property with status ${property.status}. Must be PENDING_APPROVAL or DRAFT.` 
      });
    }

    let mintTxHash: string;
    let tokenRecord = property.token;

    const demoMode = isDemoMode();

    if (demoMode) {
      mintTxHash = generateMockTxHash();
      console.log(`[Admin] Demo mode: Simulating mint for property ${propertyId}`);
    } else {
      try {
        const { getEVMClient } = await import('../blockchain/evm');
        const evmClient = getEVMClient();
        
        const tokenId = Date.now();
        const metadataUri = `ipfs://property/${propertyId}`;
        
        const result = await evmClient.createProperty(
          tokenId,
          property.totalTokens,
          metadataUri
        );
        
        mintTxHash = result.txHash;
        
        if (!tokenRecord) {
          tokenRecord = await prisma.token.create({
            data: {
              propertyId: property.id,
              tokenId: tokenId.toString(),
              totalSupply: property.totalTokens,
              chainId: 137,
              standard: 'ERC1155',
              deployedAt: new Date(),
            },
          });
        }
      } catch (blockchainError) {
        console.error('Blockchain mint error:', blockchainError);
        return res.status(500).json({ 
          error: 'Failed to mint tokens on blockchain',
          details: blockchainError instanceof Error ? blockchainError.message : 'Unknown error'
        });
      }
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        isMinted: true,
        isListable: true,
        isPaused: false,
        mintedAt: new Date(),
        mintTxHash,
        status: 'FUNDING',
      },
      include: { token: true },
    });

    console.log(`[Admin] Property ${propertyId} minted and listed by ${admin?.email}, txHash: ${mintTxHash}`);

    return res.json({
      success: true,
      property: {
        ...updatedProperty,
        totalValue: Number(updatedProperty.totalValue),
        tokenPrice: Number(updatedProperty.tokenPrice),
        annualYield: Number(updatedProperty.annualYield),
      },
      mintTxHash,
      demoMode,
    });
  } catch (error) {
    console.error('Error minting property:', error);
    return res.status(500).json({ error: 'Failed to mint and list property' });
  }
});

router.post('/property/:id/pause', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = (req as AuthenticatedRequest).user;

    const property = await prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.isPaused) {
      return res.status(400).json({ error: 'Property is already paused' });
    }

    const updatedProperty = await prisma.property.update({
      where: { id },
      data: { isPaused: true },
    });

    console.log(`[Admin] Property ${id} paused by ${admin?.email}`);

    return res.json({
      success: true,
      property: {
        ...updatedProperty,
        totalValue: Number(updatedProperty.totalValue),
        tokenPrice: Number(updatedProperty.tokenPrice),
        annualYield: Number(updatedProperty.annualYield),
      },
    });
  } catch (error) {
    console.error('Error pausing property:', error);
    return res.status(500).json({ error: 'Failed to pause property' });
  }
});

router.post('/property/:id/unpause', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = (req as AuthenticatedRequest).user;

    const property = await prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (!property.isPaused) {
      return res.status(400).json({ error: 'Property is not paused' });
    }

    const updatedProperty = await prisma.property.update({
      where: { id },
      data: { isPaused: false },
    });

    console.log(`[Admin] Property ${id} unpaused by ${admin?.email}`);

    return res.json({
      success: true,
      property: {
        ...updatedProperty,
        totalValue: Number(updatedProperty.totalValue),
        tokenPrice: Number(updatedProperty.tokenPrice),
        annualYield: Number(updatedProperty.annualYield),
      },
    });
  } catch (error) {
    console.error('Error unpausing property:', error);
    return res.status(500).json({ error: 'Failed to unpause property' });
  }
});

router.get('/investors/search', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { q, page = '1', limit = '20' } = req.query;
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (q) {
      where.OR = [
        { email: { contains: q as string, mode: 'insensitive' } },
        { firstName: { contains: q as string, mode: 'insensitive' } },
        { lastName: { contains: q as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          kycStatus: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              holdings: true,
              transactions: true,
              borrowPositions: true,
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
      investors: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error searching investors:', error);
    return res.status(500).json({ error: 'Failed to search investors' });
  }
});

router.get('/investors/:userId', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        kycVerification: true,
        vaultAccount: true,
        holdings: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                tokenPrice: true,
                annualYield: true,
              },
            },
          },
        },
        borrowPositions: {
          include: {
            collaterals: true,
            repayments: {
              orderBy: { paidAt: 'desc' },
              take: 5,
            },
          },
        },
        rentDistributions: {
          orderBy: { distributedAt: 'desc' },
          take: 20,
          include: {
            rentPayment: {
              select: {
                periodStart: true,
                periodEnd: true,
                grossAmount: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const portfolioValue = user.holdings.reduce((sum, h) => {
      return sum + (h.quantity * Number(h.property.tokenPrice));
    }, 0);

    const totalRentEarned = user.rentDistributions.reduce((sum, rd) => {
      return sum + Number(rd.netAmount);
    }, 0);

    const activeBorrowPositions = user.borrowPositions.filter(bp => bp.status === 'ACTIVE');
    const totalBorrowed = activeBorrowPositions.reduce((sum, bp) => {
      return sum + Number(bp.principal);
    }, 0);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
      },
      kycStatus: user.kycVerification?.status || 'NONE',
      kycLevel: user.kycStatus,
      holdings: user.holdings.map(h => ({
        ...h,
        totalValue: h.quantity * Number(h.property.tokenPrice),
        averageCost: Number(h.averageCost),
        totalInvested: Number(h.totalInvested),
        rentEarned: Number(h.rentEarned),
      })),
      vaultBalance: user.vaultAccount ? {
        usdcBalance: Number(user.vaultAccount.usdcBalance),
        lockedBalance: Number(user.vaultAccount.lockedBalance),
        totalDeposited: Number(user.vaultAccount.totalDeposited),
        totalWithdrawn: Number(user.vaultAccount.totalWithdrawn),
        totalEarned: Number(user.vaultAccount.totalEarned),
      } : null,
      borrowPositions: user.borrowPositions.map(bp => ({
        id: bp.id,
        principal: Number(bp.principal),
        interestRate: Number(bp.interestRate),
        accruedInterest: Number(bp.accruedInterest),
        collateralValue: Number(bp.collateralValue),
        status: bp.status,
        borrowedAt: bp.borrowedAt,
        collaterals: bp.collaterals.map(c => ({
          propertyId: c.propertyId,
          amount: c.amount,
          valueAtLock: Number(c.valueAtLock),
        })),
      })),
      rentHistory: user.rentDistributions.map(rd => ({
        id: rd.id,
        propertyId: rd.propertyId,
        grossAmount: Number(rd.grossAmount),
        interestDeducted: Number(rd.interestDeducted),
        netAmount: Number(rd.netAmount),
        distributedAt: rd.distributedAt,
        period: rd.rentPayment ? {
          start: rd.rentPayment.periodStart,
          end: rd.rentPayment.periodEnd,
        } : null,
      })),
      summary: {
        portfolioValue,
        totalRentEarned,
        totalBorrowed,
        holdingsCount: user.holdings.length,
        activeBorrowPositions: activeBorrowPositions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching investor:', error);
    return res.status(500).json({ error: 'Failed to fetch investor details' });
  }
});

router.post('/rent/run', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const admin = (req as AuthenticatedRequest).user;
    const { propertyIds, dryRun = false } = req.body;

    if (rentDistributionService.isDistributionRunning()) {
      return res.status(409).json({ 
        error: 'A rent distribution is already in progress. Please wait for it to complete.' 
      });
    }

    console.log(`[Admin] Rent distribution triggered by ${admin?.email}, dryRun: ${dryRun}`);

    const result = await rentDistributionService.runDistribution({
      triggeredBy: admin?.email || 'admin',
      propertyIds: propertyIds?.length > 0 ? propertyIds : undefined,
      dryRun,
    });

    return res.json({
      success: true,
      summary: {
        runId: result.runId,
        propertiesProcessed: result.propertiesProcessed,
        rentPaymentsProcessed: result.rentPaymentsProcessed,
        holdersDistributed: result.holdersDistributed,
        totalGrossDistributed: result.totalGrossDistributed,
        totalInterestDeducted: result.totalInterestDeducted,
        totalNetDistributed: result.totalNetDistributed,
        status: result.status,
        errors: result.errors,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        dryRun,
      },
    });
  } catch (error) {
    console.error('Error running rent distribution:', error);
    return res.status(500).json({ 
      error: 'Failed to run rent distribution',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/rent/history', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { limit = '10', offset = '0' } = req.query;

    const runs = await rentDistributionService.getDistributionHistory({
      limit: parseInt(limit as string) || 10,
      offset: parseInt(offset as string) || 0,
    });

    return res.json({
      runs: runs.map(run => ({
        ...run,
        totalGrossDistributed: Number(run.totalGrossDistributed),
        totalInterestDeducted: Number(run.totalInterestDeducted),
        totalNetDistributed: Number(run.totalNetDistributed),
      })),
    });
  } catch (error) {
    console.error('Error fetching rent history:', error);
    return res.status(500).json({ error: 'Failed to fetch rent distribution history' });
  }
});

router.get('/rent/pending', requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const pendingPayments = await prisma.rentPayment.findMany({
      where: { status: 'PENDING' },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            totalTokens: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      pendingPayments: pendingPayments.map(rp => ({
        id: rp.id,
        propertyId: rp.propertyId,
        propertyName: rp.property.name,
        periodStart: rp.periodStart,
        periodEnd: rp.periodEnd,
        grossAmount: Number(rp.grossAmount),
        netAmount: Number(rp.netAmount),
        managementFee: Number(rp.managementFee),
        perTokenAmount: Number(rp.perTokenAmount),
        createdAt: rp.createdAt,
      })),
      totalPending: pendingPayments.length,
      totalAmount: pendingPayments.reduce((sum, rp) => sum + Number(rp.netAmount), 0),
    });
  } catch (error) {
    console.error('Error fetching pending rent payments:', error);
    return res.status(500).json({ error: 'Failed to fetch pending rent payments' });
  }
});

export default router;
