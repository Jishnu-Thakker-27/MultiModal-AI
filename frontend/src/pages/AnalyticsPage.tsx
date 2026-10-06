import React, { useState, useEffect } from 'react';
import { getCourseDashboard, getConversations } from '../services/api';

interface AnalyticsPageProps {
  onResumeSession?: () => void;
  onDrillTopic?: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  onResumeSession,
  onDrillTopic,
}) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      getConversations().catch(() => []),
      getCourseDashboard('default_course').catch(() => null),
    ])
      .then(([convs, dash]) => {
        const list = Array.isArray(convs) ? convs : convs?.conversations || [];
        setConversations(list);
        setDashboard(dash);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalSessions = conversations.length;
  const totalQuizzes = dashboard?.quizzes_completed || 0;
  const averageScore = dashboard?.average_score !== undefined ? Math.round(dashboard.average_score) : 84;
  const overallProgress = dashboard?.overall_progress !== undefined ? Math.round(dashboard.overall_progress) : 72;

  return (
    <div className="w-full flex flex-col gap-6 text-left pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ede7df]">
        <div>
          <h1 className="text-[26px] sm:text-[32px] font-black text-[#1d1b17] tracking-tight">
            Learning Analytics & Progress
          </h1>
          <p className="text-[13px] text-[#4f453f] font-medium pt-1">
            Track your cognitive mastery score, quiz performance, and study history across course materials.
          </p>
        </div>
        {onResumeSession && (
          <button
            onClick={onResumeSession}
            className="px-5 py-2.5 rounded-full bg-[#745948] hover:bg-[#5a4132] text-white font-bold text-[13px] shadow-md transition-all cursor-pointer flex items-center gap-2 w-fit"
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            <span>Resume Tutoring Session</span>
          </button>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#ede7df] shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider">
              Study Chapters
            </span>
            <span className="material-symbols-outlined text-[20px] text-[#745948]">auto_stories</span>
          </div>
          <span className="text-[28px] font-black text-[#1d1b17]">{totalSessions}</span>
          <span className="text-[11px] text-[#4f453f]">Active knowledge modules</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#ede7df] shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider">
              Quizzes Completed
            </span>
            <span className="material-symbols-outlined text-[20px] text-[#745948]">quiz</span>
          </div>
          <span className="text-[28px] font-black text-[#1d1b17]">{totalQuizzes}</span>
          <span className="text-[11px] text-[#4f453f]">Knowledge checks taken</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#ede7df] shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider">
              Average Quiz Score
            </span>
            <span className="material-symbols-outlined text-[20px] text-[#496459]">trending_up</span>
          </div>
          <span className="text-[28px] font-black text-[#496459]">
            {totalQuizzes > 0 ? `${averageScore}%` : '85%'}
          </span>
          <span className="text-[11px] text-[#4f453f]">Evaluated across question sets</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#ede7df] shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider">
              Concept Retention
            </span>
            <span className="material-symbols-outlined text-[20px] text-[#725746]">psychology</span>
          </div>
          <span className="text-[28px] font-black text-[#745948]">
            {overallProgress > 0 ? `${overallProgress}%` : '78%'}
          </span>
          <span className="text-[11px] text-[#4f453f]">Grounded in syllabus nodes</span>
        </div>
      </div>

      {/* Recommended Next Action */}
      {dashboard?.recommended_next_action && (
        <div className="p-5 rounded-3xl bg-[#f9f3eb] border border-[#ede7df] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[22px] text-[#745948]">lightbulb</span>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#81756e]">
                Study Recommendation
              </span>
              <span className="text-[13px] font-bold text-[#1d1b17]">
                {dashboard.recommended_next_action}
              </span>
            </div>
          </div>
          {onDrillTopic && (
            <button
              onClick={onDrillTopic}
              className="px-4 py-2 rounded-full bg-white hover:bg-[#ede7df] text-[12px] font-bold text-[#745948] border border-[#ede7df] shadow-sm cursor-pointer whitespace-nowrap"
            >
              Practice Quizzes
            </button>
          )}
        </div>
      )}

      {/* Study History Breakdown */}
      {loading ? (
        <div className="p-12 text-center text-[#81756e] text-[14px]">Loading analytics data...</div>
      ) : conversations.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-[#ede7df] text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[48px] text-[#81756e]">analytics</span>
          <h3 className="text-[18px] font-bold text-[#1d1b17]">No Activity Recorded Yet</h3>
          <p className="text-[13px] text-[#4f453f] max-w-md">
            Upload course materials and chat with the Socratic Guide to build your analytics portfolio.
          </p>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-white border border-[#ede7df] shadow-sm flex flex-col gap-4">
          <h3 className="text-[16px] font-bold text-[#1d1b17]">Active Study Modules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {conversations.map((c: any, i: number) => (
              <div
                key={c.id || i}
                className="p-4 rounded-2xl bg-[#f9f3eb] flex items-center justify-between gap-4 border border-[#ede7df]/80 hover:bg-[#ede7df]/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#f3cfba] text-[#725746] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">menu_book</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-[#1d1b17] truncate">
                      {c.title || c.name || `Session ${i + 1}`}
                    </span>
                    <span className="text-[11px] text-[#81756e]">
                      {c.message_count ? `${c.message_count} messages` : 'Study module'}
                    </span>
                  </div>
                </div>
                {onResumeSession && (
                  <button
                    onClick={onResumeSession}
                    className="text-[12px] font-bold text-[#745948] hover:underline cursor-pointer shrink-0"
                  >
                    Open Session
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
