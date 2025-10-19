import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { BiBook, BiSearch } from 'react-icons/bi';
import LogoLandscape from '../../components/common/LogoLandscape';
import { fetchChapters, type Chapter } from '../../services/quranResourcesService';

export default function ListSurahsPage() {
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function loadChapters() {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchChapters();
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

    const filteredChapters = chapters.filter((chapter) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        
        return (
            chapter.name_simple.toLowerCase().includes(query) ||
            chapter.name_arabic.includes(query) ||
            chapter.translated_name.name.toLowerCase().includes(query) ||
            chapter.id.toString() === query
        );
    });

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
                
                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative">
                        <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    {searchQuery && (
                        <p className="mt-2 text-sm text-gray-600">
                            Found {filteredChapters.length} surah{filteredChapters.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>

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
                                                    {chapter.name_simple}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {chapter.verses_count} verses • {chapter.revelation_place === 'makkah' ? 'Meccan' : 'Medinan'}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xl text-primary font-arabic shrink-0">{chapter.name_arabic}</p>
                                    </Link>
                                </li>
                            ))
                        ) : (
                            <li className="text-center py-8 text-gray-500">
                                No surahs found matching "{searchQuery}"
                            </li>
                        )}
                    </ul>
                )}
            </div>
        </div>
        </DashboardLayout>
    );
}
