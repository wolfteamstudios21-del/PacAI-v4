# PacAI Export Worker

Async job worker for processing export bundles using BullMQ + Redis.

## Architecture

```
┌─────────────────┐     ┌───────────┐     ┌─────────────────┐
│  Vercel/Replit  │────▶│   Redis   │◀────│  Worker Fleet   │
│  (enqueue API)  │     │  (BullMQ) │     │  (Fly/Render)   │
└─────────────────┘     └───────────┘     └─────────────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │  S3/Static Host │
                                          │  (Export Files) │
                                          └─────────────────┘
```

## Quick Start (Local Development)

```bash
# 1. Start Redis
docker run -d --name redis -p 6379:6379 redis:7

# 2. Install dependencies
cd worker
npm install

# 3. Run worker
npm run dev
```

## Environment Variables

```env
REDIS_URL=redis://localhost:6379
EXPORTS_DIR=/data/exports
EXPORT_BUCKET_URL=https://assets.pacaiwolfstudio.com/exports
CALLBACK_URL=https://pacaiwolfstudio.com/api/v5/export/callback
WORKER_CONCURRENCY=4
```

## Deployment (Fly.io)

```bash
# 1. Create Fly app
flyctl launch --name pacai-export-worker

# 2. Create persistent volume for exports
flyctl volumes create exports --size 10

# 3. Set secrets
flyctl secrets set REDIS_URL="redis://..."
flyctl secrets set CALLBACK_URL="https://pacaiwolfstudio.com/api/v5/export/callback"

# 4. Deploy
flyctl deploy
```

## Deployment (Docker)

```bash
# Build image
docker build -t pacai-export-worker .

# Run container
docker run -d \
  -e REDIS_URL=redis://redis:6379 \
  -e EXPORTS_DIR=/data/exports \
  -e EXPORT_BUCKET_URL=https://assets.pacaiwolfstudio.com/exports \
  -v /data/exports:/data/exports \
  pacai-export-worker
```

## Job Flow

1. **Enqueue**: API calls `POST /v5/export` → job added to Redis queue
2. **Process**: Worker pulls job, builds bundle, uploads to storage
3. **Complete**: Worker sends callback to API with download URL
4. **Poll**: Frontend polls `GET /v5/export/:id` for status

## Job Data Structure

```typescript
interface ExportJob {
  project_id: string;
  engines: string[];        // ['ue5', 'unity', 'godot']
  include_assets: boolean;
  quality: 'low' | 'medium' | 'high';
  seed?: string;
  manifest?: object;
}
```

## Worker Features

- **Retry Logic**: 3 attempts with exponential backoff
- **Progress Reporting**: Real-time progress updates via job.updateProgress()
- **Callback Webhook**: Optional notification to API on completion
- **Graceful Shutdown**: Handles SIGTERM for clean container restarts
- **Concurrency**: Configurable parallel job processing

## Production Checklist

- [ ] Deploy Redis (managed: Upstash, Redis Cloud, or self-hosted)
- [ ] Deploy worker to Fly.io or Render
- [ ] Configure S3 or CDN for export storage
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure autoscaling based on queue depth
- [ ] Add HSM signing for bundle manifests
- [ ] Set up log aggregation (Datadog/Loki)

## Monitoring

```bash
# Check queue depth
redis-cli LLEN bull:exportQueue:wait

# View active jobs
redis-cli LRANGE bull:exportQueue:active 0 -1

# Worker health
curl http://worker:8080/health
```

## Scaling

Scale workers based on queue depth:

```yaml
# fly.toml
[autoscale]
  min_count = 1
  max_count = 10
  queue_threshold = 50
```

Or use Kubernetes HPA:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: External
      external:
        metric:
          name: redis_queue_length
        target:
          type: AverageValue
          averageValue: 50
```
