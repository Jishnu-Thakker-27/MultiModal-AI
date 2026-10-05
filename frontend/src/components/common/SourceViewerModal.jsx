import React, { useRef, useEffect } from 'react';
import { X, Play, FileText, Presentation, Video, ExternalLink, Clock, Sparkles } from 'lucide-react';

function parseTimestamp(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export default function SourceViewerModal({ citation, onClose }) {
  const videoRef = useRef(null);

  if (!citation) return null;

  const seconds = parseTimestamp(citation.start_time);

  useEffect(() => {
    if (citation.source_type === 'video' && videoRef.current && seconds > 0) {
      videoRef.current.currentTime = seconds;
    }
  }, [citation, seconds]);

  const handleJumpToTimestamp = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  const renderBadge = () => {
    if (citation.source_type === 'video') {
      return (
        <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5 text-indigo-400" />
          Timestamp {citation.start_time || '00:00:00'}
        </span>
      );
    }
    if (citation.source_type === 'pptx') {
      return (
        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5">
          <Presentation className="w-3.5 h-3.5 text-amber-400" />
          Slide {citation.slide || 1}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-rose-400" />
        Page {citation.page || 1}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl glass-panel rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{citation.document_title}</span>
              </h3>
              {renderBadge()}
            </div>
            <p className="text-xs text-slate-400 font-medium">Exact Source Citation Inspection</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* VIDEO NATIVE PLAYER */}
          {citation.source_type === 'video' && (
            <div className="space-y-3">
              <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group">
                {citation.file_url ? (
                  <video
                    ref={videoRef}
                    controls
                    src={citation.file_url}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-md">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">Interactive Media Player</p>
                      <p className="text-[11px] text-slate-400">Timestamp Location: <span className="font-semibold text-indigo-400">{citation.start_time}</span></p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20">
                <div className="flex items-center gap-2 text-xs text-indigo-200 font-medium">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Target Segment: {citation.start_time} - {citation.end_time || 'End of Segment'}</span>
                </div>
                <button
                  onClick={handleJumpToTimestamp}
                  className="px-3 py-1.5 btn-glow-primary text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <Play className="w-3.5 h-3.5" />
                  Jump to {citation.start_time}
                </button>
              </div>
            </div>
          )}

          {/* PDF / PPTX DOCUMENT VIEW */}
          {citation.source_type !== 'video' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
                  <span className="font-semibold text-slate-300">Document Location</span>
                  <span className="text-indigo-400 font-bold">
                    {citation.source_type === 'pptx' ? `Slide ${citation.slide}` : `Page ${citation.page}`}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans pt-1">
                  Source text verified at {citation.source_type === 'pptx' ? `Slide #${citation.slide}` : `Page #${citation.page}`} of document file <strong className="text-slate-100">{citation.document_title}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* EXCERPT PREVIEW BOX */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Verified Course Snippet
            </h4>
            <p className="text-xs text-slate-200 leading-relaxed italic bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              "{citation.excerpt || 'Source excerpt matching retrieved course knowledge chunk.'}"
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
