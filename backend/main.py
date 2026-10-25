import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import init_db
from backend.services.scheduler import start_scheduler
from backend.routers import sources, digest, filter_logs, settings

app = FastAPI(
    title="SlothDigest API",
    description="The Zero-Effort Local RSS & Newsletter Curator. Local-first AI digestion and audio briefings.",
    version="1.0.0"
)

# CORS setup for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(sources.router)
app.include_router(digest.router)
app.include_router(filter_logs.router)
app.include_router(settings.router)

# Mount audio directory
AUDIO_DIR = Path(__file__).resolve().parent / "static" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")

# Mount frontend build if it exists
DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

@app.on_event("startup")
async def on_startup():
    init_db()
    start_scheduler()
    print("[SlothDigest] Ready at http://localhost:8000")

@app.get("/api")
def api_root():
    return {
        "name": "SlothDigest API",
        "tagline": "The Zero-Effort Local RSS & Newsletter Curator",
        "version": "1.0.0",
        "docs": "/docs"
    }

if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")
