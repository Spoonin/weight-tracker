import { store } from "./store";
import { $, formatDate, todayISO } from "./utils";
import { calculateExpectedWeight } from "./calculations";
import { updateDashboard } from "./dashboard";
import { updateCharts } from "./charts";

export function initWeight() {
  $("weight-form").addEventListener("submit", addWeight);

  $("btn-clear-weight").addEventListener("click", () => {
    if (!confirm("Удалить ВСЕ данные о весе? Это действие необратимо!")) return;
    store.weightData = [];
    store.saveWeight();
    updateWeightHistory();
    updateDashboard();
    updateCharts();
  });

  $("weight-history").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-delete-weight]",
    );
    if (!btn) return;
    if (!confirm("Удалить это взвешивание?")) return;
    const id = parseInt(btn.dataset.deleteWeight!);
    store.weightData = store.weightData.filter((w) => w.id !== id);
    store.saveWeight();
    updateWeightHistory();
    updateDashboard();
    updateCharts();
  });
}

function addWeight(e: Event) {
  e.preventDefault();
  const date = ($(
    "weight-date",
  ) as HTMLInputElement).value;
  const time = ($(
    "weight-time",
  ) as HTMLSelectElement).value as "morning" | "evening";
  const weight = parseFloat(
    ($(
      "weight-value",
    ) as HTMLInputElement).value,
  );

  store.weightData.push({
    id: Date.now(),
    date,
    time,
    weight,
    expected: calculateExpectedWeight(store.config!, date, time),
  });
  store.weightData.sort(
    (a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime() ||
      (b.time === "evening" ? 1 : -1),
  );
  store.saveWeight();

  ($("weight-form") as HTMLFormElement).reset();
  ($(
    "weight-date",
  ) as HTMLInputElement).value = todayISO();

  updateDashboard();
  updateWeightHistory();
  updateCharts();
}

export function updateWeightHistory() {
  const tbody = $("weight-history");
  tbody.innerHTML = "";

  store.weightData.forEach((entry) => {
    const deviation = (entry.weight - entry.expected).toFixed(1);
    const devNum = parseFloat(deviation);
    const deviationClass =
      Math.abs(devNum) <= 0.2
        ? "text-green-600"
        : devNum > 0
          ? "text-red-600"
          : "text-blue-600";

    tbody.innerHTML += `
      <tr class="border-b hover:bg-gray-50">
        <td class="py-3 px-2">${formatDate(entry.date)}</td>
        <td class="py-3 px-2">${entry.time === "morning" ? "Утро" : "Вечер"}</td>
        <td class="py-3 px-2 text-right font-semibold">${entry.weight}</td>
        <td class="py-3 px-2 text-right text-gray-500">${entry.expected}</td>
        <td class="py-3 px-2 text-right ${deviationClass}">${devNum > 0 ? "+" : ""}${deviation}</td>
        <td class="py-3 px-2 text-right">
          <button data-delete-weight="${entry.id}" class="text-red-600 hover:text-red-700 text-sm">Удалить</button>
        </td>
      </tr>
    `;
  });
}
