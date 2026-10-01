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
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-100">{selectedCourse.title} - Detailed Progress</h2>
        <p className="text-xs text-slate-400">Per-topic mastery estimates, question counts, and accuracy rates</p>
      </div>

      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          Per-Topic Mastery Overview
        </h3>

        {loading ? (
          <p className="text-xs text-slate-500 py-4 text-center">Loading progress data...</p>
        ) : masteries.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No topic mastery data available yet.</p>
        ) : (
          <div className="space-y-4 divide-y divide-slate-800/60">
            {masteries.map((m) => (
              <div key={m.topic_id} className="pt-4 first:pt-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">{m.topic_name}</h4>
                    <p className="text-[11px] text-slate-500">
                      Attempted: {m.questions_attempted} questions ({m.questions_correct} correct)
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${m.mastery_score >= 70 ? 'text-emerald-400' : m.mastery_score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {m.mastery_score}%
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      m.mastery_score >= 70 ? 'bg-emerald-500' : m.mastery_score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
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
