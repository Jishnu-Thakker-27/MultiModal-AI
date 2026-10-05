from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.database.repositories import Repository
from app.schemas.schemas import CourseCreate, CourseResponse

router = APIRouter(prefix="/api/courses", tags=["Courses"])

@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    repo = Repository(db)
    user = repo.get_or_create_user()
    course = repo.create_course(title=payload.title, description=payload.description, user_id=user.id)
    return course

@router.get("", response_model=List[CourseResponse])
def list_courses(db: Session = Depends(get_db)):
    repo = Repository(db)
    return repo.get_courses()

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: str, db: Session = Depends(get_db)):
    repo = Repository(db)
    course = repo.get_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course
