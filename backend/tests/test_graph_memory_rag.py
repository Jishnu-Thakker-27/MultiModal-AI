import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import (
    Base, User, Course, Document, DocumentChunk, Conversation,
    ConceptGraphNode, ConceptRelationship, LearnerMisconception,
    Topic, LearnerMastery, Question, QuizAttempt, QuizAnswer
)
from app.database.repositories import Repository
from app.knowledge.graph_manager import GraphManager
from app.rag.hierarchical_retriever import retrieve_hierarchical_chunks
from app.tutor.teaching_planner import TeachingPlanner
from app.rag.prompt_builder import build_grounded_prompt
from app.rag.generator import generate_grounded_answer
from app.api.assessments import submit_assessment
from app.schemas.schemas import QuizSubmitRequest, QuestionAnswerSubmit

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_knowledge_graph_provenance_and_neighborhood(db):
    repo = Repository(db)
    gm = GraphManager(db)
    course = repo.create_course("Numerical Methods", "Math")
    doc = repo.create_document(course.id, "Numerical_Integration.pdf", "pdf", "/mock/path.pdf")

    # 1. Add chunks
    chunks = [
        {
            "document_id": doc.id,
            "course_id": course.id,
            "chunk_index": 0,
            "content": "Numerical integration computes approximate definite integrals using discrete sampling points.",
            "source_type": "pdf",
            "page_number": 1,
            "heading": "Introduction to Integration",
            "section": "Chapter 5: Numerical Integration",
            "topic": "Numerical Integration",
            "concept": "Numerical Integration"
        },
        {
            "document_id": doc.id,
            "course_id": course.id,
            "chunk_index": 1,
            "content": "Simpson's 1/3 Rule approximates the integrand by parabolic segments over pairs of intervals: I = (h/3) * (f0 + 4f1 + f2).",
            "source_type": "pdf",
            "page_number": 8,
            "heading": "Simpson's 1/3 Rule",
            "section": "Chapter 5: Numerical Integration",
            "topic": "Numerical Integration",
            "concept": "Simpson's 1/3 Rule",
            "formula_latex": "I = \\frac{h}{3}(f_0 + 4f_1 + f_2)"
        }
    ]
    repo.add_chunks(chunks)
    db_chunks = repo.get_chunks_by_course(course.id)
    c0_id = db_chunks[0].id
    c1_id = db_chunks[1].id

    # 2. Add concept nodes
    n_parent = gm.create_concept_node(
        course_id=course.id,
        name="Numerical Integration",
        concept_type="Domain",
        description="Core numerical integration fundamentals"
    )
    n_simpson = gm.create_concept_node(
        course_id=course.id,
        name="Simpson's 1/3 Rule",
        concept_type="Method",
        description="Second-order Newton-Cotes formula"
    )

    # 3. Add relationship with strict provenance
    rel = gm.add_relationship(
        source_concept_id=n_parent.id,
        target_concept_id=n_simpson.id,
        relationship_type="contains",
        provenance_doc_id=doc.id,
        page_number=8,
        source_chunk_id=c1_id,
        confidence=0.95
    )
    assert rel is not None
    assert rel.provenance_doc_id == doc.id
    assert rel.page_number == 8
    assert rel.source_chunk_id == c1_id
    assert rel.confidence == 0.95

    # 4. Traverse neighborhood with bounded 1-hop
    neighborhood = gm.get_related_graph_neighborhood(n_simpson.id, max_hops=1)
    assert any(p.id == n_parent.id for p in neighborhood["parents"])
    assert c1_id in neighborhood["connected_chunk_ids"]

def test_learner_memory_and_misconceptions(db):
    repo = Repository(db)
    user = repo.get_or_create_user()
    course = repo.create_course("Numerical Methods", "Math")
    t1 = Topic(course_id=course.id, name="Numerical Integration")
    t2 = Topic(course_id=course.id, name="Interpolation")
    db.add(t1)
    db.add(t2)
    db.commit()

    # Create masteries: t1 is weak (25%), t2 is strong (85%)
    repo.update_mastery(user.id, t1.id, delta_score=0.0, is_correct=False)
    repo.update_mastery(user.id, t2.id, delta_score=1.0, is_correct=True)
    m2 = repo.get_mastery(user.id, t2.id)
    m2.mastery_score = 85.0
    db.commit()

    # Record active misconception
    misc = repo.record_misconception(
        user_id=user.id,
        concept_id=t1.id,
        misconception_text="Confuses Simpson's 1/3 rule with Trapezoidal rule linear assumption",
        severity="high"
    )
    assert misc.id is not None
    assert misc.is_resolved is False

    # Check learner profile aggregation
    profile = repo.get_learner_profile(user_id=user.id, course_id=course.id)
    assert len(profile["weak_topics"]) == 1
    assert profile["weak_topics"][0]["topic_name"] == "Numerical Integration"
    assert len(profile["strong_topics"]) == 1
    assert profile["strong_topics"][0]["topic_name"] == "Interpolation"
    assert len(profile["active_misconceptions"]) == 1
    assert "Simpson's 1/3 rule" in profile["active_misconceptions"][0]["text"]

    # Resolve misconception
    resolved = repo.resolve_misconception(misc.id)
    assert resolved is True
    profile_after = repo.get_learner_profile(user_id=user.id, course_id=course.id)
    assert len(profile_after["active_misconceptions"]) == 0

def test_memory_and_graph_aware_hierarchical_retrieval(db):
    repo = Repository(db)
    user = repo.get_or_create_user()
    course = repo.create_course("Numerical Methods", "Math")
    doc = repo.create_document(course.id, "Integration.pdf", "pdf", "/mock/int.pdf")

    # Add chunks
    chunks = [
        {
            "document_id": doc.id,
            "course_id": course.id,
            "chunk_index": 0,
            "content": "Simpson's 1/3 Rule requires dividing the integration domain into an even number of subintervals with step size h.",
            "source_type": "pdf",
            "page_number": 8,
            "heading": "Simpson's 1/3 Rule",
            "section": "Chapter 5: Numerical Integration",
            "topic": "Numerical Integration",
            "concept": "Simpson's 1/3 Rule",
            "formula_latex": "I = (h/3)(f_0 + 4f_1 + f_2)"
        },
        {
            "document_id": doc.id,
            "course_id": course.id,
            "chunk_index": 1,
            "content": "Numerical integration prerequisites: definite integrals and polynomial approximation.",
            "source_type": "pdf",
            "page_number": 2,
            "heading": "Prerequisites",
            "section": "Chapter 5: Numerical Integration",
            "topic": "Numerical Integration",
            "concept": "Integration Prerequisites"
        }
    ]
    repo.add_chunks(chunks)

    conv = repo.create_conversation("Integration Chat", user.id, course.id)
    repo.attach_document_to_conversation(conv.id, doc.id)

    # Create learner profile where Numerical Integration is weak
    learner_profile = {
        "user_id": user.id,
        "weak_topics": [{"topic_name": "Numerical Integration", "score": 35.0}],
        "strong_topics": [],
        "active_misconceptions": [
            {"concept_id": "c1", "text": "Simpson's 1/3 rule intervals", "severity": "high"}
        ]
    }

    # Retrieve with graph and memory awareness
    retrieved = retrieve_hierarchical_chunks(
        db=db,
        query="Explain Simpson's 1/3 rule intervals",
        target_name="Simpson's 1/3 Rule",
        conversation_id=conv.id,
        course_id=course.id,
        intent="LEARN_CONCEPT",
        user_id=user.id,
        learner_profile=learner_profile,
        top_k=5
    )

    assert len(retrieved) > 0
    # Top chunk should be Simpson's 1/3 Rule and should reflect memory score boost
    assert "Simpson's 1/3 Rule" in retrieved[0]["content"]
    assert retrieved[0]["final_score"] > 0.5
    # Formula latex should be preserved
    assert retrieved[0].get("formula_latex") is not None

def test_teaching_plan_memory_scaffolding(db):
    learner_profile = {
        "weak_topics": [{"topic_name": "Simpson's 1/3 Rule", "score": 25.0}],
        "active_misconceptions": [
            {"text": "Confuses parabolic segments with linear trapezoids", "severity": "high"}
        ]
    }
    pedagogical_context = {
        "target_name": "Simpson's 1/3 Rule",
        "target_mastery": 0.25,
        "learner_profile": learner_profile,
        "prerequisites": [],
        "missing_prerequisites": []
    }
    intent_info = {"intent": "LEARN_CONCEPT", "query_scope": "FOCUSED"}
    chunks = [
        {"chunk_id": "c1", "content": "Simpson's 1/3 rule formula and definition.", "page_number": 8, "final_score": 0.9}
    ]

    planner = TeachingPlanner()
    plan = planner.create_plan("How does Simpson's 1/3 rule work?", intent_info, pedagogical_context, chunks)

    # Scaffolding directives should be generated
    assert plan.get("is_target_weak") is True
    assert len(plan.get("active_misconceptions", [])) == 1
    directives = plan.get("personalization_directives", [])
    assert len(directives) >= 2
    assert any("foundational" in d.lower() or "step-by-step" in d.lower() for d in directives)
    assert any("misconception" in d.lower() for d in directives)

    # Prompt builder should include directives
    prompt = build_grounded_prompt("How does Simpson's 1/3 rule work?", chunks, plan)
    assert "LEARNER PERSONALIZATION DIRECTIVES:" in prompt
    assert "Simpson's 1/3 Rule" in prompt

def test_quiz_submission_updates_misconceptions(db):
    repo = Repository(db)
    user = repo.get_or_create_user()
    course = repo.create_course("Numerical Methods", "Math")
    topic = Topic(course_id=course.id, name="Simpson's 1/3 Rule")
    db.add(topic)
    db.commit()

    # Create a question
    q = repo.save_question(
        course_id=course.id,
        question_text="How many subintervals are required for Simpson's 1/3 rule?",
        question_type="MCQ",
        options=["Any integer", "Even number", "Odd number", "Prime number"],
        correct_answer="Even number",
        explanation="Simpson's 1/3 Rule pairs intervals into parabolas, requiring an even number of subintervals (n % 2 == 0).",
        difficulty="Medium",
        source_metadata={"source_type": "pdf", "page": 8},
        topic_id=topic.id
    )

    # 1. Submit an incorrect answer -> Should record a learner misconception
    wrong_req = QuizSubmitRequest(
        topic_id=topic.id,
        answers=[QuestionAnswerSubmit(question_id=q.id, user_answer="Odd number")]
    )
    resp1 = submit_assessment(assessment_id="test_attempt_1", payload=wrong_req, db=db)
    assert resp1.percentage == 0.0

    miscs = repo.get_user_misconceptions(user_id=user.id, concept_id=topic.id, unresolved_only=True)
    assert len(miscs) == 1
    assert "Simpson's 1/3 Rule" in miscs[0].misconception_text

    # 2. Submit correct answer -> Should resolve the active misconception
    correct_req = QuizSubmitRequest(
        topic_id=topic.id,
        answers=[QuestionAnswerSubmit(question_id=q.id, user_answer="Even number")]
    )
    resp2 = submit_assessment(assessment_id="test_attempt_2", payload=correct_req, db=db)
    assert resp2.percentage == 100.0

    miscs_resolved = repo.get_user_misconceptions(user_id=user.id, concept_id=topic.id, unresolved_only=True)
    assert len(miscs_resolved) == 0
