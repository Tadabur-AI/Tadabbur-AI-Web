import { useCallback, useDeferredValue, useEffect, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiBookmark, FiBookOpen, FiHeadphones, FiSearch } from 'react-icons/fi';
import AppShell from '../../layouts/AppShell';
import {
  ActionButton,
  EmptyState,
  Field,
  Panel,
  SegmentedControl,
} from '../../components/ui/primitives';
import PlayPleasentlyButton from '../../components/PleasentPlay/PlayPleasentlyButton';
import { buttonClassName } from '../../components/ui/buttonClassName';
import { listSurahs, type SurahSummary } from '../../services/apis';
import { JUZ_METADATA } from '../../data/juz';
import { usePlayPleasantly } from '../../components/PleasentPlay/PlayPleasantlyProvider';
import { getBookmarks, type BookmarkedVerse } from '../../utils/quranLocalStorage';

type QuranTab = 'surahs' | 'juz' | 'saved';

const quranTabs: Array<{ value: QuranTab; label: string }> = [
  { value: 'surahs', label: 'Surahs' },
  { value: 'juz', label: 'Juz' },
  { value: 'saved', label: 'Saved' },
];

const revelationFilters = [
  { value: 'all', label: 'All Places' },
  { value: 'makkah', label: 'Meccan' },
  { value: 'madinah', label: 'Medinan' },
] as const;

const tadabburVerse = 'أَفَلَا يَتَدَبَّرُونَ ٱلْقُرْءَانَ أَمْ عَلَىٰ قُلُوبٍ أَقْفَالُهَآ';
const tadabburVerseTranslation = "Then do they not reflect upon the Qur'an, or are there locks upon [their] hearts?";

export default function ListSurahsPage() {
  const searchFieldId = useId();
  const [chapters, setChapters] = useState<SurahSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [revelationFilter, setRevelationFilter] = useState<'all' | 'makkah' | 'madinah'>('all');
  const [savedVerses, setSavedVerses] = useState<BookmarkedVerse[]>([]);
  const { startExperience, isLoading: isPleasantlyLoading, isActive: isPleasantlyActive } = usePlayPleasantly();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab');
  const activeTab: QuranTab =
    activeTabParam === 'juz' || activeTabParam === 'saved' ? activeTabParam : 'surahs';

  const selectTab = useCallback((nextTab: QuranTab) => {
    setSearchParams((current) => {
      const nextSearchParams = new URLSearchParams(current);
      if (nextTab === 'surahs') {
        nextSearchParams.delete('tab');
      } else {
        nextSearchParams.set('tab', nextTab);
      }
      return nextSearchParams;
    });
  }, [setSearchParams]);

  useEffect(() => {
    if (activeTab === 'saved') {
      setSavedVerses(getBookmarks());
    }
  }, [activeTab]);

  useEffect(() => {
    let ignore = false;

    async function loadChapters() {
      try {
        setLoading(true);
        setError(null);
        const data = await listSurahs();
        if (!ignore) {
          setChapters(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load chapters:', err);
          setError(err instanceof Error ? err.message : 'Failed to load chapters.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadChapters();
    return () => {
      ignore = true;
    };
  }, []);

  const chaptersById = useMemo(() => {
    const lookup = new Map<number, SurahSummary>();
    chapters.forEach((chapter) => lookup.set(chapter.id, chapter));
    return lookup;
  }, [chapters]);

  const filteredChapters = useMemo(() => {
    const query = deferredSearchQuery.toLowerCase().trim();

    return chapters.filter((chapter) => {
      const matchesSearch =
        !query ||
        chapter.nameSimple.toLowerCase().includes(query) ||
        chapter.nameArabic.includes(query) ||
        chapter.translatedName.name.toLowerCase().includes(query) ||
        chapter.id.toString() === query;
      const matchesRevelation =
        revelationFilter === 'all' ||
        chapter.revelationPlace === revelationFilter;

      return matchesSearch && matchesRevelation;
    });
  }, [chapters, deferredSearchQuery, revelationFilter]);

  const filteredJuz = useMemo(() => {
    const query = deferredSearchQuery.toLowerCase().trim();
    if (!query) {
      return JUZ_METADATA;
    }

    return JUZ_METADATA.filter((juz) => {
      const numberMatch = juz.number.toString() === query || `juz ${juz.number}`.includes(query);
      const nameMatch = juz.name.toLowerCase().includes(query);
      const sectionMatch = juz.sections.some((section) => {
        const chapter = chaptersById.get(section.surahId);
        return chapter?.nameSimple.toLowerCase().includes(query);
      });

      return numberMatch || nameMatch || sectionMatch;
    });
  }, [chaptersById, deferredSearchQuery]);

  return (
    <AppShell activeNav="quran">
      <div className="relative overflow-x-hidden">
        <div aria-hidden="true" className="surahs-cover-orbit" />

        <div className="relative z-[1] space-y-6">
          <header className="page-header">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/images/product-logo.svg"
                  alt=""
                  aria-hidden="true"
                  width="48"
                  height="48"
                  className="h-12 w-12 shrink-0"
                />
                <h1 className="text-3xl font-semibold tracking-tight text-text text-balance sm:text-4xl">
                  Tadabbur-AI
                </h1>
              </div>
              <div className="surahs-hero-copy max-w-4xl space-y-3">
                <p
                  className="surahs-hero-verse quran-text"
                  dir="rtl"
                >
                  <span className="surahs-hero-verse__text">{tadabburVerse}</span>
                </p>
                <p className="surahs-hero-translation">
                  {tadabburVerseTranslation}
                </p>
              </div>
            </div>
          </header>

          <Panel>
            <div role="search" aria-label="Quran browse filters" className="space-y-4">
              <div className="max-w-3xl">
                <Field
                  label="Search"
                  htmlFor={searchFieldId}
                  labelHidden
                >
                  <div className="relative">
                    <FiSearch
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                      aria-hidden="true"
                      size={18}
                    />
                    <input
                      id={searchFieldId}
                      type="search"
                      name="quran_search"
                      autoComplete="off"
                      inputMode="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search surahs, juz, or saved ayat…"
                      className="field-control pl-11"
                    />
                  </div>
                </Field>
              </div>

              <div className="flex flex-wrap gap-4">
                <SegmentedControl
                  labelHidden
                  label="Browse"
                  value={activeTab}
                  items={quranTabs}
                  onChange={selectTab}
                />

                {activeTab === 'surahs' ? (
                  <SegmentedControl
                    label="Revelation Place"
                    labelHidden
                    value={revelationFilter}
                    items={revelationFilters.map((item) => ({ value: item.value, label: item.label }))}
                    onChange={setRevelationFilter}
                  />
                ) : null}
              </div>
            </div>
          </Panel>

          {loading ? (
          <Panel title="Loading surahs" description="Fetching the list.">
            <div className="space-y-3" aria-live="polite">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="flex items-center gap-4 rounded-[22px] border border-border bg-surface px-4 py-4">
                  <div className="skeleton h-10 w-10 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="skeleton h-4 w-40" />
                    <div className="skeleton h-3 w-52" />
                  </div>
                  <div className="skeleton h-10 w-24 rounded-full" />
                </div>
              ))}
            </div>
          </Panel>
          ) : null}

          {error ? (
          <EmptyState
            title="Could not load surahs"
            description={error}
            icon={<FiBookOpen size={20} />}
            action={
              <ActionButton onClick={() => window.location.reload()}>
                Try Again
              </ActionButton>
            }
          />
          ) : null}

          {!loading && !error && activeTab === 'surahs' ? (
          filteredChapters.length > 0 ? (
            <section aria-labelledby="surah-results-heading" className="space-y-3">
              <h2 id="surah-results-heading" className="sr-only">
                Surah results
              </h2>
              <ul className="space-y-3" role="list">
                {filteredChapters.map((chapter) => (
                  <li key={chapter.id} className="content-auto-card">
                    <article className="grid gap-4 rounded-[24px] border border-border bg-surface px-4 py-4 shadow-[0_12px_32px_rgba(20,20,18,0.05)] sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto]">
                      <Link
                        to={`/surah/${chapter.id}`}
                        className="group flex min-w-0 items-start gap-4 rounded-[20px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                      >
                        <span className="surah-wheel-badge mt-1" aria-label={`Surah ${chapter.id}`}>
                          {chapter.id}
                        </span>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex min-w-0 flex-wrap items-baseline gap-3">
                            <h3 className="truncate text-lg font-semibold text-text group-hover:text-primary">
                              {chapter.nameSimple}
                            </h3>
                            <span className="arabic-ui text-lg leading-none text-text-muted">
                              {chapter.nameArabic}
                            </span>
                          </div>
                          <p className="text-sm leading-6 text-text-muted">
                            {chapter.translatedName.name} · {chapter.versesCount} verses · {chapter.revelationPlace === 'makkah' ? 'Meccan' : 'Medinan'}
                          </p>
                        </div>
                      </Link>

                      <div className="flex items-center justify-end">
                        <div className="inline-flex items-stretch overflow-hidden rounded-full border border-border bg-surface shadow-[0_12px_32px_rgba(20,20,18,0.05)]">
                          <Link
                            to={`/surah/${chapter.id}`}
                            className={`${buttonClassName({ variant: 'primary' })} rounded-none border-0 px-5 shadow-none focus-visible:relative focus-visible:z-10`}
                          >
                            Read
                          </Link>
                          <button
                            type="button"
                            onClick={() => startExperience({
                              title: chapter.nameSimple,
                              subtitle: chapter.nameArabic,
                              segments: [{ surahId: chapter.id, label: chapter.nameSimple }],
                            })}
                            disabled={isPleasantlyLoading || isPleasantlyActive}
                            aria-label={`Play ${chapter.nameSimple} pleasantly`}
                            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center border-l border-border bg-surface px-3 text-text transition-colors hover:bg-surface-2 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <FiHeadphones size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <EmptyState
              title="No surahs matched that search"
              description="Try another name or number."
              icon={<FiSearch size={20} />}
            />
          )
          ) : null}

          {!loading && !error && activeTab === 'juz' ? (
          filteredJuz.length > 0 ? (
            <section aria-labelledby="juz-results-heading" className="space-y-4">
              <h2 id="juz-results-heading" className="sr-only">
                Juz results
              </h2>
              <ol className="space-y-4">
                {filteredJuz.map((juz) => (
                  <li key={juz.number} className="content-auto-card">
                    <Panel
                      title={`Juz ${juz.number}`}
                      description={`${juz.name} · ${juz.summary}`}
                      actions={
                        <PlayPleasentlyButton
                          label="Play Pleasantly"
                          onClick={() => {
                            const segments = juz.sections.map((section) => ({
                              surahId: section.surahId,
                              startAyah: section.startAyah,
                              endAyah: section.endAyah,
                              label: `${chaptersById.get(section.surahId)?.nameSimple || `Surah ${section.surahId}`} ${section.startAyah}-${section.endAyah}`,
                            }));

                            startExperience({
                              title: `Juz ${juz.number}`,
                              subtitle: juz.name,
                              segments,
                            });
                          }}
                          disabled={isPleasantlyLoading || isPleasantlyActive}
                        />
                      }
                    >
                      <p className="arabic-ui text-lg text-text-muted">{juz.arabicName}</p>

                      <ul className="space-y-2" role="list">
                        {juz.sections.map((section) => {
                          const chapter = chaptersById.get(section.surahId);

                          return (
                            <li key={`${juz.number}-${section.surahId}`}>
                              <Link
                                to={`/surah/${section.surahId}?start=${section.startAyah}&end=${section.endAyah}&juz=${juz.number}`}
                                className="flex items-center justify-between gap-4 rounded-[18px] border border-border/80 bg-background px-4 py-3 transition-colors hover:border-primary/50 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="badge-number text-xs">{section.surahId}</span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-text">
                                      {chapter?.nameSimple || `Surah ${section.surahId}`}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                      Ayat {section.startAyah} to {section.endAyah}
                                    </p>
                                  </div>
                                </div>
                                <span className="arabic-ui shrink-0 text-sm text-text-muted">
                                  {chapter?.nameArabic}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </Panel>
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <EmptyState
              title="No juz matched that search"
              description="Try another juz name or number."
              icon={<FiSearch size={20} />}
            />
          )
          ) : null}

          {!loading && !error && activeTab === 'saved' ? (
          savedVerses.length > 0 ? (
            <section aria-labelledby="saved-verses-heading" className="space-y-3">
              <h2 id="saved-verses-heading" className="sr-only">
                Saved verses
              </h2>
              <ul className="space-y-3" role="list">
                {savedVerses.map((verse) => (
                  <li key={verse.verseKey} className="content-auto-card">
                    <article>
                      <Link
                        to={`/surah/${verse.surahId}?ayah=${verse.ayahNumber}`}
                        className="block rounded-[24px] border border-border bg-surface px-4 py-4 shadow-[0_12px_32px_rgba(20,20,18,0.05)] transition-colors hover:border-primary/50 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:px-5"
                      >
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-semibold text-primary">{verse.surahName}</span>
                            <span className="arabic-ui text-sm text-text-muted">{verse.surahNameArabic}</span>
                            <span className="badge-number text-xs">{verse.ayahNumber}</span>
                          </div>
                          <p className="arabic text-2xl leading-[2.5rem] text-text" dir="rtl">
                            {verse.arabicText}
                          </p>
                          <p className="max-w-4xl text-sm leading-7 text-text-muted">{verse.translation}</p>
                        </div>
                      </Link>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <EmptyState
              title="No saved verses yet"
              description="Saved ayat will appear here."
              icon={<FiBookmark size={20} />}
            />
          )
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
