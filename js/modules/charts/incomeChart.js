// "C:\Users\lars-\gman-web\js\modules\charts\incomeChart.js";
import state from "../../state.js";
import { ALL_KATEGORIER } from "../constants.js";

export function renderAllCharts(totals) {
  const chartContainer = document.getElementById("balanceChartContainer");
  if (!chartContainer) return;

  const hasIncome = Object.values(totals.inkomster || {}).some(val => val > 0);
  const hasExpense = Object.values(totals.utgifter || {}).some(val => val > 0);

  if (hasIncome || hasExpense) {
    chartContainer.style.display = "block";
    renderCategoryChart("incomeChart", "Periodens Inkomster", totals.inkomster || {});
    renderCategoryChart("expenseChart", "Periodens Utgifter", totals.utgifter || {});
  } else {
    chartContainer.style.display = "none";
  }
}

export function renderCategoryChart(canvasId, title, categoryData) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const filtered = Object.entries(categoryData)
    .filter(([, v]) => v > 0)
    .reduce((a, [k, v]) => ((a[k] = v), a), {});

  const shortLabels = Object.keys(filtered).map(key => {
    const name = ALL_KATEGORIER[key]?.namn || key;
    return name.length > 25 ? name.substring(0, 22) + "..." : name;
  });
  const fullLabels = Object.keys(filtered).map(key => ALL_KATEGORIER[key]?.namn || key);
  const data = Object.values(filtered);

  if (!data.length) {
    ctx.style.display = "none";
    if (canvasId === "incomeChart" && state.incomeChartInstance) state.incomeChartInstance.destroy();
    if (canvasId === "expenseChart" && state.expenseChartInstance) state.expenseChartInstance.destroy();
    return;
  }
  ctx.style.display = "block";

  if (canvasId === "incomeChart" && state.incomeChartInstance) state.incomeChartInstance.destroy();
  if (canvasId === "expenseChart" && state.expenseChartInstance) state.expenseChartInstance.destroy();

  const colors = data.map((_, i) => `hsl(${((i * 360) / data.length) * 0.7 + 120}, 70%, 60%)`);

  const chartConfig = {
    type: "doughnut",
    data: {
      labels: shortLabels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 2,
          fullLabels,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, padding: 15 } },
        title: { display: true, text: title },
        tooltip: {
          callbacks: {
            label: ctx => {
              let label = ctx.dataset.fullLabels[ctx.dataIndex] || "";
              if (label) label += ": ";
              if (ctx.parsed != null) {
                label += new Intl.NumberFormat("sv-SE", {
                  style: "currency",
                  currency: "SEK",
                }).format(ctx.parsed);
              }
              return label;
            },
          },
        },
      },
    },
  };

  if (canvasId === "incomeChart") {
    state.incomeChartInstance = new Chart(ctx, chartConfig);
  } else if (canvasId === "expenseChart") {
    state.expenseChartInstance = new Chart(ctx, chartConfig);
  }
}
