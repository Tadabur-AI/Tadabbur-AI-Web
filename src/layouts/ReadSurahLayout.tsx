import { useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiMenu, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateVerseImagePrompt } from '../services/verseImagePromptService';

const IMAGE_WORKER_URL = 'https://text-to-image.eng-sharjeel-baig.workers.dev/custom';
const IMAGE_SAFETY_INSTRUCTIONS = [
    'Avoid any human figures, idols, animals, or depictions of prophets.',
    'Use only symbolic, natural, or architectural elements aligned with Islamic guidance.',
    'Ensure the scene feels realistic, serene, and spiritually reflective rather than abstract.',
    'Prefer luminous emerald and soft white tones to maintain the existing visual identity.',
].join(' ');

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
    const [verseImagePrompt, setVerseImagePrompt] = useState<string | null>(null);
    const [isVerseImagePromptLoading, setIsVerseImagePromptLoading] = useState(false);
    const [verseImagePromptError, setVerseImagePromptError] = useState<string | null>(null);
    const verseImagePromptCache = useRef<Map<string, string>>(new Map());
    const isValidVerseIndex = currentVerseIndex >= 0 && currentVerseIndex < verses.length;

    // Keep all hooks (including effects) at top-level to avoid changing hook order between renders.
    useEffect(() => {
        // Guard: only generate when we have valid data
        if (!surah || verses.length === 0 || !isValidVerseIndex) {
            setVerseImagePrompt(null);
            setVerseImagePromptError(null);
            setIsVerseImagePromptLoading(false);
            return;
        }

        const currentVerse = verses[currentVerseIndex];
        const cacheKey = currentVerse?.verse_key;
        if (!cacheKey) {
            setVerseImagePrompt(null);
            setVerseImagePromptError(null);
            setIsVerseImagePromptLoading(false);
            return;
        }

        if (verseImagePromptCache.current.has(cacheKey)) {
            const cachedPrompt = verseImagePromptCache.current.get(cacheKey) as string;
            setVerseImagePrompt(cachedPrompt);
            setVerseImagePromptError(null);
            setIsVerseImagePromptLoading(false);
            return;
        }

        let isActive = true;
        setVerseImagePrompt(null);
        setIsVerseImagePromptLoading(true);
        setVerseImagePromptError(null);

        const loadPrompt = async () => {
            try {
                const prompt = await generateVerseImagePrompt({
                    translation: currentVerse.translation,
                    arabicText: currentVerse.text,
                    verseKey: currentVerse.verse_key,
                    surahName: surah.name_english,
                });

                if (!isActive) return;

                verseImagePromptCache.current.set(cacheKey, prompt);
                setVerseImagePrompt(prompt);
            } catch (error) {
                if (!isActive) return;
                console.error('Failed to generate verse image prompt:', error);
                setVerseImagePromptError('Unable to tailor the artwork for this verse right now.');
                setVerseImagePrompt(null);
            } finally {
                if (isActive) {
                    setIsVerseImagePromptLoading(false);
                }
            }
        };

        loadPrompt();

        return () => {
            isActive = false;
        };
    }, [surah, verses, currentVerseIndex, isValidVerseIndex]);

    console.log('📄 Layout render - tafsirState:', tafsirState);

    if (!surah || verses.length === 0 || !isValidVerseIndex) {
        return <div className="flex h-screen min-w-[50px] items-center justify-center">Loading...</div>;
    }
    const currentVerse = verses[currentVerseIndex];

    // const fallbackImagePrompt = `Generate an immersive illustration that conveys the message of Quran verse ${currentVerse.verse_key}: "${currentVerse.translation}".`;
    // const fallbackImagePrompt = `Create a serene and uplifting scene`
    const effectiveImagePrompt = verseImagePrompt //?? fallbackImagePrompt;
    const promptSegments = [effectiveImagePrompt, IMAGE_SAFETY_INSTRUCTIONS];
    const fullImagePrompt = promptSegments.join(' ').replace(/\s+/g, ' ').trim();
    const verseImageUrl = `${IMAGE_WORKER_URL}?${encodeURIComponent(fullImagePrompt)}`;


    return (
        <div className="flex h-screen min-w-[50px] w-full overflow-hidden bg-white">
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
                className={`fixed inset-y-0 left-0 z-30 flex w-[min(16rem,100vw)] transform flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:relative lg:z-0 lg:w-64 lg:translate-x-0 lg:flex lg:flex-col ${
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
            <div className="flex flex-1 min-w-0 flex-col">
                {/* Header */}
                <div className="flex w-full flex-wrap items-center gap-2 border-b border-gray-200 p-2 sm:flex-nowrap sm:gap-3 sm:p-4">
                    <button
                        type="button"
                        aria-label="Show verse list"
                        className="flex items-center justify-center rounded border border-gray-200 p-2 transition-colors hover:border-primary hover:text-primary lg:hidden"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <FiMenu />
                    </button>
                    <h1 className="min-w-0 flex-1 truncate text-base font-bold text-primary sm:text-xl">
                        {surah.name_english} ({surah.name_arabic})
                    </h1>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6">
                    <div className="mx-auto w-full max-w-4xl min-w-0">
                        {/* Navigation Controls */}
                        <div className="mb-6 flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <button
                                onClick={goToPreviousVerse}
                                disabled={currentVerseIndex === 0}
                                className="flex w-full items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
                            >
                                <FiChevronLeft className="h-4 w-4 shrink-0" />
                                <span className="button-label">Previous</span>
                            </button>

                            <span className="block text-center text-xs font-medium sm:inline sm:text-sm">
                                Verse {currentVerseIndex + 1} of {verses.length}
                            </span>

                            <button
                                onClick={goToNextVerse}
                                disabled={currentVerseIndex === verses.length - 1}
                                className="flex w-full items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
                            >
                                <span className="button-label">Next</span>
                                <FiChevronRight className="h-4 w-4 shrink-0" />
                            </button>
                        </div>

{/* Images will be used later InshaAllah */}
                        {/* <div 
                        style={{
                            position: 'relative',
                            width: '100%',
                            paddingBottom: '40%', // Aspect ratio 5:2
                            marginBottom: '1.5rem' // mb-6
                        }}
                        >
                            <img
                                src={verseImageUrl}
                                alt="Custom Banner"
                                // className="absolute inset-0 h-full w-full rounded-lg object-fill filter blur-[5px] brightness-150 z-[1]"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    height: '100%',
                                    width:'100%',
                                    objectFit: 'cover',
                                    objectPosition: 'center',
                                    filter: 'blur(5px) brightness(150%)',
                                    zIndex: 1,
                                    borderRadius: '0.5rem' // rounded-lg
                                    
                                }}
                                loading="lazy"
                                aria-busy={isVerseImagePromptLoading}
                            />
                            {verseImagePromptError && (
                                <p className="mt-2 text-xs text-amber-600">{verseImagePromptError}</p>
                            )}
                        </div> */}

                        {/* Verse Card */}
                        <div className="card relative mb-6 overflow-hidden">

                            <div className="relative z-[2] mb-4 text-center">
                                <h2 className="mb-2 text-base font-medium text-primary sm:text-lg">
                                    Verse {currentVerse.verse_key}
                                </h2>
                            </div>

                            {/* Arabic Text */}
                            <div className="relative z-[2] mb-6 rounded-lg bg-gray-50 p-3 text-right sm:p-4">
                                <p className="text-xl leading-relaxed text-primary font-[Quran] sm:text-2xl">
                                    {currentVerse.text}
                                </p>
                            </div>

                            {/* Translation */}
                            <div className="relative z-[2] mb-6">
                                <h3 className="mb-2 text-base font-medium text-secondary sm:text-lg">Translation:</h3>
                                <p className="break-words text-base leading-relaxed sm:text-lg">{currentVerse.translation}</p>
                            </div>
                        </div>

                        {/* Simplified Tafsir */}
                        <div className="mb-6">
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <h3 className="text-base font-medium text-secondary sm:text-lg">Easy Explanation:</h3>
                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                                    <label htmlFor="tafsir-edition" className="text-xs font-medium text-gray-600 sm:text-sm">
                                        Edition
                                    </label>
                                    <select
                                        id="tafsir-edition"
                                        className="w-full rounded border border-gray-300 px-3 py-2 text-xs focus:border-primary focus:outline-none sm:min-w-[220px] sm:text-sm"
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
                                <div className="prose prose-sm max-w-none break-words rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-relaxed sm:p-4">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                    >
                                        {tafsirState.simplified}
                                    </ReactMarkdown>
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
                            <h3 className="mb-3 text-base font-medium text-secondary sm:text-lg">Original Tafsir:</h3>
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
                                        <p className="break-words text-sm leading-relaxed text-gray-700 whitespace-pre-line sm:text-base">
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
