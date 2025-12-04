import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const exportQueue = new Queue('exportQueue', { connection });
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '4', 10);

async function buildBundle(job: Job) {
  const id = job.id;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), `pacai_export_${id}_`));
  const bundleName = `pacai_export_${job.id}_${job.data.engine}.zip`;
  const bundlePath = path.join(tmp, bundleName);

  try {
    // Simulate building files
    const manifest = job.data.manifest || { 
      generated: new Date().toISOString(), 
      engine: job.data.engine,
      scenario_id: job.data.scenario_id,
      version: job.data.version || '5.0.0'
    };
    await fs.writeFile(path.join(tmp, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // Write dummy world.json (replace with real assets)
    await fs.writeFile(path.join(tmp, 'world.json'), JSON.stringify({ 
      seed: job.data.seed || '0x0', 
      world: 'procedurally_generated',
      entities: 200,
      checksum: crypto.randomBytes(16).toString('hex')
    }));

    // Report progress during generation
    for (let i = 1; i <= 5; i++) {
      await new Promise(r => setTimeout(r, 600));
      await job.updateProgress(Math.floor((i / 5) * 100));
    }

    // Create zip using system tar/zip
    const tarCmd = `cd "${tmp}" && zip -r "${bundlePath}" .`;
    await execAsync(tarCmd);

    // Move to exports directory
    const exportsDir = process.env.EXPORTS_DIR || path.resolve(process.cwd(), 'exports');
    await fs.mkdir(exportsDir, { recursive: true });
    const finalPath = path.join(exportsDir, bundleName);
    await fs.copyFile(bundlePath, finalPath);

    // Build download URL
    const downloadUrl = `${process.env.EXPORT_BUCKET_URL || 'http://localhost:8080/exports'}/${bundleName}`;
    const stats = await fs.stat(finalPath);

    return { 
      downloadUrl, 
      sizeBytes: stats.size, 
      bundleName,
      checksum: crypto.randomBytes(16).toString('hex')
    };
  } finally {
    // Clean up tmp directory
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

// Worker processor
const worker = new Worker('exportQueue', async (job: Job) => {
  console.log(`[worker] starting job ${job.id}`, job.data);
  
  try {
    const result = await buildBundle(job);
    console.log(`[worker] finished job ${job.id}`, result);

    // Optional: notify Vercel / API callback
    if (process.env.CALLBACK_URL) {
      try {
        await fetch(process.env.CALLBACK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            export_id: job.id,
            status: 'completed',
            download_url: result.downloadUrl,
            size_bytes: result.sizeBytes,
            checksum: result.checksum
          })
        });
      } catch (err) {
        console.warn('[worker] callback failed', err);
      }
    }

    return result;
  } catch (error) {
    console.error(`[worker] error processing job ${job.id}:`, error);
    throw error;
  }
}, { connection, concurrency });

worker.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err?.message);
});

worker.on('completed', (job, returnvalue) => {
  console.log(`[worker] job ${job.id} completed successfully`);
});

worker.on('progress', (job) => {
  console.log(`[worker] job ${job.id} progress: ${job.progress}%`);
});

process.on('SIGTERM', async () => {
  console.log('[worker] SIGTERM received, shutting down gracefully');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

console.log(`[worker] started with concurrency=${concurrency}, redis=${redisUrl}`);
