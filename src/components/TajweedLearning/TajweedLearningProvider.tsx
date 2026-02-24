import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import TajweedLearningOverlay from './TajweedLearningOverlay';
import {
  retrieveSurah,
  retrieveRecitation,
  listReciters,
  type RetrieveSurahVerse,
  type WordTranslation,
  type ReciterSummary,
} from '../../services/apis';

export interface TajweedLearningRequest {
  surahId: number;
  surahName: string;
  surahNameArabic: string;
  startAyah?: number;
  endAyah?: number;
}

export interface TajweedVerseSlide {
  id: string;
  surahId: number;
  ayahNumber: number;
  verseKey: string;
  arabicText: string;
  translation: string;
  words: WordTranslation[];
}

interface TajweedLearningContextValue {
  startLearning: (request: TajweedLearningRequest) => void;
  closeLearning: () => void;
  isActive: boolean;
  isLoading: boolean;
}

const TajweedLearningContext = createContext<TajweedLearningContextValue | undefined>(undefined);

interface ProviderState {
  request: TajweedLearningRequest | null;
  slides: TajweedVerseSlide[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  currentVerseIndex: number;
  currentWordIndex: number;
  reciters: ReciterSummary[];
  selectedReciterId: number | null;
  playFullVerseAfter: boolean;
}

const stripHtml = (html: string | null | undefined) => 
  html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
const stripTrailingArabicDigits = (text: string | null | undefined) => 
  text ? text.replace(/\s*[\u0660-\u0669]+$/u, '').trim() : '';

export function TajweedLearningProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProviderState>({
    request: null,
    slides: [],
    status: 'idle',
    error: null,
    currentVerseIndex: 0,
    currentWordIndex: 0,
    reciters: [],
    selectedReciterId: null,
    playFullVerseAfter: true,
  });

  const surahCache = useRef<Map<string, RetrieveSurahVerse[]>>(new Map());

  // Load reciters on mount
  useEffect(() => {
    let isMounted = true;
    const loadReciters = async () => {
      try {
        const data = await listReciters();
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            reciters: data,
            selectedReciterId: prev.selectedReciterId ?? data[0]?.id ?? null,
          }));
        }
      } catch (error) {
        console.error('Failed to load reciters:', error);
      }
    };
    void loadReciters();
    return () => {
      isMounted = false;
    };
  }, []);

  const buildSlides = useCallback(
    (verses: RetrieveSurahVerse[], surahId: number): TajweedVerseSlide[] => {
      return verses.map((verse) => {
        const [, ayahStr] = verse.key.split(':');
        const ayahNumber = Number(ayahStr) || 0;

        return {
          id: verse.key,
          surahId,
          ayahNumber,
          verseKey: verse.key,
          arabicText: stripTrailingArabicDigits(verse.verse) || verse.verse,
          translation: stripHtml(verse.translation),
          words: verse.word_translations || [],
        };
      });
    },
    []
  );

  const loadVerses = useCallback(
    async (request: TajweedLearningRequest) => {
      const { surahId, startAyah, endAyah } = request;
      const cacheKey = `${surahId}`;

      setState((prev) => ({
        ...prev,
        status: 'loading',
        error: null,
        currentVerseIndex: 0,
        currentWordIndex: 0,
      }));

      try {
        let verses = surahCache.current.get(cacheKey);

        if (!verses) {
          verses = await retrieveSurah({ surahNumber: surahId });
          surahCache.current.set(cacheKey, verses);
        }

        // Filter by range if provided
        let filteredVerses = verses;
        if (startAyah || endAyah) {
          filteredVerses = verses.filter((v) => {
            const [, ayahStr] = v.key.split(':');
            const ayah = Number(ayahStr);
            const afterStart = !startAyah || ayah >= startAyah;
            const beforeEnd = !endAyah || ayah <= endAyah;
            return afterStart && beforeEnd;
          });
        }

        const slides = buildSlides(filteredVerses, surahId);

        setState((prev) => ({
          ...prev,
          slides,
          status: 'ready',
          error: null,
        }));
      } catch (error) {
        console.error('Failed to load verses for Tajweed learning:', error);
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to load verses',
        }));
      }
    },
    [buildSlides]
  );

  const startLearning = useCallback(
    (request: TajweedLearningRequest) => {
      setState((prev) => ({
        ...prev,
        request,
        slides: [],
        currentVerseIndex: 0,
        currentWordIndex: 0,
      }));
      void loadVerses(request);
    },
    [loadVerses]
  );

  const closeLearning = useCallback(() => {
    setState((prev) => ({
      request: null,
      slides: [],
      status: 'idle',
      error: null,
      currentVerseIndex: 0,
      currentWordIndex: 0,
      reciters: prev.reciters,
      selectedReciterId: prev.selectedReciterId,
      playFullVerseAfter: prev.playFullVerseAfter,
    }));
  }, []);

  const setCurrentVerseIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentVerseIndex: index,
      currentWordIndex: 0,
    }));
  }, []);

  const setCurrentWordIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentWordIndex: index,
    }));
  }, []);

  const setSelectedReciterId = useCallback((reciterId: number) => {
    setState((prev) => ({
      ...prev,
      selectedReciterId: reciterId,
    }));
  }, []);

  const setPlayFullVerseAfter = useCallback((value: boolean) => {
    setState((prev) => ({
      ...prev,
      playFullVerseAfter: value,
    }));
  }, []);

  const contextValue: TajweedLearningContextValue = {
    startLearning,
    closeLearning,
    isActive: state.request !== null,
    isLoading: state.status === 'loading',
  };

  return (
    <TajweedLearningContext.Provider value={contextValue}>
      {children}
      {state.request && (
        <TajweedLearningOverlay
          request={state.request}
          status={state.status}
          error={state.error}
          slides={state.slides}
          currentVerseIndex={state.currentVerseIndex}
          currentWordIndex={state.currentWordIndex}
          onVerseIndexChange={setCurrentVerseIndex}
          onWordIndexChange={setCurrentWordIndex}
          onClose={closeLearning}
          reciters={state.reciters}
          selectedReciterId={state.selectedReciterId}
          onReciterChange={setSelectedReciterId}
          playFullVerseAfter={state.playFullVerseAfter}
          onPlayFullVerseAfterChange={setPlayFullVerseAfter}
          retrieveRecitation={retrieveRecitation}
        />
      )}
    </TajweedLearningContext.Provider>
  );
}

export function useTajweedLearning() {
  const context = useContext(TajweedLearningContext);
  if (!context) {
    throw new Error('useTajweedLearning must be used within a TajweedLearningProvider');
  }
  return context;
}
