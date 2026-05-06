export const READER_APPEARANCE_STORAGE_KEY = 'tadabbur_reader_appearance';
export const READER_APPEARANCE_CHANGE_EVENT = 'tadabbur:reader-appearance-change';

export interface ReaderAppearanceSettings {
  englishFontFamily: string;
  arabicContentFontFamily: string;
  translationFontSize: number;
  tafsirFontSize: number;
  wordTranslationFontSize: number;
  colors: {
    light: {
      translationColor: string;
      tafsirColor: string;
      wordTranslationColor: string;
      pageBackgroundColor: string;
    };
    dark: {
      translationColor: string;
      tafsirColor: string;
      wordTranslationColor: string;
      pageBackgroundColor: string;
    };
  };
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
  colors: {
    light: {
      translationColor: '#141412',
      tafsirColor: '#141412',
      wordTranslationColor: '#075f46',
      pageBackgroundColor: '#fbf4e6',
    },
    dark: {
      translationColor: '#F2F0EA',
      tafsirColor: '#F2F0EA',
      wordTranslationColor: '#34D399',
      pageBackgroundColor: '#14100b',
    },
  },
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

// Helper function to migrate legacy color settings to new structure
const migrateLegacyColors = (source: any): ReaderAppearanceSettings['colors'] => {
  // Check if we already have the new structure
  if (source.colors && typeof source.colors === 'object' && source.colors.light && source.colors.dark) {
    return {
      light: {
        translationColor: normalizeColor(source.colors.light.translationColor, DEFAULT_READER_APPEARANCE.colors.light.translationColor),
        tafsirColor: normalizeColor(source.colors.light.tafsirColor, DEFAULT_READER_APPEARANCE.colors.light.tafsirColor),
        wordTranslationColor: normalizeColor(source.colors.light.wordTranslationColor, DEFAULT_READER_APPEARANCE.colors.light.wordTranslationColor),
        pageBackgroundColor: normalizeColor(source.colors.light.pageBackgroundColor, DEFAULT_READER_APPEARANCE.colors.light.pageBackgroundColor),
      },
      dark: {
        translationColor: normalizeColor(source.colors.dark.translationColor, DEFAULT_READER_APPEARANCE.colors.dark.translationColor),
        tafsirColor: normalizeColor(source.colors.dark.tafsirColor, DEFAULT_READER_APPEARANCE.colors.dark.tafsirColor),
        wordTranslationColor: normalizeColor(source.colors.dark.wordTranslationColor, DEFAULT_READER_APPEARANCE.colors.dark.wordTranslationColor),
        pageBackgroundColor: normalizeColor(source.colors.dark.pageBackgroundColor, DEFAULT_READER_APPEARANCE.colors.dark.pageBackgroundColor),
      },
    };
  }

  // Migrate legacy structure (single color values) to new structure
  return {
    light: {
      translationColor: normalizeColor(source.translationColor, DEFAULT_READER_APPEARANCE.colors.light.translationColor),
      tafsirColor: normalizeColor(source.tafsirColor, DEFAULT_READER_APPEARANCE.colors.light.tafsirColor),
      wordTranslationColor: normalizeColor(source.wordTranslationColor, DEFAULT_READER_APPEARANCE.colors.light.wordTranslationColor),
      pageBackgroundColor: normalizeColor(source.pageBackgroundColor, DEFAULT_READER_APPEARANCE.colors.light.pageBackgroundColor),
    },
    dark: DEFAULT_READER_APPEARANCE.colors.dark, // Use defaults for dark theme
  };
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
    colors: migrateLegacyColors(source),
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

export const buildReaderAppearanceStyle = (settings: ReaderAppearanceSettings, theme: 'light' | 'dark'): Record<string, string> => {
  const themeColors = theme === 'dark' ? settings.colors.dark : settings.colors.light;
  
  return {
    '--reader-english-font-family': settings.englishFontFamily,
    '--reader-arabic-content-font-family': settings.arabicContentFontFamily,
    '--reader-translation-font-size': `${settings.translationFontSize}px`,
    '--reader-tafsir-font-size': `${settings.tafsirFontSize}px`,
    '--reader-word-translation-font-size': `${settings.wordTranslationFontSize}px`,
    '--reader-translation-color': themeColors.translationColor,
    '--reader-tafsir-color': themeColors.tafsirColor,
    '--reader-word-translation-color': themeColors.wordTranslationColor,
    '--reader-page-background': themeColors.pageBackgroundColor,
  };
};
