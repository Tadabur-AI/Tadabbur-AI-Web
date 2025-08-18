import { useEffect, useState } from 'react';
import { getSurahById } from 'quran-english';
import type { Surah } from 'quran-english';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { BiBook } from 'react-icons/bi';
import LogoLandscape from '../../components/common/LogoLandscape';

export default function ListSurahsPage() {
    const [surahs, setSurahs] = useState<Surah[]>([]);

    useEffect(() => {
        const surahList: Surah[] = [];
        for (let i = 1; i <= 114; i++) {
            const surah = getSurahById(i);
            if (surah) surahList.push(surah);
        }
        setSurahs(surahList);
    }, []);

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
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">List of Surahs</h1>
            <ul className="space-y-2">
                {surahs.map((surah) => (
                    <li key={surah.id} className="border p-2 rounded">
                        <Link to={`/surah/${surah.id}`} className="text-green-500 hover:underline">
                            {surah.name_english} ({surah.name_arabic})
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
        </DashboardLayout>
    );
}
