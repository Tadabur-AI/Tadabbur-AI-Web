// Tafsir Explainer Service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ExplainTafsirRequest {
  surah: number;
  ayah: number;
  tafsir_id?: number; // Default: 169 (Ibn Kathir)
  additional_context?: string;
}

export interface ExplainTafsirResponse {
  surah: number;
  ayah: number;
  tafsir_id: number;
  tafsir_name: string;
  original_tafsir: string;
  explained_tafsir: string;
  language: string;
}

/**
 * Explain tafsir for a specific verse in modern, easy-to-understand English
 */
export async function explainTafsir(
  request: ExplainTafsirRequest
): Promise<ExplainTafsirResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tafsir/explain-verse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Failed to explain tafsir: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error explaining tafsir:', error);
    throw error;
  }
}

/**
 * Fetch tafsir text for a specific verse
 */
export async function fetchTafsirText(
  surah: number,
  ayah: number,
  tafsirId: number = 169
): Promise<{ surah: number; ayah: number; text: string; edition: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tafsir/${surah}/${ayah}/${tafsirId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tafsir: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching tafsir text:', error);
    throw error;
  }
}
