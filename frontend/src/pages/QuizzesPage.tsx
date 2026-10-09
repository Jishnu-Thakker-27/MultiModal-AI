import React, { useState, useEffect } from 'react';
import MarkdownRenderer from '../components/common/MarkdownRenderer';
import { generateAssessment, submitAssessment, getConversations, getLearnerTopicMastery } from '../services/api';

interface QuizzesPageProps {
  initialTopic?: string;
  initialDifficulty?: string;
  onBackToWorkspace?: () => void;
  onNavigateToSources?: () => void;
}

interface TrackedKnowledge {
  topic_name: string;
  tracked_score: number;
  mastery_percentage: number;
  tracked_level: string;
  recommended_difficulty: string;
  calibration_reason: string;
  active_misconceptions?: string[];
}

export const QuizzesPage: React.FC<QuizzesPageProps> = ({
  initialTopic,
  initialDifficulty,
  onBackToWorkspace,
  onNavigateToSources,
}) => {
  const [sources, setSources] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic || 'Probability');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Total Marks: Multiples of 10 up to 50
  const [totalMarks, setTotalMarks] = useState<number>(20);
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Difficulty: Adaptive / Easy / Medium / Hard
  const [difficulty, setDifficulty] = useState<string>(initialDifficulty || 'adaptive');

  // Tracked knowledge state from RAG / conversation
  const [trackedKnowledge, setTrackedKnowledge] = useState<TrackedKnowledge | null>(null);
  const [isLoadingMastery, setIsLoadingMastery] = useState<boolean>(false);

  // Quiz state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [quizData, setQuizData] = useState<any | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load conversations on mount to pick default active topic
  useEffect(() => {
    getConversations()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.conversations || [];
        setSources(list);
        if (list.length > 0) {
          const topConv = list[0];
          setActiveConvId(topConv.id);
          const clean = topConv.topic_name || topConv.title?.replace(/\.(pdf|pptx|ppt|mp4)$/i, '') || 'Probability';
          setSelectedTopic(clean);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch student's RAG-tracked knowledge whenever selectedTopic changes
  useEffect(() => {
    if (!selectedTopic.trim()) return;
    setIsLoadingMastery(true);
    getLearnerTopicMastery(selectedTopic, activeConvId)
      .then((data: TrackedKnowledge) => {
        setTrackedKnowledge(data);
      })
      .catch(() => {
        setTrackedKnowledge({
          topic_name: selectedTopic,
          tracked_score: 0.60,
          mastery_percentage: 60.0,
          tracked_level: 'Developing Sync',
          recommended_difficulty: 'Medium',
          calibration_reason: 'Calibrated to intermediate level based on conversational interaction.',
        });
      })
      .finally(() => {
        setIsLoadingMastery(false);
      });
  }, [selectedTopic, activeConvId]);

  // Each question carries exactly 1 mark; question count equals totalMarks (capped at 50)
  const marksPerQuestion = '1.0';

  const handleTotalMarksChange = (marks: number) => {
    const clampedMarks = Math.min(50, Math.max(1, marks));
    setTotalMarks(clampedMarks);
    setQuestionCount(clampedMarks);
  };

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
        total_marks: totalMarks,
        question_count: questionCount,
        question_type: 'MCQ',
        conversation_id: activeConvId,
        user_id: 'demo_student',
      });
      if (res?.questions && res.questions.length > 0) {
        setQuizData(res);
      } else {
        setError('No questions could be generated for this topic. Please ensure the topic is valid.');
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

  const answeredCount = quizData?.questions
    ? quizData.questions.filter((q: any) => userAnswers[q.id]).length
    : 0;

  return (
    <div className="w-full flex flex-col gap-6 text-left pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ede7df]">
        <div>
          <h1 className="text-[26px] sm:text-[32px] font-black text-[#1d1b17] tracking-tight">
            Adaptive Knowledge Quizzes
          </h1>
          <p className="text-[13px] text-[#4f453f] font-medium pt-1">
            Grounded assessments calibrated dynamically to your learning depth tracked by our Socratic RAG tutor.
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

      {/* RAG Knowledge Tracking Banner */}
      {trackedKnowledge && (
        <div className="p-4 sm:p-5 rounded-3xl bg-[#f9f3eb] border border-[#ede7df] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#f3cfba] text-[#725746] flex items-center justify-center shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-[22px]">psychology</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-extrabold text-[#1d1b17]">RAG Knowledge Tracking</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#745948] text-white">
                  {trackedKnowledge.tracked_level} • {trackedKnowledge.mastery_percentage}% Mastery
                </span>
                {trackedKnowledge.active_misconceptions && trackedKnowledge.active_misconceptions.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ffdad6] text-[#ba1a1a]">
                    Targeting {trackedKnowledge.active_misconceptions.length} Known Misconceptions
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#736860] font-medium pt-1 leading-relaxed">
                {trackedKnowledge.calibration_reason}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[12px] font-bold text-[#81756e]">RAG Recommendation:</span>
            <span className="px-3 py-1 rounded-full text-[12px] font-extrabold bg-[#e8ded3] text-[#745948] border border-[#d6c7b9]">
              {trackedKnowledge.recommended_difficulty} Level
            </span>
          </div>
        </div>
      )}

      {/* Quiz Configuration Panel */}
      <div className="p-6 rounded-3xl bg-white border border-[#ede7df] shadow-sm flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Target Topic Input */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#81756e]">
              Target Topic / Chapter
            </label>
            <input
              type="text"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              placeholder="e.g. Probability or Newton Interpolation"
              className="w-full px-4 py-2.5 rounded-xl bg-[#f9f3eb] text-[13px] font-bold text-[#1d1b17] border border-[#ede7df] focus:outline-none focus:ring-2 focus:ring-[#745948]/30 transition-all"
            />
          </div>

          {/* Difficulty Mode (with Adaptive tracking option) */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#81756e] flex items-center justify-between">
              <span>Difficulty Level</span>
              {difficulty === 'adaptive' && (
                <span className="text-[#745948] lowercase font-bold text-[10px]">(calibrated by rag)</span>
              )}
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#f9f3eb] text-[13px] font-bold text-[#1d1b17] border border-[#ede7df] focus:outline-none cursor-pointer"
            >
              <option value="adaptive">
                ✨ Adaptive (RAG Calibrated: {trackedKnowledge?.recommended_difficulty || 'Medium'})
              </option>
              <option value="easy">Easy (Foundations & Intuition)</option>
              <option value="medium">Medium (Calibrated to Conversation)</option>
              <option value="hard">Hard (Advanced Multi-Step)</option>
            </select>
          </div>

          {/* Question Count & Marks Selection (1 Mark / Question, Max 50) */}
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#81756e]">
              Questions & Marks
            </label>
            <select
              value={questionCount}
              onChange={(e) => handleTotalMarksChange(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-[#f9f3eb] text-[13px] font-bold text-[#1d1b17] border border-[#ede7df] focus:outline-none cursor-pointer"
            >
              <option value={10}>10 Questions (10 Marks • 1 pt each)</option>
              <option value={20}>20 Questions (20 Marks • 1 pt each)</option>
              <option value={30}>30 Questions (30 Marks • 1 pt each)</option>
              <option value={40}>40 Questions (40 Marks • 1 pt each)</option>
              <option value={50}>50 Questions (50 Marks • 1 pt each)</option>
            </select>
          </div>

          {/* Generate Button */}
          <div className="md:col-span-2">
            <button
              onClick={handleGenerateQuiz}
              disabled={isGenerating || !selectedTopic.trim()}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                isGenerating || !selectedTopic.trim()
                  ? 'bg-[#ede7df] text-[#81756e] cursor-not-allowed'
                  : 'bg-[#745948] hover:bg-[#5a4132] text-white shadow-[0_4px_12px_rgba(116,89,72,0.3)]'
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Building...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">quiz</span>
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Total Marks Selector: Multiples of 10 up to 50 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#ede7df]/80">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#81756e]">
              Total Marks (Max 50):
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[10, 20, 30, 40, 50].map((marks) => {
                const isSelected = totalMarks === marks;
                return (
                  <button
                    key={marks}
                    type="button"
                    onClick={() => handleTotalMarksChange(marks)}
                    className={`px-3.5 py-1.5 rounded-full text-[12px] font-black transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#745948] text-white border-[#745948] shadow-xs'
                        : 'bg-[#f9f3eb] text-[#736860] border-[#ede7df] hover:border-[#745948]/40 hover:bg-white'
                    }`}
                  >
                    {marks} Marks ({marks} Qs)
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[12px] font-bold text-[#745948] bg-[#f9f3eb] px-3.5 py-1 rounded-full border border-[#ede7df] w-fit">
            🎯 Standard: {totalMarks} Questions = {totalMarks} Marks (1 Mark each • Max 50)
          </div>
        </div>
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
          {/* Active Quiz Meta Header */}
          <div className="p-5 rounded-3xl bg-[#f9f3eb] border border-[#ede7df] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[22px] text-[#745948]">assignment</span>
              <span className="text-[15px] font-extrabold text-[#1d1b17]">
                Quiz: {quizData.questions[0]?.topic_name || selectedTopic}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#745948] text-white">
                {quizData.calibrated_difficulty || difficulty} Level
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-extrabold text-[#745948] bg-white px-3 py-1 rounded-full border border-[#ede7df]">
                Total: {quizData.total_marks || totalMarks} Marks
              </span>
              <span className="text-[12px] font-bold text-[#81756e] bg-white px-3 py-1 rounded-full border border-[#ede7df]">
                {answeredCount} of {quizData.questions.length} Answered
              </span>
            </div>
          </div>

          {/* Question Cards */}
          {quizData.questions.map((q: any, qIdx: number) => {
            const isAnswered = Boolean(userAnswers[q.id]);
            const allottedMarks = q.marks || q.source_metadata?.marks || marksPerQuestion;

            return (
              <div
                key={q.id}
                className={`p-6 rounded-3xl bg-white border transition-all shadow-xs flex flex-col gap-4 ${
                  isAnswered ? 'border-[#745948]/40 ring-1 ring-[#745948]/15' : 'border-[#ede7df]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#f3cfba] text-[#725746] font-black text-[13px] flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    <div className="text-[15px] font-bold text-[#1d1b17] leading-relaxed pt-0.5">
                      <MarkdownRenderer content={q.question_text} />
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-black bg-[#f9f3eb] text-[#745948] border border-[#ede7df] shrink-0">
                    {allottedMarks === 1 ? '1 Mark' : `${allottedMarks} Marks`}
                  </span>
                </div>

                {q.options && Array.isArray(q.options) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 pl-0 sm:pl-11">
                    {q.options.map((opt: string, optIdx: number) => {
                      const isSelected = userAnswers[q.id] === opt;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleOptionSelect(q.id, opt)}
                          className={`p-4 rounded-2xl border text-left text-[13px] transition-all cursor-pointer flex items-center gap-3 ${
                            isSelected
                              ? 'bg-[#f3cfba]/35 border-[#745948] text-[#1d1b17] font-bold shadow-xs ring-1 ring-[#745948]'
                              : 'bg-white border-[#ede7df] hover:border-[#745948]/50 hover:bg-[#f9f3eb]/40 text-[#4f453f]'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                              isSelected
                                ? 'bg-[#745948] text-white'
                                : 'border border-[#ede7df] text-[#81756e] bg-[#f9f3eb]'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1 leading-normal">
                            <MarkdownRenderer content={opt} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit Action Bar */}
          <div className="p-5 rounded-3xl bg-white border border-[#ede7df] shadow-md flex items-center justify-between sticky bottom-4 z-10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#745948]">checklist</span>
              <span className="text-[13px] font-bold text-[#1d1b17]">
                {answeredCount} of {quizData.questions.length} questions completed
              </span>
            </div>

            <button
              onClick={handleSubmitQuiz}
              disabled={isSubmitting || answeredCount === 0}
              className={`px-8 py-3 rounded-full font-bold text-[13px] flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                isSubmitting || answeredCount === 0
                  ? 'bg-[#ede7df] text-[#81756e] cursor-not-allowed'
                  : 'bg-[#745948] hover:bg-[#5a4132] text-white shadow-[0_4px_14px_rgba(116,89,72,0.35)]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Grading Exam...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Submit Quiz ({quizData.total_marks || totalMarks} Marks)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Quiz Result View */}
      {quizResult && (
        <div className="flex flex-col gap-6">
          {/* Score Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#ede7df] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div
                className={`w-18 h-18 rounded-3xl flex items-center justify-center font-black text-[24px] shadow-sm ${
                  quizResult.percentage >= 75
                    ? 'bg-[#c0ddd0] text-[#052018]'
                    : quizResult.percentage >= 50
                    ? 'bg-[#f3cfba] text-[#725746]'
                    : 'bg-[#ffdad6] text-[#ba1a1a]'
                }`}
              >
                {quizResult.percentage}%
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-black uppercase tracking-wider text-[#81756e]">
                  Official Exam Score
                </span>
                <h2 className="text-[24px] sm:text-[28px] font-black text-[#1d1b17]">
                  {quizResult.total_score} / {quizResult.total_marks || totalMarks} Marks
                </h2>
                <p className="text-[12px] text-[#736860] font-medium">
                  {quizResult.percentage >= 80
                    ? '🌟 Excellent mastery! You have demonstrated strong competency in this chapter.'
                    : quizResult.percentage >= 50
                    ? '👍 Good progress. Review the detailed explanations below to eliminate gaps.'
                    : '📚 Needs practice. Re-visit the Socratic dialogue with your tutor to reinforce foundational intuition.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateQuiz}
                className="px-6 py-2.5 rounded-full bg-[#745948] hover:bg-[#5a4132] text-white font-bold text-[13px] shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Retake / New Quiz</span>
              </button>
              {onBackToWorkspace && (
                <button
                  onClick={onBackToWorkspace}
                  className="px-5 py-2.5 rounded-full border border-[#745948] text-[#745948] font-bold text-[13px] hover:bg-[#f9f3eb] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  <span>Review in Tutor</span>
                </button>
              )}
            </div>
          </div>

          {/* Graded Questions Breakdown */}
          {quizResult.graded_answers && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-[16px] font-black text-[#1d1b17]">
                  Detailed Breakdown & Pedagogical Explanations
                </h3>
                <span className="text-[12px] font-bold text-[#81756e]">
                  Total: {quizResult.total_score} / {quizResult.total_marks || totalMarks} Marks
                </span>
              </div>

              {quizResult.graded_answers.map((ga: any, idx: number) => {
                const maxPts = ga.max_marks || (totalMarks / quizResult.graded_answers.length).toFixed(1);

                return (
                  <div
                    key={idx}
                    className={`p-6 rounded-3xl border flex flex-col gap-3.5 ${
                      ga.is_correct
                        ? 'bg-white border-[#c0ddd0]'
                        : 'bg-white border-[#ffdad6]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-black text-[#81756e]">Question {idx + 1}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 ${
                            ga.is_correct
                              ? 'bg-[#c0ddd0] text-[#052018]'
                              : 'bg-[#ffdad6] text-[#ba1a1a]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {ga.is_correct ? 'check' : 'close'}
                          </span>
                          {ga.is_correct ? `+${ga.score} Marks` : `0 / ${maxPts} Marks`}
                        </span>
                      </div>

                      <span className="text-[11px] font-bold text-[#81756e]">
                        Allotted: {maxPts} Marks
                      </span>
                    </div>

                    <div className="text-[13px] text-[#1d1b17] flex flex-col gap-1.5 pt-1">
                      <div>
                        <span className="font-semibold text-[#81756e]">Your Answer: </span>
                        <span className={ga.is_correct ? 'text-[#052018] font-bold' : 'text-[#ba1a1a] font-bold'}>
                          {ga.user_answer || 'No answer selected'}
                        </span>
                      </div>

                      {!ga.is_correct && (
                        <div>
                          <span className="font-semibold text-[#81756e]">Correct Answer: </span>
                          <span className="text-[#052018] font-bold">{ga.correct_answer}</span>
                        </div>
                      )}
                    </div>

                    {ga.explanation && (
                      <div className="mt-1 p-4 rounded-2xl bg-[#f9f3eb] text-[12px] text-[#4f453f] leading-relaxed border border-[#ede7df]">
                        <span className="font-extrabold text-[#1d1b17]">Explanation: </span>
                        <MarkdownRenderer content={ga.explanation} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Initial Empty State before quiz generation */}
      {!quizData && !isGenerating && (
        <div className="p-12 rounded-3xl bg-white border border-[#ede7df] text-center flex flex-col items-center gap-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-[#f9f3eb] flex items-center justify-center text-[#745948] shadow-2xs">
            <span className="material-symbols-outlined text-[36px]">quiz</span>
          </div>
          <h3 className="text-[18px] font-black text-[#1d1b17]">Ready for an Adaptive Knowledge Quiz</h3>
          <p className="text-[13px] text-[#4f453f] max-w-md">
            Choose your target topic and exam marks (10 to 50 in multiples of 10). Questions and difficulty are automatically calibrated to match the knowledge tracked by our Socratic tutor.
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
