import React, { useState, useEffect, useRef } from 'react';
import { DialogueMessage, ScreenType } from '../types';
import { initialDialogue, currentUser } from '../data/mockData';
import MarkdownRenderer from './common/MarkdownRenderer';
import { postConversationChat, createConversation, getConversations, getConversationDetails, uploadSourceToConversation } from '../services/api';

interface TutorWorkspaceProps {
  onNavigateToQuiz?: () => void;
  onNavigateToSources?: () => void;
}

export const TutorWorkspace: React.FC<TutorWorkspaceProps> = ({
  onNavigateToQuiz,
  onNavigateToSources,
}) => {
  const [messages, setMessages] = useState<DialogueMessage[]>(initialDialogue);
  const [inputText, setInputText] = useState('');
  const [learningRate, setLearningRate] = useState<number>(0.035);
  const [checkpointSelection, setCheckpointSelection] = useState<string | null>(null);
  const [inspectedNode, setInspectedNode] = useState<string>('w1');
  const [isPlayingAudioRecap, setIsPlayingAudioRecap] = useState(false);
  const [isPlayingVoiceNote, setIsPlayingVoiceNote] = useState(false);
  const [voiceNoteSeconds, setVoiceNoteSeconds] = useState(0);
  const [showPedagogyStrategy, setShowPedagogyStrategy] = useState(false);
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [showHighResSlide, setShowHighResSlide] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [pedagogyTone, setPedagogyTone] = useState('Intuitive Analogy');
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Handle voice note simulated playback
  useEffect(() => {
    let timer: any = null;
    if (isPlayingVoiceNote) {
      timer = setInterval(() => {
        setVoiceNoteSeconds((prev) => {
          if (prev >= 38) {
            setIsPlayingVoiceNote(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayingVoiceNote]);

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  useEffect(() => {
    // Check if any existing conversation is available on backend
    getConversations()
      .then((convs) => {
        if (convs && convs.length > 0) {
          setActiveConvId(convs[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText;
    setInputText('');

    const newMsg: DialogueMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: 'Just now',
      text: userText,
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsLoadingApi(true);

    try {
      let convId = activeConvId;
      if (!convId) {
        const newConv = await createConversation({
          title: userText.slice(0, 30),
          course_id: 'default_course',
          topic_name: 'General',
        });
        convId = newConv.id;
        setActiveConvId(convId);
      }

      const res = await postConversationChat(convId, userText);
      const answerText = res?.answer || res?.content || (typeof res === 'string' ? res : '');

      if (answerText) {
        const guideMsg: DialogueMessage = {
          id: `msg-guide-${Date.now()}`,
          sender: 'socratic-guide',
          timestamp: 'Just now',
          text: answerText,
          followUps: [
            'Quiz me on this concept',
            'Explore concrete numerical example',
            'Derive mathematical gradient',
          ],
        };
        setMessages((prev) => [...prev, guideMsg]);
      } else {
        throw new Error('No answer returned');
      }
    } catch {
      // Graceful fallback to interactive Socratic studio prompt
      const guideMsg: DialogueMessage = {
        id: `msg-guide-${Date.now()}`,
        sender: 'socratic-guide',
        timestamp: 'Just now',
        text: `You've asked a perceptive question: "${userText}". Let's decompose this through Socratic induction: What happens to the error surface if we hold all parameters fixed except the local activation gate? Notice that the loss landscape curves more sharply along high-frequency directions.`,
        followUps: [
          'Quiz me on this concept',
          'Explore concrete numerical example',
          'Derive mathematical gradient',
        ],
      };
      setMessages((prev) => [...prev, guideMsg]);
    } finally {
      setIsLoadingApi(false);
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getDescentStatus = (eta: number) => {
    if (eta < 0.015) {
      return {
        label: 'Slow Crawl (Undershooting)',
        color: 'text-[#4a6171] bg-[#cbe3f6]/60 ',
        note: 'Requires 10,000+ epochs to escape the plateau.',
      };
    } else if (eta <= 0.055) {
      return {
        label: 'Balanced Convergence (Optimal)',
        color: 'text-[#496459] bg-[#c0ddd0]/60 ',
        note: 'Smoothly rolls into the global minimum trough.',
      };
    } else {
      return {
        label: 'Oscillation & Chaos (Overshoot & Divergence)',
        color: 'text-[#ba1a1a] bg-[#ffdad6]/60 ',
        note: 'Steps leap past the valley floor and explode up opposing walls.',
      };
    }
  };

  const descentStatus = getDescentStatus(learningRate);

  return (
    <div className="w-full pb-16">
      {/* Sub-header status bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-2 mb-6 rounded-2xl bg-[#ede7df]/40  text-[12px] text-[#4f453f] ">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#496459] animate-pulse"></span>
          <span>Cognitive Flow Active • Socratic Scaffold Mode v4.2</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#745948]">psychology</span>
            Pedagogy: Guided Induction
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#496459]">trending_up</span>
            Retain Rate: 91.4%
          </span>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Sidebar (New Inquiry, Context Sources, Dialogues, Fatigue Gauge) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* New Learning Inquiry Button */}
          <button
            onClick={() => {
              setInputText('');
              const el = document.getElementById('chat-input-field');
              el?.focus();
            }}
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
              placeholder="Search concepts, slides, transcript notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white  border border-[#ede7df]/80  text-[13px] text-[#1d1b17]  placeholder:text-[#81756e] shadow-[inset_0_1.5px_3px_rgba(175,160,147,0.15)] focus:outline-none focus:ring-2 focus:ring-[#745948]/30"
            />
            <span className="material-symbols-outlined absolute right-3 text-[#81756e] text-[16px] cursor-pointer">
              tune
            </span>
          </div>

          {/* Active Context Sources Container */}
          <div className="p-5 rounded-[2rem] bg-white  shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80  flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#4f453f]  flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f3cfba]"></span>
                Active Context Sources
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#f9f3eb]  text-[11px] font-bold text-[#745948]">
                3 Linked
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Source 1 */}
              <div className="p-3 rounded-xl bg-[#f9f3eb]  flex items-center justify-between shadow-[inset_0_1px_2px_rgba(175,160,147,0.15)] group cursor-pointer hover:bg-[#ede7df]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#f3cfba]/60 flex items-center justify-center text-[#725746] shrink-0">
                    <span className="material-symbols-outlined text-[17px]">slideshow</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold text-[#1d1b17]  truncate">
                      Lecture_Slide_Deck_Wk4.pptx
                    </span>
                    <span className="text-[11px] text-[#4f453f]  truncate">
                      Slide 14 of 24 • Chain Rule Visual
                    </span>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#496459] shrink-0"></span>
              </div>

              {/* Source 2 */}
              <div className="p-3 rounded-xl bg-[#f9f3eb]  flex items-center justify-between shadow-[inset_0_1px_2px_rgba(175,160,147,0.15)] group cursor-pointer hover:bg-[#ede7df]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#cbe3f6]/60 flex items-center justify-center text-[#4f6576] shrink-0">
                    <span className="material-symbols-outlined text-[17px]">smart_display</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold text-[#1d1b17]  truncate">
                      Intro_to_Neural_Nets.mp4
                    </span>
                    <span className="text-[11px] text-[#4f453f]  truncate">
                      Timestamp 18:24 • Prof. Chen
                    </span>
                  </div>
                </div>
              </div>

              {/* Source 3 */}
              <div className="p-3 rounded-xl bg-[#f9f3eb]  flex items-center justify-between shadow-[inset_0_1px_2px_rgba(175,160,147,0.15)] group cursor-pointer hover:bg-[#ede7df]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#c0ddd0]/60 flex items-center justify-center text-[#486258] shrink-0">
                    <span className="material-symbols-outlined text-[17px]">menu_book</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold text-[#1d1b17]  truncate">
                      Deep_Learning_Goodfellow_Ch6.pdf
                    </span>
                    <span className="text-[11px] text-[#4f453f]  truncate">
                      Pages 168-175 • Computation Graphs
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onNavigateToSources}
              className="w-full mt-1 py-2 px-3 rounded-xl bg-[#ede7df]/60  hover:bg-[#ede7df] text-[12px] font-semibold text-[#4f453f]  flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">add_circle</span>
              <span>Attach New Material</span>
            </button>
          </div>

          {/* Socratic Dialogues History */}
          <div className="p-5 rounded-[2rem] bg-white  shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80  flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#4f453f] ">
                Socratic Dialogues
              </span>
              <span className="material-symbols-outlined text-[16px] text-[#81756e]">history</span>
            </div>

            {/* Today */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#81756e]">
                Today
              </span>
              <div className="p-2.5 rounded-xl bg-[#f3cfba]/30  border border-[#f3cfba]/70 flex items-center justify-between cursor-pointer">
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-[#1d1b17] ">
                    Backpropagation & Descent
                  </span>
                  <span className="text-[10px] text-[#745948] ">
                    9 turns • Active now
                  </span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-[#745948]">chevron_right</span>
              </div>

              <div className="p-2.5 rounded-xl hover:bg-[#f9f3eb]  flex items-center justify-between cursor-pointer transition-colors">
                <div className="flex flex-col">
                  <span className="text-[12px] font-medium text-[#1d1b17] ">
                    Eigenvectors via Geometry
                  </span>
                  <span className="text-[10px] text-[#81756e]">5 turns • 2 hrs ago</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-[#81756e]">chevron_right</span>
              </div>
            </div>

            {/* Yesterday */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[#ede7df]/60 ">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#81756e]">
                Yesterday
              </span>
              <div className="p-2 rounded-lg hover:bg-[#f9f3eb]  flex items-center justify-between cursor-pointer text-[12px] text-[#4f453f] ">
                <span className="truncate">Cross-Entropy Loss Intuition</span>
                <span className="text-[10px] text-[#81756e]">3:40 PM</span>
              </div>
              <div className="p-2 rounded-lg hover:bg-[#f9f3eb]  flex items-center justify-between cursor-pointer text-[12px] text-[#4f453f] ">
                <span className="truncate">Vanishing Gradients in RNNs</span>
                <span className="text-[10px] text-[#81756e]">11:15 AM</span>
              </div>
            </div>
          </div>

          {/* Cognitive Fatigue Gauge */}
          <div className="p-5 rounded-[2rem] bg-white  shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80  flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider">
                Cognitive Fatigue
              </span>
              <span className="text-[14px] font-bold text-[#1d1b17]  pt-0.5">
                Low (Optimal)
              </span>
              <span className="text-[11px] text-[#4f453f] ">
                Ideal for complex proofs
              </span>
            </div>

            <div className="relative w-14 h-14 flex items-center justify-center">
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
          <div className="w-full p-6 sm:p-8 rounded-[2rem] bg-white  shadow-[0_22px_44px_-12px_rgba(195,180,170,0.32),inset_0_2px_4px_rgba(255,255,255,0.95)] border border-[#ede7df]/80  flex flex-col gap-6">
            
            {/* Inquiry Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#ede7df] ">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-[#ede7df]  text-[10px] text-[#1d1b17] ">Applied ML</span>
                  <span>Week 4 • Slide 14</span>
                  <span>• Multimodal Socratic Inquiry</span>
                </span>
                <h1 className="text-[22px] sm:text-[25px] font-bold text-[#1d1b17] ">
                  Understanding Backpropagation & Gradient Descent
                </h1>
              </div>

              {/* Pedagogy Tone Dropdown */}
              <div className="flex items-center gap-2 p-1 pl-3 pr-2 rounded-full bg-[#f9f3eb]  shadow-[inset_0_1.5px_2px_rgba(175,160,147,0.15)] text-[12px]">
                <span className="material-symbols-outlined text-[16px] text-[#745948]">auto_stories</span>
                <span className="text-[#81756e]">Tone:</span>
                <select
                  value={pedagogyTone}
                  onChange={(e) => setPedagogyTone(e.target.value)}
                  className="bg-transparent font-bold text-[#1d1b17]  focus:outline-none cursor-pointer"
                >
                  <option value="Intuitive Analogy">Intuitive Analogy</option>
                  <option value="Socratic First Principles">First Principles</option>
                  <option value="Mathematical Formalism">Mathematical Formalism</option>
                </select>
              </div>
            </div>

            {/* Conversation Stream */}
            <div className="flex flex-col gap-8">
              
              {/* Message 1: Elena's Question with Slide Crop */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      alt={currentUser.name}
                      src={currentUser.avatarUrl}
                      className="w-8 h-8 rounded-full object-cover shadow-sm"
                    />
                    <span className="text-[13px] font-bold text-[#1d1b17] ">
                      Elena Rostova
                    </span>
                    <span className="text-[11px] text-[#81756e]">10:42 AM</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#81756e] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">crop</span>
                    Slide Crop Attached
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#f9f3eb]  shadow-[0_2px_6px_rgba(180,165,150,0.15)] text-[14px] text-[#1d1b17]  leading-relaxed">
                  In slide 14, how do we jump from computing the partial derivative of the final loss <span className="font-mono text-[13px] bg-black/5  px-1 py-0.5 rounded">∂L/∂a</span> to updating the earliest weight <span className="font-mono text-[13px] bg-black/5  px-1 py-0.5 rounded">w₁</span> without having to re-calculate everything from scratch? I understand the chain rule on paper, but the intuition is fuzzy.
                </div>

                {/* Cropped Slide Attachment Card */}
                <div className="p-4 rounded-2xl bg-[#ede7df]/50  border border-[#ede7df]  flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Visual Computation Chain Diagram Mini */}
                    <div className="w-44 h-16 rounded-xl bg-white  p-2 flex items-center justify-between shadow-[inset_0_1px_2px_rgba(175,160,147,0.2)]">
                      <div className="w-7 h-7 rounded-full bg-[#f3cfba] text-[#725746] text-[10px] font-bold flex items-center justify-center">x</div>
                      <span className="text-[10px] text-[#81756e]">→</span>
                      <div className="w-7 h-7 rounded-full bg-[#f3cfba] text-[#725746] text-[10px] font-bold flex items-center justify-center">w₁</div>
                      <span className="text-[10px] text-[#81756e]">→</span>
                      <div className="w-7 h-7 rounded-full bg-[#cbe3f6] text-[#4f6576] text-[10px] font-bold flex items-center justify-center">z</div>
                      <span className="text-[10px] text-[#81756e]">→</span>
                      <div className="w-7 h-7 rounded-full bg-[#c0ddd0] text-[#486258] text-[10px] font-bold flex items-center justify-center">L</div>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-[#1d1b17] ">
                        Cropped: Slide 14 Computation Chain
                      </span>
                      <span className="text-[11px] text-[#81756e]">
                        Contains multi-layer nodes z = w·x + b leading to BCELoss.
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowHighResSlide(true)}
                    className="px-3 py-1.5 rounded-full bg-white  text-[#4f453f]  hover:text-[#1d1b17] text-[11px] font-semibold shadow-[0_2px_4px_rgba(180,165,150,0.2)] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[14px]">zoom_in</span>
                    <span>Inspect High-Res</span>
                  </button>
                </div>
              </div>

              {/* Message 2: Socratic Guide Response with Bucket Analogy & Simulator */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#cbe3f6] text-[#4f6576] flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[17px]">psychology</span>
                    </div>
                    <span className="text-[13px] font-bold text-[#1d1b17] ">
                      Socratic Guide
                    </span>
                    <span className="px-2 py-0.2 rounded-full bg-[#c0ddd0] text-[#052018] text-[10px] font-bold">
                      Active Scaffold
                    </span>
                  </div>
                  <span className="text-[11px] text-[#81756e]">Just now</span>
                </div>

                <div className="p-5 rounded-2xl bg-white  border border-[#ede7df]  shadow-[0_6px_16px_rgba(190,175,160,0.18)] flex flex-col gap-4">
                  <p className="text-[14px] text-[#1d1b17]  leading-relaxed">
                    Brilliant observation, Elena. You've touched the central elegance of deep learning: <strong>Backpropagation doesn't start over; it passes blame backwards along the bucket brigade.</strong>
                  </p>
                  <p className="text-[13px] text-[#4f453f]  leading-relaxed italic">
                    Imagine you are hiking down a foggy mountain peak trying to reach the base cabin. You can't see the whole trail, but under your hiking boot, you can feel the exact slope beneath your feet right now.
                  </p>

                  {/* The 3-Step Bucket Relay Analogy Cards */}
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#81756e] uppercase tracking-wider">
                      <span>The 3-Step Bucket Relay Analogy</span>
                      <span>Slide 14 Alignment</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-[#f9f3eb]  flex flex-col gap-1 shadow-[0_2px_4px_rgba(180,165,150,0.12)]">
                        <div className="flex items-center justify-between">
                          <span className="w-5 h-5 rounded-full bg-[#f3cfba] text-[#725746] text-[11px] font-bold flex items-center justify-center">1</span>
                          <span className="text-[10px] font-bold text-[#ba1a1a]">Loss Signal</span>
                        </div>
                        <span className="text-[12px] font-bold text-[#1d1b17]  pt-1">Target Gap</span>
                        <p className="text-[11px] text-[#4f453f]  leading-relaxed">
                          “We predicted 0.8, but true target was 0.0. We are off by +0.8 units.”
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#f9f3eb]  flex flex-col gap-1 shadow-[0_2px_4px_rgba(180,165,150,0.12)]">
                        <div className="flex items-center justify-between">
                          <span className="w-5 h-5 rounded-full bg-[#cbe3f6] text-[#4f6576] text-[11px] font-bold flex items-center justify-center">2</span>
                          <span className="text-[10px] font-bold text-[#4a6171]">Local Gate</span>
                        </div>
                        <span className="text-[12px] font-bold text-[#1d1b17]  pt-1">Gate Response</span>
                        <p className="text-[11px] text-[#4f453f]  leading-relaxed">
                          “The activation gate says: 'For every tiny nudge I received, I amplified it by 0.5.'”
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#f9f3eb]  flex flex-col gap-1 shadow-[0_2px_4px_rgba(180,165,150,0.12)]">
                        <div className="flex items-center justify-between">
                          <span className="w-5 h-5 rounded-full bg-[#c0ddd0] text-[#486258] text-[11px] font-bold flex items-center justify-center">3</span>
                          <span className="text-[10px] font-bold text-[#496459]">Weight Tweak</span>
                        </div>
                        <span className="text-[12px] font-bold text-[#1d1b17]  pt-1">Knob Twist</span>
                        <p className="text-[11px] text-[#4f453f]  leading-relaxed">
                          “Multiply them together: (0.8 × 0.5 = 0.4). Turn weight w₁ left!”
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Gradient Path Simulator */}
                  <div className="p-4 rounded-2xl bg-[#ede7df]/40  flex flex-col gap-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[#745948]">schema</span>
                        <span className="text-[13px] font-bold text-[#1d1b17] ">
                          Interactive Gradient Path Simulator
                        </span>
                      </div>
                      <button
                        onClick={() => setIsPlayingAudioRecap(!isPlayingAudioRecap)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer ${
                          isPlayingAudioRecap
                            ? 'bg-[#ba1a1a] text-white'
                            : 'bg-white  text-[#4f453f] '
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {isPlayingAudioRecap ? 'stop' : 'play_circle'}
                        </span>
                        <span>{isPlayingAudioRecap ? 'Playing Audio Recap' : 'Play 2-min Spoken Audio Recap'}</span>
                      </button>
                    </div>

                    {/* Nodes Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {[
                        { id: 'w1', name: 'Weight 1', val: '+0.42', sub: 'w₁', formula: '∂L/∂w₁ = -0.168' },
                        { id: 'z', name: 'Pre-activation', val: 'z (Σwx+b)', sub: 'z', formula: '∂L/∂z = -0.40' },
                        { id: 'a', name: 'Activation', val: '0.81 (Sigmoid)', sub: 'a', formula: '∂L/∂a = +1.60' },
                        { id: 'loss', name: 'BCE Loss', val: '1.42', sub: 'Loss', formula: 'L = -[y log a + (1-y)log(1-a)]' },
                      ].map((node) => (
                        <div
                          key={node.id}
                          onClick={() => setInspectedNode(node.id)}
                          className={`p-3 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                            inspectedNode === node.id
                              ? 'bg-white  ring-2 ring-[#745948] shadow-[0_4px_10px_rgba(180,165,150,0.3)]'
                              : 'bg-white/60  hover:bg-white'
                          }`}
                        >
                          <span className="w-7 h-7 rounded-full bg-[#f3cfba] text-[#725746] text-[11px] font-bold flex items-center justify-center mb-1">
                            {node.sub}
                          </span>
                          <span className="text-[12px] font-bold text-[#1d1b17] ">
                            {node.val}
                          </span>
                          <span className="text-[10px] text-[#81756e]">{node.name}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[12px] text-[#4f453f]  flex items-center justify-between pt-1">
                      <span>
                        ← Gradient flow flows left: <strong className="font-mono text-[#745948] ">∂L/∂w₁ = (∂L/∂a) · (∂a/∂z) · (∂z/∂w₁)</strong>
                      </span>
                      <span className="text-[11px] text-[#496459] font-medium">Click node to inspect derivatives</span>
                    </div>
                  </div>

                  {/* Socratic Checkpoint Card */}
                  <div className="p-4 rounded-2xl bg-[#c0ddd0]/30  border border-[#c0ddd0]  flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[#486258]  text-[12px] font-bold">
                      <span className="material-symbols-outlined text-[16px]">quiz</span>
                      <span>Socratic Checkpoint: Predict the Outcome</span>
                    </div>
                    <p className="text-[13px] text-[#1d1b17]  leading-relaxed">
                      If the neuron is highly confident but completely wrong (e.g., predicted a = 1.0 when label was y = 0), does the Sigmoid derivative make the update step faster or cause it to saturate and stall?
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setCheckpointSelection('opt-1')}
                        className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                          checkpointSelection === 'opt-1'
                            ? 'bg-[#496459] text-white shadow-md'
                            : 'bg-white  text-[#1d1b17]  hover:bg-[#ede7df]'
                        }`}
                      >
                        It stalls (Vanishing Gradient)
                      </button>
                      <button
                        onClick={() => setCheckpointSelection('opt-2')}
                        className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                          checkpointSelection === 'opt-2'
                            ? 'bg-[#496459] text-white shadow-md'
                            : 'bg-white  text-[#1d1b17]  hover:bg-[#ede7df]'
                        }`}
                      >
                        The loss gradient cancels it out perfectly
                      </button>
                      <button
                        onClick={() => setCheckpointSelection('opt-3')}
                        className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                          checkpointSelection === 'opt-3'
                            ? 'bg-[#496459] text-white shadow-md'
                            : 'bg-white  text-[#1d1b17]  hover:bg-[#ede7df]'
                        }`}
                      >
                        Show me the algebraic derivation
                      </button>
                    </div>

                    {checkpointSelection && (
                      <div className="p-3 rounded-xl bg-white  text-[12px] text-[#1d1b17]  shadow-sm flex items-start gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#496459] shrink-0 mt-0.5">check_circle</span>
                        <div>
                          {checkpointSelection === 'opt-1' && (
                            <span>Correct insight! In Sigmoid networks using Mean Squared Error, when activation is saturated, the derivative σ'(z) drops to zero, causing the learning step to freeze.</span>
                          )}
                          {checkpointSelection === 'opt-2' && (
                            <span>Only when paired specifically with Cross-Entropy Loss! In that special combination, the denominator in ∂L/∂a cancels out σ'(z).</span>
                          )}
                          {checkpointSelection === 'opt-3' && (
                            <span>Derivation: ∂L/∂z = (∂L/∂a) · σ'(z) = [(a-y)/(a(1-a))] · [a(1-a)] = (a-y). The saturation denominator cancels completely!</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Collapsible Pedagogical Strategy */}
                  <div className="pt-1">
                    <button
                      onClick={() => setShowPedagogyStrategy(!showPedagogyStrategy)}
                      className="text-[12px] font-semibold text-[#81756e] hover:text-[#1d1b17] flex items-center justify-between w-full py-1 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px]">tips_and_updates</span>
                        Pedagogical Strategy Behind This Explanation
                      </span>
                      <span className="material-symbols-outlined text-[16px]">
                        {showPedagogyStrategy ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    {showPedagogyStrategy && (
                      <div className="p-3 rounded-xl bg-[#f9f3eb]  text-[11px] text-[#4f453f]  mt-1 leading-relaxed">
                        Scaffolding begins with physical sensory grounding (bucket brigade), transitions through numerical verification (gradient simulator), and concludes with an active prediction challenge to reinforce long-term recall.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message 3: Elena's Transcribed Voice Note */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      alt={currentUser.name}
                      src={currentUser.avatarUrl}
                      className="w-8 h-8 rounded-full object-cover shadow-sm"
                    />
                    <span className="text-[13px] font-bold text-[#1d1b17] ">
                      Transcribed Voice Note (38s)
                    </span>
                  </div>
                  <span className="text-[11px] text-[#81756e]">10:47 AM</span>
                </div>

                {/* Voice Note Audio Player Pill */}
                <div className="p-4 rounded-2xl bg-[#ede7df]/60  shadow-[inset_0_1.5px_2px_rgba(175,160,147,0.15)] flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlayingVoiceNote(!isPlayingVoiceNote)}
                      className="w-10 h-10 rounded-full bg-[#4a6171] hover:bg-[#3b4e5b] text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {isPlayingVoiceNote ? 'pause' : 'play_arrow'}
                      </span>
                    </button>

                    {/* Animated Audio Waveform */}
                    <div className="flex-1 flex items-center gap-1 h-6">
                      {[12, 24, 18, 28, 14, 20, 26, 16, 22, 12, 30, 24, 18, 26, 14, 20, 10, 16].map((h, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-200 ${
                            isPlayingVoiceNote
                              ? 'bg-[#745948] animate-pulse'
                              : 'bg-[#81756e]/40'
                          }`}
                          style={{ height: `${h}px` }}
                        ></div>
                      ))}
                    </div>

                    <span className="text-[12px] font-mono text-[#81756e] font-semibold">
                      0:{voiceNoteSeconds < 10 ? `0${voiceNoteSeconds}` : voiceNoteSeconds} / 0:38
                    </span>
                  </div>

                  <p className="text-[13px] text-[#4f453f]  italic leading-relaxed">
                    “Wait, so if we take too large a step down the mountain, we will overshoot the valley and end up even higher on the opposite ridge, right? That's what the learning rate parameter η actually controls?”
                  </p>
                </div>
              </div>

              {/* Message 4: Exact Intuition Unlocked & Step Size Simulator */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-bold text-[#1d1b17] ">
                      Exact Intuition Unlocked
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f3cfba] text-[#725746] text-[11px] font-bold">
                      High Mastery Spark
                    </span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white  border border-[#ede7df]  shadow-[0_8px_20px_rgba(190,175,160,0.18)] flex flex-col gap-5">
                  <p className="text-[14px] text-[#1d1b17]  leading-relaxed">
                    Spot on! That is precisely what we call <strong>Overshoot & Divergence</strong>. Try dragging this tactile step-size regulator below to feel how the learning rate changes the descent dynamics:
                  </p>

                  {/* Interactive Step Size Simulator */}
                  <div className="p-5 rounded-2xl bg-[#f9f3eb]  shadow-[inset_0_2px_4px_rgba(175,160,147,0.18)] flex flex-col gap-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[13px] font-bold text-[#1d1b17] ">
                        Step Size Simulator (Learning Rate η = {learningRate.toFixed(3)})
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${descentStatus.color}`}>
                        {descentStatus.label}
                      </span>
                    </div>

                    {/* Interactive Slider */}
                    <div className="flex flex-col gap-2">
                      <input
                        type="range"
                        min="0.001"
                        max="0.250"
                        step="0.001"
                        value={learningRate}
                        onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                        className="w-full h-3 rounded-full bg-[#ede7df]  appearance-none cursor-pointer accent-[#745948]"
                      />
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#81756e]">
                        <span>η = 0.001 (Slow crawl)</span>
                        <span className="font-bold text-[#745948]">η = 0.035 (Optimal)</span>
                        <span>η = 0.25 (Oscillation & Chaos)</span>
                      </div>
                    </div>

                    {/* Animated Descent Trajectory SVG */}
                    <div className="w-full bg-white  rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
                      <div className="w-full max-w-md h-32 relative">
                        <svg className="w-full h-full" viewBox="0 0 300 120">
                          {/* Parabola */}
                          <path d="M 20 20 Q 150 110 280 20" stroke="#745948" strokeWidth="2.5" fill="none" opacity="0.6" />
                          <circle cx="150" cy="110" r="4" fill="#496459" />

                          {/* Dynamic Ball Position based on eta */}
                          {learningRate <= 0.055 ? (
                            <>
                              {/* Converging steps */}
                              <circle cx="50" cy="45" r="5" fill="#f3cfba" stroke="#745948" />
                              <circle cx="95" cy="80" r="5" fill="#f3cfba" stroke="#745948" />
                              <circle
                                cx={150 - (0.055 - learningRate) * 400}
                                cy={110 - (0.055 - learningRate) * 200}
                                r="6"
                                fill="#496459"
                              />
                            </>
                          ) : (
                            <>
                              {/* Overshooting trajectory */}
                              <circle cx="50" cy="45" r="5" fill="#f3cfba" stroke="#745948" />
                              <path d="M 50 45 Q 150 0 250 35" stroke="#ba1a1a" strokeWidth="2" strokeDasharray="3 3" />
                              <circle cx="250" cy="35" r="6" fill="#ba1a1a" />
                              <path d="M 250 35 Q 140 10 30 25" stroke="#ba1a1a" strokeWidth="2" strokeDasharray="3 3" />
                              <circle cx="30" cy="25" r="6" fill="#93000a" />
                            </>
                          )}
                        </svg>
                      </div>
                      <span className="text-[11px] text-[#81756e] italic pt-1">
                        {descentStatus.note}
                      </span>
                    </div>
                  </div>

                  {/* Follow-up Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider">
                      Recommended Follow-ups:
                    </span>
                    <button
                      onClick={onNavigateToQuiz}
                      className="px-3.5 py-1.5 rounded-full bg-[#ede7df] hover:bg-[#e2c0ab] text-[12px] font-semibold text-[#1d1b17] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">quiz</span>
                      <span>Quiz me on slide 14</span>
                    </button>
                    <button
                      onClick={() => setShowFlashcards(true)}
                      className="px-3.5 py-1.5 rounded-full bg-[#ede7df] hover:bg-[#e2c0ab] text-[12px] font-semibold text-[#1d1b17] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">style</span>
                      <span>Summarize to 3 flashcards</span>
                    </button>
                    <button
                      onClick={() => setShowCodeSnippet(!showCodeSnippet)}
                      className="px-3.5 py-1.5 rounded-full bg-[#ede7df] hover:bg-[#e2c0ab] text-[12px] font-semibold text-[#1d1b17] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">code</span>
                      <span>Show Python NumPy code</span>
                    </button>
                  </div>

                  {/* Python NumPy Code Box */}
                  {showCodeSnippet && (
                    <div className="p-4 rounded-xl bg-[#1e1c19] text-[#e8e2da] text-[12px] font-mono leading-relaxed overflow-x-auto shadow-inner">
                      <div className="text-[#81756e] mb-1"># Vectorized 1-Step Backprop Gradient Descent</div>
                      <div>eta = {learningRate.toFixed(3)}</div>
                      <div>dW1 = np.dot(X.T, (A - Y)) / m</div>
                      <div>W1 = W1 - eta * dW1  <span className="text-[#496459]"># Parameter update</span></div>
                      <div className="text-[#cbe3f6] mt-1">print(f"Updated Loss: &#123;loss:.4f&#125;")</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Appended Messages */}
              {messages.slice(4).map((msg) => (
                <div key={msg.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-[#1d1b17] ">
                      {msg.sender === 'user' ? currentUser.name : 'Socratic Guide'}
                    </span>
                    <span className="text-[10px] text-[#81756e]">{msg.timestamp}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#f9f3eb] text-[13px] text-[#1d1b17] leading-relaxed shadow-sm">
                    {msg.sender === 'socratic-guide' ? (
                      <MarkdownRenderer content={msg.text || ''} />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoadingApi && (
                <div className="flex items-center gap-2 text-[12px] text-[#745948] p-3 rounded-xl bg-[#f9f3eb] animate-pulse">
                  <span className="material-symbols-outlined text-[16px] animate-spin">psychology</span>
                  <span>Socratic Guide is synthesizing explanation from your course sources...</span>
                </div>
              )}

              <div ref={chatBottomRef}></div>
            </div>

            {/* Bottom Socratic Prompt Input Box */}
            <div className="sticky bottom-0 pt-4 bg-white/95  backdrop-blur-md border-t border-[#ede7df] ">
              <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                <div className="relative flex items-center">
                  <input
                    id="chat-input-field"
                    type="text"
                    placeholder="Ask SocraticAI a question, request an intuitive metaphor, or critique an equation..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-[#ede7df]/60  text-[14px] text-[#1d1b17]  shadow-[inset_0_2px_4px_rgba(175,160,147,0.2)] focus:outline-none focus:ring-2 focus:ring-[#745948]/30"
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
                      onClick={onNavigateToSources}
                      className="px-3 py-1 rounded-full bg-[#f9f3eb]  hover:bg-[#ede7df] text-[11px] font-semibold text-[#4f453f]  flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">upload_file</span>
                      <span>Upload PDF/PPT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHighResSlide(true)}
                      className="px-3 py-1 rounded-full bg-[#f9f3eb]  hover:bg-[#ede7df] text-[11px] font-semibold text-[#4f453f]  flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">crop</span>
                      <span>Diagram Crop</span>
                    </button>
                    <button
                      type="button"
                      onClick={onNavigateToSources}
                      className="px-3 py-1 rounded-full bg-[#f9f3eb]  hover:bg-[#ede7df] text-[11px] font-semibold text-[#4f453f]  flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">link</span>
                      <span>YouTube/Lecture Link</span>
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

      {/* MODAL 1: High-Res Slide Inspector */}
      {showHighResSlide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-[2rem] bg-white  p-6 shadow-2xl flex flex-col gap-4 border border-[#ede7df]">
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold text-[#1d1b17]  flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#745948]">slideshow</span>
                Slide 14: Computational Chain & Gradients
              </span>
              <button
                onClick={() => setShowHighResSlide(false)}
                className="w-8 h-8 rounded-full bg-[#f9f3eb]  flex items-center justify-center text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="w-full h-80 rounded-2xl bg-[#f9f3eb]  p-6 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="flex items-center justify-between w-full max-w-lg">
                <div className="w-16 h-16 rounded-2xl bg-[#f3cfba] flex flex-col items-center justify-center text-[#725746] font-bold shadow-md">
                  <span className="text-[11px]">Input x</span>
                  <span className="text-[14px]">x₁ = 2.0</span>
                </div>
                <span className="text-[20px] text-[#81756e]">→</span>
                <div className="w-16 h-16 rounded-2xl bg-[#f3cfba] flex flex-col items-center justify-center text-[#725746] font-bold shadow-md">
                  <span className="text-[11px]">Weight</span>
                  <span className="text-[14px]">w₁ = 0.42</span>
                </div>
                <span className="text-[20px] text-[#81756e]">→</span>
                <div className="w-16 h-16 rounded-2xl bg-[#cbe3f6] flex flex-col items-center justify-center text-[#4f6576] font-bold shadow-md">
                  <span className="text-[11px]">Pre-act z</span>
                  <span className="text-[14px]">z = 0.84</span>
                </div>
                <span className="text-[20px] text-[#81756e]">→</span>
                <div className="w-16 h-16 rounded-2xl bg-[#c0ddd0] flex flex-col items-center justify-center text-[#486258] font-bold shadow-md">
                  <span className="text-[11px]">Loss L</span>
                  <span className="text-[14px]">L = 1.42</span>
                </div>
              </div>
              <div className="mt-8 text-[12px] text-[#81756e] font-mono text-center">
                Highlighted Box: Chain of Grips • ∂L/∂w₁ = (∂L/∂a) · (∂a/∂z) · (∂z/∂w₁)
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowHighResSlide(false)}
                className="px-5 py-2 rounded-full bg-[#1d1b17] text-white text-[13px] font-bold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Flashcards Summary */}
      {showFlashcards && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white  p-6 shadow-2xl flex flex-col gap-4 border border-[#ede7df]">
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold text-[#1d1b17]  flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#745948]">style</span>
                3 Key Socratic Flashcards (Slide 14)
              </span>
              <button
                onClick={() => setShowFlashcards(false)}
                className="w-8 h-8 rounded-full bg-[#f9f3eb]  flex items-center justify-center text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#f9f3eb]  flex flex-col justify-between h-48 shadow-sm">
                <span className="text-[11px] font-bold text-[#ba1a1a]">Card 1 • Core Chain Rule</span>
                <p className="text-[12px] font-bold text-[#1d1b17] ">
                  Why not restart derivative calculation at every layer?
                </p>
                <p className="text-[11px] text-[#4f453f] ">
                  Backprop multiplies existing downstream gradients with the immediate local Jacobian.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f9f3eb]  flex flex-col justify-between h-48 shadow-sm">
                <span className="text-[11px] font-bold text-[#4a6171]">Card 2 • Learning Rate η</span>
                <p className="text-[12px] font-bold text-[#1d1b17] ">
                  What causes gradient descent overshooting?
                </p>
                <p className="text-[11px] text-[#4f453f] ">
                  When η &gt; 2 / λ_max, step size exceeds local Taylor series linear curvature bounds.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f9f3eb]  flex flex-col justify-between h-48 shadow-sm">
                <span className="text-[11px] font-bold text-[#496459]">Card 3 • Vanishing Gradients</span>
                <p className="text-[12px] font-bold text-[#1d1b17] ">
                  Why does sigmoid saturate?
                </p>
                <p className="text-[11px] text-[#4f453f] ">
                  Derivative σ'(z) = σ(z)(1-σ(z)) approaches 0 for extreme activations, zeroing out the update.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowFlashcards(false)}
                className="px-5 py-2 rounded-full bg-[#1d1b17] text-white text-[13px] font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
