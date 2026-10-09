import re
import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel

from app.providers.router import llm_router

logger = logging.getLogger("study_companion.assistant")

router = APIRouter(prefix="/api/assistant", tags=["Assistant"])

class AssistantCommandRequest(BaseModel):
    query: str
    pending_topic: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None

class AssistantCommandResponse(BaseModel):
    intent: str  # 'LEARN_TOPIC' | 'ASK_LEARN_FORMAT' | 'QUIZ_TOPIC' | 'ANALYTICS' | 'LIBRARY' | 'UNBUILT_FEATURE' | 'CHAT'
    can_execute: bool
    topic: Optional[str] = None
    difficulty: Optional[str] = "adaptive"
    num_questions: Optional[int] = None
    upload_category: Optional[str] = None  # 'pdf' | 'ppt' | 'video' | 'audio' | None
    auto_open_upload: bool = False
    direct_learning: bool = False
    reasoning: str
    chat_response: Optional[str] = None
    action_suggestions: Optional[List[str]] = None

SYSTEM_CAPABILITY_PROMPT = """You are Donna, the Autonomous AI Academic Operating System (acting as an intelligent academic assistant).
Analyze the student's request, whether phrased in active voice, passive voice, informal phrasing, questions, or spoken commands addressing Donna.

ACOUSTIC & SPEECH RECOGNITION CORRECTION:
- The student may be speaking via microphone where speech-to-text engines introduce acoustic errors.
- Always correct phonetic mishearings to the intended academic concept:
  * "curd fitting", "c=kalu fitting", "call fitting", "cur fitting", "curb fitting", "curve fiting" -> Curve Fitting
  * "four year series" / "four year transform" -> Fourier Series / Transform
  * "la place transform" -> Laplace Transform
  * "i can values" / "i can vectors" -> Eigenvalues / Eigenvectors
  * "db mess" / "d b m s" -> DBMS
  * "nap sack" -> Knapsack problem
  * "range kutta" -> Runge-Kutta
  * "newton rafson" -> Newton-Raphson

AUTONOMOUS IDENTITY:
- Your name is Donna.
- When students greet you or ask who you are, introduce yourself warmly as Donna, their autonomous AI academic companion.
- You can speak and answer questions, guide their learning, generate adaptive quizzes, and track their academic trajectory.

CURRENT APPLICATION CAPABILITIES:
1. LEARN_TOPIC:
   - Step-by-step Socratic multimodal learning for academic concepts, chapters, algorithms, or theories.
   - Examples (Active & Passive):
     * "Donna, make me learn probability"
     * "Teach me curve fitting"
     * "Teach me DBMS normalization"
     * "Curve fitting should be taught to me"
     * "Can you explain linear algebra?"
     * "I want to study calculus"
     * "Let's learn sorting algorithms"
   - If the student specifies a format (e.g. PDF, PPT, Video, Audio) or says "directly / from scratch / without upload", set upload_category or direct_learning=true.
   - If NO format is specified yet, intent must be "ASK_LEARN_FORMAT" to prompt for source material format (PDF, PPT, Video, Audio, or Direct).

2. QUIZ_TOPIC:
   - Adaptive practice quizzes and tests on any topic.
   - Examples: "Donna, quiz me on curve fitting", "I should be tested on DBMS", "Take my test on data structures", "Give me 20 questions on sorting".
   - Extract topic, difficulty (easy/medium/hard/adaptive), and question count (max 50).

3. ANALYTICS:
   - Review learning trajectory, mastery analytics, retention curves, weak topics.
   - Examples: "Show my weak topics", "Check my analytics", "How am I performing?".

4. LIBRARY:
   - Access saved study materials, uploaded PDFs, course notes.
   - Examples: "Open my library", "Show my uploaded files", "View my documents".

FEATURES NOT BUILT YET IN OUR SYSTEM (UNBUILT_FEATURE - can_execute=false):
   - Revision cram plans or one-day exam schedules ("Give me a revision plan for tomorrow's exam", "Revision recap")
   - Timetable, routine, daily schedule, or calendar sync ("What classes do I have tomorrow?", "Timetable")
   - Assignment / homework submission tracking ("Show my homework due dates", "What assignments do I have?")
   - Flashcards generation, Mindmap generation, or Podcast conversion.
   -> For these: state clearly that Donna cannot do that yet as this capability is currently in development, describe what Donna CAN do currently (Learn topics, Adaptive Quizzes, Learning Analytics, Library Documents), and provide helpful action suggestions.

5. CHAT:
   - General academic questions ("What is Bayes theorem?", "Who discovered calculus?"), greetings, or general dialogue with Donna.
   - Provide a clear, concise, intelligent response.

You MUST respond strictly with a valid JSON object with these keys:
{
  "intent": "LEARN_TOPIC" | "ASK_LEARN_FORMAT" | "QUIZ_TOPIC" | "ANALYTICS" | "LIBRARY" | "UNBUILT_FEATURE" | "CHAT",
  "can_execute": true | false,
  "topic": string or null,
  "difficulty": "easy" | "medium" | "hard" | "adaptive",
  "num_questions": integer or null,
  "upload_category": "pdf" | "ppt" | "video" | "audio" | null,
  "auto_open_upload": boolean,
  "direct_learning": boolean,
  "reasoning": string,
  "chat_response": string or null,
  "action_suggestions": string[] or null
}
"""

ACADEMIC_PHONETIC_RULES = [
    # 1. Curve Fitting (all acoustic and phonetic corruptions)
    (r'\b(?:curd|cur|call|cure|curb|kerf|karv|kerv|corve|core|court|c=kalu|kalu|cal|car|cart|curv|curve)\s*(?:fitting|fiting|feting|heating|hitting|hiting|sitting|getting|feedting|feeding|fittings)\b', 'curve fitting'),
    (r'\b(?:curd|cur|call|cure|curb|kerf|kerv|c=kalu)\s*fit\b', 'curve fitting'),
    (r'\bcurve\s*fit\b', 'curve fitting'),
    # 2. Fourier
    (r'\b(?:four\s*year|four\s*years?|for\s*year|for\s*here|4\s*year)\s+(series|transform|integral|analysis)\b', r'Fourier \1'),
    # 3. Laplace
    (r'\b(?:la\s*place|the\s*place|lay\s*place|lap\s*lace)\s+(transform|transforms?|equation)\b', r'Laplace \1'),
    # 4. Eigenvalues / Eigenvectors
    (r'\b(?:i\s*can|eye\s*can|i\s*ken|eye\s*ken|icon|aigen)\s*(values?|vectors?|space)\b', r'eigen\1'),
    # 5. DBMS & SQL
    (r'\b(?:d\s*b\s*m\s*s|db\s*ms|db\s*mess|the\s*bms|deep\s*ms)\b', 'DBMS'),
    (r'\b(?:s\s*q\s*l|sequel)\b', 'SQL'),
    (r'\b(?:no\s*sequel|no\s*s\s*q\s*l)\b', 'NoSQL'),
    # 6. Algorithms & Numerical Methods
    (r'\b(?:dike\s*stra|dijk\s*stra|dykstra|dike\s*straw|die\s*extra)(?:\'s)?\b', "Dijkstra's"),
    (r'\b(?:newton\s*rafson|newton\s*raphson|newton\s*rap\s*son)\b', 'Newton-Raphson'),
    (r'\b(?:range\s*kutta|runge\s*kuta|run\s*gay\s*kutta|range\s*cutter|roongey\s*kuta)\b', 'Runge-Kutta'),
    (r'\b(?:simpson\s*rule|simpsons\s*rule)\b', "Simpson's rule"),
    (r'\b(?:trap\s*zoidal|trap\s*azoidal|trapezoid)\s+rule\b', 'trapezoidal rule'),
    (r'\b(?:least\s*square|list\s*squares?|least\s*squires)\b', 'least squares'),
    (r'\b(?:nap\s*sack|nap\s*sac)\s*(?:problem)?\b', 'knapsack problem'),
    (r'\b(?:new\s*medical|new\s*miracle)\s*(methods?|analysis)\b', r'numerical \1'),
    # 7. Math & Probability
    (r'\b(?:poison\s*distribution)\b', 'Poisson distribution'),
    (r'\b(?:burn\s*oily|bar\s*nooly)\b', 'Bernoulli'),
    (r'\b(?:base\s*theorem|bays\s*theorem)\b', "Bayes' theorem"),
    (r'\b(?:poly\s*normal)\b', 'polynomial'),
    (r'\b(?:prob\s*ability)\b', 'probability'),
    (r'\b(?:bull\s*in\s*algebra|boo\s*lean)\s*algebra\b', 'Boolean algebra'),
    # 8. CS
    (r'\b(?:b\s*s\s*t|b\s*st)\b', 'BST'),
    (r'\b(?:queck\s*sort|quick\s*sword)\b', 'quicksort'),
    (r'\b(?:d\s*p)\s+problem\b', 'dynamic programming problem'),
    (r'\b(?:poly\s*more\s*fizz\s*em)\b', 'polymorphism'),
]

def normalize_academic_speech(text: str) -> str:
    if not text:
        return ""
    result = text
    for pattern, replacement in ACADEMIC_PHONETIC_RULES:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    return result

def rule_based_cognitive_reasoner(query: str, pending_topic: Optional[str] = None) -> AssistantCommandResponse:
    """
    High-precision linguistic and cognitive intent analyzer that handles active voice,
    passive voice, complex student syntax, voice commands, and Donna wake-word parsing.
    """
    normalized = normalize_academic_speech(query)
    trimmed = normalized.strip()
    lower = trimmed.lower()

    # Strip Donna wake word / address prefix
    cleaned_lower = re.sub(r'^(?:hey\s+donna|hi\s+donna|hello\s+donna|ok\s+donna|okay\s+donna|donna)[,\s!:]*', '', lower).strip()
    if not cleaned_lower and any(w in lower for w in ["donna", "hey donna", "hi donna"]):
        return AssistantCommandResponse(
            intent="CHAT",
            can_execute=True,
            reasoning="Wake word Donna detected with direct address.",
            chat_response="Hello! I am Donna, your autonomous academic AI assistant. How can I help your studies today? You can ask me to teach a topic, test your knowledge, or check your analytics.",
            action_suggestions=[
                "Teach me Curve Fitting",
                "Teach me Probability",
                "Quiz me on DBMS",
                "What are my weak topics?",
                "Open my library"
            ]
        )
    if cleaned_lower:
        lower = cleaned_lower

    # 1. Check for Pending Topic format selection
    if pending_topic:
        active_topic = pending_topic.strip()
        if any(w in lower for w in ["pdf", "notes", "document"]):
            return AssistantCommandResponse(
                intent="LEARN_TOPIC",
                can_execute=True,
                topic=active_topic,
                upload_category="pdf",
                auto_open_upload=True,
                reasoning=f"User selected PDF format for pending topic '{active_topic}'.",
                chat_response=f"Opening PDF upload workspace for **{active_topic}**..."
            )
        if any(w in lower for w in ["ppt", "powerpoint", "slide"]):
            return AssistantCommandResponse(
                intent="LEARN_TOPIC",
                can_execute=True,
                topic=active_topic,
                upload_category="ppt",
                auto_open_upload=True,
                reasoning=f"User selected PPT format for pending topic '{active_topic}'.",
                chat_response=f"Opening PPT upload workspace for **{active_topic}**..."
            )
        if any(w in lower for w in ["video", "youtube", "lecture"]):
            return AssistantCommandResponse(
                intent="LEARN_TOPIC",
                can_execute=True,
                topic=active_topic,
                upload_category="video",
                auto_open_upload=True,
                reasoning=f"User selected Video format for pending topic '{active_topic}'.",
                chat_response=f"Opening Video lecture workspace for **{active_topic}**..."
            )
        if any(w in lower for w in ["audio", "voice", "recording", "speech"]):
            return AssistantCommandResponse(
                intent="LEARN_TOPIC",
                can_execute=True,
                topic=active_topic,
                upload_category="audio",
                auto_open_upload=True,
                reasoning=f"User selected Audio format for pending topic '{active_topic}'.",
                chat_response=f"Opening Audio transcription workspace for **{active_topic}**..."
            )
        if any(w in lower for w in ["direct", "scratch", "ai", "no file", "basics", "without", "start"]):
            return AssistantCommandResponse(
                intent="LEARN_TOPIC",
                can_execute=True,
                topic=active_topic,
                direct_learning=True,
                auto_open_upload=False,
                reasoning=f"User selected direct AI explanation for '{active_topic}'.",
                chat_response=f"Calibrating step-by-step intuition workspace for **{active_topic}**..."
            )

    # 2. Check for Unbuilt Features (capability reasoner: can our system do this?)
    is_revision = (
        "recap" in lower or "revison" in lower or "revision" in lower or
        ("revise" in lower and any(w in lower for w in ["exam", "chapter", "tomorrow", "plan", "cram", "everything"])) or
        ("exam" in lower and any(w in lower for w in ["plan", "tomorrow", "cram", "prepare"]))
    )
    is_timetable = any(w in lower for w in [
        "timetable", "schedule", "routine", "calendar", "what do i have tomorrow",
        "test tomorrow", "class tomorrow", "classes tomorrow"
    ])
    is_assignments = any(w in lower for w in [
        "assignment", "homework", "due date", "submission", "due tomorrow"
    ])
    is_flashcards_mindmap = any(w in lower for w in ["flashcard", "mind map", "mindmap", "podcast"])

    if is_revision or is_timetable or is_assignments or is_flashcards_mindmap:
        if is_timetable:
            msg = "I can't do that yet. Timetable and class schedule sync are currently in development."
        elif is_assignments:
            msg = "I can't do that yet. Homework and assignment tracking features are currently in development."
        elif is_flashcards_mindmap:
            msg = "I can't do that yet. Flashcards and mindmap generation are currently in development."
        else:
            msg = "I can't do that yet. Exam revision plans and chapter cram schedules are currently in development."

        return AssistantCommandResponse(
            intent="UNBUILT_FEATURE",
            can_execute=False,
            reasoning="Feature requested is not yet built in our current academic operating system.",
            chat_response=f"{msg} Currently, I can teach you concepts step-by-step, generate adaptive quizzes, review your learning analytics, and manage your library documents. What would you like to explore?",
            action_suggestions=[
                "Teach me Probability",
                "Quiz me on DBMS",
                "What are my weak topics?",
                "Open my library"
            ]
        )

    # 3. Quiz Intent (Active & Passive: "Quiz me on X", "Test my knowledge", "X should be tested", "I want to be quizzed on X")
    is_quiz_query = bool(re.search(
        r'\b(quiz|test\s+me|take\s+(?:a\s+|my\s+)?(?:quiz|test)|practice\s+questions?|assessment|be\s+quizzed|be\s+tested)\b',
        lower
    ))
    if is_quiz_query:
        # Extract difficulty
        difficulty = "adaptive"
        if any(w in lower for w in ["hard", "difficult", "advanced"]):
            difficulty = "hard"
        elif any(w in lower for w in ["easy", "simple", "beginner"]):
            difficulty = "easy"
        elif any(w in lower for w in ["medium", "intermediate"]):
            difficulty = "medium"

        # Extract number of questions / marks (e.g. "50 marks", "20 questions", "quiz of 30")
        num_q = None
        q_match = re.search(r'(\d+)\s*(?:questions?|marks?|items?)', lower)
        if q_match:
            try:
                num_q = min(int(q_match.group(1)), 50)
            except ValueError:
                pass

        # Extract topic
        topic = None
        topic_match = re.search(r'(?:quiz(?:\s+me)?(?:\s+on|\s+about)?|test(?:\s+me)?(?:\s+on|\s+about)?|tested\s+on|quizzed\s+on)\s+([a-zA-Z0-9\s]+?)(?:\s+with|\s+of|\s+for|\s+notes|\s+chapter|\.|$)', lower)
        if topic_match:
            cand = topic_match.group(1).strip()
            cand = re.sub(r'^(a|an|the|my|hard|easy|medium)\s+', '', cand).strip()
            if cand and cand not in ['me', 'us', 'him', 'her', 'it', 'this', 'that']:
                topic = cand.title()

        return AssistantCommandResponse(
            intent="QUIZ_TOPIC",
            can_execute=True,
            topic=topic,
            difficulty=difficulty,
            num_questions=num_q,
            reasoning=f"Identified quiz request for topic '{topic}' with {num_q or 'adaptive'} questions.",
            chat_response=f"Generating adaptive quiz on **{topic or 'Course Material'}**..."
        )

    # 4. Learning Intent (Comprehensive Active & Passive detection)
    # Active patterns:
    # "make me learn X", "teach me X", "i want to learn X", "i need to study X", "explain X", "help me understand X"
    # Passive patterns:
    # "X should be taught to me", "can X be explained", "X needs to be learned", "let X be taught"
    learn_patterns = [
        r'\b(?:make\s+me\s+learn|teach\s+me|want\s+to\s+learn|learn|study|explain|help\s+me\s+understand|guide\s+me\s+through|walk\s+me\s+through|master|get\s+started\s+with)\b',
        r'\b(?:should\s+be\s+taught|be\s+explained|be\s+taught|needs\s+to\s+be\s+learned|can\s+be\s+taught)\b',
        r'\b(?:explain\s+to\s+me|tell\s+me\s+about|break\s+down)\b'
    ]
    is_learn_query = any(re.search(p, lower) for p in learn_patterns)

    if is_learn_query:
        # Extract topic
        topic = None
        # Try active extraction: "make me learn [topic]" / "teach me [topic]"
        m_active = re.search(
            r'(?:make\s+me\s+learn|teach\s+me|want\s+to\s+learn|learn|study|explain|help\s+me\s+understand|guide\s+me\s+through|master|about)\s+([a-zA-Z0-9\s]+?)(?:\s+from|\s+using|\s+with|\s+in|\s+notes|\s+chapter|\.|$)',
            lower
        )
        if m_active:
            cand = m_active.group(1).strip()
            cand = re.sub(r'^(a|an|the|my|about)\s+', '', cand).strip()
            if cand and cand not in ['me', 'us', 'it', 'this', 'that', 'concept', 'topic', 'something']:
                topic = cand.title()

        # Try passive extraction: "[topic] should be taught to me" / "can [topic] be taught"
        if not topic:
            m_passive = re.search(
                r'([a-zA-Z0-9\s]+?)\s+(?:should\s+be\s+taught|needs?\s+to\s+be\s+learned|can\s+be\s+taught|be\s+explained)',
                lower
            )
            if m_passive:
                cand = m_passive.group(1).strip()
                cand = re.sub(r'^(can|could|please|let|the|a|an)\s+', '', cand).strip()
                if cand and cand not in ['i', 'we', 'you', 'it', 'this', 'that']:
                    topic = cand.title()

        # Detect if format was explicitly requested in prompt
        upload_cat = None
        is_direct = False
        if any(w in lower for w in ["pdf", "notes", "document"]):
            upload_cat = "pdf"
        elif any(w in lower for w in ["ppt", "powerpoint", "slide"]):
            upload_cat = "ppt"
        elif any(w in lower for w in ["video", "youtube", "lecture"]):
            upload_cat = "video"
        elif any(w in lower for w in ["audio", "voice", "recording"]):
            upload_cat = "audio"
        elif any(w in lower for w in ["direct", "scratch", "without upload", "no file", "basics", "from zero"]):
            is_direct = True

        display_topic = topic or "Topic"

        if upload_cat:
            return AssistantCommandResponse(
                intent="LEARN_TOPIC",
                can_execute=True,
                topic=display_topic,
                upload_category=upload_cat,
                auto_open_upload=True,
                reasoning=f"User requested to learn '{display_topic}' with {upload_cat.upper()} upload.",
                chat_response=f"Setting up learning workspace for **{display_topic}** with {upload_cat.upper()} upload..."
            )
        elif is_direct:
            return AssistantCommandResponse(
                intent="LEARN_TOPIC",
                can_execute=True,
                topic=display_topic,
                direct_learning=True,
                auto_open_upload=False,
                reasoning=f"User requested direct explanation for '{display_topic}'.",
                chat_response=f"Launching direct AI tutor for **{display_topic}**..."
            )
        else:
            # Need to ask format!
            return AssistantCommandResponse(
                intent="ASK_LEARN_FORMAT",
                can_execute=True,
                topic=display_topic,
                reasoning=f"User wants to learn '{display_topic}'. Asking for source format.",
                chat_response=f"To calibrate your learning session for **{display_topic}**, what source material format would you like to use?",
                action_suggestions=[
                    "Upload PDF Notes",
                    "Upload PPT Slides",
                    "Video Lecture",
                    "Audio Recording",
                    "Start Directly with AI"
                ]
            )

    # 5. Analytics Intent
    if any(w in lower for w in ["analytics", "progress", "weak", "performance", "mastery", "how am i doing", "retention"]):
        return AssistantCommandResponse(
            intent="ANALYTICS",
            can_execute=True,
            reasoning="User requested learning analytics and progress view.",
            chat_response="Opening your personalized Learning Analytics & Trajectory..."
        )

    # 6. Library Intent
    if any(w in lower for w in ["library", "my documents", "uploaded files", "stored notes", "sources"]):
        return AssistantCommandResponse(
            intent="LIBRARY",
            can_execute=True,
            reasoning="User requested library documents.",
            chat_response="Opening your Document Library & Sources..."
        )

    # 7. Standalone Academic Concept / Topic (e.g. "curve fitting", "probability", "calculus")
    standalone_words = lower.split()
    is_conversational = any(w in lower for w in [
        "hi", "hello", "hey", "who are you", "what are you", "what can you do", "help",
        "how does this work", "thanks", "thank you", "bye", "goodbye", "cool", "ok", "okay"
    ])
    if not is_conversational and 1 <= len(standalone_words) <= 5:
        display_topic = trimmed.title()
        return AssistantCommandResponse(
            intent="ASK_LEARN_FORMAT",
            can_execute=True,
            topic=display_topic,
            reasoning=f"Identified standalone academic topic '{display_topic}'. Asking for source format.",
            chat_response=f"To calibrate your learning session for **{display_topic}**, what source material format would you like to use?",
            action_suggestions=[
                "Upload PDF Notes",
                "Upload PPT Slides",
                "Video Lecture",
                "Audio Recording",
                "Start Directly with AI"
            ]
        )

    # 8. General Academic Chat / Question
    return AssistantCommandResponse(
        intent="CHAT",
        can_execute=True,
        reasoning="Conversational or general query.",
        chat_response="I am Donna, your autonomous academic AI companion. I can teach you concepts step-by-step, generate personalized quizzes, or analyze your learning trajectory. What would you like to explore today?",
        action_suggestions=[
            "Teach me Curve Fitting",
            "Teach me Probability",
            "Quiz me on DBMS",
            "What are my weak topics?",
            "Open my library"
        ]
    )

@router.post("/command", response_model=AssistantCommandResponse)
def process_assistant_command(payload: AssistantCommandRequest):
    """
    Intelligently analyzes student natural language queries (active/passive/slang)
    using LLM reasoning with seamless fallback to our rule-based cognitive analyzer.
    """
    query = normalize_academic_speech(payload.query.strip())
    if not query:
        return rule_based_cognitive_reasoner("hello")

    prompt = f"""Student input: "{query}"
Pending active topic: {payload.pending_topic or 'None'}

Think step-by-step:
1. What does the student want to do? (Active voice, passive voice, or question)
2. Can our system do this right now?
   - Supported: LEARN_TOPIC (or ASK_LEARN_FORMAT if format unknown), QUIZ_TOPIC, ANALYTICS, LIBRARY.
   - Unbuilt: Timetable/schedules, exam cram/revision plans, homework trackers, flashcards, mindmaps.
3. If unbuilt: explain clearly and politely what is unbuilt and what the system CAN do instead.
4. Output strictly valid JSON."""

    try:
        provider_resp = llm_router.generate(
            prompt=prompt,
            system_prompt=SYSTEM_CAPABILITY_PROMPT
        )
        if provider_resp.is_success and provider_resp.content:
            raw_text = provider_resp.content.strip()
            # Extract json if wrapped in ```json ... ```
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, re.DOTALL)
            if json_match:
                raw_text = json_match.group(1)
            elif "{" in raw_text and "}" in raw_text:
                start = raw_text.find("{")
                end = raw_text.rfind("}") + 1
                raw_text = raw_text[start:end]

            parsed = json.loads(raw_text)
            return AssistantCommandResponse(
                intent=parsed.get("intent", "CHAT"),
                can_execute=parsed.get("can_execute", True),
                topic=parsed.get("topic"),
                difficulty=parsed.get("difficulty", "adaptive"),
                num_questions=parsed.get("num_questions"),
                upload_category=parsed.get("upload_category"),
                auto_open_upload=parsed.get("auto_open_upload", False),
                direct_learning=parsed.get("direct_learning", False),
                reasoning=parsed.get("reasoning", "LLM cognitive deduction"),
                chat_response=parsed.get("chat_response"),
                action_suggestions=parsed.get("action_suggestions")
            )
    except Exception as e:
        logger.warning(f"LLM command deduction fallback: {e}")

    # Fallback to high-precision rule-based reasoner
    return rule_based_cognitive_reasoner(query, payload.pending_topic)
