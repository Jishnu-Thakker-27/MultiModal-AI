import React, { useState, useEffect } from 'react';
import { getCourseTopics, generateAssessment, submitAssessment } from '../services/api';
import { BrainCircuit, CheckCircle, XCircle, ArrowRight, HelpCircle } from 'lucide-react';

export default function PracticePage({ selectedCourse }) {
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
      const res = await generateAssessment(selectedCourse.id, {
        topic_id: selectedTopic || null,
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

  if (!selectedCourse) {
    return <div className="p-8 text-center text-slate-400">Select a course to generate practice assessments.</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-12">
      <div className="p-6 glass-panel rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900/90 via-indigo-950/20 to-slate-900/90 shadow-xl">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">Adaptive Practice Engine</h2>
        <p className="text-xs text-slate-400 font-medium">Generate verified quizzes tagged by difficulty & course sources</p>
      </div>

      {/* Assessment Configuration Bar */}
      {!questions && (
        <form onSubmit={handleGenerate} className="p-6 glass-panel rounded-2xl space-y-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 tracking-wide pb-3 border-b border-slate-800">
            <BrainCircuit className="w-4.5 h-4.5 text-indigo-400" />
            Configure Assessment
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Topic</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer"
              >
                <option value="">All Course Topics</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Question Count</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Question Type</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer"
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
            className="px-6 py-3 btn-glow-primary disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Generating & Verifying Questions...' : 'Generate Quiz'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Quiz Questions Form */}
      {questions && !results && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 glass-panel p-4 rounded-xl">
            <h3 className="text-sm font-bold text-slate-100">
              Quiz ({questions.length} Questions)
            </h3>
            <button
              onClick={() => setQuestions(null)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
            >
              Configure New Quiz
            </button>
          </div>

          <div className="space-y-5">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-6 glass-panel rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold text-indigo-400">Question {idx + 1} ({q.difficulty})</span>
                  <span className="text-slate-400 text-[11px] font-semibold bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">Type: {q.question_type}</span>
                </div>

                <p className="text-sm font-semibold text-slate-100 leading-relaxed">{q.question_text}</p>

                {/* MCQ Options */}
                {q.question_type === 'MCQ' && q.options && (
                  <div className="space-y-2.5 pt-2">
                    {q.options.map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-3.5 p-3.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                          userAnswers[q.id] === opt
                            ? 'bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border-indigo-500/60 text-slate-100 shadow-md'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={opt}
                          checked={userAnswers[q.id] === opt}
                          onChange={() => handleAnswerChange(q.id, opt)}
                          className="accent-indigo-500 w-4 h-4"
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
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmitQuiz}
            disabled={submitting}
            className="w-full py-3.5 btn-glow-primary disabled:opacity-40 text-white font-bold rounded-xl text-xs transition shadow-xl cursor-pointer"
          >
            {submitting ? 'Grading Answers & Updating Mastery...' : 'Submit Quiz for Grading'}
          </button>
        </div>
      )}

      {/* Quiz Results Summary */}
      {results && (
        <div className="space-y-6">
          <div className="p-8 glass-panel rounded-2xl border border-indigo-500/20 text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <h3 className="text-xl font-bold text-slate-100">Quiz Submitted!</h3>
            <div className="text-4xl font-extrabold gradient-text-indigo">{results.percentage}%</div>
            <p className="text-xs text-slate-400 font-medium">
              Updated Topic Mastery: <span className="font-bold text-emerald-400">{results.updated_mastery}%</span>
            </p>
            <button
              onClick={() => {
                setResults(null);
                setQuestions(null);
              }}
              className="px-6 py-2.5 btn-glow-primary text-white rounded-xl text-xs font-bold transition inline-block shadow-lg cursor-pointer"
            >
              Take Another Quiz
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-100 tracking-wide">Detailed Explanations</h4>
            {results.graded_answers.map((ans, idx) => (
              <div key={idx} className="p-5 glass-panel rounded-2xl space-y-3 text-xs shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Question {idx + 1}</span>
                  {ans.is_correct ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle className="w-4 h-4" /> Correct (+1.0)
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1.5 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                      <XCircle className="w-4 h-4" /> Incorrect
                    </span>
                  )}
                </div>
                <p className="text-slate-300"><strong className="text-slate-400 font-semibold">Your Answer:</strong> {ans.user_answer || '(Empty)'}</p>
                <p className="text-slate-300"><strong className="text-slate-400 font-semibold">Correct Answer:</strong> {ans.correct_answer}</p>
                <p className="text-slate-200 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 leading-relaxed font-medium">
                  <strong className="text-indigo-400 font-bold">Explanation:</strong> {ans.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
