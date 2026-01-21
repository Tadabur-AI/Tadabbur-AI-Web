import { useCallback, useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiLoader, FiPause, FiPlay, FiX, FiVolume2 } from 'react-icons/fi';
import type { TajweedLearningRequest, TajweedVerseSlide } from './TajweedLearningProvider';
import type { WordTranslation, ReciterSummary, RetrieveRecitationVerse } from '../../services/apis';

interface TajweedLearningOverlayProps {
  request: TajweedLearningRequest;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  slides: TajweedVerseSlide[];
  currentVerseIndex: number;
  currentWordIndex: number;
  onVerseIndexChange: (index: number) => void;
  onWordIndexChange: (index: number) => void;
  onClose: () => void;
  reciters: ReciterSummary[];
  selectedReciterId: number | null;
  onReciterChange: (id: number) => void;
  playFullVerseAfter: boolean;
  onPlayFullVerseAfterChange: (value: boolean) => void;
  retrieveRecitation: (payload: { surahNumber: number; recitationId: number }) => Promise<RetrieveRecitationVerse[]>;
}

export default function TajweedLearningOverlay({
  request,
  status,
  error,
  slides,
  currentVerseIndex,
  currentWordIndex,
  onVerseIndexChange,
  onWordIndexChange,
  onClose,
  reciters,
  selectedReciterId,
  onReciterChange,
  playFullVerseAfter,
  onPlayFullVerseAfterChange,
  retrieveRecitation,
}: TajweedLearningOverlayProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlayingFullVerse, setIsPlayingFullVerse] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const verseAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<number | null>(null);
  const prevVerseIndexRef = useRef(currentVerseIndex);
  const isAutoAdvanceRef = useRef(false);
  const recitationCacheRef = useRef<Map<string, RetrieveRecitationVerse[]>>(new Map());

  const currentSlide = slides[currentVerseIndex];

  // Filter words to only include actual words (not end markers)
  const getActualWords = useCallback((words: WordTranslation[]) => {
    return words.filter((w) => w.charType === 'word');
  }, []);

  const actualWords = currentSlide ? getActualWords(currentSlide.words) : [];
  const displayWord = actualWords[currentWordIndex];

  const advanceWord = useCallback((isAutoAdvance = false) => {
    if (!currentSlide) return;

    // Stop reciter audio if playing
    if (verseAudioRef.current) {
      verseAudioRef.current.pause();
      verseAudioRef.current.currentTime = 0;
    }
    setIsPlayingFullVerse(false);

    const words = getActualWords(currentSlide.words);

    if (currentWordIndex < words.length - 1) {
      onWordIndexChange(currentWordIndex + 1);
    } else if (currentVerseIndex < slides.length - 1) {
      // Verse finished - play full verse only if auto-advancing, not on manual button press
      if (isAutoAdvance && playFullVerseAfter && selectedReciterId) {
        isAutoAdvanceRef.current = true;
        void playFullVerse().then(() => {
          onVerseIndexChange(currentVerseIndex + 1);
          isAutoAdvanceRef.current = false;
        });
      } else {
        onVerseIndexChange(currentVerseIndex + 1);
      }
    } else {
      // All verses done
      setIsPlaying(false);
    }
  }, [currentSlide, currentWordIndex, currentVerseIndex, slides.length, getActualWords, onWordIndexChange, onVerseIndexChange, playFullVerseAfter, selectedReciterId]);

  const playFullVerse = useCallback(async (): Promise<void> => {
    if (!currentSlide || !selectedReciterId) return Promise.resolve();

    return new Promise<void>((resolve) => {
      try {
        setIsPlayingFullVerse(true);
        const cacheKey = `${currentSlide.surahId}-${selectedReciterId}`;
        let recitationData = recitationCacheRef.current.get(cacheKey);

        const playAudio = (data: RetrieveRecitationVerse[]) => {
          const verseAudio = data.find((v) => v.verseKey === currentSlide.verseKey);

          if (verseAudio && verseAudio.audioUrl) {
            if (!verseAudioRef.current) {
              verseAudioRef.current = new Audio();
            }

            const handleEnded = () => {
              verseAudioRef.current?.removeEventListener('ended', handleEnded);
              verseAudioRef.current?.removeEventListener('error', handleError);
              setIsPlayingFullVerse(false);
              resolve();
            };

            const handleError = () => {
              verseAudioRef.current?.removeEventListener('ended', handleEnded);
              verseAudioRef.current?.removeEventListener('error', handleError);
              console.error('Verse audio error');
              setIsPlayingFullVerse(false);
              resolve();
            };

            verseAudioRef.current.src = verseAudio.audioUrl;
            verseAudioRef.current.addEventListener('ended', handleEnded, { once: true });
            verseAudioRef.current.addEventListener('error', handleError, { once: true });

            verseAudioRef.current.play().catch((err) => {
              console.warn('Verse audio playback blocked:', err);
              verseAudioRef.current?.removeEventListener('ended', handleEnded);
              verseAudioRef.current?.removeEventListener('error', handleError);
              setIsPlayingFullVerse(false);
              resolve();
            });
          } else {
            setIsPlayingFullVerse(false);
            resolve();
          }
        };

        if (recitationData) {
          playAudio(recitationData);
        } else {
          // Fetch and cache
          void retrieveRecitation({
            surahNumber: currentSlide.surahId,
            recitationId: selectedReciterId,
          }).then((data) => {
            recitationCacheRef.current.set(cacheKey, data);
            playAudio(data);
          }).catch((err) => {
            console.error('Failed to fetch recitation:', err);
            setIsPlayingFullVerse(false);
            resolve();
          });
        }
      } catch (error) {
        console.error('Failed to play full verse:', error);
        setIsPlayingFullVerse(false);
        resolve();
      }
    });
  }, [currentSlide, selectedReciterId, retrieveRecitation]);

  const retreatWord = useCallback(() => {
    isAutoAdvanceRef.current = false;
    
    // Stop reciter audio if playing
    if (verseAudioRef.current) {
      verseAudioRef.current.pause();
      verseAudioRef.current.currentTime = 0;
    }
    setIsPlayingFullVerse(false);

    if (currentWordIndex > 0) {
      onWordIndexChange(currentWordIndex - 1);
    } else if (currentVerseIndex > 0) {
      const prevSlide = slides[currentVerseIndex - 1];
      const prevWords = getActualWords(prevSlide.words);
      onVerseIndexChange(currentVerseIndex - 1);
      setTimeout(() => {
        onWordIndexChange(prevWords.length - 1);
      }, 50);
    }
  }, [currentWordIndex, currentVerseIndex, slides, getActualWords, onWordIndexChange, onVerseIndexChange]);

  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => {
      const newState = !prev;
      // If pausing and verse audio is playing, pause it too
      if (!newState && verseAudioRef.current && isPlayingFullVerse) {
        verseAudioRef.current.pause();
      }
      // If resuming and verse audio was paused, resume it
      if (newState && verseAudioRef.current && isPlayingFullVerse && verseAudioRef.current.paused) {
        void verseAudioRef.current.play().catch((err) => {
          console.warn('Failed to resume verse audio:', err);
        });
      }
      return newState;
    });
  }, [isPlayingFullVerse]);

  const handleVerseChange = useCallback((index: number) => {
    isAutoAdvanceRef.current = false;
    onVerseIndexChange(index);
    onWordIndexChange(0);
  }, [onVerseIndexChange, onWordIndexChange]);

  // Play word audio effect
  useEffect(() => {
    if (status !== 'ready' || !displayWord || !isPlaying || isPlayingFullVerse) {
      return;
    }

    if (autoAdvanceTimeoutRef.current) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    if (!displayWord.audio) {
      autoAdvanceTimeoutRef.current = window.setTimeout(() => {
        advanceWord(true);
      }, 1500);
      return () => {
        if (autoAdvanceTimeoutRef.current) {
          window.clearTimeout(autoAdvanceTimeoutRef.current);
        }
      };
    }

    const audio = new Audio(displayWord.audio);
    audioRef.current = audio;

    // Only show loading indicator if loading takes longer than 300ms
    loadingTimeoutRef.current = window.setTimeout(() => {
      setIsAudioLoading(true);
    }, 300);

    const handleCanPlay = () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setIsAudioLoading(false);
    };
    const handleEnded = () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setIsAudioLoading(false);
      autoAdvanceTimeoutRef.current = window.setTimeout(() => {
        advanceWord(true);
      }, 500);
    };
    const handleError = () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      console.error('Word audio failed to load');
      setIsAudioLoading(false);
      autoAdvanceTimeoutRef.current = window.setTimeout(() => {
        advanceWord(true);
      }, 1000);
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    void audio.play().catch((err) => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      console.warn('Audio playback blocked:', err);
      setIsAudioLoading(false);
    });

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
      if (autoAdvanceTimeoutRef.current) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, [status, displayWord, isPlaying, isPlayingFullVerse, currentWordIndex, currentVerseIndex, advanceWord]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        retreatWord();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        advanceWord();
      }
      if (event.key === ' ') {
        event.preventDefault();
        togglePlayback();
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [advanceWord, retreatWord, togglePlayback, onClose]);

  // Prevent body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle verse slide animation
  useEffect(() => {
    if (currentVerseIndex !== prevVerseIndexRef.current) {
      const direction = currentVerseIndex > prevVerseIndexRef.current ? 'left' : 'right';
      setSlideDirection(direction);
      setIsAnimating(true);
      setIsEntering(false);

      const exitTimer = setTimeout(() => {
        setIsAnimating(false);
        setIsEntering(true);
      }, 200);

      const enterTimer = setTimeout(() => {
        setIsEntering(false);
        prevVerseIndexRef.current = currentVerseIndex;
      }, 400);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(enterTimer);
      };
    }
  }, [currentVerseIndex]);

  const progressRatio = slides.length > 0 ? (currentVerseIndex + 1) / slides.length : 0;
  const wordProgressRatio = actualWords.length > 0 ? (currentWordIndex + 1) / actualWords.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex bg-white dark:bg-gray-900">
      {/* Verse Sidebar - Desktop only */}
      <aside className="hidden lg:flex w-80 flex-col border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Verses ({slides.length})
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => handleVerseChange(index)}
              className={`w-full text-right px-6 border-b border-gray-100 dark:border-gray-700 transition-all duration-200 ${
                index === currentVerseIndex
                  ? 'bg-primary/10 dark:bg-primary/20 border-l-4 border-l-primary'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <span className="text-xs text-white dark:text-gray-400 block mb-2">
                Verse {slide.ayahNumber}
              </span>
              <p
                className="quran-text text-lg text-gray-400 dark:text-gray-200 leading-relaxed"
                dir="rtl"
              >
                {slide.arabicText}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary transition-all duration-200 text-gray-700 dark:text-gray-300"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-medium mb-1">
                Tajweed Learning
              </p>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {request.surahName}
                <span className="ml-3 text-gray-500 dark:text-gray-400 quran-text text-lg">{request.surahNameArabic}</span>
              </h2>
            </div>
          </div>

          {/* Reciter Selection & Settings - Desktop */}
          <div className="hidden sm:flex items-center gap-4 flex-wrap">
            {/* Reciter Dropdown */}
            <div className="flex items-center gap-2">
              <FiVolume2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <select
                value={selectedReciterId ?? ''}
                onChange={(e) => onReciterChange(Number(e.target.value))}
                className="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary focus:outline-none"
              >
                <option value="">Select Reciter...</option>
                {reciters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.translatedName?.name || r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Play Full Verse Toggle */}
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={playFullVerseAfter}
                onChange={(e) => onPlayFullVerseAfterChange(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-primary"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Play after</span>
            </label>

            <span className="text-sm text-gray-500 dark:text-gray-400">
              Verse {currentVerseIndex + 1} of {slides.length}
            </span>
          </div>
        </header>

        {/* Mobile Reciter Selection */}
        <div className="sm:hidden border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <FiVolume2 className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
              <select
                value={selectedReciterId ?? ''}
                onChange={(e) => onReciterChange(Number(e.target.value))}
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary focus:outline-none"
              >
                <option value="">Select Reciter...</option>
                {reciters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.translatedName?.name || r.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={playFullVerseAfter}
                onChange={(e) => onPlayFullVerseAfterChange(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-primary"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Play full verse after each verse</span>
            </label>
          </div>
        </div>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <div className="text-center">
              <FiLoader className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
              <p className="text-gray-600 dark:text-gray-300 text-lg">Loading verses...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <div className="text-center max-w-md px-6">
              <p className="text-red-600 dark:text-red-400 mb-6 text-lg">{error || 'An error occurred'}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-primary rounded-xl text-white font-medium hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Main Slideshow View */}
        {status === 'ready' && currentSlide && (
          <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-800">
            {/* Word Progress Bar */}
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${wordProgressRatio * 100}%` }}
              />
            </div>

            {/* Center Display */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 md:py-16 overflow-hidden">
              <div
                className={`text-center w-full max-w-3xl transition-all duration-200 ease-out ${
                  isAnimating
                    ? slideDirection === 'left'
                      ? 'opacity-0 translate-x-full'
                      : 'opacity-0 -translate-x-full'
                    : isEntering
                    ? slideDirection === 'left'
                      ? 'opacity-0 -translate-x-full animate-slide-in-left'
                      : 'opacity-0 translate-x-full animate-slide-in-right'
                    : 'opacity-100 translate-x-0'
                }`}
                style={
                  isEntering
                    ? {
                        animation: slideDirection === 'left'
                          ? 'slideInFromLeft 0.2s ease-out forwards'
                          : 'slideInFromRight 0.2s ease-out forwards'
                      }
                    : {}
                }
              >
                {isPlayingFullVerse ? (
                  // Full Verse Display when reciter audio is playing
                  <div className="space-y-8">
                    <div className="py-8">
                      <p className="quran-text text-5xl sm:text-6xl md:text-7xl text-primary leading-relaxed">
                        {actualWords.map((word) => word.text).join(' ')}
                      </p>
                    </div>

                    {/* Playing Indicator */}
                    <div className="flex items-center justify-center gap-3 text-primary">
                      <FiVolume2 className="w-5 h-5 animate-pulse" />
                      <span className="text-sm font-medium">Playing full verse...</span>
                    </div>
                  </div>
                ) : displayWord ? (
                  // Word-by-Word Display
                  <div className="space-y-8">
                    {/* Current Word - Large */}
                    <div className="py-8">
                      <p className="quran-text text-7xl sm:text-8xl md:text-9xl text-primary leading-normal">
                        {displayWord.text}
                      </p>
                    </div>

                    {/* Translation */}
                    <div className="space-y-3 mt-16">
                      <p className="text-2xl sm:text-3xl text-gray-800 dark:text-gray-100 font-medium">
                        {displayWord.translation || 'Translation not available'}
                      </p>

                      {/* Transliteration */}
                      {displayWord.transliteration && (
                        <p className="text-xl text-gray-500 dark:text-gray-400 italic">
                          {displayWord.transliteration}
                        </p>
                      )}
                    </div>

                    {/* Audio Loading Indicator */}
                    {isAudioLoading && (
                      <div className="flex items-center justify-center gap-3 text-primary">
                        <FiLoader className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-medium">Loading audio...</span>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Full Verse Preview */}
                <div className="mt-16 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <p className="quran-text text-xl sm:text-2xl text-gray-700 dark:text-gray-300 leading-loose">
                    {actualWords.map((word, idx) => (
                      <span
                        key={idx}
                        className={`inline mx-1 transition-all duration-200 ${
                          idx === currentWordIndex
                            ? 'text-primary font-bold'
                            : idx < currentWordIndex
                            ? 'text-gray-400 dark:text-gray-500'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {word.text}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="px-6 py-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-center gap-8 max-w-lg mx-auto">
                {/* Next */}
                <button
                  type="button"
                  onClick={() => advanceWord(false)}
                  disabled={
                    currentVerseIndex === slides.length - 1 &&
                    currentWordIndex === actualWords.length - 1
                  }
                  className="p-4 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-gray-700 dark:text-gray-300"
                  aria-label="Next word"
                >
                  <FiChevronLeft className="w-7 h-7" />
                </button>
                {/* Play/Pause */}
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="p-5 rounded-full bg-primary hover:bg-primary/90 transition-all duration-200 text-white shadow-lg"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <FiPause className="w-9 h-9" />
                  ) : (
                    <FiPlay className="w-9 h-9" />
                  )}
                </button>
                {/* Previous */}
                <button
                  type="button"
                  onClick={retreatWord}
                  disabled={currentVerseIndex === 0 && currentWordIndex === 0}
                  className="p-4 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-gray-700 dark:text-gray-300"
                  aria-label="Previous word"
                >
                  <FiChevronRight className="w-7 h-7" />
                </button>
              </div>

              {/* Word Counter */}
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4 font-medium">
                Word {currentWordIndex + 1} of {actualWords.length}
              </p>
            </div>

            {/* Mobile Verse Selector */}
            <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex gap-2 p-4 overflow-x-auto">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => handleVerseChange(index)}
                    className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      index === currentVerseIndex
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary'
                    }`}
                  >
                    {slide.ayahNumber}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Overall Progress Bar */}
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-secondary transition-all duration-500 ease-out"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      </main>
    </div>
  );
}
