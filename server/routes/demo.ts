import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { isDemoMode } from '../lib/demoMode';
import { validateAuth } from '../middleware/auth';

const router = Router();

const DEMO_WALLET_PREFIX = 'demo_wallet_';
const INITIAL_DEMO_BALANCE = 25000;

const requireDemoMode = (req: any, res: any, next: any) => {
  if (!isDemoMode()) {
    return res.status(403).json({
      success: false,
      error: 'Demo mode is not enabled',
      code: 'DEMO_MODE_DISABLED',
    });
  }
  next();
};

router.post('/create-user', requireDemoMode, validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        vaultAccount: true,
        kycVerification: true,
        holdings: true,
      },
    });

    if (existingUser) {
      const properties = await prisma.property.findMany({
        where: { status: 'ACTIVE' },
        include: { token: true },
      });

      await prisma.$transaction(async (tx) => {
        if (!existingUser.kycVerification) {
          await tx.kYCVerification.create({
            data: {
              userId: existingUser.id,
              status: 'APPROVED',
              level: 'VERIFIED',
              sumsubApplicantId: `demo_applicant_${Date.now()}`,
              sumsubExternalId: `demo_external_${existingUser.id}`,
              verificationDate: new Date(),
            },
          });
        } else {
          await tx.kYCVerification.update({
            where: { id: existingUser.kycVerification.id },
            data: {
              status: 'APPROVED',
              level: 'VERIFIED',
              verificationDate: new Date(),
            },
          });
        }

        await tx.user.update({
          where: { id: existingUser.id },
          data: { kycStatus: 'VERIFIED' },
        });

        if (!existingUser.vaultAccount) {
          await tx.vaultAccount.create({
            data: {
              userId: existingUser.id,
              walletAddress: `${DEMO_WALLET_PREFIX}${existingUser.id}`,
              usdcBalance: INITIAL_DEMO_BALANCE,
              totalDeposited: INITIAL_DEMO_BALANCE,
            },
          });
        } else {
          await tx.vaultAccount.update({
            where: { id: existingUser.vaultAccount.id },
            data: {
              usdcBalance: INITIAL_DEMO_BALANCE,
              totalDeposited: INITIAL_DEMO_BALANCE,
              lockedBalance: 0,
            },
          });
        }

        for (const property of properties) {
          if (!property.token) continue;
          
          const existingHolding = existingUser.holdings.find(h => h.propertyId === property.id);
          if (!existingHolding) {
            await tx.holding.create({
              data: {
                userId: existingUser.id,
                propertyId: property.id,
                tokenId: property.token.id,
                quantity: 0,
                averageCost: 0,
                totalInvested: 0,
              },
            });
          }
        }
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: existingUser.id },
        include: {
          vaultAccount: true,
          kycVerification: true,
          holdings: { include: { property: true } },
        },
      });

      return res.json({
        success: true,
        demoMode: true,
        message: 'Demo user setup complete',
        data: {
          user: {
            id: updatedUser!.id,
            email: updatedUser!.email,
            firstName: updatedUser!.firstName,
            lastName: updatedUser!.lastName,
            kycStatus: 'VERIFIED',
          },
          vault: {
            balance: INITIAL_DEMO_BALANCE,
            walletAddress: updatedUser!.vaultAccount?.walletAddress,
          },
          holdings: updatedUser!.holdings.map(h => ({
            propertyId: h.propertyId,
            propertyName: h.property.name,
            quantity: h.quantity,
          })),
        },
      });
    }

    return res.status(404).json({
      success: false,
      error: 'User not found. Please sign up first.',
    });
  } catch (error: any) {
    console.error('Error creating demo user:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create demo user',
    });
  }
});

router.post('/buy', requireDemoMode, validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { propertyId, quantity } = req.body;

    if (!propertyId || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: 'Property ID and quantity are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { vaultAccount: true },
    });

    if (!user || !user.vaultAccount) {
      return res.status(404).json({
        success: false,
        error: 'User or vault not found. Please setup demo first.',
      });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { token: true },
    });

    if (!property || !property.token) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    const tokenPrice = Number(property.tokenPrice);
    const totalCost = tokenPrice * quantity;
    const vaultBalance = Number(user.vaultAccount.usdcBalance);

    if (totalCost > vaultBalance) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient demo balance',
        required: totalCost,
        available: vaultBalance,
      });
    }

    if (quantity > property.availableTokens) {
      return res.status(400).json({
        success: false,
        error: 'Not enough tokens available',
        requested: quantity,
        available: property.availableTokens,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.vaultAccount.update({
        where: { id: user.vaultAccount!.id },
        data: {
          usdcBalance: { decrement: totalCost },
        },
      });

      const existingHolding = await tx.holding.findUnique({
        where: {
          userId_propertyId: {
            userId: user.id,
            propertyId: property.id,
          },
        },
      });

      let holding;
      if (existingHolding) {
        const newQuantity = existingHolding.quantity + quantity;
        const newTotalInvested = Number(existingHolding.totalInvested) + totalCost;
        const newAverageCost = newTotalInvested / newQuantity;

        holding = await tx.holding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: newQuantity,
            totalInvested: newTotalInvested,
            averageCost: newAverageCost,
          },
        });
      } else {
        holding = await tx.holding.create({
          data: {
            userId: user.id,
            propertyId: property.id,
            tokenId: property.token!.id,
            quantity,
            averageCost: tokenPrice,
            totalInvested: totalCost,
          },
        });
      }

      await tx.property.update({
        where: { id: property.id },
        data: {
          availableTokens: { decrement: quantity },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'BUY',
          status: 'COMPLETED',
          amount: totalCost,
          currency: 'USDC',
          propertyId: property.id,
          tokenQuantity: quantity,
          tokenPrice: tokenPrice,
          txHash: `demo_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          description: `Demo purchase of ${quantity} tokens of ${property.name}`,
          completedAt: new Date(),
        },
      });

      return { holding, transaction };
    });

    const updatedVault = await prisma.vaultAccount.findUnique({
      where: { id: user.vaultAccount.id },
    });

    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      include: { property: true },
    });

    res.json({
      success: true,
      demoMode: true,
      data: {
        transaction: {
          id: result.transaction.id,
          type: 'BUY',
          amount: totalCost,
          quantity,
          propertyName: property.name,
          txHash: result.transaction.txHash,
        },
        vault: {
          balance: Number(updatedVault?.usdcBalance || 0),
        },
        portfolio: holdings.map(h => ({
          propertyId: h.propertyId,
          propertyName: h.property.name,
          quantity: h.quantity,
          totalInvested: Number(h.totalInvested),
          currentValue: h.quantity * Number(h.property.tokenPrice),
        })),
      },
    });
  } catch (error: any) {
    console.error('Error processing demo buy:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process demo purchase',
    });
  }
});

router.post('/run-rent-cycle', requireDemoMode, validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        vaultAccount: true,
        holdings: { include: { property: true } },
      },
    });

    if (!user || !user.vaultAccount) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const holdingsWithTokens = user.holdings.filter(h => h.quantity > 0);

    if (holdingsWithTokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No property tokens held. Buy some tokens first.',
      });
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let totalRentDistributed = 0;
    const distributions: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const holding of holdingsWithTokens) {
        const property = holding.property;
        const annualYield = Number(property.annualYield) / 100;
        const monthlyYield = annualYield / 12;
        
        const tokenValue = Number(property.tokenPrice) * holding.quantity;
        const rentAmount = tokenValue * monthlyYield;
        
        const rentPayment = await tx.rentPayment.create({
          data: {
            propertyId: property.id,
            periodStart,
            periodEnd,
            grossAmount: rentAmount,
            netAmount: rentAmount,
            managementFee: 0,
            perTokenAmount: rentAmount / holding.quantity,
            status: 'COMPLETED',
            distributedAt: now,
            txHash: `demo_rent_${Date.now()}_${property.id}`,
          },
        });

        await tx.rentDistribution.create({
          data: {
            rentPaymentId: rentPayment.id,
            userId: user.id,
            holdingId: holding.id,
            propertyId: property.id,
            tokensHeld: holding.quantity,
            totalTokens: property.totalTokens,
            ownershipPercent: (holding.quantity / property.totalTokens) * 100,
            grossAmount: rentAmount,
            netAmount: rentAmount,
            distributedAt: now,
            txHash: rentPayment.txHash,
          },
        });

        await tx.holding.update({
          where: { id: holding.id },
          data: {
            rentEarned: { increment: rentAmount },
            lastRentDate: now,
          },
        });

        await tx.vaultAccount.update({
          where: { id: user.vaultAccount!.id },
          data: {
            usdcBalance: { increment: rentAmount },
            totalEarned: { increment: rentAmount },
          },
        });

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'RENT_DISTRIBUTION',
            status: 'COMPLETED',
            amount: rentAmount,
            currency: 'USDC',
            propertyId: property.id,
            txHash: rentPayment.txHash,
            description: `Demo rent distribution for ${property.name}`,
            completedAt: now,
          },
        });

        totalRentDistributed += rentAmount;
        distributions.push({
          propertyId: property.id,
          propertyName: property.name,
          tokensHeld: holding.quantity,
          rentAmount: rentAmount,
          annualYield: Number(property.annualYield),
        });
      }
    });

    const updatedVault = await prisma.vaultAccount.findUnique({
      where: { id: user.vaultAccount.id },
    });

    res.json({
      success: true,
      demoMode: true,
      data: {
        totalDistributed: totalRentDistributed,
        distributions,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        vault: {
          balance: Number(updatedVault?.usdcBalance || 0),
          totalEarned: Number(updatedVault?.totalEarned || 0),
        },
      },
    });
  } catch (error: any) {
    console.error('Error running demo rent cycle:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run demo rent cycle',
    });
  }
});

router.post('/borrow', requireDemoMode, validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { propertyId, tokenAmount, borrowAmount } = req.body;

    if (!propertyId || !tokenAmount || !borrowAmount) {
      return res.status(400).json({
        success: false,
        error: 'Property ID, token amount, and borrow amount are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        vaultAccount: true,
        holdings: true,
      },
    });

    if (!user || !user.vaultAccount) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const holding = user.holdings.find(h => h.propertyId === propertyId);
    if (!holding || holding.quantity < tokenAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient tokens to use as collateral',
        available: holding?.quantity || 0,
        requested: tokenAmount,
      });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    const collateralValue = Number(property.tokenPrice) * tokenAmount;
    const maxBorrow = collateralValue * 0.5;

    if (borrowAmount > maxBorrow) {
      return res.status(400).json({
        success: false,
        error: `Borrow amount exceeds 50% LTV. Max: $${maxBorrow.toFixed(2)}`,
        maxBorrow,
        collateralValue,
      });
    }

    const interestRate = 0.08;
    const originationFee = borrowAmount * 0.01;
    const netDisbursement = borrowAmount - originationFee;

    const result = await prisma.$transaction(async (tx) => {
      await tx.holding.update({
        where: { id: holding.id },
        data: {
          quantity: { decrement: tokenAmount },
        },
      });

      await tx.vaultAccount.update({
        where: { id: user.vaultAccount!.id },
        data: {
          lockedBalance: { increment: collateralValue },
          usdcBalance: { increment: netDisbursement },
        },
      });

      const borrowPosition = await tx.borrowPosition.create({
        data: {
          userId: user.id,
          vaultAccountId: user.vaultAccount!.id,
          principal: borrowAmount,
          interestRate,
          collateralValue,
          collateralRatio: borrowAmount / collateralValue,
          status: 'ACTIVE',
          txHash: `demo_borrow_${Date.now()}`,
        },
      });

      await tx.borrowCollateral.create({
        data: {
          borrowPositionId: borrowPosition.id,
          propertyId,
          tokenId: 1,
          amount: tokenAmount,
          valueAtLock: collateralValue,
          currentValue: collateralValue,
          txHashLock: `demo_lock_${Date.now()}`,
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'BORROW',
          status: 'COMPLETED',
          amount: borrowAmount,
          currency: 'USDC',
          propertyId,
          txHash: borrowPosition.txHash,
          description: `Demo borrow: $${borrowAmount} against ${tokenAmount} tokens`,
          completedAt: new Date(),
          metadata: {
            collateralValue,
            originationFee,
            netDisbursement,
          },
        },
      });

      return { borrowPosition };
    });

    const updatedVault = await prisma.vaultAccount.findUnique({
      where: { id: user.vaultAccount.id },
    });

    res.json({
      success: true,
      demoMode: true,
      data: {
        borrowPosition: {
          id: result.borrowPosition.id,
          principal: borrowAmount,
          interestRate: interestRate * 100,
          collateralValue,
          originationFee,
          netDisbursement,
          status: 'ACTIVE',
        },
        vault: {
          balance: Number(updatedVault?.usdcBalance || 0),
          lockedBalance: Number(updatedVault?.lockedBalance || 0),
        },
      },
    });
  } catch (error: any) {
    console.error('Error processing demo borrow:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process demo borrow',
    });
  }
});

router.post('/repay', requireDemoMode, validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { borrowPositionId, amount } = req.body;

    if (!borrowPositionId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Borrow position ID and amount are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { vaultAccount: true },
    });

    if (!user || !user.vaultAccount) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const borrowPosition = await prisma.borrowPosition.findFirst({
      where: {
        id: borrowPositionId,
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        collaterals: true,
      },
    });

    if (!borrowPosition) {
      return res.status(404).json({
        success: false,
        error: 'Active borrow position not found',
      });
    }

    const principal = Number(borrowPosition.principal);
    const accruedInterest = Number(borrowPosition.accruedInterest);
    const timeSinceBorrow = Date.now() - new Date(borrowPosition.borrowedAt).getTime();
    const yearInMs = 365 * 24 * 60 * 60 * 1000;
    const newInterest = (principal * Number(borrowPosition.interestRate) * timeSinceBorrow) / yearInMs;
    const totalInterest = accruedInterest + newInterest;
    const totalDebt = principal + totalInterest;

    const repayAmount = Math.min(amount, totalDebt);
    const isFullRepayment = repayAmount >= totalDebt - 0.01;

    const vaultBalance = Number(user.vaultAccount.usdcBalance);
    if (repayAmount > vaultBalance) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance for repayment',
        required: repayAmount,
        available: vaultBalance,
      });
    }

    let interestPaid = 0;
    let principalPaid = 0;
    if (repayAmount <= totalInterest) {
      interestPaid = repayAmount;
    } else {
      interestPaid = totalInterest;
      principalPaid = repayAmount - totalInterest;
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.vaultAccount.update({
        where: { id: user.vaultAccount!.id },
        data: {
          usdcBalance: { decrement: repayAmount },
        },
      });

      const newPrincipal = Math.max(0, principal - principalPaid);

      const updatedPosition = await tx.borrowPosition.update({
        where: { id: borrowPositionId },
        data: {
          principal: newPrincipal,
          accruedInterest: 0,
          status: isFullRepayment ? 'REPAID' : 'ACTIVE',
          repaidAt: isFullRepayment ? new Date() : null,
          lastInterestUpdate: new Date(),
        },
      });

      if (isFullRepayment) {
        for (const collateral of borrowPosition.collaterals) {
          const holding = await tx.holding.findFirst({
            where: {
              userId: user.id,
              propertyId: collateral.propertyId,
            },
          });

          if (holding) {
            await tx.holding.update({
              where: { id: holding.id },
              data: {
                quantity: { increment: collateral.amount },
              },
            });
          }

          await tx.borrowCollateral.update({
            where: { id: collateral.id },
            data: {
              unlockedAt: new Date(),
              txHashUnlock: `demo_unlock_${Date.now()}`,
            },
          });
        }

        await tx.vaultAccount.update({
          where: { id: user.vaultAccount!.id },
          data: {
            lockedBalance: { decrement: Number(borrowPosition.collateralValue) },
          },
        });
      }

      await tx.borrowRepayment.create({
        data: {
          borrowPositionId,
          principalPaid,
          interestPaid,
          totalPaid: repayAmount,
          paymentMethodType: 'DEMO_VAULT',
          txHash: `demo_repay_${Date.now()}`,
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'REPAY',
          status: 'COMPLETED',
          amount: repayAmount,
          currency: 'USDC',
          txHash: `demo_repay_tx_${Date.now()}`,
          description: `Demo repayment: $${principalPaid.toFixed(2)} principal + $${interestPaid.toFixed(2)} interest`,
          completedAt: new Date(),
        },
      });

      return { updatedPosition };
    });

    const updatedVault = await prisma.vaultAccount.findUnique({
      where: { id: user.vaultAccount.id },
    });

    res.json({
      success: true,
      demoMode: true,
      data: {
        repayment: {
          amount: repayAmount,
          principalPaid,
          interestPaid,
          isFullRepayment,
        },
        borrowPosition: {
          id: result.updatedPosition.id,
          remainingPrincipal: Number(result.updatedPosition.principal),
          status: result.updatedPosition.status,
        },
        vault: {
          balance: Number(updatedVault?.usdcBalance || 0),
          lockedBalance: Number(updatedVault?.lockedBalance || 0),
        },
      },
    });
  } catch (error: any) {
    console.error('Error processing demo repay:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process demo repayment',
    });
  }
});

router.get('/proposals', requireDemoMode, async (req, res) => {
  try {
    const proposals = await prisma.proposal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        votes: true,
      },
    });

    res.json({
      success: true,
      demoMode: true,
      data: proposals.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        forVotes: p.forVotes,
        againstVotes: p.againstVotes,
        abstainVotes: p.abstainVotes,
        totalVotes: p.forVotes + p.againstVotes + p.abstainVotes,
        votingEndsAt: p.votingEndsAt,
        createdAt: p.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch proposals',
    });
  }
});

router.post('/proposals/create', requireDemoMode, validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { title, description, votingDurationDays = 7 } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const now = new Date();
    const votingEndsAt = new Date(now.getTime() + votingDurationDays * 24 * 60 * 60 * 1000);

    const proposal = await prisma.proposal.create({
      data: {
        title,
        description,
        proposerId: user.id,
        status: 'ACTIVE',
        votingStartsAt: now,
        votingEndsAt,
      },
    });

    res.json({
      success: true,
      demoMode: true,
      data: {
        id: proposal.id,
        title: proposal.title,
        description: proposal.description,
        status: proposal.status,
        votingStartsAt: proposal.votingStartsAt,
        votingEndsAt: proposal.votingEndsAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating proposal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create proposal',
    });
  }
});

router.post('/proposals/vote', requireDemoMode, validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { proposalId, choice } = req.body;

    if (!proposalId || !choice) {
      return res.status(400).json({
        success: false,
        error: 'Proposal ID and choice are required',
      });
    }

    if (!['FOR', 'AGAINST', 'ABSTAIN'].includes(choice)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid choice. Must be FOR, AGAINST, or ABSTAIN',
      });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        holdings: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found',
      });
    }

    if (proposal.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Proposal is not active',
      });
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        proposalId_userId: {
          proposalId,
          userId: user.id,
        },
      },
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        error: 'You have already voted on this proposal',
      });
    }

    const votingPower = user.holdings.reduce((sum, h) => sum + h.quantity, 0) || 1;

    const result = await prisma.$transaction(async (tx) => {
      const vote = await tx.vote.create({
        data: {
          proposalId,
          userId: user.id,
          choice: choice as any,
          votingPower,
        },
      });

      const updateData: any = {};
      if (choice === 'FOR') {
        updateData.forVotes = { increment: votingPower };
      } else if (choice === 'AGAINST') {
        updateData.againstVotes = { increment: votingPower };
      } else {
        updateData.abstainVotes = { increment: votingPower };
      }

      const updatedProposal = await tx.proposal.update({
        where: { id: proposalId },
        data: updateData,
      });

      return { vote, updatedProposal };
    });

    res.json({
      success: true,
      demoMode: true,
      data: {
        vote: {
          id: result.vote.id,
          choice: result.vote.choice,
          votingPower: result.vote.votingPower,
        },
        proposal: {
          id: result.updatedProposal.id,
          forVotes: result.updatedProposal.forVotes,
          againstVotes: result.updatedProposal.againstVotes,
          abstainVotes: result.updatedProposal.abstainVotes,
        },
      },
    });
  } catch (error: any) {
    console.error('Error voting on proposal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to vote on proposal',
    });
  }
});

router.post('/reset', requireDemoMode, validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        vaultAccount: true,
        holdings: true,
        borrowPositions: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const properties = await prisma.property.findMany({
      include: { token: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.vote.deleteMany({
        where: { userId: user.id },
      });

      await tx.rentDistribution.deleteMany({
        where: { userId: user.id },
      });

      await tx.borrowRepayment.deleteMany({
        where: {
          borrowPosition: { userId: user.id },
        },
      });

      await tx.borrowCollateral.deleteMany({
        where: {
          borrowPosition: { userId: user.id },
        },
      });

      await tx.borrowPosition.deleteMany({
        where: { userId: user.id },
      });

      await tx.transaction.deleteMany({
        where: { userId: user.id },
      });

      for (const holding of user.holdings) {
        const property = properties.find(p => p.id === holding.propertyId);
        if (property) {
          await tx.property.update({
            where: { id: property.id },
            data: {
              availableTokens: { increment: holding.quantity },
            },
          });
        }
      }

      await tx.holding.deleteMany({
        where: { userId: user.id },
      });

      for (const property of properties) {
        if (!property.token) continue;
        await tx.holding.create({
          data: {
            userId: user.id,
            propertyId: property.id,
            tokenId: property.token.id,
            quantity: 0,
            averageCost: 0,
            totalInvested: 0,
          },
        });
      }

      if (user.vaultAccount) {
        await tx.vaultAccount.update({
          where: { id: user.vaultAccount.id },
          data: {
            usdcBalance: INITIAL_DEMO_BALANCE,
            lockedBalance: 0,
            totalDeposited: INITIAL_DEMO_BALANCE,
            totalWithdrawn: 0,
            totalEarned: 0,
          },
        });
      }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        vaultAccount: true,
        holdings: { include: { property: true } },
      },
    });

    res.json({
      success: true,
      demoMode: true,
      message: 'Demo environment has been reset',
      data: {
        vault: {
          balance: INITIAL_DEMO_BALANCE,
          lockedBalance: 0,
        },
        holdings: updatedUser?.holdings.map(h => ({
          propertyId: h.propertyId,
          propertyName: h.property.name,
          quantity: 0,
        })),
        clearedData: {
          transactions: true,
          borrowPositions: true,
          rentDistributions: true,
          votes: true,
        },
      },
    });
  } catch (error: any) {
    console.error('Error resetting demo:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset demo environment',
    });
  }
});

router.get('/status', requireDemoMode, validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        vaultAccount: true,
        kycVerification: true,
        holdings: { include: { property: true } },
        borrowPositions: { where: { status: 'ACTIVE' } },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const totalTransactions = await prisma.transaction.count({
      where: { userId: user.id },
    });

    const totalRentEarned = user.holdings.reduce((sum, h) => sum + Number(h.rentEarned), 0);
    const totalPortfolioValue = user.holdings.reduce(
      (sum, h) => sum + h.quantity * Number(h.property.tokenPrice),
      0
    );

    res.json({
      success: true,
      demoMode: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          kycStatus: user.kycVerification?.status || 'NONE',
        },
        vault: {
          balance: Number(user.vaultAccount?.usdcBalance || 0),
          lockedBalance: Number(user.vaultAccount?.lockedBalance || 0),
          totalEarned: Number(user.vaultAccount?.totalEarned || 0),
        },
        portfolio: {
          totalValue: totalPortfolioValue,
          totalRentEarned,
          holdings: user.holdings.filter(h => h.quantity > 0).length,
        },
        borrowing: {
          activePositions: user.borrowPositions.length,
          totalBorrowed: user.borrowPositions.reduce((sum, p) => sum + Number(p.principal), 0),
        },
        activity: {
          totalTransactions,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching demo status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch demo status',
    });
  }
});

export default router;
