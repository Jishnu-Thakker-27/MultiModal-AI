import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * Preprocesses markdown text to ensure LaTeX math syntax is parsed cleanly.
 * - Handles cases where equations might have escaped slashes like \\( ... \\) or \\[ ... \\]
 * - Converts \\( ... \\) to $...$ and \\[ ... \\] to $$...$$
 */
function preprocessLaTeX(content) {
  if (!content || typeof content !== 'string') return '';
  
  let formatted = content;
  // Replace \[ ... \] with $$ ... $$
  formatted = formatted.replace(/\\\[([\s\S]*?)\\\]/g, (_match, eq) => `$$\n${eq.trim()}\n$$`);
  // Replace \( ... \) with $ ... $
  formatted = formatted.replace(/\\\(([\s\S]*?)\\\)/g, (_match, eq) => `$${eq.trim()}$`);

  return formatted;
}

export default function MarkdownRenderer({ content, className = '' }) {
  const processedContent = preprocessLaTeX(content);

  return (
    <div className={`markdown-content text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#2D3748] mt-5 mb-3 tracking-tight border-b border-[#E2D9CC]/60 pb-1.5 first:mt-0" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg sm:text-xl font-bold text-[#2D3748] mt-4 mb-2.5 tracking-tight first:mt-0" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base sm:text-lg font-bold text-[#399283] mt-3.5 mb-2 first:mt-0" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-sm sm:text-base font-semibold text-[#2D3748] mt-3 mb-1.5 first:mt-0" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-3 text-[#2D3748] leading-relaxed last:mb-0" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside pl-5 mb-3 space-y-1 text-[#2D3748]" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside pl-5 mb-3 space-y-1 text-[#2D3748]" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-[#1A202C]" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-[#4A5568]" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-4 border-[#E2D9CC]" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-[#48A999] pl-3.5 py-1 my-3 bg-[#E6F4F1]/40 rounded-r-lg text-[#4A5568] italic" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-[#E2D9CC] shadow-2xs">
              <table className="min-w-full divide-y divide-[#E2D9CC] text-left text-xs sm:text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-[#F0EAE1]/80 text-[#2D3748] font-bold" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px]" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-[#E2D9CC]/60 bg-[#FFFDF9]" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3.5 py-2 text-[#2D3748]" {...props} />
          ),
          code: ({ node, inline, className: codeClassName, children, ...props }) => {
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded-md bg-[#F0EAE1] text-[#C53030] font-mono text-xs font-semibold" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div className="my-3 rounded-xl overflow-hidden bg-[#1E293B] text-[#F8FAFC] p-3 text-xs font-mono overflow-x-auto shadow-xs">
                <code {...props}>{children}</code>
              </div>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
