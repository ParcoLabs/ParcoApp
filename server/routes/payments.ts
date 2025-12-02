import { Router } from 'express';
import { validateAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { getUncachableStripeClient, getStripePublishableKey } from '../lib/stripeClient';

const requireAuth = validateAuth;

const router = Router();

router.get('/config', async (req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ success: true, publishableKey });
  } catch (error: any) {
    console.error('Error getting Stripe config:', error);
    res.status(500).json({ success: false, error: 'Failed to get Stripe configuration' });
  }
});

router.get('/methods', requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { paymentMethods: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: user.paymentMethods.map(pm => ({
        id: pm.id,
        type: pm.type,
        isDefault: pm.isDefault,
        cardBrand: pm.cardBrand,
        cardLast4: pm.cardLast4,
        cardExpMonth: pm.cardExpMonth,
        cardExpYear: pm.cardExpYear,
        bankName: pm.bankName,
        bankLast4: pm.bankLast4,
        bankAccountType: pm.bankAccountType,
        bankStatus: pm.bankStatus,
        nickname: pm.nickname,
        createdAt: pm.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment methods' });
  }
});

router.post('/setup-intent', requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const stripe = await getUncachableStripeClient();

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id, clerkId },
      });
      stripeCustomerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: { userId: user.id },
    });

    res.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
    });
  } catch (error: any) {
    console.error('Error creating setup intent:', error);
    res.status(500).json({ success: false, error: 'Failed to create setup intent' });
  }
});

router.post('/financial-connections/session', requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const stripe = await getUncachableStripeClient();

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id, clerkId },
      });
      stripeCustomerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    const session = await stripe.financialConnections.sessions.create({
      account_holder: {
        type: 'customer',
        customer: stripeCustomerId,
      },
      permissions: ['payment_method', 'balances', 'ownership'],
      filters: {
        countries: ['US'],
      },
    });

    res.json({
      success: true,
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Error creating Financial Connections session:', error);
    res.status(500).json({ success: false, error: 'Failed to create bank linking session' });
  }
});

router.post('/link-bank-account', requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    const { accountId } = req.body;

    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!accountId) {
      return res.status(400).json({ success: false, error: 'Account ID is required' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const stripe = await getUncachableStripeClient();

    const paymentMethod = await stripe.paymentMethods.create({
      type: 'us_bank_account',
      us_bank_account: {
        financial_connections_account: accountId,
      },
    });

    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: user.stripeCustomerId,
    });

    const bankAccount = paymentMethod.us_bank_account;
    const savedMethod = await prisma.paymentMethod.create({
      data: {
        userId: user.id,
        stripePaymentMethodId: paymentMethod.id,
        stripeCustomerId: user.stripeCustomerId,
        type: 'US_BANK_ACCOUNT',
        bankName: bankAccount?.bank_name || null,
        bankLast4: bankAccount?.last4 || null,
        bankAccountType: bankAccount?.account_type || null,
        bankStatus: 'VERIFIED',
      },
    });

    res.json({
      success: true,
      data: {
        id: savedMethod.id,
        type: savedMethod.type,
        bankName: savedMethod.bankName,
        bankLast4: savedMethod.bankLast4,
        bankAccountType: savedMethod.bankAccountType,
        bankStatus: savedMethod.bankStatus,
      },
    });
  } catch (error: any) {
    console.error('Error linking bank account:', error);
    res.status(500).json({ success: false, error: 'Failed to link bank account' });
  }
});

router.post('/save-card', requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    const { paymentMethodId } = req.body;

    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ success: false, error: 'Payment method ID is required' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const stripe = await getUncachableStripeClient();

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const card = paymentMethod.card;

    const savedMethod = await prisma.paymentMethod.create({
      data: {
        userId: user.id,
        stripePaymentMethodId: paymentMethod.id,
        stripeCustomerId: user.stripeCustomerId,
        type: 'CARD',
        cardBrand: card?.brand || null,
        cardLast4: card?.last4 || null,
        cardExpMonth: card?.exp_month || null,
        cardExpYear: card?.exp_year || null,
      },
    });

    res.json({
      success: true,
      data: {
        id: savedMethod.id,
        type: savedMethod.type,
        cardBrand: savedMethod.cardBrand,
        cardLast4: savedMethod.cardLast4,
        cardExpMonth: savedMethod.cardExpMonth,
        cardExpYear: savedMethod.cardExpYear,
      },
    });
  } catch (error: any) {
    console.error('Error saving card:', error);
    res.status(500).json({ success: false, error: 'Failed to save card' });
  }
});

router.post('/set-default', requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    const { paymentMethodId } = req.body;

    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await prisma.paymentMethod.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });

    await prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { isDefault: true },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({ success: false, error: 'Failed to set default payment method' });
  }
});

router.delete('/methods/:id', requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    const { id } = req.params;

    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id, userId: user.id },
    });

    if (!paymentMethod) {
      return res.status(404).json({ success: false, error: 'Payment method not found' });
    }

    const stripe = await getUncachableStripeClient();
    await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);

    await prisma.paymentMethod.delete({ where: { id } });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ success: false, error: 'Failed to delete payment method' });
  }
});

router.post('/deposit', requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    const { amount, paymentMethodId } = req.body;

    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!amount || amount < 1) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { paymentMethods: true },
    });

    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let selectedMethod = paymentMethodId
      ? user.paymentMethods.find(pm => pm.id === paymentMethodId)
      : user.paymentMethods.find(pm => pm.isDefault);

    if (!selectedMethod && user.paymentMethods.length > 0) {
      selectedMethod = user.paymentMethods[0];
    }

    if (!selectedMethod) {
      return res.status(400).json({ success: false, error: 'No payment method available' });
    }

    const stripe = await getUncachableStripeClient();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: user.stripeCustomerId,
      payment_method: selectedMethod.stripePaymentMethodId,
      payment_method_types: selectedMethod.type === 'CARD' ? ['card'] : ['us_bank_account'],
      confirm: true,
      metadata: {
        userId: user.id,
        type: 'deposit',
      },
    });

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'DEPOSIT',
        status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PROCESSING',
        amount: amount,
        currency: 'USD',
        reference: paymentIntent.id,
        description: `Deposit via ${selectedMethod.type === 'CARD' ? 'card' : 'bank account'}`,
      },
    });

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
      },
    });
  } catch (error: any) {
    console.error('Error creating deposit:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create deposit' });
  }
});

router.post('/verify-microdeposits', requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    const { paymentMethodId, amounts } = req.body;

    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!paymentMethodId || !amounts || !Array.isArray(amounts) || amounts.length !== 2) {
      return res.status(400).json({ success: false, error: 'Invalid verification data' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId: user.id },
    });

    if (!paymentMethod) {
      return res.status(404).json({ success: false, error: 'Payment method not found' });
    }

    const stripe = await getUncachableStripeClient();

    await stripe.paymentMethods.verifyMicrodeposits(paymentMethod.stripePaymentMethodId, {
      amounts,
    });

    await prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { bankStatus: 'VERIFIED' },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error verifying microdeposits:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to verify microdeposits' });
  }
});

export default router;
