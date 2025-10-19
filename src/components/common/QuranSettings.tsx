import { useState, useEffect, useRef } from 'react';
import { 
  fetchRecitations, 
  fetchTranslations,
  type Recitation,
  type Translation
} from '../../services/quranResourcesService';

interface QuranSettingsProps {
  selectedRecitation: number | null;
  selectedTranslation: number | null;
  onRecitationChange: (id: number) => void;
  onTranslationChange: (id: number) => void;
}

export default function QuranSettings({
  selectedRecitation,
  selectedTranslation,
  onRecitationChange,
  onTranslationChange,
}: QuranSettingsProps) {
  const [recitations, setRecitations] = useState<Recitation[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const hasSetDefaults = useRef(false);

  useEffect(() => {
    async function loadResources() {
      try {
        setLoading(true);
        
        const maxRetries = 3;

        // Load with retry logic
        const fetchWithRetry = async (fn: () => Promise<any>, name: string) => {
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              return await fn();
            } catch (error) {
              console.error(`${name} fetch attempt ${attempt + 1}/${maxRetries} failed:`, error);
              if (attempt === maxRetries - 1) {
                throw error; // Rethrow after all retries
              }
              // Exponential backoff: 1s, 2s, 4s
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
        };

        // Try to load from localStorage first
        const cachedRecitations = localStorage.getItem('tadabbur_recitations_cache');
        const cachedTranslations = localStorage.getItem('tadabbur_translations_cache');

        let recitationsData: Recitation[] = [];
        let translationsData: Translation[] = [];

        // Load recitations - from cache or API
        if (cachedRecitations) {
          recitationsData = JSON.parse(cachedRecitations);
          console.log('Loaded recitations from localStorage cache');
        } else {
          recitationsData = await fetchWithRetry(() => fetchRecitations(), 'Recitations');
          localStorage.setItem('tadabbur_recitations_cache', JSON.stringify(recitationsData));
          console.log('Fetched recitations from API and cached to localStorage');
        }

        // Load translations - from cache or API
        if (cachedTranslations) {
          translationsData = JSON.parse(cachedTranslations);
          console.log('Loaded translations from localStorage cache');
        } else {
          translationsData = await fetchWithRetry(() => fetchTranslations('en'), 'Translations');
          localStorage.setItem('tadabbur_translations_cache', JSON.stringify(translationsData));
          console.log('Fetched translations from API and cached to localStorage');
        }
        
        setRecitations(recitationsData);
        setTranslations(translationsData);
        
        // Set defaults only once if not selected and not already set in localStorage
        if (!hasSetDefaults.current) {
          // If parent hasn't selected anything and localStorage is also empty, set defaults
          if (!selectedRecitation && recitationsData.length > 0) {
            const saved = localStorage.getItem('tadabbur_recitation');
            if (!saved) {
              onRecitationChange(recitationsData[0].id);
              localStorage.setItem('tadabbur_recitation', String(recitationsData[0].id));
            } else {
              onRecitationChange(Number(saved));
            }
          }
          if (!selectedTranslation && translationsData.length > 0) {
            const saved = localStorage.getItem('tadabbur_translation');
            if (!saved) {
              onTranslationChange(translationsData[0].id);
              localStorage.setItem('tadabbur_translation', String(translationsData[0].id));
            } else {
              onTranslationChange(Number(saved));
            }
          }
          hasSetDefaults.current = true;
        }
      } catch (error) {
        console.error('Failed to load resources after all retries:', error);
        // Silently continue - don't show error to user
      } finally {
        setLoading(false);
      }
    }
    
    loadResources();
  }, []); // Empty dependency array - only run once

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-10 animate-pulse rounded-lg bg-gray-200"></div>
        <div className="h-10 animate-pulse rounded-lg bg-gray-200"></div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Reciter Selection */}
      <div>
        <label htmlFor="reciter" className="block text-sm font-medium text-gray-700 mb-1">
          Reciter
        </label>
        <select
          id="reciter"
          value={selectedRecitation || ''}
          onChange={(e) => onRecitationChange(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {recitations.map((recitation) => (
            <option key={recitation.id} value={recitation.id}>
              {recitation.reciter_name} ({recitation.style})
            </option>
          ))}
        </select>
      </div>

      {/* Translation Selection */}
      <div>
        <label htmlFor="translation" className="block text-sm font-medium text-gray-700 mb-1">
          Translation
        </label>
        <select
          id="translation"
          value={selectedTranslation || ''}
          onChange={(e) => onTranslationChange(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {translations.map((translation) => (
            <option key={translation.id} value={translation.id}>
              {translation.name} - {translation.author_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
