import os
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(ROOT_DIR)

# Load .env from backend folder or project root
load_dotenv(os.path.join(ROOT_DIR, ".env"))
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
load_dotenv()

CANONICAL_SQLITE_PATH = f"sqlite:///{os.path.join(PROJECT_ROOT, 'study_companion.db').replace(chr(92), '/')}"

class Settings(BaseModel):
    PROJECT_NAME: str = "AI Study Companion API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/study_companion")
    SQLITE_FALLBACK: bool = os.getenv("SQLITE_FALLBACK", "true").lower() == "true"
    SQLITE_DB_PATH: str = os.getenv("SQLITE_DB_PATH", CANONICAL_SQLITE_PATH)
    
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    # Keep the legacy provider-specific setting, but make the documented LLM_MODEL
    # setting the effective default for tutor chat as well.
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", os.getenv("LLM_MODEL", "gpt-4o-mini"))
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    ALLOW_DETERMINISTIC_EMBEDDINGS: bool = os.getenv("ALLOW_DETERMINISTIC_EMBEDDINGS", "false").lower() == "true"
    
    # Provider-Agnostic Multi-LLM Architecture Settings
    LLM_PROVIDER_PRIORITY: str = os.getenv("LLM_PROVIDER_PRIORITY", "openai,gemini,openrouter,ollama")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")


    OPENROUTER_API_KEY: Optional[str] = os.getenv("OPENROUTER_API_KEY", None)
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3")
    OLLAMA_ENABLED: bool = os.getenv("OLLAMA_ENABLED", "false").lower() == "true"
    
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "500"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "50"))
    
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
