import { store } from "./store";
import { $, todayISO, formatDateFull } from "./utils";
import { daysBetween } from "./calculations";

export function updateDashboard() {
  const c = store.config!;

  if (store.weightData.length > 0) {
    $("current-weight").textContent = String(store.weightData[0].weight);
  }

  $("target-weight-display").textContent = String(c.targetWeight);

  const daysRemaining = daysBetween(new Date(), new Date(c.endDate));
  $("days-remaining").textContent = String(daysRemaining);
  $("target-date-short").textContent = "до " + formatDateFull(c.endDate);

  $("calorie-target-label").textContent = `из ${c.dailyCalorieTarget} ккал`;
  $("protein-target-label").textContent = `цель: ${c.proteinTarget}г`;
  $("fats-target-label").textContent = `цель: ${c.fatsTarget}г`;
  $("carbs-target-label").textContent = `цель: ${c.carbsTarget}г`;

  const today = todayISO();
  const todayMeals = store.calorieData.filter((m) => m.date === today);
  const todayCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
  const todayProtein = todayMeals.reduce((sum, m) => sum + m.protein, 0);
  const todayFats = todayMeals.reduce((sum, m) => sum + m.fats, 0);
  const todayCarbs = todayMeals.reduce((sum, m) => sum + m.carbs, 0);

  $("today-calories").textContent = String(todayCalories);
  $("calorie-status").textContent = `${todayCalories} / ${c.dailyCalorieTarget} ккал`;

  const progress = Math.min((todayCalories / c.dailyCalorieTarget) * 100, 100);
  ($("calorie-progress") as HTMLElement).style.width = progress + "%";

  const remaining = c.dailyCalorieTarget - todayCalories;
  const remainEl = $("calories-remaining");
  remainEl.textContent =
    remaining > 0
      ? `Осталось: ${remaining} ккал`
      : `Перебор: ${Math.abs(remaining)} ккал`;
  remainEl.className =
    remaining > 0
      ? "text-sm font-medium text-green-600"
      : "text-sm font-medium text-red-600";

  $("today-protein").textContent = todayProtein.toFixed(1);
  $("today-fats").textContent = todayFats.toFixed(1);
  $("today-carbs").textContent = todayCarbs.toFixed(1);
}
