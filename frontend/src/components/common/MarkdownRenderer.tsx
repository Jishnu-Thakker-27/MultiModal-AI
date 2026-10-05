import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-stone max-w-none text-[14px] leading-relaxed text-[#1d1b17] whitespace-pre-wrap">
      {content}
    </div>
  );
};

export default MarkdownRenderer;
