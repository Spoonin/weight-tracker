// ── API Key management ──────────────────────────────────────────────

export function saveApiKey(key: string): void {
  localStorage.setItem('anthropicApiKey', btoa(key));
}

export function getApiKey(): string | null {
  const encoded = localStorage.getItem('anthropicApiKey');
  return encoded ? atob(encoded) : null;
}

export function deleteApiKey(): void {
  localStorage.removeItem('anthropicApiKey');
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

// ── Types ───────────────────────────────────────────────────────────

export interface DishResult {
  name: string;
  portion_g: number;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

export interface NutritionFactsResult {
  portion_g: number;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

export interface AnalysisResult {
  dishes?: DishResult[];
  nutritionFactsInHundredGrams?: NutritionFactsResult;
}

// ── Image helpers ───────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File, maxSizeMB = 1.5): Promise<File> {
  if (file.size <= maxSizeMB * 1024 * 1024) return file;

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  const maxDim = 1600;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85);
  });

  return new File([blob], file.name, { type: 'image/jpeg' });
}

// ── Prompt ──────────────────────────────────────────────────────────

const ANALYSIS_PROMPT = `Analyze the photo of food or nutritional information from packaging and determine:
1. Whether the photo contains a dish or nutritional information
2. Name of the dish, if applicable
3. Estimated portion size in grams
4. Nutritional value for the specified portion, or per 100g if it's packaging text:
   - Calories (kcal)
   - Protein (g)
   - Fats (g)
   - Carbs (g)

If there are multiple dishes in the photo, list each one separately.
Indicate the confidence level of the estimate (high/medium/low).
If it's not possible to accurately identify the dish or portion, note this in the notes field.

If the photo shows packaging data but the nutritional value is not clearly readable, focus on text matching the pattern [number]kcal or [number]kJ (for kJ, convert to kcal using: 1 kJ = 0.239006 kcal).

Response format - valid JSON only, no additional text, markdown, or comments:
{
  "dishes": [
    {
      "name": "dish name",
      "portion_g": number,
      "calories": number,
      "protein": number,
      "fats": number,
      "carbs": number,
      "confidence": "high|medium|low",
      "notes": "additional remarks or empty string"
    }
  ],
  "nutritionFactsInHundredGrams": {
    "portion_g": number if available or 0,
    "calories": number,
    "protein": number,
    "fats": number,
    "carbs": number,
    "confidence": "high|medium|low",
    "notes": "additional remarks or empty string"
  }
}

Include the "dishes" array only if the photo contains dishes. Include "nutritionFactsInHundredGrams" only if the photo contains packaging text. Do not include both at the same time.`;

// ── API call ────────────────────────────────────────────────────────

function handleApiError(status: number, errorData: Record<string, unknown>): string {
  const msg = (errorData as any).error?.message;
  switch (status) {
    case 401:
      return 'Invalid API key. Check the key in settings.';
    case 429:
      return 'Rate limit exceeded. Try again later.';
    case 400:
      return 'Request error: ' + (msg || 'unknown error');
    default:
      return 'API error: ' + (msg || status);
  }
}

function parseAnalysisResult(apiResponse: Record<string, unknown>): AnalysisResult {
  let text: string = (apiResponse as any).content[0].text;
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  const result = JSON.parse(text);
  if (!result.dishes && !result.nutritionFactsInHundredGrams) {
    throw new Error('Invalid response format from API');
  }
  return result as AnalysisResult;
}

export async function analyzeFoodPhoto(imageFile: File, signal?: AbortSignal): Promise<AnalysisResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not set. Add it in settings.');
  }

  const compressed = await compressImage(imageFile);
  const base64Image = await fileToBase64(compressed);
  const mediaType = compressed.type || 'image/jpeg';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    let errorData: Record<string, unknown> = {};
    try {
      errorData = await response.json();
    } catch {
      /* empty */
    }
    throw new Error(handleApiError(response.status, errorData));
  }

  const data = await response.json();
  return parseAnalysisResult(data);
}
