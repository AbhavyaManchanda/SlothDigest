from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SourceBase(BaseModel):
    name: str
    type: str = Field(default="rss", description="'rss', 'newsletter_email', 'link'")
    url_or_path: str
    is_active: bool = True

class SourceCreate(SourceBase):
    pass

class SourceUpdate(BaseModel):
    name: Optional[str] = None
    url_or_path: Optional[str] = None
    is_active: Optional[bool] = None

class SourceResponse(SourceBase):
    id: int
    last_fetched_at: Optional[str] = None
    fetch_status: Optional[str] = "idle"
    error_message: Optional[str] = None
    created_at: str
    article_count: Optional[int] = 0

class TakeawayItem(BaseModel):
    id: Optional[str] = None
    title: str
    source_name: str
    url: Optional[str] = None
    category: str = "Engineering" # e.g., 'Architecture', 'AI & ML', 'Tooling', 'Security'
    signal_score: float = 9.0
    reading_time: str = "3 min"
    tldr: str
    key_takeaways: List[str]
    why_it_matters: str

class DigestResponse(BaseModel):
    id: int
    date: str
    title: str
    audio_filename: Optional[str] = None
    audio_url: Optional[str] = None
    model_used: Optional[str] = None
    prompt_used: Optional[str] = None
    takeaways: List[TakeawayItem]
    total_raw_items: int = 0
    kept_items_count: int = 0
    rejected_items_count: int = 0
    briefing_script: Optional[str] = None
    created_at: str

class RejectionLogResponse(BaseModel):
    id: int
    raw_article_id: Optional[int] = None
    title: str
    source_name: Optional[str] = None
    url: Optional[str] = None
    score: float
    reason: str
    summary: Optional[str] = None
    created_at: str

class SettingsUpdate(BaseModel):
    ollama_model: Optional[str] = None
    filter_prompt: Optional[str] = None
    max_takeaways: Optional[str] = None
    strictness_level: Optional[str] = None
    schedule_time: Optional[str] = None
    auto_sync_interval: Optional[str] = None
    tts_voice: Optional[str] = None
    tts_speed: Optional[str] = None
    email_folder_path: Optional[str] = None

class DigestGenerateRequest(BaseModel):
    model: Optional[str] = None
    custom_prompt: Optional[str] = None
    max_items: Optional[int] = 5

class OllamaModelInfo(BaseModel):
    name: str
    size: Optional[int] = None
    modified_at: Optional[str] = None
