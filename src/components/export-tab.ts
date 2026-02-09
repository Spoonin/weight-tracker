import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { store } from '../store';
import { downloadFile } from '../utils';
import type { Backup } from '../types';

@customElement('export-tab')
export class ExportTab extends LitElement {
  createRenderRoot() {
    return this; // Disable shadow DOM to use global Tailwind styles
  }

  private exportWeightCSV() {
    let csv = 'Дата,Время,Вес (кг),Ожидаемый (кг),Отклонение (кг)\n';
    store.weightData.forEach((w) => {
      const deviation = (w.weight - w.expected).toFixed(1);
      csv += `${w.date},${w.time === 'morning' ? 'Утро' : 'Вечер'},${w.weight},${w.expected},${deviation}\n`;
    });
    downloadFile(
      new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }),
      'weight_data.csv',
    );
  }

  private exportCaloriesCSV() {
    let csv = 'Дата,Приём пищи,Описание,Калории,Белки (г),Жиры (г),Углеводы (г)\n';
    store.calorieData.forEach((m) => {
      csv += `${m.date},${m.type},"${m.description}",${m.calories},${m.protein},${m.fats},${m.carbs}\n`;
    });
    downloadFile(
      new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }),
      'calorie_data.csv',
    );
  }

  private exportBackup() {
    const backup: Backup = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      userConfig: store.config!,
      weightData: store.weightData,
      calorieData: store.calorieData,
    };
    downloadFile(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      `tracker_backup_${new Date().toISOString().split('T')[0]}.json`,
    );
  }

  private handleImportClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => this.importBackup(e);
    input.click();
  }

  private importBackup(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target!.result as string) as Partial<Backup>;
        if (!confirm('Импортировать данные? Текущие данные будут заменены!')) return;

        if (backup.userConfig) store.config = backup.userConfig;
        store.weightData = backup.weightData || [];
        store.calorieData = backup.calorieData || [];

        store.saveConfig();
        store.saveWeight();
        store.saveCalories();

        alert('Данные успешно импортированы! Страница перезагрузится.');
        location.reload();
      } catch (error) {
        alert('Ошибка при чтении файла: ' + (error as Error).message);
      }
    };
    reader.readAsText(file);
  }

  private clearAllData() {
    if (!confirm('ВНИМАНИЕ! Это удалит ВСЕ данные приложения, включая настройки. Вы уверены?')) return;
    if (!confirm('Последнее предупреждение! Все данные будут потеряны. Продолжить?')) return;
    store.clearAll();
    alert('Все данные удалены. Страница перезагрузится.');
    location.reload();
  }

  render() {
    return html`
      <div class="glass-white rounded-xl p-6">
        <h3 class="text-xl font-bold mb-6">Экспорт данных</h3>
        <div class="space-y-4">
          <div class="p-4 bg-blue-50 rounded-lg">
            <h4 class="font-semibold mb-2">Экспорт в CSV</h4>
            <p class="text-sm text-gray-600 mb-4">
              Скачайте все данные в формате CSV для анализа в Excel или Google Sheets
            </p>
            <div class="space-y-2">
              <button
                @click=${this.exportWeightCSV}
                class="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Экспорт веса
              </button>
              <button
                @click=${this.exportCaloriesCSV}
                class="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ml-0 md:ml-2"
              >
                Экспорт калорий
              </button>
            </div>
          </div>

          <div class="p-4 bg-purple-50 rounded-lg">
            <h4 class="font-semibold mb-2">Резервная копия</h4>
            <p class="text-sm text-gray-600 mb-4">
              Сохраните все данные в JSON формате
            </p>
            <button
              @click=${this.exportBackup}
              class="w-full md:w-auto px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Скачать бэкап
            </button>
          </div>

          <div class="p-4 bg-green-50 rounded-lg">
            <h4 class="font-semibold mb-2">Импорт данных</h4>
            <p class="text-sm text-gray-600 mb-4">
              Восстановите данные из резервной копии
            </p>
            <button
              @click=${this.handleImportClick}
              class="w-full md:w-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Загрузить бэкап
            </button>
          </div>

          <div class="p-4 bg-red-50 rounded-lg">
            <h4 class="font-semibold mb-2 text-red-700">
              Очистить все данные
            </h4>
            <p class="text-sm text-gray-600 mb-4">
              Удалить все данные приложения (необратимо)
            </p>
            <button
              @click=${this.clearAllData}
              class="w-full md:w-auto px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Очистить всё
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'export-tab': ExportTab;
  }
}
