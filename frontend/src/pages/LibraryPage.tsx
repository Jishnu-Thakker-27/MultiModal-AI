import React, { useState, useEffect } from 'react';
import { getCourseDocuments, deleteDocument } from '../services/api';

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

  const loadDocuments = () => {
    setLoading(true);
    getCourseDocuments('default_course')
      .then((res: any) => {
        setSources(Array.isArray(res) ? res : []);
      })
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDelete = async (docId: string, title: string) => {
    if (!confirm(`Delete "${title}" from the library?`)) return;
    try {
      await deleteDocument(docId);
      loadDocuments();
    } catch (err: any) {
      alert(`Could not delete document: ${err?.message || 'Error'}`);
    }
  };

  const filteredSources = sources.filter((item) => {
    const itemType = (item.source_type || 'pdf').toLowerCase();
    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'pdf' && itemType.includes('pdf')) ||
      (selectedCategory === 'pptx' && (itemType.includes('ppt') || itemType.includes('slide'))) ||
      (selectedCategory === 'video' && (itemType.includes('video') || itemType.includes('mp4')));

    const matchesQuery = (item.title || item.name || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="w-full flex flex-col gap-6 text-left pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ede7df]">
        <div>
          <h1 className="text-[26px] sm:text-[32px] font-black text-[#1d1b17] tracking-tight">
            Library & Source Materials
          </h1>
          <p className="text-[13px] text-[#4f453f] font-medium pt-1">
            Browse, manage, and inspect all textbooks, lecture slides, and video sources available to your tutor.
          </p>
        </div>
        {onStartInquiry && (
          <button
            onClick={onStartInquiry}
            className="px-5 py-2.5 rounded-full bg-[#745948] hover:bg-[#5a4132] text-white font-bold text-[13px] shadow-md transition-all cursor-pointer flex items-center gap-2 w-fit"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span>Go to Tutor Workspace</span>
          </button>
        )}
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search library materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-[#ede7df] text-[13px] text-[#1d1b17] placeholder:text-[#81756e] focus:outline-none focus:ring-2 focus:ring-[#745948]/30 shadow-sm"
          />
          <span className="material-symbols-outlined absolute left-3.5 top-3 text-[18px] text-[#81756e]">
            search
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'pdf', label: 'PDFs' },
            { id: 'pptx', label: 'Slides / PPT' },
            { id: 'video', label: 'Videos' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-[#745948] text-white shadow-sm'
                  : 'bg-white text-[#4f453f] border border-[#ede7df] hover:bg-[#f9f3eb]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Library Grid */}
      {loading ? (
        <div className="p-12 text-center text-[#81756e] font-semibold text-[14px]">
          Loading library materials from backend...
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-[#ede7df] text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[48px] text-[#81756e]">
            library_books
          </span>
          <h3 className="text-[18px] font-bold text-[#1d1b17]">No source materials found</h3>
          <p className="text-[13px] text-[#4f453f] max-w-md">
            Upload new textbooks, slide decks, or video files from the Tutor Workspace to populate your library.
          </p>
          {onStartInquiry && (
            <button
              onClick={onStartInquiry}
              className="mt-2 px-6 py-2.5 rounded-full bg-[#745948] hover:bg-[#5a4132] text-white font-bold text-[13px] transition-all cursor-pointer"
            >
              Upload Source in Tutor Workspace
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSources.map((item: any, idx: number) => {
            const isPdf = item.title?.toLowerCase().endsWith('.pdf') || item.source_type === 'pdf';
            const isPpt = item.title?.toLowerCase().includes('ppt') || item.source_type === 'pptx';
            const isVideo = item.source_type === 'video' || item.title?.toLowerCase().endsWith('.mp4');

            const icon = isPdf ? 'menu_book' : isPpt ? 'slideshow' : isVideo ? 'smart_display' : 'description';
            const badgeColor = isPdf
              ? 'bg-[#c0ddd0] text-[#052018]'
              : isPpt
              ? 'bg-[#f3cfba] text-[#725746]'
              : isVideo
              ? 'bg-[#cbe3f6] text-[#4f6576]'
              : 'bg-[#ede7df] text-[#4f453f]';

            return (
              <div
                key={item.id || idx}
                className="p-5 rounded-3xl bg-white border border-[#ede7df] shadow-sm flex flex-col justify-between gap-4 hover:border-[#745948]/50 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl ${badgeColor} flex items-center justify-center shrink-0 shadow-xs`}>
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h4 className="text-[14px] font-bold text-[#1d1b17] truncate" title={item.title}>
                        {item.title || item.name || 'Untitled Document'}
                      </h4>
                      <span className="text-[11px] text-[#81756e] uppercase tracking-wider font-semibold pt-0.5">
                        {item.source_type ? item.source_type.toUpperCase() : 'DOCUMENT'} • {item.status || 'Active'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="text-[#81756e] hover:text-[#ba1a1a] p-1 rounded-lg hover:bg-[#ffdad6]/40 transition-colors cursor-pointer"
                    title="Delete source"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#ede7df]/60 text-[12px]">
                  <span className="text-[11px] text-[#81756e]">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Active in Studio'}
                  </span>
                  <div className="flex items-center gap-3">
                    {onGenerateQuiz && (
                      <button
                        onClick={onGenerateQuiz}
                        className="text-[#745948] font-bold hover:underline cursor-pointer"
                      >
                        Quiz
                      </button>
                    )}
                    {onStartInquiry && (
                      <button
                        onClick={onStartInquiry}
                        className="text-[#745948] font-bold hover:underline cursor-pointer"
                      >
                        Study
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
