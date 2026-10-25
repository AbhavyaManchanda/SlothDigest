from fastapi import APIRouter
from typing import Dict, Any, List
from backend.database import get_db_connection
from backend.models.schemas import SettingsUpdate, OllamaModelInfo
from backend.services.filter_engine import get_ollama_models

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("")
async def get_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    settings_dict = {r["key"]: r["value"] for r in cursor.fetchall()}
    conn.close()

    # Query local Ollama models
    models = await get_ollama_models()
    ollama_connected = len(models) > 0

    return {
        "settings": settings_dict,
        "available_models": models,
        "ollama_connected": ollama_connected
    }

@router.post("")
def update_settings(payload: SettingsUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()

    updates = payload.model_dump(exclude_unset=True)
    for key, val in updates.items():
        if val is not None:
            cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(val)))

    conn.commit()

    cursor.execute("SELECT key, value FROM settings")
    fresh_settings = {r["key"]: r["value"] for r in cursor.fetchall()}
    conn.close()

    return {"status": "updated", "settings": fresh_settings}

@router.get("/models", response_model=List[OllamaModelInfo])
async def list_models():
    models = await get_ollama_models()
    return [
        OllamaModelInfo(
            name=m["name"],
            size=m.get("size"),
            modified_at=m.get("modified_at")
        ) for m in models
    ]

@router.get("/health")
async def health_check():
    models = await get_ollama_models()
    return {
        "status": "healthy",
        "service": "SlothDigest Backend",
        "ollama_online": len(models) > 0,
        "detected_models": [m["name"] for m in models]
    }
