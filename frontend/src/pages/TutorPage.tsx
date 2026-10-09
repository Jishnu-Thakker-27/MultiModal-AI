import React, { useState, useEffect, useRef } from 'react';
import MarkdownRenderer from '../components/common/MarkdownRenderer';
import SocraticHintLadderModal from '../components/common/SocraticHintLadderModal';
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
  initialTopic?: string;
  initialPrompt?: string;
  initialUploadCategory?: 'pdf' | 'ppt' | 'video' | 'audio';
  autoOpenUpload?: boolean;
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

function extractFollowUpOptions(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  const options: string[] = [];

  // Match roadmap or quick options section
  const roadmapMatch = text.match(/(?:###?\s*🗺️?\s*(?:Next Learning Steps|Topic Options|Quick Options|Further Topics|Topics to Explore)[\s\S]*?$)/i);
  const targetSection = roadmapMatch ? roadmapMatch[0] : text;

  // 1. Match bracketed options like "- [Option text]" or "* [Option text]"
  const bracketMatches = targetSection.matchAll(/^[*-]\s*\[(.*?)\]/gm);
  for (const m of bracketMatches) {
    const val = m[1].trim();
    if (val && !options.includes(val) && val.length < 80) {
      options.push(val);
    }
  }

  // 2. If no bracket matches, match bullet items under roadmap section
  if (options.length === 0 && roadmapMatch) {
    const lines = roadmapMatch[0].split('\n');
    for (const line of lines) {
      const bulletMatch = line.match(/^[*-]\s+(?:\*\*)?([A-Za-z0-9\s—–:,\.()]{4,70})(?:\*\*)?$/);
      if (bulletMatch) {
        const val = bulletMatch[1].trim();
        if (
          val &&
          !val.toLowerCase().startsWith('what would you') &&
          !val.toLowerCase().startsWith('click an option') &&
          !options.includes(val)
        ) {
          options.push(val);
        }
      }
    }
  }

  // 3. Numbered lists under roadmap section
  if (options.length === 0 && roadmapMatch) {
    const lines = roadmapMatch[0].split('\n');
    for (const line of lines) {
      const numMatch = line.match(/^\d+\.\s+(?:\*\*)?([A-Za-z0-9\s—–:,\.()]{4,70})(?:\*\*)?$/);
      if (numMatch) {
        const val = numMatch[1].trim();
        if (val && !options.includes(val)) {
          options.push(val);
        }
      }
    }
  }

  if (options.length > 0) {
    return options.slice(0, 5);
  }

  return [
    'I am completely new to this topic, guide me step-by-step',
    'I have a rough idea, test my understanding',
    'Skip conversation and start explaining',
  ];
}

function stripFollowUpOptionsFromText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;

  // 1. Remove markdown roadmap / quick options header and everything following it
  cleaned = cleaned.replace(/(?:###?\s*🗺️?\s*(?:Next Learning Steps|Topic Options|Quick Options|Further Topics|Topics to Explore)[\s\S]*?$)/i, '');

  // 2. Remove any remaining prompt text like "What would you like to explore next? Click an option below or ask any doubt:"
  cleaned = cleaned.replace(/(?:What would you like to explore next\??\s*(?:Click an option below|ask any doubt)?[:\s]*)/i, '');

  // 3. Remove any standalone bracketed options "- [Option text]" or "* [Option text]"
  cleaned = cleaned.replace(/^[*-]\s*\[.*?\]\s*$/gm, '');

  return cleaned.trim();
}

export const TutorPage: React.FC<TutorWorkspaceProps> = ({
  initialTopic,
  initialPrompt,
  initialUploadCategory,
  autoOpenUpload,
  onNavigateToQuiz,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState(initialPrompt || '');
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic conversation & sources state
  const [conversationsList, setConversationsList] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('New Study Session');
  const [activeTopic, setActiveTopic] = useState(initialTopic || 'General');
  const [activeSources, setActiveSources] = useState<SourceItem[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  // Unified Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(autoOpenUpload || false);
  const [uploadCategory, setUploadCategory] = useState<UploadSourceType>(initialUploadCategory || 'pdf');
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

  // Socratic Hint Ladder Modal State
  const [hintLadderState, setHintLadderState] = useState<{
    isOpen: boolean;
    problemText: string;
  }>({ isOpen: false, problemText: '' });

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

  useEffect(() => {
    if (autoOpenUpload) {
      setShowUploadModal(true);
      if (initialUploadCategory) {
        setUploadCategory(initialUploadCategory);
      }
    }
    if (initialTopic) {
      setActiveTopic(initialTopic);
    }
  }, [autoOpenUpload, initialUploadCategory, initialTopic]);

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
        const derivedDocTopic = details.sources?.[0]?.title
          ? details.sources[0].title.replace(/\.(pdf|pptx|ppt|mp4|mov|webm)$/i, '').replace(/^(?:chapter|lecture|unit)\s*\d+[\s\-_–:]*/i, '').trim()
          : '';
        const cleanTopic = details.topic_name && details.topic_name.toLowerCase() !== 'general'
          ? details.topic_name
          : (derivedDocTopic || '');
        setActiveTopic(cleanTopic);
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
            followUps: m.role !== 'user' ? extractFollowUpOptions(m.content || '') : undefined,
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
        topic_name: null,
      });
      if (newConv && newConv.id) {
        setActiveConvId(newConv.id);
        setActiveTitle(newConv.title || 'New Study Session');
        setActiveTopic(newConv.topic_name && newConv.topic_name.toLowerCase() !== 'general' ? newConv.topic_name : '');
        setActiveSources([]);
        setMessages([]);
        loadConversations();
      }
    } catch {
      setActiveConvId(null);
      setActiveTitle('New Study Session');
      setActiveTopic('');
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

      setUploadSuccess(`Uploaded "${fileToUpload.name}".`);
      setSelectedFile(null);
      setUrlInput('');
      setUrlTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refresh active sources list & conversation
      const details = await getConversationDetails(convId);
      if (details) {
        if (details.title) setActiveTitle(details.title);
        const derivedDocTopic = details.sources?.[0]?.title
          ? details.sources[0].title.replace(/\.(pdf|pptx|ppt|mp4|mov|webm)$/i, '').replace(/^(?:chapter|lecture|unit)\s*\d+[\s\-_–:]*/i, '').trim()
          : '';
        const cleanTopic = details.topic_name && details.topic_name.toLowerCase() !== 'general'
          ? details.topic_name
          : (derivedDocTopic || '');
        if (cleanTopic) setActiveTopic(cleanTopic);
        if (details.sources) setActiveSources(details.sources);
      }
      loadConversations();

      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(null);
      }, 1000);

      // Automatically trigger initial greeting and diagnostic probe for the uploaded topic if session is new
      if (convId && messages.length === 0) {
        setIsLoadingApi(true);
        postConversationChat(convId, 'Explain topic', 'Basics to Advanced')
          .then((res: any) => {
            const lastMessage = res?.messages?.slice(-1)[0];
            const answerText = res?.answer || res?.content || lastMessage?.content || (typeof res === 'string' ? res : '');
            if (answerText) {
              const guideMsg: ChatMessage = {
                id: `msg-guide-${Date.now()}`,
                sender: 'socratic-guide',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                text: answerText,
                citations: res?.citations || [],
                followUps: extractFollowUpOptions(answerText),
              };
              setMessages([guideMsg]);
            }
          })
          .catch((autoErr) => {
            console.error('Failed to trigger initial topic greeting:', autoErr);
          })
          .finally(() => {
            setIsLoadingApi(false);
          });
      }
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail || err?.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (textOrEvent?: string | React.FormEvent) => {
    let userText = '';
    if (typeof textOrEvent === 'string') {
      userText = textOrEvent.trim();
    } else {
      if (textOrEvent && 'preventDefault' in textOrEvent) {
        textOrEvent.preventDefault();
      }
      userText = inputText.trim();
      setInputText('');
    }

    if (!userText || isLoadingApi) return;

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
          followUps: extractFollowUpOptions(answerText),
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
    <div className="w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Main 2-Column Static Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch h-full w-full flex-1 min-h-0 overflow-hidden">

        {/* LEFT COLUMN: Fixed Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3.5 h-full overflow-hidden min-h-0">

          {/* New Study Session Button */}
          <button
            onClick={handleCreateNewInquiry}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#f3cfba] to-[#eec0a5] hover:from-[#fae3d5] hover:to-[#f5cca8] text-[#5e4334] font-extrabold text-[15px] shadow-sm hover:shadow-md flex items-center justify-between transition-all cursor-pointer shrink-0 border border-[#e5beaa]"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[22px]">add_circle</span>
              <span>New Study Session</span>
            </div>
            <span className="text-[12px] font-bold text-[#5e4334] bg-white/70 px-2.5 py-1 rounded-lg shadow-2xs">
              Start
            </span>
          </button>

          {/* Search Input Box */}
          <div className="relative flex items-center shrink-0">
            <span className="material-symbols-outlined absolute left-4 text-[#81756e] text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search chapters, sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-[#ede7df] text-[14px] text-[#1d1b17] placeholder:text-[#998b81] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#745948]/20 focus:border-[#745948] transition-all"
            />
          </div>

          {/* Active Context Sources Container */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white shadow-sm border border-[#ede7df] flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-black uppercase tracking-wider text-[#745948] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#745948]"></span>
                Attached Course Sources
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f9f3eb] text-[12px] font-extrabold text-[#745948] border border-[#ede7df]">
                {activeSources.length} Attached
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
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
                      className="p-3 rounded-2xl bg-[#fbf8f5] flex items-center justify-between group hover:bg-[#f4ece3] border border-[#ede7df]/60 hover:border-[#dfb59d] transition-all cursor-pointer shadow-2xs"
                      title="Click to view full source document"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl ${badgeColor} flex items-center justify-center shrink-0 shadow-2xs`}>
                          <span className="material-symbols-outlined text-[18px]">{icon}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] sm:text-[14px] font-bold text-[#1d1b17] truncate" title={source.title}>
                            {source.title}
                          </span>
                          <span className="text-[11px] text-[#4f453f] uppercase font-semibold flex items-center gap-1">
                            {source.source_type ? `${source.source_type.toUpperCase()} • Click to view` : 'Active'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[17px] text-[#81756e] group-hover:text-[#745948] transition-colors" title="View file">
                          visibility
                        </span>
                        <button
                          onClick={(e) => handleDeleteSource(source.id, e)}
                          className="text-[#81756e] hover:text-[#ba1a1a] opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                          title="Remove source"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-2xl bg-[#f9f3eb]/60 border border-dashed border-[#ede7df] flex flex-col items-center justify-center text-center gap-1.5 py-5">
                  <span className="material-symbols-outlined text-[24px] text-[#81756e]">
                    auto_stories
                  </span>
                  <span className="text-[13px] font-bold text-[#1d1b17]">
                    No files attached to this session
                  </span>
                  <span className="text-[11px] text-[#81756e]">
                    Click below to upload a textbook or lecture notes.
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
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#745948] to-[#5e4334] hover:from-[#5e4334] hover:to-[#4a3428] text-white text-[13px] sm:text-[14px] font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer mt-1"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Upload Source</span>
            </button>
          </div>

          {/* Previous Study Sessions */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white shadow-sm border border-[#ede7df] flex flex-col gap-3 flex-1 min-h-[160px] overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[13px] font-black uppercase tracking-wider text-[#745948] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">history</span>
                Previous Sessions
              </span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all group ${
                        isActive
                          ? 'bg-gradient-to-r from-[#f3cfba]/50 to-[#fdfbf9] border border-[#e5beaa] shadow-xs'
                          : 'hover:bg-[#f9f3eb] border border-transparent'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[13px] sm:text-[14px] font-bold text-[#1d1b17] truncate" title={conv.title}>
                          {conv.title || 'Study Session'}
                        </span>
                        <span className="text-[11px] text-[#81756e] font-medium">
                          {conv.message_count ? `${conv.message_count} messages` : 'New session'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="text-[#81756e] hover:text-[#ba1a1a] opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Delete session"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-2xl bg-[#f9f3eb]/60 text-center py-5">
                  <span className="text-[12px] text-[#81756e] font-medium">No previous sessions found</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Chat Canvas (Edge-to-Edge, Full Width, Fixed Height, Internal Scroll) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full rounded-3xl bg-white shadow-md border border-[#ede7df] overflow-hidden min-h-0">

          {/* Session Header */}
          <div className="px-6 py-4 border-b border-[#ede7df] flex items-center justify-between shrink-0 bg-[#f9f3eb]/50 backdrop-blur-xs">
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-bold text-[#81756e] uppercase tracking-wider flex items-center gap-2">
                {activeTopic && activeTopic.toLowerCase() !== 'general' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#ede7df] text-[11px] text-[#1d1b17] font-bold border border-[#ded5cb] truncate max-w-[280px]">
                    {activeTopic}
                  </span>
                )}
                <span>• Study Workspace</span>
                {activeSources.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#c0ddd0] text-[#052018] text-[11px] font-bold border border-[#a6cebc] inline-flex items-center gap-1">
                    {activeSources.length} Source{activeSources.length > 1 ? 's' : ''} Attached
                  </span>
                )}
              </span>
              <h1 className="text-[20px] sm:text-[22px] font-black text-[#1d1b17] tracking-tight truncate pt-1">
                {activeTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setShowUploadModal(true);
                  setUploadError(null);
                  setUploadSuccess(null);
                }}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#745948] to-[#5e4334] hover:from-[#5e4334] hover:to-[#4a3428] text-white text-[13px] sm:text-[14px] font-bold flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Upload Source</span>
              </button>
            </div>
          </div>

          {/* Scrollable Chat History Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-7 flex flex-col gap-5 sm:gap-6 min-h-0">
            {messages.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#fbf8f5] to-[#f6efe6] border border-dashed border-[#ede7df] flex flex-col items-center justify-center text-center gap-4 my-auto shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#f3cfba] to-[#eec0a5] text-[#5e4334] flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[30px]">school</span>
                </div>
                <div className="flex flex-col gap-1.5 max-w-lg">
                  <h3 className="text-[20px] sm:text-[22px] font-black text-[#1d1b17] tracking-tight">
                    How can I assist your study today?
                  </h3>
                  <p className="text-[15px] sm:text-[16px] text-[#4f453f] leading-relaxed">
                    Ask any question, formula derivation, or concept explanation from your uploaded materials.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5 justify-center pt-2 max-w-2xl">
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
                      className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#ede7df] text-[14px] font-semibold text-[#4f453f] border border-[#ede7df] shadow-xs hover:shadow-sm transition-all cursor-pointer active:scale-98"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    {msg.sender === 'user' ? (
                      <>
                        <div className="w-7 h-7 rounded-full bg-[#f3cfba] border border-[#e5beaa] flex items-center justify-center text-[12px] font-black text-[#5e4334] shadow-2xs">
                          U
                        </div>
                        <span className="text-[14px] font-black text-[#1d1b17]">You</span>
                      </>
                    ) : (
                      <>
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#745948] to-[#5e4334] text-white flex items-center justify-center text-[13px] shadow-2xs">
                          <span className="material-symbols-outlined text-[16px]">school</span>
                        </div>
                        <span className="text-[14px] font-black text-[#1d1b17]">Tutor</span>
                      </>
                    )}
                    <span className="text-[12px] text-[#81756e] font-medium">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`leading-relaxed transition-all ${
                      msg.sender === 'user'
                        ? 'p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#f9f3eb] via-[#f5ede2] to-[#ede3d5] text-[#1d1b17] text-[16px] sm:text-[17px] border border-[#ede7df] shadow-xs font-normal'
                        : 'p-6 sm:p-7 rounded-3xl bg-white/95 backdrop-blur-xs border border-[#ede7df] text-[16px] sm:text-[17px] text-[#1d1b17] shadow-[0_8px_30px_rgba(116,89,72,0.06)] hover:shadow-[0_12px_36px_rgba(116,89,72,0.09)]'
                    }`}
                  >
                    {msg.sender === 'socratic-guide' ? (
                      <div className="flex flex-col gap-3.5">
                        <MarkdownRenderer
                          content={stripFollowUpOptionsFromText(msg.text)}
                          onCitationClick={(pageNum) => {
                            const matchingCite = msg.citations?.find((c: any) => c.page === pageNum);
                            const docId = matchingCite?.document_id || activeSources[0]?.id;
                            const docTitle = matchingCite?.document_title || activeSources[0]?.title || 'Course Material';
                            openDocumentViewer(docId, pageNum, docTitle);
                          }}
                        />

                        {/* Citations & Source References */}
                        {((msg.citations && msg.citations.length > 0) || (activeSources && activeSources.length > 0)) && (
                          <div className="mt-4 pt-3.5 border-t border-[#ede7df] flex flex-col gap-2">
                            <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#745948] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-[#745948]">
                                menu_book
                              </span>
                              Source References & Citations (Click to view exact page):
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {msg.citations && msg.citations.length > 0 ? (
                                msg.citations.map((cite: any, cIdx: number) => {
                                  const pageNum = cite.page || 1;
                                  const docId = cite.document_id || activeSources[0]?.id;
                                  const title = cite.document_title || cite.source || activeSources[0]?.title || 'Course Material';
                                  return (
                                    <button
                                      key={cIdx}
                                      type="button"
                                      onClick={() => openDocumentViewer(docId, pageNum, title)}
                                      className="px-3 py-1.5 rounded-xl bg-[#fbf8f5] hover:bg-[#f3ebe0] border border-[#ede7df] hover:border-[#745948]/50 text-[11px] sm:text-[12px] text-[#4f453f] hover:text-[#1d1b17] flex items-center gap-1.5 transition-all cursor-pointer group shadow-2xs hover:shadow-xs font-medium"
                                      title={`Click to open source directly at Page ${pageNum}`}
                                    >
                                      <span className="material-symbols-outlined text-[13px] text-[#745948] group-hover:scale-110 transition-transform">
                                        menu_book
                                      </span>
                                      <span className="font-bold text-[#1d1b17] truncate max-w-[200px]">
                                        {title}
                                      </span>
                                      {cite.page && (
                                        <span className="bg-[#ede7df] group-hover:bg-[#dfd4c5] px-1.5 py-0.5 rounded font-black text-[#745948] text-[10px]">
                                          • p. {cite.page}
                                        </span>
                                      )}
                                      {cite.section && (
                                        <span className="text-[#81756e] text-[10px]">
                                          • §{cite.section}
                                        </span>
                                      )}
                                      <span className="material-symbols-outlined text-[12px] text-[#81756e] group-hover:text-[#745948]">
                                        open_in_new
                                      </span>
                                    </button>
                                  );
                                })
                              ) : (
                                activeSources.map((source, sIdx) => (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => openDocumentViewer(source.id, 1, source.title)}
                                    className="px-3 py-1.5 rounded-xl bg-[#fbf8f5] hover:bg-[#f3ebe0] border border-[#ede7df] hover:border-[#745948]/50 text-[11px] sm:text-[12px] text-[#4f453f] hover:text-[#1d1b17] flex items-center gap-1.5 transition-all cursor-pointer group shadow-2xs hover:shadow-xs font-medium"
                                    title="Click to view attached course source"
                                  >
                                    <span className="material-symbols-outlined text-[13px] text-[#745948]">
                                      menu_book
                                    </span>
                                    <span className="font-bold text-[#1d1b17] truncate max-w-[220px]">
                                      {source.title}
                                    </span>
                                    <span className="bg-[#ede7df] px-1.5 py-0.5 rounded font-black text-[#745948] text-[10px]">
                                      • Attached Source
                                    </span>
                                    <span className="material-symbols-outlined text-[12px] text-[#81756e]">
                                      open_in_new
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* Interactive Next Learning Topic Buttons (Vertically Stacked: 1, 2, 3) */}
                        {msg.followUps && msg.followUps.length > 0 && (
                          <div className="mt-5 pt-4 border-t border-[#ede7df] flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] sm:text-[13px] font-black uppercase tracking-wider text-[#745948] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">
                                  {msg.text.toLowerCase().includes('what do you already know') || msg.text.toLowerCase().includes('quick options') || msg.text.toLowerCase().includes('familiar are you') ? 'tune' : 'route'}
                                </span>
                                {msg.text.toLowerCase().includes('what do you already know') || msg.text.toLowerCase().includes('quick options') || msg.text.toLowerCase().includes('familiar are you')
                                  ? 'Quick Options (Click to select):'
                                  : 'Next Learning Steps (Click to start):'}
                              </span>
                              {onNavigateToQuiz && (
                                <button
                                  type="button"
                                  onClick={onNavigateToQuiz}
                                  className="text-[12px] sm:text-[13px] font-bold text-[#745948] hover:text-[#523d2f] flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[#ede7df] transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[15px]">quiz</span>
                                  <span>Practice Quiz</span>
                                </button>
                              )}
                            </div>
                            <div className="flex flex-col gap-2.5 w-full">
                              {msg.followUps.map((topicOpt, fIdx) => (
                                <button
                                  key={fIdx}
                                  type="button"
                                  disabled={isLoadingApi}
                                  onClick={() => handleSendMessage(topicOpt)}
                                  className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-[#fdfbf9] to-[#f9f3eb] hover:from-[#f9e5d9] hover:to-[#f3cfba] text-[#5e4334] hover:text-[#38261c] border border-[#e8dfd5] hover:border-[#dfb59d] font-bold text-[14px] sm:text-[15px] shadow-xs hover:shadow-md flex items-center justify-between gap-3 transition-all cursor-pointer group active:scale-98 disabled:opacity-50 text-left"
                                  title={`Click to select: ${topicOpt}`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="w-6 h-6 rounded-lg bg-[#ede7df] group-hover:bg-[#dfd4c5] text-[#745948] flex items-center justify-center text-[12px] font-black shrink-0">
                                      {fIdx + 1}
                                    </span>
                                    <span className="whitespace-normal break-words">{topicOpt}</span>
                                  </div>
                                  <span className="material-symbols-outlined text-[18px] text-[#81756e] group-hover:text-[#745948] group-hover:translate-x-1 transition-transform shrink-0">
                                    arrow_forward
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{stripFollowUpOptionsFromText(msg.text)}</p>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoadingApi && (
              <div className="flex items-center gap-2.5 text-[14px] font-semibold text-[#745948] p-4 rounded-2xl bg-[#f9f3eb] border border-[#ede7df] animate-pulse">
                <span className="material-symbols-outlined text-[20px] animate-spin text-[#745948]">sync</span>
                <span>Tutor is formulating your step-by-step explanation...</span>
              </div>
            )}

            <div ref={chatBottomRef}></div>
          </div>

          {/* Sticky Bottom Input Bar */}
          <div className="p-4 sm:p-5 border-t border-[#ede7df] bg-white shrink-0">
            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
              <input
                id="chat-input-field"
                type="text"
                placeholder="Ask your tutor a question or tell what you'd like to understand..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-5 py-4 rounded-2xl bg-[#fbf8f5] text-[16px] sm:text-[17px] text-[#1d1b17] border border-[#e8dfd5] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#745948]/25 focus:border-[#745948] placeholder:text-[#998b81] transition-all"
              />
              <button
                type="button"
                onClick={() => setIsRecordingMic(!isRecordingMic)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-colors cursor-pointer shrink-0 ${
                  isRecordingMic
                    ? 'bg-[#ba1a1a] text-white border-[#ba1a1a]'
                    : 'bg-[#f9f3eb] text-[#81756e] border-[#ede7df] hover:text-[#1d1b17] hover:bg-[#ede7df]'
                }`}
                title="Voice input"
              >
                <span className="material-symbols-outlined text-[22px]">mic</span>
              </button>
              <button
                type="submit"
                disabled={!inputText.trim() || isLoadingApi}
                className={`px-7 py-3.5 sm:py-4 rounded-2xl font-black text-[15px] sm:text-[16px] flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  !inputText.trim() || isLoadingApi
                    ? 'bg-[#ede7df] text-[#81756e] cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#745948] to-[#5e4334] hover:from-[#5e4334] hover:to-[#4a3428] text-white shadow-md hover:shadow-lg active:scale-98'
                }`}
                title="Send question"
              >
                <span>Send</span>
                <span className="material-symbols-outlined text-[20px]">send</span>
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
              <object
                key={`${viewerState.documentId}-${viewerState.page}`}
                data={`/api/documents/${viewerState.documentId}/file#page=${viewerState.page}`}
                type="application/pdf"
                className="w-full h-full border-0"
              >
                <iframe
                  src={`/api/documents/${viewerState.documentId}/file#page=${viewerState.page}`}
                  className="w-full h-full border-0"
                  title={`PDF Viewer for ${viewerState.documentTitle}`}
                />
              </object>
            </div>
          </div>
        </div>
      )}

      {/* Socratic Hint Ladder Modal */}
      {hintLadderState.isOpen && (
        <SocraticHintLadderModal
          isOpen={hintLadderState.isOpen}
          onClose={() => setHintLadderState({ isOpen: false, problemText: '' })}
          conversationId={activeConvId || 'default_conv'}
          initialProblemText={hintLadderState.problemText}
          onCitationClick={(pageNum) => {
            const docId = activeSources[0]?.id;
            const docTitle = activeSources[0]?.title || 'Course Material';
            openDocumentViewer(docId, pageNum, docTitle);
          }}
        />
      )}
    </div>
  );
};
