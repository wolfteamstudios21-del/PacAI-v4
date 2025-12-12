import { Router } from "express";
import { getMemoryStats } from "../lib/circuit-breaker";
import { getCacheStats } from "../lib/prompt-cache";
import { listPipelines } from "../lib/pipeline-engine";

const router = Router();

router.get("/health", async (req, res) => {
  const startTime = Date.now();

  const checks: Record<string, { status: "ok" | "error"; message?: string; latency?: number }> = {};

  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);
    const dbStart = Date.now();
    await sql`SELECT 1`;
    checks.database = { status: "ok", latency: Date.now() - dbStart };
  } catch (error: any) {
    checks.database = { status: "error", message: error.message };
  }

  checks.openai = {
    status: process.env.OPENAI_API_KEY ? "ok" : "error",
    message: process.env.OPENAI_API_KEY ? "API key configured" : "API key missing",
  };

  checks.replicate = {
    status: process.env.REPLICATE_API_TOKEN ? "ok" : "error",
    message: process.env.REPLICATE_API_TOKEN
      ? "API token configured"
      : "API token missing (optional)",
  };

  const memory = getMemoryStats();
  checks.memory = {
    status: memory.warning ? "error" : "ok",
    message: `RSS: ${memory.rss}MB, Heap: ${memory.heapUsed}/${memory.heapTotal}MB`,
  };

  const cacheStats = getCacheStats();
  checks.cache = {
    status: "ok",
    message: `${cacheStats.size}/${cacheStats.maxSize} entries`,
  };

  const pipelines = listPipelines();
  checks.pipelines = {
    status: pipelines.length > 0 ? "ok" : "error",
    message: `${pipelines.length} pipelines registered`,
  };

  const allOk = Object.values(checks).every((c) => c.status === "ok");

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: "v6.4",
    environment: process.env.NODE_ENV || "development",
    responseTime: Date.now() - startTime,
    checks,
    memory,
  });
});

router.get("/health/ready", (req, res) => {
  res.status(200).json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

router.get("/health/live", (req, res) => {
  res.status(200).json({
    alive: true,
    uptime: Math.round(process.uptime()),
  });
});

export default router;
