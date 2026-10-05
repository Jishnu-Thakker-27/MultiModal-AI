export type ScreenType =
  | 'welcome'
  | 'tutor-workspace'
  | 'adaptive-quizzes'
  | 'learning-analytics'
  | 'library-and-sources';

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  tier: string;
  sourcesCount: number;
}

export interface QuizOption {
  id: 'A' | 'B' | 'C' | 'D';
  label: string;
  description: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  itemNumber: string;
  bloomLevel: string;
  coreConcept: string;
  prompt: string;
  sourceSlide: {
    title: string;
    diagramType: 'parabola-overshoot' | 'eigen-saddle' | 'chain-graph' | 'relu-leak';
  };
  options: QuizOption[];
  correctOptionId: 'A' | 'B' | 'C' | 'D';
  solution: {
    correctOptionTitle: string;
    derivation: string;
    sourceCitation: string;
    misconception: string;
  };
  tutorEngine: {
    tactileAnalogy: string;
    pillars: Array<{ title: string; explanation: string }>;
    sourceExcerpt: {
      title: string;
      speaker: string;
      timestamp: string;
    };
    bayesianMastery: number;
    gain: string;
    confidenceInterval: string;
  };
}

export interface QuizItem {
  id: string;
  type: string;
  tier: string;
  title: string;
  description: string;
  sourceFile: string;
  sourceId: string;
  questionsCount: number;
  durationMinutes: number;
  masteryPercentage: number | null;
  statusTag?: string;
  questions: QuizQuestion[];
}

export interface DialogueMessage {
  id: string;
  sender: 'user' | 'socratic-guide';
  timestamp: string;
  text?: string;
  slideAttachment?: {
    filename: string;
    title: string;
    details: string;
  };
  bucketRelayAnalogy?: Array<{
    step: number;
    title: string;
    tag: string;
    body: string;
  }>;
  gradientNodes?: Array<{
    id: string;
    name: string;
    val: string;
    role: string;
    formula?: string;
  }>;
  checkpoint?: {
    prompt: string;
    options: Array<{
      id: string;
      label: string;
      feedback: string;
      isRecommended?: boolean;
    }>;
  };
  voiceNote?: {
    durationSeconds: number;
    transcript: string;
  };
  stepSizeSimulator?: {
    defaultEta: number;
    title: string;
    description: string;
  };
  followUps?: string[];
}

export interface LearningTopic {
  id: string;
  title: string;
  status: 'DECAYING' | 'FIRM' | 'LEARNING';
  subconceptsCount: number;
  dialogueCount: number;
  mastery: number;
  note: string;
}

export interface SocraticSessionHistory {
  id: string;
  title: string;
  sourceDoc: string;
  questionsAsked: number;
  recallScore: number;
  timeAgo: string;
}

export interface SourceDocument {
  id: string;
  title: string;
  type: 'pptx' | 'youtube' | 'pdf' | 'audio';
  category: string;
  dateAdded: string;
  fileSizeOrDuration: string;
  status: 'Ready' | 'Processing';
  conceptsExtracted: string[];
}
