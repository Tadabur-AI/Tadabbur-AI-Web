import { type RetrieveSurahVerse, type WordTranslation } from '../services/apis';

export interface QuranReaderVerse {
  id: number;
  verse_key: string;
  text: string;
  translation: string;
  translationHtml?: string;
  surah_id: number;
  word_translations?: WordTranslation[];
  page_number?: number;
  juz_number?: number;
}

export interface QuranPage {
  pageNumber: number;
  verses: QuranReaderVerse[];
}

export const DEFAULT_TRANSLATION_ID = 20;

export const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const stripTrailingArabicDigits = (text: string) => text.replace(/\s*[\u0660-\u0669]+$/u, '').trim();

const parsePositiveNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const mapRetrieveSurahVerse = (data: RetrieveSurahVerse): QuranReaderVerse => {
  const [surahIdStr, ayahStr] = data.key.split(':');
  const surahId = Number(surahIdStr);
  const ayah = Number(ayahStr);
  const cleanedTranslation = stripHtml(data.translation);
  const cleanedText = stripTrailingArabicDigits(data.verse) || data.verse;

  return {
    id: Number.isFinite(ayah) ? ayah : data.key.length,
    verse_key: data.key,
    text: cleanedText,
    translation: cleanedTranslation,
    translationHtml: data.translation,
    surah_id: Number.isFinite(surahId) ? surahId : 0,
    word_translations: data.word_translations || [],
    page_number: parsePositiveNumber(data.page_number),
    juz_number: parsePositiveNumber(data.juz_number),
  };
};

export const buildQuranPages = (
  verses: QuranReaderVerse[],
  fallbackPages?: [number, number],
): QuranPage[] => {
  if (verses.length === 0) {
    return [];
  }

  const groupedPages = new Map<number, QuranReaderVerse[]>();
  for (const verse of verses) {
    const pageNumber = verse.page_number;
    if (!pageNumber) {
      continue;
    }

    const pageVerses = groupedPages.get(pageNumber) ?? [];
    pageVerses.push(verse);
    groupedPages.set(pageNumber, pageVerses);
  }

  if (groupedPages.size > 0) {
    return Array.from(groupedPages.entries())
      .sort(([a], [b]) => a - b)
      .map(([pageNumber, pageVerses]) => ({
        pageNumber,
        verses: pageVerses.sort((a, b) => a.id - b.id),
      }));
  }

  const fallbackPage = fallbackPages?.[0] ?? 1;
  return [{ pageNumber: fallbackPage, verses }];
};

export const findPageIndexForVerse = (pages: QuranPage[], verseKey: string | undefined) => {
  if (!verseKey) {
    return 0;
  }

  const pageIndex = pages.findIndex((page) => page.verses.some((verse) => verse.verse_key === verseKey));
  return pageIndex === -1 ? 0 : pageIndex;
};
