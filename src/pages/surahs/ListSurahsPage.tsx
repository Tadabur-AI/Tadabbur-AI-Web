import { useEffect, useState } from 'react';
import { getSurahById } from 'quran-english';
import type { Surah } from 'quran-english';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { BiBook, BiSearch } from 'react-icons/bi';
import LogoLandscape from '../../components/common/LogoLandscape';

// Manual mapping for surahs without English names
const arabicToEnglishNames: Record<string, string> = {
    'يونس': 'Yunus',
    'هود': 'Hud',
    'يوسف': 'Yusuf',
    'ابراهيم': 'Ibrahim',
    'مريم': 'Maryam',
    'طه': 'Ta-Ha',
    'لقمان': 'Luqman',
    'سبإ': 'Saba',
    'فاطر': 'Fatir',
    'ص': 'Sad',
    'غافر': 'Ghafir',
    'فصلت': 'Fussilat',
    'محمد': 'Muhammad',
    'ق': 'Qaf',
    'نوح': 'Nuh',
    'عبس': 'Abasa',
    'قريش': 'Quraysh',
};

const getSurahDisplayName = (surah: Surah): string => {
    if (surah.name_english) {
        return surah.name_english;
    }
    
    const arabicName = surah.name_arabic?.trim() || '';
    if (arabicToEnglishNames[arabicName]) {
        return arabicToEnglishNames[arabicName];
    }
    
    return `Surah ${surah.id}`;
};

export default function ListSurahsPage() {
    const [surahs, setSurahs] = useState<Surah[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const surahList: Surah[] = [];
        for (let i = 1; i <= 114; i++) {
            const surah = getSurahById(i);
            if (surah) surahList.push(surah);
        }
        setSurahs(surahList);
    }, []);

    const filteredSurahs = surahs.filter((surah) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        
        return (
            surah.name_english?.toLowerCase().includes(query) ||
            surah.name_arabic?.includes(query) ||
            surah.id?.toString() === query
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
                            Found {filteredSurahs.length} surah{filteredSurahs.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>

                {/* Surahs List */}
                <ul className="space-y-2">
                    {filteredSurahs.length > 0 ? (
                        filteredSurahs.map((surah) => {
                            const displayName = getSurahDisplayName(surah);
                            
                            return (
                                <li key={surah.id} className="border border-gray-200 rounded-lg p-3 hover:border-primary hover:bg-gray-50 transition-colors">
                                    <Link to={`/surah/${surah.id}`} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                                {surah.id}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-gray-900">
                                                    {displayName}
                                                </p>
                                                <p className="text-sm text-gray-600">{surah.verses_count} verses</p>
                                            </div>
                                        </div>
                                        <p className="text-xl text-primary font-arabic shrink-0">{surah.name_arabic}</p>
                                    </Link>
                                </li>
                            );
                        })
                    ) : (
                        <li className="text-center py-8 text-gray-500">
                            No surahs found matching "{searchQuery}"
                        </li>
                    )}
                </ul>
            </div>
        </div>
        </DashboardLayout>
    );
}
