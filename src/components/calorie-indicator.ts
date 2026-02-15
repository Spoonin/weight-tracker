import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('calorie-indicator')
export class CalorieIndicator extends LitElement {
  createRenderRoot() {
    return this;
  }

  @property({ type: Number }) todayCalories = 0;
  @property({ type: Number }) dailyCalorieTarget = 0;
  @property({ type: Number }) todayProtein = 0;
  @property({ type: Number }) todayFats = 0;
  @property({ type: Number }) todayCarbs = 0;
  @property({ type: Number }) proteinTarget = 0;
  @property({ type: Number }) fatsTarget = 0;
  @property({ type: Number }) carbsTarget = 0;

  private handleClick() {
    this.dispatchEvent(new CustomEvent('tab-change', {
      detail: { tab: 'calories' },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    const remaining = this.dailyCalorieTarget - this.todayCalories;
    const progress = this.dailyCalorieTarget > 0
      ? (this.todayCalories / this.dailyCalorieTarget) * 100
      : 0;

    return html`
      <div class="glass-white rounded-2xl p-6 mb-6 cursor-pointer hover:ring-2 hover:ring-indigo-200 transition-all" @click=${this.handleClick}>
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-500 mb-1">Съедено ${this.todayCalories} из ${this.dailyCalorieTarget} ккал</div>
          <div class="text-5xl sm:text-6xl font-bold ${remaining < 0 ? 'text-red-500' : 'text-indigo-600'} my-2">
            ${Math.abs(remaining)}
          </div>
          <div class="text-lg font-medium ${remaining < 0 ? 'text-red-400' : 'text-gray-500'} mb-4">
            ${remaining >= 0 ? 'ккал осталось' : 'ккал перебор'}
          </div>
          <div class="w-full max-w-md bg-gray-200 rounded-full h-4 mb-4">
            <div
              class="progress-bar ${progress > 100 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-purple-500 to-indigo-600'} h-4 rounded-full transition-all"
              style="width: ${Math.min(progress, 100)}%"
            ></div>
          </div>
          <div class="grid grid-cols-3 gap-6 w-full max-w-md">
            <div class="text-center">
              <div class="text-xl font-bold text-purple-600">${this.todayProtein.toFixed(0)}<span class="text-sm font-normal text-gray-400">/${this.proteinTarget}</span></div>
              <div class="text-xs text-gray-500">Белки (г)</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold text-amber-600">${this.todayFats.toFixed(0)}<span class="text-sm font-normal text-gray-400">/${this.fatsTarget}</span></div>
              <div class="text-xs text-gray-500">Жиры (г)</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold text-blue-600">${this.todayCarbs.toFixed(0)}<span class="text-sm font-normal text-gray-400">/${this.carbsTarget}</span></div>
              <div class="text-xs text-gray-500">Углеводы (г)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'calorie-indicator': CalorieIndicator;
  }
}
