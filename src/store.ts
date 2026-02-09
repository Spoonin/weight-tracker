import type { UserConfig, WeightEntry, MealEntry } from "./types";

class Store {
  config: UserConfig | null;
  weightData: WeightEntry[];
  calorieData: MealEntry[];

  constructor() {
    this.config = JSON.parse(localStorage.getItem("userConfig") || "null");
    this.weightData = JSON.parse(localStorage.getItem("weightData") || "[]");
    this.calorieData = JSON.parse(localStorage.getItem("calorieData") || "[]");
  }

  saveConfig() {
    localStorage.setItem("userConfig", JSON.stringify(this.config));
  }

  saveWeight() {
    localStorage.setItem("weightData", JSON.stringify(this.weightData));
  }

  saveCalories() {
    localStorage.setItem("calorieData", JSON.stringify(this.calorieData));
  }

  clearAll() {
    localStorage.clear();
    this.config = null;
    this.weightData = [];
    this.calorieData = [];
  }
}

export const store = new Store();
