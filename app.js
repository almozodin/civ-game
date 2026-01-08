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
    title: {
      zh: "默认危机：软着陆试验",
      en: "Baseline Crisis: Soft Landing Trial"
    },
    description: {
      zh: "通胀高企但外储尚可，信誉处于修复窗口。",
      en: "Inflation is elevated but reserves are intact, credibility is repairable."
    },
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
    title: {
      zh: "脆弱高通胀：预期脱锚",
      en: "Fragile Inflation: Expectations Unanchored"
    },
    description: {
      zh: "预期已经漂移，外汇储备偏低，风险溢价敏感。",
      en: "Expectations are drifting, reserves are low, risk premia are sensitive."
    },
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
    name: { zh: "民众与工会", en: "Workers & Unions" },
    focus: { zh: "就业与购买力", en: "Jobs & purchasing power" },
    base: 55
  },
  {
    id: "business",
    name: { zh: "企业与出口商", en: "Businesses & Exporters" },
    focus: { zh: "增长与融资成本", en: "Growth & financing cost" },
    base: 50
  },
  {
    id: "banks",
    name: { zh: "银行与金融", en: "Banks & Finance" },
    focus: { zh: "通胀预期与信誉", en: "Inflation expectations & credibility" },
    base: 48
  },
  {
    id: "opposition",
    name: { zh: "反对派", en: "Opposition" },
    focus: { zh: "社会稳定与民意", en: "Social stability & approval" },
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
  { key: "y", label: { zh: "产出缺口 y", en: "Output gap y" }, unit: "%" },
  { key: "pi", label: { zh: "通胀 π", en: "Inflation π" }, unit: "%" },
  { key: "piE", label: { zh: "通胀预期 πᵉ", en: "Inflation expectation πᵉ" }, unit: "%" },
  { key: "i", label: { zh: "名义利率 i", en: "Nominal rate i" }, unit: "%" },
  { key: "u", label: { zh: "失业率 u", en: "Unemployment u" }, unit: "%" },
  { key: "A", label: { zh: "支持率 A", en: "Approval A" }, unit: "%" },
  { key: "b", label: { zh: "债务/GDP b", en: "Debt/GDP b" }, unit: "%" },
  { key: "R", label: { zh: "外汇储备 R", en: "FX reserves R" }, unit: { zh: "月", en: "months" } },
  { key: "s", label: { zh: "风险溢价 s", en: "Risk premium s" }, unit: "%" },
  { key: "BM", label: { zh: "黑市压力 BM", en: "Black market pressure BM" }, unit: "" }
];

const sparklineCharts = new Map();
let mainChart;
let currentLang = "zh";

const i18n = {
  zh: {
    dashboard: "总览 Dashboard",
    policies: "政策 Policies",
    factions: "派系/政治 Factions",
    principles: "经济原理/公式 Principles",
    history: "历史与报告 History",
    reset: "重开新局",
    tutorial: "新手教程",
    languageToggle: "English",
    turn: "季度",
    status: "政权状态",
    target: "通胀目标",
    credibility: "信誉锚定",
    taylor: "推荐泰勒利率",
    taylorGap: "偏离泰勒",
    dashboardDesc: "掌握核心 KPI 的季度变化和风险警报。",
    chartTitle: "宏观曲线总览",
    chartDesc: "可多选展示关键变量的路径。",
    policiesDesc: "设置本季度政策组合，影响下季度经济路径。",
    policyRate: "政策利率调整 Δi（年化，百分点）",
    fiscalImpulse: "财政立场 f（需求冲击）",
    primaryDeficit: "主赤字 d（年化 %GDP）",
    capitalControls: "资本管制强度（0-1）",
    bailout: "银行救助/重组（%GDP）",
    nextQuarter: "推进下一季度",
    autoRun: "自动模拟 8 季度",
    factionsDesc: "支持率来自多方权力集团的权衡。",
    principlesDesc: "模型采用简化的 DSGE/NK 结构，全部为季度动态。",
    formulasTitle: "核心方程（年化百分比）",
    winloseTitle: "胜负判定",
    winloseDesc: "在连续 4 个季度内维持 通胀 ≤ 8%、失业 ≤ 10%、外储 ≥ 4 月 即达成胜利；若通胀 > 60%、外储 < 0.5 月或支持率 < 20% 则失败。",
    historyDesc: "记录每季度政策与宏观结果。",
    table: { quarter: "季度", y: "y", pi: "π", pie: "πᵉ", i: "i", u: "u", a: "A", b: "b", r: "R(月)", s: "s", bm: "BM" },
    infoClose: "关闭",
    tutorialTitle: "新手教程 · 宏观危机应对",
    tutorialStart: "开始游戏",
    tutorialGoal: { label: "目标", text: "在 12 个季度内稳住通胀与就业，同时守住外汇储备与债务。" },
    tutorialWin: { label: "怎么赢", text: "连续 4 个季度通胀 ≤ 8%、失业 ≤ 10%、外储 ≥ 4 月。" },
    tutorialLose: { label: "怎么输", text: "通胀 > 60%、外储 < 0.5 月或支持率 < 20%。" },
    tutorialTip: { label: "建议打法", text: "先用利率和财政缩减锚定预期，逐步恢复增长；偏离泰勒规则会损害信誉。" },
    tutorialNote: "所有变量均为年化百分比（%）或 GDP 比例；每回合=1季度。",
    report: {
      line: (turn, pi, u, A, stance, risk) =>
        `Q${turn} 报告：通胀 ${pi}%，失业 ${u}%，支持率 ${A}%。${stance}，${risk}`,
      stanceDown: "经济仍在收缩",
      stanceUp: "经济开始恢复",
      riskHigh: "黑市压力偏高，外部约束严峻。",
      riskOk: "外部压力处于可控范围。"
    },
    policyNote: {
      high: "显著偏离泰勒，信誉惩罚增加。",
      ok: "偏离泰勒处于可控区间。"
    },
    factionsMood: { high: "支持", mid: "观望", low: "不满" },
    statusLabel: { win: "胜利", fail: "失败", run: "执政中" },
    chartError: "Chart.js 加载失败，请检查网络。"
  },
  en: {
    dashboard: "Dashboard",
    policies: "Policies",
    factions: "Factions",
    principles: "Principles",
    history: "History & Report",
    reset: "Restart",
    tutorial: "Tutorial",
    languageToggle: "中文",
    turn: "Quarter",
    status: "Status",
    target: "Inflation target",
    credibility: "Credibility anchor",
    taylor: "Taylor rate",
    taylorGap: "Taylor gap",
    dashboardDesc: "Track quarterly KPI moves and risk signals.",
    chartTitle: "Macro overview chart",
    chartDesc: "Toggle key variables to compare paths.",
    policiesDesc: "Set this quarter's policy mix and observe next quarter.",
    policyRate: "Policy rate Δi (annualized, pp)",
    fiscalImpulse: "Fiscal stance f (demand impulse)",
    primaryDeficit: "Primary deficit d (%GDP annualized)",
    capitalControls: "Capital controls (0-1)",
    bailout: "Bank bailout (%GDP)",
    nextQuarter: "Advance quarter",
    autoRun: "Auto-simulate 8 quarters",
    factionsDesc: "Approval reflects multiple power blocs.",
    principlesDesc: "Simplified DSGE/NK structure, quarterly dynamics.",
    formulasTitle: "Core equations (annualized)",
    winloseTitle: "Win/Lose conditions",
    winloseDesc: "Win if inflation ≤ 8%, unemployment ≤ 10%, reserves ≥ 4 months for 4 straight quarters. Lose if inflation > 60%, reserves < 0.5 month, or approval < 20%.",
    historyDesc: "Log each quarter's policy and macro outcomes.",
    table: { quarter: "Quarter", y: "y", pi: "π", pie: "πᵉ", i: "i", u: "u", a: "A", b: "b", r: "R (months)", s: "s", bm: "BM" },
    infoClose: "Close",
    tutorialTitle: "Tutorial · Crisis Response",
    tutorialStart: "Start game",
    tutorialGoal: { label: "Goal", text: "Stabilize inflation and jobs within 12 quarters while guarding reserves and debt." },
    tutorialWin: { label: "Win", text: "Inflation ≤ 8%, unemployment ≤ 10%, reserves ≥ 4 months for 4 quarters." },
    tutorialLose: { label: "Lose", text: "Inflation > 60%, reserves < 0.5 month, or approval < 20%." },
    tutorialTip: { label: "Tip", text: "Anchor expectations with rates and fiscal restraint first, then rebuild growth." },
    tutorialNote: "All values are annualized percentages or GDP ratios; one turn equals one quarter.",
    report: {
      line: (turn, pi, u, A, stance, risk) =>
        `Q${turn} report: inflation ${pi}%, unemployment ${u}%, approval ${A}%. ${stance}, ${risk}`,
      stanceDown: "The economy is still contracting",
      stanceUp: "The economy is recovering",
      riskHigh: "Black market pressure is elevated.",
      riskOk: "External pressure is manageable."
    },
    policyNote: {
      high: "Large Taylor deviation increases credibility penalties.",
      ok: "Taylor deviation remains manageable."
    },
    factionsMood: { high: "Supportive", mid: "Neutral", low: "Angry" },
    statusLabel: { win: "Win", fail: "Fail", run: "In office" },
    chartError: "Chart.js failed to load. Please check your network."
  }
};

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
      <div class="label">${item.label[currentLang]}</div>
      <div class="value" id="kpi-${item.key}">--</div>
      <canvas id="spark-${item.key}" height="40"></canvas>
    `;
    grid.appendChild(card);
  });
};

const updateKpis = () => {
  kpiConfig.forEach((item) => {
    const value = state[item.key];
    const unit = typeof item.unit === "string" ? item.unit : item.unit[currentLang];
    const formatted = unit === "月" || unit === "months" ? format(value, 2) : format(value, 2) + unit;
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
    const mood =
      score > 65
        ? i18n[currentLang].factionsMood.high
        : score > 45
          ? i18n[currentLang].factionsMood.mid
          : i18n[currentLang].factionsMood.low;
    const card = document.createElement("div");
    card.className = "faction-card";
    card.innerHTML = `
      <h4>${faction.name[currentLang]}</h4>
      <p>${faction.focus[currentLang]} · ${mood}（${format(score, 0)}）</p>
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
  const riskText =
    state.BM > 50 ? i18n[currentLang].report.riskHigh : i18n[currentLang].report.riskOk;
  const stance = state.y < 0 ? i18n[currentLang].report.stanceDown : i18n[currentLang].report.stanceUp;
  report.textContent = i18n[currentLang].report.line(
    state.turn,
    format(state.pi, 1),
    format(state.u, 1),
    format(state.A, 0),
    stance,
    riskText
  );
};

const updatePolicyReadout = () => {
  const policy = getPolicyInputs();
  const iTaylor = computeTaylor(state.pi, state.y);
  const deviation = state.i + policy.deltaI - iTaylor;
  const note = deviation > 1 ? i18n[currentLang].policyNote.high : i18n[currentLang].policyNote.ok;
  document.getElementById("policy-readout").innerHTML = `
    <div>${i18n[currentLang].taylor}=${format(iTaylor, 2)}%，i=${format(
      state.i,
      2
    )}%，Δ=${format(deviation, 2)}%</div>
    <div>${i18n[currentLang].primaryDeficit} ${format(
      policy.primaryDeficit,
      2
    )}% GDP，${i18n[currentLang].capitalControls} ${format(
      policy.controls,
      2
    )}，${i18n[currentLang].bailout} ${format(policy.bailout, 2)}% GDP。</div>
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
    label: item.label[currentLang],
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
  if (win) return { status: i18n[currentLang].statusLabel.win, message: "稳定目标达成" };
  if (state.pi > 60 || state.R < 0.5 || state.A < 20) {
    return { status: i18n[currentLang].statusLabel.fail, message: "宏观失控" };
  }
  return { status: i18n[currentLang].statusLabel.run, message: "继续改革" };
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
  if (mainChart) {
    updateMainChart();
  }
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
    title: { zh: "总览说明", en: "Dashboard" },
    content: {
      zh: "总览展示所有关键变量曲线。每张 KPI 卡片附带迷你曲线，反映近期趋势。曲线可通过右侧复选框自由组合。",
      en: "The dashboard shows all key series. Each KPI card includes a sparkline to highlight trends."
    }
  },
  policies: {
    title: { zh: "政策说明", en: "Policies" },
    content: {
      zh: "你可以调整利率、财政立场、赤字与资本管制。系统将按照宏观方程计算下一季度。偏离泰勒规则和高赤字会损害信誉。",
      en: "Adjust rates, fiscal stance, deficit, and controls. The engine computes next quarter outcomes."
    }
  },
  factions: {
    title: { zh: "派系说明", en: "Factions" },
    content: {
      zh: "不同派系关注就业、融资成本与通胀稳定。支持率是综合结果，但派系满意度过低会加剧政治压力。",
      en: "Factions care about jobs, financing costs, and inflation stability. Low support increases pressure."
    }
  },
  principles: {
    title: { zh: "公式说明", en: "Principles" },
    content: {
      zh: "模型基于 IS、菲利普斯曲线与信誉锚定机制。每回合是一个季度，利率与通胀使用年化百分比。",
      en: "The model combines IS, Phillips curve, and credibility anchoring. One turn equals one quarter."
    }
  },
  history: {
    title: { zh: "历史说明", en: "History" },
    content: {
      zh: "历史表记录每季度关键变量。报告区会自动生成一句政策总结，便于回顾走势与风险。",
      en: "History logs each quarter's metrics. The report summarizes the situation automatically."
    }
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
        title.textContent = info.title[currentLang];
        content.textContent = info.content[currentLang];
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

const destroyCharts = () => {
  sparklineCharts.forEach((chart) => chart.destroy());
  sparklineCharts.clear();
  if (mainChart) {
    mainChart.destroy();
    mainChart = null;
  }
};

const applyLanguage = (lang) => {
  currentLang = lang;
  const copy = i18n[currentLang];
  document.querySelector('.nav-btn[data-view="dashboard"]').textContent = copy.dashboard;
  document.querySelector('.nav-btn[data-view="policies"]').textContent = copy.policies;
  document.querySelector('.nav-btn[data-view="factions"]').textContent = copy.factions;
  document.querySelector('.nav-btn[data-view="principles"]').textContent = copy.principles;
  document.querySelector('.nav-btn[data-view="history"]').textContent = copy.history;
  document.getElementById("reset-game").textContent = copy.reset;
  document.getElementById("toggle-tutorial").textContent = copy.tutorial;
  document.getElementById("toggle-language").textContent = copy.languageToggle;
  document.getElementById("label-turn").textContent = copy.turn;
  document.getElementById("label-status").textContent = copy.status;
  document.getElementById("label-target").textContent = copy.target;
  document.getElementById("label-credibility").textContent = copy.credibility;
  document.getElementById("label-taylor").textContent = copy.taylor;
  document.getElementById("label-gap").textContent = copy.taylorGap;
  document.getElementById("title-dashboard").textContent = copy.dashboard;
  document.getElementById("desc-dashboard").textContent = copy.dashboardDesc;
  document.getElementById("title-main-chart").textContent = copy.chartTitle;
  document.getElementById("desc-main-chart").textContent = copy.chartDesc;
  document.getElementById("title-policies").textContent = copy.policies;
  document.getElementById("desc-policies").textContent = copy.policiesDesc;
  document.getElementById("label-policy-rate").textContent = copy.policyRate;
  document.getElementById("label-fiscal-impulse").textContent = copy.fiscalImpulse;
  document.getElementById("label-primary-deficit").textContent = copy.primaryDeficit;
  document.getElementById("label-capital-controls").textContent = copy.capitalControls;
  document.getElementById("label-bailout").textContent = copy.bailout;
  document.getElementById("next-quarter").textContent = copy.nextQuarter;
  document.getElementById("auto-run").textContent = copy.autoRun;
  document.getElementById("title-factions").textContent = copy.factions;
  document.getElementById("desc-factions").textContent = copy.factionsDesc;
  document.getElementById("title-principles").textContent = copy.principles;
  document.getElementById("desc-principles").textContent = copy.principlesDesc;
  document.getElementById("title-formulas").textContent = copy.formulasTitle;
  document.getElementById("title-winlose").textContent = copy.winloseTitle;
  document.getElementById("desc-winlose").textContent = copy.winloseDesc;
  document.getElementById("title-history").textContent = copy.history;
  document.getElementById("desc-history").textContent = copy.historyDesc;
  document.getElementById("col-quarter").textContent = copy.table.quarter;
  document.getElementById("col-y").textContent = copy.table.y;
  document.getElementById("col-pi").textContent = copy.table.pi;
  document.getElementById("col-pie").textContent = copy.table.pie;
  document.getElementById("col-i").textContent = copy.table.i;
  document.getElementById("col-u").textContent = copy.table.u;
  document.getElementById("col-a").textContent = copy.table.a;
  document.getElementById("col-b").textContent = copy.table.b;
  document.getElementById("col-r").textContent = copy.table.r;
  document.getElementById("col-s").textContent = copy.table.s;
  document.getElementById("col-bm").textContent = copy.table.bm;
  document.getElementById("close-info").textContent = copy.infoClose;
  document.getElementById("tutorial-title").textContent = copy.tutorialTitle;
  document.getElementById("close-tutorial").textContent = copy.tutorialStart;
  document.getElementById("tutorial-goal").innerHTML = `<strong>${copy.tutorialGoal.label}：</strong>${copy.tutorialGoal.text}`;
  document.getElementById("tutorial-win").innerHTML = `<strong>${copy.tutorialWin.label}：</strong>${copy.tutorialWin.text}`;
  document.getElementById("tutorial-lose").innerHTML = `<strong>${copy.tutorialLose.label}：</strong>${copy.tutorialLose.text}`;
  document.getElementById("tutorial-tip").innerHTML = `<strong>${copy.tutorialTip.label}：</strong>${copy.tutorialTip.text}`;
  document.getElementById("tutorial-note").textContent = copy.tutorialNote;
  initScenario();
  if (window.Chart) {
    destroyCharts();
    initCharts();
  }
  updateView();
};

const waitForChart = (timeout = 2000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (window.Chart) {
        resolve();
        return;
      }
      if (Date.now() - start > timeout) {
        reject(new Error("Chart.js not loaded"));
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });

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
    if (checkGameStatus().status !== i18n[currentLang].statusLabel.run) return;
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
  document.getElementById("scenario-title").textContent = scenario.title[currentLang];
  document.getElementById("scenario-desc").textContent = scenario.description[currentLang];
};

const init = async () => {
  initScenario();
  initHistory();
  updateSliderLabels();
  initNavigation();
  initInfoButtons();
  initTutorial();
  bindPolicyInputs();

  try {
    await waitForChart();
    initCharts();
  } catch (error) {
    document.getElementById("policy-readout").textContent = i18n[currentLang].chartError;
  }

  applyLanguage(currentLang);

  document.getElementById("next-quarter").addEventListener("click", () => {
    if (checkGameStatus().status !== i18n[currentLang].statusLabel.run) return;
    applyTurn();
    updateView();
  });

  document.getElementById("auto-run").addEventListener("click", () => startSimulation(8));
  document.getElementById("reset-game").addEventListener("click", resetGame);
  document.getElementById("toggle-language").addEventListener("click", () => {
    applyLanguage(currentLang === "zh" ? "en" : "zh");
  });
};

init();
