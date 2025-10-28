// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface Chapter {
  id: number;
  revelationPlace: string;
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

export interface Recitation {
  id: number;
  reciter_name: string;
  style: string;
  translated_name: {
    name: string;
    language_name: string;
  };
}

export interface Translation {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  translated_name: {
    name: string;
    language_name: string;
  };
}

export interface Language {
  id: number;
  name: string;
  iso_code: string;
  native_name: string;
  direction: 'ltr' | 'rtl';
}

// Create a reusable headers object that includes the Vercel access token
const defaultHeaders = {
  Authorization: `Bearer ${import.meta.env.VITE_VERCEL_ACCESS_TOKEN}`,
};

/**
 * Fetch a specific chapter by ID
 */
export async function fetchChapter(chapterId: number): Promise<Chapter> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}`, {
      headers: defaultHeaders,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch chapter ${chapterId}: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Error fetching chapter ${chapterId}:`, error);
    throw error;
  }
}

/**
 * Fetch all available recitations
 */
export async function fetchRecitations(): Promise<Recitation[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recitations`, {
      headers: defaultHeaders,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch recitations: ${response.statusText}`);
    }
    const data = await response.json();
    return data.recitations || [];
  } catch (error) {
    console.error('Error fetching recitations:', error);
    throw error;
  }
}

/**
 * Fetch all available translations
 */
export async function fetchTranslations(language?: string): Promise<Translation[]> {
  try {
    const url = language 
      ? `${API_BASE_URL}/api/translations?language=${language}`
      : `${API_BASE_URL}/api/translations`;
    
    const response = await fetch(url, { headers: defaultHeaders });
    if (!response.ok) {
      throw new Error(`Failed to fetch translations: ${response.statusText}`);
    }
    const data = await response.json();
    return data.translations || [];
  } catch (error) {
    console.error('Error fetching translations:', error);
    throw error;
  }
}

/**
 * Fetch all available languages
 */
export async function fetchLanguages(): Promise<Language[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/languages`, { headers: defaultHeaders });
    if (!response.ok) {
      throw new Error(`Failed to fetch languages: ${response.statusText}`);
    }
    const data = await response.json();
    return data.languages || [];
  } catch (error) {
    console.error('Error fetching languages:', error);
    throw error;
  }
}
