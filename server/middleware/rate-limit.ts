import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";

const DEV_BYPASS_USERS = ["WolfTeamstudio2", "AdminTeam15"];

const FREE_TIER_LIMITER = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { 
    error: "Rate limit exceeded", 
    message: "Free tier: 5 actions per minute. Upgrade for unlimited access.",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  keyGenerator: (req: Request) => {
    const user = (req as any).user?.username || req.body?.username;
    if (user) return user;
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.socket?.remoteAddress;
    return ip || "anonymous";
  },
  skip: (req: Request) => {
    const username = (req as any).user?.username || req.body?.username;
    return DEV_BYPASS_USERS.includes(username || "");
  },
});

const GENERATION_LIMITER = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { 
    error: "Generation rate limit exceeded", 
    message: "Maximum 10 generations per minute. Please wait.",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  keyGenerator: (req: Request) => {
    const user = (req as any).user?.username || req.body?.username;
    if (user) return `gen_${user}`;
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.socket?.remoteAddress;
    return `gen_${ip || "anonymous"}`;
  },
  skip: (req: Request) => {
    const username = (req as any).user?.username || req.body?.username;
    return DEV_BYPASS_USERS.includes(username || "");
  },
});

export function freeTierLimiter(req: Request, res: Response, next: NextFunction) {
  const username = (req as any).user?.username || req.body?.username;
  if (DEV_BYPASS_USERS.includes(username || "")) {
    return next();
  }
  return FREE_TIER_LIMITER(req, res, next);
}

export function generationLimiter(req: Request, res: Response, next: NextFunction) {
  const username = (req as any).user?.username || req.body?.username;
  if (DEV_BYPASS_USERS.includes(username || "")) {
    return next();
  }
  return GENERATION_LIMITER(req, res, next);
}

export { FREE_TIER_LIMITER, GENERATION_LIMITER };
