import React, { useState, useEffect } from 'react';
import { ScreenType } from '../types';
import { getConversations } from '../services/api';

interface LibraryPageProps {
  onStartInquiry?: () => void;
  onGenerateQuiz?: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  onStartInquiry,
  onGenerateQuiz,
}) => {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    getConversations()
      .then((res: any) => {
        if (Array.isArray(res)) setSources(res);
        else if (res?.conversations && Array.isArray(res.conversations)) setSources(res.conversations);
        else setSources([]);
      })
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredSources = sources.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.source_type === selectedCategory;
    const matchesQuery =
      (item.title || item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="w-full flex flex-col gap-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ede7df]">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-black text-[#1d1b17] tracking-tight">
            Multimodal Sources Vault
          </h1>
          <p className="text-[14px] text-[#4f453f] font-medium pt-1">
            Manage your knowledge documents, slide decks, and audio transcripts.
          </p>
        </div>
        {onStartInquiry && (
          <button
            onClick={onStartInquiry}
            className="px-5 py-2.5 rounded-full bg-[#745948] text-white font-bold text-[13px] shadow-md hover:opacity-95 cursor-pointer flex items-center gap-2 w-fit"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Upload New Source</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full bg-white border border-[#ede7df] text-[13px] text-[#1d1b17] focus:outline-none focus:border-[#745948]"
          />
          <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[18px] text-[#81756e]">
            search
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'pdf', 'slides', 'audio'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#745948] text-white shadow-sm'
                  : 'bg-white text-[#4f453f] border border-[#ede7df] hover:bg-[#f9f3eb]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#81756e] font-semibold text-[14px]">
          Loading sources from live backend...
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-[#ede7df] text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[48px] text-[#81756e]">
            library_books
          </span>
          <h3 className="text-[18px] font-bold text-[#1d1b17]">No sources uploaded yet</h3>
          <p className="text-[13px] text-[#4f453f] max-w-md">
            Upload your course materials to start receiving Socratic guidance.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSources.map((item: any, idx: number) => (
            <div
              key={item.id || idx}
              className="p-5 rounded-2xl bg-white border border-[#ede7df] shadow-sm flex flex-col justify-between gap-4 hover:border-[#745948]/50 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f9f3eb] flex items-center justify-center text-[#745948] shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    description
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <h4 className="text-[15px] font-bold text-[#1d1b17] truncate">
                    {item.title || item.name || 'Untitled Source'}
                  </h4>
                  <span className="text-[11px] text-[#81756e] uppercase tracking-wider font-semibold pt-0.5">
                    {item.source_type || 'Document'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#ede7df]/60 text-[12px]">
                <span className="text-[#81756e]">Active</span>
                {onStartInquiry && (
                  <button
                    onClick={onStartInquiry}
                    className="text-[#745948] font-bold hover:underline cursor-pointer"
                  >
                    Open Workspace
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
