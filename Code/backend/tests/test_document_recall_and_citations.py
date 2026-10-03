import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import Base, Course, Document, DocumentChunk, Conversation, Message, ConversationSource
from app.rag.hierarchical_retriever import retrieve_hierarchical_chunks
from app.rag.generator import generate_grounded_answer
from app.tutor.intent_classifier import classify_learning_intent
from app.tutor.target_resolver import TargetResolver

@pytest.fixture
def interpolation_db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed Course & Interpolation Document
    course = Course(id="course_math_101", title="Numerical Methods")
    session.add(course)

    doc = Document(
        id="doc_interp",
        course_id="course_math_101",
        title="Chapter 4-Interpolation.pdf",
        source_type="pdf",
        file_path="/tmp/Chapter_4_Interpolation.pdf",
        status="Completed"
    )
    session.add(doc)

    conv = Conversation(id="conv_interp", user_id="demo_student", course_id="course_math_101", title="Interpolation Session")
    session.add(conv)
    session.add(ConversationSource(conversation_id="conv_interp", document_id="doc_interp"))

    # Seed Document Pages (Simulating real Chapter 4-Interpolation.pdf)
    # Page 1: Cover Header
    p1 = DocumentChunk(
        id="chunk_0",
        document_id="doc_interp",
        course_id="course_math_101",
        chunk_index=0,
        content="Unit-4: Interpolation and Numerical Methods Department of Applied Mathematics",
        source_type="pdf",
        page_number=1,
        page_end=1,
        heading="Unit-4 Header",
        section="Syllabus Header",
        page_type="COVER_METADATA"
    )

    # Page 14: Finite Difference Operators & Forward Differences
    p14 = DocumentChunk(
        id="chunk_1",
        document_id="doc_interp",
        course_id="course_math_101",
        chunk_index=1,
        content="4.2 FINITE DIFFERENCE OPERATORS: 4.2.1 Forward Differences: The operator Delta is called the forward difference operator. Delta f(x) = f(x+h) - f(x). The values Delta f(x) are called first forward differences.",
        source_type="pdf",
        page_number=14,
        page_end=14,
        heading="4.2.1 Forward Differences",
        section="4.2 Finite Differences",
        page_type="VISUAL_MATHEMATICAL"
    )

    # Page 15: Forward Difference Table (Neighboring Context)
    p15 = DocumentChunk(
        id="chunk_2",
        document_id="doc_interp",
        course_id="course_math_101",
        chunk_index=2,
        content="Forward Difference Table: x | y | Delta y | Delta^2 y | Delta^3 y. The table organizes successive differences for polynomial interpolation.",
        source_type="pdf",
        page_number=15,
        page_end=15,
        heading="Forward Difference Table",
        section="4.2 Finite Differences",
        page_type="VISUAL_MATHEMATICAL"
    )

    # Page 21: Divided Differences
    p21 = DocumentChunk(
        id="chunk_3",
        document_id="doc_interp",
        course_id="course_math_101",
        chunk_index=3,
        content="4.5 DIVIDED DIFFERENCES: The divided difference formula for distinct points x0, x1, x2 is defined as f[x0, x1] = (f(x1) - f(x0)) / (x1 - x0).",
        source_type="pdf",
        page_number=21,
        page_end=21,
        heading="4.5 Divided Differences",
        section="4.5 Divided Differences",
        page_type="VISUAL_MATHEMATICAL"
    )

    # Page 28: Newton's Forward Interpolation Formula
    p28 = DocumentChunk(
        id="chunk_4",
        document_id="doc_interp",
        course_id="course_math_101",
        chunk_index=4,
        content="4.3 NEWTON'S FORWARD INTERPOLATION FORMULA: P(x) = y0 + u Delta y0 + u(u-1)/2! Delta^2 y0 + ... This formula is used for interpolating near the beginning of a table.",
        source_type="pdf",
        page_number=28,
        page_end=28,
        heading="4.3 Newton's Forward Formula",
        section="4.3 Newton Interpolation",
        page_type="VISUAL_MATHEMATICAL"
    )

    for c in [p1, p14, p15, p21, p28]:
        session.add(c)

    session.commit()
    yield session
    session.close()


def test_forward_difference_method_retrieves_page_14(interpolation_db_session):
    """TEST 1: 'what is forward difference method' finds 'Forward Differences' on Page 14."""
    query = "what is forward difference method"
    resolver = TargetResolver(interpolation_db_session)
    target_info = resolver.resolve_target_concept("course_math_101", query, conversation_id="conv_interp")

    chunks = retrieve_hierarchical_chunks(
        db=interpolation_db_session,
        query=query,
        target_name=target_info["target_name"],
        conversation_id="conv_interp",
        intent="LEARN_CONCEPT"
    )

    assert len(chunks) > 0
    # Top retrieved chunk MUST be Page 14 (Forward Differences), NOT Page 1 Cover
    assert chunks[0]["page_number"] == 14
    assert "Forward Differences" in chunks[0]["content"]

    answer, citations, is_grounded = generate_grounded_answer(query, chunks, target_info)
    assert is_grounded is True
    assert "is not covered" not in answer
    assert citations[0]["page"] == 14


def test_divided_difference_formula_retrieves_page_21(interpolation_db_session):
    """TEST 2: 'divided difference formula' finds 'Divided Differences' section on Page 21."""
    query = "divided difference formula"
    resolver = TargetResolver(interpolation_db_session)
    target_info = resolver.resolve_target_concept("course_math_101", query, conversation_id="conv_interp")

    chunks = retrieve_hierarchical_chunks(
        db=interpolation_db_session,
        query=query,
        target_name=target_info["target_name"],
        conversation_id="conv_interp",
        intent="FORMULA"
    )

    assert len(chunks) > 0
    assert chunks[0]["page_number"] == 21
    assert "divided differences" in chunks[0]["content"].lower()


def test_newton_forward_interpolation_retrieves_page_28(interpolation_db_session):
    """TEST 3: 'Newton forward interpolation formula' finds Page 28."""
    query = "Newton forward interpolation formula"
    resolver = TargetResolver(interpolation_db_session)
    target_info = resolver.resolve_target_concept("course_math_101", query, conversation_id="conv_interp")

    chunks = retrieve_hierarchical_chunks(
        db=interpolation_db_session,
        query=query,
        target_name=target_info["target_name"],
        conversation_id="conv_interp",
        intent="FORMULA"
    )

    assert len(chunks) > 0
    assert chunks[0]["page_number"] == 28


def test_neighboring_chunk_context_expansion(interpolation_db_session):
    """TEST 5: Retrieving Page 14 automatically includes neighboring Page 15 difference table chunk."""
    query = "what is forward difference method"
    chunks = retrieve_hierarchical_chunks(
        db=interpolation_db_session,
        query=query,
        target_name="Forward Difference",
        conversation_id="conv_interp",
        intent="LEARN_CONCEPT"
    )

    retrieved_pages = [c["page_number"] for c in chunks]
    assert 14 in retrieved_pages
    assert 15 in retrieved_pages  # Neighboring chunk context expanded!


def test_citation_consistency_zero_invention(interpolation_db_session):
    """TEST 4: Inline LLM page string inventions are suppressed and citations match canonical array."""
    query = "what is forward difference method"
    chunks = retrieve_hierarchical_chunks(
        db=interpolation_db_session,
        query=query,
        target_name="Forward Difference",
        conversation_id="conv_interp"
    )

    answer, citations, is_grounded = generate_grounded_answer(query, chunks)
    assert "[Source: Page 21]" not in answer  # Zero hallucinated page string
    assert len(citations) > 0
    assert citations[0]["page"] == 14  # Canonical citation object matches retrieved evidence
