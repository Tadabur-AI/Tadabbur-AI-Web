import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ReadSurahLayout from '../../layouts/ReadSurahLayout';
import { fetchRecitations, type Recitation } from '../../services/quranResourcesService';
import { explainTafsir, type ExplainTafsirResponse } from '../../services/tafsirExplainerService';
import { listSurahs, listTafseers, listTranslations, retrieveSurah, retrieveTafseer, type RetrieveSurahVerse, type RetrieveTafseerItem, type SurahSummary, type TranslationSummary, type WordTranslation } from '../../services/apis';

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
  const [searchParams] = useSearchParams();
  const [surah, setSurah] = useState<Surah | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [allVerses, setAllVerses] = useState<Verse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const startAyah = parseAyahParam(searchParams.get('start'));
  const endAyah = parseAyahParam(searchParams.get('end'));
  
  // Quran settings state - load from localStorage or use defaults
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
    return saved ? Number(saved) : 169; // Default to Ibn Kathir if not saved
  });
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  
  // Tafsir data state
  const [tafsirOptions, setTafsirOptions] = useState<Array<{ id: number; name: string; languageName: string }>>([]);
  const [translationOptions, setTranslationOptions] = useState<Array<{ id: number; name: string; languageName: string }>>([]);
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [isTafsirLoading, setIsTafsirLoading] = useState(false);
  const tafseerCache = useRef<Map<string, RetrieveTafseerItem[]>>(new Map());
  const explanationCache = useRef<Map<string, ExplainTafsirResponse>>(new Map());
  
  // Recitations data state
  const [recitations, setRecitations] = useState<Recitation[]>([]);
  
  // AI explanation state
  const [aiExplanation, setAiExplanation] = useState<ExplainTafsirResponse | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);

  useEffect(() => {
    if (selectedTranslation) {
      localStorage.setItem('tadabbur_translation', String(selectedTranslation));
    }
  }, [selectedTranslation]);

  // Load tafsir options from backend - with retry logic and localStorage caching
  useEffect(() => {
    const loadTafsirOptions = async () => {
      // Try localStorage cache first
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

      // If not in cache, fetch from API with retry logic
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
          // Cache to localStorage
          localStorage.setItem('tadabbur_tafsirs_cache', JSON.stringify(tafsirData));
          console.log('Fetched tafsir options from API and cached to localStorage');
          return; // Success - exit early
        } catch (error) {
          console.error(`Tafsir options fetch attempt ${attempt + 1}/${maxRetries} failed:`, error);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
    };

    // Load recitations - with retry logic and localStorage caching
    const applyRecitations = (recitationsData: Recitation[]) => {
      setRecitations(recitationsData);

      if (
        recitationsData.length > 0 &&
        (!selectedRecitation || !recitationsData.some((item) => item.id === selectedRecitation))
      ) {
        const defaultReciterId = recitationsData[0].id;
        setSelectedRecitation(defaultReciterId);
        localStorage.setItem('tadabbur_recitation', String(defaultReciterId));
      }
    };

    const loadRecitations = async () => {
      // Try localStorage cache first
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

      // If not in cache, fetch from API with retry logic
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const recitationsData = await fetchRecitations();
          applyRecitations(recitationsData);
          // Cache to localStorage
          localStorage.setItem('tadabbur_recitations_cache', JSON.stringify(recitationsData));
          console.log('Fetched recitations from API and cached to localStorage');
          return; // Success - exit early
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

  // Load surah and verses using new API endpoint
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
        setVerses([]);
      }
    };

    void loadSurah();
  }, [id, selectedTranslation]);

  // Filter verses if a specific aya range is requested
  useEffect(() => {
    if (allVerses.length === 0) {
      setVerses([]);
      return;
    }

    const filtered = allVerses.filter((verse) => {
      if (startAyah && verse.id < startAyah) return false;
      if (endAyah && verse.id > endAyah) return false;
      return true;
    });

    const nextVerses = filtered.length > 0 ? filtered : allVerses;
    setVerses(nextVerses);
    setCurrentVerseIndex(0);
  }, [allVerses, startAyah, endAyah]);

  // Load tafsir text when verse or tafsir selection changes - with retry logic
  useEffect(() => {
    const loadTafsirText = async () => {
      if (!selectedTafsir || !verses[currentVerseIndex]) {
        setTafsirText(null);
        return;
      }

      setIsTafsirLoading(true);
      setTafsirText(null);

      const currentVerse = verses[currentVerseIndex];
      const cacheKey = `${currentVerse.surah_id}-${selectedTafsir}`;

      const cachedEntries = tafseerCache.current.get(cacheKey);

      if (cachedEntries) {
        const verseTafsir = selectBestTafsirEntry(cachedEntries, currentVerse);
        setTafsirText(verseTafsir?.text ?? null);
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

          tafseerCache.current.set(cacheKey, response);
          const verseTafsir = selectBestTafsirEntry(response, currentVerse);
          setTafsirText(verseTafsir?.text ?? null);
          setIsTafsirLoading(false);
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.error(`Tafsir fetch attempt ${attempt + 1}/${maxRetries} failed:`, lastError);

          if (attempt === maxRetries - 1) {
            setTafsirText(null);
            setIsTafsirLoading(false);
          } else {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
    };

    void loadTafsirText();
  }, [selectedTafsir, currentVerseIndex, verses]);

  // Auto-generate AI explanation when verse or tafsir changes - ONLY AFTER tafsir is loaded
  useEffect(() => {
    const generateExplanation = async () => {
      if (!selectedTafsir || !verses[currentVerseIndex] || !tafsirText) {
        setAiExplanation(null);
        return;
      }

      // Skip if tafsir is still loading
      if (isTafsirLoading) {
        return;
      }

      const currentVerse = verses[currentVerseIndex];
      const cacheKey = `${currentVerse.verse_key}-${selectedTafsir}`;
      const plainTafsir = stripHtml(tafsirText);

      if (!plainTafsir) {
        setAiExplanation(null);
        setIsExplanationLoading(false);
        return;
      }

      const cachedExplanation = explanationCache.current.get(cacheKey);
      if (cachedExplanation) {
        setAiExplanation(cachedExplanation);
        setIsExplanationLoading(false);
        return;
      }

      setIsExplanationLoading(true);
      setAiExplanation(null);

      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const result = await explainTafsir(plainTafsir);
          explanationCache.current.set(cacheKey, result);
          setAiExplanation(result);
          setIsExplanationLoading(false);
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.error(`AI explanation attempt ${attempt + 1}/${maxRetries} failed:`, lastError);

          if (attempt === maxRetries - 1) {
            setAiExplanation(null);
            setIsExplanationLoading(false);
          } else {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
    };

    void generateExplanation();
  }, [selectedTafsir, currentVerseIndex, verses, tafsirText, isTafsirLoading]);

  const goToPreviousVerse = () => {
    setCurrentVerseIndex((i) => Math.max(0, i - 1));
  };
  
  const goToNextVerse = () => {
    setCurrentVerseIndex((i) => Math.min(verses.length - 1, i + 1));
  };

  // Handler for recitation change - saves to localStorage
  const handleRecitationChange = (id: number) => {
    setSelectedRecitation(id);
    localStorage.setItem('tadabbur_recitation', String(id));
  };

  // Handler for translation change - saves to localStorage
  const handleTranslationChange = (id: number) => {
    setSelectedTranslation(id);
    localStorage.setItem('tadabbur_translation', String(id));
  };

  // Handler for tafsir change - saves to localStorage
  const handleTafsirChange = (id: number) => {
    setSelectedTafsir(id);
    localStorage.setItem('tadabbur_tafsir', String(id));
  };

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-white px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-red-600">Failed to load surah.</p>
          <p className="mt-2 text-sm text-gray-600">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <ReadSurahLayout
      surah={surah}
      verses={verses}
      currentVerseIndex={currentVerseIndex}
      setCurrentVerseIndex={setCurrentVerseIndex}
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
      tafsirText={tafsirText}
      isTafsirLoading={isTafsirLoading}
      tafsirOptions={tafsirOptions}
  translationOptions={translationOptions}
      aiExplanation={aiExplanation}
      isExplanationLoading={isExplanationLoading}
      recitations={recitations}
    />
  );
}