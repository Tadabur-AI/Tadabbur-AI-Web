export const READER_APPEARANCE_STORAGE_KEY = 'tadabbur_reader_appearance';
export const READER_APPEARANCE_CHANGE_EVENT = 'tadabbur:reader-appearance-change';

export interface ReaderAppearanceSettings {
  englishFontFamily: string;
  arabicContentFontFamily: string;
  translationFontSize: number;
  tafsirFontSize: number;
  wordTranslationFontSize: number;
  translationColor: string;
  tafsirColor: string;
  wordTranslationColor: string;
  pageBackgroundColor: string;
}

export const ENGLISH_FONT_OPTIONS = [
  { value: "Inter, ui-sans-serif, system-ui, sans-serif", label: 'Inter' },
  { value: "Georgia, 'Times New Roman', serif", label: 'Georgia' },
  { value: "Arial, Helvetica, sans-serif", label: 'Arial' },
  { value: "Verdana, Geneva, sans-serif", label: 'Verdana' },
  { value: "'Trebuchet MS', Arial, sans-serif", label: 'Trebuchet' },
];

export const ARABIC_CONTENT_FONT_OPTIONS = [
  { value: "'Noto Naskh Arabic', 'Arial', sans-serif", label: 'Noto Naskh Arabic' },
  { value: "'Amiri', 'Noto Naskh Arabic', serif", label: 'Amiri' },
  { value: "'Geeza Pro', 'Noto Naskh Arabic', sans-serif", label: 'Geeza Pro' },
  { value: "Tahoma, 'Noto Naskh Arabic', sans-serif", label: 'Tahoma' },
];

export const DEFAULT_READER_APPEARANCE: ReaderAppearanceSettings = {
  englishFontFamily: ENGLISH_FONT_OPTIONS[0].value,
  arabicContentFontFamily: ARABIC_CONTENT_FONT_OPTIONS[0].value,
  translationFontSize: 16,
  tafsirFontSize: 15,
  wordTranslationFontSize: 11,
  translationColor: '#141412',
  tafsirColor: '#141412',
  wordTranslationColor: '#075f46',
  pageBackgroundColor: '#fbf4e6',
};

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)));
};

const normalizeColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

const normalizeOption = (
  value: unknown,
  options: Array<{ value: string }>,
  fallback: string,
) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  return options.some((option) => option.value === value) ? value : fallback;
};

export const normalizeReaderAppearance = (value: unknown): ReaderAppearanceSettings => {
  const source = value && typeof value === 'object' ? value as Partial<ReaderAppearanceSettings> : {};

  return {
    englishFontFamily: normalizeOption(
      source.englishFontFamily,
      ENGLISH_FONT_OPTIONS,
      DEFAULT_READER_APPEARANCE.englishFontFamily,
    ),
    arabicContentFontFamily: normalizeOption(
      source.arabicContentFontFamily,
      ARABIC_CONTENT_FONT_OPTIONS,
      DEFAULT_READER_APPEARANCE.arabicContentFontFamily,
    ),
    translationFontSize: clampNumber(
      source.translationFontSize,
      12,
      28,
      DEFAULT_READER_APPEARANCE.translationFontSize,
    ),
    tafsirFontSize: clampNumber(source.tafsirFontSize, 12, 28, DEFAULT_READER_APPEARANCE.tafsirFontSize),
    wordTranslationFontSize: clampNumber(
      source.wordTranslationFontSize,
      8,
      18,
      DEFAULT_READER_APPEARANCE.wordTranslationFontSize,
    ),
    translationColor: normalizeColor(source.translationColor, DEFAULT_READER_APPEARANCE.translationColor),
    tafsirColor: normalizeColor(source.tafsirColor, DEFAULT_READER_APPEARANCE.tafsirColor),
    wordTranslationColor: normalizeColor(source.wordTranslationColor, DEFAULT_READER_APPEARANCE.wordTranslationColor),
    pageBackgroundColor: normalizeColor(source.pageBackgroundColor, DEFAULT_READER_APPEARANCE.pageBackgroundColor),
  };
};

export const loadReaderAppearanceSettings = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_READER_APPEARANCE;
  }

  const storedValue = localStorage.getItem(READER_APPEARANCE_STORAGE_KEY);
  if (!storedValue) {
    return DEFAULT_READER_APPEARANCE;
  }

  try {
    return normalizeReaderAppearance(JSON.parse(storedValue));
  } catch {
    return DEFAULT_READER_APPEARANCE;
  }
};

export const saveReaderAppearanceSettings = (settings: ReaderAppearanceSettings) => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedSettings = normalizeReaderAppearance(settings);
  localStorage.setItem(READER_APPEARANCE_STORAGE_KEY, JSON.stringify(normalizedSettings));
  window.dispatchEvent(new CustomEvent(READER_APPEARANCE_CHANGE_EVENT, { detail: normalizedSettings }));
};

export const buildReaderAppearanceStyle = (settings: ReaderAppearanceSettings): Record<string, string> => ({
  '--reader-english-font-family': settings.englishFontFamily,
  '--reader-arabic-content-font-family': settings.arabicContentFontFamily,
  '--reader-translation-font-size': `${settings.translationFontSize}px`,
  '--reader-tafsir-font-size': `${settings.tafsirFontSize}px`,
  '--reader-word-translation-font-size': `${settings.wordTranslationFontSize}px`,
  '--reader-translation-color': settings.translationColor,
  '--reader-tafsir-color': settings.tafsirColor,
  '--reader-word-translation-color': settings.wordTranslationColor,
  '--reader-page-background': settings.pageBackgroundColor,
});
