import express from 'express';
import { validateAuth } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = express.Router();

let coinbaseClient: any = null;
let Charge: any = null;
let Webhook: any = null;

async function initCoinbase() {
  if (!coinbaseClient) {
    const coinbase = await import('coinbase-commerce-node');
    const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
    
    if (!apiKey) {
      throw new Error('COINBASE_COMMERCE_API_KEY not configured');
    }
    
    coinbase.Client.init(apiKey);
    coinbaseClient = coinbase.Client;
    Charge = coinbase.resources.Charge;
    Webhook = coinbase.Webhook;
  }
  return { Charge, Webhook };
}

router.get('/config', async (req, res) => {
  const isConfigured = !!process.env.COINBASE_COMMERCE_API_KEY;
  res.json({
    success: true,
    configured: isConfigured,
    supportedCurrencies: ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'DAI'],
  });
});

router.post('/create-charge', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    const { amount, description } = req.body;

    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { Charge: ChargeResource } = await initCoinbase();

    const chargeData = {
      name: 'Parco Vault Deposit',
      description: description || `Deposit $${amount} to your Parco vault`,
      local_price: {
        amount: amount.toString(),
        currency: 'USD',
      },
      pricing_type: 'fixed_price',
      metadata: {
        userId: user.id,
        clerkId: clerkId,
        type: 'deposit',
      },
      redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/portfolio?deposit=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/portfolio?deposit=cancelled`,
    };

    const charge = await ChargeResource.create(chargeData);

    await prisma.cryptoPayment.create({
      data: {
        userId: user.id,
        coinbaseChargeId: charge.id,
        coinbaseChargeCode: charge.code,
        amount: amount,
        currency: 'USD',
        status: 'PENDING',
        hostedUrl: charge.hosted_url,
        expiresAt: new Date(charge.expires_at),
        metadata: {
          pricing: charge.pricing,
          addresses: charge.addresses,
        },
      },
    });

    res.json({
      success: true,
      data: {
        chargeId: charge.id,
        chargeCode: charge.code,
        hostedUrl: charge.hosted_url,
        expiresAt: charge.expires_at,
        addresses: charge.addresses,
        pricing: charge.pricing,
      },
    });
  } catch (error: any) {
    console.error('Error creating crypto charge:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create charge' });
  }
});

router.get('/charges', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;

    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const charges = await prisma.cryptoPayment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: charges.map((c: any) => ({
        id: c.id,
        chargeCode: c.coinbaseChargeCode,
        amount: c.amount,
        currency: c.currency,
        cryptoCurrency: c.cryptoCurrency,
        cryptoAmount: c.cryptoAmount,
        status: c.status,
        hostedUrl: c.hostedUrl,
        expiresAt: c.expiresAt,
        confirmedAt: c.confirmedAt,
        createdAt: c.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching crypto charges:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch charges' });
  }
});

router.get('/charge/:chargeCode', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    const { chargeCode } = req.params;

    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const charge = await prisma.cryptoPayment.findFirst({
      where: { 
        coinbaseChargeCode: chargeCode,
        userId: user.id,
      },
    });

    if (!charge) {
      return res.status(404).json({ success: false, error: 'Charge not found' });
    }

    res.json({
      success: true,
      data: {
        id: charge.id,
        chargeCode: charge.coinbaseChargeCode,
        amount: charge.amount,
        currency: charge.currency,
        cryptoCurrency: charge.cryptoCurrency,
        cryptoAmount: charge.cryptoAmount,
        status: charge.status,
        hostedUrl: charge.hostedUrl,
        expiresAt: charge.expiresAt,
        confirmedAt: charge.confirmedAt,
        txHash: charge.txHash,
        createdAt: charge.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching crypto charge:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch charge' });
  }
});

export default router;

export async function handleCryptoWebhook(rawBody: Buffer, signature: string) {
  const { Webhook: WebhookVerifier } = await initCoinbase();
  const webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('COINBASE_COMMERCE_WEBHOOK_SECRET not configured');
  }

  const rawBodyString = rawBody.toString('utf8');
  
  WebhookVerifier.verifySigHeader(rawBodyString, signature, webhookSecret);
  
  const event = JSON.parse(rawBodyString);
  
  console.log(`Coinbase Commerce webhook received: ${event.type}`);

  const chargeId = event.data?.id;
  const chargeCode = event.data?.code;

  if (!chargeId || !chargeCode) {
    console.error('Webhook missing charge data');
    return;
  }

  const cryptoPayment = await prisma.cryptoPayment.findUnique({
    where: { coinbaseChargeId: chargeId },
    include: { user: true },
  });

  if (!cryptoPayment) {
    console.error(`CryptoPayment not found for charge: ${chargeId}`);
    return;
  }

  switch (event.type) {
    case 'charge:pending':
      console.log(`Payment pending for charge ${chargeCode}`);
      
      const pendingPayment = event.data.payments?.[0];
      if (pendingPayment) {
        await prisma.cryptoPayment.update({
          where: { id: cryptoPayment.id },
          data: {
            cryptoCurrency: pendingPayment.value?.crypto?.currency || null,
            cryptoAmount: pendingPayment.value?.crypto?.amount || null,
            txHash: pendingPayment.transaction_id || null,
          },
        });
      }
      break;

    case 'charge:confirmed':
      console.log(`Payment confirmed for charge ${chargeCode}`);
      
      const confirmedPayment = event.data.payments?.[0];
      const confirmedAmount = parseFloat(event.data.pricing?.local?.amount || cryptoPayment.amount.toString());
      
      await prisma.$transaction(async (tx: any) => {
        await tx.cryptoPayment.update({
          where: { id: cryptoPayment.id },
          data: {
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            cryptoCurrency: confirmedPayment?.value?.crypto?.currency || cryptoPayment.cryptoCurrency,
            cryptoAmount: confirmedPayment?.value?.crypto?.amount || cryptoPayment.cryptoAmount,
            txHash: confirmedPayment?.transaction_id || cryptoPayment.txHash,
          },
        });

        const vaultAccount = await tx.vaultAccount.findUnique({
          where: { userId: cryptoPayment.userId },
        });

        if (vaultAccount) {
          await tx.vaultAccount.update({
            where: { id: vaultAccount.id },
            data: {
              usdcBalance: { increment: confirmedAmount },
              totalDeposited: { increment: confirmedAmount },
            },
          });

          await tx.transaction.create({
            data: {
              userId: cryptoPayment.userId,
              type: 'DEPOSIT',
              status: 'COMPLETED',
              amount: confirmedAmount,
              currency: 'USDC',
              reference: `crypto:${chargeCode}`,
              description: `Crypto deposit via Coinbase Commerce`,
              metadata: {
                coinbaseChargeCode: chargeCode,
                cryptoCurrency: confirmedPayment?.value?.crypto?.currency,
                cryptoAmount: confirmedPayment?.value?.crypto?.amount,
                txHash: confirmedPayment?.transaction_id,
              },
              completedAt: new Date(),
            },
          });

          console.log(`Deposited $${confirmedAmount} USDC to user ${cryptoPayment.userId}`);
        } else {
          console.error(`VaultAccount not found for user ${cryptoPayment.userId}`);
        }
      });
      break;

    case 'charge:failed':
      console.log(`Payment failed for charge ${chargeCode}`);
      await prisma.cryptoPayment.update({
        where: { id: cryptoPayment.id },
        data: { status: 'FAILED' },
      });
      break;

    case 'charge:delayed':
      console.log(`Payment delayed for charge ${chargeCode} - manual review needed`);
      break;

    case 'charge:resolved':
      console.log(`Charge resolved for ${chargeCode}`);
      await prisma.cryptoPayment.update({
        where: { id: cryptoPayment.id },
        data: { status: 'RESOLVED' },
      });
      break;

    default:
      console.log(`Unhandled Coinbase Commerce event: ${event.type}`);
  }
}
