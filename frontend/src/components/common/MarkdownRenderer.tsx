import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onCitationClick?: (pageNumber: number) => void;
}

/**
 * Preprocesses markdown text to ensure LaTeX math syntax is parsed cleanly.
 * - Converts \[ ... \] to $$ ... $$ on isolated lines
 * - Converts \( ... \) to $ ... $
 * - Isolates $$ fences onto their own lines so remark-math does not treat \begin{array} as metadata
 * - Wraps bare math environments in $$ fences
 * - Ensures markdown headings immediately following math are separated cleanly
 * - Formats bare source citations into interactive markdown links
 */
function preprocessLaTeX(content: string): string {
  if (!content || typeof content !== 'string') return '';

  let formatted = content;

  // Convert bare "Source: Page X" or "📖 Source: Page X" lines into markdown links if not already linked
  formatted = formatted.replace(
    /^(\s*>*\s*📖?\s*(?:\*\*)?Source:\s*(?:\*\*)?)\s*(?:Page|p\.)?\s*(\d+)(.*)$/gim,
    (_m, _p1, pNum, note) => {
      const noteClean = (note || '').trim().replace(/^[•\*\-\s]+/, '');
      const noteStr = noteClean ? ` • *${noteClean}*` : '';
      return `> 📖 **Source: [Page ${pNum}](#page-${pNum})**${noteStr}`;
    }
  );

  // 0. Clean up accidental escaped dollar signs produced inside display math: `$$\$h = ...\$$` -> `$$\nh = ...\n$$`
  formatted = formatted.replace(
    /\$\$\s*\\+\$?([\s\S]*?)\\+\$?\s*\$\$/g,
    (_match, eq) => {
      const cleanEq = eq.replace(/^\\+\$|\\+\$?$/g, '').trim();
      return `\n\n$$\n${cleanEq}\n$$\n\n`;
    }
  );

  // 1. Fix whole-line escaped math strings like `\$h = x_{i+1} - x_i\` or `\$\Delta y_i = y_{i+1} - y_i\`
  formatted = formatted.replace(
    /^[ \t]*\\+\$([^\n]+?)(?:\\+\$|\\+)?\s*$/gm,
    (_match, eq) => {
      const cleanEq = eq.replace(/\\+$/, '').trim();
      return `\n\n$$\n${cleanEq}\n$$\n\n`;
    }
  );

  // 2. Fix inline escaped math strings
  formatted = formatted.replace(
    /(?:^|[ \t])\\+\$([^\$\n]+?)\\+(?:\$|[ \t]|$)/gm,
    (_match, eq) => ` $${eq.trim().replace(/\\+$/, '').trim()}$ `
  );
  formatted = formatted.replace(
    /\\+\$([^\$\n]+?)\\+\$/g,
    (_match, eq) => `$${eq.trim().replace(/\\+$/, '').trim()}$`
  );

  // 3. Convert \[ ... \] display math to $$ ... $$ on isolated lines
  formatted = formatted.replace(/\\\[([\s\S]*?)\\\]/g, (_match, eq) => `\n\n$$\n${eq.trim()}\n$$\n\n`);

  // 4. Convert \( ... \) inline math to $ ... $
  formatted = formatted.replace(/\\\(([\s\S]*?)\\\)/g, (_match, eq) => `$${eq.trim()}$`);

  // 4. Normalize all existing $$ ... $$ blocks so $$ delimiters are guaranteed to be isolated on their own lines
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

interface MermaidProps {
  chart: string;
}

const MermaidChart: React.FC<MermaidProps> = ({ chart }) => {
  const [svg, setSvg] = React.useState<string>('');
  const [error, setError] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        if (isMounted) {
          setSvg(renderedSvg);
          setError(false);
        }
      } catch (err) {
        if (isMounted) setError(true);
      }
    };
    renderChart();
    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error || !svg) {
    return (
      <div className="my-3 rounded-xl overflow-hidden bg-[#1e1c19] text-[#e8e2da] p-3 text-xs font-mono overflow-x-auto">
        <pre className="whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      className="my-4 p-4 rounded-2xl bg-[#fdfbf9] border border-[#ede7df] shadow-xs flex justify-center items-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '', onCitationClick }) => {
  const processedContent = preprocessLaTeX(content);

  return (
    <div className={`markdown-content text-[16px] sm:text-[17px] leading-relaxed text-[#1d1b17] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1d1b17] mt-6 mb-3 tracking-tight border-b border-[#ede7df] pb-2.5 first:mt-0" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl sm:text-2xl font-bold text-[#1d1b17] mt-5 mb-3 tracking-tight border-b border-[#ede7df]/70 pb-2 first:mt-0" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-lg sm:text-xl font-bold text-[#745948] mt-4 mb-2 first:mt-0" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-base sm:text-lg font-semibold text-[#1d1b17] mt-3.5 mb-2 first:mt-0" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-3.5 text-[#1d1b17] leading-relaxed last:mb-0" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside pl-6 mb-3.5 space-y-2 text-[#1d1b17]" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside pl-6 mb-3.5 space-y-2 text-[#1d1b17]" {...props} />
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
            <hr className="my-5 border-[#ede7df]" {...props} />
          ),
          blockquote: ({ node, children, ...props }) => {
            return (
              <blockquote className="border-l-3 border-[#745948]/70 pl-3 py-1.5 my-2.5 bg-[#f9f3eb]/70 rounded-r-xl text-[#5a4e46] text-[13px] sm:text-[14px] leading-relaxed flex items-center flex-wrap gap-1.5 shadow-2xs" {...props}>
                {children}
              </blockquote>
            );
          },
          a: ({ node, href, children, ...props }: any) => {
            const pageMatch = href?.match(/page[=-]?(\d+)/i) || String(children).match(/page\s*(\d+)/i);
            if (pageMatch && onCitationClick) {
              const pageNum = parseInt(pageMatch[1], 10);
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCitationClick(pageNum);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 align-middle rounded-lg bg-[#f3cfba]/80 hover:bg-[#ebd0be] text-[#725746] font-semibold text-[11px] sm:text-[12px] border border-[#e2b79f] cursor-pointer transition-all shadow-2xs hover:shadow-xs group leading-tight"
                  title={`Open PDF directly at page ${pageNum}`}
                >
                  <span className="material-symbols-outlined text-[13px] text-[#725746] group-hover:scale-110 transition-transform">
                    menu_book
                  </span>
                  <span className="font-bold">{children}</span>
                  <span className="material-symbols-outlined text-[11px] opacity-75">open_in_new</span>
                </button>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#745948] underline font-semibold hover:text-[#523d2f] decoration-[#745948]/50 hover:decoration-[#745948]"
                {...props}
              >
                {children}
              </a>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-5 rounded-2xl border border-[#ede7df] shadow-sm">
              <table className="min-w-full divide-y divide-[#ede7df] text-left text-sm sm:text-base" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-[#f9f3eb] text-[#1d1b17] font-bold" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px] text-[#745948]" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-[#ede7df]/60 bg-white" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-2.5 text-[#1d1b17] text-[15px] sm:text-[16px]" {...props} />
          ),
          code: ({ node, className: codeClassName, children, ...props }: any) => {
            const isInline = !codeClassName && !String(children).includes('\n');
            if (isInline) {
              return (
                <code className="px-2 py-0.5 rounded-lg bg-[#f3ebe0] text-[#745948] font-mono text-[14px] sm:text-[15px] font-semibold border border-[#ede7df]" {...props}>
                  {children}
                </code>
              );
            }

            const codeStr = String(children).trim();
            if (codeClassName?.includes('mermaid') || codeClassName?.includes('language-mermaid')) {
              return <MermaidChart chart={codeStr} />;
            }

            return (
              <div className="my-4 rounded-2xl overflow-hidden bg-[#1e1c19] text-[#e8e2da] p-4 text-[14px] sm:text-[15px] font-mono overflow-x-auto shadow-inner leading-relaxed">
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
