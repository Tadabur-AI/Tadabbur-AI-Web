import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { BiBook, BiSearch } from 'react-icons/bi';
import LogoLandscape from '../../components/common/LogoLandscape';
import { listSurahs, type SurahSummary } from '../../services/apis';
import { JUZ_METADATA } from '../../data/juz';

export default function ListSurahsPage() {
    const [chapters, setChapters] = useState<SurahSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [revelationFilter, setRevelationFilter] = useState<'all' | 'makkah' | 'madinah'>('all');
    const [activeTab, setActiveTab] = useState<'surahs' | 'juz'>('surahs');

    useEffect(() => {
        async function loadChapters() {
            try {
                setLoading(true);
                setError(null);
                const data = await listSurahs();
                setChapters(data);
            } catch (err) {
                console.error('Failed to load chapters:', err);
                setError(err instanceof Error ? err.message : 'Failed to load chapters');
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
            const matchesSearch = !query || (
                chapter.nameSimple.toLowerCase().includes(query) ||
                chapter.nameArabic.includes(query) ||
                chapter.translatedName.name.toLowerCase().includes(query) ||
                chapter.id.toString() === query
            );
            const matchesRevelation = revelationFilter === 'all' || chapter.revelationPlace === revelationFilter;
            return matchesSearch && matchesRevelation;
        });
    }, [chapters, revelationFilter, searchQuery]);

    const filteredJuz = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) {
            return JUZ_METADATA;
        }

        return JUZ_METADATA.filter((juz) => {
            const normalizedNumber = `juz ${juz.number}`;
            const numberMatch =
                juz.number.toString() === query ||
                normalizedNumber === query ||
                normalizedNumber.replace(' ', '') === query ||
                normalizedNumber.includes(query);
            const nameMatch = juz.name.toLowerCase().includes(query) || juz.arabicName.toLowerCase().includes(query);
            const summaryMatch = juz.summary.toLowerCase().includes(query);
            const sectionMatch = juz.sections.some((section) => {
                const chapter = chaptersById.get(section.surahId);
                const englishName = chapter?.nameSimple?.toLowerCase();
                const arabicName = chapter?.nameArabic;
                const translated = chapter?.translatedName.name?.toLowerCase();
                const surahIdMatch = section.surahId.toString() === query;
                const rangeStrings = [
                    `${section.surahId}:${section.startAyah}`,
                    `${section.surahId}:${section.endAyah}`,
                    `${section.surahId}:${section.startAyah}-${section.endAyah}`,
                ];
                const rangeMatch = rangeStrings.some((value) => value.toLowerCase() === query || value.toLowerCase().includes(query));
                return (
                    surahIdMatch ||
                    (englishName && englishName.includes(query)) ||
                    (arabicName && arabicName.includes(query)) ||
                    (translated && translated.includes(query)) ||
                    rangeMatch
                );
            });

            return numberMatch || nameMatch || summaryMatch || sectionMatch;
        });
    }, [chaptersById, searchQuery]);

    const searchPlaceholder = activeTab === 'surahs'
        ? 'Search by surah name or number...'
        : 'Search by Juz number, surah, or ayah reference (e.g. 2:142)';

    return (
        <DashboardLayout
        sidebarItems={[{
            label: 'Surahs',
            path: '/surahs',
            icon: <BiBook /> 
        }]}
        screenTitle={<LogoLandscape />}
        userProfile={null} // Replace with actual user profile if needed
        >
        <div className="p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">List of Surahs</h1>

                {/* Tabs */}
                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setActiveTab('surahs')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            activeTab === 'surahs'
                                ? 'bg-primary text-white'
                                : 'border border-gray-300 bg-white text-gray-700 hover:border-primary'
                        }`}
                    >
                        Surahs
                    </button>
                    <button
                        onClick={() => setActiveTab('juz')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            activeTab === 'juz'
                                ? 'bg-primary text-white'
                                : 'border border-gray-300 bg-white text-gray-700 hover:border-primary'
                        }`}
                    >
                        Juz
                    </button>
                </div>
                
                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative">
                        <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    {searchQuery && (
                        <p className="mt-2 text-sm text-gray-600">
                            {activeTab === 'surahs'
                                ? `Found ${filteredChapters.length} surah${filteredChapters.length !== 1 ? 's' : ''}`
                                : `Found ${filteredJuz.length} juz`}
                        </p>
                    )}
                </div>

                {/* Revelation Filter */}
                {activeTab === 'surahs' && (
                    <div className="mb-6 flex gap-2 flex-wrap">
                        <button
                            onClick={() => setRevelationFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                revelationFilter === 'all'
                                    ? 'bg-primary text-white'
                                    : 'border border-gray-300 bg-white text-gray-700 hover:border-primary'
                            }`}
                        >
                            All Surahs
                        </button>
                        <button
                            onClick={() => setRevelationFilter('makkah')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                revelationFilter === 'makkah'
                                    ? 'bg-primary text-white'
                                    : 'border border-gray-300 bg-white text-gray-700 hover:border-primary'
                            }`}
                        >
                            Meccan (مكي)
                        </button>
                        <button
                            onClick={() => setRevelationFilter('madinah')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                revelationFilter === 'madinah'
                                    ? 'bg-primary text-white'
                                    : 'border border-gray-300 bg-white text-gray-700 hover:border-primary'
                            }`}
                        >
                            Medinan (مدني)
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                        <p className="mt-2 text-gray-600">Loading surahs...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                        <p className="text-red-800">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Chapters List */}
                {!loading && !error && (
                    <>
                        {activeTab === 'surahs' ? (
                            <ul className="space-y-2">
                                {filteredChapters.length > 0 ? (
                                    filteredChapters.map((chapter) => (
                                        <li key={chapter.id} className="border border-gray-200 rounded-lg p-3 hover:border-primary hover:bg-gray-50 transition-colors">
                                            <Link to={`/surah/${chapter.id}`} className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                                        {chapter.id}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-gray-900">
                                                            {chapter.nameSimple}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            {chapter.versesCount} verses - {chapter.revelationPlace === 'makkah' ? 'Meccan' : 'Medinan'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="text-xl text-primary font-arabic shrink-0">{chapter.nameArabic}</p>
                                            </Link>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-center py-8 text-gray-500">
                                        No surahs found matching "{searchQuery}"
                                    </li>
                                )}
                            </ul>
                        ) : (
                            <ul className="space-y-3">
                                {filteredJuz.length > 0 ? (
                                    filteredJuz.map((juz) => (
                                        <li key={juz.number} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-primary">Juz {juz.number}</p>
                                                    <p className="text-lg font-semibold text-gray-900">{juz.name}</p>
                                                    <p className="text-sm text-gray-600">{juz.summary}</p>
                                                </div>
                                                <span className="text-xl text-primary font-arabic">{juz.arabicName}</span>
                                            </div>
                                            <div className="mt-4 space-y-2">
                                                {juz.sections.map((section) => {
                                                    const chapter = chaptersById.get(section.surahId);
                                                    const englishName = chapter?.nameSimple ?? `Surah ${section.surahId}`;
                                                    const arabicName = chapter?.nameArabic;
                                                    const query = new URLSearchParams({
                                                        start: String(section.startAyah),
                                                        end: String(section.endAyah),
                                                        juz: String(juz.number),
                                                    }).toString();

                                                    return (
                                                        <Link
                                                            key={`${juz.number}-${section.surahId}-${section.startAyah}`}
                                                            to={`/surah/${section.surahId}?${query}`}
                                                            className="flex flex-col gap-1 rounded-md border border-gray-200 px-3 py-2 transition-colors hover:border-primary hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                                                        >
                                                            <div>
                                                                <p className="font-medium text-gray-900">{englishName}</p>
                                                                {arabicName && <p className="text-primary font-arabic text-lg">{arabicName}</p>}
                                                            </div>
                                                            <p className="text-sm text-gray-600">Ayat {section.startAyah} - {section.endAyah}</p>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-center py-8 text-gray-500">
                                        No juz found matching "{searchQuery}"
                                    </li>
                                )}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </div>
        </DashboardLayout>
    );
}
