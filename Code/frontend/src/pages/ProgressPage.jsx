import React, { useEffect, useState } from 'react';
import { getCourseMastery } from '../services/api';
import { TrendingUp, BookOpen, AlertTriangle } from 'lucide-react';

export default function ProgressPage({ selectedCourse }) {
  const [masteries, setMasteries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCourse?.id) return;
    setLoading(true);
    getCourseMastery(selectedCourse.id)
      .then((res) => setMasteries(res || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedCourse]);

  if (!selectedCourse) {
    return <div className="p-8 text-center text-slate-400">Select a course to view detailed mastery progress.</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-12">
      <div className="p-6 glass-panel rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900/90 via-indigo-950/20 to-slate-900/90 shadow-xl">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">{selectedCourse.title} - Detailed Progress</h2>
        <p className="text-xs text-slate-400 font-medium">Per-topic mastery estimates, question counts, and accuracy rates</p>
      </div>

      <div className="p-6 glass-panel rounded-2xl space-y-5 shadow-xl">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 tracking-wide pb-3 border-b border-slate-800">
          <TrendingUp className="w-4.5 h-4.5 text-indigo-400" />
          Per-Topic Mastery Overview
        </h3>

        {loading ? (
          <p className="text-xs text-slate-400 py-6 text-center">Loading progress data...</p>
        ) : masteries.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No topic mastery data available yet.</p>
        ) : (
          <div className="space-y-3">
            {masteries.map((m) => (
              <div key={m.topic_id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:border-indigo-500/20 space-y-2.5 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{m.topic_name}</h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Attempted: {m.questions_attempted} questions ({m.questions_correct} correct)
                    </p>
                  </div>
                  <span className={`text-sm font-extrabold px-3 py-1 rounded-full text-xs ${
                    m.mastery_score >= 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : m.mastery_score >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {m.mastery_score}%
                  </span>
                </div>

                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-700 shadow-sm ${
                      m.mastery_score >= 70 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : m.mastery_score >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-rose-500 to-red-400'
                    }`}
                    style={{ width: `${m.mastery_score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
