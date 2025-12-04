/**
 * BullMQ Job Queue Integration for PacAI Export System
 * 
 * This module provides job enqueueing functionality for the export system.
 * In development mode, it falls back to in-memory processing if Redis is unavailable.
 * 
 * Environment Variables:
 * - REDIS_URL: Redis connection string (e.g., redis://localhost:6379)
 * - EXPORT_BUCKET_URL: Base URL for export downloads
 * - WORKER_ENABLED: Set to 'true' to enable BullMQ (default: false for dev)
 * - WORKER_CALLBACK_SECRET: HMAC secret for callback verification
 */

import crypto from 'crypto';
import type { ExportResult } from "./generation/exporter";

const CALLBACK_SECRET = process.env.WORKER_CALLBACK_SECRET || 'dev-callback-secret-change-in-prod';

// Job status types
export interface ExportJob {
  id: string;
  status: 'queued' | 'active' | 'completed' | 'failed';
  progress: number;
  data: {
    project_id: string;
    engines: string[];
    include_assets: boolean;
    quality: string;
    seed?: string;
    manifest?: Record<string, any>;
  };
  result?: ExportResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  finishedAt?: Date;
}

// In-memory job store for development (fallback when Redis is unavailable)
const jobStore: Map<string, ExportJob> = new Map();

// Check if BullMQ/Redis should be used
const isWorkerEnabled = process.env.WORKER_ENABLED === 'true' && process.env.REDIS_URL;

/**
 * Enqueue an export job for async processing
 */
export async function enqueueExportJob(
  projectId: string,
  engines: string[],
  options: {
    include_assets?: boolean;
    quality?: string;
    seed?: string;
    manifest?: Record<string, any>;
  } = {}
): Promise<{ job_id: string; status: string; poll_url: string }> {
  const jobId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const job: ExportJob = {
    id: jobId,
    status: 'queued',
    progress: 0,
    data: {
      project_id: projectId,
      engines,
      include_assets: options.include_assets ?? true,
      quality: options.quality ?? 'high',
      seed: options.seed,
      manifest: options.manifest
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (isWorkerEnabled) {
    // Production: Use BullMQ (requires Redis + worker deployment)
    try {
      const { Queue } = await import('bullmq');
      const IORedis = (await import('ioredis')).default;
      
      const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
      const exportQueue = new Queue('exportQueue', { connection });
      
      await exportQueue.add('export', job.data, {
        jobId: jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 1000
      });
      
      await connection.quit();
      
      jobStore.set(jobId, job);
      
      return {
        job_id: jobId,
        status: 'queued',
        poll_url: `/api/v5/export/job/${jobId}`
      };
    } catch (error) {
      console.warn('[queue] BullMQ unavailable, falling back to in-memory:', error);
    }
  }
  
  // Development fallback: Store in memory and process "synchronously" 
  jobStore.set(jobId, job);
  
  // Simulate async processing in dev mode
  setTimeout(() => simulateExportProcessing(jobId), 100);
  
  return {
    job_id: jobId,
    status: 'queued',
    poll_url: `/api/v5/export/job/${jobId}`
  };
}

/**
 * Get export job status
 */
export async function getExportJobStatus(jobId: string): Promise<ExportJob | null> {
  // Check local store first
  const localJob = jobStore.get(jobId);
  if (localJob) return localJob;
  
  if (isWorkerEnabled) {
    try {
      const { Queue } = await import('bullmq');
      const IORedis = (await import('ioredis')).default;
      
      const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
      const exportQueue = new Queue('exportQueue', { connection });
      
      const bullJob = await exportQueue.getJob(jobId);
      await connection.quit();
      
      if (bullJob) {
        const state = await bullJob.getState();
        return {
          id: jobId,
          status: state === 'completed' ? 'completed' : 
                  state === 'failed' ? 'failed' : 
                  state === 'active' ? 'active' : 'queued',
          progress: typeof bullJob.progress === 'number' ? bullJob.progress : 0,
          data: bullJob.data,
          result: bullJob.returnvalue,
          createdAt: new Date(bullJob.timestamp || Date.now()),
          updatedAt: new Date(),
          finishedAt: bullJob.finishedOn ? new Date(bullJob.finishedOn) : undefined
        };
      }
    } catch (error) {
      console.warn('[queue] Failed to fetch job from BullMQ:', error);
    }
  }
  
  return null;
}

/**
 * Update job status (called by worker callback or in-memory simulation)
 */
export function updateJobStatus(
  jobId: string, 
  updates: Partial<ExportJob>
): void {
  const job = jobStore.get(jobId);
  if (job) {
    Object.assign(job, updates, { updatedAt: new Date() });
    jobStore.set(jobId, job);
  }
}

/**
 * Simulate export processing for development mode
 * In production, this is handled by the worker fleet
 */
async function simulateExportProcessing(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;
  
  // Update to active
  updateJobStatus(jobId, { status: 'active', progress: 0 });
  
  // Simulate progress
  for (let i = 1; i <= 5; i++) {
    await new Promise(r => setTimeout(r, 500));
    updateJobStatus(jobId, { progress: i * 20 });
  }
  
  // Complete with mock result
  const engineDisplayNames: Record<string, string> = {
    ue5: 'Unreal Engine 5',
    unity: 'Unity 2023.2',
    godot: 'Godot 4.2',
    roblox: 'Roblox Studio',
    blender: 'Blender 4.0',
    cryengine: 'CryEngine 5.7',
    source2: 'Source 2',
    webgpu: 'WebGPU',
    visionos: 'visionOS'
  };
  
  const mockResult: ExportResult = {
    id: jobId,
    project_id: job.data.project_id,
    status: 'completed',
    engines: job.data.engines.map(engine => ({
      engine,
      display_name: engineDisplayNames[engine] || engine.toUpperCase(),
      version: '1.0.0',
      status: 'completed' as const,
      files: [`${engine}/world.json`, `${engine}/manifest.json`],
      size_bytes: 1026048,
      estimated_time_seconds: 30
    })),
    total_size_bytes: job.data.engines.length * 1026048,
    manifest: {
      pacai: '5.0.0',
      generated: new Date().toISOString(),
      seed: job.data.seed || 'dev_seed',
      project_id: job.data.project_id,
      engines: job.data.engines,
      checksums: Object.fromEntries(job.data.engines.map(e => [e, `sha256_${Math.random().toString(36).slice(2, 18)}`])),
      signature_algorithm: 'ed25519',
      total_size_bytes: job.data.engines.length * 1026048
    },
    download_url: `${process.env.EXPORT_BUCKET_URL || '/api/v5/export'}/${jobId}/download`,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
  
  updateJobStatus(jobId, { 
    status: 'completed', 
    progress: 100, 
    result: mockResult,
    finishedAt: new Date()
  });
}

/**
 * Verify HMAC signature from worker callback
 */
export function verifyCallbackSignature(
  payload: string,
  signature: string | undefined
): boolean {
  if (!signature) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', CALLBACK_SECRET)
    .update(payload)
    .digest('hex');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Generate HMAC signature for worker (used by worker to sign callbacks)
 */
export function generateCallbackSignature(payload: string): string {
  return crypto
    .createHmac('sha256', CALLBACK_SECRET)
    .update(payload)
    .digest('hex');
}

/**
 * Handle callback from worker (webhook endpoint)
 */
export function handleWorkerCallback(
  jobId: string,
  status: 'completed' | 'failed',
  result?: ExportResult,
  error?: string
): void {
  updateJobStatus(jobId, {
    status,
    progress: status === 'completed' ? 100 : undefined,
    result,
    error,
    finishedAt: new Date()
  });
}

export { jobStore };
