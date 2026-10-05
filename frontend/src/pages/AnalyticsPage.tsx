import React, { useState, useEffect } from 'react';
import { getConversations } from '../services/api';

interface AnalyticsPageProps {
  onResumeSession?: () => void;
  onDrillTopic?: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  onResumeSession,
  onDrillTopic,
}) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getConversations()
      .then((res: any) => {
        if (Array.isArray(res)) setConversations(res);
        else if (res?.conversations && Array.isArray(res.conversations)) setConversations(res.conversations);
        else setConversations([]);
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full flex flex-col gap-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ede7df]">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-black text-[#1d1b17] tracking-tight">
            Learning Analytics & Retention
          </h1>
          <p className="text-[14px] text-[#4f453f] font-medium pt-1">
            Track your cognitive mastery and retrieval consistency across active subjects.
          </p>
        </div>
        {onResumeSession && (
          <button
            onClick={onResumeSession}
            className="px-5 py-2.5 rounded-full bg-[#745948] text-white font-bold text-[13px] shadow-md hover:opacity-95 cursor-pointer flex items-center gap-2 w-fit"
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            <span>Resume Inquiry Session</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#ede7df] shadow-sm flex flex-col gap-1">
          <span className="text-[12px] font-bold text-[#81756e] uppercase tracking-wider">
            Active Study Vaults
          </span>
          <span className="text-[28px] font-black text-[#1d1b17]">{conversations.length}</span>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#ede7df] shadow-sm flex flex-col gap-1">
          <span className="text-[12px] font-bold text-[#81756e] uppercase tracking-wider">
            Conceptual Mastery Score
          </span>
          <span className="text-[28px] font-black text-[#745948]">84%</span>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#ede7df] shadow-sm flex flex-col gap-1">
          <span className="text-[12px] font-bold text-[#81756e] uppercase tracking-wider">
            Active Retrieval Streak
          </span>
          <span className="text-[28px] font-black text-[#2e5339]">4 Days</span>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-[#81756e] text-[14px]">Loading analytics...</div>
      ) : conversations.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-[#ede7df] text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[48px] text-[#81756e]">
            analytics
          </span>
          <h3 className="text-[18px] font-bold text-[#1d1b17]">No Activity Data Recorded</h3>
          <p className="text-[13px] text-[#4f453f] max-w-md">
            Interact with the Socratic Guide to build your cognitive mastery portfolio.
          </p>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-white border border-[#ede7df] flex flex-col gap-4">
          <h3 className="text-[16px] font-bold text-[#1d1b17]">Recent Inquiry Sessions</h3>
          <div className="flex flex-col gap-3">
            {conversations.map((c: any, i: number) => (
              <div
                key={c.id || i}
                className="p-4 rounded-xl bg-[#f9f3eb] flex items-center justify-between gap-4 border border-[#ede7df]/80"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-[#745948]">
                    psychology
                  </span>
                  <span className="text-[14px] font-bold text-[#1d1b17]">
                    {c.title || c.name || `Session ${i + 1}`}
                  </span>
                </div>
                {onResumeSession && (
                  <button
                    onClick={onResumeSession}
                    className="text-[12px] font-bold text-[#745948] hover:underline"
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
