import type { UserConfig, WeightEntry, MealEntry } from "./types";
import { calculateBMR, calculateMacros } from "./calculations";

export interface CalibrationResult {
  /** Достаточно ли данных для калибровки (≥7 утренних замеров) */
  hasEnoughData: boolean;
  /** Скользящее среднее за 7 дней (фактическое) */
  movingAverage: number;
  /** Ожидаемый вес на дату последнего замера */
  expectedWeight: number;
  /** Разница: positive = отстаём (медленнее плана), negative = опережаем */
  deviationKg: number;
  /** Фактическая скорость потери кг/неделю (по скользящей средней) */
  actualWeeklyRate: number;
  /** Плановая скорость кг/неделю */
  plannedWeeklyRate: number;
  /** Оценка реального TDEE на основе съеденных калорий и изменения веса */
  estimatedTDEE: number;
  /** Рекомендуемый новый дневной калораж */
  suggestedCalories: number;
  /** Новые макросы при suggestedCalories */
  suggestedMacros: { protein: number; fats: number; carbs: number };
  /** Нужна ли калибровка (отклонение > 0.3 кг) */
  needsCalibration: boolean;
  /** Направление: "slower" — медленнее плана, "faster" — быстрее */
  direction: "slower" | "faster" | "on-track";
  /** Сколько утренних замеров использовано */
  dataPointsUsed: number;
}

/**
 * Вычислить скользящее среднее утренних замеров за последние `windowDays` дней.
 * Берём только утренние замеры для стабильности.
 */
function morningMovingAverage(
  weightData: WeightEntry[],
  windowDays: number,
): { average: number; entries: WeightEntry[] } | null {
  const morningEntries = weightData
    .filter((w) => w.time === "morning")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (morningEntries.length < windowDays) return null;

  const recentEntries = morningEntries.slice(0, windowDays);
  const avg =
    recentEntries.reduce((sum, e) => sum + e.weight, 0) / recentEntries.length;

  return { average: parseFloat(avg.toFixed(2)), entries: recentEntries };
}

/**
 * Оценить реальный TDEE по фактическому изменению веса и потреблённым калориям.
 *
 * Логика: если за period дней вес изменился на deltaKg,
 * то дефицит/профицит = deltaKg * 7700 ккал.
 * Средний дневной дефицит = (deltaKg * 7700) / period.
 * TDEE = средние дневные калории + средний дневной дефицит.
 */
function estimateRealTDEE(
  weightData: WeightEntry[],
  calorieData: MealEntry[],
  periodDays: number,
): number | null {
  const morningEntries = weightData
    .filter((w) => w.time === "morning")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (morningEntries.length < 2) return null;

  const latestDate = new Date(morningEntries[morningEntries.length - 1].date);
  const cutoffDate = new Date(latestDate);
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);

  // Найти первый замер в пределах окна
  const entriesInWindow = morningEntries.filter(
    (e) => new Date(e.date) >= cutoffDate,
  );
  if (entriesInWindow.length < 2) return null;

  const firstWeight = entriesInWindow[0].weight;
  const lastWeight = entriesInWindow[entriesInWindow.length - 1].weight;
  const deltaKg = firstWeight - lastWeight; // positive = потеря веса

  const firstDate = new Date(entriesInWindow[0].date);
  const lastDate = new Date(entriesInWindow[entriesInWindow.length - 1].date);
  const actualDays = Math.max(
    1,
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Средние калории за этот период
  const mealsInWindow = calorieData.filter((m) => {
    const d = new Date(m.date);
    return d >= firstDate && d <= lastDate;
  });

  if (mealsInWindow.length === 0) return null;

  // Сгруппировать по дням и посчитать дни с данными
  const dailyCalories = new Map<string, number>();
  for (const m of mealsInWindow) {
    dailyCalories.set(m.date, (dailyCalories.get(m.date) || 0) + m.calories);
  }

  const totalCalories = Array.from(dailyCalories.values()).reduce(
    (s, c) => s + c,
    0,
  );
  const avgDailyCalories = totalCalories / actualDays;

  // TDEE = потреблённые калории + дефицит на единицу времени
  const dailyDeficit = (deltaKg * 7700) / actualDays;
  const estimatedTDEE = Math.round(avgDailyCalories + dailyDeficit);

  return estimatedTDEE;
}

/**
 * Рассчитать ожидаемый вес на заданную дату (утро) по линейному плану.
 */
function expectedWeightOnDate(config: UserConfig, date: string): number {
  const start = new Date(config.startDate).getTime();
  const end = new Date(config.endDate).getTime();
  const current = new Date(date).getTime();

  const totalDays = (end - start) / (1000 * 60 * 60 * 24);
  const daysPassed = (current - start) / (1000 * 60 * 60 * 24);

  const dailyLoss = (config.startWeight - config.targetWeight) / totalDays;
  return parseFloat((config.startWeight - dailyLoss * daysPassed).toFixed(2));
}

/**
 * Основная функция калибровки.
 * Анализирует отклонение фактического веса от плана за 7 дней
 * и предлагает корректировку калоража.
 */
export function analyzeCalibration(
  config: UserConfig,
  weightData: WeightEntry[],
  calorieData: MealEntry[],
  windowDays: number = 7,
  thresholdKg: number = 0.3,
): CalibrationResult {
  const avgResult = morningMovingAverage(weightData, windowDays);

  if (!avgResult) {
    return {
      hasEnoughData: false,
      movingAverage: 0,
      expectedWeight: 0,
      deviationKg: 0,
      actualWeeklyRate: 0,
      plannedWeeklyRate: 0,
      estimatedTDEE: config.tdee,
      suggestedCalories: config.dailyCalorieTarget,
      suggestedMacros: calculateMacros(config.dailyCalorieTarget),
      needsCalibration: false,
      direction: "on-track",
      dataPointsUsed: weightData.filter((w) => w.time === "morning").length,
    };
  }

  // Дата последнего утреннего замера
  const latestDate = avgResult.entries[0].date;
  const expected = expectedWeightOnDate(config, latestDate);

  // Отклонение: positive = мы тяжелее плана (медленнее худеем)
  const deviation = parseFloat((avgResult.average - expected).toFixed(2));

  // Плановая скорость
  const totalDays =
    (new Date(config.endDate).getTime() -
      new Date(config.startDate).getTime()) /
    (1000 * 60 * 60 * 24);
  const plannedWeeklyRate = parseFloat(
    (((config.startWeight - config.targetWeight) / totalDays) * 7).toFixed(2),
  );

  // Фактическая скорость за окно (сравнение самого старого и нового в окне)
  const oldest = avgResult.entries[avgResult.entries.length - 1];
  const newest = avgResult.entries[0];
  const windowActualDays = Math.max(
    1,
    (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const actualWeeklyRate = parseFloat(
    (((oldest.weight - newest.weight) / windowActualDays) * 7).toFixed(2),
  );

  // Оценка реального TDEE (берём 14-дневное окно для стабильности)
  const realTDEE = estimateRealTDEE(weightData, calorieData, 14);
  const estimatedTDEE = realTDEE ?? config.tdee;

  // Рассчитать новый калораж с учётом реального TDEE
  const daysRemaining = Math.max(
    1,
    (new Date(config.endDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const weightToLose = avgResult.average - config.targetWeight;
  const requiredDailyDeficit = (weightToLose * 7700) / daysRemaining;

  // Ограничим минимум калорий (не ниже BMR)
  const currentBMR = calculateBMR(
    avgResult.average,
    config.height,
    config.age,
    config.gender,
  );
  const minCalories = Math.round(currentBMR);
  const suggestedCalories = Math.max(
    minCalories,
    Math.round(estimatedTDEE - requiredDailyDeficit),
  );

  const needsCalibration = Math.abs(deviation) >= thresholdKg;
  let direction: "slower" | "faster" | "on-track" = "on-track";
  if (deviation > thresholdKg) direction = "slower";
  else if (deviation < -thresholdKg) direction = "faster";

  return {
    hasEnoughData: true,
    movingAverage: avgResult.average,
    expectedWeight: expected,
    deviationKg: deviation,
    actualWeeklyRate,
    plannedWeeklyRate,
    estimatedTDEE,
    suggestedCalories,
    suggestedMacros: calculateMacros(suggestedCalories),
    needsCalibration,
    direction,
    dataPointsUsed: avgResult.entries.length,
  };
}

/**
 * Применить калибровку: обновить dailyCalorieTarget и макросы в конфиге.
 */
export function applyCalibration(
  config: UserConfig,
  calibration: CalibrationResult,
): UserConfig {
  const macros = calibration.suggestedMacros;
  return {
    ...config,
    dailyCalorieTarget: calibration.suggestedCalories,
    proteinTarget: macros.protein,
    fatsTarget: macros.fats,
    carbsTarget: macros.carbs,
  };
}
