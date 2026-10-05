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

@router.get("/{course_id}/concept-map")
def get_concept_map(
    course_id: str,
    user_id: str = "demo_student",
    db: Session = Depends(get_db)
):
    from app.knowledge.graph_manager import GraphManager
    gm = GraphManager(db)
    return gm.get_course_concept_map(course_id, user_id=user_id)
