import { store } from "./store";
import { $, todayISO } from "./utils";
import { updateDashboard } from "./dashboard";
import { updateCharts } from "./charts";
import { updateDailyHistory } from "./history";

export function initCalories() {
  $("meal-form").addEventListener("submit", addMeal);

  $("today-meals").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-delete-meal]",
    );
    if (!btn) return;
    if (!confirm("Удалить этот приём пищи?")) return;
    const id = parseInt(btn.dataset.deleteMeal!);
    store.calorieData = store.calorieData.filter((m) => m.id !== id);
    store.saveCalories();
    updateTodayMeals();
    updateDashboard();
    updateDailyHistory();
    updateCharts();
  });
}

function addMeal(e: Event) {
  e.preventDefault();
  const date = ($(
    "meal-date",
  ) as HTMLInputElement).value;
  const type = ($(
    "meal-type",
  ) as HTMLSelectElement).value;
  const description = (
    $(
      "meal-description",
    ) as HTMLTextAreaElement
  ).value;
  const calories = parseFloat(
    ($(
      "meal-calories",
    ) as HTMLInputElement).value,
  );
  const protein =
    parseFloat(($(
      "meal-protein",
    ) as HTMLInputElement).value) || 0;
  const fats =
    parseFloat(($(
      "meal-fats",
    ) as HTMLInputElement).value) || 0;
  const carbs =
    parseFloat(($(
      "meal-carbs",
    ) as HTMLInputElement).value) || 0;

  store.calorieData.push({
    id: Date.now(),
    date,
    type,
    description,
    calories,
    protein,
    fats,
    carbs,
  });
  store.calorieData.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  store.saveCalories();

  ($("meal-form") as HTMLFormElement).reset();
  ($(
    "meal-date",
  ) as HTMLInputElement).value = todayISO();

  updateDashboard();
  updateTodayMeals();
  updateDailyHistory();
  updateCharts();
}

export function updateTodayMeals() {
  const c = store.config!;
  const today = todayISO();
  const todayMeals = store.calorieData.filter((m) => m.date === today);
  const container = $("today-meals");

  $("meals-calorie-target").textContent = String(c.dailyCalorieTarget);

  if (todayMeals.length === 0) {
    container.innerHTML =
      '<p class="text-gray-400 text-center py-8">Пока нет записей за сегодня</p>';
    $("meals-total-calories").textContent = "0";
    $("meals-remaining").textContent = String(c.dailyCalorieTarget);
    $("meals-remaining").className = "text-2xl font-bold text-green-600";
    return;
  }

  container.innerHTML = "";
  todayMeals.forEach((meal) => {
    const div = document.createElement("div");
    div.className =
      "meal-item p-4 rounded-lg border flex justify-between items-start";
    div.innerHTML = `
      <div class="flex-1">
        <div class="font-semibold">${meal.type}</div>
        <div class="text-sm text-gray-600">${meal.description || "Без описания"}</div>
        <div class="text-xs text-gray-500 mt-1">Б: ${meal.protein}г | Ж: ${meal.fats}г | У: ${meal.carbs}г</div>
      </div>
      <div class="text-right ml-4">
        <div class="text-lg font-bold">${meal.calories}</div>
        <div class="text-xs text-gray-500">ккал</div>
        <button data-delete-meal="${meal.id}" class="delete-btn text-red-600 hover:text-red-700 text-xs mt-2">Удалить</button>
      </div>
    `;
    container.appendChild(div);
  });

  const totalCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
  const remaining = c.dailyCalorieTarget - totalCalories;

  $("meals-total-calories").textContent = String(totalCalories);
  $("meals-remaining").textContent = String(remaining);
  $("meals-remaining").className =
    remaining < 0
      ? "text-2xl font-bold text-red-600"
      : "text-2xl font-bold text-green-600";
}
