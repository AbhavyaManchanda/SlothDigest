from fastapi import APIRouter, Query
from typing import List, Optional, Dict, Any
from backend.database import get_db_connection
from backend.models.schemas import RejectionLogResponse

router = APIRouter(prefix="/api/rejections", tags=["Rejection Logs"])

@router.get("", response_model=List[RejectionLogResponse])
def get_rejection_logs(
    search: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0
):
    conn = get_db_connection()
    cursor = conn.cursor()

    if search:
        cursor.execute("""
        SELECT * FROM rejection_logs 
        WHERE title LIKE ? OR reason LIKE ? OR source_name LIKE ?
        ORDER BY id DESC LIMIT ? OFFSET ?
        """, (f"%{search}%", f"%{search}%", f"%{search}%", limit, offset))
    else:
        cursor.execute("""
        SELECT * FROM rejection_logs 
        ORDER BY id DESC LIMIT ? OFFSET ?
        """, (limit, offset))

    rows = cursor.fetchall()
    conn.close()

    return [
        RejectionLogResponse(
            id=r["id"],
            raw_article_id=r["raw_article_id"],
            title=r["title"],
            source_name=r["source_name"],
            url=r["url"],
            score=r["score"],
            reason=r["reason"],
            summary=r["summary"],
            created_at=r["created_at"]
        ) for r in rows
    ]

@router.get("/stats")
def get_filter_stats() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total_raw FROM raw_articles")
    total_raw = cursor.fetchone()["total_raw"]

    cursor.execute("SELECT COUNT(*) as kept_count FROM raw_articles WHERE processing_status = 'kept'")
    kept_count = cursor.fetchone()["kept_count"]

    cursor.execute("SELECT COUNT(*) as rejected_count FROM rejection_logs")
    rejected_count = cursor.fetchone()["rejected_count"]

    # Top rejection reasons
    cursor.execute("""
    SELECT reason, COUNT(*) as count 
    FROM rejection_logs 
    GROUP BY reason 
    ORDER BY count DESC 
    LIMIT 5
    """)
    top_reasons = [{"reason": r["reason"], "count": r["count"]} for r in cursor.fetchall()]

    conn.close()

    total_evaluated = kept_count + rejected_count
    noise_reduction_pct = round((rejected_count / total_evaluated * 100), 1) if total_evaluated > 0 else 0.0

    return {
        "total_raw": total_raw,
        "total_evaluated": total_evaluated,
        "kept_count": kept_count,
        "rejected_count": rejected_count,
        "noise_reduction_percentage": noise_reduction_pct,
        "top_rejection_reasons": top_reasons
    }

@router.delete("/clear")
def clear_rejections():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM rejection_logs")
    conn.commit()
    conn.close()
    return {"status": "cleared"}
