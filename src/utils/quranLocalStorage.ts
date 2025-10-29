import { fetchRecitations, type Recitation } from '../services/quranResourcesService';
import { listReciters, listTafseers, listTranslations, type ReciterSummary, type TafseerSummary, type TranslationSummary } from '../services/apis';

const RECITATIONS_CACHE_KEY = 'tadabbur_recitations_cache';
const RECITATION_KEY = 'tadabbur_recitation';
const TRANSLATIONS_CACHE_KEY = 'tadabbur_translations_cache';
const TRANSLATION_KEY = 'tadabbur_translation';
const TAFSIRS_CACHE_KEY = 'tadabbur_tafsirs_cache';
const TAFSIR_KEY = 'tadabbur_tafsir';

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
    reciter_name: item.name,
    style: item.style ?? 'Default',
    translated_name: {
      name: item.translatedName?.name ?? item.name,
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
