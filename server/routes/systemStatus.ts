import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { adminOnly } from '../middleware/admin';
import { isR2Configured } from '../storage/storage';
import { logger } from '../observability';
import IORedis from 'ioredis';

const router = Router();

router.get('/system/status', adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let dbConnected = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch {
      dbConnected = false;
    }

    const redisConfigured = !!process.env.REDIS_URL;
    let redisConnected = false;
    if (redisConfigured) {
      try {
        const redis = new IORedis(process.env.REDIS_URL!, {
          connectTimeout: 3000,
          lazyConnect: true,
        });
        await redis.connect();
        await redis.ping();
        redisConnected = true;
        await redis.quit();
      } catch {
        redisConnected = false;
      }
    }

    const r2Configured = isR2Configured();

    const llmEnabled = !!(
      process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.GEMINI_API_KEY
    );

    const blockchainEnabled = !!(
      process.env.ALCHEMY_RPC_URL &&
      (process.env.OPERATOR_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY)
    );

    return res.json({
      success: true,
      status: {
        db: { connected: dbConnected },
        redis: { configured: redisConfigured, connected: redisConnected },
        r2: { configured: r2Configured },
        llm: { enabled: llmEnabled },
        blockchain: { enabled: blockchainEnabled },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ err: error, requestId: req.requestId }, 'system-status error');
    return next(error);
  }
});

export default router;
