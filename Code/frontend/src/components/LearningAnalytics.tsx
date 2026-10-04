import React, { useState } from 'react';
import { learningTopics, recentSocraticSessions } from '../data/mockData';

interface LearningAnalyticsProps {
  onResumeSession?: () => void;
  onDrillTopic?: (topicId: string) => void;
}

export const LearningAnalytics: React.FC<LearningAnalyticsProps> = ({
  onResumeSession,
  onDrillTopic,
}) => {
  const [syllabusTab, setSyllabusTab] = useState<'Domain View' | 'Decay Curves' | 'Milestones'>('Domain View');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPlayingQuantumAudio, setIsPlayingQuantumAudio] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const filteredSessions = recentSocraticSessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.sourceDoc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full pb-16">
      {/* Top Banner: Welcome Elena & Cognitive Alert */}
      <section className="w-full mb-8">
        <div className="w-full p-6 sm:p-8 rounded-[2rem] bg-white  shadow-[0_20px_40px_-10px_rgba(195,180,170,0.3),inset_0_2px_4px_rgba(255,255,255,0.95)] border border-[#ede7df]/80  flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f9f3eb]  text-[#4f453f]  text-[12px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#496459]"></span>
                Week 7 of Self-Directed Study
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#c0ddd0]  text-[#052018]  text-[12px] font-bold">
                <span className="material-symbols-outlined text-[15px]">trending_up</span>
                Retention +18% vs. last cycle
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 rounded-full bg-[#f9f3eb]  hover:bg-[#ede7df] text-[13px] font-semibold text-[#1d1b17]  shadow-[0_2px_4px_rgba(180,165,150,0.2)] flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Export Portfolio</span>
              </button>
              <button
                onClick={onResumeSession}
                className="px-5 py-2 rounded-full bg-[#745948] hover:bg-[#5a4132] text-white text-[13px] font-bold shadow-[0_8px_16px_rgba(116,89,72,0.35)] flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>Resume Studio Session</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-[26px] sm:text-[32px] font-bold text-[#1d1b17]  tracking-tight">
              Welcome back, Elena! Your Lifelong Learning Journey
            </h1>
            <p className="text-[14px] text-[#4f453f]  max-w-4xl leading-relaxed">
              Memory decay models predict backpropagation gradients reach critical retention threshold in 4 hours. You have completed 36 multimodal checks this month.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: 4 Top Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Concepts Mastered */}
        <div className="p-6 rounded-[2rem] bg-white  shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80  flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#81756e]">
              Concepts Mastered
            </span>
            <div className="w-8 h-8 rounded-full bg-[#f3cfba] text-[#725746] flex items-center justify-center">
              <span className="material-symbols-outlined text-[17px]">menu_book</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-bold text-[#1d1b17]  leading-none">
              42
            </span>
            <span className="text-[12px] font-bold text-[#745948] ">
              +6 this week
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <div className="w-full h-2 rounded-full bg-[#ede7df]  p-0.5 overflow-hidden">
              <div className="h-full rounded-full bg-[#745948]" style={{ width: '84%' }}></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#81756e]">
              <span>Target: 50 / Mo</span>
              <span>84% achieved</span>
            </div>
          </div>
        </div>

        {/* Card 2: Avg Retention Rate */}
        <div className="p-6 rounded-[2rem] bg-white  shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80  flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#81756e]">
              Avg Retention Rate
            </span>
            <div className="w-8 h-8 rounded-full bg-[#cbe3f6] text-[#4f6576] flex items-center justify-center">
              <span className="material-symbols-outlined text-[17px]">psychology</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-bold text-[#1d1b17]  leading-none">
              88.4%
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#c0ddd0] text-[#052018] text-[10px] font-bold">
              Optimal
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <span className="text-[11px] text-[#81756e] leading-snug">
              Ebbinghaus stability scored in top decile of studio cohort.
            </span>
            <div className="flex items-center gap-1">
              {[60, 75, 80, 88, 92, 85].map((h, idx) => (
                <div key={idx} className="flex-1 h-3 rounded-full bg-[#cbe3f6]" style={{ opacity: (idx + 4) / 10 }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Sources Synthesized */}
        <div className="p-6 rounded-[2rem] bg-white  shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80  flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#81756e]">
              Sources Synthesized
            </span>
            <div className="w-8 h-8 rounded-full bg-[#c0ddd0] text-[#486258] flex items-center justify-center">
              <span className="material-symbols-outlined text-[17px]">grid_view</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-bold text-[#1d1b17]  leading-none">
              14
            </span>
            <span className="text-[13px] text-[#4f453f] ">
              Artifacts
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-[#4f453f] ">
            <span className="px-2 py-0.5 rounded-md bg-[#f9f3eb] ">5 PDFs</span>
            <span className="px-2 py-0.5 rounded-md bg-[#f9f3eb] ">4 Decks</span>
            <span className="px-2 py-0.5 rounded-md bg-[#f9f3eb] ">3 Videos</span>
            <span className="px-2 py-0.5 rounded-md bg-[#f9f3eb] ">2 Audios</span>
          </div>
        </div>

        {/* Card 4: Mindful Streak */}
        <div className="p-6 rounded-[2rem] bg-white  shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80  flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#81756e]">
              Mindful Streak
            </span>
            <div className="w-8 h-8 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
              <span className="material-symbols-outlined text-[17px]">local_fire_department</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-bold text-[#1d1b17]  leading-none">
              12
            </span>
            <span className="text-[13px] text-[#4f453f] ">
              Days Ongoing
            </span>
          </div>

          {/* Days Beads: M T W T F S S */}
          <div className="flex items-center justify-between pt-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <span
                key={idx}
                className="w-6 h-6 rounded-full bg-[#f3cfba] text-[#725746] text-[10px] font-bold flex items-center justify-center shadow-xs"
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: Active Syllabus & Targeted Refresher Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 items-start">
        
        {/* Left 8-Column: Topic Mastery & Retention List */}
        <div className="lg:col-span-8 p-6 sm:p-8 rounded-[2rem] bg-white  shadow-[0_20px_40px_-10px_rgba(195,180,170,0.28)] border border-[#ede7df]/80  flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider">
                Active Syllabus
              </span>
              <h2 className="text-[20px] font-bold text-[#1d1b17] ">
                Topic Mastery & Retention
              </h2>
            </div>

            {/* View Toggles */}
            <div className="flex items-center p-1 rounded-full bg-[#f9f3eb]  shadow-[inset_0_1.5px_2px_rgba(175,160,147,0.2)] text-[12px]">
              {(['Domain View', 'Decay Curves', 'Milestones'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSyllabusTab(tab)}
                  className={`px-3.5 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                    syllabusTab === tab
                      ? 'bg-white  text-[#1d1b17]  shadow-sm'
                      : 'text-[#81756e] hover:text-[#1d1b17]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[12px] text-[#81756e]">
            Active filter: <strong className="text-[#1d1b17] ">{syllabusTab}</strong> • Real-time algorithmic decay modeled
          </div>

          {/* Topics List */}
          <div className="flex flex-col gap-3">
            {learningTopics.map((topic) => (
              <div
                key={topic.id}
                className="p-4 rounded-2xl bg-[#f9f3eb]  shadow-[0_2px_6px_rgba(180,165,150,0.12)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#ede7df] transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-white  flex items-center justify-center text-[#745948] shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">
                      {topic.id === 'top-1' ? 'psychology' : topic.id === 'top-2' ? 'palette' : 'scatter_plot'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-[#1d1b17] ">
                        {topic.title}
                      </span>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          topic.status === 'DECAYING'
                            ? 'bg-[#ffdad6] text-[#ba1a1a]'
                            : topic.status === 'FIRM'
                            ? 'bg-[#c0ddd0] text-[#052018]'
                            : 'bg-[#cbe3f6] text-[#4f6576]'
                        }`}
                      >
                        {topic.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#81756e] pt-0.5">
                      {topic.subconceptsCount} active sub-concepts • {topic.dialogueCount} Socratic dialogue threads
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#81756e]">Mastery</span>
                      <span className="text-[13px] font-bold text-[#1d1b17] ">
                        {topic.mastery}%
                      </span>
                    </div>
                    <div className="w-24 h-1.5 rounded-full bg-[#ede7df]  overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#745948]"
                        style={{ width: `${topic.mastery}%` }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={() => (onDrillTopic ? onDrillTopic(topic.id) : onResumeSession?.())}
                    className="px-3.5 py-1.5 rounded-full bg-white  text-[12px] font-bold text-[#1d1b17]  hover:bg-[#ede7df] shadow-sm transition-all cursor-pointer"
                  >
                    Drill Concepts
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 4-Column: Targeted Refresher & Modality Efficiency */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Targeted Refresher Card */}
          <div className="p-6 rounded-[2rem] bg-white  shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80  flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">notifications_active</span>
                <span className="text-[14px] font-bold text-[#1d1b17] ">Targeted Refresher</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold">
                Priority
              </span>
            </div>

            {/* Backprop Item */}
            <div className="p-3.5 rounded-2xl bg-[#f9f3eb]  flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#745948]">slideshow</span>
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-[#1d1b17] ">
                    Review Slides 14 & 18: Backprop
                  </span>
                  <span className="text-[10px] text-[#81756e]">Estimated duration: 3 mins</span>
                </div>
              </div>
              <button
                onClick={onResumeSession}
                className="w-full py-1.5 rounded-full bg-white  text-[12px] font-bold text-[#1d1b17]  shadow-xs cursor-pointer hover:bg-[#ede7df]"
              >
                Start 3-min refresher
              </button>
            </div>

            {/* Quantum Superposition Item with Audio waveform */}
            <div className="p-3.5 rounded-2xl bg-[#f9f3eb]  flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[#4a6171]">podcasts</span>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-[#1d1b17] ">
                      Quantum Superposition
                    </span>
                    <span className="text-[10px] text-[#81756e]">Socratic AI Synthesis • 4:12</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsPlayingQuantumAudio(!isPlayingQuantumAudio)}
                  className="w-8 h-8 rounded-full bg-[#4a6171] text-white flex items-center justify-center cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isPlayingQuantumAudio ? 'pause' : 'play_arrow'}
                  </span>
                </button>
              </div>

              {/* Waveform */}
              <div className="flex items-center gap-1 h-5 pt-1">
                {[8, 14, 10, 18, 12, 16, 20, 10, 14, 8, 16, 12].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full ${isPlayingQuantumAudio ? 'bg-[#745948] animate-pulse' : 'bg-[#81756e]/40'}`}
                    style={{ height: `${h}px` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Modality Efficiency Card */}
          <div className="p-6 rounded-[2rem] bg-white  shadow-[0_16px_32px_-8px_rgba(195,180,170,0.25)] border border-[#ede7df]/80  flex flex-col gap-3">
            <span className="text-[14px] font-bold text-[#1d1b17] ">
              Modality Efficiency
            </span>
            <span className="text-[11px] text-[#81756e]">Accuracy rates categorized by source medium</span>

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-[#1d1b17] ">
                    <span className="material-symbols-outlined text-[15px]">slideshow</span>
                    Visual Slides & Diagrams
                  </span>
                  <span className="font-bold">91%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#ede7df] overflow-hidden">
                  <div className="h-full bg-[#745948] rounded-full" style={{ width: '91%' }}></div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-[#1d1b17] ">
                    <span className="material-symbols-outlined text-[15px]">menu_book</span>
                    Reading Annotated PDFs
                  </span>
                  <span className="font-bold">89%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#ede7df] overflow-hidden">
                  <div className="h-full bg-[#745948] rounded-full" style={{ width: '89%' }}></div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-[#1d1b17] ">
                    <span className="material-symbols-outlined text-[15px]">mic</span>
                    Audio Syntheses & Memos
                  </span>
                  <span className="font-bold">84%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#ede7df] overflow-hidden">
                  <div className="h-full bg-[#745948] rounded-full" style={{ width: '84%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Socrates Quote Card */}
          <div className="p-5 rounded-[2rem] bg-[#f9f3eb]  flex items-center gap-4 shadow-sm border border-[#ede7df]/60">
            <span className="text-[32px] text-[#745948] font-serif leading-none">“</span>
            <div className="flex flex-col">
              <p className="text-[13px] text-[#1d1b17]  italic leading-snug">
                “Wonder is the beginning of wisdom.”
              </p>
              <span className="text-[10px] text-[#81756e] font-bold uppercase tracking-wider pt-1">
                — SOCRATES
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Cognitive Dynamics Chart */}
      <section className="w-full mb-8">
        <div className="w-full p-6 sm:p-8 rounded-[2rem] bg-white  shadow-[0_20px_40px_-10px_rgba(195,180,170,0.28)] border border-[#ede7df]/80  flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-[#81756e] uppercase tracking-wider">
                COGNITIVE DYNAMICS
              </span>
              <h2 className="text-[20px] font-bold text-[#1d1b17] ">
                Retention Index vs. Inquiries Answered
              </h2>
            </div>

            <div className="flex items-center gap-4 text-[12px] text-[#81756e]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#745948]"></span> Daily Retention %
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#cbe3f6]"></span> Socratic Questions (bar)
              </span>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="w-full h-56 rounded-2xl bg-[#f9f3eb]  p-5 flex flex-col justify-between relative shadow-inner">
            <svg className="w-full h-40 overflow-visible" viewBox="0 0 700 120" fill="none">
              {/* Vertical Bars for inquiries */}
              {[
                { x: 50, h: 50 },
                { x: 150, h: 70 },
                { x: 250, h: 60 },
                { x: 350, h: 80 },
                { x: 450, h: 75 },
                { x: 550, h: 85 },
                { x: 650, h: 90 },
              ].map((bar, i) => (
                <rect
                  key={i}
                  x={bar.x - 12}
                  y={120 - bar.h}
                  width="24"
                  height={bar.h}
                  rx="12"
                  fill="#cbe3f6"
                  opacity="0.8"
                />
              ))}

              {/* Smooth Retention Curve */}
              <path
                d="M 50 65 Q 150 40 250 55 T 450 45 T 650 35"
                stroke="#745948"
                strokeWidth="3.5"
                fill="none"
              />

              {/* Data dots */}
              {[
                { x: 50, y: 65 },
                { x: 150, y: 45 },
                { x: 250, y: 55 },
                { x: 350, y: 42 },
                { x: 450, y: 45 },
                { x: 550, y: 38 },
                { x: 650, y: 35 },
              ].map((dot, i) => (
                <circle key={i} cx={dot.x} cy={dot.y} r="5" fill="#f9f3eb" stroke="#745948" strokeWidth="2.5" />
              ))}
            </svg>

            {/* Bottom Day Labels */}
            <div className="flex justify-between text-[11px] text-[#81756e] font-medium px-2">
              <span>May 18</span>
              <span>May 19</span>
              <span>May 20</span>
              <span>May 21</span>
              <span>May 22</span>
              <span>May 23</span>
              <span className="font-bold text-[#745948]">Today (May 24)</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Recent Socratic Sessions */}
      <section className="w-full">
        <div className="w-full p-6 sm:p-8 rounded-[2rem] bg-white  shadow-[0_20px_40px_-10px_rgba(195,180,170,0.28)] border border-[#ede7df]/80  flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-bold text-[#1d1b17] ">
                Recent Socratic Sessions
              </h2>
              <p className="text-[12px] text-[#81756e]">
                Review conversational dialogue trees, question-answer dyads, and recall scores
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2 text-[#81756e] text-[16px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search inquiry threads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-full bg-[#f9f3eb]  text-[12px] text-[#1d1b17]  focus:outline-none"
                />
              </div>
              <button className="px-3 py-1.5 rounded-full bg-[#f9f3eb]  text-[12px] font-semibold text-[#81756e] hover:text-[#1d1b17] flex items-center gap-1 cursor-pointer">
                <span className="material-symbols-outlined text-[15px]">filter_list</span>
                <span>Filter</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {filteredSessions.map((sess) => (
              <div
                key={sess.id}
                className="p-4 rounded-2xl bg-[#f9f3eb]  shadow-[0_2px_4px_rgba(180,165,150,0.12)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#ede7df] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white  flex items-center justify-center font-serif text-[16px] text-[#745948] shrink-0 font-bold shadow-xs">
                    {sess.title.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-[#1d1b17] ">
                      {sess.title}
                    </span>
                    <span className="text-[11px] text-[#81756e]">
                      Source: {sess.sourceDoc} • {sess.questionsAsked} questions asked
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center gap-1.5 text-[12px] text-[#496459] font-bold">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>{sess.recallScore}% Recall</span>
                  </div>
                  <span className="text-[11px] text-[#81756e]">{sess.timeAgo}</span>
                  <button
                    onClick={onResumeSession}
                    className="px-4 py-1.5 rounded-full bg-white  text-[12px] font-bold text-[#1d1b17]  hover:bg-[#ede7df] shadow-xs cursor-pointer"
                  >
                    Re-open Chat
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2 border-t border-[#ede7df]  text-[12px] text-[#81756e]">
            <span>Showing 1 to 4 of 28 inquiry trails</span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#f9f3eb] cursor-pointer disabled:opacity-40"
              >
                &lt;
              </button>
              <button
                onClick={() => setCurrentPage(1)}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold cursor-pointer ${
                  currentPage === 1 ? 'bg-[#745948] text-white' : 'hover:bg-[#f9f3eb]'
                }`}
              >
                1
              </button>
              <button
                onClick={() => setCurrentPage(2)}
                className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer ${
                  currentPage === 2 ? 'bg-[#745948] text-white' : 'hover:bg-[#f9f3eb]'
                }`}
              >
                2
              </button>
              <button
                onClick={() => setCurrentPage(3)}
                className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer ${
                  currentPage === 3 ? 'bg-[#745948] text-white' : 'hover:bg-[#f9f3eb]'
                }`}
              >
                3
              </button>
              <button
                disabled={currentPage === 3}
                onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#f9f3eb] cursor-pointer disabled:opacity-40"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Export Portfolio Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white  p-6 shadow-2xl flex flex-col gap-4 border border-[#ede7df]">
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold text-[#1d1b17]  flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#745948]">download</span>
                Export Socratic Portfolio
              </span>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-full bg-[#f9f3eb]  flex items-center justify-center text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-[13px] text-[#4f453f] ">
              Generate a verified PDF academic report of your mastery metrics, derivation trails, and Ebbinghaus retention curves.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <label className="flex items-center gap-2 p-3 rounded-xl bg-[#f9f3eb]  text-[13px] cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#745948]" />
                <span>Include Multimodal Session Transcripts</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl bg-[#f9f3eb]  text-[13px] cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#745948]" />
                <span>Include Bayesian Source Mastery Scores</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-full text-[13px] font-semibold text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Portfolio successfully generated and downloaded as PDF!');
                  setShowExportModal(false);
                }}
                className="px-5 py-2 rounded-full bg-[#745948] text-white text-[13px] font-bold cursor-pointer shadow-md"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
