import { useState, useRef } from 'react';
import { FiVolume2 } from 'react-icons/fi';
import { type WordTranslation } from '../../services/apis';

interface WordByWordProps {
  words: WordTranslation[];
  className?: string;
}

interface WordItemProps {
  word: WordTranslation;
  index: number;
}

function WordItem({ word, index }: WordItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!word.audio || isPlaying) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(word.audio);
        audioRef.current.addEventListener('ended', () => setIsPlaying(false));
        audioRef.current.addEventListener('error', () => setIsPlaying(false));
      } else {
        audioRef.current.currentTime = 0;
      }

      setIsPlaying(true);
      await audioRef.current.play();
    } catch (error) {
      console.error('Failed to play word audio:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div
      className={`
        relative flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors
        ${isHovered ? 'bg-surface-2' : 'hover:bg-surface-2'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`Word ${index + 1}: ${word.text}`}
    >
      <span className="arabic text-lg sm:text-xl text-text">
        {word.text}
      </span>

      {word.transliteration && (
        <span className="text-xs text-text-muted mt-0.5 italic">
          {word.transliteration}
        </span>
      )}

      {word.translation && (
        <span className="text-xs text-text-muted mt-0.5 text-center">
          {word.translation}
        </span>
      )}

      {word.audio && isHovered && (
        <button
          type="button"
          onClick={playAudio}
          disabled={isPlaying}
          className={`
            absolute -top-1 -right-1 p-1 rounded-full transition-colors
            ${isPlaying ? 'bg-primary text-on-primary animate-pulse' : 'bg-primary/80 text-on-primary hover:bg-primary'}
          `}
          aria-label="Play word pronunciation"
        >
          <FiVolume2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function WordByWord({ words, className = '' }: WordByWordProps) {
  if (!words || words.length === 0) {
    return (
      <p className={`text-sm text-text-muted text-center py-4 ${className}`}>
        Word-by-word data not available for this verse.
      </p>
    );
  }

  return (
    <div className={className}>
      <p className="text-xs text-text-muted mb-2">
        Word by Word ({words.length} words) — hover for audio
      </p>

      <div
        className="flex flex-wrap gap-2 justify-end bg-surface-2 rounded-lg p-3"
        dir="rtl"
      >
        {words.map((word, index) => (
          <WordItem
            key={`${word.text}-${index}`}
            word={word}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
