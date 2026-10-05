from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.evaluation.evaluator import run_system_evaluation

router = APIRouter(prefix="/api/evaluation", tags=["Evaluation"])

@router.post("/run")
def run_evaluation(db: Session = Depends(get_db)):
    return run_system_evaluation(db)
