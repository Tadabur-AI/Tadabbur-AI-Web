import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiLoader, FiPause, FiPlay, FiVolume2, FiX } from 'react-icons/fi';
import type { PlayPleasantlyRequest, PlayPleasantlySlide } from './PlayPleasantlyProvider';
import type { ReciterSummary, TranslationSummary } from '../../services/apis';
import rainImage from '/images/rain.gif';

interface PlayPleasantlyOverlayProps {
  request: PlayPleasantlyRequest;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  slides: PlayPleasantlySlide[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
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
    const el = document.body;
    if (el) {
      const originalOverflow = el.style.overflow;
      el.style.overflow = 'hidden';
      return () => {
        el.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, []);

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
    rain.volume = 0.25;
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

  const handleClose = () => {
    onClose();
  };

  const canRetreat = currentIndex > 0;
  const canAdvance = slides.length > 0 && currentIndex < slides.length - 1;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black">
        <div className="absolute inset-0 bg-cover bg-center opacity-40 z-10" aria-hidden="true"
        style={{
            background: `url(${rainImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" aria-hidden="true" />
      </div>

      <div className="relative z-10 flex h-full flex-col text-white">
        <header className="flex items-center justify-between gap-4 px-6 py-4">
            <div className='w-full'>
          <button
            type="button"
            onClick={handleClose}
            className=" inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-green-400"
            aria-label="Close Play Pleasantly"
          >
            <FiX className="h-6 w-6" />
          </button>
</div>
          <div className="text-center w-full">
            <p className="text-xs uppercase tracking-[0.4em] text-green-200/70">Play Pleasantly</p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">{request.title}</h2>
            {request.subtitle && <p className="text-sm text-green-200/80">{request.subtitle}</p>}
          </div>

<div className='flex flex-col h-full w-full justify-center items-end'>
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col items-start gap-1 text-left text-xs uppercase tracking-[0.3em] text-green-200/70">
              <span className="flex items-center gap-2">
                <FiVolume2 className="hidden sm:block h-4 w-4 text-green-200" aria-hidden="true" />
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
                className="w-fit min-w-[140px] max-w-[300px] rounded-lg border border-white/30 bg-black/40 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
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
              <span className="text-[0.7rem] font-semibold tracking-wide text-green-100/70">
                {selectedTranslationLabel}
              </span>
              <label htmlFor="pleasantly-translation-select" className="sr-only">
                Translation
              </label>
              <select
                id="pleasantly-translation-select"
                className="w-fit min-w-[140px] max-w-[300px] rounded-lg border border-white/30 bg-black/40 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
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
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            
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
                onClick={handleClose}
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
              >
                Close
              </button>
            </div>
          )}

          {status === 'ready' && slide && (
            <div className="flex w-full max-w-5xl flex-col items-center gap-8">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-green-300/80">
                <span>{progressText}</span>
                {slide.segmentLabel && <span className="text-green-200/70">{slide.segmentLabel}</span>}
              </div>

              <p className="text-4xl font-semibold leading-relaxed text-white drop-shadow-sm md:text-5xl">
                {slide.arabicText}
              </p>

              <p className="max-w-3xl text-lg text-green-100/90 md:text-xl">
                {slide.translation?.trim() ? slide.translation : 'Translation not available for this verse.'}
              </p>

              <div className="flex items-center gap-6 text-sm text-green-200/70">
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
                <div
                  className="h-full bg-green-400"
                  style={{ width: `${slides.length ? ((currentIndex + 1) / slides.length) * 100 : 0}%` }}
                  aria-hidden="true"
                />
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
          <p>
            Tip: Use the left and right arrow keys to navigate verses, and spacebar to play or pause.
          </p>
        </footer>
      </div>
    </div>
  );
}
