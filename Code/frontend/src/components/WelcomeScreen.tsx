import React, { useState } from 'react';
import { ScreenType } from '../types';
import { brandLogoUrl, currentUser } from '../data/mockData';

interface WelcomeScreenProps {
  onStartLearning: () => void;
  onExploreGuest: () => void;
  tactileAssistActive: boolean;
  onToggleTactileAssist: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStartLearning,
  onExploreGuest,
  tactileAssistActive,
  onToggleTactileAssist,
}) => {
  const [email, setEmail] = useState('elena.scholar@university.edu');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartLearning();
  };

  return (
    <div className="w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 transition-colors selection:bg-[#f3cfba] selection:text-[#725746]">
      {/* Outer Ceramic Shell Card */}
      <div className="w-full max-w-6xl rounded-[2.5rem] bg-white shadow-[0_30px_70px_-15px_rgba(195,180,170,0.35),inset_0_2px_4px_rgba(255,255,255,0.95)] border border-[#ede7df]/80 p-6 lg:p-12 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          
          {/* LEFT COLUMN: Atelier Socratic Hero & Testimonial Plate */}
          <div className="lg:col-span-5 rounded-[2rem] bg-[#f9f3eb] p-8 flex flex-col justify-between shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_6px_16px_rgba(180,165,150,0.18)] border border-[#ede7df]/60">
            <div className="flex flex-col gap-6">
              {/* Top Atelier Mark */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-[#ede7df]/60 flex items-center justify-center shadow-sm">
                    <img alt="SocraticAI" className="h-6 w-auto" src={brandLogoUrl} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[25px] font-extrabold text-[#1d1b17] leading-tight">
                      SocraticAI Studio
                    </span>
                    <span className="text-[15px] text-[#4f453f]">
                      Multimodal Learning Studio
                    </span>
                  </div>
                </div>
              </div>

              



              {/* Wisdom Quote */}
              <h2 className="text-[35px] xl:text-[30px] font-extrabold text-[#1d1b17] leading-tight tracking-tight">
                &ldquo;Wisdom begins in wonder. Learn any topic from your own notes, slides, and lectures — at your natural tempo.&rdquo;
              </h2>

              <p className="text-[20px] text-[#4f453f] leading-relaxed">
                A patient conversational guide bridging academic rigor and multimodal intuition through interactive prompts.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Sign In Form & Studio Entry */}
          <div className="lg:col-span-7 flex flex-col justify-between py-2 lg:px-4">
            <div>
              {/* Title & Welcome */}
              <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-[28px] sm:text-[34px] font-extrabold text-[#1d1b17] tracking-tight">
                  Sign in to SocraticAI Studio
                </h1>
                <p className="text-[14px] text-[#4f453f]">
                  Enter your study space to access your adaptive tutor workspace, adaptive quizzes, learning analytics, and library choices.
                </p>
              </div>

              {/* Social Login 3-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <button
                  type="button"
                  onClick={onStartLearning}
                  className="py-2.5 px-3 rounded-2xl bg-[#f9f3eb] hover:bg-[#ede7df] text-[13px] font-bold text-[#1d1b17] flex items-center justify-center gap-2 border border-[#ede7df]/60 shadow-sm transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.66-5.17 3.66-9.09z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.09C3.26 21.41 7.34 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.41l4.04-3.09z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.59 1.24 6.59l4.04 3.09c.95-2.83 3.6-4.93 6.72-4.93z" />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={onStartLearning}
                  className="py-2.5 px-3 rounded-2xl bg-[#f9f3eb] hover:bg-[#ede7df] text-[13px] font-bold text-[#1d1b17] flex items-center justify-center gap-2 border border-[#ede7df]/60 shadow-sm transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px]">terminal</span>
                  <span>Apple ID</span>
                </button>

                <button
                  type="button"
                  onClick={onStartLearning}
                  className="py-2.5 px-3 rounded-2xl bg-[#f9f3eb] hover:bg-[#ede7df] text-[13px] font-bold text-[#1d1b17] flex items-center justify-center gap-2 border border-[#ede7df]/60 shadow-sm transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px]">school</span>
                  <span>Campus SSO</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-6">
                <div className="w-full border-t border-[#ede7df]"></div>
                <span className="absolute bg-white px-4 text-[11px] font-bold text-[#81756e] tracking-wider uppercase">
                  Or Sign In with Email
                </span>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-[#4f453f]">
                    Multimodal Studio Email
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-[#81756e] font-bold">@</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#ede7df]/60 text-[#1d1b17] text-[14px] border border-transparent shadow-[inset_0_2px_4px_rgba(175,160,147,0.2)] focus:outline-none focus:ring-2 focus:ring-[#745948]/40"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-[#4f453f]">
                      Password / Passkey
                    </label>
                    <button
                      type="button"
                      className="text-[12px] font-medium text-[#745948] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-[#81756e] text-[18px]">
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3 rounded-2xl bg-[#ede7df]/60 text-[#1d1b17] text-[14px] border border-transparent shadow-[inset_0_2px_4px_rgba(175,160,147,0.2)] focus:outline-none focus:ring-2 focus:ring-[#745948]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-[#81756e] hover:text-[#1d1b17] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Checkboxes & Accessibility Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <label className="flex items-center gap-2 text-[12px] font-medium text-[#4f453f] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={keepSignedIn}
                      onChange={(e) => setKeepSignedIn(e.target.checked)}
                      className="w-4 h-4 rounded text-[#745948] cursor-pointer"
                    />
                    <span>Keep me signed in</span>
                  </label>
                </div>

                {/* Primary CTA: Start Learning */}
                <button
                  type="submit"
                  className="w-full mt-2 py-3.5 px-6 rounded-full bg-[#f3cfba] hover:bg-[#fadfd0] text-[#725746] font-extrabold text-[15px] shadow-[0_8px_18px_-2px_rgba(215,175,155,0.5)] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Start Learning</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>

                {/* Secondary CTA: Guest Demo Mode */}
                <button
                  type="button"
                  onClick={onExploreGuest}
                  className="w-full py-3 px-6 rounded-full bg-[#cbe3f6]/80 hover:bg-[#cbe3f6] text-[#2c4e68] font-bold text-[14px] shadow-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#cbe3f6]/60"
                >
                  <span className="material-symbols-outlined text-[17px]">explore</span>
                  <span>Guest demo mode (Explore interactive studio without account)</span>
                </button>
              </form>
            </div>

            {/* Bottom Form Footer Links */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-8 text-[13px] text-[#4f453f]">
              <div className="flex items-center gap-1">
                <span>New to SocraticAI?</span>
                <button
                  type="button"
                  onClick={onStartLearning}
                  className="font-bold text-[#745948] hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" className="hover:underline cursor-pointer">
                  Privacy Policy
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={onToggleTactileAssist}
                  className="hover:underline cursor-pointer"
                >
                  Accessibility (WCAG AAA)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
