import { Worker, Job } from 'bullmq';
import { getConnection, JOB_NAMES } from './lib/queue';
import prisma from './lib/prisma';
import { extractTextFromIssuanceDocument } from './services/docTextExtractor';
import { extractFieldsFromText } from './services/llmExtraction';
import { deployRestrictedToken, registrySetAllowed, registryBatchSetAllowed, tokenMint } from './services/blockchain';
import { logger } from './observability';

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '3', 10);

async function markActionProcessing(actionRequestId: string) {
  if (!actionRequestId) return;
  await (prisma as any).blockchainActionRequest.update({
    where: { id: actionRequestId },
    data: { status: 'PROCESSING' },
  });
}

async function markActionCompleted(actionRequestId: string, result: unknown) {
  if (!actionRequestId) return;
  await (prisma as any).blockchainActionRequest.update({
    where: { id: actionRequestId },
    data: { status: 'COMPLETED', result: result as any, completedAt: new Date() },
  });
  const action = await (prisma as any).blockchainActionRequest.findUnique({ where: { id: actionRequestId } });
  await prisma.auditEvent.create({
    data: {
      type: 'BLOCKCHAIN_ACTION_COMPLETED',
      entityId: actionRequestId,
      userId: action?.requestedById || null,
      metadata: { actionType: action?.type, propertyId: action?.propertyId, result },
    },
  });
}

async function markActionFailed(actionRequestId: string, error: string) {
  if (!actionRequestId) return;
  await (prisma as any).blockchainActionRequest.update({
    where: { id: actionRequestId },
    data: { status: 'FAILED', error, completedAt: new Date() },
  });
  const action = await (prisma as any).blockchainActionRequest.findUnique({ where: { id: actionRequestId } });
  await prisma.auditEvent.create({
    data: {
      type: 'BLOCKCHAIN_ACTION_FAILED',
      entityId: actionRequestId,
      userId: action?.requestedById || null,
      metadata: { actionType: action?.type, propertyId: action?.propertyId, error },
    },
  });
}

async function processDocExtract(job: Job) {
  const { caseId } = job.data as { caseId: string; idempotencyKey?: string };

  console.log(`[worker:DOC_EXTRACT] Starting extraction for case ${caseId}`);

  const issuanceCase = await (prisma as any).issuanceCase.findUnique({
    where: { id: caseId },
    include: { documents: true },
  });

  if (!issuanceCase) {
    throw new Error(`IssuanceCase ${caseId} not found`);
  }

  const docs = issuanceCase.documents || [];
  if (docs.length === 0) {
    console.log(`[worker:DOC_EXTRACT] No documents for case ${caseId}`);
    return { caseId, extracted: 0, failed: 0 };
  }

  let extractedCount = 0;
  let failedCount = 0;
  const now = new Date();

  for (const doc of docs) {
    await job.updateProgress(Math.round(((extractedCount + failedCount) / docs.length) * 100));

    const extraction = await extractTextFromIssuanceDocument({
      id: doc.id,
      url: doc.url,
      mimeType: (doc as any).mimeType || null,
      name: doc.name,
    });

    await (prisma as any).issuanceDocument.update({
      where: { id: doc.id },
      data: {
        textContent: extraction.text || null,
        textStatus: extraction.status,
        lastProcessedAt: now,
        processingError: extraction.error || null,
      },
    });

    if (extraction.status === 'EXTRACTED') extractedCount++;
    else failedCount++;
  }

  if (extractedCount > 0) {
    const extractedDocs = await (prisma as any).issuanceDocument.findMany({
      where: { caseId, textStatus: 'EXTRACTED' },
    });

    await (prisma as any).extractedField.deleteMany({
      where: { caseId },
    });

    let totalFields = 0;
    for (const doc of extractedDocs) {
      const textContent = (doc as any).textContent;
      if (!textContent) continue;

      try {
        const llmResult = await extractFieldsFromText({
          docType: doc.type,
          track: issuanceCase.track,
          text: textContent,
        });

        for (const field of llmResult.fields) {
          await (prisma as any).extractedField.create({
            data: {
              caseId,
              key: field.key,
              value: field.value,
              confidence: field.confidence,
              sourceDocumentId: doc.id,
              metadata: field.metadata || undefined,
            },
          });
          totalFields++;
        }
      } catch (err: any) {
        console.error(`[worker:DOC_EXTRACT] Field extraction error for doc ${doc.id}:`, err.message);
      }
    }

    console.log(`[worker:DOC_EXTRACT] Case ${caseId}: ${totalFields} fields extracted`);
  }

  console.log(`[worker:DOC_EXTRACT] Completed case ${caseId}: ${extractedCount} extracted, ${failedCount} failed`);
  return { caseId, extracted: extractedCount, failed: failedCount };
}

async function processReportDraft(job: Job) {
  const { propertyId, periodStart, periodEnd } = job.data as {
    propertyId: string;
    periodStart: string;
    periodEnd: string;
    idempotencyKey?: string;
  };

  console.log(`[worker:REPORT_DRAFT] Drafting report for property ${propertyId}`);

  const existing = await (prisma as any).servicingReportRun.findFirst({
    where: {
      propertyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
    },
  });

  if (existing) {
    console.log(`[worker:REPORT_DRAFT] Report already exists for period, skipping (idempotent)`);
    return { propertyId, reportId: existing.id, status: 'already_exists' };
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      token: true,
      holdings: true,
    },
  });

  if (!property) {
    throw new Error(`Property ${propertyId} not found`);
  }

  const totalTokens = property.totalTokens || 0;
  const heldTokens = property.holdings.reduce((sum: number, h: any) => sum + (h.quantity || 0), 0);
  const occupancy = totalTokens > 0 ? Math.round((heldTokens / totalTokens) * 100) : 0;

  const rentPayments = await prisma.rentPayment.findMany({
    where: {
      propertyId,
      paymentDate: {
        gte: new Date(periodStart),
        lte: new Date(periodEnd),
      },
    },
  });

  const rentalIncome = rentPayments.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const expenses = Math.round(rentalIncome * 0.3);
  const netProfit = rentalIncome - expenses;

  const draftText = [
    `Monthly Servicing Report`,
    `Property: ${property.name}`,
    `Period: ${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}`,
    ``,
    `Occupancy: ${occupancy}%`,
    `Rental Income: $${(rentalIncome / 100).toFixed(2)}`,
    `Expenses: $${(expenses / 100).toFixed(2)}`,
    `Net Profit: $${(netProfit / 100).toFixed(2)}`,
    `Holders: ${property.holdings.length}`,
  ].join('\n');

  const report = await (prisma as any).servicingReportRun.create({
    data: {
      propertyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      status: 'DRAFT',
      draftText,
    },
  });

  const roles = ['OPS', 'ACCOUNTING', 'COMPLIANCE'];
  for (const role of roles) {
    await (prisma as any).reportApproval.create({
      data: {
        reportRunId: report.id,
        role,
        status: 'PENDING',
      },
    });
  }

  console.log(`[worker:REPORT_DRAFT] Report ${report.id} drafted for property ${propertyId}`);
  return { propertyId, reportId: report.id, status: 'drafted' };
}

async function processDistributionPrep(job: Job) {
  const { propertyId, periodStart, periodEnd, totalAmountCents } = job.data as {
    propertyId: string;
    periodStart: string;
    periodEnd: string;
    totalAmountCents: number;
    idempotencyKey?: string;
  };

  console.log(`[worker:DISTRIBUTION_PREP] Preparing distribution for property ${propertyId}`);

  const existing = await (prisma as any).servicingDistributionRun.findFirst({
    where: {
      propertyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
    },
  });

  if (existing) {
    console.log(`[worker:DISTRIBUTION_PREP] Distribution already exists for period, skipping (idempotent)`);
    return { propertyId, runId: existing.id, status: 'already_exists' };
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { holdings: true },
  });

  if (!property) {
    throw new Error(`Property ${propertyId} not found`);
  }

  const totalTokens = property.holdings.reduce((sum: number, h: any) => sum + (h.quantity || 0), 0);

  if (totalTokens === 0) {
    console.log(`[worker:DISTRIBUTION_PREP] No token holders for property ${propertyId}`);
    return { propertyId, status: 'no_holders' };
  }

  const run = await (prisma as any).servicingDistributionRun.create({
    data: {
      propertyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      totalAmountCents,
      status: 'DRAFT',
    },
  });

  for (const holding of property.holdings) {
    const share = Math.round((holding.quantity / totalTokens) * totalAmountCents);
    if (share <= 0) continue;

    await (prisma as any).servicingDistributionLineItem.create({
      data: {
        runId: run.id,
        userId: holding.userId,
        amountCents: share,
        method: 'OFFCHAIN',
        status: 'PENDING',
      },
    });
  }

  console.log(`[worker:DISTRIBUTION_PREP] Distribution ${run.id} prepared with ${property.holdings.length} line items`);
  return { propertyId, runId: run.id, lineItems: property.holdings.length, status: 'prepared' };
}

async function processBlockchainDeploy(job: Job) {
  const { actionRequestId, name, symbol, allowlistRequired, lockupEndsAt, propertyId } = job.data as {
    actionRequestId: string;
    name: string;
    symbol: string;
    allowlistRequired?: boolean;
    lockupEndsAt?: number;
    propertyId?: string;
    idempotencyKey?: string;
  };

  try {
    await markActionProcessing(actionRequestId);
    logger.info({ actionRequestId, name, symbol }, 'BLOCKCHAIN_DEPLOY starting');

    const result = await deployRestrictedToken({ name, symbol, allowlistRequired, lockupEndsAt });

    if (propertyId) {
      const admin = await (prisma as any).blockchainActionRequest.findUnique({
        where: { id: actionRequestId },
        select: { requestedById: true },
      });
      await prisma.onchainDeployment.create({
        data: {
          propertyId,
          chainId: 137,
          tokenAddress: result.tokenAddress,
          registryAddress: result.registryAddress,
          deployedByUserId: admin?.requestedById || 'system',
          deployedAt: new Date(),
        },
      });
    }

    await markActionCompleted(actionRequestId, result);
    logger.info({ actionRequestId, tokenAddress: result.tokenAddress }, 'BLOCKCHAIN_DEPLOY completed');
    return result;
  } catch (err: any) {
    await markActionFailed(actionRequestId, err.message);
    throw err;
  }
}

async function processBlockchainAllowlist(job: Job) {
  const { actionRequestId, registryAddress, investorAddresses, allowed } = job.data as {
    actionRequestId: string;
    registryAddress: string;
    investorAddresses: string[];
    allowed: boolean;
    idempotencyKey?: string;
  };

  try {
    await markActionProcessing(actionRequestId);
    logger.info({ actionRequestId, count: investorAddresses.length }, 'BLOCKCHAIN_ALLOWLIST starting');

    let txHash: string;
    if (investorAddresses.length === 1) {
      txHash = await registrySetAllowed({
        registryAddress,
        investorAddress: investorAddresses[0],
        allowed,
      });
    } else {
      txHash = await registryBatchSetAllowed({
        registryAddress,
        investorAddresses,
        allowed,
      });
    }

    const result = { txHash };
    await markActionCompleted(actionRequestId, result);
    logger.info({ actionRequestId, txHash }, 'BLOCKCHAIN_ALLOWLIST completed');
    return result;
  } catch (err: any) {
    await markActionFailed(actionRequestId, err.message);
    throw err;
  }
}

async function processBlockchainMint(job: Job) {
  const { actionRequestId, tokenAddress, to, amount } = job.data as {
    actionRequestId: string;
    tokenAddress: string;
    to: string;
    amount: string;
    idempotencyKey?: string;
  };

  try {
    await markActionProcessing(actionRequestId);
    logger.info({ actionRequestId, to, amount }, 'BLOCKCHAIN_MINT starting');

    const txHash = await tokenMint({ tokenAddress, to, amount });

    const result = { txHash };
    await markActionCompleted(actionRequestId, result);
    logger.info({ actionRequestId, txHash }, 'BLOCKCHAIN_MINT completed');
    return result;
  } catch (err: any) {
    await markActionFailed(actionRequestId, err.message);
    throw err;
  }
}

const processors: Record<string, (job: Job) => Promise<unknown>> = {
  [JOB_NAMES.DOC_EXTRACT]: processDocExtract,
  [JOB_NAMES.REPORT_DRAFT]: processReportDraft,
  [JOB_NAMES.DISTRIBUTION_PREP]: processDistributionPrep,
  [JOB_NAMES.BLOCKCHAIN_DEPLOY]: processBlockchainDeploy,
  [JOB_NAMES.BLOCKCHAIN_ALLOWLIST]: processBlockchainAllowlist,
  [JOB_NAMES.BLOCKCHAIN_MINT]: processBlockchainMint,
};

async function main() {
  logger.info('[worker] Starting Parco worker...');
  logger.info({ redis: process.env.REDIS_URL || 'redis://127.0.0.1:6379', concurrency: CONCURRENCY }, 'Worker config');
  logger.info({ processors: Object.keys(processors) }, 'Registered processors');

  const connection = getConnection();
  await connection.connect();
  logger.info('[worker] Redis connected');

  const worker = new Worker(
    'parco',
    async (job: Job) => {
      const processor = processors[job.name];
      if (!processor) {
        throw new Error(`Unknown job type: ${job.name}`);
      }
      return processor(job);
    },
    {
      connection,
      concurrency: CONCURRENCY,
    },
  );

  worker.on('completed', (job: Job) => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Job completed');
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, jobName: job?.name, err: err.message, attempt: job?.attemptsMade }, 'Job failed');
  });

  worker.on('error', (err: Error) => {
    logger.error({ err: err.message }, 'Worker error');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Worker shutting down gracefully');
    await worker.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('[worker] Ready and listening for jobs');
}

main().catch((err) => {
  logger.error({ err }, 'Worker fatal error');
  process.exit(1);
});
