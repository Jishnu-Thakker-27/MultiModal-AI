import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sendChatMessage, getChatHistory } from '../services/api';
import { Send, Bot, User, FileText, Presentation, Video, ExternalLink, RefreshCw } from 'lucide-react';

function TypewriterText({ text, animate = false, speed = 15 }) {
  const [displayedText, setDisplayedText] = useState(animate ? '' : text);
  const [isTyping, setIsTyping] = useState(animate);

  useEffect(() => {
    if (!animate) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, animate, speed]);

  return (
    <span>
      {displayedText}
      {isTyping && <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse rounded-xs" />}
    </span>
  );
}

export default function TutorPage({ selectedCourse }) {
  const location = useLocation();
  const navigate = useNavigate();
  const handledQuestionRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  // Load chat retention history whenever active course changes
  useEffect(() => {
    if (!selectedCourse?.id) return;
    getChatHistory(selectedCourse.id)
      .then((history) => {
        if (history && history.length > 0) {
          setMessages(history.map((m) => ({ ...m, isNew: false })));
        } else {
          setMessages([
            {
              id: 'welcome',
              sender: 'assistant',
              content: "Hello! I am your AI Study Companion. Ask me any question about your uploaded course materials and I will answer with strict source citations.",
              citations: [],
              is_grounded: true,
              isNew: false,
            }
          ]);
        }
      })
      .catch((err) => console.error(err));
  }, [selectedCourse?.id]);

  const executeQuestion = async (queryText) => {
    if (!queryText || !selectedCourse?.id || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      content: queryText,
      isNew: false,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await sendChatMessage(selectedCourse.id, queryText, conversationId);
      if (res.conversation_id) setConversationId(res.conversation_id);

      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: res.answer,
        citations: res.citations || [],
        is_grounded: res.is_grounded,
        isNew: true, // Trigger typing animation for newly generated answer
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
          isNew: false,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initQ = location.state?.initialQuestion;
    if (initQ && selectedCourse?.id && handledQuestionRef.current !== initQ) {
      handledQuestionRef.current = initQ;
      // Clear location state immediately to avoid re-triggering
      navigate('/tutor', { replace: true, state: {} });
      executeQuestion(initQ);
    }
  }, [location.state, selectedCourse?.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const q = input;
    setInput('');
    executeQuestion(q);
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
    <div className="h-[calc(100vh-4rem)] flex flex-col max-w-5xl mx-auto p-4 sm:p-6 pb-6">
      {/* Header */}
      <div className="p-4 glass-panel rounded-2xl border border-indigo-500/20 flex items-center justify-between shrink-0 mb-4 shadow-xl">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>{selectedCourse.title}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
              AI Tutor Active
            </span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">RAG Tutor grounded strictly in course sources</p>
        </div>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2 glass-panel rounded-2xl p-4 border border-slate-800/80 mb-4 shadow-xl">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-md ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                  : 'bg-slate-900 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-4 rounded-2xl space-y-3 text-xs leading-relaxed shadow-md ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-xs font-medium'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-xs'
              }`}
            >
              <div>
                {msg.sender === 'assistant' ? (
                  <TypewriterText text={msg.content} animate={msg.isNew} />
                ) : (
                  msg.content
                )}
              </div>

              {/* Citations Box */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Verified Course Sources:
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
          <div className="flex items-center gap-2.5 text-xs text-indigo-300 py-2.5 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 max-w-fit animate-pulse">
            <Bot className="w-4 h-4 text-indigo-400 animate-spin" />
            <span className="font-medium">Searching course knowledge base & generating answer...</span>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSend} className="flex items-center gap-3 shrink-0">
        <input
          type="text"
          placeholder="Ask a question (e.g. 'What is AVL tree rotation?')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition shadow-inner"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3.5 btn-glow-primary disabled:opacity-40 text-white rounded-xl transition shadow-lg cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
