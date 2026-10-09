import React, { useState, useEffect } from 'react';
import { ScreenType } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoginPage } from './pages/LoginPage';
import { MainScreen, ParsedAcademicIntent } from './pages/MainScreen';
import { TutorPage } from './pages/TutorPage';
import { QuizzesPage } from './pages/QuizzesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LibraryPage } from './pages/LibraryPage';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('os-home');
  const [tactileAssistActive, setTactileAssistActive] = useState<boolean>(false);
  const [pendingTopic, setPendingTopic] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [pendingDifficulty, setPendingDifficulty] = useState<string | null>(null);
  const [pendingUploadCategory, setPendingUploadCategory] = useState<'pdf' | 'ppt' | 'video' | 'audio' | null>(null);
  const [pendingAutoOpenUpload, setPendingAutoOpenUpload] = useState<boolean>(false);
  const [infoModal, setInfoModal] = useState<{
    title: string;
    description: string;
    icon: string;
  } | null>(null);

  // Ensure document root is reset from any dark or contrast mode
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'contrast-mode');
  }, []);

  // Handle AAA tactile assist font scaling
  const handleToggleTactileAssist = () => {
    setTactileAssistActive((prev) => {
      const next = !prev;
      if (next) {
        document.body.classList.add('contrast-125', 'tracking-wide');
      } else {
        document.body.classList.remove('contrast-125', 'tracking-wide');
      }
      return next;
    });
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentScreen('os-home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    localStorage.removeItem('user_name');
    setIsLoggedIn(false);
    setCurrentScreen('welcome');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOSCommand = (command: string, parsed: ParsedAcademicIntent) => {
    if (parsed.intent === 'LEARN_TOPIC') {
      setPendingTopic(parsed.topic || null);
      setPendingPrompt(parsed.originalPrompt);
      setPendingUploadCategory(parsed.uploadCategory || null);
      setPendingAutoOpenUpload(Boolean(parsed.autoOpenUpload));
      setCurrentScreen('tutor-workspace');
    } else if (parsed.intent === 'QUIZ_TOPIC') {
      setPendingTopic(parsed.topic || null);
      setPendingDifficulty(parsed.difficulty || 'adaptive');
      setCurrentScreen('adaptive-quizzes');
    } else if (parsed.intent === 'ANALYTICS') {
      setCurrentScreen('learning-analytics');
    } else if (parsed.intent === 'LIBRARY') {
      setCurrentScreen('library-and-sources');
    } else {
      setPendingTopic(parsed.topic || null);
      setPendingPrompt(parsed.originalPrompt);
      setPendingUploadCategory(parsed.uploadCategory || null);
      setPendingAutoOpenUpload(Boolean(parsed.autoOpenUpload));
      setCurrentScreen('tutor-workspace');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEthicsClick = () => {
    setInfoModal({
      title: 'Pedagogical Ethics & Cognitive Scaffolding',
      icon: 'psychology',
      description:
        'SocraticAI adheres strictly to the Zone of Proximal Development (ZPD). Rather than functioning as an answer generator, the studio uses conversational inquiry, structural analogies, and active retrieval prompts to cultivate deep conceptual intuition without cognitive dependency.',
    });
  };

  const handleLabClick = () => {
    setInfoModal({
      title: 'Multimodal Learning Lab (Atelier v2.4)',
      icon: 'science',
      description:
        'Our laboratory integrates live speech cadence analysis, tactile step-size simulations, and direct visual parsing of lecture slides. This multimodal approach improves long-term retention by 3.4x over passive reading.',
    });
  };

  const handleAccessibilityClick = () => {
    setInfoModal({
      title: 'WCAG AAA Accessibility & Tactile Ergonomics',
      icon: 'accessibility',
      description:
        'Designed for learners across all ages and sensory preferences. Features 7:1 enhanced contrast ratios, screen-reader optimized equations, tactile depth cues, and full keyboard navigation across all screen studios.',
    });
  };

  const handleNavigate = (screen: ScreenType) => {
    if (!isLoggedIn) {
      setCurrentScreen('welcome');
      return;
    }
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isTutorWorkspace = currentScreen === 'tutor-workspace';

  if (currentScreen === 'os-home' && isLoggedIn) {
    return (
      <MainScreen
        onExecuteCommand={handleOSCommand}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className={`w-full font-sans transition-colors duration-200 bg-[#fff8f0] text-[#1d1b17] flex flex-col ${
      isTutorWorkspace ? 'h-screen overflow-hidden' : 'min-h-screen'
    }`}>
      {/* Top Sticky Navigation Bar - Only visible AFTER login */}
      {isLoggedIn && (
        <Header
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          tactileAssistActive={tactileAssistActive}
          onToggleTactileAssist={handleToggleTactileAssist}
          onLogout={handleLogout}
        />
      )}

      {/* Main Studio Viewport */}
      <main className={
        isTutorWorkspace
          ? "w-full flex-1 px-3 sm:px-4 py-2 sm:py-3 flex flex-col overflow-hidden min-h-0"
          : "w-full flex-1 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto py-6 sm:py-8 flex flex-col justify-center"
      }>
        {!isLoggedIn || currentScreen === 'welcome' ? (
          <LoginPage
            onStartLearning={handleLogin}
            onExploreGuest={handleLogin}
            tactileAssistActive={tactileAssistActive}
            onToggleTactileAssist={handleToggleTactileAssist}
          />
        ) : (
          <>
            {currentScreen === 'tutor-workspace' && (
              <TutorPage
                initialTopic={pendingTopic || undefined}
                initialPrompt={pendingPrompt || undefined}
                initialUploadCategory={pendingUploadCategory || undefined}
                autoOpenUpload={pendingAutoOpenUpload}
                onNavigateToQuiz={() => handleNavigate('adaptive-quizzes')}
                onNavigateToSources={() => handleNavigate('library-and-sources')}
              />
            )}

            {currentScreen === 'adaptive-quizzes' && (
              <QuizzesPage
                initialTopic={pendingTopic || undefined}
                initialDifficulty={pendingDifficulty || undefined}
                onBackToWorkspace={() => handleNavigate('tutor-workspace')}
                onNavigateToSources={() => handleNavigate('library-and-sources')}
              />
            )}

            {currentScreen === 'learning-analytics' && (
              <AnalyticsPage
                onResumeSession={() => handleNavigate('tutor-workspace')}
                onDrillTopic={() => handleNavigate('adaptive-quizzes')}
              />
            )}

            {currentScreen === 'library-and-sources' && (
              <LibraryPage
                onStartInquiry={() => handleNavigate('tutor-workspace')}
                onGenerateQuiz={() => handleNavigate('adaptive-quizzes')}
              />
            )}
          </>
        )}
      </main>

      {/* Footer - Visible on non-workspace pages */}
      {isLoggedIn && !isTutorWorkspace && (
        <Footer
          onEthicsClick={handleEthicsClick}
          onLabClick={handleLabClick}
          onAccessibilityClick={handleAccessibilityClick}
        />
      )}

      {/* Modal Dialog for Pedagogical & Atelier Info */}
      {infoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-4xl bg-white border border-[#ede7df] shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#f9f3eb] flex items-center justify-center text-[#745948]">
                  <span className="material-symbols-outlined text-[24px]">
                    {infoModal.icon}
                  </span>
                </div>
                <h3 className="text-[17px] font-bold text-[#1d1b17] leading-tight">
                  {infoModal.title}
                </h3>
              </div>
              <button
                onClick={() => setInfoModal(null)}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-full bg-[#f9f3eb] hover:bg-[#ede7df] flex items-center justify-center text-[#4f453f] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <p className="text-[14px] text-[#4f453f] leading-relaxed">
              {infoModal.description}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInfoModal(null)}
                className="px-5 py-2 rounded-full bg-[#745948] text-white text-[13px] font-bold shadow-md cursor-pointer hover:opacity-95"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
