// "C:\Users\lars-\gman-web\js\modules\charts\balanceChart.js";
import state from "../../state.js";

export function renderBalanceChart(totalIn, totalOut) {
  const ctx = document.getElementById("balanceChart");
  const container = document.getElementById("balanceChartContainer");
  if (!ctx || !container) return;

  container.style.display = "block";
  if (state.balanceChartInstance) state.balanceChartInstance.destroy();

  const diff = (totalIn || 0) - (totalOut || 0);
  const labels = [];
  const data = [];
  const colors = [];

  if (diff > 0) {
    labels.push("Utgifter & Tillgångar Slut", "Överskott (Diff)");
    data.push(totalOut, diff);
    colors.push("hsl(340,82%,56%)", "hsl(210,36%,96%)");
  } else if (diff < 0) {
    labels.push("Inkomster & Tillgångar Start", "Underskott (Diff)");
    data.push(totalIn, Math.abs(diff));
    colors.push("hsl(145,63%,42%)", "hsl(210,36%,96%)");
  } else {
    labels.push("Inkomster & Tillgångar Start", "Utgifter & Tillgångar Slut");
    data.push(totalIn, totalOut);
    colors.push("hsl(145,63%,42%)", "hsl(340,82%,56%)");
  }

  state.balanceChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          label: "Ekonomisk Balans",
          data,
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: c => {
              let label = c.label || "";
              if (label) label += ": ";
              if (c.parsed != null) {
                label += new Intl.NumberFormat("sv-SE", {
                  style: "currency",
                  currency: "SEK",
                }).format(c.parsed);
              }
              return label;
            },
          },
        },
        title: { display: true, text: "Inkomster vs. Utgifter" },
      },
    },
  });
}
