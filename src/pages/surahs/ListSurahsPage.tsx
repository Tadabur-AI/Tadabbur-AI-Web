import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiBookmark, FiBookOpen } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
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
  const [activeTab, setActiveTab] = useState<'surahs' | 'juz' | 'saved'>('surahs');
  const [savedVerses, setSavedVerses] = useState<BookmarkedVerse[]>([]);
  const { startExperience, isLoading: isPleasantlyLoading, isActive: isPleasantlyActive } = usePlayPleasantly();
  const navigate = useNavigate();

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
    const query = searchQuery.toLowerCase().trim();
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
  }, [chapters, revelationFilter, searchQuery]);

  const filteredJuz = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
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
  }, [chaptersById, searchQuery]);

  return (
    <DashboardLayout
      sidebarItems={[
        { label: "Surahs", icon: <FiBookOpen size={18} />, path: "/surahs" },
        { label: "Saved", icon: <FiBookmark size={18} />, onClick: () => setActiveTab('saved') },
      ]}
      screenTitle="Quran"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('surahs')}
              className={`btn-secondary ${activeTab === 'surahs' ? 'bg-surface-2 border-primary' : ''}`}
            >
              Surahs
            </button>
            <button
              onClick={() => setActiveTab('juz')}
              className={`btn-secondary ${activeTab === 'juz' ? 'bg-surface-2 border-primary' : ''}`}
            >
              Juz
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`btn-secondary ${activeTab === 'saved' ? 'bg-surface-2 border-primary' : ''}`}
            >
              Saved
            </button>
          </div>

          {activeTab !== 'saved' && (
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4"
                />
              </div>
            </div>
          )}
        </div>

        {activeTab === 'surahs' && (
          <div className="flex gap-2">
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

        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card">
                <div className="flex items-center gap-4">
                  <div className="skeleton w-7 h-7 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-32" />
                    <div className="skeleton h-3 w-48" />
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
          <div className="space-y-2">
            {filteredChapters.map((chapter) => (
              <div key={chapter.id} className="card">
                <div className="flex items-center gap-4">
                  <Link
                    to={`/surah/${chapter.id}`}
                    className="flex items-center gap-4 flex-1 min-w-0"
                  >
                    <span className="badge-number">{chapter.id}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text truncate">{chapter.nameSimple}</p>
                      <p className="text-sm text-text-muted">
                        {chapter.versesCount} verses · {chapter.revelationPlace === 'makkah' ? 'Meccan' : 'Medinan'}
                      </p>
                    </div>
                    <span className="arabic text-lg text-primary hidden sm:block">{chapter.nameArabic}</span>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <PlayPleasentlyButton
                      onClick={() => startExperience({
                        title: chapter.nameSimple,
                        subtitle: chapter.nameArabic,
                        segments: [{ surahId: chapter.id, label: chapter.nameSimple }]
                      })}
                      disabled={isPleasantlyLoading || isPleasantlyActive}
                    />
                    <ReadWithTafsserButton
                      onClick={() => navigate(`/surah/${chapter.id}?tafsir=ai`)}
                    />
                  </div>
                </div>
              </div>
            ))}

            {filteredChapters.length === 0 && (
              <div className="card text-center py-8 text-text-muted">
                No surahs found for "{searchQuery}"
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
                        to={`/surah/${section.surahId}?start=${section.startAyah}&end=${section.endAyah}`}
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
