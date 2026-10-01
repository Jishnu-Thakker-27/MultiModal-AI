from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.repositories import Repository

router = APIRouter(prefix="/api/courses", tags=["Topics"])

@router.get("/{course_id}/topics")
def get_topics(course_id: str, db: Session = Depends(get_db)):
    repo = Repository(db)
    topics = repo.get_topics_by_course(course_id)
    return topics
