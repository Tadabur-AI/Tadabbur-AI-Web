import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

interface VerseImagePromptInput {
  translation: string;
  arabicText?: string;
  verseKey?: string;
  surahName?: string;
}

const MAX_CONTEXT_CHARS = 800;
const parser = new StringOutputParser();
let promptChain:
  | ((input: {
      translation: string;
      arabicText: string;
      verseKey: string;
      surahName: string;
    }) => Promise<string>)
  | null = null;

const sanitizeForPrompt = (value: string | undefined): string => {
  if (!value) {
    return '';
  }

  const condensed = value.replace(/\s+/g, ' ').trim();
  if (condensed.length <= MAX_CONTEXT_CHARS) {
    return condensed;
  }

  return `${condensed.slice(0, Math.max(0, MAX_CONTEXT_CHARS - 3))}...`;
};

const buildPromptChain = () => {
  const apiKey = import.meta.env.VITE_GROQ_API;
  if (!apiKey) {
    throw new Error('Missing GROQ API key. Please set VITE_GROQ_API in your environment.');
  }

  const model = new ChatGroq({
    apiKey,
    model: 'groq/compound',
    temperature: 0.35,
    maxTokens: 256,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      [
        'You craft concise, vivid prompts for halal-friendly Islamic-inspired artwork.',
        'You must never describe people, animals, idols, or prophets.',
        'Focus on natural scenery, celestial motifs, and architecture that reflect reverence and tranquility.',
        'Tie the imagery directly to the meaning and emotions of the provided Quranic verse.',
        'Keep outputs under 80 words and prefer two to three sentences at most.',
      ].join(' '),
    ],
    [
      'human',
      [
        'Verse translation: {translation}',
        'Arabic text (optional): {arabicText}',
        'Verse key: {verseKey}',
        'Surah name: {surahName}',
        '',
        'Instructions:',
        '- Craft a rich visual description grounded in the verse meaning.',
        '- Emphasize light, landscapes, skies, water, greenery, or architecture as appropriate.',
        '- Mention key symbolic elements that reinforce the verse theme.',
        '- Use present tense and avoid camera jargon or numbered lists.',
      ].join('\n'),
    ],
  ]);

  const chain = prompt.pipe(model).pipe(parser);
  promptChain = (input) => chain.invoke(input);
  return promptChain;
};

export const generateVerseImagePrompt = async (
  input: VerseImagePromptInput,
): Promise<string> => {
  const chain = promptChain ?? buildPromptChain();
  const prepared = {
    translation: sanitizeForPrompt(input.translation),
    arabicText: sanitizeForPrompt(input.arabicText),
    verseKey: sanitizeForPrompt(input.verseKey),
    surahName: sanitizeForPrompt(input.surahName),
  };

  const result = await chain(prepared);
  return result.replace(/\s+/g, ' ').trim();
};
