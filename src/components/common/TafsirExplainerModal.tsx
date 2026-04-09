import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiLoader, FiMessageSquare, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { explainTafsir, type ExplainTafsirResponse } from '../../services/tafsirExplainerService';
import { requestVerseChatOpen } from '../../utils/verseChatEvents';
import Overlay from '../ui/Overlay';

interface TafsirExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  surahNumber: number;
  ayahNumber: number;
  tafsirId: number;
  tafsirHtml?: string | null;
  verse?: string;
  tafseerAuthor?: string;
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
  verse,
  tafseerAuthor,
}: TafsirExplainerModalProps) {
  const verseKey = verse || `${surahNumber}:${ayahNumber}`;
  const [explanation, setExplanation] = useState<ExplainTafsirResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);

  const plainTafsir = useMemo(() => {
    if (!tafsirHtml) return '';
    return stripHtml(tafsirHtml);
  }, [tafsirHtml]);

  const fallbackPrompt = explanation?.suggestedPrompt?.trim() || 'What does this verse say?';
  const isVerseChatFallback = explanation?.fallbackMode === 'verse_chat';

  const openVerseChatFallback = useCallback(() => {
    requestVerseChatOpen({
      verseKey,
      prompt: fallbackPrompt,
      autoSend: true,
    });
    onClose();
  }, [fallbackPrompt, onClose, verseKey]);

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
        const result = await explainTafsir(plainTafsir, verse, tafseerAuthor, tafsirId);
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
  }, [explanation, hasRequested, plainTafsir, verse, tafseerAuthor]);

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
    <Overlay
      open={isOpen}
      onClose={onClose}
      labelledBy="tafsir-explainer-title"
      describedBy="tafsir-explainer-description"
      surfaceClassName="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-xl"
    >
      <div>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 id="tafsir-explainer-title" className="text-xl font-bold text-text">
              Tafsir Explanation - Surah {surahNumber}:{ayahNumber}
            </h2>
            <p id="tafsir-explainer-description" className="mt-1 text-sm text-text-muted">
              Review the modern explanation, related key terms, and the original tafsir in one place.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
            aria-label="Close tafsir explanation"
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12" aria-live="polite">
              <FiLoader className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <p className="mt-4 text-text-muted">Generating modern English explanation...</p>
              <p className="mt-2 text-sm text-text-muted">This may take 15-30 seconds</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
              <p className="text-danger">{error}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={requestExplanation}
                  className="text-sm text-danger hover:underline"
                >
                  Try again
                </button>
                <button
                  onClick={openVerseChatFallback}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <FiMessageSquare className="h-4 w-4" aria-hidden="true" />
                  Ask in Verse Chat
                </button>
              </div>
            </div>
          )}

          {explanation && !loading && !error && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <h3 className="font-semibold text-text">Surah {surahNumber}, Ayah {ayahNumber}</h3>
                <p className="text-sm text-text-muted mt-1">Tafsir ID: {tafsirId}</p>
              </div>

              {isVerseChatFallback ? (
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <h3 className="font-semibold text-text">Verse chat fallback is available</h3>
                  <p className="mt-2 text-sm leading-7 text-text-muted">
                    The structured explainer is unavailable right now, but you can still ask the current ayah and selected tafsir directly in verse chat.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={openVerseChatFallback}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
                    >
                      <FiMessageSquare className="h-4 w-4" aria-hidden="true" />
                      Ask “{fallbackPrompt}”
                    </button>
                    <button
                      onClick={requestExplanation}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-2"
                    >
                      Try explainer again
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-text">
                  <ReactMarkdown>{explanation.explanation}</ReactMarkdown>
                </div>
              )}

              {explanation.keyTerms && explanation.keyTerms.length > 0 && !isVerseChatFallback && (
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <h4 className="text-sm font-semibold text-accent">Key Terms</h4>
                  <ul className="mt-3 space-y-2 text-sm text-text">
                    {explanation.keyTerms.map((item) => (
                      <li key={item.term}>
                        <span className="font-semibold">{item.term}:</span> {item.definition}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tafsirHtml && (
                <details className="rounded-lg border border-border p-4">
                  <summary className="cursor-pointer font-medium text-text hover:text-primary">
                    View Original Tafsir
                  </summary>
                  <div
                    className="mt-4 prose prose-sm max-w-none text-text"
                    dangerouslySetInnerHTML={{ __html: tafsirHtml }}
                  />
                </details>
              )}
            </div>
          )}

          {!loading && !explanation && !error && !plainTafsir && (
            <p className="text-sm text-text-muted">No tafsir content available to generate an explanation.</p>
          )}
        </div>

        <div className="border-t border-border p-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-2 transition-colors"
          >
            Close
          </button>
          {!loading && !explanation && !error && plainTafsir && (
            <button
              onClick={requestExplanation}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover transition-colors"
            >
              Generate Explanation
            </button>
          )}
        </div>
      </div>
    </Overlay>
  );
}
