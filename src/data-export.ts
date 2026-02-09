import { store } from "./store";
import { $, downloadFile } from "./utils";
import type { Backup } from "./types";

export function initExport() {
  $("btn-export-weight").addEventListener("click", exportWeightCSV);
  $("btn-export-calories").addEventListener("click", exportCaloriesCSV);
  $("btn-export-backup").addEventListener("click", exportBackup);
  $("btn-import-backup").addEventListener("click", () =>
    ($("import-file") as HTMLInputElement).click(),
  );
  $("import-file").addEventListener("change", importBackup);
  $("btn-clear-all").addEventListener("click", clearAllData);
}

function exportWeightCSV() {
  let csv = "Дата,Время,Вес (кг),Ожидаемый (кг),Отклонение (кг)\n";
  store.weightData.forEach((w) => {
    const deviation = (w.weight - w.expected).toFixed(1);
    csv += `${w.date},${w.time === "morning" ? "Утро" : "Вечер"},${w.weight},${w.expected},${deviation}\n`;
  });
  downloadFile(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
    "weight_data.csv",
  );
}

function exportCaloriesCSV() {
  let csv =
    "Дата,Приём пищи,Описание,Калории,Белки (г),Жиры (г),Углеводы (г)\n";
  store.calorieData.forEach((m) => {
    csv += `${m.date},${m.type},"${m.description}",${m.calories},${m.protein},${m.fats},${m.carbs}\n`;
  });
  downloadFile(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
    "calorie_data.csv",
  );
}

function exportBackup() {
  const backup: Backup = {
    version: "2.0",
    exportDate: new Date().toISOString(),
    userConfig: store.config!,
    weightData: store.weightData,
    calorieData: store.calorieData,
  };
  downloadFile(
    new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    `tracker_backup_${new Date().toISOString().split("T")[0]}.json`,
  );
}

function importBackup(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const backup = JSON.parse(
        event.target!.result as string,
      ) as Partial<Backup>;
      if (!confirm("Импортировать данные? Текущие данные будут заменены!"))
        return;

      if (backup.userConfig) store.config = backup.userConfig;
      store.weightData = backup.weightData || [];
      store.calorieData = backup.calorieData || [];

      store.saveConfig();
      store.saveWeight();
      store.saveCalories();

      alert("Данные успешно импортированы! Страница перезагрузится.");
      location.reload();
    } catch (error) {
      alert("Ошибка при чтении файла: " + (error as Error).message);
    }
  };
  reader.readAsText(file);
  (e.target as HTMLInputElement).value = "";
}

function clearAllData() {
  if (
    !confirm(
      "ВНИМАНИЕ! Это удалит ВСЕ данные приложения, включая настройки. Вы уверены?",
    )
  )
    return;
  if (
    !confirm("Последнее предупреждение! Все данные будут потеряны. Продолжить?")
  )
    return;
  store.clearAll();
  alert("Все данные удалены. Страница перезагрузится.");
  location.reload();
}
