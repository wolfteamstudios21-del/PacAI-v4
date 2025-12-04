import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string;
        role: string;
        tier: string;
      };
    }
  }
}

export function requireRole(role = 'user') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extract API key from headers
    const apiKey = req.headers['x-api-key'] || req.headers.authorization;
    
    // Stub: replace with real session/JWT decode from KV or database
    const user = {
      username: String(apiKey || 'anonymous'),
      role: apiKey === 'WolfTeamstudio2' ? 'admin' : 'user',
      tier: apiKey === 'WolfTeamstudio2' ? 'lifetime' : 'free'
    };

    if (role === 'admin' && user.role !== 'admin') {
      return res.status(403).json({ error: 'admin role required' });
    }

    req.user = user;
    next();
  };
}

export function requireTier(minimumTier = 'free') {
  const tierOrder = { free: 0, pro: 1, lifetime: 2 };
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user || { tier: 'free' };
    const userTierValue = tierOrder[user.tier as keyof typeof tierOrder] || 0;
    const requiredTierValue = tierOrder[minimumTier as keyof typeof tierOrder] || 0;

    if (userTierValue < requiredTierValue) {
      return res.status(402).json({ 
        error: 'upgrade required', 
        required_tier: minimumTier,
        current_tier: user.tier
      });
    }

    next();
  };
}
