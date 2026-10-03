import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import Base, Course, Document
from app.database.repositories import Repository
from app.knowledge.concept_extractor import extract_and_build_concept_graph
from app.tutor.intent_classifier import classify_learning_intent
from app.tutor.prerequisite_resolver import PrerequisiteResolver
from app.tutor.teaching_planner import TeachingPlanner
from app.tutor.answer_validator import validate_tutor_response
from app.rag.hierarchical_retriever import retrieve_hierarchical_chunks
from app.rag.generator import generate_grounded_answer

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

def test_explain_stack_foundational_retrieval(db):
    repo = Repository(db)
    user = repo.get_or_create_user()
    course = repo.create_course("Data Structures", "CS Core")

    doc = repo.create_document(course.id, "Unit2_Stack_and_Queue.pdf", "pdf", "/path/Unit2.pdf")
    
    repo.bulk_create_chunks(doc.id, course.id, [
        {
            "content": "A Stack is a linear list of elements following LIFO (Last In First Out). The accessible element is tracked by TOP pointer. Insertion is PUSH and deletion is POP.",
            "page_number": 2,
            "source_type": "pdf"
        },
        {
            "content": "Algorithm: InfixToPostfix(infix) uses a stack to convert mathematical expressions by scanning tokens and pushing operators.",
            "page_number": 15,
            "source_type": "pdf"
        }
    ])

    extract_and_build_concept_graph(db, course.id, doc.id, [
        {"text": "Unit 2: Stack Definition and LIFO principle. TOP pointer.", "page_number": 2},
        {"text": "Infix to Postfix Conversion Algorithm application using stack.", "page_number": 15}
    ], "pdf")

    query = "Explain me stack"
    intent_info = classify_learning_intent(query)
    pedagogical_context = PrerequisiteResolver(db).resolve_pedagogical_context(course.id, user.id, query, intent_info["intent"])

    retrieved_chunks = retrieve_hierarchical_chunks(
        db=db,
        query=query,
        target_name=pedagogical_context.get("target_name"),
        course_id=course.id,
        intent=intent_info["intent"],
        target_concept=pedagogical_context.get("target_concept"),
        prerequisite_nodes=pedagogical_context.get("prerequisites"),
        is_introductory=pedagogical_context.get("is_introductory_request", True),
        top_k=3
    )

    assert len(retrieved_chunks) > 0
    top_chunk = retrieved_chunks[0]
    assert top_chunk["page_number"] == 2

    teaching_plan = TeachingPlanner().create_plan(query, intent_info, pedagogical_context, retrieved_chunks)
    answer, citations, is_grounded = generate_grounded_answer(query, retrieved_chunks, teaching_plan)
    answer, citations = validate_tutor_response(answer, pedagogical_context.get("target_name"), retrieved_chunks, citations)
    
    assert "Stack" in answer

def test_explain_tower_of_hanoi_does_not_teach_stack(db):
    """
    CRITICAL REGRESSION TEST:
    Upload a document containing Stack on Page 1 and Tower of Hanoi on Page 20.
    Ask 'Explain Tower of Hanoi'.
    Verify the primary target is Tower of Hanoi, Page 20 is retrieved as top chunk, and Stack is NOT taught as the primary topic!
    """
    repo = Repository(db)
    user = repo.get_or_create_user()
    course = repo.create_course("Algorithms & Recursion", "CS Core")

    doc = repo.create_document(course.id, "Recursion_Course.pdf", "pdf", "/path/Recursion.pdf")

    repo.bulk_create_chunks(doc.id, course.id, [
        {
            "content": "Stack Data Structure is a linear list following LIFO. Operations are PUSH, POP, TOP.",
            "page_number": 1,
            "source_type": "pdf"
        },
        {
            "content": "Tower of Hanoi is a mathematical puzzle of 3 rods and N disks where objective is to move disks using recursive calls.",
            "page_number": 20,
            "source_type": "pdf"
        }
    ])

    extract_and_build_concept_graph(db, course.id, doc.id, [
        {"text": "Stack Data Structure is defined as a linear list following LIFO.", "page_number": 1},
        {"text": "Tower of Hanoi is an algorithm and mathematical puzzle using recursion.", "page_number": 20}
    ], "pdf")

    query = "Explain Tower of Hanoi"
    intent_info = classify_learning_intent(query)
    pedagogical_context = PrerequisiteResolver(db).resolve_pedagogical_context(course.id, user.id, query, intent_info["intent"])

    assert pedagogical_context["target_name"] == "Tower Of Hanoi"

    retrieved_chunks = retrieve_hierarchical_chunks(
        db=db,
        query=query,
        target_name=pedagogical_context.get("target_name"),
        course_id=course.id,
        intent=intent_info["intent"],
        target_concept=pedagogical_context.get("target_concept"),
        prerequisite_nodes=pedagogical_context.get("prerequisites"),
        is_introductory=pedagogical_context.get("is_introductory_request", True),
        top_k=3
    )

    top_chunk = retrieved_chunks[0]
    assert top_chunk["page_number"] == 20
    assert top_chunk["relevance_category"] == "PRIMARY_TARGET"

    teaching_plan = TeachingPlanner().create_plan(query, intent_info, pedagogical_context, retrieved_chunks)
    answer, citations, is_grounded = generate_grounded_answer(query, retrieved_chunks, teaching_plan)
    answer, citations = validate_tutor_response(answer, pedagogical_context.get("target_name"), retrieved_chunks, citations)

    assert "Tower Of Hanoi" in answer
    assert citations[0]["page"] == 20

def test_target_not_found_in_course_material(db):
    """
    If requested topic does not exist in uploaded material, notify student gracefully!
    """
    repo = Repository(db)
    user = repo.get_or_create_user()
    course = repo.create_course("Intro Physics", "Physics")

    doc = repo.create_document(course.id, "Physics101.pdf", "pdf", "/path/Physics101.pdf")
    repo.bulk_create_chunks(doc.id, course.id, [
        {"content": "Newton's First Law of Motion states that an object remains at rest unless acted upon by a net force.", "page_number": 5, "source_type": "pdf"}
    ])

    query = "Explain Quantum Entanglement"
    intent_info = classify_learning_intent(query)
    pedagogical_context = PrerequisiteResolver(db).resolve_pedagogical_context(course.id, user.id, query, intent_info["intent"])

    assert pedagogical_context["target_found"] is False

    retrieved_chunks = retrieve_hierarchical_chunks(
        db=db,
        query=query,
        target_name=pedagogical_context.get("target_name"),
        course_id=course.id,
        intent=intent_info["intent"],
        target_concept=pedagogical_context.get("target_concept"),
        prerequisite_nodes=pedagogical_context.get("prerequisites"),
        is_introductory=pedagogical_context.get("is_introductory_request", True),
        top_k=3
    )

    teaching_plan = TeachingPlanner().create_plan(query, intent_info, pedagogical_context, retrieved_chunks)
    answer, citations, is_grounded = generate_grounded_answer(query, retrieved_chunks, teaching_plan)

    assert "not found in the uploaded course material" in answer
    assert is_grounded is False
