export const OPEN_VERSE_CHAT_EVENT = 'tadabbur:open-verse-chat';

export interface OpenVerseChatDetail {
  verseKey: string;
  prompt?: string;
  autoSend?: boolean;
}

export function requestVerseChatOpen(detail: OpenVerseChatDetail) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<OpenVerseChatDetail>(OPEN_VERSE_CHAT_EVENT, {
      detail,
    }),
  );
}
