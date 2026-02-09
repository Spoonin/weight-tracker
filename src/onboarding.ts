import { store } from "./store";
import { $ } from "./utils";
import {
  calculateBMR,
  calculateTDEE,
  calculateDailyTarget,
  calculateMacros,
  daysBetween,
  weeklyRate,
} from "./calculations";

export function showOnboarding(onComplete: () => void) {
  $("onboarding-modal").classList.remove("hidden");

  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() + 5);
  ($(
    "onb-target-date",
  ) as HTMLInputElement).value = defaultDate.toISOString().split("T")[0];

  const inputIds = [
    "onb-current-weight",
    "onb-target-weight",
    "onb-height",
    "onb-age",
    "onb-target-date",
  ];
  inputIds.forEach((id) =>
    $(id).addEventListener("input", updateCalculationPreview),
  );

  document.querySelectorAll<HTMLInputElement>('input[name="activity"]').forEach(
    (radio) => radio.addEventListener("change", updateCalculationPreview),
  );

  $("onboarding-form").addEventListener("submit", (e) => {
    e.preventDefault();
    completeOnboarding(onComplete);
  });
}

function getFormValues() {
  const val = (id: string) =>
    parseFloat(($(id) as HTMLInputElement).value);
  return {
    currentWeight: val("onb-current-weight"),
    targetWeight: val("onb-target-weight"),
    height: val("onb-height"),
    age: val("onb-age"),
    gender: ($(
      "onb-gender",
    ) as HTMLSelectElement).value as "male" | "female",
    targetDate: ($(
      "onb-target-date",
    ) as HTMLInputElement).value,
    activity: parseFloat(
      document.querySelector<HTMLInputElement>(
        'input[name="activity"]:checked',
      )?.value || "1.55",
    ),
  };
}

function updateCalculationPreview() {
  const v = getFormValues();
  if (!v.currentWeight || !v.targetWeight || !v.height || !v.age || !v.targetDate) return;

  const bmr = calculateBMR(v.currentWeight, v.height, v.age, v.gender);
  const tdee = calculateTDEE(bmr, v.activity);
  const daysToGoal = daysBetween(new Date(), new Date(v.targetDate));
  const weightToLose = v.currentWeight - v.targetWeight;
  const dailyTarget = calculateDailyTarget(tdee, weightToLose, daysToGoal);
  const rate = weeklyRate(weightToLose, daysToGoal);
  const macros = calculateMacros(dailyTarget);

  $("preview-bmr").textContent = Math.round(bmr) + " ккал";
  $("preview-tdee").textContent = Math.round(tdee) + " ккал";
  $("preview-target").textContent = dailyTarget + " ккал";
  $("preview-rate").textContent = rate.toFixed(2) + " кг/нед";

  $("preview-protein").textContent =
    macros.protein + "г (~" + Math.round(dailyTarget * 0.3) + " ккал)";
  $("preview-fats").textContent =
    macros.fats + "г (~" + Math.round(dailyTarget * 0.25) + " ккал)";
  $("preview-carbs").textContent =
    macros.carbs + "г (~" + Math.round(dailyTarget * 0.45) + " ккал)";

  const rateEl = $("preview-rate");
  rateEl.classList.toggle("text-red-600", rate > 1);
  rateEl.classList.toggle("text-green-600", rate <= 1);

  $("preview-target").classList.toggle("text-red-600", dailyTarget < 1200);
}

function completeOnboarding(onComplete: () => void) {
  const v = getFormValues();
  const bmr = calculateBMR(v.currentWeight, v.height, v.age, v.gender);
  const tdee = calculateTDEE(bmr, v.activity);
  const today = new Date();
  const goal = new Date(v.targetDate);
  const daysToGoal = daysBetween(today, goal);
  const weightToLose = v.currentWeight - v.targetWeight;
  const dailyTarget = calculateDailyTarget(tdee, weightToLose, daysToGoal);
  const macros = calculateMacros(dailyTarget);
  const rate = weeklyRate(weightToLose, daysToGoal);

  if (dailyTarget < 1200) {
    if (
      !confirm(
        `Внимание! Ваша дневная норма получается очень низкой (${dailyTarget} ккал). Это может быть небезопасно. Рекомендуем увеличить срок достижения цели. Продолжить?`,
      )
    )
      return;
  }

  if (rate > 1) {
    if (
      !confirm(
        `Внимание! Темп похудения получается высоким (${rate.toFixed(2)} кг/нед). Безопасный темп: 0.5-1 кг/нед. Рекомендуем увеличить срок. Продолжить?`,
      )
    )
      return;
  }

  store.config = {
    startDate: today.toISOString().split("T")[0],
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

  store.weightData.push({
    id: Date.now(),
    date: store.config.startDate,
    time: "morning",
    weight: v.currentWeight,
    expected: v.currentWeight,
  });
  store.saveWeight();

  $("onboarding-modal").classList.add("hidden");
  onComplete();
}
