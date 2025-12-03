import { prisma } from '../lib/prisma';

interface DistributionResult {
  rentPaymentId: string;
  propertyId: string;
  propertyName: string;
  holdersCount: number;
  totalDistributed: number;
  totalInterestDeducted: number;
  distributions: Array<{
    userId: string;
    tokensHeld: number;
    ownershipPercent: number;
    grossAmount: number;
    interestDeducted: number;
    netAmount: number;
    borrowPositionId: string | null;
    newAccruedInterest: number;
  }>;
}

interface RunSummary {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  propertiesProcessed: number;
  rentPaymentsProcessed: number;
  holdersDistributed: number;
  totalGrossDistributed: number;
  totalInterestDeducted: number;
  totalNetDistributed: number;
  errors: string[];
}

export class RentDistributionService {
  private static instance: RentDistributionService;
  private isRunning: boolean = false;

  static getInstance(): RentDistributionService {
    if (!RentDistributionService.instance) {
      RentDistributionService.instance = new RentDistributionService();
    }
    return RentDistributionService.instance;
  }

  async runDistribution(options?: {
    triggeredBy?: string;
    propertyIds?: string[];
    dryRun?: boolean;
  }): Promise<RunSummary> {
    if (this.isRunning) {
      throw new Error('Distribution is already running');
    }

    this.isRunning = true;
    const errors: string[] = [];
    const startedAt = new Date();

    let run: any = null;

    try {
      if (!options?.dryRun) {
        run = await prisma.distributionRun.create({
          data: {
            runType: options?.triggeredBy ? 'MANUAL' : 'SCHEDULED',
            triggeredBy: options?.triggeredBy,
            status: 'RUNNING',
          },
        });
      }

      const pendingRentPayments = await prisma.rentPayment.findMany({
        where: {
          status: 'PENDING',
          ...(options?.propertyIds && { propertyId: { in: options.propertyIds } }),
        },
        include: {
          property: {
            include: {
              holdings: {
                include: {
                  user: {
                    include: {
                      vaultAccount: true,
                      borrowPositions: {
                        where: { status: 'ACTIVE' },
                        include: {
                          vaultAccount: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      console.log(`[RentDistribution] Found ${pendingRentPayments.length} pending rent payments`);

      let totalGrossDistributed = 0;
      let totalInterestDeducted = 0;
      let totalNetDistributed = 0;
      let holdersDistributed = 0;
      const propertiesProcessed = new Set<string>();

      for (const rentPayment of pendingRentPayments) {
        try {
          const result = await this.processRentPayment(rentPayment, options?.dryRun);
          
          propertiesProcessed.add(result.propertyId);
          totalGrossDistributed += result.totalDistributed;
          totalInterestDeducted += result.totalInterestDeducted;
          totalNetDistributed += result.totalDistributed - result.totalInterestDeducted;
          holdersDistributed += result.holdersCount;

          console.log(`[RentDistribution] Processed ${result.propertyName}: ${result.holdersCount} holders, $${result.totalDistributed.toFixed(2)} distributed`);
        } catch (err: any) {
          console.error(`[RentDistribution] Error processing rent payment ${rentPayment.id}:`, err);
          errors.push(`RentPayment ${rentPayment.id}: ${err.message}`);
        }
      }

      const completedAt = new Date();

      if (run && !options?.dryRun) {
        await prisma.distributionRun.update({
          where: { id: run.id },
          data: {
            status: errors.length > 0 ? 'PARTIAL' : 'COMPLETED',
            propertiesProcessed: propertiesProcessed.size,
            rentPaymentsProcessed: pendingRentPayments.length,
            holdersDistributed,
            totalGrossDistributed,
            totalInterestDeducted,
            totalNetDistributed,
            errorMessage: errors.length > 0 ? errors.join('; ') : null,
            completedAt,
          },
        });
      }

      return {
        runId: run?.id || 'dry-run',
        startedAt,
        completedAt,
        status: errors.length > 0 ? (pendingRentPayments.length > errors.length ? 'PARTIAL' : 'FAILED') : 'COMPLETED',
        propertiesProcessed: propertiesProcessed.size,
        rentPaymentsProcessed: pendingRentPayments.length,
        holdersDistributed,
        totalGrossDistributed,
        totalInterestDeducted,
        totalNetDistributed,
        errors,
      };
    } catch (err: any) {
      if (run) {
        await prisma.distributionRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            errorMessage: err.message,
            completedAt: new Date(),
          },
        });
      }
      throw err;
    } finally {
      this.isRunning = false;
    }
  }

  private async processRentPayment(
    rentPayment: any,
    dryRun?: boolean
  ): Promise<DistributionResult> {
    const property = rentPayment.property;
    const holdings = property.holdings;
    const totalTokens = property.totalTokens;
    const perTokenAmount = Number(rentPayment.perTokenAmount);

    const distributions: DistributionResult['distributions'] = [];

    for (const holding of holdings) {
      if (holding.quantity <= 0) continue;

      const user = holding.user;
      const tokensHeld = holding.quantity;
      const ownershipPercent = tokensHeld / totalTokens;
      const grossAmount = tokensHeld * perTokenAmount;

      let interestDeducted = 0;
      let borrowPositionId: string | null = null;
      let newAccruedInterest: number = 0;

      const activePosition = user.borrowPositions?.[0];
      if (activePosition && Number(activePosition.principal) > 0) {
        borrowPositionId = activePosition.id;
        
        const lastUpdate = activePosition.lastInterestUpdate 
          ? new Date(activePosition.lastInterestUpdate).getTime() 
          : new Date(activePosition.borrowedAt).getTime();
        const timeSinceLastUpdate = Date.now() - lastUpdate;
        const yearInMs = 365 * 24 * 60 * 60 * 1000;
        const interestRate = Number(activePosition.interestRate);
        const principal = Number(activePosition.principal);
        const existingInterest = Number(activePosition.accruedInterest);

        const newInterest = (principal * interestRate * timeSinceLastUpdate) / yearInMs;
        const totalInterest = existingInterest + newInterest;

        interestDeducted = Math.min(grossAmount, totalInterest);
        newAccruedInterest = totalInterest - interestDeducted;
      }

      const netAmount = grossAmount - interestDeducted;

      distributions.push({
        userId: user.id,
        tokensHeld,
        ownershipPercent,
        grossAmount,
        interestDeducted,
        netAmount,
        borrowPositionId,
        newAccruedInterest,
      });
    }

    const totalDistributed = distributions.reduce((sum, d) => sum + d.grossAmount, 0);
    const totalInterestDeducted = distributions.reduce((sum, d) => sum + d.interestDeducted, 0);

    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        for (const dist of distributions) {
          const holding = holdings.find((h: any) => h.user.id === dist.userId);
          if (!holding) continue;

          await tx.rentDistribution.create({
            data: {
              rentPaymentId: rentPayment.id,
              userId: dist.userId,
              holdingId: holding.id,
              propertyId: property.id,
              tokensHeld: dist.tokensHeld,
              totalTokens,
              ownershipPercent: dist.ownershipPercent,
              grossAmount: dist.grossAmount,
              interestDeducted: dist.interestDeducted,
              netAmount: dist.netAmount,
            },
          });

          if (dist.interestDeducted > 0 && dist.borrowPositionId) {
            await tx.borrowPosition.update({
              where: { id: dist.borrowPositionId },
              data: { 
                accruedInterest: Math.max(0, dist.newAccruedInterest),
                lastInterestUpdate: new Date(),
              },
            });
          }

          const vaultAccount = holding.user.vaultAccount;
          if (vaultAccount) {
            await tx.vaultAccount.update({
              where: { id: vaultAccount.id },
              data: {
                usdcBalance: { increment: dist.netAmount },
                totalEarned: { increment: dist.netAmount },
              },
            });
          } else {
            await tx.vaultAccount.create({
              data: {
                userId: dist.userId,
                usdcBalance: dist.netAmount,
                totalEarned: dist.netAmount,
              },
            });
          }

          await tx.transaction.create({
            data: {
              userId: dist.userId,
              type: 'RENT_DISTRIBUTION',
              status: 'COMPLETED',
              amount: dist.netAmount,
              currency: 'USDC',
              fee: dist.interestDeducted,
              propertyId: property.id,
              description: `Rent distribution for ${property.name} (${dist.tokensHeld} tokens)`,
              completedAt: new Date(),
              metadata: {
                rentPaymentId: rentPayment.id,
                grossAmount: dist.grossAmount,
                interestDeducted: dist.interestDeducted,
                periodStart: rentPayment.periodStart,
                periodEnd: rentPayment.periodEnd,
              },
            },
          });
        }

        await tx.rentPayment.update({
          where: { id: rentPayment.id },
          data: {
            status: 'COMPLETED',
            distributedAt: new Date(),
          },
        });
      });
    }

    return {
      rentPaymentId: rentPayment.id,
      propertyId: property.id,
      propertyName: property.name,
      holdersCount: distributions.length,
      totalDistributed,
      totalInterestDeducted,
      distributions,
    };
  }

  async createRentPayment(data: {
    propertyId: string;
    periodStart: Date;
    periodEnd: Date;
    grossAmount: number;
    managementFeePercent?: number;
  }): Promise<any> {
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    const managementFeePercent = data.managementFeePercent ?? 10;
    const managementFee = (data.grossAmount * managementFeePercent) / 100;
    const netAmount = data.grossAmount - managementFee;
    const perTokenAmount = netAmount / property.totalTokens;

    return prisma.rentPayment.create({
      data: {
        propertyId: data.propertyId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        grossAmount: data.grossAmount,
        managementFee,
        netAmount,
        perTokenAmount,
        status: 'PENDING',
      },
    });
  }

  async getDistributionHistory(options?: {
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    return prisma.distributionRun.findMany({
      take: options?.limit ?? 20,
      skip: options?.offset ?? 0,
      orderBy: { startedAt: 'desc' },
    });
  }

  async getUserDistributions(userId: string, options?: {
    limit?: number;
    offset?: number;
    propertyId?: string;
  }): Promise<any[]> {
    return prisma.rentDistribution.findMany({
      where: {
        userId,
        ...(options?.propertyId && { propertyId: options.propertyId }),
      },
      take: options?.limit ?? 20,
      skip: options?.offset ?? 0,
      orderBy: { distributedAt: 'desc' },
      include: {
        rentPayment: {
          select: {
            periodStart: true,
            periodEnd: true,
            grossAmount: true,
            netAmount: true,
          },
        },
      },
    });
  }

  isDistributionRunning(): boolean {
    return this.isRunning;
  }
}

export const rentDistributionService = RentDistributionService.getInstance();
