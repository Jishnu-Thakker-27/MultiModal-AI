from fastapi import APIRouter

router = APIRouter(prefix="/api/evaluation", tags=["Evaluation"])

@router.post("/run")
def run_evaluation_placeholder():
    return {
        "status": "ready",
        "message": "Evaluation suite endpoint ready to run RAGAS/DeepEval benchmarks"
    }
