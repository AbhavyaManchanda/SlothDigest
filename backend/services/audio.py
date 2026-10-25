import os
import asyncio
from pathlib import Path
from backend.database import get_db_connection

AUDIO_DIR = Path(__file__).resolve().parent.parent / "static" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

async def generate_briefing_audio(script_text: str, digest_id: int, voice: str = "en-US-ChristopherNeural") -> str:
    """Generates an MP3 audio briefing file for a digest using edge-tts with pyttsx3 fallback."""
    filename = f"briefing_digest_{digest_id}.mp3"
    filepath = AUDIO_DIR / filename

    # 1. Attempt edge-tts for high quality neural audio
    try:
        import edge_tts
        communicate = edge_tts.Communicate(script_text, voice)
        await communicate.save(str(filepath))
        
        if filepath.exists() and filepath.stat().st_size > 500:
            _update_digest_audio(digest_id, filename)
            return filename
    except Exception as e:
        print(f"edge-tts failed or offline ({e}), falling back to pyttsx3 offline engine...")

    # 2. Fallback to pyttsx3 (100% offline Windows SAPI5)
    try:
        import pyttsx3
        engine = pyttsx3.init()
        # Set speech rate and volume
        engine.setProperty("rate", 175)
        wav_filename = f"briefing_digest_{digest_id}.wav"
        wav_path = AUDIO_DIR / wav_filename
        
        # Run in thread pool to not block asyncio loop
        loop = asyncio.get_event_loop()
        def _speak():
            engine.save_to_file(script_text, str(wav_path))
            engine.runAndWait()
        
        await loop.run_in_executor(None, _speak)
        if wav_path.exists() and wav_path.stat().st_size > 500:
            _update_digest_audio(digest_id, wav_filename)
            return wav_filename
    except Exception as e:
        print(f"pyttsx3 fallback failed ({e})")

    return ""

def _update_digest_audio(digest_id: int, filename: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE digests SET audio_filename = ? WHERE id = ?", (filename, digest_id))
    conn.commit()
    conn.close()
