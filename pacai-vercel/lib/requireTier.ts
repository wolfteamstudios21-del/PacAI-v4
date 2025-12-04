import { verifyApiKey } from "./auth";

/**
 * requireTier middleware for serverless handlers
 * Usage: inside handler: const ok = await requireTier(req, 'pro'); if (!ok) return new Response(...)
 */

const order = { free: 0, pro: 1, lifetime: 2 };

export async function requireTierReq(req, minimum = "free") {
  const user = await verifyApiKey(req);
  if (!user) return { ok: false, status: 401, body: { error: "Missing API key" } };
  if (!order.hasOwnProperty(user.tier)) user.tier = "free";
  if (order[user.tier] < order[minimum]) {
    return { ok: false, status: 402, body: { error: "Upgrade required", required: minimum } };
  }
  return { ok: true, user };
}
