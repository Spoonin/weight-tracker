import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { store } from '../store';
import { formatDate } from '../utils';

@customElement('history-tab')
export class HistoryTab extends LitElement {
  createRenderRoot() {
    return this; // Disable shadow DOM to use global Tailwind styles
  }

  private getMealsByDate() {
    const mealsByDate: Record<string, typeof store.calorieData> = {};
    store.calorieData.forEach((meal) => {
      if (!mealsByDate[meal.date]) mealsByDate[meal.date] = [];
      mealsByDate[meal.date].push(meal);
    });
    return mealsByDate;
  }

  render() {
    const c = store.config!;
    const mealsByDate = this.getMealsByDate();
    const dates = Object.keys(mealsByDate).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );

    return html`
      <div class="glass-white rounded-xl p-6">
        <h3 class="text-xl font-bold mb-4">История по дням</h3>
        <div class="space-y-4">
          ${dates.length === 0
            ? html`<p class="text-gray-400 text-center py-8">Нет записей</p>`
            : dates.map(date => {
                const meals = mealsByDate[date];
                const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
                const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
                const totalFats = meals.reduce((sum, m) => sum + m.fats, 0);
                const totalCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);

                return html`
                  <div class="border rounded-lg p-4">
                    <div class="flex justify-between items-start mb-3">
                      <div>
                        <h4 class="font-bold text-lg">${formatDate(date)}</h4>
                        <div class="text-sm text-gray-600">${meals.length} приёмов пищи</div>
                      </div>
                      <div class="text-right">
                        <div class="text-2xl font-bold ${totalCalories > c.dailyCalorieTarget ? 'text-red-600' : 'text-green-600'}">
                          ${totalCalories}
                        </div>
                        <div class="text-xs text-gray-500">ккал</div>
                      </div>
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-center text-sm border-t pt-3">
                      <div>
                        <div class="font-semibold">${totalProtein.toFixed(1)}г</div>
                        <div class="text-xs text-gray-500">Белки</div>
                      </div>
                      <div>
                        <div class="font-semibold">${totalFats.toFixed(1)}г</div>
                        <div class="text-xs text-gray-500">Жиры</div>
                      </div>
                      <div>
                        <div class="font-semibold">${totalCarbs.toFixed(1)}г</div>
                        <div class="text-xs text-gray-500">Углеводы</div>
                      </div>
                    </div>
                  </div>
                `;
              })
          }
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'history-tab': HistoryTab;
  }
}
