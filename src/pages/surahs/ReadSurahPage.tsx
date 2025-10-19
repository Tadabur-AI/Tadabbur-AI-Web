import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSurahById } from 'quran-english';
import { getVerse, getTranslation } from 'quran-english/dist/index';
import ReadSurahLayout from '../../layouts/ReadSurahLayout';
import { fetchTafsirs, fetchRecitations, type Recitation } from '../../services/quranResourcesService';
import { fetchTafsirText, explainTafsir } from '../../services/tafsirExplainerService';

interface Verse { id: number; verse_key: string; text: string; translation: string; surah_id: number }
interface Surah { id: number; name_english: string; name_arabic: string; verses_count: number }

export default function ReadSurahPage() {
  const { id } = useParams();
  const [surah, setSurah] = useState<Surah | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  
  // Quran settings state - load from localStorage or use defaults
  const [selectedRecitation, setSelectedRecitation] = useState<number | null>(() => {
    const saved = localStorage.getItem('tadabbur_recitation');
    return saved ? Number(saved) : null;
  });
  const [selectedTranslation, setSelectedTranslation] = useState<number | null>(() => {
    const saved = localStorage.getItem('tadabbur_translation');
    return saved ? Number(saved) : null;
  });
  const [selectedTafsir, setSelectedTafsir] = useState<number | null>(() => {
    const saved = localStorage.getItem('tadabbur_tafsir');
    return saved ? Number(saved) : 169; // Default to Ibn Kathir if not saved
  });
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  
  // Tafsir data state
  const [tafsirOptions, setTafsirOptions] = useState<Array<{ id: number; name: string; languageName: string }>>([]);
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [isTafsirLoading, setIsTafsirLoading] = useState(false);
  
  // Recitations data state
  const [recitations, setRecitations] = useState<Recitation[]>([]);
  
  // AI explanation state
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);

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
          const tafsirs = await fetchTafsirs('en'); // English only
          const tafsirData = tafsirs.map(t => ({
            id: t.id,
            name: t.name,
            languageName: t.language_name
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
    const loadRecitations = async () => {
      // Try localStorage cache first
      const cachedRecitations = localStorage.getItem('tadabbur_recitations_cache');
      if (cachedRecitations) {
        try {
          const recitationsData = JSON.parse(cachedRecitations);
          setRecitations(recitationsData);
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
          setRecitations(recitationsData);
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

  // Load surah and verses
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

  // Load tafsir text when verse or tafsir selection changes - with retry logic
  useEffect(() => {
    const loadTafsirText = async () => {
      if (!selectedTafsir || !verses[currentVerseIndex]) {
        setTafsirText(null);
        return;
      }

      setIsTafsirLoading(true);
      setTafsirText(null);

      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const currentVerse = verses[currentVerseIndex];
          const result = await fetchTafsirText(
            currentVerse.surah_id,
            currentVerseIndex + 1,
            selectedTafsir
          );
          setTafsirText(result.text);
          setIsTafsirLoading(false);
          return; // Success - exit early
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.error(`Tafsir fetch attempt ${attempt + 1}/${maxRetries} failed:`, lastError);

          if (attempt === maxRetries - 1) {
            // All retries failed - silently fail without showing error
            setTafsirText(null);
            setIsTafsirLoading(false);
          } else {
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
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

      setIsExplanationLoading(true);
      setAiExplanation(null);

      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const currentVerse = verses[currentVerseIndex];
          const result = await explainTafsir({
            surah: currentVerse.surah_id,
            ayah: currentVerseIndex + 1,
            tafsir_id: selectedTafsir,
          });
          setAiExplanation(result.explained_tafsir);
          setIsExplanationLoading(false);
          return; // Success - exit early
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.error(`AI explanation attempt ${attempt + 1}/${maxRetries} failed:`, lastError);

          if (attempt === maxRetries - 1) {
            // All retries failed - silently fail without showing error
            setAiExplanation(null);
            setIsExplanationLoading(false);
          } else {
            // Exponential backoff: 1s, 2s, 4s
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
      aiExplanation={aiExplanation}
      isExplanationLoading={isExplanationLoading}
      recitations={recitations}
    />
  );
}