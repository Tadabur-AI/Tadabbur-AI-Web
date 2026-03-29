const STUDY_NOTES_STORAGE_KEY = 'tadabbur_notes_v2';
const LEGACY_NOTES_STORAGE_KEY = 'tadabbur-notes';
const STUDY_NOTES_UPDATED_EVENT = 'tadabbur-study-notes-updated';

export interface VerseReference {
  verseKey: string;
  surahId: number;
  surahName: string;
  surahNameArabic: string;
  ayahNumber: number;
  arabicText: string;
  translation: string;
}

export interface AiExplanationSource {
  tafsirId: number;
  tafsirName: string;
  savedAt: string;
}

interface BaseStudyNote {
  id: string;
  title: string;
  userMarkdown: string;
  createdAt: string;
  updatedAt: string;
}

export interface FreeStudyNote extends BaseStudyNote {
  kind: 'free';
}

export interface VerseStudyNote extends BaseStudyNote {
  kind: 'verse';
  verse: VerseReference;
  aiExplanationMarkdown?: string;
  aiExplanationSource?: AiExplanationSource;
}

export type StudyNote = FreeStudyNote | VerseStudyNote;

interface LegacyNote {
  id?: string;
  title?: string;
  content?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface FreeStudyNoteDraft {
  id?: string;
  title: string;
  userMarkdown: string;
}

interface CollectionResult<TNote extends StudyNote | null> {
  note: TNote;
  notes: StudyNote[];
}

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const normalizeDate = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' || value instanceof Date) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return fallback;
};

const sortStudyNotes = (notes: StudyNote[]): StudyNote[] =>
  [...notes].sort((left, right) => {
    const leftTime = new Date(left.updatedAt).getTime();
    const rightTime = new Date(right.updatedAt).getTime();
    return rightTime - leftTime;
  });

const createStudyNoteId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const buildVerseNoteTitle = (verse: VerseReference) => `${verse.surahName} ${verse.surahId}:${verse.ayahNumber}`;

const asVerseReference = (value: unknown): VerseReference | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Partial<VerseReference>;
  if (
    !isNonEmptyString(raw.verseKey) ||
    !Number.isFinite(raw.surahId) ||
    !isNonEmptyString(raw.surahName) ||
    !isNonEmptyString(raw.surahNameArabic) ||
    !Number.isFinite(raw.ayahNumber) ||
    !isNonEmptyString(raw.arabicText) ||
    !isNonEmptyString(raw.translation)
  ) {
    return null;
  }

  return {
    verseKey: raw.verseKey,
    surahId: Number(raw.surahId),
    surahName: raw.surahName,
    surahNameArabic: raw.surahNameArabic,
    ayahNumber: Number(raw.ayahNumber),
    arabicText: raw.arabicText,
    translation: raw.translation,
  };
};

const asAiExplanationSource = (value: unknown): AiExplanationSource | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const raw = value as Partial<AiExplanationSource>;
  if (!Number.isFinite(raw.tafsirId) || !isNonEmptyString(raw.tafsirName)) {
    return undefined;
  }

  const savedAt = normalizeDate(raw.savedAt, new Date().toISOString());

  return {
    tafsirId: Number(raw.tafsirId),
    tafsirName: raw.tafsirName,
    savedAt,
  };
};

const normalizeStudyNote = (value: unknown, fallbackNow = new Date().toISOString()): StudyNote | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Partial<StudyNote>;
  if (raw.kind !== 'free' && raw.kind !== 'verse') {
    return null;
  }

  const createdAt = normalizeDate(raw.createdAt, fallbackNow);
  const updatedAt = normalizeDate(raw.updatedAt, createdAt);
  const base = {
    id: isNonEmptyString(raw.id) ? raw.id : createStudyNoteId(),
    title: isNonEmptyString(raw.title) ? raw.title : 'Untitled',
    userMarkdown: typeof raw.userMarkdown === 'string' ? raw.userMarkdown : '',
    createdAt,
    updatedAt,
  };

  if (raw.kind === 'free') {
    return {
      ...base,
      kind: 'free',
    };
  }

  const verse = asVerseReference((raw as Partial<VerseStudyNote>).verse);
  if (!verse) {
    return null;
  }

  return {
    ...base,
    kind: 'verse',
    title: buildVerseNoteTitle(verse),
    verse,
    aiExplanationMarkdown:
      typeof (raw as Partial<VerseStudyNote>).aiExplanationMarkdown === 'string'
        ? (raw as Partial<VerseStudyNote>).aiExplanationMarkdown
        : undefined,
    aiExplanationSource: asAiExplanationSource((raw as Partial<VerseStudyNote>).aiExplanationSource),
  };
};

const parseStoredStudyNotes = (rawValue: string | null): StudyNote[] => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortStudyNotes(
      parsed
        .map((note) => normalizeStudyNote(note))
        .filter((note): note is StudyNote => Boolean(note)),
    );
  } catch (error) {
    console.warn('Failed to parse study notes from localStorage:', error);
    return [];
  }
};

export const migrateLegacyNotes = (legacyNotes: LegacyNote[], nowIso = new Date().toISOString()): StudyNote[] =>
  sortStudyNotes(
    legacyNotes.map((legacyNote) => {
      const createdAt = normalizeDate(legacyNote.createdAt, nowIso);
      const updatedAt = normalizeDate(legacyNote.updatedAt, createdAt);

      return {
        id: isNonEmptyString(legacyNote.id) ? legacyNote.id : createStudyNoteId(),
        kind: 'free',
        title: isNonEmptyString(legacyNote.title) ? legacyNote.title : 'Untitled',
        userMarkdown: typeof legacyNote.content === 'string' ? legacyNote.content : '',
        createdAt,
        updatedAt,
      } satisfies FreeStudyNote;
    }),
  );

const persistStudyNotes = (notes: StudyNote[]) => {
  if (!isBrowser()) {
    return notes;
  }

  const normalized = sortStudyNotes(notes);
  localStorage.setItem(STUDY_NOTES_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(STUDY_NOTES_UPDATED_EVENT));
  return normalized;
};

export const getStudyNotes = (): StudyNote[] => {
  if (!isBrowser()) {
    return [];
  }

  const storedNotesRaw = localStorage.getItem(STUDY_NOTES_STORAGE_KEY);
  if (storedNotesRaw !== null) {
    const storedNotes = parseStoredStudyNotes(storedNotesRaw);
    return storedNotes;
  }

  const legacyRaw = localStorage.getItem(LEGACY_NOTES_STORAGE_KEY);
  if (!legacyRaw) {
    return [];
  }

  try {
    const parsedLegacy = JSON.parse(legacyRaw) as unknown;
    if (!Array.isArray(parsedLegacy)) {
      return [];
    }

    const migratedNotes = migrateLegacyNotes(parsedLegacy as LegacyNote[]);
    persistStudyNotes(migratedNotes);
    return migratedNotes;
  } catch (error) {
    console.warn('Failed to migrate legacy notes from localStorage:', error);
    return [];
  }
};

export const subscribeToStudyNotes = (listener: () => void) => {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STUDY_NOTES_STORAGE_KEY || event.key === LEGACY_NOTES_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(STUDY_NOTES_UPDATED_EVENT, listener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(STUDY_NOTES_UPDATED_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
};

export const getVerseStudyNoteFromCollection = (
  notes: StudyNote[],
  verseKey: string,
): VerseStudyNote | null =>
  notes.find((note): note is VerseStudyNote => note.kind === 'verse' && note.verse.verseKey === verseKey) ?? null;

export const getVerseStudyNote = (verseKey: string): VerseStudyNote | null =>
  getVerseStudyNoteFromCollection(getStudyNotes(), verseKey);

const withoutVerseDuplicates = (notes: StudyNote[], verseKey: string): { existing: VerseStudyNote | null; rest: StudyNote[] } => {
  const matchingNotes = notes.filter(
    (note): note is VerseStudyNote => note.kind === 'verse' && note.verse.verseKey === verseKey,
  );
  const existing = matchingNotes[0] ?? null;
  const rest = notes.filter((note) => !(note.kind === 'verse' && note.verse.verseKey === verseKey));
  return { existing, rest };
};

export const deleteStudyNoteFromCollection = (notes: StudyNote[], noteId: string): StudyNote[] =>
  sortStudyNotes(notes.filter((note) => note.id !== noteId));

export const saveFreeStudyNoteInCollection = (
  notes: StudyNote[],
  draft: FreeStudyNoteDraft,
  nowIso = new Date().toISOString(),
): CollectionResult<FreeStudyNote> => {
  const existing = draft.id
    ? notes.find((note): note is FreeStudyNote => note.kind === 'free' && note.id === draft.id) ?? null
    : null;

  const note: FreeStudyNote = {
    id: existing?.id ?? draft.id ?? createStudyNoteId(),
    kind: 'free',
    title: draft.title.trim() || 'Untitled',
    userMarkdown: draft.userMarkdown,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  const nextNotes = sortStudyNotes([
    ...notes.filter((existingNote) => existingNote.id !== note.id),
    note,
  ]);

  return { note, notes: nextNotes };
};

export const saveVerseStudyNoteReflectionInCollection = (
  notes: StudyNote[],
  verse: VerseReference,
  userMarkdown: string,
  nowIso = new Date().toISOString(),
): CollectionResult<VerseStudyNote | null> => {
  const { existing, rest } = withoutVerseDuplicates(notes, verse.verseKey);
  const hasUserMarkdown = userMarkdown.trim().length > 0;
  const hasSavedAi = (existing?.aiExplanationMarkdown?.trim().length ?? 0) > 0;

  if (!hasUserMarkdown && !hasSavedAi) {
    return { note: null, notes: rest };
  }

  const note: VerseStudyNote = {
    id: existing?.id ?? createStudyNoteId(),
    kind: 'verse',
    title: buildVerseNoteTitle(verse),
    userMarkdown,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
    verse,
    aiExplanationMarkdown: existing?.aiExplanationMarkdown,
    aiExplanationSource: existing?.aiExplanationSource,
  };

  return {
    note,
    notes: sortStudyNotes([...rest, note]),
  };
};

export const syncVerseAiExplanationInCollection = (
  notes: StudyNote[],
  verse: VerseReference,
  aiExplanationMarkdown: string,
  source: Omit<AiExplanationSource, 'savedAt'>,
  nowIso = new Date().toISOString(),
): CollectionResult<VerseStudyNote> => {
  const { existing, rest } = withoutVerseDuplicates(notes, verse.verseKey);

  const note: VerseStudyNote = {
    id: existing?.id ?? createStudyNoteId(),
    kind: 'verse',
    title: buildVerseNoteTitle(verse),
    userMarkdown: existing?.userMarkdown ?? '',
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
    verse,
    aiExplanationMarkdown,
    aiExplanationSource: {
      ...source,
      savedAt: nowIso,
    },
  };

  return {
    note,
    notes: sortStudyNotes([...rest, note]),
  };
};

export const saveFreeStudyNote = (draft: FreeStudyNoteDraft): FreeStudyNote => {
  const result = saveFreeStudyNoteInCollection(getStudyNotes(), draft);
  persistStudyNotes(result.notes);
  return result.note;
};

export const saveVerseStudyNoteReflection = (verse: VerseReference, userMarkdown: string): VerseStudyNote | null => {
  const result = saveVerseStudyNoteReflectionInCollection(getStudyNotes(), verse, userMarkdown);
  persistStudyNotes(result.notes);
  return result.note;
};

export const syncVerseAiExplanation = (
  verse: VerseReference,
  aiExplanationMarkdown: string,
  source: Omit<AiExplanationSource, 'savedAt'>,
): VerseStudyNote => {
  const result = syncVerseAiExplanationInCollection(getStudyNotes(), verse, aiExplanationMarkdown, source);
  persistStudyNotes(result.notes);
  return result.note;
};

export const deleteStudyNote = (noteId: string): StudyNote[] => persistStudyNotes(deleteStudyNoteFromCollection(getStudyNotes(), noteId));

export {
  LEGACY_NOTES_STORAGE_KEY,
  STUDY_NOTES_STORAGE_KEY,
  STUDY_NOTES_UPDATED_EVENT,
  sortStudyNotes,
};
