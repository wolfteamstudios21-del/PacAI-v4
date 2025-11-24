import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface CreditsRequest extends Request {
  userId?: string;
  creditsCharged?: number;
}

const OPERATION_COSTS: Record<string, number> = {
  bt_execute: 10,
  onnx_predict: 5,
  narrative_generate: 20,
  worldstate_save: 2,
  worldstate_push: 15,
};

export function requireCredits(operation: string) {
  return async (req: CreditsRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const cost = OPERATION_COSTS[operation] || 1;
    const user = await storage.getUserWithCredits(req.userId);

    if (!user || user.credits < cost) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: cost,
        available: user?.credits || 0,
      });
    }

    req.creditsCharged = cost;
    next();
  };
}

export async function deductCredits(req: CreditsRequest, res: Response, next: NextFunction) {
  if (req.userId && req.creditsCharged) {
    await storage.deductCredits(req.userId, req.creditsCharged);
  }
  next();
}
