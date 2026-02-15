import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../store';
import { todayISO } from '../utils';
import { daysBetween, calculateMacros } from '../calculations';
import { updateCharts } from '../charts';
import { analyzeCalibration, applyCalibration, type CalibrationResult } from '../calibration';
import './calorie-indicator';

@customElement('dashboard-tab')
export class DashboardTab extends LitElement {
  @state() private currentWeight = '—';
  @state() private targetWeight = '—';
  @state() private daysRemaining = '—';
  @state() private targetDateShort = '';
  @state() private todayCalories = 0;
  @state() private todayProtein = 0;
  @state() private todayFats = 0;
  @state() private todayCarbs = 0;
  @state() private calorieProgress = 0;
  @state() private calibration: CalibrationResult | null = null;
  @state() private showCalibrationDetails = false;

  createRenderRoot() {
    return this; // Disable shadow DOM to use global Tailwind styles
  }

  connectedCallback() {
    super.connectedCallback();
    this.updateData();
    setTimeout(() => updateCharts(), 100);
  }

  private updateData() {
    const c = store.config!;

    if (store.weightData.length > 0) {
      this.currentWeight = String(store.weightData[0].weight);
    }

    this.targetWeight = String(c.targetWeight);
    
    const daysLeft = daysBetween(new Date(), new Date(c.endDate));
    this.daysRemaining = String(daysLeft);
    this.targetDateShort = `до ${new Date(c.endDate).toLocaleDateString('ru-RU')}`;

    const today = todayISO();
    const todayMeals = store.calorieData.filter((m) => m.date === today);
    this.todayCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
    this.todayProtein = todayMeals.reduce((sum, m) => sum + m.protein, 0);
    this.todayFats = todayMeals.reduce((sum, m) => sum + m.fats, 0);
    this.todayCarbs = todayMeals.reduce((sum, m) => sum + m.carbs, 0);

    this.calorieProgress = (this.todayCalories / c.dailyCalorieTarget) * 100;

    // Калибровка
    this.calibration = analyzeCalibration(c, store.weightData, store.calorieData);
  }

  render() {
    const c = store.config!;
    const remaining = c.dailyCalorieTarget - this.todayCalories;

    return html`
      <div class="fade-in">
        <calorie-indicator
          .todayCalories=${this.todayCalories}
          .dailyCalorieTarget=${c.dailyCalorieTarget}
          .todayProtein=${this.todayProtein}
          .todayFats=${this.todayFats}
          .todayCarbs=${this.todayCarbs}
          .proteinTarget=${c.proteinTarget}
          .fatsTarget=${c.fatsTarget}
          .carbsTarget=${c.carbsTarget}
        ></calorie-indicator>

        <!-- Стат-карточки -->
        <div class="grid grid-cols-3 gap-3 mb-6">
          <div class="glass stat-card rounded-xl p-4 text-center cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all"
            @click=${() => this.navigateToTab('weight')}>
            <div class="text-gray-300 text-xs mb-1">Текущий вес</div>
            <div class="text-2xl font-bold text-white">${this.currentWeight}</div>
            <div class="text-gray-400 text-xs">кг</div>
          </div>
          <div class="glass stat-card rounded-xl p-4 text-center">
            <div class="text-gray-300 text-xs mb-1">Цель</div>
            <div class="text-2xl font-bold text-emerald-400">${this.targetWeight}</div>
            <div class="text-gray-400 text-xs">кг</div>
          </div>
          <div class="glass stat-card rounded-xl p-4 text-center">
            <div class="text-gray-300 text-xs mb-1">Дней</div>
            <div class="text-2xl font-bold text-white">${this.daysRemaining}</div>
            <div class="text-gray-400 text-xs">${this.targetDateShort}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div class="glass-white rounded-xl p-6">
            <h3 class="text-xl font-bold mb-4">Прогресс веса</h3>
            <div class="chart-container">
              <canvas id="weightChart"></canvas>
            </div>
          </div>
          <div class="glass-white rounded-xl p-6">
            <h3 class="text-xl font-bold mb-4">Калории за неделю</h3>
            <div class="chart-container">
              <canvas id="calorieChart"></canvas>
            </div>
          </div>
        </div>

        ${this.renderCalibrationCard()}
      </div>
    `;
  }

  private renderCalibrationCard() {
    const cal = this.calibration;
    if (!cal) return html``;

    // Недостаточно данных
    if (!cal.hasEnoughData) {
      return html`
        <div class="glass-white rounded-xl p-6 mt-6">
          <h3 class="text-xl font-bold mb-2">📊 Калибровка</h3>
          <p class="text-gray-500 text-sm">
            Для анализа нужно минимум 7 утренних замеров веса.
            Сейчас: ${cal.dataPointsUsed} из 7.
          </p>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div
              class="bg-gradient-to-r from-purple-400 to-indigo-500 h-2 rounded-full transition-all"
              style="width: ${(cal.dataPointsUsed / 7) * 100}%"
            ></div>
          </div>
        </div>
      `;
    }

    // На пути — всё ок
    if (!cal.needsCalibration) {
      return html`
        <div class="glass-white rounded-xl p-6 mt-6 border-l-4 border-green-500">
          <h3 class="text-xl font-bold mb-2">✅ Калибровка</h3>
          <p class="text-gray-600 text-sm">
            Вы идёте по плану! Средний вес за 7 дней:
            <span class="font-semibold">${cal.movingAverage} кг</span>,
            ожидаемый: <span class="font-semibold">${cal.expectedWeight} кг</span>.
          </p>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div class="text-center">
              <div class="text-lg font-bold text-green-600">${cal.actualWeeklyRate} кг/нед</div>
              <div class="text-xs text-gray-500">Фактическая скорость</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-gray-600">${cal.plannedWeeklyRate} кг/нед</div>
              <div class="text-xs text-gray-500">Плановая скорость</div>
            </div>
          </div>
        </div>
      `;
    }

    // Нужна калибровка
    const isSlower = cal.direction === "slower";
    const borderColor = isSlower ? "border-amber-500" : "border-blue-500";
    const icon = isSlower ? "⚠️" : "🚀";
    const emoji = isSlower ? "📈" : "📉";
    const statusText = isSlower
      ? "Вес снижается медленнее плана"
      : "Вес снижается быстрее плана";
    const adviceText = isSlower
      ? "Рекомендуется снизить дневной калораж"
      : "Можно немного увеличить дневной калораж";

    const diff = cal.suggestedCalories - store.config!.dailyCalorieTarget;
    const diffStr = diff > 0 ? `+${diff}` : String(diff);

    return html`
      <div class="glass-white rounded-xl p-6 mt-6 border-l-4 ${borderColor} calibration-alert">
        <div class="flex items-start justify-between">
          <h3 class="text-xl font-bold mb-1">${icon} Нужна калибровка</h3>
          <button
            class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            @click=${() => { this.showCalibrationDetails = !this.showCalibrationDetails; }}
          >
            ${this.showCalibrationDetails ? "Скрыть" : "Подробнее"}
          </button>
        </div>
        <p class="text-gray-600 text-sm mb-4">${statusText}. ${adviceText}.</p>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-lg font-bold">${cal.movingAverage}</div>
            <div class="text-xs text-gray-500">Средний вес (7д)</div>
          </div>
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-lg font-bold">${cal.expectedWeight}</div>
            <div class="text-xs text-gray-500">Ожидаемый</div>
          </div>
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-lg font-bold ${isSlower ? 'text-amber-600' : 'text-blue-600'}">
              ${emoji} ${Math.abs(cal.deviationKg)} кг
            </div>
            <div class="text-xs text-gray-500">Отклонение</div>
          </div>
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-lg font-bold">${cal.actualWeeklyRate}</div>
            <div class="text-xs text-gray-500">кг/нед факт</div>
          </div>
        </div>

        ${this.showCalibrationDetails ? html`
          <div class="border-t pt-4 mb-4 space-y-2 text-sm text-gray-600">
            <div class="flex justify-between">
              <span>Плановая скорость:</span>
              <span class="font-medium">${cal.plannedWeeklyRate} кг/нед</span>
            </div>
            <div class="flex justify-between">
              <span>Оценка реального TDEE:</span>
              <span class="font-medium">${cal.estimatedTDEE} ккал</span>
            </div>
            <div class="flex justify-between">
              <span>Текущий калораж:</span>
              <span class="font-medium">${store.config!.dailyCalorieTarget} ккал</span>
            </div>
            <div class="flex justify-between">
              <span>Рекомендуемый калораж:</span>
              <span class="font-semibold ${isSlower ? 'text-amber-600' : 'text-blue-600'}">
                ${cal.suggestedCalories} ккал (${diffStr})
              </span>
            </div>
            <div class="flex justify-between">
              <span>Новые макросы (Б/Ж/У):</span>
              <span class="font-medium">
                ${cal.suggestedMacros.protein}г / ${cal.suggestedMacros.fats}г / ${cal.suggestedMacros.carbs}г
              </span>
            </div>
          </div>
        ` : html``}

        <button
          class="w-full btn-primary py-3 rounded-xl text-sm font-semibold"
          @click=${this.handleApplyCalibration}
        >
          Применить: ${cal.suggestedCalories} ккал/день (${diffStr})
        </button>
      </div>
    `;
  }

  private navigateToTab(tab: string) {
    this.dispatchEvent(new CustomEvent('tab-change', {
      detail: { tab },
      bubbles: true,
      composed: true,
    }));
  }

  private handleApplyCalibration() {
    if (!this.calibration || !store.config) return;

    const confirmed = confirm(
      `Обновить дневной калораж?\n\n` +
      `Текущий: ${store.config.dailyCalorieTarget} ккал\n` +
      `Новый: ${this.calibration.suggestedCalories} ккал\n\n` +
      `Макросы:\n` +
      `Б: ${this.calibration.suggestedMacros.protein}г\n` +
      `Ж: ${this.calibration.suggestedMacros.fats}г\n` +
      `У: ${this.calibration.suggestedMacros.carbs}г`
    );

    if (!confirmed) return;

    store.config = applyCalibration(store.config, this.calibration);
    store.saveConfig();
    this.updateData();
    this.requestUpdate();

    // Обновить графики
    setTimeout(() => updateCharts(), 100);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dashboard-tab': DashboardTab;
  }
}
