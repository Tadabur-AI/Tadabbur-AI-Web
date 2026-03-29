const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const rawVerseChatApiUrl = import.meta.env.VITE_VERSE_CHAT_API_URL?.trim();

export const API_BASE_URL = rawApiBaseUrl
  ? rawApiBaseUrl.replace(/\/+$/, '')
  : 'http://localhost:8787';

export const VERSE_CHAT_API_URL = rawVerseChatApiUrl
  ? rawVerseChatApiUrl.replace(/\/+$/, '')
  : 'https://chat-with-tafseer.vercel.app/chat';

export const buildApiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
