import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job_1', name: 'test' }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  QueueEvents: vi.fn(),
}));
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    quit: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock('../observability/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('Queue module', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('hasRedis returns false when REDIS_URL is not set', async () => {
    delete process.env.REDIS_URL;
    const queue = await import('../lib/queue');
    expect(queue.hasRedis()).toBe(false);
  });

  it('enqueue throws QueueUnavailableError in production without Redis', async () => {
    delete process.env.REDIS_URL;
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const queue = await import('../lib/queue');

    await expect(
      queue.enqueue('DOC_EXTRACT', { caseId: 'c1' }),
    ).rejects.toThrow(queue.QueueUnavailableError);

    await expect(
      queue.enqueue('DOC_EXTRACT', { caseId: 'c1' }),
    ).rejects.toHaveProperty('statusCode', 412);

    process.env.NODE_ENV = origEnv;
  });

  it('enqueue processes inline in dev without Redis', async () => {
    delete process.env.REDIS_URL;
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    vi.mock('../lib/inlineProcessor', () => ({
      getInlineProcessor: vi.fn().mockReturnValue(
        vi.fn().mockResolvedValue(undefined),
      ),
    }));

    const queue = await import('../lib/queue');
    const result = await queue.enqueue('DOC_EXTRACT', { caseId: 'c1' });
    expect(result).toHaveProperty('id');
    expect((result as any).id).toContain('inline');

    process.env.NODE_ENV = origEnv;
  });
});
