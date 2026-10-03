import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import Base, Course, Document
from app.database.repositories import Repository
from app.knowledge.concept_extractor import extract_and_build_concept_graph
from app.tutor.intent_classifier import classify_learning_intent
from app.tutor.prerequisite_resolver import PrerequisiteResolver
from app.tutor.teaching_planner import TeachingPlanner
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

    # Simulate Unit 2 Stack & Queue Document
    doc = repo.create_document(course.id, "Unit2_Stack_and_Queue.pdf", "pdf", "/path/Unit2.pdf")
    
    # Page 2: Foundation (Definition, LIFO, TOP)
    repo.bulk_create_chunks(doc.id, course.id, [
        {
            "content": "A Stack is a linear list of elements following LIFO (Last In First Out). The accessible element is tracked by TOP pointer. Insertion is PUSH and deletion is POP.",
            "page_number": 2,
            "source_type": "pdf",
            "topic": "Stack & Queue",
            "subtopic": "Stack Fundamentals",
            "concept": "Stack Definition"
        }
    ])

    # Page 5: TOP Pointer & PUSH Operation
    repo.bulk_create_chunks(doc.id, course.id, [
        {
            "content": "TOP represents the index of the top element. An empty stack has TOP = -1. PUSH increments TOP and inserts element at S[TOP].",
            "page_number": 5,
            "source_type": "pdf",
            "topic": "Stack & Queue",
            "subtopic": "Operations",
            "concept": "TOP Pointer"
        }
    ])

    # Page 15: Advanced Application (Infix to Postfix Algorithm)
    repo.bulk_create_chunks(doc.id, course.id, [
        {
            "content": "Algorithm: InfixToPostfix(infix) uses a stack to convert mathematical expressions by scanning tokens and pushing operators.",
            "page_number": 15,
            "source_type": "pdf",
            "topic": "Stack & Queue",
            "subtopic": "Applications",
            "concept": "Infix to Postfix"
        }
    ])

    # Build Concept Graph
    extract_and_build_concept_graph(db, course.id, doc.id, [
        {"text": "Unit 2: Stack Definition and LIFO principle. TOP pointer.", "page_number": 2},
        {"text": "TOP Pointer and PUSH operation steps.", "page_number": 5},
        {"text": "Infix to Postfix Conversion Algorithm application using stack.", "page_number": 15}
    ], "pdf")

    # TEST SCENARIO: User asks "Explain me stack"
    query = "Explain me stack"
    intent_info = classify_learning_intent(query)
    assert intent_info["intent"] == "LEARN_CONCEPT"

    pedagogical_context = PrerequisiteResolver(db).resolve_pedagogical_context(course.id, user.id, query, intent_info["intent"])
    
    retrieved_chunks = retrieve_hierarchical_chunks(
        db=db,
        query=query,
        course_id=course.id,
        intent=intent_info["intent"],
        target_concept=pedagogical_context.get("target_concept"),
        prerequisite_nodes=pedagogical_context.get("prerequisites"),
        is_introductory=pedagogical_context.get("is_introductory_request", True),
        top_k=3
    )

    assert len(retrieved_chunks) > 0
    top_chunk = retrieved_chunks[0]
    
    # CRITICAL VERIFICATION: Page 2 or Page 5 (Foundations) MUST come before Page 15 (Infix to Postfix)!
    assert top_chunk["page_number"] in [2, 5]
    assert top_chunk["page_number"] != 15

    teaching_plan = TeachingPlanner().create_plan(query, intent_info, pedagogical_context, retrieved_chunks)
    assert teaching_plan["teaching_stage"] == "FOUNDATIONS_FIRST"

    answer, citations, is_grounded = generate_grounded_answer(query, retrieved_chunks, teaching_plan)
    
    # Assert explanation starts with foundations and does NOT begin with Infix to Postfix
    assert "LIFO" in answer or "TOP" in answer or "Definition" in answer
    assert "Infix to Postfix" not in answer.split('\n\n')[0]

    print("EXPLAIN STACK PEDAGOGICAL TUTOR TEST PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    import pytest
    pytest.main(["-v", __file__])
