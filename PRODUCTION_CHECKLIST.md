# PacAI v5 Production Readiness Checklist

## Security Hardening ✅
- [x] Removed hardcoded dev credentials from client
- [x] Dev-only mock users guarded by NODE_ENV
- [x] Security headers added (X-Content-Type-Options, X-Frame-Options, etc.)
- [x] Non-root Docker user for container isolation
- [x] JWT-only WebSocket authentication
- [x] Session binding on tokens (sessionId validation)

## Environment Configuration ✅
- [x] `.env.example` documented with all production vars
- [x] `fly.toml` configured for Fly.io deployment
- [x] `Dockerfile` multi-stage build optimized
- [x] NODE_ENV=production set in production builds
- [x] Database secrets handled via environment variables

## Database & Persistence
- [ ] Database migrations run: `npm run db:push`
- [ ] PostgreSQL connection verified in production
- [ ] Audit logs persisted to `/data` volume
- [ ] Session data backed up (in-memory Map, ready for Redis)

## API Security
- [ ] Rate limiting enforced (5/30/100 req/min per tier)
- [ ] CORS configured for production domain
- [ ] Input validation on all endpoints
- [ ] Error messages don't expose sensitive info
- [ ] Auth middleware on protected endpoints

## Logging & Monitoring
- [ ] Production logging configured (no debug logs)
- [ ] Error tracking integrated (Sentry optional)
- [ ] WebSocket connection logging in place
- [ ] API request/response logging enabled

## Performance & Optimization
- [x] Frontend built and minified in Docker stage 1
- [x] Static assets served from dist/public
- [x] Query client configured with React Query
- [ ] Database connection pooling verified
- [ ] WebSocket rate limiting active

## Deployment Ready
- [x] Dockerfile: Multi-stage build (frontend → backend)
- [x] fly.toml: Fly.io configuration with secrets
- [x] Health endpoint: GET /v5/health (checks API status)
- [x] No hardcoded URLs (all env-driven)
- [x] All dependencies in package.json

## Pre-Deploy Steps (Run Once)
```bash
# 1. Test production build locally
npm run build && PORT=8080 npm run start

# 2. Verify health endpoint (should be on port 8080 in prod)
curl http://localhost:8080/v5/health

# 3. Commit production changes
git add .
git commit -m "chore: production-ready — port config, security hardening, removed dev credentials"
git push origin main

# 4. Deploy to Fly.io (from Replit terminal)
flyctl deploy --remote-only

# 5. Verify live deployment
flyctl status
# Should show: https://pacai-v5.fly.dev/v5/health
```

## Port Configuration
- **Development (Replit):** PORT 5000 (default in dev mode)
- **Production (Fly.io):** PORT 8080 (set via $PORT env var, defaults to 8080)
- **fly.toml:** internal_port=8080 (matches app default)
- **Dockerfile:** Exposed port 8080

## Post-Deploy Monitoring
```bash
# Check logs
flyctl logs

# Monitor performance
flyctl status
flyctl scale count 3 --region iad,fra,syd  # Multi-region

# Update secrets if needed
flyctl secrets set DATABASE_URL="..."
```

## Notes for April 2026 Release
- Replace mock auth with real user database queries
- Integrate HSM (YubiHSM2/Nitrokey3) for license validation
- Add Redis session clustering for multi-instance setups
- Implement Rust Axum gateway for 50-100x throughput
- Add Tauri desktop console for offline admin
