import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import ReadSurahLayout from '../../layouts/ReadSurahLayout';
import { fetchRecitations, type Recitation } from '../../services/quranResourcesService';
import { explainTafsir, type ExplainTafsirResponse } from '../../services/tafsirExplainerService';
import { listSurahs, listTafseers, listTranslations, retrieveSurah, retrieveTafseer, type RetrieveSurahVerse, type RetrieveTafseerItem, type SurahSummary, type TranslationSummary, type WordTranslation } from '../../services/apis';
import {
  getVerseStudyNote,
  saveVerseStudyNoteReflection,
  syncVerseAiExplanation,
  type VerseReference,
  type VerseStudyNote,
} from '../../utils/studyNotes';
import { saveReadingProgress } from '../../utils/quranLocalStorage';
import { JUZ_METADATA } from '../../data/juz';

interface Verse {
  id: number;
  verse_key: string;
  text: string;
  translation: string;
  translationHtml?: string;
  surah_id: number;
  word_translations?: WordTranslation[];
}

interface Surah {
  id: number;
  name_english: string;
  name_arabic: string;
  verses_count: number;
}

const DEFAULT_TRANSLATION_ID = 20;

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const stripTrailingArabicDigits = (text: string) => text.replace(/\s*[\u0660-\u0669]+$/u, '').trim();

const mapToVerse = (data: RetrieveSurahVerse): Verse => {
  const [surahIdStr, ayahStr] = data.key.split(':');
  const surahId = Number(surahIdStr);
  const ayah = Number(ayahStr);
  const cleanedTranslation = stripHtml(data.translation);
  const cleanedText = stripTrailingArabicDigits(data.verse) || data.verse;

  return {
    id: Number.isFinite(ayah) ? ayah : data.key.length,
    verse_key: data.key,
    text: cleanedText,
    translation: cleanedTranslation,
    translationHtml: data.translation,
    surah_id: Number.isFinite(surahId) ? surahId : 0,
    word_translations: data.word_translations || [],
  };
};

const mapToSurah = (summary: SurahSummary | undefined, surahNumber: number, versesCount: number): Surah => ({
  id: surahNumber,
  name_english: summary?.nameSimple ?? `Surah ${surahNumber}`,
  name_arabic: summary?.nameArabic ?? '',
  verses_count: summary?.versesCount ?? versesCount,
});

const parseAyahParam = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
};

const hasTextContent = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const parseVerseKey = (key: string): { surahId: number | null; verseNumber: number | null } => {
  const [surahPart, versePart] = key.split(':');
  const surahId = Number(surahPart);
  const verseNumber = Number(versePart);

  return {
    surahId: Number.isFinite(surahId) ? surahId : null,
    verseNumber: Number.isFinite(verseNumber) ? verseNumber : null,
  };
};

const selectBestTafsirEntry = (entries: RetrieveTafseerItem[], verse: Verse): RetrieveTafseerItem | undefined => {
  const normalizedKey = verse.verse_key;
  const fallbackKey = `${verse.surah_id}:${verse.id}`;

  const directMatch =
    entries.find((entry) => entry.verse_key === normalizedKey) ??
    entries.find((entry) => entry.verse_key === fallbackKey);

  if (directMatch && hasTextContent(directMatch.text)) {
    return directMatch;
  }

  let latestMatch: { entry: RetrieveTafseerItem; verseNumber: number } | null = null;

  for (const entry of entries) {
    if (!hasTextContent(entry.text)) {
      continue;
    }

    const { surahId, verseNumber } = parseVerseKey(entry.verse_key);

    if (surahId !== verse.surah_id || verseNumber === null || verseNumber > verse.id) {
      continue;
    }

    if (!latestMatch || verseNumber > latestMatch.verseNumber) {
      latestMatch = { entry, verseNumber };
    }
  }

  return latestMatch?.entry ?? (directMatch && hasTextContent(directMatch.text) ? directMatch : undefined);
};

export default function ReadSurahPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [surah, setSurah] = useState<Surah | null>(null);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [allVerses, setAllVerses] = useState<Verse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const currentSearch = typeof window !== 'undefined' ? window.location.search : location.search;
  const currentPathname = typeof window !== 'undefined' ? window.location.pathname : location.pathname;
  const currentHash = typeof window !== 'undefined' ? window.location.hash : location.hash;
  const urlSearchParams = new URLSearchParams(currentSearch);
  const startAyah = parseAyahParam(urlSearchParams.get('start'));
  const endAyah = parseAyahParam(urlSearchParams.get('end'));
  const ayahParam = parseAyahParam(urlSearchParams.get('ayah'));
  const juzParam = parseAyahParam(urlSearchParams.get('juz'));
  
  const [selectedRecitation, setSelectedRecitation] = useState<number | null>(() => {
    const saved = localStorage.getItem('tadabbur_recitation');
    return saved ? Number(saved) : null;
  });
  const [selectedTranslation, setSelectedTranslation] = useState<number>(() => {
    const saved = localStorage.getItem('tadabbur_translation');
    return saved ? Number(saved) : DEFAULT_TRANSLATION_ID;
  });
  const [selectedTafsir, setSelectedTafsir] = useState<number | null>(() => {
    const saved = localStorage.getItem('tadabbur_tafsir');
    return saved ? Number(saved) : 169;
  });
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  const [tafsirOptions, setTafsirOptions] = useState<Array<{ id: number; name: string; languageName: string }>>([]);
  const [translationOptions, setTranslationOptions] = useState<Array<{ id: number; name: string; languageName: string }>>([]);
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [isTafsirLoading, setIsTafsirLoading] = useState(false);
  const tafseerCache = useRef<Map<string, RetrieveTafseerItem[]>>(new Map());
  const explanationCache = useRef<Map<string, ExplainTafsirResponse>>(new Map());
  const tafsirTextForVerseRef = useRef<string | null>(null);
  
  const [recitations, setRecitations] = useState<Recitation[]>([]);
  
  const [aiExplanation, setAiExplanation] = useState<ExplainTafsirResponse | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [currentVerseNote, setCurrentVerseNote] = useState<VerseStudyNote | null>(null);
  const displayedVerses = useMemo(() => {
    if (allVerses.length === 0) {
      return [];
    }

    const filteredVerses = allVerses.filter((verse) => {
      if (startAyah && verse.id < startAyah) return false;
      if (endAyah && verse.id > endAyah) return false;
      return true;
    });

    return filteredVerses.length > 0 ? filteredVerses : allVerses;
  }, [allVerses, endAyah, startAyah]);
  const currentVerse = displayedVerses[currentVerseIndex] ?? null;
  const normalizedTafsirText = useMemo(() => (tafsirText ? stripHtml(tafsirText) : ''), [tafsirText]);

  useEffect(() => {
    if (selectedTranslation) {
      localStorage.setItem('tadabbur_translation', String(selectedTranslation));
    }
  }, [selectedTranslation]);

  useEffect(() => {
    const loadTafsirOptions = async () => {
      const cachedTafsirs = localStorage.getItem('tadabbur_tafsirs_cache');
      if (cachedTafsirs) {
        try {
          const tafsirs = JSON.parse(cachedTafsirs);
          setTafsirOptions(tafsirs);
          console.log('Loaded tafsir options from localStorage cache');
          return;
        } catch (err) {
          console.error('Failed to parse cached tafsirs, fetching from API:', err);
        }
      }

      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const tafseerList = await listTafseers();
          const tafsirData = tafseerList.map((t) => ({
            id: t.id,
            name: t.name,
            languageName: t.languageName,
          }));
          setTafsirOptions(tafsirData);
          localStorage.setItem('tadabbur_tafsirs_cache', JSON.stringify(tafsirData));
          console.log('Fetched tafsir options from API and cached to localStorage');
          return;
        } catch (error) {
          console.error(`Tafsir options fetch attempt ${attempt + 1}/${maxRetries} failed:`, error);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
    };

    const applyRecitations = (recitationsData: Recitation[]) => {
      setRecitations(recitationsData);
      setSelectedRecitation((currentSelectedRecitation) => {
        if (
          recitationsData.length === 0 ||
          (currentSelectedRecitation && recitationsData.some((item) => item.id === currentSelectedRecitation))
        ) {
          return currentSelectedRecitation;
        }

        const defaultReciterId = recitationsData[0].id;
        localStorage.setItem('tadabbur_recitation', String(defaultReciterId));
        return defaultReciterId;
      });
    };

    const loadRecitations = async () => {
      const cachedRecitations = localStorage.getItem('tadabbur_recitations_cache');
      if (cachedRecitations) {
        try {
          const recitationsData = JSON.parse(cachedRecitations);
          applyRecitations(recitationsData);
          console.log('Loaded recitations from localStorage cache');
          return;
        } catch (err) {
          console.error('Failed to parse cached recitations, fetching from API:', err);
        }
      }

      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const recitationsData = await fetchRecitations();
          applyRecitations(recitationsData);
          localStorage.setItem('tadabbur_recitations_cache', JSON.stringify(recitationsData));
          console.log('Fetched recitations from API and cached to localStorage');
          return;
        } catch (error) {
          console.error(`Recitations fetch attempt ${attempt + 1}/${maxRetries} failed:`, error);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
    };

    void loadTafsirOptions();
    void loadRecitations();
  }, []);

  useEffect(() => {
    const loadTranslations = async () => {
      const cachedTranslations = localStorage.getItem('tadabbur_translations_cache');
      if (cachedTranslations) {
        try {
          const translations = JSON.parse(cachedTranslations);
          setTranslationOptions(translations);
          console.log('Loaded translations from localStorage cache');

          if (!translations.some((item: { id: number }) => item.id === selectedTranslation) && translations.length > 0) {
            const preferred = translations.find((item: { languageName?: string }) => item.languageName?.toLowerCase() === 'english') ?? translations[0];
            setSelectedTranslation(preferred.id);
            localStorage.setItem('tadabbur_translation', String(preferred.id));
          }

          return;
        } catch (err) {
          console.error('Failed to parse cached translations, fetching from API:', err);
        }
      }

      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const translationList = await listTranslations();
          const translationData = translationList.map((t: TranslationSummary) => ({
            id: t.id,
            name: t.translatedName?.name ?? t.name,
            languageName: t.languageName,
          }));

          setTranslationOptions(translationData);
          localStorage.setItem('tadabbur_translations_cache', JSON.stringify(translationData));
          console.log('Fetched translations from API and cached to localStorage');

          if (!translationData.some((item) => item.id === selectedTranslation) && translationData.length > 0) {
            const preferred = translationData.find((item) => item.languageName?.toLowerCase() === 'english') ?? translationData[0];
            setSelectedTranslation(preferred.id);
            localStorage.setItem('tadabbur_translation', String(preferred.id));
          }

          return;
        } catch (error) {
          console.error(`Translations fetch attempt ${attempt + 1}/${maxRetries} failed:`, error);
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
    };

    void loadTranslations();
  }, [selectedTranslation]);

  useEffect(() => {
    if (!id) return;
    const surahNumber = Number(id);
    if (!Number.isFinite(surahNumber) || surahNumber <= 0) {
      setLoadError('Invalid surah number.');
      return;
    }

    const loadSurah = async () => {
      try {
        setLoadError(null);

        const [summaries, versesResponse] = await Promise.all([
          listSurahs(),
          retrieveSurah({ surahNumber, translationId: selectedTranslation }),
        ]);

        const summary = summaries.find((item) => item.id === surahNumber);
        setSurah(mapToSurah(summary, surahNumber, versesResponse.length));

        const mappedVerses = versesResponse
          .map(mapToVerse)
          .sort((a, b) => a.id - b.id);

        setAllVerses(mappedVerses);
      } catch (error) {
        console.error('Failed to load surah:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load surah');
        setSurah(null);
        setAllVerses([]);
      }
    };

    void loadSurah();
  }, [id, selectedTranslation]);

  useEffect(() => {
    if (displayedVerses.length === 0) {
      if (currentVerseIndex !== 0) {
        setCurrentVerseIndex(0);
      }
      return;
    }

    let nextIndex = 0;
    if (ayahParam) {
      const ayahIndex = displayedVerses.findIndex((verse) => verse.id === ayahParam);
      if (ayahIndex !== -1) {
        nextIndex = ayahIndex;
      }
    }

    if (currentVerseIndex !== nextIndex) {
      setCurrentVerseIndex(nextIndex);
    }
  }, [ayahParam, currentVerseIndex, displayedVerses]);

  const syncAyahInUrl = useCallback((ayahNumber: number) => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextParams = new URLSearchParams(window.location.search);
    if (parseAyahParam(nextParams.get('ayah')) === ayahNumber) {
      return;
    }

    nextParams.set('ayah', String(ayahNumber));
    const nextSearch = nextParams.toString();
    const nextUrl = `${currentPathname}${nextSearch ? `?${nextSearch}` : ''}${currentHash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [currentHash, currentPathname]);

  const selectVerseIndex = useCallback((nextIndex: number) => {
    if (displayedVerses.length === 0) {
      return;
    }

    const clampedIndex = Math.max(0, Math.min(displayedVerses.length - 1, nextIndex));
    const nextVerse = displayedVerses[clampedIndex];
    if (!nextVerse) {
      return;
    }

    syncAyahInUrl(nextVerse.id);

    if (currentVerseIndex !== clampedIndex) {
      setCurrentVerseIndex(clampedIndex);
    }
  }, [currentVerseIndex, displayedVerses, syncAyahInUrl]);

  useEffect(() => {
    let ignore = false;

    const loadTafsirText = async () => {
      if (!selectedTafsir || !currentVerse) {
        if (!ignore) {
          tafsirTextForVerseRef.current = null;
          setTafsirText(null);
        }
        return;
      }

      if (!ignore) {
        setIsTafsirLoading(true);
        tafsirTextForVerseRef.current = null;
        setTafsirText(null);
      }

      const cacheKey = `${currentVerse.surah_id}-${selectedTafsir}`;

      const cachedEntries = tafseerCache.current.get(cacheKey);

      if (cachedEntries) {
        if (ignore) return;
        const verseTafsir = selectBestTafsirEntry(cachedEntries, currentVerse);
        setTafsirText(verseTafsir?.text ?? null);
        tafsirTextForVerseRef.current = currentVerse.verse_key;
        setIsTafsirLoading(false);
        return;
      }

      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await retrieveTafseer({
            surahNumber: currentVerse.surah_id,
            tafseerId: selectedTafsir,
          });

          if (ignore) return;

          tafseerCache.current.set(cacheKey, response);
          const verseTafsir = selectBestTafsirEntry(response, currentVerse);
          setTafsirText(verseTafsir?.text ?? null);
          tafsirTextForVerseRef.current = currentVerse.verse_key;
          setIsTafsirLoading(false);
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.error(`Tafsir fetch attempt ${attempt + 1}/${maxRetries} failed:`, lastError);

          if (attempt === maxRetries - 1) {
            if (!ignore) {
              tafsirTextForVerseRef.current = null;
              setTafsirText(null);
              setIsTafsirLoading(false);
            }
          } else {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
    };

    void loadTafsirText();

    return () => {
      ignore = true;
    };
  }, [currentVerse, selectedTafsir]);

  useEffect(() => {
    let ignore = false;

    const generateExplanation = async () => {
      if (!selectedTafsir || !currentVerse || !tafsirText) {
        if (!ignore) {
          setAiExplanation(null);
        }
        return;
      }

      if (isTafsirLoading) {
        return;
      }

      if (tafsirTextForVerseRef.current !== currentVerse.verse_key) {
        if (!ignore) {
          setAiExplanation(null);
          setIsExplanationLoading(false);
        }
        return;
      }

      const cacheKey = `${currentVerse.verse_key}-${selectedTafsir}`;
      const plainTafsir = stripHtml(tafsirText);

      if (!plainTafsir) {
        if (!ignore) {
          setAiExplanation(null);
          setIsExplanationLoading(false);
        }
        return;
      }

      const cachedExplanation = explanationCache.current.get(cacheKey);
      if (cachedExplanation && cachedExplanation.fallbackMode !== 'verse_chat') {
        if (!ignore) {
          setAiExplanation(cachedExplanation);
          setIsExplanationLoading(false);
        }
        return;
      }

      if (!ignore) {
        setIsExplanationLoading(true);
        setAiExplanation(null);
      }

      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const tafsirAuthorName = tafsirOptions.find(t => t.id === selectedTafsir)?.name || 'Unknown';
          const result = await explainTafsir(plainTafsir, currentVerse.verse_key, tafsirAuthorName, selectedTafsir);
          if (ignore) return;

          if (result.fallbackMode !== 'verse_chat') {
            explanationCache.current.set(cacheKey, result);
          }
          setAiExplanation(result);
          setIsExplanationLoading(false);
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.error(`AI explanation attempt ${attempt + 1}/${maxRetries} failed:`, lastError);

          if (attempt === maxRetries - 1) {
            if (!ignore) {
              setAiExplanation(null);
              setIsExplanationLoading(false);
            }
          } else {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
    };

    void generateExplanation();

    return () => {
      ignore = true;
    };
  }, [currentVerse, selectedTafsir, tafsirText, isTafsirLoading, tafsirOptions]);

  useEffect(() => {
    if (!surah || !currentVerse) {
      setCurrentVerseNote(null);
      return;
    }

    setCurrentVerseNote(getVerseStudyNote(currentVerse.verse_key));
  }, [currentVerse, surah]);

  useEffect(() => {
    if (!surah || !currentVerse) {
      return;
    }

    saveReadingProgress({
      verseKey: currentVerse.verse_key,
      surahId: currentVerse.surah_id || surah.id,
      surahName: surah.name_english,
      surahNameArabic: surah.name_arabic,
      ayahNumber: currentVerse.id,
      versesCount: surah.verses_count,
    });
  }, [currentVerse, surah]);

  const buildVerseReference = (): VerseReference | null => {
    if (!surah || !currentVerse) {
      return null;
    }

    return {
      verseKey: currentVerse.verse_key,
      surahId: currentVerse.surah_id,
      surahName: surah.name_english,
      surahNameArabic: surah.name_arabic,
      ayahNumber: currentVerse.id,
      arabicText: currentVerse.text,
      translation: currentVerse.translation,
    };
  };

  const handleSaveVerseNote = (userMarkdown: string) => {
    const verseReference = buildVerseReference();
    if (!verseReference) {
      return;
    }

    setCurrentVerseNote(saveVerseStudyNoteReflection(verseReference, userMarkdown));
  };

  const handleSaveAiToNotes = () => {
    const verseReference = buildVerseReference();
    if (!verseReference || !aiExplanation || !selectedTafsir) {
      return;
    }

    const tafsirName = tafsirOptions.find((tafsir) => tafsir.id === selectedTafsir)?.name ?? 'Unknown';
    setCurrentVerseNote(
      syncVerseAiExplanation(verseReference, aiExplanation.explanation, {
        tafsirId: selectedTafsir,
        tafsirName,
      }),
    );
  };

  const juzContext = useMemo(() => {
    if (!juzParam || !surah) return null;
    const juz = JUZ_METADATA.find((j) => j.number === juzParam);
    if (!juz) return null;
    
    const currentSectionIndex = juz.sections.findIndex((s) => s.surahId === surah.id);
    if (currentSectionIndex === -1) return null;

    return {
      juzNumber: juz.number,
      currentSectionIndex,
      sections: juz.sections,
      hasPrevSection: currentSectionIndex > 0,
      hasNextSection: currentSectionIndex < juz.sections.length - 1,
      prevSection: currentSectionIndex > 0 ? juz.sections[currentSectionIndex - 1] : null,
      nextSection: currentSectionIndex < juz.sections.length - 1 ? juz.sections[currentSectionIndex + 1] : null,
    };
  }, [juzParam, surah]);

  const disablePrevAyah = currentVerseIndex === 0 && !juzContext?.hasPrevSection;
  const disableNextAyah = displayedVerses.length > 0 && currentVerseIndex === displayedVerses.length - 1 && !juzContext?.hasNextSection;

  const goToPreviousVerse = useCallback(() => {
    if (currentVerseIndex === 0) {
      if (juzContext?.prevSection) {
        const { surahId, startAyah, endAyah } = juzContext.prevSection;
        navigate(`/surah/${surahId}?start=${startAyah}&end=${endAyah}&juz=${juzContext.juzNumber}&ayah=${endAyah}`);
      }
    } else {
      selectVerseIndex(currentVerseIndex - 1);
    }
  }, [currentVerseIndex, selectVerseIndex, juzContext, navigate]);
  
  const goToNextVerse = useCallback(() => {
    if (currentVerseIndex === displayedVerses.length - 1) {
      if (juzContext?.nextSection) {
        const { surahId, startAyah, endAyah } = juzContext.nextSection;
        navigate(`/surah/${surahId}?start=${startAyah}&end=${endAyah}&juz=${juzContext.juzNumber}&ayah=${startAyah}`);
      }
    } else {
      selectVerseIndex(currentVerseIndex + 1);
    }
  }, [currentVerseIndex, displayedVerses.length, selectVerseIndex, juzContext, navigate]);

  const handleRecitationChange = useCallback((id: number) => {
    setSelectedRecitation(id);
    localStorage.setItem('tadabbur_recitation', String(id));
  }, []);

  const handleTranslationChange = useCallback((id: number) => {
    setSelectedTranslation(id);
    localStorage.setItem('tadabbur_translation', String(id));
  }, []);

  const handleTafsirChange = useCallback((id: number) => {
    setSelectedTafsir(id);
    localStorage.setItem('tadabbur_tafsir', String(id));
  }, []);

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-danger">Failed to load surah.</p>
          <p className="mt-2 text-sm text-text-muted">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <ReadSurahLayout
      surah={surah}
      verses={displayedVerses}
      currentVerseIndex={currentVerseIndex}
      setCurrentVerseIndex={selectVerseIndex}
      goToPreviousVerse={goToPreviousVerse}
      goToNextVerse={goToNextVerse}
      selectedRecitation={selectedRecitation}
      selectedTranslation={selectedTranslation}
      selectedTafsir={selectedTafsir}
      onRecitationChange={handleRecitationChange}
      onTranslationChange={handleTranslationChange}
      onTafsirChange={handleTafsirChange}
      isExplainerOpen={isExplainerOpen}
      onExplainerToggle={() => setIsExplainerOpen(!isExplainerOpen)}
      isReportModalOpen={isReportOpen}
      onReportModalToggle={setIsReportOpen}
      tafsirText={tafsirText}
      isTafsirLoading={isTafsirLoading}
      tafsirOptions={tafsirOptions}
      translationOptions={translationOptions}
      aiExplanation={aiExplanation}
      isExplanationLoading={isExplanationLoading}
      recitations={recitations}
      currentVerseNote={currentVerseNote}
      onSaveVerseNote={handleSaveVerseNote}
      onSaveAiToNotes={handleSaveAiToNotes}
      tafsirPlainText={normalizedTafsirText}
      disablePrevAyah={disablePrevAyah}
      disableNextAyah={disableNextAyah}
    />
  );
}
