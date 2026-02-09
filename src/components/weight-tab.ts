import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../store';
import { todayISO, formatDate } from '../utils';
import { calculateExpectedWeight } from '../calculations';

@customElement('weight-tab')
export class WeightTab extends LitElement {
  createRenderRoot() {
    return this; // Disable shadow DOM to use global Tailwind styles
  }

  @state() private date = todayISO();
  @state() private time: 'morning' | 'evening' = 'morning';
  @state() private weight = '';

  // Edit state
  @state() private editingId: number | null = null;
  @state() private editDate = '';
  @state() private editTime: 'morning' | 'evening' = 'morning';
  @state() private editWeight = '';

  private startEdit(entry: { id: number; date: string; time: 'morning' | 'evening'; weight: number }) {
    this.editingId = entry.id;
    this.editDate = entry.date;
    this.editTime = entry.time;
    this.editWeight = String(entry.weight);
  }

  private cancelEdit() {
    this.editingId = null;
  }

  private saveEdit() {
    const entry = store.weightData.find((w) => w.id === this.editingId);
    if (!entry) return;

    entry.date = this.editDate;
    entry.time = this.editTime;
    entry.weight = parseFloat(this.editWeight);
    entry.expected = calculateExpectedWeight(store.config!, this.editDate, this.editTime);

    store.weightData.sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        (b.time === 'evening' ? 1 : -1),
    );
    store.saveWeight();

    this.editingId = null;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('data-updated', { bubbles: true, composed: true }));
  }

  private handleSubmit(e: Event) {
    e.preventDefault();
    
    const weightValue = parseFloat(this.weight);
    const expected = calculateExpectedWeight(store.config!, this.date, this.time);

    store.weightData.push({
      id: Date.now(),
      date: this.date,
      time: this.time,
      weight: weightValue,
      expected,
    });

    store.weightData.sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        (b.time === 'evening' ? 1 : -1),
    );
    store.saveWeight();

    this.weight = '';
    this.date = todayISO();
    this.time = 'morning';
    
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('data-updated', { bubbles: true, composed: true }));
  }

  private handleDelete(id: number) {
    if (!confirm('Удалить это взвешивание?')) return;
    store.weightData = store.weightData.filter((w) => w.id !== id);
    store.saveWeight();
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('data-updated', { bubbles: true, composed: true }));
  }

  private handleClearAll() {
    if (!confirm('Удалить ВСЕ данные о весе? Это действие необратимо!')) return;
    store.weightData = [];
    store.saveWeight();
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('data-updated', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="glass-white rounded-xl p-6">
          <h3 class="text-xl font-bold mb-4">Добавить взвешивание</h3>
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
              <label class="block text-sm font-medium mb-2">Время</label>
              <select
                .value=${this.time}
                @change=${(e: Event) => this.time = (e.target as HTMLSelectElement).value as 'morning' | 'evening'}
                class="w-full px-4 py-2 rounded-lg border border-gray-300"
              >
                <option value="morning">Утро</option>
                <option value="evening">Вечер</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Вес (кг)</label>
              <input
                type="number"
                step="0.1"
                value=${this.weight}
                @input=${(e: Event) => this.weight = (e.target as HTMLInputElement).value}
                class="w-full px-4 py-2 rounded-lg border border-gray-300"
                placeholder="82.2"
                required
              />
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
            <h3 class="text-xl font-bold">История взвешиваний</h3>
            <button
              @click=${this.handleClearAll}
              class="text-sm text-red-600 hover:text-red-700"
            >
              Очистить всё
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b">
                  <th class="text-left py-3 px-2">Дата</th>
                  <th class="text-left py-3 px-2">Время</th>
                  <th class="text-right py-3 px-2">Вес (кг)</th>
                  <th class="text-right py-3 px-2">Ожидаемый</th>
                  <th class="text-right py-3 px-2">Отклонение</th>
                  <th class="text-right py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
              ${store.weightData.map(entry => {
                  const deviation = (entry.weight - entry.expected).toFixed(1);
                  const devNum = parseFloat(deviation);
                  const deviationClass = Math.abs(devNum) <= 0.2
                    ? 'text-green-600'
                    : devNum > 0
                    ? 'text-red-600'
                    : 'text-blue-600';

                  if (this.editingId === entry.id) {
                    return html`
                      <tr class="border-b bg-indigo-50">
                        <td class="py-2 px-2">
                          <input type="date" .value=${this.editDate}
                            @input=${(e: Event) => this.editDate = (e.target as HTMLInputElement).value}
                            class="w-full px-2 py-1 rounded border border-indigo-300 text-sm" />
                        </td>
                        <td class="py-2 px-2">
                          <select .value=${this.editTime}
                            @change=${(e: Event) => this.editTime = (e.target as HTMLSelectElement).value as 'morning' | 'evening'}
                            class="w-full px-2 py-1 rounded border border-indigo-300 text-sm">
                            <option value="morning">Утро</option>
                            <option value="evening">Вечер</option>
                          </select>
                        </td>
                        <td class="py-2 px-2">
                          <input type="number" step="0.1" value=${this.editWeight}
                            @input=${(e: Event) => this.editWeight = (e.target as HTMLInputElement).value}
                            class="w-full px-2 py-1 rounded border border-indigo-300 text-sm text-right" />
                        </td>
                        <td class="py-2 px-2 text-right text-gray-400 text-sm">—</td>
                        <td class="py-2 px-2 text-right text-gray-400 text-sm">—</td>
                        <td class="py-2 px-2 text-right space-x-2 whitespace-nowrap">
                          <button @click=${this.saveEdit}
                            class="text-green-600 hover:text-green-700 text-sm font-medium">Сохранить</button>
                          <button @click=${this.cancelEdit}
                            class="text-gray-500 hover:text-gray-700 text-sm">Отмена</button>
                        </td>
                      </tr>
                    `;
                  }

                  return html`
                    <tr class="border-b hover:bg-gray-50">
                      <td class="py-3 px-2">${formatDate(entry.date)}</td>
                      <td class="py-3 px-2">${entry.time === 'morning' ? 'Утро' : 'Вечер'}</td>
                      <td class="py-3 px-2 text-right font-semibold">${entry.weight}</td>
                      <td class="py-3 px-2 text-right text-gray-500">${entry.expected}</td>
                      <td class="py-3 px-2 text-right ${deviationClass}">
                        ${devNum > 0 ? '+' : ''}${deviation}
                      </td>
                      <td class="py-3 px-2 text-right space-x-2 whitespace-nowrap">
                        <button
                          @click=${() => this.startEdit(entry)}
                          class="text-indigo-600 hover:text-indigo-700 text-sm"
                        >
                          Изменить
                        </button>
                        <button
                          @click=${() => this.handleDelete(entry.id)}
                          class="text-red-600 hover:text-red-700 text-sm"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  `;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'weight-tab': WeightTab;
  }
}
