import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../store';
import { todayISO } from '../utils';

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

  private handleSubmit(e: Event) {
    e.preventDefault();

    store.calorieData.push({
      id: Date.now(),
      date: this.date,
      type: this.type,
      description: this.description,
      calories: parseFloat(this.calories),
      protein: parseFloat(this.protein) || 0,
      fats: parseFloat(this.fats) || 0,
      carbs: parseFloat(this.carbs) || 0,
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
                .value=${this.description}
                @input=${(e: Event) => this.description = (e.target as HTMLTextAreaElement).value}
                class="w-full px-4 py-2 rounded-lg border border-gray-300"
                rows="2"
                placeholder="Что вы съели?"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Калории</label>
              <input
                type="number"
                .value=${this.calories}
                @input=${(e: Event) => this.calories = (e.target as HTMLInputElement).value}
                class="w-full px-4 py-2 rounded-lg border border-gray-300"
                placeholder="0"
                required
              />
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-xs font-medium mb-1">Белки (г)</label>
                <input
                  type="number"
                  step="0.1"
                  .value=${this.protein}
                  @input=${(e: Event) => this.protein = (e.target as HTMLInputElement).value}
                  class="w-full px-2 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1">Жиры (г)</label>
                <input
                  type="number"
                  step="0.1"
                  .value=${this.fats}
                  @input=${(e: Event) => this.fats = (e.target as HTMLInputElement).value}
                  class="w-full px-2 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1">Углев. (г)</label>
                <input
                  type="number"
                  step="0.1"
                  .value=${this.carbs}
                  @input=${(e: Event) => this.carbs = (e.target as HTMLInputElement).value}
                  class="w-full px-2 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            <button
              type="submit"
              class="w-full btn-primary text-white font-semibold py-3 rounded-lg"
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
              : todayMeals.map(meal => html`
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
                      <button
                        @click=${() => this.handleDelete(meal.id)}
                        class="delete-btn text-red-600 hover:text-red-700 text-xs mt-2"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                `)
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
