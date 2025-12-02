import { Router, Request, Response } from 'express';
import { validateAuth } from '../middleware/auth';
import prisma from '../lib/prisma';
import {
  initializeCoinbaseCommerce,
  isCommerceEnabled,
  createCharge,
  getCharge,
  verifyWebhook,
} from '../lib/coinbaseCommerce';
import { Prisma } from '@prisma/client';

const router = Router();

initializeCoinbaseCommerce();

router.get('/config', (req, res) => {
  res.json({
    success: true,
    enabled: isCommerceEnabled(),
    supportedCurrencies: ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'DAI'],
  });
});

router.post('/create-charge', validateAuth, async (req: Request, res: Response) => {
  try {
    const clerkId = (req as any).auth?.userId;
    const { amount, description } = req.body;

    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!isCommerceEnabled()) {
      return res.status(503).json({ success: false, error: 'Crypto payments not configured' });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const charge = await createCharge({
      name: 'Parco Vault Deposit',
      description: description || `Deposit $${amount} to your Parco vault`,
      amount: amount.toString(),
      currency: 'USD',
      metadata: {
        userId: user.id,
        clerkId: clerkId,
        type: 'vault_deposit',
      },
    });

    const expiresAt = new Date(charge.expires_at);

    await (prisma as any).cryptoPayment.create({
      data: {
        userId: user.id,
        chargeId: charge.id,
        chargeCode: charge.code,
        hostedUrl: charge.hosted_url,
        status: 'NEW',
        requestedAmount: new Prisma.Decimal(amount),
        requestedCurrency: 'USD',
        expiresAt,
        metadata: {
          addresses: charge.addresses,
          pricing: charge.pricing,
        },
      },
    });

    res.json({
      success: true,
      data: {
        chargeId: charge.id,
        chargeCode: charge.code,
        hostedUrl: charge.hosted_url,
        expiresAt: expiresAt.toISOString(),
        addresses: charge.addresses,
        pricing: charge.pricing,
      },
    });
  } catch (error: any) {
    console.error('Error creating crypto charge:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create charge' });
  }
});

router.get('/charge/:chargeId', validateAuth, async (req: Request, res: Response) => {
  try {
    const clerkId = (req as any).auth?.userId;
    const { chargeId } = req.params;

    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const payment = await (prisma as any).cryptoPayment.findFirst({
      where: { chargeId, userId: user.id },
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    let charge = null;
    if (isCommerceEnabled()) {
      try {
        charge = await getCharge(chargeId);
      } catch (e) {
        console.error('Error fetching charge from Coinbase:', e);
      }
    }

    res.json({
      success: true,
      data: {
        id: payment.id,
        chargeId: payment.chargeId,
        chargeCode: payment.chargeCode,
        hostedUrl: payment.hostedUrl,
        status: payment.status,
        requestedAmount: payment.requestedAmount,
        requestedCurrency: payment.requestedCurrency,
        receivedAmount: payment.receivedAmount,
        receivedCurrency: payment.receivedCurrency,
        usdcEquivalent: payment.usdcEquivalent,
        expiresAt: payment.expiresAt,
        confirmedAt: payment.confirmedAt,
        coinbaseData: charge,
      },
    });
  } catch (error: any) {
    console.error('Error fetching crypto charge:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch charge' });
  }
});

router.get('/payments', validateAuth, async (req: Request, res: Response) => {
  try {
    const clerkId = (req as any).auth?.userId;

    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const payments = await (prisma as any).cryptoPayment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: payments.map((p) => ({
        id: p.id,
        chargeId: p.chargeId,
        chargeCode: p.chargeCode,
        hostedUrl: p.hostedUrl,
        status: p.status,
        requestedAmount: p.requestedAmount,
        requestedCurrency: p.requestedCurrency,
        receivedAmount: p.receivedAmount,
        receivedCurrency: p.receivedCurrency,
        usdcEquivalent: p.usdcEquivalent,
        expiresAt: p.expiresAt,
        confirmedAt: p.confirmedAt,
        createdAt: p.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching crypto payments:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch payments' });
  }
});

export default router;
