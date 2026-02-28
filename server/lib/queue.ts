import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

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

let _parcoQueue: Queue | null = null;

export function getQueue(): Queue {
  if (!_parcoQueue) {
    _parcoQueue = new Queue('parco', { connection });
  }
  return _parcoQueue;
}

export async function enqueue(
  name: JobName,
  data: Record<string, unknown>,
  opts?: Partial<typeof DEFAULT_JOB_OPTIONS>,
) {
  const queue = getQueue();
  const jobId = data.idempotencyKey as string | undefined;
  return queue.add(name, data, {
    ...DEFAULT_JOB_OPTIONS,
    ...opts,
    ...(jobId ? { jobId } : {}),
  });
}

export async function closeQueue() {
  if (_parcoQueue) {
    await _parcoQueue.close();
    _parcoQueue = null;
  }
  await connection.quit();
}
