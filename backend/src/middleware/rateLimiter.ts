import { Request, Response, NextFunction } from 'express';
import { redis } from '../db/redis';
import { ProjectRequest } from './auth';

const MAX_REQUESTS_PER_MINUTE = 500;

export async function ingestRateLimiter(
  req: ProjectRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.body?.apiKey as string | undefined;
  if (!apiKey) {
    next();
    return;
  }

  const minute = Math.floor(Date.now() / 60000);
  const key = `ratelimit:${apiKey}:${minute}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 60);
    }

    if (count > MAX_REQUESTS_PER_MINUTE) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }
  } catch {
    // If Redis is down, let requests through (fail open for ingest)
  }

  next();
}
