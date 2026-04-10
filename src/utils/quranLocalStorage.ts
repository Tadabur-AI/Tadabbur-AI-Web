import { fetchRecitations, type Recitation } from '../services/quranResourcesService';
import { listReciters, listTafseers, listTranslations, type ReciterSummary, type TafseerSummary, type TranslationSummary } from '../services/apis';

const RECITATIONS_CACHE_KEY = 'tadabbur_recitations_cache';
const RECITATION_KEY = 'tadabbur_recitation';
const TRANSLATIONS_CACHE_KEY = 'tadabbur_translations_cache';
const TRANSLATION_KEY = 'tadabbur_translation';
const TAFSIRS_CACHE_KEY = 'tadabbur_tafsirs_cache';
const TAFSIR_KEY = 'tadabbur_tafsir';
const BOOKMARKS_KEY = 'tadabbur_bookmarks';
const READING_PROGRESS_KEY = 'tadabbur_reading_progress_v1';
const MAX_RECENT_READS = 5;

const DEFAULT_TRANSLATION_ID = 20;
const DEFAULT_TAFSIR_ID = 169;

interface StoredTranslation {
  id: number;
  name: string;
  languageName: string;
}

interface StoredTafsir {
  id: number;
  name: string;
  languageName: string;
}

type StoredRecitation = Recitation;

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const safeParse = <T,>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse cached value from localStorage:', error);
    return null;
  }
};

const parseStoredId = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeReciters = (items: ReciterSummary[]): StoredRecitation[] =>
  items.map((item) => ({
    id: item.id,
    reciter_name: item.reciterName,
    style: item.style ?? 'Default',
    translated_name: {
      name: item.translatedName?.name ?? item.reciterName,
      language_name: item.translatedName?.languageName ?? 'unknown',
    },
  }));

const fetchRecitationsWithFallback = async (): Promise<StoredRecitation[]> => {
  try {
    const primary = await fetchRecitations();
    if (Array.isArray(primary) && primary.length > 0) {
      return primary;
    }
  } catch (error) {
    console.error('Primary recitations fetch failed:', error);
  }

  try {
    const fallback = await listReciters();
    const normalized = normalizeReciters(fallback);
    if (normalized.length > 0) {
      return normalized;
    }
  } catch (error) {
    console.error('Fallback reciters fetch failed:', error);
  }

  return [];
};

const ensureRecitations = async (): Promise<StoredRecitation[] | null> => {
  let recitations = safeParse<StoredRecitation[]>(localStorage.getItem(RECITATIONS_CACHE_KEY));

  if (!Array.isArray(recitations) || recitations.length === 0) {
    recitations = await fetchRecitationsWithFallback();
    if (recitations.length === 0) {
      return null;
    }
    localStorage.setItem(RECITATIONS_CACHE_KEY, JSON.stringify(recitations));
  }

  if (Array.isArray(recitations) && recitations.length > 0) {
    const storedId = parseStoredId(localStorage.getItem(RECITATION_KEY));
    const hasStored = storedId !== null && recitations.some((item) => item.id === storedId);

    if (!hasStored) {
      localStorage.setItem(RECITATION_KEY, String(recitations[0].id));
    }

    return recitations;
  }

  return null;
};

const mapTranslations = (items: TranslationSummary[]): StoredTranslation[] =>
  items.map((item) => ({
    id: item.id,
    name: item.translatedName?.name ?? item.name,
    languageName: item.languageName,
  }));

const ensureTranslations = async (): Promise<StoredTranslation[] | null> => {
  let translations = safeParse<StoredTranslation[]>(localStorage.getItem(TRANSLATIONS_CACHE_KEY));

  if (!Array.isArray(translations) || translations.length === 0 || !translations[0]?.name) {
    try {
      const translationList = await listTranslations();
      translations = mapTranslations(translationList);
      if (translations.length > 0) {
        localStorage.setItem(TRANSLATIONS_CACHE_KEY, JSON.stringify(translations));
      }
    } catch (error) {
      console.error('Failed to hydrate translations cache:', error);
      return null;
    }
  }

  if (Array.isArray(translations) && translations.length > 0) {
    const storedId = parseStoredId(localStorage.getItem(TRANSLATION_KEY));
    const hasStored = storedId !== null && translations.some((item) => item.id === storedId);

    if (!hasStored) {
      const preferred = translations.find((item) => item.languageName.toLowerCase() === 'english');
      const fallback = preferred ?? translations[0];
      localStorage.setItem(TRANSLATION_KEY, String(fallback.id));
    }

    return translations;
  }

  if (!localStorage.getItem(TRANSLATION_KEY)) {
    localStorage.setItem(TRANSLATION_KEY, String(DEFAULT_TRANSLATION_ID));
  }

  return null;
};

const mapTafsirs = (items: TafseerSummary[]): StoredTafsir[] =>
  items.map((item) => ({
    id: item.id,
    name: item.translatedName?.name ?? item.name,
    languageName: item.languageName,
  }));

const ensureTafsirs = async (): Promise<StoredTafsir[] | null> => {
  let tafsirs = safeParse<StoredTafsir[]>(localStorage.getItem(TAFSIRS_CACHE_KEY));

  if (!Array.isArray(tafsirs) || tafsirs.length === 0 || !tafsirs[0]?.name) {
    try {
  const tafseerList = await listTafseers();
  tafsirs = mapTafsirs(tafseerList);
      if (tafsirs.length > 0) {
        localStorage.setItem(TAFSIRS_CACHE_KEY, JSON.stringify(tafsirs));
      }
    } catch (error) {
      console.error('Failed to hydrate tafsirs cache:', error);
      return null;
    }
  }

  if (Array.isArray(tafsirs) && tafsirs.length > 0) {
    const storedId = parseStoredId(localStorage.getItem(TAFSIR_KEY));
    const hasStored = storedId !== null && tafsirs.some((item) => item.id === storedId);

    if (!hasStored) {
      const fallback = tafsirs.find((item) => item.id === DEFAULT_TAFSIR_ID) ?? tafsirs[0];
      localStorage.setItem(TAFSIR_KEY, String(fallback.id));
    }

    return tafsirs;
  }

  if (!localStorage.getItem(TAFSIR_KEY)) {
    localStorage.setItem(TAFSIR_KEY, String(DEFAULT_TAFSIR_ID));
  }

  return null;
};

export async function initializeQuranLocalStorage(): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  await Promise.allSettled([
    ensureRecitations(),
    ensureTranslations(),
    ensureTafsirs(),
  ]);
}

export interface BookmarkedVerse {
  verseKey: string;
  surahId: number;
  surahName: string;
  surahNameArabic: string;
  ayahNumber: number;
  arabicText: string;
  translation: string;
  savedAt: string;
}

export interface ReadingProgressEntry {
  verseKey: string;
  surahId: number;
  surahName: string;
  surahNameArabic: string;
  ayahNumber: number;
  versesCount: number;
  updatedAt: string;
}

export interface ReadingProgress {
  lastRead: ReadingProgressEntry | null;
  recentReads: ReadingProgressEntry[];
  dailyStats: Record<string, { ayatRead: number; lastVerseKey: string }>;
}

export type ReadingProgressInput = Omit<ReadingProgressEntry, 'updatedAt'>;

export const createEmptyReadingProgress = (): ReadingProgress => ({
  lastRead: null,
  recentReads: [],
  dailyStats: {},
});

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const normalizeReadingProgressEntry = (value: unknown): ReadingProgressEntry | null => {
  if (!isRecord(value)) {
    return null;
  }

  const parsedDate = isNonEmptyString(value.updatedAt) ? new Date(value.updatedAt) : null;
  if (
    !isNonEmptyString(value.verseKey) ||
    !isPositiveNumber(value.surahId) ||
    !isNonEmptyString(value.surahName) ||
    !isNonEmptyString(value.surahNameArabic) ||
    !isPositiveNumber(value.ayahNumber) ||
    !isPositiveNumber(value.versesCount) ||
    !parsedDate ||
    Number.isNaN(parsedDate.getTime())
  ) {
    return null;
  }

  return {
    verseKey: value.verseKey,
    surahId: Math.floor(value.surahId),
    surahName: value.surahName,
    surahNameArabic: value.surahNameArabic,
    ayahNumber: Math.floor(value.ayahNumber),
    versesCount: Math.floor(value.versesCount),
    updatedAt: parsedDate.toISOString(),
  };
};

const normalizeDailyStats = (value: unknown): ReadingProgress['dailyStats'] => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<ReadingProgress['dailyStats']>((stats, [dateKey, rawStat]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !isRecord(rawStat)) {
      return stats;
    }

    const ayatRead = rawStat.ayatRead;
    const lastVerseKey = rawStat.lastVerseKey;
    if (!isPositiveNumber(ayatRead) || !isNonEmptyString(lastVerseKey)) {
      return stats;
    }

    stats[dateKey] = {
      ayatRead: Math.floor(ayatRead),
      lastVerseKey,
    };
    return stats;
  }, {});
};

export const normalizeReadingProgress = (value: unknown): ReadingProgress => {
  if (!isRecord(value)) {
    return createEmptyReadingProgress();
  }

  const lastRead = normalizeReadingProgressEntry(value.lastRead);
  const recentReads = Array.isArray(value.recentReads)
    ? value.recentReads
        .map(normalizeReadingProgressEntry)
        .filter((entry): entry is ReadingProgressEntry => Boolean(entry))
        .slice(0, MAX_RECENT_READS)
    : [];

  return {
    lastRead,
    recentReads,
    dailyStats: normalizeDailyStats(value.dailyStats),
  };
};

export const updateReadingProgress = (
  currentProgress: ReadingProgress,
  entry: ReadingProgressInput,
  nowIso = new Date().toISOString(),
): ReadingProgress => {
  const updatedAt = new Date(nowIso).toISOString();
  const nextEntry: ReadingProgressEntry = {
    ...entry,
    surahId: Math.floor(entry.surahId),
    ayahNumber: Math.floor(entry.ayahNumber),
    versesCount: Math.floor(entry.versesCount),
    updatedAt,
  };
  const dateKey = updatedAt.slice(0, 10);
  const currentDailyStat = currentProgress.dailyStats[dateKey];
  const shouldIncrementToday = currentDailyStat?.lastVerseKey !== nextEntry.verseKey;

  return {
    lastRead: nextEntry,
    recentReads: [
      nextEntry,
      ...currentProgress.recentReads.filter((recentRead) => recentRead.surahId !== nextEntry.surahId),
    ].slice(0, MAX_RECENT_READS),
    dailyStats: {
      ...currentProgress.dailyStats,
      [dateKey]: {
        ayatRead: (currentDailyStat?.ayatRead ?? 0) + (shouldIncrementToday ? 1 : 0),
        lastVerseKey: nextEntry.verseKey,
      },
    },
  };
};

export function getReadingProgress(): ReadingProgress {
  if (!isBrowser()) {
    return createEmptyReadingProgress();
  }

  const rawValue = localStorage.getItem(READING_PROGRESS_KEY);
  const progress = normalizeReadingProgress(safeParse<unknown>(rawValue));

  if (rawValue && !progress.lastRead && progress.recentReads.length === 0 && Object.keys(progress.dailyStats).length === 0) {
    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(progress));
  }

  return progress;
}

export function saveReadingProgress(entry: ReadingProgressInput): ReadingProgress {
  const nextProgress = updateReadingProgress(getReadingProgress(), entry);

  if (isBrowser()) {
    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(nextProgress));
  }

  return nextProgress;
}

export function clearReadingProgress(): ReadingProgress {
  const emptyProgress = createEmptyReadingProgress();

  if (isBrowser()) {
    localStorage.removeItem(READING_PROGRESS_KEY);
  }

  return emptyProgress;
}

export function getBookmarks(): BookmarkedVerse[] {
  if (!isBrowser()) {
    return [];
  }
  return safeParse<BookmarkedVerse[]>(localStorage.getItem(BOOKMARKS_KEY)) ?? [];
}

export function isBookmarked(verseKey: string): boolean {
  const bookmarks = getBookmarks();
  return bookmarks.some((b) => b.verseKey === verseKey);
}

export function addBookmark(verse: Omit<BookmarkedVerse, 'savedAt'>): void {
  if (!isBrowser()) {
    return;
  }
  const bookmarks = getBookmarks();
  if (!bookmarks.some((b) => b.verseKey === verse.verseKey)) {
    bookmarks.unshift({ ...verse, savedAt: new Date().toISOString() });
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }
}

export function removeBookmark(verseKey: string): void {
  if (!isBrowser()) {
    return;
  }
  const bookmarks = getBookmarks();
  const filtered = bookmarks.filter((b) => b.verseKey !== verseKey);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
}

export function toggleBookmark(verse: Omit<BookmarkedVerse, 'savedAt'>): boolean {
  if (isBookmarked(verse.verseKey)) {
    removeBookmark(verse.verseKey);
    return false;
  } else {
    addBookmark(verse);
    return true;
  }
}
