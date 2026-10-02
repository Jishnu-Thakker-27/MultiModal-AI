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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-panel rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900/90 via-indigo-950/20 to-slate-900/90 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <span>{selectedCourse?.title || "Data Structures & Algorithms"}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
              Active Dashboard
            </span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">Real-time mastery tracking, study insights & instant AI Tutor</p>
        </div>
        <Link
          to="/tutor"
          className="px-5 py-2.5 btn-glow-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shrink-0 z-10"
        >
          <span>Full Tutor Screen</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 glass-panel glass-panel-hover rounded-2xl space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition text-indigo-400">
            <Award className="w-12 h-12" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Progress</p>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-indigo-400 tracking-tight">
              {dashboard?.overall_progress || 0}%
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${dashboard?.overall_progress || 0}%` }}
            />
          </div>
        </div>

        <div className="p-5 glass-panel glass-panel-hover rounded-2xl space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition text-emerald-400">
            <CheckCircle className="w-12 h-12" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quizzes Completed</p>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-100 tracking-tight">
              {dashboard?.quizzes_completed || 0}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Evaluated practice sessions</p>
        </div>

        <div className="p-5 glass-panel glass-panel-hover rounded-2xl space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition text-amber-400">
            <Award className="w-12 h-12" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Score</p>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">
              {dashboard?.average_score || 0}%
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Verified question attempts</p>
        </div>

        <div className="p-5 glass-panel glass-panel-hover rounded-2xl space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition text-rose-400">
            <AlertTriangle className="w-12 h-12" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weak Topics</p>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-rose-400 tracking-tight">
              {dashboard?.weak_topics?.length || 0}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Mastery score &lt; 50%</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topic Mastery Progress Card */}
        <div className="lg:col-span-2 p-6 glass-panel rounded-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 tracking-wide">
              <BookOpen className="w-4.5 h-4.5 text-indigo-400" />
              Topic Mastery Breakdown
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              {dashboard?.topic_masteries?.length || 0} Topics
            </span>
          </div>

          {!dashboard?.topic_masteries || dashboard.topic_masteries.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No topics extracted yet. Upload source material (PDF/PPTX/MP4) under <strong className="text-indigo-400 font-semibold">Upload Sources</strong> to build your knowledge base.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboard.topic_masteries.map((item) => (
                <div key={item.topic_id} className="space-y-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:border-indigo-500/20 transition">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{item.topic_name}</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                        item.mastery_score >= 70
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : item.mastery_score >= 50
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {item.mastery_score}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 shadow-sm ${
                        item.mastery_score >= 70
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : item.mastery_score >= 50
                          ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                          : 'bg-gradient-to-r from-rose-500 to-red-400'
                      }`}
                      style={{ width: `${item.mastery_score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendation Card */}
        <div className="p-6 glass-panel rounded-2xl space-y-5 flex flex-col justify-between border border-indigo-500/20">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Award className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="font-bold text-sm text-slate-100 tracking-wide">Personalized Guidance</h3>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed font-medium shadow-inner space-y-2">
              <p className="font-bold text-indigo-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Recommended Next Step
              </p>
              <p>{dashboard?.recommended_next_action || "Upload PDF, PPTX or MP4 sources to activate AI RAG tutoring and topic mastery tracking."}</p>
            </div>
          </div>

          <Link
            to="/practice"
            className="w-full py-3 btn-glow-primary text-white rounded-xl text-xs font-bold text-center block transition shadow-lg"
          >
            Start Targeted Practice
          </Link>
        </div>
      </div>

      {/* Embedded Tutor Chatbot */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4.5 h-4.5 text-indigo-400" />
          <h3 className="font-bold text-sm text-slate-100 tracking-wide">Instant AI Tutor Assistant</h3>
        </div>
        <ChatbotWidget selectedCourse={selectedCourse} height="h-96" />
      </div>
    </div>
  );
}
