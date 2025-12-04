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

## Deployment (Fly.io) - HA Setup

```bash
# 1. Install Fly CLI and authenticate
curl -L https://fly.io/install.sh | sh
fly auth login

# 2. Create Fly app (from worker/ directory)
cd worker
fly launch --name pacai-export-worker --no-deploy

# 3. Create persistent volume for exports (in each region)
fly volumes create exports --size 10 --region sjc
fly volumes create exports --size 10 --region iad

# 4. Set secrets (REQUIRED)
fly secrets set REDIS_URL="redis://default:password@your-redis.upstash.io:6379"
fly secrets set WORKER_CALLBACK_SECRET="your-secure-hmac-secret-here"

# 5. Deploy with High Availability (2 machines across regions)
fly deploy --ha

# 6. Verify deployment
fly status
fly logs
```

### HA Configuration Details
- **Primary Region**: sjc (US West - San Jose)
- **Secondary Region**: iad (US East - Virginia)
- **Machine Size**: shared-cpu-2x (2 CPUs, 1GB RAM)
- **Auto-scaling**: Machines start/stop based on queue depth
- **Persistent Storage**: 10GB for export files

### Required Secrets
| Secret | Description |
|--------|-------------|
| `REDIS_URL` | Redis connection (Upstash, Redis Cloud, or self-hosted) |
| `WORKER_CALLBACK_SECRET` | HMAC secret matching server's `WORKER_CALLBACK_SECRET` |

### Post-Deployment Verification & HA Scaling
```bash
# Check machine status
fly machines list

# View real-time logs
fly logs --app pacai-export-worker

# Scale to HA across regions (after initial deploy)
fly scale count 2 --region sjc  # 2 machines in US West
fly scale count 2 --region iad  # 2 machines in US East

# Verify HA status
fly status
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
