import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        tier: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'pacai-v5-dev-secret';

/**
 * JWT Authentication Middleware
 * Validates Bearer tokens from NextAuth or custom JWT
 */
export function jwtAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      tier: string;
    };

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional JWT Auth - allows unauthenticated requests but attaches user if token present
 */
export function optionalJwtAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      tier: string;
    };

    req.user = decoded;
  } catch (err) {
    // Token invalid, but continue without user
  }

  next();
}

/**
 * Tier-based authorization middleware
 * Use after jwtAuth to check if user has required tier
 */
export function requireTier(...allowedTiers: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedTiers.includes(req.user.tier)) {
      return res.status(403).json({ 
        error: 'Insufficient tier',
        required: allowedTiers,
        current: req.user.tier
      });
    }

    next();
  };
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: {
  id: string;
  email: string;
  name: string;
  tier: string;
}): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export default { jwtAuth, optionalJwtAuth, requireTier, generateToken };
