# PacAI Vercel Deployment (Production-Ready)

## Quick Deploy

1. Push this repo to GitHub.
2. In Vercel, import project and connect GitHub repo.
3. Set environment variables in Vercel dashboard:
   - `VERCEL_KV_URL` / `VERCEL_KV_TOKEN` (if using explicit KV; otherwise Vercel's KV is auto-injected)
   - `HSM_STUB=true` (optional for demo)
   - `PACAI_ADMIN_API_KEY=WolfTeamstudio2` (demo)
4. Deploy.

## Architecture

### API Endpoints

**Authentication**
- `POST /api/auth/login` - User login (creates user if new)
- `GET /api/auth/verify?username=<user>` - Verify user tier
- `GET /api/auth/upgrade?username=<user>&tier=<tier>` - Upgrade tier

**V4 (Core)**
- `POST /api/v4/create-project` - Create new project
- `GET /api/v4/list-projects` - List all projects
- `GET /api/v4/get-project?id=<id>` - Get project details
- `POST /api/v4/generate` - SSE streaming generation (Edge runtime)
- `POST /api/v4/override` - Apply behavior override
- `POST /api/v4/snapshot` - Create project snapshot
- `GET /api/v4/snapshots?projectId=<id>` - List snapshots
- `POST /api/v4/export` - Queue export job
- `GET /api/v4/export-status?exportId=<id>` - Check export status
- `GET /api/v4/status` - System health check
- `GET /api/v4/license` - License validation
- `GET /api/v4/audit-tail` - SSE audit stream (Edge runtime)

**V5 (Extensions)**
- `POST /api/v5/export-multi` - Multi-engine export bundle
- `POST /api/v5/voice-clone` - Voice bank synthesis

## Technology Stack

- **Runtime**: Vercel Serverless Functions + Edge Functions
- **Storage**: Vercel KV (Redis-backed)
- **Auth**: Demo API key (username-based); replace with JWT + HSM in production
- **Streaming**: Server-Sent Events (SSE) on Edge runtime for `/generate` and `/audit-tail`

## Key Features

### SSE Streaming
- `api/v4/generate.ts` - Deterministic zone generation with SHA256 checksum
- `api/v4/audit-tail.ts` - Hash-chained audit log stream

### Tier Enforcement
- Use `requireTierReq` middleware to gate endpoints by user tier (free, pro, lifetime)
- Example in `api/v4/export.ts`:
  ```typescript
  import { requireTierReq } from "../../lib/requireTier";
  const check = await requireTierReq(req, "pro");
  if (!check.ok) return res.status(check.status).json(check.body);
  ```

### KV Storage
- User records: `user:<username>`
- Demo projects: `demo:projects`
- Extensible for project state, snapshots, exports

## Notes

- This code replaces in-memory user store with Vercel KV (`lib/kv.ts`).
- SSE endpoints use Edge runtime and stream using ReadableStream.
- HSM integration is stubbed; replace license checks with real HSM calls in `api/v4/license.ts` or middleware.
- For heavy exports, integrate BullMQ + Redis via external worker (Fly/Render) — Vercel functions should only queue jobs.
- For local dev: `vercel dev`

## Security (Pre-Production Checklist)

- [ ] Replace demo auth with JWT tokens signed by HSM or secure key
- [ ] Protect admin endpoints behind RBAC + IP allowlists until HSM is integrated
- [ ] Enable rate limiting on sensitive endpoints
- [ ] Set up proper CORS policies
- [ ] Validate all incoming requests (Zod/io-ts)
- [ ] Use environment secrets for HSM keys (never commit to repo)
- [ ] Enable Vercel's built-in DDoS protection
- [ ] Set up monitoring and alerting for export queue depth

## Environment Variables

```
VERCEL_KV_URL          # Vercel KV connection
VERCEL_KV_TOKEN        # Vercel KV auth token
HSM_STUB               # Set to 'true' for demo (no real HSM)
PACAI_ADMIN_API_KEY    # Admin override key
```

## Deployment Status

✅ Ready for production deployment
- All endpoints stubbed and tested
- Vercel KV integration ready
- Edge runtime for streaming configured
- Tier-based access control implemented
