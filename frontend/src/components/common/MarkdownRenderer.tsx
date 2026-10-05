import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Preprocesses markdown text to ensure LaTeX math syntax is parsed cleanly.
 * - Converts \[ ... \] to $$ ... $$ on isolated lines
 * - Converts \( ... \) to $ ... $
 * - Isolates $$ fences onto their own lines so remark-math does not treat \begin{array} as metadata
 * - Wraps bare math environments in $$ fences
 * - Ensures markdown headings immediately following math are separated cleanly
 */
function preprocessLaTeX(content: string): string {
  if (!content || typeof content !== 'string') return '';

  let formatted = content;

  // 1. Convert \[ ... \] display math to $$ ... $$ on isolated lines
  formatted = formatted.replace(/\\\[([\s\S]*?)\\\]/g, (_match, eq) => `\n\n$$\n${eq.trim()}\n$$\n\n`);

  // 2. Convert \( ... \) inline math to $ ... $
  formatted = formatted.replace(/\\\(([\s\S]*?)\\\)/g, (_match, eq) => `$${eq.trim()}$`);

  // 3. Normalize all existing $$ ... $$ blocks so $$ delimiters are guaranteed to be isolated on their own lines
  // This prevents remark-math from interpreting the first line (e.g. \begin{array}) as code block meta information
  formatted = formatted.replace(/\$\$([\s\S]*?)\$\$/g, (_match, eq) => {
    return `\n\n$$\n${eq.trim()}\n$$\n\n`;
  });

  // 4. Wrap bare LaTeX environments that are not already enclosed in $$ or $
  formatted = formatted.replace(
    /(?<!\$)(?:\\begin\{(array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|aligned|cases)\}[\s\S]*?\\end\{\1\})(?!\$)/g,
    (match) => `\n\n$$\n${match.trim()}\n$$\n\n`
  );

  // 5. Re-normalize any newly wrapped $$ ... $$ blocks
  formatted = formatted.replace(/\$\$([\s\S]*?)\$\$/g, (_match, eq) => {
    return `\n\n$$\n${eq.trim()}\n$$\n\n`;
  });

  // 6. Ensure markdown headers or lists immediately following $$ are on separate lines
  formatted = formatted.replace(/(\$\$)\s*(#{1,6}\s+)/g, '$1\n\n$2');
  formatted = formatted.replace(/(\$\$)\s*([*-]\s+)/g, '$1\n\n$2');

  // 7. Clean up excessive newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted.trim();
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const processedContent = preprocessLaTeX(content);

  return (
    <div className={`markdown-content text-[14px] leading-relaxed text-[#1d1b17] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1d1b17] mt-5 mb-3 tracking-tight border-b border-[#ede7df] pb-2 first:mt-0" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg sm:text-xl font-bold text-[#1d1b17] mt-4 mb-2.5 tracking-tight border-b border-[#ede7df]/60 pb-1.5 first:mt-0" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base sm:text-lg font-bold text-[#745948] mt-3.5 mb-2 first:mt-0" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-sm sm:text-base font-semibold text-[#1d1b17] mt-3 mb-1.5 first:mt-0" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-3 text-[#1d1b17] leading-relaxed last:mb-0" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside pl-5 mb-3 space-y-1.5 text-[#1d1b17]" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside pl-5 mb-3 space-y-1.5 text-[#1d1b17]" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-[#1d1b17]" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-[#4f453f]" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-4 border-[#ede7df]" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-[#745948] pl-3.5 py-1.5 my-3 bg-[#f9f3eb] rounded-r-xl text-[#4f453f] italic" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-[#ede7df] shadow-xs">
              <table className="min-w-full divide-y divide-[#ede7df] text-left text-xs sm:text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-[#f9f3eb] text-[#1d1b17] font-bold" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px]" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-[#ede7df]/60 bg-white" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3.5 py-2 text-[#1d1b17]" {...props} />
          ),
          code: ({ node, className: codeClassName, children, ...props }: any) => {
            const isInline = !codeClassName && !String(children).includes('\n');
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded-md bg-[#ede7df] text-[#745948] font-mono text-xs font-semibold" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div className="my-3 rounded-xl overflow-hidden bg-[#1e1c19] text-[#e8e2da] p-3 text-xs font-mono overflow-x-auto shadow-inner">
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
};

export default MarkdownRenderer;
