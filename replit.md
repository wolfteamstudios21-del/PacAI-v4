# AI Brain App - Project Documentation

## Overview
A production-ready testing companion platform for AI Brain Core (Godot addon). Enables developers to test and manage behavior trees, ONNX models, narrative prompts, and world states in real-time.

## Current Status (MVP Complete)
✅ Home dashboard with feature cards  
✅ Behavior Tree Tester with React Flow visualization  
✅ ONNX Model Tester with dynamic inputs  
✅ Narrative Prompt Lab with template system  
✅ World State Editor with JSON/table views  
✅ Settings page for API key & Ollama configuration  
✅ Complete REST API with 5 endpoints  
✅ LLM integration (Ollama fallback → OpenAI)  
✅ Request queue middleware for safe concurrency  
✅ CORS enabled for Godot integration  
✅ PWA manifest for mobile support  
✅ JSON file storage with persistence  
✅ Beautiful loading states & error handling  
✅ Comprehensive data-testid attributes  

## Architecture

### Frontend (React + TypeScript)
- **Pages**: Home, BT Tester, ONNX Tester, Narrative Lab, World State, Settings
- **Components**: App Sidebar, BT Visualizer with React Flow
- **State Management**: TanStack Query (React Query v5)
- **Styling**: Tailwind CSS + Shadcn UI components
- **Fonts**: Inter (UI), JetBrains Mono (code/data)

### Backend (Node.js Express)
- **Framework**: Express with TypeScript
- **Middleware**: CORS, Request Queue, Zod validation
- **Services**: 
  - BT Executor (behavior tree parsing & execution)
  - ONNX Predictor (model inference simulation)
  - LLM Service (Ollama with OpenAI fallback)
- **Storage**: JSON file-based (data/worldstate.json)

### API Endpoints
```
POST   /api/bt/run              - Execute behavior tree tick
POST   /api/onnx/predict        - Get ONNX model prediction
POST   /api/narrative/generate  - Generate narrative with LLM
GET    /api/worldstate          - Fetch world state
POST   /api/worldstate          - Save world state
POST   /api/worldstate/push     - Push state to Godot
```

## Godot Integration Example
```gdscript
var http = HTTPRequest.new()
add_child(http)
http.request("http://localhost:5000/api/onnx/predict", [],
  HTTPClient.METHOD_POST,
  JSON.stringify({"inputs":[0.1,0.5,0.2]}))
```

## Environment Variables
- `OPENAI_API_KEY` - For LLM fallback (via Replit Secrets)
- `OLLAMA_ENDPOINT` - Local Ollama instance (default: http://localhost:11434)

## Running Locally
```bash
npm install
npm run dev
# Server runs on http://localhost:5000
```

## Build & Deploy
```bash
npm run build
npm start
```

## Features Implemented (MVP)
1. **BT Tester** - Upload BT files, visualize node execution, view logs
2. **ONNX Tester** - Dynamic input array generation, real-time predictions
3. **Narrative Lab** - Template-based prompt generation with variable substitution
4. **World State** - Key-value editing, JSON view, Godot push capability
5. **Settings** - OpenAI API key, Ollama endpoint configuration
6. **Dashboard** - Feature overview, API integration examples

## v3 Implementation Status (In Progress)
✅ **Week 1 Complete (Option 1: Core Endpoints)**
- FastAPI gateway (port 5001) with SQLAlchemy ORM
- Project CRUD: create, list, get, update, delete
- Zone generation with SSE streaming (`generate-zone?stream=true`)
- Animation job queueing with background tasks
- Export bundle creation with async job processing
- Snapshot save/list/restore (full version history)
- Webhook registration and async delivery
- PostgreSQL tables: projects, exports, animations, snapshots, webhooks
- Express proxy middleware forwards `/v3/*` to FastAPI gateway

**Deployed Architecture:**
```
Express (port 5000) ←→ FastAPI v3 Gateway (port 5001)
├── v2: Auth, Credits, Rate-limit, BT/ONNX/Narrative
└── v3: Projects, Exports, Streaming, Webhooks, Snapshots
```

**How to run v3:**
1. `cd gateway && python3 main.py` (starts port 5001)
2. Main app `npm run dev` stays on port 5000
3. Test with: `bash test-v3-endpoints.sh`

## v4 Specification & Monorepo Bootstrap (In Progress)

**v4 Vision**: Offline-first, air-gapped defense simulation platform with hardware-root licensing, SSO + X.509 auth, tamper-proof audit logs, and multi-engine exporters (UE5/Unity/Godot/VBS4/OneTESS).

**Spec Documents Created**:
- `V4_SPECIFICATION.md` - Complete 10-week sprint plan, architecture, API contracts, security model
- `V4_API_CONTRACT.json` - Frozen JSON schema v1.2 for all endpoints
- `V4_RBAC_POLICY.json` - Role matrix (admin, instructor, operator, auditor, integrator) + per-tenant overrides
- `V4_MODEL_VAULT.json` - Offline model registry with per-project KMS encryption

**Monorepo Structure Created**:
```
/gateway        - Rust HTTP/WebSocket gateway, RBAC, audit hooks
/bridge         - Python model orchestration (Ollama/ONNX)
/admin          - Tauri desktop GUI (config, licensing, audit replay)
/exporters      - Unity/UE5/Godot template engines + defense adapters
/infra          - Helm/Docker Compose, HSM provisioning
/tests          - Integration & security test harness
/docs           - Operator manual, security dossier, integration guides
```

**Test Harness Skeleton**: `tests/integration/offline_test_harness.rs` with 12 test cases:
- Offline mode (zero outbound)
- Tenant isolation
- License state machine
- Deterministic generation
- Audit chain hash integrity
- RBAC enforcement
- Encryption at rest
- Update rollback
- SSO + X.509 auth
- Cluster failover
- Export multi-engine
- Audit replay + performance (10k NPCs)

**Next Steps (Week 1 Build)**:
- [ ] Gateway skeleton (Rust + Axum, RBAC middleware)
- [ ] HSM client (YubiHSM/Nitrokey license check)
- [ ] Auth flow (SSO + X.509 + offline tokens)
- [ ] Deterministic /generate endpoint
- [ ] Audit event stream (WebSocket, hash chain)
- [ ] Export /build endpoint (sign with Ed25519)

## Design Principles
- **Technical Focus**: Developer-tool aesthetic inspired by VS Code, Linear, GitHub
- **Performance**: Minimal bundle size, fast load times
- **Accessibility**: WCAG compliant, semantic HTML, proper ARIA labels
- **Mobile-Ready**: Responsive design, PWA support, touch-friendly interactions
- **Error Handling**: Graceful fallbacks, clear error messages

## Performance Notes
- Request queue limits to 3 concurrent API calls
- BT parser handles multi-line definitions
- ONNX predictor simulates inference with weighted calculations
- LLM service: Ollama 5s timeout before OpenAI fallback
