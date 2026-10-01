from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

# --- Course Schemas ---
class CourseCreate(BaseModel):
    title: str = Field(..., example="Data Structures and Algorithms")
    description: Optional[str] = Field(None, example="Core CS fundamentals course")

class CourseResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: str
    course_id: str
    title: str
    source_type: str
    file_path: str
    status: str
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Topic Hierarchy Schemas ---
class ConceptResponse(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True

class SubtopicResponse(BaseModel):
    id: str
    name: str
    concepts: List[ConceptResponse] = []

    class Config:
        from_attributes = True

class TopicResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    subtopics: List[SubtopicResponse] = []
    prerequisites: List[str] = [] # Prerequisite topic names

    class Config:
        from_attributes = True

# --- Chat & RAG Schemas ---
class ChatRequest(BaseModel):
    user_id: Optional[str] = "demo_student"
    conversation_id: Optional[str] = None
    question: str = Field(..., example="What is an AVL Tree rotation?")

class CitationSchema(BaseModel):
    source_type: str
    document_title: str
    page: Optional[int] = None
    slide: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    excerpt: Optional[str] = None

class ChatResponse(BaseModel):
    conversation_id: str
    question: str
    answer: str
    is_grounded: bool
    citations: List[CitationSchema] = []

# --- Question & Assessment Schemas ---
class QuestionGenRequest(BaseModel):
    topic_id: Optional[str] = None
    topic_name: Optional[str] = None
    difficulty: str = Field("Medium", example="Medium") # Easy, Medium, Hard
    question_count: int = Field(5, ge=1, le=20)
    question_type: str = Field("MCQ", example="MCQ") # MCQ, Short Answer, Numerical

class QuestionResponse(BaseModel):
    id: str
    topic_id: Optional[str]
    question_text: str
    question_type: str
    options: Optional[List[str]] = None
    explanation: str
    difficulty: str
    source_metadata: Dict[str, Any]

    class Config:
        from_attributes = True

class QuestionAnswerSubmit(BaseModel):
    question_id: str
    user_answer: str

class QuizSubmitRequest(BaseModel):
    user_id: Optional[str] = "demo_student"
    topic_id: Optional[str] = None
    answers: List[QuestionAnswerSubmit]

class QuizGradedAnswer(BaseModel):
    question_id: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    score: float
    explanation: str
    source_metadata: Dict[str, Any]

class QuizSubmitResponse(BaseModel):
    attempt_id: str
    total_score: float
    percentage: float
    graded_answers: List[QuizGradedAnswer]
    updated_mastery: float

# --- Mastery & Dashboard Schemas ---
class TopicMasteryItem(BaseModel):
    topic_id: str
    topic_name: str
    mastery_score: float
    questions_attempted: int
    questions_correct: int

class DashboardResponse(BaseModel):
    course_id: str
    course_title: str
    overall_progress: float
    topic_masteries: List[TopicMasteryItem]
    weak_topics: List[str]
    quizzes_completed: int
    average_score: float
    recommended_next_action: str

# --- Evaluation Schemas ---
class EvalRunResponse(BaseModel):
    total_questions: int
    faithfulness_score: float
    answer_relevancy_score: float
    context_precision_score: float
    context_recall_score: float
    details: List[Dict[str, Any]]
