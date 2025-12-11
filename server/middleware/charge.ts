import { Request, Response, NextFunction } from "express";

const CHARGE_AMOUNT = 0.50;

interface ChargeLog {
  type: string;
  user: string;
  amount: number;
  ts: number;
  bypassed: boolean;
  reason?: string;
}

const chargeLogs: ChargeLog[] = [];

export function isDevTeam(username?: string, password?: string): boolean {
  const devUsername = process.env.DEV_BYPASS_USERNAME;
  const devPassword = process.env.DEV_BYPASS_PASSWORD;
  
  if (!devUsername || !devPassword) {
    return false;
  }
  
  return username === devUsername && password === devPassword;
}

export async function chargeMiddleware(req: Request, res: Response, next: NextFunction) {
  const { username, password } = (req as any).user || req.body || {};

  if (isDevTeam(username, password)) {
    chargeLogs.push({
      type: "charge_bypass",
      user: username,
      amount: 0,
      ts: Date.now(),
      bypassed: true,
      reason: "dev_team"
    });
    console.log(`[charge] Dev team bypass for ${username}`);
    return next();
  }

  chargeLogs.push({
    type: "charge",
    user: username || "anonymous",
    amount: CHARGE_AMOUNT,
    ts: Date.now(),
    bypassed: false
  });
  
  console.log(`[charge] $${CHARGE_AMOUNT} charged to ${username || "anonymous"}`);
  next();
}

export function getChargeLogs() {
  return chargeLogs;
}

export function getChargeStats() {
  const total = chargeLogs.filter(l => !l.bypassed).reduce((sum, l) => sum + l.amount, 0);
  const count = chargeLogs.filter(l => !l.bypassed).length;
  const bypassed = chargeLogs.filter(l => l.bypassed).length;
  return { total, count, bypassed };
}
