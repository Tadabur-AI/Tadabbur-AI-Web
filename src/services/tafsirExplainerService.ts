export interface ExplainTafsirResponse {
  explanation: string;
  keyTerms?: ExplainTafsirKeyTerm[];
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
  keyTerms?: ExplainTafsirRawKeyTerm[] | Record<string, string>;
  key_terms?: ExplainTafsirRawKeyTerm[] | Record<string, string>;
}

/**
 * Explain tafsir for a specific verse in modern, easy-to-understand English.
 */
export async function explainTafsir(tafseerText: string): Promise<ExplainTafsirResponse> {
  try {
    const response = await fetch('https://tadabbur-be.eng-sharjeel-baig.workers.dev/generate-explanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tafseerText }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Failed to generate explanation: ${response.statusText}`);
    }

    const payload = (await response.json()) as ExplainTafsirRawResponse;

    const rawKeyTerms = payload.keyTerms ?? payload.key_terms;

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
    };
  } catch (error) {
    console.error('Error generating tafsir explanation:', error);
    throw error;
  }
}
