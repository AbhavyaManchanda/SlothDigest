import json
import re
import os
import httpx
from datetime import datetime
from typing import List, Dict, Any, Tuple
from backend.database import get_db_connection

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

async def get_ollama_models() -> List[Dict[str, Any]]:
    """Fetches list of locally installed Ollama models."""
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = data.get("models", [])
                return [{"name": m.get("name"), "size": m.get("size"), "modified_at": m.get("modified_at")} for m in models]
    except Exception as e:
        print(f"Ollama connection error: {e}")
    return []

def get_setting(key: str, default: str = "") -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default

def heuristic_filter(title: str, text: str, source_name: str) -> Dict[str, Any]:
    """Fallback local signal extractor when Ollama is offline or as a pre-filter."""
    lower_title = title.lower()
    lower_text = (text[:1000] if text else "").lower()
    combined = lower_title + " " + lower_text

    # Fluff / marketing detection
    fluff_triggers = [
        "giveaway", "discount", "black friday", "cyber monday", "deal alert", 
        "sponsored by", "limited time offer", "unboxing", "review: why you should buy",
        "save $", "% off", "join our webinar", "sign up for free trial", "top 10 gadgets"
    ]
    for trigger in fluff_triggers:
        if trigger in combined:
            return {
                "decision": "reject",
                "score": 2.5,
                "reason": f"Marketing fluff / Promotional trigger: '{trigger}'",
                "category": "Marketing Fluff",
                "summary": "Identified as promotional sales copy or non-engineering sponsor content."
            }

    # Short / empty content
    if len(text.strip()) < 80 and not ("github.com" in lower_title or "release" in lower_title):
        return {
            "decision": "reject",
            "score": 3.0,
            "reason": "Low information density (stub or link aggregator entry)",
            "category": "Low Density",
            "summary": "Text contains fewer than 80 characters without technical depth."
        }

    # Technical signal words
    tech_triggers = [
        "architecture", "distributed", "database", "rust", "python", "golang",
        "performance", "latency", "benchmark", "compiler", "kernel", "memory",
        "security", "vulnerability", "cve", "postmortem", "zero-copy", "algorithm",
        "ai", "llm", "inference", "quantization", "fastapi", "kubernetes", "linux"
    ]
    signal_hits = sum(1 for word in tech_triggers if word in combined)
    score = min(9.8, round(5.5 + (signal_hits * 0.7), 1))

    # Determine category
    category = "Engineering"
    if any(k in combined for k in ["ai", "llm", "model", "inference", "weights"]):
        category = "AI & ML Systems"
    elif any(k in combined for k in ["security", "cve", "exploit", "patch"]):
        category = "Security & Reliability"
    elif any(k in combined for k in ["architecture", "consensus", "distributed", "raft"]):
        category = "Distributed Systems"
    elif any(k in combined for k in ["performance", "benchmark", "speed", "zero-copy"]):
        category = "Performance & Optimization"

    tldr = f"{title}. Focuses on {category.lower()} improvements and technical takeaways."
    bullets = [
        f"Analyzed core architectural patterns related to {category.lower()}.",
        "Provides concrete implementation details without marketing fluff."
    ]

    return {
        "decision": "keep",
        "score": score,
        "category": category,
        "tldr": tldr,
        "key_takeaways": bullets,
        "why_it_matters": "Directly impacts developer workflow and system reliability."
    }

async def call_ollama_filter(title: str, text: str, source_name: str, model: str, custom_prompt: str) -> Dict[str, Any]:
    """Invokes local Ollama instance with structured JSON evaluation prompt."""
    snippet = text[:1500] if text else title
    prompt = f"""You are the core intelligence of 'SlothDigest', a strict zero-effort local RSS and newsletter curator.
Your job is to ruthlessly filter out marketing fluff, sales pitches, clickbait, and shallow listicles.
Keep ONLY high-signal engineering breakthroughs, deep architectural insights, security postmortems, and crucial developer tooling releases.

USER FILTERING CRITERIA:
"{custom_prompt}"

ARTICLE TO EVALUATE:
Source: {source_name}
Title: {title}
Content:
{snippet}

Respond ONLY with valid JSON in this exact structure:
{{
  "decision": "keep" or "reject",
  "score": <float from 1.0 to 10.0>,
  "reason": "<if rejected, exact short reason why; if kept, short reason why>",
  "category": "<e.g. Systems Architecture, AI & ML, Developer Tools, Security, Cloud>",
  "reading_time": "<e.g. 3 min>",
  "tldr": "<one concise punchy sentence summarizing the technical breakthrough>",
  "key_takeaways": [
    "<bullet point 1 detailing technical mechanics>",
    "<bullet point 2 detailing performance or real impact>"
  ],
  "why_it_matters": "<1 sentence on developer or architectural significance>"
}}"""

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 350
                    }
                }
            )
            if resp.status_code == 200:
                result = resp.json()
                raw_response = result.get("response", "")
                # Parse JSON
                parsed = json.loads(raw_response)
                return parsed
    except Exception as e:
        print(f"Ollama call failed or timed out ({e}), falling back to heuristic engine.")

    # Fallback to local heuristic
    return heuristic_filter(title, text, source_name)

async def run_sloth_curation(model: str = None, custom_prompt: str = None, max_items: int = 5) -> Dict[str, Any]:
    """Processes pending articles through the Sloth Filter Engine and generates today's digest."""
    conn = get_db_connection()
    cursor = conn.cursor()

    if not model:
        model = get_setting("ollama_model", "llama3.1:latest")
    if not custom_prompt:
        custom_prompt = get_setting("filter_prompt", "Drop marketing fluff, keep engineering breakthroughs and key product releases.")

    # Grab pending articles
    cursor.execute("""
    SELECT a.id, a.title, a.author, a.url, a.clean_text, a.published_at, s.name as source_name
    FROM raw_articles a
    JOIN sources s ON a.source_id = s.id
    WHERE a.processing_status = 'pending'
    ORDER BY a.id DESC
    LIMIT 25
    """)
    articles = cursor.fetchall()

    if not articles:
        # If no pending, inspect recent articles
        cursor.execute("""
        SELECT a.id, a.title, a.author, a.url, a.clean_text, a.published_at, s.name as source_name
        FROM raw_articles a
        JOIN sources s ON a.source_id = s.id
        ORDER BY a.id DESC
        LIMIT 15
        """)
        articles = cursor.fetchall()

    kept_items = []
    rejected_count = 0
    kept_count = 0

    for art in articles:
        aid = art["id"]
        title = art["title"]
        text = art["clean_text"] or ""
        source_name = art["source_name"]
        url = art["url"]

        evaluation = await call_ollama_filter(title, text, source_name, model, custom_prompt)
        decision = evaluation.get("decision", "reject").lower()
        score = float(evaluation.get("score", 5.0))
        reason = evaluation.get("reason", "Filtered by Sloth engine.")

        if decision == "keep" and score >= 6.0:
            kept_count += 1
            cursor.execute("UPDATE raw_articles SET processing_status = 'kept' WHERE id = ?", (aid,))
            
            takeaway = {
                "id": str(aid),
                "title": title,
                "source_name": source_name,
                "url": url,
                "category": evaluation.get("category", "Engineering"),
                "signal_score": score,
                "reading_time": evaluation.get("reading_time", "3 min"),
                "tldr": evaluation.get("tldr", title),
                "key_takeaways": evaluation.get("key_takeaways", ["High signal developer content."]),
                "why_it_matters": evaluation.get("why_it_matters", "Valuable for modern software engineering stacks.")
            }
            kept_items.append(takeaway)
        else:
            rejected_count += 1
            cursor.execute("UPDATE raw_articles SET processing_status = 'rejected' WHERE id = ?", (aid,))
            cursor.execute("""
            INSERT INTO rejection_logs (raw_article_id, title, source_name, url, score, reason, summary, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (aid, title, source_name, url, score, reason, evaluation.get("summary", reason), datetime.utcnow().isoformat()))

    # Sort kept items by highest signal score and select top 3-5
    kept_items.sort(key=lambda x: x["signal_score"], reverse=True)
    top_takeaways = kept_items[:max_items]

    # Generate audio script
    today_str = datetime.now().strftime("%A, %B %d, %Y")
    script_lines = [
        f"Good morning. Here is your SlothDigest curated briefing for {today_str}.",
        f"Today we filtered through {len(articles)} incoming articles and dropped {rejected_count} marketing pieces to bring you the top {len(top_takeaways)} high-signal breakthroughs."
    ]

    for idx, item in enumerate(top_takeaways, 1):
        script_lines.append(f"Number {idx}, from {item['source_name']}: {item['title']}. {item['tldr']} Key impact: {item['why_it_matters']}")

    script_lines.append("That concludes today's high-signal briefing. Back to deep focus.")
    full_script = " ".join(script_lines)

    # Save digest record
    digest_title = f"SlothDigest — {datetime.now().strftime('%b %d, %Y')}"
    cursor.execute("""
    INSERT INTO digests 
    (date, title, model_used, prompt_used, takeaways_json, total_raw_items, kept_items_count, rejected_items_count, briefing_script, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        datetime.utcnow().strftime("%Y-%m-%d"),
        digest_title,
        model,
        custom_prompt,
        json.dumps(top_takeaways),
        len(articles),
        len(top_takeaways),
        rejected_count,
        full_script,
        datetime.utcnow().isoformat()
    ))
    digest_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "digest_id": digest_id,
        "title": digest_title,
        "takeaways": top_takeaways,
        "total_evaluated": len(articles),
        "kept_count": len(top_takeaways),
        "rejected_count": rejected_count,
        "briefing_script": full_script
    }
