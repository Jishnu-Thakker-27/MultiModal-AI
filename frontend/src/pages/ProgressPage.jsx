import React, { useEffect, useState } from 'react';
import { getCourseMastery } from '../services/api';
import { TrendingUp, BookOpen, Sparkles, Award } from 'lucide-react';

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

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-12 bg-[#F7F3ED] text-[#2D3748] min-h-full">
      <div className="p-6 pastel-card bg-[#FFFDF9] space-y-2 border-[#E2D9CC]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E6F4F1] border border-[#70C1B3]/30 flex items-center justify-center text-[#399283]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2D3748]">Student Mastery Dashboard</h2>
            <p className="text-xs text-[#718096]">Global per-topic mastery metrics and quiz accuracy rates</p>
          </div>
        </div>
      </div>

      <div className="p-6 pastel-card space-y-5 bg-[#FFFDF9] border-[#E2D9CC]">
        <h3 className="text-sm font-bold text-[#2D3748] flex items-center gap-2 tracking-wide pb-3 border-b border-[#E2D9CC]">
          <Award className="w-4 h-4 text-[#399283]" />
          Topic Mastery Breakdown
        </h3>

        {loading ? (
          <p className="text-xs text-[#718096] py-6 text-center">Loading progress data...</p>
        ) : masteries.length === 0 ? (
          <p className="text-xs text-[#718096] py-6 text-center">No topic mastery data recorded yet. Take practice quizzes to track your progress!</p>
        ) : (
          <div className="space-y-3">
            {masteries.map((m) => (
              <div key={m.topic_id} className="p-4 rounded-xl bg-[#F0EAE1]/60 border border-[#E2D9CC] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#2D3748]">{m.topic_name}</h4>
                    <p className="text-[11px] text-[#718096] font-medium">
                      Attempted: {m.questions_attempted} questions ({m.questions_correct} correct)
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    m.mastery_score >= 70 ? 'bg-[#E6F4F1] text-[#399283] border border-[#70C1B3]/30' : m.mastery_score >= 50 ? 'bg-[#FDF1EA] text-[#F2A679] border border-[#F2A679]/30' : 'bg-red-50 text-red-500 border border-red-200'
                  }`}>
                    {m.mastery_score}% Mastery
                  </span>
                </div>

                <div className="w-full bg-[#E2D9CC] h-2.5 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      m.mastery_score >= 70 ? 'bg-[#48A999]' : m.mastery_score >= 50 ? 'bg-[#F2A679]' : 'bg-[#ED8B9E]'
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
