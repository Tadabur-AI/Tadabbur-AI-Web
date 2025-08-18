import { FiBookOpen, FiHome, FiMessageCircle } from "react-icons/fi";
import DashboardLayout, { type sidebarItems } from "../../layouts/DashboardLayout";
import {getSurahById} from 'quran-english/dist/index';
import { useEffect, useState } from "react";

export default function Homepage() {
    const [surahs, setSurahs] = useState([]);
    useEffect(() => {
            const surahList = [];
            for (let i = 1; i <= 114; i++) {
                const surah = getSurahById(i);
                surahList.push(surah);
            }
            setSurahs(surahList as any);
    }, []);
    const sidebarItems:sidebarItems[] = [
        {
            label: "Home",
            icon: <FiHome className="text-xl" />,
            path: "/home"
        },
        {
            label: "Read Quran",
            icon: <FiBookOpen className="text-xl" />,
            path: "/read-quran"
        },
        {
            label: "Chat",
            icon: <FiMessageCircle className="text-xl" />,
            path: "/chat"
        }
    ]
  return (
    <DashboardLayout
    sidebarItems={sidebarItems}
    screenTitle="Homepage"
    userProfile={<div>User Profile</div>}
    >
        <div className="p-4">
            <h1 className="text-2xl font-bold">Welcome to the Homepage</h1>
            <p className="mt-2">This is the main content area.</p>
            {surahs.map((surah:any, index) => (
                <div key={index} className="mt-4 p-4 border rounded">
                    <h2 className="text-xl font-semibold">{surah?.name_arabic}</h2>
                    <p className="text-primary">{surah.name_english}</p>
                    <p className="mt-2 text-secondary">{surah.verses_count}</p>
                </div>
            ))}
        </div>
    </DashboardLayout>
  )
}
