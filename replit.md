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

## Remaining v3 Features (Option 2 & 3)
- [ ] Mobile Creation Suite (Police/CQB/Film templates)
- [ ] Project-level ONNX model binding
- [ ] Persistent LLM prompt templates per project
- [ ] S3 asset storage & signed URLs
- [ ] Advanced webhook signing (HMAC)
- [ ] Admin audit endpoints
- [ ] Per-project rate limiting
- [ ] Export to Blender/Godot adapters

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
