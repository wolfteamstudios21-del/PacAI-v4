import { Request, Response, NextFunction } from 'express';

export interface TierLimits {
  voices: number;
  animations: number;
  styles: number;
  exports: number;
  refs: number;
  generations: number;
}

export interface TierRequest extends Request {
  limits?: TierLimits;
  userTier?: string;
}

const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    voices: 1,
    animations: 1,
    styles: 1,
    exports: 3,
    refs: 1,
    generations: 2
  },
  creator: {
    voices: 5,
    animations: 5,
    styles: 5,
    exports: 9,
    refs: 5,
    generations: 20
  },
  pro: {
    voices: 5,
    animations: 5,
    styles: 5,
    exports: 9,
    refs: 5,
    generations: 20
  },
  lifetime: {
    voices: Infinity,
    animations: Infinity,
    styles: Infinity,
    exports: 9,
    refs: Infinity,
    generations: Infinity
  },
  enterprise: {
    voices: Infinity,
    animations: Infinity,
    styles: Infinity,
    exports: 9,
    refs: Infinity,
    generations: Infinity
  }
};

export function tierMiddleware(req: TierRequest, res: Response, next: NextFunction) {
  const tier = (req.body?.user && getUserTier(req.body.user)) || 
               (req.query?.user && getUserTier(req.query.user as string)) ||
               'free';
  
  req.userTier = tier;
  req.limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  next();
}

const userTiers: Record<string, string> = {};

export function setUserTier(username: string, tier: string) {
  userTiers[username] = tier;
}

export function getUserTier(username: string): string {
  return userTiers[username] || 'free';
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
