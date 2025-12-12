import crypto from "crypto";
import { getCached, setCached, createCacheKey } from "./prompt-cache";
import { logHeapUsage } from "./circuit-breaker";

export type PipelineInput = Record<string, unknown>;
export type PipelineOutput = unknown;
export type PipelineFn = (input: PipelineInput, context: PipelineContext) => Promise<PipelineOutput>;

export interface PipelineContext {
  runId: string;
  pipelineName: string;
  userId?: string;
  projectId?: string;
  startedAt: number;
  log: (message: string) => void;
}

export interface PipelineRun {
  id: string;
  pipelineName: string;
  status: "pending" | "running" | "completed" | "failed";
  input: PipelineInput;
  output?: PipelineOutput;
  error?: string;
  logs: string[];
  projectId?: string;
  userId?: string;
  startedAt: number;
  completedAt?: number;
}

const pipelineRegistry: Map<string, PipelineFn> = new Map();
const runHistory: Map<string, PipelineRun> = new Map();

export function registerPipeline(name: string, fn: PipelineFn): void {
  pipelineRegistry.set(name, fn);
  console.log(`[pipeline-engine] Registered pipeline: ${name}`);
}

export function listPipelines(): string[] {
  return Array.from(pipelineRegistry.keys());
}

export function getPipelineRun(runId: string): PipelineRun | undefined {
  return runHistory.get(runId);
}

export function getProjectRuns(projectId: string): PipelineRun[] {
  return Array.from(runHistory.values())
    .filter(run => run.projectId === projectId)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function getRecentRuns(limit = 50): PipelineRun[] {
  return Array.from(runHistory.values())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit);
}

const CACHEABLE_PIPELINES = ["npc.generate", "fauna.generate"];

export async function runPipeline(
  pipelineName: string,
  input: PipelineInput,
  options: { projectId?: string; userId?: string; skipCache?: boolean } = {}
): Promise<PipelineRun> {
  const pipeline = pipelineRegistry.get(pipelineName);
  
  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineName}`);
  }

  logHeapUsage(`pipeline:${pipelineName}:start`);

  const cacheKey = CACHEABLE_PIPELINES.includes(pipelineName) && !options.skipCache
    ? createCacheKey("pipeline", pipelineName, JSON.stringify(input))
    : null;

  if (cacheKey) {
    const cached = getCached<PipelineRun>(cacheKey);
    if (cached) {
      console.log(`[pipeline-engine] Cache hit for ${pipelineName}`);
      return { ...cached, id: `cached_${Date.now()}` };
    }
  }

  const runId = `run_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const startedAt = Date.now();
  
  const run: PipelineRun = {
    id: runId,
    pipelineName,
    status: "running",
    input,
    logs: [],
    projectId: options.projectId,
    userId: options.userId,
    startedAt,
  };

  runHistory.set(runId, run);

  const context: PipelineContext = {
    runId,
    pipelineName,
    userId: options.userId,
    projectId: options.projectId,
    startedAt,
    log: (message: string) => {
      const timestamp = new Date().toISOString();
      run.logs.push(`[${timestamp}] ${message}`);
    },
  };

  context.log(`Starting pipeline: ${pipelineName}`);

  try {
    const output = await pipeline(input, context);
    
    run.status = "completed";
    run.output = output;
    run.completedAt = Date.now();
    context.log(`Pipeline completed successfully in ${run.completedAt - startedAt}ms`);

    if (cacheKey) {
      setCached(cacheKey, run);
      console.log(`[pipeline-engine] Cached result for ${pipelineName}`);
    }
    
  } catch (error: unknown) {
    run.status = "failed";
    run.error = error instanceof Error ? error.message : String(error);
    run.completedAt = Date.now();
    context.log(`Pipeline failed: ${run.error}`);
    console.error(`[pipeline-engine] ${pipelineName} failed:`, error);
  }

  logHeapUsage(`pipeline:${pipelineName}:end`);

  return run;
}

export async function runPipelineAsync(
  pipelineName: string,
  input: PipelineInput,
  options: { projectId?: string; userId?: string } = {}
): Promise<string> {
  const pipeline = pipelineRegistry.get(pipelineName);
  
  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineName}`);
  }

  const runId = `run_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const startedAt = Date.now();
  
  const run: PipelineRun = {
    id: runId,
    pipelineName,
    status: "pending",
    input,
    logs: [],
    projectId: options.projectId,
    userId: options.userId,
    startedAt,
  };

  runHistory.set(runId, run);

  setImmediate(async () => {
    run.status = "running";
    
    const context: PipelineContext = {
      runId,
      pipelineName,
      userId: options.userId,
      projectId: options.projectId,
      startedAt,
      log: (message: string) => {
        const timestamp = new Date().toISOString();
        run.logs.push(`[${timestamp}] ${message}`);
      },
    };

    context.log(`Starting pipeline: ${pipelineName}`);

    try {
      const output = await pipeline(input, context);
      
      run.status = "completed";
      run.output = output;
      run.completedAt = Date.now();
      context.log(`Pipeline completed successfully in ${run.completedAt - startedAt}ms`);
      
    } catch (error: unknown) {
      run.status = "failed";
      run.error = error instanceof Error ? error.message : String(error);
      run.completedAt = Date.now();
      context.log(`Pipeline failed: ${run.error}`);
      console.error(`[pipeline-engine] ${pipelineName} failed:`, error);
    }
  });

  return runId;
}
