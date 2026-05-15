import { lazy, memo, Suspense, useCallback, useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBookmark,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiCopy,
  FiEdit3,
  FiFlag,
  FiFileText,
  FiMenu,
  FiMessageSquare,
  FiSave,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import AudioPlayer from '../components/common/AudioPlayer';
import LogoLandscape from '../components/common/LogoLandscape';
import MushafWordByWordPage from '../components/common/MushafWordByWordPage';
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
  SegmentedControl,
  TextAreaField,
  usePoliteStatus,
} from '../components/ui/primitives';
import { buttonClassName } from '../components/ui/buttonClassName';
import { useTheme } from '../hooks/useTheme';
import { formatDate } from '../utils/formatting';
import { isBookmarked, toggleBookmark } from '../utils/quranLocalStorage';
import { type VerseStudyNote } from '../utils/studyNotes';
import { requestVerseChatOpen } from '../utils/verseChatEvents';
import { type ExplainTafsirResponse } from '../services/tafsirExplainerService';
import { type Recitation } from '../services/quranResourcesService';
import type { VerseChatContext } from '../types/verseChat';
import {
  buildQuranPages,
  findPageIndexForVerse,
  type QuranReaderVerse,
} from '../utils/quranPages';
import {
  buildReaderAppearanceStyle,
  loadReaderAppearanceSettings,
  normalizeReaderAppearance,
  READER_APPEARANCE_CHANGE_EVENT,
} from '../utils/readerPreferences';

const MarkdownContent = lazy(() => import('../components/common/MarkdownContent'));
const TafsirExplainerModal = lazy(() => import('../components/common/TafsirExplainerModal'));
const ReportWrongModal = lazy(() => import('../components/common/ReportWrongModal'));
const VerseChatBubble = lazy(() => import('../components/reader/VerseChatBubble'));

const WORD_BY_WORD_STORAGE_KEY = 'tadabbur_word_by_word';

type Verse = QuranReaderVerse;

interface Surah {
  id: number;
  name_english: string;
  name_arabic: string;
  translated_name: string;
  verses_count: number;
  pages?: [number, number];
  bismillah_pre?: boolean;
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
type ReaderMode = 'verse' | 'page';

const readerModeItems: Array<{ value: ReaderMode; label: string }> = [
  { value: 'verse', label: 'Verse' },
  { value: 'page', label: 'Page' },
];

const MarkdownFallback = ({ label }: { label: string }) => (
  <p className="text-sm leading-7 text-text-muted">{label}</p>
);

interface MobileAccordionSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

function MobileAccordionSection({ title, description, children }: MobileAccordionSectionProps) {
  return (
    <details className="rounded-[28px] border border-border bg-surface/95 shadow-[0_16px_40px_rgba(20,20,18,0.05)]">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-[28px] px-4 py-4 text-left transition-colors hover:bg-surface-2/60">
        <span className="min-w-0 space-y-1">
          <span className="block text-base font-semibold text-text">{title}</span>
          <span className="block text-sm leading-6 text-text-muted">{description}</span>
        </span>
        <FiChevronDown className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
      </summary>
      <div className="px-4 pb-4 pt-0">
        {children}
      </div>
    </details>
  );
}

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
    <Panel title="More Mods" description="Launch immersive modes without changing the current theme or source settings.">
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
  onAskVerseChatFallback?: (prompt: string) => void;
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
  onAskVerseChatFallback,
}: ExplanationTabsPanelProps) {
  const tabGroupId = useId();
  const activeTabPanelId = `${tabGroupId}-${activeView}-panel`;
  const isVerseChatFallback = aiExplanation?.fallbackMode === 'verse_chat';
  const fallbackPrompt = aiExplanation?.suggestedPrompt?.trim() || 'What does this verse say?';

  const renderAiActions = (className: string) => (
    <div className={className}>
      {isVerseChatFallback && onAskVerseChatFallback ? (
        <ActionButton variant="secondary" size="sm" onClick={() => onAskVerseChatFallback(fallbackPrompt)}>
          <FiMessageSquare aria-hidden="true" />
          Ask in Verse Chat
        </ActionButton>
      ) : null}
      {selectedTafsir && onExplainerToggle && !isVerseChatFallback ? (
        <ActionButton variant="ghost" size="sm" onClick={onExplainerToggle}>
          <FiMessageSquare aria-hidden="true" />
          Open Explainer
        </ActionButton>
      ) : null}
      {aiExplanation && !isExplanationLoading && onSaveAiToNotes && !isVerseChatFallback ? (
        <ActionButton variant="secondary" size="sm" onClick={onSaveAiToNotes} disabled={isCurrentAiSaved}>
          <FiSave aria-hidden="true" />
          {aiSaveLabel}
        </ActionButton>
      ) : null}
    </div>
  );

  const tabButtonClassName = (isActive: boolean) =>
    `inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
      isActive
        ? 'bg-primary text-on-primary shadow-[0_12px_32px_rgba(4,120,87,0.18)]'
        : 'text-text-muted hover:bg-background hover:text-text'
    }`;

  return (
    <Panel className="reader-tafsir-panel">
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
                ? 'This layer explains the tafsir grounded by the original source of Tafsir Author.'
                : selectedTafsirName
                  ? `Source: ${selectedTafsirName}`
                  : 'Original source text for the current ayah.'}
            </p>

            {activeView === 'ai' ? renderAiActions('hidden flex-wrap gap-2 sm:flex') : null}
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
                {isVerseChatFallback ? (
                  <div className="rounded-[20px] border border-accent/30 bg-accent/5 p-4">
                    <h3 className="text-sm font-semibold text-text">Use verse chat for this ayah</h3>
                    <p className="mt-2 text-sm leading-7 text-text-muted">
                      The structured explainer is unavailable right now, but the grounded verse chat can still answer from the current ayah and selected tafsir.
                    </p>
                    {onAskVerseChatFallback ? (
                      <div className="mt-4">
                        <ActionButton onClick={() => onAskVerseChatFallback(fallbackPrompt)}>
                          <FiMessageSquare aria-hidden="true" />
                          Ask “{fallbackPrompt}”
                        </ActionButton>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Suspense fallback={<MarkdownFallback label="Loading AI explanation…" />}>
                    <MarkdownContent content={aiExplanation.explanation} />
                  </Suspense>
                )}

                {aiExplanation.keyTerms && aiExplanation.keyTerms.length > 0 && !isVerseChatFallback ? (
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

                {onReportModalToggle && !isVerseChatFallback ? (
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
            <div className="prose prose-sm max-w-none overflow-x-auto wrap-break-word text-sm leading-7 text-text" dangerouslySetInnerHTML={{ __html: tafsirText }} />
          ) : (
            <p className="text-sm leading-7 text-text-muted">Tafsir text is not available for this ayah.</p>
          )}
          {activeView === 'ai' ? renderAiActions('flex flex-wrap gap-2 sm:hidden') : null}
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
  const { resolvedTheme } = useTheme();
  const { startExperience, isLoading: isPleasantlyLoading, isActive: isPleasantlyActive } = usePlayPleasantly();
  const [isVerseRailOpen, setIsVerseRailOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [activeExplanationView, setActiveExplanationView] = useState<ExplanationView>('ai');
  const [readerMode, setReaderMode] = useState<ReaderMode>('verse');
  const [isLeftSidebarEnabled, setIsLeftSidebarEnabled] = useState(true);
  const [isRightSidebarEnabled, setIsRightSidebarEnabled] = useState(true);
  const [readerAppearance, setReaderAppearance] = useState(() => loadReaderAppearanceSettings());
  const [isWordByWordEnabled, setIsWordByWordEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(WORD_BY_WORD_STORAGE_KEY) !== 'false';
  });
  const { message: statusMessage, announce } = usePoliteStatus();

  const isValidVerseIndex = currentVerseIndex >= 0 && currentVerseIndex < verses.length;
  const currentVerse = isValidVerseIndex ? verses[currentVerseIndex] : null;
  const firstVerseId = verses[0]?.id;
  const lastVerseId = verses[verses.length - 1]?.id;
  const quranPages = useMemo(() => buildQuranPages(verses, surah?.pages), [surah?.pages, verses]);
  const currentPageIndex = useMemo(
    () => findPageIndexForVerse(quranPages, currentVerse?.verse_key),
    [currentVerse?.verse_key, quranPages],
  );
  const currentPage = quranPages[currentPageIndex] ?? null;
  const readerAppearanceStyle = useMemo(
    () => buildReaderAppearanceStyle(readerAppearance, resolvedTheme) as CSSProperties,
    [readerAppearance, resolvedTheme],
  );

  useEffect(() => {
    localStorage.setItem(WORD_BY_WORD_STORAGE_KEY, String(isWordByWordEnabled));
  }, [isWordByWordEnabled]);

  useEffect(() => {
    const handleAppearanceChange = (event: Event) => {
      const nextAppearance = event instanceof CustomEvent
        ? normalizeReaderAppearance(event.detail)
        : loadReaderAppearanceSettings();
      setReaderAppearance(nextAppearance);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'tadabbur_reader_appearance') {
        setReaderAppearance(loadReaderAppearanceSettings());
      }
    };

    window.addEventListener(READER_APPEARANCE_CHANGE_EVENT, handleAppearanceChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(READER_APPEARANCE_CHANGE_EVENT, handleAppearanceChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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

  const handleSelectVerseKey = useCallback((verseKey: string) => {
    const nextIndex = verses.findIndex((verse) => verse.verse_key === verseKey);
    if (nextIndex === -1) {
      return;
    }

    setCurrentVerseIndex(nextIndex);
    announce(`Ayah ${verses[nextIndex].id} selected.`);
  }, [announce, setCurrentVerseIndex, verses]);

  const handleSaveReflection = (nextDraft: string) => {
    onSaveVerseNote?.(nextDraft);
    setIsNoteEditorOpen(false);
    announce('Reflection saved.');
  };

  const handleSaveAiToNotes = () => {
    onSaveAiToNotes?.();
    announce('AI explanation saved to notes.');
  };

  const handleAskVerseChatFallback = (prompt: string) => {
    if (!currentVerse) {
      return;
    }

    requestVerseChatOpen({
      verseKey: currentVerse.verse_key,
      prompt,
      autoSend: true,
    });
    announce('Opened verse chat with a fallback prompt.');
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
      onAskVerseChatFallback={handleAskVerseChatFallback}
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

  const renderReaderActions = () => (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      <ActionButton variant="ghost" size="sm" onClick={() => handleCopy(currentVerse, surah.name_english)}>
        <FiCopy aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">{copied ? 'Copied' : 'Copy'}</span>
      </ActionButton>
      <ActionButton variant="ghost" size="sm" onClick={handleBookmark} className={bookmarked ? 'text-primary' : ''}>
        <FiBookmark aria-hidden="true" fill={bookmarked ? 'currentColor' : 'none'} />
        <span className="sr-only sm:not-sr-only">{bookmarked ? 'Saved' : 'Save'}</span>
      </ActionButton>
      <ActionButton variant="ghost" size="sm" onClick={() => setIsNoteEditorOpen((open) => !open)}>
        <FiEdit3 aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">{noteActionLabel}</span>
      </ActionButton>
      <ActionButton
        variant="ghost"
        size="sm"
        disabled={!aiExplanation || !onReportModalToggle}
        onClick={() => onReportModalToggle?.(true)}
      >
        <FiFlag aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Report</span>
      </ActionButton>
    </div>
  );

  const renderReaderModeToolbar = () => (
    <div className="flex items-center justify-between gap-2">
      <SegmentedControl
        label="Reader mode"
        labelHidden
        value={readerMode}
        items={readerModeItems}
        onChange={setReaderMode}
      />
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
        {readerMode === 'page' && currentPage ? `Page ${currentPage.pageNumber}` : `Ayah ${currentVerse.id}`}
      </span>
    </div>
  );

  const renderVerseReaderContent = () => (
    <>
      <div className="rounded-[28px] border border-border/80 bg-surface-2 px-5 py-6 sm:px-7 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="arabic min-w-0 flex-1 text-[1.65rem] leading-[3.2rem] text-text sm:text-[2rem] sm:leading-[3.8rem] md:text-[2.5rem] md:leading-[4.8rem]">
            {currentVerse.text}
          </p>
          <span className="surah-wheel-badge mushaf-ayah-marker mt-2 shrink-0" aria-hidden="true">
            {currentVerse.id}
          </span>
        </div>
      </div>

      {isWordByWordEnabled && currentVerse.word_translations && currentVerse.word_translations.length > 0 ? (
        <WordByWord words={currentVerse.word_translations} />
      ) : null}
    </>
  );

  const renderPageReaderContent = () => (
    currentPage ? (
      <div className="mushaf-page-scroll" aria-label="Page-by-page word-by-word Quran view" role="region">
        <MushafWordByWordPage
          page={currentPage}
          surahId={surah.id}
          surahNameEnglish={surah.name_english}
          surahNameArabic={surah.name_arabic}
          translatedName={surah.translated_name}
          selectedVerseKey={currentVerse.verse_key}
          onSelectVerse={handleSelectVerseKey}
        />
      </div>
    ) : (
      <p className="text-sm leading-7 text-text-muted">Page data is not available for this surah yet.</p>
    )
  );

  const renderTranslationSection = (headingId = 'reader-translation-heading') => (
    <section className="space-y-3 border-t border-border pt-4" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
        {readerMode === 'page' ? `Selected Ayah ${currentVerse.id} Translation` : 'Translation'}
      </h2>
      {currentVerse.translationHtml ? (
        <div className="reader-translation-copy text-base leading-8 text-text" dangerouslySetInnerHTML={{ __html: currentVerse.translationHtml }} />
      ) : (
        <p className="reader-translation-copy text-base leading-8 text-text">{currentVerse.translation}</p>
      )}
    </section>
  );

  const readerGridClassName = [
    'reader-layout-grid',
    isLeftSidebarEnabled ? 'has-left-sidebar' : '',
    isRightSidebarEnabled ? 'has-right-sidebar' : '',
  ].filter(Boolean).join(' ');

  const readerShellStyle: CSSProperties = {
    ...readerAppearanceStyle,
    paddingBottom: hasStickyAudioPlayer ? 'calc(var(--player-height) + 24px)' : '80px',
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <a href="#reader-main" className="skip-link">
        Skip to main content
      </a>

      <PoliteLiveRegion message={statusMessage} />

      <header className="sticky top-0 z-sticky bg-background/70 px-4 pb-2 pt-3 backdrop-blur sm:px-6 xl:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 rounded-[28px] bg-surface/95 px-4 py-3 shadow-[0_16px_40px_rgba(20,20,18,0.08)] backdrop-blur sm:px-5">
          <div className="flex items-center gap-2">
            <IconButton label="Open verse list" className="lg:hidden" onClick={() => setIsVerseRailOpen(true)}>
              <FiMenu size={18} />
            </IconButton>
            <Link
              to="/surahs"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-2"
            >
              <LogoLandscape />
            </Link>
          </div>

          <nav className="hidden flex-1 items-center gap-2 sm:flex" aria-label="Primary">
            <Link
              to="/surahs"
              aria-current="page"
              className={buttonClassName({
                variant: 'primary',
                className: 'shadow-[0_12px_32px_rgba(4,120,87,0.18)]',
              })}
            >
              Quran
            </Link>
            <Link to="/notes" className={buttonClassName({ variant: 'ghost' })}>
              Notes
            </Link>
            <Link to="/settings" className={buttonClassName({ variant: 'ghost' })}>
              Settings
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 sm:hidden" aria-label="Mobile navigation">
              <Link
                to="/notes"
                aria-label="Notes"
                title="Notes"
                className={buttonClassName({ variant: 'ghost', size: 'icon' })}
              >
                <FiFileText aria-hidden="true" />
              </Link>
              <Link
                to="/settings"
                aria-label="Settings"
                title="Settings"
                className={buttonClassName({ variant: 'ghost', size: 'icon' })}
              >
                <FiSettings aria-hidden="true" />
              </Link>
            </nav>
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

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 xl:px-8" style={readerShellStyle}>
        <div className={readerGridClassName}>
          <button
            type="button"
            className="reader-sidebar-toggle reader-sidebar-toggle--left hidden lg:inline-grid"
            aria-label={isLeftSidebarEnabled ? 'Hide verse sidebar' : 'Show verse sidebar'}
            aria-pressed={isLeftSidebarEnabled}
            onClick={() => setIsLeftSidebarEnabled((enabled) => !enabled)}
          >
            {isLeftSidebarEnabled ? <FiChevronLeft size={18} /> : <FiChevronRight size={18} />}
          </button>

          {isLeftSidebarEnabled ? (
            <aside className="hidden lg:block">
              <Panel title="Verses" description={rangeSummary} className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
                <VerseRail verses={verses} currentVerseIndex={currentVerseIndex} onSelectVerse={handleSelectVerse} />
              </Panel>
            </aside>
          ) : null}

          <main id="reader-main" className="min-w-0 space-y-6">
            <Panel
              title={readerMode === 'page' && currentPage ? `Page ${currentPage.pageNumber}` : `Ayah ${currentVerse.id}`}
              description={`${surah.name_english} · ${rangeSummary}`}
              actions={renderReaderActions()}
            >
              {renderReaderModeToolbar()}
              {readerMode === 'verse' ? renderVerseReaderContent() : renderPageReaderContent()}
              {renderTranslationSection('reader-translation-heading')}
            </Panel>

            {explanationTabsPanel}

            <div className="space-y-6 lg:hidden">
              <MobileAccordionSection title="Secondary Modes" description="Switch to immersive reading experiences.">
                {secondaryModesPanel}
              </MobileAccordionSection>
              <MobileAccordionSection title="Sources" description="Choose translation, tafsir, and word-by-word layers.">
                {sourcesPanel}
              </MobileAccordionSection>
              <MobileAccordionSection title="Listening" description="Use recitation without leaving the current ayah.">
                {listeningPanel}
              </MobileAccordionSection>
              <MobileAccordionSection title="Study Notes" description="Keep your reflection separate from AI notes.">
                {notesPanel}
              </MobileAccordionSection>
            </div>
          </main>

          {isRightSidebarEnabled ? (
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {secondaryModesPanel}
                {sourcesPanel}
                {listeningPanel}
                {notesPanel}
              </div>
            </aside>
          ) : null}

          <button
            type="button"
            className="reader-sidebar-toggle reader-sidebar-toggle--right hidden lg:inline-grid"
            aria-label={isRightSidebarEnabled ? 'Hide reading settings sidebar' : 'Show reading settings sidebar'}
            aria-pressed={isRightSidebarEnabled}
            onClick={() => setIsRightSidebarEnabled((enabled) => !enabled)}
          >
            {isRightSidebarEnabled ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
          </button>
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
