import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiChevronUp, FiLoader, FiPause, FiPlay, FiVolume2, FiVolumeX, FiX } from 'react-icons/fi';
import type { PlayPleasantlyRequest, PlayPleasantlySlide } from './PlayPleasantlyProvider';
import type { ReciterSummary, TranslationSummary } from '../../services/apis';
import rainImage from '/images/rain.gif';

const RAIN_VOLUME = 0.05;

interface PlayPleasantlyOverlayProps {
  request: PlayPleasantlyRequest;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  slides: PlayPleasantlySlide[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onMinimize: () => void;
  onExpand: () => void;
  isMinimized: boolean;
  reciters: ReciterSummary[];
  selectedReciterId: number | null;
  onReciterChange: (id: number) => void;
  translations: TranslationSummary[];
  selectedTranslationId: number | null;
  onTranslationChange: (id: number) => void;
}

export default function PlayPleasantlyOverlay({
  request,
  status,
  error,
  slides,
  currentIndex,
  onIndexChange,
  onClose,
  onMinimize,
  onExpand,
  isMinimized,
  reciters,
  selectedReciterId,
  onReciterChange,
  translations,
  selectedTranslationId,
  onTranslationChange,
}: PlayPleasantlyOverlayProps) {
  const [isVerseAudioLoading, setIsVerseAudioLoading] = useState(false);
  const [isVersePlaying, setIsVersePlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isRainEnabled, setIsRainEnabled] = useState(true);
  const verseAudioRef = useRef<HTMLAudioElement | null>(null);
  const rainAudioRef = useRef<HTMLAudioElement | null>(null);
  const slide = slides[currentIndex];
  const selectedReciter = useMemo(
    () => reciters.find((reciter) => reciter.id === (selectedReciterId ?? -1)),
    [reciters, selectedReciterId]
  );
  const selectedTranslation = useMemo(
    () => translations.find((translation) => translation.id === (selectedTranslationId ?? -1)),
    [translations, selectedTranslationId]
  );
  const selectedReciterLabel = selectedReciter
    ? selectedReciter.translatedName?.name || selectedReciter.name || 'Reciter'
    : 'Select a reciter';
  const selectedTranslationLabel = selectedTranslation
    ? `${selectedTranslation.name}${selectedTranslation.authorName ? ` - ${selectedTranslation.authorName}` : ''}`
    : 'Select a translation';

  const progressText = useMemo(() => {
    if (slides.length === 0) {
      return 'Preparing verses';
    }
    return `Verse ${currentIndex + 1} of ${slides.length}`;
  }, [currentIndex, slides.length]);

  const advance = useCallback(() => {
    if (slides.length === 0) {
      return;
    }
    if (currentIndex >= slides.length - 1) {
      setIsComplete(true);
      setIsVersePlaying(false);
      return;
    }
    onIndexChange(currentIndex + 1);
  }, [currentIndex, slides.length, onIndexChange]);

  const retreat = useCallback(() => {
    if (currentIndex === 0) {
      return;
    }
    setIsComplete(false);
    onIndexChange(currentIndex - 1);
  }, [currentIndex, onIndexChange]);

  const togglePlayback = useCallback(() => {
    if (!verseAudioRef.current) {
      return;
    }
    if (verseAudioRef.current.paused) {
      void verseAudioRef.current.play();
    } else {
      verseAudioRef.current.pause();
    }
  }, []);

  useEffect(() => {
    if (isMinimized) {
      return undefined;
    }

    const el = document.body;
    if (!el) {
      return undefined;
    }

    const originalOverflow = el.style.overflow;
    el.style.overflow = 'hidden';

    return () => {
      el.style.overflow = originalOverflow;
    };
  }, [isMinimized]);

  useEffect(() => {
    const audio = new Audio();
    verseAudioRef.current = audio;

    const handleEnded = () => advance();
    const handleCanPlay = () => setIsVerseAudioLoading(false);
    const handlePlay = () => {
      setIsVerseAudioLoading(false);
      setIsVersePlaying(true);
    };
    const handlePause = () => setIsVersePlaying(false);
    const handleError = () => {
      setIsVerseAudioLoading(false);
      setIsVersePlaying(false);
      advance();
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      verseAudioRef.current = null;
    };
  }, [advance]);

  useEffect(() => {
    const rain = new Audio('/sounds/rain.mp3');
    rain.loop = true;
    rain.volume = RAIN_VOLUME;
    rainAudioRef.current = rain;

    const playRain = async () => {
      try {
        await rain.play();
      } catch (err) {
        console.warn('Rain ambiance playback blocked:', err);
      }
    };

    void playRain();

    return () => {
      rain.pause();
      rain.src = '';
      rainAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const rain = rainAudioRef.current;
    if (!rain) {
      return;
    }

    if (isRainEnabled) {
      rain.volume = RAIN_VOLUME;
      if (rain.paused) {
        void rain.play().catch((err) => {
          console.warn('Rain ambiance playback blocked:', err);
        });
      }
    } else {
      rain.volume = 0;
    }
  }, [isRainEnabled]);

  useEffect(() => {
    if (!verseAudioRef.current) {
      return;
    }

    if (status !== 'ready') {
      verseAudioRef.current.pause();
      return;
    }

    const currentSlide = slides[currentIndex];
    setIsComplete(false);

    if (!currentSlide) {
      return;
    }

    if (!currentSlide.audioUrl) {
      setIsVerseAudioLoading(false);
      setIsVersePlaying(false);
      const timeout = window.setTimeout(() => advance(), 2000);
      return () => window.clearTimeout(timeout);
    }

    setIsVerseAudioLoading(true);
    setIsVersePlaying(false);
    verseAudioRef.current.pause();
    verseAudioRef.current.src = currentSlide.audioUrl;
    verseAudioRef.current.currentTime = 0;

    const playAudio = async () => {
      try {
        await verseAudioRef.current?.play();
      } catch (err) {
        console.warn('Playback blocked, waiting for user interaction:', err);
        setIsVerseAudioLoading(false);
        setIsVersePlaying(false);
      }
    };

    void playAudio();
  }, [status, slides, currentIndex, advance]);

  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        advance();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        retreat();
      }
      if (event.key === ' ') {
        event.preventDefault();
        togglePlayback();
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [advance, retreat, togglePlayback, onClose]);

  useEffect(() => () => {
    verseAudioRef.current?.pause();
    if (verseAudioRef.current) {
      verseAudioRef.current.src = '';
    }
  }, []);

  const handleMinimize = () => {
    onMinimize();
  };

  const handleExpand = () => {
    onExpand();
  };

  const toggleRain = () => {
    setIsRainEnabled((prev) => !prev);
  };

  const canRetreat = currentIndex > 0;
  const canAdvance = slides.length > 0 && currentIndex < slides.length - 1;
  const progressRatio = slides.length ? (currentIndex + 1) / slides.length : 0;

  const shouldShowBottomBar = status === 'loading' || status === 'ready' || status === 'error';

  return (
    <>
      <div
        className={`fixed inset-0 transition-opacity duration-300 ${
          isMinimized ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        style={{ zIndex: 80 }}
        aria-hidden={isMinimized}
      >
        <div className="absolute inset-0 bg-black">
          <div
            className="absolute inset-0 z-10 bg-cover bg-center opacity-40"
            aria-hidden="true"
            style={{
              background: `url(${rainImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0.8), rgba(0,0,0,1))' }}
          />
        </div>

        <div className="relative z-10 flex h-full max-h-screen flex-col overflow-y-auto text-white">
          <header className="flex flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <button
                type="button"
                onClick={handleMinimize}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-green-400"
                aria-label="Minimize Play Pleasantly"
              >
                <FiChevronDown className="h-5 w-5" />
              </button>
              <div className="flex flex-col text-left sm:hidden">
                <p className="text-[0.65rem] uppercase tracking-[0.35em] text-green-200/70">Play Pleasantly</p>
                <h2 className="mt-1 text-lg font-semibold">{request.title}</h2>
                {request.subtitle && <p className="text-xs text-green-200/80">{request.subtitle}</p>}
              </div>
            </div>

            <div className="hidden flex-1 text-center sm:block">
              <p className="text-xs uppercase tracking-[0.4em] text-green-200/70">Play Pleasantly</p>
              <h2 className="mt-2 text-xl font-semibold sm:text-2xl">{request.title}</h2>
              {request.subtitle && <p className="text-sm text-green-200/80">{request.subtitle}</p>}
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end sm:text-right">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={toggleRain}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-green-100 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-green-400"
                  aria-pressed={isRainEnabled}
                  aria-label={isRainEnabled ? 'Turn off rain ambiance' : 'Turn on rain ambiance'}
                  title={isRainEnabled ? 'Turn off rain ambiance' : 'Turn on rain ambiance'}
                >
                  {isRainEnabled ? <FiVolume2 className="h-4 w-4" /> : <FiVolumeX className="h-4 w-4" />}
                  <span className="hidden sm:inline">Rain</span>
                  <span className="sm:hidden">Rain {isRainEnabled ? 'on' : 'off'}</span>
                </button>
              </div>
              <div className="flex flex-col gap-1 text-xs uppercase tracking-[0.3em] text-green-200/70">
                <span className="flex items-center gap-2">
                  <FiVolume2 className="hidden h-4 w-4 text-green-200 sm:block" aria-hidden="true" />
                  <span className="sm:hidden">Reciter</span>
                </span>
                <span className="text-[0.7rem] font-semibold normal-case tracking-normal text-green-100/80">
                  {selectedReciterLabel}
                  {selectedReciter?.style ? ` · ${selectedReciter.style}` : ''}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pleasantly-reciter-select" className="sr-only">
                  Reciter
                </label>
                <select
                  id="pleasantly-reciter-select"
                  className="w-full min-w-[140px] rounded-lg border border-white/30 bg-black/40 px-3 py-2 text-sm focus:border-green-400 focus:outline-none sm:w-fit sm:max-w-[300px]"
                  value={selectedReciterId ?? ''}
                  onChange={(event) => {
                    const reciterId = Number(event.target.value);
                    if (Number.isNaN(reciterId)) {
                      return;
                    }
                    onReciterChange(reciterId);
                  }}
                  disabled={!reciters.length}
                  aria-label="Select reciter"
                >
                  {reciters.length === 0 && <option value="">Loading reciters...</option>}
                  {reciters.map((reciter) => {
                    const label = reciter.translatedName?.name || reciter.name || `Reciter ${reciter.id}`;
                    return (
                      <option key={reciter.id} value={reciter.id}>
                        {label}
                        {reciter.style ? ` (${reciter.style})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[0.7rem] font-semibold tracking-wide text-green-100/70">{selectedTranslationLabel}</span>
                <label htmlFor="pleasantly-translation-select" className="sr-only">
                  Translation
                </label>
                <select
                  id="pleasantly-translation-select"
                  className="w-full min-w-[140px] rounded-lg border border-white/30 bg-black/40 px-3 py-2 text-sm focus:border-green-400 focus:outline-none sm:w-fit sm:max-w-[300px]"
                  value={selectedTranslationId ?? ''}
                  onChange={(event) => {
                    const translationId = Number(event.target.value);
                    if (Number.isNaN(translationId)) {
                      return;
                    }
                    onTranslationChange(translationId);
                  }}
                  disabled={!translations.length}
                  aria-label="Select translation"
                >
                  {translations.length === 0 && <option value="">Loading translations...</option>}
                  {translations.map((translation) => {
                    const label = translation.name || translation.slug || `Translation ${translation.id}`;
                    const author = translation.authorName ? ` - ${translation.authorName}` : '';
                    return (
                      <option key={translation.id} value={translation.id}>
                        {label}
                        {author}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </header>

          <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-8 text-center sm:px-6 md:pb-10">
            {status === 'loading' && (
              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 px-6 py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-300/80 border-t-transparent" aria-hidden="true" />
                <span className="text-lg font-medium tracking-wide text-green-100">Loading immersive recitation...</span>
              </div>
            )}

            {status === 'error' && (
              <div className="max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-6">
                <p className="text-lg font-semibold text-red-200">{error ?? 'Something went wrong while preparing this experience.'}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                >
                  Stop
                </button>
              </div>
            )}

            {status === 'ready' && slide && (
              <div className="flex w-full max-w-4xl flex-col items-center gap-6 sm:gap-8">
                <div className="flex flex-wrap items-center justify-center gap-2 text-[0.7rem] uppercase tracking-[0.3em] text-green-300/80 sm:text-xs">
                  <span>{progressText}</span>
                  {slide.segmentLabel && <span className="text-green-200/70">{slide.segmentLabel}</span>}
                </div>

                <p className="text-3xl font-semibold leading-snug text-white drop-shadow-sm sm:text-4xl md:text-5xl">
                  {slide.arabicText}
                </p>

                <p className="max-w-3xl text-base text-green-100/90 sm:text-lg md:text-xl">
                  {slide.translation?.trim() ? slide.translation : 'Translation not available for this verse.'}
                </p>

                <div className="flex items-center gap-5 text-sm text-green-200/70 sm:gap-6">
                  <button
                    type="button"
                    onClick={retreat}
                    disabled={!canRetreat}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
                    aria-label="Previous verse"
                  >
                    <FiChevronLeft className="h-6 w-6" />
                  </button>

                  <button
                    type="button"
                    onClick={togglePlayback}
                    className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:bg-green-400"
                    aria-label={isVersePlaying ? 'Pause verse audio' : 'Play verse audio'}
                    disabled={isVerseAudioLoading}
                  >
                    {isVerseAudioLoading ? (
                      <FiLoader className="h-7 w-7 animate-spin" />
                    ) : isVersePlaying ? (
                      <FiPause className="h-7 w-7" />
                    ) : (
                      <FiPlay className="h-7 w-7 translate-x-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={advance}
                    disabled={!canAdvance}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
                    aria-label="Next verse"
                  >
                    <FiChevronRight className="h-6 w-6" />
                  </button>
                </div>

                <div className="h-1 w-full max-w-3xl overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-green-400" style={{ width: `${progressRatio * 100}%` }} aria-hidden="true" />
                </div>

                {isComplete && (
                  <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-4 text-green-100">
                    <p className="text-sm font-medium tracking-wide">Reflection complete. Take a moment to internalize what you just heard.</p>
                  </div>
                )}
              </div>
            )}
          </main>

          <footer className="px-6 pb-6 text-xs text-green-200/60">
            <p>Tip: Use the left and right arrow keys to navigate verses, and spacebar to play or pause.</p>
          </footer>
        </div>
      </div>

      {shouldShowBottomBar && (
        <div
          className={`fixed inset-x-0 bottom-0 px-4 pb-4 transition-transform duration-300 sm:px-6 ${
            isMinimized
              ? 'translate-y-0 opacity-100 pointer-events-auto'
              : 'translate-y-full opacity-0 pointer-events-none'
          }`}
          style={{ zIndex: 70 }}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-white/20 bg-zinc-900/95 px-4 py-3 text-white shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={handleExpand}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Expand Play Pleasantly"
            >
              <FiChevronUp className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{request.title}</span>
              <span className="truncate text-xs text-green-200/80">
                {status === 'loading'
                  ? 'Preparing verses...'
                  : status === 'error'
                  ? 'Unable to prepare this experience'
                  : `${progressText}${slide?.segmentLabel ? ` · ${slide.segmentLabel}` : ''}`}
              </span>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <div className="h-full bg-green-400" style={{ width: `${progressRatio * 100}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-400"
                aria-label={isVersePlaying ? 'Pause verse audio' : 'Play verse audio'}
                disabled={isVerseAudioLoading || status !== 'ready'}
              >
                {isVerseAudioLoading ? (
                  <FiLoader className="h-5 w-5 animate-spin" />
                ) : isVersePlaying ? (
                  <FiPause className="h-5 w-5" />
                ) : (
                  <FiPlay className="h-5 w-5 translate-x-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Stop Play Pleasantly"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
