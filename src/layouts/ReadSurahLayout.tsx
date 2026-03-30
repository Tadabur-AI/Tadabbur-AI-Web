import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiX, FiArrowLeft, FiMenu, FiCopy, FiBookmark, FiEdit3, FiFileText, FiSave } from 'react-icons/fi';
import AudioPlayer from '../components/common/AudioPlayer';
import MarkdownContent from '../components/common/MarkdownContent';
import TafsirExplainerModal from '../components/common/TafsirExplainerModal';
import ReportWrongModal from '../components/common/ReportWrongModal';
import ThemeToggle from '../components/common/ThemeToggle';
import WordByWord from '../components/common/WordByWord';
import TajweedLearningButton from '../components/TajweedLearning/TajweedLearningButton';
import { type ExplainTafsirResponse } from '../services/tafsirExplainerService';
import { type WordTranslation } from '../services/apis';
import { type Recitation } from '../services/quranResourcesService';
import { isBookmarked, toggleBookmark } from '../utils/quranLocalStorage';
import { type VerseStudyNote } from '../utils/studyNotes';
import type { VerseChatContext } from '../types/verseChat';

const VerseChatBubble = lazy(() => import('../components/reader/VerseChatBubble'));

interface Verse {
  id: number;
  verse_key: string;
  text: string;
  translation: string;
  translationHtml?: string;
  surah_id: number;
  word_translations?: WordTranslation[];
}

interface Surah {
  id: number;
  name_english: string;
  name_arabic: string;
  verses_count: number;
}

interface Props {
  surah: Surah | null;
  verses: Verse[];
  currentVerseIndex: number;
  setCurrentVerseIndex: (i: number) => void;
  goToPreviousVerse: () => void;
  goToNextVerse: () => void;
  selectedRecitation?: number | null;
  selectedTranslation?: number | null;
  onRecitationChange?: (id: number) => void;
  onTranslationChange?: (id: number) => void;
  translationOptions?: Array<{ id: number; name: string; languageName: string }>;
  selectedTafsir?: number | null;
  onTafsirChange?: (id: number) => void;
  isExplainerOpen?: boolean;
  onExplainerToggle?: () => void;
  tafsirText?: string | null;
  isTafsirLoading?: boolean;
  tafsirOptions?: Array<{ id: number; name: string }>; // Changed languageName to be consistent with Tafsir options
  aiExplanation?: ExplainTafsirResponse | null;
  isExplanationLoading?: boolean;
  recitations?: Recitation[];
  isReportModalOpen?: boolean;
  onReportModalToggle?: (open: boolean) => void;
  currentVerseNote?: VerseStudyNote | null;
  onSaveVerseNote?: (userMarkdown: string) => void;
  onSaveAiToNotes?: () => void;
  tafsirPlainText?: string | null;
  disablePrevAyah?: boolean;
  disableNextAyah?: boolean;
}

export default function ReadSurahLayout({
  surah,
  verses,
  currentVerseIndex,
  setCurrentVerseIndex,
  goToPreviousVerse,
  goToNextVerse,
  selectedRecitation,
  selectedTranslation,
  selectedTafsir,
  onRecitationChange,
  onTranslationChange,
  translationOptions = [],
  onTafsirChange,
  isExplainerOpen,
  onExplainerToggle,
  tafsirText,
  isTafsirLoading,
  tafsirOptions = [],
  aiExplanation,
  isExplanationLoading,
  recitations = [],
  isReportModalOpen = false,
  onReportModalToggle,
  currentVerseNote = null,
  onSaveVerseNote,
  onSaveAiToNotes,
  tafsirPlainText = null,
  disablePrevAyah,
  disableNextAyah,
}: Props) {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [isWordByWordEnabled, setIsWordByWordEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('tadabbur_word_by_word') === 'true';
  });

  const isValidVerseIndex = currentVerseIndex >= 0 && currentVerseIndex < verses.length;
  const currentVerse = isValidVerseIndex ? verses[currentVerseIndex] : null;

  useEffect(() => {
    localStorage.setItem('tadabbur_word_by_word', String(isWordByWordEnabled));
  }, [isWordByWordEnabled]);

  useEffect(() => {
    if (currentVerse) {
      setBookmarked(isBookmarked(currentVerse.verse_key));
    }
  }, [currentVerse]);

  useEffect(() => {
    setNoteDraft(currentVerseNote?.userMarkdown ?? '');
    setIsNoteEditorOpen(false);
  }, [currentVerse?.verse_key, currentVerseNote?.userMarkdown]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const preload = () => {
      void import('../components/reader/VerseChatBubble');
    };

    const windowWithIdleCallback = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof windowWithIdleCallback.requestIdleCallback === 'function') {
      const idleId = windowWithIdleCallback.requestIdleCallback(preload);
      return () => windowWithIdleCallback.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(preload, 1200);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPreviousVerse();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextVerse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousVerse, goToNextVerse]);

  const handleCopy = async (verse: Verse, surahName: string) => {
    const text = `${verse.text}\n\n${verse.translation}\n\n— ${surahName} ${verse.verse_key}`;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleBookmark = () => {
    if (!currentVerse || !surah) return;
    const isNowBookmarked = toggleBookmark({
      verseKey: currentVerse.verse_key,
      surahId: currentVerse.surah_id,
      surahName: surah.name_english,
      surahNameArabic: surah.name_arabic,
      ayahNumber: currentVerseIndex + 1,
      arabicText: currentVerse.text,
      translation: currentVerse.translation,
    });
    setBookmarked(isNowBookmarked);
  };

  const hasSavedReflection = (currentVerseNote?.userMarkdown.trim().length ?? 0) > 0;
  const hasSavedAiExplanation = (currentVerseNote?.aiExplanationMarkdown?.trim().length ?? 0) > 0;
  const isCurrentAiSaved =
    Boolean(aiExplanation) &&
    currentVerseNote?.aiExplanationMarkdown === aiExplanation?.explanation &&
    currentVerseNote?.aiExplanationSource?.tafsirId === selectedTafsir;
  const aiSaveLabel = isCurrentAiSaved ? 'AI Saved' : hasSavedAiExplanation ? 'Update Saved AI' : 'Save AI to Notes';
  const noteActionLabel = hasSavedReflection ? 'Edit Note' : hasSavedAiExplanation ? 'Add Reflection' : 'Add Note';
  const selectedTafsirName =
    tafsirOptions.find((tafsirOption) => tafsirOption.id === selectedTafsir)?.name ??
    (selectedTafsir ? `Tafsir ${selectedTafsir}` : null);
  const previousVerseKey = currentVerseIndex > 0 ? verses[currentVerseIndex - 1]?.verse_key ?? null : null;
  const verseChatContext: VerseChatContext | null = surah && currentVerse
    ? {
        verseKey: currentVerse.verse_key,
        surahId: currentVerse.surah_id,
        ayahNumber: currentVerse.id,
        arabicText: currentVerse.text,
        translationText: currentVerse.translation,
      }
    : null;

  if (!surah || verses.length === 0 || !isValidVerseIndex || !currentVerse) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="skeleton w-48 h-6" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-dropdown lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - Verses List */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-[100dvh] lg:h-screen w-[260px] z-modal
          bg-surface border-r border-border flex flex-col
          transition-transform duration-200 ease-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-[56px] flex items-center justify-between px-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-text">Verses</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="btn-ghost p-1 lg:hidden"
            aria-label="Close sidebar"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Verse List */}
        <nav className="flex-1 overflow-y-auto">
          {verses.map((verse, index) => (
            <button
              key={verse.id}
              onClick={() => {
                setCurrentVerseIndex(index);
                setIsSidebarOpen(false);
              }}
              className={`
                w-full text-left px-4 py-3 border-b border-border
                transition-colors
                ${index === currentVerseIndex
                  ? 'bg-primary/5 border-l-2 border-l-primary'
                  : 'hover:bg-surface-2'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-number text-xs">{verse.verse_key.split(':')[1]}</span>
                <span className="text-xs text-text-muted">Verse {verse.verse_key.split(':')[1]}</span>
              </div>
              <p className="text-xs text-text-muted line-clamp-1">
                {verse.translation?.slice(0, 50) || 'No translation'}
              </p>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 h-[56px] z-sticky bg-surface border-b border-border px-4 flex items-center gap-4 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="btn-ghost p-2 lg:hidden"
            aria-label="Open verse list"
          >
            <FiMenu size={20} />
          </button>

          <button
            onClick={() => navigate('/surahs')}
            className="btn-secondary py-1.5 px-3"
          >
            <FiArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-text truncate">
              {surah.name_english}
              <span className="font-normal text-text-muted ml-2">{surah.name_arabic}</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={goToPreviousVerse}
              disabled={disablePrevAyah ?? currentVerseIndex === 0}
              className="btn-secondary py-1.5 px-3 disabled:opacity-50"
            >
              <FiChevronLeft size={16} />
              <span>Prev</span>
            </button>
            <span className="text-sm text-text-muted tabular-nums">
              {currentVerseIndex + 1} / {verses.length}
            </span>
            <button
              onClick={goToNextVerse}
              disabled={disableNextAyah ?? currentVerseIndex === verses.length - 1}
              className="btn-secondary py-1.5 px-3 disabled:opacity-50"
            >
              <span>Next</span>
              <FiChevronRight size={16} />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto pb-[88px]">
          <div className="max-w-[900px] mx-auto p-4 sm:p-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <TajweedLearningButton
                surahId={surah.id}
                surahName={surah.name_english}
                surahNameArabic={surah.name_arabic}
              />
              <button
                onClick={() => setIsWordByWordEnabled(!isWordByWordEnabled)}
                className={isWordByWordEnabled ? 'btn-primary py-1.5 px-3' : 'btn-secondary py-1.5 px-3'}
              >
                Word by Word
              </button>
            </div>

            {/* Verse Card */}
            <div className="card mb-6">
              {/* Arabic Text */}
              <div className="bg-surface-2 rounded-lg p-4 mb-4 text-right">
                
                <p className="arabic text-2xl sm:text-3xl text-text leading-12">
                  {currentVerse.text}
                </p>
              </div>

              {/* Word by Word */}
              {isWordByWordEnabled && currentVerse.word_translations && currentVerse.word_translations.length > 0 && (
                <div className="mb-4">
                  <WordByWord words={currentVerse.word_translations} />
                </div>
              )}

              {/* Translation */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-text-muted mb-2">Translation</h3>
                {currentVerse.translationHtml ? (
                  <div
                    className="text-text leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: currentVerse.translationHtml }}
                  />
                ) : (
                  <p className="text-text leading-relaxed">{currentVerse.translation}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <button onClick={() => handleCopy(currentVerse, surah.name_english)} className="btn-ghost text-xs gap-1">
                  <FiCopy size={14} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleBookmark}
                  className={`btn-ghost text-xs gap-1 ${bookmarked ? 'text-primary' : ''}`}
                >
                  <FiBookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} />
                  {bookmarked ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={() => setIsNoteEditorOpen((open) => !open)}
                  className="btn-ghost text-xs gap-1"
                >
                  <FiFileText size={14} />
                  {noteActionLabel}
                </button>
              </div>
            </div>

            {/* Settings Row */}
            <div className="flex flex-wrap gap-4 mb-6">
              {onTranslationChange && translationOptions.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-text-muted mb-1">Translation</label>
                  <select
                    value={selectedTranslation ?? ''}
                    onChange={(e) => onTranslationChange(Number(e.target.value))}
                    className="w-full"
                  >
                    {translationOptions.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.languageName})</option>
                    ))}
                  </select>
                </div>
              )}

              {onTafsirChange && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-text-muted mb-1">Tafsir</label>
                  <select
                    value={selectedTafsir ?? ''}
                    onChange={(e) => onTafsirChange(Number(e.target.value))}
                    className="w-full"
                  >
                    <option value="">Select Tafsir...</option>
                    {tafsirOptions.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* From Notes */}
            <div className="card mb-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <FiFileText className="text-accent" size={14} />
                  </div>
                  <span className="text-sm font-medium text-text">From Notes</span>
                </div>

                <button
                  onClick={() => setIsNoteEditorOpen(true)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  <FiEdit3 size={14} />
                  {noteActionLabel}
                </button>
              </div>

              {currentVerseNote ? (
                <div className="space-y-4">
                  {hasSavedReflection ? (
                    <div>
                      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                        Your Reflection
                      </h4>
                      <MarkdownContent content={currentVerseNote.userMarkdown} />
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">No personal reflection saved for this verse yet.</p>
                  )}

                  {hasSavedAiExplanation && (
                    <div className={hasSavedReflection ? 'pt-4 border-t border-border' : ''}>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                          Saved AI Explanation
                        </h4>
                        {currentVerseNote.aiExplanationSource && (
                          <span className="text-xs text-text-muted">
                            {currentVerseNote.aiExplanationSource.tafsirName}
                          </span>
                        )}
                      </div>

                      <MarkdownContent content={currentVerseNote.aiExplanationMarkdown ?? ''} />

                      {currentVerseNote.aiExplanationSource && (
                        <p className="mt-3 text-xs text-text-muted">
                          Saved from {currentVerseNote.aiExplanationSource.tafsirName} on{' '}
                          {new Date(currentVerseNote.aiExplanationSource.savedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">No note saved for this verse yet.</p>
                    <p className="text-sm text-text-muted">
                      Add your reflection here. Saved AI explanations stay separate from the live explanation below.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsNoteEditorOpen(true)}
                    className="btn-primary py-1.5 px-3 text-sm"
                  >
                    Add Note
                  </button>
                </div>
              )}
            </div>

            {isNoteEditorOpen && (
              <div className="card mb-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <FiEdit3 className="text-primary" size={14} />
                    </div>
                    <span className="text-sm font-medium text-text">Verse Reflection</span>
                  </div>
                </div>

                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  className="w-full min-h-[180px] resize-y"
                  placeholder="Write what stands out to you in this ayah..."
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-text-muted">
                    This editor only changes your reflection. Any saved AI explanation remains read-only.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setNoteDraft(currentVerseNote?.userMarkdown ?? '');
                        setIsNoteEditorOpen(false);
                      }}
                      className="btn-secondary py-1.5 px-3 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onSaveVerseNote?.(noteDraft);
                        setIsNoteEditorOpen(false);
                      }}
                      className="btn-primary py-1.5 px-3 text-sm"
                    >
                      <FiSave size={14} />
                      Save Reflection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Explanation */}
            <div className="card mb-6 group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary text-sm">AI</span>
                  </div>
                  <span className="text-sm font-medium text-text">AI Explanation</span>
                </div>

                {aiExplanation && !isExplanationLoading && onSaveAiToNotes && (
                  <button
                    onClick={onSaveAiToNotes}
                    disabled={isCurrentAiSaved}
                    className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-60"
                  >
                    <FiSave size={14} />
                    {aiSaveLabel}
                  </button>
                )}
              </div>

              {isExplanationLoading && (
                <div className="space-y-2">
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-4/5" />
                  <div className="skeleton h-4 w-3/4" />
                </div>
              )}

              {!selectedTafsir && !isExplanationLoading && (
                <p className="text-sm text-text-muted">Select a tafsir to see the AI explanation.</p>
              )}

              {aiExplanation && !isExplanationLoading && (
                <MarkdownContent content={aiExplanation.explanation} />
              )}

              {aiExplanation?.keyTerms && aiExplanation.keyTerms.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Key Terms</h4>
                  <ul className="space-y-1">
                    {aiExplanation.keyTerms.map((item) => (
                      <li key={item.term} className="text-sm">
                        <span className="font-medium text-text">{item.term}:</span>{' '}
                        <span className="text-text-muted">{item.definition}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Original Tafsir */}
            {selectedTafsir && (
              <div className="card">
                <h3 className="text-sm font-medium text-text-muted mb-3">Original Tafsir</h3>
                {isTafsirLoading && (
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-4/5" />
                  </div>
                )}
                {!isTafsirLoading && tafsirText && (
                  <div
                    className="prose prose-sm max-w-none text-sm break-words w-full overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: tafsirText }}
                  />
                )}
                {!isTafsirLoading && !tafsirText && (
                  <p className="text-sm text-text-muted">Tafsir not available for this verse.</p>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Bottom Player */}
        {selectedRecitation && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-width)] h-[72px] z-player bg-surface border-t border-border px-4 flex items-center gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={goToPreviousVerse}
                disabled={disablePrevAyah ?? currentVerseIndex === 0}
                className="btn-ghost p-2 disabled:opacity-50"
              >
                <FiChevronLeft size={20} />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <AudioPlayer
                surahNumber={currentVerse.surah_id}
                ayahNumber={currentVerseIndex + 1}
                recitationId={selectedRecitation}
                recitations={recitations}
                onRecitationChange={onRecitationChange}
              />
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={goToNextVerse}
                disabled={disableNextAyah ?? currentVerseIndex === verses.length - 1}
                className="btn-ghost p-2 disabled:opacity-50"
              >
                <FiChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedTafsir && isExplainerOpen !== undefined && onExplainerToggle && (
        <TafsirExplainerModal
          isOpen={isExplainerOpen}
          onClose={onExplainerToggle}
          surahNumber={currentVerse.surah_id}
          ayahNumber={currentVerseIndex + 1}
          tafsirId={selectedTafsir}
          tafsirHtml={tafsirText}
          verse={`${currentVerse.surah_id}:${currentVerseIndex + 1}`}
          tafseerAuthor={tafsirOptions.find((t) => t.id === selectedTafsir)?.name}
        />
      )}
      
      {aiExplanation && selectedTafsir && onReportModalToggle && (
        <ReportWrongModal
          isOpen={isReportModalOpen}
          onClose={() => onReportModalToggle(false)}
          tafsirText={tafsirText ?? ''}
          verse={`${currentVerse.surah_id}:${currentVerseIndex + 1}`}
          tafsirAuthor={tafsirOptions.find((t) => t.id === selectedTafsir)?.name || 'Unknown'}
          originalExplanation={aiExplanation.explanation}
        />
      )}

      {verseChatContext && (
        <Suspense fallback={null}>
          <VerseChatBubble
            verseContext={verseChatContext}
            previousVerseKey={previousVerseKey}
            tafsirPlainText={tafsirPlainText}
            selectedTafsirId={selectedTafsir ?? null}
            selectedTafsirName={selectedTafsirName}
            isTafsirLoading={isTafsirLoading}
            hasAudioPlayer={Boolean(selectedRecitation)}
          />
        </Suspense>
      )}
    </div>
  );
}
