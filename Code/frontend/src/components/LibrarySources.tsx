import React, { useState } from 'react';
import { SourceDocument } from '../types';
import { librarySources } from '../data/mockData';

interface LibrarySourcesProps {
  onStartInquiry?: (sourceId: string) => void;
  onGenerateQuiz?: (sourceId: string) => void;
}

export const LibrarySources: React.FC<LibrarySourcesProps> = ({
  onStartInquiry,
  onGenerateQuiz,
}) => {
  const [sources, setSources] = useState<SourceDocument[]>(librarySources);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [sourceType, setSourceType] = useState<'pdf' | 'pptx' | 'youtube' | 'audio'>('pdf');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Computer Science');

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newSource: SourceDocument = {
      id: `s-${Date.now()}`,
      title: newTitle,
      type: sourceType,
      category: newCategory,
      dateAdded: 'Just now',
      fileSizeOrDuration: sourceType === 'youtube' ? 'Video Sync • 45m' : 'Uploaded • 6.4 MB',
      status: 'Ready',
      conceptsExtracted: ['Dynamic Induction', 'Feature Mapping', 'Socratic Vectors'],
    };

    setSources([newSource, ...sources]);
    setNewTitle('');
    setShowAttachModal(false);
  };

  return (
    <div className="w-full pb-16">
      {/* Header */}
      <section className="w-full mb-8">
        <div className="w-full p-6 sm:p-8 rounded-[2rem] bg-white  shadow-[0_20px_40px_-10px_rgba(195,180,170,0.3),inset_0_2px_4px_rgba(255,255,255,0.95)] border border-[#ede7df]/80  flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#c0ddd0]  text-[#052018]  text-[12px] font-bold">
                <span className="material-symbols-outlined text-[15px] align-middle mr-1">verified</span>
                Multimodal Source Repository
              </span>
              <span className="px-3 py-1 rounded-full bg-[#f3cfba] text-[#725746] text-[12px] font-bold">
                {sources.length} Verified Sources Active
              </span>
            </div>

            <button
              onClick={() => setShowAttachModal(true)}
              className="px-5 py-2.5 rounded-full bg-[#745948] hover:bg-[#5a4132] text-white font-bold text-[13px] shadow-[0_6px_16px_rgba(116,89,72,0.35)] flex items-center gap-2 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Attach New Study Source</span>
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#1d1b17]  tracking-tight">
              Multimodal Knowledge Vault
            </h1>
            <p className="text-[14px] text-[#4f453f]  max-w-4xl leading-relaxed">
              Every Socratic inquiry and adaptive quiz is tethered to exact page citations and video timestamps from these materials. Upload slides, research papers, or lecture transcripts to expand your pedagogical model.
            </p>
          </div>
        </div>
      </section>

      {/* Sources Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sources.map((src) => (
          <div
            key={src.id}
            className="p-6 rounded-[2rem] bg-white  shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80  flex flex-col justify-between gap-5 group hover:border-[#f3cfba] transition-all"
          >
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
                      src.type === 'youtube'
                        ? 'bg-[#ffdad6] text-[#ba1a1a]'
                        : src.type === 'pptx'
                        ? 'bg-[#f3cfba] text-[#725746]'
                        : 'bg-[#cbe3f6] text-[#4f6576]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {src.type === 'youtube' ? 'smart_display' : src.type === 'pptx' ? 'slideshow' : 'picture_as_pdf'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider">
                      {src.category}
                    </span>
                    <span className="text-[11px] text-[#81756e]">{src.dateAdded}</span>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-[#c0ddd0] text-[#052018] text-[11px] font-bold">
                  {src.status}
                </span>
              </div>

              <h3 className="text-[17px] font-bold text-[#1d1b17]  leading-snug">
                {src.title}
              </h3>

              <div className="text-[12px] text-[#81756e] flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px]">info</span>
                <span>{src.fileSizeOrDuration}</span>
              </div>

              {/* Concepts Extracted */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#81756e]">
                  Indexed Socratic Concepts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {src.conceptsExtracted.map((concept, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-xl bg-[#f9f3eb]  text-[#4f453f]  text-[11px] font-medium"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[#ede7df] ">
              <button
                onClick={() => onStartInquiry?.(src.id)}
                className="flex-1 py-2 px-3 rounded-full bg-[#ede7df] hover:bg-[#e2c0ab] text-[12px] font-bold text-[#1d1b17] flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                <span>Start Inquiry</span>
              </button>
              <button
                onClick={() => onGenerateQuiz?.(src.id)}
                className="flex-1 py-2 px-3 rounded-full bg-[#f3cfba] hover:bg-[#fadfd0] text-[12px] font-bold text-[#725746] flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">quiz</span>
                <span>Adaptive Quiz</span>
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Attach New Material Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white  p-6 sm:p-8 shadow-2xl flex flex-col gap-5 border border-[#ede7df]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-bold text-[#1d1b17]  flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#745948]">upload_file</span>
                Attach New Learning Material
              </span>
              <button
                onClick={() => setShowAttachModal(false)}
                className="w-8 h-8 rounded-full bg-[#f9f3eb]  flex items-center justify-center text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSource} className="flex flex-col gap-4">
              {/* Type selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#4f453f] ">
                  Source Format
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'pdf', label: 'PDF Document', icon: 'picture_as_pdf' },
                    { id: 'pptx', label: 'Slide Deck', icon: 'slideshow' },
                    { id: 'youtube', label: 'YouTube URL', icon: 'smart_display' },
                    { id: 'audio', label: 'Audio Memo', icon: 'mic' },
                  ].map((fmt) => (
                    <button
                      type="button"
                      key={fmt.id}
                      onClick={() => setSourceType(fmt.id as any)}
                      className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer transition-all ${
                        sourceType === fmt.id
                          ? 'bg-[#f3cfba] text-[#725746] shadow-sm'
                          : 'bg-[#f9f3eb]  text-[#81756e]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{fmt.icon}</span>
                      <span>{fmt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title / Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#4f453f] ">
                  Source Title or URL
                </label>
                <input
                  type="text"
                  placeholder={
                    sourceType === 'youtube'
                      ? 'https://youtube.com/watch?v=...'
                      : 'e.g. Statistical_Mechanics_Lecture_03.pdf'
                  }
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#ede7df]/60  text-[13px] text-[#1d1b17]  focus:outline-none focus:ring-2 focus:ring-[#745948]/30"
                  required
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#4f453f] ">
                  Domain / Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#ede7df]/60  text-[13px] text-[#1d1b17]  focus:outline-none cursor-pointer"
                >
                  <option value="Computer Science / ML">Computer Science / ML</option>
                  <option value="Mathematics & Calculus">Mathematics & Calculus</option>
                  <option value="Quantum Physics">Quantum Physics</option>
                  <option value="Cognitive Neuroscience">Cognitive Neuroscience</option>
                  <option value="Art & Design Theory">Art & Design Theory</option>
                </select>
              </div>

              {/* Drag and Drop Zone */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-[#ede7df]  flex flex-col items-center justify-center text-center gap-2 bg-[#f9f3eb]/40">
                <span className="material-symbols-outlined text-[28px] text-[#745948]">cloud_upload</span>
                <span className="text-[12px] font-bold text-[#1d1b17] ">
                  Drag & Drop slide deck, research PDF, or lecture transcript
                </span>
                <span className="text-[11px] text-[#81756e]">
                  Automatic OCR, formula parsing, and Socratic node graph indexing
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAttachModal(false)}
                  className="px-4 py-2 rounded-full text-[13px] font-semibold text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#745948] text-white text-[13px] font-bold shadow-md cursor-pointer hover:bg-[#5a4132]"
                >
                  Add & Index Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
