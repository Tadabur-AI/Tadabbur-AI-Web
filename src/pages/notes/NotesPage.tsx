import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowUpRight, FiBookOpen, FiBookmark, FiEdit3, FiFileText, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
import MarkdownContent from '../../components/common/MarkdownContent';
import {
  deleteStudyNote,
  getStudyNotes,
  saveFreeStudyNote,
  saveVerseStudyNoteReflection,
  subscribeToStudyNotes,
  type StudyNote,
  type VerseStudyNote,
} from '../../utils/studyNotes';

const formatTimestamp = (value: string) => new Date(value).toLocaleString();

const isVerseNote = (note: StudyNote): note is VerseStudyNote => note.kind === 'verse';

const buildSidebarLabel = (note: StudyNote) =>
  isVerseNote(note) ? `Verse • ${note.verse.surahName} ${note.verse.surahId}:${note.verse.ayahNumber}` : `Note • ${note.title}`;

export default function NotesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingFreeNote, setIsCreatingFreeNote] = useState(false);
  const [editingTitle, setEditingTitle] = useState('Untitled');
  const [editingUserMarkdown, setEditingUserMarkdown] = useState('');

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

  const startCreatingFreeNote = useCallback(() => {
    setIsCreatingFreeNote(true);
    setIsEditing(true);
    setSelectedNoteId(null);
    setSearchParams({});
    setEditingTitle('Untitled');
    setEditingUserMarkdown('');
  }, [setSearchParams]);

  const startEditing = () => {
    if (!selectedNote) {
      return;
    }

    setIsCreatingFreeNote(false);
    setIsEditing(true);
    setEditingTitle(selectedNote.title);
    setEditingUserMarkdown(selectedNote.userMarkdown);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsCreatingFreeNote(false);
    setEditingTitle(selectedNote?.title ?? 'Untitled');
    setEditingUserMarkdown(selectedNote?.userMarkdown ?? '');
  };

  const handleSave = () => {
    if (isCreatingFreeNote) {
      const savedNote = saveFreeStudyNote({
        title: editingTitle,
        userMarkdown: editingUserMarkdown,
      });
      setSelectedNoteId(savedNote.id);
      setSearchParams({ note: savedNote.id });
    } else if (selectedNote) {
      if (isVerseNote(selectedNote)) {
        const updatedNote = saveVerseStudyNoteReflection(selectedNote.verse, editingUserMarkdown);
        const refreshedNotes = getStudyNotes();
        setNotes(refreshedNotes);
        setSelectedNoteId(updatedNote?.id ?? refreshedNotes[0]?.id ?? null);
        if (updatedNote?.id) {
          setSearchParams({ note: updatedNote.id });
        }
      } else {
        const savedNote = saveFreeStudyNote({
          id: selectedNote.id,
          title: editingTitle,
          userMarkdown: editingUserMarkdown,
        });
        setSelectedNoteId(savedNote.id);
        setSearchParams({ note: savedNote.id });
      }
    }

    setNotes(getStudyNotes());
    setIsEditing(false);
    setIsCreatingFreeNote(false);
  };

  const handleDelete = (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    const nextNotes = deleteStudyNote(noteId);
    setNotes(nextNotes);
    if (selectedNoteId === noteId) {
      setSelectedNoteId(nextNotes[0]?.id ?? null);
      if (nextNotes[0]?.id) {
        setSearchParams({ note: nextNotes[0].id });
      } else {
        setSearchParams({});
      }
    }
  };

  const sidebarItems = useMemo(
    () => [
      { label: 'Surahs', icon: <FiBookOpen size={16} />, path: '/surahs' },
      { label: 'Saved', icon: <FiBookmark size={16} />, path: '/surahs?tab=saved' },
      {
        label: 'New Note',
        icon: <FiPlus size={16} />,
        onClick: startCreatingFreeNote,
      },
      ...notes.map((note) => ({
        label: buildSidebarLabel(note),
        icon: isVerseNote(note) ? <FiBookOpen size={16} /> : <FiFileText size={16} />,
        onClick: () => {
          setSelectedNoteId(note.id);
          setSearchParams(note.id ? { note: note.id } : {});
          setIsEditing(false);
          setIsCreatingFreeNote(false);
        },
      })),
    ],
    [notes, setSearchParams, startCreatingFreeNote],
  );

  const editingVerseNote = !isCreatingFreeNote && selectedNote && isVerseNote(selectedNote) ? selectedNote : null;
  const hasNotes = notes.length > 0;
  const showEmptyState = !hasNotes && !isEditing;

  return (
    <DashboardLayout
      sidebarItems={sidebarItems}
      screenTitle="My Notes"
      userProfile={
        <button
          onClick={startCreatingFreeNote}
          className="flex items-center gap-2 text-sm px-3 py-1 rounded hover:bg-surface-2 text-text"
        >
          <FiPlus /> New Note
        </button>
      }
    >
      {showEmptyState ? (
        <div className="mx-auto flex h-full w-full max-w-[980px] items-center justify-center">
          <div className="w-full space-y-6">
            <div className="card overflow-hidden">
              <div className="border-b border-border bg-gradient-to-r from-primary/10 via-surface to-surface px-6 py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl space-y-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <FiFileText size={22} />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold text-text">Start your study notes</h2>
                      <p className="max-w-xl text-sm leading-7 text-text-muted">
                        Save personal reflections, keep AI explanations you want to revisit, and build a verse-linked study space as you read.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={startCreatingFreeNote}
                      className="btn-primary px-4 py-2"
                    >
                      <FiPlus />
                      New Note
                    </button>
                    <button
                      onClick={() => navigate('/surahs')}
                      className="btn-secondary px-4 py-2"
                    >
                      <FiBookOpen />
                      Open Quran
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-sm font-semibold text-text">Free notes</p>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    Create open-ended study notes for themes, questions, or summaries.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-sm font-semibold text-text">Verse reflections</p>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    While reading an ayah, add your reflection and it will appear here automatically.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-sm font-semibold text-text">Saved AI context</p>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    Save an AI explanation to notes without overwriting your own reflection.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="card">
                <p className="text-sm font-semibold text-text">Good first step</p>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  Create one free note for your current study topic, then save verse reflections while you read.
                </p>
                <button
                  onClick={startCreatingFreeNote}
                  className="btn-secondary mt-4 px-4 py-2"
                >
                  <FiPlus />
                  Create First Note
                </button>
              </div>

              <div className="card">
                <p className="text-sm font-semibold text-text">Verse-linked workflow</p>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  Open a surah, reflect on an ayah, and save the parts you want to keep. Those verse notes will show up here with direct ayah links.
                </p>
                <button
                  onClick={() => navigate('/surahs')}
                  className="btn-secondary mt-4 px-4 py-2"
                >
                  <FiBookOpen />
                  Go to Surahs
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between gap-4 p-4 border-b border-border bg-surface rounded-t-xl">
          {isEditing ? (
            <>
              <div className="flex-1 min-w-0">
                {isCreatingFreeNote || !editingVerseNote ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    className="w-full text-xl font-bold border-none outline-none bg-transparent text-text"
                    placeholder="Note title..."
                  />
                ) : (
                  <div>
                    <h1 className="text-xl font-bold text-text">{editingVerseNote.title}</h1>
                    <p className="text-sm text-text-muted">
                      Editing only your reflection. Saved AI stays read-only.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 text-sm px-3 py-1 rounded bg-primary text-on-primary hover:bg-primary-hover"
                >
                  <FiSave /> Save
                </button>
                <button
                  onClick={cancelEditing}
                  className="flex items-center gap-2 text-sm px-3 py-1 rounded hover:bg-surface-2 text-text"
                >
                  <FiX /> Cancel
                </button>
              </div>
            </>
          ) : selectedNote ? (
            <>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-text">{selectedNote.title}</h1>
                  <span className="text-xs px-2 py-1 rounded-full bg-surface-2 text-text-muted">
                    {isVerseNote(selectedNote) ? 'Verse note' : 'Free note'}
                  </span>
                </div>
                {isVerseNote(selectedNote) && (
                  <p className="text-sm text-text-muted">
                    {selectedNote.verse.surahNameArabic} · Ayah {selectedNote.verse.ayahNumber}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isVerseNote(selectedNote) && (
                  <button
                    onClick={() => navigate(`/surah/${selectedNote.verse.surahId}?ayah=${selectedNote.verse.ayahNumber}`)}
                    className="flex items-center gap-2 text-sm px-3 py-1 rounded hover:bg-surface-2 text-text"
                  >
                    <FiArrowUpRight /> Open Ayah
                  </button>
                )}
                <button
                  onClick={startEditing}
                  className="flex items-center gap-2 text-sm px-3 py-1 rounded hover:bg-surface-2 text-text"
                >
                  <FiEdit3 /> {isVerseNote(selectedNote) ? 'Edit Reflection' : 'Edit'}
                </button>
                <button
                  onClick={() => handleDelete(selectedNote.id)}
                  className="flex items-center gap-2 text-sm px-3 py-1 rounded text-danger hover:bg-danger/10"
                >
                  <FiTrash2 /> Delete
                </button>
              </div>
            </>
          ) : (
            <div className="text-center w-full">
              <p className="text-text-muted">Select a note or create a new one</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden rounded-b-xl border-x border-b border-border bg-surface">
          {isEditing ? (
            <div className="h-full flex flex-col lg:flex-row">
              <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-border">
                <textarea
                  value={editingUserMarkdown}
                  onChange={(event) => setEditingUserMarkdown(event.target.value)}
                  className="w-full h-full min-h-[280px] p-4 border-none outline-none resize-none font-mono text-sm bg-surface text-text"
                  placeholder={editingVerseNote ? 'Write your reflection for this ayah...' : 'Write your note in Markdown...'}
                />
              </div>

              <div className="lg:w-1/2 p-4 overflow-y-auto bg-surface space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
                    {editingVerseNote ? 'Reflection Preview' : 'Preview'}
                  </h2>
                  {editingUserMarkdown.trim() ? (
                    <MarkdownContent content={editingUserMarkdown} size="lg" />
                  ) : (
                    <p className="text-sm text-text-muted">Nothing to preview yet.</p>
                  )}
                </div>

                {editingVerseNote?.aiExplanationMarkdown && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
                        Saved AI Explanation
                      </h2>
                      {editingVerseNote.aiExplanationSource && (
                        <span className="text-xs text-text-muted">
                          {editingVerseNote.aiExplanationSource.tafsirName}
                        </span>
                      )}
                    </div>
                    <MarkdownContent content={editingVerseNote.aiExplanationMarkdown} />
                  </div>
                )}
              </div>
            </div>
          ) : selectedNote ? (
            <div className="p-6 overflow-y-auto h-full space-y-6">
              {isVerseNote(selectedNote) && (
                <div className="card">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-primary">{selectedNote.verse.surahName}</span>
                        <span className="text-sm text-text-muted">{selectedNote.verse.surahNameArabic}</span>
                        <span className="badge-number text-xs">{selectedNote.verse.ayahNumber}</span>
                      </div>
                      <p className="arabic text-xl text-text text-right" dir="rtl">
                        {selectedNote.verse.arabicText}
                      </p>
                      <p className="text-sm text-text-muted leading-relaxed">{selectedNote.verse.translation}</p>
                    </div>

                    <button
                      onClick={() => navigate(`/surah/${selectedNote.verse.surahId}?ayah=${selectedNote.verse.ayahNumber}`)}
                      className="btn-secondary py-1.5 px-3 text-sm"
                    >
                      <FiArrowUpRight />
                      Open Ayah
                    </button>
                  </div>
                </div>
              )}

              <div className="card">
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
                  {isVerseNote(selectedNote) ? 'Your Reflection' : 'Content'}
                </h2>
                {selectedNote.userMarkdown.trim() ? (
                  <MarkdownContent content={selectedNote.userMarkdown} size="lg" />
                ) : (
                  <p className="text-sm text-text-muted">
                    {isVerseNote(selectedNote)
                      ? 'No personal reflection saved yet. Edit this note to add one.'
                      : 'This note is empty.'}
                  </p>
                )}
              </div>

              {isVerseNote(selectedNote) && selectedNote.aiExplanationMarkdown && (
                <div className="card">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
                      Saved AI Explanation
                    </h2>
                    {selectedNote.aiExplanationSource && (
                      <span className="text-xs text-text-muted">
                        {selectedNote.aiExplanationSource.tafsirName}
                      </span>
                    )}
                  </div>
                  <MarkdownContent content={selectedNote.aiExplanationMarkdown} />
                  {selectedNote.aiExplanationSource && (
                    <p className="mt-4 text-xs text-text-muted">
                      Saved on {formatTimestamp(selectedNote.aiExplanationSource.savedAt)}
                    </p>
                  )}
                </div>
              )}

              <div className="text-sm text-text-muted">
                <p>Created: {formatTimestamp(selectedNote.createdAt)}</p>
                <p>Last updated: {formatTimestamp(selectedNote.updatedAt)}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-bold text-text-muted mb-4">No note selected</h2>
                <p className="text-text-muted mb-6">Create a note or save a verse reflection while reading.</p>
                <button
                  onClick={startCreatingFreeNote}
                  className="flex items-center gap-2 mx-auto px-4 py-2 rounded hover:bg-surface-2 text-text"
                >
                  <FiPlus /> Create New Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </DashboardLayout>
  );
}
