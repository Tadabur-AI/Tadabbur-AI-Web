import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

const BASE_TAFSIR_CDN = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir';
const DEFAULT_EDITION = 'en-tafisr-ibn-kathir';
const MAX_CONTEXT_CHARS = 3500;
const SHORT_CONTEXT_CHARS = 1200;

interface TafsirResponse {
  surah: number;
  ayah: number;
  text: string;
}

const tafsirCache = new Map<string, string>();

const parser = new StringOutputParser();
let simplifyChain: ((input: {
  verseText: string;
  translation: string;
  tafsirText: string;
}) => Promise<string>) | null = null;
let reflectionChain:
  | ((input: {
      verseText: string;
      translation: string;
      tafsirText: string;
      simplifiedTafsir: string;
    }) => Promise<string>)
  | null = null;

const sanitizeForPrompt = (value: string, maxLength: number): string => {
  if (!value) return '';
  const condensed = value.replace(/\s+/g, ' ').trim();
  if (condensed.length <= maxLength) {
    return condensed;
  }

  return `${condensed.slice(0, Math.max(0, maxLength - 3))}...`;
};

const buildSimplifyChain = () => {
  const apiKey = import.meta.env.VITE_GROQ_API;
  if (!apiKey) {
    throw new Error('Missing GROQ API key. Please set VITE_GROQ_API in your environment.');
  }

  const model = new ChatGroq({
    apiKey,
    model: 'groq/compound',
    temperature: 0.2,
    maxTokens: 512,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      'You are a knowledgeable Islamic studies teacher who explains Quranic tafsir in warm, simple English while remaining respectful and accurate. Summaries must stay faithful to trusted scholars and avoid personal opinions.',
    ],
    [
      'human',
      [
        'Provide an accessible explanation for the following verse using up to three short paragraphs.',
        '',
        'Arabic verse: {verseText}',
        'English translation: {translation}',
        'Classical tafsir excerpt: {tafsirText}',
        '',
        'Requirements:',
        '- Highlight the main message in everyday language without diluting the meaning.',
        '- Mention relevant contextual insights from the tafsir when helpful.',
        '- Keep the tone encouraging and reflective for a reader who is studying alone.',
        '- Stay under 200 words and avoid complex terminology unless needed.',
      ].join('\n'),
    ],
  ]);

  const chain = prompt.pipe(model).pipe(parser);

  simplifyChain = (input) => chain.invoke(input);
  return simplifyChain;
};

export const fetchTafsirForVerse = async (
  surahNumber: number,
  ayahNumber: number,
  editionSlug: string = DEFAULT_EDITION,
): Promise<string> => {
  const cacheKey = `${editionSlug}:${surahNumber}:${ayahNumber}`;
  if (tafsirCache.has(cacheKey)) {
    return tafsirCache.get(cacheKey) as string;
  }

  const url = `${BASE_TAFSIR_CDN}/${editionSlug}/${surahNumber}/${ayahNumber}.json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Unable to fetch tafsir for this verse.');
  }

  const data = (await res.json()) as TafsirResponse;
  if (!data?.text) {
    throw new Error('Tafsir is not available for this verse.');
  }

  tafsirCache.set(cacheKey, data.text);
  return data.text;
};

export const generateSimplifiedTafsir = async (input: {
  verseText: string;
  translation: string;
  tafsirText: string;
}): Promise<string> => {
  const chain = simplifyChain ?? buildSimplifyChain();
  const prepared = {
    verseText: sanitizeForPrompt(input.verseText, SHORT_CONTEXT_CHARS),
    translation: sanitizeForPrompt(input.translation, SHORT_CONTEXT_CHARS),
    tafsirText: sanitizeForPrompt(input.tafsirText, MAX_CONTEXT_CHARS),
  };

  return chain(prepared);
};

export const generateReflection = async (input: {
  verseText: string;
  translation: string;
  tafsirText: string;
  simplifiedTafsir: string;
}): Promise<string> => {
  const chain = reflectionChain ?? buildReflectionChain();
  const prepared = {
    verseText: sanitizeForPrompt(input.verseText, SHORT_CONTEXT_CHARS),
    translation: sanitizeForPrompt(input.translation, SHORT_CONTEXT_CHARS),
    tafsirText: sanitizeForPrompt(input.tafsirText, MAX_CONTEXT_CHARS),
    simplifiedTafsir: sanitizeForPrompt(input.simplifiedTafsir, SHORT_CONTEXT_CHARS),
  };

  return chain(prepared);
};

const buildReflectionChain = () => {
  const apiKey = import.meta.env.VITE_GROQ_API;
  if (!apiKey) {
    throw new Error('Missing GROQ API key. Please set VITE_GROQ_API in your environment.');
  }

  const model = new ChatGroq({
    apiKey,
    model: 'groq/compound',
    temperature: 0.1,
    maxTokens: 384,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      'You write concise, formal reflections on Quranic verses. Emphasize direct lessons, avoid filler, and keep the tone respectful and practical.',
    ],
    [
      'human',
      [
        'Craft a brief reflection for the verse below in no more than three sentences (under 90 words).',
        '',
        'Arabic verse: {verseText}',
        'English translation: {translation}',
        'Classical tafsir (excerpt): {tafsirText}',
        'Simplified explanation: {simplifiedTafsir}',
        '',
        'Requirements:',
        '- Highlight one or two actionable lessons a believer should carry forward.',
        '- Maintain formal, direct language without rhetorical questions or dramatic phrasing.',
        '- If both the tafsir excerpt and simplified explanation are empty, return an empty string.',
      ].join('\n'),
    ],
  ]);

  const chain = prompt.pipe(model).pipe(parser);

  reflectionChain = (input) => chain.invoke(input);
  return reflectionChain;
};
