import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import Base, Course, Document, DocumentChunk
from app.database.repositories import Repository
from app.rag.retriever import retrieve_top_chunks
from app.rag.generator import generate_grounded_answer

# Setup in-memory SQLite test database
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

def test_context_isolation_between_conversations(db):
    repo = Repository(db)
    user = repo.get_or_create_user()
    course = repo.create_course("CS Fundamentals", "Core CS")

    # 1. Create Document A (Digital Fundamentals / Number Systems)
    doc_a = repo.create_document(course.id, "Digital_Fundamentals.pdf", "pdf", "/path/to/Digital_Fundamentals.pdf")
    repo.bulk_create_chunks(doc_a.id, course.id, [
        {
            "content": "Two's complement is a mathematical operation on binary numbers for signed integer representation.",
            "page_number": 42,
            "source_type": "pdf",
            "topic": "Digital Fundamentals",
            "subtopic": "Number Systems",
            "concept": "Two's complement"
        }
    ])

    # 2. Create Document B (Probability)
    doc_b = repo.create_document(course.id, "Probability.pdf", "pdf", "/path/to/Probability.pdf")
    repo.bulk_create_chunks(doc_b.id, course.id, [
        {
            "content": "Conditional probability is defined as P(A|B) = P(A and B) / P(B) assuming P(B) > 0.",
            "page_number": 15,
            "source_type": "pdf",
            "topic": "Probability",
            "subtopic": "Chapter 1",
            "concept": "Conditional Probability"
        }
    ])

    # TEST 1: Conversation A attached ONLY to Document A
    conv_a = repo.create_conversation(title="Number Systems Session", user_id=user.id, course_id=course.id, topic_name="Number Systems")
    repo.attach_document_to_conversation(conv_a.id, doc_a.id)

    chunks_a = retrieve_top_chunks(db, conversation_id=conv_a.id, query="What is two's complement?")
    assert len(chunks_a) > 0
    assert chunks_a[0]["document_title"] == "Digital_Fundamentals.pdf"
    assert "Two's complement" in chunks_a[0]["content"]

    # TEST 2: Conversation B attached ONLY to Document B
    conv_b = repo.create_conversation(title="Probability Session", user_id=user.id, course_id=course.id, topic_name="Probability")
    repo.attach_document_to_conversation(conv_b.id, doc_b.id)

    chunks_b = retrieve_top_chunks(db, conversation_id=conv_b.id, query="What is conditional probability?")
    assert len(chunks_b) > 0
    assert chunks_b[0]["document_title"] == "Probability.pdf"

    # TEST 3: Cross-context query in Conversation A asking about Probability
    chunks_a_cross = retrieve_top_chunks(db, conversation_id=conv_a.id, query="What is conditional probability?")
    # Must NOT retrieve Probability chunks!
    assert all("Probability.pdf" not in c.get("document_title", "") for c in chunks_a_cross)

    answer_a, citations_a, is_grounded = generate_grounded_answer("What is conditional probability?", chunks_a_cross)
    if not chunks_a_cross:
        assert ("not covered" in answer_a.lower() or "no source material" in answer_a.lower() or "not found" in answer_a.lower())

    # TEST 4: Switch back to Conversation B for Probability
    chunks_b_prob = retrieve_top_chunks(db, conversation_id=conv_b.id, query="What is conditional probability?")
    assert len(chunks_b_prob) > 0
    assert chunks_b_prob[0]["document_title"] == "Probability.pdf"

    # TEST 5: Fresh New Conversation C with NO sources attached
    conv_c = repo.create_conversation(title="Fresh Chat", user_id=user.id, course_id=course.id, topic_name="General")
    chunks_c = retrieve_top_chunks(db, conversation_id=conv_c.id, query="What is two's complement?")
    assert len(chunks_c) == 0  # Does NOT inherit previous sources!

    # TEST 6: Attach Document A to Conversation C
    repo.attach_document_to_conversation(conv_c.id, doc_a.id)
    chunks_c_updated = retrieve_top_chunks(db, conversation_id=conv_c.id, query="What is two's complement?")
    assert len(chunks_c_updated) > 0
    assert chunks_c_updated[0]["document_title"] == "Digital_Fundamentals.pdf"

    # TEST 7: Open old Conversation A and verify restoration
    conv_a_restored = repo.get_conversation(conv_a.id)
    assert conv_a_restored.title == "Number Systems Session"
    docs_a_restored = repo.get_conversation_documents(conv_a.id)
    assert len(docs_a_restored) == 1
    assert docs_a_restored[0].id == doc_a.id

    print("ALL 7 CONTEXT ISOLATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    import pytest
    pytest.main(["-v", __file__])
