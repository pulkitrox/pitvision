/* =========================================
   PitVision AI — Shared script
   - Navigation interactions
   - Particle / counter animations
   - Predictor form behaviour + real /api/predict
   - History persistence (localStorage) + sparkline
   ========================================= */

(function () {
  "use strict";

  /* ---------- Backend ---------- */
  // The page's hostname already resolves to REACT_APP_BACKEND_URL (kubernetes ingress
  // routes /api/* to the backend). Override via window.PITVISION_API if needed.
  const API_BASE = (typeof window !== "undefined" && window.PITVISION_API) || (window.location.origin + "/api");
  const HISTORY_KEY = "pitvision.history.v1";
  const HISTORY_MAX = 12;

  /* ---------- Static dropdown data (encoder-aligned) ----------
     The OrdinalEncoder bundled with the stacking model was trained on the
     2022-2024 grid; using its exact category set guarantees the model never
     has to encode an unseen value. */
  const DRIVERS = [
    { code: "VER", name: "Max Verstappen",      team: "Red Bull Racing" },
    { code: "PER", name: "Sergio Pérez",        team: "Red Bull Racing" },
    { code: "HAM", name: "Lewis Hamilton",      team: "Mercedes / Ferrari" },
    { code: "LEC", name: "Charles Leclerc",     team: "Ferrari" },
    { code: "NOR", name: "Lando Norris",        team: "McLaren" },
    { code: "PIA", name: "Oscar Piastri",       team: "McLaren" },
    { code: "RUS", name: "George Russell",      team: "Mercedes" },
    { code: "ALO", name: "Fernando Alonso",     team: "Aston Martin" },
    { code: "STR", name: "Lance Stroll",        team: "Aston Martin" },
    { code: "GAS", name: "Pierre Gasly",        team: "Alpine" },
    { code: "OCO", name: "Esteban Ocon",        team: "Alpine / Haas" },
    { code: "HUL", name: "Nico Hülkenberg",     team: "Haas / Sauber" },
    { code: "BOT", name: "Valtteri Bottas",     team: "Alfa Romeo / Sauber" },
    { code: "TSU", name: "Yuki Tsunoda",        team: "AlphaTauri / RB" },
    { code: "RIC", name: "Daniel Ricciardo",    team: "McLaren / RB" },
    { code: "ZHO", name: "Zhou Guanyu",         team: "Alfa Romeo / Sauber" },
    { code: "SAI", name: "Carlos Sainz",        team: "Ferrari / Williams" },
    { code: "ALB", name: "Alex Albon",          team: "Williams" },
    { code: "MAG", name: "Kevin Magnussen",     team: "Haas" },
    { code: "MSC", name: "Mick Schumacher",     team: "Haas" },
    { code: "LAW", name: "Liam Lawson",         team: "AlphaTauri" },
    { code: "VET", name: "Sebastian Vettel",    team: "Aston Martin" },
    { code: "LAT", name: "Nicholas Latifi",     team: "Williams" },
    { code: "DEV", name: "Nyck de Vries",       team: "AlphaTauri" },
    { code: "SAR", name: "Logan Sargeant",      team: "Williams" }
  ];

  // Display label kept user-friendly; values match the encoder categories exactly.
  const RACES = [
    { value: "Bahrain Grand Prix",        label: "Bahrain GP"          },
    { value: "Saudi Arabian Grand Prix",  label: "Saudi Arabian GP"    },
    { value: "Australian Grand Prix",     label: "Australian GP"       },
    { value: "Japanese Grand Prix",       label: "Japanese GP"         },
    { value: "Miami Grand Prix",          label: "Miami GP"            },
    { value: "Emilia Romagna Grand Prix", label: "Emilia Romagna GP"   },
    { value: "Monaco Grand Prix",         label: "Monaco GP"           },
    { value: "Canadian Grand Prix",       label: "Canadian GP"         },
    { value: "Spanish Grand Prix",        label: "Spanish GP"          },
    { value: "Austrian Grand Prix",       label: "Austrian GP"         },
    { value: "British Grand Prix",        label: "British GP"          },
    { value: "Hungarian Grand Prix",      label: "Hungarian GP"        },
    { value: "Belgian Grand Prix",        label: "Belgian GP"          },
    { value: "Dutch Grand Prix",          label: "Dutch GP"            },
    { value: "Italian Grand Prix",        label: "Italian GP (Monza)"  },
    { value: "Azerbaijan Grand Prix",     label: "Azerbaijan GP"       },
    { value: "Singapore Grand Prix",      label: "Singapore GP"        },
    { value: "United States Grand Prix",  label: "United States GP"    },
    { value: "Mexico City Grand Prix",    label: "Mexico City GP"      },
    { value: "São Paulo Grand Prix",      label: "São Paulo GP"        },
    { value: "Las Vegas Grand Prix",      label: "Las Vegas GP"        },
    { value: "Qatar Grand Prix",          label: "Qatar GP"            },
    { value: "Abu Dhabi Grand Prix",      label: "Abu Dhabi GP"        },
    { value: "French Grand Prix",         label: "French GP"           }
  ];

  const COMPOUNDS = ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"];

  /* ---------- Helpers ---------- */
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function fillSelect(el, items, getValue, getLabel, defaultVal) {
    if (!el) return;
    el.innerHTML = "";
    items.forEach((it) => {
      const opt = document.createElement("option");
      opt.value = getValue(it);
      opt.textContent = getLabel(it);
      el.appendChild(opt);
    });
    if (defaultVal !== undefined) el.value = defaultVal;
  }

  /* ---------- Nav: burger + ripple on buttons ---------- */
  function initNav() {
    const burger = $(".nav__burger");
    const links  = $(".nav__links");
    if (burger && links) {
      burger.addEventListener("click", () => links.classList.toggle("is-open"));
    }
    $$(".btn").forEach((btn) => {
      btn.addEventListener("pointerdown", (e) => {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty("--rx", ((e.clientX - rect.left) / rect.width) * 100 + "%");
        btn.style.setProperty("--ry", ((e.clientY - rect.top)  / rect.height) * 100 + "%");
      });
    });
  }

  /* ---------- Hero particles ---------- */
  function initParticles() {
    const layer = document.getElementById("particles");
    if (!layer) return;
    const n = 26;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "particle";
      p.style.left = Math.random() * 100 + "%";
      p.style.top  = (100 + Math.random() * 20) + "%";
      p.style.animationDuration = (8 + Math.random() * 14) + "s";
      p.style.animationDelay    = (Math.random() * 10) + "s";
      p.style.opacity = (0.2 + Math.random() * 0.5).toFixed(2);
      layer.appendChild(p);
    }
  }

  /* ---------- Animated counters ---------- */
  function animateCounters() {
    const els = $$("[data-counter]");
    els.forEach((el) => {
      const target = parseFloat(el.dataset.counter);
      const suffix = el.dataset.suffix || "";
      const dec    = target % 1 !== 0 ? 1 : 0;
      const dur    = 1200;
      const start  = performance.now();
      function step(t) {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target * eased;
        el.textContent = val.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            requestAnimationFrame(step);
            io.disconnect();
          }
        });
      }, { threshold: 0.4 });
      io.observe(el);
    });
  }

  /* ---------- Fade-up on scroll ---------- */
  function initFadeUp() {
    const targets = $$(".feat, .step, .met, .data, .card, .algo, .meth__col");
    targets.forEach((el) => el.setAttribute("data-anim", "fade-up"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  }

  /* =========================================
     PREDICTOR
     ========================================= */
  function initPredictor() {
    const form = document.getElementById("predictForm");
    if (!form) return;

    fillSelect($("#driver"),  DRIVERS,  (d) => d.code, (d) => `${d.code} — ${d.name}`, "VER");
    fillSelect($("#race"),    RACES,    (r) => r.value, (r) => r.label, "Italian Grand Prix");
    fillSelect($("#compound"),COMPOUNDS,(c) => c,     (c) => c, "MEDIUM");

    // Race progress slider
    const slider  = $("#raceProgress");
    const sliderV = $("#raceProgressVal");
    function syncSlider() {
      sliderV.textContent = slider.value + "%";
      slider.style.setProperty("--pct", slider.value + "%");
    }
    slider.addEventListener("input", syncSlider);
    syncSlider();

    // Sample lap button
    $("#randomFillBtn").addEventListener("click", () => {
      $("#lapNumber").value   = Math.floor(8 + Math.random() * 50);
      $("#position").value    = Math.floor(1 + Math.random() * 19);
      $("#stint").value       = Math.floor(1 + Math.random() * 3);
      $("#tyreLife").value    = Math.floor(2 + Math.random() * 32);
      $("#lapTime").value     = (85 + Math.random() * 8).toFixed(3);
      $("#lapDelta").value    = (Math.random() * 1.4 - 0.2).toFixed(3);
      $("#cumDeg").value      = (Math.random() * 5).toFixed(2);
      $("#posChange").value   = Math.floor(Math.random() * 5 - 2);
      slider.value            = Math.floor(Math.random() * 100);
      syncSlider();
    });

    // Clear history
    const clearBtn = document.getElementById("clearHistoryBtn");
    if (clearBtn) clearBtn.addEventListener("click", () => { clearHistory(); renderHistory(); });

    form.addEventListener("submit", onSubmit);
    renderHistory();
  }

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const btn  = document.getElementById("predictBtn");
    btn.classList.add("is-loading");
    btn.disabled = true;

    const data = collectFormData(form);
    updateMiniTelemetry(data);

    const started = performance.now();
    let result;
    let usedFallback = false;
    try {
      result = await callPredictAPI(data);
    } catch (err) {
      console.warn("API failed, using mock heuristic:", err);
      result = mockPredict(data);
      usedFallback = true;
    }
    const elapsed = Math.round(performance.now() - started);

    // brief intentional latency to show spinner
    await sleep(Math.max(0, 400 - elapsed));

    renderResult(result, elapsed, usedFallback);
    pushHistory({ ...data, result, ts: Date.now() });
    renderHistory();

    btn.classList.remove("is-loading");
    btn.disabled = false;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function collectFormData(form) {
    const fd = new FormData(form);
    const obj = {};
    fd.forEach((v, k) => {
      const numeric = !isNaN(parseFloat(v)) && isFinite(v) && k !== "driver" && k !== "race" && k !== "compound";
      obj[k] = numeric ? parseFloat(v) : v;
    });
    return obj;
  }

  function updateMiniTelemetry(d) {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set("mDriver",   d.driver || "—");
    // show user-friendly race label
    const race = RACES.find((r) => r.value === d.race);
    set("mRace",     race ? race.label : (d.race || "—"));
    set("mCompound", d.compound || "—");
    set("mLap",      d.lapNumber != null ? String(d.lapNumber) : "—");
    set("mTyre",     d.tyreLife != null ? d.tyreLife + " laps" : "—");
  }

  /* ---------- Backend integration ---------- */
  async function callPredictAPI(payload) {
    const url = API_BASE.replace(/\/$/, "") + "/predict";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return await res.json();
  }

  /* ---------- Mock prediction fallback ---------- */
  function mockPredict(d) {
    const tyre = clamp((d.tyreLife || 0) / 30, 0, 1);
    const delta = clamp((d.lapDelta || 0) / 1.2, -0.4, 1);
    const deg = clamp((d.cumDeg || 0) / 5, 0, 1);
    const slope = clamp((d.degSlope || 0) / 0.2, -0.4, 1);
    const compoundFactor = ({ SOFT: 0.18, MEDIUM: 0.05, HARD: -0.06, INTERMEDIATE: -0.1, WET: -0.1 })[d.compound] || 0;
    const progress = clamp((d.raceProgress || 0) / 100, 0, 1);
    const noise = (Math.random() - 0.5) * 0.06;
    const score = (
      tyre * 1.7 + delta * 1.3 + deg * 1.1 + slope * 0.9 +
      compoundFactor + (progress > 0.85 ? -0.4 : 0) + noise - 1.3
    );
    const probability = clamp(1 / (1 + Math.exp(-score)), 0.02, 0.985);
    return {
      prediction: probability >= 0.5 ? "Pit Next Lap" : "Stay Out",
      probability: +probability.toFixed(3),
      confidence: +(Math.max(probability, 1 - probability) * 100).toFixed(1)
    };
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- Render result ---------- */
  function renderResult(r, latency, usedFallback) {
    document.getElementById("resultEmpty").hidden = true;
    document.getElementById("resultBody").hidden  = false;

    const isPit = r.prediction.toLowerCase().includes("pit");
    const badge = document.getElementById("resultBadge");
    badge.classList.toggle("is-stay", !isPit);
    badge.querySelector(".badge__label").textContent = isPit ? "PIT NEXT LAP" : "STAY OUT";

    document.getElementById("rPrediction").textContent  = isPit ? "PIT NEXT LAP" : "STAY OUT";
    document.getElementById("rConfidence").textContent  = r.confidence.toFixed(1) + "%";
    document.getElementById("rProbability").textContent = r.probability.toFixed(3);
    const latChip = document.getElementById("latencyChip");
    latChip.textContent = (usedFallback ? "MOCK · " : "") + latency + " ms";

    // circular confidence
    const circ = document.getElementById("circFg");
    const num  = document.getElementById("circNum");
    const C    = 2 * Math.PI * 52;
    const offset = C * (1 - r.confidence / 100);
    requestAnimationFrame(() => {
      circ.setAttribute("stroke-dasharray", C.toFixed(2));
      circ.setAttribute("stroke-dashoffset", offset.toFixed(2));
      circ.style.stroke = r.confidence >= 80 ? "#16a34a" : r.confidence >= 60 ? "#facc15" : "#E10600";
    });
    animateNum(num, r.confidence, "%", 1100, 1);

    // gauge
    const arc = document.getElementById("gaugeArc");
    const arcLen = 282.7;
    arc.setAttribute("stroke-dasharray", arcLen.toFixed(1));
    arc.setAttribute("stroke-dashoffset", (arcLen * (1 - r.probability)).toFixed(1));

    const needle = document.getElementById("gaugeNeedle");
    const angle  = -90 + r.probability * 180;
    needle.setAttribute("transform", `rotate(${angle.toFixed(2)} 110 110)`);

    // traffic lights
    const g = document.getElementById("lightG");
    const y = document.getElementById("lightY");
    const x = document.getElementById("lightR");
    [g, y, x].forEach((el) => el.classList.remove("is-on"));
    if (r.confidence >= 80)       g.classList.add("is-on");
    else if (r.confidence >= 60)  y.classList.add("is-on");
    else                          x.classList.add("is-on");
  }

  function animateNum(el, target, suffix, dur, dec) {
    const start = performance.now();
    function step(t) {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = target * eased;
      el.textContent = v.toFixed(dec) + (suffix || "");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* =========================================
     HISTORY + SPARKLINE
     ========================================= */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory(list) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (_) { /* quota */ }
  }

  function pushHistory(entry) {
    const list = loadHistory();
    list.push({
      ts: entry.ts,
      driver: entry.driver,
      race: entry.race,
      compound: entry.compound,
      lap: entry.lapNumber,
      tyre: entry.tyreLife,
      probability: entry.result.probability,
      confidence: entry.result.confidence,
      prediction: entry.result.prediction
    });
    while (list.length > HISTORY_MAX) list.shift();
    saveHistory(list);
  }

  function clearHistory() { saveHistory([]); }

  function renderHistory() {
    const wrap = document.getElementById("historyCard");
    if (!wrap) return;
    const list = loadHistory();

    const empty   = document.getElementById("historyEmpty");
    const content = document.getElementById("historyContent");
    const tbody   = document.getElementById("historyTbody");
    const stats   = document.getElementById("historyStats");
    const svg     = document.getElementById("sparkline");

    if (!list.length) {
      empty.hidden = false;
      content.hidden = true;
      return;
    }
    empty.hidden = true;
    content.hidden = false;

    // Stats
    const avg = list.reduce((s, e) => s + e.probability, 0) / list.length;
    const maxE = list.reduce((m, e) => e.probability > m.probability ? e : m, list[0]);
    const pitCount = list.filter((e) => e.prediction.toLowerCase().includes("pit")).length;
    stats.innerHTML = `
      <div><span class="hk">Avg P(pit)</span><span class="hv">${(avg*100).toFixed(1)}%</span></div>
      <div><span class="hk">Peak</span><span class="hv">${(maxE.probability*100).toFixed(1)}% · L${maxE.lap}</span></div>
      <div><span class="hk">Pit calls</span><span class="hv">${pitCount} / ${list.length}</span></div>
    `;

    // Table
    tbody.innerHTML = "";
    [...list].reverse().forEach((e) => {
      const tr = document.createElement("tr");
      const time = new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const isPit = e.prediction.toLowerCase().includes("pit");
      const raceObj = RACES.find((r) => r.value === e.race);
      const raceLabel = raceObj ? raceObj.label : e.race;
      tr.innerHTML = `
        <td>${time}</td>
        <td>${e.driver}</td>
        <td>${raceLabel}</td>
        <td>L${e.lap}</td>
        <td>${e.compound}</td>
        <td>${e.tyre}</td>
        <td class="hist__prob">${(e.probability*100).toFixed(1)}%</td>
        <td><span class="hist__pill ${isPit ? "hist__pill--pit" : "hist__pill--stay"}">${isPit ? "PIT" : "STAY"}</span></td>
      `;
      tbody.appendChild(tr);
    });

    // Sparkline
    drawSparkline(svg, list);
  }

  function drawSparkline(svg, list) {
    if (!svg) return;
    const W = 600, H = 140, padX = 24, padY = 18;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const ns = "http://www.w3.org/2000/svg";

    // grid 0/50/100%
    [0, 0.5, 1].forEach((frac) => {
      const y = padY + (H - 2*padY) * (1 - frac);
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", padX); line.setAttribute("x2", W - padX);
      line.setAttribute("y1", y); line.setAttribute("y2", y);
      line.setAttribute("stroke", "rgba(255,255,255,0.08)");
      line.setAttribute("stroke-dasharray", "2 4");
      svg.appendChild(line);

      const t = document.createElementNS(ns, "text");
      t.setAttribute("x", 4); t.setAttribute("y", y + 4);
      t.setAttribute("fill", "#7B8390");
      t.setAttribute("font-family", "JetBrains Mono, monospace");
      t.setAttribute("font-size", "9");
      t.textContent = (frac*100).toFixed(0) + "%";
      svg.appendChild(t);
    });

    // 50% threshold line stronger
    const thr = document.createElementNS(ns, "line");
    const yThr = padY + (H - 2*padY) * 0.5;
    thr.setAttribute("x1", padX); thr.setAttribute("x2", W - padX);
    thr.setAttribute("y1", yThr); thr.setAttribute("y2", yThr);
    thr.setAttribute("stroke", "rgba(225,6,0,0.35)");
    thr.setAttribute("stroke-width", "1");
    svg.appendChild(thr);

    const n = list.length;
    const xAt = (i) => padX + (W - 2*padX) * (n <= 1 ? 0.5 : (i / (n - 1)));
    const yAt = (p) => padY + (H - 2*padY) * (1 - p);

    // area fill
    const areaPts = list.map((e, i) => `${xAt(i)},${yAt(e.probability)}`).join(" ");
    const area = document.createElementNS(ns, "polygon");
    area.setAttribute("points",
      `${xAt(0)},${H - padY} ${areaPts} ${xAt(n-1)},${H - padY}`
    );
    area.setAttribute("fill", "url(#sparkGrad)");
    area.setAttribute("opacity", "0.55");

    // gradient
    const defs = document.createElementNS(ns, "defs");
    const grad = document.createElementNS(ns, "linearGradient");
    grad.setAttribute("id", "sparkGrad");
    grad.setAttribute("x1", "0"); grad.setAttribute("y1", "0");
    grad.setAttribute("x2", "0"); grad.setAttribute("y2", "1");
    const s1 = document.createElementNS(ns, "stop");
    s1.setAttribute("offset", "0%"); s1.setAttribute("stop-color", "#E10600"); s1.setAttribute("stop-opacity", "0.65");
    const s2 = document.createElementNS(ns, "stop");
    s2.setAttribute("offset", "100%"); s2.setAttribute("stop-color", "#E10600"); s2.setAttribute("stop-opacity", "0");
    grad.appendChild(s1); grad.appendChild(s2);
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(area);

    // polyline
    const poly = document.createElementNS(ns, "polyline");
    poly.setAttribute("points", areaPts);
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", "#E10600");
    poly.setAttribute("stroke-width", "2");
    poly.setAttribute("stroke-linejoin", "round");
    poly.setAttribute("stroke-linecap", "round");
    svg.appendChild(poly);

    // dots
    list.forEach((e, i) => {
      const isPit = e.prediction.toLowerCase().includes("pit");
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", xAt(i));
      dot.setAttribute("cy", yAt(e.probability));
      dot.setAttribute("r", isPit ? "4.5" : "3");
      dot.setAttribute("fill", isPit ? "#E10600" : "#fff");
      dot.setAttribute("stroke", "#0B0D12");
      dot.setAttribute("stroke-width", "1.5");
      const tt = document.createElementNS(ns, "title");
      tt.textContent = `${e.driver} · L${e.lap} · ${(e.probability*100).toFixed(1)}% · ${e.prediction}`;
      dot.appendChild(tt);
      svg.appendChild(dot);
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    initParticles();
    animateCounters();
    initFadeUp();
    initPredictor();
  });
})();
