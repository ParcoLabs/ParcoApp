import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

type DemoActionType = 'SIGN_UP' | 'BUY_TOKEN' | 'SELL_TOKEN' | 'BORROW_USDC' | 'REPAY_LOAN' | 'DEPOSIT_LENDING' | 'WITHDRAW_LENDING' | 'VOTE_GOVERNANCE' | 'BOOK_STAY' | 'COMPLETE_KYC' | 'TOKENIZATION_POPULATE';

const REWARD_AMOUNTS: Record<DemoActionType, number> = {
  SIGN_UP: 100,
  BUY_TOKEN: 50,
  SELL_TOKEN: 25,
  BORROW_USDC: 75,
  REPAY_LOAN: 50,
  DEPOSIT_LENDING: 75,
  WITHDRAW_LENDING: 25,
  VOTE_GOVERNANCE: 30,
  BOOK_STAY: 100,
  COMPLETE_KYC: 50,
  TOKENIZATION_POPULATE: 75,
};

interface ActionData {
  propertyId?: string;
  tokenAmount?: number;
  usdcAmount?: number;
  metadata?: Record<string, any>;
}

export async function logDemoAction(
  userId: string,
  actionType: DemoActionType,
  actionData?: ActionData
): Promise<void> {
  try {
    const rewardTokens = REWARD_AMOUNTS[actionType] || 0;
    
    await prisma.demoActionLog.create({
      data: {
        userId,
        actionType,
        actionData: actionData?.metadata || null,
        propertyId: actionData?.propertyId || null,
        tokenAmount: actionData?.tokenAmount || null,
        usdcAmount: actionData?.usdcAmount || null,
        rewardTokens,
        rewardPaid: false,
      },
    });
    
    console.log(`[DemoActionLogger] Logged ${actionType} for user ${userId} - ${rewardTokens} PARCO tokens pending`);
  } catch (error) {
    console.error('[DemoActionLogger] Failed to log action:', error);
  }
}

export async function getUserDemoStats(userId: string) {
  try {
    const actions = await prisma.demoActionLog.groupBy({
      by: ['actionType'],
      where: { userId },
      _count: { id: true },
      _sum: { rewardTokens: true },
    });
    
    const totalPending = await prisma.demoActionLog.aggregate({
      where: { userId, rewardPaid: false },
      _sum: { rewardTokens: true },
    });
    
    const totalPaid = await prisma.demoActionLog.aggregate({
      where: { userId, rewardPaid: true },
      _sum: { rewardTokens: true },
    });
    
    return {
      actions: actions.map(a => ({
        type: a.actionType,
        count: a._count.id,
        rewards: Number(a._sum.rewardTokens) || 0,
      })),
      pendingRewards: Number(totalPending._sum.rewardTokens) || 0,
      paidRewards: Number(totalPaid._sum.rewardTokens) || 0,
    };
  } catch (error) {
    console.error('[DemoActionLogger] Failed to get user stats:', error);
    return { actions: [], pendingRewards: 0, paidRewards: 0 };
  }
}

export async function getLeaderboard(limit: number = 50) {
  try {
    const leaderboard = await prisma.demoActionLog.groupBy({
      by: ['userId'],
      _sum: { rewardTokens: true },
      _count: { id: true },
      orderBy: { _sum: { rewardTokens: 'desc' } },
      take: limit,
    });
    
    const userIds = leaderboard.map(l => l.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    
    const userMap = new Map(users.map(u => [u.id, u]));
    
    return leaderboard.map((entry, index) => {
      const user = userMap.get(entry.userId);
      return {
        rank: index + 1,
        userId: entry.userId,
        displayName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0] : 'Anonymous',
        totalRewards: Number(entry._sum.rewardTokens) || 0,
        actionsCompleted: entry._count.id,
      };
    });
  } catch (error) {
    console.error('[DemoActionLogger] Failed to get leaderboard:', error);
    return [];
  }
}
