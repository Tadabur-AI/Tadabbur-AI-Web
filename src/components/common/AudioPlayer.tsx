import { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';
import { retrieveRecitation, type RetrieveRecitationVerse } from '../../services/apis';

interface Recitation {
  id: number;
  reciter_name: string;
  style: string;
}

interface AudioPlayerProps {
  surahNumber: number;
  ayahNumber: number;
  recitationId: number;
  recitationName?: string;
  className?: string;
  recitations?: Recitation[];
  onRecitationChange?: (id: number) => void;
  isEffectEnabled?: boolean;
}

/**
 * Audio player for Quran recitations
 * Fetches audio URL from backend API
 * Features: Play/pause controls, seekbar, current/total time display
 */
export default function AudioPlayer({ 
  surahNumber, 
  ayahNumber, 
  recitationId, 
  recitationName = 'Current Reciter',
  className = '',
  recitations = [],
  onRecitationChange,
  isEffectEnabled,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recitationCache = useRef<Map<string, RetrieveRecitationVerse[]>>(new Map());

  // Fetch audio URL from backend with retry logic
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
          setError('Audio not available for this verse');
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

      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const verses = await retrieveRecitation({ surahNumber, recitationId });
          recitationCache.current.set(cacheKey, verses);
          applyAudio(verses);
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Unknown error');
          console.error(`Audio fetch attempt ${attempt + 1}/${maxRetries} failed:`, lastError);

          if (attempt === maxRetries - 1) {
            setAudioUrl(null);
            setError('Failed to load audio');
            setIsLoading(false);
          } else {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
    };

    void fetchAudioUrl();
  }, [surahNumber, ayahNumber, recitationId]);

  useEffect(() => {
    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };

    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setError('Failed to load audio');
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
    // Reset playback when audio URL changes
    setIsPlaying(false);
    setCurrentTime(0);
  }, [audioUrl]);

  // Format time from seconds to MM:SS
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
      console.error('Audio playback error:', err);
      setError('Failed to play audio');
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

  return (
    <div className={`w-full ${className}`}>
      {audioUrl && <audio ref={audioRef} src={audioUrl ?? undefined} preload="metadata" />}
      
      <div
        className={
          isEffectEnabled
            ? 'rounded-lg border border-white/40 bg-white/50 p-4 shadow-sm backdrop-blur-md transition-colors'
            : 'rounded-lg dark:from-black dark:to-black/40 bg-gradient-to-r from-green-50 to-blue-50 p-4 border border-green-100 transition-colors'
        }
      >
        {/* Reciter Selector - Inside the player box */}
        {recitations && recitations.length > 0 && onRecitationChange && (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* <label htmlFor="reciter-select" className="text-sm font-medium text-gray-700">
              Reciter
            </label> */}
            <select
              id="reciter-select"
              value={recitationId || ''}
              onChange={(e) => onRecitationChange(Number(e.target.value))}
              className={`w-full rounded px-3 py-2 text-sm focus:border-primary focus:outline-none sm:min-w-[220px] ${
                isEffectEnabled ? 'border-white/50 bg-white/70 text-gray-800' : 'border border-gray-300'
              }`}
            >
              {recitations.map((recitation) => (
                <option key={recitation.id} value={recitation.id}>
                  {recitation.reciter_name} ({recitation.style})
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Reciter Name */}
        <div className="mb-3 flex items-center gap-2">

          <p className="text-sm font-medium text-gray-700">{recitationName}</p>
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            disabled={!!error || isLoading || !audioUrl}
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg active:shadow-sm ${
              isEffectEnabled ? 'bg-primary/80 hover:bg-primary/70' : 'bg-primary hover:bg-primary/90'
            }`}
            title={isPlaying ? 'Pause' : isLoading ? 'Loading...' : 'Play recitation'}
          >
            {isLoading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : isPlaying ? (
              <FiPause className="h-6 w-6" />
            ) : (
              <FiPlay className="h-6 w-6 ml-0.5" />
            )}
          </button>

          {/* Seekbar and Time Display */}
          <div className="flex-1 min-w-0">
            {/* Progress Bar with time info */}
            <div className="mb-1.5 flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                disabled={!audioUrl || isLoading}
                className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isEffectEnabled ? 'bg-white/40' : 'bg-gray-200'
                }`}
                style={{
                  background: audioUrl && duration > 0 
                    ? `linear-gradient(to right, rgb(31, 98, 10) 0%, rgb(31, 98, 10) ${(currentTime / duration) * 100}%, rgb(229, 231, 235) ${(currentTime / duration) * 100}%, rgb(229, 231, 235) 100%)`
                    : undefined,
                  WebkitAppearance: 'none',
                  appearance: 'none',
                }}
              />
              <style>{`
                input[type="range"]::-webkit-slider-thumb {
                  display: none;
                }
                input[type="range"]::-moz-range-thumb {
                  display: none;
                }
              `}</style>
            </div>

            {/* Time Display */}
            <div className={`flex justify-between text-xs ${isEffectEnabled ? 'text-gray-100 drop-shadow' : 'text-gray-600'}`}>
              <span className="font-mono">{formatTime(currentTime)}</span>
              <span className="font-mono">{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-2 border border-red-200">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State Message */}
        {isLoading && !error && (
          <p className={`mt-2 text-xs text-center ${isEffectEnabled ? 'text-gray-100 drop-shadow' : 'text-gray-600'}`}>
            Loading audio...
          </p>
        )}
      </div>
    </div>
  );
}
