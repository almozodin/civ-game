const format = (value, digits = 2) => Number.parseFloat(value).toFixed(digits);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const relu = (value) => Math.max(0, value);

const randomNormal = (mean = 0, std = 1) => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const params = {
  piStar: 4,
  rStar: 1,
  rhoY: 0.6,
  phiR: 0.4,
  phiF: 0.5,
  beta: 0.7,
  kappa: 0.35,
  lambda0: 0.15,
  lambda1: 0.55,
  chi: 0.25,
  phiPi: 1.4,
  phiY: 0.4,
  rNeutral: 1,
  inertia: 0.25,
  q: 0.25,
  s0: 1.2,
  gammaB: 0.12,
  gammaC: 0.45,
  gammaR: 0.3,
  bBar: 70,
  rBar: 6,
  psiPi: 0.25,
  psiR: 0.2,
  psiS: 0.35,
  baseCA: 0.4,
  okun: 0.5,
  uStar: 7,
  gStar: 2,
  credibilityScale: 8
};

const scenarios = [
  {
    id: "baseline",
    title: "默认危机：软着陆试验",
    description: "通胀高企但外储尚可，信誉处于修复窗口。",
    initial: {
      y: -2,
      pi: 16,
      piE: 13,
      i: 9,
      c: 0.55,
      b: 65,
      R: 6,
      s: 2.4,
      BM: 18,
      u: 9,
      A: 52
    }
  },
  {
    id: "fragile",
    title: "脆弱高通胀：预期脱锚",
    description: "预期已经漂移，外汇储备偏低，风险溢价敏感。",
    initial: {
      y: -3.5,
      pi: 28,
      piE: 24,
      i: 16,
      c: 0.35,
      b: 78,
      R: 3.8,
      s: 4.8,
      BM: 35,
      u: 12,
      A: 45
    }
  }
];

const factions = [
  {
    id: "workers",
    name: "民众与工会",
    focus: "就业与购买力",
    base: 55
  },
  {
    id: "business",
    name: "企业与出口商",
    focus: "增长与融资成本",
    base: 50
  },
  {
    id: "banks",
    name: "银行与金融",
    focus: "通胀预期与信誉",
    base: 48
  },
  {
    id: "opposition",
    name: "反对派",
    focus: "社会稳定与民意",
    base: 42
  }
];

const state = {
  turn: 1,
  scenario: scenarios[0],
  ...scenarios[0].initial
};

const history = [];
const kpiConfig = [
  { key: "y", label: "产出缺口 y", unit: "%" },
  { key: "pi", label: "通胀 π", unit: "%" },
  { key: "piE", label: "通胀预期 πᵉ", unit: "%" },
  { key: "i", label: "名义利率 i", unit: "%" },
  { key: "u", label: "失业率 u", unit: "%" },
  { key: "A", label: "支持率 A", unit: "%" },
  { key: "b", label: "债务/GDP b", unit: "%" },
  { key: "R", label: "外汇储备 R", unit: "月" },
  { key: "s", label: "风险溢价 s", unit: "%" },
  { key: "BM", label: "黑市压力 BM", unit: "" }
];

const sparklineCharts = new Map();
let mainChart;

const getPolicyInputs = () => ({
  deltaI: Number.parseFloat(document.getElementById("policy-rate").value),
  fiscalImpulse: Number.parseFloat(document.getElementById("fiscal-impulse").value),
  primaryDeficit: Number.parseFloat(document.getElementById("primary-deficit").value),
  controls: Number.parseFloat(document.getElementById("capital-controls").value),
  bailout: Number.parseFloat(document.getElementById("bailout").value)
});

const updateSliderLabels = () => {
  const inputs = getPolicyInputs();
  document.getElementById("policy-rate-value").textContent = format(inputs.deltaI, 2);
  document.getElementById("fiscal-impulse-value").textContent = format(inputs.fiscalImpulse, 2);
  document.getElementById("primary-deficit-value").textContent = format(inputs.primaryDeficit, 2);
  document.getElementById("capital-controls-value").textContent = format(inputs.controls, 2);
  document.getElementById("bailout-value").textContent = format(inputs.bailout, 2);
};

const lambdaFromCredibility = (c) => clamp(params.lambda0 + params.lambda1 * c, 0, 0.95);

const computeTaylor = (pi, y) =>
  params.rNeutral + pi + params.phiPi * (pi - params.piStar) + params.phiY * y;

const computeCredibilityUpdate = ({
  c,
  pi,
  piStar,
  i,
  iTaylor,
  primaryDeficit,
  y,
  BM
}) => {
  const consistency = clamp(1 - Math.abs(i - iTaylor) / params.credibilityScale, 0, 1);
  const monetize = Math.max(0, primaryDeficit - 4) * (i < pi ? 0.12 : 0.06);
  const success = Math.abs(pi - piStar) < 2 && Math.abs(y) < 1 && BM < 30 ? 0.18 : 0.02;
  const next = c + 0.18 * consistency - 0.05 * Math.abs(pi - piStar) - 0.2 * monetize + success;
  return clamp(next, 0.05, 0.98);
};

const computeApproval = ({ A, pi, y, u, BM }) => {
  const change = 0.3 * y - 0.18 * Math.abs(pi - params.piStar) - 0.4 * (u - params.uStar) - 0.05 * BM;
  return clamp(A + change, 15, 95);
};

const stepEconomy = (policy) => {
  const iTaylor = computeTaylor(state.pi, state.y);
  const iNext = clamp(state.i + policy.deltaI + params.inertia * (iTaylor - state.i), -2, 45);
  const shockD = randomNormal(0, 0.6);
  const shockS = randomNormal(0, 0.5);
  const shockFX = randomNormal(0, 0.4);

  const yNext =
    params.rhoY * state.y -
    params.phiR * ((state.i - state.piE) - params.rStar) +
    params.phiF * policy.fiscalImpulse +
    shockD;

  const piNext = params.beta * state.piE + params.kappa * state.y + shockS;

  const lambda = lambdaFromCredibility(state.c);
  const piENext =
    (1 - lambda) * state.piE +
    lambda * params.piStar +
    params.chi * (1 - state.c) * (state.pi - params.piStar);

  const sNext =
    params.s0 +
    params.gammaB * relu(state.b - params.bBar) +
    params.gammaC * (1 - state.c) * 10 +
    params.gammaR * relu(params.rBar - state.R) * 8;

  const realRate = state.i - state.piE;
  const deprec =
    params.psiPi * (state.pi - params.piStar) - params.psiR * realRate + params.psiS * sNext + shockFX;

  const controlsSideEffect = policy.controls * 0.9;
  const BMNext = clamp(
    0.6 * deprec + 10 * controlsSideEffect + 0.4 * relu(state.pi - 30),
    0,
    100
  );

  const CA = params.baseCA + 0.04 * -state.y + 0.02 * deprec;
  const outflow = clamp(0.08 * sNext + 6 * (1 - state.c) - 2.4 * policy.controls, 0, 18);
  const RNext = clamp(state.R + 0.5 * CA - 0.25 * outflow, 0, 12);

  const g = params.gStar + 0.6 * state.y;
  const bNext =
    state.b + params.q * (policy.primaryDeficit + ((state.i + sNext - g) / 100) * state.b) + policy.bailout;

  const uNext = clamp(params.uStar - params.okun * yNext, 3, 25);
  const cNext = computeCredibilityUpdate({
    c: state.c,
    pi: state.pi,
    piStar: params.piStar,
    i: state.i,
    iTaylor,
    primaryDeficit: policy.primaryDeficit,
    y: state.y,
    BM: state.BM
  });

  const ANext = computeApproval({ A: state.A, pi: state.pi, y: state.y, u: state.u, BM: state.BM });

  return {
    y: yNext,
    pi: piNext,
    piE: piENext,
    i: iNext,
    c: cNext,
    b: bNext,
    R: RNext,
    s: sNext,
    BM: BMNext,
    u: uNext,
    A: ANext,
    iTaylor
  };
};

const pushHistory = (record) => {
  history.push({
    turn: state.turn,
    ...record
  });
};

const updateState = (next) => {
  state.y = next.y;
  state.pi = clamp(next.pi, 0, 80);
  state.piE = clamp(next.piE, 0, 80);
  state.i = next.i;
  state.c = next.c;
  state.b = clamp(next.b, 20, 140);
  state.R = next.R;
  state.s = clamp(next.s, 0, 12);
  state.BM = next.BM;
  state.u = next.u;
  state.A = next.A;
};

const updateTopbar = () => {
  const iTaylor = computeTaylor(state.pi, state.y);
  document.getElementById("credibility-label").textContent = Math.round(state.c * 100);
  document.getElementById("taylor-label").textContent = `${format(iTaylor, 2)}%`;
  document.getElementById("taylor-gap").textContent = `${format(state.i - iTaylor, 2)}%`;
  document.getElementById("turn-label").textContent = `Q${state.turn}`;
  document.getElementById("game-status").textContent = checkGameStatus().status;
  document.getElementById("target-label").textContent = `${params.piStar}%`;
};

const buildKpis = () => {
  const grid = document.getElementById("kpi-grid");
  grid.innerHTML = "";
  kpiConfig.forEach((item) => {
    const card = document.createElement("div");
    card.className = "kpi-card";
    card.innerHTML = `
      <div class="label">${item.label}</div>
      <div class="value" id="kpi-${item.key}">--</div>
      <canvas id="spark-${item.key}" height="40"></canvas>
    `;
    grid.appendChild(card);
  });
};

const updateKpis = () => {
  kpiConfig.forEach((item) => {
    const value = state[item.key];
    const formatted = item.unit === "月" ? format(value, 2) : format(value, 2) + item.unit;
    document.getElementById(`kpi-${item.key}`).textContent = formatted;
  });
};

const renderFactions = () => {
  const list = document.getElementById("faction-list");
  list.innerHTML = "";
  factions.forEach((faction) => {
    const score = clamp(
      faction.base + 0.6 * state.A - 0.4 * Math.abs(state.pi - params.piStar) - 0.2 * state.u,
      0,
      100
    );
    const mood = score > 65 ? "支持" : score > 45 ? "观望" : "不满";
    const card = document.createElement("div");
    card.className = "faction-card";
    card.innerHTML = `
      <h4>${faction.name}</h4>
      <p>${faction.focus} · ${mood}（${format(score, 0)}）</p>
      <div class="bar"><span style="width: ${score}%"></span></div>
    `;
    list.appendChild(card);
  });
};

const updateHistoryTable = () => {
  const body = document.getElementById("history-body");
  body.innerHTML = "";
  history
    .slice()
    .reverse()
    .forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>Q${row.turn}</td>
        <td>${format(row.y, 2)}</td>
        <td>${format(row.pi, 2)}</td>
        <td>${format(row.piE, 2)}</td>
        <td>${format(row.i, 2)}</td>
        <td>${format(row.u, 2)}</td>
        <td>${format(row.A, 0)}</td>
        <td>${format(row.b, 1)}</td>
        <td>${format(row.R, 2)}</td>
        <td>${format(row.s, 2)}</td>
        <td>${format(row.BM, 1)}</td>
      `;
      body.appendChild(tr);
    });
};

const updateReport = () => {
  const report = document.getElementById("report-summary");
  const riskText = state.BM > 50 ? "黑市压力偏高，外部约束严峻。" : "外部压力处于可控范围。";
  const stance = state.y < 0 ? "经济仍在收缩" : "经济开始恢复";
  report.textContent = `Q${state.turn} 报告：通胀 ${format(state.pi, 1)}%，失业 ${format(
    state.u,
    1
  )}%，支持率 ${format(state.A, 0)}%。${stance}，${riskText}`;
};

const updatePolicyReadout = () => {
  const policy = getPolicyInputs();
  const iTaylor = computeTaylor(state.pi, state.y);
  const deviation = state.i + policy.deltaI - iTaylor;
  const note = deviation > 1 ? "显著偏离泰勒，信誉惩罚增加。" : "偏离泰勒处于可控区间。";
  document.getElementById("policy-readout").innerHTML = `
    <div>当前 i=${format(state.i, 2)}%，泰勒建议=${format(iTaylor, 2)}%，本季偏离=${format(
      deviation,
      2
    )}%</div>
    <div>预计主赤字 ${format(policy.primaryDeficit, 2)}% GDP，资本管制 ${format(
      policy.controls,
      2
    )}，救助 ${format(policy.bailout, 2)}% GDP。</div>
    <div>${note}</div>
  `;
};

const updateSparklines = () => {
  kpiConfig.forEach((item) => {
    const chart = sparklineCharts.get(item.key);
    if (!chart) return;
    chart.data.labels = history.map((row) => `Q${row.turn}`);
    chart.data.datasets[0].data = history.map((row) => row[item.key]);
    chart.update();
  });
};

const updateMainChart = () => {
  const labels = history.map((row) => `Q${row.turn}`);
  mainChart.data.labels = labels;
  mainChart.data.datasets.forEach((dataset) => {
    dataset.data = history.map((row) => row[dataset.key]);
  });
  mainChart.update();
};

const createSparkline = (key, color) => {
  const ctx = document.getElementById(`spark-${key}`).getContext("2d");
  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderColor: color,
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3
        }
      ]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
  sparklineCharts.set(key, chart);
};

const createMainChart = () => {
  const ctx = document.getElementById("main-chart").getContext("2d");
  const datasets = kpiConfig.map((item, index) => ({
    key: item.key,
    label: item.label,
    data: [],
    borderColor: `hsl(${(index * 38) % 360} 70% 45%)`,
    backgroundColor: "transparent",
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.3
  }));
  mainChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets
    },
    options: {
      animation: false,
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#eef2f7" } }
      }
    }
  });

  const legend = document.getElementById("chart-legend");
  legend.innerHTML = "";
  datasets.forEach((dataset) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.addEventListener("change", () => {
      dataset.hidden = !checkbox.checked;
      mainChart.update();
    });
    const swatch = document.createElement("span");
    swatch.style.display = "inline-block";
    swatch.style.width = "10px";
    swatch.style.height = "10px";
    swatch.style.borderRadius = "50%";
    swatch.style.background = dataset.borderColor;
    label.appendChild(checkbox);
    label.appendChild(swatch);
    label.appendChild(document.createTextNode(dataset.label));
    legend.appendChild(label);
  });
};

const checkGameStatus = () => {
  const win =
    state.pi <= 8 && state.u <= 10 && state.R >= 4 && history.length >= 4 &&
    history.slice(-4).every((row) => row.pi <= 8 && row.u <= 10 && row.R >= 4);
  if (win) return { status: "胜利", message: "稳定目标达成" };
  if (state.pi > 60 || state.R < 0.5 || state.A < 20) {
    return { status: "失败", message: "宏观失控" };
  }
  return { status: "执政中", message: "继续改革" };
};

const applyTurn = () => {
  const policy = getPolicyInputs();
  const next = stepEconomy(policy);
  updateState(next);
  pushHistory({
    y: state.y,
    pi: state.pi,
    piE: state.piE,
    i: state.i,
    u: state.u,
    A: state.A,
    b: state.b,
    R: state.R,
    s: state.s,
    BM: state.BM
  });
  state.turn += 1;
};

const updateView = () => {
  updateTopbar();
  updateKpis();
  updateSparklines();
  updateMainChart();
  renderFactions();
  updateHistoryTable();
  updateReport();
  updatePolicyReadout();
};

const initHistory = () => {
  pushHistory({
    y: state.y,
    pi: state.pi,
    piE: state.piE,
    i: state.i,
    u: state.u,
    A: state.A,
    b: state.b,
    R: state.R,
    s: state.s,
    BM: state.BM
  });
};

const switchView = (target) => {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `view-${target}`);
  });
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === target);
  });
};

const openModal = (modal) => {
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
};

const closeModal = (modal) => {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
};

const infoContent = {
  dashboard: {
    title: "总览说明",
    content:
      "总览展示所有关键变量曲线。每张 KPI 卡片附带迷你曲线，反映近期趋势。曲线可通过右侧复选框自由组合。"
  },
  policies: {
    title: "政策说明",
    content:
      "你可以调整利率、财政立场、赤字与资本管制。系统将按照宏观方程计算下一季度。偏离泰勒规则和高赤字会损害信誉。"
  },
  factions: {
    title: "派系说明",
    content:
      "不同派系关注就业、融资成本与通胀稳定。支持率是综合结果，但派系满意度过低会加剧政治压力。"
  },
  principles: {
    title: "公式说明",
    content:
      "模型基于 IS、菲利普斯曲线与信誉锚定机制。每回合是一个季度，利率与通胀使用年化百分比。"
  },
  history: {
    title: "历史说明",
    content:
      "历史表记录每季度关键变量。报告区会自动生成一句政策总结，便于回顾走势与风险。"
  }
};

const initInfoButtons = () => {
  const modal = document.getElementById("info-modal");
  const title = document.getElementById("info-title");
  const content = document.getElementById("info-content");

  document.querySelectorAll(".btn.info").forEach((btn) => {
    btn.addEventListener("click", () => {
      const info = infoContent[btn.dataset.info];
      if (info) {
        title.textContent = info.title;
        content.textContent = info.content;
      }
      openModal(modal);
    });
  });

  document.getElementById("close-info").addEventListener("click", () => closeModal(modal));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal(modal);
  });
};

const initTutorial = () => {
  const modal = document.getElementById("tutorial-modal");
  openModal(modal);
  document.getElementById("close-tutorial").addEventListener("click", () => closeModal(modal));
  document.getElementById("toggle-tutorial").addEventListener("click", () => openModal(modal));
};

const initNavigation = () => {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
};

const initCharts = () => {
  buildKpis();
  const colors = ["#2563eb", "#ef4444", "#f97316", "#0ea5e9", "#10b981", "#6366f1", "#a855f7", "#eab308", "#14b8a6", "#f43f5e"];
  kpiConfig.forEach((item, index) => createSparkline(item.key, colors[index % colors.length]));
  createMainChart();
};

const bindPolicyInputs = () => {
  document.querySelectorAll(".slider-card input").forEach((input) => {
    input.addEventListener("input", () => {
      updateSliderLabels();
      updatePolicyReadout();
    });
  });
};

const startSimulation = (steps) => {
  let count = 0;
  const run = () => {
    if (count >= steps) return;
    if (checkGameStatus().status !== "执政中") return;
    applyTurn();
    updateView();
    count += 1;
    setTimeout(run, 120);
  };
  run();
};

const resetGame = () => {
  const scenario = scenarios[0];
  state.turn = 1;
  state.scenario = scenario;
  Object.assign(state, scenario.initial);
  history.length = 0;
  initHistory();
  updateView();
};

const initScenario = () => {
  const scenario = scenarios[0];
  document.getElementById("scenario-title").textContent = scenario.title;
  document.getElementById("scenario-desc").textContent = scenario.description;
};

const init = () => {
  initScenario();
  initCharts();
  initHistory();
  updateSliderLabels();
  updateView();
  initNavigation();
  initInfoButtons();
  initTutorial();
  bindPolicyInputs();

  document.getElementById("next-quarter").addEventListener("click", () => {
    if (checkGameStatus().status !== "执政中") return;
    applyTurn();
    updateView();
  });

  document.getElementById("auto-run").addEventListener("click", () => startSimulation(8));
  document.getElementById("reset-game").addEventListener("click", resetGame);
};

init();
