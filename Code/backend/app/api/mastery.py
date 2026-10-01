from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.repositories import Repository

router = APIRouter(prefix="/api/courses", tags=["Mastery"])

@router.get("/{course_id}/mastery")
def get_course_mastery(course_id: str, db: Session = Depends(get_db)):
    repo = Repository(db)
    topics = repo.get_topics_by_course(course_id)
    masteries = []
    for t in topics:
        m = repo.get_mastery("demo_student", t.id)
        masteries.append({
            "topic_id": t.id,
            "topic_name": t.name,
            "mastery_score": m.mastery_score if m else 0.0,
            "questions_attempted": m.questions_attempted if m else 0,
            "questions_correct": m.questions_correct if m else 0
        })
    return masteries
