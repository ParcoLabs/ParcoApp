import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import prisma from '../lib/prisma';
import { adminOnly, loadUserWithRole, AuthenticatedRequest } from '../middleware/admin';
import { isDemoMode, generateMockTxHash } from '../lib/demoMode';
import { rentDistributionService } from '../services/rentDistribution';

const router = Router();

const DEMO_MODE = process.env.DEMO_MODE === 'true';

const simpleAuth = async (req: Request, res: Response, next: Function) => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  } catch (error) {
    console.error('[simpleAuth] Error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

router.post('/user/set-role', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.get('/user/role', simpleAuth, loadUserWithRole, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    console.log(`[Admin] /user/role called - User: ${user?.email}, Role: ${user?.role}`);
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

router.get('/users', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.get('/tokenizations', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.get('/tokenizations/:id', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.post('/tokenizations/:id/approve', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.post('/tokenizations/:id/reject', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.post('/tokenizations/:id/start-review', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.get('/stats', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.get('/properties', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.get('/properties/:id', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.post('/properties/:propertyId/mint-and-list', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.post('/property/:id/pause', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.post('/property/:id/unpause', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.get('/investors/search', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.get('/investors/:userId', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.post('/rent/run', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.get('/rent/history', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

router.get('/rent/pending', simpleAuth, adminOnly, async (req: Request, res: Response) => {
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

const VALID_CAPABILITY_KEYS = ['secondaryEnabled', 'borrowEnabled', 'transferRestricted', 'lockupDays'];

router.get('/properties/:id/capabilities', simpleAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isDemoMode(req)) {
      return res.json({
        success: true,
        data: { secondaryEnabled: false, borrowEnabled: true, transferRestricted: true, lockupDays: 90 },
      });
    }

    const property = await prisma.property.findUnique({ where: { id }, select: { capabilities: true } });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    return res.json({ success: true, data: property.capabilities || {} });
  } catch (error: any) {
    console.error('[admin] Error fetching capabilities:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/properties/:id/capabilities', simpleAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { capabilities } = req.body;
    const admin = (req as AuthenticatedRequest).user;

    if (!capabilities || typeof capabilities !== 'object') {
      return res.status(400).json({ error: 'capabilities object is required' });
    }

    for (const key of Object.keys(capabilities)) {
      if (!VALID_CAPABILITY_KEYS.includes(key)) {
        return res.status(400).json({ error: `Unknown capability key: ${key}. Valid keys: ${VALID_CAPABILITY_KEYS.join(', ')}` });
      }
      if (key === 'lockupDays') {
        if (typeof capabilities[key] !== 'number' || capabilities[key] < 0) {
          return res.status(400).json({ error: 'lockupDays must be a non-negative number' });
        }
      } else {
        if (typeof capabilities[key] !== 'boolean') {
          return res.status(400).json({ error: `${key} must be a boolean` });
        }
      }
    }

    if (isDemoMode(req)) {
      return res.json({
        success: true,
        data: capabilities,
      });
    }

    const property = await prisma.property.findUnique({ where: { id }, select: { capabilities: true } });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const oldCapabilities = property.capabilities || {};
    const merged = { ...(oldCapabilities as object), ...capabilities };

    const updated = await prisma.property.update({
      where: { id },
      data: { capabilities: merged },
      select: { id: true, capabilities: true },
    });

    await prisma.auditEvent.create({
      data: {
        type: 'CAPABILITIES_UPDATED',
        entityId: id,
        userId: admin?.id || null,
        oldValue: oldCapabilities as object,
        newValue: merged,
      },
    });

    console.log(`[Admin] Capabilities updated for property ${id} by ${admin?.email}`);

    return res.json({ success: true, data: updated.capabilities });
  } catch (error: any) {
    console.error('[admin] Error updating capabilities:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/engagement/summary', simpleAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    if (isDemoMode(req)) {
      return res.json({
        success: true,
        data: {
          totalUsers: 127,
          activeCount: 89,
          atRiskCount: 23,
          dormantCount: 15,
          scoreBuckets: { high: 45, medium: 44, low: 23, none: 15 },
          atRiskUsers: [
            { id: 'demo_1', email: 'jane.doe@example.com', firstName: 'Jane', lastName: 'Doe', lastActiveAt: new Date(Date.now() - 18 * 86400000).toISOString(), score: 2 },
            { id: 'demo_2', email: 'bob.smith@example.com', firstName: 'Bob', lastName: 'Smith', lastActiveAt: new Date(Date.now() - 21 * 86400000).toISOString(), score: 1 },
            { id: 'demo_3', email: 'alice.jones@example.com', firstName: 'Alice', lastName: 'Jones', lastActiveAt: new Date(Date.now() - 30 * 86400000).toISOString(), score: 0 },
          ],
        },
      });
    }

    const { recomputeAllEngagement } = await import('../services/investorEngagement');

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const [totalUsers, activeRecent, allStatuses] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.investorActivityEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.investorEngagementStatus.findMany({
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
    ]);

    const atRiskUsers = allStatuses
      .filter(s => s.lastActiveAt && s.lastActiveAt < fourteenDaysAgo)
      .sort((a, b) => (a.lastActiveAt?.getTime() || 0) - (b.lastActiveAt?.getTime() || 0))
      .slice(0, 20)
      .map(s => ({
        id: s.user.id,
        email: s.user.email,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        lastActiveAt: s.lastActiveAt,
        score: s.score,
      }));

    const high = allStatuses.filter(s => s.score >= 10).length;
    const medium = allStatuses.filter(s => s.score >= 5 && s.score < 10).length;
    const low = allStatuses.filter(s => s.score > 0 && s.score < 5).length;
    const none = allStatuses.filter(s => s.score === 0).length;

    return res.json({
      success: true,
      data: {
        totalUsers,
        activeCount: activeRecent.length,
        atRiskCount: atRiskUsers.length,
        dormantCount: none,
        scoreBuckets: { high, medium, low, none },
        atRiskUsers,
      },
    });
  } catch (error: any) {
    console.error('[admin] Error fetching engagement summary:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/property/:propertyId/notices', simpleAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { title, bodyMarkdown } = req.body;

    if (!title || !bodyMarkdown) {
      return res.status(400).json({ error: 'title and bodyMarkdown are required' });
    }

    if (isDemoMode(req)) {
      return res.json({
        success: true,
        data: {
          id: `demo_notice_${Date.now()}`,
          propertyId,
          title,
          bodyMarkdown,
          status: 'DRAFT',
          publishedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    const notice = await (prisma as any).governanceNotice.create({
      data: {
        propertyId,
        title,
        bodyMarkdown,
        status: 'DRAFT',
      },
    });

    return res.json({ success: true, data: notice });
  } catch (error: any) {
    console.error('[admin] Error creating governance notice:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/notices/:id/publish', simpleAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isDemoMode(req)) {
      return res.json({
        success: true,
        data: {
          id,
          status: 'PUBLISHED',
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    const notice = await (prisma as any).governanceNotice.findUnique({ where: { id } });
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    const updated = await (prisma as any).governanceNotice.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[admin] Error publishing governance notice:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/property/:propertyId/votes', simpleAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { title, description, options, closesAt } = req.body;

    if (!title || !description || !options || !Array.isArray(options)) {
      return res.status(400).json({ error: 'title, description, and options (array of {key, label}) are required' });
    }

    if (isDemoMode(req)) {
      return res.json({
        success: true,
        data: {
          id: `demo_vote_${Date.now()}`,
          propertyId,
          title,
          description,
          options,
          status: 'OPEN',
          closesAt: closesAt || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ballots: [],
        },
      });
    }

    const vote = await (prisma as any).governanceVote.create({
      data: {
        propertyId,
        title,
        description,
        options,
        status: 'OPEN',
        closesAt: closesAt ? new Date(closesAt) : null,
      },
    });

    return res.json({ success: true, data: vote });
  } catch (error: any) {
    console.error('[admin] Error creating governance vote:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/votes/:id/close', simpleAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isDemoMode(req)) {
      return res.json({
        success: true,
        data: {
          id,
          status: 'CLOSED',
          updatedAt: new Date().toISOString(),
        },
      });
    }

    const vote = await (prisma as any).governanceVote.findUnique({ where: { id } });
    if (!vote) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    const updated = await (prisma as any).governanceVote.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[admin] Error closing governance vote:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/property/:propertyId/governance', simpleAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;

    if (isDemoMode(req)) {
      return res.json({
        success: true,
        data: {
          notices: [
            {
              id: 'demo_notice_1',
              propertyId,
              title: 'Q1 Property Update',
              bodyMarkdown: 'All units remain occupied. HVAC maintenance completed on schedule.',
              status: 'PUBLISHED',
              publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
              createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
              updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            },
            {
              id: 'demo_notice_2',
              propertyId,
              title: 'Upcoming Roof Inspection',
              bodyMarkdown: 'Annual roof inspection scheduled for next month.',
              status: 'DRAFT',
              publishedAt: null,
              createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
              updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            },
          ],
          votes: [
            {
              id: 'demo_vote_1',
              propertyId,
              title: 'Approve landscaping upgrade',
              description: 'Proposal to upgrade common area landscaping at an estimated cost of $5,000.',
              options: [{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }],
              status: 'OPEN',
              closesAt: new Date(Date.now() + 14 * 86400000).toISOString(),
              createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
              updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
              _count: { ballots: 3 },
            },
          ],
        },
      });
    }

    const [notices, votes] = await Promise.all([
      (prisma as any).governanceNotice.findMany({
        where: { propertyId },
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).governanceVote.findMany({
        where: { propertyId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { ballots: true } },
        },
      }),
    ]);

    return res.json({ success: true, data: { notices, votes } });
  } catch (error: any) {
    console.error('[admin] Error fetching governance data:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/compliance/due-soon', simpleAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const windowDays = parseInt(req.query.windowDays as string) || 30;

    if (isDemoMode()) {
      const now = new Date();
      const demoItems = [
        {
          id: 'demo_cr_ds_1',
          propertyId: 'demo_prop_1',
          caseId: null,
          key: 'monthly_kpi',
          label: 'Monthly KPI Report',
          cadence: 'MONTHLY',
          status: 'PENDING',
          dueAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
          notes: null,
          evidence: [],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          property: { id: 'demo_prop_1', name: '1492 E 84th St' },
        },
        {
          id: 'demo_cr_ds_2',
          propertyId: 'demo_prop_1',
          caseId: null,
          key: 'quarterly_ops_update',
          label: 'Quarterly Operations Update',
          cadence: 'QUARTERLY',
          status: 'IN_PROGRESS',
          dueAt: new Date(now.getTime() + 14 * 86400000).toISOString(),
          notes: 'Gathering data from property manager',
          evidence: [
            { id: 'demo_ev_ds_1', name: 'Q1_draft.pdf', url: '/uploads/demo/q1_draft.pdf', createdAt: now.toISOString() },
          ],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          property: { id: 'demo_prop_1', name: '1492 E 84th St' },
        },
        {
          id: 'demo_cr_ds_3',
          propertyId: 'demo_prop_2',
          caseId: null,
          key: 'annual_audit',
          label: 'Annual Financial Audit',
          cadence: 'ANNUAL',
          status: 'PENDING',
          dueAt: new Date(now.getTime() + 21 * 86400000).toISOString(),
          notes: null,
          evidence: [],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          property: { id: 'demo_prop_2', name: '560 State St' },
        },
        {
          id: 'demo_cr_ds_4',
          propertyId: 'demo_prop_2',
          caseId: null,
          key: 'insurance_renewal',
          label: 'Insurance Policy Renewal',
          cadence: 'ANNUAL',
          status: 'BLOCKED',
          dueAt: new Date(now.getTime() + 5 * 86400000).toISOString(),
          notes: 'Waiting for updated appraisal',
          evidence: [],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          property: { id: 'demo_prop_2', name: '560 State St' },
        },
        {
          id: 'demo_cr_ds_5',
          propertyId: 'demo_prop_1',
          caseId: null,
          key: 'tax_filing',
          label: 'Quarterly Tax Filing',
          cadence: 'QUARTERLY',
          status: 'COMPLETED',
          dueAt: new Date(now.getTime() + 2 * 86400000).toISOString(),
          notes: 'Filed on time',
          evidence: [
            { id: 'demo_ev_ds_2', name: 'tax_receipt.pdf', url: '/uploads/demo/tax_receipt.pdf', createdAt: now.toISOString() },
          ],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          property: { id: 'demo_prop_1', name: '1492 E 84th St' },
        },
      ];
      return res.json({ success: true, data: demoItems });
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() + windowDays * 86400000);

    const requirements = await prisma.complianceRequirement.findMany({
      where: {
        dueAt: {
          lte: cutoff,
        },
        status: { not: 'COMPLETED' },
      },
      include: {
        evidence: true,
        property: {
          select: { id: true, name: true },
        },
      },
      orderBy: { dueAt: 'asc' },
    });

    return res.json({ success: true, data: requirements });
  } catch (error: any) {
    console.error('[admin] Error fetching compliance due-soon:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/property/:propertyId/tax-pack/generate', simpleAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { year } = req.body;

    if (!year || typeof year !== 'number') {
      return res.status(400).json({ error: 'year (number) is required' });
    }

    if (isDemoMode(req)) {
      const holders = [
        { userId: 'demo_user_1', name: 'Demo Investor' },
        { userId: 'demo_user_2', name: 'Jane Smith' },
      ];
      const docs = holders.map((h, i) => ({
        id: `demo_tax_${year}_${i}`,
        userId: h.userId,
        propertyId,
        year,
        type: 'ANNUAL_SUMMARY',
        url: `/api/tax-documents/demo_tax_${year}_${i}/download`,
        createdAt: new Date().toISOString(),
      }));
      return res.json({ success: true, data: { generated: docs.length, documents: docs } });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true },
    });
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const holdings = await prisma.holding.findMany({
      where: { propertyId },
      select: { userId: true, quantity: true },
    });

    if (holdings.length === 0) {
      return res.json({ success: true, data: { generated: 0, documents: [] } });
    }

    const docs = [];
    for (const holding of holdings) {
      const doc = await (prisma as any).taxDocument.upsert({
        where: {
          userId_propertyId_year_type: {
            userId: holding.userId,
            propertyId,
            year,
            type: 'ANNUAL_SUMMARY',
          },
        },
        update: {},
        create: {
          userId: holding.userId,
          propertyId,
          year,
          type: 'ANNUAL_SUMMARY',
          url: `/api/tax-documents/property/${propertyId}/user/${holding.userId}/year/${year}/annual-summary`,
        },
      });
      docs.push(doc);
    }

    return res.json({ success: true, data: { generated: docs.length, documents: docs } });
  } catch (error: any) {
    console.error('[admin] Error generating tax pack:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
