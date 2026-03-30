import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch, FiBookmark, FiBookOpen, FiFileText } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
import ThemeToggle from '../../components/common/ThemeToggle';
import PlayPleasentlyButton from '../../components/PleasentPlay/PlayPleasentlyButton';
import ReadWithTafsserButton from '../../components/PleasentPlay/ReadWithTafsserButton';
import { listSurahs, type SurahSummary } from '../../services/apis';
import { JUZ_METADATA } from '../../data/juz';
import { usePlayPleasantly } from '../../components/PleasentPlay/PlayPleasantlyProvider';
import { getBookmarks, type BookmarkedVerse } from '../../utils/quranLocalStorage';

export default function ListSurahsPage() {
  const [chapters, setChapters] = useState<SurahSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [revelationFilter, setRevelationFilter] = useState<'all' | 'makkah' | 'madinah'>('all');
  const [savedVerses, setSavedVerses] = useState<BookmarkedVerse[]>([]);
  const { startExperience, isLoading: isPleasantlyLoading, isActive: isPleasantlyActive } = usePlayPleasantly();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const activeTabParam = searchParams.get('tab');
  const activeTab: 'surahs' | 'juz' | 'saved' =
    activeTabParam === 'juz' || activeTabParam === 'saved' ? activeTabParam : 'surahs';

  const selectTab = useCallback((nextTab: 'surahs' | 'juz' | 'saved') => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextTab === 'surahs') {
      nextSearchParams.delete('tab');
    } else {
      nextSearchParams.set('tab', nextTab);
    }
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setSavedVerses(getBookmarks());
  }, [activeTab]);

  useEffect(() => {
    async function loadChapters() {
      try {
        setLoading(true);
        setError(null);
        const data = await listSurahs();
        setChapters(data);
      } catch (err) {
        console.error("Failed to load chapters:", err);
        setError(err instanceof Error ? err.message : "Failed to load chapters");
      } finally {
        setLoading(false);
      }
    }
    loadChapters();
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
    if (!query) return JUZ_METADATA;

    return JUZ_METADATA.filter((juz) => {
      const numberMatch = juz.number.toString() === query || `juz ${juz.number}`.includes(query);
      const nameMatch = juz.name.toLowerCase().includes(query);
      const sectionMatch = juz.sections.some((section) => {
        const chapter = chaptersById.get(section.surahId);
        return chapter?.nameSimple?.toLowerCase().includes(query);
      });
      return numberMatch || nameMatch || sectionMatch;
    });
  }, [chaptersById, deferredSearchQuery]);

  const headerContent = ({ mobileMenuButton }: { openSidebar: () => void; mobileMenuButton: React.ReactNode }) => (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-center justify-between">
          <div className="shrink-0">{mobileMenuButton}</div>
          <h1 className="text-base font-semibold text-text">Quran</h1>
          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </div>

        <div className="w-full">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              placeholder="Search by name or number..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <select
              aria-label="Content type"
              value={activeTab}
              onChange={(event) => selectTab(event.target.value as 'surahs' | 'juz' | 'saved')}
              className="w-full"
            >
              <option value="surahs">Surahs</option>
              <option value="juz">Juz</option>
              <option value="saved">Saved</option>
            </select>
          </div>

          <div className="flex-1">
            <select
              aria-label="Revelation filter"
              value={revelationFilter}
              onChange={(event) => setRevelationFilter(event.target.value as 'all' | 'makkah' | 'madinah')}
              className="w-full"
              disabled={activeTab !== 'surahs'}
            >
              <option value="all">All</option>
              <option value="makkah">Meccan</option>
              <option value="madinah">Medinan</option>
            </select>
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-3 md:flex lg:flex-nowrap">
        <h1 className="shrink-0 text-base font-semibold text-text">Quran</h1>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            onClick={() => selectTab('surahs')}
            className={`btn-secondary ${activeTab === 'surahs' ? 'bg-surface-2 border-primary' : ''}`}
          >
            Surahs
          </button>
          <button
            onClick={() => selectTab('juz')}
            className={`btn-secondary ${activeTab === 'juz' ? 'bg-surface-2 border-primary' : ''}`}
          >
            Juz
          </button>
          <button
            onClick={() => selectTab('saved')}
            className={`btn-secondary ${activeTab === 'saved' ? 'bg-surface-2 border-primary' : ''}`}
          >
            Saved
          </button>
        </div>

        {activeTab !== 'saved' && (
          <div className="min-w-[220px] flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input
                type="text"
                placeholder="Search by name or number..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pl-10 pr-4"
              />
            </div>
          </div>
        )}

        {activeTab === 'surahs' && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {(['all', 'makkah', 'madinah'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setRevelationFilter(filter)}
                className={`btn-secondary ${revelationFilter === filter ? 'bg-surface-2 border-primary' : ''}`}
              >
                {filter === 'all' ? 'All' : filter === 'makkah' ? 'Meccan' : 'Medinan'}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto shrink-0">
          <ThemeToggle />
        </div>
      </div>
    </>
  );

  return (
      <DashboardLayout
      sidebarItems={[
        { label: "Surahs", icon: <FiBookOpen size={18} />, onClick: () => selectTab('surahs') },
        { label: "Saved", icon: <FiBookmark size={18} />, onClick: () => selectTab('saved') },
        { label: "Notes", icon: <FiFileText size={18} />, path: "/notes" },
      ]}
      headerContent={headerContent}
    >
      <div className="space-y-4">
        {loading && (
          <div className="grid gap-4 lg:grid-cols-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card">
                <div className="flex items-center gap-4 lg:gap-3">
                  <div className="skeleton h-7 w-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="skeleton h-4 w-28 lg:w-24" />
                    <div className="skeleton h-3 w-40" />
                  </div>
                  <div className="hidden shrink-0 items-center gap-2 sm:flex">
                    <div className="skeleton h-6 w-16 lg:w-14" />
                    <div className="flex gap-2">
                      <div className="skeleton h-10 w-24 rounded-xl lg:h-9 lg:w-20" />
                      <div className="skeleton h-10 w-24 rounded-xl lg:h-9 lg:w-20" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="card text-center py-8">
            <p className="text-danger mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && activeTab === 'surahs' && (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredChapters.map((chapter) => (
              <div key={chapter.id} className="card">
                <div className="flex items-center gap-4 lg:gap-3">
                  <Link
                    to={`/surah/${chapter.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <span className="badge-number shrink-0">{chapter.id}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text lg:text-[0.95rem]">{chapter.nameSimple}</p>
                      <p className="text-sm text-text-muted lg:text-[0.82rem]">
                        {chapter.versesCount} verses · {chapter.revelationPlace === 'makkah' ? 'Meccan' : 'Medinan'}
                      </p>
                    </div>
                    <span className="arabic text-lg text-primary hidden sm:block lg:text-base">{chapter.nameArabic}</span>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <PlayPleasentlyButton
                      className="lg:px-3 lg:py-2 lg:text-[0.82rem]"
                      onClick={() => startExperience({
                        title: chapter.nameSimple,
                        subtitle: chapter.nameArabic,
                        segments: [{ surahId: chapter.id, label: chapter.nameSimple }]
                      })}
                      disabled={isPleasantlyLoading || isPleasantlyActive}
                    />
                    <ReadWithTafsserButton
                      className="lg:px-3 lg:py-2 lg:text-[0.82rem]"
                      onClick={() => navigate(`/surah/${chapter.id}?tafsir=ai`)}
                    />
                  </div>
                </div>
              </div>
            ))}

            {filteredChapters.length === 0 && (
              <div className="card py-8 text-center text-text-muted lg:col-span-2">
                No surahs found for "{deferredSearchQuery}"
              </div>
            )}
          </div>
        )}

        {!loading && !error && activeTab === 'juz' && (
          <div className="space-y-4">
            {filteredJuz.map((juz) => (
              <div key={juz.number} className="card">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="font-medium text-text">{juz.name}</p>
                    <p className="text-sm text-text-muted">{juz.summary}</p>
                  </div>
                  <span className="arabic text-primary">{juz.arabicName}</span>
                </div>

                <div className="space-y-1">
                  {juz.sections.map((section) => {
                    const chapter = chaptersById.get(section.surahId);
                    return (
                      <Link
                        key={`${juz.number}-${section.surahId}`}
                        to={`/surah/${section.surahId}?start=${section.startAyah}&end=${section.endAyah}&juz=${juz.number}`}
                        className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-surface-2 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="badge-number text-xs">{section.surahId}</span>
                          <span className="text-sm font-medium text-text">
                            {chapter?.nameSimple || `Surah ${section.surahId}`}
                          </span>
                        </div>
                        <span className="text-xs text-text-muted">
                          {section.startAyah} - {section.endAyah}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                  <PlayPleasentlyButton
                    onClick={() => {
                      const segments = juz.sections.map(s => ({
                        surahId: s.surahId,
                        startAyah: s.startAyah,
                        endAyah: s.endAyah,
                        label: `${chaptersById.get(s.surahId)?.nameSimple || `Surah ${s.surahId}`} - ${s.startAyah}-${s.endAyah}`
                      }));
                      startExperience({
                        title: `Juz ${juz.number}`,
                        subtitle: juz.name,
                        segments
                      });
                    }}
                    disabled={isPleasantlyLoading || isPleasantlyActive}
                  />
                </div>
              </div>
            ))}

            {filteredJuz.length === 0 && (
              <div className="card text-center py-8 text-text-muted">
                No juz found for "{searchQuery}"
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-2">
            {savedVerses.length === 0 ? (
              <div className="card text-center py-12">
                <FiBookmark size={32} className="mx-auto mb-4 text-text-muted" />
                <p className="text-text-muted">No saved verses yet</p>
                <p className="text-sm text-text-muted mt-1">Bookmark verses while reading to save them here</p>
              </div>
            ) : (
              savedVerses.map((verse) => (
                <Link
                  key={verse.verseKey}
                  to={`/surah/${verse.surahId}?ayah=${verse.ayahNumber}`}
                  className="card block hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-primary">
                          {verse.surahName}
                        </span>
                        <span className="text-xs text-text-muted">
                          {verse.surahNameArabic}
                        </span>
                        <span className="badge-number text-xs">
                          {verse.ayahNumber}
                        </span>
                      </div>
                      <p className="arabic text-lg text-text text-right mb-2" dir="rtl">
                        {verse.arabicText}
                      </p>
                      <p className="text-sm text-text-muted line-clamp-2">
                        {verse.translation}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
