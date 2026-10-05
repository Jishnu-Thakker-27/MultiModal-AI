import React, { useState, useEffect } from 'react';

interface QuizzesPageProps {
  onBackToWorkspace?: () => void;
  onNavigateToSources?: () => void;
}

export const QuizzesPage: React.FC<QuizzesPageProps> = ({
  onBackToWorkspace,
  onNavigateToSources,
}) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <div className="w-full flex flex-col gap-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ede7df]">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-black text-[#1d1b17] tracking-tight">
            Adaptive Quizzes Hub
          </h1>
          <p className="text-[14px] text-[#4f453f] font-medium pt-1">
            Test your conceptual understanding with AI-generated retrieval challenges.
          </p>
        </div>
        {onBackToWorkspace && (
          <button
            onClick={onBackToWorkspace}
            className="px-5 py-2.5 rounded-full bg-[#745948] text-white font-bold text-[13px] shadow-md hover:opacity-95 cursor-pointer flex items-center gap-2 w-fit"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Tutor Workspace</span>
          </button>
        )}
      </div>

      <div className="p-12 rounded-3xl bg-white border border-[#ede7df] text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#f9f3eb] flex items-center justify-center text-[#745948]">
          <span className="material-symbols-outlined text-[36px]">quiz</span>
        </div>
        <h3 className="text-[20px] font-extrabold text-[#1d1b17]">No Quizzes Generated Yet</h3>
        <p className="text-[14px] text-[#4f453f] max-w-md">
          Start a inquiry session in the Tutor Workspace or upload course materials to generate adaptive quizzes tailored to your progress.
        </p>
        {onNavigateToSources && (
          <button
            onClick={onNavigateToSources}
            className="px-6 py-2.5 rounded-full border border-[#745948] text-[#745948] font-bold text-[13px] hover:bg-[#f9f3eb] transition-all cursor-pointer"
          >
            Browse Source Materials
          </button>
        )}
      </div>
    </div>
  );
};
