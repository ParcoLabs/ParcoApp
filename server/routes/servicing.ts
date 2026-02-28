import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import prisma from '../lib/prisma';
import { isDemoMode } from '../utils/demoMode';
import { loadUserWithRole, adminOnly, AuthenticatedRequest } from '../middleware/admin';
import { applyCompliancePack, mockComplianceRequirements } from '../services/compliancePack';

const router = Router();

const simpleAuth = async (req: Request, res: Response, next: Function) => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    (req as any).auth = auth;
    next();
  } catch (error) {
    console.error('[servicing simpleAuth] Error:', error);
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

router.get(
  '/property/:propertyId/compliance',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: mockComplianceRequirements(propertyId),
        });
      }

      const isAdmin = user?.role === 'ADMIN';
      if (!isAdmin) {
        const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
        if (!property || property.ownerId !== user?.clerkId) {
          return res.status(403).json({ success: false, error: 'Forbidden' });
        }
      }

      const requirements = await prisma.complianceRequirement.findMany({
        where: { propertyId },
        include: { evidence: true },
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
      });

      return res.json({ success: true, data: requirements });
    } catch (error: any) {
      console.error('[servicing] Error fetching compliance:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/property/:propertyId/compliance/apply',
  simpleAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const { caseId } = req.body;

      if (!caseId) {
        return res.status(400).json({ success: false, error: 'caseId is required' });
      }

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: {
            propertyId,
            caseId,
            track: 'SERIES_LLC',
            requirementsCreated: 3,
            totalRequirements: 3,
          },
        });
      }

      const result = await applyCompliancePack(caseId, propertyId);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[servicing] Error applying compliance pack:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/compliance/:id/complete',
  simpleAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: { id, status: 'COMPLETED', notes: notes || null },
        });
      }

      const updated = await prisma.complianceRequirement.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          notes: notes || undefined,
        },
        include: { evidence: true },
      });

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[servicing] Error completing compliance:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/compliance/:id/evidence',
  simpleAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, url } = req.body;
      const user = (req as AuthenticatedRequest).user;

      if (!name || !url) {
        return res.status(400).json({ success: false, error: 'name and url are required' });
      }

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: {
            id: `demo_ev_${Date.now()}`,
            requirementId: id,
            name,
            url,
            uploadedByUserId: user?.id || null,
            createdAt: new Date().toISOString(),
          },
        });
      }

      const evidence = await prisma.complianceEvidence.create({
        data: {
          requirementId: id,
          name,
          url,
          uploadedByUserId: user?.id || null,
        },
      });

      return res.json({ success: true, data: evidence });
    } catch (error: any) {
      console.error('[servicing] Error adding evidence:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/property/:propertyId/captable/snapshot',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const demo = isDemoMode(req);

      if (demo) {
        const demoHolders = [
          { userId: 'demo_user_1', name: 'Alice Johnson', tokens: 150, percentage: '30.00' },
          { userId: 'demo_user_2', name: 'Bob Smith', tokens: 100, percentage: '20.00' },
          { userId: 'demo_user_3', name: 'Carol Williams', tokens: 75, percentage: '15.00' },
          { userId: 'demo_user_4', name: 'Dave Brown', tokens: 50, percentage: '10.00' },
          { userId: 'demo_user_5', name: 'Eve Davis', tokens: 125, percentage: '25.00' },
        ];
        const snapshot = {
          id: `demo_snap_${Date.now()}`,
          propertyId,
          asOf: new Date().toISOString(),
          totalHolders: demoHolders.length,
          totalSupply: '500',
          data: { holders: demoHolders },
          createdAt: new Date().toISOString(),
        };
        return res.json({ success: true, data: snapshot });
      }

      const property = await (prisma.property as any).findUnique({
        where: { id: propertyId },
        include: {
          holdings: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
          token: true,
          onchainDeployment: true,
        },
      });

      if (!property) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }

      const holders = property.holdings.map((h: any) => ({
        userId: h.userId,
        name: `${h.user.firstName || ''} ${h.user.lastName || ''}`.trim() || h.user.email,
        tokens: h.quantity,
        averageCost: h.averageCost.toString(),
        totalInvested: h.totalInvested.toString(),
        percentage: property.totalTokens > 0
          ? ((h.quantity / property.totalTokens) * 100).toFixed(2)
          : '0.00',
      }));

      const totalSupply = property.totalTokens.toString();
      const totalHolders = holders.length;

      const snapshot = await (prisma as any).capTableSnapshot.create({
        data: {
          propertyId,
          asOf: new Date(),
          totalHolders,
          totalSupply,
          data: { holders },
        },
      });

      return res.json({ success: true, data: snapshot });
    } catch (error: any) {
      console.error('[servicing] Error creating cap table snapshot:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.get(
  '/property/:propertyId/captable/snapshots',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;

      if (isDemoMode(req)) {
        const now = new Date();
        const demoSnapshots = [
          {
            id: 'demo_snap_1',
            propertyId,
            asOf: new Date(now.getTime() - 7 * 86400000).toISOString(),
            totalHolders: 4,
            totalSupply: '400',
            createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
          },
          {
            id: 'demo_snap_2',
            propertyId,
            asOf: new Date(now.getTime() - 1 * 86400000).toISOString(),
            totalHolders: 5,
            totalSupply: '500',
            createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
          },
        ];
        return res.json({ success: true, data: demoSnapshots });
      }

      const snapshots = await (prisma as any).capTableSnapshot.findMany({
        where: { propertyId },
        orderBy: { asOf: 'desc' },
        take: 20,
        select: { id: true, propertyId: true, asOf: true, totalHolders: true, totalSupply: true, createdAt: true },
      });

      return res.json({ success: true, data: snapshots });
    } catch (error: any) {
      console.error('[servicing] Error listing snapshots:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/property/:propertyId/statements/generate',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const demo = isDemoMode(req);

      const now = new Date();
      const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);

      if (demo) {
        const demoStatements = [
          { userId: 'demo_user_1', name: 'Alice Johnson', tokens: 150, rent: 375.00 },
          { userId: 'demo_user_2', name: 'Bob Smith', tokens: 100, rent: 250.00 },
          { userId: 'demo_user_3', name: 'Carol Williams', tokens: 75, rent: 187.50 },
        ].map((inv, i) => ({
          id: `demo_stmt_${Date.now()}_${i}`,
          userId: inv.userId,
          propertyId,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          statementText: [
            `INVESTOR STATEMENT — ${periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
            `Investor: ${inv.name}`,
            `Property: Demo Property`,
            `Tokens Held: ${inv.tokens}`,
            `Period: ${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()}`,
            `Rent Distribution: $${inv.rent.toFixed(2)}`,
            `Status: Distributed`,
            `---`,
            `This statement is for informational purposes only and does not constitute tax or legal advice.`,
          ].join('\n'),
          createdAt: now.toISOString(),
        }));
        return res.json({ success: true, data: { count: demoStatements.length, statements: demoStatements } });
      }

      const property = await (prisma.property as any).findUnique({
        where: { id: propertyId },
        include: {
          holdings: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
        },
      });

      if (!property) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }

      const rentDistributions = await prisma.rentDistribution.findMany({
        where: {
          propertyId,
          distributedAt: { gte: periodStart, lte: periodEnd },
        },
      });

      const rentByUser: Record<string, number> = {};
      for (const rd of rentDistributions) {
        const uid = rd.userId;
        rentByUser[uid] = (rentByUser[uid] || 0) + Number(rd.netAmount);
      }

      const statements = [];
      for (const holding of property.holdings) {
        const user = holding.user as any;
        const rent = rentByUser[holding.userId] || 0;
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

        const statementText = [
          `INVESTOR STATEMENT — ${periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          `Investor: ${name}`,
          `Property: ${property.name}`,
          `Tokens Held: ${holding.quantity}`,
          `Average Cost: $${Number(holding.averageCost).toFixed(2)}`,
          `Total Invested: $${Number(holding.totalInvested).toFixed(2)}`,
          `Period: ${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()}`,
          `Rent Distribution: $${rent.toFixed(2)}`,
          `Cumulative Rent Earned: $${Number(holding.rentEarned).toFixed(2)}`,
          `---`,
          `This statement is for informational purposes only and does not constitute tax or legal advice.`,
        ].join('\n');

        const stmt = await (prisma as any).investorStatement.create({
          data: {
            userId: holding.userId,
            propertyId,
            periodStart,
            periodEnd,
            statementText,
          },
        });
        statements.push(stmt);
      }

      return res.json({ success: true, data: { count: statements.length, statements } });
    } catch (error: any) {
      console.error('[servicing] Error generating statements:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.get(
  '/property/:propertyId/statements',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;

      if (isDemoMode(req)) {
        const now = new Date();
        const demoStatements = [
          {
            id: 'demo_stmt_1',
            userId: 'demo_user_1',
            propertyId,
            periodStart: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
            periodEnd: new Date(now.getFullYear(), now.getMonth(), 0).toISOString(),
            createdAt: new Date(now.getTime() - 86400000).toISOString(),
          },
        ];
        return res.json({ success: true, data: demoStatements });
      }

      const statements = await (prisma as any).investorStatement.findMany({
        where: { propertyId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, userId: true, propertyId: true, periodStart: true, periodEnd: true, createdAt: true },
      });

      return res.json({ success: true, data: statements });
    } catch (error: any) {
      console.error('[servicing] Error listing statements:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.get(
  '/investor/property/:propertyId/reporting-center',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const user = (req as AuthenticatedRequest).user;
      const demo = isDemoMode(req);

      if (demo) {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);

        return res.json({
          success: true,
          data: {
            latestKPI: {
              propertyValue: 500000,
              occupancy: 95,
              rentalIncome: 4500,
              expenses: 1200,
            },
            publishedReports: [
              {
                id: 'demo_report_1',
                propertyId,
                periodStart: lastMonth.toISOString(),
                periodEnd: lastMonthEnd.toISOString(),
                status: 'PUBLISHED',
                draftText: [
                  `MONTHLY REPORT — ${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                  '',
                  'Property Performance Summary',
                  '- Occupancy: 95%',
                  '- Rental Income: $4,500',
                  '- Expenses: $1,200',
                  '- Net Operating Income: $3,300',
                  '',
                  'All units remained occupied. Maintenance costs were within budget.',
                ].join('\n'),
                publishedAt: new Date(lastMonthEnd.getTime() + 5 * 86400000).toISOString(),
                createdAt: lastMonthEnd.toISOString(),
              },
              {
                id: 'demo_report_2',
                propertyId,
                periodStart: twoMonthsAgo.toISOString(),
                periodEnd: twoMonthsAgoEnd.toISOString(),
                status: 'PUBLISHED',
                draftText: [
                  `MONTHLY REPORT — ${twoMonthsAgo.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                  '',
                  'Property Performance Summary',
                  '- Occupancy: 92%',
                  '- Rental Income: $4,200',
                  '- Expenses: $1,350',
                  '- Net Operating Income: $2,850',
                  '',
                  'One unit vacancy filled mid-month. HVAC repair completed.',
                ].join('\n'),
                publishedAt: new Date(twoMonthsAgoEnd.getTime() + 5 * 86400000).toISOString(),
                createdAt: twoMonthsAgoEnd.toISOString(),
              },
            ],
            distributionHistory: [
              {
                id: 'demo_dist_1',
                propertyId,
                grossAmount: '112.50',
                netAmount: '112.50',
                distributedAt: new Date(lastMonthEnd.getTime() + 7 * 86400000).toISOString(),
                tokensHeld: 150,
                totalTokens: 500,
              },
              {
                id: 'demo_dist_2',
                propertyId,
                grossAmount: '105.00',
                netAmount: '105.00',
                distributedAt: new Date(twoMonthsAgoEnd.getTime() + 7 * 86400000).toISOString(),
                tokensHeld: 150,
                totalTokens: 500,
              },
            ],
            investorStatements: [
              {
                id: 'demo_stmt_1',
                propertyId,
                periodStart: lastMonth.toISOString(),
                periodEnd: lastMonthEnd.toISOString(),
                statementText: [
                  `INVESTOR STATEMENT — ${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                  'Tokens Held: 150',
                  'Rent Distribution: $112.50',
                  'Status: Distributed',
                ].join('\n'),
                createdAt: new Date(lastMonthEnd.getTime() + 5 * 86400000).toISOString(),
              },
            ],
            governanceNotices: [],
            openGovernanceVotes: [],
          },
        });
      }

      const isAdmin = user?.role === 'ADMIN';
      if (!isAdmin) {
        const holding = await prisma.holding.findFirst({
          where: { userId: user?.id, propertyId },
        });
        if (!holding) {
          return res.status(403).json({ success: false, error: 'Forbidden: no holding for this property' });
        }
      }

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: {
          id: true,
          totalValue: true,
          monthlyRent: true,
        },
      });

      if (!property) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }

      const publishedReports = await (prisma as any).servicingReportRun.findMany({
        where: { propertyId, status: 'PUBLISHED' },
        orderBy: { periodEnd: 'desc' },
        take: 12,
      });

      const distributionHistory = await prisma.rentDistribution.findMany({
        where: {
          propertyId,
          userId: isAdmin ? undefined : user?.id,
        },
        orderBy: { distributedAt: 'desc' },
        take: 24,
        select: {
          id: true,
          propertyId: true,
          grossAmount: true,
          netAmount: true,
          distributedAt: true,
          tokensHeld: true,
          totalTokens: true,
        },
      });

      const investorStatements = await (prisma as any).investorStatement.findMany({
        where: {
          propertyId,
          userId: isAdmin ? undefined : user?.id,
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      });

      const latestKPI = {
        propertyValue: Number(property.totalValue),
        occupancy: 100,
        rentalIncome: Number(property.monthlyRent || 0),
        expenses: 0,
      };

      return res.json({
        success: true,
        data: {
          latestKPI,
          publishedReports,
          distributionHistory,
          investorStatements,
          governanceNotices: [],
          openGovernanceVotes: [],
        },
      });
    } catch (error: any) {
      console.error('[servicing] Error fetching reporting center:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/property/:propertyId/monthly-close/start',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const user = (req as AuthenticatedRequest).user;
      const demo = isDemoMode(req);

      const isAdmin = user?.role === 'ADMIN';
      if (!isAdmin) {
        const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
        if (!property || property.ownerId !== user?.clerkId) {
          return res.status(403).json({ success: false, error: 'Forbidden' });
        }
      }

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      if (demo) {
        const draftText = [
          `MONTHLY CLOSE REPORT — ${periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          `Property: Demo Property`,
          ``,
          `KEY PERFORMANCE INDICATORS`,
          `Occupancy Rate: 95%`,
          `Gross Rental Income: $12,500.00`,
          `Operating Expenses: $3,750.00`,
          `Net Operating Income: $8,750.00`,
          ``,
          `NOTES`,
          `All units performing within expected parameters. No major maintenance issues reported.`,
        ].join('\n');

        const reportRun = {
          id: `demo_report_${Date.now()}`,
          propertyId,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          status: 'DRAFT',
          draftText,
          publishedAt: null,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          approvals: [
            { id: `demo_approval_ops_${Date.now()}`, reportRunId: `demo_report_${Date.now()}`, role: 'OPS', status: 'PENDING', approvedByUserId: null, notes: null, createdAt: now.toISOString(), updatedAt: now.toISOString() },
            { id: `demo_approval_acc_${Date.now()}`, reportRunId: `demo_report_${Date.now()}`, role: 'ACCOUNTING', status: 'PENDING', approvedByUserId: null, notes: null, createdAt: now.toISOString(), updatedAt: now.toISOString() },
            { id: `demo_approval_comp_${Date.now()}`, reportRunId: `demo_report_${Date.now()}`, role: 'COMPLIANCE', status: 'PENDING', approvedByUserId: null, notes: null, createdAt: now.toISOString(), updatedAt: now.toISOString() },
          ],
        };
        return res.json({ success: true, data: reportRun });
      }

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true, name: true, totalValue: true, monthlyRent: true, annualYield: true, totalTokens: true, availableTokens: true },
      });

      if (!property) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }

      const occupancy = property.totalTokens > 0
        ? (((property.totalTokens - property.availableTokens) / property.totalTokens) * 100).toFixed(1)
        : '0.0';
      const rentalIncome = Number(property.monthlyRent || 0);
      const expenses = rentalIncome * 0.3;
      const netProfit = rentalIncome - expenses;

      const draftText = [
        `MONTHLY CLOSE REPORT — ${periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        `Property: ${property.name}`,
        ``,
        `KEY PERFORMANCE INDICATORS`,
        `Occupancy Rate: ${occupancy}%`,
        `Gross Rental Income: $${rentalIncome.toFixed(2)}`,
        `Operating Expenses: $${expenses.toFixed(2)}`,
        `Net Operating Income: $${netProfit.toFixed(2)}`,
        ``,
        `NOTES`,
        `Report generated automatically. Please review and update as needed.`,
      ].join('\n');

      const reportRun = await (prisma as any).servicingReportRun.create({
        data: {
          propertyId,
          periodStart,
          periodEnd,
          status: 'DRAFT',
          draftText,
          approvals: {
            create: [
              { role: 'OPS' },
              { role: 'ACCOUNTING' },
              { role: 'COMPLIANCE' },
            ],
          },
        },
        include: { approvals: true },
      });

      await (prisma as any).auditEvent.create({
        data: {
          type: 'MONTHLY_CLOSE_STARTED',
          entityId: reportRun.id,
          userId: user?.clerkId || null,
          metadata: { propertyId, periodStart, periodEnd },
        },
      });

      return res.json({ success: true, data: reportRun });
    } catch (error: any) {
      console.error('[servicing] Error starting monthly close:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/report-run/:id/submit',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: { id, status: 'IN_REVIEW', updatedAt: new Date().toISOString() },
        });
      }

      const reportRun = await (prisma as any).servicingReportRun.findUnique({ where: { id } });
      if (!reportRun) {
        return res.status(404).json({ success: false, error: 'Report run not found' });
      }
      if (reportRun.status !== 'DRAFT') {
        return res.status(400).json({ success: false, error: 'Report must be in DRAFT status to submit' });
      }

      const updated = await (prisma as any).servicingReportRun.update({
        where: { id },
        data: { status: 'IN_REVIEW' },
        include: { approvals: true },
      });

      await (prisma as any).auditEvent.create({
        data: {
          type: 'MONTHLY_CLOSE_SUBMITTED',
          entityId: id,
          userId: user?.clerkId || null,
          metadata: { propertyId: reportRun.propertyId },
        },
      });

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[servicing] Error submitting report:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/report-run/:id/approve/:approvalId',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { id, approvalId } = req.params;
      const { notes } = req.body;
      const user = (req as AuthenticatedRequest).user;

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: { id: approvalId, reportRunId: id, status: 'APPROVED', approvedByUserId: user?.id || 'demo_admin', notes: notes || null, updatedAt: new Date().toISOString() },
        });
      }

      const approval = await (prisma as any).reportApproval.findUnique({ where: { id: approvalId } });
      if (!approval || approval.reportRunId !== id) {
        return res.status(404).json({ success: false, error: 'Approval not found' });
      }

      const updated = await (prisma as any).reportApproval.update({
        where: { id: approvalId },
        data: {
          status: 'APPROVED',
          approvedByUserId: user?.id || null,
          notes: notes || undefined,
        },
      });

      await (prisma as any).auditEvent.create({
        data: {
          type: 'MONTHLY_CLOSE_APPROVAL',
          entityId: id,
          userId: user?.clerkId || null,
          metadata: { approvalId, role: approval.role },
        },
      });

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[servicing] Error approving report:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/report-run/:id/publish',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: { id, status: 'PUBLISHED', publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        });
      }

      const reportRun = await (prisma as any).servicingReportRun.findUnique({
        where: { id },
        include: { approvals: true },
      });

      if (!reportRun) {
        return res.status(404).json({ success: false, error: 'Report run not found' });
      }
      if (reportRun.status !== 'IN_REVIEW') {
        return res.status(400).json({ success: false, error: 'Report must be in IN_REVIEW status to publish' });
      }

      const allApproved = reportRun.approvals.every((a: any) => a.status === 'APPROVED');
      if (!allApproved) {
        return res.status(400).json({ success: false, error: 'All approvals must be APPROVED before publishing' });
      }

      const updated = await (prisma as any).servicingReportRun.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
        include: { approvals: true },
      });

      await (prisma as any).auditEvent.create({
        data: {
          type: 'MONTHLY_CLOSE_PUBLISHED',
          entityId: id,
          userId: user?.clerkId || null,
          metadata: { propertyId: reportRun.propertyId },
        },
      });

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[servicing] Error publishing report:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.get(
  '/property/:propertyId/monthly-close',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      const isAdmin = user?.role === 'ADMIN';
      if (!isAdmin) {
        const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
        if (!property || property.ownerId !== user?.clerkId) {
          return res.status(403).json({ success: false, error: 'Forbidden' });
        }
      }

      if (isDemoMode(req)) {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const demoRuns = [
          {
            id: 'demo_report_current',
            propertyId,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            status: 'DRAFT',
            draftText: `MONTHLY CLOSE REPORT — ${periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\nProperty: Demo Property\n\nKEY PERFORMANCE INDICATORS\nOccupancy Rate: 95%\nGross Rental Income: $12,500.00\nOperating Expenses: $3,750.00\nNet Operating Income: $8,750.00`,
            publishedAt: null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            approvals: [
              { id: 'demo_approval_ops', reportRunId: 'demo_report_current', role: 'OPS', status: 'PENDING', approvedByUserId: null, notes: null, createdAt: now.toISOString(), updatedAt: now.toISOString() },
              { id: 'demo_approval_acc', reportRunId: 'demo_report_current', role: 'ACCOUNTING', status: 'PENDING', approvedByUserId: null, notes: null, createdAt: now.toISOString(), updatedAt: now.toISOString() },
              { id: 'demo_approval_comp', reportRunId: 'demo_report_current', role: 'COMPLIANCE', status: 'PENDING', approvedByUserId: null, notes: null, createdAt: now.toISOString(), updatedAt: now.toISOString() },
            ],
          },
          {
            id: 'demo_report_prev',
            propertyId,
            periodStart: prevStart.toISOString(),
            periodEnd: prevEnd.toISOString(),
            status: 'PUBLISHED',
            draftText: `MONTHLY CLOSE REPORT — ${prevStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\nProperty: Demo Property\n\nKEY PERFORMANCE INDICATORS\nOccupancy Rate: 92%\nGross Rental Income: $11,800.00\nOperating Expenses: $3,540.00\nNet Operating Income: $8,260.00`,
            publishedAt: prevEnd.toISOString(),
            createdAt: prevStart.toISOString(),
            updatedAt: prevEnd.toISOString(),
            approvals: [
              { id: 'demo_approval_ops_prev', reportRunId: 'demo_report_prev', role: 'OPS', status: 'APPROVED', approvedByUserId: 'demo_admin', notes: null, createdAt: prevStart.toISOString(), updatedAt: prevEnd.toISOString() },
              { id: 'demo_approval_acc_prev', reportRunId: 'demo_report_prev', role: 'ACCOUNTING', status: 'APPROVED', approvedByUserId: 'demo_admin', notes: null, createdAt: prevStart.toISOString(), updatedAt: prevEnd.toISOString() },
              { id: 'demo_approval_comp_prev', reportRunId: 'demo_report_prev', role: 'COMPLIANCE', status: 'APPROVED', approvedByUserId: 'demo_admin', notes: null, createdAt: prevStart.toISOString(), updatedAt: prevEnd.toISOString() },
            ],
          },
        ];
        return res.json({ success: true, data: demoRuns });
      }

      const reportRuns = await (prisma as any).servicingReportRun.findMany({
        where: { propertyId },
        include: { approvals: true },
        orderBy: { periodEnd: 'desc' },
      });

      return res.json({ success: true, data: reportRuns });
    } catch (error: any) {
      console.error('[servicing] Error listing monthly close reports:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/property/:propertyId/distributions/create',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const { periodStart, periodEnd, totalAmountCents } = req.body;
      const user = (req as AuthenticatedRequest).user;

      if (!periodStart || !periodEnd || !totalAmountCents) {
        return res.status(400).json({ success: false, error: 'periodStart, periodEnd, and totalAmountCents are required' });
      }

      if (isDemoMode(req)) {
        const demoHolders = [
          { userId: 'demo_user_1', name: 'Alice Johnson', tokens: 150 },
          { userId: 'demo_user_2', name: 'Bob Smith', tokens: 100 },
          { userId: 'demo_user_3', name: 'Carol Williams', tokens: 75 },
          { userId: 'demo_user_4', name: 'Dave Brown', tokens: 50 },
          { userId: 'demo_user_5', name: 'Eve Davis', tokens: 125 },
        ];
        const totalTokens = demoHolders.reduce((sum, h) => sum + h.tokens, 0);
        const runId = `demo_dist_run_${Date.now()}`;
        const now = new Date().toISOString();
        const lineItems = demoHolders.map((h, i) => ({
          id: `demo_dli_${Date.now()}_${i}`,
          runId,
          userId: h.userId,
          amountCents: Math.round((h.tokens / totalTokens) * totalAmountCents),
          method: 'OFFCHAIN',
          status: 'PENDING',
          metadata: { name: h.name, tokens: h.tokens, totalTokens },
          createdAt: now,
          updatedAt: now,
          user: { id: h.userId, email: `${h.name.toLowerCase().replace(' ', '.')}@demo.com`, firstName: h.name.split(' ')[0], lastName: h.name.split(' ')[1] },
        }));
        return res.json({
          success: true,
          data: {
            id: runId,
            propertyId,
            periodStart,
            periodEnd,
            status: 'DRAFT',
            totalAmountCents,
            notes: null,
            createdAt: now,
            updatedAt: now,
            lineItems,
          },
        });
      }

      const property = await (prisma.property as any).findUnique({
        where: { id: propertyId },
        include: {
          holdings: {
            include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
          },
        },
      });

      if (!property) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }

      const totalTokens = property.holdings.reduce((sum: number, h: any) => sum + h.quantity, 0);
      if (totalTokens === 0) {
        return res.status(400).json({ success: false, error: 'No holdings found for this property' });
      }

      const lineItemsData = property.holdings.map((h: any) => ({
        userId: h.userId,
        amountCents: Math.round((h.quantity / totalTokens) * totalAmountCents),
        method: 'OFFCHAIN',
        status: 'PENDING',
      }));

      const run = await (prisma as any).servicingDistributionRun.create({
        data: {
          propertyId,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          totalAmountCents: Number(totalAmountCents),
          status: 'DRAFT',
          lineItems: {
            create: lineItemsData,
          },
        },
        include: {
          lineItems: {
            include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
          },
        },
      });

      await (prisma as any).auditEvent.create({
        data: {
          type: 'DISTRIBUTION_CREATED',
          entityId: run.id,
          userId: user?.clerkId || null,
          metadata: { propertyId, totalAmountCents, holdersCount: lineItemsData.length },
        },
      });

      return res.json({ success: true, data: run });
    } catch (error: any) {
      console.error('[servicing] Error creating distribution run:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/distributions/:id/approve',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: { id, status: 'APPROVED', updatedAt: new Date().toISOString() },
        });
      }

      const run = await (prisma as any).servicingDistributionRun.findUnique({ where: { id } });
      if (!run) {
        return res.status(404).json({ success: false, error: 'Distribution run not found' });
      }
      if (run.status !== 'DRAFT') {
        return res.status(400).json({ success: false, error: 'Distribution must be in DRAFT status to approve' });
      }

      const updated = await (prisma as any).servicingDistributionRun.update({
        where: { id },
        data: { status: 'APPROVED' },
        include: {
          lineItems: {
            include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
          },
        },
      });

      await (prisma as any).auditEvent.create({
        data: {
          type: 'DISTRIBUTION_APPROVED',
          entityId: id,
          userId: user?.clerkId || null,
          metadata: { propertyId: run.propertyId },
        },
      });

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[servicing] Error approving distribution:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/distributions/:id/pay',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: { id, status: 'PAID', updatedAt: new Date().toISOString() },
        });
      }

      const run = await (prisma as any).servicingDistributionRun.findUnique({ where: { id } });
      if (!run) {
        return res.status(404).json({ success: false, error: 'Distribution run not found' });
      }
      if (run.status !== 'APPROVED') {
        return res.status(400).json({ success: false, error: 'Distribution must be in APPROVED status to pay' });
      }

      await (prisma as any).servicingDistributionLineItem.updateMany({
        where: { runId: id },
        data: { status: 'SENT', method: 'OFFCHAIN' },
      });

      const updated = await (prisma as any).servicingDistributionRun.update({
        where: { id },
        data: { status: 'PAID' },
        include: {
          lineItems: {
            include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
          },
        },
      });

      await (prisma as any).auditEvent.create({
        data: {
          type: 'DISTRIBUTION_PAID',
          entityId: id,
          userId: user?.clerkId || null,
          metadata: { propertyId: run.propertyId },
        },
      });

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[servicing] Error paying distribution:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.get(
  '/property/:propertyId/distributions',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (isDemoMode(req)) {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);

        const demoHolders = [
          { userId: 'demo_user_1', name: 'Alice Johnson', tokens: 150 },
          { userId: 'demo_user_2', name: 'Bob Smith', tokens: 100 },
          { userId: 'demo_user_3', name: 'Carol Williams', tokens: 75 },
          { userId: 'demo_user_4', name: 'Dave Brown', tokens: 50 },
          { userId: 'demo_user_5', name: 'Eve Davis', tokens: 125 },
        ];
        const totalTokens = 500;

        const makeLineItems = (runId: string, totalCents: number, status: string) =>
          demoHolders.map((h, i) => ({
            id: `${runId}_li_${i}`,
            runId,
            userId: h.userId,
            amountCents: Math.round((h.tokens / totalTokens) * totalCents),
            method: 'OFFCHAIN',
            status,
            metadata: { name: h.name, tokens: h.tokens, totalTokens },
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            user: { id: h.userId, email: `${h.name.toLowerCase().replace(' ', '.')}@demo.com`, firstName: h.name.split(' ')[0], lastName: h.name.split(' ')[1] },
          }));

        const demoRuns = [
          {
            id: 'demo_dist_run_1',
            propertyId,
            periodStart: lastMonth.toISOString(),
            periodEnd: lastMonthEnd.toISOString(),
            status: 'DRAFT',
            totalAmountCents: 250000,
            notes: null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            lineItems: makeLineItems('demo_dist_run_1', 250000, 'PENDING'),
          },
          {
            id: 'demo_dist_run_2',
            propertyId,
            periodStart: twoMonthsAgo.toISOString(),
            periodEnd: twoMonthsAgoEnd.toISOString(),
            status: 'PAID',
            totalAmountCents: 240000,
            notes: null,
            createdAt: twoMonthsAgo.toISOString(),
            updatedAt: twoMonthsAgoEnd.toISOString(),
            lineItems: makeLineItems('demo_dist_run_2', 240000, 'SENT'),
          },
        ];
        return res.json({ success: true, data: demoRuns });
      }

      const isAdmin = user?.role === 'ADMIN';
      if (!isAdmin) {
        const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
        if (!property || property.ownerId !== user?.clerkId) {
          return res.status(403).json({ success: false, error: 'Forbidden' });
        }
      }

      const runs = await (prisma as any).servicingDistributionRun.findMany({
        where: { propertyId },
        include: {
          lineItems: {
            include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
          },
        },
        orderBy: { periodEnd: 'desc' },
      });

      return res.json({ success: true, data: runs });
    } catch (error: any) {
      console.error('[servicing] Error listing distributions:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

export default router;
