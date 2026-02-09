import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../store';
import {
  calculateBMR,
  calculateTDEE,
  calculateDailyTarget,
  calculateMacros,
  daysBetween,
  weeklyRate,
} from '../calculations';

@customElement('onboarding-modal')
export class OnboardingModal extends LitElement {
  @state() private currentWeight = '';
  @state() private targetWeight = '';
  @state() private height = '';
  @state() private age = '';
  @state() private gender: 'male' | 'female' = 'male';
  @state() private targetDate = '';
  @state() private activity = 1.55;
  @state() private preview = {
    bmr: 0,
    tdee: 0,
    target: 0,
    rate: 0,
    protein: 0,
    fats: 0,
    carbs: 0,
  };

  createRenderRoot() {
    return this; // Disable shadow DOM to use global Tailwind styles
  }

  connectedCallback() {
    super.connectedCallback();
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 5);
    this.targetDate = defaultDate.toISOString().split('T')[0];
  }

  private updatePreview() {
    const cw = parseFloat(this.currentWeight);
    const tw = parseFloat(this.targetWeight);
    const h = parseFloat(this.height);
    const a = parseFloat(this.age);
    
    if (!cw || !tw || !h || !a || !this.targetDate) return;

    const bmr = calculateBMR(cw, h, a, this.gender);
    const tdee = calculateTDEE(bmr, this.activity);
    const daysToGoal = daysBetween(new Date(), new Date(this.targetDate));
    const weightToLose = cw - tw;
    const dailyTarget = calculateDailyTarget(tdee, weightToLose, daysToGoal);
    const rate = weeklyRate(weightToLose, daysToGoal);
    const macros = calculateMacros(dailyTarget);

    this.preview = {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target: dailyTarget,
      rate,
      protein: macros.protein,
      fats: macros.fats,
      carbs: macros.carbs,
    };
  }

  private handleSubmit(e: Event) {
    e.preventDefault();
    
    const v = {
      currentWeight: parseFloat(this.currentWeight),
      targetWeight: parseFloat(this.targetWeight),
      height: parseFloat(this.height),
      age: parseFloat(this.age),
      gender: this.gender,
      targetDate: this.targetDate,
      activity: this.activity,
    };

    const bmr = calculateBMR(v.currentWeight, v.height, v.age, v.gender);
    const tdee = calculateTDEE(bmr, v.activity);
    const today = new Date();
    const goal = new Date(v.targetDate);
    const daysToGoal = daysBetween(today, goal);
    const weightToLose = v.currentWeight - v.targetWeight;
    const dailyTarget = calculateDailyTarget(tdee, weightToLose, daysToGoal);
    const macros = calculateMacros(dailyTarget);

    store.config = {
      startDate: today.toISOString().split('T')[0],
      endDate: v.targetDate,
      startWeight: v.currentWeight,
      targetWeight: v.targetWeight,
      height: v.height,
      age: v.age,
      gender: v.gender,
      activityLevel: v.activity,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      dailyCalorieTarget: dailyTarget,
      proteinTarget: macros.protein,
      fatsTarget: macros.fats,
      carbsTarget: macros.carbs,
    };
    store.saveConfig();

    // Добавить стартовый вес в таблицу взвешиваний
    const startDate = today.toISOString().split('T')[0];
    store.weightData.push({
      id: Date.now(),
      date: startDate,
      time: 'morning',
      weight: v.currentWeight,
      expected: v.currentWeight,
    });
    store.saveWeight();

    this.dispatchEvent(new CustomEvent('complete', {
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="glass-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <h2 class="text-3xl font-bold mb-2">Добро пожаловать!</h2>
          <p class="text-gray-600 mb-6">Давайте настроим ваш план похудения</p>

          <form @submit=${this.handleSubmit} class="space-y-6">
            <div class="space-y-4">
              <h3 class="text-xl font-bold text-purple-600">1. Основные данные</h3>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-2">Текущий вес (кг) *</label>
                  <input
                    type="number"
                    step="0.1"
                    .value=${this.currentWeight}
                    @input=${(e: Event) => {
                      this.currentWeight = (e.target as HTMLInputElement).value;
                      this.updatePreview();
                    }}
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg"
                    placeholder="82.2"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Целевой вес (кг) *</label>
                  <input
                    type="number"
                    step="0.1"
                    .value=${this.targetWeight}
                    @input=${(e: Event) => {
                      this.targetWeight = (e.target as HTMLInputElement).value;
                      this.updatePreview();
                    }}
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg"
                    placeholder="75.5"
                    required
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-2">Рост (см) *</label>
                  <input
                    type="number"
                    .value=${this.height}
                    @input=${(e: Event) => {
                      this.height = (e.target as HTMLInputElement).value;
                      this.updatePreview();
                    }}
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg"
                    placeholder="177"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Возраст *</label>
                  <input
                    type="number"
                    .value=${this.age}
                    @input=${(e: Event) => {
                      this.age = (e.target as HTMLInputElement).value;
                      this.updatePreview();
                    }}
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg"
                    placeholder="42"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Пол *</label>
                  <select
                    .value=${this.gender}
                    @change=${(e: Event) => {
                      this.gender = (e.target as HTMLSelectElement).value as 'male' | 'female';
                      this.updatePreview();
                    }}
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg"
                    required
                  >
                    <option value="male">Мужчина</option>
                    <option value="female">Женщина</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2">Дата цели *</label>
                <input
                  type="date"
                  .value=${this.targetDate}
                  @input=${(e: Event) => {
                    this.targetDate = (e.target as HTMLInputElement).value;
                    this.updatePreview();
                  }}
                  class="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg"
                  required
                />
              </div>
            </div>

            <div class="space-y-4">
              <h3 class="text-xl font-bold text-purple-600">2. Уровень активности</h3>
              <div class="space-y-2">
                ${this.renderActivityOption(1.2, 'Минимальная активность', 'Сидячая работа, нет упражнений')}
                ${this.renderActivityOption(1.375, 'Лёгкая активность', 'Лёгкие упражнения 1-3 раза в неделю')}
                ${this.renderActivityOption(1.55, 'Умеренная активность', 'Тренировки 3-5 раз в неделю')}
                ${this.renderActivityOption(1.725, 'Высокая активность', 'Интенсивные тренировки 6-7 раз в неделю')}
                ${this.renderActivityOption(1.9, 'Очень высокая активность', 'Физическая работа + интенсивные тренировки')}
              </div>
            </div>

            <div class="bg-purple-50 rounded-lg p-6 space-y-3">
              <h3 class="text-xl font-bold text-purple-600">Ваш план</h3>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div class="text-gray-600">Базовый обмен (BMR)</div>
                  <div class="text-2xl font-bold">${this.preview.bmr || '—'} ${this.preview.bmr ? 'ккал' : ''}</div>
                </div>
                <div>
                  <div class="text-gray-600">Расход калорий (TDEE)</div>
                  <div class="text-2xl font-bold">${this.preview.tdee || '—'} ${this.preview.tdee ? 'ккал' : ''}</div>
                </div>
                <div>
                  <div class="text-gray-600">Дневная норма</div>
                  <div class="text-2xl font-bold text-purple-600 ${this.preview.target < 1200 ? 'text-red-600' : ''}">
                    ${this.preview.target || '—'} ${this.preview.target ? 'ккал' : ''}
                  </div>
                </div>
                <div>
                  <div class="text-gray-600">Темп похудения</div>
                  <div class="text-2xl font-bold ${this.preview.rate > 1 ? 'text-red-600' : 'text-green-600'}">
                    ${this.preview.rate ? this.preview.rate.toFixed(2) + ' кг/нед' : '—'}
                  </div>
                </div>
              </div>
              <div class="text-sm text-gray-600 border-t pt-3 mt-3">
                <strong>Рекомендации по макронутриентам:</strong>
                <div class="grid grid-cols-3 gap-2 mt-2">
                  <div>Белки: <span class="font-semibold">${this.preview.protein || '—'}${this.preview.protein ? 'г' : ''}</span></div>
                  <div>Жиры: <span class="font-semibold">${this.preview.fats || '—'}${this.preview.fats ? 'г' : ''}</span></div>
                  <div>Углеводы: <span class="font-semibold">${this.preview.carbs || '—'}${this.preview.carbs ? 'г' : ''}</span></div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              class="w-full btn-primary text-white font-bold py-4 rounded-lg text-lg"
            >
              Начать отслеживание
            </button>
          </form>
        </div>
      </div>
    `;
  }

  private renderActivityOption(value: number, title: string, description: string) {
    return html`
      <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:border-purple-400 transition">
        <input
          type="radio"
          name="activity"
          .value=${String(value)}
          .checked=${this.activity === value}
          @change=${() => {
            this.activity = value;
            this.updatePreview();
          }}
          class="mt-1 mr-3"
        />
        <div>
          <div class="font-semibold">${title}</div>
          <div class="text-sm text-gray-600">${description}</div>
        </div>
      </label>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'onboarding-modal': OnboardingModal;
  }
}
