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

const ANALYSIS_PROMPT = `Проанализируй фотографию еды либо данных о энергетической ценности с упаковки и определи:
1. На фото блюдо либо данные о энергетической ценности
2. Название блюда если актуально (на русском языке)
3. Оценка размера порции в граммах
4. Пищевая ценность на указанную порцию (либо на 100г в случае текста):
   - Калории (ккал)
   - Белки (г)
   - Жиры (г)
   - Углеводы (г)

Если на фото несколько блюд, перечисли каждое отдельно.
Укажи уровень уверенности в оценке (high/medium/low).
Если невозможно точно определить блюдо или порцию, укажи это в поле notes.

Формат ответа - только валидный JSON без дополнительного текста, markdown или комментариев:
{
  "dishes": [
    {
      "name": "название блюда",
      "portion_g": число,
      "calories": число,
      "protein": число,
      "fats": число,
      "carbs": число,
      "confidence": "high|medium|low",
      "notes": "дополнительные замечания или пустая строка"
    }
  ],
  "nutritionFactsInHundredGrams": {
    "portion_g": число если доступно либо 0,
    "calories": число,
    "protein": число,
    "fats": число,
    "carbs": число,
    "confidence": "high|medium|low",
    "notes": "дополнительные замечания или пустая строка"
  }
}

Включай массив "dishes" только если на фото блюда. Включай "nutritionFactsInHundredGrams" только если на фото текст с упаковки. Не включай оба одновременно.`;

// ── API call ────────────────────────────────────────────────────────

function handleApiError(status: number, errorData: Record<string, unknown>): string {
  const msg = (errorData as any).error?.message;
  switch (status) {
    case 401:
      return 'Неверный API ключ. Проверьте ключ в настройках.';
    case 429:
      return 'Превышен лимит запросов. Попробуйте позже.';
    case 400:
      return 'Ошибка в запросе: ' + (msg || 'неизвестная ошибка');
    default:
      return 'Ошибка API: ' + (msg || status);
  }
}

function parseAnalysisResult(apiResponse: Record<string, unknown>): AnalysisResult {
  let text: string = (apiResponse as any).content[0].text;
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  const result = JSON.parse(text);
  if (!result.dishes && !result.nutritionFactsInHundredGrams) {
    throw new Error('Некорректный формат ответа от API');
  }
  return result as AnalysisResult;
}

export async function analyzeFoodPhoto(imageFile: File, signal?: AbortSignal): Promise<AnalysisResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API ключ не установлен. Добавьте его в настройках.');
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
