import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiLoader,
  FiPause,
  FiPlay,
  FiVolume2,
  FiX,
} from 'react-icons/fi';
import type { ReciterSummary, TranslationSummary } from '../../services/apis';
import type { VisualJourneyManifest } from '../../utils/visualJourney';
import type { VisualJourneyRequest, VisualJourneySlide } from './VisualJourneyProvider';
import VisualJourneyArtwork from './VisualJourneyArtwork';

interface VisualJourneyOverlayProps {
  request: VisualJourneyRequest;
  manifest: VisualJourneyManifest | null;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  slides: VisualJourneySlide[];
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

const getSceneRangeLabel = (startAyah: number, endAyah: number) =>
  startAyah === endAyah ? `Ayah ${startAyah}` : `Ayat ${startAyah}-${endAyah}`;

const isPlaybackAbort = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

export default function VisualJourneyOverlay({
  request,
  manifest,
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
}: VisualJourneyOverlayProps) {
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const slide = slides[currentIndex] ?? null;
  const scene = slide?.scene ?? manifest?.scenes[0] ?? null;
  const progressRatio = slides.length ? (currentIndex + 1) / slides.length : 0;
  const selectedReciter = useMemo(
    () => reciters.find((reciter) => reciter.id === (selectedReciterId ?? -1)),
    [reciters, selectedReciterId],
  );
  const selectedTranslation = useMemo(
    () => translations.find((translation) => translation.id === (selectedTranslationId ?? -1)),
    [selectedTranslationId, translations],
  );
  const selectedReciterLabel =
    selectedReciter?.reciterName || selectedReciter?.translatedName?.name || 'Select a reciter';
  const selectedTranslationLabel =
    selectedTranslation?.name || selectedTranslation?.translatedName?.name || 'Select a translation';

  const advance = useCallback(() => {
    if (!slides.length) {
      return;
    }
    onIndexChange(Math.min(currentIndex + 1, slides.length - 1));
  }, [currentIndex, onIndexChange, slides.length]);

  const retreat = useCallback(() => {
    if (!slides.length) {
      return;
    }
    onIndexChange(Math.max(currentIndex - 1, 0));
  }, [currentIndex, onIndexChange, slides.length]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      void audio.play().catch((playError) => {
        if (!isPlaybackAbort(playError)) {
          console.warn('Visual journey playback was blocked:', playError);
        }
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, []);

  useEffect(() => {
    const body = document.body;
    const originalOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleCanPlay = () => setIsAudioLoading(false);
    const handlePlay = () => {
      setIsAudioLoading(false);
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => advance();
    const handleError = () => {
      setIsAudioLoading(false);
      setIsPlaying(false);
      advance();
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, [advance]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (status !== 'ready' || !slide) {
      audio.pause();
      return;
    }

    if (!slide.audioUrl) {
      setIsAudioLoading(false);
      setIsPlaying(false);
      const timeout = window.setTimeout(() => advance(), 3500);
      return () => window.clearTimeout(timeout);
    }

    setIsAudioLoading(true);
    setIsPlaying(false);
    audio.pause();
    audio.src = slide.audioUrl;
    audio.currentTime = 0;
    void audio.play().catch((playError) => {
      if (!isPlaybackAbort(playError)) {
        console.warn('Visual journey autoplay was blocked:', playError);
      }
      setIsAudioLoading(false);
      setIsPlaying(false);
    });
  }, [advance, slide, status]);

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
  }, [advance, onClose, retreat, togglePlayback]);

  return (
    <div
      className="fixed inset-0 overflow-y-auto bg-[#07110f] text-[#f7f3e8]"
      style={{ zIndex: 95 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="visual-journey-title"
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(110,231,183,0.18),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(248,210,106,0.14),transparent_30%),linear-gradient(180deg,rgba(7,17,15,0.96),rgba(11,24,21,0.98))]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1560px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6ee7b7]">Visual Journey</p>
            <h2 id="visual-journey-title" className="mt-2 text-2xl font-semibold text-[#f7f3e8] sm:text-3xl">
              {manifest?.title ?? request.surahName ?? `Surah ${request.surahId}`}
            </h2>
            {manifest?.subtitle ? (
              <p className="mt-1 text-sm leading-6 text-[#b8c9bd]">{manifest.subtitle}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center self-end rounded-full border border-white/20 bg-white/10 text-[#f7f3e8] transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#6ee7b7]"
              aria-label="Close visual journey"
            >
              <FiX className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#9eb7aa]">
                Reciter
                <select
                  value={selectedReciterId ?? ''}
                  onChange={(event) => onReciterChange(Number(event.target.value))}
                  disabled={!reciters.length}
                  className="min-h-[42px] w-full min-w-[180px] rounded-xl border border-white/15 bg-[#102019] px-3 text-sm font-medium normal-case tracking-normal text-[#f7f3e8] focus:border-[#6ee7b7] focus:outline-none"
                  aria-label="Visual journey reciter"
                >
                  {reciters.length === 0 ? <option value="">Loading reciters...</option> : null}
                  {reciters.map((reciter) => (
                    <option key={reciter.id} value={reciter.id}>
                      {reciter.reciterName || reciter.translatedName?.name || `Reciter ${reciter.id}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#9eb7aa]">
                Translation
                <select
                  value={selectedTranslationId ?? ''}
                  onChange={(event) => onTranslationChange(Number(event.target.value))}
                  disabled={!translations.length}
                  className="min-h-[42px] w-full min-w-[180px] rounded-xl border border-white/15 bg-[#102019] px-3 text-sm font-medium normal-case tracking-normal text-[#f7f3e8] focus:border-[#6ee7b7] focus:outline-none"
                  aria-label="Visual journey translation"
                >
                  {translations.length === 0 ? <option value="">Loading translations...</option> : null}
                  {translations.map((translation) => (
                    <option key={translation.id} value={translation.id}>
                      {translation.name || translation.slug || `Translation ${translation.id}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </header>

        <main className="grid flex-1 gap-5 py-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)] lg:items-stretch">
          <section className="flex min-h-[320px] flex-col gap-4">
            {status === 'ready' && scene ? (
              <VisualJourneyArtwork scene={scene} className="min-h-[340px] flex-1 shadow-[0_28px_90px_rgba(0,0,0,0.38)]" />
            ) : (
              <div className="grid min-h-[340px] flex-1 place-items-center rounded-[26px] border border-white/10 bg-white/5">
                <div className="flex items-center gap-3 text-[#b8c9bd]">
                  <FiLoader className="h-6 w-6 animate-spin" aria-hidden="true" />
                  <span className="text-sm font-medium">Preparing visual journey...</span>
                </div>
              </div>
            )}

            {manifest ? (
              <div className="flex flex-wrap items-center gap-2">
                {manifest.scenes.map((manifestScene, sceneIndex) => {
                  const isActive = scene?.id === manifestScene.id;
                  return (
                    <button
                      key={manifestScene.id}
                      type="button"
                      onClick={() => {
                        const nextIndex = slides.findIndex((candidate) => candidate.scene.id === manifestScene.id);
                        if (nextIndex >= 0) {
                          onIndexChange(nextIndex);
                        }
                      }}
                      className={`h-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[#6ee7b7] ${
                        isActive ? 'w-10 bg-[#6ee7b7]' : 'w-2.5 bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Go to scene ${sceneIndex + 1}: ${manifestScene.title}`}
                      aria-current={isActive ? 'true' : undefined}
                    />
                  );
                })}
              </div>
            ) : null}
          </section>

          <section className="flex min-h-[420px] flex-col justify-between rounded-[26px] border border-white/10 bg-[#0e1d18]/90 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur sm:p-6">
            {status === 'error' ? (
              <div className="m-auto max-w-md text-center">
                <h3 className="text-xl font-semibold text-[#f7f3e8]">Unable to start Visual Journey</h3>
                <p className="mt-3 text-sm leading-7 text-[#b8c9bd]">{error ?? 'Something went wrong.'}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#6ee7b7] px-5 text-sm font-semibold text-[#07110f] transition hover:bg-[#8ff0c8] focus:outline-none focus:ring-2 focus:ring-[#6ee7b7]"
                >
                  Close
                </button>
              </div>
            ) : null}

            {status === 'loading' ? (
              <div className="m-auto flex flex-col items-center text-center">
                <FiLoader className="h-9 w-9 animate-spin text-[#6ee7b7]" aria-hidden="true" />
                <p className="mt-4 text-base font-medium text-[#f7f3e8]">Loading recitation and scenes</p>
                <p className="mt-2 max-w-sm text-sm leading-7 text-[#b8c9bd]">
                  The artwork is generated by code, so this waits only for Qur&apos;an data and audio.
                </p>
              </div>
            ) : null}

            {status === 'ready' && slide && scene ? (
              <>
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6ee7b7]">
                        {getSceneRangeLabel(scene.startAyah, scene.endAyah)}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold leading-tight text-[#f7f3e8]">{scene.title}</h3>
                    </div>
                    <div className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-[#b8c9bd]">
                      {currentIndex + 1} / {slides.length}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-[#07110f]/50 p-4 sm:p-5">
                    <p dir="rtl" className="quran-text text-right text-3xl leading-[2.3] text-[#f7f3e8] sm:text-4xl">
                      {slide.arabicText}
                    </p>
                  </div>

                  <p className="text-base leading-8 text-[#ecf6ef] sm:text-lg">
                    {slide.translation.trim() || 'Translation not available for this ayah.'}
                  </p>

                  <div className="rounded-[20px] border border-[#f2cf7f]/20 bg-[#f2cf7f]/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f2cf7f]">Reflect</p>
                    <p className="mt-2 text-sm leading-7 text-[#f7f3e8]">{scene.reflectionPrompt}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-[#6ee7b7]" style={{ width: `${progressRatio * 100}%` }} />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={retreat}
                      disabled={currentIndex === 0}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[#f7f3e8] transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous ayah"
                    >
                      <FiChevronLeft className="h-6 w-6" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={togglePlayback}
                      disabled={isAudioLoading}
                      className="inline-flex min-h-[56px] min-w-[160px] items-center justify-center gap-3 rounded-full bg-[#6ee7b7] px-6 text-sm font-semibold text-[#07110f] shadow-[0_18px_46px_rgba(110,231,183,0.22)] transition hover:bg-[#8ff0c8] disabled:cursor-wait disabled:opacity-70"
                      aria-label={isPlaying ? 'Pause ayah audio' : 'Play ayah audio'}
                    >
                      {isAudioLoading ? (
                        <FiLoader className="h-5 w-5 animate-spin" aria-hidden="true" />
                      ) : isPlaying ? (
                        <FiPause className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <FiPlay className="h-5 w-5" aria-hidden="true" />
                      )}
                      {isAudioLoading ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
                    </button>

                    <button
                      type="button"
                      onClick={advance}
                      disabled={currentIndex >= slides.length - 1}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[#f7f3e8] transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next ayah"
                    >
                      <FiChevronRight className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs leading-5 text-[#9eb7aa]">
                    <FiVolume2 className="h-4 w-4" aria-hidden="true" />
                    <span>{selectedReciterLabel}</span>
                    <span aria-hidden="true">-</span>
                    <span>{selectedTranslationLabel}</span>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
