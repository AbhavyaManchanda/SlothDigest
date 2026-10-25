import asyncio
from datetime import datetime
from backend.services.ingestion import sync_all_active_sources
from backend.services.filter_engine import run_sloth_curation
from backend.services.audio import generate_briefing_audio
from backend.database import get_db_connection

_scheduler_task = None
_last_sync_time = None

async def _scheduler_loop():
    global _last_sync_time
    while True:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM settings WHERE key IN ('schedule_time', 'auto_sync_interval')")
            settings = {r["key"]: r["value"] for r in cursor.fetchall()}
            conn.close()

            target_time = settings.get("schedule_time", "07:00")
            now_str = datetime.now().strftime("%H:%M")

            if now_str == target_time:
                print(f"[Scheduler] Daily briefing trigger reached at {now_str}. Syncing feeds & curating digest...")
                await sync_all_active_sources()
                result = await run_sloth_curation()
                if result.get("digest_id") and result.get("briefing_script"):
                    await generate_briefing_audio(result["briefing_script"], result["digest_id"])
                # Wait 61 seconds so we don't trigger multiple times in the same minute
                await asyncio.sleep(65)
                continue

        except Exception as e:
            print(f"[Scheduler] Loop error: {e}")

        await asyncio.sleep(30)

def start_scheduler():
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop())
        print("[Scheduler] Background scheduler loop started.")
