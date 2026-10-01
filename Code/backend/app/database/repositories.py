from sqlalchemy.orm import Session
from app.database.models import (
    User, Course, Document, DocumentChunk, Topic, Subtopic, Concept,
    Question, QuizAttempt, QuizAnswer, LearnerMastery, Conversation, Message
)
from typing import List, Optional, Dict, Any

class Repository:
    def __init__(self, db: Session):
        self.db = db

    # --- User ---
    def get_or_create_user(self, user_id: str = "demo_student", email: str = "student@demo.com", name: str = "Demo Student") -> User:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(id=user_id, email=email, name=name)
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        return user

    # --- Course ---
    def create_course(self, title: str, description: Optional[str] = None, user_id: Optional[str] = None) -> Course:
        course = Course(title=title, description=description, created_by=user_id)
        self.db.add(course)
        self.db.commit()
        self.db.refresh(course)
        return course

    def get_courses(self) -> List[Course]:
        return self.db.query(Course).order_by(Course.created_at.desc()).all()

    def get_course(self, course_id: str) -> Optional[Course]:
        return self.db.query(Course).filter(Course.id == course_id).first()

    # --- Documents ---
    def create_document(self, course_id: str, title: str, source_type: str, file_path: str) -> Document:
        doc = Document(course_id=course_id, title=title, source_type=source_type, file_path=file_path)
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def get_documents_by_course(self, course_id: str) -> List[Document]:
        return self.db.query(Document).filter(Document.course_id == course_id).all()

    def update_document_status(self, document_id: str, status: str, error_message: Optional[str] = None):
        doc = self.db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = status
            doc.error_message = error_message
            self.db.commit()

    # --- Chunks ---
    def add_chunks(self, chunks: List[Dict[str, Any]]):
        chunk_objs = []
        for c in chunks:
            chunk_objs.append(DocumentChunk(
                document_id=c['document_id'],
                course_id=c['course_id'],
                chunk_index=c['chunk_index'],
                content=c['content'],
                source_type=c['source_type'],
                page_number=c.get('page_number'),
                slide_number=c.get('slide_number'),
                start_time=c.get('start_time'),
                end_time=c.get('end_time'),
                topic=c.get('topic'),
                subtopic=c.get('subtopic'),
                concept=c.get('concept'),
                embedding=c.get('embedding')
            ))
        self.db.bulk_save_objects(chunk_objs)
        self.db.commit()

    def get_chunks_by_course(self, course_id: str) -> List[DocumentChunk]:
        return self.db.query(DocumentChunk).filter(DocumentChunk.course_id == course_id).all()

    # --- Topics ---
    def get_topics_by_course(self, course_id: str) -> List[Topic]:
        return self.db.query(Topic).filter(Topic.course_id == course_id).all()

    def get_topic_by_id(self, topic_id: str) -> Optional[Topic]:
        return self.db.query(Topic).filter(Topic.id == topic_id).first()

    def save_topic_structure(self, course_id: str, topic_tree: List[Dict[str, Any]]):
        # Clear existing for fresh ingestion update
        existing = self.db.query(Topic).filter(Topic.course_id == course_id).all()
        for t in existing:
            self.db.delete(t)
        self.db.commit()

        for t_data in topic_tree:
            topic = Topic(course_id=course_id, name=t_data['name'], description=t_data.get('description'))
            self.db.add(topic)
            self.db.flush()

            for st_data in t_data.get('subtopics', []):
                subtopic = Subtopic(topic_id=topic.id, name=st_data['name'])
                self.db.add(subtopic)
                self.db.flush()

                for conc_name in st_data.get('concepts', []):
                    conc = Concept(subtopic_id=subtopic.id, name=conc_name if isinstance(conc_name, str) else conc_name.get('name', ''))
                    self.db.add(conc)
        self.db.commit()

    # --- Learner Mastery ---
    def get_mastery(self, user_id: str, topic_id: str) -> Optional[LearnerMastery]:
        return self.db.query(LearnerMastery).filter(
            LearnerMastery.user_id == user_id,
            LearnerMastery.topic_id == topic_id
        ).first()

    def update_mastery(self, user_id: str, topic_id: str, delta_score: float, is_correct: bool):
        mastery = self.get_mastery(user_id, topic_id)
        if not mastery:
            mastery = LearnerMastery(
                user_id=user_id,
                topic_id=topic_id,
                mastery_score=50.0 if is_correct else 25.0,
                questions_attempted=1,
                questions_correct=1 if is_correct else 0
            )
            self.db.add(mastery)
        else:
            mastery.questions_attempted += 1
            if is_correct:
                mastery.questions_correct += 1
            
            # Simple transparent exponential moving average update
            alpha = 0.3
            target = 100.0 if is_correct else 0.0
            mastery.mastery_score = round((1 - alpha) * mastery.mastery_score + alpha * target, 1)
        self.db.commit()
        return mastery.mastery_score
