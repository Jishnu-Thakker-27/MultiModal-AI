import json
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.models import (
    User, Course, Document, DocumentChunk, Topic, Subtopic, Concept,
    Question, QuizAttempt, QuizAnswer, LearnerMastery, Conversation, Message, ConversationSource,
    ConceptGraphNode, ConceptRelationship, ConceptMastery, LearnerMisconception
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
                course_id=c.get('course_id'),
                chunk_index=c.get('chunk_index', 0),
                content=c['content'],
                source_type=c.get('source_type', 'pdf'),
                page_number=c.get('page_number'),
                slide_number=c.get('slide_number'),
                start_time=c.get('start_time'),
                end_time=c.get('end_time'),
                topic=c.get('topic'),
                subtopic=c.get('subtopic'),
                concept=c.get('concept'),
                heading=c.get('heading'),
                section=c.get('section'),
                page_end=c.get('page_end'),
                page_type=c.get('page_type', 'TEXT'),
                visual_image_path=c.get('visual_image_path'),
                formula_latex=c.get('formula_latex'),
                entity_ids=c.get('entity_ids'),
                embedding=c.get('embedding')
            ))
        self.db.bulk_save_objects(chunk_objs)
        self.db.commit()

    def bulk_create_chunks(self, document_id: str, course_id: str, chunks_data: List[Dict[str, Any]]):
        formatted = []
        for idx, c in enumerate(chunks_data):
            formatted.append({
                "document_id": document_id,
                "course_id": course_id,
                "chunk_index": idx,
                "content": c.get("content", ""),
                "source_type": c.get("source_type", "pdf"),
                "page_number": c.get("page_number"),
                "slide_number": c.get("slide_number"),
                "start_time": c.get("start_time"),
                "end_time": c.get("end_time"),
                "topic": c.get("topic"),
                "subtopic": c.get("subtopic"),
                "concept": c.get("concept"),
                "heading": c.get("heading"),
                "section": c.get("section"),
                "page_end": c.get("page_end"),
                "page_type": c.get("page_type", "TEXT"),
                "visual_image_path": c.get("visual_image_path"),
                "formula_latex": c.get("formula_latex"),
                "entity_ids": c.get("entity_ids"),
                "embedding": c.get("embedding")
            })
        self.add_chunks(formatted)

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
        self.db.refresh(mastery)
        return mastery.mastery_score

    # --- Learner Misconceptions & Weaknesses ---
    def get_user_misconceptions(self, user_id: str, concept_id: Optional[str] = None, unresolved_only: bool = True) -> List[LearnerMisconception]:
        query = self.db.query(LearnerMisconception).filter(LearnerMisconception.user_id == user_id)
        if concept_id:
            query = query.filter(LearnerMisconception.concept_id == concept_id)
        if unresolved_only:
            query = query.filter(LearnerMisconception.is_resolved == False)
        return query.order_by(LearnerMisconception.detected_at.desc()).all()

    def record_misconception(self, user_id: str, misconception_text: str, concept_id: Optional[str] = None, severity: str = "moderate") -> LearnerMisconception:
        existing = self.db.query(LearnerMisconception).filter(
            LearnerMisconception.user_id == user_id,
            LearnerMisconception.misconception_text == misconception_text,
            LearnerMisconception.is_resolved == False
        ).first()

        if existing:
            existing.occurrence_count += 1
            existing.detected_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing)
            return existing

        misc = LearnerMisconception(
            user_id=user_id,
            concept_id=concept_id,
            misconception_text=misconception_text,
            severity=severity,
            occurrence_count=1,
            is_resolved=False,
            detected_at=datetime.utcnow()
        )
        self.db.add(misc)
        self.db.commit()
        self.db.refresh(misc)
        return misc

    def resolve_misconception(self, misconception_id: str) -> bool:
        misc = self.db.query(LearnerMisconception).filter(LearnerMisconception.id == misconception_id).first()
        if not misc:
            return False
        misc.is_resolved = True
        misc.last_addressed_at = datetime.utcnow()
        self.db.commit()
        return True

    def get_learner_profile(self, user_id: str = "demo_student", course_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Aggregates persistent learner profile state:
        - topic masteries
        - weak topics (mastery < 50)
        - strong topics (mastery >= 75)
        - active misconceptions
        - concept masteries
        """
        masteries = self.db.query(LearnerMastery).filter(LearnerMastery.user_id == user_id).all()
        concept_masteries = self.db.query(ConceptMastery).filter(ConceptMastery.user_id == user_id).all()
        misconceptions = self.get_user_misconceptions(user_id=user_id, unresolved_only=True)

        weak_topics = []
        strong_topics = []
        topic_scores = {}
        for m in masteries:
            topic = self.db.query(Topic).filter(Topic.id == m.topic_id).first()
            t_name = topic.name if topic else "General"
            topic_scores[t_name] = m.mastery_score
            if m.mastery_score < 50.0:
                weak_topics.append({"topic_id": m.topic_id, "topic_name": t_name, "score": m.mastery_score})
            elif m.mastery_score >= 75.0:
                strong_topics.append({"topic_id": m.topic_id, "topic_name": t_name, "score": m.mastery_score})

        return {
            "user_id": user_id,
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "topic_scores": topic_scores,
            "concept_masteries": {cm.concept_id: cm.mastery_score for cm in concept_masteries},
            "active_misconceptions": [
                {
                    "id": misc.id,
                    "concept_id": misc.concept_id,
                    "text": misc.misconception_text,
                    "severity": misc.severity,
                    "count": misc.occurrence_count
                } for misc in misconceptions
            ]
        }
    def create_conversation(self, title: str = "New Conversation", user_id: str = "demo_student", course_id: Optional[str] = None, topic_name: Optional[str] = None) -> Conversation:
        conv = Conversation(
            user_id=user_id,
            course_id=course_id,
            title=title,
            topic_name=topic_name
        )
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def get_conversations(self, user_id: str = "demo_student") -> List[Conversation]:
        return self.db.query(Conversation).filter(
            Conversation.user_id == user_id
        ).order_by(Conversation.updated_at.desc()).all()

    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        return self.db.query(Conversation).filter(Conversation.id == conversation_id).first()

    def update_conversation(self, conversation_id: str, title: Optional[str] = None, topic_name: Optional[str] = None):
        conv = self.get_conversation(conversation_id)
        if conv:
            if title:
                conv.title = title
            if topic_name:
                conv.topic_name = topic_name
            self.db.commit()
            self.db.refresh(conv)
        return conv

    def delete_conversation(self, conversation_id: str) -> bool:
        conv = self.get_conversation(conversation_id)
        if not conv:
            return False
        self.db.delete(conv)
        self.db.commit()
        return True

    def attach_document_to_conversation(self, conversation_id: str, document_id: str) -> ConversationSource:
        existing = self.db.query(ConversationSource).filter(
            ConversationSource.conversation_id == conversation_id,
            ConversationSource.document_id == document_id
        ).first()
        if not existing:
            existing = ConversationSource(conversation_id=conversation_id, document_id=document_id)
            self.db.add(existing)
            self.db.commit()
            self.db.refresh(existing)
        return existing

    def get_conversation_documents(self, conversation_id: str) -> List[Document]:
        sources = self.db.query(ConversationSource).filter(
            ConversationSource.conversation_id == conversation_id
        ).all()
        doc_ids = [s.document_id for s in sources]
        if not doc_ids:
            return []
        return self.db.query(Document).filter(Document.id.in_(doc_ids)).all()

    def get_conversation_document_ids(self, conversation_id: str) -> List[str]:
        sources = self.db.query(ConversationSource).filter(
            ConversationSource.conversation_id == conversation_id
        ).all()
        return [s.document_id for s in sources]

    def get_or_create_conversation(self, course_id: Optional[str] = None, conversation_id: Optional[str] = None, user_id: str = "demo_student") -> Conversation:
        if conversation_id:
            conv = self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if conv:
                return conv
        conv = self.create_conversation(title="New Conversation", user_id=user_id, course_id=course_id)
        return conv

    def save_chat_messages(self, conversation_id: str, user_text: str, bot_text: str, citations: List[Dict[str, Any]]):
        msg_user = Message(conversation_id=conversation_id, sender="user", content=user_text)
        msg_bot = Message(conversation_id=conversation_id, sender="assistant", content=bot_text, citations=citations)
        self.db.add(msg_user)
        self.db.add(msg_bot)
        
        # Touch conversation updated_at timestamp
        conv = self.get_conversation(conversation_id)
        if conv:
            conv.updated_at = datetime.utcnow()
            # Auto-title conversation from first user query if still default
            if conv.title in ["New Conversation", "New Chat"] and user_text:
                conv.title = user_text[:35].strip() + ("..." if len(user_text) > 35 else "")

        self.db.commit()

    def get_conversation_messages(self, conversation_id: str) -> List[Dict[str, Any]]:
        msgs = self.db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.asc()).all()
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

    def get_conversation_history(self, course_id: str, user_id: str = "demo_student") -> List[Dict[str, Any]]:
        conv = self.db.query(Conversation).filter(
            Conversation.course_id == course_id,
            Conversation.user_id == user_id
        ).order_by(Conversation.updated_at.desc()).first()
        if not conv:
            return []
        return self.get_conversation_messages(conv.id)
