import React, { useState } from 'react';
import { sendChatMessage } from '../services/api';
import { Send, Bot, User, FileText, Presentation, Video, ExternalLink } from 'lucide-react';

export default function TutorPage({ selectedCourse }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      content: "Hello! I am your AI Study Companion. Ask me any question about your uploaded course materials and I will answer with strict source citations.",
      citations: [],
      is_grounded: true,
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedCourse?.id || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(selectedCourse.id, currentInput, conversationId);
      if (res.conversation_id) setConversationId(res.conversation_id);

      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: res.answer,
        citations: res.citations || [],
        is_grounded: res.is_grounded,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: "Sorry, an error occurred while generating a response. Please verify that sources are processed.",
          citations: [],
          is_grounded: false,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderCitationBadge = (cite) => {
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
        key={cite.document_title + label}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700/80 text-[11px] text-slate-300 font-medium hover:border-indigo-500 transition cursor-pointer"
        title={`Excerpt: ${cite.excerpt || 'Source snippet'}`}
      >
        {icon}
        <span>{cite.document_title}</span>
        <span className="text-slate-500">•</span>
        <span className="text-indigo-400 font-semibold">{label}</span>
      </div>
    );
  };

  if (!selectedCourse) {
    return <div className="p-8 text-center text-slate-400">Select a course to chat with the AI Tutor.</div>;
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col max-w-5xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{selectedCourse.title} - AI Tutor</h2>
          <p className="text-xs text-slate-400">RAG Tutor grounded strictly in course sources</p>
        </div>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-indigo-400 border border-indigo-500/20'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-4 rounded-xl space-y-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <div>{msg.content}</div>

              {/* Citations Box */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <span>Verified Course Sources:</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {msg.citations.map((cite) => renderCitationBadge(cite))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
            <Bot className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>Searching course knowledge base & generating answer...</span>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSend} className="pt-3 border-t border-slate-800 flex items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder="Ask a question (e.g. 'What is AVL tree rotation?')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition shadow-md shadow-indigo-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
