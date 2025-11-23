# AI Brain App - Deployment Guide

## Local Development

### Prerequisites
- Node.js 20+
- npm 10+
- OpenAI API key (optional, for LLM fallback)
- Ollama (optional, for local LLM)

### Setup
```bash
git clone <repo>
cd ai-brain-app
npm install
npm run dev
```

Visit `http://localhost:5000` in your browser.

## Production Deployment

### Replit Deployment
1. Push code to Replit
2. Set environment variable: `OPENAI_API_KEY` in Secrets
3. Click "Deploy" to publish to `.replit.dev` domain

### Docker Deployment
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t ai-brain-app .
docker run -p 5000:5000 -e OPENAI_API_KEY=sk-... ai-brain-app
```

### Environment Variables (Production)
- `NODE_ENV=production`
- `OPENAI_API_KEY=sk-...` (from OpenAI dashboard)
- `OLLAMA_ENDPOINT=http://localhost:11434` (if using local Ollama)

## API Documentation

### POST /api/bt/run
Execute a behavior tree tick.

**Request:**
```json
{
  "bt_string": "Root\nSequence\nAction1\nCondition1",
  "context": {"health": 100, "energy": 50}
}
```

**Response:**
```json
{
  "tick_output": {
    "status": "success",
    "executedNodes": ["node_0", "node_1"],
    "logs": ["[BT Executor] Starting execution..."]
  }
}
```

### POST /api/onnx/predict
Get prediction from ONNX model.

**Request:**
```json
{
  "inputs": [0.1, 0.5, 0.2, 0.7]
}
```

**Response:**
```json
{
  "prediction": 0.542
}
```

### POST /api/narrative/generate
Generate narrative with LLM.

**Request:**
```json
{
  "prompt": "metro",
  "vars": {
    "location": "downtown",
    "character": "scout",
    "obstacle": "guards",
    "atmosphere": "tension"
  }
}
```

**Response:**
```json
{
  "text": "In the dark tunnels of downtown metro...",
  "usedOllama": false
}
```

### GET /api/worldstate
Fetch current world state.

**Response:**
```json
{
  "health": 100,
  "energy": 50,
  "position": {"x": 0, "y": 0, "z": 0},
  "inventory": ["sword", "shield"]
}
```

### POST /api/worldstate
Save/update world state.

**Request:**
```json
{
  "health": 85,
  "energy": 40,
  "position": {"x": 10, "y": 5, "z": 0},
  "enemies_defeated": 3
}
```

### POST /api/worldstate/push
Push state to Godot instance.

**Request:** (same as /api/worldstate)

**Response:**
```json
{
  "success": true,
  "message": "State would be pushed to Godot instance"
}
```

## Godot Mobile Integration

### Example: ONNX Prediction Request
```gdscript
extends Node

@onready var http_request = HTTPRequest.new()

func _ready():
    add_child(http_request)
    http_request.request_completed.connect(_on_request_completed)
    
    # Request prediction from AI Brain App
    var url = "http://localhost:5000/api/onnx/predict"
    var headers = ["Content-Type: application/json"]
    var body = JSON.stringify({"inputs": [0.1, 0.5, 0.2]})
    http_request.request(url, headers, HTTPClient.METHOD_POST, body)

func _on_request_completed(result, response_code, headers, body):
    if response_code == 200:
        var response = JSON.parse_string(body.get_string_from_utf8())
        var prediction = response.prediction
        print("AI Prediction: ", prediction)
```

### Example: World State Update
```gdscript
func update_world_state(new_state: Dictionary):
    var url = "http://localhost:5000/api/worldstate"
    var headers = ["Content-Type: application/json"]
    var body = JSON.stringify(new_state)
    http_request.request(url, headers, HTTPClient.METHOD_POST, body)
```

## Performance Tuning

### Request Queue
- Max concurrent requests: 3 (configurable in middleware)
- Adjust in `server/middleware/request-queue.ts`

### ONNX Model Limits
- Max input array: 100 elements
- Prediction timeout: 5 seconds

### LLM Configuration
- Ollama timeout: 5 seconds (falls back to OpenAI)
- Max completion tokens: 300

## Troubleshooting

### "Ollama Connection Failed"
- Ensure Ollama is running: `ollama serve`
- Check endpoint in Settings page
- Falls back to OpenAI automatically

### "OPENAI_API_KEY not found"
- Set secret in Replit Secrets tab
- Or: `export OPENAI_API_KEY=sk-...`

### High API Latency
- Check request queue length in middleware logs
- Scale to more backend instances
- Reduce concurrent limits if memory constrained

### CORS Errors from Godot
- CORS is enabled for all origins by default
- Adjust in `server/routes.ts` if needed

## Monitoring

Check logs:
```bash
# Replit: View logs in Deploy tab
# Docker: docker logs <container-id>
# Local: npm run dev shows console output
```

Key metrics to monitor:
- Average API response time
- Queue length and wait times
- LLM provider fallback frequency
- World state update frequency
