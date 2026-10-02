from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import settings
from app.database.session import init_db
from app.api import (
    courses, documents, chat, topics, assessments, mastery, dashboard, evaluation
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("study_companion")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Source-Grounded AI Study Companion API"
)

# CORS middleware for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    logger.info("Initializing database tables...")
    init_db()
    logger.info("Database initialized successfully.")

import os
from fastapi.staticfiles import StaticFiles

if not os.path.exists(settings.UPLOAD_DIR):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs_url": "/docs"
    }

# Register Routers
app.include_router(courses.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(topics.router)
app.include_router(assessments.router)
app.include_router(mastery.router)
app.include_router(dashboard.router)
app.include_router(evaluation.router)
