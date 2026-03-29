export interface VerseChatContext {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  arabicText: string;
  translationText: string;
}

export interface VerseChatSource {
  kind: 'verse' | 'tafsir' | 'previous_summary';
  label: string;
  excerpt?: string;
}

export interface VerseChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sources?: VerseChatSource[];
}

export interface VerseChatThread {
  verseKey: string;
  turns: VerseChatTurn[];
  threadSummary: string;
  lastOpenedAt: string;
}

export interface VerseChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export interface VerseChatRequest {
  threadId: string;
  messages: VerseChatMessagePayload[];
  threadSummary?: string;
  verseContext: VerseChatContext;
  tafsirContext: {
    plainText: string;
    sourceLabel: string;
  };
  previousVerseSummary?: string;
  selectedTafsirId: number;
  selectedTafsirName: string;
}

export type VerseChatStreamEvent =
  | { status: string }
  | { delta: string }
  | { sources: VerseChatSource[] }
  | { done: true; summary?: string }
  | { error: string };
