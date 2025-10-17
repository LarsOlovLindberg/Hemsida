// ============================================================
// charts.js - Grafer och visualiseringar
// Sökväg: js/modules/charts/charts.js
// ============================================================

import { formatCurrency } from "../utils/helpers.js";

// ============================================================
// CHART CONFIGURATION
// ============================================================

const CHART_CONFIG = {
  colors: {
    primary: "#4CAF50",
    secondary: "#2196F3",
    success: "#4CAF50",
    warning: "#FF9800",
    danger: "#F44336",
    info: "#2196F3",
    gray: "#9E9E9E",
  },

  palette: [
    "#4CAF50",
    "#2196F3",
    "#FF9800",
    "#F44336",
    "#9C27B0",
    "#00BCD4",
    "#FFEB3B",
    "#795548",
    "#607D8B",
    "#E91E63",
  ],

  defaultOptions: {
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      duration: 750,
      easing: "easeInOutQuart",
    },
  },
};

// ============================================================
// PIE CHART
// ============================================================

/**
 * Skapar ett pie chart.
 * @param {string} canvasId - Canvas element ID
 * @param {object} data - Data { labels: [], values: [] }
 * @param {object} options - Chart options
 */
export function createPieChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`[Charts] Canvas ${canvasId} hittades inte.`);
    return null;
  }

  const ctx = canvas.getContext("2d");
  const { labels, values } = data;

  if (!labels || !values || labels.length !== values.length) {
    console.error("[Charts] Ogiltig data för pie chart.");
    return null;
  }

  // Beräkna total
  const total = values.reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    drawNoDataMessage(ctx, canvas);
    return null;
  }

  // Beräkna procent och vinklar
  const percentages = values.map(val => (val / total) * 100);
  const angles = percentages.map(pct => (pct / 100) * 2 * Math.PI);

  // Rensa canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Rita pie
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 40;

  let currentAngle = -Math.PI / 2; // Start från toppen

  angles.forEach((angle, i) => {
    // Rita segment
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
    ctx.closePath();

    ctx.fillStyle = options.colors?.[i] || CHART_CONFIG.palette[i % CHART_CONFIG.palette.length];
    ctx.fill();

    // Border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    currentAngle += angle;
  });

  // Rita legend
  drawLegend(ctx, canvas, labels, values, percentages, options.colors || CHART_CONFIG.palette);

  return {
    update: newData => createPieChart(canvasId, newData, options),
    destroy: () => ctx.clearRect(0, 0, canvas.width, canvas.height),
  };
}

/**
 * Ritar legend för pie chart.
 */
function drawLegend(ctx, canvas, labels, values, percentages, colors) {
  const legendX = 10;
  let legendY = canvas.height - labels.length * 25 - 10;

  ctx.font = "12px Arial";
  ctx.textAlign = "left";

  labels.forEach((label, i) => {
    // Färgbox
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(legendX, legendY, 15, 15);

    // Text
    ctx.fillStyle = "#333";
    ctx.fillText(`${label}: ${percentages[i].toFixed(1)}%`, legendX + 20, legendY + 12);

    legendY += 25;
  });
}

// ============================================================
// BAR CHART
// ============================================================

/**
 * Skapar ett bar chart.
 * @param {string} canvasId - Canvas element ID
 * @param {object} data - Data { labels: [], values: [] }
 * @param {object} options - Chart options
 */
export function createBarChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`[Charts] Canvas ${canvasId} hittades inte.`);
    return null;
  }

  const ctx = canvas.getContext("2d");
  const { labels, values } = data;

  if (!labels || !values || labels.length !== values.length) {
    console.error("[Charts] Ogiltig data för bar chart.");
    return null;
  }

  if (values.every(v => v === 0)) {
    drawNoDataMessage(ctx, canvas);
    return null;
  }

  // Rensa canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padding = 60;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;

  const maxValue = Math.max(...values);
  const barWidth = chartWidth / labels.length;
  const barSpacing = barWidth * 0.2;
  const actualBarWidth = barWidth - barSpacing;

  // Rita axlar
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  // Rita bars
  values.forEach((value, i) => {
    const barHeight = (value / maxValue) * chartHeight;
    const x = padding + i * barWidth + barSpacing / 2;
    const y = canvas.height - padding - barHeight;

    // Bar
    ctx.fillStyle = options.color || CHART_CONFIG.colors.primary;
    ctx.fillRect(x, y, actualBarWidth, barHeight);

    // Value label på toppen
    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(formatCurrency(value), x + actualBarWidth / 2, y - 5);

    // X-axis label
    ctx.save();
    ctx.translate(x + actualBarWidth / 2, canvas.height - padding + 15);
    ctx.rotate(-Math.PI / 6); // 30 grader
    ctx.textAlign = "right";
    ctx.fillText(labels[i], 0, 0);
    ctx.restore();
  });

  // Y-axis labels
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const value = (maxValue / steps) * i;
    const y = canvas.height - padding - (chartHeight / steps) * i;

    ctx.fillStyle = "#666";
    ctx.font = "10px Arial";
    ctx.textAlign = "right";
    ctx.fillText(formatCurrency(value), padding - 10, y + 4);

    // Grid line
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  return {
    update: newData => createBarChart(canvasId, newData, options),
    destroy: () => ctx.clearRect(0, 0, canvas.width, canvas.height),
  };
}

// ============================================================
// LINE CHART
// ============================================================

/**
 * Skapar ett line chart.
 * @param {string} canvasId - Canvas element ID
 * @param {object} data - Data { labels: [], datasets: [{ label, values, color }] }
 * @param {object} options - Chart options
 */
export function createLineChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`[Charts] Canvas ${canvasId} hittades inte.`);
    return null;
  }

  const ctx = canvas.getContext("2d");
  const { labels, datasets } = data;

  if (!labels || !datasets || datasets.length === 0) {
    console.error("[Charts] Ogiltig data för line chart.");
    return null;
  }

  // Rensa canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padding = 60;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;

  // Hitta max värde över alla datasets
  const allValues = datasets.flatMap(ds => ds.values);
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues, 0);
  const valueRange = maxValue - minValue;

  // Rita axlar
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  // Rita grid
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const value = minValue + (valueRange / steps) * i;
    const y = canvas.height - padding - (chartHeight / steps) * i;

    // Y-axis label
    ctx.fillStyle = "#666";
    ctx.font = "10px Arial";
    ctx.textAlign = "right";
    ctx.fillText(formatCurrency(value), padding - 10, y + 4);

    // Grid line
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  // Rita datasets
  datasets.forEach((dataset, datasetIndex) => {
    const color = dataset.color || CHART_CONFIG.palette[datasetIndex % CHART_CONFIG.palette.length];

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    dataset.values.forEach((value, i) => {
      const x = padding + (chartWidth / (labels.length - 1)) * i;
      const y = canvas.height - padding - ((value - minValue) / valueRange) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Rita punkter
    dataset.values.forEach((value, i) => {
      const x = padding + (chartWidth / (labels.length - 1)) * i;
      const y = canvas.height - padding - ((value - minValue) / valueRange) * chartHeight;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  });

  // X-axis labels
  labels.forEach((label, i) => {
    const x = padding + (chartWidth / (labels.length - 1)) * i;

    ctx.fillStyle = "#666";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, x, canvas.height - padding + 20);
  });

  // Legend
  let legendY = 20;
  datasets.forEach((dataset, i) => {
    const color = dataset.color || CHART_CONFIG.palette[i % CHART_CONFIG.palette.length];

    // Färglinje
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width - 150, legendY);
    ctx.lineTo(canvas.width - 130, legendY);
    ctx.stroke();

    // Label
    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(dataset.label, canvas.width - 125, legendY + 4);

    legendY += 20;
  });

  return {
    update: newData => createLineChart(canvasId, newData, options),
    destroy: () => ctx.clearRect(0, 0, canvas.width, canvas.height),
  };
}

// ============================================================
// SPARKLINE
// ============================================================

/**
 * Skapar en mini sparkline (liten trendgraf).
 * @param {string} canvasId - Canvas element ID
 * @param {array} values - Array med värden
 * @param {object} options - Options
 */
export function createSparkline(canvasId, values, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`[Charts] Canvas ${canvasId} hittades inte.`);
    return null;
  }

  const ctx = canvas.getContext("2d");

  if (!values || values.length === 0) {
    return null;
  }

  // Rensa canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padding = 2;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue || 1;

  // Rita linje
  ctx.strokeStyle = options.color || CHART_CONFIG.colors.primary;
  ctx.lineWidth = 2;
  ctx.beginPath();

  values.forEach((value, i) => {
    const x = padding + (chartWidth / (values.length - 1)) * i;
    const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  return {
    update: newValues => createSparkline(canvasId, newValues, options),
    destroy: () => ctx.clearRect(0, 0, canvas.width, canvas.height),
  };
}

// ============================================================
// DASHBOARD CHARTS
// ============================================================

/**
 * Skapar alla dashboard-grafer.
 */
export function createDashboardCharts() {
  console.log("[Charts] Skapar dashboard-grafer...");

  // Exempel: Huvudmän per överförmyndare (Pie)
  const ofData = calculateHuvudmanPerOverformyndare();
  if (ofData) {
    createPieChart("chartHuvudmanPerOF", ofData);
  }

  // Exempel: Månadsvis kassaflöde (Line)
  const kassaflodeData = calculateMonthlyKassaflode();
  if (kassaflodeData) {
    createLineChart("chartKassaflode", kassaflodeData);
  }

  // Exempel: Utbetalningar per kategori (Bar)
  const utbetalningData = calculateUtbetalningarPerKategori();
  if (utbetalningData) {
    createBarChart("chartUtbetalningar", utbetalningData);
  }
}

/**
 * Beräknar huvudmän per överförmyndare.
 * @returns {object} - { labels: [], values: [] }
 */
function calculateHuvudmanPerOverformyndare() {
  const allHuvudman = window.appState?.allHuvudman || [];
  const allOF = window.appState?.allOverformyndare || [];

  if (allHuvudman.length === 0 || allOF.length === 0) {
    return null;
  }

  const counts = {};
  allOF.forEach(of => {
    counts[of.Namn || of.NAMN] = 0;
  });

  allHuvudman.forEach(hm => {
    const ofId = hm.OverformyndareID || hm.OVERFORMYNDAREID;
    const of = allOF.find(o => o.OverformyndareID === ofId || o.OVERFORMYNDAREID === ofId);
    if (of) {
      const name = of.Namn || of.NAMN;
      counts[name] = (counts[name] || 0) + 1;
    }
  });

  return {
    labels: Object.keys(counts),
    values: Object.values(counts),
  };
}

/**
 * Beräknar månadsvis kassaflöde (exempel).
 * @returns {object}
 */
function calculateMonthlyKassaflode() {
  // Placeholder - skulle hämta från faktisk data
  return {
    labels: ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun"],
    datasets: [
      {
        label: "Inbetalningar",
        values: [15000, 16000, 14500, 17000, 16500, 18000],
        color: CHART_CONFIG.colors.success,
      },
      {
        label: "Utbetalningar",
        values: [12000, 13000, 12500, 14000, 13500, 15000],
        color: CHART_CONFIG.colors.danger,
      },
    ],
  };
}

/**
 * Beräknar utbetalningar per kategori (exempel).
 * @returns {object}
 */
function calculateUtbetalningarPerKategori() {
  // Placeholder - skulle hämta från faktisk data
  return {
    labels: ["Boende", "Mat", "Hälsa", "Transport", "Övrigt"],
    values: [8000, 3000, 2000, 1500, 1000],
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Ritar "Ingen data" meddelande.
 */
function drawNoDataMessage(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#999";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Ingen data tillgänglig", canvas.width / 2, canvas.height / 2);
}

/**
 * Exporterar chart till bild.
 * @param {string} canvasId - Canvas ID
 * @param {string} filename - Filnamn
 */
export function exportChartToImage(canvasId, filename = "chart.png") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.createPieChart = createPieChart;
window.createBarChart = createBarChart;
window.createLineChart = createLineChart;
window.createSparkline = createSparkline;
window.createDashboardCharts = createDashboardCharts;
window.exportChartToImage = exportChartToImage;

console.log("[Charts] charts.js laddad.");
