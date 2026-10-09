import React, { useState, useEffect } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { postHintLadder } from '../../services/api';

interface SocraticHintLadderModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  initialProblemText?: string;
  onCitationClick?: (pageNumber: number) => void;
}

interface HintState {
  level: number;
  title: string;
  content: string;
  guidingQuestion?: string;
  attemptFeedback?: string;
  canRevealSolution: boolean;
  citations?: any[];
}

const LADDER_STEPS = [
  { level: 1, label: 'Direction', icon: 'lightbulb', desc: 'Conceptual Clue & Nudge' },
  { level: 2, label: 'Method', icon: 'functions', desc: 'Governing Formula & Strategy' },
  { level: 3, label: 'Worked Step', icon: 'calculate', desc: 'Intermediate Setup & Substitution' },
  { level: 4, label: 'Solution', icon: 'workspace_premium', desc: 'Full Step-by-Step Walkthrough' },
];

export const SocraticHintLadderModal: React.FC<SocraticHintLadderModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  initialProblemText = '',
  onCitationClick,
}) => {
  const [problemText, setProblemText] = useState(initialProblemText);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [studentAttempt, setStudentAttempt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hintHistory, setHintHistory] = useState<Record<number, HintState>>({});
  const [canRevealSolution, setCanRevealSolution] = useState(false);

  useEffect(() => {
    if (initialProblemText) {
      setProblemText(initialProblemText);
    }
  }, [initialProblemText]);

  useEffect(() => {
    if (isOpen && conversationId && problemText.trim() && !hintHistory[1]) {
      fetchHint(1);
    }
  }, [isOpen, conversationId]);

  const fetchHint = async (level: number, attemptText: string | null = null) => {
    if (!problemText.trim()) return;
    setIsLoading(true);

    try {
      const res = await postHintLadder(conversationId, problemText, level, attemptText);
      if (res) {
        setCurrentLevel(res.hint_level);
        if (res.can_reveal_solution) {
          setCanRevealSolution(true);
        }
        setHintHistory((prev) => ({
          ...prev,
          [res.hint_level]: {
            level: res.hint_level,
            title: res.title,
            content: res.content,
            guidingQuestion: res.guiding_question,
            attemptFeedback: res.attempt_feedback,
            canRevealSolution: res.can_reveal_solution,
            citations: res.citations,
          },
        }));
      }
    } catch (err: any) {
      console.error('Hint ladder error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLevel = (level: number) => {
    if (level === 4 && !canRevealSolution && currentLevel < 3) {
      alert('Socratic Rule: Please view earlier hints or explain your thinking to unlock the master solution!');
      return;
    }
    setCurrentLevel(level);
    if (!hintHistory[level]) {
      fetchHint(level);
    }
  };

  const handleSubmitAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentAttempt.trim()) return;
    // Submitting attempt earns advancement and unlocks next step
    const nextLevel = Math.min(currentLevel + 1, 4);
    fetchHint(nextLevel, studentAttempt);
    setStudentAttempt('');
  };

  if (!isOpen) return null;

  const activeHint = hintHistory[currentLevel];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-fade-in">
      <div className="bg-[#fcfaf7] w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#ede7df]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#f9f3eb] border-b border-[#ede7df] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#745948] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">stairs</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-bold text-[#1d1b17]">Socratic Hint Ladder</h2>
                <span className="px-2 py-0.5 rounded-full bg-[#f3cfba] text-[#725746] font-bold text-[10px] uppercase tracking-wider">
                  Explain-to-Earn
                </span>
              </div>
              <p className="text-[12px] text-[#81756e]">
                Master problem-solving step-by-step through guided clues without spoiling the solution.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white hover:bg-[#ede7df] border border-[#ede7df] text-[#81756e] hover:text-[#1d1b17] transition-all cursor-pointer"
            title="Close Hint Ladder"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
          {/* Problem Input / Display Card */}
          <div className="p-4 rounded-2xl bg-white border border-[#ede7df] shadow-xs flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#745948] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">psychology</span>
              Target Problem / Exercise:
            </span>
            {initialProblemText ? (
              <p className="text-[13px] font-medium text-[#1d1b17] leading-relaxed bg-[#f9f3eb] p-3 rounded-xl border border-[#ede7df]">
                {problemText}
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  placeholder="e.g., Given data points (x, y), find f(1.5) using Newton's forward difference formula..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#f9f3eb] border border-[#ede7df] text-[13px] text-[#1d1b17] focus:outline-none focus:ring-2 focus:ring-[#745948]/30"
                />
                <button
                  type="button"
                  onClick={() => fetchHint(1)}
                  disabled={!problemText.trim() || isLoading}
                  className="px-4 py-2 rounded-xl bg-[#745948] hover:bg-[#5a4132] text-white font-bold text-[12px] shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Start Ladder
                </button>
              </div>
            )}
          </div>

          {/* 4-Stage Socratic Ladder Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {LADDER_STEPS.map((step) => {
              const isActive = currentLevel === step.level;
              const isCompleted = hintHistory[step.level] !== undefined;
              const isLocked = step.level === 4 && !canRevealSolution && currentLevel < 3;

              return (
                <button
                  key={step.level}
                  type="button"
                  onClick={() => handleSelectLevel(step.level)}
                  disabled={isLocked}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#745948] text-white border-[#745948] shadow-md scale-102'
                      : isCompleted
                      ? 'bg-white text-[#1d1b17] border-[#745948]/40 hover:bg-[#f9f3eb]'
                      : isLocked
                      ? 'bg-[#ede7df]/40 text-[#81756e] border-[#ede7df] opacity-60 cursor-not-allowed'
                      : 'bg-white text-[#4f453f] border-[#ede7df] hover:bg-[#f9f3eb]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-[18px]">
                      {isLocked ? 'lock' : step.icon}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#ede7df] text-[#745948]'
                      }`}
                    >
                      Step {step.level}
                    </span>
                  </div>
                  <div>
                    <div className="text-[12px] font-bold truncate">{step.label}</div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-[#81756e]'}`}>
                      {step.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Hint Content Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#ede7df] shadow-xs flex flex-col gap-4">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#745948]">
                <span className="material-symbols-outlined text-[32px] animate-spin">sync</span>
                <span className="text-[13px] font-semibold">Formulating Socratic Hint Level {currentLevel}...</span>
              </div>
            ) : activeHint ? (
              <>
                <div className="flex items-center justify-between border-b border-[#ede7df] pb-3">
                  <span className="text-[14px] font-bold text-[#1d1b17] flex items-center gap-2">
                    {activeHint.title}
                  </span>
                  {activeHint.citations && activeHint.citations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onCitationClick && onCitationClick(activeHint.citations![0].page || 1)}
                      className="text-[11px] font-bold text-[#745948] hover:text-[#523d2f] bg-[#f9f3eb] px-2.5 py-1 rounded-lg border border-[#ede7df] flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">menu_book</span>
                      <span>p. {activeHint.citations[0].page}</span>
                    </button>
                  )}
                </div>

                <div className="leading-relaxed">
                  <MarkdownRenderer
                    content={activeHint.content}
                    onCitationClick={onCitationClick}
                  />
                </div>

                {/* Guiding Question Callout */}
                {activeHint.guidingQuestion && (
                  <div className="p-4 rounded-xl bg-[#f9f3eb] border border-[#f3cfba] flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#f3cfba] text-[#725746] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">help</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#725746] block">
                        Tutor's Guiding Question:
                      </span>
                      <p className="text-[13px] font-semibold text-[#1d1b17] mt-0.5">
                        {activeHint.guidingQuestion}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-10 text-center text-[#81756e] text-[13px]">
                Click "Start Ladder" or select a hint level above to receive your first clue.
              </div>
            )}
          </div>

          {/* Explain-to-Earn Interactive Submission Box */}
          <form onSubmit={handleSubmitAttempt} className="p-4 rounded-2xl bg-[#f9f3eb] border border-[#ede7df] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#745948] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">edit_note</span>
                Explain-to-Earn: Submit Your Step or Working
              </span>
              <span className="text-[10px] text-[#81756e]">
                Submitting your thinking unlocks the master solution!
              </span>
            </div>
            <textarea
              rows={2}
              value={studentAttempt}
              onChange={(e) => setStudentAttempt(e.target.value)}
              placeholder="Type your intermediate calculation, formula substitution, or answer to the guiding question..."
              className="w-full p-3 rounded-xl bg-white border border-[#ede7df] text-[13px] text-[#1d1b17] placeholder:text-[#81756e] focus:outline-none focus:ring-2 focus:ring-[#745948]/30 resize-none"
            />
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-2">
                {currentLevel < 3 && (
                  <button
                    type="button"
                    onClick={() => handleSelectLevel(currentLevel + 1)}
                    disabled={isLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#ede7df] border border-[#ede7df] text-[12px] font-bold text-[#745948] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>Request Hint {currentLevel + 1}</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                )}
                {canRevealSolution && currentLevel !== 4 && (
                  <button
                    type="button"
                    onClick={() => handleSelectLevel(4)}
                    disabled={isLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-[#c0ddd0] hover:bg-[#a6d0be] text-[#052018] font-bold text-[12px] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    <span>Reveal Master Solution</span>
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!studentAttempt.trim() || isLoading}
                className="px-4 py-2 rounded-xl bg-[#745948] hover:bg-[#5a4132] text-white font-bold text-[12px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <span>Submit Step for Review</span>
                <span className="material-symbols-outlined text-[14px]">send</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SocraticHintLadderModal;
