import { Router } from 'express';
import { isDemoMode } from '../lib/demoMode';

const router = Router();

router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      demoMode: isDemoMode(),
      features: {
        kyc: true,
        trading: true,
        borrowing: true,
        rentDistribution: true,
        cryptoPayments: !!process.env.COINBASE_API_KEY,
        stripePayments: !!process.env.STRIPE_SECRET_KEY,
      },
      version: '1.0.0',
    },
  });
});

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    demoMode: isDemoMode(),
  });
});

export default router;
