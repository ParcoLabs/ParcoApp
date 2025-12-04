import { Router } from 'express';
import { validateAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { getUncachableStripeClient } from '../lib/stripeClient';
import { isDemoMode, generateMockTxHash, simulateDelay } from '../lib/demoMode';

const router = Router();

interface BuyRequest {
  propertyId: string;
  tokenAmount: number;
  paymentMethodId?: string;
  useVaultBalance?: boolean;
}

router.post('/', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { propertyId, tokenAmount, paymentMethodId, useVaultBalance } = req.body as BuyRequest;

    if (!propertyId) {
      return res.status(400).json({ success: false, error: 'Property ID is required' });
    }

    if (!tokenAmount || tokenAmount < 1) {
      return res.status(400).json({ success: false, error: 'Token amount must be at least 1' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        kycVerification: true,
        vaultAccount: true,
        paymentMethods: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!user.kycVerification || user.kycVerification.status !== 'APPROVED') {
      return res.status(403).json({ 
        success: false, 
        error: 'KYC verification required before purchasing tokens',
        code: 'KYC_REQUIRED'
      });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { token: true },
    });

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    if (property.status !== 'ACTIVE' && property.status !== 'FUNDING') {
      return res.status(400).json({ success: false, error: 'Property is not available for purchase' });
    }

    if (property.isPaused) {
      return res.status(400).json({ 
        success: false, 
        error: 'This property is currently paused and not available for purchase',
        code: 'PROPERTY_PAUSED'
      });
    }

    if (property.availableTokens < tokenAmount) {
      return res.status(400).json({ 
        success: false, 
        error: `Only ${property.availableTokens} tokens available`,
        availableTokens: property.availableTokens
      });
    }

    const tokenPrice = Number(property.tokenPrice);
    const totalCost = tokenPrice * tokenAmount;
    const platformFee = totalCost * 0.01;
    const totalAmount = totalCost + platformFee;

    let vaultAccount = user.vaultAccount;
    if (!vaultAccount) {
      vaultAccount = await prisma.vaultAccount.create({
        data: { userId: user.id },
      });
    }

    const vaultBalance = Number(vaultAccount.usdcBalance);
    let paymentSource: 'vault' | 'card' | 'bank' = 'vault';
    let amountFromVault = 0;
    let amountFromPayment = 0;
    let paymentIntentId: string | null = null;

    const demoMode = isDemoMode();
    
    if (demoMode) {
      await simulateDelay('normal');
      paymentSource = 'vault';
      amountFromVault = totalAmount;
      paymentIntentId = `demo_pi_${Date.now()}`;
    } else if (useVaultBalance && vaultBalance >= totalAmount) {
      paymentSource = 'vault';
      amountFromVault = totalAmount;
    } else if (paymentMethodId) {
      const selectedMethod = user.paymentMethods.find(pm => pm.id === paymentMethodId);
      if (!selectedMethod) {
        return res.status(400).json({ success: false, error: 'Payment method not found' });
      }

      if (vaultBalance > 0 && useVaultBalance !== false) {
        amountFromVault = Math.min(vaultBalance, totalAmount);
        amountFromPayment = totalAmount - amountFromVault;
      } else {
        amountFromPayment = totalAmount;
      }

      if (amountFromPayment > 0) {
        paymentSource = selectedMethod.type === 'CARD' ? 'card' : 'bank';

        if (!user.stripeCustomerId) {
          return res.status(400).json({ 
            success: false, 
            error: 'Payment setup incomplete. Please add a payment method first.',
            code: 'NO_STRIPE_CUSTOMER'
          });
        }

        const stripe = await getUncachableStripeClient();
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amountFromPayment * 100),
          currency: 'usd',
          customer: user.stripeCustomerId!,
          payment_method: selectedMethod.stripePaymentMethodId,
          payment_method_types: selectedMethod.type === 'CARD' ? ['card'] : ['us_bank_account'],
          confirm: true,
          metadata: {
            userId: user.id,
            propertyId: property.id,
            tokenAmount: tokenAmount.toString(),
            type: 'token_purchase',
          },
        });

        if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'processing') {
          return res.status(400).json({ 
            success: false, 
            error: 'Payment failed',
            paymentStatus: paymentIntent.status
          });
        }

        paymentIntentId = paymentIntent.id;
      }
    } else if (vaultBalance >= totalAmount) {
      paymentSource = 'vault';
      amountFromVault = totalAmount;
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient funds. Please add a payment method or deposit funds to your vault.',
        code: 'INSUFFICIENT_FUNDS',
        vaultBalance,
        required: totalAmount
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (amountFromVault > 0) {
        await tx.vaultAccount.update({
          where: { id: vaultAccount!.id },
          data: {
            usdcBalance: { decrement: amountFromVault },
          },
        });
      }

      if (amountFromPayment > 0) {
        await tx.vaultAccount.update({
          where: { id: vaultAccount!.id },
          data: {
            usdcBalance: { increment: amountFromPayment },
            totalDeposited: { increment: amountFromPayment },
          },
        });

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'DEPOSIT',
            status: 'COMPLETED',
            amount: amountFromPayment,
            currency: 'USDC',
            reference: paymentIntentId,
            description: `Converted ${paymentSource} payment to USDC`,
          },
        });

        await tx.vaultAccount.update({
          where: { id: vaultAccount!.id },
          data: {
            usdcBalance: { decrement: totalAmount },
          },
        });
      }

      await tx.property.update({
        where: { id: property.id },
        data: {
          availableTokens: { decrement: tokenAmount },
        },
      });

      let token = property.token;
      if (!token) {
        token = await tx.token.create({
          data: {
            propertyId: property.id,
            totalSupply: property.totalTokens,
            circulatingSupply: 0,
          },
        });
      }

      await tx.token.update({
        where: { id: token.id },
        data: {
          circulatingSupply: { increment: tokenAmount },
        },
      });

      const existingHolding = await tx.holding.findUnique({
        where: {
          userId_propertyId: {
            userId: user.id,
            propertyId: property.id,
          },
        },
      });

      let holding;
      if (existingHolding) {
        const newQuantity = existingHolding.quantity + tokenAmount;
        const newTotalInvested = Number(existingHolding.totalInvested) + totalCost;
        const newAverageCost = newTotalInvested / newQuantity;

        holding = await tx.holding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: newQuantity,
            totalInvested: newTotalInvested,
            averageCost: newAverageCost,
          },
        });
      } else {
        holding = await tx.holding.create({
          data: {
            userId: user.id,
            propertyId: property.id,
            tokenId: token.id,
            quantity: tokenAmount,
            averageCost: tokenPrice,
            totalInvested: totalCost,
          },
        });
      }

      const mintTxHash = demoMode ? generateMockTxHash() : `0x${Buffer.from(Date.now().toString() + Math.random().toString()).toString('hex').slice(0, 64)}`;

      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'BUY',
          status: 'COMPLETED',
          amount: totalCost,
          currency: 'USDC',
          propertyId: property.id,
          tokenQuantity: tokenAmount,
          tokenPrice: tokenPrice,
          fee: platformFee,
          txHash: mintTxHash,
          chainId: token.chainId,
          reference: paymentIntentId,
          description: `Purchased ${tokenAmount} tokens of ${property.name}`,
          completedAt: new Date(),
        },
      });

      const updatedVault = await tx.vaultAccount.findUnique({
        where: { id: vaultAccount!.id },
      });

      const holdings = await tx.holding.findMany({
        where: { userId: user.id },
        include: {
          property: true,
          token: true,
        },
      });

      return {
        transaction,
        holding,
        vault: updatedVault,
        holdings,
        mintTxHash,
      };
    });

    const portfolioValue = result.holdings.reduce((sum, h) => {
      return sum + (h.quantity * Number(h.property.tokenPrice));
    }, 0);

    const totalInvested = result.holdings.reduce((sum, h) => {
      return sum + Number(h.totalInvested);
    }, 0);

    res.json({
      success: true,
      demoMode,
      data: {
        transaction: {
          id: result.transaction.id,
          type: result.transaction.type,
          status: result.transaction.status,
          amount: Number(result.transaction.amount),
          tokenQuantity: result.transaction.tokenQuantity,
          tokenPrice: Number(result.transaction.tokenPrice),
          fee: Number(result.transaction.fee),
          txHash: result.mintTxHash,
          propertyId: result.transaction.propertyId,
          createdAt: result.transaction.createdAt,
        },
        holding: {
          id: result.holding.id,
          propertyId: result.holding.propertyId,
          quantity: result.holding.quantity,
          averageCost: Number(result.holding.averageCost),
          totalInvested: Number(result.holding.totalInvested),
        },
        vault: {
          balance: Number(result.vault?.usdcBalance || 0),
          lockedBalance: Number(result.vault?.lockedBalance || 0),
        },
        portfolio: {
          totalValue: portfolioValue,
          totalInvested: totalInvested,
          gains: portfolioValue - totalInvested,
          holdingsCount: result.holdings.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error processing buy order:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process purchase' 
    });
  }
});

router.get('/estimate', validateAuth, async (req, res) => {
  try {
    const { propertyId, tokenAmount } = req.query;

    if (!propertyId || !tokenAmount) {
      return res.status(400).json({ success: false, error: 'Property ID and token amount required' });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId as string },
    });

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    const amount = parseInt(tokenAmount as string, 10);
    const tokenPrice = Number(property.tokenPrice);
    const subtotal = tokenPrice * amount;
    const platformFee = subtotal * 0.01;
    const total = subtotal + platformFee;

    res.json({
      success: true,
      data: {
        propertyId,
        tokenAmount: amount,
        tokenPrice,
        subtotal,
        platformFee,
        platformFeePercent: 1,
        total,
        currency: 'USDC',
        availableTokens: property.availableTokens,
      },
    });
  } catch (error: any) {
    console.error('Error estimating purchase:', error);
    res.status(500).json({ success: false, error: 'Failed to estimate purchase' });
  }
});

export default router;
