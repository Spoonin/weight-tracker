import {
  Chart,
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Legend,
  Tooltip,
  Filler,
} from "chart.js";
import { store } from "./store";
import { formatDate } from "./utils";

Chart.register(
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Legend,
  Tooltip,
  Filler,
);

let weightChart: Chart;
let calorieChart: Chart;

export function initCharts() {
  const weightCtx = (
    document.getElementById("weightChart") as HTMLCanvasElement
  ).getContext("2d")!;

  weightChart = new Chart(weightCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Фактический",
          data: [],
          borderColor: "#667eea",
          backgroundColor: "rgba(102, 126, 234, 0.1)",
          tension: 0.4,
        },
        {
          label: "Ожидаемый",
          data: [],
          borderColor: "#10b981",
          borderDash: [5, 5],
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: false, min: 74, max: 84 } },
    },
  });

  const calorieCtx = (
    document.getElementById("calorieChart") as HTMLCanvasElement
  ).getContext("2d")!;

  calorieChart = new Chart(calorieCtx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Калории",
          data: [],
          backgroundColor: "rgba(102, 126, 234, 0.8)",
          borderColor: "#667eea",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 3000 } },
    },
  });

  updateCharts();
}

export function updateCharts() {
  const weightLast30 = store.weightData
    .filter((w) => w.time === "morning")
    .slice(0, 30)
    .reverse();

  weightChart.data.labels = weightLast30.map((w) => formatDate(w.date));
  weightChart.data.datasets[0].data = weightLast30.map((w) => w.weight);
  weightChart.data.datasets[1].data = weightLast30.map((w) => w.expected);
  weightChart.update();

  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    last7Days.push(date.toISOString().split("T")[0]);
  }

  const caloriesByDay = last7Days.map((date) =>
    store.calorieData
      .filter((m) => m.date === date)
      .reduce((sum, m) => sum + m.calories, 0),
  );

  calorieChart.data.labels = last7Days.map((d) => formatDate(d));
  calorieChart.data.datasets[0].data = caloriesByDay;
  calorieChart.update();
}
