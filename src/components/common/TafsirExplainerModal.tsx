import { useState } from 'react';
import { FiX, FiLoader } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { explainTafsir, type ExplainTafsirResponse } from '../../services/tafsirExplainerService';

interface TafsirExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  surahNumber: number;
  ayahNumber: number;
  tafsirId: number;
}

export default function TafsirExplainerModal({
  isOpen,
  onClose,
  surahNumber,
  ayahNumber,
  tafsirId,
}: TafsirExplainerModalProps) {
  const [explanation, setExplanation] = useState<ExplainTafsirResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);

  const handleExplain = async () => {
    if (hasRequested && explanation) return; // Don't re-fetch if we already have it

    setLoading(true);
    setError(null);

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await explainTafsir({
          surah: surahNumber,
          ayah: ayahNumber,
          tafsir_id: tafsirId,
        });
        setExplanation(result);
        setHasRequested(true);
        setLoading(false);
        return; // Success - exit early
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        console.error(`Tafsir fetch attempt ${attempt + 1}/${maxRetries} failed:`, lastError);

        // If it's the last attempt, silently fail; otherwise wait before retrying
        if (attempt === maxRetries - 1) {
          setError(null); // Don't show error to user
          setLoading(false);
        } else {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
  };

  // Auto-fetch when modal opens
  useState(() => {
    if (isOpen && !hasRequested) {
      handleExplain();
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-4xl w-full max-h-[90vh] rounded-lg bg-white shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-xl font-bold text-gray-900">
            Tafsir Explanation - Surah {surahNumber}:{ayahNumber}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <FiLoader className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-gray-600">Generating modern English explanation...</p>
              <p className="mt-2 text-sm text-gray-500">This may take 15-30 seconds</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-red-800">{error}</p>
              <button
                onClick={handleExplain}
                className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
              >
                Try again
              </button>
            </div>
          )}

          {explanation && !loading && (
            <div className="space-y-6">
              {/* Tafsir Info */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">{explanation.tafsir_name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Surah {explanation.surah}, Ayah {explanation.ayah}
                </p>
              </div>

              {/* Explained Content */}
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
    components={{
        code: ({ node, className, children, ...props }) => {
            return (
                <pre
                    style={{
                        background: '#1e1e1e',
                        color: '#f8f8f2',
                        padding: '10px',
                        borderRadius: '8px',
                        overflowX: 'auto',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        fontSize: '0.9em',
                    }}
                >
                    <code
                        style={{
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                        }}
                        {...props}
                    >
                        {children}
                    </code>
                </pre>
            );
        },
        p: ({ children }) => (
            <p
                style={{
                    marginBottom: '10px',
                    lineHeight: '1.6',
                    fontSize: '1em',
                    wordBreak: 'break-word',
                }}
            >
                {children}
            </p>
        ),
        a: ({ href, children }) => (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    color: '#1e90ff',
                    textDecoration: 'underline',
                    wordBreak: 'break-all',
                }}
            >
                {children}
            </a>
        ),
        h1: ({ children }) => (
            <h1
                style={{
                    fontSize: '1.8em',
                    margin: '16px 0 8px',
                    fontWeight: '700',
                    wordBreak: 'break-word',
                }}
            >
                {children}
            </h1>
        ),
        h2: ({ children }) => (
            <h2
                style={{
                    fontSize: '1.5em',
                    margin: '14px 0 6px',
                    fontWeight: '600',
                    wordBreak: 'break-word',
                }}
            >
                {children}
            </h2>
        ),
        ul: ({ children }) => (
            <ul
                style={{
                    paddingLeft: '20px',
                    marginBottom: '10px',
                    wordBreak: 'break-word',
                }}
            >
                {children}
            </ul>
        ),
        ol: ({ children }) => (
            <ol
                style={{
                    paddingLeft: '20px',
                    marginBottom: '10px',
                    wordBreak: 'break-word',
                }}
            >
                {children}
            </ol>
        ),
    }}
>
    {explanation?.explained_tafsir}
</ReactMarkdown>

              </div>

              {/* Original Tafsir (Collapsible) */}
              <details className="rounded-lg border border-gray-200 p-4">
                <summary className="cursor-pointer font-medium text-gray-900 hover:text-primary">
                  View Original Tafsir
                </summary>
                <div 
                  className="mt-4 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: explanation.original_tafsir }}
                />
              </details>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {!loading && !explanation && !error && (
            <button
              onClick={handleExplain}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Generate Explanation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
