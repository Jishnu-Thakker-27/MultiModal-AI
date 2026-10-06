import React, { useState, useEffect } from 'react';
import { generateAssessment, submitAssessment, getConversations } from '../services/api';

interface QuizzesPageProps {
  onBackToWorkspace?: () => void;
  onNavigateToSources?: () => void;
}

export const QuizzesPage: React.FC<QuizzesPageProps> = ({
  onBackToWorkspace,
  onNavigateToSources,
}) => {
  const [sources, setSources] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('Interpolation');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [quizData, setQuizData] = useState<any | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConversations()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.conversations || [];
        setSources(list);
        if (list.length > 0 && list[0].title) {
          const clean = list[0].title.replace(/\.(pdf|pptx|ppt|mp4)$/i, '');
          setSelectedTopic(clean);
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerateQuiz = async () => {
    if (!selectedTopic.trim()) return;
    setIsGenerating(true);
    setError(null);
    setQuizResult(null);
    setUserAnswers({});

    try {
      const res = await generateAssessment('default_course', {
        topic_name: selectedTopic,
        difficulty,
        question_count: questionCount,
        question_type: 'MCQ',
      });
      if (res?.questions && res.questions.length > 0) {
        setQuizData(res);
      } else {
        setError('No questions could be generated for this topic. Please ensure sources are attached.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to generate quiz.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptionSelect = (questionId: string, option: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quizData) return;
    setIsSubmitting(true);
    setError(null);

    const answersPayload = quizData.questions.map((q: any) => ({
      question_id: q.id,
      user_answer: userAnswers[q.id] || '',
    }));

    try {
      const result = await submitAssessment(quizData.assessment_id, answersPayload);
      setQuizResult(result);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to submit quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 text-left pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ede7df]">
        <div>
          <h1 className="text-[26px] sm:text-[32px] font-black text-[#1d1b17] tracking-tight">
            Adaptive Knowledge Quizzes
          </h1>
          <p className="text-[13px] text-[#4f453f] font-medium pt-1">
            Test and strengthen your understanding with instant feedback grounded directly in your study chapters.
          </p>
        </div>
        {onBackToWorkspace && (
          <button
            onClick={onBackToWorkspace}
            className="px-5 py-2.5 rounded-full bg-[#745948] hover:bg-[#5a4132] text-white font-bold text-[13px] shadow-md transition-all cursor-pointer flex items-center gap-2 w-fit"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Tutor Workspace</span>
          </button>
        )}
      </div>

      {/* Quiz Configuration Bar */}
      <div className="p-6 rounded-3xl bg-white border border-[#ede7df] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#81756e]">
              Target Chapter / Topic
            </label>
            <input
              type="text"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              placeholder="e.g. Interpolation or ODEs"
              className="w-full px-4 py-2.5 rounded-xl bg-[#f9f3eb] text-[13px] font-bold text-[#1d1b17] border border-[#ede7df] focus:outline-none focus:ring-2 focus:ring-[#745948]/30"
            />
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-36">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#81756e]">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#f9f3eb] text-[13px] font-bold text-[#1d1b17] border border-[#ede7df] focus:outline-none cursor-pointer"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-28">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#81756e]">
              Questions
            </label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-[#f9f3eb] text-[13px] font-bold text-[#1d1b17] border border-[#ede7df] focus:outline-none cursor-pointer"
            >
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={7}>7 Questions</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateQuiz}
          disabled={isGenerating || !selectedTopic.trim()}
          className={`px-6 py-3 rounded-full font-bold text-[13px] flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
            isGenerating || !selectedTopic.trim()
              ? 'bg-[#ede7df] text-[#81756e] cursor-not-allowed'
              : 'bg-[#745948] hover:bg-[#5a4132] text-white shadow-[0_4px_12px_rgba(116,89,72,0.35)]'
          }`}
        >
          {isGenerating ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
              <span>Generating Quiz...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">quiz</span>
              <span>Generate Quiz</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#ffdad6]/70 border border-[#ffdad6] text-[13px] text-[#ba1a1a] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Quiz Active View */}
      {quizData && !quizResult && (
        <div className="flex flex-col gap-5">
          <div className="p-5 rounded-3xl bg-[#f9f3eb] border border-[#ede7df] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#745948]">assignment</span>
              <span className="text-[14px] font-bold text-[#1d1b17]">
                Quiz on: {quizData.questions[0]?.topic_name || selectedTopic}
              </span>
            </div>
            <span className="text-[12px] font-bold text-[#745948] bg-white px-3 py-1 rounded-full border border-[#ede7df]">
              {quizData.questions.length} Questions
            </span>
          </div>

          {quizData.questions.map((q: any, qIdx: number) => (
            <div
              key={q.id}
              className="p-6 rounded-3xl bg-white border border-[#ede7df] shadow-sm flex flex-col gap-4"
            >
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#f3cfba] text-[#725746] font-bold text-[13px] flex items-center justify-center shrink-0">
                  {qIdx + 1}
                </span>
                <h3 className="text-[15px] font-bold text-[#1d1b17] leading-relaxed pt-0.5">
                  {q.question_text}
                </h3>
              </div>

              {q.options && Array.isArray(q.options) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 pl-10">
                  {q.options.map((opt: string, oIdx: number) => {
                    const isSelected = userAnswers[q.id] === opt;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleOptionSelect(q.id, opt)}
                        className={`p-3.5 rounded-2xl text-left text-[13px] font-medium transition-all cursor-pointer flex items-center gap-3 border ${
                          isSelected
                            ? 'bg-[#745948] text-white border-[#745948] font-bold shadow-md'
                            : 'bg-[#f9f3eb] hover:bg-[#ede7df] text-[#1d1b17] border-[#ede7df]'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] shrink-0 ${
                            isSelected ? 'border-white bg-white/20' : 'border-[#81756e]'
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmitQuiz}
              disabled={isSubmitting || Object.keys(userAnswers).length === 0}
              className={`px-8 py-3.5 rounded-full font-bold text-[14px] shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                isSubmitting || Object.keys(userAnswers).length === 0
                  ? 'bg-[#ede7df] text-[#81756e] cursor-not-allowed'
                  : 'bg-[#745948] hover:bg-[#5a4132] text-white shadow-[0_4px_16px_rgba(116,89,72,0.4)]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Scoring Quiz...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Submit & View Results</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Quiz Result View */}
      {quizResult && (
        <div className="flex flex-col gap-6">
          <div className="p-8 rounded-3xl bg-white border border-[#ede7df] shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div
                className={`w-20 h-20 rounded-3xl flex items-center justify-center text-[26px] font-black ${
                  quizResult.score_percentage >= 70
                    ? 'bg-[#c0ddd0] text-[#052018]'
                    : quizResult.score_percentage >= 40
                    ? 'bg-[#f3cfba] text-[#725746]'
                    : 'bg-[#ffdad6] text-[#ba1a1a]'
                }`}
              >
                {Math.round(quizResult.score_percentage)}%
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-[20px] font-bold text-[#1d1b17]">
                  {quizResult.score_percentage >= 70
                    ? 'Excellent Understanding!'
                    : quizResult.score_percentage >= 40
                    ? 'Good Progress! Keep Practicing'
                    : 'Needs Conceptual Review'}
                </h2>
                <p className="text-[13px] text-[#4f453f]">
                  Score: {quizResult.total_score} / {quizResult.max_score} • {quizResult.passed ? 'Passed' : 'Needs Practice'}
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateQuiz}
              className="px-6 py-2.5 rounded-full bg-[#745948] hover:bg-[#5a4132] text-white font-bold text-[13px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Retake / New Quiz</span>
            </button>
          </div>

          {/* Graded Questions Breakdown */}
          {quizResult.graded_answers && (
            <div className="flex flex-col gap-4">
              <h3 className="text-[16px] font-bold text-[#1d1b17]">Answer Breakdown & Grounded Explanations</h3>
              {quizResult.graded_answers.map((ga: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border flex flex-col gap-2.5 ${
                    ga.is_correct
                      ? 'bg-white border-[#c0ddd0]'
                      : 'bg-white border-[#ffdad6]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#81756e]">Question {idx + 1}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                        ga.is_correct
                          ? 'bg-[#c0ddd0] text-[#052018]'
                          : 'bg-[#ffdad6] text-[#ba1a1a]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {ga.is_correct ? 'check' : 'close'}
                      </span>
                      {ga.is_correct ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <div className="text-[13px] text-[#1d1b17]">
                    <span className="font-semibold">Your Answer: </span>
                    <span className={ga.is_correct ? 'text-[#052018] font-bold' : 'text-[#ba1a1a]'}>
                      {ga.user_answer || 'No answer selected'}
                    </span>
                  </div>

                  {!ga.is_correct && (
                    <div className="text-[13px] text-[#1d1b17]">
                      <span className="font-semibold">Correct Answer: </span>
                      <span className="text-[#052018] font-bold">{ga.correct_answer}</span>
                    </div>
                  )}

                  {ga.explanation && (
                    <div className="mt-1 p-3 rounded-xl bg-[#f9f3eb] text-[12px] text-[#4f453f] leading-relaxed">
                      <span className="font-bold text-[#1d1b17]">Explanation: </span>
                      {ga.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial Empty State before quiz generation */}
      {!quizData && !isGenerating && (
        <div className="p-12 rounded-3xl bg-white border border-[#ede7df] text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#f9f3eb] flex items-center justify-center text-[#745948]">
            <span className="material-symbols-outlined text-[36px]">quiz</span>
          </div>
          <h3 className="text-[18px] font-extrabold text-[#1d1b17]">Ready for an Adaptive Quiz</h3>
          <p className="text-[13px] text-[#4f453f] max-w-md">
            Select your chapter topic above and click <strong>Generate Quiz</strong> to practice questions crafted directly from your uploaded materials.
          </p>
          {onNavigateToSources && (
            <button
              onClick={onNavigateToSources}
              className="px-6 py-2.5 rounded-full border border-[#745948] text-[#745948] font-bold text-[13px] hover:bg-[#f9f3eb] transition-all cursor-pointer"
            >
              Browse Attached Course Materials
            </button>
          )}
        </div>
      )}
    </div>
  );
};
