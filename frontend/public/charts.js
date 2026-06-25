/* =========================================
   PitVision AI — Charts (Chart.js)
   ========================================= */

(function () {
  "use strict";
  if (typeof window.Chart === "undefined") return;

  // Global Chart.js defaults to match the F1 dark theme
  const RED = "#E10600";
  const TEXT = "#BDC3CC";
  const MUTED = "#7B8390";
  const GRID = "rgba(255,255,255,0.07)";

  window.Chart.defaults.color = TEXT;
  window.Chart.defaults.font.family = "'JetBrains Mono', monospace";
  window.Chart.defaults.font.size = 11;

  /* ---------- 1. Model comparison ---------- */
  const cmpEl = document.getElementById("chartCompare");
  if (cmpEl) {
    new window.Chart(cmpEl, {
      type: "bar",
      data: {
        labels: ["Logistic Reg.", "Random Forest", "XGBoost", "LightGBM", "Stacking"],
        datasets: [
          {
            label: "ROC-AUC",
            data: [88.4, 95.1, 97.3, 97.6, 98.45],
            backgroundColor: ["#3a3f4b", "#3a3f4b", "#5a1a1a", "#5a1a1a", RED],
            borderRadius: 6,
            barThickness: 28
          },
          {
            label: "PR-AUC",
            data: [52.1, 71.5, 78.4, 80.0, 82.75],
            backgroundColor: "rgba(255,255,255,0.12)",
            borderRadius: 6,
            barThickness: 28
          }
        ]
      },
      options: chartOpts({
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: GRID }, ticks: { callback: (v) => v + "%" } },
          x: { grid: { display: false }, ticks: { color: MUTED } }
        }
      })
    });
  }

  /* ---------- 2. Feature importance ---------- */
  const featEl = document.getElementById("chartFeats");
  if (featEl) {
    new window.Chart(featEl, {
      type: "bar",
      data: {
        labels: [
          "TyreLife",
          "Cumulative Deg.",
          "LapTime Delta",
          "Degradation Slope",
          "Rolling Avg LT3",
          "Stint Number",
          "Compound",
          "Relative LapTime",
          "Race Progress",
          "Position Trend"
        ],
        datasets: [{
          label: "Importance",
          data: [0.184, 0.152, 0.131, 0.108, 0.092, 0.078, 0.065, 0.058, 0.046, 0.041],
          backgroundColor: (ctx) => {
            const v = ctx.parsed.x;
            if (v == null) return RED;
            const alpha = 0.45 + (v / 0.2) * 0.55;
            return `rgba(225, 6, 0, ${Math.min(1, alpha).toFixed(2)})`;
          },
          borderRadius: 6,
          barThickness: 16
        }]
      },
      options: chartOpts({
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: GRID }, ticks: { callback: (v) => v.toFixed(2) } },
          y: { grid: { display: false }, ticks: { color: TEXT } }
        }
      })
    });
  }

  /* ---------- 3. Probability donut ---------- */
  const donutEl = document.getElementById("chartDonut");
  if (donutEl) {
    new window.Chart(donutEl, {
      type: "doughnut",
      data: {
        labels: ["PIT", "STAY"],
        datasets: [{
          data: [29.2, 70.8],
          backgroundColor: [RED, "rgba(255,255,255,0.08)"],
          borderColor: "transparent",
          hoverBackgroundColor: ["#ff1f17", "rgba(255,255,255,0.15)"]
        }]
      },
      options: chartOpts({
        cutout: "70%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 10, boxHeight: 10, padding: 18, color: TEXT }
          },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed}%` } }
        }
      })
    });
  }

  function chartOpts(extra) {
    const base = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1100, easing: "easeOutCubic" },
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: { color: TEXT, boxWidth: 10, boxHeight: 10, padding: 14 }
        },
        tooltip: {
          backgroundColor: "rgba(7,8,12,0.95)",
          borderColor: "rgba(225,6,0,0.5)",
          borderWidth: 1,
          titleFont: { weight: 700 },
          padding: 10,
          displayColors: false
        }
      }
    };
    return deepMerge(base, extra || {});
  }

  function deepMerge(a, b) {
    const out = Array.isArray(a) ? a.slice() : Object.assign({}, a);
    for (const k of Object.keys(b)) {
      if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) {
        out[k] = deepMerge(a[k] || {}, b[k]);
      } else {
        out[k] = b[k];
      }
    }
    return out;
  }
})();
