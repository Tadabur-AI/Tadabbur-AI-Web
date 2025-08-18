import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSurahById } from 'quran-english';
import { getVerse, getTranslation } from 'quran-english/dist/index';
import ReadSurahLayout from '../../layouts/ReadSurahLayout';

interface Verse { id: number; verse_key: string; text: string; translation: string; surah_id: number }
interface Surah { id: number; name_english: string; name_arabic: string; verses_count: number }

export default function ReadSurahPage() {
  const { id } = useParams();
  const [surah, setSurah] = useState<Surah | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [reflection, setReflection] = useState('');
  const [isLoadingReflection, setIsLoadingReflection] = useState(false);

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

  const fetchReflection = async () => {
    if (!currentVerse) return;
    setIsLoadingReflection(true);
    setReflection('');
    try {
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.2:1b', prompt: `Provide a spiritual reflection of: "${currentVerse.translation}"` }),
      });

      const reader = res.body?.getReader();
      const dec = new TextDecoder('utf-8');
      let done = false;
      let buf = '';
      while (!done) {
        const { value, done: rDone } = (await reader?.read()) || {};
        done = rDone ?? false;
        if (value) {
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const j = JSON.parse(line);
              if (j.response) setReflection((p) => p + j.response);
              if (j.done) { done = true; break; }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch (e) {
      console.error(e);
      setReflection('Error fetching reflection.');
    } finally {
      setIsLoadingReflection(false);
    }
  };

  const goToPreviousVerse = () => { setCurrentVerseIndex((i) => Math.max(0, i - 1)); setReflection(''); };
  const goToNextVerse = () => { setCurrentVerseIndex((i) => Math.min(verses.length - 1, i + 1)); setReflection(''); };

  return (
    <ReadSurahLayout
      surah={surah}
      verses={verses}
      currentVerseIndex={currentVerseIndex}
      setCurrentVerseIndex={setCurrentVerseIndex}
      goToPreviousVerse={goToPreviousVerse}
      goToNextVerse={goToNextVerse}
      fetchReflection={fetchReflection}
      reflection={reflection}
      isLoadingReflection={isLoadingReflection}
    />
  );
}