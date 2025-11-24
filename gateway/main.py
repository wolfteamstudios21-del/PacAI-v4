#!/usr/bin/env python3
# gateway/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from db import init_db
from v3_extensions import router as v3_router

load_dotenv()

app = FastAPI(title="AI Brain v3 Gateway", version="3.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

# Include routers
app.include_router(v3_router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "v3-gateway"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("V3_PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)
