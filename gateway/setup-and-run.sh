#!/bin/bash
# gateway/setup-and-run.sh
echo "🚀 Installing v3 gateway dependencies..."
python3 -m pip install -q fastapi uvicorn psycopg2-binary sqlalchemy pydantic python-dotenv httpx pyjwt

echo "✅ Dependencies installed. Starting v3 gateway on port 5001..."
python3 main.py
