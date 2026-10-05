import React from 'react';

interface FooterProps {
  onEthicsClick?: () => void;
  onLabClick?: () => void;
  onAccessibilityClick?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onEthicsClick,
  onLabClick,
  onAccessibilityClick,
}) => {
  return (
    <footer className="w-full mt-auto py-8 px-4 lg:px-10">
      <div className="max-w-7xl mx-auto p-4 rounded-2xl bg-white/80  backdrop-blur-sm shadow-[0_10px_25px_-5px_rgba(184,169,156,0.2),inset_0_1px_2px_rgba(255,255,255,0.8)]  flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left border border-[#ede7df]/50 ">
        <div className="text-[13px] text-[#4f453f] ">
          © 2025 SocraticAI Multimodal Learning Studio. Tactile Mindful Learning.
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <button
            onClick={onEthicsClick}
            className="text-[13px] font-medium text-[#4f453f]  hover:text-[#1d1b17]  transition-colors cursor-pointer"
          >
            Pedagogical Ethics
          </button>
          <button
            onClick={onLabClick}
            className="text-[13px] font-medium text-[#4f453f]  hover:text-[#1d1b17]  transition-colors cursor-pointer"
          >
            Multimodal Lab
          </button>
          <button
            onClick={onAccessibilityClick}
            className="text-[13px] font-medium text-[#4f453f]  hover:text-[#1d1b17]  transition-colors cursor-pointer"
          >
            Accessibility (WCAG AAA)
          </button>
        </div>
      </div>
    </footer>
  );
};
