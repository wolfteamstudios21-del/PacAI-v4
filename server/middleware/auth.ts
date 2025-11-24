import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  creditsCharged?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// v2: Hardcoded users for demo (move to DB in v3)
const USERS: Record<string, { apiKey: string; role: 'user' | 'admin' }> = {
  'user-001': { apiKey: 'sk_demo_1234567890abcdef', role: 'user' },
  'admin': { apiKey: 'sk_admin_master_key_2025', role: 'admin' },
};

export function generateToken(userId: string): string {
  return jwt.sign({ userId, iat: Date.now() }, JWT_SECRET, { expiresIn: '24h' });
}

export async function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function authenticateApiKey(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing X-API-Key header' });
    }

    let foundUserId: string | null = null;
    for (const [userId, data] of Object.entries(USERS)) {
      if (data.apiKey === apiKey) {
        foundUserId = userId;
        break;
      }
    }

    if (!foundUserId) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.userId = foundUserId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export const authMiddleware = [verifyToken];
export const apiKeyMiddleware = [authenticateApiKey];
