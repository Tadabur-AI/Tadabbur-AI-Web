import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiLoader, 
  FiPause, 
  FiPlay, 
  FiX, 
  FiVolume2, 
  FiSettings,
  FiMaximize2,
  FiMinimize2,
  FiHome,
  FiSkipBack,
  FiSkipForward
} from 'react-icons/fi';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const verseAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<number | null>(null);
  const prevVerseIndexRef = useRef(currentVerseIndex);
  const isAutoAdvanceRef = useRef(false);
  const recitationCacheRef = useRef<Map<string, RetrieveRecitationVerse[]>>(new Map());
  const slideContentRef = useRef<HTMLDivElement>(null);

  const currentSlide = slides[currentVerseIndex];

  const getActualWords = useCallback((words: WordTranslation[]) => {
    return words.filter((w) => w.charType === 'word');
  }, []);

  const actualWords = currentSlide ? getActualWords(currentSlide.words) : [];
  const displayWord = actualWords[currentWordIndex];

  const advanceWord = useCallback((isAutoAdvance = false) => {
    if (!currentSlide) return;

    if (verseAudioRef.current) {
      verseAudioRef.current.pause();
      verseAudioRef.current.currentTime = 0;
    }
    setIsPlayingFullVerse(false);

    const words = getActualWords(currentSlide.words);

    if (currentWordIndex < words.length - 1) {
      onWordIndexChange(currentWordIndex + 1);
    } else if (currentVerseIndex < slides.length - 1) {
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
      if (!newState && verseAudioRef.current && isPlayingFullVerse) {
        verseAudioRef.current.pause();
      }
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

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.warn('Fullscreen not available:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  }, []);

  const goToFirstSlide = useCallback(() => {
    handleVerseChange(0);
  }, [handleVerseChange]);

  const goToLastSlide = useCallback(() => {
    if (slides.length > 0) {
      handleVerseChange(slides.length - 1);
    }
  }, [handleVerseChange, slides.length]);

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
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        toggleFullscreen();
      }
      if (event.key === 'Home') {
        event.preventDefault();
        goToFirstSlide();
      }
      if (event.key === 'End') {
        event.preventDefault();
        goToLastSlide();
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [advanceWord, retreatWord, togglePlayback, onClose, toggleFullscreen, goToFirstSlide, goToLastSlide]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    if (currentVerseIndex !== prevVerseIndexRef.current) {
      const direction = currentVerseIndex > prevVerseIndexRef.current ? 'left' : 'right';
      setSlideDirection(direction);
      setIsAnimating(true);
      setIsEntering(false);

      const exitTimer = setTimeout(() => {
        setIsAnimating(false);
        setIsEntering(true);
      }, 150);

      const enterTimer = setTimeout(() => {
        setIsEntering(false);
        prevVerseIndexRef.current = currentVerseIndex;
      }, 300);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(enterTimer);
      };
    }
  }, [currentVerseIndex]);

  const progressRatio = slides.length > 0 ? (currentVerseIndex + 1) / slides.length : 0;
  const wordProgressRatio = actualWords.length > 0 ? (currentWordIndex + 1) / actualWords.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Toolbar - PowerPoint Style */}
      <header className="flex-shrink-0 bg-slate-800/90 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left Section - Close & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-slate-600" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">ت</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white leading-tight">
                  {request.surahName}
                </h1>
                <p className="text-xs text-slate-400 quran-text" dir="rtl">
                  {request.surahNameArabic}
                </p>
              </div>
            </div>
          </div>

          {/* Center Section - Slide Navigation */}
          <div className="hidden md:flex items-center gap-1 bg-slate-700/30 rounded-lg px-2 py-1">
            <button
              type="button"
              onClick={goToFirstSlide}
              disabled={currentVerseIndex === 0}
              className="p-1.5 rounded hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
              title="First Slide"
            >
              <FiHome className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleVerseChange(Math.max(0, currentVerseIndex - 1))}
              disabled={currentVerseIndex === 0}
              className="p-1.5 rounded hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
              title="Previous Slide"
            >
              <FiSkipBack className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 px-3 py-1 bg-slate-800/50 rounded">
              <span className="text-sm font-medium text-white">{currentVerseIndex + 1}</span>
              <span className="text-slate-500">/</span>
              <span className="text-sm text-slate-400">{slides.length}</span>
            </div>
            <button
              type="button"
              onClick={() => handleVerseChange(Math.min(slides.length - 1, currentVerseIndex + 1))}
              disabled={currentVerseIndex === slides.length - 1}
              className="p-1.5 rounded hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
              title="Next Slide"
            >
              <FiSkipForward className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goToLastSlide}
              disabled={currentVerseIndex === slides.length - 1}
              className="p-1.5 rounded hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
              title="Last Slide"
            >
              <FiMaximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Right Section - Settings & Fullscreen */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-emerald-600 text-white' : 'hover:bg-slate-700/50 text-slate-400 hover:text-white'}`}
                aria-label="Settings"
              >
                <FiSettings className="w-5 h-5" />
              </button>
              
              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl p-4 z-50">
                  <h3 className="text-sm font-semibold text-white mb-3">Audio Settings</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">Reciter</label>
                      <select
                        value={selectedReciterId ?? ''}
                        onChange={(e) => onReciterChange(Number(e.target.value))}
                        className="w-full text-sm px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">Select Reciter...</option>
                        {reciters.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.reciterName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={playFullVerseAfter}
                        onChange={(e) => onPlayFullVerseAfterChange(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                      />
                      <div>
                        <span className="text-sm text-white">Play full verse after</span>
                        <p className="text-xs text-slate-400">Auto-play complete verse recitation</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-6 w-px bg-slate-600 hidden sm:block" />
            
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors hidden sm:flex"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <FiMinimize2 className="w-5 h-5" />
              ) : (
                <FiMaximize2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Slide Thumbnails (PowerPoint Style) */}
        <aside 
          className={`hidden lg:flex flex-col bg-slate-800/50 border-r border-slate-700/50 transition-all duration-300 ${isSidebarCollapsed ? 'w-12' : 'w-56'}`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
            {!isSidebarCollapsed && (
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Slides
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <FiChevronLeft className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Slide Thumbnails */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => handleVerseChange(index)}
                className={`w-full group relative rounded-lg overflow-hidden transition-all duration-200 ${
                  index === currentVerseIndex
                    ? 'ring-2 ring-emerald-500 bg-slate-700/50'
                    : 'hover:bg-slate-700/30 bg-transparent'
                } ${isSidebarCollapsed ? 'p-1' : 'p-2'}`}
              >
                {/* Slide Number Badge */}
                <div className={`absolute top-1 left-1 z-10 ${isSidebarCollapsed ? 'hidden' : ''}`}>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    index === currentVerseIndex
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-600 text-slate-300 group-hover:bg-slate-500'
                  }`}>
                    {index + 1}
                  </span>
                </div>

                {isSidebarCollapsed ? (
                  <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                    index === currentVerseIndex
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {index + 1}
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-slate-900/50 rounded overflow-hidden p-2">
                    <p 
                      className="quran-text text-[9px] text-slate-400 leading-relaxed line-clamp-3"
                      dir="rtl"
                    >
                      {slide.arabicText}
                    </p>
                  </div>
                )}

                {/* Current Indicator */}
                {index === currentVerseIndex && !isSidebarCollapsed && (
                  <div className="absolute bottom-1 right-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Main Slide Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-slate-900/50 to-slate-800/30">
          {/* Progress Bar */}
          <div className="h-1 bg-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>

          {/* Slide Content */}
          <div 
            ref={slideContentRef}
            className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden"
          >
            {status === 'loading' && (
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                </div>
                <p className="text-slate-400 text-lg">Loading presentation...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center max-w-md px-6">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <FiX className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-400 mb-6">{error || 'An error occurred'}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-emerald-600 rounded-xl text-white font-medium hover:bg-emerald-500 transition-colors"
                >
                  Close
                </button>
              </div>
            )}

            {status === 'ready' && currentSlide && (
              <div 
                className={`w-full max-w-4xl transition-all duration-150 ease-out ${
                  isAnimating
                    ? slideDirection === 'left'
                      ? 'opacity-0 translate-x-8 scale-95'
                      : 'opacity-0 -translate-x-8 scale-95'
                    : isEntering
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-100 translate-x-0 scale-100'
                }`}
              >
                {/* Slide Card - PowerPoint Style */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden aspect-[16/9] flex flex-col">
                  {/* Slide Header */}
                  <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500">
                    <div className="flex items-center gap-2">
                      <span className="text-white/80 text-xs font-medium">Verse {currentSlide.ayahNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPlayingFullVerse && (
                        <span className="flex items-center gap-1.5 text-white/90 text-xs">
                          <FiVolume2 className="w-3 h-3 animate-pulse" />
                          Playing full verse
                        </span>
                      )}
                      {isAudioLoading && (
                        <span className="flex items-center gap-1.5 text-white/90 text-xs">
                          <FiLoader className="w-3 h-3 animate-spin" />
                          Loading audio
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-850">
                    {isPlayingFullVerse ? (
                      /* Full Verse Display */
                      <div className="text-center space-y-6">
                        <p className="quran-text text-4xl sm:text-5xl md:text-6xl text-slate-800 dark:text-slate-100 leading-relaxed">
                          {actualWords.map((word) => word.text).join(' ')}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-emerald-600">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-sm font-medium">Playing recitation...</span>
                        </div>
                      </div>
                    ) : displayWord ? (
                      /* Single Word Display */
                      <div className="text-center space-y-6 w-full">
                        {/* Arabic Word - Main Focus */}
                        <div className="relative">
                          <div className="absolute inset-0 blur-3xl bg-emerald-500/10 rounded-full" />
                          <p className="arabic relative text-6xl sm:text-7xl md:text-8xl text-slate-800 dark:text-white font-bold leading-normal">
                            {displayWord.text}
                          </p>
                        </div>

                        {/* Translation */}
                        <div className="space-y-2">
                          <p className="text-2xl sm:text-3xl text-slate-700 dark:text-slate-200 font-medium">
                            {displayWord.translation || 'Translation not available'}
                          </p>
                          {displayWord.transliteration && (
                            <p className="text-lg text-slate-500 dark:text-slate-400 italic">
                              {displayWord.transliteration}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Slide Footer - Word Progress */}
                  <div className="px-6 py-3 bg-slate-100 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Word {currentWordIndex + 1} of {actualWords.length}
                      </span>
                      <div className="h-1 flex-1 mx-4 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${wordProgressRatio * 100}%` }}
                        />
                      </div>
                    </div>
                    <p className="quran-text text-sm text-slate-600 dark:text-slate-300 leading-relaxed" dir="rtl">
                      {actualWords.map((word, idx) => (
                        <span
                          key={idx}
                          className={`inline mx-0.5 transition-all duration-200 ${
                            idx === currentWordIndex
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                              : idx < currentWordIndex
                              ? 'text-slate-400 dark:text-slate-500'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {word.text}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Bottom Controls - Presenter Style */}
      <footer className="flex-shrink-0 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Mobile Slide Selector */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto max-w-[40%]">
            {slides.slice(Math.max(0, currentVerseIndex - 2), Math.min(slides.length, currentVerseIndex + 3)).map((slide, idx) => {
              const actualIndex = Math.max(0, currentVerseIndex - 2) + idx;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => handleVerseChange(actualIndex)}
                  className={`shrink-0 w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    actualIndex === currentVerseIndex
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {actualIndex + 1}
                </button>
              );
            })}
          </div>

          {/* Center - Playback Controls */}
          <div className="flex items-center gap-3 mx-auto">
            {/* Previous Word */}
            <button
              type="button"
              onClick={retreatWord}
              disabled={currentVerseIndex === 0 && currentWordIndex === 0}
              className="p-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300 hover:text-white"
              aria-label="Previous word"
            >
              <FiChevronRight className="w-6 h-6" />
            </button>

            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlayback}
              className={`p-4 rounded-2xl transition-all shadow-lg ${
                isPlaying 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white' 
                  : 'bg-amber-500 hover:bg-amber-400 text-white'
              }`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <FiPause className="w-7 h-7" />
              ) : (
                <FiPlay className="w-7 h-7" />
              )}
            </button>

            {/* Next Word */}
            <button
              type="button"
              onClick={() => advanceWord(false)}
              disabled={
                currentVerseIndex === slides.length - 1 &&
                currentWordIndex === actualWords.length - 1
              }
              className="p-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300 hover:text-white"
              aria-label="Next word"
            >
              <FiChevronLeft className="w-6 h-6" />
            </button>
          </div>

          {/* Status Info */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              Slide <span className="text-white font-medium">{currentVerseIndex + 1}</span> of <span className="text-slate-300">{slides.length}</span>
            </span>
            <div className="h-4 w-px bg-slate-600" />
            <span className="text-slate-400">
              Word <span className="text-white font-medium">{currentWordIndex + 1}</span> of <span className="text-slate-300">{actualWords.length}</span>
            </span>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="hidden md:flex items-center justify-center gap-6 pb-2 text-xs text-slate-500">
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">←</kbd> Next</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">→</kbd> Previous</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">F</kbd> Fullscreen</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">Esc</kbd> Close</span>
        </div>
      </footer>
    </div>
  );
}