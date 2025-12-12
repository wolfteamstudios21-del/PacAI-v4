import { Router, Request, Response } from "express";
import { requireAuth, hasTier } from "../auth";
import { executeCommand, getAllCommands, CommandResult } from "../lib/command-registry";
import { getMemoryStats } from "../lib/circuit-breaker";
import { getCacheStats, invalidateCache } from "../lib/prompt-cache";
import { getRecentRuns } from "../lib/pipeline-engine";
import { db } from "../drizzle";
import { devCommandLogs } from "@shared/schema";
import { desc } from "drizzle-orm";
import rateLimit from "express-rate-limit";

const router = Router();

const devConsoleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests, slow down" },
});

function requireDevTier(req: Request, res: Response, next: Function) {
  const session = (req as any).session;
  if (!session || !hasTier(session.tier, "creator")) {
    return res.status(403).json({ error: "Dev console requires creator tier or higher" });
  }
  next();
}

async function logCommand(
  username: string,
  command: string,
  result: CommandResult
): Promise<void> {
  try {
    await db.insert(devCommandLogs).values({
      username,
      command,
      success: result.success ? 1 : 0,
      output: result.output.substring(0, 4000),
    });
  } catch (e) {
    console.error("[dev-console] Failed to log command:", e);
  }
}

router.get(
  "/api/dev/commands",
  requireAuth,
  requireDevTier,
  devConsoleLimiter,
  async (req: Request, res: Response) => {
    const commands = getAllCommands().map((c) => ({
      name: c.name,
      description: c.description,
      usage: c.usage,
    }));
    res.json({ commands });
  }
);

router.post(
  "/api/dev/commands/execute",
  requireAuth,
  requireDevTier,
  devConsoleLimiter,
  async (req: Request, res: Response) => {
    const { command } = req.body;

    if (!command || typeof command !== "string") {
      return res.status(400).json({ error: "Command is required" });
    }

    const session = (req as any).session;
    const result = await executeCommand(command);

    await logCommand(session.username, command, result);

    res.json(result);
  }
);

router.get(
  "/api/dev/health",
  requireAuth,
  requireDevTier,
  devConsoleLimiter,
  async (req: Request, res: Response) => {
    const memory = getMemoryStats();
    const cache = getCacheStats();
    const uptime = Math.floor(process.uptime());

    res.json({
      status: memory.warning ? "warning" : "healthy",
      memory,
      cache,
      uptime,
      nodeVersion: process.version,
      env: process.env.NODE_ENV || "development",
    });
  }
);

router.get(
  "/api/dev/cache/stats",
  requireAuth,
  requireDevTier,
  devConsoleLimiter,
  async (req: Request, res: Response) => {
    const stats = getCacheStats();
    res.json(stats);
  }
);

router.post(
  "/api/dev/cache/invalidate",
  requireAuth,
  requireDevTier,
  devConsoleLimiter,
  async (req: Request, res: Response) => {
    const { pattern } = req.body;
    const cleared = invalidateCache(pattern);

    const session = (req as any).session;
    await logCommand(session.username, `cache clear ${pattern || ""}`, {
      success: true,
      output: `Cleared ${cleared} entries`,
      timestamp: Date.now(),
    });

    res.json({ cleared, pattern });
  }
);

router.get(
  "/api/dev/pipelines/recent",
  requireAuth,
  requireDevTier,
  devConsoleLimiter,
  async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const runs = getRecentRuns(Math.min(limit, 100));
    res.json({ runs });
  }
);

router.get(
  "/api/dev/memory",
  requireAuth,
  requireDevTier,
  devConsoleLimiter,
  async (req: Request, res: Response) => {
    const stats = getMemoryStats();
    res.json(stats);
  }
);

router.get(
  "/api/dev/logs",
  requireAuth,
  requireDevTier,
  devConsoleLimiter,
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await db
        .select()
        .from(devCommandLogs)
        .orderBy(desc(devCommandLogs.created_at))
        .limit(Math.min(limit, 200));

      res.json({ logs });
    } catch (e) {
      res.json({ logs: [], error: "Could not fetch logs" });
    }
  }
);

export default router;
