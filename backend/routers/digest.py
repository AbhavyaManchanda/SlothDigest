import json
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional
from datetime import datetime
from backend.database import get_db_connection
from backend.models.schemas import DigestResponse, DigestGenerateRequest, TakeawayItem
from backend.services.filter_engine import run_sloth_curation
from backend.services.audio import generate_briefing_audio
from backend.services.ingestion import sync_all_active_sources

router = APIRouter(prefix="/api/digest", tags=["Digest"])

def _format_digest_row(r) -> DigestResponse:
    takeaways = []
    try:
        raw_json = json.loads(r["takeaways_json"]) if r["takeaways_json"] else []
        for item in raw_json:
            takeaways.append(TakeawayItem(**item))
    except Exception as e:
        print(f"Error parsing takeaways JSON: {e}")

    audio_filename = r["audio_filename"]
    audio_url = f"/api/audio/{audio_filename}" if audio_filename else None

    return DigestResponse(
        id=r["id"],
        date=r["date"],
        title=r["title"],
        audio_filename=audio_filename,
        audio_url=audio_url,
        model_used=r["model_used"],
        prompt_used=r["prompt_used"],
        takeaways=takeaways,
        total_raw_items=r["total_raw_items"] or 0,
        kept_items_count=r["kept_items_count"] or 0,
        rejected_items_count=r["rejected_items_count"] or 0,
        briefing_script=r["briefing_script"],
        created_at=r["created_at"]
    )

@router.get("/today", response_model=Optional[DigestResponse])
async def get_today_digest():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM digests ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()

    if row:
        return _format_digest_row(row)

    # If no digest exists at all, run initial sync and curation to give the user a great day 1 experience!
    try:
        await sync_all_active_sources()
        result = await run_sloth_curation()
        did = result.get("digest_id")
        if did and result.get("briefing_script"):
            await generate_briefing_audio(result["briefing_script"], did)

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM digests WHERE id = ?", (did,))
        fresh_row = cursor.fetchone()
        conn.close()
        if fresh_row:
            return _format_digest_row(fresh_row)
    except Exception as e:
        print(f"Initial digest creation error: {e}")

    return None

@router.get("/history", response_model=List[DigestResponse])
def get_digest_history():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM digests ORDER BY id DESC LIMIT 30")
    rows = cursor.fetchall()
    conn.close()
    return [_format_digest_row(r) for r in rows]

@router.get("/{digest_id}", response_model=DigestResponse)
def get_single_digest(digest_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM digests WHERE id = ?", (digest_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Digest not found.")
    return _format_digest_row(row)

@router.post("/generate", response_model=DigestResponse)
async def generate_digest(payload: DigestGenerateRequest):
    """Triggers on-demand AI filtering and curation across incoming articles."""
    result = await run_sloth_curation(
        model=payload.model,
        custom_prompt=payload.custom_prompt,
        max_items=payload.max_items or 5
    )

    did = result.get("digest_id")
    if not did:
        raise HTTPException(status_code=500, detail="Failed to generate digest.")

    # Generate audio briefing
    if result.get("briefing_script"):
        await generate_briefing_audio(result["briefing_script"], did)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM digests WHERE id = ?", (did,))
    row = cursor.fetchone()
    conn.close()

    return _format_digest_row(row)

@router.post("/{digest_id}/audio")
async def generate_audio_for_digest(digest_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT briefing_script FROM digests WHERE id = ?", (digest_id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row["briefing_script"]:
        raise HTTPException(status_code=404, detail="Digest or briefing script not found.")

    audio_file = await generate_briefing_audio(row["briefing_script"], digest_id)
    return {"status": "success", "audio_filename": audio_file, "audio_url": f"/api/audio/{audio_file}"}
