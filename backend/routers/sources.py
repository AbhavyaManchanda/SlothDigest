from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
from datetime import datetime
from backend.database import get_db_connection
from backend.models.schemas import SourceCreate, SourceUpdate, SourceResponse
from backend.services.ingestion import fetch_rss_feed, sync_local_newsletter_folder, sync_all_active_sources

router = APIRouter(prefix="/api/sources", tags=["Sources"])

@router.get("", response_model=List[SourceResponse])
def list_sources():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT s.*, COUNT(a.id) as article_count
    FROM sources s
    LEFT JOIN raw_articles a ON s.id = a.source_id
    GROUP BY s.id
    ORDER BY s.id ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    return [
        SourceResponse(
            id=r["id"],
            name=r["name"],
            type=r["type"],
            url_or_path=r["url_or_path"],
            is_active=bool(r["is_active"]),
            last_fetched_at=r["last_fetched_at"],
            fetch_status=r["fetch_status"],
            error_message=r["error_message"],
            created_at=r["created_at"],
            article_count=r["article_count"]
        ) for r in rows
    ]

@router.post("", response_model=SourceResponse)
async def create_source(payload: SourceCreate):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check for duplicate
    cursor.execute("SELECT id FROM sources WHERE url_or_path = ?", (payload.url_or_path.strip(),))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="A source with this URL or path already exists.")

    created_at = datetime.utcnow().isoformat()
    cursor.execute("""
    INSERT INTO sources (name, type, url_or_path, is_active, created_at)
    VALUES (?, ?, ?, ?, ?)
    """, (payload.name.strip(), payload.type.strip(), payload.url_or_path.strip(), int(payload.is_active), created_at))
    sid = cursor.lastrowid
    conn.commit()
    conn.close()

    # Automatically trigger initial fetch
    if payload.type == "rss":
        await fetch_rss_feed(sid, payload.url_or_path.strip())
    elif payload.type == "newsletter_email":
        sync_local_newsletter_folder(sid, payload.url_or_path.strip())

    return SourceResponse(
        id=sid,
        name=payload.name,
        type=payload.type,
        url_or_path=payload.url_or_path,
        is_active=payload.is_active,
        created_at=created_at,
        article_count=0
    )

@router.patch("/{source_id}", response_model=SourceResponse)
def update_source(source_id: int, payload: SourceUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sources WHERE id = ?", (source_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Source not found.")

    new_name = payload.name if payload.name is not None else existing["name"]
    new_url = payload.url_or_path if payload.url_or_path is not None else existing["url_or_path"]
    new_active = int(payload.is_active) if payload.is_active is not None else existing["is_active"]

    cursor.execute("""
    UPDATE sources SET name = ?, url_or_path = ?, is_active = ? WHERE id = ?
    """, (new_name, new_url, new_active, source_id))
    conn.commit()
    conn.close()

    return SourceResponse(
        id=source_id,
        name=new_name,
        type=existing["type"],
        url_or_path=new_url,
        is_active=bool(new_active),
        last_fetched_at=existing["last_fetched_at"],
        fetch_status=existing["fetch_status"],
        error_message=existing["error_message"],
        created_at=existing["created_at"]
    )

@router.delete("/{source_id}")
def delete_source(source_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sources WHERE id = ?", (source_id,))
    cursor.execute("DELETE FROM raw_articles WHERE source_id = ?", (source_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted", "id": source_id}

@router.post("/sync")
async def sync_all():
    """Triggers an immediate fetch across all active feeds and folders."""
    results = await sync_all_active_sources()
    return {"status": "synced", "results": results}

@router.post("/{source_id}/sync")
async def sync_single(source_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT type, url_or_path FROM sources WHERE id = ?", (source_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Source not found.")

    if row["type"] == "rss":
        count = await fetch_rss_feed(source_id, row["url_or_path"])
    elif row["type"] == "newsletter_email":
        count = sync_local_newsletter_folder(source_id, row["url_or_path"])
    else:
        count = 0

    return {"status": "synced", "source_id": source_id, "new_articles": count}
