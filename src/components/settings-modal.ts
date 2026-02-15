import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../store';
import { formatDateFull } from '../utils';
import { daysBetween } from '../calculations';
import { hasApiKey, saveApiKey, deleteApiKey } from '../ai-analysis';

@customElement('settings-modal')
export class SettingsModal extends LitElement {
  createRenderRoot() {
    return this; // Disable shadow DOM to use global Tailwind styles
  }

  @state() private apiKeyInput = '';
  @state() private apiKeySaved = hasApiKey();

  private handleSaveApiKey() {
    const key = this.apiKeyInput.trim();
    if (!key) return;
    saveApiKey(key);
    this.apiKeyInput = '';
    this.apiKeySaved = true;
  }

  private handleDeleteApiKey() {
    if (!confirm('Удалить API ключ?')) return;
    deleteApiKey();
    this.apiKeySaved = false;
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true,
    }));
  }

  private handleReset() {
    if (!confirm('ВНИМАНИЕ! Это удалит ВСЕ данные и настройки. Вы уверены?')) return;
    if (!confirm('Последнее предупреждение! Все данные будут потеряны. Продолжить?')) return;
    localStorage.clear();
    location.reload();
  }

  render() {
    const c = store.config;
    if (!c) return html``;

    const daysLeft = daysBetween(new Date(), new Date(c.endDate));

    return html`
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="glass-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-bold">Настройки</h2>
            <button
              @click=${this.handleClose}
              class="text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
          </div>

          <div class="space-y-6">
            <div class="bg-blue-50 rounded-lg p-6">
              <h3 class="font-bold text-lg mb-4">Ваши параметры</h3>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-600">Текущий вес:</span>
                  <strong>${c.startWeight} кг</strong>
                </div>
                <div>
                  <span class="text-gray-600">Целевой вес:</span>
                  <strong>${c.targetWeight} кг</strong>
                </div>
                <div>
                  <span class="text-gray-600">Рост:</span>
                  <strong>${c.height} см</strong>
                </div>
                <div>
                  <span class="text-gray-600">Возраст:</span>
                  <strong>${c.age} лет</strong>
                </div>
                <div>
                  <span class="text-gray-600">Дата цели:</span>
                  <strong>${formatDateFull(c.endDate)}</strong>
                </div>
                <div>
                  <span class="text-gray-600">Дней осталось:</span>
                  <strong>${daysLeft} дней</strong>
                </div>
              </div>
            </div>

            <div class="bg-purple-50 rounded-lg p-6">
              <h3 class="font-bold text-lg mb-4">Расчёты</h3>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-600">BMR:</span>
                  <strong>${c.bmr} ккал</strong>
                </div>
                <div>
                  <span class="text-gray-600">TDEE:</span>
                  <strong>${c.tdee} ккал</strong>
                </div>
                <div>
                  <span class="text-gray-600">Дневная норма:</span>
                  <strong class="text-purple-600">${c.dailyCalorieTarget} ккал</strong>
                </div>
                <div>
                  <span class="text-gray-600">Дефицит:</span>
                  <strong>${c.tdee - c.dailyCalorieTarget} ккал</strong>
                </div>
              </div>
              <div class="mt-4 pt-4 border-t">
                <div class="font-semibold mb-2">Макронутриенты:</div>
                <div class="grid grid-cols-3 gap-2 text-sm">
                  <div>Белки: <strong>${c.proteinTarget}г</strong></div>
                  <div>Жиры: <strong>${c.fatsTarget}г</strong></div>
                  <div>Углеводы: <strong>${c.carbsTarget}г</strong></div>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 rounded-lg p-6">
              <h3 class="font-bold text-lg mb-2">🤖 Claude AI Integration</h3>
              <p class="text-sm text-gray-600 mb-3">
                Для автоматического распознавания еды по фото требуется API ключ Anthropic.
                <a href="https://console.anthropic.com/" target="_blank" class="text-blue-600 underline">
                  Получить ключ
                </a>
              </p>

              <div class="mb-3">
                <label class="block text-sm font-medium mb-1">API Key</label>
                <input type="password"
                  .value=${this.apiKeyInput}
                  @input=${(e: Event) => this.apiKeyInput = (e.target as HTMLInputElement).value}
                  placeholder="sk-ant-..."
                  class="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>

              <div class="flex gap-2 mb-3">
                <button @click=${this.handleSaveApiKey}
                  class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                  Сохранить
                </button>
                ${this.apiKeySaved ? html`
                  <button @click=${this.handleDeleteApiKey}
                    class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                    Удалить ключ
                  </button>
                ` : ''}
              </div>

              <div class="text-sm mb-3">
                ${this.apiKeySaved
                  ? html`<span class="text-green-600">✓ API ключ сохранён</span>`
                  : html`<span class="text-gray-500">API ключ не установлен</span>`
                }
              </div>

              <div class="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                ⚠️ API ключ хранится локально в браузере. Не используйте на общедоступных компьютерах.
                Стоимость: ~$0.003 за фото (~$0.30/месяц при 2-3 фото в день).
              </div>
            </div>

            <div class="bg-amber-50 rounded-lg p-6">
              <h3 class="font-bold text-lg mb-4">Опасная зона</h3>
              <p class="text-sm text-gray-600 mb-4">
                Сброс настроек приведёт к удалению всех данных и повторному
                прохождению настройки.
              </p>
              <button
                @click=${this.handleReset}
                class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Сбросить все настройки
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'settings-modal': SettingsModal;
  }
}
