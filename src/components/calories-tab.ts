import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../store';
import { todayISO, parseNum } from '../utils';
import { analyzeFoodPhoto, hasApiKey, type AnalysisResult, type DishResult, type NutritionFactsResult } from '../ai-analysis';

@customElement('calories-tab')
export class CaloriesTab extends LitElement {
  createRenderRoot() {
    return this; // Disable shadow DOM to use global Tailwind styles
  }

  @state() private date = todayISO();
  @state() private type = 'Завтрак';
  @state() private description = '';
  @state() private calories = '';
  @state() private protein = '';
  @state() private fats = '';
  @state() private carbs = '';
  @state() private per100g = false;
  @state() private mass = '';

  // Photo analysis state
  @state() private photoFile: File | null = null;
  @state() private photoPreview = '';
  @state() private analyzing = false;
  @state() private analysisResult: AnalysisResult | null = null;
  @state() private analysisError = '';
  @state() private selectedDishIndices: Set<number> = new Set();
  private abortController: AbortController | null = null;

  // Edit state
  @state() private editingId: number | null = null;
  @state() private editDate = '';
  @state() private editType = '';
  @state() private editDescription = '';
  @state() private editCalories = '';
  @state() private editProtein = '';
  @state() private editFats = '';
  @state() private editCarbs = '';

  private startEdit(meal: { id: number; date: string; type: string; description: string; calories: number; protein: number; fats: number; carbs: number }) {
    this.editingId = meal.id;
    this.editDate = meal.date;
    this.editType = meal.type;
    this.editDescription = meal.description;
    this.editCalories = String(meal.calories);
    this.editProtein = String(meal.protein);
    this.editFats = String(meal.fats);
    this.editCarbs = String(meal.carbs);
  }

  private cancelEdit() {
    this.editingId = null;
  }

  private saveEdit() {
    const meal = store.calorieData.find((m) => m.id === this.editingId);
    if (!meal) return;

    meal.date = this.editDate;
    meal.type = this.editType;
    meal.description = this.editDescription;
    meal.calories = parseNum(this.editCalories) || 0;
    meal.protein = parseNum(this.editProtein) || 0;
    meal.fats = parseNum(this.editFats) || 0;
    meal.carbs = parseNum(this.editCarbs) || 0;

    store.calorieData.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    store.saveCalories();

    this.editingId = null;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('data-updated', { bubbles: true, composed: true }));
  }

  private handleSubmit(e: Event) {
    e.preventDefault();

    const factor = this.per100g ? (parseNum(this.mass) || 0) / 100 : 1;

    store.calorieData.push({
      id: Date.now(),
      date: this.date,
      type: this.type,
      description: this.description,
      calories: Math.round(parseNum(this.calories) * factor),
      protein: Math.round((parseNum(this.protein) || 0) * factor),
      fats: Math.round((parseNum(this.fats) || 0) * factor),
      carbs: Math.round((parseNum(this.carbs) || 0) * factor),
    });

    store.calorieData.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    store.saveCalories();

    this.calories = '';
    this.description = '';
    this.protein = '';
    this.fats = '';
    this.carbs = '';
    this.mass = '';
    this.per100g = false;
    this.date = todayISO();
    this.type = 'Завтрак';

    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('data-updated', { bubbles: true, composed: true }));
  }

  private handleDelete(id: number) {
    if (!confirm('Удалить этот приём пищи?')) return;
    store.calorieData = store.calorieData.filter((m) => m.id !== id);
    store.saveCalories();
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('data-updated', { bubbles: true, composed: true }));
  }

  // ── Photo analysis methods ──────────────────────────────────────

  private triggerFileInput() {
    const input = this.querySelector('input[type="file"]') as HTMLInputElement;
    input?.click();
  }

  private handlePhotoSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.photoFile = file;
    this.analysisResult = null;
    this.analysisError = '';
    const reader = new FileReader();
    reader.onload = () => { this.photoPreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  private async handleAnalyze() {
    if (!this.photoFile) return;
    this.abortController = new AbortController();
    this.analyzing = true;
    this.analysisError = '';
    this.analysisResult = null;
    try {
      const result = await analyzeFoodPhoto(this.photoFile, this.abortController.signal);
      this.analysisResult = result;
      // Select all dishes by default
      if (result.dishes) {
        this.selectedDishIndices = new Set(result.dishes.map((_, i) => i));
      } else {
        this.selectedDishIndices = new Set();
      }
    } catch (err: unknown) {
      if ((err as DOMException).name === 'AbortError') {
        this.analysisError = '';
      } else {
        this.analysisError = (err as Error).message || 'Ошибка анализа';
      }
    } finally {
      this.analyzing = false;
      this.abortController = null;
    }
  }

  private handleCancelAnalysis() {
    this.abortController?.abort();
  }

  private toggleDish(index: number) {
    const next = new Set(this.selectedDishIndices);
    if (next.has(index)) next.delete(index); else next.add(index);
    this.selectedDishIndices = next;
  }

  private handleApplySelected() {
    const dishes = this.analysisResult?.dishes;
    if (!dishes) return;
    const selected = dishes.filter((_, i) => this.selectedDishIndices.has(i));
    if (selected.length === 0) return;

    const topDish = selected.reduce((a, b) => b.calories > a.calories ? b : a);
    const names = topDish.name;
    const totalCal = selected.reduce((s, d) => s + d.calories, 0);
    const totalP = selected.reduce((s, d) => s + d.protein, 0);
    const totalF = selected.reduce((s, d) => s + d.fats, 0);
    const totalC = selected.reduce((s, d) => s + d.carbs, 0);

    this.description = names;
    this.calories = String(totalCal);
    this.protein = String(totalP);
    this.fats = String(totalF);
    this.carbs = String(totalC);
    this.per100g = false;
    this.mass = '';
    this.clearPhoto();
  }

  private handleApplyNutritionFacts(nf: NutritionFactsResult) {
    this.per100g = true;
    this.description = nf.notes || '';
    this.calories = String(nf.calories);
    this.protein = String(nf.protein);
    this.fats = String(nf.fats);
    this.carbs = String(nf.carbs);
    this.mass = nf.portion_g > 0 ? String(nf.portion_g) : '';
    this.clearPhoto();
  }

  private clearPhoto() {
    this.photoFile = null;
    this.photoPreview = '';
    this.analysisResult = null;
    this.analysisError = '';
    const input = this.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) input.value = '';
  }

  private confidenceBadge(confidence: string) {
    const colors: Record<string, string> = {
      high: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      high: 'Высокая',
      medium: 'Средняя',
      low: 'Низкая',
    };
    return html`<span class="text-xs px-2 py-0.5 rounded-full ${colors[confidence] || ''}">${labels[confidence] || confidence}</span>`;
  }

  private renderPhotoSection() {
    return html`
      <div class="mb-4 p-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50">
        <h4 class="font-bold mb-3 flex items-center gap-2 text-sm">📸 Добавить по фото</h4>
        <input type="file" accept="image/*" capture="environment" class="hidden" @change=${this.handlePhotoSelect} />
        ${this.photoPreview ? html`
          <div class="mb-3"><img src=${this.photoPreview} class="max-w-full h-48 object-contain rounded border" /></div>
        ` : ''}
        <div class="flex gap-2 mb-2">
          <button type="button" @click=${this.triggerFileInput}
            class="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex-1 hover:bg-blue-600">
            📷 Выбрать фото
          </button>
          ${this.photoFile && !this.analyzing ? html`
            <button type="button" @click=${this.handleAnalyze}
              class="bg-green-500 text-white px-3 py-2 rounded-lg text-sm flex-1 hover:bg-green-600">
              🔍 Анализировать
            </button>
          ` : ''}
          ${this.analyzing ? html`
            <button type="button" @click=${this.handleCancelAnalysis}
              class="bg-red-400 text-white px-3 py-2 rounded-lg text-sm flex-1 hover:bg-red-500">
              ✕ Отменить
            </button>
          ` : ''}
        </div>
        ${this.photoFile && !this.analyzing ? html`
          <button type="button" @click=${this.clearPhoto} class="text-xs text-gray-500 hover:text-gray-700">✕ Очистить</button>
        ` : ''}
        ${!hasApiKey() ? html`
          <div class="text-xs text-amber-600 mt-2">⚠️ Добавьте API ключ Anthropic в настройках для использования.</div>
        ` : ''}
        ${this.analysisError ? html`
          <div class="text-sm text-red-600 p-2 bg-red-50 rounded mt-2">${this.analysisError}</div>
        ` : ''}
        ${this.analysisResult ? this.renderAnalysisResults() : ''}
      </div>
    `;
  }

  private renderAnalysisResults() {
    const r = this.analysisResult!;
    const hasDishes = r.dishes && r.dishes.length > 0;
    const selectedCount = hasDishes ? r.dishes!.filter((_, i) => this.selectedDishIndices.has(i)).length : 0;

    return html`
      <div class="mt-3 space-y-2">
        ${hasDishes ? html`
          ${r.dishes!.map((dish, i) => html`
            <label class="flex items-start gap-2 p-3 bg-white rounded-lg border shadow-sm cursor-pointer
              ${this.selectedDishIndices.has(i) ? 'ring-2 ring-indigo-300' : 'opacity-60'}">
              <input type="checkbox" .checked=${this.selectedDishIndices.has(i)}
                @change=${() => this.toggleDish(i)}
                class="mt-1 accent-indigo-600" />
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start mb-1">
                  <div class="font-semibold text-sm">${dish.name}</div>
                  ${this.confidenceBadge(dish.confidence)}
                </div>
                <div class="text-xs text-gray-600">~${dish.portion_g}г · ${dish.calories} ккал</div>
                <div class="text-xs text-gray-500">Б: ${dish.protein}г · Ж: ${dish.fats}г · У: ${dish.carbs}г</div>
                ${dish.notes ? html`<div class="text-xs text-gray-400 italic mt-1">${dish.notes}</div>` : ''}
              </div>
            </label>
          `)}
          <button type="button" @click=${this.handleApplySelected}
            ?disabled=${selectedCount === 0}
            class="w-full text-sm bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 disabled:opacity-40 font-medium">
            Добавить выбранное (${selectedCount})
          </button>
        ` : ''}
        ${r.nutritionFactsInHundredGrams ? html`
          <div class="p-3 bg-white rounded-lg border shadow-sm">
            <div class="flex justify-between items-start mb-2">
              <div class="font-semibold text-sm">📋 Данные с упаковки (на 100г)</div>
              ${this.confidenceBadge(r.nutritionFactsInHundredGrams.confidence)}
            </div>
            <div class="text-xs text-gray-600 mb-1">${r.nutritionFactsInHundredGrams.calories} ккал / 100г</div>
            <div class="text-xs text-gray-500 mb-2">Б: ${r.nutritionFactsInHundredGrams.protein}г · Ж: ${r.nutritionFactsInHundredGrams.fats}г · У: ${r.nutritionFactsInHundredGrams.carbs}г</div>
            ${r.nutritionFactsInHundredGrams.notes ? html`<div class="text-xs text-gray-400 italic mb-2">${r.nutritionFactsInHundredGrams.notes}</div>` : ''}
            <button type="button" @click=${() => this.handleApplyNutritionFacts(r.nutritionFactsInHundredGrams!)}
              class="w-full text-sm bg-indigo-500 text-white py-1.5 rounded-lg hover:bg-indigo-600">
              Заполнить форму (на 100г)
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  private getTodayMeals() {
    const today = todayISO();
    return store.calorieData.filter((m) => m.date === today);
  }

  render() {
    const c = store.config!;
    const todayMeals = this.getTodayMeals();
    const totalCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
    const remaining = c.dailyCalorieTarget - totalCalories;

    return html`
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="glass-white rounded-xl p-6">
          <h3 class="text-xl font-bold mb-4">Добавить приём пищи</h3>
          ${this.renderPhotoSection()}
          <form @submit=${this.handleSubmit} class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Дата</label>
              <input
                type="date"
                .value=${this.date}
                @input=${(e: Event) => this.date = (e.target as HTMLInputElement).value}
                class="w-full px-4 py-2 rounded-lg border border-gray-300"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Приём пищи</label>
              <select
                .value=${this.type}
                @change=${(e: Event) => this.type = (e.target as HTMLSelectElement).value}
                class="w-full px-4 py-2 rounded-lg border border-gray-300"
              >
                <option value="Завтрак">Завтрак</option>
                <option value="Перекус 1">Перекус 1</option>
                <option value="Обед">Обед</option>
                <option value="Перекус 2">Перекус 2</option>
                <option value="Ужин">Ужин</option>
                <option value="Перекус 3">Перекус 3</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Описание</label>
              <textarea
                value=${this.description}
                @input=${(e: Event) => this.description = (e.target as HTMLTextAreaElement).value}
                class="w-full px-4 py-2 rounded-lg border border-gray-300"
                rows="2"
                placeholder="Что вы съели?"
              ></textarea>
            </div>
            <div class="flex items-center gap-2 py-1">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" .checked=${this.per100g}
                  @change=${(e: Event) => this.per100g = (e.target as HTMLInputElement).checked}
                  class="sr-only peer" />
                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              <span class="text-sm text-gray-600">На 100 г (с упаковки)</span>
            </div>
            ${this.per100g ? html`
            <div>
              <label class="block text-sm font-medium mb-2">Масса (г)</label>
              <input
                type="text"
                inputmode="decimal"
                value=${this.mass}
                @input=${(e: Event) => this.mass = (e.target as HTMLInputElement).value}
                class="w-full px-4 py-2 rounded-lg border border-gray-300"
                placeholder="150"
                required
              />
            </div>
            ` : ''}
            <div>
              <label class="block text-sm font-medium mb-2">Калории${this.per100g ? ' (на 100 г)' : ''}</label>
              <input
                type="text"
                inputmode="decimal"
                value=${this.calories}
                @input=${(e: Event) => this.calories = (e.target as HTMLInputElement).value}
                class="w-full px-4 py-2 rounded-lg border border-gray-300"
                placeholder="0"
                required
              />
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-xs font-medium mb-1">Б${this.per100g ? '/100г' : ' (г)'}</label>
                <input
                  type="text"
                  inputmode="decimal"
                  value=${this.protein}
                  @input=${(e: Event) => this.protein = (e.target as HTMLInputElement).value}
                  class="w-full px-2 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1">Ж${this.per100g ? '/100г' : ' (г)'}</label>
                <input
                  type="text"
                  inputmode="decimal"
                  value=${this.fats}
                  @input=${(e: Event) => this.fats = (e.target as HTMLInputElement).value}
                  class="w-full px-2 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1">У${this.per100g ? '/100г' : ' (г)'}</label>
                <input
                  type="text"
                  inputmode="decimal"
                  value=${this.carbs}
                  @input=${(e: Event) => this.carbs = (e.target as HTMLInputElement).value}
                  class="w-full px-2 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            <button
              type="submit"
              ?disabled=${!this.calories.trim() || isNaN(parseNum(this.calories)) || parseNum(this.calories) <= 0}
              class="w-full btn-primary text-white font-semibold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Добавить
            </button>
          </form>
        </div>

        <div class="lg:col-span-2 glass-white rounded-xl p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold">Приёмы пищи сегодня</h3>
            <div class="text-sm">
              <span class="font-semibold">${totalCalories}</span>
              /
              <span>${c.dailyCalorieTarget}</span> ккал
            </div>
          </div>
          <div class="space-y-2">
            ${todayMeals.length === 0
              ? html`<p class="text-gray-400 text-center py-8">Пока нет записей за сегодня</p>`
              : todayMeals.map(meal => {
                  if (this.editingId === meal.id) {
                    return html`
                      <div class="p-4 rounded-lg border-2 border-indigo-300 bg-indigo-50 space-y-3">
                        <div class="grid grid-cols-2 gap-2">
                          <div>
                            <label class="block text-xs font-medium mb-1">Дата</label>
                            <input type="date" .value=${this.editDate}
                              @input=${(e: Event) => this.editDate = (e.target as HTMLInputElement).value}
                              class="w-full px-2 py-1 rounded border border-indigo-300 text-sm" />
                          </div>
                          <div>
                            <label class="block text-xs font-medium mb-1">Приём пищи</label>
                            <select .value=${this.editType}
                              @change=${(e: Event) => this.editType = (e.target as HTMLSelectElement).value}
                              class="w-full px-2 py-1 rounded border border-indigo-300 text-sm">
                              <option value="Завтрак">Завтрак</option>
                              <option value="Перекус 1">Перекус 1</option>
                              <option value="Обед">Обед</option>
                              <option value="Перекус 2">Перекус 2</option>
                              <option value="Ужин">Ужин</option>
                              <option value="Перекус 3">Перекус 3</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label class="block text-xs font-medium mb-1">Описание</label>
                          <input type="text" value=${this.editDescription}
                            @input=${(e: Event) => this.editDescription = (e.target as HTMLInputElement).value}
                            class="w-full px-2 py-1 rounded border border-indigo-300 text-sm" />
                        </div>
                        <div class="grid grid-cols-4 gap-2">
                          <div>
                            <label class="block text-xs font-medium mb-1">Ккал</label>
                            <input type="text" inputmode="decimal" value=${this.editCalories}
                              @input=${(e: Event) => this.editCalories = (e.target as HTMLInputElement).value}
                              class="w-full px-2 py-1 rounded border border-indigo-300 text-sm" />
                          </div>
                          <div>
                            <label class="block text-xs font-medium mb-1">Б (г)</label>
                            <input type="text" inputmode="decimal" value=${this.editProtein}
                              @input=${(e: Event) => this.editProtein = (e.target as HTMLInputElement).value}
                              class="w-full px-2 py-1 rounded border border-indigo-300 text-sm" />
                          </div>
                          <div>
                            <label class="block text-xs font-medium mb-1">Ж (г)</label>
                            <input type="text" inputmode="decimal" value=${this.editFats}
                              @input=${(e: Event) => this.editFats = (e.target as HTMLInputElement).value}
                              class="w-full px-2 py-1 rounded border border-indigo-300 text-sm" />
                          </div>
                          <div>
                            <label class="block text-xs font-medium mb-1">У (г)</label>
                            <input type="text" inputmode="decimal" value=${this.editCarbs}
                              @input=${(e: Event) => this.editCarbs = (e.target as HTMLInputElement).value}
                              class="w-full px-2 py-1 rounded border border-indigo-300 text-sm" />
                          </div>
                        </div>
                        <div class="flex justify-end space-x-2">
                          <button @click=${this.cancelEdit}
                            class="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded-lg border">Отмена</button>
                          <button @click=${this.saveEdit}
                            class="px-4 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium">Сохранить</button>
                        </div>
                      </div>
                    `;
                  }

                  return html`
                    <div class="meal-item p-4 rounded-lg border flex justify-between items-start">
                      <div class="flex-1">
                        <div class="font-semibold">${meal.type}</div>
                        <div class="text-sm text-gray-600">${meal.description || 'Без описания'}</div>
                        <div class="text-xs text-gray-500 mt-1">
                          Б: ${meal.protein}г | Ж: ${meal.fats}г | У: ${meal.carbs}г
                        </div>
                      </div>
                      <div class="text-right ml-4">
                        <div class="text-lg font-bold">${meal.calories}</div>
                        <div class="text-xs text-gray-500">ккал</div>
                        <div class="flex space-x-2 mt-2">
                          <button
                            @click=${() => this.startEdit(meal)}
                            class="delete-btn text-indigo-600 hover:text-indigo-700 text-xs"
                          >
                            Изменить
                          </button>
                          <button
                            @click=${() => this.handleDelete(meal.id)}
                            class="delete-btn text-red-600 hover:text-red-700 text-xs"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                })
            }
          </div>
          <div class="mt-4 pt-4 border-t">
            <div class="flex justify-between items-center">
              <span class="font-semibold">Осталось на сегодня:</span>
              <span class="text-2xl font-bold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}">
                ${remaining}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'calories-tab': CaloriesTab;
  }
}
