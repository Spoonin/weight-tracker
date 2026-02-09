import { store } from "./store";
import { $, formatDateFull } from "./utils";
import { daysBetween } from "./calculations";

export function initSettings() {
  $("btn-settings").addEventListener("click", showSettings);
  $("btn-close-settings").addEventListener("click", closeSettings);
  $("btn-reset-settings").addEventListener("click", resetSettings);
}

function showSettings() {
  const c = store.config;
  if (!c) return;

  $("set-current-weight").textContent = c.startWeight + " кг";
  $("set-target-weight").textContent = c.targetWeight + " кг";
  $("set-height").textContent = c.height + " см";
  $("set-age").textContent = c.age + " лет";
  $("set-target-date").textContent = formatDateFull(c.endDate);

  const daysLeft = daysBetween(new Date(), new Date(c.endDate));
  $("set-days-left").textContent = daysLeft + " дней";

  $("set-bmr").textContent = c.bmr + " ккал";
  $("set-tdee").textContent = c.tdee + " ккал";
  $("set-daily-target").textContent = c.dailyCalorieTarget + " ккал";
  $("set-deficit").textContent = c.tdee - c.dailyCalorieTarget + " ккал";

  $("set-protein").textContent = c.proteinTarget + "г";
  $("set-fats").textContent = c.fatsTarget + "г";
  $("set-carbs").textContent = c.carbsTarget + "г";

  $("settings-modal").classList.remove("hidden");
}

function closeSettings() {
  $("settings-modal").classList.add("hidden");
}

function resetSettings() {
  if (!confirm("ВНИМАНИЕ! Это удалит ВСЕ данные и настройки. Вы уверены?"))
    return;
  if (!confirm("Последнее предупреждение! Все данные будут потеряны. Продолжить?"))
    return;
  localStorage.clear();
  location.reload();
}
