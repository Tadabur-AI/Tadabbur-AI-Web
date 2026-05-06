import { useEffect, useId, useMemo, useState } from 'react';
import { FiRefreshCw, FiSettings, FiX } from 'react-icons/fi';
import { useTheme } from '../../hooks/useTheme';
import Overlay from '../ui/Overlay';
import {
  ActionButton,
  ContentGroup,
  Field,
  IconButton,
  SelectField,
} from '../ui/primitives';
import { fetchRecitations, type Recitation } from '../../services/quranResourcesService';
import {
  listTafseers,
  listTranslations,
  type TafseerSummary,
  type TranslationSummary,
} from '../../services/apis';
import {
  ARABIC_CONTENT_FONT_OPTIONS,
  DEFAULT_READER_APPEARANCE,
  ENGLISH_FONT_OPTIONS,
  loadReaderAppearanceSettings,
  normalizeReaderAppearance,
  saveReaderAppearanceSettings,
  type ReaderAppearanceSettings,
} from '../../utils/readerPreferences';

interface ResourceOption {
  id: number;
  name: string;
  languageName?: string;
}

interface ReaderSettingsMenuProps {
  selectedRecitation?: number | null;
  selectedTranslation?: number | null;
  selectedTafsir?: number | null;
  recitations?: Recitation[];
  translationOptions?: ResourceOption[];
  tafsirOptions?: ResourceOption[];
  onRecitationChange?: (id: number) => void;
  onTranslationChange?: (id: number) => void;
  onTafsirChange?: (id: number) => void;
}

const readNumberSetting = (key: string) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : null;
};

const readCachedArray = <T,>(key: string): T[] | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const cachedValue = localStorage.getItem(key);
  if (!cachedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(cachedValue);
    return Array.isArray(parsedValue) ? parsedValue as T[] : null;
  } catch {
    return null;
  }
};

const normalizeTranslationOption = (translation: TranslationSummary | ResourceOption): ResourceOption => ({
  id: translation.id,
  name: 'translatedName' in translation
    ? translation.translatedName?.name ?? translation.name
    : translation.name,
  languageName: translation.languageName,
});

const normalizeTafsirOption = (tafsir: TafseerSummary | ResourceOption): ResourceOption => ({
  id: tafsir.id,
  name: tafsir.name,
  languageName: tafsir.languageName,
});

const toSelectOptions = (items: ResourceOption[], emptyLabel: string) => [
  { value: '', label: emptyLabel },
  ...items.map((item) => ({
    value: item.id,
    label: `${item.name}${item.languageName ? ` (${item.languageName})` : ''}`,
  })),
];

const toRecitationOptions = (items: Recitation[]) => [
  { value: '', label: 'Select a reciter' },
  ...items.map((recitation) => ({
    value: recitation.id,
    label: `${recitation.reciter_name}${recitation.style ? ` (${recitation.style})` : ''}`,
  })),
];

export default function ReaderSettingsMenu({
  selectedRecitation,
  selectedTranslation,
  selectedTafsir,
  recitations,
  translationOptions,
  tafsirOptions,
  onRecitationChange,
  onTranslationChange,
  onTafsirChange,
}: ReaderSettingsMenuProps) {
  const { resolvedTheme } = useTheme();
  const titleId = useId();
  const descriptionId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [loadedRecitations, setLoadedRecitations] = useState<Recitation[]>([]);
  const [loadedTranslations, setLoadedTranslations] = useState<ResourceOption[]>([]);
  const [loadedTafsirs, setLoadedTafsirs] = useState<ResourceOption[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [localRecitation, setLocalRecitation] = useState<number | null>(() => readNumberSetting('tadabbur_recitation'));
  const [localTranslation, setLocalTranslation] = useState<number | null>(() => readNumberSetting('tadabbur_translation'));
  const [localTafsir, setLocalTafsir] = useState<number | null>(() => readNumberSetting('tadabbur_tafsir'));
  const [appearance, setAppearance] = useState<ReaderAppearanceSettings>(() => loadReaderAppearanceSettings());

  const effectiveRecitations = recitations && recitations.length > 0 ? recitations : loadedRecitations;
  const effectiveTranslations = translationOptions && translationOptions.length > 0
    ? translationOptions
    : loadedTranslations;
  const effectiveTafsirs = tafsirOptions && tafsirOptions.length > 0 ? tafsirOptions : loadedTafsirs;

  // Get current theme colors
  const currentThemeColors = resolvedTheme === 'dark' ? appearance.colors.dark : appearance.colors.light;

  const recitationValue = selectedRecitation ?? localRecitation ?? '';
  const translationValue = selectedTranslation ?? localTranslation ?? '';
  const tafsirValue = selectedTafsir ?? localTafsir ?? '';

  const recitationSelectOptions = useMemo(() => toRecitationOptions(effectiveRecitations), [effectiveRecitations]);
  const translationSelectOptions = useMemo(
    () => toSelectOptions(effectiveTranslations, 'Select a translation'),
    [effectiveTranslations],
  );
  const tafsirSelectOptions = useMemo(
    () => toSelectOptions(effectiveTafsirs, 'Select a tafsir'),
    [effectiveTafsirs],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let ignore = false;

    const loadResources = async () => {
      setIsLoadingResources(true);

      try {
        if (!recitations || recitations.length === 0) {
          const cachedRecitations = readCachedArray<Recitation>('tadabbur_recitations_cache');
          const nextRecitations = cachedRecitations ?? await fetchRecitations();
          if (!cachedRecitations) {
            localStorage.setItem('tadabbur_recitations_cache', JSON.stringify(nextRecitations));
          }
          if (!ignore) {
            setLoadedRecitations(nextRecitations);
          }
        }

        if (!translationOptions || translationOptions.length === 0) {
          const cachedTranslations = readCachedArray<TranslationSummary | ResourceOption>('tadabbur_translations_cache');
          const nextTranslations = (cachedTranslations ?? await listTranslations()).map(normalizeTranslationOption);
          if (!cachedTranslations) {
            localStorage.setItem('tadabbur_translations_cache', JSON.stringify(nextTranslations));
          }
          if (!ignore) {
            setLoadedTranslations(nextTranslations);
          }
        }

        if (!tafsirOptions || tafsirOptions.length === 0) {
          const cachedTafsirs = readCachedArray<TafseerSummary | ResourceOption>('tadabbur_tafsirs_cache');
          const nextTafsirs = (cachedTafsirs ?? await listTafseers()).map(normalizeTafsirOption);
          if (!cachedTafsirs) {
            localStorage.setItem('tadabbur_tafsirs_cache', JSON.stringify(nextTafsirs));
          }
          if (!ignore) {
            setLoadedTafsirs(nextTafsirs);
          }
        }
      } catch (error) {
        console.error('Failed to load reader settings resources:', error);
      } finally {
        if (!ignore) {
          setIsLoadingResources(false);
        }
      }
    };

    void loadResources();

    return () => {
      ignore = true;
    };
  }, [isOpen, recitations, tafsirOptions, translationOptions]);

  const applyRecitationChange = (id: number) => {
    setLocalRecitation(id);
    localStorage.setItem('tadabbur_recitation', String(id));
    onRecitationChange?.(id);
  };

  const applyTranslationChange = (id: number) => {
    setLocalTranslation(id);
    localStorage.setItem('tadabbur_translation', String(id));
    onTranslationChange?.(id);
  };

  const applyTafsirChange = (id: number) => {
    setLocalTafsir(id);
    localStorage.setItem('tadabbur_tafsir', String(id));
    onTafsirChange?.(id);
  };

  const updateAppearance = (patch: Partial<ReaderAppearanceSettings>) => {
    const nextAppearance = normalizeReaderAppearance({ ...appearance, ...patch });
    setAppearance(nextAppearance);
    saveReaderAppearanceSettings(nextAppearance);
  };

  const updateThemeColor = (colorType: keyof ReaderAppearanceSettings['colors']['light'], value: string) => {
    const nextAppearance = { ...appearance };
    if (resolvedTheme === 'dark') {
      nextAppearance.colors.dark[colorType] = value;
    } else {
      nextAppearance.colors.light[colorType] = value;
    }
    const normalizedAppearance = normalizeReaderAppearance(nextAppearance);
    setAppearance(normalizedAppearance);
    saveReaderAppearanceSettings(normalizedAppearance);
  };

  const resetAppearance = () => {
    setAppearance(DEFAULT_READER_APPEARANCE);
    saveReaderAppearanceSettings(DEFAULT_READER_APPEARANCE);
  };

  return (
    <>
      <IconButton label="Open reading settings" onClick={() => setIsOpen(true)}>
        <FiSettings size={18} />
      </IconButton>

      <Overlay
        open={isOpen}
        onClose={() => setIsOpen(false)}
        labelledBy={titleId}
        describedBy={descriptionId}
        surfaceClassName="max-h-[min(88vh,760px)] w-[min(92vw,620px)] overflow-y-auto rounded-[28px] border border-border bg-surface p-5 shadow-[0_24px_80px_rgba(20,20,18,0.18)]"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-text">
              Reading Settings
            </h2>
            <p id={descriptionId} className="mt-1 text-sm leading-6 text-text-muted">
              Sources, fonts, and colors for reading and export.
            </p>
          </div>
          <IconButton label="Close reading settings" onClick={() => setIsOpen(false)}>
            <FiX size={18} />
          </IconButton>
        </div>

        <div className="space-y-6">
          <ContentGroup label="Sources">
            {isLoadingResources && effectiveTranslations.length === 0 ? (
              <p className="text-sm leading-6 text-text-muted">Loading settings...</p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Translation"
                value={translationValue}
                onChange={(event) => {
                  const id = Number(event.target.value);
                  if (Number.isFinite(id) && id > 0) {
                    applyTranslationChange(id);
                  }
                }}
                options={translationSelectOptions}
              />
              <SelectField
                label="Tafsir"
                value={tafsirValue}
                onChange={(event) => {
                  const id = Number(event.target.value);
                  if (Number.isFinite(id) && id > 0) {
                    applyTafsirChange(id);
                  }
                }}
                options={tafsirSelectOptions}
              />
              <SelectField
                label="Reciter"
                value={recitationValue}
                onChange={(event) => {
                  const id = Number(event.target.value);
                  if (Number.isFinite(id) && id > 0) {
                    applyRecitationChange(id);
                  }
                }}
                options={recitationSelectOptions}
                wrapperClassName="md:col-span-2"
              />
            </div>
          </ContentGroup>

          <ContentGroup label="Fonts">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="English font"
                value={appearance.englishFontFamily}
                onChange={(event) => updateAppearance({ englishFontFamily: event.target.value })}
                options={ENGLISH_FONT_OPTIONS}
              />
              <SelectField
                label="Translation/Tafsir Arabic font"
                value={appearance.arabicContentFontFamily}
                onChange={(event) => updateAppearance({ arabicContentFontFamily: event.target.value })}
                options={ARABIC_CONTENT_FONT_OPTIONS}
              />
              <Field label={`Translation size (${appearance.translationFontSize}px)`}>
                <input
                  type="range"
                  min="12"
                  max="28"
                  value={appearance.translationFontSize}
                  onChange={(event) => updateAppearance({ translationFontSize: Number(event.target.value) })}
                  className="field-control"
                />
              </Field>
              <Field label={`Tafsir size (${appearance.tafsirFontSize}px)`}>
                <input
                  type="range"
                  min="12"
                  max="28"
                  value={appearance.tafsirFontSize}
                  onChange={(event) => updateAppearance({ tafsirFontSize: Number(event.target.value) })}
                  className="field-control"
                />
              </Field>
              <Field label={`Word translation size (${appearance.wordTranslationFontSize}px)`}>
                <input
                  type="range"
                  min="8"
                  max="18"
                  value={appearance.wordTranslationFontSize}
                  onChange={(event) => updateAppearance({ wordTranslationFontSize: Number(event.target.value) })}
                  className="field-control"
                />
              </Field>
            </div>
          </ContentGroup>

          <ContentGroup label={`Colors (${resolvedTheme === 'dark' ? 'Dark' : 'Light'} Theme)`}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Translation color">
                <input
                  type="color"
                  value={currentThemeColors.translationColor}
                  onChange={(event) => updateThemeColor('translationColor', event.target.value)}
                  className="field-control h-12 p-1"
                />
              </Field>
              <Field label="Tafsir color">
                <input
                  type="color"
                  value={currentThemeColors.tafsirColor}
                  onChange={(event) => updateThemeColor('tafsirColor', event.target.value)}
                  className="field-control h-12 p-1"
                />
              </Field>
              <Field label="Word translation color">
                <input
                  type="color"
                  value={currentThemeColors.wordTranslationColor}
                  onChange={(event) => updateThemeColor('wordTranslationColor', event.target.value)}
                  className="field-control h-12 p-1"
                />
              </Field>
              <Field label="Page background">
                <input
                  type="color"
                  value={currentThemeColors.pageBackgroundColor}
                  onChange={(event) => updateThemeColor('pageBackgroundColor', event.target.value)}
                  className="field-control h-12 p-1"
                />
              </Field>
            </div>
          </ContentGroup>

          <div className="flex justify-end border-t border-border pt-4">
            <ActionButton variant="ghost" size="sm" onClick={resetAppearance}>
              <FiRefreshCw aria-hidden="true" />
              Reset Appearance
            </ActionButton>
          </div>
        </div>
      </Overlay>
    </>
  );
}
