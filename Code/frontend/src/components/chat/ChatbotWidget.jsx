import React, { useState, useEffect } from 'react';
import { sendChatMessage } from '../../services/api';
import { Send, Bot, User, FileText, Presentation, Video, Sparkles } from 'lucide-react';

export default function ChatbotWidget({ selectedCourse, height = "h-96" }) {
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

  useEffect(() => {
    setConversationId(null);
  }, [selectedCourse?.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (!selectedCourse?.id) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          content: "Please select or create a course first before asking questions.",
          citations: [],
          is_grounded: false,
        }
      ]);
      return;
    }

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
          content: "Sorry, an error occurred while processing your question. Ensure documents are uploaded and processed for this course.",
          citations: [],
          is_grounded: false,
        }
      ]);
    } finally {
      setLoading(false);
    }
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
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-700/80 text-[10px] text-slate-300 font-medium"
        title={`Excerpt: ${cite.excerpt || 'Source snippet'}`}
      >
        {icon}
        <span className="truncate max-w-[120px]">{cite.document_title}</span>
        <span className="text-slate-500">•</span>
        <span className="text-indigo-400 font-semibold">{label}</span>
      </div>
    );
  };

  return (
    <div className={`p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between ${height}`}>
      {/* Widget Header */}
      <div className="pb-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100">AI Tutor Chatbot</h3>
            <p className="text-[10px] text-slate-400">Source-grounded RAG assistant</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
          {selectedCourse?.title || "Active Course"}
        </span>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 max-w-full ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-indigo-400 border border-indigo-500/20'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`p-3 rounded-lg space-y-2 leading-relaxed text-xs max-w-[85%] ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <div>{msg.content}</div>

              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
                  <p className="text-[10px] font-semibold text-slate-400">Verified Citations:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((cite, idx) => renderCitationBadge(cite, idx))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
            <Bot className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            <span>Searching course material & generating response...</span>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSend} className="pt-2 border-t border-slate-800 flex items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder="Ask a question (e.g. 'What is AVL tree rotation?')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
