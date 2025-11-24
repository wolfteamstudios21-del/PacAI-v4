import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const limits: Map<string, RateLimitEntry> = new Map();

export function rateLimiter(maxRequests: number = 100, windowSeconds: number = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId || req.ip;
    const now = Date.now();
    const entry = limits.get(userId);

    if (!entry || now > entry.resetTime) {
      limits.set(userId, { count: 1, resetTime: now + windowSeconds * 1000 });
      next();
    } else if (entry.count < maxRequests) {
      entry.count++;
      next();
    } else {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
    }
  };
}
