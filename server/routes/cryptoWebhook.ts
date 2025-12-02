import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { verifyWebhook } from '../lib/coinbaseCommerce';
import { Prisma } from '@prisma/client';

const router = Router();

async function ensureVaultAccount(userId: string) {
  const existing = await prisma.vaultAccount.findUnique({ where: { userId } });
  if (existing) return existing;
  
  return prisma.vaultAccount.create({
    data: {
      userId,
      usdcBalance: new Prisma.Decimal(0),
      lockedBalance: new Prisma.Decimal(0),
      totalDeposited: new Prisma.Decimal(0),
      totalWithdrawn: new Prisma.Decimal(0),
    },
  });
}

async function creditUserVault(userId: string, usdcAmount: number, chargeId: string): Promise<boolean> {
  const existingTransaction = await prisma.transaction.findFirst({
    where: { 
      userId,
      reference: chargeId,
      type: 'DEPOSIT',
      status: 'COMPLETED',
    },
  });
  
  if (existingTransaction) {
    console.log('Vault already credited for charge:', chargeId, '- skipping duplicate');
    return false;
  }
  
  await ensureVaultAccount(userId);
  
  await prisma.$transaction(async (tx) => {
    await tx.vaultAccount.update({
      where: { userId },
      data: {
        usdcBalance: { increment: usdcAmount },
        totalDeposited: { increment: usdcAmount },
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        amount: new Prisma.Decimal(usdcAmount),
        currency: 'USDC',
        reference: chargeId,
        description: 'Crypto deposit via Coinbase Commerce',
        completedAt: new Date(),
      },
    });
  });
  
  return true;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-cc-webhook-signature'] as string;
    
    if (!signature) {
      console.warn('Missing webhook signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    let event: any;
    try {
      event = verifyWebhook(req.body, signature);
    } catch (error) {
      console.error('Webhook verification failed:', error);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log('Coinbase Commerce webhook event:', event.type);

    const chargeData = event.data;
    const chargeId = chargeData?.id;
    const chargeCode = chargeData?.code;

    if (!chargeId) {
      console.warn('No charge ID in webhook event');
      return res.status(200).json({ received: true });
    }

    const payment = await (prisma as any).cryptoPayment.findFirst({
      where: { chargeId },
    });

    if (!payment) {
      console.warn('Payment not found for charge:', chargeId);
      return res.status(200).json({ received: true });
    }

    const userId = payment.userId;

    switch (event.type) {
      case 'charge:created':
        console.log('Charge created:', chargeId);
        break;

      case 'charge:pending':
        if (payment.status !== 'PENDING') {
          await (prisma as any).cryptoPayment.update({
            where: { id: payment.id },
            data: { status: 'PENDING' },
          });
        }
        console.log('Charge pending:', chargeId);
        break;

      case 'charge:confirmed':
        if (payment.status === 'CONFIRMED' || payment.status === 'RESOLVED') {
          console.log('Charge already confirmed, skipping:', chargeId);
          return res.status(200).json({ received: true });
        }
        
        const payments = chargeData.payments || [];
        const confirmedPayment = payments.find((p: any) => p.status === 'CONFIRMED');
        
        let receivedAmount = null;
        let receivedCurrency = null;
        let usdcEquivalent = payment.requestedAmount;
        let networkTxHash = null;

        if (confirmedPayment) {
          receivedAmount = parseFloat(confirmedPayment.value?.crypto?.amount || '0');
          receivedCurrency = confirmedPayment.value?.crypto?.currency?.toUpperCase();
          networkTxHash = confirmedPayment.transaction_id;
          
          if (confirmedPayment.value?.local) {
            usdcEquivalent = parseFloat(confirmedPayment.value.local.amount || payment.requestedAmount);
          }
        }

        await (prisma as any).cryptoPayment.update({
          where: { id: payment.id },
          data: {
            status: 'CONFIRMED',
            receivedAmount: receivedAmount ? new Prisma.Decimal(receivedAmount) : null,
            receivedCurrency: receivedCurrency || null,
            usdcEquivalent: new Prisma.Decimal(usdcEquivalent),
            networkTxHash,
            confirmedAt: new Date(),
          },
        });

        const credited = await creditUserVault(userId, parseFloat(usdcEquivalent.toString()), chargeId);
        
        if (credited) {
          console.log('Charge confirmed, vault credited:', chargeId, 'Amount:', usdcEquivalent);
        } else {
          console.log('Charge confirmed, vault already credited:', chargeId);
        }
        break;

      case 'charge:failed':
        if (payment.status !== 'FAILED') {
          await (prisma as any).cryptoPayment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
        }
        console.log('Charge failed:', chargeId);
        break;

      case 'charge:delayed':
        console.log('Charge delayed (waiting for confirmations):', chargeId);
        break;

      case 'charge:resolved':
        if (payment.status !== 'RESOLVED') {
          await (prisma as any).cryptoPayment.update({
            where: { id: payment.id },
            data: { status: 'RESOLVED' },
          });
        }
        console.log('Charge resolved:', chargeId);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
