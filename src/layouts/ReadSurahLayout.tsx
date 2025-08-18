import { FiChevronLeft, FiChevronRight, FiRefreshCw } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Verse {
    id: number;
    verse_key: string;
    text: string;
    translation: string;
    surah_id: number;
}

interface Surah {
    id: number;
    name_english: string;
    name_arabic: string;
    verses_count: number;
}

interface Props {
    surah: Surah | null;
    verses: Verse[];
    currentVerseIndex: number;
    setCurrentVerseIndex: (i: number) => void;
    goToPreviousVerse: () => void;
    goToNextVerse: () => void;
    fetchReflection: () => Promise<void>;
    reflection: string;
    isLoadingReflection: boolean;
}

export default function ReadSurahLayout({
    surah,
    verses,
    currentVerseIndex,
    setCurrentVerseIndex,
    goToPreviousVerse,
    goToNextVerse,
    fetchReflection,
    reflection,
    isLoadingReflection,
}: Props) {
    const currentVerse = verses[currentVerseIndex];

    if (!surah || verses.length === 0) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <div className="flex h-screen w-full">
            {/* Custom Sidebar for Verses */}
            <div className="w-64 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="font-bold text-lg text-primary">Verses</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {verses.map((verse, index) => (
                        <div
                            key={verse.id}
                            className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                                index === currentVerseIndex ? 'bg-blue-50 border-l-4 border-l-primary' : ''
                            }`}
                            onClick={() => {
                                setCurrentVerseIndex(index);
                            }}
                        >
                            <p className="font-medium text-sm">Verse {verse.verse_key.split(':')[1]}</p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {verse.translation.substring(0, 60)}...
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-primary">
                        {surah.name_english} ({surah.name_arabic})
                    </h1>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto">
                        {/* Navigation Controls */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={goToPreviousVerse}
                                disabled={currentVerseIndex === 0}
                                className="flex items-center gap-2 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiChevronLeft /> Previous
                            </button>

                            <span className="font-medium">
                                Verse {currentVerseIndex + 1} of {verses.length}
                            </span>

                            <button
                                onClick={goToNextVerse}
                                disabled={currentVerseIndex === verses.length - 1}
                                className="flex items-center gap-2 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next <FiChevronRight />
                            </button>
                        </div>

                        {/* Verse Card */}
                        <div className="card mb-6">
                            <div className="text-center mb-4">
                                <h2 className="text-lg font-medium text-primary mb-2">
                                    Verse {currentVerse.verse_key}
                                </h2>
                            </div>

                            {/* Arabic Text */}
                            <div className="text-right mb-6 p-4 bg-gray-50 rounded-lg">
                                <p className="text-2xl leading-relaxed text-primary font-[Quran]">
                                    {currentVerse.text}
                                </p>
                            </div>

                            {/* Translation */}
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-secondary mb-2">Translation:</h3>
                                <p className="text-lg leading-relaxed">{currentVerse.translation}</p>
                            </div>

                            {/* Reflection Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className="text-lg font-medium text-secondary">Reflection:</h3>
                                    <button
                                        onClick={fetchReflection}
                                        disabled={isLoadingReflection}
                                        className="flex items-center gap-2 text-sm px-3 py-1 rounded"
                                    >
                                        <FiRefreshCw className={isLoadingReflection ? 'animate-spin' : ''} />
                                        {isLoadingReflection ? 'Generating...' : 'Generate Reflection'}
                                    </button>
                                </div>

                                {reflection && (
                                    <div className="p-4 bg-gray-50 rounded-lg prose prose-sm max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{reflection}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
