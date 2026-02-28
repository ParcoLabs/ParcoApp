import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../observability/logger';

export const JOB_NAMES = {
  DOC_EXTRACT: 'DOC_EXTRACT',
  REPORT_DRAFT: 'REPORT_DRAFT',
  DISTRIBUTION_PREP: 'DISTRIBUTION_PREP',
  BLOCKCHAIN_DEPLOY: 'BLOCKCHAIN_DEPLOY',
  BLOCKCHAIN_ALLOWLIST: 'BLOCKCHAIN_ALLOWLIST',
  BLOCKCHAIN_MINT: 'BLOCKCHAIN_MINT',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

let _connection: IORedis | null = null;

export function hasRedis(): boolean {
  return !!process.env.REDIS_URL;
}

export function getConnection(): IORedis {
  if (!_connection) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL is not configured');
    }
    _connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }
  return _connection;
}

let _parcoQueue: Queue | null = null;

export function getQueue(): Queue {
  if (!_parcoQueue) {
    _parcoQueue = new Queue('parco', { connection: getConnection() });
  }
  return _parcoQueue;
}

export async function enqueue(
  name: JobName,
  data: Record<string, unknown>,
  opts?: Partial<typeof DEFAULT_JOB_OPTIONS>,
) {
  if (!hasRedis()) {
    if (process.env.NODE_ENV === 'production') {
      throw new QueueUnavailableError();
    }

    logger.warn(
      { jobName: name },
      'REDIS_URL not set — processing job inline (dev mode)',
    );
    await processInline(name, data);
    return { id: `inline-${Date.now()}`, name, data };
  }

  const queue = getQueue();
  const jobId = data.idempotencyKey as string | undefined;
  return queue.add(name, data, {
    ...DEFAULT_JOB_OPTIONS,
    ...opts,
    ...(jobId ? { jobId } : {}),
  });
}

export class QueueUnavailableError extends Error {
  public statusCode = 412;
  constructor() {
    super(
      'Job queue is unavailable. REDIS_URL environment variable is not configured. ' +
        'Set REDIS_URL to an Upstash Redis or compatible Redis URL to enable async job processing.',
    );
    this.name = 'QueueUnavailableError';
  }
}

async function processInline(name: JobName, data: Record<string, unknown>) {
  const { getInlineProcessor } = await import('./inlineProcessor');
  const processor = getInlineProcessor(name);
  if (processor) {
    await processor(data);
  } else {
    logger.warn({ jobName: name }, 'No inline processor registered — job skipped');
  }
}

export async function closeQueue() {
  if (_parcoQueue) {
    await _parcoQueue.close();
    _parcoQueue = null;
  }
  if (_connection) {
    await _connection.quit();
    _connection = null;
  }
}
