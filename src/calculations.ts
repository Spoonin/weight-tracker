import type { UserConfig } from "./types";

export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: "male" | "female",
): number {
  if (gender === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

export function calculateTDEE(bmr: number, activityLevel: number): number {
  return bmr * activityLevel;
}

export function calculateDailyTarget(
  tdee: number,
  weightToLose: number,
  daysToGoal: number,
): number {
  const calorieDeficit = (weightToLose * 7700) / daysToGoal;
  return Math.round(tdee - calorieDeficit);
}

export function calculateMacros(dailyCalories: number) {
  return {
    protein: Math.round((dailyCalories * 0.3) / 4),
    fats: Math.round((dailyCalories * 0.25) / 9),
    carbs: Math.round((dailyCalories * 0.45) / 4),
  };
}

export function calculateExpectedWeight(
  config: UserConfig,
  date: string,
  time: "morning" | "evening",
): number {
  const start = new Date(config.startDate);
  const current = new Date(date);
  const daysPassed = Math.floor(
    (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  const totalDays = Math.floor(
    (new Date(config.endDate).getTime() - start.getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const dailyLoss = (config.startWeight - config.targetWeight) / totalDays;
  let expected = config.startWeight - dailyLoss * daysPassed;
  if (time === "evening") expected += 0.5;
  return parseFloat(expected.toFixed(1));
}

export function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function weeklyRate(
  weightToLose: number,
  daysToGoal: number,
): number {
  return (weightToLose / daysToGoal) * 7;
}
