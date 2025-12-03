import { Router } from 'express';
import { validateAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { getUncachableStripeClient } from '../lib/stripeClient';
import { 
  lockCollateral, 
  unlockCollateral, 
  issueLoan, 
  recordRepayment,
  setTokenPrice,
  getEVMClient
} from '../blockchain/evm';

const router = Router();

const DEFAULT_INTEREST_RATE_BPS = 800;
const MAX_LTV_BPS = 5000;
const ORIGINATION_FEE_BPS = 100;

interface BorrowRequest {
  collateral: Array<{
    propertyId: string;
    tokenId: number;
    amount: number;
  }>;
  borrowAmount: number;
}

interface RepayRequest {
  borrowPositionId: string;
  amount: number;
  paymentMethodId?: string;
}

router.post('/', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { collateral, borrowAmount } = req.body as BorrowRequest;

    if (!collateral || !Array.isArray(collateral) || collateral.length === 0) {
      return res.status(400).json({ success: false, error: 'Collateral is required' });
    }

    if (!borrowAmount || borrowAmount < 1) {
      return res.status(400).json({ success: false, error: 'Borrow amount must be at least $1' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        kycVerification: true,
        vaultAccount: true,
        holdings: {
          include: { property: true, token: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!user.kycVerification || user.kycVerification.status !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        error: 'KYC verification required before borrowing',
        code: 'KYC_REQUIRED',
      });
    }

    let vaultAccount = user.vaultAccount;
    if (!vaultAccount) {
      vaultAccount = await prisma.vaultAccount.create({
        data: { userId: user.id },
      });
    }

    const existingPosition = await prisma.borrowPosition.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
    });

    if (existingPosition) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active borrow position. Please repay before borrowing again.',
        code: 'ACTIVE_POSITION_EXISTS',
        existingPositionId: existingPosition.id,
      });
    }

    let totalCollateralValue = 0;
    const collateralItems: Array<{
      propertyId: string;
      tokenId: number;
      amount: number;
      value: number;
      holding: any;
    }> = [];

    for (const item of collateral) {
      const holding = user.holdings.find(
        (h) => h.propertyId === item.propertyId && h.quantity >= item.amount
      );

      if (!holding) {
        return res.status(400).json({
          success: false,
          error: `Insufficient tokens for property ${item.propertyId}`,
          code: 'INSUFFICIENT_TOKENS',
        });
      }

      const tokenPrice = Number(holding.property.tokenPrice);
      const itemValue = tokenPrice * item.amount;
      totalCollateralValue += itemValue;

      collateralItems.push({
        propertyId: item.propertyId,
        tokenId: item.tokenId,
        amount: item.amount,
        value: itemValue,
        holding,
      });
    }

    const maxBorrowable = (totalCollateralValue * MAX_LTV_BPS) / 10000;
    if (borrowAmount > maxBorrowable) {
      return res.status(400).json({
        success: false,
        error: `Requested amount exceeds max borrowable. Max: $${maxBorrowable.toFixed(2)}`,
        code: 'EXCEEDS_LTV',
        maxBorrowable,
        collateralValue: totalCollateralValue,
        ltvBps: MAX_LTV_BPS,
      });
    }

    const originationFee = (borrowAmount * ORIGINATION_FEE_BPS) / 10000;
    const netDisbursement = borrowAmount - originationFee;
    const ltvRatio = borrowAmount / totalCollateralValue;

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        error: 'Stripe account setup required for payouts. Please add a payment method first.',
        code: 'NO_STRIPE_CUSTOMER',
      });
    }

    const evmClient = getEVMClient();
    let lockTxHashes: string[] = [];
    let onChainLockSuccess = true;

    if (evmClient.hasBorrowVault() && vaultAccount.walletAddress) {
      for (const item of collateralItems) {
        try {
          const priceWithPrecision = Number(item.holding.property.tokenPrice).toFixed(6);
          await setTokenPrice(item.tokenId, priceWithPrecision);
        } catch (err) {
          console.log('Token price set skipped (may already exist):', err);
        }
      }

      for (const item of collateralItems) {
        try {
          const { txHash } = await lockCollateral(vaultAccount.walletAddress!, item.tokenId, item.amount);
          lockTxHashes.push(txHash);
        } catch (err) {
          console.error('Failed to lock collateral on-chain:', err);
          onChainLockSuccess = false;
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const borrowPosition = await tx.borrowPosition.create({
        data: {
          userId: user.id,
          vaultAccountId: vaultAccount!.id,
          principal: borrowAmount,
          interestRate: DEFAULT_INTEREST_RATE_BPS / 10000,
          collateralValue: totalCollateralValue,
          collateralRatio: ltvRatio,
          status: 'ACTIVE',
        },
      });

      const createdCollaterals = [];
      for (let i = 0; i < collateralItems.length; i++) {
        const item = collateralItems[i];
        const col = await tx.borrowCollateral.create({
          data: {
            borrowPositionId: borrowPosition.id,
            propertyId: item.propertyId,
            tokenId: item.tokenId,
            amount: item.amount,
            valueAtLock: item.value,
            currentValue: item.value,
            txHashLock: lockTxHashes[i] || null,
          },
        });
        createdCollaterals.push(col);
      }

      await tx.vaultAccount.update({
        where: { id: vaultAccount!.id },
        data: {
          lockedBalance: { increment: totalCollateralValue },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'BORROW',
          status: 'PROCESSING',
          amount: borrowAmount,
          currency: 'USDC',
          fee: originationFee,
          description: `Borrowed $${borrowAmount} against ${collateralItems.length} property token(s)`,
          metadata: {
            borrowPositionId: borrowPosition.id,
            collateralValue: totalCollateralValue,
            ltvRatio,
            originationFee,
            netDisbursement,
          },
        },
      });

      return { borrowPosition, transaction, createdCollaterals };
    });

    let payoutId: string | null = null;
    let payoutStatus: string = 'pending';

    try {
      const stripe = await getUncachableStripeClient();

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'us_bank_account',
      });

      if (paymentMethods.data.length > 0) {
        try {
          const transfer = await stripe.transfers.create({
            amount: Math.round(netDisbursement * 100),
            currency: 'usd',
            destination: 'default',
            metadata: {
              userId: user.id,
              borrowPositionId: result.borrowPosition.id,
              type: 'loan_disbursement',
            },
          });

          payoutId = transfer.id;
          payoutStatus = 'pending';
        } catch (transferErr: any) {
          console.log('Transfer not available, crediting to vault:', transferErr.message);
          await prisma.vaultAccount.update({
            where: { id: vaultAccount!.id },
            data: {
              usdcBalance: { increment: netDisbursement },
              totalDeposited: { increment: netDisbursement },
            },
          });
          payoutStatus = 'credited_to_vault';
        }
      } else {
        await prisma.vaultAccount.update({
          where: { id: vaultAccount!.id },
          data: {
            usdcBalance: { increment: netDisbursement },
            totalDeposited: { increment: netDisbursement },
          },
        });
        payoutStatus = 'credited_to_vault';
      }
    } catch (stripeError: any) {
      console.error('Stripe operation failed, crediting to vault:', stripeError);
      await prisma.vaultAccount.update({
        where: { id: vaultAccount!.id },
        data: {
          usdcBalance: { increment: netDisbursement },
          totalDeposited: { increment: netDisbursement },
        },
      });
      payoutStatus = 'credited_to_vault';
    }

    await prisma.transaction.update({
      where: { id: result.transaction.id },
      data: {
        status: payoutStatus === 'credited_to_vault' ? 'COMPLETED' : 'PROCESSING',
        reference: payoutId,
        completedAt: payoutStatus === 'credited_to_vault' ? new Date() : null,
      },
    });

    if (evmClient.hasBorrowVault() && vaultAccount.walletAddress && onChainLockSuccess) {
      try {
        await issueLoan(vaultAccount.walletAddress, borrowAmount.toString(), DEFAULT_INTEREST_RATE_BPS);
      } catch (err) {
        console.error('Failed to issue loan on-chain (non-fatal):', err);
      }
    }

    const updatedVault = await prisma.vaultAccount.findUnique({
      where: { id: vaultAccount!.id },
    });

    res.json({
      success: true,
      data: {
        borrowPosition: {
          id: result.borrowPosition.id,
          principal: Number(result.borrowPosition.principal),
          interestRate: Number(result.borrowPosition.interestRate),
          collateralValue: Number(result.borrowPosition.collateralValue),
          ltvRatio: Number(result.borrowPosition.collateralRatio),
          status: result.borrowPosition.status,
          borrowedAt: result.borrowPosition.borrowedAt,
        },
        disbursement: {
          grossAmount: borrowAmount,
          originationFee,
          netAmount: netDisbursement,
          method: payoutStatus === 'credited_to_vault' ? 'vault_credit' : 'bank_transfer',
          status: payoutStatus,
          payoutId,
        },
        collateral: result.createdCollaterals.map((col) => ({
          id: col.id,
          propertyId: col.propertyId,
          tokenId: col.tokenId,
          amount: col.amount,
          value: Number(col.valueAtLock),
        })),
        vault: {
          balance: Number(updatedVault?.usdcBalance || 0),
          lockedBalance: Number(updatedVault?.lockedBalance || 0),
        },
      },
    });
  } catch (error: any) {
    console.error('Error processing borrow request:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process borrow request',
    });
  }
});

router.post('/repay', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { borrowPositionId, amount, paymentMethodId } = req.body as RepayRequest;

    if (!borrowPositionId) {
      return res.status(400).json({ success: false, error: 'Borrow position ID is required' });
    }

    if (!amount || amount < 1) {
      return res.status(400).json({ success: false, error: 'Repayment amount must be at least $1' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        vaultAccount: true,
        paymentMethods: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const borrowPosition = await prisma.borrowPosition.findFirst({
      where: {
        id: borrowPositionId,
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        vaultAccount: true,
      },
    });

    if (!borrowPosition) {
      return res.status(404).json({
        success: false,
        error: 'Active borrow position not found',
        code: 'POSITION_NOT_FOUND',
      });
    }

    const borrowedCollaterals = await prisma.borrowCollateral.findMany({
      where: { borrowPositionId },
    });

    const timeSinceBorrow = Date.now() - new Date(borrowPosition.borrowedAt).getTime();
    const yearInMs = 365 * 24 * 60 * 60 * 1000;
    const interestRate = Number(borrowPosition.interestRate);
    const principal = Number(borrowPosition.principal);
    const existingInterest = Number(borrowPosition.accruedInterest);

    const newInterest = (principal * interestRate * timeSinceBorrow) / yearInMs;
    const totalInterest = existingInterest + newInterest;
    const totalDebt = principal + totalInterest;

    if (amount > totalDebt * 1.01) {
      return res.status(400).json({
        success: false,
        error: `Repayment amount exceeds total debt of $${totalDebt.toFixed(2)}`,
        code: 'EXCEEDS_DEBT',
        totalDebt,
        principal,
        accruedInterest: totalInterest,
      });
    }

    const repayAmount = Math.min(amount, totalDebt);
    const isFullRepayment = repayAmount >= totalDebt - 0.01;

    let paymentIntentId: string | null = null;
    let paymentStatus: string = 'pending';
    let amountFromVault = 0;
    let amountFromPayment = repayAmount;

    const vaultBalance = Number(user.vaultAccount?.usdcBalance || 0);

    if (vaultBalance >= repayAmount) {
      amountFromVault = repayAmount;
      amountFromPayment = 0;
      paymentStatus = 'completed';
    } else if (paymentMethodId) {
      amountFromVault = vaultBalance;
      amountFromPayment = repayAmount - amountFromVault;

      const selectedMethod = user.paymentMethods.find((pm) => pm.id === paymentMethodId);
      if (!selectedMethod) {
        return res.status(400).json({ success: false, error: 'Payment method not found' });
      }

      if (!user.stripeCustomerId) {
        return res.status(400).json({
          success: false,
          error: 'Payment setup incomplete',
          code: 'NO_STRIPE_CUSTOMER',
        });
      }

      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amountFromPayment * 100),
        currency: 'usd',
        customer: user.stripeCustomerId,
        payment_method: selectedMethod.stripePaymentMethodId,
        payment_method_types: selectedMethod.type === 'CARD' ? ['card'] : ['us_bank_account'],
        confirm: true,
        metadata: {
          userId: user.id,
          borrowPositionId,
          type: 'loan_repayment',
        },
      });

      if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'processing') {
        return res.status(400).json({
          success: false,
          error: 'Payment failed',
          paymentStatus: paymentIntent.status,
        });
      }

      paymentIntentId = paymentIntent.id;
      paymentStatus = paymentIntent.status;
    } else if (vaultBalance > 0) {
      amountFromVault = vaultBalance;
      amountFromPayment = repayAmount - amountFromVault;
      
      if (amountFromPayment > 0) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient vault balance. Please provide a payment method.',
          code: 'INSUFFICIENT_FUNDS',
          vaultBalance,
          required: repayAmount,
        });
      }
      paymentStatus = 'completed';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Payment method required',
        code: 'PAYMENT_REQUIRED',
      });
    }

    let interestPaid = 0;
    let principalPaid = 0;

    if (repayAmount <= totalInterest) {
      interestPaid = repayAmount;
    } else {
      interestPaid = totalInterest;
      principalPaid = repayAmount - totalInterest;
    }

    const result = await prisma.$transaction(async (tx) => {
      if (amountFromVault > 0 && user.vaultAccount) {
        await tx.vaultAccount.update({
          where: { id: user.vaultAccount.id },
          data: {
            usdcBalance: { decrement: amountFromVault },
          },
        });
      }

      const newPrincipal = Math.max(0, principal - principalPaid);
      const newAccruedInterest = Math.max(0, totalInterest - interestPaid);

      const updatedPosition = await tx.borrowPosition.update({
        where: { id: borrowPositionId },
        data: {
          principal: newPrincipal,
          accruedInterest: newAccruedInterest,
          status: isFullRepayment ? 'REPAID' : 'ACTIVE',
          repaidAt: isFullRepayment ? new Date() : null,
        },
      });

      const repayment = await tx.borrowRepayment.create({
        data: {
          borrowPositionId,
          principalPaid,
          interestPaid,
          totalPaid: repayAmount,
          paymentMethodType: amountFromPayment > 0 ? 'CARD_OR_BANK' : 'VAULT',
          stripePaymentIntentId: paymentIntentId,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'REPAY',
          status: paymentStatus === 'succeeded' || paymentStatus === 'completed' ? 'COMPLETED' : 'PROCESSING',
          amount: repayAmount,
          currency: 'USDC',
          reference: paymentIntentId,
          description: `Loan repayment: $${principalPaid.toFixed(2)} principal + $${interestPaid.toFixed(2)} interest`,
          completedAt: paymentStatus === 'completed' ? new Date() : null,
          metadata: {
            borrowPositionId,
            principalPaid,
            interestPaid,
            isFullRepayment,
          },
        },
      });

      if (isFullRepayment) {
        await tx.vaultAccount.update({
          where: { id: borrowPosition.vaultAccountId },
          data: {
            lockedBalance: { decrement: Number(borrowPosition.collateralValue) },
          },
        });

        for (const col of borrowedCollaterals) {
          await tx.borrowCollateral.update({
            where: { id: col.id },
            data: { unlockedAt: new Date() },
          });
        }
      }

      return { updatedPosition, repayment, transaction };
    });

    const evmClient = getEVMClient();
    if (evmClient.hasBorrowVault() && borrowPosition.vaultAccount.walletAddress) {
      try {
        await recordRepayment(
          borrowPosition.vaultAccount.walletAddress,
          principalPaid.toString(),
          interestPaid.toString()
        );

        if (isFullRepayment) {
          for (const col of borrowedCollaterals) {
            await unlockCollateral(borrowPosition.vaultAccount.walletAddress, col.tokenId, col.amount);
          }
        }
      } catch (err) {
        console.error('Failed to record on-chain repayment (non-fatal):', err);
      }
    }

    const updatedVault = await prisma.vaultAccount.findUnique({
      where: { id: borrowPosition.vaultAccountId },
    });

    res.json({
      success: true,
      data: {
        repayment: {
          id: result.repayment.id,
          amount: repayAmount,
          principalPaid,
          interestPaid,
          paymentMethod: amountFromPayment > 0 ? 'payment' : 'vault',
          status: paymentStatus,
        },
        borrowPosition: {
          id: result.updatedPosition.id,
          remainingPrincipal: Number(result.updatedPosition.principal),
          remainingInterest: Number(result.updatedPosition.accruedInterest),
          totalRemaining: Number(result.updatedPosition.principal) + Number(result.updatedPosition.accruedInterest),
          status: result.updatedPosition.status,
          isFullyRepaid: isFullRepayment,
        },
        unlockedCollateral: isFullRepayment
          ? borrowedCollaterals.map((col) => ({
              propertyId: col.propertyId,
              tokenId: col.tokenId,
              amount: col.amount,
            }))
          : [],
        vault: {
          balance: Number(updatedVault?.usdcBalance || 0),
          lockedBalance: Number(updatedVault?.lockedBalance || 0),
        },
      },
    });
  } catch (error: any) {
    console.error('Error processing repayment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process repayment',
    });
  }
});

router.get('/position', validateAuth, async (req, res) => {
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

    const activePosition = await prisma.borrowPosition.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
    });

    if (!activePosition) {
      return res.json({
        success: true,
        data: null,
        message: 'No active borrow position',
      });
    }

    const collaterals = await prisma.borrowCollateral.findMany({
      where: { borrowPositionId: activePosition.id },
    });

    const repayments = await prisma.borrowRepayment.findMany({
      where: { borrowPositionId: activePosition.id },
      orderBy: { paidAt: 'desc' },
      take: 10,
    });

    const timeSinceBorrow = Date.now() - new Date(activePosition.borrowedAt).getTime();
    const yearInMs = 365 * 24 * 60 * 60 * 1000;
    const interestRate = Number(activePosition.interestRate);
    const principal = Number(activePosition.principal);
    const existingInterest = Number(activePosition.accruedInterest);

    const pendingInterest = (principal * interestRate * timeSinceBorrow) / yearInMs;
    const totalInterest = existingInterest + pendingInterest;
    const totalDebt = principal + totalInterest;

    const currentLtv = (totalDebt / Number(activePosition.collateralValue)) * 10000;

    res.json({
      success: true,
      data: {
        id: activePosition.id,
        principal: Number(activePosition.principal),
        accruedInterest: totalInterest,
        totalDebt,
        interestRate: Number(activePosition.interestRate),
        interestRateBps: Math.round(Number(activePosition.interestRate) * 10000),
        collateralValue: Number(activePosition.collateralValue),
        currentLtvBps: Math.round(currentLtv),
        liquidationThresholdBps: Math.round(Number(activePosition.liquidationThreshold) * 10000),
        status: activePosition.status,
        borrowedAt: activePosition.borrowedAt,
        dueDate: activePosition.dueDate,
        collaterals: collaterals.map((col) => ({
          propertyId: col.propertyId,
          tokenId: col.tokenId,
          amount: col.amount,
          valueAtLock: Number(col.valueAtLock),
          currentValue: Number(col.currentValue),
          lockedAt: col.lockedAt,
        })),
        recentRepayments: repayments.map((rep) => ({
          id: rep.id,
          principalPaid: Number(rep.principalPaid),
          interestPaid: Number(rep.interestPaid),
          totalPaid: Number(rep.totalPaid),
          paidAt: rep.paidAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching borrow position:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch borrow position',
    });
  }
});

router.get('/estimate', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { collateralValue, borrowAmount } = req.query;

    if (!collateralValue) {
      return res.status(400).json({ success: false, error: 'Collateral value is required' });
    }

    const collValue = parseFloat(collateralValue as string);
    const borrow = borrowAmount ? parseFloat(borrowAmount as string) : 0;

    const maxBorrowable = (collValue * MAX_LTV_BPS) / 10000;
    const originationFee = borrow > 0 ? (borrow * ORIGINATION_FEE_BPS) / 10000 : 0;
    const netDisbursement = borrow - originationFee;
    const ltvBps = borrow > 0 ? (borrow / collValue) * 10000 : 0;

    const dailyInterest = (borrow * DEFAULT_INTEREST_RATE_BPS) / 10000 / 365;
    const monthlyInterest = dailyInterest * 30;
    const annualInterest = (borrow * DEFAULT_INTEREST_RATE_BPS) / 10000;

    res.json({
      success: true,
      data: {
        collateralValue: collValue,
        maxBorrowable,
        maxLtvBps: MAX_LTV_BPS,
        requestedAmount: borrow,
        originationFeeBps: ORIGINATION_FEE_BPS,
        originationFee,
        netDisbursement,
        currentLtvBps: Math.round(ltvBps),
        interestRateBps: DEFAULT_INTEREST_RATE_BPS,
        estimatedInterest: {
          daily: dailyInterest,
          monthly: monthlyInterest,
          annual: annualInterest,
        },
        liquidationThresholdBps: 7500,
      },
    });
  } catch (error: any) {
    console.error('Error estimating borrow:', error);
    res.status(500).json({ success: false, error: 'Failed to estimate borrow' });
  }
});

router.get('/history', validateAuth, async (req, res) => {
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

    const positions = await prisma.borrowPosition.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const positionsWithDetails = await Promise.all(
      positions.map(async (pos) => {
        const collaterals = await prisma.borrowCollateral.findMany({
          where: { borrowPositionId: pos.id },
        });
        const repayments = await prisma.borrowRepayment.findMany({
          where: { borrowPositionId: pos.id },
        });

        return {
          id: pos.id,
          principal: Number(pos.principal),
          accruedInterest: Number(pos.accruedInterest),
          interestRate: Number(pos.interestRate),
          collateralValue: Number(pos.collateralValue),
          status: pos.status,
          borrowedAt: pos.borrowedAt,
          repaidAt: pos.repaidAt,
          totalRepaid: repayments.reduce((sum, r) => sum + Number(r.totalPaid), 0),
          collateralsCount: collaterals.length,
        };
      })
    );

    res.json({
      success: true,
      data: positionsWithDetails,
    });
  } catch (error: any) {
    console.error('Error fetching borrow history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch borrow history' });
  }
});

export default router;
