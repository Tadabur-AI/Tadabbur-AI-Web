export interface SurahSummary {
  id: number;
  revelationPlace: 'makkah' | 'madinah' | string;
  revelationOrder: number;
  bismillahPre: boolean;
  nameSimple: string;
  nameComplex: string;
  nameArabic: string;
  versesCount: number;
  pages: [number, number];
  translatedName: {
    languageName: string;
    name: string;
  };
}

export async function listSurahs(): Promise<SurahSummary[]> {
  const requestOptions: RequestInit = {
    method: 'GET',
    redirect: 'follow' as RequestRedirect,
  };

  const response = await fetch('https://tadabbur-be.eng-sharjeel-baig.workers.dev/list-surahs', requestOptions);
  if (!response.ok) {
    throw new Error(`Failed to list surahs: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as SurahSummary[];
}

export interface RetrieveSurahPayload {
  surahNumber: number;
  translationId?: number;
}

export interface RetrieveSurahVerse {
  verse: string;
  translation: string;
  words: string[];
  word_audios: string[];
  key: string;
}

export async function retrieveSurah(payload: RetrieveSurahPayload): Promise<RetrieveSurahVerse[]> {
  const requestOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    redirect: 'follow' as RequestRedirect,
  };

  const res = await fetch('https://tadabbur-be.eng-sharjeel-baig.workers.dev/retrieve-surah', requestOptions);
  if (!res.ok) {
    throw new Error(`Failed to retrieve surah: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data as RetrieveSurahVerse[];
}

export interface RetrieveTafseerPayload {
  surahNumber: number;
  tafseerId: number;
}

export interface RetrieveTafseerItem {
  id: number;
  resource_id: number;
  verse_key: string;
  language_id: number;
  text: string;
  slug?: string;
}

interface RetrieveTafseerResponse {
  tafsirs: RetrieveTafseerItem[];
}

export async function retrieveTafseer(payload: RetrieveTafseerPayload): Promise<RetrieveTafseerItem[]> {
  const requestOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    redirect: 'follow' as RequestRedirect,
  };

  const res = await fetch('https://tadabbur-be.eng-sharjeel-baig.workers.dev/retrieve-tafseer', requestOptions);
  if (!res.ok) {
    throw new Error(`Failed to retrieve tafseer: ${res.status} ${res.statusText}`);
  }

  const data: RetrieveTafseerResponse = await res.json();
  if (!data || !Array.isArray(data.tafsirs)) {
    throw new Error('Tafseer response format is invalid');
  }

  return data.tafsirs;
}

export interface RetrieveRecitationPayload {
  surahNumber: number;
  recitationId: number;
}

export interface RetrieveRecitationVerse {
  verseKey: string;
  audioUrl: string;
}

export async function retrieveRecitation(payload: RetrieveRecitationPayload): Promise<RetrieveRecitationVerse[]> {
  const requestOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    redirect: 'follow' as RequestRedirect,
  };

  const res = await fetch('https://tadabbur-be.eng-sharjeel-baig.workers.dev/retrieve-recitation', requestOptions);
  if (!res.ok) {
    throw new Error(`Failed to retrieve recitation: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('Recitation response format is invalid');
  }

  return data as RetrieveRecitationVerse[];
}

export interface TafseerSummary {
  id: number;
  name: string;
  authorName: string | null;
  slug: string;
  languageName: string;
  translatedName?: {
    name: string;
    languageName: string;
  } | null;
}

export async function listTafseers(): Promise<TafseerSummary[]> {
  const response = await fetch('https://tadabbur-be.eng-sharjeel-baig.workers.dev/list-tafseers', {
    method: 'GET',
    redirect: 'follow' as RequestRedirect,
  });

  if (!response.ok) {
    throw new Error(`Failed to list tafseers: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Tafseer list response format is invalid');
  }

  return data as TafseerSummary[];
}

export interface TranslationSummary {
  id: number;
  name: string;
  authorName: string | null;
  slug: string | null;
  languageName: string;
  translatedName?: {
    name: string;
    languageName: string;
  } | null;
}

export async function listTranslations(): Promise<TranslationSummary[]> {
  const response = await fetch('https://tadabbur-be.eng-sharjeel-baig.workers.dev/list-translations', {
    method: 'GET',
    redirect: 'follow' as RequestRedirect,
  });

  if (!response.ok) {
    throw new Error(`Failed to list translations: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Translation list response format is invalid');
  }

  return data as TranslationSummary[];
}

export interface ReciterSummary {
  id: number;
  name: string;
  style: string | null;
  translatedName?: {
    name: string;
    languageName: string;
  } | null;
}

export async function listReciters(): Promise<ReciterSummary[]> {
  const response = await fetch('https://tadabbur-be.eng-sharjeel-baig.workers.dev/list-reciters', {
    method: 'GET',
    redirect: 'follow' as RequestRedirect,
  });

  if (!response.ok) {
    throw new Error(`Failed to list reciters: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Reciter list response format is invalid');
  }

  return data as ReciterSummary[];
}


