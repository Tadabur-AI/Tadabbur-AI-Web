declare module 'quran-english' {
    export interface Surah {
        id: number;
        name_english: string;
        name_arabic: string;
        verses_count: number;
    }

    export function getSurahById(chapterId: number): Surah | undefined;
}
