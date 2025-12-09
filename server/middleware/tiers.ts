import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getUser } from '../auth';

function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  return secret || null;
}

export interface TierLimits {
  voices: number;
  animations: number;
  styles: number;
  maxUpscale: number;
  exports: number;
  refs: number;
  generations: number;
}

export interface TierRequest extends Request {
  limits?: TierLimits;
  userTier?: string;
  authenticatedUser?: string;
}

const MAX_LIMIT = 999999;

const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    voices: 1,
    animations: 1,
    styles: 1,
    maxUpscale: 2,
    exports: 3,
    refs: 1,
    generations: 2
  },
  creator: {
    voices: 5,
    animations: 5,
    styles: 5,
    maxUpscale: 4,
    exports: 9,
    refs: 5,
    generations: 20
  },
  pro: {
    voices: 5,
    animations: 5,
    styles: 5,
    maxUpscale: 4,
    exports: 9,
    refs: 5,
    generations: 20
  },
  lifetime: {
    voices: MAX_LIMIT,
    animations: MAX_LIMIT,
    styles: MAX_LIMIT,
    maxUpscale: 8,
    exports: 9,
    refs: MAX_LIMIT,
    generations: MAX_LIMIT
  },
  enterprise: {
    voices: MAX_LIMIT,
    animations: MAX_LIMIT,
    styles: MAX_LIMIT,
    maxUpscale: 8,
    exports: 9,
    refs: MAX_LIMIT,
    generations: MAX_LIMIT
  }
};

export function getUserTierFromStore(username: string): string {
  if (typeof username !== 'string' || username.length === 0) {
    return 'free';
  }
  const user = getUser(username);
  return user?.tier || 'free';
}

export function tierMiddleware(req: TierRequest, res: Response, next: NextFunction) {
  let authenticatedUser: string | null = null;
  
  const jwtSecret = getJwtSecret();
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') && jwtSecret) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, jwtSecret) as { userId?: string; username?: string; tier?: string };
      authenticatedUser = decoded.userId || decoded.username || null;
      
      if (decoded.tier && ['free', 'creator', 'pro', 'lifetime', 'enterprise'].includes(decoded.tier)) {
        req.userTier = decoded.tier;
        req.authenticatedUser = authenticatedUser || undefined;
        req.limits = TIER_LIMITS[decoded.tier] || TIER_LIMITS.free;
        return next();
      }
    } catch (e) {
    }
  }
  
  if (!authenticatedUser) {
    const sessionUser = (req as any).session?.user?.name;
    if (typeof sessionUser === 'string' && sessionUser.length > 0) {
      authenticatedUser = sessionUser;
    }
  }
  
  const tier = authenticatedUser ? getUserTierFromStore(authenticatedUser) : 'free';
  
  req.authenticatedUser = authenticatedUser || undefined;
  req.userTier = tier;
  req.limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  next();
}

export function getTierLimits(tier: string): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

export function checkLimit(
  current: number, 
  limitKey: keyof TierLimits, 
  tier: string
): { allowed: boolean; limit: number; remaining: number } {
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const limit = limits[limitKey];
  return {
    allowed: current < limit,
    limit,
    remaining: Math.max(0, limit - current)
  };
}
