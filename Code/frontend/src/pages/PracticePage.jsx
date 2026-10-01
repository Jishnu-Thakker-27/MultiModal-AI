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

      const res = await submitAssessment(questions[0]?.assessment_id || 'test_assessment', formattedAnswers);
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
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Adaptive Practice Engine</h2>
        <p className="text-xs text-slate-400">Generate verified quizzes tagged by difficulty & course sources</p>
      </div>

      {/* Assessment Configuration Bar */}
      {!questions && (
        <form onSubmit={handleGenerate} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-indigo-400" />
            Configure Assessment
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Topic</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Course Topics</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Question Count</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Question Type</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            {loading ? 'Generating & Verifying Questions...' : 'Generate Quiz'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Quiz Questions Form */}
      {questions && !results && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200">
              Quiz ({questions.length} Questions)
            </h3>
            <button
              onClick={() => setQuestions(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Configure New Quiz
            </button>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-indigo-400">Question {idx + 1} ({q.difficulty})</span>
                  <span className="text-slate-500 text-[11px]">Type: {q.question_type}</span>
                </div>

                <p className="text-xs font-medium text-slate-200">{q.question_text}</p>

                {/* MCQ Options */}
                {q.question_type === 'MCQ' && q.options && (
                  <div className="space-y-2 pt-2">
                    {q.options.map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition ${
                          userAnswers[q.id] === opt
                            ? 'bg-indigo-950/40 border-indigo-500/50 text-slate-100'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={opt}
                          checked={userAnswers[q.id] === opt}
                          onChange={() => handleAnswerChange(q.id, opt)}
                          className="accent-indigo-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmitQuiz}
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-indigo-600/20"
          >
            {submitting ? 'Grading Answers & Updating Mastery...' : 'Submit Quiz for Grading'}
          </button>
        </div>
      )}

      {/* Quiz Results Summary */}
      {results && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-3">
            <h3 className="text-lg font-bold text-slate-100">Quiz Submitted!</h3>
            <div className="text-3xl font-extrabold text-indigo-400">{results.percentage}%</div>
            <p className="text-xs text-slate-400">
              Updated Topic Mastery: <span className="font-semibold text-emerald-400">{results.updated_mastery}%</span>
            </p>
            <button
              onClick={() => {
                setResults(null);
                setQuestions(null);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition inline-block"
            >
              Take Another Quiz
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-200">Detailed Explanations</h4>
            {results.graded_answers.map((ans, idx) => (
              <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Question {idx + 1}</span>
                  {ans.is_correct ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Correct (+1.0)
                    </span>
                  ) : (
                    <span className="text-rose-400 font-medium flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect
                    </span>
                  )}
                </div>
                <p className="text-slate-400"><strong className="text-slate-300">Your Answer:</strong> {ans.user_answer || '(Empty)'}</p>
                <p className="text-slate-400"><strong className="text-slate-300">Correct Answer:</strong> {ans.correct_answer}</p>
                <p className="text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                  <strong className="text-indigo-400">Explanation:</strong> {ans.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
