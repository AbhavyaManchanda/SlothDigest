import re
import os
import email
import email.policy
from pathlib import Path
from datetime import datetime
import feedparser
from bs4 import BeautifulSoup
import httpx
from backend.database import get_db_connection

def clean_html(raw_html: str) -> str:
    """Strips boilerplate, scripts, navs, footers, and returns clean readable prose."""
    if not raw_html:
        return ""
    
    soup = BeautifulSoup(raw_html, "html.parser")

    # Remove script, style, nav, footer, ads, header tags
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form", "noscript", "svg", "iframe"]):
        tag.decompose()

    # Prefer article or main tags if present
    main_content = soup.find(["article", "main"]) or soup

    # Get text with line breaks between paragraphs
    text = main_content.get_text(separator="\n", strip=True)

    # Normalize excessive newlines and whitespace
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()

async def fetch_rss_feed(source_id: int, feed_url: str):
    """Fetches and parses an RSS or Atom feed."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("UPDATE sources SET fetch_status = 'syncing' WHERE id = ?", (source_id,))
        conn.commit()

        # Download feed using httpx for reliability
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(feed_url, headers={"User-Agent": "SlothDigest/1.0 (+https://github.com/AbhavyaManchanda/SlothDigest)"})
            resp.raise_for_status()
            feed_content = resp.text

        parsed = feedparser.parse(feed_content)
        new_count = 0

        for entry in parsed.entries[:20]: # Process latest 20 items
            title = entry.get("title", "Untitled")
            link = entry.get("link", "")
            if not link:
                continue

            author = entry.get("author", parsed.feed.get("title", "Unknown"))
            
            # Content or summary
            raw_body = ""
            if "content" in entry and len(entry.content) > 0:
                raw_body = entry.content[0].get("value", "")
            elif "summary" in entry:
                raw_body = entry.summary
            elif "description" in entry:
                raw_body = entry.description

            clean_text = clean_html(raw_body)
            pub_date = entry.get("published", entry.get("updated", datetime.utcnow().isoformat()))

            try:
                cursor.execute("""
                INSERT OR IGNORE INTO raw_articles 
                (source_id, title, author, url, raw_content, clean_text, published_at, ingested_at, processing_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                """, (source_id, title, author, link, raw_body, clean_text, pub_date, datetime.utcnow().isoformat()))
                if cursor.rowcount > 0:
                    new_count += 1
            except Exception as e:
                print(f"Error inserting article {link}: {e}")

        cursor.execute("""
        UPDATE sources 
        SET fetch_status = 'success', 
            last_fetched_at = ?, 
            error_message = NULL 
        WHERE id = ?
        """, (datetime.utcnow().isoformat(), source_id))
        conn.commit()
        return new_count

    except Exception as e:
        cursor.execute("""
        UPDATE sources 
        SET fetch_status = 'error', 
            error_message = ? 
        WHERE id = ?
        """, (str(e), source_id))
        conn.commit()
        return 0
    finally:
        conn.close()

def parse_eml_file(file_path: Path):
    """Parses a local .eml file and returns metadata and cleaned body text."""
    with open(file_path, "rb") as f:
        msg = email.message_from_binary_file(f, policy=email.policy.default)

    subject = msg.get("Subject", "No Subject")
    sender = msg.get("From", "Unknown Sender")
    date_str = msg.get("Date", datetime.utcnow().isoformat())

    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype == "text/plain":
                body = part.get_content()
                break
            elif ctype == "text/html":
                body = clean_html(part.get_content())
    else:
        content = msg.get_content()
        if msg.get_content_type() == "text/html":
            body = clean_html(content)
        else:
            body = content

    return {
        "title": subject,
        "author": sender,
        "clean_text": body.strip(),
        "date": date_str
    }

def sync_local_newsletter_folder(source_id: int, folder_path: str):
    """Scans a local directory for .eml newsletter files and ingests them."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    path = Path(folder_path)
    if not path.is_absolute():
        path = (Path(__file__).resolve().parent.parent.parent / folder_path).resolve()
        
    path.mkdir(parents=True, exist_ok=True)

    # If folder is empty, create a sample high-signal newsletter to give immediate value
    sample_eml = path / "sample_system_architecture_weekly.eml"
    if not any(path.glob("*.eml")):
        with open(sample_eml, "w", encoding="utf-8") as f:
            f.write("""From: "Architecture Weekly" <digest@systemsweekly.org>
To: reader@slothdigest.local
Subject: Systems Digest: Zero-Copy Serialization & Distributed Consensus
Date: Sun, 25 Oct 2026 09:30:00 +0000
Content-Type: text/plain; charset=utf-8

Welcome to Architecture Weekly Issue #142.

Top Stories:
1. Moving from JSON to FlatBuffers for High-Throughput Microservices:
A deep dive into how teams eliminated deserialization bottlenecks, slashing CPU cycles by 40% in large-scale event processing pipelines.

2. Raft vs Paxos in Edge Kubernetes:
Exploring lightweight consensus algorithms adapted for flaky edge node networks with minimal memory footprints.
""")

    new_count = 0
    try:
        for eml_file in path.glob("*.eml"):
            parsed = parse_eml_file(eml_file)
            file_url = f"file:///{eml_file.as_posix()}"
            cursor.execute("""
            INSERT OR IGNORE INTO raw_articles
            (source_id, title, author, url, raw_content, clean_text, published_at, ingested_at, processing_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            """, (source_id, parsed["title"], parsed["author"], file_url, parsed["clean_text"], parsed["clean_text"], parsed["date"], datetime.utcnow().isoformat()))
            if cursor.rowcount > 0:
                new_count += 1

        cursor.execute("""
        UPDATE sources 
        SET fetch_status = 'success', 
            last_fetched_at = ?, 
            error_message = NULL 
        WHERE id = ?
        """, (datetime.utcnow().isoformat(), source_id))
        conn.commit()
    except Exception as e:
        cursor.execute("UPDATE sources SET fetch_status = 'error', error_message = ? WHERE id = ?", (str(e), source_id))
        conn.commit()
    finally:
        conn.close()

    return new_count

async def sync_all_active_sources():
    """Syncs all active RSS feeds and email directories."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, type, url_or_path FROM sources WHERE is_active = 1")
    sources = cursor.fetchall()
    conn.close()

    results = {}
    for s in sources:
        sid, stype, url = s["id"], s["type"], s["url_or_path"]
        if stype == "rss":
            count = await fetch_rss_feed(sid, url)
            results[sid] = count
        elif stype == "newsletter_email":
            count = sync_local_newsletter_folder(sid, url)
            results[sid] = count

    return results
