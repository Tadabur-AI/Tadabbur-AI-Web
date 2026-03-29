import { VERSE_CHAT_API_URL } from '../utils/apiBaseUrl';
import type { VerseChatRequest, VerseChatSource } from '../types/verseChat';

interface StreamVerseChatHandlers {
  onStatus?: (status: string) => void;
  onDelta: (delta: string) => void;
  onSources?: (sources: VerseChatSource[]) => void;
  onDone?: (summary?: string) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

interface VercelVerseChatResponse {
  answer?: string;
  detail?: string;
  resource_id?: number;
  verse_key?: string;
  chapter_number?: number;
}

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const shorten = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

const getLatestUserMessage = (request: VerseChatRequest) =>
  [...request.messages]
    .reverse()
    .find((message) => message.role === 'user' && typeof message.content === 'string')
    ?.content.trim() ?? '';

const buildLocalSources = (request: VerseChatRequest): VerseChatSource[] => {
  const sources: VerseChatSource[] = [
    {
      kind: 'verse',
      label: `${request.verseContext.verseKey} verse`,
      excerpt: shorten(request.verseContext.translationText, 220),
    },
    {
      kind: 'tafsir',
      label: `${request.selectedTafsirName} tafsir`,
      excerpt: shorten(request.tafsirContext.plainText, 260),
    },
  ];

  if (request.previousVerseSummary) {
    const previousAyahNumber = request.verseContext.ayahNumber > 1
      ? `${request.verseContext.surahId}:${request.verseContext.ayahNumber - 1}`
      : 'previous ayah';

    sources.push({
      kind: 'previous_summary',
      label: `Prev ${previousAyahNumber} summary`,
      excerpt: shorten(request.previousVerseSummary, 220),
    });
  }

  return sources;
};

export async function streamVerseChatResponse(
  request: VerseChatRequest,
  handlers: StreamVerseChatHandlers,
  signal?: AbortSignal,
) {
  const latestUserMessage = getLatestUserMessage(request);
  if (!latestUserMessage) {
    throw new Error('Verse chat requires a user message.');
  }

  handlers.onStatus?.('Sending verse context…');

  const response = await fetch(VERSE_CHAT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resource_id: request.selectedTafsirId,
      verse_key: request.verseContext.verseKey,
      message: latestUserMessage,
      thread_id: request.threadId,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(
      typeof error.detail === 'string'
        ? error.detail
        : typeof error.error === 'string'
          ? error.error
          : `Verse chat failed with status ${response.status}`,
    );
  }

  handlers.onStatus?.('Waiting for verse reply…');

  const data = (await response.json().catch(() => null)) as VercelVerseChatResponse | null;
  if (!isRecord(data)) {
    throw new Error('Verse chat response format is invalid.');
  }

  if (typeof data.detail === 'string' && !data.answer) {
    throw new Error(data.detail);
  }

  const answer = typeof data.answer === 'string' ? collapseWhitespace(data.answer) : '';
  if (!answer) {
    throw new Error('Verse chat did not return an answer.');
  }

  handlers.onStatus?.('Preparing answer…');
  handlers.onSources?.(buildLocalSources(request));
  handlers.onDelta(answer);
  handlers.onDone?.();
}
