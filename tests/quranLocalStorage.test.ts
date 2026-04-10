import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearReadingProgress,
  createEmptyReadingProgress,
  getReadingProgress,
  normalizeReadingProgress,
  updateReadingProgress,
  type ReadingProgressInput,
} from '../src/utils/quranLocalStorage';

const STORAGE_KEY = 'tadabbur_reading_progress_v1';

const createStorageMock = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

const installStorageMock = () => {
  const localStorageMock = createStorageMock();
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: localStorageMock },
    configurable: true,
  });
  return localStorageMock;
};

const buildEntry = (surahId: number, ayahNumber = 1): ReadingProgressInput => ({
  verseKey: `${surahId}:${ayahNumber}`,
  surahId,
  surahName: `Surah ${surahId}`,
  surahNameArabic: `سورة ${surahId}`,
  ayahNumber,
  versesCount: 10,
});

test('getReadingProgress returns empty progress when storage has no value', () => {
  installStorageMock();

  const progress = getReadingProgress();

  assert.equal(progress.lastRead, null);
  assert.deepEqual(progress.recentReads, []);
  assert.deepEqual(progress.dailyStats, {});
});

test('updateReadingProgress stores the latest verse as lastRead', () => {
  const progress = updateReadingProgress(
    createEmptyReadingProgress(),
    buildEntry(1, 1),
    '2024-01-01T00:00:00.000Z',
  );

  assert.equal(progress.lastRead?.verseKey, '1:1');
  assert.equal(progress.lastRead?.surahName, 'Surah 1');
  assert.equal(progress.recentReads.length, 1);
  assert.equal(progress.dailyStats['2024-01-01']?.ayatRead, 1);
});

test('updateReadingProgress keeps one recent read per surah', () => {
  const firstProgress = updateReadingProgress(
    createEmptyReadingProgress(),
    buildEntry(2, 1),
    '2024-01-01T00:00:00.000Z',
  );
  const nextProgress = updateReadingProgress(firstProgress, buildEntry(2, 2), '2024-01-01T00:01:00.000Z');

  assert.equal(nextProgress.lastRead?.verseKey, '2:2');
  assert.equal(nextProgress.recentReads.length, 1);
  assert.equal(nextProgress.recentReads[0]?.verseKey, '2:2');
  assert.equal(nextProgress.dailyStats['2024-01-01']?.ayatRead, 2);
});

test('updateReadingProgress caps recent reads at five unique surahs', () => {
  const progress = [1, 2, 3, 4, 5, 6].reduce(
    (currentProgress, surahId) =>
      updateReadingProgress(currentProgress, buildEntry(surahId, 1), `2024-01-01T00:0${surahId}:00.000Z`),
    createEmptyReadingProgress(),
  );

  assert.equal(progress.recentReads.length, 5);
  assert.deepEqual(progress.recentReads.map((entry) => entry.surahId), [6, 5, 4, 3, 2]);
});

test('updateReadingProgress does not increment today when the same verse is saved twice in a row', () => {
  const firstProgress = updateReadingProgress(
    createEmptyReadingProgress(),
    buildEntry(3, 3),
    '2024-01-01T00:00:00.000Z',
  );
  const nextProgress = updateReadingProgress(firstProgress, buildEntry(3, 3), '2024-01-01T00:02:00.000Z');

  assert.equal(nextProgress.dailyStats['2024-01-01']?.ayatRead, 1);
  assert.equal(nextProgress.dailyStats['2024-01-01']?.lastVerseKey, '3:3');
});

test('normalizeReadingProgress returns empty progress for malformed data', () => {
  const progress = normalizeReadingProgress({
    lastRead: { verseKey: '', surahId: 'bad' },
    recentReads: ['bad-entry'],
    dailyStats: { today: { ayatRead: 'bad' } },
  });

  assert.equal(progress.lastRead, null);
  assert.deepEqual(progress.recentReads, []);
  assert.deepEqual(progress.dailyStats, {});
});

test('clearReadingProgress removes the stored progress value', () => {
  const localStorageMock = installStorageMock();
  const progress = updateReadingProgress(
    createEmptyReadingProgress(),
    buildEntry(4, 4),
    '2024-01-01T00:00:00.000Z',
  );
  localStorageMock.setItem(STORAGE_KEY, JSON.stringify(progress));

  clearReadingProgress();

  assert.equal(localStorageMock.getItem(STORAGE_KEY), null);
});
