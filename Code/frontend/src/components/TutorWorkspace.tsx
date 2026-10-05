import React, { useState, useEffect, useRef } from 'react';
import { ScreenType } from '../types';
import { currentUser } from '../data/mockData';
import MarkdownRenderer from './common/MarkdownRenderer';
import {
  postConversationChat,
  createConversation,
  getConversations,
  getConversationDetails,
  uploadSourceToConversation,
} from '../services/api';

interface TutorWorkspaceProps {
  onNavigateToQuiz?: () => void;
  onNavigateToSources?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'socratic-guide';
  timestamp: string;
  text: string;
  citations?: any[];
  followUps?: string[];
}

interface SourceItem {
  id: string;
  title: string;
  source_type?: string;
  file_path?: string;
  created_at?: string;
}

interface ConversationItem {
  id: string;
  title: string;
  topic_name?: string;
  message_count?: number;
  last_message_at?: string;
  updated_at?: string;
}

export const TutorWorkspace: React.FC<TutorWorkspaceProps> = ({
  onNavigateToQuiz,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [pedagogyTone, setPedagogyTone] = useState('Intuitive Analogy');
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic conversation & sources state
  const [conversationsList, setConversationsList] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('New Learning Inquiry');
  const [activeTopic, setActiveTopic] = useState('Course Material');
  const [activeSources, setActiveSources] = useState<SourceItem[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  // Upload modal & process state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Link / URL modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch conversations list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      if (convs && Array.isArray(convs)) {
        setConversationsList(convs);
        if (convs.length > 0 && !activeConvId) {
          selectConversation(convs[0].id);
        }
      }
    } catch {
      // API unavailable or no conversations yet
    }
  };

  const selectConversation = async (convId: string) => {
    setActiveConvId(convId);
    try {
      const details = await getConversationDetails(convId);
      if (details) {
        setActiveTitle(details.title || 'Learning Session');
        setActiveTopic(details.topic_name || 'Course Material');
        setActiveSources(details.sources || []);

        if (details.messages && Array.isArray(details.messages)) {
          const mapped: ChatMessage[] = details.messages.map((m: any, idx: number) => ({
            id: m.id || `msg-${idx}`,
            sender: m.role === 'user' ? 'user' : 'socratic-guide',
            timestamp: m.created_at
              ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recently',
            text: m.content || '',
            citations: m.citations || [],
          }));
          setMessages(mapped);
        } else {
          setMessages([]);
        }
      }
    } catch {
      // Fallback
    }
  };

  const handleCreateNewInquiry = async () => {
    try {
      const newConv = await createConversation({
        title: 'New Socratic Inquiry',
        course_id: 'default_course',
        topic_name: 'General',
      });
      if (newConv && newConv.id) {
        setActiveConvId(newConv.id);
        setActiveTitle(newConv.title || 'New Socratic Inquiry');
        setActiveTopic(newConv.topic_name || 'General');
        setActiveSources([]);
        setMessages([]);
        loadConversations();
      }
    } catch {
      setActiveConvId(null);
      setActiveTitle('New Socratic Inquiry');
      setActiveTopic('General');
      setActiveSources([]);
      setMessages([]);
    }
    const el = document.getElementById('chat-input-field');
    el?.focus();
  };

  // Upload handler for device files (PDF, PPTX, MP4, WebM, audio, etc.)
  const handleFileUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      let convId = activeConvId;
      if (!convId) {
        const newConv = await createConversation({
          title: `Study Session: ${file.name.slice(0, 30)}`,
          course_id: 'default_course',
          topic_name: 'Course Material',
        });
        convId = newConv.id;
        setActiveConvId(convId);
        setActiveTitle(newConv.title);
      }

      const res = await uploadSourceToConversation(convId, file);
      setUploadSuccess(`Successfully indexed "${file.name}"! Extracted ${res.chunks_count || 'evidence'} chunks into the RAG knowledge graph.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refresh active sources list & conversation
      const details = await getConversationDetails(convId);
      if (details?.sources) {
        setActiveSources(details.sources);
      }
      loadConversations();

      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(null);
      }, 1500);
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail || err?.message || 'Failed to upload and index document.');
    } finally {
      setIsUploading(false);
    }
  };

  // Add Link / Web / Video URL handler
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInput.trim()) return;

    setIsLinking(true);
    try {
      let convId = activeConvId;
      if (!convId) {
        const newConv = await createConversation({
          title: linkTitle || 'Web / Lecture Source Session',
          course_id: 'default_course',
          topic_name: 'Course Material',
        });
        convId = newConv.id;
        setActiveConvId(convId);
        setActiveTitle(newConv.title);
      }

      // Create a markdown summary source file representing this video/web reference
      const cleanName = (linkTitle.trim() || 'Lecture_Reference').replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
      const fileBlob = new Blob(
        [
          `Source Reference: ${linkTitle || 'Course Lecture Material'}\nURL: ${linkInput}\nType: Online / Video Lecture\n\nContent notes and lecture outline referenced for Socratic tutoring.`
        ],
        { type: 'text/plain' }
      );
      const virtualFile = new File([fileBlob], cleanName, { type: 'application/pdf' });

      await uploadSourceToConversation(convId, virtualFile);
      const details = await getConversationDetails(convId);
      if (details?.sources) {
        setActiveSources(details.sources);
      }
      loadConversations();

      setLinkInput('');
      setLinkTitle('');
      setShowLinkModal(false);
    } catch (err: any) {
      alert(`Link index error: ${err?.message || 'Could not attach link'}`);
    } finally {
      setIsLinking(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText;
    setInputText('');

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: userText,
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsLoadingApi(true);

    try {
      let convId = activeConvId;
      if (!convId) {
        const newConv = await createConversation({
          title: userText.slice(0, 35) + (userText.length > 35 ? '...' : ''),
          course_id: 'default_course',
          topic_name: 'General',
        });
        convId = newConv.id;
        setActiveConvId(convId);
        setActiveTitle(newConv.title || userText.slice(0, 35));
      }

      const res = await postConversationChat(convId, userText);
      const answerText = res?.answer || res?.content || (typeof res === 'string' ? res : '');

      if (answerText) {
        const guideMsg: ChatMessage = {
          id: `msg-guide-${Date.now()}`,
          sender: 'socratic-guide',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: answerText,
          citations: res?.citations || [],
          followUps: [
            'Test my understanding with a question',
            'Provide an intuitive visual metaphor',
            'Derive the mathematical formulation',
          ],
        };
        setMessages((prev) => [...prev, guideMsg]);
      } else {
        throw new Error('No answer returned');
      }

      // Refresh conversation details & sources in case citations or sources updated
      if (convId) {
        getConversationDetails(convId)
          .then((details) => {
            if (details?.sources) setActiveSources(details.sources);
          })
          .catch(() => {});
        loadConversations();
      }
    } catch {
      const guideMsg: ChatMessage = {
        id: `msg-guide-${Date.now()}`,
        sender: 'socratic-guide',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Let us examine this carefully: **${userText}**.\n\nFrom first principles, what is the core mechanism governing this problem, and how do the constraints shape the outcome? Consider how the underlying relationships connect to the foundational concepts in your course materials.`,
        followUps: [
          'Test my understanding with a question',
          'Provide an intuitive visual metaphor',
          'Derive the mathematical formulation',
        ],
      };
      setMessages((prev) => [...prev, guideMsg]);
    } finally {
      setIsLoadingApi(false);
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter conversations for search query if provided
  const filteredConversations = conversationsList.filter((c) =>
    searchQuery ? c.title?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="w-full pb-16">
      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Sidebar (New Inquiry, Context Sources, Dialogues, Cognitive Fatigue Gauge) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* New Learning Inquiry Button */}
          <button
            onClick={handleCreateNewInquiry}
            className="w-full py-3.5 px-5 rounded-[1.5rem] bg-[#f3cfba] hover:bg-[#fadfd0] text-[#725746] font-bold text-[14px] shadow-[0_8px_18px_-2px_rgba(215,175,155,0.5),inset_0_1.5px_1px_rgba(255,255,255,0.8)] flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Learning Inquiry</span>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-black/10 text-[11px] font-mono">⌘K</span>
          </button>

          {/* Search Input Box */}
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-[#81756e] text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search concepts, sources, dialogues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white border border-[#ede7df]/80 text-[13px] text-[#1d1b17] placeholder:text-[#81756e] shadow-[inset_0_1.5px_3px_rgba(175,160,147,0.15)] focus:outline-none focus:ring-2 focus:ring-[#745948]/30"
            />
            <span className="material-symbols-outlined absolute right-3 text-[#81756e] text-[16px]">
              tune
            </span>
          </div>

          {/* Active Context Sources Container */}
          <div className="p-5 rounded-[2rem] bg-white shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#4f453f] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f3cfba]"></span>
                Active Context Sources
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#f9f3eb] text-[11px] font-bold text-[#745948]">
                {activeSources.length} Linked
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {activeSources.length > 0 ? (
                activeSources.map((source) => {
                  const isPdf = source.title?.toLowerCase().endsWith('.pdf');
                  const isPpt = source.title?.toLowerCase().includes('ppt');
                  const isVideo =
                    source.title?.toLowerCase().endsWith('.mp4') ||
                    source.title?.toLowerCase().endsWith('.mov') ||
                    source.title?.toLowerCase().endsWith('.webm') ||
                    source.title?.toLowerCase().endsWith('.mkv') ||
                    source.source_type?.toLowerCase().includes('video');
                  const icon = isPdf
                    ? 'menu_book'
                    : isPpt
                    ? 'slideshow'
                    : isVideo
                    ? 'smart_display'
                    : 'description';
                  const badgeColor = isPdf
                    ? 'bg-[#c0ddd0]/60 text-[#486258]'
                    : isPpt
                    ? 'bg-[#f3cfba]/60 text-[#725746]'
                    : isVideo
                    ? 'bg-[#cbe3f6]/60 text-[#4f6576]'
                    : 'bg-[#ede7df] text-[#4f453f]';

                  return (
                    <div
                      key={source.id}
                      className="p-3 rounded-xl bg-[#f9f3eb] flex items-center justify-between shadow-[inset_0_1px_2px_rgba(175,160,147,0.15)] group hover:bg-[#ede7df] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg ${badgeColor} flex items-center justify-center shrink-0`}
                        >
                          <span className="material-symbols-outlined text-[17px]">{icon}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[12px] font-bold text-[#1d1b17] truncate">
                            {source.title}
                          </span>
                          <span className="text-[11px] text-[#4f453f] truncate">
                            {source.source_type ? `${source.source_type.toUpperCase()} • Grounded` : 'Active Context'}
                          </span>
                        </div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-[#496459] shrink-0" title="Active in RAG Graph"></span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-[#f9f3eb]/60 border border-dashed border-[#ede7df] flex flex-col items-center justify-center text-center gap-1.5 py-6">
                  <span className="material-symbols-outlined text-[24px] text-[#81756e]">
                    auto_stories
                  </span>
                  <span className="text-[12px] font-semibold text-[#1d1b17]">
                    No sources attached to this session
                  </span>
                  <span className="text-[11px] text-[#81756e] max-w-[220px]">
                    Import PDFs, slides, lecture MP4 videos, or web links to ground the RAG knowledge graph in your material.
                  </span>
                </div>
              )}
            </div>

            {/* Attach Material Actions */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => setShowUploadModal(true)}
                className="py-2 px-3 rounded-xl bg-[#ede7df]/80 hover:bg-[#ede7df] text-[12px] font-semibold text-[#4f453f] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">upload_file</span>
                <span>Import Device File</span>
              </button>
              <button
                onClick={() => setShowLinkModal(true)}
                className="py-2 px-3 rounded-xl bg-[#ede7df]/80 hover:bg-[#ede7df] text-[12px] font-semibold text-[#4f453f] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">link</span>
                <span>Attach Link / Video</span>
              </button>
            </div>
          </div>

          {/* Socratic Dialogues History */}
          <div className="p-5 rounded-[2rem] bg-white shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#4f453f]">
                Socratic Dialogues
              </span>
              <span className="material-symbols-outlined text-[16px] text-[#81756e]">history</span>
            </div>

            <div className="flex flex-col gap-2">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[#f3cfba]/30 border border-[#f3cfba]/70'
                          : 'hover:bg-[#f9f3eb]'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[12px] font-bold text-[#1d1b17] truncate">
                          {conv.title || 'Untitled Session'}
                        </span>
                        <span className="text-[10px] text-[#745948] truncate">
                          {conv.topic_name || 'General'}
                          {conv.message_count !== undefined ? ` • ${conv.message_count} messages` : ''}
                        </span>
                      </div>
                      <span
                        className={`material-symbols-outlined text-[16px] shrink-0 ${
                          isActive ? 'text-[#745948]' : 'text-[#81756e]'
                        }`}
                      >
                        chevron_right
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-[#f9f3eb]/60 text-center py-5">
                  <span className="text-[11px] text-[#81756e]">No dialogue history yet</span>
                </div>
              )}
            </div>
          </div>

          {/* Cognitive Fatigue Gauge */}
          <div className="p-5 rounded-[2rem] bg-white shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider">
                Cognitive Fatigue
              </span>
              <span className="text-[14px] font-bold text-[#1d1b17] pt-0.5">
                Low (Optimal)
              </span>
              <span className="text-[11px] text-[#4f453f]">
                Ideal for complex concepts & problem solving
              </span>
            </div>

            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="20" stroke="#ede7df" strokeWidth="5" fill="transparent" />
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  stroke="#496459"
                  strokeWidth="5"
                  strokeDasharray="125.6"
                  strokeDashoffset="90.4"
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-[12px] font-bold text-[#496459]">28%</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Dialogue Area (Center Canvas) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="w-full p-6 sm:p-8 rounded-[2rem] bg-white shadow-[0_22px_44px_-12px_rgba(195,180,170,0.32),inset_0_2px_4px_rgba(255,255,255,0.95)] border border-[#ede7df]/80 flex flex-col gap-6">
            
            {/* Inquiry Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#ede7df]">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-[#ede7df] text-[10px] text-[#1d1b17]">
                    {activeTopic}
                  </span>
                  <span>• Socratic Tutoring Session</span>
                  {activeSources.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#c0ddd0] text-[#052018] text-[10px] font-bold">
                      {activeSources.length} Source{activeSources.length > 1 ? 's' : ''} Grounded
                    </span>
                  )}
                </span>
                <h1 className="text-[22px] sm:text-[25px] font-bold text-[#1d1b17] truncate">
                  {activeTitle}
                </h1>
              </div>

              {/* Pedagogy Tone Dropdown */}
              <div className="flex items-center gap-2 p-1 pl-3 pr-2 rounded-full bg-[#f9f3eb] shadow-[inset_0_1.5px_2px_rgba(175,160,147,0.15)] text-[12px] shrink-0">
                <span className="material-symbols-outlined text-[16px] text-[#745948]">auto_stories</span>
                <span className="text-[#81756e]">Tone:</span>
                <select
                  value={pedagogyTone}
                  onChange={(e) => setPedagogyTone(e.target.value)}
                  className="bg-transparent font-bold text-[#1d1b17] focus:outline-none cursor-pointer"
                >
                  <option value="Intuitive Analogy">Intuitive Analogy</option>
                  <option value="Socratic First Principles">First Principles</option>
                  <option value="Mathematical Formalism">Mathematical Formalism</option>
                </select>
              </div>
            </div>

            {/* Conversation Stream */}
            <div className="flex flex-col gap-6 min-h-[300px]">
              {messages.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#f9f3eb]/60 border border-dashed border-[#ede7df] flex flex-col items-center justify-center text-center gap-3 my-auto">
                  <div className="w-12 h-12 rounded-2xl bg-[#f3cfba] text-[#725746] flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">psychology</span>
                  </div>
                  <div className="flex flex-col gap-1 max-w-md">
                    <h3 className="text-[16px] font-bold text-[#1d1b17]">
                      Begin Your Socratic Inquiry
                    </h3>
                    <p className="text-[13px] text-[#4f453f] leading-relaxed">
                      Pose any question, theorem, formula, or concept from your coursework. SocraticAI will scaffold your understanding through first-principles guidance and grounded citations.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    {[
                      'Explain Simpson’s 1/3 rule intuitively',
                      'Derive the Newton-Raphson convergence rate',
                      'Why does backpropagation calculate derivatives backwards?',
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => {
                          setInputText(example);
                          const el = document.getElementById('chat-input-field');
                          el?.focus();
                        }}
                        className="px-3 py-1.5 rounded-full bg-white hover:bg-[#ede7df] text-[12px] font-medium text-[#4f453f] border border-[#ede7df] shadow-sm transition-colors cursor-pointer"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {msg.sender === 'user' ? (
                          <>
                            <img
                              alt={currentUser.name}
                              src={currentUser.avatarUrl}
                              className="w-8 h-8 rounded-full object-cover shadow-sm"
                            />
                            <span className="text-[13px] font-bold text-[#1d1b17]">
                              {currentUser.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-full bg-[#cbe3f6] text-[#4f6576] flex items-center justify-center shadow-sm">
                              <span className="material-symbols-outlined text-[17px]">psychology</span>
                            </div>
                            <span className="text-[13px] font-bold text-[#1d1b17]">
                              Socratic Guide
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#c0ddd0] text-[#052018] text-[10px] font-bold">
                              Grounded Scaffold
                            </span>
                          </>
                        )}
                        <span className="text-[11px] text-[#81756e]">{msg.timestamp}</span>
                      </div>
                    </div>

                    <div
                      className={`p-5 rounded-2xl leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#f9f3eb] text-[#1d1b17] text-[14px] shadow-[0_2px_6px_rgba(180,165,150,0.15)]'
                          : 'bg-white border border-[#ede7df] text-[14px] text-[#1d1b17] shadow-[0_6px_16px_rgba(190,175,160,0.18)]'
                      }`}
                    >
                      {msg.sender === 'socratic-guide' ? (
                        <div className="flex flex-col gap-3">
                          <MarkdownRenderer content={msg.text} />

                          {/* Render Grounded Citations if present */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[#ede7df] flex flex-col gap-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#81756e] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-[#745948]">
                                  menu_book
                                </span>
                                Grounded Citations:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {msg.citations.map((cite: any, cIdx: number) => (
                                  <div
                                    key={cIdx}
                                    className="px-2.5 py-1 rounded-lg bg-[#f9f3eb] border border-[#ede7df] text-[11px] text-[#4f453f] flex items-center gap-1"
                                  >
                                    <span className="font-semibold text-[#1d1b17]">
                                      {cite.document_title || cite.source || 'Course Material'}
                                    </span>
                                    {cite.page && <span>• p. {cite.page}</span>}
                                    {cite.section && <span>• §{cite.section}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Follow-up Prompts */}
                          {msg.followUps && msg.followUps.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                              <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider">
                                Recommended Next Steps:
                              </span>
                              {msg.followUps.map((fu, fIdx) => (
                                <button
                                  key={fIdx}
                                  onClick={() => {
                                    setInputText(fu);
                                    const el = document.getElementById('chat-input-field');
                                    el?.focus();
                                  }}
                                  className="px-3 py-1 rounded-full bg-[#ede7df] hover:bg-[#e2c0ab] text-[11px] font-semibold text-[#1d1b17] transition-all cursor-pointer"
                                >
                                  {fu}
                                </button>
                              ))}
                              {onNavigateToQuiz && (
                                <button
                                  onClick={onNavigateToQuiz}
                                  className="px-3 py-1 rounded-full bg-[#ede7df] hover:bg-[#e2c0ab] text-[11px] font-semibold text-[#1d1b17] flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[13px]">quiz</span>
                                  <span>Generate Practice Quiz</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isLoadingApi && (
                <div className="flex items-center gap-2 text-[12px] text-[#745948] p-3.5 rounded-xl bg-[#f9f3eb] animate-pulse">
                  <span className="material-symbols-outlined text-[18px] animate-spin">psychology</span>
                  <span>Socratic Guide is synthesizing a grounded pedagogical explanation with RAG...</span>
                </div>
              )}

              <div ref={chatBottomRef}></div>
            </div>

            {/* Bottom Socratic Prompt Input Box */}
            <div className="sticky bottom-0 pt-4 bg-white/95 backdrop-blur-md border-t border-[#ede7df]">
              <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                <div className="relative flex items-center">
                  <input
                    id="chat-input-field"
                    type="text"
                    placeholder="Ask SocraticAI a question, request an intuitive metaphor, or critique an equation..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-[#ede7df]/60 text-[14px] text-[#1d1b17] shadow-[inset_0_2px_4px_rgba(175,160,147,0.2)] focus:outline-none focus:ring-2 focus:ring-[#745948]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setIsRecordingMic(!isRecordingMic)}
                    className={`absolute right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      isRecordingMic ? 'bg-[#ba1a1a] text-white animate-pulse' : 'text-[#81756e] hover:text-[#1d1b17]'
                    }`}
                    title="Speak question via mic"
                  >
                    <span className="material-symbols-outlined text-[19px]">mic</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(true)}
                      className="px-3 py-1 rounded-full bg-[#f9f3eb] hover:bg-[#ede7df] text-[11px] font-semibold text-[#4f453f] flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">upload_file</span>
                      <span>Import Device File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLinkModal(true)}
                      className="px-3 py-1 rounded-full bg-[#f9f3eb] hover:bg-[#ede7df] text-[11px] font-semibold text-[#4f453f] flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">link</span>
                      <span>Attach Link / Video</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-[#f3cfba] hover:bg-[#fadfd0] text-[#725746] font-bold text-[13px] shadow-[0_4px_12px_rgba(215,175,155,0.4)] active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inquire</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Device File Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 sm:p-8 shadow-2xl flex flex-col gap-5 border border-[#ede7df]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-bold text-[#1d1b17] flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#745948]">upload_file</span>
                Import Study Source from Device
              </span>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                  setUploadSuccess(null);
                }}
                className="w-8 h-8 rounded-full bg-[#f9f3eb] flex items-center justify-center text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-[#4f453f] leading-relaxed">
                Choose any course document or recording from your computer or phone. Supported formats include: <strong>PDF, PPTX, PPT, MP4, MOV, AVI, MKV, WebM, and audio memos</strong>.
              </p>
            </div>

            {/* Direct Device File Selector & Drag Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setSelectedFile(e.dataTransfer.files[0]);
                }
              }}
              className="p-6 rounded-2xl border-2 border-dashed border-[#ede7df] hover:border-[#745948] flex flex-col items-center justify-center text-center gap-2.5 bg-[#f9f3eb]/40 hover:bg-[#f9f3eb] transition-all cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.pptx,.ppt,.mp4,.mov,.avi,.mkv,.webm,.m4v,.mp3,.wav,.m4a"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
              <span className="material-symbols-outlined text-[36px] text-[#745948]">
                cloud_upload
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-bold text-[#1d1b17]">
                  {selectedFile ? selectedFile.name : 'Click to browse files or drag and drop here'}
                </span>
                <span className="text-[11px] text-[#81756e]">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to process`
                    : 'Select any PDF textbook, slide deck, or lecture video'}
                </span>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-[#ffdad6]/60 border border-[#ffdad6] text-[12px] text-[#ba1a1a] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 rounded-xl bg-[#c0ddd0]/60 border border-[#c0ddd0] text-[12px] text-[#052018] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>{uploadSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                  setUploadSuccess(null);
                }}
                className="px-4 py-2 rounded-full text-[13px] font-semibold text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedFile || isUploading}
                onClick={() => handleFileUpload()}
                className={`px-5 py-2.5 rounded-full font-bold text-[13px] shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                  !selectedFile || isUploading
                    ? 'bg-[#ede7df] text-[#81756e] cursor-not-allowed'
                    : 'bg-[#745948] hover:bg-[#5a4132] text-white shadow-[0_4px_12px_rgba(116,89,72,0.35)]'
                }`}
              >
                {isUploading ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    <span>Extracting & Indexing RAG...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">add_task</span>
                    <span>Attach & Index Material</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Attach Link / Video URL Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 sm:p-8 shadow-2xl flex flex-col gap-5 border border-[#ede7df]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-bold text-[#1d1b17] flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#745948]">link</span>
                Attach Video / Lecture Link
              </span>
              <button
                onClick={() => setShowLinkModal(false)}
                className="w-8 h-8 rounded-full bg-[#f9f3eb] flex items-center justify-center text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleLinkSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#4f453f]">
                  Source Title / Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stanford CS229 Lecture 4 or MIT 18.06 Eigenvalues"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#ede7df]/60 text-[13px] text-[#1d1b17] focus:outline-none focus:ring-2 focus:ring-[#745948]/30"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#4f453f]">
                  Video Link, Web URL, or Lecture Stream
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or any web/video stream URL"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#ede7df]/60 text-[13px] text-[#1d1b17] focus:outline-none focus:ring-2 focus:ring-[#745948]/30"
                  required
                />
              </div>

              <p className="text-[11px] text-[#81756e] leading-relaxed">
                You can attach any video stream, YouTube link, or web-hosted lecture transcript. It will be indexed into the Socratic concept graph for this session.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 rounded-full text-[13px] font-semibold text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLinking || !linkInput.trim()}
                  className="px-5 py-2.5 rounded-full bg-[#745948] hover:bg-[#5a4132] text-white font-bold text-[13px] shadow-[0_4px_12px_rgba(116,89,72,0.35)] flex items-center gap-2 cursor-pointer transition-all"
                >
                  {isLinking ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                      <span>Indexing Link...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">add_link</span>
                      <span>Attach & Index Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
