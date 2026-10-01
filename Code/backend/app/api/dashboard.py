from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.repositories import Repository

router = APIRouter(prefix="/api/courses", tags=["Dashboard"])

@router.get("/{course_id}/dashboard")
def get_dashboard(course_id: str, db: Session = Depends(get_db)):
    repo = Repository(db)
    course = repo.get_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    topics = repo.get_topics_by_course(course_id)
    topic_masteries = []
    weak_topics = []
    total_mastery = 0.0

    for t in topics:
        m = repo.get_mastery("demo_student", t.id)
        score = m.mastery_score if m else 0.0
        total_mastery += score
        if score < 50.0:
            weak_topics.append(t.name)
        topic_masteries.append({
            "topic_id": t.id,
            "topic_name": t.name,
            "mastery_score": score,
            "questions_attempted": m.questions_attempted if m else 0,
            "questions_correct": m.questions_correct if m else 0
        })

    avg_progress = round(total_mastery / len(topics), 1) if topics else 0.0
    rec = f"Focus on improving '{weak_topics[0]}'" if weak_topics else "Great job! Keep practicing recent topics."

    return {
        "course_id": course.id,
        "course_title": course.title,
        "overall_progress": avg_progress,
        "topic_masteries": topic_masteries,
        "weak_topics": weak_topics,
        "quizzes_completed": 0,
        "average_score": avg_progress,
        "recommended_next_action": rec
    }
