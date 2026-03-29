import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  size?: 'sm' | 'lg';
}

const sizeClasses = {
  sm: {
    h1: 'text-xl',
    h2: 'text-lg',
    h3: 'text-base',
  },
  lg: {
    h1: 'text-2xl',
    h2: 'text-xl',
    h3: 'text-lg',
  },
} as const;

export default function MarkdownContent({ content, size = 'sm' }: MarkdownContentProps) {
  return (
    <div className="prose prose-sm max-w-none break-words w-full overflow-x-auto text-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className={`${sizeClasses[size].h1} font-bold text-primary mb-4`}>{children}</h1>,
          h2: ({ children }) => <h2 className={`${sizeClasses[size].h2} font-bold text-primary mb-3`}>{children}</h2>,
          h3: ({ children }) => <h3 className={`${sizeClasses[size].h3} font-bold text-primary mb-2`}>{children}</h3>,
          p: ({ children }) => <p className="mb-3 leading-relaxed text-text">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-accent pl-4 italic text-text-muted my-3">{children}</blockquote>
          ),
          ul: ({ children }) => <ul className="list-disc pl-6 mb-3">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-3">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ children, className }) => {
            if (className) {
              return <code className={className}>{children}</code>;
            }

            return <code className="bg-surface-2 px-2 py-1 rounded text-sm font-mono">{children}</code>;
          },
          pre: ({ children }) => <pre className="bg-surface-2 p-4 rounded overflow-x-auto my-3">{children}</pre>,
          a: ({ children, href }) => (
            <a href={href} className="text-primary underline underline-offset-2">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
