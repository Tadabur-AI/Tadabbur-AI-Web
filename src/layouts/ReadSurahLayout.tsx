import { lazy, memo, Suspense, useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiBookmark,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiEdit3,
  FiFlag,
  FiMenu,
  FiMessageSquare,
  FiSave,
  FiX,
} from 'react-icons/fi';
import AudioPlayer from '../components/common/AudioPlayer';
import ThemeToggle from '../components/common/ThemeToggle';
import WordByWord from '../components/common/WordByWord';
import TajweedLearningButton from '../components/TajweedLearning/TajweedLearningButton';
import { usePlayPleasantly } from '../components/PleasentPlay/PlayPleasantlyProvider';
import Overlay from '../components/ui/Overlay';
import {
  ActionButton,
  ContentGroup,
  IconButton,
  Panel,
  PoliteLiveRegion,
  SelectField,
  TextAreaField,
  usePoliteStatus,
} from '../components/ui/primitives';
import { buttonClassName } from '../components/ui/buttonClassName';
import { formatDate } from '../utils/formatting';
import { isBookmarked, toggleBookmark } from '../utils/quranLocalStorage';
import { type VerseStudyNote } from '../utils/studyNotes';
import { type ExplainTafsirResponse } from '../services/tafsirExplainerService';
import { type WordTranslation } from '../services/apis';
import { type Recitation } from '../services/quranResourcesService';
import type { VerseChatContext } from '../types/verseChat';

const MarkdownContent = lazy(() => import('../components/common/MarkdownContent'));
const TafsirExplainerModal = lazy(() => import('../components/common/TafsirExplainerModal'));
const ReportWrongModal = lazy(() => import('../components/common/ReportWrongModal'));
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
  tafsirOptions?: Array<{ id: number; name: string }>;
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

type ExplanationView = 'ai' | 'original';

const MarkdownFallback = ({ label }: { label: string }) => (
  <p className="text-sm leading-7 text-text-muted">{label}</p>
);

interface VerseRailProps {
  verses: Verse[];
  currentVerseIndex: number;
  onSelectVerse: (index: number) => void;
}

const VerseRail = memo(function VerseRail({ verses, currentVerseIndex, onSelectVerse }: VerseRailProps) {
  return (
    <nav aria-label="Verse navigation">
      <ol className="space-y-2">
        {verses.map((verse, index) => {
          const isSelected = index === currentVerseIndex;

          return (
            <li key={verse.id}>
              <button
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                className={`w-full rounded-[20px] border px-3 py-3 text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-[0_12px_32px_rgba(4,120,87,0.12)]'
                    : 'border-border bg-background hover:border-primary/30 hover:bg-surface-2'
                }`}
                onClick={() => onSelectVerse(index)}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="badge-number text-xs">{verse.id}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                      Ayah {verse.id}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-text-muted">
                    {verse.translation || 'No translation available.'}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

interface ReaderNavigationPanelProps {
  currentVerseId: number;
  currentVerseIndex: number;
  verseCount: number;
  onPrevious: () => void;
  onNext: () => void;
  disablePrevious: boolean;
  disableNext: boolean;
}

const ReaderNavigationPanel = memo(function ReaderNavigationPanel({
  currentVerseId,
  currentVerseIndex,
  verseCount,
  onPrevious,
  onNext,
  disablePrevious,
  disableNext,
}: ReaderNavigationPanelProps) {
  return (
    <Panel title="Navigation" description="Move through the current reading range one ayah at a time.">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <ActionButton variant="secondary" onClick={onPrevious} disabled={disablePrevious}>
          <FiChevronLeft aria-hidden="true" />
          Previous
        </ActionButton>
        <div className="text-center">
          <p className="text-sm font-semibold text-text">Ayah {currentVerseId}</p>
          <p className="text-xs text-text-muted">
            {currentVerseIndex + 1} of {verseCount} in this view
          </p>
        </div>
        <ActionButton variant="secondary" onClick={onNext} disabled={disableNext}>
          Next
          <FiChevronRight aria-hidden="true" />
        </ActionButton>
      </div>
    </Panel>
  );
});

interface ReaderSourcesPanelProps {
  selectedTranslation?: number | null;
  onTranslationChange?: (id: number) => void;
  translationOptions: Array<{ value: string | number; label: string }>;
  selectedTafsir?: number | null;
  onTafsirChange?: (id: number) => void;
  tafsirOptions: Array<{ value: string | number; label: string }>;
  isWordByWordEnabled: boolean;
  onToggleWordByWord: () => void;
}

const ReaderSourcesPanel = memo(function ReaderSourcesPanel({
  selectedTranslation,
  onTranslationChange,
  translationOptions,
  selectedTafsir,
  onTafsirChange,
  tafsirOptions,
  isWordByWordEnabled,
  onToggleWordByWord,
}: ReaderSourcesPanelProps) {
  return (
    <Panel title="Sources" description="Choose the source layers that shape this reading view.">
      {onTranslationChange && translationOptions.length > 0 ? (
        <SelectField
          label="Translation"
          value={selectedTranslation ?? ''}
          onChange={(event) => onTranslationChange(Number(event.target.value))}
          options={translationOptions}
        />
      ) : null}

      {onTafsirChange ? (
        <SelectField
          label="Tafsir"
          value={selectedTafsir ?? ''}
          onChange={(event) => onTafsirChange(Number(event.target.value))}
          options={tafsirOptions}
        />
      ) : null}

      <ContentGroup label="Word-by-Word" hint="Reveal word-level meanings only when you need them.">
        <div className="flex flex-wrap gap-3">
          <ActionButton variant={isWordByWordEnabled ? 'primary' : 'secondary'} onClick={onToggleWordByWord}>
            {isWordByWordEnabled ? 'Hide Word-by-Word' : 'Show Word-by-Word'}
          </ActionButton>
        </div>
      </ContentGroup>
    </Panel>
  );
});

interface ListeningPanelProps {
  selectedRecitation?: number | null;
  recitations: Recitation[];
  onRecitationChange?: (id: number) => void;
}

const ListeningPanel = memo(function ListeningPanel({
  selectedRecitation,
  recitations,
  onRecitationChange,
}: ListeningPanelProps) {
  const recitationOptions = recitations.map((recitation) => ({
    value: recitation.id,
    label: `${recitation.reciter_name}${recitation.style ? ` (${recitation.style})` : ''}`,
  }));

  return (
    <Panel title="Listening" description="Use recitation without leaving the current ayah context.">
      {selectedRecitation && onRecitationChange && recitationOptions.length > 0 ? (
        <div className="space-y-4">
          <SelectField
            label="Reciter"
            value={selectedRecitation}
            onChange={(event) => onRecitationChange(Number(event.target.value))}
            options={recitationOptions}
          />
          <p className="text-sm leading-7 text-text-muted">
            Playback stays docked below while you read and follows the active ayah.
          </p>
        </div>
      ) : (
        <p className="text-sm leading-7 text-text-muted">Loading recitation options…</p>
      )}
    </Panel>
  );
});

interface SecondaryModesPanelProps {
  onStartPleasantly: () => void;
  isPleasantlyLoading: boolean;
  isPleasantlyActive: boolean;
  surah: Surah;
  firstVerseId?: number;
  lastVerseId?: number;
}

const SecondaryModesPanel = memo(function SecondaryModesPanel({
  onStartPleasantly,
  isPleasantlyLoading,
  isPleasantlyActive,
  surah,
  firstVerseId,
  lastVerseId,
}: SecondaryModesPanelProps) {
  return (
    <Panel title="Secondary Modes" description="Launch immersive modes without changing the current theme or source settings.">
      <div className="flex flex-wrap gap-3">
        <ActionButton onClick={onStartPleasantly} disabled={isPleasantlyLoading || isPleasantlyActive}>
          Play Pleasantly
        </ActionButton>
        <TajweedLearningButton
          surahId={surah.id}
          surahName={surah.name_english}
          surahNameArabic={surah.name_arabic}
          startAyah={firstVerseId}
          endAyah={lastVerseId}
        />
      </div>
    </Panel>
  );
});

interface StudyNotesPanelProps {
  currentVerseNote: VerseStudyNote | null;
  noteDraft: string;
  onNoteDraftChange: (nextValue: string) => void;
  isNoteEditorOpen: boolean;
  onToggleEditor: () => void;
  onCancelEditor: () => void;
  onSaveReflection?: (userMarkdown: string) => void;
  noteActionLabel: string;
}

const StudyNotesPanel = memo(function StudyNotesPanel({
  currentVerseNote,
  noteDraft,
  onNoteDraftChange,
  isNoteEditorOpen,
  onToggleEditor,
  onCancelEditor,
  onSaveReflection,
  noteActionLabel,
}: StudyNotesPanelProps) {
  const hasSavedReflection = (currentVerseNote?.userMarkdown.trim().length ?? 0) > 0;
  const hasSavedAiExplanation = (currentVerseNote?.aiExplanationMarkdown?.trim().length ?? 0) > 0;

  return (
    <Panel
      title="Study Notes"
      description="Save your reflection separately from any AI explanation."
      actions={
        <ActionButton variant="ghost" size="sm" onClick={onToggleEditor}>
          <FiEdit3 aria-hidden="true" />
          {noteActionLabel}
        </ActionButton>
      }
    >
      {currentVerseNote ? (
        <div className="space-y-4">
          {hasSavedReflection ? (
            <div>
              <h3 className="text-sm font-semibold text-text">Your Reflection</h3>
              <div className="mt-3">
                <Suspense fallback={<MarkdownFallback label="Loading reflection…" />}>
                  <MarkdownContent content={currentVerseNote.userMarkdown} />
                </Suspense>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-7 text-text-muted">No reflection is saved for this ayah yet.</p>
          )}

          {hasSavedAiExplanation ? (
            <div className={`${hasSavedReflection ? 'border-t border-border pt-4' : ''}`}>
              <h3 className="text-sm font-semibold text-text">Saved AI Explanation</h3>
              {currentVerseNote.aiExplanationSource ? (
                <p className="mt-1 text-xs text-text-muted">
                  {currentVerseNote.aiExplanationSource.tafsirName} · {formatDate(currentVerseNote.aiExplanationSource.savedAt)}
                </p>
              ) : null}
              <div className="mt-3">
                <Suspense fallback={<MarkdownFallback label="Loading saved AI explanation…" />}>
                  <MarkdownContent content={currentVerseNote.aiExplanationMarkdown ?? ''} />
                </Suspense>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm leading-7 text-text-muted">
          No note is saved for this ayah yet. Add your own reflection here and keep the AI explanation separate below.
        </p>
      )}

      {isNoteEditorOpen ? (
        <div className="border-t border-border pt-4">
          <TextAreaField
            label="Reflection"
            value={noteDraft}
            onChange={(event) => onNoteDraftChange(event.target.value)}
            placeholder="Write what stands out to you in this ayah…"
          />
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <ActionButton variant="ghost" onClick={onCancelEditor}>
              Cancel
            </ActionButton>
            <ActionButton
              onClick={() => {
                onSaveReflection?.(noteDraft);
              }}
            >
              <FiSave aria-hidden="true" />
              Save Reflection
            </ActionButton>
          </div>
        </div>
      ) : null}
    </Panel>
  );
});

interface ExplanationTabsPanelProps {
  selectedTafsir?: number | null;
  selectedTafsirName: string | null;
  activeView: ExplanationView;
  onViewChange: (nextView: ExplanationView) => void;
  onExplainerToggle?: () => void;
  aiExplanation?: ExplainTafsirResponse | null;
  isExplanationLoading?: boolean;
  onSaveAiToNotes?: () => void;
  isCurrentAiSaved: boolean;
  aiSaveLabel: string;
  onReportModalToggle?: (open: boolean) => void;
  isTafsirLoading?: boolean;
  tafsirText?: string | null;
}

const ExplanationTabsPanel = memo(function ExplanationTabsPanel({
  selectedTafsir,
  selectedTafsirName,
  activeView,
  onViewChange,
  onExplainerToggle,
  aiExplanation,
  isExplanationLoading,
  onSaveAiToNotes,
  isCurrentAiSaved,
  aiSaveLabel,
  onReportModalToggle,
  isTafsirLoading,
  tafsirText,
}: ExplanationTabsPanelProps) {
  const tabGroupId = useId();
  const activeTabPanelId = `${tabGroupId}-${activeView}-panel`;

  const tabButtonClassName = (isActive: boolean) =>
    `inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
      isActive
        ? 'bg-primary text-on-primary shadow-[0_12px_32px_rgba(4,120,87,0.18)]'
        : 'text-text-muted hover:bg-background hover:text-text'
    }`;

  return (
    <Panel>
      <div className="space-y-4">
        <div className="space-y-4 border-b border-border pb-4">
          <div className="grid w-full grid-cols-2 gap-1 rounded-full border border-border bg-surface-2 p-1 sm:inline-grid sm:w-auto" role="tablist" aria-label="Explanation view">
            <button
              id={`${tabGroupId}-ai-tab`}
              type="button"
              role="tab"
              aria-selected={activeView === 'ai'}
              aria-controls={`${tabGroupId}-ai-panel`}
              tabIndex={activeView === 'ai' ? 0 : -1}
              className={tabButtonClassName(activeView === 'ai')}
              onClick={() => onViewChange('ai')}
            >
              AI Explanation
            </button>
            <button
              id={`${tabGroupId}-original-tab`}
              type="button"
              role="tab"
              aria-selected={activeView === 'original'}
              aria-controls={`${tabGroupId}-original-panel`}
              tabIndex={activeView === 'original' ? 0 : -1}
              className={tabButtonClassName(activeView === 'original')}
              onClick={() => onViewChange('original')}
            >
              Original
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm leading-7 text-text-muted">
              {activeView === 'ai'
                ? 'This layer explains the selected tafsir without replacing the original source.'
                : selectedTafsirName
                  ? `Source: ${selectedTafsirName}`
                  : 'Original source text for the current ayah.'}
            </p>

            {activeView === 'ai' ? (
              <div className="flex flex-wrap gap-2">
                {selectedTafsir && onExplainerToggle ? (
                  <ActionButton variant="ghost" size="sm" onClick={onExplainerToggle}>
                    <FiMessageSquare aria-hidden="true" />
                    Open Explainer
                  </ActionButton>
                ) : null}
                {aiExplanation && !isExplanationLoading && onSaveAiToNotes ? (
                  <ActionButton variant="secondary" size="sm" onClick={onSaveAiToNotes} disabled={isCurrentAiSaved}>
                    <FiSave aria-hidden="true" />
                    {aiSaveLabel}
                  </ActionButton>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div
          id={activeTabPanelId}
          role="tabpanel"
          aria-labelledby={`${tabGroupId}-${activeView}-tab`}
        >
          {activeView === 'ai' ? (
            isExplanationLoading ? (
              <div className="space-y-2" aria-live="polite">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-4/5" />
                <div className="skeleton h-4 w-3/4" />
              </div>
            ) : !selectedTafsir ? (
              <p className="text-sm leading-7 text-text-muted">Select a tafsir to generate an explanation for this ayah.</p>
            ) : aiExplanation ? (
              <div className="space-y-4">
                <Suspense fallback={<MarkdownFallback label="Loading AI explanation…" />}>
                  <MarkdownContent content={aiExplanation.explanation} />
                </Suspense>

                {aiExplanation.keyTerms && aiExplanation.keyTerms.length > 0 ? (
                  <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-text">Key Terms</h3>
                    <ul className="mt-3 space-y-2">
                      {aiExplanation.keyTerms.map((item) => (
                        <li key={item.term} className="text-sm leading-7 text-text-muted">
                          <span className="font-semibold text-text">{item.term}:</span> {item.definition}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {onReportModalToggle ? (
                  <div className="border-t border-border pt-4">
                    <ActionButton variant="ghost" size="sm" onClick={() => onReportModalToggle(true)}>
                      <FiFlag aria-hidden="true" />
                      Report an AI Issue
                    </ActionButton>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-7 text-text-muted">The AI explanation is not available for this ayah yet.</p>
            )
          ) : isTafsirLoading ? (
            <div className="space-y-2" aria-live="polite">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-4/5" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ) : tafsirText ? (
            <div className="prose prose-sm max-w-none overflow-x-auto break-words text-sm leading-7 text-text" dangerouslySetInnerHTML={{ __html: tafsirText }} />
          ) : (
            <p className="text-sm leading-7 text-text-muted">Tafsir text is not available for this ayah.</p>
          )}
        </div>
      </div>
    </Panel>
  );
});

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
  const { startExperience, isLoading: isPleasantlyLoading, isActive: isPleasantlyActive } = usePlayPleasantly();
  const [isVerseRailOpen, setIsVerseRailOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [activeExplanationView, setActiveExplanationView] = useState<ExplanationView>('ai');
  const [isWordByWordEnabled, setIsWordByWordEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('tadabbur_word_by_word') === 'true';
  });
  const { message: statusMessage, announce } = usePoliteStatus();

  const isValidVerseIndex = currentVerseIndex >= 0 && currentVerseIndex < verses.length;
  const currentVerse = isValidVerseIndex ? verses[currentVerseIndex] : null;
  const firstVerseId = verses[0]?.id;
  const lastVerseId = verses[verses.length - 1]?.id;

  useEffect(() => {
    localStorage.setItem('tadabbur_word_by_word', String(isWordByWordEnabled));
  }, [isWordByWordEnabled]);

  useEffect(() => {
    if (currentVerse) {
      setBookmarked(isBookmarked(currentVerse.verse_key));
      setCopied(false);
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
      void import('../components/common/TafsirExplainerModal');
      void import('../components/common/ReportWrongModal');
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
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPreviousVerse();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextVerse();
      } else if (event.key === 'Escape') {
        setIsVerseRailOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextVerse, goToPreviousVerse]);

  const handleCopy = async (verse: Verse, surahName: string) => {
    const text = `${verse.text}\n\n${verse.translation}\n\n${surahName} ${verse.verse_key}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      announce('Ayah copied to the clipboard.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Failed to copy:', err);
      announce('Copy failed.');
    }
  };

  const handleBookmark = () => {
    if (!currentVerse || !surah) {
      return;
    }

    const isNowBookmarked = toggleBookmark({
      verseKey: currentVerse.verse_key,
      surahId: currentVerse.surah_id,
      surahName: surah.name_english,
      surahNameArabic: surah.name_arabic,
      ayahNumber: currentVerse.id,
      arabicText: currentVerse.text,
      translation: currentVerse.translation,
    });
    setBookmarked(isNowBookmarked);
    announce(isNowBookmarked ? 'Ayah saved to bookmarks.' : 'Ayah removed from bookmarks.');
  };

  const handleSelectVerse = (index: number) => {
    setCurrentVerseIndex(index);
    setIsVerseRailOpen(false);
  };

  const handleSaveReflection = (nextDraft: string) => {
    onSaveVerseNote?.(nextDraft);
    setIsNoteEditorOpen(false);
    announce('Reflection saved.');
  };

  const handleSaveAiToNotes = () => {
    onSaveAiToNotes?.();
    announce('AI explanation saved to notes.');
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
  const verseChatContext: VerseChatContext | null =
    surah && currentVerse
      ? {
          verseKey: currentVerse.verse_key,
          surahId: currentVerse.surah_id,
          ayahNumber: currentVerse.id,
          arabicText: currentVerse.text,
          translationText: currentVerse.translation,
        }
      : null;

  const translationSelectOptions = useMemo(
    () =>
      translationOptions.map((translationOption) => ({
        value: translationOption.id,
        label: `${translationOption.name} (${translationOption.languageName})`,
      })),
    [translationOptions],
  );

  const tafsirSelectOptions = useMemo(
    () => [
      { value: '', label: 'Select a tafsir…' },
      ...tafsirOptions.map((tafsirOption) => ({ value: tafsirOption.id, label: tafsirOption.name })),
    ],
    [tafsirOptions],
  );

  const rangeSummary =
    firstVerseId && lastVerseId && firstVerseId !== lastVerseId
      ? `Ayat ${firstVerseId} to ${lastVerseId}`
      : currentVerse
        ? `Ayah ${currentVerse.id}`
        : 'Ayah';

  if (!surah || verses.length === 0 || !isValidVerseIndex || !currentVerse) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="skeleton h-6 w-52" />
      </div>
    );
  }

  const navigationPanel = (
    <ReaderNavigationPanel
      currentVerseId={currentVerse.id}
      currentVerseIndex={currentVerseIndex}
      verseCount={verses.length}
      onPrevious={goToPreviousVerse}
      onNext={goToNextVerse}
      disablePrevious={disablePrevAyah ?? currentVerseIndex === 0}
      disableNext={disableNextAyah ?? currentVerseIndex === verses.length - 1}
    />
  );

  const sourcesPanel = (
    <ReaderSourcesPanel
      selectedTranslation={selectedTranslation}
      onTranslationChange={onTranslationChange}
      translationOptions={translationSelectOptions}
      selectedTafsir={selectedTafsir}
      onTafsirChange={onTafsirChange}
      tafsirOptions={tafsirSelectOptions}
      isWordByWordEnabled={isWordByWordEnabled}
      onToggleWordByWord={() => {
        setIsWordByWordEnabled((value) => !value);
        announce(isWordByWordEnabled ? 'Word-by-word hidden.' : 'Word-by-word shown.');
      }}
    />
  );

  const listeningPanel = (
    <ListeningPanel
      selectedRecitation={selectedRecitation}
      recitations={recitations}
      onRecitationChange={onRecitationChange}
    />
  );

  const hasStickyAudioPlayer = Boolean(selectedRecitation);

  const notesPanel = (
    <StudyNotesPanel
      currentVerseNote={currentVerseNote}
      noteDraft={noteDraft}
      onNoteDraftChange={setNoteDraft}
      isNoteEditorOpen={isNoteEditorOpen}
      onToggleEditor={() => setIsNoteEditorOpen((open) => !open)}
      onCancelEditor={() => {
        setNoteDraft(currentVerseNote?.userMarkdown ?? '');
        setIsNoteEditorOpen(false);
      }}
      onSaveReflection={handleSaveReflection}
      noteActionLabel={noteActionLabel}
    />
  );

  const explanationTabsPanel = (
    <ExplanationTabsPanel
      selectedTafsir={selectedTafsir}
      selectedTafsirName={selectedTafsirName}
      activeView={activeExplanationView}
      onViewChange={setActiveExplanationView}
      onExplainerToggle={onExplainerToggle}
      aiExplanation={aiExplanation}
      isExplanationLoading={isExplanationLoading}
      onSaveAiToNotes={handleSaveAiToNotes}
      isCurrentAiSaved={isCurrentAiSaved}
      aiSaveLabel={aiSaveLabel}
      onReportModalToggle={onReportModalToggle}
      isTafsirLoading={isTafsirLoading}
      tafsirText={tafsirText}
    />
  );

  const secondaryModesPanel = (
    <SecondaryModesPanel
      onStartPleasantly={() => {
        startExperience({
          title: surah.name_english,
          subtitle: surah.name_arabic,
          segments: [
            {
              surahId: surah.id,
              startAyah: firstVerseId,
              endAyah: lastVerseId,
              label: rangeSummary,
            },
          ],
        });
      }}
      isPleasantlyLoading={isPleasantlyLoading}
      isPleasantlyActive={isPleasantlyActive}
      surah={surah}
      firstVerseId={firstVerseId}
      lastVerseId={lastVerseId}
    />
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <a href="#reader-main" className="skip-link">
        Skip to main content
      </a>

      <PoliteLiveRegion message={statusMessage} />

      <header className="sticky top-0 z-sticky bg-background/70 px-4 pb-2 pt-3 backdrop-blur sm:px-6 xl:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 rounded-[28px] border border-border/80 bg-surface/95 px-4 py-3 shadow-[0_16px_40px_rgba(20,20,18,0.08)] backdrop-blur sm:px-5">
          <div className="flex items-center gap-2">
            <IconButton label="Open verse list" className="lg:hidden" onClick={() => setIsVerseRailOpen(true)}>
              <FiMenu size={18} />
            </IconButton>
            <Link to="/surahs" className={buttonClassName({ variant: 'ghost', className: 'hidden sm:inline-flex' })}>
              <FiArrowLeft aria-hidden="true" />
              Quran
            </Link>
            <Link to="/notes" className={buttonClassName({ variant: 'ghost', className: 'hidden sm:inline-flex' })}>
              Notes
            </Link>
          </div>

          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-base font-semibold text-text sm:text-lg">{surah.name_english}</h1>
            <p className="arabic-ui truncate text-sm text-text-muted">{surah.name_arabic}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-text">Ayah {currentVerse.id}</p>
              <p className="text-xs text-text-muted">{rangeSummary}</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <Overlay
        open={isVerseRailOpen}
        onClose={() => setIsVerseRailOpen(false)}
        labelledBy="verse-list-title"
        describedBy="verse-list-description"
        placement="left"
        className="lg:hidden"
        surfaceClassName="h-full w-[min(88vw,360px)] overflow-y-auto border-r border-border bg-background p-4 shadow-[0_24px_80px_rgba(20,20,18,0.18)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="verse-list-title" className="text-sm font-semibold text-text">
              Verses
            </h2>
            <p id="verse-list-description" className="text-xs text-text-muted">
              {rangeSummary}
            </p>
          </div>
          <IconButton label="Close verse list" onClick={() => setIsVerseRailOpen(false)}>
            <FiX size={18} />
          </IconButton>
        </div>
        <VerseRail verses={verses} currentVerseIndex={currentVerseIndex} onSelectVerse={handleSelectVerse} />
      </Overlay>

      <div
        className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 xl:px-8"
        style={hasStickyAudioPlayer ? { paddingBottom: 'calc(var(--player-height) + 24px)' } : undefined}
      >
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
          <aside className="hidden lg:block">
            <Panel title="Verses" description={rangeSummary} className="sticky top-[96px] max-h-[calc(100vh-120px)] overflow-y-auto">
              <VerseRail verses={verses} currentVerseIndex={currentVerseIndex} onSelectVerse={handleSelectVerse} />
            </Panel>
          </aside>

          <main id="reader-main" className="min-w-0 space-y-6">
            <Panel
              title={`Ayah ${currentVerse.id}`}
              description={`${surah.name_english} · ${rangeSummary}`}
              actions={
                <div className="flex flex-wrap gap-2">
                  <ActionButton variant="ghost" size="sm" onClick={() => handleCopy(currentVerse, surah.name_english)}>
                    <FiCopy aria-hidden="true" />
                    {copied ? 'Copied' : 'Copy'}
                  </ActionButton>
                  <ActionButton variant="ghost" size="sm" onClick={handleBookmark} className={bookmarked ? 'text-primary' : ''}>
                    <FiBookmark aria-hidden="true" fill={bookmarked ? 'currentColor' : 'none'} />
                    {bookmarked ? 'Saved' : 'Save'}
                  </ActionButton>
                  <ActionButton variant="ghost" size="sm" onClick={() => setIsNoteEditorOpen((open) => !open)}>
                    <FiEdit3 aria-hidden="true" />
                    {noteActionLabel}
                  </ActionButton>
                  <ActionButton
                    variant="ghost"
                    size="sm"
                    disabled={!aiExplanation || !onReportModalToggle}
                    onClick={() => onReportModalToggle?.(true)}
                  >
                    <FiFlag aria-hidden="true" />
                    Report
                  </ActionButton>
                </div>
              }
            >
              <div className="rounded-[28px] border border-border/80 bg-surface-2 px-5 py-6 sm:px-7 sm:py-8">
                <p className="arabic text-[2rem] leading-[3.8rem] text-text sm:text-[2.5rem] sm:leading-[4.8rem]">
                  {currentVerse.text}
                </p>
              </div>

              {isWordByWordEnabled && currentVerse.word_translations && currentVerse.word_translations.length > 0 ? (
                <WordByWord words={currentVerse.word_translations} />
              ) : null}

              <section className="space-y-3 border-t border-border pt-4" aria-labelledby="reader-translation-heading">
                <h2 id="reader-translation-heading" className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Translation
                </h2>
                {currentVerse.translationHtml ? (
                  <div className="text-base leading-8 text-text" dangerouslySetInnerHTML={{ __html: currentVerse.translationHtml }} />
                ) : (
                  <p className="text-base leading-8 text-text">{currentVerse.translation}</p>
                )}
              </section>
            </Panel>

            {explanationTabsPanel}

            <div className="space-y-6 lg:hidden">
              {navigationPanel}
              {sourcesPanel}
              {listeningPanel}
              {notesPanel}
              {secondaryModesPanel}
            </div>
          </main>

          <aside className="hidden lg:block">
            <div className="sticky top-[96px] space-y-6">
              {navigationPanel}
              {sourcesPanel}
              {listeningPanel}
              {notesPanel}
              {secondaryModesPanel}
            </div>
          </aside>
        </div>
      </div>

      {selectedRecitation ? (
        <AudioPlayer
          surahNumber={currentVerse.surah_id}
          ayahNumber={currentVerse.id}
          recitationId={selectedRecitation}
          title={surah.name_english}
          subtitle={`Ayah ${currentVerse.id} · ${rangeSummary}`}
          sticky
          onPrevious={goToPreviousVerse}
          onNext={goToNextVerse}
          disablePrevious={disablePrevAyah ?? currentVerseIndex === 0}
          disableNext={disableNextAyah ?? currentVerseIndex === verses.length - 1}
        />
      ) : null}

      {selectedTafsir && isExplainerOpen !== undefined && onExplainerToggle ? (
        <Suspense fallback={null}>
          <TafsirExplainerModal
            isOpen={isExplainerOpen}
            onClose={onExplainerToggle}
            surahNumber={currentVerse.surah_id}
            ayahNumber={currentVerse.id}
            tafsirId={selectedTafsir}
            tafsirHtml={tafsirText}
            verse={`${currentVerse.surah_id}:${currentVerse.id}`}
            tafseerAuthor={tafsirOptions.find((item) => item.id === selectedTafsir)?.name}
          />
        </Suspense>
      ) : null}

      {aiExplanation && selectedTafsir && onReportModalToggle ? (
        <Suspense fallback={null}>
          <ReportWrongModal
            isOpen={isReportModalOpen}
            onClose={() => onReportModalToggle(false)}
            tafsirText={tafsirText ?? ''}
            verse={`${currentVerse.surah_id}:${currentVerse.id}`}
            tafsirAuthor={tafsirOptions.find((item) => item.id === selectedTafsir)?.name || 'Unknown'}
            originalExplanation={aiExplanation.explanation}
          />
        </Suspense>
      ) : null}

      {verseChatContext ? (
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
      ) : null}
    </div>
  );
}
