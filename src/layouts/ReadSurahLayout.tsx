import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiMenu, FiX, FiArrowLeft } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import LogoLandscape from '../components/common/LogoLandscape';
import AudioPlayer from '../components/common/AudioPlayer';
import TafsirExplainerModal from '../components/common/TafsirExplainerModal';

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

interface Recitation {
    id: number;
    reciter_name: string;
    style: string;
}

interface Props {
    surah: Surah | null;
    verses: Verse[];
    currentVerseIndex: number;
    setCurrentVerseIndex: (i: number) => void;
    goToPreviousVerse: () => void;
    goToNextVerse: () => void;
    selectedRecitation?: number | null;
    onRecitationChange?: (id: number) => void;
    selectedTafsir?: number | null;
    onTafsirChange?: (id: number) => void;
    isExplainerOpen?: boolean;
    onExplainerToggle?: () => void;
    tafsirText?: string | null;
    isTafsirLoading?: boolean;
    tafsirOptions?: Array<{ id: number; name: string; languageName: string }>;
    aiExplanation?: string | null;
    isExplanationLoading?: boolean;
    recitations?: Recitation[];
}

export default function ReadSurahLayout({
    surah,
    verses,
    currentVerseIndex,
    setCurrentVerseIndex,
    goToPreviousVerse,
    goToNextVerse,
    selectedRecitation,
    selectedTafsir,
    onRecitationChange,
    onTafsirChange,
    isExplainerOpen,
    onExplainerToggle,
    tafsirText,
    isTafsirLoading,
    tafsirOptions = [],
    aiExplanation,
    isExplanationLoading,
    recitations = [],
}: Props) {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isValidVerseIndex = currentVerseIndex >= 0 && currentVerseIndex < verses.length;

    if (!surah || verses.length === 0 || !isValidVerseIndex) {
        return <div className="flex h-screen min-w-[50px] items-center justify-center">Loading...</div>;
    }
    const currentVerse = verses[currentVerseIndex];


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
                    {/* Back to Chapters Button */}
                    <button
                        type="button"
                        onClick={() => navigate('/surahs')}
                        className="flex items-center justify-center gap-2 rounded border border-gray-300 px-2 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-gray-50"
                        title="Go back to chapters list"
                    >
                        <FiArrowLeft className="h-4 w-4 shrink-0" />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    {/* Logo - Hidden on mobile, visible on tablet/desktop */}
                    <div className="hidden sm:flex items-center text-primary font-semibold">
                        <LogoLandscape />
                    </div>
                    
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

                    {/* Desktop Navigation in Header */}
                    <div className="hidden sm:flex items-center gap-3">
                        <button
                            onClick={goToPreviousVerse}
                            disabled={currentVerseIndex === 0}
                            className="flex items-center justify-center gap-2 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <FiChevronLeft className="h-4 w-4 shrink-0" />
                            <span>Previous</span>
                        </button>

                        <span className="text-sm font-medium text-gray-600">
                            {currentVerseIndex + 1}/{verses.length}
                        </span>

                        <button
                            onClick={goToNextVerse}
                            disabled={currentVerseIndex === verses.length - 1}
                            className="flex items-center justify-center gap-2 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span>Next</span>
                            <FiChevronRight className="h-4 w-4 shrink-0" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-20 sm:p-6 sm:pb-6">
                    <div className="mx-auto w-full max-w-4xl min-w-0">

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

                            {/* Audio Player - positioned below verse card, above explanation */}
                            {selectedRecitation && (
                                <div className="relative z-[2] mb-6">
                                    {(() => {
                                        const reciter = recitations.find(r => r.id === selectedRecitation);
                                        return (
                                            <AudioPlayer
                                                surahNumber={currentVerse.surah_id}
                                                ayahNumber={currentVerseIndex + 1}
                                                recitationId={selectedRecitation}
                                                recitationName={reciter?.reciter_name || 'Current Reciter'}
                                                recitations={recitations}
                                                onRecitationChange={onRecitationChange}
                                            />
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* AI-Generated Simplified Explanation */}
                        <div className="mb-6">
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <h3 className="text-base font-medium text-secondary sm:text-lg">Easy Explanation:</h3>
                                
                                {/* Tafsir Dropdown - Moved here from Quran Settings */}
                                {onTafsirChange && (
                                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                                        {/* <label htmlFor="tafsir-select" className="text-xs font-medium text-gray-600 sm:text-sm">
                                            Tafsir
                                        </label> */}
                                        <select
                                            id="tafsir-select"
                                            className="w-full rounded border border-gray-300 px-3 py-2 text-xs focus:border-primary focus:outline-none sm:min-w-[220px] sm:text-sm"
                                            value={selectedTafsir ?? ''}
                                            onChange={(e) => onTafsirChange(Number(e.target.value))}
                                        >
                                            <option value="">Select Tafsir...</option>
                                            {tafsirOptions.map((tafsir) => (
                                                <option key={tafsir.id} value={tafsir.id}>
                                                    {tafsir.name} ({tafsir.languageName})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                                
                            {/* AI-Generated Explanation with bot logo */}
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                                <div className="mb-3 flex items-center gap-3">
                                    <img
                                        src="/images/bot-logo.svg"
                                        alt="AI bot logo"
                                        className="h-8 w-8 flex-shrink-0"
                                    />
                                    <p className="text-sm text-blue-800">
                                        AI Generated - Simplified explanation to help you understand the verse better.
                                    </p>
                                </div>
                                
                                {/* Loading State */}
                                {isExplanationLoading && (
                                    <div className="space-y-2 animate-pulse">
                                        <div className="h-3 bg-blue-200 rounded" />
                                        <div className="h-3 bg-blue-200 rounded" />
                                        <div className="h-3 bg-blue-200 rounded w-4/5" />
                                    </div>
                                )}
                                
                                {/* AI Explanation Content - Rendered as Markdown */}
                                {aiExplanation && !isExplanationLoading &&  (
                                    <div className="prose prose-sm max-w-none text-gray-700">
                                        <ReactMarkdown
                                        components={{
                                            'pre': ({children, ...props}) => (
                                                <pre
                                                style={{
                                                    color: '#1999',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    background: '#f6f8fa',
                                                    padding: '10px',
                                                    borderRadius: '8px',
                                                    overflowX: 'auto',
                                                    maxWidth: '100%',
                                                    boxSizing: 'border-box',
                                                    fontSize: '1em',
                                                    whiteSpace: 'pre-wrap',
                                                    wordWrap: 'normal',
                                                    wordBreak: 'keep-all',


                                                }}
                                                {...props}
                                                >
                                                    {children}
                                                </pre>
                                            ),
                                        }}

                                        >{(aiExplanation)}</ReactMarkdown>
                                    </div>
                                )}
                                
                                {/* No Tafsir Selected */}
                                {!selectedTafsir && !isExplanationLoading && (
                                    <p className="text-sm text-gray-600">Please select a tafsir above to see the AI explanation.</p>
                                )}
                                
                                {/* No Content Yet */}
                                {selectedTafsir && !aiExplanation && !isExplanationLoading && (
                                    <p className="text-sm text-gray-600">Generating explanation...</p>
                                )}
                            </div>
                        </div>

                        {/* Original Tafsir - Loaded from backend */}
                        <div className="mb-6">
                            <h3 className="mb-3 text-base font-medium text-secondary sm:text-lg">Original Tafsir:</h3>
                            {!selectedTafsir && (
                                <p className="text-sm text-gray-500">Please select a tafsir above to view the original text.</p>
                            )}
                            {selectedTafsir && isTafsirLoading && (
                                <div className="space-y-2 animate-pulse">
                                    <div className="h-3 bg-gray-200 rounded" />
                                    <div className="h-3 bg-gray-200 rounded" />
                                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                                </div>
                            )}
                            {selectedTafsir && !isTafsirLoading && tafsirText && (
                                <div 
                                    className="prose prose-sm max-w-none text-gray-700 break-words text-sm leading-relaxed sm:text-base"
                                    dangerouslySetInnerHTML={{ __html: tafsirText }}
                                />
                            )}
                            {selectedTafsir && !isTafsirLoading && !tafsirText && (
                                <p className="text-sm text-gray-500">Tafsir not available for this verse.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation - Fixed Bottom Bar */}
                <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-lg sm:hidden">
                    <button
                        onClick={goToPreviousVerse}
                        disabled={currentVerseIndex === 0}
                        className="flex flex-1 items-center justify-center gap-2 rounded bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FiChevronLeft className="h-5 w-5 shrink-0" />
                        <span>Previous</span>
                    </button>

                    <span className="flex-shrink-0 text-sm font-medium">
                        {currentVerseIndex + 1}/{verses.length}
                    </span>

                    <button
                        onClick={goToNextVerse}
                        disabled={currentVerseIndex === verses.length - 1}
                        className="flex flex-1 items-center justify-center gap-2 rounded bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <span>Next</span>
                        <FiChevronRight className="h-5 w-5 shrink-0" />
                    </button>
                </div>
            </div>

            {/* Tafsir Explainer Modal */}
            {selectedTafsir && isExplainerOpen !== undefined && onExplainerToggle && isValidVerseIndex && (
                <TafsirExplainerModal
                    isOpen={isExplainerOpen}
                    onClose={onExplainerToggle}
                    surahNumber={currentVerse.surah_id}
                    ayahNumber={currentVerseIndex + 1}
                    tafsirId={selectedTafsir}
                />
            )}
        </div>
    );
}
