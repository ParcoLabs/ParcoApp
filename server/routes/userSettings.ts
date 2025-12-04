import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { validateAuth } from '../middleware/auth';
import { isDemoMode } from '../lib/demoMode';

const router = Router();

router.post('/demo-mode', validateAuth, async (req, res) => {
  console.log('[POST /api/user/demo-mode] Request received');
  try {
    const clerkId = (req as any).auth?.userId;
    console.log('[POST /api/user/demo-mode] clerkId:', clerkId);
    if (!clerkId) {
      console.log('[POST /api/user/demo-mode] No clerkId - returning 401');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!isDemoMode()) {
      console.log('[POST /api/user/demo-mode] Server demo mode not enabled');
      return res.status(403).json({
        success: false,
        error: 'Demo mode is not available on this server',
      });
    }

    const { enabled } = req.body;
    console.log('[POST /api/user/demo-mode] enabled:', enabled);

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

router.get('/tokenizer-view', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { tokenizerViewMode: true },
    });

    res.json({
      success: true,
      data: {
        tokenizerViewMode: user?.tokenizerViewMode || 'post',
      },
    });
  } catch (error: any) {
    console.error('Error fetching tokenizer view mode:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch tokenizer view mode',
    });
  }
});

router.post('/tokenizer-view', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { viewMode } = req.body;

    if (viewMode !== 'pre' && viewMode !== 'post') {
      return res.status(400).json({
        success: false,
        error: 'viewMode must be "pre" or "post"',
      });
    }

    const user = await prisma.user.update({
      where: { clerkId },
      data: { tokenizerViewMode: viewMode },
      select: {
        id: true,
        email: true,
        tokenizerViewMode: true,
      },
    });

    res.json({
      success: true,
      data: {
        tokenizerViewMode: user.tokenizerViewMode,
        message: viewMode === 'pre' ? 'Pre-tokenization view enabled' : 'Post-tokenization view enabled',
      },
    });
  } catch (error: any) {
    console.error('Error updating tokenizer view mode:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update tokenizer view mode',
    });
  }
});

export default router;
