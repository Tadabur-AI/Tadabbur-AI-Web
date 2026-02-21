import { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';
import { retrieveRecitation, type RetrieveRecitationVerse, type ReciterSummary } from '../../services/apis';

interface Recitation {
  id: number;
  reciter_name: string;
  style: string;
}

interface AudioPlayerProps {
  surahNumber: number;
  ayahNumber: number;
  recitationId: number;
  className?: string;
  recitations?: Recitation[] | ReciterSummary[];
  onRecitationChange?: (id: number) => void;
}

export default function AudioPlayer({
  surahNumber,
  ayahNumber,
  recitationId,
  className = '',
  recitations = [],
  onRecitationChange,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recitationCache = useRef<Map<string, RetrieveRecitationVerse[]>>(new Map());

  useEffect(() => {
    const fetchAudioUrl = async () => {
      const cacheKey = `${surahNumber}-${recitationId}`;
      const verseKey = `${surahNumber}:${ayahNumber}`;

      const applyAudio = (entries: RetrieveRecitationVerse[]) => {
        const match = entries.find((entry) => entry.verseKey === verseKey);
        if (match && match.audioUrl) {
          setAudioUrl(match.audioUrl);
          setError(null);
        } else {
          setAudioUrl(null);
          setError('Audio unavailable');
        }
        setIsLoading(false);
      };

      const cached = recitationCache.current.get(cacheKey);
      if (cached) {
        applyAudio(cached);
        return;
      }

      setIsLoading(true);
      setError(null);
      setAudioUrl(null);

      try {
        const verses = await retrieveRecitation({ surahNumber, recitationId });
        recitationCache.current.set(cacheKey, verses);
        applyAudio(verses);
      } catch (err) {
        console.error('Audio fetch failed:', err);
        setAudioUrl(null);
        setError('Failed to load');
        setIsLoading(false);
      }
    };

    void fetchAudioUrl();
  }, [surahNumber, ayahNumber, recitationId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setError('Playback error');
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [audioUrl]);

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
        setError(null);
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Playback failed');
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const getReciterName = (r: Recitation | ReciterSummary): string => {
    if ('reciter_name' in r) return r.reciter_name;
    if ('translatedName' in r && r.translatedName) return r.translatedName.name;
    if ('name' in r) return r.name;
    return 'Reciter';
  };

  return (
    <div className={`flex items-center gap-3 w-full ${className}`}>
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      <button
        onClick={togglePlay}
        disabled={!!error || isLoading || !audioUrl}
        className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <FiPause size={18} />
        ) : (
          <FiPlay size={18} className="ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            disabled={!audioUrl || isLoading}
            className="sr-only"
          />
        </div>
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span className="tabular-nums">{formatTime(currentTime)}</span>
          <span className="tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>

      {recitations.length > 0 && onRecitationChange && (
        <select
          value={recitationId || ''}
          onChange={(e) => onRecitationChange(Number(e.target.value))}
          className="w-32 text-xs bg-surface-2 border-border rounded px-2 py-1 hidden sm:block"
        >
          {recitations.map((r) => (
            <option key={r.id} value={r.id}>
              {getReciterName(r)}
            </option>
          ))}
        </select>
      )}

      {error && (
        <span className="text-xs text-danger shrink-0">{error}</span>
      )}
    </div>
  );
}
