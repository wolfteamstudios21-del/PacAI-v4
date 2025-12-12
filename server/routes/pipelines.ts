import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  runPipeline,
  runPipelineAsync,
  getPipelineRun,
  getProjectRuns,
  getRecentRuns,
  listPipelines,
} from "../lib/pipeline-engine";

const router = Router();

const EXPENSIVE_PIPELINES = ["image.concept", "model.3d", "gallery.autofill"];

const pipelineInputSchemas: Record<string, z.ZodSchema> = {
  "image.concept": z.object({
    prompt: z.string().min(1, "prompt is required").max(1000),
    style: z.string().optional(),
  }),
  "model.3d": z.object({
    prompt: z.string().min(1, "prompt is required").max(1000),
    format: z.enum(["glb", "gltf", "obj"]).optional(),
  }),
  "gallery.autofill": z.object({
    prompt: z.string().min(1, "prompt is required").max(1000),
    count: z.number().int().min(1).max(10).optional(),
    type: z.enum(["concept", "model"]).optional(),
  }),
  "gallery.ingest": z.object({
    urls: z.array(z.string().url()).min(1).max(50),
  }),
  "npc.generate": z.object({
    biome: z.string().min(1, "biome is required"),
    count: z.number().int().min(1).max(100).optional(),
    aggression: z.number().min(0).max(1).optional(),
  }),
  "fauna.generate": z.object({
    biome: z.string().min(1, "biome is required"),
    trophicLevel: z.enum(["herbivore", "predator", "omnivore", "scavenger"]).optional(),
    count: z.number().int().min(1).max(100).optional(),
  }),
};

function requirePipelineAuth(req: Request, res: Response, next: NextFunction) {
  const username = (req as any).session?.username || 
                   req.headers["x-username"] as string ||
                   (req.body as Record<string, unknown>)?.userId;
  
  if (!username) {
    return res.status(401).json({
      success: false,
      error: "Authentication required for pipeline execution",
    });
  }
  
  (req as any).pipelineUser = username;
  next();
}

function requireExpensivePipelineAuth(pipelineName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!EXPENSIVE_PIPELINES.includes(pipelineName)) {
      return next();
    }
    
    const tier = (req as any).session?.tier || 
                 req.headers["x-tier"] as string ||
                 "free";
    
    if (tier === "free") {
      return res.status(403).json({
        success: false,
        error: "Premium tier required for AI generation pipelines",
        upgrade: "/pricing",
      });
    }
    
    next();
  };
}

function validatePipelineInput(pipelineName: string, input: unknown): { valid: boolean; error?: string; data?: unknown } {
  const schema = pipelineInputSchemas[pipelineName];
  
  if (!schema) {
    return { valid: true, data: input };
  }
  
  const result = schema.safeParse(input);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
    return { valid: false, error: errors };
  }
  
  return { valid: true, data: result.data };
}

router.get("/pipelines", (req, res) => {
  const pipelines = listPipelines();
  res.json({
    success: true,
    pipelines: pipelines.map(name => ({
      name,
      endpoint: `/api/pipelines/${name}/run`,
      requiresAuth: EXPENSIVE_PIPELINES.includes(name),
    })),
  });
});

router.post("/pipelines/:name/run", requirePipelineAuth, async (req, res) => {
  try {
    const { name } = req.params;
    const { input = {}, async: isAsync = false, projectId } = req.body as {
      input?: Record<string, unknown>;
      async?: boolean;
      projectId?: string;
    };
    const userId = (req as any).pipelineUser;

    if (EXPENSIVE_PIPELINES.includes(name)) {
      const tier = (req as any).session?.tier || req.headers["x-tier"] as string || "free";
      if (tier === "free") {
        return res.status(403).json({
          success: false,
          error: "Premium tier required for AI generation pipelines",
          pipeline: name,
        });
      }
    }

    const validation = validatePipelineInput(name, input);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Invalid input: ${validation.error}`,
      });
    }

    if (isAsync) {
      const runId = await runPipelineAsync(name, validation.data as Record<string, unknown>, { projectId, userId });
      return res.status(202).json({
        success: true,
        runId,
        status: "pending",
        message: `Pipeline ${name} queued for execution`,
      });
    }

    const run = await runPipeline(name, validation.data as Record<string, unknown>, { projectId, userId });
    
    res.json({
      success: run.status === "completed",
      runId: run.id,
      status: run.status,
      output: run.output,
      error: run.error,
      duration: run.completedAt ? run.completedAt - run.startedAt : null,
      logs: run.logs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Pipeline execution failed";
    res.status(400).json({
      success: false,
      error: message,
    });
  }
});

router.get("/pipelines/runs/:runId", (req, res) => {
  const { runId } = req.params;
  const run = getPipelineRun(runId);
  
  if (!run) {
    return res.status(404).json({
      success: false,
      error: "Run not found",
    });
  }
  
  res.json({
    success: true,
    run: {
      id: run.id,
      pipelineName: run.pipelineName,
      status: run.status,
      input: run.input,
      output: run.output,
      error: run.error,
      logs: run.logs,
      projectId: run.projectId,
      userId: run.userId,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      duration: run.completedAt ? run.completedAt - run.startedAt : null,
    },
  });
});

router.get("/pipelines/runs", requirePipelineAuth, (req, res) => {
  const { limit = "50" } = req.query as { limit?: string };
  const runs = getRecentRuns(parseInt(limit, 10));
  
  res.json({
    success: true,
    total: runs.length,
    runs: runs.map(run => ({
      id: run.id,
      pipelineName: run.pipelineName,
      status: run.status,
      projectId: run.projectId,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      duration: run.completedAt ? run.completedAt - run.startedAt : null,
    })),
  });
});

router.get("/projects/:projectId/runs", (req, res) => {
  const { projectId } = req.params;
  const runs = getProjectRuns(projectId);
  
  res.json({
    success: true,
    projectId,
    total: runs.length,
    runs: runs.map(run => ({
      id: run.id,
      pipelineName: run.pipelineName,
      status: run.status,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      duration: run.completedAt ? run.completedAt - run.startedAt : null,
      output: run.output,
      error: run.error,
    })),
  });
});

router.post("/projects/:projectId/pipelines/:name/run", requirePipelineAuth, async (req, res) => {
  try {
    const { projectId, name } = req.params;
    const { input = {}, async: isAsync = false } = req.body as {
      input?: Record<string, unknown>;
      async?: boolean;
    };
    const userId = (req as any).pipelineUser;

    if (EXPENSIVE_PIPELINES.includes(name)) {
      const tier = (req as any).session?.tier || req.headers["x-tier"] as string || "free";
      if (tier === "free") {
        return res.status(403).json({
          success: false,
          error: "Premium tier required for AI generation pipelines",
          pipeline: name,
        });
      }
    }

    const validation = validatePipelineInput(name, input);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Invalid input: ${validation.error}`,
      });
    }

    if (isAsync) {
      const runId = await runPipelineAsync(name, validation.data as Record<string, unknown>, { projectId, userId });
      return res.status(202).json({
        success: true,
        runId,
        projectId,
        status: "pending",
        message: `Pipeline ${name} queued for project ${projectId}`,
      });
    }

    const run = await runPipeline(name, validation.data as Record<string, unknown>, { projectId, userId });
    
    res.json({
      success: run.status === "completed",
      runId: run.id,
      projectId,
      status: run.status,
      output: run.output,
      error: run.error,
      duration: run.completedAt ? run.completedAt - run.startedAt : null,
      logs: run.logs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Pipeline execution failed";
    res.status(400).json({
      success: false,
      error: message,
    });
  }
});

export default router;
