import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PlayPleasantlyOverlay from './PlayPleasantlyOverlay';
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

export interface PlayPleasantlySegment {
  surahId: number;
  startAyah?: number;
  endAyah?: number;
  label?: string;
}

export interface PlayPleasantlyRequest {
  title: string;
  subtitle?: string;
  segments: PlayPleasantlySegment[];
}

export interface PlayPleasantlySlide {
  id: string;
  surahId: number;
  ayahNumber: number;
  arabicText: string;
  translation: string;
  audioUrl: string | null;
  segmentLabel?: string;
}

interface PlayPleasantlyContextValue {
  startExperience: (request: PlayPleasantlyRequest) => void;
  closeExperience: () => void;
  minimizeExperience: () => void;
  expandExperience: () => void;
  isActive: boolean;
  isLoading: boolean;
  isMinimized: boolean;
}

const PlayPleasantlyContext = createContext<PlayPleasantlyContextValue | undefined>(undefined);

const SURAH_WITHOUT_BISMILLAH = new Set<number>([9]);
const BISMILLAH_FALLBACK_TRANSLATION = 'In the name of Allah, the Most Compassionate, the Most Merciful.';
const BISMILLAH_FALLBACK_ARABIC = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

interface ProviderState {
  request: PlayPleasantlyRequest | null;
  slides: PlayPleasantlySlide[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  selectedReciterId: number | null;
  selectedTranslationId: number | null;
  currentIndex: number;
  preservePosition: boolean;
  isMinimized: boolean;
}

export function PlayPleasantlyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProviderState>({
    request: null,
    slides: [],
    status: 'idle',
    error: null,
    selectedReciterId: null,
    selectedTranslationId: null,
    currentIndex: 0,
    preservePosition: false,
    isMinimized: false,
  });
  const [reciters, setReciters] = useState<ReciterSummary[]>([]);
  const [translations, setTranslations] = useState<TranslationSummary[]>([]);
  const surahCache = useRef<Map<string, RetrieveSurahVerse[]>>(new Map());
  const recitationCache = useRef<Map<string, RetrieveRecitationVerse[]>>(new Map());
  const bismillahBaseCache = useRef<Map<string, { arabicText: string; translation: string; audioUrl: string | null }>>(new Map());
  const preserveVerseKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadReciters = async () => {
      try {
        const data = await listReciters();
        if (!isMounted) return;
        setReciters(data);
        setState((prev) => ({
          ...prev,
          selectedReciterId: prev.selectedReciterId ?? data[0]?.id ?? null,
        }));
      } catch (error) {
        console.error('Failed to load reciters:', error);
        if (!isMounted) return;
        setState((prev) => ({
          ...prev,
          error: prev.error ?? 'Unable to load reciters',
          status: prev.status === 'idle' ? prev.status : 'error',
        }));
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
          if (prev.selectedTranslationId) {
            return prev;
          }

          const preferred = data.find((translation) => translation.languageName?.toLowerCase().includes('english')) ?? data[0];
          return {
            ...prev,
            selectedTranslationId: preferred?.id ?? null,
          };
        });
      } catch (error) {
        console.error('Failed to load translations:', error);
        if (!isMounted) return;
        setState((prev) => ({
          ...prev,
          error: prev.error ?? 'Unable to load translations',
          status: prev.status === 'idle' ? prev.status : 'error',
        }));
      }
    };

    void loadTranslations();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (state.slides.length === 0 || state.currentIndex >= state.slides.length) {
      preserveVerseKeyRef.current = null;
      return;
    }
    preserveVerseKeyRef.current = state.slides[state.currentIndex]?.id ?? null;
  }, [state.slides, state.currentIndex]);

  const buildSlides = useCallback(
    async (
      request: PlayPleasantlyRequest,
      reciterId: number,
      translationId: number | null,
    ): Promise<PlayPleasantlySlide[]> => {
      const uniqueSurahIds = Array.from(new Set(request.segments.map((segment) => segment.surahId)));

      const surahEntries = await Promise.all(
        uniqueSurahIds.map(async (surahId) => {
          const cacheKey = `${surahId}-${translationId ?? 'default'}`;
          if (!surahCache.current.has(cacheKey)) {
            const verses = await retrieveSurah({ surahNumber: surahId, translationId: translationId ?? undefined });
            surahCache.current.set(cacheKey, verses);
          }
          return [surahId, surahCache.current.get(cacheKey)!] as const;
        })
      );

      const recitationEntries = await Promise.all(
        uniqueSurahIds.map(async (surahId) => {
          const cacheKey = `${surahId}-${reciterId}`;
          if (!recitationCache.current.has(cacheKey)) {
            const entries = await retrieveRecitation({ surahNumber: surahId, recitationId: reciterId });
            recitationCache.current.set(cacheKey, entries);
          }
          return [surahId, recitationCache.current.get(cacheKey)!] as const;
        })
      );

      const recitationMap = new Map<string, string>();
      recitationEntries.forEach(([, entries]) => {
        entries.forEach((entry) => {
          if (entry && entry.verseKey && entry.audioUrl) {
            recitationMap.set(entry.verseKey, entry.audioUrl);
          }
        });
      });

      const surahMap = new Map<number, RetrieveSurahVerse[]>(surahEntries);
      const slidesWithOrder: Array<PlayPleasantlySlide & { segmentOrder: number }> = [];

      const ensureBismillahBase = async () => {
        const cacheKey = `${reciterId}-${translationId ?? 'default'}`;
        if (bismillahBaseCache.current.has(cacheKey)) {
          return bismillahBaseCache.current.get(cacheKey)!;
        }

        const surahCacheKey = `1-${translationId ?? 'default'}`;
        if (!surahCache.current.has(surahCacheKey)) {
          const verses = await retrieveSurah({ surahNumber: 1, translationId: translationId ?? undefined });
          surahCache.current.set(surahCacheKey, verses);
        }

        const recitationCacheKey = `1-${reciterId}`;
        if (!recitationCache.current.has(recitationCacheKey)) {
          const entries = await retrieveRecitation({ surahNumber: 1, recitationId: reciterId });
          recitationCache.current.set(recitationCacheKey, entries);
        }

        const surahVerses = surahCache.current.get(surahCacheKey) ?? [];
        const recitations = recitationCache.current.get(recitationCacheKey) ?? [];

        const verse = surahVerses.find((item) => item.key === '1:1');
        const audioUrl = recitations.find((item) => item.verseKey === '1:1')?.audioUrl ?? null;

        const base = {
          arabicText: (verse?.verse ?? BISMILLAH_FALLBACK_ARABIC).trim(),
          translation: (verse?.translation ?? '').trim() || BISMILLAH_FALLBACK_TRANSLATION,
          audioUrl,
        };

        bismillahBaseCache.current.set(cacheKey, base);
        return base;
      };

      const shouldIncludeBismillah = (segment: PlayPleasantlySegment) => {
        const start = segment.startAyah ?? 1;
        if (start > 1) {
          return false;
        }
        if (segment.surahId === 1) {
          return false;
        }
        if (SURAH_WITHOUT_BISMILLAH.has(segment.surahId)) {
          return false;
        }
        return true;
      };

      for (let segmentOrder = 0; segmentOrder < request.segments.length; segmentOrder += 1) {
        const segment = request.segments[segmentOrder];
        const verses = surahMap.get(segment.surahId) ?? [];
        const start = segment.startAyah ?? 1;
        const end = segment.endAyah ?? Number.POSITIVE_INFINITY;

        if (shouldIncludeBismillah(segment)) {
          const base = await ensureBismillahBase();
          slidesWithOrder.push({
            id: `${segment.surahId}:${segmentOrder}:bismillah`,
            surahId: segment.surahId,
            ayahNumber: 0,
            arabicText: base.arabicText,
            translation: base.translation,
            audioUrl: base.audioUrl,
            segmentLabel: segment.label,
            segmentOrder,
          });
        }

        verses.forEach((verse) => {
          const [surahStr, ayahStr] = verse.key.split(':');
          const ayahNumber = Number(ayahStr);
          const surahNumber = Number(surahStr);

          if (Number.isNaN(ayahNumber) || Number.isNaN(surahNumber)) {
            return;
          }

          if (ayahNumber < start || ayahNumber > end) {
            return;
          }

          slidesWithOrder.push({
            id: verse.key,
            surahId: surahNumber,
            ayahNumber,
            arabicText: verse.verse,
            translation: verse.translation ?? '',
            audioUrl: recitationMap.get(verse.key) ?? null,
            segmentLabel: segment.label,
            segmentOrder,
          });
        });
      }

      const slides = slidesWithOrder
        .sort((a, b) => {
          if (a.segmentOrder !== b.segmentOrder) {
            return a.segmentOrder - b.segmentOrder;
          }
          if (a.surahId !== b.surahId) {
            return a.surahId - b.surahId;
          }
          return a.ayahNumber - b.ayahNumber;
        })
        .map(({ segmentOrder: _segmentOrder, ...rest }) => rest);

      return slides;
    },
    []
  );

  useEffect(() => {
    if (state.status === 'idle' || state.status === 'error') {
      return;
    }

    if (!state.request || !state.selectedReciterId) {
      return;
    }

    if (translations.length > 0 && !state.selectedTranslationId) {
      return;
    }

    let isCancelled = false;
    const loadSlides = async () => {
      setState((prev) => ({ ...prev, status: 'loading', error: null }));
      try {
        const slides = await buildSlides(state.request!, state.selectedReciterId!, state.selectedTranslationId);
        if (isCancelled) {
          return;
        }

        if (slides.length === 0) {
          setState((prev) => ({
            ...prev,
            slides,
            status: 'error',
            error: 'No verses available for this selection',
          }));
          return;
        }

        const shouldPreserve = state.preservePosition && preserveVerseKeyRef.current;
        const preservedKey = shouldPreserve ? preserveVerseKeyRef.current : null;
        const preservedIndex = preservedKey ? slides.findIndex((slide) => slide.id === preservedKey) : -1;
        const nextIndex = preservedIndex >= 0 ? preservedIndex : 0;

        setState((prev) => ({
          ...prev,
          slides,
          currentIndex: nextIndex,
          status: 'ready',
          preservePosition: prev.preservePosition,
        }));
      } catch (error) {
        console.error('Failed to build Play Pleasantly slides:', error);
        if (isCancelled) {
          return;
        }
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to prepare verses',
        }));
      }
    };

    void loadSlides();

    return () => {
      isCancelled = true;
    };
  }, [state.request, state.selectedReciterId, state.selectedTranslationId, state.status, buildSlides, translations.length]);

  const startExperience = useCallback((request: PlayPleasantlyRequest) => {
    if (!request.segments || request.segments.length === 0) {
      console.warn('Play Pleasantly request ignored: no segments provided');
      return;
    }

    preserveVerseKeyRef.current = null;

    setState((prev) => ({
      ...prev,
      request,
      status: 'loading',
      error: null,
      currentIndex: 0,
      slides: [],
      preservePosition: false,
      isMinimized: false,
    }));
  }, []);

  const minimizeExperience = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isMinimized: true,
    }));
  }, []);

  const expandExperience = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isMinimized: false,
    }));
  }, []);

  const closeExperience = useCallback(() => {
    setState({
      request: null,
      slides: [],
      status: 'idle',
      error: null,
      selectedReciterId: state.selectedReciterId,
      selectedTranslationId: state.selectedTranslationId,
      currentIndex: 0,
      preservePosition: false,
      isMinimized: false,
    });
  }, [state.selectedReciterId, state.selectedTranslationId]);

  const setSelectedReciterId = useCallback((reciterId: number) => {
    setState((prev) => ({
      ...prev,
      selectedReciterId: reciterId,
      preservePosition: true,
    }));
  }, []);

  const setSelectedTranslationId = useCallback((translationId: number) => {
    setState((prev) => ({
      ...prev,
      selectedTranslationId: translationId,
      preservePosition: true,
    }));
  }, []);

  const setCurrentIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentIndex: index,
    }));
  }, []);

  const contextValue = useMemo<PlayPleasantlyContextValue>(
    () => ({
      startExperience,
      closeExperience,
      minimizeExperience,
      expandExperience,
      isActive: state.status !== 'idle',
      isLoading: state.status === 'loading',
      isMinimized: state.isMinimized,
    }),
    [startExperience, closeExperience, minimizeExperience, expandExperience, state.status, state.isMinimized]
  );

  return (
    <PlayPleasantlyContext.Provider value={contextValue}>
      {children}
      {state.request && state.status !== 'idle' && (
        <PlayPleasantlyOverlay
          request={state.request}
          status={state.status}
          error={state.error}
          slides={state.slides}
          currentIndex={state.currentIndex}
          onIndexChange={setCurrentIndex}
          onClose={closeExperience}
          onMinimize={minimizeExperience}
          onExpand={expandExperience}
          isMinimized={state.isMinimized}
          reciters={reciters}
          selectedReciterId={state.selectedReciterId}
          onReciterChange={setSelectedReciterId}
          translations={translations}
          selectedTranslationId={state.selectedTranslationId}
          onTranslationChange={setSelectedTranslationId}
        />
      )}
    </PlayPleasantlyContext.Provider>
  );
}

export function usePlayPleasantly(): PlayPleasantlyContextValue {
  const value = useContext(PlayPleasantlyContext);
  if (!value) {
    throw new Error('usePlayPleasantly must be used within a PlayPleasantlyProvider');
  }
  return value;
}
