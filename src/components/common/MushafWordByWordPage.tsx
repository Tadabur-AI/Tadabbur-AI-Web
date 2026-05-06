import { memo } from 'react';
import { type QuranPage, type QuranReaderVerse } from '../../utils/quranPages';

interface MushafWordByWordPageProps {
  page: QuranPage;
  surahId: number;
  surahNameEnglish: string;
  surahNameArabic: string;
  translatedName?: string;
  showBismillah?: boolean;
  selectedVerseKey?: string;
  onSelectVerse: (verseKey: string) => void;
}

interface MushafVerseProps {
  verse: QuranReaderVerse;
  isSelected: boolean;
  onSelectVerse: (verseKey: string) => void;
}

const MushafVerse = memo(function MushafVerse({ verse, isSelected, onSelectVerse }: MushafVerseProps) {
  return (
    <button
      type="button"
      className={`mushaf-verse ${isSelected ? 'is-selected' : ''}`}
      aria-pressed={isSelected}
      aria-label={`Select ayah ${verse.id}`}
      onClick={() => onSelectVerse(verse.verse_key)}
    >
      {(verse.word_translations ?? []).map((word, index) => (
        <span className="mushaf-word" key={`${verse.verse_key}-${word.text}-${index}`}>
          <span className="mushaf-word__arabic">{word.text}</span>
          <span className="mushaf-word__translation">{word.translation}</span>
        </span>
      ))}
      <span className="surah-wheel-badge mushaf-ayah-marker" aria-hidden="true">
        {verse.id}
      </span>
    </button>
  );
});

const MushafWordByWordPage = memo(function MushafWordByWordPage({
  page,
  surahId,
  surahNameEnglish,
  surahNameArabic,
  translatedName,
  showBismillah = true,
  selectedVerseKey,
  onSelectVerse,
}: MushafWordByWordPageProps) {
  return (
    <article className="mushaf-page" aria-label={`${surahNameEnglish} page ${page.pageNumber}`}>
      <header className="mushaf-page__header">
        <div className="mushaf-page__chapter">
          <p className="mushaf-page__arabic-title">{surahNameArabic}</p>
          <div className="mushaf-page__chapter-copy">
            <h2 className="mushaf-page__latin-title">
              {surahId}. {surahNameEnglish}
            </h2>
            {translatedName ? <p className="mushaf-page__translation-title">{translatedName}</p> : null}
          </div>
        </div>

        {showBismillah ? (
          <div className="mushaf-page__bismillah-block">
            <p className="mushaf-page__bismillah">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</p>
            <p className="mushaf-page__bismillah-translation">
              In the Name of Allah, the Most Compassionate, Most Merciful
            </p>
          </div>
        ) : null}
      </header>

      <div className="mushaf-page__flow" dir="rtl">
        {page.verses.map((verse) => (
          <MushafVerse
            key={verse.verse_key}
            verse={verse}
            isSelected={verse.verse_key === selectedVerseKey}
            onSelectVerse={onSelectVerse}
          />
        ))}
      </div>

      <footer className="mushaf-page__footer">{page.pageNumber}</footer>
    </article>
  );
});

export default MushafWordByWordPage;
