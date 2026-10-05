import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database.session import init_db, SessionLocal
from app.database.repositories import Repository

class TestNumericalIntegrationChapter(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        cls.repo = Repository(cls.db)

        # 1. Create course & conversation
        res_c = cls.client.post("/api/courses", json={
            "title": "Numerical Analysis & Integration Course",
            "description": "Chapter 5 Numerical Integration Benchmark"
        })
        cls.course_id = res_c.json()["id"]

        res_conv = cls.client.post("/api/conversations", json={
            "course_id": cls.course_id,
            "title": "Numerical Integration Session",
            "topic_name": "Numerical Integration"
        })
        cls.conv_id = res_conv.json()["id"]

        # 2. Upload and process Chapter 5- Numerical Integration.pdf
        pdf_path = os.path.join(os.path.dirname(__file__), "uploads", "default_course", "Chapter 5- Numerical Integration.pdf")
        if not os.path.exists(pdf_path):
            pdf_path = os.path.join(os.path.dirname(__file__), "sample_data", "Chapter 5- Numerical Integration.pdf")

        assert os.path.exists(pdf_path), f"Numerical Integration PDF missing at {pdf_path}"

        with open(pdf_path, "rb") as f:
            res_up = cls.client.post(
                f"/api/conversations/{cls.conv_id}/upload",
                files={"file": ("Chapter_5_Numerical_Integration.pdf", f, "application/pdf")}
            )
        assert res_up.status_code == 200, f"Upload failed: {res_up.text}"
        print(f"\n[SETUP] Successfully ingested {pdf_path} (Chunks: {res_up.json().get('chunks_count')})")

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def setUp(self):
        import time
        from app.providers.circuit_breaker import circuit_breaker
        circuit_breaker.reset("gemini")
        time.sleep(2.0)


    def test_q1_explain_numerical_integration_broad(self):
        res = self.client.post(f"/api/conversations/{self.conv_id}/chat?debug=true", json={
            "question": "Explain me numerical integration"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print("\n--- TEST 1: Explain numerical integration ---")
        print("Grounded:", data["is_grounded"])
        print("Citations:", [c["document_title"] + f" p.{c.get('page')}" for c in data["citations"]])
        print("Answer Excerpt:\n", data["answer"][:300].encode('ascii', 'ignore').decode('ascii'))

        self.assertTrue(data["is_grounded"])
        self.assertGreater(len(data["citations"]), 0)
        answer_lower = data["answer"].lower()
        self.assertIn("integration", answer_lower)

    def test_q2_explain_trapezoidal_rule(self):
        res = self.client.post(f"/api/conversations/{self.conv_id}/chat", json={
            "question": "Explain trapezoidal rule"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print("\n--- TEST 2: Explain trapezoidal rule ---")
        print("Answer Excerpt:\n", data["answer"][:250].encode('ascii', 'ignore').decode('ascii'))
        self.assertTrue(data["is_grounded"])
        self.assertIn("trapezoid", data["answer"].lower())

    def test_q3_explain_simpsons_1_3_rule(self):
        res = self.client.post(f"/api/conversations/{self.conv_id}/chat", json={
            "question": "Explain Simpson's 1/3 rule"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print("\n--- TEST 3: Explain Simpson's 1/3 rule ---")
        print("Answer Excerpt:\n", data["answer"][:250].encode('ascii', 'ignore').decode('ascii'))
        self.assertTrue(data["is_grounded"])

    def test_q4_explain_simpsons_3_8_rule(self):
        res = self.client.post(f"/api/conversations/{self.conv_id}/chat", json={
            "question": "Explain Simpson's 3/8 rule"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print("\n--- TEST 4: Explain Simpson's 3/8 rule ---")
        print("Answer Excerpt:\n", data["answer"][:250].encode('ascii', 'ignore').decode('ascii'))
        self.assertTrue(data["is_grounded"])

    def test_q5_compare_trapezoidal_and_simpsons(self):
        res = self.client.post(f"/api/conversations/{self.conv_id}/chat", json={
            "question": "Compare trapezoidal rule and Simpson's 1/3 rule"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print("\n--- TEST 5: Compare trapezoidal rule and Simpson's 1/3 rule ---")
        print("Answer Excerpt:\n", data["answer"][:250].encode('ascii', 'ignore').decode('ascii'))
        self.assertTrue(data["is_grounded"])

    def test_q6_explain_example(self):
        res = self.client.post(f"/api/conversations/{self.conv_id}/chat", json={
            "question": "Explain Example 5.2"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print("\n--- TEST 6: Explain Example 5.2 ---")
        print("Answer Excerpt:\n", data["answer"][:250].encode('ascii', 'ignore').decode('ascii'))

    def test_q7_formula_simpsons_3_8(self):
        res = self.client.post(f"/api/conversations/{self.conv_id}/chat", json={
            "question": "Give me the formula for Simpson's 3/8 rule"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print("\n--- TEST 7: Formula for Simpson's 3/8 rule ---")
        print("Answer Excerpt:\n", data["answer"][:250].encode('ascii', 'ignore').decode('ascii'))
        self.assertTrue(data["is_grounded"])

    def test_q8_forward_difference_method(self):
        res = self.client.post(f"/api/conversations/{self.conv_id}/chat", json={
            "question": "What is forward difference method?"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print("\n--- TEST 8: What is forward difference method ---")
        print("Grounded:", data["is_grounded"])
        print("Answer Excerpt:\n", data["answer"][:250].encode('ascii', 'ignore').decode('ascii'))


if __name__ == "__main__":
    unittest.main()
