import { buildApiUrl, VERSE_CHAT_API_URL } from '../utils/apiBaseUrl';

export interface ExplainTafsirResponse {
  explanation: string;
  keyTerms?: ExplainTafsirKeyTerm[];
  cached?: boolean;
  fallbackMode?: 'verse_chat';
  suggestedPrompt?: string;
}

interface ExplainTafsirKeyTerm {
  term: string;
  definition: string;
}

type ExplainTafsirRawKeyTerm =
  | { term?: string; definition?: string; meaning?: string }
  | string;

interface ExplainTafsirRawResponse {
  explanation: string;
  cached?: boolean;
  keyTerms?: ExplainTafsirRawKeyTerm[] | Record<string, string>;
  key_terms?: ExplainTafsirRawKeyTerm[] | Record<string, string>;
  fallbackMode?: string;
  fallback_mode?: string;
  suggestedPrompt?: string;
  suggested_prompt?: string;
  error?: string;
  details?: string;
}

const VERSE_CHAT_FALLBACK_PROMPT = 'What does this verse say?';
const EXPLAINER_APOLOGY_PREFIX = 'We apologize, but the explanation could not be generated at this time.';

const buildVerseChatFallback = (detail?: string): ExplainTafsirResponse => ({
  explanation: [
    '# Explainer unavailable right now',
    '-> The structured tafsir explainer is temporarily unavailable.',
    `-> You can still ask grounded verse chat: "${VERSE_CHAT_FALLBACK_PROMPT}"`,
    detail ? `-> Service note: ${detail}` : '-> The verse chat fallback still uses the current ayah and selected tafsir.',
    '# Summary',
    '-> Use verse chat as the fallback explanation path for this ayah.',
  ].join('\n'),
  cached: false,
  fallbackMode: 'verse_chat',
  suggestedPrompt: VERSE_CHAT_FALLBACK_PROMPT,
});

interface VerseChatFallbackResponse {
  answer?: string;
  detail?: string;
  error?: string;
}

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const needsVerseChatFallback = (payload: ExplainTafsirRawResponse) => {
  const fallbackMode = payload.fallbackMode ?? payload.fallback_mode;
  const apology =
    typeof payload.explanation === 'string' &&
    collapseWhitespace(payload.explanation).startsWith(EXPLAINER_APOLOGY_PREFIX);
  const concurrencyFailure =
    typeof payload.details === 'string' && /too many concurrent requests/i.test(payload.details);

  return fallbackMode === 'verse_chat' || apology || concurrencyFailure;
};

async function fetchVerseChatFallback(
  verseKey?: string,
  tafsirId?: number,
): Promise<ExplainTafsirResponse> {
  if (!verseKey || !tafsirId) {
    return buildVerseChatFallback();
  }

  const response = await fetch(VERSE_CHAT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resource_id: tafsirId,
      verse_key: verseKey,
      message: VERSE_CHAT_FALLBACK_PROMPT,
      thread_id: `explanation-fallback-${verseKey}-${tafsirId}`,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText })) as VerseChatFallbackResponse;
    throw new Error(
      typeof error.detail === 'string'
        ? error.detail
        : typeof error.error === 'string'
          ? error.error
          : `Verse chat fallback failed with status ${response.status}`,
    );
  }

  const payload = await response.json().catch(() => null) as VerseChatFallbackResponse | null;
  const answer = typeof payload?.answer === 'string' ? collapseWhitespace(payload.answer) : '';

  if (!answer) {
    throw new Error('Verse chat fallback did not return an answer.');
  }

  return {
    explanation: answer,
    cached: false,
  };
}

/**
 * Explain tafsir for a specific verse in modern, easy-to-understand English.
 */
export async function explainTafsir(
  tafseerText: string,
  verse?: string,
  tafseerAuthor?: string,
  tafsirId?: number,
): Promise<ExplainTafsirResponse> {
  try {
    const response = await fetch(buildApiUrl('/generate-explanation'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tafseerText, verse, tafseerAuthor }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      if (response.status === 503) {
        return await fetchVerseChatFallback(verse, tafsirId);
      }
      throw new Error(error.detail || `Failed to generate explanation: ${response.statusText}`);
    }

    const payload = (await response.json()) as ExplainTafsirRawResponse;

    if (needsVerseChatFallback(payload)) {
      try {
        return await fetchVerseChatFallback(verse, tafsirId);
      } catch (fallbackError) {
        console.error('Verse chat fallback failed:', fallbackError);
        const detail =
          typeof payload.details === 'string'
            ? payload.details
            : typeof payload.error === 'string'
              ? payload.error
              : fallbackError instanceof Error
                ? fallbackError.message
                : undefined;
        return buildVerseChatFallback(detail);
      }
    }

    const rawKeyTerms = payload.keyTerms ?? payload.key_terms;
    const fallbackMode = payload.fallbackMode ?? payload.fallback_mode;
    const suggestedPrompt = payload.suggestedPrompt ?? payload.suggested_prompt;

    let keyTerms: ExplainTafsirKeyTerm[] | undefined;
    if (Array.isArray(rawKeyTerms)) {
      keyTerms = rawKeyTerms
        .map<ExplainTafsirKeyTerm | undefined>((item) => {
          if (typeof item === 'string') {
            return { term: item, definition: '' };
          }

          const term = item.term ?? item.definition ?? item.meaning ?? '';
          const definition = item.definition ?? item.meaning ?? '';

          if (!term && !definition) {
            return undefined;
          }

          return {
            term: term || definition,
            definition,
          };
        })
        .filter((value): value is ExplainTafsirKeyTerm => Boolean(value));
    } else if (rawKeyTerms && typeof rawKeyTerms === 'object') {
      keyTerms = Object.entries(rawKeyTerms)
        .map(([term, definition]) => {
          if (!term?.trim() && !String(definition).trim()) {
            return undefined;
          }

          return {
            term: term.trim() || String(definition).trim(),
            definition: String(definition ?? '').trim(),
          } as ExplainTafsirKeyTerm;
        })
        .filter((value): value is ExplainTafsirKeyTerm => Boolean(value));
    }

    return {
      explanation: payload.explanation,
      keyTerms: keyTerms && keyTerms.length > 0 ? keyTerms : undefined,
      cached: payload.cached ?? false,
      fallbackMode: fallbackMode === 'verse_chat' ? 'verse_chat' : undefined,
      suggestedPrompt:
        typeof suggestedPrompt === 'string' && suggestedPrompt.trim().length > 0
          ? suggestedPrompt.trim()
          : undefined,
    };
  } catch (error) {
    console.error('Error generating tafsir explanation:', error);
    throw error;
  }
}

/**
 * Report an issue with the generated tafsir explanation.
 */
export async function reportWrongTafsir(
  tafseerText: string,
  verse: string,
  tafseerAuthor: string,
  originalExplanation: string,
  userComplaint: string
): Promise<{
  success: boolean;
  status: string;
  isCorrected: boolean;
  explanation: string;
  correctionReasoning?: string;
}> {
  try {
    const response = await fetch(buildApiUrl('/report-wrong'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        sourceText: tafseerText, 
        verse, 
        tafsirAuthor: tafseerAuthor,
        originalExplanation,
        userComplaint
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Failed to report tafsir: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error reporting tafsir explanation:', error);
    throw error;
  }
}
