import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { validateAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { Prisma, TransactionType } from '@prisma/client';

const Decimal = Prisma.Decimal;

const router = Router();

router.get('/', validateAuth, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    const clerkId = auth.userId;
    
    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        vaultAccount: true,
        holdings: {
          include: {
            property: {
              include: {
                token: true,
              },
            },
            token: true,
          },
        },
        borrowPositions: {
          where: {
            status: 'ACTIVE',
          },
        },
        transactions: {
          where: {
            type: 'RENT_DISTRIBUTION',
            status: 'COMPLETED',
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const usdcBalance = user.vaultAccount?.usdcBalance || new Decimal(0);
    const lockedBalance = user.vaultAccount?.lockedBalance || new Decimal(0);
    const totalDeposited = user.vaultAccount?.totalDeposited || new Decimal(0);
    const totalWithdrawn = user.vaultAccount?.totalWithdrawn || new Decimal(0);

    const holdings = user.holdings.map(holding => {
      const currentValue = new Decimal(holding.quantity).mul(holding.property.tokenPrice);
      const gain = currentValue.sub(holding.totalInvested);
      const gainPercent = holding.totalInvested.gt(0) 
        ? gain.div(holding.totalInvested).mul(100).toNumber()
        : 0;

      return {
        id: holding.id,
        propertyId: holding.propertyId,
        propertyName: holding.property.name,
        propertyImage: holding.property.imageUrl || holding.property.images[0] || null,
        propertyType: holding.property.propertyType,
        location: `${holding.property.city}, ${holding.property.state}`,
        tokenId: holding.tokenId,
        contractAddress: holding.token?.contractAddress || null,
        chainId: holding.token?.chainId || 137,
        quantity: holding.quantity,
        tokenPrice: holding.property.tokenPrice.toString(),
        averageCost: holding.averageCost.toString(),
        totalInvested: holding.totalInvested.toString(),
        currentValue: currentValue.toString(),
        gain: gain.toString(),
        gainPercent: gainPercent.toFixed(2),
        annualYield: holding.property.annualYield.toString(),
        rentEarned: holding.rentEarned.toString(),
        lastRentDate: holding.lastRentDate,
      };
    });

    const totalHoldingsValue = holdings.reduce(
      (sum, h) => sum.add(new Decimal(h.currentValue)),
      new Decimal(0)
    );

    const totalInvested = holdings.reduce(
      (sum, h) => sum.add(new Decimal(h.totalInvested)),
      new Decimal(0)
    );

    const totalRentEarned = holdings.reduce(
      (sum, h) => sum.add(new Decimal(h.rentEarned)),
      new Decimal(0)
    );

    const borrowPositions = user.borrowPositions.map(position => ({
      id: position.id,
      principal: position.principal.toString(),
      interestRate: position.interestRate.toString(),
      accruedInterest: position.accruedInterest.toString(),
      totalOwed: position.principal.add(position.accruedInterest).toString(),
      collateralValue: position.collateralValue.toString(),
      collateralRatio: position.collateralRatio.toString(),
      liquidationThreshold: position.liquidationThreshold.toString(),
      status: position.status,
      borrowedAt: position.borrowedAt,
      dueDate: position.dueDate,
    }));

    const totalBorrowed = borrowPositions.reduce(
      (sum, p) => sum.add(new Decimal(p.principal)),
      new Decimal(0)
    );

    const totalInterestOwed = borrowPositions.reduce(
      (sum, p) => sum.add(new Decimal(p.accruedInterest)),
      new Decimal(0)
    );

    const rentDistributions = user.transactions.map(tx => ({
      id: tx.id,
      amount: tx.amount.toString(),
      propertyId: tx.propertyId,
      date: tx.completedAt || tx.createdAt,
      description: tx.description,
    }));

    const totalPortfolioValue = usdcBalance.add(totalHoldingsValue);
    const netWorth = totalPortfolioValue.sub(totalBorrowed).sub(totalInterestOwed);

    return res.json({
      success: true,
      portfolio: {
        summary: {
          totalPortfolioValue: totalPortfolioValue.toString(),
          netWorth: netWorth.toString(),
          totalInvested: totalInvested.toString(),
          totalGain: totalHoldingsValue.sub(totalInvested).toString(),
          totalGainPercent: totalInvested.gt(0) 
            ? totalHoldingsValue.sub(totalInvested).div(totalInvested).mul(100).toFixed(2)
            : '0.00',
        },
        vault: {
          usdcBalance: usdcBalance.toString(),
          lockedBalance: lockedBalance.toString(),
          availableBalance: usdcBalance.sub(lockedBalance).toString(),
          totalDeposited: totalDeposited.toString(),
          totalWithdrawn: totalWithdrawn.toString(),
          walletAddress: user.vaultAccount?.walletAddress || null,
        },
        holdings: {
          count: holdings.length,
          totalValue: totalHoldingsValue.toString(),
          totalRentEarned: totalRentEarned.toString(),
          items: holdings,
        },
        loans: {
          count: borrowPositions.length,
          totalBorrowed: totalBorrowed.toString(),
          totalInterestOwed: totalInterestOwed.toString(),
          totalOwed: totalBorrowed.add(totalInterestOwed).toString(),
          positions: borrowPositions,
        },
        rentDistributions: {
          recentCount: rentDistributions.length,
          recent: rentDistributions,
        },
      },
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch portfolio' });
  }
});

router.get('/history', validateAuth, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    const clerkId = auth.userId;
    
    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { period = '30d', type } = req.query;

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let startDate: Date;
    const now = new Date();

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const validTypes: TransactionType[] = [
      'DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL', 
      'RENT_DISTRIBUTION', 'BORROW', 'REPAY', 'INTEREST', 'FEE'
    ];
    const typeFilter = type && validTypes.includes(type as TransactionType) 
      ? { type: type as TransactionType } 
      : {};

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: startDate,
        },
        ...typeFilter,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: false,
      },
    });

    const transactionHistory = transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      status: tx.status,
      amount: tx.amount.toString(),
      currency: tx.currency,
      propertyId: tx.propertyId,
      tokenQuantity: tx.tokenQuantity,
      tokenPrice: tx.tokenPrice?.toString() || null,
      fee: tx.fee?.toString() || null,
      txHash: tx.txHash,
      chainId: tx.chainId,
      description: tx.description,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
    }));

    const deposits = transactions
      .filter(tx => tx.type === 'DEPOSIT' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));

    const withdrawals = transactions
      .filter(tx => tx.type === 'WITHDRAWAL' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));

    const purchases = transactions
      .filter(tx => tx.type === 'BUY' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));

    const sales = transactions
      .filter(tx => tx.type === 'SELL' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));

    const rentReceived = transactions
      .filter(tx => tx.type === 'RENT_DISTRIBUTION' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));

    const borrowings = transactions
      .filter(tx => tx.type === 'BORROW' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));

    const repayments = transactions
      .filter(tx => tx.type === 'REPAY' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));

    const interestPaid = transactions
      .filter(tx => tx.type === 'INTEREST' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));

    const fees = transactions
      .filter(tx => tx.type === 'FEE' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));

    const groupedByDay = transactions.reduce((acc: Record<string, any[]>, tx) => {
      const dateKey = tx.createdAt.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(tx);
      return acc;
    }, {});

    const dailySummary = Object.entries(groupedByDay).map(([date, txs]) => {
      const dayDeposits = txs
        .filter(tx => tx.type === 'DEPOSIT' && tx.status === 'COMPLETED')
        .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));
      const dayWithdrawals = txs
        .filter(tx => tx.type === 'WITHDRAWAL' && tx.status === 'COMPLETED')
        .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));
      const dayPurchases = txs
        .filter(tx => tx.type === 'BUY' && tx.status === 'COMPLETED')
        .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));
      const daySales = txs
        .filter(tx => tx.type === 'SELL' && tx.status === 'COMPLETED')
        .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));
      const dayRent = txs
        .filter(tx => tx.type === 'RENT_DISTRIBUTION' && tx.status === 'COMPLETED')
        .reduce((sum, tx) => sum.add(tx.amount), new Decimal(0));

      return {
        date,
        transactionCount: txs.length,
        deposits: dayDeposits.toString(),
        withdrawals: dayWithdrawals.toString(),
        purchases: dayPurchases.toString(),
        sales: daySales.toString(),
        rentReceived: dayRent.toString(),
        netFlow: dayDeposits.sub(dayWithdrawals).add(daySales).sub(dayPurchases).add(dayRent).toString(),
      };
    }).sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      success: true,
      history: {
        period: period as string,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        summary: {
          totalTransactions: transactions.length,
          deposits: deposits.toString(),
          withdrawals: withdrawals.toString(),
          purchases: purchases.toString(),
          sales: sales.toString(),
          rentReceived: rentReceived.toString(),
          borrowings: borrowings.toString(),
          repayments: repayments.toString(),
          interestPaid: interestPaid.toString(),
          fees: fees.toString(),
          netFlow: deposits.sub(withdrawals).add(sales).sub(purchases).add(rentReceived).sub(interestPaid).sub(fees).toString(),
        },
        dailySummary,
        transactions: transactionHistory,
      },
    });
  } catch (error) {
    console.error('Get portfolio history error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch portfolio history' });
  }
});

export default router;
