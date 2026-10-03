import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    courses = relationship("Course", back_populates="creator", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    masteries = relationship("LearnerMastery", back_populates="user", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", back_populates="courses")
    documents = relationship("Document", back_populates="course", cascade="all, delete-orphan")
    topics = relationship("Topic", back_populates="course", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="course", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="course", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="course", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False) # 'pdf', 'pptx', 'video'
    file_path = Column(String(512), nullable=False)
    status = Column(String(50), nullable=False, default="Pending") # Pending, Processing, Completed, Failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    source_type = Column(String(50), nullable=False)
    page_number = Column(Integer, nullable=True)
    slide_number = Column(Integer, nullable=True)
    start_time = Column(String(20), nullable=True)
    end_time = Column(String(20), nullable=True)
    topic = Column(String(255), nullable=True)
    subtopic = Column(String(255), nullable=True)
    concept = Column(String(255), nullable=True)
    concept_node_id = Column(String(36), ForeignKey("concept_graph_nodes.id", ondelete="SET NULL"), nullable=True)
    
    heading = Column(String(255), nullable=True)
    section = Column(String(255), nullable=True)
    page_end = Column(Integer, nullable=True)
    page_type = Column(String(50), nullable=True, default="TEXT") # 'TEXT', 'VISUAL_MATHEMATICAL', 'SCANNED', 'COVER_METADATA'
    
    # Store embedding as JSON list of floats for maximum compatibility (SQLite & PostgreSQL)
    embedding = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="chunks")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="topics")
    subtopics = relationship("Subtopic", back_populates="topic", cascade="all, delete-orphan")
    masteries = relationship("LearnerMastery", back_populates="topic", cascade="all, delete-orphan")


class Subtopic(Base):
    __tablename__ = "subtopics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    topic = relationship("Topic", back_populates="subtopics")
    concepts = relationship("Concept", back_populates="subtopic", cascade="all, delete-orphan")


class Concept(Base):
    __tablename__ = "concepts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    subtopic_id = Column(String(36), ForeignKey("subtopics.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    subtopic = relationship("Subtopic", back_populates="concepts")


class TopicPrerequisite(Base):
    __tablename__ = "topic_prerequisites"

    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True)
    prerequisite_topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True)


class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False) # 'MCQ', 'Short Answer', 'Numerical'
    options = Column(JSON, nullable=True) # List of option strings for MCQ
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=False)
    difficulty = Column(String(50), nullable=False) # 'Easy', 'Medium', 'Hard'
    is_verified = Column(Boolean, default=False)
    source_metadata = Column(JSON, nullable=False) # {source_type, document_name, page/slide/timestamp}
    source_chunk_ids = Column(JSON, nullable=True) # List of chunk IDs supporting this question
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="questions")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    total_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="attempts")
    course = relationship("Course", back_populates="attempts")
    answers = relationship("QuizAnswer", back_populates="attempt", cascade="all, delete-orphan")


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    attempt_id = Column(String(36), ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    user_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    score = Column(Float, nullable=False)
    feedback = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    attempt = relationship("QuizAttempt", back_populates="answers")
    question = relationship("Question")


class LearnerMastery(Base):
    __tablename__ = "learner_mastery"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    mastery_score = Column(Float, default=0.0) # 0.0 to 100.0
    questions_attempted = Column(Integer, default=0)
    questions_correct = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="masteries")
    topic = relationship("Topic", back_populates="masteries")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), default="New Conversation")
    topic_name = Column(String(255), nullable=True) # E.g., 'Digital Fundamentals', 'Probability'
    status = Column(String(50), default="active")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    sources = relationship("ConversationSource", back_populates="conversation", cascade="all, delete-orphan")


class ConversationSource(Base):
    __tablename__ = "conversation_sources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="sources")
    document = relationship("Document")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String(50), nullable=False) # 'user', 'assistant'
    content = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True) # Array of structured citations
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class ConceptGraphNode(Base):
    __tablename__ = "concept_graph_nodes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    normalized_name = Column(String(255), nullable=False, index=True)
    concept_type = Column(String(50), nullable=False, default="definition") # 'definition', 'principle', 'operation', 'algorithm', 'application', 'formula'
    description = Column(Text, nullable=True)
    source_type = Column(String(50), nullable=True) # 'pdf', 'pptx', 'video'
    page_number = Column(Integer, nullable=True)
    slide_number = Column(Integer, nullable=True)
    start_time = Column(String(20), nullable=True)
    end_time = Column(String(20), nullable=True)
    document_order = Column(Integer, default=0) # Sequence order index
    summary_excerpt = Column(Text, nullable=True)
    keywords = Column(JSON, nullable=True) # List of keywords
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course")
    document = relationship("Document")


class ConceptRelationship(Base):
    __tablename__ = "concept_relationships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_concept_id = Column(String(36), ForeignKey("concept_graph_nodes.id", ondelete="CASCADE"), nullable=False)
    target_concept_id = Column(String(36), ForeignKey("concept_graph_nodes.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(String(50), nullable=False) # 'prerequisite_of', 'part_of', 'example_of', 'application_of', 'follows'
    created_at = Column(DateTime, default=datetime.utcnow)

    source_concept = relationship("ConceptGraphNode", foreign_keys=[source_concept_id])
    target_concept = relationship("ConceptGraphNode", foreign_keys=[target_concept_id])


class ConceptMastery(Base):
    __tablename__ = "student_concept_mastery"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    concept_id = Column(String(36), ForeignKey("concept_graph_nodes.id", ondelete="CASCADE"), nullable=False)
    mastery_score = Column(Float, default=0.0) # 0.0 to 1.0
    exposure_count = Column(Integer, default=0)
    last_interaction_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    concept = relationship("ConceptGraphNode")
