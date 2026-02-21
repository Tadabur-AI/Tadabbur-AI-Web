import { useState, useRef } from 'react';
import { FiVolume2 } from 'react-icons/fi';
import { type WordTranslation } from '../../services/apis';

interface WordByWordProps {
  words: WordTranslation[];
  className?: string;
  isEffectEnabled?: boolean;
}

interface WordItemProps {
  word: WordTranslation;
  index: number;
  isEffectEnabled?: boolean;
}

function WordItem({ word, index, isEffectEnabled }: WordItemProps) {
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
      className={`relative flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all duration-200 ${
        isHovered
          ? isEffectEnabled
            ? 'bg-white/60 backdrop-blur-sm shadow-md'
            : 'bg-primary/10 shadow-md'
          : isEffectEnabled
          ? 'bg-white/30 hover:bg-white/50'
          : 'bg-surface-2 hover:bg-primary/5'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`Word ${index + 1}: ${word.text}`}
    >
      <span className="quran-text text-xl sm:text-2xl text-primary leading-relaxed">
        {word.text}
      </span>

      {word.transliteration && (
        <span className="text-xs text-text-muted mt-1 italic">
          {word.transliteration}
        </span>
      )}

      {word.translation && (
        <span className="text-xs text-text mt-0.5 font-medium text-center">
          {word.translation}
        </span>
      )}

      {word.audio && isHovered && (
        <button
          type="button"
          onClick={playAudio}
          disabled={isPlaying}
          className={`absolute -top-1 -right-1 p-1.5 rounded-full transition-colors ${
            isPlaying
              ? 'bg-primary text-on-primary animate-pulse'
              : 'bg-primary/80 text-on-primary hover:bg-primary'
          }`}
          aria-label="Play word pronunciation"
        >
          <FiVolume2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function WordByWord({ words, className = '', isEffectEnabled }: WordByWordProps) {
  if (!words || words.length === 0) {
    return (
      <div className={`text-sm text-text-muted text-center py-4 ${className}`}>
        Word-by-word data not available for this verse.
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-text">
          Word by Word ({words.length} words)
        </h3>
        <span className="text-xs text-text-muted">
          Hover/tap for translation • Click speaker for audio
        </span>
      </div>

      <div
        className={`flex flex-wrap gap-2 justify-end ${
          isEffectEnabled
            ? 'rounded-lg bg-white/40 p-3 backdrop-blur-sm'
            : 'rounded-lg bg-surface p-3 border border-border'
        }`}
        dir="rtl"
      >
        {words.map((word, index) => (
          <WordItem
            key={`${word.text}-${index}`}
            word={word}
            index={index}
            isEffectEnabled={isEffectEnabled}
          />
        ))}
      </div>
    </div>
  );
}
