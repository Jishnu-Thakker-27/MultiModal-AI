import React, { useEffect, useState } from 'react';
import { getCourseDashboard } from '../services/api';
import { LayoutDashboard, Award, AlertTriangle, ArrowRight, BookOpen, CheckCircle, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import ChatbotWidget from '../components/chat/ChatbotWidget';

export default function DashboardPage({ selectedCourse, onCourseCreated }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedCourse?.id) return;
    setLoading(true);
    getCourseDashboard(selectedCourse.id)
      .then((data) => {
        setDashboard(data);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load dashboard data.");
      })
      .finally(() => setLoading(false));
  }, [selectedCourse]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            {selectedCourse?.title || "Data Structures & Algorithms"} - Dashboard
          </h2>
          <p className="text-xs text-slate-400">Real-time mastery tracking, study insights & instant AI Tutor</p>
        </div>
        <Link
          to="/tutor"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/20"
        >
          <span>Full Tutor Screen</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <p className="text-xs font-medium text-slate-400">Overall Progress</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-400">
              {dashboard?.overall_progress || 0}%
            </span>
            <Award className="w-5 h-5 text-indigo-400 opacity-60" />
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full transition-all duration-500"
              style={{ width: `${dashboard?.overall_progress || 0}%` }}
            />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <p className="text-xs font-medium text-slate-400">Quizzes Completed</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-100">
              {dashboard?.quizzes_completed || 0}
            </span>
            <CheckCircle className="w-5 h-5 text-emerald-400 opacity-60" />
          </div>
          <p className="text-[11px] text-slate-500">Evaluated practice sessions</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <p className="text-xs font-medium text-slate-400">Average Quiz Score</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-100">
              {dashboard?.average_score || 0}%
            </span>
            <Award className="w-5 h-5 text-amber-400 opacity-60" />
          </div>
          <p className="text-[11px] text-slate-500">Verified question attempts</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <p className="text-xs font-medium text-slate-400">Weak Topics</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-400">
              {dashboard?.weak_topics?.length || 0}
            </span>
            <AlertTriangle className="w-5 h-5 text-rose-400 opacity-60" />
          </div>
          <p className="text-[11px] text-slate-500">Mastery &lt; 50%</p>
        </div>
      </div>

      {/* Main Grid: Topic Mastery & Next Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topic Mastery Progress */}
        <div className="lg:col-span-2 p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Topic Mastery Breakdown
          </h3>

          {!dashboard?.topic_masteries || dashboard.topic_masteries.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No topics extracted yet. Upload source material (PDF/PPTX/MP4) under Upload Sources to build knowledge base.
            </p>
          ) : (
            <div className="space-y-4">
              {dashboard.topic_masteries.map((item) => (
                <div key={item.topic_id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{item.topic_name}</span>
                    <span
                      className={`font-semibold ${
                        item.mastery_score >= 70
                          ? 'text-emerald-400'
                          : item.mastery_score >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {item.mastery_score}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        item.mastery_score >= 70
                          ? 'bg-emerald-500'
                          : item.mastery_score >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.mastery_score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Action Card */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              Personalized Recommendation
            </h3>
            <div className="p-4 bg-indigo-950/40 border border-indigo-500/20 rounded-lg text-xs text-indigo-200 leading-relaxed">
              {dashboard?.recommended_next_action || "Upload PDF, PPTX or MP4 sources to activate AI RAG tutoring and topic mastery tracking."}
            </div>
          </div>

          <Link
            to="/practice"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold text-center block transition shadow-md shadow-indigo-600/20"
          >
            Start Targeted Practice
          </Link>
        </div>
      </div>

      {/* BOTTOM HORIZONTAL GRID CONTAINING CHATBOT */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-sm text-slate-200">Instant AI Tutor Assistant</h3>
        </div>
        <ChatbotWidget selectedCourse={selectedCourse} height="h-96" />
      </div>
    </div>
  );
}
