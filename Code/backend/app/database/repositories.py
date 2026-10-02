import json
from sqlalchemy.orm import Session
from sqlalchemy import func
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

    def delete_document(self, document_id: str) -> bool:
        import os
        doc = self.db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return False
        # Delete associated chunks
        self.db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
        # Delete file from local filesystem if exists
        if doc.file_path and os.path.exists(doc.file_path):
            try:
                os.remove(doc.file_path)
            except Exception:
                pass
        self.db.delete(doc)
        self.db.commit()
        return True

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
        for t_data in topic_tree:
            t_name = t_data['name']
            topic = self.db.query(Topic).filter(
                Topic.course_id == course_id,
                Topic.name == t_name
            ).first()

            if not topic:
                topic = Topic(course_id=course_id, name=t_name, description=t_data.get('description'))
                self.db.add(topic)
                self.db.flush()

            for st_data in t_data.get('subtopics', []):
                st_name = st_data['name']
                subtopic = self.db.query(Subtopic).filter(
                    Subtopic.topic_id == topic.id,
                    Subtopic.name == st_name
                ).first()

                if not subtopic:
                    subtopic = Subtopic(topic_id=topic.id, name=st_name)
                    self.db.add(subtopic)
                    self.db.flush()

                for conc_name in st_data.get('concepts', []):
                    c_name = conc_name if isinstance(conc_name, str) else conc_name.get('name', '')
                    existing_conc = self.db.query(Concept).filter(
                        Concept.subtopic_id == subtopic.id,
                        Concept.name == c_name
                    ).first()
                    if not existing_conc:
                        conc = Concept(subtopic_id=subtopic.id, name=c_name)
                        self.db.add(conc)
        self.db.commit()

    # --- Questions ---
    def save_question(self, course_id: str, question_text: str, question_type: str, options: Optional[List[str]], correct_answer: str, explanation: str, difficulty: str, source_metadata: Dict[str, Any], topic_id: Optional[str] = None, source_chunk_ids: Optional[List[str]] = None) -> Question:
        q = Question(
            course_id=course_id,
            topic_id=topic_id,
            question_text=question_text,
            question_type=question_type,
            options=options,
            correct_answer=correct_answer,
            explanation=explanation,
            difficulty=difficulty,
            is_verified=True,
            source_metadata=source_metadata,
            source_chunk_ids=source_chunk_ids
        )
        self.db.add(q)
        self.db.commit()
        self.db.refresh(q)
        return q

    def get_question(self, question_id: str) -> Optional[Question]:
        return self.db.query(Question).filter(Question.id == question_id).first()

    # --- Quiz Attempts & Answers ---
    def create_quiz_attempt(self, user_id: str, course_id: str, total_score: float, topic_id: Optional[str] = None) -> QuizAttempt:
        attempt = QuizAttempt(user_id=user_id, course_id=course_id, topic_id=topic_id, total_score=total_score)
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)
        return attempt

    def save_quiz_answer(self, attempt_id: str, question_id: str, user_answer: str, is_correct: bool, score: float, feedback: str) -> QuizAnswer:
        ans = QuizAnswer(
            attempt_id=attempt_id,
            question_id=question_id,
            user_answer=user_answer,
            is_correct=is_correct,
            score=score,
            feedback=feedback
        )
        self.db.add(ans)
        self.db.commit()
        self.db.refresh(ans)
        return ans

    def get_quiz_attempts_count(self, course_id: str) -> int:
        return self.db.query(QuizAttempt).filter(QuizAttempt.course_id == course_id).count()

    def get_average_quiz_score(self, course_id: str) -> float:
        avg = self.db.query(func.avg(QuizAttempt.total_score)).filter(QuizAttempt.course_id == course_id).scalar()
        return round(float(avg), 1) if avg is not None else 0.0

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
            
            alpha = 0.3
            target = 100.0 if is_correct else 0.0
            mastery.mastery_score = round((1 - alpha) * mastery.mastery_score + alpha * target, 1)
        self.db.commit()
        return mastery.mastery_score

    # --- Conversation & Messages Persistence ---
    def get_or_create_conversation(self, course_id: str, conversation_id: Optional[str] = None, user_id: str = "demo_student") -> Conversation:
        if conversation_id:
            conv = self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if conv:
                return conv
        conv = self.db.query(Conversation).filter(Conversation.course_id == course_id, Conversation.user_id == user_id).first()
        if not conv:
            conv = Conversation(course_id=course_id, user_id=user_id, title="Course Tutor Chat")
            self.db.add(conv)
            self.db.commit()
            self.db.refresh(conv)
        return conv

    def save_chat_messages(self, conversation_id: str, user_text: str, bot_text: str, citations: List[Dict[str, Any]]):
        msg_user = Message(conversation_id=conversation_id, sender="user", content=user_text)
        msg_bot = Message(conversation_id=conversation_id, sender="assistant", content=bot_text, citations=citations)
        self.db.add(msg_user)
        self.db.add(msg_bot)
        self.db.commit()

    def get_conversation_history(self, course_id: str, user_id: str = "demo_student") -> List[Dict[str, Any]]:
        conv = self.db.query(Conversation).filter(Conversation.course_id == course_id, Conversation.user_id == user_id).first()
        if not conv:
            return []
        msgs = self.db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.asc()).all()
        return [
            {
                "id": m.id,
                "sender": m.sender,
                "content": m.content,
                "citations": m.citations or [],
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in msgs
        ]
