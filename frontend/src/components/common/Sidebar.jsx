import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Plus, 
  MessageSquare, 
  Search, 
  Trash2, 
  ChevronLeft, 
  TrendingUp, 
  BrainCircuit, 
  FolderKanban, 
  FlaskConical,
  BookOpen,
  Sparkles,
  Layers
} from 'lucide-react';
import { getConversations, deleteConversation } from '../../services/api';

export default function Sidebar({ 
  isOpen, 
  onClose, 
  currentConversation, 
  onSelectConversation, 
  onNewChat,
  refreshTrigger 
}) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
  }, [refreshTrigger]);

  const loadConversations = async () => {
    try {
      const list = await getConversations();
      setConversations(list || []);
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversation?.id === id) {
        onNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation", err);
    }
  };

  // Group conversations by Today, Yesterday, Older
  const groupConversations = (items) => {
    const filtered = items.filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.topic_name && c.topic_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const now = new Date();
    const today = [];
    const yesterday = [];
    const older = [];

    filtered.forEach(c => {
      const date = new Date(c.updated_at || c.created_at);
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        today.push(c);
      } else if (diffDays === 1) {
        yesterday.push(c);
      } else {
        older.push(c);
      }
    });

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupConversations(conversations);

  const renderGroup = (title, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A0AEC0] px-2 block">
          {title}
        </span>
        {items.map((c) => {
          const isSelected = currentConversation?.id === c.id;
          return (
            <div
              key={c.id}
              onClick={() => {
                onSelectConversation(c);
                if (window.innerWidth < 1024) onClose();
              }}
              className={`group relative p-2.5 rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-between gap-2 ${
                isSelected
                  ? 'bg-[#E6F4F1] border border-[#70C1B3]/50 text-[#2D3748] shadow-2xs'
                  : 'hover:bg-[#F0EAE1]/80 text-[#4A5568]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MessageSquare className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#399283]' : 'text-[#718096]'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate leading-snug text-[#2D3748]">
                    {c.title || 'Learning Session'}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-[#718096] font-medium">
                    {c.topic_name && <span className="text-[#399283] truncate">{c.topic_name}</span>}
                    {c.sources_count > 0 && <span>· 📄 {c.sources_count}</span>}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => handleDelete(e, c.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition cursor-pointer text-[#A0AEC0]"
                title="Delete conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 bg-[#FFFDF9] border-r border-[#E2D9CC] p-4 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out ${
          isOpen
            ? 'translate-x-0 w-72 opacity-100'
            : '-translate-x-full lg:-translate-x-full w-0 p-0 overflow-hidden opacity-0 pointer-events-none'
        }`}
      >
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          
          {/* Header & New Chat Button */}
          <div className="space-y-3 shrink-0">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E6F4F1] border border-[#70C1B3]/30 flex items-center justify-center text-[#399283] font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-sm text-[#2D3748]">Study Companion</span>
              </div>

              <button
                onClick={onClose}
                className="lg:hidden text-[#718096] hover:text-[#2D3748] p-1 rounded-lg hover:bg-[#F0EAE1]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* New Chat Primary Action */}
            <button
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 1024) onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#48A999] hover:bg-[#399283] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Learning Session</span>
            </button>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#A0AEC0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#F0EAE1]/70 border border-[#E2D9CC] rounded-xl text-xs text-[#2D3748] placeholder-[#A0AEC0] focus:outline-none focus:border-[#70C1B3]"
              />
            </div>
          </div>

          {/* Date-Grouped History List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {conversations.length === 0 ? (
              <div className="text-center py-6 text-[#A0AEC0] text-xs font-medium">
                No past conversations yet.
              </div>
            ) : (
              <>
                {renderGroup('Today', today)}
                {renderGroup('Yesterday', yesterday)}
                {renderGroup('Previous Sessions', older)}
              </>
            )}
          </div>
        </div>

        {/* Secondary Pages Section */}
        <div className="pt-4 border-t border-[#E2D9CC] space-y-1 shrink-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A0AEC0] px-2 block mb-1">
            Study Modules
          </span>

          <NavLink
            to="/"
            onClick={() => window.innerWidth < 1024 && onClose()}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                isActive ? 'bg-[#E6F4F1] text-[#399283]' : 'text-[#4A5568] hover:bg-[#F0EAE1]'
              }`
            }
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat Home</span>
          </NavLink>

          <NavLink
            to="/practice"
            onClick={() => window.innerWidth < 1024 && onClose()}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                isActive ? 'bg-[#E6F4F1] text-[#399283]' : 'text-[#4A5568] hover:bg-[#F0EAE1]'
              }`
            }
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Adaptive Practice</span>
          </NavLink>

          <NavLink
            to="/progress"
            onClick={() => window.innerWidth < 1024 && onClose()}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                isActive ? 'bg-[#E6F4F1] text-[#399283]' : 'text-[#4A5568] hover:bg-[#F0EAE1]'
              }`
            }
          >
            <TrendingUp className="w-4 h-4" />
            <span>Mastery Progress</span>
          </NavLink>

          <NavLink
            to="/evaluation"
            onClick={() => window.innerWidth < 1024 && onClose()}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                isActive ? 'bg-[#E6F4F1] text-[#399283]' : 'text-[#4A5568] hover:bg-[#F0EAE1]'
              }`
            }
          >
            <FlaskConical className="w-4 h-4" />
            <span>RAG Evaluation</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
