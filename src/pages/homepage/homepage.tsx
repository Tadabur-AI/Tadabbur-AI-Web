import { FiBookOpen, FiHome, FiMessageCircle } from "react-icons/fi";
import DashboardLayout, { type sidebarItems } from "../../layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { listSurahs, type SurahSummary } from "../../services/apis";

export default function Homepage() {
    const [surahs, setSurahs] = useState<SurahSummary[]>([]);
    useEffect(() => {
        const loadSurahs = async () => {
            try {
                const data = await listSurahs();
                setSurahs(data);
            } catch (error) {
                console.error("Failed to load surahs:", error);
            }
        };

        void loadSurahs();
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
            {surahs.map((surah, index) => (
                <div key={index} className="mt-4 p-4 border rounded">
                    <h2 className="text-xl font-semibold">{surah.nameArabic}</h2>
                    <p className="text-primary">{surah.nameSimple}</p>
                    <p className="mt-2 text-secondary">{surah.versesCount} verses</p>
                </div>
            ))}
        </div>
    </DashboardLayout>
  )
}
