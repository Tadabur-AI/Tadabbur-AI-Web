import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSurahById } from 'quran-english';
import { getVerse, getTranslation } from 'quran-english/dist/index';
import ReadSurahLayout from '../../layouts/ReadSurahLayout';
import { fetchTafsirForVerse, generateSimplifiedTafsir } from '../../services/tafsirService';

interface Verse { id: number; verse_key: string; text: string; translation: string; surah_id: number }
interface Surah { id: number; name_english: string; name_arabic: string; verses_count: number }
interface TafsirEdition {
  slug: string;
  name: string;
  language?: string;
  language_name?: string;
  languageName: string;
  author_name?: string;
  id?: number;
  source?: string;
}

interface TafsirStatus {
  status: 'idle' | 'loading' | 'ready' | 'error';
  raw?: string;
  simplified?: string;
  errorMessage?: string;
  simplifiedStatus?: 'idle' | 'loading' | 'ready' | 'error';
  simplifiedErrorMessage?: string;
}

export default function ReadSurahPage() {
  const { id } = useParams();
  const [surah, setSurah] = useState<Surah | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [tafsirByVerse, setTafsirByVerse] = useState<Record<string, TafsirStatus>>({});
  const [editionOptions, setEditionOptions] = useState<TafsirEdition[]>([]);
  const [isEditionLoading, setIsEditionLoading] = useState(false);
  const [editionError, setEditionError] = useState<string | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<string>('en-tafisr-ibn-kathir');
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true; // reset after Strict Mode remounts
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadEditions = async () => {
      setIsEditionLoading(true);
      setEditionError(null);

      try {
        const response = await fetch('https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/editions.json');
        if (!response.ok) {
          throw new Error('Unable to load tafsir editions.');
        }

        const editionsRaw = (await response.json()) as Array<Partial<TafsirEdition>>;
        if (!Array.isArray(editionsRaw) || editionsRaw.length === 0) {
          throw new Error('No tafsir editions available.');
        }

        const editions = editionsRaw
          .filter((edition): edition is Partial<TafsirEdition> & { slug: string; name: string } => {
            return Boolean(edition?.slug && edition?.name);
          })
          .map((edition) => {
            const languageValue = edition.language_name ?? edition.language ?? '';
            return {
              ...edition,
              languageName: languageValue,
            } as TafsirEdition;
          });

        setEditionOptions(editions);
        if (!editions.some((edition) => edition.slug === selectedEdition)) {
          setSelectedEdition(editions[0].slug);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load tafsir editions.';
        setEditionError(message);
      } finally {
        setIsEditionLoading(false);
      }
    };

    void loadEditions();
  }, []);

  useEffect(() => {
    if (!id) return;
    const surahData = getSurahById(Number(id));
    setSurah(surahData || null);
    if (!surahData) return;

    const v: Verse[] = [];
    for (let i = 1; i <= surahData.verses_count; i++) {
      try {
        const text = getVerse(Number(id), i);
        const translation = getTranslation(Number(id), i) || '';
        if (text) v.push({ id: i, verse_key: `${id}:${i}`, text, translation, surah_id: Number(id) });
      } catch (e) {
        console.error(e);
      }
    }
    setVerses(v);
  }, [id]);

  const currentVerse = verses[currentVerseIndex];
  const verseKey = currentVerse?.verse_key;
  const verseId = currentVerse?.id;
  const surahId = currentVerse?.surah_id;
  const verseText = currentVerse?.text;
  const verseTranslation = currentVerse?.translation;

  const tafsirState = useMemo(() => {
    const state = verseKey ? tafsirByVerse[verseKey] : undefined;
    console.log('Tafsir State for', verseKey, ':', state);
    return state;
  }, [
    verseKey,
    tafsirByVerse,
  ]);

  useEffect(() => {
    setTafsirByVerse({});
  }, [selectedEdition]);

  useEffect(() => {
    if (!verseKey || !verseId || !surahId || !verseText || !verseTranslation || !selectedEdition) {
      console.log('Tafsir useEffect skipped - missing data:', { verseKey, verseId, surahId, hasText: !!verseText, hasTranslation: !!verseTranslation });
      return;
    }

    console.log('=== Starting tafsir fetch for', verseKey, '===');

    const loadTafsir = async () => {
      // Check if already loading or loaded
      let shouldSkip = false;
      setTafsirByVerse((prev) => {
        const existing = prev[verseKey];
        if (existing && (existing.status === 'loading' || existing.status === 'ready')) {
          console.log('Skipping tafsir fetch for', verseKey, '- already exists:', existing);
          shouldSkip = true;
          return prev;
        }
        console.log('Setting loading state for', verseKey);
        return {
          ...prev,
          [verseKey]: { status: 'loading' as const, simplifiedStatus: 'idle' as const },
        };
      });

      if (shouldSkip) return;

      try {
    console.log('Fetching raw tafsir for', surahId, verseId);
    const raw = await fetchTafsirForVerse(surahId, verseId, selectedEdition);
        console.log('Raw tafsir received:', raw.substring(0, 100));
        if (!isMountedRef.current) return;

        console.log('Setting raw tafsir in state for', verseKey);
        setTafsirByVerse((prev) => {
          const previous = prev[verseKey];
          const newState = {
            ...prev,
            [verseKey]: {
              ...previous,
              status: 'ready' as const,
              raw,
              errorMessage: undefined,
              simplifiedStatus: 'loading' as const,
              simplifiedErrorMessage: undefined,
            },
          };
          console.log('✅ New tafsir state set:', newState[verseKey]);
          return newState;
        });

        console.log('⏳ Waiting a moment before checking state...');
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          console.log('Generating simplified tafsir for', verseKey);
          const simplified = await generateSimplifiedTafsir({
            verseText,
            translation: verseTranslation,
            tafsirText: raw,
          });

          if (!isMountedRef.current) return;

          console.log('Simplified tafsir generated:', simplified.substring(0, 100));
          setTafsirByVerse((prev) => {
            const previous = prev[verseKey];
            return {
              ...prev,
              [verseKey]: {
                ...previous,
                status: 'ready' as const,
                raw,
                simplified,
                simplifiedStatus: 'ready' as const,
                simplifiedErrorMessage: undefined,
              },
            };
          });
        } catch (simplifiedError) {
          if (!isMountedRef.current) return;
          const message =
            simplifiedError instanceof Error
              ? simplifiedError.message
              : 'Unable to generate explanation.';

          console.error('Error generating simplified tafsir:', simplifiedError);
          setTafsirByVerse((prev) => {
            const previous = prev[verseKey];
            return {
              ...prev,
              [verseKey]: {
                ...previous,
                status: 'ready' as const,
                raw,
                simplifiedStatus: 'error' as const,
                simplifiedErrorMessage: message,
              },
            };
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load tafsir.';
        if (isMountedRef.current) {
          setTafsirByVerse((prev) => ({
            ...prev,
            [verseKey]: { status: 'error', errorMessage: message },
          }));
        }
      }
    };

    void loadTafsir();
  }, [verseKey, verseId, surahId, verseText, verseTranslation, selectedEdition]);

  const goToPreviousVerse = () => {
    setCurrentVerseIndex((i) => Math.max(0, i - 1));
  };
  const goToNextVerse = () => {
    setCurrentVerseIndex((i) => Math.min(verses.length - 1, i + 1));
  };

  return (
    <ReadSurahLayout
      surah={surah}
      verses={verses}
      currentVerseIndex={currentVerseIndex}
      setCurrentVerseIndex={setCurrentVerseIndex}
      goToPreviousVerse={goToPreviousVerse}
      goToNextVerse={goToNextVerse}
      tafsirState={tafsirState}
      tafsirByVerse={tafsirByVerse}
      editionOptions={editionOptions}
      selectedEdition={selectedEdition}
      onEditionChange={setSelectedEdition}
      isEditionLoading={isEditionLoading}
      editionError={editionError}
    />
  );
}