import type { VerseChatMessagePayload, VerseChatThread, VerseChatTurn } from '../types/verseChat';

const STORAGE_KEY = 'tadabbur_verse_chat_v1';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeTurn = (value: unknown): VerseChatTurn | null => {
  if (!isRecord(value)) {
    return null;
  }

  const role = value.role;
  const content = value.content;
  const id = value.id;
  const createdAt = value.createdAt;

  if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || typeof id !== 'string' || typeof createdAt !== 'string') {
    return null;
  }

  return {
    id,
    role,
    content,
    createdAt,
    sources: Array.isArray(value.sources)
      ? value.sources
          .filter(isRecord)
          .map((source) => ({
            kind:
              source.kind === 'verse' || source.kind === 'tafsir' || source.kind === 'previous_summary'
                ? source.kind
                : 'verse',
            label: typeof source.label === 'string' ? source.label : 'Source',
            excerpt: typeof source.excerpt === 'string' ? source.excerpt : undefined,
          }))
      : undefined,
  };
};

const normalizeThread = (value: unknown): VerseChatThread | null => {
  if (!isRecord(value) || typeof value.verseKey !== 'string' || typeof value.lastOpenedAt !== 'string') {
    return null;
  }

  const turns = Array.isArray(value.turns)
    ? value.turns.map(normalizeTurn).filter((turn): turn is VerseChatTurn => Boolean(turn))
    : [];

  return {
    verseKey: value.verseKey,
    turns,
    threadSummary: typeof value.threadSummary === 'string' ? value.threadSummary : '',
    lastOpenedAt: value.lastOpenedAt,
  };
};

const loadAllThreads = (): Record<string, VerseChatThread> => {
  if (typeof window === 'undefined') {
    return {};
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    return Object.entries(parsed).reduce<Record<string, VerseChatThread>>((accumulator, [key, value]) => {
      const normalized = normalizeThread(value);
      if (normalized) {
        accumulator[key] = normalized;
      }
      return accumulator;
    }, {});
  } catch (error) {
    console.error('Failed to parse verse chat storage:', error);
    return {};
  }
};

const saveAllThreads = (threads: Record<string, VerseChatThread>) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
};

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const shorten = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

export const createVerseChatTurnId = () =>
  `verse-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createEmptyVerseChatThread = (verseKey: string): VerseChatThread => ({
  verseKey,
  turns: [],
  threadSummary: '',
  lastOpenedAt: new Date().toISOString(),
});

export const getVerseChatThread = (verseKey: string): VerseChatThread | null => {
  const threads = loadAllThreads();
  return threads[verseKey] ?? null;
};

export const saveVerseChatThread = (thread: VerseChatThread) => {
  const threads = loadAllThreads();
  threads[thread.verseKey] = thread;
  saveAllThreads(threads);
};

export const buildVerseChatSummary = (turns: VerseChatTurn[]) => {
  const recentTurns = turns.slice(-4);
  if (recentTurns.length === 0) {
    return '';
  }

  return shorten(
    recentTurns
      .map((turn) => `${turn.role === 'user' ? 'Q' : 'A'}: ${collapseWhitespace(turn.content)}`)
      .join(' '),
    420,
  );
};

export const buildVerseChatMessagePayload = (latestUserPrompt: string): VerseChatMessagePayload[] => [
  {
    role: 'user',
    content: latestUserPrompt,
  },
];
