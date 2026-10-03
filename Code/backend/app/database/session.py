from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.database.models import Base
import logging

logger = logging.getLogger("study_companion.db")

engine = None

try:
    if settings.DATABASE_URL and "postgresql" in settings.DATABASE_URL and not settings.SQLITE_FALLBACK:
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as conn:
            pass
        logger.info("Connected to PostgreSQL database.")
    else:
        raise Exception("Using SQLite fallback as configured or failed Postgres connection.")
except Exception as e:
    logger.info(f"PostgreSQL connection not active ({e}). Initializing SQLite database...")
    engine = create_engine(
        settings.SQLITE_DB_PATH,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    # Migrate columns if missing in SQLite
    for stmt in [
        "ALTER TABLE questions ADD COLUMN source_chunk_ids JSON",
        "ALTER TABLE conversations ADD COLUMN user_id VARCHAR(255)",
        "ALTER TABLE conversations ADD COLUMN course_id VARCHAR(255)",
        "ALTER TABLE conversations ADD COLUMN topic_name VARCHAR(255)",
        "ALTER TABLE conversations ADD COLUMN status VARCHAR(50) DEFAULT 'active'",
        "ALTER TABLE conversations ADD COLUMN updated_at DATETIME",
        "ALTER TABLE document_chunks ADD COLUMN concept_node_id VARCHAR(36)",
        "ALTER TABLE document_chunks ADD COLUMN heading VARCHAR(255)",
        "ALTER TABLE document_chunks ADD COLUMN section VARCHAR(255)",
        "ALTER TABLE document_chunks ADD COLUMN page_end INTEGER",
        "ALTER TABLE document_chunks ADD COLUMN page_type VARCHAR(50) DEFAULT 'TEXT'"
    ]:
        try:
            with engine.connect() as conn:
                conn.execute(text(stmt))
                conn.commit()
        except Exception:
            pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
