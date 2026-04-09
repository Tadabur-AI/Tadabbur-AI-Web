import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiArrowUpRight,
  FiBookOpen,
  FiEdit3,
  FiFileText,
  FiPlus,
  FiSave,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import AppShell from '../../layouts/AppShell';
import {
  ActionButton,
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  Panel,
  PoliteLiveRegion,
  TextAreaField,
  usePoliteStatus,
} from '../../components/ui/primitives';
import { buttonClassName } from '../../components/ui/buttonClassName';
import { formatDate, formatDateTime } from '../../utils/formatting';
import {
  deleteStudyNote,
  getStudyNotes,
  saveFreeStudyNote,
  saveVerseStudyNoteReflection,
  subscribeToStudyNotes,
  type StudyNote,
  type VerseStudyNote,
} from '../../utils/studyNotes';

const isVerseNote = (note: StudyNote): note is VerseStudyNote => note.kind === 'verse';
const MarkdownContent = lazy(() => import('../../components/common/MarkdownContent'));

const buildSidebarLabel = (note: StudyNote) =>
  isVerseNote(note) ? `${note.verse.surahName} ${note.verse.surahId}:${note.verse.ayahNumber}` : note.title;

export default function NotesPage() {
  const titleFieldId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingFreeNote, setIsCreatingFreeNote] = useState(false);
  const [editingTitle, setEditingTitle] = useState('Untitled');
  const [editingUserMarkdown, setEditingUserMarkdown] = useState('');
  const [notePendingDelete, setNotePendingDelete] = useState<StudyNote | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const { message: statusMessage, announce } = usePoliteStatus();

  const requestedNoteId = searchParams.get('note');

  useEffect(() => {
    const syncNotes = () => setNotes(getStudyNotes());
    syncNotes();
    return subscribeToStudyNotes(syncNotes);
  }, []);

  useEffect(() => {
    if (notes.length === 0) {
      setSelectedNoteId(null);
      return;
    }

    if (requestedNoteId && notes.some((note) => note.id === requestedNoteId)) {
      if (selectedNoteId !== requestedNoteId) {
        setSelectedNoteId(requestedNoteId);
      }
      return;
    }

    if (!selectedNoteId || !notes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes, requestedNoteId, selectedNoteId]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );

  const setCurrentNote = useCallback((noteId: string | null) => {
    setSelectedNoteId(noteId);
    if (noteId) {
      setSearchParams({ note: noteId });
    } else {
      setSearchParams({});
    }
  }, [setSearchParams]);

  const startCreatingFreeNote = useCallback(() => {
    setIsCreatingFreeNote(true);
    setIsEditing(true);
    setCurrentNote(null);
    setEditingTitle('Untitled');
    setEditingUserMarkdown('');
    announce('Creating a new note.');
  }, [announce, setCurrentNote]);

  const startEditing = useCallback(() => {
    if (!selectedNote) {
      return;
    }

    setIsCreatingFreeNote(false);
    setIsEditing(true);
    setEditingTitle(selectedNote.title);
    setEditingUserMarkdown(selectedNote.userMarkdown);
  }, [selectedNote]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setIsCreatingFreeNote(false);
    setEditingTitle(selectedNote?.title ?? 'Untitled');
    setEditingUserMarkdown(selectedNote?.userMarkdown ?? '');
  }, [selectedNote]);

  const handleSave = useCallback(() => {
    if (isCreatingFreeNote) {
      const savedNote = saveFreeStudyNote({
        title: editingTitle,
        userMarkdown: editingUserMarkdown,
      });
      setCurrentNote(savedNote.id);
      announce('New note saved.');
    } else if (selectedNote) {
      if (isVerseNote(selectedNote)) {
        const updatedNote = saveVerseStudyNoteReflection(selectedNote.verse, editingUserMarkdown);
        const refreshedNotes = getStudyNotes();
        setNotes(refreshedNotes);
        setCurrentNote(updatedNote?.id ?? refreshedNotes[0]?.id ?? null);
        announce('Reflection saved.');
      } else {
        const savedNote = saveFreeStudyNote({
          id: selectedNote.id,
          title: editingTitle,
          userMarkdown: editingUserMarkdown,
        });
        setCurrentNote(savedNote.id);
        announce('Note saved.');
      }
    }

    setNotes(getStudyNotes());
    setIsEditing(false);
    setIsCreatingFreeNote(false);
  }, [announce, editingTitle, editingUserMarkdown, isCreatingFreeNote, selectedNote, setCurrentNote]);

  const handleDelete = useCallback(() => {
    if (!notePendingDelete) {
      return;
    }

    const nextNotes = deleteStudyNote(notePendingDelete.id);
    setNotes(nextNotes);
    setNotePendingDelete(null);

    if (selectedNoteId === notePendingDelete.id) {
      setCurrentNote(nextNotes[0]?.id ?? null);
      setIsEditing(false);
      setIsCreatingFreeNote(false);
    }
    announce('Note deleted.');
  }, [announce, notePendingDelete, selectedNoteId, setCurrentNote]);

  const editingVerseNote = !isCreatingFreeNote && selectedNote && isVerseNote(selectedNote) ? selectedNote : null;

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      const target = (isCreatingFreeNote || !editingVerseNote ? titleInputRef.current : null) ?? editorRef.current;
      target?.focus();
    }, 40);

    return () => window.clearTimeout(focusTimer);
  }, [editingVerseNote, isCreatingFreeNote, isEditing]);
  const hasNotes = notes.length > 0;
  const showEmptyState = !hasNotes && !isEditing;

  return (
    <AppShell
      activeNav="notes"
      headerAccessory={
        <ActionButton onClick={startCreatingFreeNote}>
          <FiPlus aria-hidden="true" />
          New Note
        </ActionButton>
      }
    >
      <div className="space-y-6">
        <PoliteLiveRegion message={statusMessage} />
        <PageHeader
          eyebrow="Study Space"
          title="Notes"
          description="Keep one clear study record for reflections, saved AI context, and verse-linked notes."
        />

        {showEmptyState ? (
          <div className="space-y-4">
            <EmptyState
              title="Your study notes are empty"
              description="Create one free note or save a reflection while reading. Verse-linked notes and saved AI context will stay in the same system."
              icon={<FiFileText size={22} />}
              action={
                <div className="flex flex-wrap gap-3">
                  <ActionButton onClick={startCreatingFreeNote}>
                    <FiPlus aria-hidden="true" />
                    Create First Note
                  </ActionButton>
                  <Link to="/surahs" className={buttonClassName({ variant: 'secondary' })}>
                    <FiBookOpen aria-hidden="true" />
                    Open Quran
                  </Link>
                </div>
              }
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Free Notes" description="Capture themes, questions, and summaries outside a single ayah.">
                <p className="text-sm leading-7 text-text-muted">
                  Use free notes for open-ended study threads that are larger than one verse.
                </p>
              </Panel>
              <Panel title="Verse Reflections" description="Every saved reflection keeps a direct ayah link back to the reader.">
                <p className="text-sm leading-7 text-text-muted">
                  Verse notes preserve the ayah, your reflection, and any saved AI context together.
                </p>
              </Panel>
              <Panel title="Saved AI Context" description="Store the explanation you want to revisit without overwriting your own writing.">
                <p className="text-sm leading-7 text-text-muted">
                  Save AI only when it helps your study flow, then keep your own commentary distinct.
                </p>
              </Panel>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Panel
              title="Library"
              description="Recent notes stay on the left so the reading context is always easy to scan."
              actions={
                <ActionButton variant="ghost" onClick={startCreatingFreeNote}>
                  <FiPlus aria-hidden="true" />
                  New
                </ActionButton>
              }
            >
              <nav aria-label="Notes library">
                <ul className="space-y-2" role="list">
                {notes.map((note) => {
                  const isSelected = note.id === selectedNoteId;

                  return (
                    <li key={note.id} className="content-auto-note">
                      <Link
                        to={`/notes?note=${encodeURIComponent(note.id)}`}
                        aria-current={isSelected ? 'page' : undefined}
                        className={`block w-full rounded-[20px] border px-4 py-4 text-left transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-[0_12px_32px_rgba(4,120,87,0.12)]'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-surface-2'
                        }`}
                        onClick={() => {
                          setSelectedNoteId(note.id);
                          setIsEditing(false);
                          setIsCreatingFreeNote(false);
                          announce(`Selected ${buildSidebarLabel(note)}.`);
                        }}
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-text">{buildSidebarLabel(note)}</span>
                            <span className="rounded-full bg-surface px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-text-muted">
                              {isVerseNote(note) ? 'Verse' : 'Free'}
                            </span>
                            {isSelected ? <span className="sr-only">Selected</span> : null}
                          </div>
                          {isVerseNote(note) ? (
                            <p className="arabic-ui truncate text-sm text-text-muted">{note.verse.surahNameArabic}</p>
                          ) : null}
                          <p className="line-clamp-2 text-sm leading-6 text-text-muted">
                            {note.userMarkdown.trim() || 'No writing saved yet.'}
                          </p>
                          <p className="text-xs text-text-muted">Updated {formatDate(note.updatedAt)}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
                </ul>
              </nav>
            </Panel>

            <div className="space-y-6">
              <Panel
                title={
                  isEditing
                    ? isCreatingFreeNote
                      ? 'Create Note'
                      : editingVerseNote
                        ? 'Edit Reflection'
                        : 'Edit Note'
                    : selectedNote
                      ? selectedNote.title
                      : 'No Note Selected'
                }
                description={
                  isEditing
                    ? editingVerseNote
                      ? 'Only your reflection is editable here. Saved AI text stays read-only.'
                      : 'Write clearly and keep one idea per note.'
                    : selectedNote
                      ? isVerseNote(selectedNote)
                        ? `${selectedNote.verse.surahNameArabic} · Ayah ${selectedNote.verse.ayahNumber}`
                        : 'Free-form study note'
                      : 'Choose a note from the library or create a new one.'
                }
                actions={
                  isEditing ? (
                    <>
                      <ActionButton variant="ghost" onClick={cancelEditing}>
                        <FiX aria-hidden="true" />
                        Cancel
                      </ActionButton>
                      <ActionButton onClick={handleSave}>
                        <FiSave aria-hidden="true" />
                        Save
                      </ActionButton>
                    </>
                  ) : selectedNote ? (
                    <>
                      {isVerseNote(selectedNote) ? (
                        <Link
                          to={`/surah/${selectedNote.verse.surahId}?ayah=${selectedNote.verse.ayahNumber}`}
                          className={buttonClassName({ variant: 'ghost' })}
                        >
                          <FiArrowUpRight aria-hidden="true" />
                          Open Ayah
                        </Link>
                      ) : null}
                      <ActionButton variant="ghost" onClick={startEditing}>
                        <FiEdit3 aria-hidden="true" />
                        {isVerseNote(selectedNote) ? 'Edit Reflection' : 'Edit'}
                      </ActionButton>
                      <ActionButton variant="danger" onClick={() => setNotePendingDelete(selectedNote)}>
                        <FiTrash2 aria-hidden="true" />
                        Delete
                      </ActionButton>
                    </>
                  ) : null
                }
              >
                {isEditing ? (
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    {isCreatingFreeNote || !editingVerseNote ? (
                      <Field label="Title" htmlFor={titleFieldId}>
                        <input
                          id={titleFieldId}
                          ref={titleInputRef}
                          type="text"
                          name="note_title"
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          placeholder="Add a clear note title…"
                          className="field-control"
                        />
                      </Field>
                    ) : null}

                    <TextAreaField
                      label={editingVerseNote ? 'Reflection' : 'Content'}
                      wrapperClassName="xl:col-span-1"
                      textareaRef={editorRef}
                      value={editingUserMarkdown}
                      onChange={(event) => setEditingUserMarkdown(event.target.value)}
                      placeholder={editingVerseNote ? 'Write your reflection for this ayah…' : 'Write your note in Markdown…'}
                    />

                    {editingUserMarkdown.trim() || editingVerseNote?.aiExplanationMarkdown ? (
                      <Panel
                        title={editingVerseNote ? 'Preview & Saved Context' : 'Preview'}
                        description="Review how the note will read before you save it."
                        className="bg-background"
                      >
                        {editingUserMarkdown.trim() ? (
                          <Suspense fallback={<p className="text-sm leading-7 text-text-muted">Loading preview…</p>}>
                            <MarkdownContent content={editingUserMarkdown} size="lg" />
                          </Suspense>
                        ) : null}

                        {editingVerseNote?.aiExplanationMarkdown ? (
                          <div className={`${editingUserMarkdown.trim() ? 'border-t border-border pt-4' : ''}`}>
                            <h3 className="text-sm font-semibold text-text">Saved AI Explanation</h3>
                            {editingVerseNote.aiExplanationSource ? (
                              <p className="mt-1 text-xs text-text-muted">
                                {editingVerseNote.aiExplanationSource.tafsirName}
                              </p>
                            ) : null}
                            <div className="mt-3">
                              <Suspense fallback={<p className="text-sm leading-7 text-text-muted">Loading saved AI context…</p>}>
                                <MarkdownContent content={editingVerseNote.aiExplanationMarkdown} />
                              </Suspense>
                            </div>
                          </div>
                        ) : null}
                      </Panel>
                    ) : null}
                  </div>
                ) : selectedNote ? (
                  <div className="space-y-6">
                    {isVerseNote(selectedNote) ? (
                      <Panel
                        title="Verse Context"
                        description="This reflection stays attached to the ayah you saved it from."
                        className="bg-background"
                      >
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-semibold text-primary">{selectedNote.verse.surahName}</span>
                            <span className="arabic-ui text-sm text-text-muted">{selectedNote.verse.surahNameArabic}</span>
                            <span className="badge-number text-xs">{selectedNote.verse.ayahNumber}</span>
                          </div>
                          <p className="arabic text-2xl leading-[2.6rem] text-text">{selectedNote.verse.arabicText}</p>
                          <p className="text-sm leading-7 text-text-muted">{selectedNote.verse.translation}</p>
                        </div>
                      </Panel>
                    ) : null}

                    <Panel
                      title={isVerseNote(selectedNote) ? 'Your Reflection' : 'Content'}
                      description="What you wrote is preserved exactly as Markdown."
                      className="bg-background"
                    >
                      {selectedNote.userMarkdown.trim() ? (
                        <Suspense fallback={<p className="text-sm leading-7 text-text-muted">Loading note…</p>}>
                          <MarkdownContent content={selectedNote.userMarkdown} size="lg" />
                        </Suspense>
                      ) : (
                        <p className="text-sm leading-7 text-text-muted">
                          {isVerseNote(selectedNote)
                            ? 'No personal reflection is saved for this verse yet.'
                            : 'This note is still empty.'}
                        </p>
                      )}
                    </Panel>

                    {isVerseNote(selectedNote) && selectedNote.aiExplanationMarkdown ? (
                      <Panel
                        title="Saved AI Explanation"
                        description={
                          selectedNote.aiExplanationSource
                            ? `Saved from ${selectedNote.aiExplanationSource.tafsirName} on ${formatDate(selectedNote.aiExplanationSource.savedAt)}`
                            : 'AI context saved with this verse note.'
                        }
                        className="bg-background"
                      >
                        <Suspense fallback={<p className="text-sm leading-7 text-text-muted">Loading saved AI explanation…</p>}>
                          <MarkdownContent content={selectedNote.aiExplanationMarkdown} />
                        </Suspense>
                      </Panel>
                    ) : null}

                    <div className="flex flex-wrap gap-6 text-sm text-text-muted">
                      <p>Created {formatDateTime(selectedNote.createdAt)}</p>
                      <p>Last updated {formatDateTime(selectedNote.updatedAt)}</p>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No note selected"
                    description="Choose a note from the library or start a new one."
                    icon={<FiFileText size={20} />}
                    action={
                      <ActionButton onClick={startCreatingFreeNote}>
                        <FiPlus aria-hidden="true" />
                        Create New Note
                      </ActionButton>
                    }
                  />
                )}
              </Panel>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(notePendingDelete)}
        title="Delete this note?"
        description="This permanently removes the note from local storage. Saved AI context attached to the note will be removed with it."
        confirmLabel="Delete Note"
        tone="danger"
        onClose={() => setNotePendingDelete(null)}
        onConfirm={handleDelete}
      />
    </AppShell>
  );
}
