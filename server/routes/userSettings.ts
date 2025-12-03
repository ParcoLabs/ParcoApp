import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { validateAuth } from '../middleware/auth';
import { isDemoMode } from '../lib/demoMode';

const router = Router();

router.post('/demo-mode', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!isDemoMode()) {
      return res.status(403).json({
        success: false,
        error: 'Demo mode is not available on this server',
      });
    }

    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled must be a boolean',
      });
    }

    const user = await prisma.user.update({
      where: { clerkId },
      data: { isDemoUser: enabled },
      select: {
        id: true,
        email: true,
        isDemoUser: true,
      },
    });

    res.json({
      success: true,
      data: {
        isDemoUser: user.isDemoUser,
        message: enabled ? 'Demo mode enabled' : 'Demo mode disabled',
      },
    });
  } catch (error: any) {
    console.error('Error updating demo mode:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update demo mode',
    });
  }
});

router.get('/demo-mode', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { isDemoUser: true },
    });

    res.json({
      success: true,
      data: {
        isDemoUser: user?.isDemoUser || false,
        serverDemoModeEnabled: isDemoMode(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching demo mode status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch demo mode status',
    });
  }
});

export default router;
