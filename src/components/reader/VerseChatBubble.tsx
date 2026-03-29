import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiBookOpen,
  FiChevronDown,
  FiCornerDownLeft,
  FiGitBranch,
  FiLoader,
  FiMessageCircle,
  FiMinimize2,
  FiSend,
  FiStar,
  FiType,
  FiX,
} from 'react-icons/fi';
import '../../css/verseChat.css';
import { streamVerseChatResponse } from '../../services/verseChatService';
import type { VerseChatContext, VerseChatSource, VerseChatThread, VerseChatTurn } from '../../types/verseChat';
import {
  buildVerseChatMessagePayload,
  buildVerseChatSummary,
  createEmptyVerseChatThread,
  createVerseChatTurnId,
  getVerseChatThread,
  saveVerseChatThread,
} from '../../utils/verseChatStorage';

interface VerseChatBubbleProps {
  verseContext: VerseChatContext;
  previousVerseKey?: string | null;
  tafsirPlainText: string | null;
  selectedTafsirId: number | null;
  selectedTafsirName: string | null;
  isTafsirLoading?: boolean;
  hasAudioPlayer?: boolean;
}

const QUICK_PROMPTS = [
  {
    label: 'What does this ayah mean?',
    icon: FiBookOpen,
  },
  {
    label: 'Explain key words',
    icon: FiType,
  },
  {
    label: 'How does this connect to the previous ayah?',
    icon: FiGitBranch,
  },
];

const MOBILE_PANEL_BASE_WIDTH = 360;
const MOBILE_PANEL_BASE_HEIGHT = 620;
const DEFAULT_PLAYER_HEIGHT = 72;

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const shorten = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

const parseCssPixels = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getViewportMetrics = () => {
  if (typeof window === 'undefined') {
    return { width: MOBILE_PANEL_BASE_WIDTH, height: MOBILE_PANEL_BASE_HEIGHT, playerHeight: DEFAULT_PLAYER_HEIGHT };
  }

  const visualViewport = window.visualViewport;
  const rootStyles = window.getComputedStyle(document.documentElement);

  return {
    width: visualViewport?.width ?? window.innerWidth,
    height: visualViewport?.height ?? window.innerHeight,
    playerHeight: parseCssPixels(rootStyles.getPropertyValue('--player-height'), DEFAULT_PLAYER_HEIGHT),
  };
};

const formatRelativeUpdate = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return 'Ready';
  }

  const elapsedMinutes = Math.round((Date.now() - timestamp) / 60000);
  if (elapsedMinutes <= 1) {
    return 'Ready now';
  }

  if (elapsedMinutes < 60) {
    return `Updated ${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);
  return `Updated ${elapsedHours}h ago`;
};

const getFocusableNodes = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true');

const createAssistantTurn = (content: string, sources: VerseChatSource[]): VerseChatTurn => ({
  id: createVerseChatTurnId(),
  role: 'assistant',
  content,
  createdAt: new Date().toISOString(),
  sources,
});

export default function VerseChatBubble({
  verseContext,
  previousVerseKey = null,
  tafsirPlainText,
  selectedTafsirId,
  selectedTafsirName,
  isTafsirLoading = false,
  hasAudioPlayer = false,
}: VerseChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  );
  const [viewportMetrics, setViewportMetrics] = useState(() => getViewportMetrics());
  const [draft, setDraft] = useState('');
  const [thread, setThread] = useState<VerseChatThread>(() => getVerseChatThread(verseContext.verseKey) ?? createEmptyVerseChatThread(verseContext.verseKey));
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [streamedText, setStreamedText] = useState('');
  const [streamedSources, setStreamedSources] = useState<VerseChatSource[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamBufferRef = useRef('');
  const streamSourcesRef = useRef<VerseChatSource[]>([]);
  const turnsEndRef = useRef<HTMLDivElement | null>(null);
  const threadRef = useRef(thread);

  threadRef.current = thread;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const update = () => {
      setIsMobile(mediaQuery.matches);
      setViewportMetrics(getViewportMetrics());
    };
    update();

    mediaQuery.addEventListener('change', update);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);

    return () => {
      mediaQuery.removeEventListener('change', update);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  const persistThread = useCallback((nextThread: VerseChatThread) => {
    setThread(nextThread);
    saveVerseChatThread(nextThread);
  }, []);

  const stopStreaming = useCallback((preservePartial: boolean) => {
    const controller = abortControllerRef.current;
    if (controller) {
      controller.abort();
      abortControllerRef.current = null;
    }

    const partialText = collapseWhitespace(streamBufferRef.current);
    const partialSources = streamSourcesRef.current;

    if (preservePartial && partialText) {
      const currentThread = threadRef.current;
      const assistantTurn = createAssistantTurn(partialText, partialSources);
      const nextTurns = [...currentThread.turns, assistantTurn];
      const completedThread = {
        ...currentThread,
        turns: nextTurns,
        threadSummary: buildVerseChatSummary(nextTurns),
        lastOpenedAt: new Date().toISOString(),
      };
      persistThread(completedThread);
    }

    streamBufferRef.current = '';
    streamSourcesRef.current = [];
    setStreamedText('');
    setStreamedSources([]);
    setIsStreaming(false);
    setStatusText('Ready');
  }, [persistThread]);

  useEffect(() => {
    stopStreaming(false);
    setErrorMessage(null);
    setDraft('');

    const existingThread = getVerseChatThread(verseContext.verseKey) ?? createEmptyVerseChatThread(verseContext.verseKey);
    const touchedThread = {
      ...existingThread,
      lastOpenedAt: new Date().toISOString(),
    };
    persistThread(touchedThread);
  }, [persistThread, stopStreaming, verseContext.verseKey]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    turnsEndRef.current?.scrollIntoView({ block: 'end' });
  }, [isOpen, isStreaming, streamedSources, streamedText, thread.turns]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTarget = window.setTimeout(() => {
      const focusableNodes = panelRef.current ? getFocusableNodes(panelRef.current) : [];
      (focusableNodes[0] ?? panelRef.current)?.focus();
    }, 16);

    if (isMobile) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        window.clearTimeout(focusTarget);
        document.body.style.overflow = previousOverflow;
        previousFocusedElementRef.current?.focus?.();
      };
    }

    return () => {
      window.clearTimeout(focusTarget);
      previousFocusedElementRef.current?.focus?.();
    };
  }, [isMobile, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (!isMobile || event.key !== 'Tab' || !panelRef.current) {
        return;
      }

      const focusableNodes = getFocusableNodes(panelRef.current);
      if (focusableNodes.length === 0) {
        return;
      }

      const firstNode = focusableNodes[0];
      const lastNode = focusableNodes[focusableNodes.length - 1];
      const activeNode = document.activeElement;

      if (event.shiftKey && activeNode === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && activeNode === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, isOpen]);

  const previousVerseSummary = useMemo(() => {
    if (!previousVerseKey) {
      return '';
    }

    return getVerseChatThread(previousVerseKey)?.threadSummary ?? '';
  }, [previousVerseKey]);

  const isReady = Boolean(selectedTafsirId && selectedTafsirName && tafsirPlainText && tafsirPlainText.trim().length > 0 && !isTafsirLoading);
  const launcherBottom = hasAudioPlayer ? 'calc(var(--player-height) + 16px)' : '16px';
  const mobilePanelScale = useMemo(() => {
    if (!isMobile) {
      return 1;
    }

    const horizontalMargin = 12;
    const topMargin = 8;
    const bottomMargin = (hasAudioPlayer ? viewportMetrics.playerHeight : 0) + 8;
    const availableWidth = Math.max(viewportMetrics.width - horizontalMargin, 120);
    const availableHeight = Math.max(viewportMetrics.height - topMargin - bottomMargin, 180);

    return Math.min(
      1,
      availableWidth / MOBILE_PANEL_BASE_WIDTH,
      availableHeight / MOBILE_PANEL_BASE_HEIGHT,
    );
  }, [hasAudioPlayer, isMobile, viewportMetrics.height, viewportMetrics.playerHeight, viewportMetrics.width]);
  const mobilePanelWidth = MOBILE_PANEL_BASE_WIDTH * mobilePanelScale;
  const mobilePanelHeight = MOBILE_PANEL_BASE_HEIGHT * mobilePanelScale;

  const groundedStatus = useMemo(() => {
    if (isTafsirLoading) {
      return 'Reading tafsir context…';
    }

    if (!selectedTafsirId || !selectedTafsirName) {
      return 'Select a tafsir to start verse chat.';
    }

    if (!tafsirPlainText?.trim()) {
      return 'This chat needs verse tafsir context before it can answer.';
    }

    return `Grounded in ${verseContext.verseKey} and ${selectedTafsirName}.`;
  }, [isTafsirLoading, selectedTafsirId, selectedTafsirName, tafsirPlainText, verseContext.verseKey]);

  const commitAssistantTurn = useCallback((content: string, sources: VerseChatSource[], summary?: string) => {
    const assistantTurn = createAssistantTurn(content, sources);
    const nextTurns = [...threadRef.current.turns, assistantTurn];
    const nextThread = {
      ...threadRef.current,
      turns: nextTurns,
      threadSummary: summary || buildVerseChatSummary(nextTurns),
      lastOpenedAt: new Date().toISOString(),
    };
    persistThread(nextThread);
  }, [persistThread]);

  const sendPrompt = useCallback(async (prompt: string) => {
    const normalizedPrompt = collapseWhitespace(prompt);
    if (!normalizedPrompt || !isReady || !selectedTafsirId || !selectedTafsirName || !tafsirPlainText) {
      return;
    }

    const requestThreadSummary =
      threadRef.current.threadSummary || buildVerseChatSummary(threadRef.current.turns);

    const userTurn: VerseChatTurn = {
      id: createVerseChatTurnId(),
      role: 'user',
      content: normalizedPrompt,
      createdAt: new Date().toISOString(),
    };

    const baseThread = {
      ...threadRef.current,
      turns: [...threadRef.current.turns, userTurn],
      lastOpenedAt: new Date().toISOString(),
    };

    persistThread(baseThread);
    threadRef.current = baseThread;
    setDraft('');
    setErrorMessage(null);
    setIsStreaming(true);
    setStatusText('Reading tafsir…');
    setStreamedText('');
    setStreamedSources([]);
    streamBufferRef.current = '';
    streamSourcesRef.current = [];

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamVerseChatResponse(
        {
          threadId: verseContext.verseKey,
          messages: buildVerseChatMessagePayload(normalizedPrompt),
          threadSummary: requestThreadSummary || undefined,
          verseContext,
          tafsirContext: {
            plainText: tafsirPlainText,
            sourceLabel: selectedTafsirName,
          },
          previousVerseSummary: previousVerseSummary || undefined,
          selectedTafsirId,
          selectedTafsirName,
        },
        {
          onStatus: (status) => {
            setStatusText(status);
          },
          onDelta: (delta) => {
            streamBufferRef.current += delta;
            setStreamedText(streamBufferRef.current);
          },
          onSources: (sources) => {
            streamSourcesRef.current = sources;
            setStreamedSources(sources);
          },
          onDone: (summary) => {
            const finalText = collapseWhitespace(streamBufferRef.current);
            if (finalText) {
              commitAssistantTurn(finalText, streamSourcesRef.current, summary);
            }

            abortControllerRef.current = null;
            streamBufferRef.current = '';
            streamSourcesRef.current = [];
            setStreamedText('');
            setStreamedSources([]);
            setIsStreaming(false);
            setStatusText('Ready');
          },
        },
        controller.signal,
      );
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      console.error('Verse chat request failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Verse chat failed.');
      setIsStreaming(false);
      setStatusText('Ready');
      setStreamedText('');
      setStreamedSources([]);
      streamBufferRef.current = '';
      streamSourcesRef.current = [];
      abortControllerRef.current = null;
    }
  }, [commitAssistantTurn, isReady, persistThread, previousVerseSummary, selectedTafsirId, selectedTafsirName, tafsirPlainText, verseContext]);

  const handleSubmit = useCallback(async () => {
    await sendPrompt(draft);
  }, [draft, sendPrompt]);

  const pendingTurn = streamedText
    ? {
        content: streamedText,
        sources: streamedSources,
      }
    : null;

  const panelLabelId = `verse-chat-label-${verseContext.verseKey.replace(':', '-')}`;
  const panelDescriptionId = `verse-chat-description-${verseContext.verseKey.replace(':', '-')}`;

  return (
    <>
      {isOpen && isMobile && (
        <button
          type="button"
          className="fixed inset-0 bg-black/35 z-dropdown"
          aria-label="Close verse chat overlay"
          onClick={() => setIsOpen(false)}
          style={{ bottom: hasAudioPlayer ? 'var(--player-height)' : 0 }}
        />
      )}

      <div
        className="fixed right-4 z-player"
        style={{ bottom: launcherBottom }}
      >
        {isOpen && (
          <div
            ref={panelRef}
            role="dialog"
            aria-modal={isMobile}
            aria-labelledby={panelLabelId}
            aria-describedby={panelDescriptionId}
            tabIndex={-1}
            className={[
              'relative',
              isMobile
                ? 'fixed z-modal'
                : 'mb-4 flex w-[400px] max-w-[calc(100vw-2rem)] flex-col rounded-[24px]',
            ].join(' ')}
            style={
              isMobile
                ? {
                    bottom: hasAudioPlayer ? 'calc(var(--player-height) + 8px)' : '8px',
                    left: '50%',
                    width: `${mobilePanelWidth}px`,
                    height: `${mobilePanelHeight}px`,
                    transform: 'translateX(-50%)',
                  }
                : {
                    maxHeight: `min(72vh, calc(100vh - ${hasAudioPlayer ? 'calc(var(--player-height) + 56px)' : '56px'}))`,
                  }
            }
          >
            <div
              className={[
                isMobile
                  ? 'verse-chat-panel verse-chat-sheet relative flex h-[620px] w-[360px] flex-col overflow-hidden border border-border'
                  : 'verse-chat-panel relative flex h-full flex-col overflow-hidden rounded-[24px] border border-border',
              ].join(' ')}
              style={
                isMobile
                  ? {
                      transform: `scale(${mobilePanelScale})`,
                      transformOrigin: 'top left',
                    }
                  : undefined
              }
            >
            <div className="flex items-start justify-between gap-2 border-b border-border px-3 pb-2.5 pt-3 max-[360px]:px-2.5 max-[360px]:pb-2 max-[360px]:pt-2.5 max-[300px]:px-2 max-[300px]:pt-2 md:gap-3 md:px-4 md:pb-3 md:pt-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[18px] bg-primary/12 text-primary shadow-sm max-[360px]:h-7 max-[360px]:w-7 max-[360px]:rounded-2xl max-[300px]:h-6 max-[300px]:w-6 md:h-10 md:w-10 md:rounded-2xl">
                    <FiMessageCircle size={isMobile ? 16 : 18} />
                  </div>
                  <div className="min-w-0">
                    <p id={panelLabelId} className="text-[13px] font-semibold text-text max-[360px]:text-xs max-[300px]:text-[11px] md:text-sm">
                      Verse Chat
                    </p>
                    <p id={panelDescriptionId} className="text-[11px] leading-5 text-text-muted max-[360px]:text-[10px] max-[360px]:leading-4 max-[300px]:text-[9px] md:text-xs md:leading-6">
                      Ask only about this ayah and its selected tafsir.
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5 max-[360px]:mt-2 max-[360px]:gap-1 md:mt-3 md:gap-2">
                  <span className="badge border border-border bg-surface-2 px-2.5 py-1.5 text-[11px] text-text max-[360px]:px-2 max-[360px]:py-1 max-[360px]:text-[10px] max-[300px]:text-[9px] md:px-3 md:py-2 md:text-xs">
                    Ayah {verseContext.verseKey}
                  </span>
                  {selectedTafsirName && (
                    <span className="badge border border-border bg-surface-2 px-2.5 py-1.5 text-[11px] text-text max-[360px]:px-2 max-[360px]:py-1 max-[360px]:text-[10px] max-[300px]:text-[9px] md:px-3 md:py-2 md:text-xs">
                      {selectedTafsirName}
                    </span>
                  )}
                  <span className="badge border border-border bg-surface-2 px-2.5 py-1.5 text-[11px] text-text-muted max-[360px]:px-2 max-[360px]:py-1 max-[360px]:text-[10px] max-[300px]:text-[9px] md:px-3 md:py-2 md:text-xs">
                    {formatRelativeUpdate(thread.lastOpenedAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="btn-ghost p-1.5 md:p-2"
                  onClick={() => setIsOpen(false)}
                  aria-label="Minimize verse chat"
                >
                  <FiMinimize2 size={isMobile ? 14 : 16} />
                </button>
                <button
                  type="button"
                  className="btn-ghost p-1.5 md:p-2"
                  onClick={() => {
                    stopStreaming(false);
                    setErrorMessage(null);
                    setIsOpen(false);
                  }}
                  aria-label="Close verse chat"
                >
                  <FiX size={isMobile ? 14 : 16} />
                </button>
              </div>
            </div>

            <div className="verse-chat-scroll flex-1 space-y-3 overflow-y-auto px-3 py-3 max-[360px]:space-y-2.5 max-[360px]:px-2.5 max-[360px]:py-2.5 max-[300px]:px-2 max-[300px]:py-2 md:space-y-4 md:px-4 md:py-4">
              {thread.turns.length === 0 && !pendingTurn ? (
                <div className="rounded-[18px] border border-border bg-surface px-3 py-3 shadow-sm max-[360px]:rounded-2xl max-[360px]:px-2.5 max-[360px]:py-2.5 max-[300px]:px-2 max-[300px]:py-2 md:rounded-[22px] md:px-4 md:py-4">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-text max-[360px]:text-xs max-[300px]:text-[11px] md:text-sm">
                    <FiStar className="text-accent" size={15} />
                    Grounded verse conversation
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-text-muted max-[360px]:text-xs max-[360px]:leading-5 max-[300px]:text-[11px] md:text-sm md:leading-7">
                    This assistant answers from the active ayah, your selected tafsir, and optional continuity from the previous ayah’s chat summary.
                  </p>
                  <div className="mt-3 grid gap-2 max-[360px]:mt-2.5 max-[360px]:gap-1.5 md:mt-4">
                    {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
                      <button
                        key={label}
                        type="button"
                        className="btn-secondary justify-start rounded-[18px] px-3 py-2.5 text-left text-[13px] max-[360px]:rounded-2xl max-[360px]:px-2.5 max-[360px]:py-2 max-[360px]:text-xs max-[300px]:px-2 max-[300px]:text-[11px] md:rounded-2xl md:px-4 md:py-3 md:text-sm"
                        onClick={() => {
                          setIsOpen(true);
                          void sendPrompt(label);
                        }}
                        disabled={!isReady || isStreaming}
                      >
                        <Icon size={15} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {thread.turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={[
                      'max-w-[92%] rounded-[18px] px-3 py-2.5 shadow-sm max-[360px]:max-w-[96%] max-[360px]:rounded-2xl max-[360px]:px-2.5 max-[360px]:py-2 max-[300px]:px-2 md:max-w-[88%] md:rounded-[22px] md:px-4 md:py-3',
                      turn.role === 'user'
                        ? 'bg-primary text-on-primary'
                        : 'border border-border bg-surface text-text',
                    ].join(' ')}
                  >
                    <p className="whitespace-pre-wrap text-[13px] leading-6 max-[360px]:text-xs max-[360px]:leading-5 max-[300px]:text-[11px] md:text-sm md:leading-7">{turn.content}</p>

                    {turn.role === 'assistant' && turn.sources && turn.sources.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        {turn.sources.map((source) => (
                          <div key={`${turn.id}-${source.label}`} className="rounded-[18px] border border-border bg-surface-2 px-2.5 py-2 max-[360px]:rounded-2xl max-[360px]:px-2 max-[360px]:py-1.5 md:rounded-2xl md:px-3">
                            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-text-muted max-[360px]:text-[9px] md:text-[11px]">
                              {source.kind === 'tafsir' ? <FiBookOpen size={12} /> : source.kind === 'previous_summary' ? <FiGitBranch size={12} /> : <FiCornerDownLeft size={12} />}
                              <span>{source.label}</span>
                            </div>
                            {source.excerpt && (
                              <p className="mt-2 text-[11px] leading-5 text-text-muted max-[360px]:text-[10px] max-[360px]:leading-4 max-[300px]:text-[9px] md:text-xs md:leading-6">
                                {shorten(source.excerpt, 180)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {pendingTurn && (
                <div className="flex justify-start">
                  <div className="max-w-[92%] rounded-[18px] border border-border bg-surface px-3 py-2.5 shadow-sm max-[360px]:max-w-[96%] max-[360px]:rounded-2xl max-[360px]:px-2.5 max-[360px]:py-2 max-[300px]:px-2 md:max-w-[88%] md:rounded-[22px] md:px-4 md:py-3">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-text-muted max-[360px]:text-[10px] md:text-xs">
                      <FiLoader className="verse-chat-spinner text-primary" size={13} />
                      <span>{statusText}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-[13px] leading-6 text-text max-[360px]:text-xs max-[360px]:leading-5 max-[300px]:text-[11px] md:text-sm md:leading-7">
                      {pendingTurn.content}
                      <span className="verse-chat-caret text-primary">|</span>
                    </p>

                    {pendingTurn.sources.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {pendingTurn.sources.map((source) => (
                          <div key={`pending-${source.label}`} className="rounded-[18px] border border-border bg-surface-2 px-2.5 py-2 max-[360px]:rounded-2xl max-[360px]:px-2 max-[360px]:py-1.5 md:rounded-2xl md:px-3">
                            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-text-muted max-[360px]:text-[9px] md:text-[11px]">
                              {source.kind === 'tafsir' ? <FiBookOpen size={12} /> : source.kind === 'previous_summary' ? <FiGitBranch size={12} /> : <FiCornerDownLeft size={12} />}
                              <span>{source.label}</span>
                            </div>
                            {source.excerpt && (
                              <p className="mt-2 text-[11px] leading-5 text-text-muted max-[360px]:text-[10px] max-[360px]:leading-4 max-[300px]:text-[9px] md:text-xs md:leading-6">{shorten(source.excerpt, 180)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={turnsEndRef} />
            </div>

            <div className="border-t border-border px-3 pb-3 pt-2.5 max-[360px]:px-2.5 max-[360px]:pb-2.5 max-[360px]:pt-2 max-[300px]:px-2 max-[300px]:pb-2 md:px-4 md:pb-4 md:pt-3">
              <div
                role="status"
                aria-live="polite"
                className="mb-2.5 flex items-center gap-2 text-[11px] text-text-muted max-[360px]:mb-2 max-[360px]:flex-wrap max-[360px]:text-[10px] max-[300px]:text-[9px] md:mb-3 md:text-xs"
              >
                {isStreaming ? <FiLoader className="verse-chat-spinner text-primary" size={12} /> : <FiChevronDown size={12} />}
                <span>{isStreaming ? statusText : groundedStatus}</span>
              </div>

              {errorMessage && (
                <div className="mb-2.5 flex items-start gap-2 rounded-[18px] border border-danger/20 bg-danger/5 px-2.5 py-2 text-[13px] text-danger max-[360px]:mb-2 max-[360px]:rounded-2xl max-[360px]:px-2 max-[360px]:py-1.5 max-[360px]:text-xs max-[300px]:text-[11px] md:mb-3 md:rounded-2xl md:px-3 md:text-sm">
                  <FiAlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="rounded-[20px] border border-border bg-surface-2 px-2.5 py-2.5 shadow-inner max-[360px]:rounded-[18px] max-[360px]:px-2 max-[360px]:py-2 max-[300px]:px-1.5 max-[300px]:py-1.5 md:rounded-[24px] md:px-3 md:py-3">
                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  rows={1}
                  className="max-h-28 min-h-[40px] w-full resize-none border-0 bg-transparent px-0 py-0 text-[13px] leading-6 text-text shadow-none focus:shadow-none max-[360px]:max-h-24 max-[360px]:min-h-[34px] max-[360px]:text-xs max-[360px]:leading-5 max-[300px]:min-h-[30px] max-[300px]:text-[11px] md:max-h-32 md:min-h-[48px] md:text-sm md:leading-7"
                  placeholder={
                    isReady
                      ? 'Ask about this ayah, its wording, or how it connects here…'
                      : 'Verse chat becomes available when tafsir context is ready.'
                  }
                  disabled={!isReady || isStreaming}
                />

                <div className="mt-2.5 flex items-center justify-between gap-2 max-[360px]:mt-2 max-[360px]:gap-1.5 md:mt-3 md:gap-3">
                  <div className="min-w-0 flex items-center gap-2 text-[11px] text-text-muted max-[360px]:text-[10px] max-[300px]:text-[9px] md:text-xs">
                    <FiMessageCircle size={13} />
                    <span className="truncate">{previousVerseSummary ? 'Previous ayah summary available' : 'Current ayah context only'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isStreaming && (
                      <button
                        type="button"
                        className="btn-secondary rounded-full px-2.5 py-1.5 text-[11px] max-[360px]:px-2 max-[360px]:py-1 max-[360px]:text-[10px] max-[300px]:px-1.5 max-[300px]:text-[9px] md:px-3 md:py-2 md:text-xs"
                        onClick={() => stopStreaming(true)}
                      >
                        Stop
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-primary rounded-full p-2.5 max-[360px]:p-2 max-[300px]:p-1.5 md:p-3"
                      onClick={() => void handleSubmit()}
                      disabled={!draft.trim() || !isReady || isStreaming}
                      aria-label="Send verse chat message"
                    >
                      <FiSend size={isMobile ? 15 : 16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

        <button
          ref={launcherRef}
          type="button"
          aria-label={`Open verse chat for ayah ${verseContext.verseKey}`}
          className="verse-chat-launcher btn-primary h-12 w-12 rounded-full p-0 max-[360px]:h-11 max-[360px]:w-11 max-[300px]:h-10 max-[300px]:w-10 md:h-14 md:w-14"
          onClick={() => setIsOpen((open) => !open)}
        >
          <FiMessageCircle size={isMobile ? 19 : 22} />
        </button>
      </div>
    </>
  );
}
