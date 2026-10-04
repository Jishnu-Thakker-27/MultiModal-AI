import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Send, 
  FileText, 
  Sparkles, 
  UploadCloud, 
  BookOpen, 
  HelpCircle, 
  CheckCircle2, 
  ExternalLink, 
  Layers, 
  Paperclip, 
  X,
  FileCode,
  Video,
  FileCheck,
  Brain,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  postConversationChat, 
  uploadSourceToConversation, 
  getConversationDetails,
  createConversation
} from '../services/api';
import MarkdownRenderer from '../components/common/MarkdownRenderer';

const SUGGESTED_PROMPTS = [
  { topic: "Digital Fundamentals", text: "Explain binary number conversion with a clear step-by-step example." },
  { topic: "Digital Fundamentals", text: "What is two's complement and how is subtraction performed using it?" },
  { topic: "Probability", text: "Explain Bayes' Theorem and when conditional probability applies." },
  { topic: "Data Structures", text: "Teach me how AVL tree rotations maintain balanced height." },
];

export default function ChatPage({ 
  currentConversation, 
  selectedCourse,
  onSelectConversation, 
  onConversationUpdated,
  onNewChat 
}) {
  const [messages, setMessages] = useState([]);
  const [sources, setSources] = useState([]);
  const [topicName, setTopicName] = useState('');
  const [title, setTitle] = useState('');
  
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [showConceptMapModal, setShowConceptMapModal] = useState(false);
  const [conceptMapData, setConceptMapData] = useState([]);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load conversation details whenever currentConversation changes
  useEffect(() => {
    if (currentConversation?.id) {
      loadDetails(currentConversation.id);
    } else {
      setMessages([]);
      setSources([]);
      setTopicName('');
      setTitle('New Learning Session');
    }
  }, [currentConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isUploading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const deduplicateMessages = (msgList) => {
    const seenIds = new Set();
    const seenContent = new Set();
    return msgList.filter(msg => {
      if (msg.id && seenIds.has(msg.id)) return false;
      if (msg.id) seenIds.add(msg.id);
      
      const contentKey = `${msg.role}:${(msg.content || '').trim()}`;
      if (seenContent.has(contentKey)) return false;
      seenContent.add(contentKey);
      return true;
    });
  };

  const loadDetails = async (id) => {
    try {
      const details = await getConversationDetails(id);
      setMessages(deduplicateMessages(details.messages || []));
      setSources(details.sources || []);
      setTopicName(details.topic_name || '');
      setTitle(details.title || 'Learning Session');
    } catch (err) {
      console.error("Failed to load conversation details", err);
    }
  };

  const handleSend = async (customText = null) => {
    const rawQuery = customText || inputQuery;
    let query = rawQuery.trim();
    
    // If no query text provided but files attached, default query to document summary
    if (!query && attachedFiles.length > 0) {
      query = "Summarize the key concepts and topics covered in this uploaded material.";
    }

    if (!query && attachedFiles.length === 0) return;

    let activeConvId = currentConversation?.id;
    
    setIsLoading(true);

    try {
      // 1. If no conversation exists yet, create one first!
      if (!activeConvId) {
        const firstFileName = attachedFiles.length > 0 ? attachedFiles[0].name : query;
        const newConv = await createConversation({
          title: firstFileName.slice(0, 35) + (firstFileName.length > 35 ? '...' : ''),
          course_id: selectedCourse?.id || 'default_course',
          topic_name: 'General'
        });
        activeConvId = newConv.id;
        if (onSelectConversation) onSelectConversation(newConv);
      }

      // 2. Upload any pending attached files first
      if (attachedFiles.length > 0) {
        setIsUploading(true);
        setUploadProgressMsg('Indexing uploaded PDF/document pages and generating vector embeddings...');
        for (const file of attachedFiles) {
          await uploadSourceToConversation(activeConvId, file);
        }
        setAttachedFiles([]);
        setIsUploading(false);
        setUploadProgressMsg('');
      }

      // 3. Add optimistic user message to local stream
      const tempUserMsgId = `temp-user-${Date.now()}`;
      const userMsg = {
        id: tempUserMsgId,
        role: 'user',
        content: query,
        created_at: new Date().toISOString()
      };
      setMessages(prev => deduplicateMessages([...prev, userMsg]));
      setInputQuery('');

      // 4. Send chat to API (isolated strictly to activeConvId scope)
      await postConversationChat(activeConvId, query);
      
      // 5. Fetch canonical DB message list directly from backend
      await loadDetails(activeConvId);
      if (onConversationUpdated) onConversationUpdated();
    } catch (err) {
      console.error("Failed to send chat", err);
      setMessages(prev => deduplicateMessages([
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "Sorry, I encountered an error retrieving answers. Please ensure your backend server is active.",
          citations: [],
          created_at: new Date().toISOString()
        }
      ]));
    } finally {
      setIsLoading(false);
      setIsUploading(false);
      setUploadProgressMsg('');
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsUploading(true);
    setUploadProgressMsg(`Uploading ${files[0].name}...`);

    let activeConvId = currentConversation?.id;

    try {
      // If no active session, create a new session automatically for the uploaded file
      if (!activeConvId) {
        const newConv = await createConversation({
          title: files[0].name.slice(0, 35) + (files[0].name.length > 35 ? '...' : ''),
          course_id: selectedCourse?.id || 'default_course',
          topic_name: 'General'
        });
        activeConvId = newConv.id;
        if (onSelectConversation) onSelectConversation(newConv);
      }

      for (const f of files) {
        setUploadProgressMsg(`Extracting text, tables & chunking ${f.name}...`);
        await uploadSourceToConversation(activeConvId, f);
      }

      // Mark upload as complete immediately so user sees the document is ready
      setIsUploading(false);
      setUploadProgressMsg('');
      await loadDetails(activeConvId);
      if (onConversationUpdated) onConversationUpdated();

      // Trigger automatic initial summary explanation query as a standard chat message
      const overviewQuery = "Provide an overview of the main topics and key concepts in this uploaded document.";
      setIsLoading(true);
      setMessages(prev => [
        ...prev,
        {
          id: 'temp-' + Date.now(),
          role: 'user',
          content: overviewQuery,
          created_at: new Date().toISOString()
        }
      ]);

      try {
        await postConversationChat(activeConvId, overviewQuery);
        await loadDetails(activeConvId);
      } catch (chatErr) {
        console.error("Initial summary generation notice:", chatErr);
        // Refresh details to ensure whatever state exists is synced
        await loadDetails(activeConvId);
      } finally {
        setIsLoading(false);
      }

    } catch (err) {
      console.error("Failed to upload source", err);
      alert(`Upload failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsUploading(false);
      setIsLoading(false);
      setUploadProgressMsg('');
      if (e.target) e.target.value = null;
    }
  };

  const removePendingFile = (idx) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F7F3ED] text-[#2D3748] relative overflow-hidden">
      
      {/* Top Conversation Bar */}
      <div className="h-16 px-6 border-b border-[#E2D9CC] bg-[#FFFDF9]/90 backdrop-blur-md flex items-center justify-between shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] border border-[#70C1B3]/30 flex items-center justify-center text-[#399283] shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm sm:text-base text-[#2D3748] truncate">
              {title || 'New Learning Session'}
            </h2>
            {topicName && (
              <span className="text-[11px] font-medium text-[#718096] flex items-center gap-1">
                <span>Topic:</span>
                <span className="text-[#399283] font-semibold">{topicName}</span>
              </span>
            )}
          </div>
        </div>

        {/* Source Context & Concept Map Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={async () => {
              if (currentConversation?.course_id) {
                try {
                  const { getCourseConceptMap } = await import('../services/api');
                  const mapData = await getCourseConceptMap(currentConversation.course_id);
                  setConceptMapData(mapData || []);
                } catch (e) {
                  console.error(e);
                }
              }
              setShowConceptMapModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E6F4F1] border border-[#70C1B3]/40 text-xs font-bold text-[#399283] hover:bg-[#D3EFEA] transition cursor-pointer shadow-2xs"
            title="View Course Concept Taxonomy & Prerequisite Map"
          >
            <Brain className="w-3.5 h-3.5 text-[#399283]" />
            <span className="hidden md:inline">Concept Map</span>
          </button>

          <button
            onClick={() => setShowSourcesModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFFDF9] border border-[#E2D9CC] text-xs font-semibold text-[#4A5568] hover:bg-[#F0EAE1] hover:border-[#70C1B3]/50 transition shadow-2xs cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-[#399283]" />
            <span>{sources.length} {sources.length === 1 ? 'Source' : 'Sources'}</span>
            <span className="w-2 h-2 rounded-full bg-[#399283]" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#48A999] hover:bg-[#399283] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Source</span>
          </button>
        </div>
      </div>

      {/* Main Conversation Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {messages.length === 0 && !isUploading ? (
          /* Welcome Empty State */
          <div className="max-w-3xl mx-auto py-12 flex flex-col items-center text-center space-y-8 animate-fade-in">
            
            {/* Friendly Badge & Header */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E6F4F1] border border-[#70C1B3]/30 text-[#399283] text-xs font-semibold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Personalized Source-Grounded Tutor</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2D3748] tracking-tight leading-tight">
                What would you like to learn today?
              </h1>
              
              <p className="text-sm sm:text-base text-[#718096] max-w-xl mx-auto">
                Ask a question, upload your course textbook or lecture slides, and learn from isolated, source-grounded material.
              </p>
            </div>

            {/* Quick Action Upload Card */}
            <div className="w-full max-w-xl p-6 rounded-2xl bg-[#FFFDF9] border border-[#E2D9CC] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FDF1EA] border border-[#F2A679]/40 flex items-center justify-center text-[#F2A679] shrink-0">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#2D3748]">Upload Study Material</h3>
                  <p className="text-xs text-[#718096]">PDF Textbooks, PPTX Slides, or Lecture Videos</p>
                </div>
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#48A999] hover:bg-[#399283] text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
              >
                Upload Source
              </button>
            </div>

            {/* Suggested Prompts */}
            <div className="w-full max-w-2xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0]">
                Suggested Topics to Explore
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt.text)}
                    className="p-4 rounded-2xl bg-[#FFFDF9] hover:bg-[#FFFFFF] border border-[#E2D9CC] hover:border-[#70C1B3]/50 text-left transition shadow-2xs hover:shadow-sm space-y-1.5 group cursor-pointer"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#399283] px-2 py-0.5 rounded-md bg-[#E6F4F1] inline-block">
                      {prompt.topic}
                    </span>
                    <p className="text-xs font-semibold text-[#2D3748] group-hover:text-[#399283] transition">
                      "{prompt.text}"
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Message History */
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 animate-fade-in ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-[#E6F4F1] border border-[#70C1B3]/30 flex items-center justify-center text-[#399283] shrink-0 mt-1 shadow-2xs">
                    <Brain className="w-4 h-4" />
                  </div>
                )}

                <div className={`space-y-3 max-w-[85%] sm:max-w-[80%]`}>
                  {/* Message Bubble */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#48A999] text-white rounded-br-none shadow-xs font-medium'
                        : 'bg-[#FFFDF9] text-[#2D3748] border border-[#E2D9CC] rounded-bl-none shadow-2xs'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {/* Sources / Citations */}
                  {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[#F0EAE1]/70 border border-[#E2D9CC] space-y-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#718096] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#399283]" />
                        Source Citations
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.citations.map((cit, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FFFDF9] border border-[#E2D9CC] text-xs text-[#2D3748] font-medium shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#399283]" />
                            <span>{cit.document_title}</span>
                            <span className="text-[#718096] font-semibold">
                              {cit.page ? `· Page ${cit.page}` : cit.slide ? `· Slide ${cit.slide}` : cit.start_time ? `· ${cit.start_time}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-[#FDF1EA] border border-[#F2A679]/40 flex items-center justify-center text-[#F2A679] shrink-0 mt-1 shadow-2xs">
                    <span className="text-xs font-extrabold">S</span>
                  </div>
                )}
              </div>
            ))}

            {isUploading && (
              <div className="flex gap-4 items-center animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-[#FDF1EA] border border-[#F2A679]/40 flex items-center justify-center text-[#F2A679]">
                  <UploadCloud className="w-4 h-4 animate-bounce" />
                </div>
                <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E2D9CC] text-xs text-[#2D3748] font-semibold flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-[#399283] animate-spin" />
                  <span>{uploadProgressMsg || 'Uploading and processing document...'}</span>
                </div>
              </div>
            )}

            {isLoading && !isUploading && (
              <div className="flex gap-4 items-center animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-[#E6F4F1] border border-[#70C1B3]/30 flex items-center justify-center text-[#399283]">
                  <Brain className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E2D9CC] text-xs text-[#718096] font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#399283] animate-ping" />
                  Analyzing document sources & generating grounded response...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Composer Area */}
      <div className="p-4 sm:p-6 bg-[#F7F3ED] shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          
          {/* Pending attached files indicator inside composer */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2 py-1">
              {attachedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F4F1] border border-[#70C1B3]/40 text-xs font-semibold text-[#399283] shadow-2xs"
                >
                  <Paperclip className="w-3 h-3" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button
                    onClick={() => removePendingFile(idx)}
                    className="hover:text-red-500 transition cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main Floating Input Container */}
          <div className="pastel-card p-2 sm:p-3 flex items-end gap-2 shadow-sm border-[#E2D9CC] focus-within:border-[#70C1B3] transition">
            
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept=".pdf,.pptx,.ppt,.mp4,.mov"
            />

            {/* Upload Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2.5 rounded-xl bg-[#F0EAE1] hover:bg-[#E2D9CC] text-[#4A5568] transition cursor-pointer shrink-0 disabled:opacity-50"
              title="Attach study material (PDF, PPTX, Video)"
            >
              <Paperclip className="w-4 h-4 text-[#399283]" />
            </button>

            {/* Input Textarea */}
            <textarea
              rows={1}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask anything about your uploaded study material..."
              className="flex-1 bg-transparent border-0 text-sm text-[#2D3748] placeholder-[#A0AEC0] focus:ring-0 focus:outline-none resize-none py-2 px-1 max-h-32"
            />

            {/* Send Action Button */}
            <button
              onClick={() => handleSend()}
              disabled={isLoading || isUploading || (!inputQuery.trim() && attachedFiles.length === 0)}
              className={`p-3 rounded-xl font-bold transition flex items-center justify-center shrink-0 cursor-pointer ${
                (inputQuery.trim() || attachedFiles.length > 0) && !isLoading && !isUploading
                  ? 'bg-[#48A999] hover:bg-[#399283] text-white shadow-xs'
                  : 'bg-[#E2D9CC] text-[#A0AEC0] cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#A0AEC0] px-2 font-medium">
            <span>Context scope: Active conversation sources strictly isolated</span>
            <span>Multimodal Track D</span>
          </div>
        </div>
      </div>

      {/* Active Sources Modal */}
      {showSourcesModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="pastel-card w-full max-w-lg p-6 space-y-4 animate-fade-in bg-[#FFFDF9]">
            <div className="flex items-center justify-between border-b border-[#E2D9CC] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#399283]" />
                <h3 className="font-bold text-base text-[#2D3748]">Conversation Sources</h3>
              </div>
              <button
                onClick={() => setShowSourcesModal(false)}
                className="p-1 rounded-lg hover:bg-[#F0EAE1] text-[#718096]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sources.length === 0 ? (
              <div className="py-8 text-center space-y-3 text-[#718096]">
                <AlertCircle className="w-8 h-8 text-[#F2A679] mx-auto" />
                <p className="text-sm font-semibold">No sources attached to this conversation yet.</p>
                <p className="text-xs text-[#A0AEC0]">Upload a PDF, PPTX, or Video file to enable source-grounded retrieval.</p>
                <button
                  onClick={() => {
                    setShowSourcesModal(false);
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#48A999] text-white text-xs font-bold"
                >
                  Upload Source Now
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {sources.map((src) => (
                  <div
                    key={src.id}
                    className="p-3 rounded-xl bg-[#F0EAE1]/60 border border-[#E2D9CC] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E6F4F1] flex items-center justify-center text-[#399283]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#2D3748] truncate max-w-[220px]">
                          {src.title}
                        </h4>
                        <span className="text-[10px] font-semibold text-[#718096] uppercase">
                          {src.source_type}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#399283] px-2 py-0.5 rounded-full bg-[#E6F4F1]">
                      Active Context
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSourcesModal(false)}
                className="px-4 py-2 rounded-xl bg-[#F0EAE1] hover:bg-[#E2D9CC] text-xs font-bold text-[#2D3748]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Concept Map Modal */}
      {showConceptMapModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="pastel-card w-full max-w-2xl p-6 space-y-4 animate-fade-in bg-[#FFFDF9] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E2D9CC] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#399283]" />
                <h3 className="font-bold text-base text-[#2D3748]">Course Concept Taxonomy & Prerequisite Map</h3>
              </div>
              <button
                onClick={() => setShowConceptMapModal(false)}
                className="p-1 rounded-lg hover:bg-[#F0EAE1] text-[#718096]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {conceptMapData.length === 0 ? (
                <div className="py-8 text-center space-y-3 text-[#718096]">
                  <Sparkles className="w-8 h-8 text-[#399283] mx-auto" />
                  <p className="text-sm font-semibold">No concept graph generated for this course yet.</p>
                  <p className="text-xs text-[#A0AEC0]">Upload a textbook or lecture slides to automatically build the educational concept map.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conceptMapData.map((node) => (
                    <div
                      key={node.id}
                      className="p-4 rounded-xl bg-[#F0EAE1]/60 border border-[#E2D9CC] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            node.concept_type === 'definition' ? 'bg-[#E6F4F1] text-[#399283]' : node.concept_type === 'operation' ? 'bg-[#FDF1EA] text-[#F2A679]' : 'bg-[#EBF3FA] text-[#7EB0D5]'
                          }`}>
                            {node.concept_type}
                          </span>
                          <h4 className="text-xs font-bold text-[#2D3748]">{node.name}</h4>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          node.mastery_score >= 70 ? 'bg-[#E6F4F1] text-[#399283]' : 'bg-[#FDF1EA] text-[#F2A679]'
                        }`}>
                          {node.mastery_score}% Mastery
                        </span>
                      </div>

                      {node.description && (
                        <p className="text-xs text-[#718096] italic leading-relaxed">{node.description}</p>
                      )}

                      {node.prerequisites && node.prerequisites.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[#718096] font-semibold pt-1">
                          <span>Requires Prerequisite:</span>
                          {node.prerequisites.map((p, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-[#FFFDF9] border border-[#E2D9CC] text-[#2D3748]">
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end shrink-0 border-t border-[#E2D9CC]">
              <button
                onClick={() => setShowConceptMapModal(false)}
                className="px-4 py-2 rounded-xl bg-[#F0EAE1] hover:bg-[#E2D9CC] text-xs font-bold text-[#2D3748]"
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
