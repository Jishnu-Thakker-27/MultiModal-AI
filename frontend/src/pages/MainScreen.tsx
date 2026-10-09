import React, { useState, useEffect, useRef } from 'react';
import { ScreenType } from '../types';
import { JarvisAnimation } from '../components/JarvisAnimation';
import {
  normalizeAcademicSpeech,
  pickAndNormalizeSpeech,
  ACADEMIC_JSGF_GRAMMAR,
} from '../services/speechNormalizer';

export type CommandIntentType =
  | 'LEARN_TOPIC'
  | 'ASK_LEARN_FORMAT'
  | 'QUIZ_TOPIC'
  | 'ANALYTICS'
  | 'LIBRARY'
  | 'UNBUILT_FEATURE'
  | 'CHAT';

export interface ParsedAcademicIntent {
  intent: CommandIntentType;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'adaptive';
  uploadCategory?: 'pdf' | 'ppt' | 'video' | 'audio';
  autoOpenUpload?: boolean;
  originalPrompt: string;
  chatResponse?: string;
  actionSuggestions?: string[];
}

export function parseAcademicCommand(query: string, pendingTopic?: string | null): ParsedAcademicIntent {
  const normalized = normalizeAcademicSpeech(query);
  const trimmed = normalized.trim();
  // Strip Donna wake word or address prefix if spoken or typed
  const cleanQuery = trimmed.replace(/^(?:hey\s+donna|hi\s+donna|hello\s+donna|ok\s+donna|okay\s+donna|donna)[,\s!:]*/i, '').trim();
  const lower = (cleanQuery || trimmed).toLowerCase();

  // If user only says "Donna" or "Hey Donna"
  if (!cleanQuery && /^(?:hey\s+donna|hi\s+donna|hello\s+donna|donna)[\s!.]*$/i.test(trimmed)) {
    return {
      intent: 'CHAT',
      originalPrompt: trimmed,
      chatResponse: "Hello! I am Donna, your autonomous academic AI assistant. How can I help your studies today? You can speak to me or type your request.",
      actionSuggestions: [
        'Teach me Probability',
        'Quiz me on DBMS',
        'What are my weak topics?',
        'Open my library',
      ],
    };
  }

  // Difficulty extraction
  let difficulty: 'easy' | 'medium' | 'hard' | 'adaptive' = 'adaptive';
  if (lower.includes('hard') || lower.includes('difficult') || lower.includes('advanced')) {
    difficulty = 'hard';
  } else if (lower.includes('easy') || lower.includes('simple') || lower.includes('beginner')) {
    difficulty = 'easy';
  } else if (lower.includes('medium') || lower.includes('intermediate')) {
    difficulty = 'medium';
  }

  // 1. Direct Click / Resolution of Upload Format Suggestions (or responding when pendingTopic is set)
  if (trimmed.includes('Upload PDF') || trimmed.includes('PDF Notes')) {
    return {
      intent: 'LEARN_TOPIC',
      topic: pendingTopic || 'Topic',
      uploadCategory: 'pdf',
      autoOpenUpload: true,
      originalPrompt: trimmed,
    };
  }
  if (trimmed.includes('Upload PPT') || trimmed.includes('PPT Slides')) {
    return {
      intent: 'LEARN_TOPIC',
      topic: pendingTopic || 'Topic',
      uploadCategory: 'ppt',
      autoOpenUpload: true,
      originalPrompt: trimmed,
    };
  }
  if (trimmed.includes('Video Lecture')) {
    return {
      intent: 'LEARN_TOPIC',
      topic: pendingTopic || 'Topic',
      uploadCategory: 'video',
      autoOpenUpload: true,
      originalPrompt: trimmed,
    };
  }
  if (trimmed.includes('Audio Recording')) {
    return {
      intent: 'LEARN_TOPIC',
      topic: pendingTopic || 'Topic',
      uploadCategory: 'audio',
      autoOpenUpload: true,
      originalPrompt: trimmed,
    };
  }
  if (trimmed.includes('Start Directly')) {
    return {
      intent: 'LEARN_TOPIC',
      topic: pendingTopic || 'Topic',
      autoOpenUpload: false,
      originalPrompt: `Explain ${pendingTopic || 'topic'} step-by-step from basics to advanced`,
    };
  }

  // If a topic is already pending and the user answers with format in plain text:
  if (pendingTopic) {
    if (lower.includes('pdf')) {
      return {
        intent: 'LEARN_TOPIC',
        topic: pendingTopic,
        uploadCategory: 'pdf',
        autoOpenUpload: true,
        originalPrompt: trimmed,
      };
    }
    if (lower.includes('ppt') || lower.includes('powerpoint') || lower.includes('slide')) {
      return {
        intent: 'LEARN_TOPIC',
        topic: pendingTopic,
        uploadCategory: 'ppt',
        autoOpenUpload: true,
        originalPrompt: trimmed,
      };
    }
    if (lower.includes('video') || lower.includes('youtube')) {
      return {
        intent: 'LEARN_TOPIC',
        topic: pendingTopic,
        uploadCategory: 'video',
        autoOpenUpload: true,
        originalPrompt: trimmed,
      };
    }
    if (lower.includes('audio') || lower.includes('recording') || lower.includes('voice') || lower.includes('speech')) {
      return {
        intent: 'LEARN_TOPIC',
        topic: pendingTopic,
        uploadCategory: 'audio',
        autoOpenUpload: true,
        originalPrompt: trimmed,
      };
    }
    if (lower.includes('direct') || lower.includes('basics') || lower.includes('scratch') || lower.includes('ai') || lower.includes('no file') || lower.includes('without upload') || lower.includes('start')) {
      return {
        intent: 'LEARN_TOPIC',
        topic: pendingTopic,
        autoOpenUpload: false,
        originalPrompt: `Explain ${pendingTopic} step-by-step from basics to advanced`,
      };
    }
  }

  // 2. Check for unbuilt features (Revision recap, timetable, assignments, exam cram, etc.)
  const isRevisionOrRecap =
    lower.includes('recap') ||
    lower.includes('revison') ||
    lower.includes('revision') ||
    (lower.includes('revise') && (lower.includes('recap') || lower.includes('chapter') || lower.includes('exam') || lower.includes('plan') || lower.includes('everything') || lower.includes('week'))) ||
    (lower.includes('exam') && (lower.includes('prepare') || lower.includes('tomorrow') || lower.includes('plan') || lower.includes('cram'))) ||
    lower.includes('revision plan');

  const isScheduleOrTimetable =
    lower.includes('timetable') ||
    lower.includes('schedule') ||
    lower.includes('routine') ||
    lower.includes('calendar') ||
    lower.includes('what do i have tomorrow') ||
    lower.includes('test tomorrow') ||
    lower.includes('class tomorrow');

  const isAssignments =
    lower.includes('assignment') ||
    lower.includes('homework') ||
    lower.includes('due date') ||
    lower.includes('submission');

  const isFlashcardOrMindmap =
    lower.includes('flashcard') ||
    lower.includes('mind map') ||
    lower.includes('mindmap') ||
    lower.includes('podcast');

  if (isRevisionOrRecap || isScheduleOrTimetable || isAssignments || isFlashcardOrMindmap) {
    let specificMessage = "I can't do that yet. Revision recaps and chapter summaries are currently in development.";
    if (isScheduleOrTimetable) {
      specificMessage = "I can't do that yet. Timetable and class schedule integrations are currently in development.";
    } else if (isAssignments) {
      specificMessage = "I can't do that yet. Assignment and homework tracking features are currently in development.";
    } else if (isFlashcardOrMindmap) {
      specificMessage = "I can't do that yet. Flashcards and mindmap generation are currently in development.";
    }

    return {
      intent: 'UNBUILT_FEATURE',
      originalPrompt: trimmed,
      chatResponse: `${specificMessage} Currently, I can teach you concepts step-by-step, generate adaptive quizzes, review your learning analytics, and manage your library documents. What would you like to explore?`,
      actionSuggestions: [
        'Teach me Probability',
        'Quiz me on DBMS',
        'What are my weak topics?',
        'Open my library',
      ],
    };
  }

  // 3. Quiz / Assessment Intent (explicit quiz request)
  if (
    lower.includes('quiz') ||
    lower.includes('test me') ||
    lower.includes('take a test') ||
    lower.includes('take my test') ||
    lower.includes('take my quiz') ||
    lower.includes('take a quiz') ||
    lower.includes('practice test') ||
    lower.includes('practice questions') ||
    (lower.includes('test') && (lower.includes('on') || lower.includes('my understanding')))
  ) {
    let topic = '';
    const match = lower.match(/(?:quiz(?:\s+me)?(?:\s+on|\s+using|\s+about)?|test(?:\s+me)?(?:\s+on|\s+my\s+understanding\s+of)?)\s+([a-zA-Z0-9\s]+?)(?:\s+notes|\s+chapter|\.|$)/i);
    if (match && match[1]) {
      topic = match[1].replace(/^(a|an|the|my|hard|easy|medium)\s+/i, '').trim();
      if (['me', 'us', 'him', 'her', 'it', 'this', 'that', ''].includes(topic.toLowerCase())) {
        topic = '';
      }
    }
    return {
      intent: 'QUIZ_TOPIC',
      topic: topic || undefined,
      difficulty,
      originalPrompt: trimmed,
    };
  }

  // 4. Analytics / Weak spots / Progress Intent
  if (
    lower.includes('weak') ||
    lower.includes('progress') ||
    lower.includes('analytics') ||
    lower.includes('mastery') ||
    lower.includes('score') ||
    lower.includes('how am i doing') ||
    lower.includes('performance') ||
    lower.includes('learning report')
  ) {
    return {
      intent: 'ANALYTICS',
      originalPrompt: trimmed,
    };
  }

  // 5. Library / Document / Notes Intent
  if (
    (lower.includes('notes') && (lower.includes('open') || lower.includes('show') || lower.includes('view') || lower.includes('find'))) ||
    (lower.includes('pdf') && (lower.includes('open') || lower.includes('upload') || lower.includes('view'))) ||
    lower.includes('library') ||
    lower.includes('sources') ||
    lower.includes('my documents') ||
    lower.includes('uploaded material')
  ) {
    return {
      intent: 'LIBRARY',
      originalPrompt: trimmed,
    };
  }

  // 6. Learn / Teach Intent (Supports all Active and Passive variations)
  // Active: "make me learn", "teach me", "want to learn", "need to study", "explain to me", "guide me through", "master", "start learning"
  // Passive: "should be taught", "needs to be learned", "can be taught", "be explained to me", "be tutored"
  const learnPatterns = [
    /\b(?:make\s+me\s+learn|make\s+me\s+study|teach\s+me|want\s+to\s+learn|want\s+to\s+study|need\s+to\s+learn|need\s+to\s+study|learn|study|explain|help\s+me\s+understand|guide\s+me\s+through|walk\s+me\s+through|master|get\s+started\s+with)\b/i,
    /\b(?:should\s+be\s+taught|needs?\s+to\s+be\s+learned|can\s+be\s+taught|be\s+explained|be\s+tutored)\b/i,
    /\b(?:explain\s+to\s+me|tell\s+me\s+about|break\s+down)\b/i,
  ];

  const isExplicitLearnRequest = learnPatterns.some((p) => p.test(lower));

  if (isExplicitLearnRequest) {
    let topic = '';

    // Try active extraction first: "make me learn probability"
    const matchActive = lower.match(
      /(?:make\s+me\s+learn|make\s+me\s+study|teach\s+me|want\s+to\s+learn|want\s+to\s+study|need\s+to\s+learn|need\s+to\s+study|learn|study|explain|help\s+me\s+understand|guide\s+me\s+through|walk\s+me\s+through|master|about)\s+([a-zA-Z0-9\s]+?)(?:\s+from|\s+using|\s+with|\s+in|\s+notes|\s+chapter|\.|$)/i
    );
    if (matchActive && matchActive[1]) {
      topic = matchActive[1].replace(/^(a|an|the|my|about)\s+/i, '').trim();
    }

    // Try passive extraction if not found: "probability should be taught to me"
    if (!topic || ['me', 'us', 'it', 'this', 'that', 'concept', 'topic', 'something', 'anything', ''].includes(topic.toLowerCase())) {
      const matchPassive = lower.match(
        /([a-zA-Z0-9\s]+?)\s+(?:should\s+be\s+taught|needs?\s+to\s+be\s+learned|can\s+be\s+taught|be\s+explained|be\s+tutored)/i
      );
      if (matchPassive && matchPassive[1]) {
        topic = matchPassive[1].replace(/^(can|could|please|let|the|a|an)\s+/i, '').trim();
      }
    }

    if (['me', 'us', 'it', 'this', 'that', 'concept', 'topic', 'something', 'anything', ''].includes(topic.toLowerCase())) {
      topic = '';
    }

    if (!topic && (lower.trim() === 'learn' || lower.trim() === 'teach me' || lower.trim() === 'i want to learn' || lower.trim() === 'teach')) {
      return {
        intent: 'CHAT',
        originalPrompt: trimmed,
        chatResponse: "What topic would you like to learn? For example, you can tell me 'Teach me Probability' or 'Explain Normalization'.",
        actionSuggestions: [
          'Teach me Probability',
          'Teach me DBMS Normalization',
          'Teach me Calculus',
        ],
      };
    }

    const cleanTopic = topic ? (topic.charAt(0).toUpperCase() + topic.slice(1)) : 'Topic';

    // Check if user already provided upload format in the prompt
    let detectedCategory: 'pdf' | 'ppt' | 'video' | 'audio' | null = null;
    let isDirect = false;

    if (lower.includes('pdf')) {
      detectedCategory = 'pdf';
    } else if (lower.includes('ppt') || lower.includes('powerpoint') || lower.includes('slide')) {
      detectedCategory = 'ppt';
    } else if (lower.includes('video') || lower.includes('youtube')) {
      detectedCategory = 'video';
    } else if (lower.includes('audio') || lower.includes('voice') || lower.includes('recording')) {
      detectedCategory = 'audio';
    } else if (lower.includes('direct') || lower.includes('basics') || lower.includes('scratch') || lower.includes('without upload') || lower.includes('no file')) {
      isDirect = true;
    }

    if (detectedCategory) {
      return {
        intent: 'LEARN_TOPIC',
        topic: cleanTopic,
        uploadCategory: detectedCategory,
        autoOpenUpload: true,
        originalPrompt: trimmed,
      };
    }
    if (isDirect) {
      return {
        intent: 'LEARN_TOPIC',
        topic: cleanTopic,
        autoOpenUpload: false,
        originalPrompt: trimmed,
      };
    }

    // Format not specified: ASK FOR MISSING UPLOAD FORMAT!
    return {
      intent: 'ASK_LEARN_FORMAT',
      topic: cleanTopic,
      originalPrompt: trimmed,
      chatResponse: `To calibrate the optimal learning session for **${cleanTopic}**, what study material format would you like to use? You can upload your lecture materials or start directly from our Socratic knowledge base:`,
      actionSuggestions: [
        '📄 Upload PDF Notes',
        '📊 Upload PPT Slides',
        '🎥 Video Lecture',
        '🎙️ Audio Recording',
        '⚡ Start Directly (AI Knowledge Base)',
      ],
    };
  }

  // 7. Conversational Chat on Main Screen (Greetings, help, identity, questions)
  if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|yo|sup)[\s!.]*$/i.test(trimmed) || /^(hi|hello|hey|greetings|yo|sup)[\s!.]*$/i.test(lower)) {
    return {
      intent: 'CHAT',
      originalPrompt: trimmed,
      chatResponse: 'Hello! I am Donna, your autonomous Academic AI companion. How can I help your studies today? You can speak to me or type your request.',
      actionSuggestions: [
        'Teach me Probability',
        'Quiz me on DBMS',
        'What are my weak topics?',
      ],
    };
  }

  if (
    lower.includes('who are you') ||
    lower.includes('what are you') ||
    lower.includes('what is your name') ||
    lower.includes('what can you do') ||
    lower.includes('help') ||
    lower.includes('how does this work') ||
    lower.includes('capabilities')
  ) {
    return {
      intent: 'CHAT',
      originalPrompt: trimmed,
      chatResponse: `I am Donna, your autonomous AI Academic Operating System. Here is what I can do for you right now:\n\n• **Voice & Speech**: Speak to me directly and I will listen and answer.\n• **Teach Concepts**: Ask "Teach me [topic]" for step-by-step Socratic learning.\n• **Adaptive Quizzes**: Ask "Quiz me on [topic]" to test your mastery.\n• **Track Performance**: Ask "What are my weak topics?" or "Show my progress".\n• **Study Documents**: Ask "Open my library" to work with uploaded course materials.`,
      actionSuggestions: [
        'Teach me Probability',
        'Quiz me on DBMS',
        'Show my progress',
        'Open my library',
      ],
    };
  }

  // Standalone Academic Topic / Concept detection (e.g. "curve fitting", "linear algebra", "DBMS")
  const standaloneWords = lower.split(/\s+/).filter(Boolean);
  const isConversational =
    /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|yo|sup)[\s!.]*$/i.test(lower) ||
    lower.includes('who are you') ||
    lower.includes('what are you') ||
    lower.includes('what is your name') ||
    lower.includes('what can you do') ||
    lower.includes('help') ||
    lower.includes('how does this work') ||
    lower.includes('thanks') ||
    lower.includes('thank you') ||
    lower.includes('bye');

  if (!isConversational && standaloneWords.length >= 1 && standaloneWords.length <= 5) {
    const cleanTopic = cleanQuery
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return {
      intent: 'ASK_LEARN_FORMAT',
      topic: cleanTopic,
      originalPrompt: trimmed,
      chatResponse: `To calibrate the optimal learning session for **${cleanTopic}**, what study material format would you like to use? You can upload your lecture materials or start directly with our Socratic AI:`,
      actionSuggestions: [
        '📄 Upload PDF Notes',
        '📊 Upload PPT Slides',
        '🎥 Video Lecture',
        '🎙️ Audio Recording',
        '⚡ Start Directly (AI Knowledge Base)',
        `📝 Quiz me on ${cleanTopic}`,
      ],
    };
  }

  // General chat fallback (remains on Main Screen dialog)
  return {
    intent: 'CHAT',
    originalPrompt: trimmed,
    chatResponse: "I am Donna, your autonomous academic AI. I can teach you concepts step-by-step, generate personalized quizzes, or analyze your progress. What would you like to explore today?",
    actionSuggestions: [
      'Teach me Curve Fitting',
      'Teach me Probability',
      'Quiz me on DBMS',
      'What are my weak topics?',
      'Open my library',
    ],
  };
}

interface MainChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  actionSuggestions?: string[];
}

interface MainScreenProps {
  onExecuteCommand: (command: string, parsedIntent: ParsedAcademicIntent) => void;
  onNavigate: (screen: ScreenType) => void;
  onLogout: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({
  onExecuteCommand,
  onNavigate,
  onLogout,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingDonna, setIsSpeakingDonna] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<MainChatMessage[]>([]);
  const [pendingLearningTopic, setPendingLearningTopic] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const speechSilenceTimerRef = useRef<any>(null);

  // Retrieve user name or fallback
  const storedName = localStorage.getItem('user_name') || 'Socratic Scholar';

  // Auto-focus the central command box
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll chat dialog if messages exist
  useEffect(() => {
    if (conversationMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages]);

  // Clean up any ongoing speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (speechSilenceTimerRef.current) {
        clearTimeout(speechSilenceTimerRef.current);
      }
    };
  }, []);

  // Handle outside click for profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- DONNA TEXT-TO-SPEECH (Donna Speaks Back) ---
  const cleanSpeechText = (raw: string): string => {
    return raw
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1')     // Italic
      .replace(/###/g, '')               // Heading markdown
      .replace(/[-*•]\s+/g, '')          // Bullet lists
      .replace(/\$[^$]+\$/g, '')         // LaTeX math
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Markdown links
      .replace(/\n+/g, '. ')             // Line breaks to natural pauses
      .replace(/\s+/g, ' ')
      .trim();
  };

  const speakDonna = (text: string) => {
    if (isVoiceMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const clean = cleanSpeechText(text);
      if (!clean) return;

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      // Select an expressive English voice (prefer female / natural voice matching Donna)
      const donnaVoice =
        voices.find(
          (v) =>
            (v.name.includes('Natural') ||
              v.name.includes('Samantha') ||
              v.name.includes('Zira') ||
              v.name.includes('Jenny') ||
              v.name.includes('Google US English') ||
              v.name.includes('Female')) &&
            v.lang.startsWith('en')
        ) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      if (donnaVoice) {
        utterance.voice = donnaVoice;
      }

      utterance.onstart = () => {
        setIsSpeakingDonna(true);
      };

      utterance.onend = () => {
        setIsSpeakingDonna(false);
      };

      utterance.onerror = () => {
        setIsSpeakingDonna(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeakingDonna(false);
    }
  };

  const stopSpeakingDonna = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingDonna(false);
  };

  // --- DONNA SPEECH DETECTION (User Speaks to Donna) ---
  const toggleSpeech = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      if (speechSilenceTimerRef.current) clearTimeout(speechSilenceTimerRef.current);
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      stopSpeakingDonna();
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 10;

      // Inject JSGF grammar to bias speech engine towards academic vocabulary
      const SpeechGrammarList =
        (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
      if (SpeechGrammarList) {
        try {
          const speechRecognitionList = new SpeechGrammarList();
          speechRecognitionList.addFromString(ACADEMIC_JSGF_GRAMMAR, 2.0);
          recognition.grammars = speechRecognitionList;
        } catch {
          // Gracefully fallback if grammar lists are restricted in browser environment
        }
      }

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        // Extract all candidate hypotheses across all result slots
        const candidates: string[] = [];
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          for (let j = 0; j < res.length; j++) {
            if (res[j]?.transcript) {
              candidates.push(res[j].transcript);
            }
          }
        }

        const normalizedTranscript = pickAndNormalizeSpeech(candidates);
        setCommandInput(normalizedTranscript);

        // Auto-execution silence timer (Jarvis style: automatically processes after user finishes speaking)
        if (speechSilenceTimerRef.current) clearTimeout(speechSilenceTimerRef.current);
        speechSilenceTimerRef.current = setTimeout(() => {
          if (normalizedTranscript.trim()) {
            recognition.stop();
            setIsListening(false);
            handleQuerySubmit(normalizedTranscript);
          }
        }, 1400);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const executeRouting = (query: string, parsed: ParsedAcademicIntent) => {
    setIsRouting(true);
    let voiceNotice = '';
    if (parsed.intent === 'LEARN_TOPIC') {
      if (parsed.uploadCategory) {
        setFeedbackText(`Preparing Tutor Workspace for ${parsed.topic || 'topic'} with ${parsed.uploadCategory.toUpperCase()} upload...`);
        voiceNotice = `Opening tutor workspace for ${parsed.topic || 'your topic'}.`;
      } else {
        setFeedbackText(`Initiating step-by-step Socratic learning for ${parsed.topic || 'topic'}...`);
        voiceNotice = `Initiating step-by-step learning for ${parsed.topic || 'your topic'}.`;
      }
    } else if (parsed.intent === 'QUIZ_TOPIC') {
      setFeedbackText(parsed.topic ? `Calibrating adaptive assessment for ${parsed.topic}...` : 'Calibrating adaptive assessment...');
      voiceNotice = parsed.topic ? `Calibrating adaptive quiz on ${parsed.topic}.` : 'Calibrating adaptive quiz.';
    } else if (parsed.intent === 'ANALYTICS') {
      setFeedbackText('Retrieving learning trajectory & analytics...');
      voiceNotice = 'Retrieving your learning analytics and mastery report.';
    } else if (parsed.intent === 'LIBRARY') {
      setFeedbackText('Accessing academic knowledge base...');
      voiceNotice = 'Opening your library and study sources.';
    }

    if (voiceNotice) {
      speakDonna(voiceNotice);
    }

    setTimeout(() => {
      onExecuteCommand(query, parsed);
    }, 450);
  };

  const handleQuerySubmit = async (rawQuery: string) => {
    const query = normalizeAcademicSpeech(rawQuery).trim();
    if (!query || isRouting) return;

    // Stop previous Donna speech and clear any pending timers
    stopSpeakingDonna();
    if (speechSilenceTimerRef.current) clearTimeout(speechSilenceTimerRef.current);

    // Immediately post user message to conversation view and activate Donna thinking
    setConversationMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-user`,
        sender: 'user',
        text: query,
      },
    ]);
    setCommandInput('');
    setIsRouting(true);
    setFeedbackText('Donna analyzing intent & capability...');

    try {
      const res = await fetch('http://127.0.0.1:8001/api/assistant/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          pending_topic: pendingLearningTopic,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // 1. Ask learn format
        if (data.intent === 'ASK_LEARN_FORMAT') {
          const aiResponse = data.chat_response || `To calibrate your learning session for **${data.topic}**, what source material format would you like to use?`;
          setPendingLearningTopic(data.topic || 'Topic');
          setConversationMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-ai`,
              sender: 'assistant',
              text: aiResponse,
              actionSuggestions: data.action_suggestions || [
                'Upload PDF Notes',
                'Upload PPT Slides',
                'Video Lecture',
                'Audio Recording',
                'Start Directly with AI',
              ],
            },
          ]);
          setIsRouting(false);
          setFeedbackText(null);
          speakDonna(aiResponse);
          return;
        }

        // 2. Unbuilt feature or Chat
        if (data.intent === 'UNBUILT_FEATURE' || data.intent === 'CHAT') {
          const aiResponse = data.chat_response || "I am Donna, your autonomous academic AI. What would you like to explore?";
          setConversationMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-ai`,
              sender: 'assistant',
              text: aiResponse,
              actionSuggestions: data.action_suggestions,
            },
          ]);
          setIsRouting(false);
          setFeedbackText(null);
          speakDonna(aiResponse);
          return;
        }

        // 3. Executable workspace intents
        const parsedIntent: ParsedAcademicIntent = {
          intent: data.intent,
          topic: data.topic,
          difficulty: data.difficulty || 'adaptive',
          uploadCategory: data.upload_category,
          autoOpenUpload: data.auto_open_upload,
          originalPrompt: query,
        };
        setPendingLearningTopic(null);
        executeRouting(query, parsedIntent);
        return;
      }
    } catch (err) {
      console.warn('Backend intent reasoner unreachable, using local parser fallback:', err);
    }

    // High-precision local fallback
    const parsed = parseAcademicCommand(query, pendingLearningTopic);

    if (parsed.intent === 'ASK_LEARN_FORMAT') {
      const aiResponse = parsed.chatResponse || `To calibrate your learning session for **${parsed.topic}**, what source material format would you like to use?`;
      setPendingLearningTopic(parsed.topic || 'Topic');
      setConversationMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-ai`,
          sender: 'assistant',
          text: aiResponse,
          actionSuggestions: parsed.actionSuggestions,
        },
      ]);
      setIsRouting(false);
      setFeedbackText(null);
      speakDonna(aiResponse);
      return;
    }

    if (parsed.intent === 'UNBUILT_FEATURE' || parsed.intent === 'CHAT') {
      const aiResponse = parsed.chatResponse || "I am Donna, your autonomous academic AI. What would you like to explore?";
      setConversationMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-ai`,
          sender: 'assistant',
          text: aiResponse,
          actionSuggestions: parsed.actionSuggestions,
        },
      ]);
      setIsRouting(false);
      setFeedbackText(null);
      speakDonna(aiResponse);
      return;
    }

    setPendingLearningTopic(null);
    executeRouting(query, parsed);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleQuerySubmit(commandInput);
  };

  const handleExecuteSuggestion = (suggestionText: string) => {
    handleQuerySubmit(suggestionText);
  };

  const hasChat = conversationMessages.length > 0;

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#09090b] text-white flex flex-col justify-between select-none">
      {/* Cinematic subtle dark background aura */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 65% 50% at 50% 50%, rgba(35, 30, 52, 0.45), rgba(9, 9, 11, 0) 70%), radial-gradient(ellipse 40% 30% at 50% 50%, rgba(18, 25, 45, 0.35), rgba(9, 9, 11, 0) 80%)',
        }}
      />

      {/* TOP NAVIGATION BAR: Exactly one small profile button in TOP RIGHT */}
      <header className="relative z-30 shrink-0 w-full px-6 py-5 sm:px-10 sm:py-6 flex items-center justify-end">
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="Student Profile"
            className="group relative flex items-center gap-2 p-1 rounded-full bg-[#13121b]/80 hover:bg-[#1c1a27] border border-white/10 hover:border-white/25 transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.4)] cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-gradient-to-tr from-[#3a2f26] to-[#745948] flex items-center justify-center text-white text-xs font-semibold ring-1 ring-white/15">
              <span className="material-symbols-outlined text-[18px] text-zinc-300 group-hover:text-white transition-colors">
                person
              </span>
            </div>
            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#09090b]" />
          </button>

          {/* Minimal Profile Popover */}
          {profileOpen && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#121118]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] py-3 px-3 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-white/[0.08]">
                <p className="text-sm font-semibold text-zinc-100 truncate">{storedName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <p className="text-[11px] text-zinc-400 font-mono tracking-wide">Donna Core Active</p>
                </div>
              </div>

              <div className="py-2 flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate('tutor-workspace');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px] text-zinc-400">psychology</span>
                  Tutor Workspace
                </button>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate('adaptive-quizzes');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px] text-zinc-400">quiz</span>
                  Adaptive Quizzes
                </button>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate('learning-analytics');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px] text-zinc-400">analytics</span>
                  Learning Analytics
                </button>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate('library-and-sources');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px] text-zinc-400">library_books</span>
                  Library & Sources
                </button>
              </div>

              <div className="pt-1.5 border-t border-white/[0.08]">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-1.5 rounded-xl text-left text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-red-400">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* CENTER VIEWPORT: Static unscrollable screen. Donna core elevates upwards when chat begins */}
      <main
        className={`relative z-10 flex-1 flex flex-col items-center px-4 sm:px-6 w-full max-w-4xl mx-auto overflow-hidden transition-all duration-500 ease-out ${
          hasChat ? 'justify-start pt-1 sm:pt-3' : 'justify-center -mt-14'
        }`}
      >
        <div className="w-full flex flex-col items-center transition-all duration-500 max-h-full">
          {/* 3D DONNA VISUAL CORE ANIMATION */}
          <div
            className={`transition-all duration-500 flex items-center justify-center shrink-0 ${
              hasChat
                ? 'w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 -mb-5 sm:-mb-7'
                : 'w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 mb-2 sm:mb-3'
            }`}
          >
            <JarvisAnimation
              energy={
                isRouting
                  ? 1.0
                  : isSpeakingDonna
                  ? 0.88
                  : isListening
                  ? 0.78
                  : commandInput.trim()
                  ? 0.45
                  : 0.25
              }
              className="w-full h-full"
            />
          </div>

          {/* REAL-TIME VOICE RECOGNITION / TTS STATUS PILLS */}
          <div className="flex items-center gap-2 min-h-[26px] mb-1.5">
            {isSpeakingDonna && (
              <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 text-xs font-mono shadow-[0_0_18px_rgba(34,211,238,0.25)] animate-pulse">
                <span className="material-symbols-outlined text-[16px]">graphic_eq</span>
                <span>Donna speaking...</span>
                <button
                  type="button"
                  onClick={stopSpeakingDonna}
                  className="ml-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Mute Donna speech"
                >
                  <span className="material-symbols-outlined text-[14px]">volume_off</span>
                </button>
              </div>
            )}
            {isListening && (
              <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/15 border border-rose-400/35 text-rose-300 text-xs font-mono shadow-[0_0_18px_rgba(244,63,94,0.25)] animate-pulse">
                <span className="material-symbols-outlined text-[16px]">mic</span>
                <span>Donna listening (Speak now)...</span>
              </div>
            )}
          </div>

          {/* THE CYLINDRICAL AI COMMAND BOX */}
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl sm:max-w-3xl flex flex-col items-center gap-2"
          >
            <div
              className={`w-full relative group rounded-full bg-[#121118]/85 backdrop-blur-2xl border transition-all duration-300 ${
                isRouting
                  ? 'border-indigo-400/50 shadow-[0_0_40px_rgba(99,102,241,0.25),0_12px_40px_rgba(0,0,0,0.85)]'
                  : isSpeakingDonna
                  ? 'border-cyan-400/40 shadow-[0_0_35px_rgba(34,211,238,0.2),0_12px_40px_rgba(0,0,0,0.85)]'
                  : isListening
                  ? 'border-rose-400/40 shadow-[0_0_35px_rgba(244,63,94,0.2),0_12px_40px_rgba(0,0,0,0.85)]'
                  : 'border-white/[0.12] hover:border-white/[0.22] focus-within:border-white/35 shadow-[0_12px_45px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)] focus-within:shadow-[0_0_40px_rgba(120,119,198,0.22),0_16px_50px_rgba(0,0,0,0.85)]'
              }`}
            >
              <div className="h-16 sm:h-20 px-4 sm:px-6 flex items-center gap-3 sm:gap-4 w-full">
                {/* AI Spark Icon */}
                <div className="shrink-0 relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-cyan-400 select-none shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                  <span className="material-symbols-outlined text-[17px] sm:text-[19px] group-focus-within:text-cyan-300 transition-colors">
                    auto_awesome
                  </span>
                </div>

                {/* Primary Command Input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder={
                    isListening
                      ? 'Donna is listening to you...'
                      : isSpeakingDonna
                      ? 'Donna is speaking...'
                      : 'Speak to Donna or type a command...'
                  }
                  disabled={isRouting}
                  className="flex-1 bg-transparent border-0 outline-none text-zinc-100 placeholder:text-zinc-500/80 text-[17px] sm:text-[20px] font-normal tracking-[-0.01em] min-w-0"
                />

                {/* Action Utilities: Donna Voice Toggle, Speech & Send */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Donna Voice Output Mute Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isVoiceMuted) stopSpeakingDonna();
                      setIsVoiceMuted(!isVoiceMuted);
                    }}
                    aria-label={isVoiceMuted ? 'Unmute Donna Voice' : 'Mute Donna Voice'}
                    title={isVoiceMuted ? 'Donna Voice: Muted (Click to enable)' : 'Donna Voice: Active (Click to mute)'}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isVoiceMuted
                        ? 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.06]'
                        : 'text-cyan-400 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[19px] sm:text-[21px]">
                      {isVoiceMuted ? 'volume_off' : 'volume_up'}
                    </span>
                  </button>

                  {/* Voice / Mic Button */}
                  <button
                    type="button"
                    onClick={toggleSpeech}
                    disabled={isRouting}
                    aria-label={isListening ? 'Stop listening' : 'Speak to Donna'}
                    title={isListening ? 'Stop listening' : 'Speak to Donna'}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isListening
                        ? 'bg-rose-500/20 text-rose-400 ring-2 ring-rose-500/50 animate-pulse'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] sm:text-[22px]">
                      {isListening ? 'graphic_eq' : 'mic'}
                    </span>
                  </button>

                  {/* Submit / Execute Command Button */}
                  <button
                    type="submit"
                    disabled={!commandInput.trim() || isRouting}
                    aria-label="Execute command"
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      commandInput.trim() && !isRouting
                        ? 'bg-white text-black hover:bg-zinc-200 shadow-md shadow-white/10 hover:scale-105 active:scale-95'
                        : 'bg-white/[0.07] text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] sm:text-[22px]">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Micro status feedback during routing */}
            {feedbackText && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono tracking-wide animate-pulse">
                <span>{feedbackText}</span>
              </div>
            )}
          </form>

          {/* BELOW THE COMMAND BOX: Scrollable Conversation Box (Part of Chatbot) */}
          {hasChat && (
            <div className="w-full max-w-2xl sm:max-w-3xl mt-2.5 sm:mt-3 rounded-3xl bg-[#121118]/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden max-h-[46vh] sm:max-h-[50vh] shrink min-h-0 animate-in fade-in slide-in-from-top-3 duration-300">
              {/* Header inside Conversation Box */}
              <div className="shrink-0 px-5 py-3 border-b border-white/[0.08] flex items-center justify-between bg-[#121118]/60 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase">Donna • Voice & Academic Dialog</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConversationMessages([]);
                    setPendingLearningTopic(null);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  <span>Clear</span>
                </button>
              </div>

              {/* Scrollable Conversation Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 custom-scrollbar">
                {conversationMessages.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-1.5 text-sm">
                    {msg.sender === 'user' ? (
                      <div className="self-end max-w-[85%] rounded-2xl bg-white/10 text-zinc-100 px-4 py-2 border border-white/10">
                        <p className="leading-relaxed text-[13px] sm:text-sm">{msg.text}</p>
                      </div>
                    ) : (
                      <div className="self-start max-w-[95%] flex flex-col gap-2.5">
                        <div className="rounded-2xl bg-white/[0.04] text-zinc-200 px-4 py-3 border border-white/[0.07]">
                          <p className="leading-relaxed text-[13px] sm:text-sm whitespace-pre-line">{msg.text}</p>
                        </div>
                        {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-0.5">
                            {msg.actionSuggestions.map((suggestion, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => handleExecuteSuggestion(suggestion)}
                                className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1.5 group"
                              >
                                <span>{suggestion}</span>
                                <span className="material-symbols-outlined text-[13px] text-zinc-400 group-hover:translate-x-0.5 transition-transform">
                                  arrow_forward
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* BOTTOM AREA: Intentionally empty negative space */}
      <footer className="shrink-0 relative z-10 w-full pb-4 sm:pb-6 flex items-center justify-center pointer-events-none opacity-0">
        <span className="text-[11px] text-zinc-700 font-mono">Academic OS</span>
      </footer>
    </div>
  );
};
