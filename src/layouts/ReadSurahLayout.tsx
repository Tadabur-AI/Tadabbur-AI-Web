import { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiMenu, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const LANGUAGE_NAMES: Record<string, string> = {
    ar: 'Arabic',
    arabic: 'Arabic',
    bn: 'Bengali',
    bengali: 'Bengali',
    en: 'English',
    english: 'English',
    fa: 'Persian',
    persian: 'Persian',
    fr: 'French',
    french: 'French',
    hi: 'Hindi',
    hindi: 'Hindi',
    id: 'Indonesian',
    indonesian: 'Indonesian',
    ms: 'Malay',
    malay: 'Malay',
    ta: 'Tamil',
    tamil: 'Tamil',
    tr: 'Turkish',
    turkish: 'Turkish',
    ur: 'Urdu',
    urdu: 'Urdu',
    russian: 'Russian',
    ru: 'Russian',
    kurdish: 'Kurdish',
};

const formatLanguage = (value: string | undefined): string => {
    if (!value) return 'Unknown';
    const trimmed = value.trim();
    if (!trimmed) return 'Unknown';
    const normalized = trimmed.toLowerCase();
    if (LANGUAGE_NAMES[normalized]) {
        return LANGUAGE_NAMES[normalized];
    }
    if (normalized.length > 3) {
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
    return normalized.toUpperCase();
};

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
    tafsirState?: {
        status: 'idle' | 'loading' | 'ready' | 'error';
        raw?: string;
        simplified?: string;
        errorMessage?: string;
        simplifiedStatus?: 'idle' | 'loading' | 'ready' | 'error';
        simplifiedErrorMessage?: string;
    };
    tafsirByVerse: any;
    editionOptions: Array<{
        slug: string;
        name: string;
        languageName: string;
        language?: string;
        language_name?: string;
    }>;
    selectedEdition: string;
    onEditionChange: (slug: string) => void;
    isEditionLoading: boolean;
    editionError: string | null;
}

export default function ReadSurahLayout({
    surah,
    verses,
    currentVerseIndex,
    setCurrentVerseIndex,
    goToPreviousVerse,
    goToNextVerse,
    tafsirState,
    tafsirByVerse: _tafsirByVerse,
    editionOptions,
    selectedEdition,
    onEditionChange,
    isEditionLoading,
    editionError,
}: Props) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const currentVerse = verses[currentVerseIndex];

    console.log('📄 Layout render - tafsirState:', tafsirState);

    if (!surah || verses.length === 0) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-white">
            {isSidebarOpen && (
                <button
                    type="button"
                    aria-label="Hide verse list"
                    className="fixed inset-0 z-20 bg-black/30 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            {/* Custom Sidebar for Verses */}
            <div
                className={`fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:relative lg:z-0 lg:translate-x-0 lg:flex lg:flex-col ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="font-bold text-lg text-primary">Verses</h2>
                    <button
                        type="button"
                        aria-label="Hide verse list"
                        className="rounded p-2 transition-colors hover:text-primary lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <FiX />
                    </button>
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
                                setIsSidebarOpen(false);
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
                <div className="flex items-center gap-3 p-4 border-b border-gray-200">
                    <button
                        type="button"
                        aria-label="Show verse list"
                        className="rounded border border-gray-200 p-2 transition-colors hover:border-primary hover:text-primary lg:hidden"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <FiMenu />
                    </button>
                    <h1 className="text-xl font-bold text-primary truncate">
                        {surah.name_english} ({surah.name_arabic})
                    </h1>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="max-w-4xl mx-auto">
                        {/* Navigation Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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
                        </div>

                        {/* Simplified Tafsir */}
                        <div className="mb-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                                <h3 className="text-lg font-medium text-secondary">Easy Explanation:</h3>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
                                    <label htmlFor="tafsir-edition" className="text-sm font-medium text-gray-600">
                                        Edition
                                    </label>
                                    <select
                                        id="tafsir-edition"
                                        className="w-full sm:min-w-[220px] rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                        value={selectedEdition}
                                        onChange={(event) => onEditionChange(event.target.value)}
                                        disabled={isEditionLoading || !!editionError || editionOptions.length === 0}
                                    >
                                        {editionOptions.map((edition) => (
                                            <option key={edition.slug} value={edition.slug}>
                                                {edition.name} ({formatLanguage(edition.languageName)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {isEditionLoading && (
                                <p className="text-sm text-gray-500 mb-2">Loading editions…</p>
                            )}
                            {editionError && (
                                <p className="text-sm text-red-500 mb-2">{editionError}</p>
                            )}
                            {(!tafsirState?.simplifiedStatus || tafsirState.simplifiedStatus === 'idle' || tafsirState.simplifiedStatus === 'loading') && (
                                <div className="space-y-2 animate-pulse">
                                    <div className="h-3 bg-gray-200 rounded" />
                                    <div className="h-3 bg-gray-200 rounded" />
                                    <div className="h-3 bg-gray-200 rounded w-4/5" />
                                </div>
                            )}
                            {tafsirState?.simplifiedStatus === 'ready' && tafsirState.simplified && (
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg prose prose-sm max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{tafsirState.simplified}</ReactMarkdown>
                                </div>
                            )}
                            {tafsirState?.status === 'error' && (
                                <p className="text-sm text-red-500">{tafsirState.errorMessage}</p>
                            )}
                            {tafsirState?.simplifiedStatus === 'error' && (
                                <p className="text-sm text-red-500">
                                    {tafsirState.simplifiedErrorMessage ?? 'Unable to generate explanation right now.'}
                                </p>
                            )}
                        </div>

                        {/* Original Tafsir */}
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-secondary mb-3">Original Tafsir:</h3>
                            {(() => {
                                console.log('🔍 Rendering Original Tafsir - tafsirState:', tafsirState);
                                if (!tafsirState || tafsirState.status === 'loading') {
                                    console.log('📊 Showing skeleton for Original Tafsir');
                                    return (
                                        <div className="space-y-2 animate-pulse">
                                            <div className="h-3 bg-gray-200 rounded" />
                                            <div className="h-3 bg-gray-200 rounded" />
                                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                                        </div>
                                    );
                                }
                                if (tafsirState.status === 'ready' && tafsirState.raw) {
                                    console.log('✅ Showing Original Tafsir content, length:', tafsirState.raw.length);
                                    return (
                                        <p className="text-base leading-relaxed text-gray-700 whitespace-pre-line">
                                            {tafsirState.raw}
                                        </p>
                                    );
                                }
                                if (tafsirState.status === 'ready' && !tafsirState.raw) {
                                    console.log('⚠️ Original Tafsir ready but no content');
                                    return <p className="text-sm text-gray-500">Original tafsir is not available for this verse.</p>;
                                }
                                if (tafsirState.status === 'error') {
                                    console.log('❌ Original Tafsir error:', tafsirState.errorMessage);
                                    return <p className="text-sm text-red-500">{tafsirState.errorMessage}</p>;
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
