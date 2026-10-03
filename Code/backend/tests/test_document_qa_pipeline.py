import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import Base, Course, Document, DocumentChunk, Conversation, Message, ConversationSource
from app.ingestion.chunker import chunk_extracted_content
from app.rag.hierarchical_retriever import retrieve_hierarchical_chunks
from app.rag.generator import generate_grounded_answer
from app.tutor.intent_classifier import classify_learning_intent
from app.database.repositories import Repository

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed sample course and document
    course = Course(id="course_math", title="Numerical Methods")
    session.add(course)

    doc = Document(
        id="doc_curve_fitting",
        course_id="course_math",
        title="Chapter 4-Curve Fitting.pdf",
        source_type="pdf",
        file_path="/tmp/Chapter_4_Curve_Fitting.pdf",
        status="Completed"
    )
    session.add(doc)

    conv = Conversation(id="conv_101", user_id="demo_student", course_id="course_math", title="Curve Fitting Session")
    session.add(conv)
    session.add(ConversationSource(conversation_id="conv_101", document_id="doc_curve_fitting"))

    # Seed Document Pages simulating a 100-page document
    # Page 1: Cover Page / Metadata
    p1_chunks = [
        {
            "document_id": "doc_curve_fitting",
            "course_id": "course_math",
            "chunk_index": 0,
            "content": "102003406 Probabilities-Statistics and Numerical Methods Unit-4: Curve Fitting and Interpolation Department of Mathematics",
            "source_type": "pdf",
            "page_number": 1,
            "page_end": 1,
            "heading": "Unit-4: Curve Fitting",
            "section": "Header",
            "page_type": "COVER_METADATA"
        }
    ]

    # Page 26-27: Substantive Curve Fitting & Least Squares Content
    p26_chunks = [
        {
            "document_id": "doc_curve_fitting",
            "course_id": "course_math",
            "chunk_index": 1,
            "content": "Curve fitting is the process of finding a mathematical equation that best represents observed data points. The method of least squares minimizes the sum of squared residuals y = a + bx.",
            "source_type": "pdf",
            "page_number": 26,
            "page_end": 27,
            "heading": "4.2 Least Squares Method",
            "section": "Unit-4: Curve Fitting",
            "page_type": "VISUAL_MATHEMATICAL"
        }
    ]

    for c in p1_chunks + p26_chunks:
        chunk_obj = DocumentChunk(
            id=f"chunk_{c['chunk_index']}",
            document_id=c["document_id"],
            course_id=c["course_id"],
            chunk_index=c["chunk_index"],
            content=c["content"],
            source_type=c["source_type"],
            page_number=c["page_number"],
            page_end=c["page_end"],
            heading=c["heading"],
            section=c["section"],
            page_type=c["page_type"]
        )
        session.add(chunk_obj)

    session.commit()
    yield session
    session.close()


def test_explain_curve_fitting_suppresses_cover_metadata(db_session):
    """TEST 1: 'Explain curve fitting' retrieves substantive content (pp. 26-27) over Page 1 cover page metadata."""
    query = "Explain me curve fitting"
    intent_info = classify_learning_intent(query)

    chunks = retrieve_hierarchical_chunks(
        db=db_session,
        query=query,
        target_name="Curve Fitting",
        conversation_id="conv_101",
        intent=intent_info["intent"]
    )

    assert len(chunks) > 0
    top_chunk = chunks[0]
    # Verify top retrieved chunk is Page 26 (substantive content), NOT Page 1 cover metadata
    assert top_chunk["page_number"] == 26
    assert "process of finding a mathematical equation" in top_chunk["content"]

    answer, citations, is_grounded = generate_grounded_answer(query, chunks)
    assert is_grounded is True
    assert "102003406 Probabilities-Statistics" not in answer  # Zero cover metadata dump
    assert len(citations) > 0
    assert citations[0]["page"] == 26


def test_least_squares_formula_extraction(db_session):
    """TEST 2: 'What is least squares?' retrieves formula and method details."""
    query = "What is the least-squares method?"
    intent_info = classify_learning_intent(query)

    chunks = retrieve_hierarchical_chunks(
        db=db_session,
        query=query,
        target_name="least-squares method",
        conversation_id="conv_101",
        intent=intent_info["intent"]
    )

    assert len(chunks) > 0
    assert chunks[0]["page_number"] == 26

    answer, citations, is_grounded = generate_grounded_answer(query, chunks)
    assert is_grounded is True
    assert "least squares" in answer.lower()


def test_exact_page_targeted_retrieval(db_session):
    """TEST 3: 'Explain the example on page 27' targets Page 26-27."""
    query = "Explain the example on page 27"
    intent_info = classify_learning_intent(query)

    assert intent_info["intent"] == "PAGE_SPECIFIC"
    assert intent_info.get("target_page") == 27

    chunks = retrieve_hierarchical_chunks(
        db=db_session,
        query=query,
        target_name="Page 27 Example",
        conversation_id="conv_101",
        intent=intent_info["intent"],
        target_page=27
    )

    assert len(chunks) > 0
    assert chunks[0]["page_number"] == 26 or chunks[0]["page_end"] == 27


def test_missing_information_handling(db_session):
    """TEST 6: Asking a question whose answer is NOT in the PDF returns a transparent missing info message."""
    query = "Explain quantum teleportation algorithms"
    intent_info = classify_learning_intent(query)

    chunks = retrieve_hierarchical_chunks(
        db=db_session,
        query=query,
        target_name="quantum teleportation algorithms",
        conversation_id="conv_101",
        intent=intent_info["intent"]
    )

    answer, citations, is_grounded = generate_grounded_answer(
        query=query,
        chunks=chunks,
        teaching_plan={"target_name": "quantum teleportation algorithms", "coverage_state": "STATE_A_NOT_FOUND", "target_found": False}
    )

    assert is_grounded is False
    assert "couldn't find enough information" in answer.lower()


def test_multi_turn_consecutive_questions(db_session):
    """TEST 7: Retains uploaded document context across sequential messages in conversation."""
    repo = Repository(db_session)
    repo.save_chat_messages("conv_101", "Explain curve fitting", "Curve fitting finds mathematical equations.", [{"document_title": "Chapter 4-Curve Fitting.pdf", "page": 26}])

    msgs = repo.get_conversation_messages("conv_101")
    assert len(msgs) == 2

    # Second question retains source document attachment
    doc_ids = repo.get_conversation_document_ids("conv_101")
    assert "doc_curve_fitting" in doc_ids
