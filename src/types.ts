export interface UserConfig {
  startDate: string;
  endDate: string;
  startWeight: number;
  targetWeight: number;
  height: number;
  age: number;
  gender: "male" | "female";
  activityLevel: number;
  bmr: number;
  tdee: number;
  dailyCalorieTarget: number;
  proteinTarget: number;
  fatsTarget: number;
  carbsTarget: number;
}

export interface WeightEntry {
  id: number;
  date: string;
  time: "morning" | "evening";
  weight: number;
  expected: number;
}

export interface MealEntry {
  id: number;
  date: string;
  type: string;
  description: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
}

export interface Backup {
  version: string;
  exportDate: string;
  userConfig: UserConfig;
  weightData: WeightEntry[];
  calorieData: MealEntry[];
}
