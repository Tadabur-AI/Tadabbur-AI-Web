import { useState, useEffect, useRef } from 'react';
import {
  fetchRecitations,
  type Recitation,
} from '../../services/quranResourcesService';
import { listTranslations, type TranslationSummary } from '../../services/apis';

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
  const [translations, setTranslations] = useState<TranslationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const hasSetDefaults = useRef(false);

  useEffect(() => {
    async function loadResources() {
      try {
        setLoading(true);
        
        const maxRetries = 3;

        const fetchWithRetry = async (fn: () => Promise<any>, name: string) => {
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              return await fn();
            } catch (error) {
              console.error(`${name} fetch attempt ${attempt + 1}/${maxRetries} failed:`, error);
              if (attempt === maxRetries - 1) {
                throw error;
              }
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
        };

  const cachedRecitations = localStorage.getItem('tadabbur_recitations_cache');
  const cachedTranslations = localStorage.getItem('tadabbur_translations_cache');

        let recitationsData: Recitation[] = [];
  let translationsData: TranslationSummary[] = [];

        if (cachedRecitations) {
          recitationsData = JSON.parse(cachedRecitations);
          console.log('Loaded recitations from localStorage cache');
        } else {
          recitationsData = await fetchWithRetry(() => fetchRecitations(), 'Recitations');
          localStorage.setItem('tadabbur_recitations_cache', JSON.stringify(recitationsData));
          console.log('Fetched recitations from API and cached to localStorage');
        }

        if (cachedTranslations) {
          translationsData = JSON.parse(cachedTranslations);
          console.log('Loaded translations from localStorage cache');
        } else {
          translationsData = await fetchWithRetry(() => listTranslations(), 'Translations');
          localStorage.setItem('tadabbur_translations_cache', JSON.stringify(translationsData));
          console.log('Fetched translations from API and cached to localStorage');
        }
        
        setRecitations(recitationsData);
        setTranslations(translationsData);
        
        if (!hasSetDefaults.current) {
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
              const preferred = translationsData.find((item) => item.languageName?.toLowerCase() === 'english') ?? translationsData[0];
              onTranslationChange(preferred.id);
              localStorage.setItem('tadabbur_translation', String(preferred.id));
            } else {
              onTranslationChange(Number(saved));
            }
          }
          hasSetDefaults.current = true;
        }
      } catch (error) {
        console.error('Failed to load resources after all retries:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadResources();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-10 animate-pulse rounded-lg bg-border"></div>
        <div className="h-10 animate-pulse rounded-lg bg-border"></div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor="reciter" className="block text-sm font-medium text-text mb-1">
          Reciter
        </label>
        <select
          id="reciter"
          value={selectedRecitation || ''}
          onChange={(e) => onRecitationChange(Number(e.target.value))}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface text-text"
        >
          {recitations.map((recitation) => (
            <option key={recitation.id} value={recitation.id}>
              {recitation.reciter_name} ({recitation.style})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="translation" className="block text-sm font-medium text-text mb-1">
          Translation
        </label>
        <select
          id="translation"
          value={selectedTranslation || ''}
          onChange={(e) => onTranslationChange(Number(e.target.value))}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface text-text"
        >
          {translations.map((translation) => (
            <option key={translation.id} value={translation.id}>
              {translation.name} {translation.languageName ? `(${translation.languageName})` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
