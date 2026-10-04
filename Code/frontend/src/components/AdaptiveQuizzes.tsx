import React, { useState } from 'react';
import { QuizItem, QuizQuestion } from '../types';
import { initialQuizzes } from '../data/mockData';

interface AdaptiveQuizzesProps {
  onBackToWorkspace?: () => void;
  onNavigateToSources?: () => void;
}

export const AdaptiveQuizzes: React.FC<AdaptiveQuizzesProps> = ({
  onBackToWorkspace,
  onNavigateToSources,
}) => {
  // Modes: 'unified' (shows both catalog and workspace as in Image 3) | 'catalog-only' | 'workspace-only'
  const [viewMode, setViewMode] = useState<'unified' | 'catalog-only' | 'workspace-only'>('unified');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [selectedQuiz, setSelectedQuiz] = useState<QuizItem>(initialQuizzes[0]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(2); // Default to Q3 as shown in Image 3/4
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [showSolution, setShowSolution] = useState<boolean>(true);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [hasEvaluated, setHasEvaluated] = useState<boolean>(true); // Already evaluated in Image 3
  const [evaluationResult, setEvaluationResult] = useState<string | null>(
    'Verified Correct! Socratic intuition aligned with Hessian boundary limits.'
  );
  const [highLegibility, setHighLegibility] = useState<boolean>(false);
  const [isReadingAloud, setIsReadingAloud] = useState<boolean>(false);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [hintActive, setHintActive] = useState<boolean>(false);
  const [sourceVideoPlaying, setSourceVideoPlaying] = useState<boolean>(false);

  const activeQuestion: QuizQuestion =
    selectedQuiz.questions[currentQuestionIndex] || selectedQuiz.questions[0];

  const handleLaunchQuiz = (quiz: QuizItem) => {
    setSelectedQuiz(quiz);
    if (quiz.questions && quiz.questions.length > 0) {
      setCurrentQuestionIndex(0);
      setSelectedOption(quiz.questions[0].correctOptionId || 'A');
    }
    const target = document.getElementById('active-quiz-section');
    target?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectOption = (optId: 'A' | 'B' | 'C' | 'D') => {
    setSelectedOption(optId);
    setHasEvaluated(false);
    setEvaluationResult(null);
  };

  const handleSubmitAnswer = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      setIsEvaluating(false);
      setHasEvaluated(true);
      if (selectedOption === activeQuestion.correctOptionId) {
        setEvaluationResult('Verified Correct! Socratic intuition aligned with Hessian boundary limits.');
      } else {
        setEvaluationResult('Conceptual divergence detected. Review the step-by-step Socratic solution below.');
      }
      setShowSolution(true);
    }, 600);
  };

  const toggleReadAloud = () => {
    if ('speechSynthesis' in window) {
      if (isReadingAloud) {
        window.speechSynthesis.cancel();
        setIsReadingAloud(false);
      } else {
        const textToRead = `${activeQuestion.prompt}. Option A: ${activeQuestion.options[0]?.label}. Option B: ${activeQuestion.options[1]?.label}. Option C: ${activeQuestion.options[2]?.label}. Option D: ${activeQuestion.options[3]?.label}.`;
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.rate = 1.0;
        utterance.onend = () => setIsReadingAloud(false);
        utterance.onerror = () => setIsReadingAloud(false);
        window.speechSynthesis.speak(utterance);
        setIsReadingAloud(true);
      }
    } else {
      setIsReadingAloud(!isReadingAloud);
    }
  };

  const filteredQuizzes = initialQuizzes.filter((quiz) => {
    if (selectedSourceFilter === 'all') return true;
    return quiz.sourceId === selectedSourceFilter;
  });

  return (
    <div className={`w-full pb-24 transition-colors ${highLegibility ? 'contrast-125' : ''}`}>
      
      {/* SECTION 1: Source-Only Quiz Control Hub Header (From Image 3 & Image 5) */}
      <section className="w-full mb-8">
        <div className="w-full p-6 sm:p-8 rounded-[2rem] bg-white  shadow-[0_20px_40px_-10px_rgba(195,180,170,0.3),inset_0_2px_4px_rgba(255,255,255,0.95)]  border border-[#ede7df]/80  flex flex-col gap-5">
          
          {/* Header Badges & View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#cbe3f6]  text-[#4f6576]  text-[12px] font-semibold shadow-[0_4px_10px_-2px_rgba(180,205,225,0.6),inset_0_1.5px_1px_rgba(255,255,255,0.9)]">
                <span className="w-2 h-2 rounded-full bg-[#4a6171] animate-pulse"></span>
                User Sources Grounded Quizzes
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#c0ddd0]  text-[#486258]  text-[12px] font-semibold shadow-[0_4px_10px_-2px_rgba(175,210,195,0.5),inset_0_1.5px_1px_rgba(255,255,255,0.85)]">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                4 Verified Custom Sources
              </span>
            </div>

            {/* View Mode Tabs: Unified (Image 3) vs Tabs */}
            <div className="flex items-center p-1 rounded-full bg-[#f9f3eb]  shadow-[inset_0_2px_4px_rgba(175,160,147,0.2)]">
              <button
                onClick={() => setViewMode('unified')}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'unified'
                    ? 'bg-[#ede7df]  text-[#1d1b17]  shadow-[0_2px_4px_rgba(180,165,150,0.3),inset_0_1.5px_1px_rgba(255,255,255,0.9)]'
                    : 'text-[#4f453f]  hover:text-[#1d1b17]'
                }`}
                title="Unified View: shows catalog and active question on one screen as in Image 3"
              >
                <span className="material-symbols-outlined text-[16px]">view_agenda</span>
                <span>Unified View</span>
              </button>
              <button
                onClick={() => setViewMode('catalog-only')}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'catalog-only'
                    ? 'bg-[#ede7df]  text-[#1d1b17]  shadow-[0_2px_4px_rgba(180,165,150,0.3),inset_0_1.5px_1px_rgba(255,255,255,0.9)]'
                    : 'text-[#4f453f]  hover:text-[#1d1b17]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                <span>Source Quizzes Catalog</span>
              </button>
              <button
                onClick={() => setViewMode('workspace-only')}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'workspace-only'
                    ? 'bg-[#ede7df]  text-[#1d1b17]  shadow-[0_2px_4px_rgba(180,165,150,0.3),inset_0_1.5px_1px_rgba(255,255,255,0.9)]'
                    : 'text-[#4f453f]  hover:text-[#1d1b17]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">quiz</span>
                <span>Active Quiz & Solutions</span>
              </button>
            </div>
          </div>

          {/* Title & Description */}
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#1d1b17]  tracking-tight">
              Source-Generated Adaptive Quizzes
            </h1>
            <p className="text-[#4f453f]  text-[14px] max-w-4xl leading-relaxed">
              Every quiz below is dynamically distilled exclusively from the sources you uploaded. Select any quiz to reveal all diagnostic questions, interactive answer options, and step-by-step Socratic solutions.
            </p>
          </div>

          {/* Filter By Loaded Source Pill Strip */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#ede7df] ">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] uppercase tracking-wider text-[#4f453f]  font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#745948]">filter_alt</span>
                Filter By Loaded Source:
              </span>
              <span className="text-[12px] text-[#496459]  font-medium">
                Click source pill to filter quiz types
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSourceFilter('all')}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedSourceFilter === 'all'
                    ? 'bg-[#e8e2da]  text-[#1d1b17]  shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.9),0_2px_4px_rgba(180,165,150,0.25)] font-bold'
                    : 'bg-[#f9f3eb]  text-[#4f453f]  hover:text-[#1d1b17]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">apps</span>
                <span>All Sources (5 Quizzes)</span>
              </button>

              <button
                onClick={() => setSelectedSourceFilter('s1')}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedSourceFilter === 's1'
                    ? 'bg-[#e8e2da]  text-[#1d1b17]  shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.9),0_2px_4px_rgba(180,165,150,0.25)] font-bold'
                    : 'bg-[#f9f3eb]  text-[#4f453f]  hover:text-[#1d1b17]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px] text-[#745948]">slideshow</span>
                <span>Lecture_Slide_Deck_Wk4.pptx</span>
              </button>

              <button
                onClick={() => setSelectedSourceFilter('s2')}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedSourceFilter === 's2'
                    ? 'bg-[#e8e2da]  text-[#1d1b17]  shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.9),0_2px_4px_rgba(180,165,150,0.25)] font-bold'
                    : 'bg-[#f9f3eb]  text-[#4f453f]  hover:text-[#1d1b17]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px] text-[#ba1a1a]">smart_display</span>
                <span>Stanford CS231n Lecture 4 (YouTube)</span>
              </button>

              <button
                onClick={() => setSelectedSourceFilter('s3')}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedSourceFilter === 's3'
                    ? 'bg-[#e8e2da]  text-[#1d1b17]  shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.9),0_2px_4px_rgba(180,165,150,0.25)] font-bold'
                    : 'bg-[#f9f3eb]  text-[#4f453f]  hover:text-[#1d1b17]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px] text-[#4a6171]">picture_as_pdf</span>
                <span>Deep_Learning_Goodfellow_Ch6.pdf</span>
              </button>

              <button
                onClick={() => setSelectedSourceFilter('s4')}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedSourceFilter === 's4'
                    ? 'bg-[#e8e2da]  text-[#1d1b17]  shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.9),0_2px_4px_rgba(180,165,150,0.25)] font-bold'
                    : 'bg-[#f9f3eb]  text-[#4f453f]  hover:text-[#1d1b17]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px] text-[#496459]">menu_book</span>
                <span>Quantum_Mechanics_Ch3.pdf</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: CATALOG VIEW (Available Quizzes from Uploaded Sources) */}
      {(viewMode === 'unified' || viewMode === 'catalog-only') && (
        <section className="w-full flex flex-col gap-6 mb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-bold text-[#1d1b17] ">
                Available Quizzes from Uploaded Sources
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f3cfba]  text-[#725746]  text-[11px] font-bold">
                5 Types Ready
              </span>
            </div>
            <span className="text-[#4f453f]  text-[12px] hidden md:inline">
              Click any quiz card to start taking it & inspect all step-by-step solutions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="p-6 rounded-[2rem] bg-white  shadow-[0_18px_36px_-10px_rgba(195,180,170,0.3),inset_0_2px_4px_rgba(255,255,255,0.95)]  border border-[#ede7df]/80  hover:border-[#f3cfba] transition-all flex flex-col justify-between gap-5 group"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-[#cbe3f6]  text-[#4f6576]  text-[11px] font-bold shadow-[0_2px_4px_rgba(180,205,225,0.4)]">
                      {quiz.type}
                    </span>
                    <span className="text-[12px] font-bold text-[#745948] ">
                      {quiz.tier}
                    </span>
                  </div>

                  <h3 className="text-[17px] font-bold text-[#1d1b17]  leading-snug group-hover:text-[#745948] transition-colors">
                    {quiz.title}
                  </h3>

                  <p className="text-[13px] text-[#4f453f]  leading-relaxed">
                    {quiz.description}
                  </p>

                  <div className="p-2.5 rounded-xl bg-[#f9f3eb]  shadow-[inset_0_1.5px_2px_rgba(175,160,147,0.15)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#ba1a1a] shrink-0">
                      {quiz.sourceFile.includes('YouTube')
                        ? 'smart_display'
                        : quiz.sourceFile.includes('.pptx')
                        ? 'slideshow'
                        : 'picture_as_pdf'}
                    </span>
                    <span className="text-[12px] text-[#1d1b17]  font-medium truncate">
                      {quiz.sourceFile}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-3 border-t border-[#ede7df] ">
                  <div className="flex items-center justify-between text-[12px] text-[#4f453f] ">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">help_outline</span>
                      {quiz.questionsCount} Questions
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">timer</span>
                      {quiz.durationMinutes} Mins
                    </span>
                    {quiz.masteryPercentage !== null ? (
                      <span className="flex items-center gap-1 text-[#496459]  font-bold">
                        <span className="material-symbols-outlined text-[15px]">trending_up</span>
                        {quiz.masteryPercentage}% Mastery
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#745948]  font-bold">
                        <span className="material-symbols-outlined text-[15px]">pending</span>
                        {quiz.statusTag || 'Untested'}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleLaunchQuiz(quiz)}
                    className="w-full py-2.5 px-4 rounded-full bg-[#1d1b17]  text-white  hover:opacity-95 text-[13px] font-bold shadow-[0_8px_16px_-2px_rgba(29,27,23,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Start Quiz & Reveal Questions</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 3: ACTIVE QUIZ VIEW (Image 3 & Image 4 Combined with all authentic controls) */}
      {(viewMode === 'unified' || viewMode === 'workspace-only') && (
        <section id="active-quiz-section" className="w-full flex flex-col gap-6 pt-2">
          
          {/* Top Diagnostic Badges & Controls (From Image 3 & Image 4) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setViewMode('catalog-only')}
                className="px-4 py-1.5 rounded-full bg-[#f9f3eb]  text-[#1d1b17]  hover:bg-[#ede7df] text-[13px] font-semibold shadow-[0_3px_6px_rgba(180,165,150,0.2),inset_0_1px_2px_rgba(255,255,255,0.9)] flex items-center gap-1 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Source Quizzes</span>
              </button>

              <span className="text-[#4f453f]  text-[13px] hidden sm:inline">
                • Selected: <strong className="text-[#1d1b17] ">{selectedQuiz.title}</strong>
              </span>

              {/* Extra badges from Image 4 */}
              <span className="hidden xl:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#cbe3f6]/70  text-[11px] font-semibold text-[#4f6576] ">
                Adaptive Module #104
              </span>
              <span className="hidden xl:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#c0ddd0]/70  text-[11px] font-semibold text-[#052018] ">
                <span className="material-symbols-outlined text-[14px]">tune</span>
                Tuning State: Stage 2 Balanced Reasoning
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setHighLegibility(!highLegibility)}
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[12px] font-semibold shadow-[0_4px_8px_rgba(190,175,160,0.25),inset_0_1.5px_1px_rgba(255,255,255,0.9)] cursor-pointer transition-all ${
                  highLegibility
                    ? 'bg-[#1d1b17] text-white'
                    : 'bg-[#f9f3eb]  text-[#1d1b17] '
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-[#745948]">visibility</span>
                <span>{highLegibility ? 'High Legibility: On' : 'Standard Legibility'}</span>
              </button>

              <button
                onClick={toggleReadAloud}
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[12px] font-semibold shadow-[0_4px_8px_rgba(190,175,160,0.25),inset_0_1.5px_1px_rgba(255,255,255,0.9)] cursor-pointer transition-all ${
                  isReadingAloud
                    ? 'bg-[#f3cfba] text-[#725746] font-bold'
                    : 'bg-[#f9f3eb]  text-[#4f453f] '
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">volume_up</span>
                <span>{isReadingAloud ? 'Read-Aloud: Playing' : 'Read-Aloud: Off'}</span>
              </button>

              <div className="px-3.5 py-1 rounded-full bg-[#f3cfba] text-[#725746] text-[12px] font-bold shadow-[0_4px_12px_-2px_rgba(215,175,155,0.5),inset_0_1.5px_1px_rgba(255,255,255,0.8)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">emoji_objects</span>
                <span>Solutions Unlocked</span>
              </div>
            </div>
          </div>

          {/* Progress Bar Strip (Exact from Image 3 & Image 4) */}
          <div className="w-full flex flex-col gap-2 p-4 rounded-2xl bg-white  shadow-[0_12px_24px_-6px_rgba(195,180,170,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.95)] border border-[#ede7df]/80 ">
            <div className="flex justify-between items-center text-[13px] text-[#4f453f] ">
              <span className="flex items-center gap-2 text-[#1d1b17]  font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#745948] animate-pulse"></span>
                Question {currentQuestionIndex + 1} of 5 (60% Answered)
              </span>
              <span className="text-[12px] text-[#4f453f] ">
                Source: {selectedQuiz.sourceFile}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-[#ede7df]  p-0.5 shadow-[inset_0_2px_4px_rgba(165,150,138,0.35)] flex items-center">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#f3cfba] via-[#745948] to-[#496459] transition-all duration-500"
                style={{ width: `${((currentQuestionIndex + 1) / 5) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Two-Column Diagnostic Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 8-Column: Question, Loss Landscape SVG Visualizer, Options & Socratic Solution */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="w-full p-6 sm:p-8 rounded-[2rem] bg-white  shadow-[0_22px_44px_-12px_rgba(195,180,170,0.32),inset_0_2px_4px_rgba(255,255,255,0.95)] border border-[#ede7df]/80  flex flex-col gap-6">
                
                {/* Category Badges */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#ede7df]  text-[#1d1b17]  text-[12px] font-bold shadow-[0_2px_4px_rgba(180,165,150,0.2)]">
                      Diagnostic item 03
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#cbe3f6]  text-[#4f6576]  text-[12px] font-bold shadow-[0_2px_4px_rgba(180,205,225,0.4)]">
                      Bloom Level: Analysis
                    </span>
                  </div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-[#4f453f] ">
                    CORE CONCEPT • CONVEX VALLEYS
                  </span>
                </div>

                {/* Question Prompt */}
                <h2 className="text-[20px] sm:text-[23px] font-bold text-[#1d1b17]  leading-relaxed">
                  When the learning rate is set excessively high during gradient descent, why does the loss oscillate wildly or diverge rather than smoothly converge?
                </h2>

                {/* Parabolic Loss Surface Visualizer Card */}
                <div className="w-full p-5 rounded-2xl bg-[#f9f3eb]  shadow-[inset_0_3px_6px_rgba(175,160,147,0.22),0_1px_3px_rgba(255,255,255,0.9)] flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#745948]">tune</span>
                      <span className="text-[13px] font-bold text-[#1d1b17] ">
                        Source Slide 14 • Gradient Vector Direction & Overshoot Phenomenon
                      </span>
                    </div>
                    <button
                      onClick={() => setSourceVideoPlaying(!sourceVideoPlaying)}
                      className="px-3 py-1 rounded-full bg-white  text-[#4f453f]  text-[11px] font-semibold shadow-[0_2px_4px_rgba(180,165,150,0.2)] flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_full</span>
                      <span>Expand Source</span>
                    </button>
                  </div>

                  {/* Parabolic Loss Landscape SVG (Matching Image 3 & 4) */}
                  <div className="w-full bg-white  rounded-xl p-5 flex flex-col items-center justify-center shadow-[0_8px_16px_-4px_rgba(185,170,160,0.2)]">
                    <div className="w-full max-w-lg h-44 relative flex items-center justify-center">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 460 160" fill="none">
                        <defs>
                          <marker id="arrow-overshoot" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 1 L 8 5 L 0 9 z" fill="#BA1A1A" />
                          </marker>
                        </defs>
                        {/* Parabola Loss Bowl */}
                        <path
                          d="M 30 20 Q 230 180 430 20"
                          stroke="#745948"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          fill="none"
                          className="opacity-80"
                        />
                        {/* Point w0 */}
                        <circle cx="85" cy="58" r="6" fill="#F3CFBA" stroke="#745948" strokeWidth="2.5" />
                        <text x="80" y="44" fill="#745948" className="text-[12px] font-bold">w₀</text>

                        {/* Overshoot Vector Arc to w1 */}
                        <path
                          d="M 85 58 Q 220 -20 375 52"
                          stroke="#BA1A1A"
                          strokeWidth="2.5"
                          strokeDasharray="4 4"
                          markerEnd="url(#arrow-overshoot)"
                        />
                        {/* Point w1 */}
                        <circle cx="375" cy="52" r="6" fill="#BA1A1A" stroke="#FFFFFF" strokeWidth="2" />
                        <text x="382" y="50" fill="#BA1A1A" className="text-[12px] font-bold">w₁ (Overshoot)</text>

                        {/* Diverging Vector Arc to w2 */}
                        <path
                          d="M 375 52 Q 240 10 40 24"
                          stroke="#BA1A1A"
                          strokeWidth="2.5"
                          strokeDasharray="4 4"
                        />
                        <circle cx="40" cy="24" r="6" fill="#93000A" stroke="#FFFFFF" strokeWidth="2" />
                        <text x="25" y="16" fill="#93000A" className="text-[11px] font-bold">w₂ Diverging &gt;&gt;</text>

                        {/* Global Minimum */}
                        <circle cx="230" cy="140" r="5" fill="#496459" />
                        <text x="180" y="156" fill="#496459" className="text-[12px] font-bold">Global Minimum w*</text>
                      </svg>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-6 text-[12px] text-[#4f453f]  pt-3 border-t border-[#ede7df]/50 w-full">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3.5 h-1 bg-[#745948] rounded"></span> Loss Landscape L(w)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3.5 h-1 bg-[#ba1a1a] border-b border-dashed"></span> Step Vector: η × ∇L(w)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#496459]"></span> Minimum Convergence Zone
                      </span>
                    </div>
                  </div>
                </div>

                {/* Multiple Choice Option Stack */}
                <div className="flex flex-col gap-3">
                  {/* Option A */}
                  <div
                    onClick={() => handleSelectOption('A')}
                    className={`cursor-pointer flex items-center justify-between p-4 rounded-2xl transition-all duration-200 select-none ${
                      selectedOption === 'A'
                        ? 'bg-white  ring-2 ring-[#745948] shadow-[0_12px_24px_-4px_rgba(180,165,150,0.35),inset_0_2px_2px_rgba(255,255,255,0.95)]'
                        : 'bg-[#f9f3eb]  hover:bg-[#ede7df] shadow-[0_6px_14px_rgba(190,175,160,0.2),inset_0_1.5px_2px_rgba(255,255,255,0.85)]'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="relative w-6 h-6 rounded-full bg-[#ede7df]  shadow-[inset_0_3px_5px_rgba(165,150,138,0.4),0_1px_2px_rgba(255,255,255,0.9)] flex items-center justify-center shrink-0 mt-0.5">
                        {selectedOption === 'A' && (
                          <div className="w-3.5 h-3.5 rounded-full bg-[#745948] "></div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-medium text-[#1d1b17] ">
                          A. Diminishing Gradient Vanishing
                        </span>
                        <span className="text-[12px] text-[#4f453f]  leading-relaxed pt-0.5">
                          The step size shrinks towards machine epsilon, causing numerical stalls.
                        </span>
                      </div>
                    </div>
                    <span className="text-[12px] text-[#81756e] font-bold pr-1">01</span>
                  </div>

                  {/* Option B (Target / Correct Option) */}
                  <div
                    onClick={() => handleSelectOption('B')}
                    className={`cursor-pointer flex items-center justify-between p-4 rounded-2xl transition-all duration-200 select-none ${
                      selectedOption === 'B'
                        ? 'bg-white  ring-2 ring-[#745948] shadow-[0_12px_24px_-4px_rgba(180,165,150,0.35),inset_0_2px_2px_rgba(255,255,255,0.95)]'
                        : 'bg-[#f9f3eb]  hover:bg-[#ede7df] shadow-[0_6px_14px_rgba(190,175,160,0.2),inset_0_1.5px_2px_rgba(255,255,255,0.85)]'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="relative w-6 h-6 rounded-full bg-[#ede7df]  shadow-[inset_0_3px_5px_rgba(165,150,138,0.4),0_1px_2px_rgba(255,255,255,0.9)] flex items-center justify-center shrink-0 mt-0.5">
                        {selectedOption === 'B' && (
                          <div className="w-3.5 h-3.5 rounded-full bg-[#745948] "></div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-[#1d1b17]  flex items-center gap-2">
                          B. Curvature Overshoot & Steep Valley Bouncing
                          {hasEvaluated ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#c0ddd0]  text-[#052018]  text-[11px] font-bold">
                              Correct Option
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-[#f3cfba] text-[#725746] text-[11px] font-bold">
                              Current Selection
                            </span>
                          )}
                        </span>
                        <span className="text-[12px] text-[#4f453f]  leading-relaxed pt-0.5">
                          Step magnitude exceeds the local Taylor approximation bounds, catapulting the parameters onto steeper opposite walls.
                        </span>
                      </div>
                    </div>
                    <span className="text-[12px] text-[#745948] font-bold pr-1">02</span>
                  </div>

                  {/* Option C */}
                  <div
                    onClick={() => handleSelectOption('C')}
                    className={`cursor-pointer flex items-center justify-between p-4 rounded-2xl transition-all duration-200 select-none ${
                      selectedOption === 'C'
                        ? 'bg-white  ring-2 ring-[#745948] shadow-[0_12px_24px_-4px_rgba(180,165,150,0.35),inset_0_2px_2px_rgba(255,255,255,0.95)]'
                        : 'bg-[#f9f3eb]  hover:bg-[#ede7df] shadow-[0_6px_14px_rgba(190,175,160,0.2),inset_0_1.5px_2px_rgba(255,255,255,0.85)]'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="relative w-6 h-6 rounded-full bg-[#ede7df]  shadow-[inset_0_3px_5px_rgba(165,150,138,0.4),0_1px_2px_rgba(255,255,255,0.9)] flex items-center justify-center shrink-0 mt-0.5">
                        {selectedOption === 'C' && (
                          <div className="w-3.5 h-3.5 rounded-full bg-[#745948] "></div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-medium text-[#1d1b17] ">
                          C. Batch Normalization Inversion
                        </span>
                        <span className="text-[12px] text-[#4f453f]  leading-relaxed pt-0.5">
                          Running mini-batch variance collapses to zero, inverting standard deviation scaling.
                        </span>
                      </div>
                    </div>
                    <span className="text-[12px] text-[#81756e] font-bold pr-1">03</span>
                  </div>

                  {/* Option D */}
                  <div
                    onClick={() => handleSelectOption('D')}
                    className={`cursor-pointer flex items-center justify-between p-4 rounded-2xl transition-all duration-200 select-none ${
                      selectedOption === 'D'
                        ? 'bg-white  ring-2 ring-[#745948] shadow-[0_12px_24px_-4px_rgba(180,165,150,0.35),inset_0_2px_2px_rgba(255,255,255,0.95)]'
                        : 'bg-[#f9f3eb]  hover:bg-[#ede7df] shadow-[0_6px_14px_rgba(190,175,160,0.2),inset_0_1.5px_2px_rgba(255,255,255,0.85)]'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="relative w-6 h-6 rounded-full bg-[#ede7df]  shadow-[inset_0_3px_5px_rgba(165,150,138,0.4),0_1px_2px_rgba(255,255,255,0.9)] flex items-center justify-center shrink-0 mt-0.5">
                        {selectedOption === 'D' && (
                          <div className="w-3.5 h-3.5 rounded-full bg-[#745948] "></div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-medium text-[#1d1b17] ">
                          D. Deterministic Overfitting
                        </span>
                        <span className="text-[12px] text-[#4f453f]  leading-relaxed pt-0.5">
                          The weights memorize individual sample noise patterns on every single sub-batch.
                        </span>
                      </div>
                    </div>
                    <span className="text-[12px] text-[#81756e] font-bold pr-1">04</span>
                  </div>
                </div>

                {/* Action Bar (With both Image 3 & Image 4 features) */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#ede7df] ">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setShowSolution(!showSolution)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#c0ddd0]  text-[#052018]  font-bold text-[13px] shadow-[0_4px_10px_-2px_rgba(175,210,195,0.6),inset_0_1.5px_1px_rgba(255,255,255,0.9)] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px]">lightbulb</span>
                      <span>{showSolution ? 'Hide Step-by-Step Solution' : 'Reveal Step-by-Step Solution'}</span>
                    </button>

                    {/* Hint Button from Image 4 */}
                    <button
                      onClick={() => setHintActive(!hintActive)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f9f3eb]  text-[#4f453f]  hover:text-[#1d1b17] text-[12px] font-semibold shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#745948]">help_center</span>
                      <span>Request Socratic Hint (No penalty)</span>
                    </button>

                    <button
                      onClick={() => setBookmarked(!bookmarked)}
                      aria-label="Bookmark Question"
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-[0_6px_12px_-2px_rgba(190,175,160,0.25)] transition-all cursor-pointer ${
                        bookmarked
                          ? 'bg-[#f3cfba] text-[#725746]'
                          : 'bg-[#f9f3eb]  text-[#4f453f] '
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {bookmarked ? 'bookmark' : 'bookmark_border'}
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={handleSubmitAnswer}
                    disabled={isEvaluating}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1d1b17]  text-white  font-bold text-[14px] shadow-[0_12px_22px_-4px_rgba(29,27,23,0.4)] hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {isEvaluating ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                        <span>Evaluating Reasoning...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Answer & Analyze</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Socratic Hint Drawer */}
                {hintActive && (
                  <div className="p-4 rounded-xl bg-[#cbe3f6]/40  border border-[#cbe3f6] text-[13px] text-[#4a6171]  flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[18px] mt-0.5">tips_and_updates</span>
                    <div>
                      <strong className="block pb-0.5 font-bold">Socratic Hint:</strong>
                      Consider what happens when you take a step larger than the width of the bowl. Does the gradient get flatter or steeper on the opposite wall?
                    </div>
                  </div>
                )}

                {evaluationResult && (
                  <div className="p-3.5 rounded-xl bg-[#c0ddd0]/60  text-[#052018]  text-[13px] font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>{evaluationResult}</span>
                  </div>
                )}

                {/* DETAILED STEP-BY-STEP SOCRATIC SOLUTION ACCORDION (Exact content from Image 3 & Image 5) */}
                {showSolution && (
                  <div className="w-full p-5 rounded-2xl bg-[#f9f3eb]  shadow-[inset_0_2px_5px_rgba(175,160,147,0.2),0_1px_2px_rgba(255,255,255,0.9)] flex flex-col gap-3 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-bold text-[#1d1b17]  flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#496459]"></span>
                        Comprehensive Answer & Derivation Breakdown
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#c0ddd0]  text-[#052018]  text-[11px] font-bold">
                        Verified Solution
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white  shadow-[0_3px_8px_rgba(190,175,160,0.18)] flex flex-col gap-1.5">
                      <span className="text-[13px] font-bold text-[#496459] ">
                        1. Correct Choice: Option B
                      </span>
                      <p className="text-[13px] text-[#1d1b17]  leading-relaxed">
                        Gradient descent assumes that the objective function can be approximated linearly in the immediate neighborhood of <span className="font-mono bg-black/5  px-1 rounded">w_t</span>. When learning rate <span className="font-mono bg-black/5  px-1 rounded">η &gt; 2 / λ_max</span> (where <span className="font-mono bg-black/5  px-1 rounded">λ_max</span> is the largest eigenvalue of the Hessian matrix <span className="font-mono bg-black/5  px-1 rounded">H</span>), the update step jumps over the curvature trough onto an even steeper gradient slope on the opposite wall.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white  shadow-[0_3px_8px_rgba(190,175,160,0.18)] flex flex-col gap-1.5">
                      <span className="text-[13px] font-bold text-[#745948] ">
                        2. Exact Source Citation (Stanford CS231n, Lec 4 • 18:22)
                      </span>
                      <blockquote className="text-[13px] text-[#4f453f]  italic pl-3 border-l-2 border-[#745948] leading-relaxed">
                        “Notice how with high step sizes, you oscillate across the ravine rather than traveling down the bottom. Because the gradient is perpendicular to the contours, you shoot back and forth.”
                      </blockquote>
                    </div>

                    <div className="p-4 rounded-xl bg-white  shadow-[0_3px_8px_rgba(190,175,160,0.18)] flex flex-col gap-1.5">
                      <span className="text-[13px] font-bold text-[#4a6171] ">
                        3. Common Misconception Addressed
                      </span>
                      <p className="text-[13px] text-[#4f453f]  leading-relaxed">
                        Learners often confuse wild oscillations with overfitting (Option D) or vanishing gradients (Option A). Vanishing gradients cause stagnant weights (<span className="font-mono">∇L → 0</span>), whereas learning rate overshooting produces explosive loss values (<span className="font-mono">L → ∞</span> or NaN).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 4-Column: Tutor Reasoning Engine & Socratic Guidance (Exact from Image 3 & Image 5) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Tutor Reasoning Engine Ceramic Tray */}
              <div className="w-full p-6 rounded-[2rem] bg-white  shadow-[0_20px_40px_-10px_rgba(195,180,170,0.3),inset_0_2px_4px_rgba(255,255,255,0.95)] border border-[#ede7df]/80  flex flex-col gap-5">
                
                {/* Engine Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#ede7df]/60 ">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-2xl bg-[#cbe3f6]  flex items-center justify-center text-[#4f6576]  shadow-[0_4px_8px_rgba(180,205,225,0.5)]">
                      <span className="material-symbols-outlined text-[19px]">neurology</span>
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-[#1d1b17]  leading-tight">
                        Tutor Reasoning Engine
                      </span>
                      <span className="text-[11px] text-[#4f453f] ">
                        Active Socratic Co-Pilot
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#c0ddd0]  text-[#052018]  text-[11px] font-bold">
                    Live
                  </span>
                </div>

                {/* Tactile Analogy Card */}
                <div className="p-4 rounded-2xl bg-[#f9f3eb]  shadow-[inset_0_2px_4px_rgba(175,160,147,0.18)] flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[#745948]  text-[13px] font-bold">
                    <span className="material-symbols-outlined text-[17px]">landscape</span>
                    <span>Tactile Analogy</span>
                  </div>
                  <p className="text-[12px] text-[#1d1b17]  leading-relaxed">
                    “Think of gradient descent like walking down a foggy canyon at twilight. The gradient only tells you the local slope beneath your boots. If you take a massive stride assuming the slope continues indefinitely, you leap right over the valley floor and slam into the opposite cliff face.”
                  </p>
                </div>

                {/* Diagnostic Verification Pillars */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4f453f] ">
                    Diagnostic Verification Pillars
                  </span>
                  <div className="flex flex-col gap-2">
                    <div className="p-3 rounded-xl bg-[#ede7df]/50  flex items-start gap-2.5 shadow-[0_2px_4px_rgba(190,175,160,0.15)]">
                      <span className="w-5 h-5 rounded-full bg-white  text-[#1d1b17]  text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        1
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-[#1d1b17] ">
                          Local Linear Fallacy
                        </span>
                        <span className="text-[11px] text-[#4f453f]  leading-relaxed">
                          Taylor series 1st order approximations fail past step limit η &gt; 2 / λ_max.
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#ede7df]/50  flex items-start gap-2.5 shadow-[0_2px_4px_rgba(190,175,160,0.15)]">
                      <span className="w-5 h-5 rounded-full bg-white  text-[#1d1b17]  text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        2
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-[#1d1b17] ">
                          Hessian Eigenvalue Scale
                        </span>
                        <span className="text-[11px] text-[#4f453f]  leading-relaxed">
                          High curvature dimensions generate exploding gradient updates.
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#ede7df]/50  flex items-start gap-2.5 shadow-[0_2px_4px_rgba(190,175,160,0.15)]">
                      <span className="w-5 h-5 rounded-full bg-white  text-[#1d1b17]  text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        3
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-[#1d1b17] ">
                          Mathematical Remediation
                        </span>
                        <span className="text-[11px] text-[#4f453f]  leading-relaxed">
                          Use adaptive methods (Adam/RMSProp) or schedule decay.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grounded Source Excerpt Card with playable video player tile */}
                <div className="p-4 rounded-2xl bg-[#f9f3eb]  shadow-[inset_0_2px_4px_rgba(175,160,147,0.18)] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#1d1b17]  flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">smart_display</span>
                      Source Excerpt
                    </span>
                    <span className="text-[11px] text-[#4f453f] ">Synced timestamp</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white  flex items-center gap-3 shadow-[0_2px_5px_rgba(190,175,160,0.2)]">
                    <div
                      onClick={() => setSourceVideoPlaying(!sourceVideoPlaying)}
                      className="w-12 h-10 rounded-lg bg-[#4a6171] hover:bg-[#3d515e] flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-white text-[20px]">
                        {sourceVideoPlaying ? 'pause_circle' : 'play_circle'}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[12px] font-bold text-[#1d1b17]  truncate">
                        Stanford CS231n • Lec 4
                      </span>
                      <span className="text-[11px] text-[#4f453f]  truncate">
                        Prof. Fei-Fei Li / Justin Johnson • 18:22
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bayesian Source Mastery Metric Ring */}
              <div className="w-full p-5 rounded-[2rem] bg-white  shadow-[0_16px_32px_-8px_rgba(195,180,170,0.28)] border border-[#ede7df]/80  flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#4f453f]  uppercase tracking-wider font-bold">
                    Bayesian Source Mastery
                  </span>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-[32px] font-bold text-[#1d1b17]  leading-none">
                      84%
                    </span>
                    <span className="text-[12px] text-[#496459]  font-bold flex items-center">
                      <span className="material-symbols-outlined text-[15px]">trending_up</span>
                      +12% this run
                    </span>
                  </div>
                  <span className="text-[11px] text-[#4f453f]  pt-1">
                    Confidence Interval: ±3.4%
                  </span>
                </div>

                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" stroke="#ede7df" strokeWidth="6" fill="transparent" />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#496459"
                      strokeWidth="6"
                      strokeDasharray="163.3"
                      strokeDashoffset="26.1"
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px] text-[#496459]">verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Diagnostic Navigator Tray (Image 3 & Image 4) */}
          <div className="w-full p-4 rounded-2xl bg-white  shadow-[0_18px_36px_-8px_rgba(195,180,170,0.3)] border border-[#ede7df]/80  flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* 1-5 Diagnostic Path Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4f453f]  hidden sm:inline mr-1">
                Diagnostic Path:
              </span>
              {[0, 1, 2, 3, 4].map((idx) => {
                const isPassed = idx < 2;
                const isCurrent = idx === 2;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      setSelectedOption('B');
                    }}
                    className={`w-9 h-9 rounded-full text-[13px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                      isCurrent
                        ? 'w-10 h-10 bg-[#f3cfba] text-[#725746] shadow-[0_6px_14px_-2px_rgba(215,175,155,0.7)] scale-110'
                        : isPassed
                        ? 'bg-[#c0ddd0]  text-[#052018]  shadow-[0_2px_4px_rgba(180,210,195,0.6)]'
                        : 'bg-[#ede7df]  text-[#4f453f] '
                    }`}
                  >
                    {isPassed ? <span className="material-symbols-outlined text-[16px]">check</span> : idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Accuracy & Pace */}
            <div className="flex items-center gap-4 text-[13px] text-[#4f453f] ">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#496459]">task_alt</span>
                Accuracy: <strong className="text-[#1d1b17] ">2 / 2 (100%)</strong>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#4a6171]">speed</span>
                Pace: <strong className="text-[#1d1b17] ">1m 42s / question</strong>
              </span>
            </div>

            {/* Forward / Save buttons (Including Skip from Image 4) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('catalog-only')}
                className="px-4 py-2 rounded-full bg-[#f9f3eb]  text-[#4f453f]  hover:text-[#1d1b17] text-[13px] font-semibold shadow-[0_2px_4px_rgba(180,165,150,0.2)] cursor-pointer"
              >
                Save & Finish Later
              </button>
              <button
                onClick={() => {
                  alert('Skipping diagnostic item 03 to item 04...');
                  setCurrentQuestionIndex(3);
                }}
                className="px-3.5 py-2 rounded-full bg-[#ede7df]  text-[#4f453f]  text-[12px] font-semibold cursor-pointer"
              >
                Skip Diagnostic &gt;|
              </button>
              <button
                onClick={() => {
                  alert('Moving to Diagnostic Question 4...');
                  setCurrentQuestionIndex(3);
                }}
                className="px-4 py-2 rounded-full bg-[#cbe3f6]  text-[#4f6576]  hover:bg-[#b2cadc] text-[13px] font-bold shadow-[0_4px_10px_rgba(180,205,225,0.5)] active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Next Question</span>
                <span className="material-symbols-outlined text-[16px]">skip_next</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
