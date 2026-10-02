import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendChatMessage } from '../../services/api';
import { Send, Bot, User, FileText, Presentation, Video, Sparkles } from 'lucide-react';

import SourceViewerModal from '../common/SourceViewerModal';

export default function ChatbotWidget({ selectedCourse, height = "h-96" }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      content: "Hello! Ask me any question about your course materials. I answer using strict source grounding and exact citations.",
      citations: [],
      is_grounded: true,
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [selectedCitation, setSelectedCitation] = useState(null);

  useEffect(() => {
    setConversationId(null);
  }, [selectedCourse?.id]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const currentInput = input;
    setInput('');

    // Transfer message directly to the Learn/Tutor section page
    navigate('/tutor', { state: { initialQuestion: currentInput } });
  };

  const renderCitationBadge = (cite, idx) => {
    let icon = <FileText className="w-3 h-3 text-rose-400" />;
    let label = `Page ${cite.page}`;

    if (cite.source_type === 'pptx') {
      icon = <Presentation className="w-3 h-3 text-amber-400" />;
      label = `Slide ${cite.slide}`;
    } else if (cite.source_type === 'video') {
      icon = <Video className="w-3 h-3 text-indigo-400" />;
      label = `${cite.start_time}`;
    }

    return (
      <div
        key={cite.document_title + label + idx}
        onClick={() => setSelectedCitation(cite)}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-700/80 text-[10px] text-slate-300 font-medium hover:border-indigo-500 hover:scale-105 transition cursor-pointer shadow-xs"
        title={`Click to open viewer & jump to source snippet`}
      >
        {icon}
        <span className="truncate max-w-[120px]">{cite.document_title}</span>
        <span className="text-slate-500">•</span>
        <span className="text-indigo-400 font-semibold">{label}</span>
      </div>
    );
  };

  return (
    <div className={`p-5 glass-panel rounded-2xl border border-indigo-500/20 flex flex-col justify-between ${height} shadow-xl relative overflow-hidden`}>
      {/* Background glow decoration */}
      <div className="absolute top-0 right-1/4 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Widget Header */}
      <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 tracking-wide">AI Tutor Chatbot</h3>
            <p className="text-[10px] text-slate-400 font-medium">Source-grounded RAG assistant</p>
          </div>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold shadow-xs">
          {selectedCourse?.title || "Active Course"}
        </span>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1.5 text-xs relative z-10">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 max-w-full ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                  : 'bg-slate-900 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`p-3.5 rounded-2xl space-y-2.5 leading-relaxed text-xs max-w-[85%] shadow-md ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-xs font-medium'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-xs'
              }`}
            >
              <div>{msg.content}</div>

              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified Citations:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((cite, idx) => renderCitationBadge(cite, idx))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 text-xs text-indigo-300 py-2 px-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 max-w-fit animate-pulse">
            <Bot className="w-4 h-4 text-indigo-400 animate-spin" />
            <span className="font-medium">Searching course material & generating response...</span>
          </div>
        )}
      </div>

      {/* Chat Input Form */}
      <form onSubmit={handleSend} className="pt-3 border-t border-slate-800/80 flex items-center gap-2 shrink-0 relative z-10">
        <input
          type="text"
          placeholder="Ask a question (e.g. 'What is AVL tree rotation?')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 btn-glow-primary disabled:opacity-40 text-white rounded-xl transition cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Source Viewer & Video Timestamp Jump Modal */}
      {selectedCitation && (
        <SourceViewerModal
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </div>
  );
}
