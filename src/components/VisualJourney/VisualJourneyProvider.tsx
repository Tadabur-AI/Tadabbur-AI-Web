import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  listReciters,
  listTranslations,
  retrieveRecitation,
  retrieveSurah,
  type ReciterSummary,
  type RetrieveRecitationVerse,
  type RetrieveSurahVerse,
  type TranslationSummary,
} from '../../services/apis';
import {
  buildVisualJourneyManifest,
  findSceneForAyah,
  type VisualJourneyManifest,
  type VisualJourneyScene,
} from '../../utils/visualJourney';
import VisualJourneyOverlay from './VisualJourneyOverlay';
import { VisualJourneyContext, type VisualJourneyContextValue } from './VisualJourneyContext';

export interface VisualJourneyRequest {
  surahId: number;
  surahName?: string;
  surahNameArabic?: string;
  translatedName?: string;
  versesCount?: number;
  startAyah?: number;
  endAyah?: number;
}

export interface VisualJourneySlide {
  id: string;
  surahId: number;
  ayahNumber: number;
  arabicText: string;
  translation: string;
  audioUrl: string | null;
  scene: VisualJourneyScene;
}

interface ProviderState {
  request: VisualJourneyRequest | null;
  manifest: VisualJourneyManifest | null;
  slides: VisualJourneySlide[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  currentIndex: number;
  selectedReciterId: number | null;
  selectedTranslationId: number | null;
}

const readSavedNumber = (key: string) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const saved = window.localStorage.getItem(key);
  const parsed = saved ? Number(saved) : null;

  return parsed && Number.isFinite(parsed) ? parsed : null;
};

export function VisualJourneyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProviderState>({
    request: null,
    manifest: null,
    slides: [],
    status: 'idle',
    error: null,
    currentIndex: 0,
    selectedReciterId: readSavedNumber('tadabbur_recitation'),
    selectedTranslationId: readSavedNumber('tadabbur_translation'),
  });
  const [reciters, setReciters] = useState<ReciterSummary[]>([]);
  const [translations, setTranslations] = useState<TranslationSummary[]>([]);
  const surahCache = useRef<Map<string, RetrieveSurahVerse[]>>(new Map());
  const recitationCache = useRef<Map<string, RetrieveRecitationVerse[]>>(new Map());

  useEffect(() => {
    let isMounted = true;

    const loadReciters = async () => {
      try {
        const data = await listReciters();
        if (!isMounted) return;
        setReciters(data);
        setState((prev) => {
          const savedId = prev.selectedReciterId;
          const hasSavedId = savedId ? data.some((reciter) => reciter.id === savedId) : false;
          return {
            ...prev,
            selectedReciterId: hasSavedId ? savedId : data[0]?.id ?? null,
          };
        });
      } catch (error) {
        console.error('Failed to load visual journey reciters:', error);
      }
    };

    void loadReciters();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadTranslations = async () => {
      try {
        const data = await listTranslations();
        if (!isMounted) return;
        setTranslations(data);
        setState((prev) => {
          const savedId = prev.selectedTranslationId;
          const hasSavedId = savedId ? data.some((translation) => translation.id === savedId) : false;
          const preferred =
            data.find((translation) => translation.languageName?.toLowerCase().includes('english')) ?? data[0];

          return {
            ...prev,
            selectedTranslationId: hasSavedId ? savedId : preferred?.id ?? null,
          };
        });
      } catch (error) {
        console.error('Failed to load visual journey translations:', error);
      }
    };

    void loadTranslations();

    return () => {
      isMounted = false;
    };
  }, []);

  const buildSlides = useCallback(
    async (
      request: VisualJourneyRequest,
      reciterId: number,
      translationId: number | null,
    ): Promise<{ manifest: VisualJourneyManifest; slides: VisualJourneySlide[] }> => {
      const manifest = buildVisualJourneyManifest(request);
      const cacheKey = `${request.surahId}-${translationId ?? 'default'}`;
      const recitationCacheKey = `${request.surahId}-${reciterId}`;

      const [verses, recitations] = await Promise.all([
        (async () => {
          if (!surahCache.current.has(cacheKey)) {
            const retrievedVerses = await retrieveSurah({
              surahNumber: request.surahId,
              translationId: translationId ?? undefined,
            });
            surahCache.current.set(cacheKey, retrievedVerses);
          }
          return surahCache.current.get(cacheKey) ?? [];
        })(),
        (async () => {
          if (!recitationCache.current.has(recitationCacheKey)) {
            const retrievedRecitations = await retrieveRecitation({
              surahNumber: request.surahId,
              recitationId: reciterId,
            });
            recitationCache.current.set(recitationCacheKey, retrievedRecitations);
          }
          return recitationCache.current.get(recitationCacheKey) ?? [];
        })(),
      ]);

      const recitationMap = new Map(recitations.map((entry) => [entry.verseKey, entry.audioUrl]));
      const slides = verses.flatMap((verse): VisualJourneySlide[] => {
        const [, ayahPart] = verse.key.split(':');
        const ayahNumber = Number(ayahPart);

        if (!Number.isFinite(ayahNumber)) {
          return [];
        }

        const scene = findSceneForAyah(manifest.scenes, ayahNumber);
        if (!scene) {
          return [];
        }

        return [
          {
            id: verse.key,
            surahId: request.surahId,
            ayahNumber,
            arabicText: verse.verse,
            translation: verse.translation ?? '',
            audioUrl: recitationMap.get(verse.key) ?? null,
            scene,
          },
        ];
      });

      return { manifest, slides };
    },
    [],
  );

  useEffect(() => {
    if (!state.request || !state.selectedReciterId) {
      return;
    }

    if (translations.length > 0 && !state.selectedTranslationId) {
      return;
    }

    let isMounted = true;
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    void buildSlides(state.request, state.selectedReciterId, state.selectedTranslationId)
      .then(({ manifest, slides }) => {
        if (!isMounted) return;

        if (slides.length === 0) {
          setState((prev) => ({
            ...prev,
            manifest,
            slides: [],
            currentIndex: 0,
            status: 'error',
            error: 'No verses were available for this visual journey.',
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          manifest,
          slides,
          currentIndex: Math.min(prev.currentIndex, slides.length - 1),
          status: 'ready',
          error: null,
        }));
      })
      .catch((error) => {
        console.error('Failed to build visual journey:', error);
        if (!isMounted) return;
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unable to prepare this visual journey.',
        }));
      });

    return () => {
      isMounted = false;
    };
  }, [buildSlides, state.request, state.selectedReciterId, state.selectedTranslationId, translations.length]);

  const contextValue = useMemo<VisualJourneyContextValue>(
    () => ({
      startJourney: (request) => {
        setState((prev) => ({
          ...prev,
          request,
          manifest: null,
          slides: [],
          status: 'loading',
          error: null,
          currentIndex: 0,
        }));
      },
      closeJourney: () => {
        setState((prev) => ({
          ...prev,
          request: null,
          manifest: null,
          slides: [],
          status: 'idle',
          error: null,
          currentIndex: 0,
        }));
      },
      isActive: state.status !== 'idle' && state.request !== null,
      isLoading: state.status === 'loading',
    }),
    [state.request, state.status],
  );

  const handleReciterChange = (id: number) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tadabbur_recitation', String(id));
    }
    setState((prev) => ({ ...prev, selectedReciterId: id }));
  };

  const handleTranslationChange = (id: number) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tadabbur_translation', String(id));
    }
    setState((prev) => ({ ...prev, selectedTranslationId: id }));
  };

  return (
    <VisualJourneyContext.Provider value={contextValue}>
      {children}
      {state.request ? (
        <VisualJourneyOverlay
          request={state.request}
          manifest={state.manifest}
          status={state.status === 'idle' ? 'loading' : state.status}
          error={state.error}
          slides={state.slides}
          currentIndex={state.currentIndex}
          onIndexChange={(index) => setState((prev) => ({ ...prev, currentIndex: index }))}
          onClose={contextValue.closeJourney}
          reciters={reciters}
          selectedReciterId={state.selectedReciterId}
          onReciterChange={handleReciterChange}
          translations={translations}
          selectedTranslationId={state.selectedTranslationId}
          onTranslationChange={handleTranslationChange}
        />
      ) : null}
    </VisualJourneyContext.Provider>
  );
}
