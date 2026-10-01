import os
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "AI Study Companion API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/study_companion")
    SQLITE_FALLBACK: bool = os.getenv("SQLITE_FALLBACK", "true").lower() == "true"
    SQLITE_DB_PATH: str = os.getenv("SQLITE_DB_PATH", "sqlite:///./study_companion.db")
    
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "500"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "50"))
    
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
