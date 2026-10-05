import React, { useState, useEffect } from 'react';
import { getCourseTopics, generateAssessment, submitAssessment } from '../services/api';
import { BrainCircuit, CheckCircle, XCircle, ArrowRight, BookOpen, Sparkles, Layers } from 'lucide-react';

export default function PracticePage({ selectedCourse, currentConversation }) {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState('MCQ');

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!selectedCourse?.id) return;
    getCourseTopics(selectedCourse.id)
      .then((res) => {
        setTopics(res || []);
        if (res && res.length > 0) setSelectedTopic(res[0].id);
      })
      .catch((err) => console.error(err));
  }, [selectedCourse]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedCourse?.id) return;
    setLoading(true);
    setResults(null);
    setUserAnswers({});
    try {
      const topicObj = topics.find(t => t.id === selectedTopic);
      const res = await generateAssessment(selectedCourse.id, {
        topic_id: selectedTopic || null,
        topic_name: topicObj ? topicObj.name : (currentConversation?.topic_name || null),
        conversation_id: currentConversation?.id || null,
        difficulty,
        question_count: parseInt(questionCount),
        question_type: questionType,
      });
      setQuestions(res.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (qId, val) => {
    setUserAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleSubmitQuiz = async () => {
    if (!questions || submitting) return;
    setSubmitting(true);
    try {
      const formattedAnswers = questions.map((q) => ({
        question_id: q.id,
        user_answer: userAnswers[q.id] || '',
      }));

      const currentTopicId = selectedTopic || questions[0]?.topic_id || null;
      const res = await submitAssessment(
        questions[0]?.assessment_id || 'test_assessment',
        formattedAnswers,
        currentTopicId
      );
      setResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-12 bg-[#F7F3ED] text-[#2D3748] min-h-full">
      {/* Header Banner */}
      <div className="p-6 pastel-card border-[#E2D9CC] bg-[#FFFDF9] shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E6F4F1] border border-[#70C1B3]/30 flex items-center justify-center text-[#399283]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2D3748]">Adaptive Practice Engine</h2>
              <p className="text-xs text-[#718096]">Generate grounded quizzes tied to active learning scope</p>
            </div>
          </div>

          {currentConversation && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E6F4F1] border border-[#70C1B3]/40 text-[#399283] text-xs font-semibold">
              <Layers className="w-3.5 h-3.5" />
              <span>Scope: {currentConversation.title}</span>
            </div>
          )}
        </div>
      </div>

      {/* Assessment Configuration Form */}
      {!questions && (
        <form onSubmit={handleGenerate} className="p-6 pastel-card space-y-5 shadow-xs bg-[#FFFDF9]">
          <h3 className="text-sm font-bold text-[#2D3748] flex items-center gap-2 tracking-wide pb-3 border-b border-[#E2D9CC]">
            <Sparkles className="w-4 h-4 text-[#399283]" />
            Configure Practice Quiz
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2D3748] mb-1.5">Topic Focus</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full bg-[#F0EAE1]/70 border border-[#E2D9CC] rounded-xl px-3.5 py-2.5 text-xs text-[#2D3748] focus:outline-none focus:border-[#70C1B3] transition cursor-pointer font-medium"
              >
                <option value="">{currentConversation ? `Active Chat Scope (${currentConversation.title})` : 'All Topics'}</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D3748] mb-1.5">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-[#F0EAE1]/70 border border-[#E2D9CC] rounded-xl px-3.5 py-2.5 text-xs text-[#2D3748] focus:outline-none focus:border-[#70C1B3] transition cursor-pointer font-medium"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D3748] mb-1.5">Question Count</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                className="w-full bg-[#F0EAE1]/70 border border-[#E2D9CC] rounded-xl px-3.5 py-2.5 text-xs text-[#2D3748] focus:outline-none focus:border-[#70C1B3] transition cursor-pointer font-medium"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D3748] mb-1.5">Question Type</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                className="w-full bg-[#F0EAE1]/70 border border-[#E2D9CC] rounded-xl px-3.5 py-2.5 text-xs text-[#2D3748] focus:outline-none focus:border-[#70C1B3] transition cursor-pointer font-medium"
              >
                <option value="MCQ">Multiple Choice (MCQ)</option>
                <option value="Short Answer">Short Answer</option>
                <option value="Numerical">Numerical</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#48A999] hover:bg-[#399283] text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Generating Grounded Questions...' : 'Generate Practice Quiz'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Quiz Questions List */}
      {questions && !results && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2D9CC] p-4 pastel-card bg-[#FFFDF9]">
            <h3 className="text-sm font-bold text-[#2D3748]">
              Practice Quiz ({questions.length} Questions)
            </h3>
            <button
              onClick={() => setQuestions(null)}
              className="text-xs font-bold text-[#399283] hover:underline transition cursor-pointer"
            >
              Reset / Configure New Quiz
            </button>
          </div>

          <div className="space-y-5">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-6 pastel-card space-y-4 shadow-2xs bg-[#FFFDF9]">
                <div className="flex items-center justify-between text-xs text-[#718096]">
                  <span className="font-bold text-[#399283]">Question {idx + 1} ({q.difficulty})</span>
                  <span className="text-[#718096] text-[11px] font-semibold bg-[#F0EAE1] px-2.5 py-0.5 rounded-full border border-[#E2D9CC]">
                    {q.question_type}
                  </span>
                </div>

                <p className="text-sm font-bold text-[#2D3748] leading-relaxed">{q.question_text}</p>

                {/* MCQ Options */}
                {q.question_type === 'MCQ' && q.options && (
                  <div className="space-y-2.5 pt-2">
                    {q.options.map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-3.5 p-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          userAnswers[q.id] === opt
                            ? 'bg-[#E6F4F1] border-[#70C1B3] text-[#2D3748] shadow-2xs'
                            : 'bg-[#FFFDF9] border-[#E2D9CC] text-[#4A5568] hover:border-[#70C1B3]/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={opt}
                          checked={userAnswers[q.id] === opt}
                          onChange={() => handleAnswerChange(q.id, opt)}
                          className="accent-[#48A999] w-4 h-4"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Short Answer / Numerical Text Input */}
                {q.question_type !== 'MCQ' && (
                  <textarea
                    rows={3}
                    placeholder="Type your answer here..."
                    value={userAnswers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-full bg-[#F0EAE1]/70 border border-[#E2D9CC] rounded-xl p-3.5 text-xs text-[#2D3748] focus:outline-none focus:border-[#70C1B3] transition"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmitQuiz}
            disabled={submitting}
            className="w-full py-3.5 bg-[#48A999] hover:bg-[#399283] text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
          >
            {submitting ? 'Grading & Updating Mastery...' : 'Submit Quiz for Evaluation'}
          </button>
        </div>
      )}

      {/* Quiz Results Summary */}
      {results && (
        <div className="space-y-6">
          <div className="p-8 pastel-card text-center space-y-4 shadow-sm bg-[#FFFDF9]">
            <h3 className="text-xl font-bold text-[#2D3748]">Quiz Evaluation Complete!</h3>
            <div className="text-4xl font-extrabold text-[#399283]">{results.percentage}%</div>
            <p className="text-xs text-[#718096] font-medium">
              Updated Global Mastery: <span className="font-bold text-[#399283]">{results.updated_mastery}%</span>
            </p>
            <button
              onClick={() => {
                setResults(null);
                setQuestions(null);
              }}
              className="px-6 py-2.5 bg-[#48A999] hover:bg-[#399283] text-white rounded-xl text-xs font-bold transition shadow-2xs inline-block cursor-pointer"
            >
              Take Another Practice Quiz
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-[#2D3748]">Detailed Explanations</h4>
            {results.graded_answers.map((ans, idx) => (
              <div key={idx} className="p-5 pastel-card space-y-3 text-xs bg-[#FFFDF9]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#2D3748]">Question {idx + 1}</span>
                  {ans.is_correct ? (
                    <span className="text-[#399283] font-bold flex items-center gap-1.5 bg-[#E6F4F1] px-2.5 py-1 rounded-full border border-[#70C1B3]/30">
                      <CheckCircle className="w-4 h-4" /> Correct (+1.0)
                    </span>
                  ) : (
                    <span className="text-[#ED8B9E] font-bold flex items-center gap-1.5 bg-[#FDF1EA] px-2.5 py-1 rounded-full border border-[#F2A679]/30">
                      <XCircle className="w-4 h-4" /> Incorrect
                    </span>
                  )}
                </div>
                <p className="text-[#4A5568]"><strong className="text-[#2D3748] font-bold">Your Answer:</strong> {ans.user_answer || '(Empty)'}</p>
                <p className="text-[#4A5568]"><strong className="text-[#2D3748] font-bold">Correct Answer:</strong> {ans.correct_answer}</p>
                <p className="text-[#2D3748] bg-[#F0EAE1]/70 p-3.5 rounded-xl border border-[#E2D9CC] leading-relaxed font-medium">
                  <strong className="text-[#399283] font-bold">Explanation:</strong> {ans.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
