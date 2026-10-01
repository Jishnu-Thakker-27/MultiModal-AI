import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database.session import init_db, SessionLocal
from app.database.repositories import Repository
from app.database.models import DocumentChunk, LearnerMastery, QuizAttempt, Question, Document

class TestStudyCompanionEndToEnd(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        cls.repo = Repository(cls.db)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_health_and_root(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "online")

    def test_02_course_creation(self):
        res = self.client.post("/api/courses", json={
            "title": "Data Grounding Verification Course",
            "description": "Multi-topic assessment grounding test"
        })
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("id", data)
        self.assertEqual(data["title"], "Data Grounding Verification Course")
        self.__class__.course_id = data["id"]

    def test_03_pdf_document_upload_and_processing(self):
        sample_pdf = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_data", "Data_Structures_Overview.pdf")
        self.assertTrue(os.path.exists(sample_pdf), f"Sample PDF missing at {sample_pdf}")
        
        with open(sample_pdf, "rb") as f:
            res_up = self.client.post(
                f"/api/courses/{self.course_id}/documents",
                files={"file": ("Data_Structures_Overview.pdf", f, "application/pdf")}
            )
        self.assertEqual(res_up.status_code, 201)
        pdf_doc_id = res_up.json()["id"]

        res_proc = self.client.post(f"/api/documents/{pdf_doc_id}/process")
        self.assertEqual(res_proc.status_code, 200)

    def test_04_topic_creation_and_ingestion(self):
        # Create two distinct topics: Data Structures and Probability
        self.repo.save_topic_structure(self.course_id, [
            {
                "name": "Binary Search Trees",
                "description": "Binary search trees, node insertion, AVL rotations",
                "subtopics": [{"name": "BST Operations", "concepts": ["AVL Rotations", "Search Efficiency"]}]
            },
            {
                "name": "Chapter 1 Probability",
                "description": "Probability distributions, events, random variables",
                "subtopics": [{"name": "Probability Space", "concepts": ["Event Likelihood", "Sample Spaces"]}]
            }
        ])

        topics = self.repo.get_topics_by_course(self.course_id)
        self.assertGreaterEqual(len(topics), 2)
        
        for t in topics:
            if "Binary Search" in t.name:
                self.__class__.bst_topic_id = t.id
            elif "Probability" in t.name:
                self.__class__.prob_topic_id = t.id

    def test_05_bst_quiz_generation_no_contamination(self):
        # Generate quiz for Binary Search Trees
        res = self.client.post(f"/api/courses/{self.course_id}/assessments/generate", json={
            "topic_id": self.bst_topic_id,
            "difficulty": "Medium",
            "question_count": 3,
            "question_type": "MCQ"
        })
        self.assertEqual(res.status_code, 200)
        questions = res.json()["questions"]
        self.assertEqual(len(questions), 3)

        for q in questions:
            q_text = q["question_text"].lower()
            # Assert NO Probability contamination in BST questions!
            self.assertNotIn("probability", q_text)
            self.assertEqual(q["topic_name"], "Binary Search Trees")
            self.assertGreater(len(q["source_chunk_ids"]), 0)

        self.__class__.bst_assessment_id = res.json()["assessment_id"]
        self.__class__.bst_questions = questions

    def test_06_probability_quiz_generation_no_contamination(self):
        # Add probability chunk to course
        prob_doc = self.repo.create_document(self.course_id, "Probability_Chapter.pdf", "pdf", "sample_data/Probability.pdf")
        prob_chunks = [{
            "document_id": prob_doc.id,
            "course_id": self.course_id,
            "chunk_index": 0,
            "content": "In probability theory, the probability of an event is a number between 0 and 1 representing the likelihood of occurrence. Sample space S represents all possible outcomes.",
            "source_type": "pdf",
            "page_number": 1,
            "topic": "Chapter 1 Probability"
        }]
        self.repo.add_chunks(prob_chunks)

        # Generate quiz for Chapter 1 Probability
        res = self.client.post(f"/api/courses/{self.course_id}/assessments/generate", json={
            "topic_id": self.prob_topic_id,
            "difficulty": "Medium",
            "question_count": 3,
            "question_type": "MCQ"
        })
        self.assertEqual(res.status_code, 200)
        questions = res.json()["questions"]
        self.assertEqual(len(questions), 3)

        for q in questions:
            q_text = q["question_text"].lower()
            # Assert NO Tree/AVL/BST contamination in Probability questions!
            self.assertNotIn("avl tree", q_text)
            self.assertNotIn("tree rotation", q_text)
            self.assertNotIn("binary search tree", q_text)
            self.assertEqual(q["topic_name"], "Chapter 1 Probability")
            self.assertGreater(len(q["source_chunk_ids"]), 0)

    def test_07_grounded_rag_chat_with_citations(self):
        res = self.client.post(f"/api/courses/{self.course_id}/chat", json={
            "question": "What is a Binary Search Tree?"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["is_grounded"])
        self.assertIn("Binary Search Tree", data["answer"])
        self.assertGreater(len(data["citations"]), 0)

    def test_08_out_of_scope_guardrail(self):
        res = self.client.post(f"/api/courses/{self.course_id}/chat", json={
            "question": "What is quantum chromodynamics?"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["is_grounded"])
        self.assertIn("not covered in the uploaded course material", data["answer"])
        self.assertEqual(len(data["citations"]), 0)

    def test_09_quiz_submission_and_topic_mastery_persistence(self):
        questions = self.bst_questions
        answers = [{"question_id": q["id"], "user_answer": q["options"][0]} for q in questions]

        res = self.client.post(f"/api/assessments/{self.bst_assessment_id}/submit", json={
            "topic_id": self.bst_topic_id,
            "answers": answers
        })
        self.assertEqual(res.status_code, 200)

        # Verify learner mastery for BST topic is persisted in database
        m = self.repo.get_mastery("demo_student", self.bst_topic_id)
        self.assertIsNotNone(m)
        self.assertGreater(m.questions_attempted, 0)

    def test_10_dashboard_metrics(self):
        res = self.client.get(f"/api/courses/{self.course_id}/dashboard")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["course_id"], self.course_id)
        self.assertGreater(data["quizzes_completed"], 0)
        self.assertIn("topic_masteries", data)

if __name__ == "__main__":
    unittest.main()
