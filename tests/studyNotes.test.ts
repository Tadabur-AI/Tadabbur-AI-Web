import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deleteStudyNoteFromCollection,
  getVerseStudyNoteFromCollection,
  migrateLegacyNotes,
  saveVerseStudyNoteReflectionInCollection,
  syncVerseAiExplanationInCollection,
  type StudyNote,
  type VerseReference,
} from '../src/utils/studyNotes';

const verse: VerseReference = {
  verseKey: '1:1',
  surahId: 1,
  surahName: 'Al-Fatihah',
  surahNameArabic: 'الفاتحة',
  ayahNumber: 1,
  arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
};

test('migrateLegacyNotes preserves legacy note content and timestamps', () => {
  const migrated = migrateLegacyNotes([
    {
      id: 'legacy-1',
      title: 'Old Reflection',
      content: 'Legacy markdown',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ]);

  assert.equal(migrated.length, 1);
  assert.equal(migrated[0]?.kind, 'free');
  assert.equal(migrated[0]?.id, 'legacy-1');
  assert.equal(migrated[0]?.title, 'Old Reflection');
  assert.equal(migrated[0]?.userMarkdown, 'Legacy markdown');
  assert.equal(migrated[0]?.createdAt, '2024-01-01T00:00:00.000Z');
  assert.equal(migrated[0]?.updatedAt, '2024-01-02T00:00:00.000Z');
});

test('saveVerseStudyNoteReflectionInCollection creates one canonical verse note and removes duplicates', () => {
  const notes: StudyNote[] = [
    {
      id: 'old-1',
      kind: 'verse',
      title: 'Duplicate 1',
      userMarkdown: 'Older',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      verse,
      aiExplanationMarkdown: 'Saved AI',
      aiExplanationSource: {
        tafsirId: 169,
        tafsirName: 'Ibn Kathir',
        savedAt: '2024-01-01T00:00:00.000Z',
      },
    },
    {
      id: 'old-2',
      kind: 'verse',
      title: 'Duplicate 2',
      userMarkdown: 'Newer',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      verse,
    },
  ];

  const result = saveVerseStudyNoteReflectionInCollection(notes, verse, 'Fresh reflection', '2024-01-03T00:00:00.000Z');

  assert.equal(result.notes.filter((note) => note.kind === 'verse' && note.verse.verseKey === verse.verseKey).length, 1);
  assert.equal(result.note?.userMarkdown, 'Fresh reflection');
  assert.equal(result.note?.aiExplanationMarkdown, 'Saved AI');
});

test('getVerseStudyNoteFromCollection finds a note by verse key', () => {
  const notes: StudyNote[] = [
    {
      id: 'verse-note',
      kind: 'verse',
      title: 'Verse Note',
      userMarkdown: 'Reflection',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      verse,
    },
  ];

  const found = getVerseStudyNoteFromCollection(notes, '1:1');

  assert.ok(found);
  assert.equal(found?.id, 'verse-note');
});

test('syncVerseAiExplanationInCollection updates AI without overwriting user reflection', () => {
  const notes: StudyNote[] = [
    {
      id: 'verse-note',
      kind: 'verse',
      title: 'Verse Note',
      userMarkdown: 'My reflection',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      verse,
      aiExplanationMarkdown: 'Old AI',
      aiExplanationSource: {
        tafsirId: 169,
        tafsirName: 'Ibn Kathir',
        savedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  ];

  const result = syncVerseAiExplanationInCollection(
    notes,
    verse,
    'New AI',
    { tafsirId: 170, tafsirName: 'Al-Tabari' },
    '2024-01-03T00:00:00.000Z',
  );

  assert.equal(result.note.userMarkdown, 'My reflection');
  assert.equal(result.note.aiExplanationMarkdown, 'New AI');
  assert.equal(result.note.aiExplanationSource?.tafsirId, 170);
});

test('deleteStudyNoteFromCollection removes the selected note', () => {
  const notes: StudyNote[] = [
    {
      id: 'free-note',
      kind: 'free',
      title: 'Free note',
      userMarkdown: 'Keep me?',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'verse-note',
      kind: 'verse',
      title: 'Verse Note',
      userMarkdown: 'Reflection',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      verse,
    },
  ];

  const remaining = deleteStudyNoteFromCollection(notes, 'free-note');

  assert.equal(remaining.length, 1);
  assert.equal(remaining[0]?.id, 'verse-note');
});
