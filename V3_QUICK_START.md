# AI Brain v3 Quick Start Guide

## Setup (3 steps)

### 1. Install Python dependencies
```bash
cd gateway
python3 -m pip install fastapi uvicorn psycopg2-binary sqlalchemy pydantic python-dotenv httpx pyjwt
```

### 2. Start v3 Gateway (NEW TERMINAL)
```bash
cd gateway
python3 main.py
```
✅ Should print: `Uvicorn running on http://0.0.0.0:5001`

### 3. Verify Main App Still Running
```bash
# In original terminal, should still see:
npm run dev
# "serving on port 5000"
```

---

## Testing v3 API

### Option A: Run Full Test Suite
```bash
bash test-v3-endpoints.sh
```
This will:
1. Get JWT token from v2 auth
2. Create a project
3. Stream zone generation
4. Trigger export
5. Create & list snapshots

### Option B: Manual curl Commands

**1. Get JWT Token:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"api_key":"sk_demo_1234567890abcdef"}'
```
Copy the `token` value.

**2. Create Project:**
```bash
JWT="<paste token here>"

curl -X POST http://localhost:5000/v3/projects \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"Police De-Escalation Demo"}'
```
Copy the `project_id` from response.

**3. Stream Zone Generation:**
```bash
PROJECT_ID="<paste project_id here>"

curl -N -X POST http://localhost:5000/v3/projects/$PROJECT_ID/generate-zone \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"downtown opioid crisis response","stream":true,"cost":1}'
```
You should see live JSON chunks streaming in.

**4. Trigger Export:**
```bash
curl -X POST http://localhost:5000/v3/projects/$PROJECT_ID/export_bundle \
  -H "Authorization: Bearer $JWT"
```

---

## Architecture

```
┌─────────────────────────────────────┐
│   Mobile App / Web UI (browser)     │
│   → http://localhost:5000           │
└────────────┬────────────────────────┘
             │
         HTTPS (JWT)
             │
┌────────────▼────────────────────────┐
│   Express Gateway (Node.js)          │
│   Port: 5000                         │
│   - v2 auth endpoints                │
│   - v2 credits/rate-limit            │
│   - Proxy /v3/* → FastAPI            │
└────────────┬────────────────────────┘
             │
      HTTP (proxy)
             │
┌────────────▼────────────────────────┐
│   FastAPI v3 Gateway (Python)        │
│   Port: 5001                         │
│   - Projects CRUD                    │
│   - Zone streaming (SSE)             │
│   - Export/Animation jobs            │
│   - Snapshots & webhooks             │
└────────────┬────────────────────────┘
             │
        SQL (Postgres)
             │
┌────────────▼────────────────────────┐
│   PostgreSQL Database                │
│   Tables: projects, exports,         │
│           animations, snapshots,     │
│           webhooks                   │
└──────────────────────────────────────┘
```

---

## Endpoints (v3 - via Express proxy at :5000)

### Projects
- `POST /v3/projects` - Create
- `GET /v3/projects` - List
- `GET /v3/projects/{project_id}` - Get
- `PUT /v3/projects/{project_id}` - Update
- `DELETE /v3/projects/{project_id}` - Delete

### Generation
- `POST /v3/projects/{project_id}/generate-zone` - Generate with optional SSE streaming
  - Body: `{"prompt":"...", "stream":true/false, "cost":1}`
  
### Animations
- `POST /v3/projects/{project_id}/animate_sequence` - Queue animation job
- `GET /v3/projects/{project_id}/animations/{anim_id}` - Get status & asset URL

### Exports
- `POST /v3/projects/{project_id}/export_bundle` - Start export job
- `GET /v3/projects/{project_id}/exports/{export_id}` - Get status & download URL

### Snapshots
- `POST /v3/projects/{project_id}/snapshots` - Save snapshot
- `GET /v3/projects/{project_id}/snapshots` - List
- `POST /v3/projects/{project_id}/snapshots/{snapshot_id}/restore` - Restore from snapshot

### Webhooks
- `POST /v3/projects/{project_id}/webhooks` - Register callback
- `DELETE /v3/projects/{project_id}/webhooks/{id}` - Unregister

---

## Troubleshooting

**"v3 Gateway unavailable"?**
- Ensure `python3 main.py` is running in `gateway/` directory
- Check port 5001 is not blocked: `lsof -i :5001`

**"Missing or invalid Authorization header"?**
- Make sure JWT token is fresh (from `/api/auth/login`)
- Check header format: `Authorization: Bearer <token>`

**Database connection error?**
- Verify `DATABASE_URL` in `gateway/.env` is correct
- Check PostgreSQL is running: `psql --version`

---

## Next Steps (Option 2 & 3 Features)

- [ ] Mobile Creation Suite (templates for Police/CQB/Film)
- [ ] Persistent ONNX model binding per project
- [ ] Project-level access control (RBAC)
- [ ] Signed export URLs (S3 integration)
- [ ] Advanced webhook signing & retry logic
