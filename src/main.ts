import "./style.css";
import { store } from "./store";
import { $, todayISO, formatDateFull } from "./utils";
import { showOnboarding } from "./onboarding";
import { initTabs } from "./tabs";
import { initSettings } from "./settings";
import { initWeight, updateWeightHistory } from "./weight";
import { initCalories, updateTodayMeals } from "./calories";
import { updateDailyHistory } from "./history";
import { initExport } from "./data-export";
import { updateDashboard } from "./dashboard";
import { initCharts } from "./charts";

function initializeApp() {
  const today = todayISO();
  ($(
    "weight-date",
  ) as HTMLInputElement).value = today;
  ($(
    "meal-date",
  ) as HTMLInputElement).value = today;

  const c = store.config!;
  $("header-goal").textContent =
    `Путь к цели: ${c.startWeight} кг → ${c.targetWeight} кг до ${formatDateFull(c.endDate)}`;

  initTabs();
  initSettings();
  initWeight();
  initCalories();
  initExport();

  updateDashboard();
  updateWeightHistory();
  updateTodayMeals();
  updateDailyHistory();
  initCharts();
}

document.addEventListener("DOMContentLoaded", () => {
  if (!store.config) {
    showOnboarding(initializeApp);
    return;
  }
  initializeApp();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
