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

## Next Phase Features (Optional)
- Advanced BT debugging (breakpoints, variable inspection)
- Batch testing capabilities
- Execution history & replay
- PostgreSQL database migration
- Collaborative team workspace
- Analytics dashboard

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
