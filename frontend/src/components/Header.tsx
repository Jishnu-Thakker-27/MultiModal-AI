import React, { useState, useEffect } from 'react';
import { ScreenType } from '../types';
import { getConversations } from '../services/api';

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onOpenProfileSettings?: () => void;
  onLogout?: () => void;
  hideNav?: boolean;
  tactileAssistActive?: boolean;
  onToggleTactileAssist?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  onLogout,
  hideNav = false,
  tactileAssistActive,
  onToggleTactileAssist,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [sourceCount, setSourceCount] = useState<number>(0);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const currentUser = {
    name: 'Socratic Scholar',
    email: 'scholar@socratic.ai',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  };

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('app_theme');

    getConversations()
      .then((res: any) => {
        if (Array.isArray(res)) setSourceCount(res.length);
        else if (res?.conversations && Array.isArray(res.conversations)) setSourceCount(res.conversations.length);
      })
      .catch(() => setSourceCount(0));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: { label: string; screen: ScreenType; icon: string }[] = [
    { label: 'Tutor Workspace', screen: 'tutor-workspace', icon: 'psychology' },
    { label: 'Adaptive Quizzes', screen: 'adaptive-quizzes', icon: 'quiz' },
    { label: 'Learning Analytics', screen: 'learning-analytics', icon: 'analytics' },
    { label: 'Library & Sources', screen: 'library-and-sources', icon: 'library_books' },
  ];

  return (
    <header className="sticky top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-[#ede7df]/80 shadow-[0_4px_24px_rgba(195,180,170,0.18)] transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          <div
            onClick={() => onNavigate('tutor-workspace')}
            className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#745948] via-[#5c4436] to-[#3d2b21] text-white font-extrabold text-[20px] flex items-center justify-center shadow-md shadow-[#745948]/25 group-hover:scale-105 group-hover:shadow-lg transition-all duration-300 border border-[#f3cfba]/30">
              <span className="bg-gradient-to-t from-[#f3cfba] to-white bg-clip-text text-transparent">
                S
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[20px] sm:text-[22px] font-black tracking-tight leading-none text-[#1d1b17]">
                  Socratic<span className="text-[#745948] font-extrabold">AI</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#f3cfba] text-[#745948] border border-[#745948]/20 shadow-2xs">
                  Tutor
                </span>
              </div>
              <span className="text-[11px] text-[#81756e] font-semibold hidden md:block leading-tight pt-0.5 tracking-wide">
                Multimodal Socratic Atelier
              </span>
            </div>
          </div>

          {!hideNav && (
            <nav className="hidden lg:flex items-center p-1.5 bg-[#f9f3eb] rounded-full border border-[#ede7df]/70 shadow-[inset_0_2px_4px_rgba(175,160,147,0.12)] gap-1 shrink-0">
              {navItems.map((item) => {
                const isActive = currentScreen === item.screen;
                return (
                  <button
                    key={item.screen}
                    onClick={() => onNavigate(item.screen)}
                    className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? 'bg-[#745948] text-white shadow-[0_2px_8px_rgba(116,89,72,0.35)] font-bold scale-[1.02]'
                        : 'text-[#4f453f] hover:text-[#1d1b17] hover:bg-white/60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-2 sm:gap-3 shrink-0" ref={dropdownRef}>
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 pl-1 bg-[#f9f3eb] hover:bg-[#ede7df] py-1 pr-1.5 rounded-full border border-[#ede7df] shadow-sm active:scale-[0.98] transition-all cursor-pointer group"
              >
                <img
                  alt={currentUser.name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-black/10"
                  src={currentUser.avatarUrl}
                />
                <span
                  className={`material-symbols-outlined text-[13px] transition-transform duration-200 ${
                    profileOpen ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              <div
                className={`absolute right-0 top-14 w-84 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top-right overflow-hidden ${
                  profileOpen
                    ? 'max-h-[500px] opacity-100 scale-100 translate-y-0 pointer-events-auto shadow-[0_24px_50px_-8px_rgba(0,0,0,0.18)]'
                    : 'max-h-0 opacity-0 scale-90 -translate-y-4 pointer-events-none shadow-none'
                }`}
              >
                <div className="p-4 rounded-3xl bg-white border border-[#ede7df] flex flex-col gap-3.5">
                  <div className="p-3.5 rounded-2xl bg-[#f9f3eb] border border-[#ede7df]/60 flex items-center gap-3">
                    <img
                      alt={currentUser.name}
                      className="w-11 h-11 rounded-full object-cover shadow-sm shrink-0 ring-2 ring-[#745948]/20"
                      src={currentUser.avatarUrl}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] font-extrabold text-[#1d1b17] leading-tight truncate">
                        {currentUser.name}
                      </span>
                      <span className="text-[11px] text-[#4f453f] truncate">
                        {currentUser.email}
                      </span>
                      <span className="inline-flex items-center gap-1.5 mt-1 text-[10px] font-bold text-[#745948] px-2 py-0.5 rounded-full bg-[#f3cfba]/80 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#745948] animate-pulse"></span>
                        Active Scholar • {sourceCount} Sources
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 pt-1 border-t border-[#ede7df]">
                    <button
                      onClick={() => {
                        onNavigate('learning-analytics');
                        setProfileOpen(false);
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#f9f3eb] transition-colors group cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5 text-[#1d1b17] text-[13px] font-semibold">
                        <span className="material-symbols-outlined text-[18px] text-[#4a6171]">
                          psychology_alt
                        </span>
                        <span>Cognitive Retention Portfolio</span>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-[#81756e] group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        onNavigate('adaptive-quizzes');
                        setProfileOpen(false);
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#f9f3eb] transition-colors group cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5 text-[#1d1b17] text-[13px] font-semibold">
                        <span className="material-symbols-outlined text-[18px] text-[#745948]">
                          quiz
                        </span>
                        <span>Adaptive Quizzes Hub</span>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-[#81756e] group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        onNavigate('library-and-sources');
                        setProfileOpen(false);
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#f9f3eb] transition-colors group cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5 text-[#1d1b17] text-[13px] font-semibold">
                        <span className="material-symbols-outlined text-[18px] text-[#2e5339]">
                          library_books
                        </span>
                        <span>Multimodal Sources Vault</span>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-[#81756e] group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-[#ede7df]">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#fdf2f2] text-[#ba1a1a] hover:bg-[#fecaca]/50 text-[12px] font-bold border border-[#fecaca]/60 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
