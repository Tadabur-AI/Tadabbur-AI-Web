import { useEffect, useMemo, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import AppShell from '../../layouts/AppShell';
import {
  ActionButton,
  Field,
  PageHeader,
  Panel,
  SelectField,
  PoliteLiveRegion,
  usePoliteStatus,
} from '../../components/ui/primitives';
import { useTheme } from '../../hooks/useTheme';
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

export default function SettingsPage() {
  const { resolvedTheme } = useTheme();
  const [loadedRecitations, setLoadedRecitations] = useState<Recitation[]>([]);
  const [loadedTranslations, setLoadedTranslations] = useState<ResourceOption[]>([]);
  const [loadedTafsirs, setLoadedTafsirs] = useState<ResourceOption[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [localRecitation, setLocalRecitation] = useState<number | null>(() => readNumberSetting('tadabbur_recitation'));
  const [localTranslation, setLocalTranslation] = useState<number | null>(() => readNumberSetting('tadabbur_translation'));
  const [localTafsir, setLocalTafsir] = useState<number | null>(() => readNumberSetting('tadabbur_tafsir'));
  const [appearance, setAppearance] = useState<ReaderAppearanceSettings>(() => loadReaderAppearanceSettings());
  const { message: statusMessage, announce } = usePoliteStatus();

  // Get current theme colors
  const currentThemeColors = resolvedTheme === 'dark' ? appearance.colors.dark : appearance.colors.light;

  const recitationValue = localRecitation ?? '';
  const translationValue = localTranslation ?? '';
  const tafsirValue = localTafsir ?? '';

  const recitationSelectOptions = useMemo(() => toRecitationOptions(loadedRecitations), [loadedRecitations]);
  const translationSelectOptions = useMemo(
    () => toSelectOptions(loadedTranslations, 'Select a translation'),
    [loadedTranslations],
  );
  const tafsirSelectOptions = useMemo(
    () => toSelectOptions(loadedTafsirs, 'Select a tafsir'),
    [loadedTafsirs],
  );

  useEffect(() => {
    let ignore = false;

    const loadResources = async () => {
      setIsLoadingResources(true);

      try {
        const cachedRecitations = readCachedArray<Recitation>('tadabbur_recitations_cache');
        const nextRecitations = cachedRecitations ?? await fetchRecitations();
        if (!cachedRecitations) {
          localStorage.setItem('tadabbur_recitations_cache', JSON.stringify(nextRecitations));
        }
        if (!ignore) {
          setLoadedRecitations(nextRecitations);
        }

        const cachedTranslations = readCachedArray<TranslationSummary | ResourceOption>('tadabbur_translations_cache');
        const nextTranslations = (cachedTranslations ?? await listTranslations()).map(normalizeTranslationOption);
        if (!cachedTranslations) {
          localStorage.setItem('tadabbur_translations_cache', JSON.stringify(nextTranslations));
        }
        if (!ignore) {
          setLoadedTranslations(nextTranslations);
        }

        const cachedTafsirs = readCachedArray<TafseerSummary | ResourceOption>('tadabbur_tafsirs_cache');
        const nextTafsirs = (cachedTafsirs ?? await listTafseers()).map(normalizeTafsirOption);
        if (!cachedTafsirs) {
          localStorage.setItem('tadabbur_tafsirs_cache', JSON.stringify(nextTafsirs));
        }
        if (!ignore) {
          setLoadedTafsirs(nextTafsirs);
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
  }, []);

  const applyRecitationChange = (id: number) => {
    setLocalRecitation(id);
    localStorage.setItem('tadabbur_recitation', String(id));
    announce('Reciter updated.');
  };

  const applyTranslationChange = (id: number) => {
    setLocalTranslation(id);
    localStorage.setItem('tadabbur_translation', String(id));
    announce('Translation updated.');
  };

  const applyTafsirChange = (id: number) => {
    setLocalTafsir(id);
    localStorage.setItem('tadabbur_tafsir', String(id));
    announce('Tafsir updated.');
  };

  const updateAppearance = (patch: Partial<ReaderAppearanceSettings>) => {
    const nextAppearance = normalizeReaderAppearance({ ...appearance, ...patch });
    setAppearance(nextAppearance);
    saveReaderAppearanceSettings(nextAppearance);
    announce('Appearance settings updated.');
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
    announce(`${resolvedTheme === 'dark' ? 'Dark' : 'Light'} theme ${colorType} updated.`);
  };

  const resetAppearance = () => {
    setAppearance(DEFAULT_READER_APPEARANCE);
    saveReaderAppearanceSettings(DEFAULT_READER_APPEARANCE);
    announce('Appearance settings reset to defaults.');
  };

  return (
    <AppShell activeNav="settings">
      <div className="space-y-6">
        <PoliteLiveRegion message={statusMessage} />
        <PageHeader
          eyebrow="Preferences"
          title="Settings"
          description="Customize your reading experience with sources, fonts, and colors."
        />

        {isLoadingResources && loadedTranslations.length === 0 ? (
          <Panel title="Loading Settings" description="Fetching available resources...">
            <div className="space-y-2" aria-live="polite">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-4/5" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          </Panel>
        ) : (
          <div className="space-y-6">
            <Panel title="Sources" description="Choose your preferred translation, tafsir, and recitation sources.">
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
            </Panel>

            <Panel title="Fonts" description="Customize font families and sizes for different text types.">
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
            </Panel>

            <Panel title={`Colors (${resolvedTheme === 'dark' ? 'Dark' : 'Light'} Theme)`} description={`Customize colors for ${resolvedTheme === 'dark' ? 'dark' : 'light'} theme text elements and background.`}>
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
            </Panel>

            <Panel title="Reset" description="Restore appearance settings to their default values.">
              <ActionButton variant="ghost" onClick={resetAppearance}>
                <FiRefreshCw aria-hidden="true" />
                Reset Appearance
              </ActionButton>
            </Panel>
          </div>
        )}
      </div>
    </AppShell>
  );
}
