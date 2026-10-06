import React, { useState, useEffect, useRef } from 'react';
import MarkdownRenderer from '../components/common/MarkdownRenderer';
import {
  postConversationChat,
  createConversation,
  getConversations,
  getConversationDetails,
  uploadSourceToConversation,
  deleteConversation,
  deleteDocument,
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

type UploadSourceType = 'video' | 'ppt' | 'pdf' | 'audio';

export const TutorPage: React.FC<TutorWorkspaceProps> = ({
  onNavigateToQuiz,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic conversation & sources state
  const [conversationsList, setConversationsList] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('New Study Session');
  const [activeTopic, setActiveTopic] = useState('General');
  const [activeSources, setActiveSources] = useState<SourceItem[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  // Unified Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<UploadSourceType>('pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Document PDF Viewer Modal State
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    documentId: string;
    documentTitle: string;
    page: number;
  } | null>(null);

  const openDocumentViewer = (documentId?: string, page: number = 1, documentTitle: string = 'Course Material') => {
    let resolvedId = documentId;
    let resolvedTitle = documentTitle;
    if (!resolvedId && activeSources.length > 0) {
      resolvedId = activeSources[0].id;
      resolvedTitle = activeSources[0].title;
    }
    if (!resolvedId) {
      alert('Document file is not currently available for this reference.');
      return;
    }
    setViewerState({
      isOpen: true,
      documentId: resolvedId,
      documentTitle: resolvedTitle,
      page: Math.max(1, page),
    });
  };

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
        setActiveTitle(details.title || 'Study Session');
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

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this study session?')) return;
    try {
      await deleteConversation(convId);
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
        setActiveSources([]);
      }
      loadConversations();
    } catch (err: any) {
      alert(err?.message || 'Delete error');
    }
  };

  const handleDeleteSource = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Remove this source document?')) return;
    try {
      await deleteDocument(docId);
      if (activeConvId) {
        const details = await getConversationDetails(activeConvId);
        if (details?.sources) setActiveSources(details.sources);
      }
    } catch (err: any) {
      alert(err?.message || 'Delete error');
    }
  };

  const handleCreateNewInquiry = async () => {
    try {
      const newConv = await createConversation({
        title: 'New Study Session',
        course_id: 'default_course',
        topic_name: 'General',
      });
      if (newConv && newConv.id) {
        setActiveConvId(newConv.id);
        setActiveTitle(newConv.title || 'New Study Session');
        setActiveTopic(newConv.topic_name || 'General');
        setActiveSources([]);
        setMessages([]);
        loadConversations();
      }
    } catch {
      setActiveConvId(null);
      setActiveTitle('New Study Session');
      setActiveTopic('General');
      setActiveSources([]);
      setMessages([]);
    }
    const el = document.getElementById('chat-input-field');
    el?.focus();
  };

  // Unified Upload Handler (File or Video/Audio Link)
  const handlePerformUpload = async () => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      let convId = activeConvId;
      if (!convId) {
        const fallbackTitle = selectedFile
          ? selectedFile.name.replace(/\.(pdf|pptx|ppt|mp4|mov|webm)$/i, '')
          : urlTitle || 'Study Session';
        const newConv = await createConversation({
          title: fallbackTitle,
          course_id: 'default_course',
          topic_name: 'Course Material',
        });
        convId = newConv.id;
        setActiveConvId(convId);
        setActiveTitle(newConv.title);
      }

      let fileToUpload: File | null = selectedFile;

      // If URL mode for video or audio, create a reference file
      if ((uploadCategory === 'video' || uploadCategory === 'audio') && urlInput.trim() && !fileToUpload) {
        const cleanName = (urlTitle.trim() || `${uploadCategory}_source`).replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
        const fileBlob = new Blob(
          [
            `Source Title: ${urlTitle || 'Course Lecture Material'}\nMedia Link: ${urlInput}\nType: ${uploadCategory.toUpperCase()} Online Lecture\n\nNotes and syllabus outline referenced for tutoring.`
          ],
          { type: 'text/plain' }
        );
        fileToUpload = new File([fileBlob], cleanName, { type: 'application/pdf' });
      }

      if (!fileToUpload) {
        throw new Error('Please select a file or enter a valid link.');
      }

      let res;
      try {
        res = await uploadSourceToConversation(convId, fileToUpload);
      } catch (uploadErr: any) {
        // Auto-heal on stale 404 session
        if (uploadErr?.response?.status === 404) {
          const freshConv = await createConversation({
            title: fileToUpload.name.replace(/\.(pdf|pptx|ppt|mp4|mov|webm)$/i, ''),
            course_id: 'default_course',
            topic_name: 'Course Material',
          });
          convId = freshConv.id;
          setActiveConvId(convId);
          setActiveTitle(freshConv.title);
          res = await uploadSourceToConversation(convId, fileToUpload);
        } else {
          throw uploadErr;
        }
      }

      setUploadSuccess(`Successfully uploaded "${fileToUpload.name}"!`);
      setSelectedFile(null);
      setUrlInput('');
      setUrlTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refresh active sources list & conversation
      const details = await getConversationDetails(convId);
      if (details) {
        if (details.title) setActiveTitle(details.title);
        if (details.sources) setActiveSources(details.sources);
      }
      loadConversations();

      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(null);
      }, 1200);
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail || err?.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
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

      const res = await postConversationChat(convId, userText, 'Basics to Advanced');
      const lastMessage = res?.messages?.slice(-1)[0];
      const answerText = res?.answer || res?.content || lastMessage?.content || (typeof res === 'string' ? res : '');

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

      if (convId) {
        getConversationDetails(convId)
          .then((details) => {
            if (details?.title) setActiveTitle(details.title);
            if (details?.sources) setActiveSources(details.sources);
          })
          .catch(() => { });
        loadConversations();
      }
    } catch {
      const guideMsg: ChatMessage = {
        id: `msg-guide-${Date.now()}`,
        sender: 'socratic-guide',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: "I couldn't reach the server right now. Please verify your connection.",
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
    <div className="w-full">
      {/* Main 2-Column Static Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[calc(100vh-8.5rem)] min-h-[620px]">

        {/* LEFT COLUMN: Fixed Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-y-auto pr-1">

          {/* New Study Session Button */}
          <button
            onClick={handleCreateNewInquiry}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#f3cfba] hover:bg-[#fadfd0] text-[#725746] font-bold text-[14px] shadow-sm flex items-center justify-between transition-all cursor-pointer shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>New Study Session</span>
            </div>
            <span className="text-[11px] font-semibold text-[#725746] bg-white/60 px-2 py-0.5 rounded-md">
              Start
            </span>
          </button>

          {/* Search Input Box */}
          <div className="relative flex items-center shrink-0">
            <span className="material-symbols-outlined absolute left-3.5 text-[#81756e] text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search chapters, sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#ede7df] text-[13px] text-[#1d1b17] placeholder:text-[#81756e] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#745948]/30"
            />
          </div>

          {/* Active Context Sources Container */}
          <div className="p-4 rounded-3xl bg-white shadow-sm border border-[#ede7df] flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#4f453f] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#745948]"></span>
                Attached Course Sources
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#f9f3eb] text-[11px] font-bold text-[#745948]">
                {activeSources.length} Attached
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
              {activeSources.length > 0 ? (
                activeSources.map((source) => {
                  const isPdf = source.title?.toLowerCase().endsWith('.pdf');
                  const isPpt = source.title?.toLowerCase().includes('ppt');
                  const isVideo =
                    source.title?.toLowerCase().endsWith('.mp4') ||
                    source.title?.toLowerCase().endsWith('.mov') ||
                    source.source_type?.toLowerCase().includes('video');
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
                      key={source.id}
                      onClick={() => openDocumentViewer(source.id, 1, source.title)}
                      className="p-2.5 rounded-xl bg-[#f9f3eb] flex items-center justify-between group hover:bg-[#ede7df] transition-colors cursor-pointer"
                      title="Click to view full source document"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg ${badgeColor} flex items-center justify-center shrink-0`}>
                          <span className="material-symbols-outlined text-[16px]">{icon}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[12px] font-bold text-[#1d1b17] truncate" title={source.title}>
                            {source.title}
                          </span>
                          <span className="text-[10px] text-[#4f453f] uppercase font-semibold flex items-center gap-1">
                            {source.source_type ? `${source.source_type.toUpperCase()} • Click to view` : 'Active'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-[#81756e] group-hover:text-[#745948] transition-colors" title="View file">
                          visibility
                        </span>
                        <button
                          onClick={(e) => handleDeleteSource(source.id, e)}
                          className="text-[#81756e] hover:text-[#ba1a1a] opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                          title="Remove source"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-[#f9f3eb]/60 border border-dashed border-[#ede7df] flex flex-col items-center justify-center text-center gap-1 py-4">
                  <span className="material-symbols-outlined text-[20px] text-[#81756e]">
                    auto_stories
                  </span>
                  <span className="text-[11px] font-semibold text-[#1d1b17]">
                    No files attached to this session
                  </span>
                  <span className="text-[10px] text-[#81756e]">
                    Click below to upload a textbook or slide deck.
                  </span>
                </div>
              )}
            </div>

            {/* Single Unified "Upload Source" Button */}
            <button
              onClick={() => {
                setShowUploadModal(true);
                setUploadError(null);
                setUploadSuccess(null);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-[#745948] hover:bg-[#5a4132] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer mt-1"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Upload Source</span>
            </button>
          </div>

          {/* Previous Study Sessions */}
          <div className="p-4 rounded-3xl bg-white shadow-sm border border-[#ede7df] flex flex-col gap-2.5 flex-1 min-h-[160px] overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#4f453f]">
                Previous Chapters & Sessions
              </span>
              <span className="material-symbols-outlined text-[16px] text-[#81756e]">history</span>
            </div>

            <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 pr-1">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors group ${
                        isActive
                          ? 'bg-[#f3cfba]/40 border border-[#f3cfba]'
                          : 'hover:bg-[#f9f3eb]'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[12px] font-bold text-[#1d1b17] truncate" title={conv.title}>
                          {conv.title || 'Study Session'}
                        </span>
                        <span className="text-[10px] text-[#81756e]">
                          {conv.message_count ? `${conv.message_count} messages` : 'New session'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="text-[#81756e] hover:text-[#ba1a1a] opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Delete session"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-[#f9f3eb]/60 text-center py-4">
                  <span className="text-[11px] text-[#81756e]">No previous sessions found</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Chat Canvas (Fixed Height, Internal Scroll) */}
        <div className="lg:col-span-8 flex flex-col h-full rounded-3xl bg-white shadow-md border border-[#ede7df] overflow-hidden">

          {/* Session Header */}
          <div className="px-6 py-4 border-b border-[#ede7df] flex items-center justify-between shrink-0 bg-[#f9f3eb]/40">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-[#ede7df] text-[10px] text-[#1d1b17] font-semibold">
                  {activeTopic}
                </span>
                <span>• Study Workspace</span>
                {activeSources.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#c0ddd0] text-[#052018] text-[10px] font-bold">
                    {activeSources.length} Source{activeSources.length > 1 ? 's' : ''} Attached
                  </span>
                )}
              </span>
              <h1 className="text-[18px] sm:text-[20px] font-bold text-[#1d1b17] truncate pt-0.5">
                {activeTitle}
              </h1>
            </div>

            <button
              onClick={() => {
                setShowUploadModal(true);
                setUploadError(null);
                setUploadSuccess(null);
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#745948] hover:bg-[#5a4132] text-white text-[12px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Upload Source</span>
            </button>
          </div>

          {/* Scrollable Chat History Container */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {messages.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#f9f3eb]/60 border border-dashed border-[#ede7df] flex flex-col items-center justify-center text-center gap-3 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#f3cfba] text-[#725746] flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">school</span>
                </div>
                <div className="flex flex-col gap-1 max-w-md">
                  <h3 className="text-[16px] font-bold text-[#1d1b17]">
                    How can I assist your study today?
                  </h3>
                  <p className="text-[13px] text-[#4f453f] leading-relaxed">
                    Ask any question, formula derivation, or concept explanation from your uploaded materials.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {[
                    'Explain forward difference method step-by-step',
                    'What is interpolation and how does it work?',
                    'Derive the Newton forward difference formula',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setInputText(example);
                        const el = document.getElementById('chat-input-field');
                        el?.focus();
                      }}
                      className="px-3 py-1.5 rounded-full bg-white hover:bg-[#ede7df] text-[12px] font-medium text-[#4f453f] border border-[#ede7df] shadow-xs transition-colors cursor-pointer"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    {msg.sender === 'user' ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-[#ede7df] flex items-center justify-center text-[11px] font-bold text-[#745948]">
                          U
                        </div>
                        <span className="text-[12px] font-bold text-[#1d1b17]">You</span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full bg-[#745948] text-white flex items-center justify-center text-[12px]">
                          <span className="material-symbols-outlined text-[14px]">school</span>
                        </div>
                        <span className="text-[12px] font-bold text-[#1d1b17]">Tutor</span>
                      </>
                    )}
                    <span className="text-[11px] text-[#81756e]">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-4 rounded-2xl leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#f9f3eb] text-[#1d1b17] text-[14px]'
                        : 'bg-white border border-[#ede7df] text-[14px] text-[#1d1b17] shadow-xs'
                    }`}
                  >
                    {msg.sender === 'socratic-guide' ? (
                      <div className="flex flex-col gap-3">
                        <MarkdownRenderer
                          content={msg.text}
                          onCitationClick={(pageNum) => {
                            const matchingCite = msg.citations?.find((c: any) => c.page === pageNum);
                            const docId = matchingCite?.document_id || activeSources[0]?.id;
                            const docTitle = matchingCite?.document_title || activeSources[0]?.title || 'Course Material';
                            openDocumentViewer(docId, pageNum, docTitle);
                          }}
                        />

                        {/* Citations */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-[#ede7df] flex flex-col gap-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#81756e] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-[#745948]">
                                menu_book
                              </span>
                              Source References (Click to view exact page):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.citations.map((cite: any, cIdx: number) => {
                                const pageNum = cite.page || 1;
                                const docId = cite.document_id || activeSources[0]?.id;
                                const title = cite.document_title || cite.source || activeSources[0]?.title || 'Course Material';
                                return (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    onClick={() => openDocumentViewer(docId, pageNum, title)}
                                    className="px-2.5 py-1 rounded-lg bg-[#f9f3eb] hover:bg-[#ede7df] border border-[#ede7df] hover:border-[#745948]/50 text-[11px] text-[#4f453f] hover:text-[#1d1b17] flex items-center gap-1.5 transition-all cursor-pointer group shadow-2xs"
                                    title={`Click to open PDF directly at Page ${pageNum}`}
                                  >
                                    <span className="material-symbols-outlined text-[13px] text-[#745948] group-hover:scale-110 transition-transform">
                                      menu_book
                                    </span>
                                    <span className="font-semibold text-[#1d1b17] truncate max-w-[220px]">
                                      {title}
                                    </span>
                                    {cite.page && (
                                      <span className="bg-[#ede7df] group-hover:bg-[#dfd4c5] px-1.5 py-0.2 rounded font-bold text-[#745948]">
                                        • p. {cite.page}
                                      </span>
                                    )}
                                    {cite.section && (
                                      <span className="text-[#81756e]">
                                        • §{cite.section}
                                      </span>
                                    )}
                                    <span className="material-symbols-outlined text-[12px] text-[#81756e] group-hover:text-[#745948]">
                                      open_in_new
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Follow-up Quick Prompts */}
                        {msg.followUps && msg.followUps.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {msg.followUps.map((fu, fIdx) => (
                              <button
                                key={fIdx}
                                onClick={() => {
                                  setInputText(fu);
                                  const el = document.getElementById('chat-input-field');
                                  el?.focus();
                                }}
                                className="px-2.5 py-1 rounded-full bg-[#ede7df] hover:bg-[#e2c0ab] text-[11px] font-semibold text-[#1d1b17] transition-all cursor-pointer"
                              >
                                {fu}
                              </button>
                            ))}
                            {onNavigateToQuiz && (
                              <button
                                onClick={onNavigateToQuiz}
                                className="px-2.5 py-1 rounded-full bg-[#ede7df] hover:bg-[#e2c0ab] text-[11px] font-semibold text-[#1d1b17] flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[13px]">quiz</span>
                                <span>Practice Quiz</span>
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
              <div className="flex items-center gap-2 text-[12px] text-[#745948] p-3 rounded-xl bg-[#f9f3eb] animate-pulse">
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                <span>Tutor is formulating your step-by-step explanation...</span>
              </div>
            )}

            <div ref={chatBottomRef}></div>
          </div>

          {/* Sticky Bottom Input Bar */}
          <div className="p-4 border-t border-[#ede7df] bg-white shrink-0">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                id="chat-input-field"
                type="text"
                placeholder="Ask your tutor a question or tell what you'd like to understand..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl bg-[#f9f3eb] text-[14px] text-[#1d1b17] border border-[#ede7df] focus:outline-none focus:ring-2 focus:ring-[#745948]/30"
              />
              <button
                type="button"
                onClick={() => setIsRecordingMic(!isRecordingMic)}
                className={`p-3 rounded-2xl border transition-colors cursor-pointer shrink-0 ${
                  isRecordingMic
                    ? 'bg-[#ba1a1a] text-white border-[#ba1a1a]'
                    : 'bg-[#f9f3eb] text-[#81756e] border-[#ede7df] hover:text-[#1d1b17]'
                }`}
                title="Voice input"
              >
                <span className="material-symbols-outlined text-[20px]">mic</span>
              </button>
              <button
                type="submit"
                disabled={!inputText.trim() || isLoadingApi}
                className={`p-3 px-5 rounded-2xl font-bold text-[14px] flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  !inputText.trim() || isLoadingApi
                    ? 'bg-[#ede7df] text-[#81756e] cursor-not-allowed'
                    : 'bg-[#745948] hover:bg-[#5a4132] text-white shadow-sm'
                }`}
                title="Send question"
              >
                <span>Send</span>
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* SINGLE UNIFIED "Upload Source" MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl flex flex-col gap-4 border border-[#ede7df]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#ede7df]">
              <span className="text-[17px] font-bold text-[#1d1b17] flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#745948]">upload_file</span>
                Upload Source
              </span>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                  setUploadSuccess(null);
                  setSelectedFile(null);
                }}
                className="w-8 h-8 rounded-full bg-[#f9f3eb] flex items-center justify-center text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Category Selector: Video, PPT, PDF, Audio */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#81756e]">
                Select Source Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'pdf', label: 'PDF source', icon: 'menu_book' },
                  { id: 'ppt', label: 'PPT source', icon: 'slideshow' },
                  { id: 'video', label: 'Video source', icon: 'smart_display' },
                  { id: 'audio', label: 'Audio source', icon: 'mic' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setUploadCategory(item.id as UploadSourceType);
                      setSelectedFile(null);
                      setUploadError(null);
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      uploadCategory === item.id
                        ? 'bg-[#745948] text-white border-[#745948] font-bold shadow-xs'
                        : 'bg-[#f9f3eb] text-[#4f453f] border-[#ede7df] hover:bg-[#ede7df]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="text-[11px]">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Selection for Category */}
            <div className="flex flex-col gap-3">
              {/* Device File Browser (Available for PDF, PPT, Video, Audio) */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setSelectedFile(e.dataTransfer.files[0]);
                  }
                }}
                className="p-5 rounded-2xl border-2 border-dashed border-[#ede7df] hover:border-[#745948] flex flex-col items-center justify-center text-center gap-2 bg-[#f9f3eb]/40 hover:bg-[#f9f3eb] transition-all cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={
                    uploadCategory === 'pdf'
                      ? '.pdf'
                      : uploadCategory === 'ppt'
                      ? '.pptx,.ppt'
                      : uploadCategory === 'video'
                      ? '.mp4,.mov,.avi,.mkv,.webm,.m4v'
                      : '.mp3,.wav,.m4a'
                  }
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
                <span className="material-symbols-outlined text-[32px] text-[#745948]">
                  cloud_upload
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-[#1d1b17]">
                    {selectedFile ? selectedFile.name : `Browse device for ${uploadCategory.toUpperCase()} file`}
                  </span>
                  <span className="text-[11px] text-[#81756e]">
                    {selectedFile
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload`
                      : 'or drag and drop file here'}
                  </span>
                </div>
              </div>

              {/* URL Link Input (Only for Video and Audio sources as requested) */}
              {(uploadCategory === 'video' || uploadCategory === 'audio') && (
                <div className="flex flex-col gap-2 pt-2 border-t border-[#ede7df]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#81756e]">
                    Or attach an online link
                  </span>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Title / Topic (e.g. Lecture 4: Interpolation)"
                      value={urlTitle}
                      onChange={(e) => setUrlTitle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#f9f3eb] border border-[#ede7df] text-[12px] text-[#1d1b17] focus:outline-none focus:ring-1 focus:ring-[#745948]"
                    />
                    <input
                      type="url"
                      placeholder="https://youtube.com/watch?v=... or direct media link"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#f9f3eb] border border-[#ede7df] text-[12px] text-[#1d1b17] focus:outline-none focus:ring-1 focus:ring-[#745948]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Upload Feedback */}
            {uploadError && (
              <div className="p-3 rounded-xl bg-[#ffdad6]/70 border border-[#ffdad6] text-[12px] text-[#ba1a1a] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 rounded-xl bg-[#c0ddd0]/70 border border-[#c0ddd0] text-[12px] text-[#052018] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>{uploadSuccess}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ede7df]">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                  setUploadSuccess(null);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 rounded-full text-[13px] font-semibold text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploading || (!selectedFile && !urlInput.trim())}
                onClick={handlePerformUpload}
                className={`px-5 py-2 rounded-full font-bold text-[13px] shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
                  isUploading || (!selectedFile && !urlInput.trim())
                    ? 'bg-[#ede7df] text-[#81756e] cursor-not-allowed'
                    : 'bg-[#745948] hover:bg-[#5a4132] text-white'
                }`}
              >
                {isUploading ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    <span>File uploading...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    <span>Upload & Attach</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive PDF Document Viewer Modal */}
      {viewerState && viewerState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 animate-fade-in">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#ede7df]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#f9f3eb] border-b border-[#ede7df] flex items-center justify-between shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#745948] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">menu_book</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-[14px] font-bold text-[#1d1b17] truncate max-w-xs sm:max-w-md" title={viewerState.documentTitle}>
                    {viewerState.documentTitle}
                  </h3>
                  <span className="text-[11px] text-[#745948] font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#1b6d24]"></span>
                    Document Grounding • Page {viewerState.page}
                  </span>
                </div>
              </div>

              {/* Page Controls & Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-white border border-[#ede7df] rounded-xl px-2 py-1 shadow-2xs gap-1">
                  <button
                    type="button"
                    onClick={() => setViewerState(prev => prev ? { ...prev, page: Math.max(1, prev.page - 1) } : null)}
                    disabled={viewerState.page <= 1}
                    className="p-1 rounded-lg hover:bg-[#ede7df] disabled:opacity-30 cursor-pointer transition-colors"
                    title="Previous Page"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <span className="text-xs font-bold text-[#1d1b17] px-1.5 min-w-[55px] text-center">
                    Page {viewerState.page}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewerState(prev => prev ? { ...prev, page: prev.page + 1 } : null)}
                    className="p-1 rounded-lg hover:bg-[#ede7df] cursor-pointer transition-colors"
                    title="Next Page"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>

                <a
                  href={`/api/documents/${viewerState.documentId}/file#page=${viewerState.page}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#ede7df] border border-[#ede7df] text-[12px] font-bold text-[#1d1b17] flex items-center gap-1.5 transition-all shadow-2xs"
                  title="Open in new browser tab"
                >
                  <span className="material-symbols-outlined text-[15px] text-[#745948]">open_in_new</span>
                  <span className="hidden sm:inline">Open in Tab</span>
                </a>

                <button
                  type="button"
                  onClick={() => setViewerState(null)}
                  className="p-1.5 rounded-xl bg-white hover:bg-[#ede7df] border border-[#ede7df] text-[#81756e] hover:text-[#1d1b17] transition-all cursor-pointer"
                  title="Close PDF viewer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body / Embedded PDF */}
            <div className="flex-1 w-full bg-[#525659] relative">
              <iframe
                key={`${viewerState.documentId}-${viewerState.page}`}
                src={`/api/documents/${viewerState.documentId}/file#page=${viewerState.page}`}
                className="w-full h-full border-0"
                title={`PDF Viewer for ${viewerState.documentTitle}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
