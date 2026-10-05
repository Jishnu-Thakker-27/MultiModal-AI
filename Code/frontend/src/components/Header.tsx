import React, { useState, useEffect, useRef } from 'react';
import { ScreenType } from '../types';
import { currentUser, brandLogoUrl } from '../data/mockData';

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  tactileAssistActive?: boolean;
  onToggleTactileAssist?: () => void;
  onOpenProfileSettings?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  tactileAssistActive = false,
  onToggleTactileAssist,
  onLogout,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    { label: 'Library Choices', screen: 'library-and-sources', icon: 'library_books' },
  ];

  return (
    <header className="sticky top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-[#ede7df]/80 shadow-[0_4px_24px_rgba(195,180,170,0.18)] transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand Lockup */}
          <div
            onClick={() => onNavigate('tutor-workspace')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#f9f3eb] border border-[#ede7df]/60 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <img
                alt="SocraticAI Logo"
                className="h-6 sm:h-7 w-auto object-contain"
                src={brandLogoUrl}
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[17px] sm:text-[19px] font-extrabold text-[#1d1b17] tracking-tight leading-none">
                  SocraticAI
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[#f3cfba]/80 text-[#745948]">
                  Studio
                </span>
              </div>
              <span className="text-[10px] text-[#4f453f] font-medium hidden md:inline leading-tight">
                Multimodal Socratic Atelier
              </span>
            </div>
          </div>

          {/* Center Navigation Capsule Box - Fits all 5 items comfortably inside */}
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

          {/* Right Action Zone */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0" ref={dropdownRef}>
            {/* Quick Screen Pill for Tablet/Mobile */}
            <div className="lg:hidden flex items-center">
              <span className="text-[12px] font-extrabold px-3 py-1 rounded-full bg-[#f9f3eb] text-[#745948] border border-[#ede7df]">
                {navItems.find((n) => n.screen === currentScreen)?.label || 'Workspace'}
              </span>
            </div>

            {/* AAA Tactile Assist Toggle Button */}
            {onToggleTactileAssist && (
              <button
                onClick={onToggleTactileAssist}
                title="Toggle Senior & High-Acuity Tactile Assist (AAA)"
                aria-label="High-Acuity Assist"
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                  tactileAssistActive
                    ? 'bg-[#064e3b] text-[#6ee7b7] border-[#059669] shadow-sm'
                    : 'bg-[#f9f3eb] text-[#4f453f] hover:text-[#1d1b17] border-[#ede7df]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">accessibility</span>
              </button>
            )}

            {/* Profile Trigger Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 pl-1 bg-[#f9f3eb] hover:bg-[#ede7df] py-1 pr-2.5 sm:pr-3 rounded-full border border-[#ede7df] shadow-sm active:scale-[0.98] transition-all cursor-pointer group"
              >
                <img
                  alt={currentUser.name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-black/10"
                  src={currentUser.avatarUrl}
                />
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-[12px] font-bold text-[#1d1b17] leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-[#4f453f] leading-tight flex items-center gap-0.5">
                    {currentUser.tier}
                    <span
                      className={`material-symbols-outlined text-[13px] transition-transform duration-200 ${
                        profileOpen ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </span>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 top-14 w-84 p-4 rounded-3xl bg-white border border-[#ede7df] shadow-[0_24px_50px_-8px_rgba(0,0,0,0.2)] z-50 flex flex-col gap-3.5 animate-in fade-in duration-150">
                  {/* User Profile Card */}
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
                        Free Scholar • 4 Knowledge Sources
                      </span>
                    </div>
                  </div>

                  {/* Profile Screen Shortcuts */}
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

                  {/* Sign Out / Switch User */}
                  <div className="pt-1 border-t border-[#ede7df]">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        if (onLogout) onLogout();
                        else onNavigate('welcome');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#fdf2f2] text-[#ba1a1a] hover:bg-[#fecaca]/50 text-[12px] font-bold border border-[#fecaca]/60 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Horizontal Scrolling Nav Strip */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto py-2 border-t border-[#ede7df]/60 scrollbar-none">
          {navItems.map((item) => {
            const isActive = currentScreen === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => onNavigate(item.screen)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#745948] text-white shadow-sm font-extrabold'
                    : 'bg-[#f9f3eb] text-[#4f453f] hover:text-[#1d1b17] border border-[#ede7df]/60'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
