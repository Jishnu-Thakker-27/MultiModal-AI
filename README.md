# AI Study Companion MVP (Track D Hackathon)

An end-to-end, source-grounded **AI Study Companion MVP** built with FastAPI, PostgreSQL/pgvector (with automatic local SQLite vector fallback), and React + Tailwind CSS.

---

## Key Features

1. **Course Management**: Create and switch active courses.
2. **Multimodal Ingestion**: Process PDF textbooks (PyMuPDF), PPTX lecture slides (`python-pptx`), and MP4 lecture videos (FFmpeg + Whisper timestamps).
3. **Source-Preserving Knowledge Base**: Retain exact source locations (`PDF Page X`, `PPT Slide Y`, `Video Timestamp HH:MM:SS`) through chunking, embedding, and vector storage.
4. **Grounded RAG Tutor Chat**: Interactive tutor answers questions strictly using uploaded material. Unanswered questions return *"This topic is not covered in the uploaded course material."*
5. **Structured Citations**: Every claim features interactive citation badges linking to exact page/slide/timestamp numbers.
6. **Adaptive Assessment Engine**: Generate verified MCQ, Short Answer, and Numerical quizzes tagged by difficulty and source context.
7. **Transparent Learner Mastery Model**: Track per-topic mastery scores ($0-100\%$) based on quiz attempts and accuracy.
8. **Personalized Tutor Guidance**: Learner profile highlights weak topics ($< 50\%$ mastery) to adapt future practice and tutor recommendations.
9. **Student Dashboard**: View overall progress, topic mastery bars, weak topics, and quiz performance.
10. **System Evaluation Suite**: Run automated RAGAS/DeepEval benchmarks measuring faithfulness, answer relevancy, context precision, and recall.

---

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS v4, Lucide React, Axios, React Router.
- **Backend**: Python, FastAPI, Uvicorn, SQLAlchemy, Pydantic.
- **Database**: PostgreSQL with `pgvector` (Automatic SQLite vector fallback enabled for instant offline running).
- **Document Processing**: PyMuPDF (`fitz`), `python-pptx`, FFmpeg / Whisper.
- **AI & RAG**: OpenAI API / Configurable LLM & Embedding models, NumPy vector search.

---

## Directory Structure

```
Code/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI application entrypoint
│   │   ├── config.py                  # Settings & environment configuration
│   │   ├── api/                       # REST endpoints (courses, docs, chat, topics, etc.)
│   │   ├── database/                  # SQLAlchemy models & repositories
│   │   ├── ingestion/                 # PDF, PPTX, Video/Whisper processors & chunker
│   │   ├── rag/                       # Vector retrieval, anti-hallucination prompt, generator
│   │   ├── assessment/                # Quiz generator, verifier & grading engine
│   │   ├── learner/                   # Learner model & topic mastery tracking
│   │   └── evaluation/                # RAGAS / DeepEval benchmark suite
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/                # Navbar, Sidebar
│   │   ├── pages/                     # Dashboard, Courses, Upload, Tutor, Practice, Progress, Eval
│   │   └── services/api.js            # API client
│   ├── package.json
│   └── vite.config.js
├── sample_data/                        # Sample course materials (PDF, PPTX, MP4)
└── README.md
```

---

## Quick Start Instructions

### 1. Environment Setup

Create `.env` file in `backend/`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/study_companion
SQLITE_FALLBACK=true

OPENAI_API_KEY=your_openai_api_key_here
LLM_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
CHUNK_SIZE=500
CHUNK_OVERLAP=50
```

### 2. Start Backend API

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Backend API Docs will be available at `http://localhost:8000/docs`.

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend application will run at `http://localhost:3000`.

---

## Demonstration Flow (End-to-End Loop)

1. **Create Course**: Navigate to **Courses** page and create a course (e.g. *"Data Structures & Algorithms"*).
2. **Upload Sources**: Go to **Upload Sources** and upload files from `sample_data/` (`Data_Structures_Overview.pdf`, `Trees_and_Graphs.pptx`, `Lecture_01_Trees.mp4`). Click **Process Now**.
3. **Ask AI Tutor**: Open **Learn / Tutor** and ask: *"What is AVL tree rotation?"* View grounded response with structured slide citation `Trees_and_Graphs.pptx — Slide 1`.
4. **Out-of-Scope Test**: Ask: *"What is quantum chromodynamics?"* Observe anti-hallucination response: *"This topic is not covered in the uploaded course material."*
5. **Generate & Submit Quiz**: Go to **Practice**, select topic *"Binary Search Trees"*, generate a 3-question MCQ quiz, submit answers, and view instant grading explanations.
6. **Check Mastery & Dashboard**: Open **Dashboard** or **Progress** to see updated topic mastery scores and weak topic alerts.
7. **Run Evaluation**: Open **Evaluation** page and execute system benchmark tests.
