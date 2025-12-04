/**
 * Helper utilities for PacAI Vercel backend
 */

export function generateId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${randomPart}`;
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function isValidTier(tier: string): boolean {
  return ["free", "pro", "lifetime"].includes(tier);
}
