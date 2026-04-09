import { useState, useRef, useEffect, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight, FiPause, FiPlay } from 'react-icons/fi';
import { retrieveRecitation, type RetrieveRecitationVerse } from '../../services/apis';

interface AudioPlayerProps {
  surahNumber: number;
  ayahNumber: number;
  recitationId: number;
  title: string;
  subtitle?: string;
  sticky?: boolean;
  className?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  disablePrevious?: boolean;
  disableNext?: boolean;
}

export default function AudioPlayer({
  surahNumber,
  ayahNumber,
  recitationId,
  title,
  subtitle,
  sticky = false,
  className = '',
  onPrevious,
  onNext,
  disablePrevious = false,
  disableNext = false,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recitationCache = useRef<Map<string, RetrieveRecitationVerse[]>>(new Map());
  const playbackIntentRef = useRef(false);

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
          setError('Audio unavailable.');
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
        setError('Failed to load audio.');
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
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      playbackIntentRef.current = false;
      setIsPlaying(false);
    };
    const handleError = () => {
      playbackIntentRef.current = false;
      setError('Playback error.');
      setIsPlaying(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    if (audio.readyState >= 1 && Number.isFinite(audio.duration)) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl || !playbackIntentRef.current) {
      return;
    }

    const resumePlayback = async () => {
      try {
        await audio.play();
        setError(null);
      } catch (err) {
        console.error('Playback error:', err);
        playbackIntentRef.current = false;
        setError('Playback failed.');
        setIsPlaying(false);
      }
    };

    void resumePlayback();
  }, [audioUrl]);

  const formatTime = useCallback((time: number) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    try {
      if (isPlaying) {
        playbackIntentRef.current = false;
        audio.pause();
      } else {
        playbackIntentRef.current = true;
        await audio.play();
        setError(null);
      }
    } catch (err) {
      console.error('Playback error:', err);
      playbackIntentRef.current = false;
      setError('Playback failed.');
      setIsPlaying(false);
    }
  }, [audioUrl, isPlaying]);

  const commitSeek = useCallback((nextTime?: number) => {
    const audio = audioRef.current;
    const resolvedTime = typeof nextTime === 'number' ? nextTime : scrubTime ?? currentTime;
    if (audio) {
      audio.currentTime = resolvedTime;
    }
    setCurrentTime(resolvedTime);
    setScrubTime(null);
    setIsScrubbing(false);
  }, [currentTime, scrubTime]);

  const handleSeekPreview = useCallback((nextTime: number) => {
    setScrubTime(nextTime);

    if (!isScrubbing) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = nextTime;
      }
      setCurrentTime(nextTime);
    }
  }, [isScrubbing]);

  const sliderValue = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
  const progress = duration > 0 ? (sliderValue / duration) * 100 : 0;

  const barContent = (
    <>
      {audioUrl ? <audio ref={audioRef} src={audioUrl} preload="metadata" /> : null}

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void togglePlay()}
            disabled={!!error || isLoading || !audioUrl}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={isPlaying ? 'Pause verse audio' : 'Play verse audio'}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
            ) : isPlaying ? (
              <FiPause size={18} aria-hidden="true" />
            ) : (
              <FiPlay size={18} aria-hidden="true" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">{title}</p>
            {subtitle ? <p className="truncate text-xs text-text-muted">{subtitle}</p> : null}
          </div>

          <button
            type="button"
            onClick={onPrevious}
            disabled={disablePrevious}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface p-0 text-text transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-auto sm:min-h-[44px] sm:w-auto sm:min-w-[44px] sm:px-3"
            aria-label="Previous ayah"
          >
            <FiChevronLeft size={18} aria-hidden="true" />
            <span className="hidden sm:ml-2 sm:inline">Prev</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={disableNext}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface p-0 text-text transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-auto sm:min-h-[44px] sm:w-auto sm:min-w-[44px] sm:px-3"
            aria-label="Next ayah"
          >
            <span className="hidden sm:mr-2 sm:inline">Next</span>
            <FiChevronRight size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={sliderValue}
            onInput={(event) => handleSeekPreview(Number.parseFloat(event.currentTarget.value))}
            onPointerDown={() => {
              setIsScrubbing(true);
              setScrubTime(currentTime);
            }}
            onPointerUp={(event) => commitSeek(Number.parseFloat(event.currentTarget.value))}
            onPointerCancel={() => commitSeek()}
            onKeyDown={() => {
              if (!isScrubbing) {
                setIsScrubbing(true);
                setScrubTime(sliderValue);
              }
            }}
            onKeyUp={(event) => commitSeek(Number.parseFloat(event.currentTarget.value))}
            onBlur={() => {
              if (isScrubbing) {
                commitSeek();
              }
            }}
            disabled={!audioUrl || isLoading}
            className="audio-seek"
            style={{
              background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${progress}%, var(--color-surface-2) ${progress}%, var(--color-surface-2) 100%)`,
            }}
            aria-label="Seek verse audio"
          />

          <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
            <div className="flex items-center gap-3">
              <span className="tabular-nums">{formatTime(sliderValue)}</span>
              <span className="tabular-nums">{formatTime(duration)}</span>
            </div>
            {error ? (
              <span className="text-danger" aria-live="polite">
                {error}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );

  if (sticky) {
    return (
      <div className={`fixed inset-x-0 bottom-0 z-player bg-background/95 backdrop-blur ${className}`.trim()}>
        <div
          className="mx-auto max-w-[1600px] px-3 pt-2 sm:px-6 xl:px-8"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <div className="rounded-[24px] bg-surface px-3 py-3 shadow-[0_-16px_40px_rgba(20,20,18,0.12)] sm:px-4">
            {barContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full flex-col gap-3 ${className}`.trim()}>
      {barContent}
    </div>
  );
}
