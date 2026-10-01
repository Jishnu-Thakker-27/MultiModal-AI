from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.database.models import Base
import logging

logger = logging.getLogger("study_companion.db")

engine = None

try:
    if settings.DATABASE_URL and "postgresql" in settings.DATABASE_URL and not settings.SQLITE_FALLBACK:
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        # Test connection
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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
