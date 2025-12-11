import { Request, Response, NextFunction } from "express";
import { getUncachableStripeClient } from "../stripeClient";
import { randomUUID } from "crypto";

const CHARGE_AMOUNT = 0.50;
const CHARGE_AMOUNT_CENTS = 50;

interface ChargeLog {
  type: string;
  user: string;
  amount: number;
  ts: number;
  bypassed: boolean;
  reason?: string;
  sessionId?: string;
}

interface PendingOperation {
  id: string;
  user: string;
  action: string;
  method: string;
  path: string;
  body: any;
  params: any;
  itemId?: string;
  ts: number;
  stripeSessionId?: string;
  completed: boolean;
}

const chargeLogs: ChargeLog[] = [];
const pendingOperations: Map<string, PendingOperation> = new Map();

const DEV_USERS = ["WolfTeamstudio2", "AdminTeam15"];

export function isDevTeam(username?: string): boolean {
  if (!username) return false;
  return DEV_USERS.includes(username);
}

export function isDevTeamWithPassword(username?: string, password?: string): boolean {
  const devUsername = process.env.DEV_BYPASS_USERNAME;
  const devPassword = process.env.DEV_BYPASS_PASSWORD;
  
  if (!devUsername || !devPassword) {
    return false;
  }
  
  return username === devUsername && password === devPassword;
}

export function getPendingOperation(operationId: string): PendingOperation | undefined {
  return pendingOperations.get(operationId);
}

export function completePendingOperation(operationId: string): boolean {
  const op = pendingOperations.get(operationId);
  if (op) {
    op.completed = true;
    return true;
  }
  return false;
}

export async function realChargeMiddleware(req: Request, res: Response, next: NextFunction) {
  const { username, password } = (req as any).user || req.body || {};

  if (isDevTeam(username) || isDevTeamWithPassword(username, password)) {
    chargeLogs.push({
      type: "charge_bypass",
      user: username || "dev_team",
      amount: 0,
      ts: Date.now(),
      bypassed: true,
      reason: "dev_team"
    });
    console.log(`[charge] Dev team bypass for ${username}`);
    return next();
  }

  try {
    const stripe = await getUncachableStripeClient();
    
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}`;
    const action = req.path;
    const itemId = req.params.id;

    const operationId = randomUUID();
    const pendingOp: PendingOperation = {
      id: operationId,
      user: username || "anonymous",
      action: action,
      method: req.method,
      path: req.originalUrl,
      body: { ...req.body },
      params: { ...req.params },
      itemId: itemId,
      ts: Date.now(),
      completed: false,
    };
    
    pendingOperations.set(operationId, pendingOp);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "PacAI Asset Operation",
            description: `${action.includes('fork') ? 'Fork' : 'Generate'} asset - $0.50`,
          },
          unit_amount: CHARGE_AMOUNT_CENTS,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${baseUrl}/api/v6/charge/complete?op=${operationId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?tab=assets&cancelled=true`,
      metadata: {
        pacai_user: username || "anonymous",
        operationId: operationId,
        action: action,
        itemId: itemId || "",
      },
    });

    pendingOp.stripeSessionId = session.id;

    chargeLogs.push({
      type: "charge_pending",
      user: username || "anonymous",
      amount: CHARGE_AMOUNT,
      ts: Date.now(),
      bypassed: false,
      sessionId: session.id,
    });

    console.log(`[charge] Checkout session created for ${username || "anonymous"}: ${session.id}, op: ${operationId}`);
    
    return res.json({ 
      requiresPayment: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      operationId: operationId,
      amount: CHARGE_AMOUNT,
    });
  } catch (error: any) {
    console.error("[charge] Stripe checkout error:", error);
    return res.status(500).json({ error: "Payment initialization failed", details: error.message });
  }
}

export async function verifyPaymentAndGetOperation(sessionId: string): Promise<{ verified: boolean; operation?: PendingOperation; error?: string }> {
  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== "paid") {
      return { verified: false, error: `Payment not completed: ${session.payment_status}` };
    }

    const operationId = session.metadata?.operationId;
    if (!operationId) {
      return { verified: false, error: "Missing operation ID in payment metadata" };
    }

    const operation = pendingOperations.get(operationId);
    if (!operation) {
      return { verified: false, error: "Operation not found or expired" };
    }

    if (operation.completed) {
      return { verified: false, error: "Operation already completed" };
    }

    chargeLogs.push({
      type: "charge_completed",
      user: operation.user,
      amount: CHARGE_AMOUNT,
      ts: Date.now(),
      bypassed: false,
      sessionId: sessionId,
    });

    return { verified: true, operation };
  } catch (error: any) {
    console.error("[charge] Payment verification error:", error);
    return { verified: false, error: error.message };
  }
}

export function getChargeLogs() {
  return chargeLogs;
}

export function getChargeStats() {
  const completed = chargeLogs.filter(l => l.type === "charge_completed");
  const total = completed.reduce((sum, l) => sum + l.amount, 0);
  const count = completed.length;
  const bypassed = chargeLogs.filter(l => l.bypassed).length;
  const pending = chargeLogs.filter(l => l.type === "charge_pending" && !completed.some(c => c.sessionId === l.sessionId)).length;
  return { total, count, bypassed, pending };
}

export function getPendingOperations() {
  return Array.from(pendingOperations.entries())
    .filter(([_, op]) => !op.completed)
    .map(([id, op]) => ({
      operationId: id,
      user: op.user,
      action: op.action,
      ts: op.ts,
      stripeSessionId: op.stripeSessionId,
    }));
}
