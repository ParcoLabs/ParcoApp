import { Router } from 'express';
import { validateAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { rentDistributionService } from '../services/rentDistribution';

const router = Router();

router.post('/distribute', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { propertyIds, dryRun } = req.body;

    if (rentDistributionService.isDistributionRunning()) {
      return res.status(409).json({
        success: false,
        error: 'Distribution is already running',
        code: 'DISTRIBUTION_IN_PROGRESS',
      });
    }

    const result = await rentDistributionService.runDistribution({
      triggeredBy: user.id,
      propertyIds,
      dryRun,
    });

    res.json({
      success: true,
      data: {
        runId: result.runId,
        status: result.status,
        propertiesProcessed: result.propertiesProcessed,
        rentPaymentsProcessed: result.rentPaymentsProcessed,
        holdersDistributed: result.holdersDistributed,
        totalGrossDistributed: result.totalGrossDistributed,
        totalInterestDeducted: result.totalInterestDeducted,
        totalNetDistributed: result.totalNetDistributed,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    console.error('Error running distribution:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run distribution',
    });
  }
});

router.post('/payments', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { propertyId, periodStart, periodEnd, grossAmount, managementFeePercent } = req.body;

    if (!propertyId || !periodStart || !periodEnd || !grossAmount) {
      return res.status(400).json({
        success: false,
        error: 'propertyId, periodStart, periodEnd, and grossAmount are required',
      });
    }

    const rentPayment = await rentDistributionService.createRentPayment({
      propertyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      grossAmount: parseFloat(grossAmount),
      managementFeePercent: managementFeePercent ? parseFloat(managementFeePercent) : undefined,
    });

    res.json({
      success: true,
      data: {
        id: rentPayment.id,
        propertyId: rentPayment.propertyId,
        periodStart: rentPayment.periodStart,
        periodEnd: rentPayment.periodEnd,
        grossAmount: Number(rentPayment.grossAmount),
        managementFee: Number(rentPayment.managementFee),
        netAmount: Number(rentPayment.netAmount),
        perTokenAmount: Number(rentPayment.perTokenAmount),
        status: rentPayment.status,
      },
    });
  } catch (error: any) {
    console.error('Error creating rent payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create rent payment',
    });
  }
});

router.get('/payments', validateAuth, async (req, res) => {
  try {
    const { propertyId, status, limit, offset } = req.query;

    const rentPayments = await prisma.rentPayment.findMany({
      where: {
        ...(propertyId && { propertyId: propertyId as string }),
        ...(status && { status: status as any }),
      },
      take: limit ? parseInt(limit as string) : 20,
      skip: offset ? parseInt(offset as string) : 0,
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: { id: true, name: true, totalTokens: true },
        },
      },
    });

    res.json({
      success: true,
      data: rentPayments.map((rp) => ({
        id: rp.id,
        property: rp.property,
        periodStart: rp.periodStart,
        periodEnd: rp.periodEnd,
        grossAmount: Number(rp.grossAmount),
        managementFee: Number(rp.managementFee),
        netAmount: Number(rp.netAmount),
        perTokenAmount: Number(rp.perTokenAmount),
        status: rp.status,
        distributedAt: rp.distributedAt,
        createdAt: rp.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching rent payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rent payments',
    });
  }
});

router.get('/distributions', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { propertyId, limit, offset } = req.query;

    const distributions = await rentDistributionService.getUserDistributions(user.id, {
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
      propertyId: propertyId as string | undefined,
    });

    res.json({
      success: true,
      data: distributions.map((d) => ({
        id: d.id,
        propertyId: d.propertyId,
        tokensHeld: d.tokensHeld,
        totalTokens: d.totalTokens,
        ownershipPercent: Number(d.ownershipPercent),
        grossAmount: Number(d.grossAmount),
        interestDeducted: Number(d.interestDeducted),
        netAmount: Number(d.netAmount),
        distributedAt: d.distributedAt,
        period: d.rentPayment
          ? {
              start: d.rentPayment.periodStart,
              end: d.rentPayment.periodEnd,
            }
          : null,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching distributions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch distributions',
    });
  }
});

router.get('/history', validateAuth, async (req, res) => {
  try {
    const { limit, offset } = req.query;

    const runs = await rentDistributionService.getDistributionHistory({
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({
      success: true,
      data: runs.map((r) => ({
        id: r.id,
        runType: r.runType,
        triggeredBy: r.triggeredBy,
        status: r.status,
        propertiesProcessed: r.propertiesProcessed,
        rentPaymentsProcessed: r.rentPaymentsProcessed,
        holdersDistributed: r.holdersDistributed,
        totalGrossDistributed: Number(r.totalGrossDistributed),
        totalInterestDeducted: Number(r.totalInterestDeducted),
        totalNetDistributed: Number(r.totalNetDistributed),
        errorMessage: r.errorMessage,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching distribution history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch distribution history',
    });
  }
});

router.get('/summary', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        vaultAccount: true,
        rentDistributions: {
          orderBy: { distributedAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const totalEarned = user.rentDistributions.reduce(
      (sum, d) => sum + Number(d.netAmount),
      0
    );

    const totalInterestPaid = user.rentDistributions.reduce(
      (sum, d) => sum + Number(d.interestDeducted),
      0
    );

    const distributionsByProperty = user.rentDistributions.reduce((acc, d) => {
      if (!acc[d.propertyId]) {
        acc[d.propertyId] = { totalEarned: 0, count: 0 };
      }
      acc[d.propertyId].totalEarned += Number(d.netAmount);
      acc[d.propertyId].count += 1;
      return acc;
    }, {} as Record<string, { totalEarned: number; count: number }>);

    res.json({
      success: true,
      data: {
        totalEarned,
        totalInterestPaid,
        distributionCount: user.rentDistributions.length,
        vaultBalance: Number(user.vaultAccount?.usdcBalance || 0),
        totalVaultEarned: Number(user.vaultAccount?.totalEarned || 0),
        byProperty: distributionsByProperty,
      },
    });
  } catch (error: any) {
    console.error('Error fetching distribution summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch distribution summary',
    });
  }
});

export default router;
