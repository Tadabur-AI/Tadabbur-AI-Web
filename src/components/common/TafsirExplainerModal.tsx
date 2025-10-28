import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiLoader, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { explainTafsir, type ExplainTafsirResponse } from '../../services/tafsirExplainerService';

interface TafsirExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  surahNumber: number;
  ayahNumber: number;
  tafsirId: number;
  tafsirHtml?: string | null;
}

const stripHtml = (input: string): string =>
  input
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export default function TafsirExplainerModal({
  isOpen,
  onClose,
  surahNumber,
  ayahNumber,
  tafsirId,
  tafsirHtml,
}: TafsirExplainerModalProps) {
  const [explanation, setExplanation] = useState<ExplainTafsirResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);

  const plainTafsir = useMemo(() => {
    if (!tafsirHtml) return '';
    return stripHtml(tafsirHtml);
  }, [tafsirHtml]);

  const requestExplanation = useCallback(async () => {
    if (hasRequested && explanation) {
      return;
    }

    if (!plainTafsir) {
      setError('Tafsir content is not available for this verse.');
      setExplanation(null);
      setHasRequested(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await explainTafsir(plainTafsir);
        setExplanation(result);
        setHasRequested(true);
        setLoading(false);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        console.error(`Tafsir explanation attempt ${attempt + 1}/${maxRetries} failed:`, lastError);

        if (attempt === maxRetries - 1) {
          setError('Failed to generate explanation. Please try again.');
          setLoading(false);
        } else {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
  }, [explanation, hasRequested, plainTafsir]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!hasRequested) {
      void requestExplanation();
    }
  }, [hasRequested, isOpen, requestExplanation]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setExplanation(null);
    setHasRequested(false);
    setError(null);
  }, [isOpen, surahNumber, ayahNumber, tafsirId, plainTafsir]);

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
            aria-label="Close tafsir explanation"
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
                onClick={requestExplanation}
                className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
              >
                Try again
              </button>
            </div>
          )}

          {explanation && !loading && !error && (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">Surah {surahNumber}, Ayah {ayahNumber}</h3>
                <p className="text-sm text-gray-600 mt-1">Tafsir ID: {tafsirId}</p>
              </div>

              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{explanation.explanation}</ReactMarkdown>
              </div>

              {explanation.keyTerms && explanation.keyTerms.length > 0 && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <h4 className="text-sm font-semibold text-blue-900">Key Terms</h4>
                  <ul className="mt-3 space-y-2 text-sm text-blue-900">
                    {explanation.keyTerms.map((item) => (
                      <li key={item.term}>
                        <span className="font-semibold">{item.term}:</span> {item.definition}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tafsirHtml && (
                <details className="rounded-lg border border-gray-200 p-4">
                  <summary className="cursor-pointer font-medium text-gray-900 hover:text-primary">
                    View Original Tafsir
                  </summary>
                  <div
                    className="mt-4 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: tafsirHtml }}
                  />
                </details>
              )}
            </div>
          )}

          {!loading && !explanation && !error && !plainTafsir && (
            <p className="text-sm text-gray-500">No tafsir content available to generate an explanation.</p>
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
          {!loading && !explanation && !error && plainTafsir && (
            <button
              onClick={requestExplanation}
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
