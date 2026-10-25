import sqlite3
import json
import os
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "slothdigest.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'rss', 'newsletter_email', 'link'
        url_or_path TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        last_fetched_at TEXT,
        fetch_status TEXT DEFAULT 'idle',
        error_message TEXT,
        created_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS raw_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER,
        title TEXT NOT NULL,
        author TEXT,
        url TEXT UNIQUE,
        raw_content TEXT,
        clean_text TEXT,
        published_at TEXT,
        ingested_at TEXT NOT NULL,
        processing_status TEXT DEFAULT 'pending', -- 'pending', 'kept', 'rejected'
        FOREIGN KEY(source_id) REFERENCES sources(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS digests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        audio_filename TEXT,
        model_used TEXT,
        prompt_used TEXT,
        takeaways_json TEXT NOT NULL,
        total_raw_items INTEGER DEFAULT 0,
        kept_items_count INTEGER DEFAULT 0,
        rejected_items_count INTEGER DEFAULT 0,
        briefing_script TEXT,
        created_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rejection_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_article_id INTEGER,
        title TEXT NOT NULL,
        source_name TEXT,
        url TEXT,
        score REAL DEFAULT 0.0,
        reason TEXT NOT NULL,
        summary TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(raw_article_id) REFERENCES raw_articles(id) ON DELETE SET NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)

    # Seed default settings if not exists
    default_settings = {
        "ollama_model": "llama3.1:latest",
        "filter_prompt": "Drop marketing fluff, self-promotional press releases, listicles, and SEO clickbait. Prioritize engineering breakthroughs, open source systems, architectural postmortems, deep technical insights, and key developer tooling updates. Provide a signal score (1-10) and reason.",
        "max_takeaways": "5",
        "strictness_level": "high",
        "schedule_time": "07:00",
        "auto_sync_interval": "60",
        "tts_voice": "en-US-ChristopherNeural",
        "tts_speed": "+0%",
        "email_folder_path": "./newsletters"
    }

    for key, val in default_settings.items():
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, val))

    # Seed default curated RSS sources
    default_sources = [
        ("Hacker News Top Stories", "rss", "https://news.ycombinator.com/rss"),
        ("Simon Willison's Weblog", "rss", "https://simonwillison.net/atom/everything/"),
        ("GitHub Engineering", "rss", "https://github.blog/engineering/feed/"),
        ("Ars Technica - Tech", "rss", "https://feeds.arstechnica.com/arstechnica/technology-lab"),
        ("Local Newsletter Intake", "newsletter_email", "./newsletters")
    ]

    for name, stype, url in default_sources:
        cursor.execute("SELECT id FROM sources WHERE url_or_path = ?", (url,))
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO sources (name, type, url_or_path, is_active, created_at) VALUES (?, ?, ?, 1, ?)",
                (name, stype, url, datetime.utcnow().isoformat())
            )

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
