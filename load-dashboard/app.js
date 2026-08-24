const { events, meta, availability = [], sessions = [] } = window.LOAD_APP_DATA;

const metrics = {
  totalDistance: { label: "Total Distance", unit: "m", decimals: 0 },
  highIntensityMeters: { label: "Alta intensidade", unit: "m", decimals: 1 },
  fmpHighMin: { label: "FMP High Dynamic", unit: "min", decimals: 1 },
  sprintMeters: { label: "Sprint VB6+VB7", unit: "m", decimals: 1 },
  accelerationLoad: { label: "Acceleration Load", unit: "AU", decimals: 1 },
  explosiveActions: { label: "Acoes explosivas", unit: "act", decimals: 1 },
  rhieBouts: { label: "RHIE Total Bouts", unit: "bouts", decimals: 1 },
  fmpRunningHighMin: { label: "FMP Running High", unit: "min", decimals: 1 },
  allVariablesVolumePct: { label: "Media percentual de volume", unit: "%", decimals: 1, derived: true },
  allVariablesDensityPct: { label: "Media percentual de densidade", unit: "%", decimals: 1, derived: true },
  allVariablesResultPct: { label: "Carga resultante media", unit: "%", decimals: 1, derived: true },
};
const rankingMetrics = {
  ...metrics,
  accelerationsB23: { label: "Aceleracoes B2-3", unit: "act", decimals: 1 },
  decelerationsB23: { label: "Desaceleracoes B2-3", unit: "act", decimals: 1 },
  maxVelocity: { label: "Velocidade maxima", unit: "km/h", decimals: 1 },
};

const radarMetrics = [
  "totalDistance",
  "highIntensityMeters",
  "fmpHighMin",
  "sprintMeters",
  "explosiveActions",
  "rhieBouts",
  "fmpRunningHighMin",
];
const rankingMetricShortLabels = {
  totalDistance: "Total",
  highIntensityMeters: "Alta int.",
  fmpHighMin: "FMP High",
  sprintMeters: "Sprint",
  accelerationLoad: "Accel. Load",
  explosiveActions: "Expl.",
  rhieBouts: "RHIE",
  fmpRunningHighMin: "Run High",
  accelerationsB23: "Acel.",
  decelerationsB23: "Desacel.",
  maxVelocity: "V. max",
};
const rankingMetricKeys = [
  ...radarMetrics,
  "accelerationLoad",
  "accelerationsB23",
  "decelerationsB23",
  "maxVelocity",
];
const gameSplitMetrics = [
  { key: "totalDistance", label: "Dist. total", unit: "m", decimals: 0 },
  { key: "highIntensityMeters", label: "Alta int.", unit: "m", decimals: 0 },
  { key: "accelerationsB23", label: "Aceleracoes", unit: "act", decimals: 0 },
  { key: "decelerationsB23", label: "Desaceleracoes", unit: "act", decimals: 0 },
  { key: "sprintMeters", label: ">25 km/h", unit: "m", decimals: 0 },
  { key: "vmaxPct", label: "% V.max", unit: "%", decimals: 0 },
];
const reportViews = [
  { id: "longitudinal", label: "Longitudinal", selector: "#longitudinalView", defaultQuadrant: "Quadrante de evolucao longitudinal" },
  { id: "gameSplit", label: "Jogo por tempo", selector: "#gameSplitView", defaultQuadrant: "Quadrante do resumo por tempos do jogo" },
  { id: "clusters", label: "Grupos fisicos", selector: "#clustersView", defaultQuadrant: "Quadrante de grupos fisicos" },
  { id: "ranking", label: "Ranking percentil", selector: "#rankingView", defaultQuadrant: "Quadrante de todas as variaveis ranqueadas" },
  { id: "correlation", label: "Correlacao", selector: "#correlationView", defaultQuadrant: "Quadrante das relacoes entre variaveis" },
  { id: "demand", label: "Indice de exigencia", selector: "#demandView", defaultQuadrant: "Quadrante da demanda fisica do jogo" },
  { id: "external", label: "Atleta externo", selector: "#externalView", defaultQuadrant: "Quadrante da comparacao com mercado externo" },
  { id: "availability", label: "Disponibilidade", selector: "#availabilityView", defaultQuadrant: "Quadrante da disponibilidade e grupos diarios" },
  { id: "alerts", label: "Alertas", selector: "#alertsView", defaultQuadrant: "Quadrante dos desvios padrao" },
  { id: "written", label: "Material escrito", selector: "#writtenView", defaultQuadrant: "Quadrante metodologico do dashboard" },
];
const correlationMetrics = [
  { key: "minutes", label: "Minutos", unit: "min", decimals: 1 },
  ...Object.entries(metrics).map(([key, metric]) => ({ key, label: metric.label, unit: metric.unit, decimals: metric.decimals })),
];
const externalComparisonMetrics = [
  { key: "totalDistance", label: "Distancia total", sourceKey: "totalDistanceMeters", unit: "m", decimals: 0 },
  { key: "highIntensityMeters", label: "Alta intensidade", sourceKey: "highIntensityMeters", unit: "m", decimals: 1 },
  { key: "accelerationsB23", label: "Aceleracoes", sourceKey: "accelerationsB23", unit: "act", decimals: 1 },
  { key: "decelerationsB23", label: "Desaceleracoes", sourceKey: "decelerationsB23", unit: "act", decimals: 1 },
];
const demandWeights = {
  highIntensityMeters: 0.28,
  explosiveActions: 0.25,
  sprintMeters: 0.20,
  rhieBouts: 0.18,
  totalDistance: 0.03,
  fmpHighMin: 0.03,
  fmpRunningHighMin: 0.03,
};
const demandMetricOrder = Object.keys(demandWeights);
const ewmaWindows = {
  EWMA_4: 4,
  EWMA_7: 7,
  EWMA_28: 28,
};
const clusterColors = ["#0b3f8a", "#d71920", "#7b2cbf", "#0f766e", "#f59e0b"];
const compareColors = ["#d71920", "#0f766e", "#7b2cbf", "#f59e0b", "#475569", "#155fc0"];
let externalCandidateRows = [];
const localUpdateHosts = new Set(["127.0.0.1", "localhost"]);
const metricReferenceCache = new Map();

events.forEach((event) => {
  event.athleteId = String(event.athleteId);
  if (!Number.isFinite(Number(event.accelerationsB23))) event.accelerationsB23 = 0;
  if (!Number.isFinite(Number(event.decelerationsB23))) event.decelerationsB23 = 0;
  if (!Number.isFinite(Number(event.maxVelocity))) event.maxVelocity = 0;
  if (!Number.isFinite(Number(event.explosiveActions))) event.explosiveActions = Number(event.accelEfforts) || 0;
  if (!Number.isFinite(Number(event.rhieBouts))) event.rhieBouts = 0;
  if (!Number.isFinite(Number(event.fmpRunningHighMin))) event.fmpRunningHighMin = 0;
});
sessions.forEach((session) => {
  session.athleteId = String(session.athleteId);
  if (!Number.isFinite(Number(session.accelerationsB23))) session.accelerationsB23 = 0;
  if (!Number.isFinite(Number(session.decelerationsB23))) session.decelerationsB23 = 0;
  if (!Number.isFinite(Number(session.maxVelocity))) session.maxVelocity = 0;
  if (!Number.isFinite(Number(session.explosiveActions))) session.explosiveActions = Number(session.accelEfforts) || 0;
  if (!Number.isFinite(Number(session.rhieBouts))) session.rhieBouts = 0;
  if (!Number.isFinite(Number(session.fmpRunningHighMin))) session.fmpRunningHighMin = 0;
});
availability.forEach((item) => {
  item.athleteId = String(item.athleteId);
});

const state = {
  athleteId: null,
  compareAthleteIds: [],
  metric: "totalDistance",
  loadMode: "volume",
  rollingWindow: 5,
  minMinutes: meta.defaultMinMinutes || 85,
  completeOnly: true,
  activeOnly: false,
  view: "longitudinal",
  clusterCount: 3,
  clusterMinGames: 3,
  rankingScope: "team",
  rankingPosition: "all",
  rankingSort: "averagePercentile",
  rankingMinGames: 3,
  rankingLimit: "10",
  rankingVisibleMetrics: [...radarMetrics],
  reportTitle: "Relatorio personalizado - Controle de Carga",
  reportSelectedViews: ["ranking"],
  reportQuadrants: Object.fromEntries(reportViews.map((view) => [view.id, view.defaultQuadrant])),
  availabilityStart: null,
  availabilityEnd: null,
  availabilityMetric: "totalDistance",
  alertThreshold: 2,
  alertDate: null,
  demandDate: null,
  gameSplitDate: null,
};

const els = {
  athleteSelect: document.querySelector("#athleteSelect"),
  activeOnlyToggle: document.querySelector("#activeOnlyToggle"),
  metricSelect: document.querySelector("#metricSelect"),
  loadModeControl: document.querySelector("#loadModeControl"),
  windowControl: document.querySelector("#windowControl"),
  minutesInput: document.querySelector("#minutesInput"),
  completeToggle: document.querySelector("#completeToggle"),
  contextLabel: document.querySelector("#contextLabel"),
  athleteTitle: document.querySelector("#athleteTitle"),
  athletePhoto: document.querySelector("#athletePhoto"),
  athleteAvatarFallback: document.querySelector("#athleteAvatarFallback"),
  gamesKpi: document.querySelector("#gamesKpi"),
  athleteAvgKpi: document.querySelector("#athleteAvgKpi"),
  positionAvgKpi: document.querySelector("#positionAvgKpi"),
  diffKpi: document.querySelector("#diffKpi"),
  alertBoard: document.querySelector("#alertBoard"),
  alertNote: document.querySelector("#alertNote"),
  alertThresholdSelect: document.querySelector("#alertThresholdSelect"),
  alertDateInput: document.querySelector("#alertDateInput"),
  chartTitle: document.querySelector("#chartTitle"),
  chartSubtitle: document.querySelector("#chartSubtitle"),
  chart: document.querySelector("#chart"),
  loadResultTitle: document.querySelector("#loadResultTitle"),
  loadResultSubtitle: document.querySelector("#loadResultSubtitle"),
  loadResultChart: document.querySelector("#loadResultChart"),
  compareAthletesSelect: document.querySelector("#compareAthletesSelect"),
  compareChips: document.querySelector("#compareChips"),
  clearCompareButton: document.querySelector("#clearCompareButton"),
  radarChart: document.querySelector("#radarChart"),
  radarNote: document.querySelector("#radarNote"),
  positionBars: document.querySelector("#positionBars"),
  referenceNote: document.querySelector("#referenceNote"),
  eventsTable: document.querySelector("#eventsTable"),
  tableCount: document.querySelector("#tableCount"),
  metricHeader: document.querySelector("#metricHeader"),
  reportButton: document.querySelector("#reportButton"),
  reportBuilder: document.querySelector("#reportBuilder"),
  reportTitleInput: document.querySelector("#reportTitleInput"),
  reportOptions: document.querySelector("#reportOptions"),
  reportCloseButton: document.querySelector("#reportCloseButton"),
  reportGenerateButton: document.querySelector("#reportGenerateButton"),
  refreshButton: document.querySelector("#refreshButton"),
  downloadButton: document.querySelector("#downloadButton"),
  viewTabs: document.querySelector(".view-tabs"),
  longitudinalView: document.querySelector("#longitudinalView"),
  gameSplitView: document.querySelector("#gameSplitView"),
  gameSplitDateSelect: document.querySelector("#gameSplitDateSelect"),
  gameSplitNote: document.querySelector("#gameSplitNote"),
  gameSplitGamesKpi: document.querySelector("#gameSplitGamesKpi"),
  gameSplitDateKpi: document.querySelector("#gameSplitDateKpi"),
  gameSplitMinutesKpi: document.querySelector("#gameSplitMinutesKpi"),
  gameSplitPeakVmaxKpi: document.querySelector("#gameSplitPeakVmaxKpi"),
  gameSplitTable: document.querySelector("#gameSplitTable"),
  gameSplitTableCount: document.querySelector("#gameSplitTableCount"),
  gameSplitSummary: document.querySelector("#gameSplitSummary"),
  gameSplitSummaryNote: document.querySelector("#gameSplitSummaryNote"),
  gameSplitPlayersCount: document.querySelector("#gameSplitPlayersCount"),
  gameSplitPlayersTable: document.querySelector("#gameSplitPlayersTable"),
  clustersView: document.querySelector("#clustersView"),
  clusterCountSelect: document.querySelector("#clusterCountSelect"),
  clusterMinGamesInput: document.querySelector("#clusterMinGamesInput"),
  clusterScatter: document.querySelector("#clusterScatter"),
  clusterMapNote: document.querySelector("#clusterMapNote"),
  clusterModeNote: document.querySelector("#clusterModeNote"),
  clusterCards: document.querySelector("#clusterCards"),
  clusterSummaryNote: document.querySelector("#clusterSummaryNote"),
  clusterTable: document.querySelector("#clusterTable"),
  clusterTableCount: document.querySelector("#clusterTableCount"),
  rankingView: document.querySelector("#rankingView"),
  rankingScopeSelect: document.querySelector("#rankingScopeSelect"),
  rankingPositionSelect: document.querySelector("#rankingPositionSelect"),
  rankingSortSelect: document.querySelector("#rankingSortSelect"),
  rankingMinGamesInput: document.querySelector("#rankingMinGamesInput"),
  rankingLimitSelect: document.querySelector("#rankingLimitSelect"),
  rankingMetricToggle: document.querySelector("#rankingMetricToggle"),
  rankingMetricMenu: document.querySelector("#rankingMetricMenu"),
  rankingHeatmap: document.querySelector("#rankingHeatmap"),
  rankingHeatmapNote: document.querySelector("#rankingHeatmapNote"),
  rankingAthletesKpi: document.querySelector("#rankingAthletesKpi"),
  rankingScopeKpi: document.querySelector("#rankingScopeKpi"),
  rankingMetricKpi: document.querySelector("#rankingMetricKpi"),
  rankingTableHead: document.querySelector("#rankingTableHead"),
  rankingTable: document.querySelector("#rankingTable"),
  rankingTableCount: document.querySelector("#rankingTableCount"),
  correlationView: document.querySelector("#correlationView"),
  correlationNote: document.querySelector("#correlationNote"),
  correlationGamesKpi: document.querySelector("#correlationGamesKpi"),
  correlationVariablesKpi: document.querySelector("#correlationVariablesKpi"),
  correlationPositiveKpi: document.querySelector("#correlationPositiveKpi"),
  correlationNegativeKpi: document.querySelector("#correlationNegativeKpi"),
  correlationMatrix: document.querySelector("#correlationMatrix"),
  correlationPairsCount: document.querySelector("#correlationPairsCount"),
  correlationPairsTable: document.querySelector("#correlationPairsTable"),
  demandView: document.querySelector("#demandView"),
  demandFormulaNote: document.querySelector("#demandFormulaNote"),
  demandDateInput: document.querySelector("#demandDateInput"),
  demandNote: document.querySelector("#demandNote"),
  demandScoreKpi: document.querySelector("#demandScoreKpi"),
  demandBandKpi: document.querySelector("#demandBandKpi"),
  demandGameLoadKpi: document.querySelector("#demandGameLoadKpi"),
  demandRecentLoadKpi: document.querySelector("#demandRecentLoadKpi"),
  demandGauge: document.querySelector("#demandGauge"),
  demandGaugeNote: document.querySelector("#demandGaugeNote"),
  demandBreakdown: document.querySelector("#demandBreakdown"),
  demandBreakdownNote: document.querySelector("#demandBreakdownNote"),
  demandTimeline: document.querySelector("#demandTimeline"),
  demandTimelineNote: document.querySelector("#demandTimelineNote"),
  demandTable: document.querySelector("#demandTable"),
  demandTableCount: document.querySelector("#demandTableCount"),
  externalView: document.querySelector("#externalView"),
  externalFileInput: document.querySelector("#externalFileInput"),
  externalTemplateLink: document.querySelector("#externalTemplateLink"),
  externalMethodNote: document.querySelector("#externalMethodNote"),
  externalNote: document.querySelector("#externalNote"),
  externalGamesKpi: document.querySelector("#externalGamesKpi"),
  externalPositionKpi: document.querySelector("#externalPositionKpi"),
  externalTeamPctKpi: document.querySelector("#externalTeamPctKpi"),
  externalPositionPctKpi: document.querySelector("#externalPositionPctKpi"),
  externalProfileNote: document.querySelector("#externalProfileNote"),
  externalProfileTable: document.querySelector("#externalProfileTable"),
  externalSummaryNote: document.querySelector("#externalSummaryNote"),
  externalSummaryBars: document.querySelector("#externalSummaryBars"),
  externalReferenceCount: document.querySelector("#externalReferenceCount"),
  externalReferenceTable: document.querySelector("#externalReferenceTable"),
  availabilityView: document.querySelector("#availabilityView"),
  availabilityStartInput: document.querySelector("#availabilityStartInput"),
  availabilityEndInput: document.querySelector("#availabilityEndInput"),
  availabilityMetricSelect: document.querySelector("#availabilityMetricSelect"),
  availabilityDaysKpi: document.querySelector("#availabilityDaysKpi"),
  availabilityRateKpi: document.querySelector("#availabilityRateKpi"),
  availabilityDmKpi: document.querySelector("#availabilityDmKpi"),
  availabilityAthletesKpi: document.querySelector("#availabilityAthletesKpi"),
  availabilityChart: document.querySelector("#availabilityChart"),
  availabilityChartNote: document.querySelector("#availabilityChartNote"),
  availabilityMetricBars: document.querySelector("#availabilityMetricBars"),
  availabilityMetricNote: document.querySelector("#availabilityMetricNote"),
  availabilityDailyGroupTable: document.querySelector("#availabilityDailyGroupTable"),
  availabilityGroupBars: document.querySelector("#availabilityGroupBars"),
  availabilityGroupNote: document.querySelector("#availabilityGroupNote"),
  availabilityTable: document.querySelector("#availabilityTable"),
  availabilityTableCount: document.querySelector("#availabilityTableCount"),
  availabilityMetricTable: document.querySelector("#availabilityMetricTable"),
  availabilityMetricTableCount: document.querySelector("#availabilityMetricTableCount"),
  alertsView: document.querySelector("#alertsView"),
  writtenView: document.querySelector("#writtenView"),
};

const athletes = Array.from(
  new Map(events.map((event) => [event.athleteId, event])).values()
).sort((a, b) => a.athlete.localeCompare(b.athlete, "pt-BR"));

function isActiveStatus(status) {
  return String(status || "").trim().toUpperCase() === "ATIVO";
}

function passesActiveFilter(item) {
  return !state.activeOnly || isActiveStatus(item?.status);
}

function filteredAthletes() {
  return athletes.filter(passesActiveFilter);
}

function init() {
  state.athleteId = pickInitialAthlete();
  setInitialAvailabilityRange();
  setInitialAlertDate();
  setInitialDemandDate();
  setInitialGameSplitDate();
  fillControls();
  bindControls();
  render();
}

function pickInitialAthlete() {
  const pool = filteredAthletes();
  const activeWithGames = pool.find((athlete) =>
    events.some((event) => event.athleteId === athlete.athleteId && event.minutes > 85 && event.completeHalves)
  );
  return activeWithGames?.athleteId || pool[0]?.athleteId;
}

function setInitialAvailabilityRange() {
  if (!availability.length) return;
  const dates = availability.map((item) => item.date).sort();
  state.availabilityEnd = dates[dates.length - 1];
  const end = new Date(`${state.availabilityEnd}T00:00:00`);
  end.setDate(end.getDate() - 30);
  const fallbackStart = end.toISOString().slice(0, 10);
  state.availabilityStart = dates.find((date) => date >= fallbackStart) || dates[0];
}

function setInitialAlertDate() {
  const dates = events.filter(baseFilter).map((event) => event.date).sort();
  state.alertDate = dates[dates.length - 1] || meta.eventEnd || null;
}

function setInitialDemandDate() {
  const dates = events.filter(baseFilter).map((event) => event.date).sort();
  state.demandDate = dates[dates.length - 1] || meta.eventEnd || null;
}

function setInitialGameSplitDate() {
  const dates = events.filter(baseFilter).map((event) => event.date).sort();
  state.gameSplitDate = dates[dates.length - 1] || null;
}

function visibleRankingMetrics() {
  const visible = state.rankingVisibleMetrics.filter((key) => rankingMetricKeys.includes(key));
  return visible.length ? visible : [...radarMetrics];
}

function syncRankingMetricState() {
  const visible = visibleRankingMetrics();
  state.rankingVisibleMetrics = visible;
  if (state.rankingSort !== "averagePercentile" && !visible.includes(state.rankingSort)) {
    state.rankingSort = "averagePercentile";
  }
  return visible;
}

function renderRankingMetricControls() {
  const visible = syncRankingMetricState();
  const rankingOptions = [["averagePercentile", "Media dos percentis"], ...visible.map((key) => [key, rankingMetrics[key].label])];
  els.rankingSortSelect.innerHTML = rankingOptions.map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
  els.rankingSortSelect.value = state.rankingSort;
  els.rankingMetricToggle.textContent = `${visible.length} ${visible.length === 1 ? "variavel" : "variaveis"}`;
  els.rankingMetricMenu.innerHTML = rankingMetricKeys.map((key) => `
    <label class="metric-picker-option">
      <input type="checkbox" value="${key}" ${visible.includes(key) ? "checked" : ""}>
      <span>${rankingMetrics[key].label}</span>
    </label>
  `).join("");
}

function renderReportBuilder() {
  els.reportTitleInput.value = state.reportTitle;
  els.reportOptions.innerHTML = reportViews.map((view) => `
    <article class="report-option-card">
      <label class="toggle report-toggle">
        <input type="checkbox" data-report-view="${view.id}" ${state.reportSelectedViews.includes(view.id) ? "checked" : ""}>
        <span>${view.label}</span>
      </label>
      <label class="field report-quadrant-field">
        <span>Quadrante</span>
        <input type="text" data-report-quadrant="${view.id}" value="${escapeHtml(state.reportQuadrants[view.id] || view.defaultQuadrant)}">
      </label>
    </article>
  `).join("");
}

function fillControls() {
  const selectableAthletes = filteredAthletes();
  if (!selectableAthletes.some((athlete) => athlete.athleteId === state.athleteId)) {
    state.athleteId = pickInitialAthlete();
  }
  state.compareAthleteIds = state.compareAthleteIds.filter((id) =>
    selectableAthletes.some((athlete) => athlete.athleteId === id && athlete.athleteId !== state.athleteId)
  );
  els.athleteSelect.innerHTML = selectableAthletes
    .map((athlete) => `<option value="${athlete.athleteId}">${athlete.athlete} - ${athlete.position}</option>`)
    .join("");
  els.athleteSelect.value = String(state.athleteId);
  els.activeOnlyToggle.checked = state.activeOnly;

  els.metricSelect.innerHTML = Object.entries(metrics)
    .map(([key, metric]) => `<option value="${key}">${metric.label}</option>`)
    .join("");
  els.metricSelect.value = state.metric;
  fillCompareControl();
  renderRankingMetricControls();
  const positions = Array.from(new Set(selectableAthletes.map((athlete) => athlete.position).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  if (state.rankingPosition !== "all" && !positions.includes(state.rankingPosition)) {
    state.rankingPosition = "all";
  }
  els.rankingPositionSelect.innerHTML = `<option value="all">Todas</option>${positions.map((position) => `<option value="${position}">${position}</option>`).join("")}`;
  els.rankingPositionSelect.value = state.rankingPosition;
  els.rankingLimitSelect.value = state.rankingLimit;
  els.availabilityMetricSelect.innerHTML = Object.entries(metrics)
    .map(([key, metric]) => `<option value="${key}">${metric.label}</option>`)
    .join("");
  els.availabilityMetricSelect.value = state.availabilityMetric;
  if (els.availabilityStartInput) els.availabilityStartInput.value = state.availabilityStart || "";
  if (els.availabilityEndInput) els.availabilityEndInput.value = state.availabilityEnd || "";
  els.alertThresholdSelect.value = String(state.alertThreshold);
  els.alertDateInput.value = state.alertDate || "";
  const alertDates = events.filter(baseFilter).map((event) => event.date).sort();
  if (alertDates.length) {
    els.alertDateInput.min = alertDates[0];
    els.alertDateInput.max = alertDates[alertDates.length - 1];
  }
  const demandDates = alertDates;
  if (demandDates.length) {
    if (!state.demandDate || !demandDates.includes(state.demandDate)) {
      state.demandDate = demandDates[demandDates.length - 1];
    }
    els.demandDateInput.min = demandDates[0];
    els.demandDateInput.max = demandDates[demandDates.length - 1];
    els.demandDateInput.value = state.demandDate;
  } else if (els.demandDateInput) {
    els.demandDateInput.value = "";
  }
  const gameSplitDates = syncGameSplitDate();
  els.gameSplitDateSelect.innerHTML = gameSplitDates.length
    ? gameSplitDates
      .slice()
      .reverse()
      .map((date) => `<option value="${date}">${dateLabel(date)}</option>`)
      .join("")
    : `<option value="">Sem jogos</option>`;
  els.gameSplitDateSelect.value = state.gameSplitDate || "";

  els.minutesInput.value = String(state.minMinutes);
  els.completeToggle.checked = state.completeOnly;
  renderReportBuilder();
}

function fillCompareControl() {
  els.compareAthletesSelect.innerHTML = filteredAthletes()
    .filter((athlete) => athlete.athleteId !== state.athleteId)
    .map((athlete) => `<option value="${athlete.athleteId}" ${state.compareAthleteIds.includes(athlete.athleteId) ? "selected" : ""}>${athlete.athlete} - ${athlete.position}</option>`)
    .join("");
}

function renderCompareChips() {
  const selected = state.compareAthleteIds
    .map((id) => athletes.find((athlete) => athlete.athleteId === id))
    .filter(Boolean);
  if (!selected.length) {
    els.compareChips.innerHTML = `<span class="muted-chip">Nenhum atleta adicional selecionado</span>`;
    return;
  }
  els.compareChips.innerHTML = selected.map((athlete, index) => `
    <span class="compare-chip" style="--chip-color:${compareColors[index % compareColors.length]}">
      ${escapeHtml(athlete.athlete)}
    </span>
  `).join("");
}

function buildAthleteAlerts(athlete) {
  if (!athlete) return [];
  const items = events
    .filter((event) => event.athleteId === athlete.athleteId && baseFilter(event) && (!state.alertDate || event.date <= state.alertDate))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (items.length < 4) return [];
  const latest = items[items.length - 1];
  const history = items.slice(0, -1);
  return radarMetrics
    .map((metricKey) => {
      const mean = avg(history, (event) => metricValue(event, metricKey, state.loadMode));
      const sd = stdDev(history, (event) => metricValue(event, metricKey, state.loadMode));
      if (!sd) return null;
      const current = metricValue(latest, metricKey, state.loadMode);
      const zScore = (current - mean) / sd;
      if (Math.abs(zScore) < state.alertThreshold) return null;
      return {
        athlete,
        metricKey,
        type: zScore > 0 ? "increase" : "drop",
        zScore,
        current,
        mean,
        date: latest.date,
        games: history.length,
      };
    })
    .filter(Boolean);
}

function alertPlayerCard(alert) {
  const athlete = alert.athlete;
  const photo = athlete?.photoUrl || "";
  const image = photo ? `<img src="${escapeHtml(photo)}" alt="" loading="lazy" onerror="this.remove();">` : "";
  const label = `${alert.zScore > 0 ? "+" : ""}${alert.zScore.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`;
  return `
    <article class="alert-player-card ${alert.type}" title="${escapeHtml(formatMetric(alert.current, alert.metricKey, state.loadMode))} | media ${escapeHtml(formatMetric(alert.mean, alert.metricKey, state.loadMode))}">
      <span class="alert-badge">${label}</span>
      <div class="alert-player-photo">${image}<b>${escapeHtml(initials(athlete?.athlete))}</b></div>
      <strong>${escapeHtml(athlete?.athlete || "Atleta")}</strong>
      <span>${escapeHtml(dateLabel(alert.date))}</span>
    </article>`;
}

function renderAlerts() {
  const alerts = filteredAthletes()
    .flatMap(buildAthleteAlerts)
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  els.alertNote.textContent = `${alerts.length} alerta(s) | ${state.alertThreshold} DP | ${state.alertDate ? dateLabel(state.alertDate) : "sem data"}`;
  if (!alerts.length) {
    els.alertBoard.innerHTML = `<div class="empty">Nenhum atleta apresentou variavel acima de +${state.alertThreshold} DP ou abaixo de -${state.alertThreshold} DP ate a data selecionada.</div>`;
    return;
  }
  const groups = radarMetrics
    .map((metricKey) => ({
      metricKey,
      alerts: alerts.filter((alert) => alert.metricKey === metricKey),
    }))
    .filter((group) => group.alerts.length);
  els.alertBoard.innerHTML = groups.map((group) => {
    const increases = group.alerts.filter((alert) => alert.type === "increase");
    const drops = group.alerts.filter((alert) => alert.type === "drop");
    const section = (title, type, rows) => `
      <div class="alert-stack ${type}">
        <div class="alert-stack-head">
          <h4>${title}</h4>
          <span>${rows.length}</span>
        </div>
        <div class="alert-card-grid">
          ${rows.length ? rows.map(alertPlayerCard).join("") : `<div class="empty small">Sem ocorrencias.</div>`}
        </div>
      </div>`;
    return `
      <section class="alert-metric-section">
        <div class="alert-metric-head">
          <h3>${escapeHtml(metricLabel(group.metricKey, state.loadMode))}</h3>
          <span>${group.alerts.length} alerta(s)</span>
        </div>
        <div class="alert-metric-columns">
          ${section(`+${state.alertThreshold} DP`, "increase", increases)}
          ${section(`-${state.alertThreshold} DP`, "drop", drops)}
        </div>
      </section>`;
  }).join("");
}

function bindControls() {
  els.athleteSelect.addEventListener("change", () => {
    state.athleteId = els.athleteSelect.value;
    state.compareAthleteIds = state.compareAthleteIds.filter((id) => id !== state.athleteId);
    fillCompareControl();
    render();
  });
  els.activeOnlyToggle.addEventListener("change", () => {
    state.activeOnly = els.activeOnlyToggle.checked;
    fillControls();
    render();
  });
  els.metricSelect.addEventListener("change", () => {
    state.metric = els.metricSelect.value;
    render();
  });
  els.loadModeControl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mode]");
    if (!button) return;
    state.loadMode = button.dataset.mode;
    els.loadModeControl.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
  els.windowControl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-window]");
    if (!button) return;
    state.rollingWindow = Number(button.dataset.window);
    els.windowControl.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
  els.minutesInput.addEventListener("input", () => {
    state.minMinutes = Number(els.minutesInput.value || 0);
    render();
  });
  els.completeToggle.addEventListener("change", () => {
    state.completeOnly = els.completeToggle.checked;
    render();
  });
  els.compareAthletesSelect.addEventListener("change", () => {
    state.compareAthleteIds = Array.from(els.compareAthletesSelect.selectedOptions)
      .map((option) => option.value)
      .filter((id) => id !== state.athleteId);
    render();
  });
  els.clearCompareButton.addEventListener("click", () => {
    state.compareAthleteIds = [];
    fillCompareControl();
    render();
  });
  els.viewTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (!button) return;
    state.view = button.dataset.view;
    render();
  });
  els.gameSplitDateSelect.addEventListener("change", () => {
    state.gameSplitDate = els.gameSplitDateSelect.value || null;
    render();
  });
  els.reportButton.addEventListener("click", () => {
    generateCustomReport();
  });
  els.reportCloseButton.addEventListener("click", () => {
    els.reportBuilder.hidden = true;
  });
  els.reportTitleInput.addEventListener("input", () => {
    state.reportTitle = els.reportTitleInput.value || "Relatorio personalizado - Controle de Carga";
  });
  els.reportOptions.addEventListener("change", (event) => {
    const viewToggle = event.target.closest("[data-report-view]");
    if (viewToggle) {
      const selected = Array.from(els.reportOptions.querySelectorAll("[data-report-view]:checked")).map((input) => input.getAttribute("data-report-view"));
      state.reportSelectedViews = selected.length ? selected : ["ranking"];
      renderReportBuilder();
      return;
    }
    const quadrantInput = event.target.closest("[data-report-quadrant]");
    if (quadrantInput) {
      const viewId = quadrantInput.getAttribute("data-report-quadrant");
      state.reportQuadrants[viewId] = quadrantInput.value || reportViews.find((view) => view.id === viewId)?.defaultQuadrant || "";
    }
  });
  els.reportOptions.addEventListener("input", (event) => {
    const quadrantInput = event.target.closest("[data-report-quadrant]");
    if (!quadrantInput) return;
    const viewId = quadrantInput.getAttribute("data-report-quadrant");
    state.reportQuadrants[viewId] = quadrantInput.value || reportViews.find((view) => view.id === viewId)?.defaultQuadrant || "";
  });
  els.reportGenerateButton.addEventListener("click", generateCustomReport);
  els.clusterCountSelect.addEventListener("change", () => {
    state.clusterCount = Number(els.clusterCountSelect.value);
    render();
  });
  els.clusterMinGamesInput.addEventListener("input", () => {
    state.clusterMinGames = Number(els.clusterMinGamesInput.value || 1);
    render();
  });
  els.rankingScopeSelect.addEventListener("change", () => {
    state.rankingScope = els.rankingScopeSelect.value;
    render();
  });
  els.rankingPositionSelect.addEventListener("change", () => {
    state.rankingPosition = els.rankingPositionSelect.value;
    render();
  });
  els.rankingSortSelect.addEventListener("change", () => {
    state.rankingSort = els.rankingSortSelect.value;
    render();
  });
  els.rankingMinGamesInput.addEventListener("input", () => {
    state.rankingMinGames = Number(els.rankingMinGamesInput.value || 1);
    render();
  });
  els.rankingLimitSelect.addEventListener("change", () => {
    state.rankingLimit = els.rankingLimitSelect.value;
    render();
  });
  els.rankingMetricToggle.addEventListener("click", () => {
    const expanded = els.rankingMetricToggle.getAttribute("aria-expanded") === "true";
    els.rankingMetricToggle.setAttribute("aria-expanded", expanded ? "false" : "true");
    els.rankingMetricMenu.hidden = expanded;
  });
  els.rankingMetricMenu.addEventListener("change", (event) => {
    const input = event.target.closest('input[type="checkbox"]');
    if (!input) return;
    const selected = Array.from(els.rankingMetricMenu.querySelectorAll('input[type="checkbox"]:checked')).map((item) => item.value);
    if (!selected.length) {
      input.checked = true;
      return;
    }
    state.rankingVisibleMetrics = rankingMetricKeys.filter((key) => selected.includes(key));
    fillControls();
    render();
  });
  document.addEventListener("click", (event) => {
    if (els.rankingMetricMenu.hidden) return;
    if (event.target.closest(".ranking-metric-picker")) return;
    els.rankingMetricMenu.hidden = true;
    els.rankingMetricToggle.setAttribute("aria-expanded", "false");
  });
  els.availabilityStartInput.addEventListener("change", () => {
    state.availabilityStart = els.availabilityStartInput.value;
    render();
  });
  els.availabilityEndInput.addEventListener("change", () => {
    state.availabilityEnd = els.availabilityEndInput.value;
    render();
  });
  els.availabilityMetricSelect.addEventListener("change", () => {
    state.availabilityMetric = els.availabilityMetricSelect.value;
    render();
  });
  els.alertThresholdSelect.addEventListener("change", () => {
    state.alertThreshold = Number(els.alertThresholdSelect.value || 2);
    render();
  });
  els.alertDateInput.addEventListener("change", () => {
    state.alertDate = els.alertDateInput.value || null;
    render();
  });
  els.demandDateInput.addEventListener("change", () => {
    state.demandDate = els.demandDateInput.value || null;
    render();
  });
  els.externalFileInput.addEventListener("change", async () => {
    const [file] = els.externalFileInput.files || [];
    if (!file) {
      externalCandidateRows = [];
      render();
      return;
    }
    try {
      const text = await file.text();
      externalCandidateRows = normalizeExternalCandidateRows(parseCsvText(text));
      render();
    } catch (error) {
      externalCandidateRows = [];
      els.externalNote.textContent = `Erro no arquivo: ${error.message || "falha ao ler CSV"}`;
      render();
    }
  });
  if (supportsLocalUpdate()) {
    els.refreshButton.addEventListener("click", refreshDashboardData);
  } else {
    els.refreshButton.textContent = "Dados gerenciados";
    els.refreshButton.disabled = true;
    els.refreshButton.title = "Atualizacao diaria indisponivel no ambiente hospedado";
  }
  els.downloadButton.addEventListener("click", downloadCurrentCsv);
}

function supportsLocalUpdate() {
  return window.location.protocol === "file:" || localUpdateHosts.has(window.location.hostname);
}

function passesLoadFilter(event, { ignoreActive = false } = {}) {
  return (ignoreActive || passesActiveFilter(event)) && event.minutes >= state.minMinutes && (!state.completeOnly || event.completeHalves);
}

function baseFilter(event) {
  return passesLoadFilter(event);
}

function getAthleteEvents() {
  return events
    .filter((event) => event.athleteId === state.athleteId && baseFilter(event))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getSelectedAthlete() {
  return athletes.find((athlete) => athlete.athleteId === state.athleteId);
}

function athleteFilteredGames(athleteId = state.athleteId) {
  return events
    .filter((event) => event.athleteId === athleteId && baseFilter(event))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function athleteFilteredSessions(athleteId = state.athleteId, periodName = null) {
  const eligibleDates = new Set(athleteFilteredGames(athleteId).map((event) => event.date));
  return sessions
    .filter((session) => (
      session.athleteId === athleteId
      && eligibleDates.has(session.date)
      && (!periodName || session.periodName === periodName)
      && (session.periodName === "1tempo" || session.periodName === "2tempo")
    ))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function teamGameRowsByDate(date) {
  return events
    .filter((event) => (
      event.date === date
      && passesActiveFilter(event)
      && Number(event.minutes) >= state.minMinutes
      && Number(event.minutes) > 0
    ))
    .sort((a, b) => Number(b.totalDistance || 0) - Number(a.totalDistance || 0) || a.athlete.localeCompare(b.athlete, "pt-BR"));
}

function syncGameSplitDate() {
  const dates = events
    .filter((event) => passesActiveFilter(event) && Number(event.minutes) > 0)
    .map((event) => event.date)
    .filter((date, index, items) => items.indexOf(date) === index)
    .sort();
  if (!dates.length) {
    state.gameSplitDate = null;
    return [];
  }
  if (!dates.includes(state.gameSplitDate)) {
    state.gameSplitDate = dates[dates.length - 1];
  }
  return dates;
}

function formatGameSplitNumber(value, decimals = 0, unit = "") {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString("pt-BR", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })}${unit ? ` ${unit}` : ""}`;
}

function formatGameSplitPct(value) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}%`;
}

function gameSplitMetricValue(item, metricKey, peakMaxVelocity = 0) {
  if (!item) return 0;
  if (metricKey === "vmaxPct") {
    return peakMaxVelocity > 0 ? (Number(item.maxVelocity) / peakMaxVelocity) * 100 : 0;
  }
  const value = Number(item[metricKey]);
  return Number.isFinite(value) ? value : 0;
}

function buildGameSplitAnalysis() {
  const athlete = getSelectedAthlete();
  const eligibleDatesList = syncGameSplitDate();
  const eligibleGames = athleteFilteredGames();
  const eligibleSessions = athleteFilteredSessions();
  const selectedGame = eligibleGames.find((event) => event.date === state.gameSplitDate) || null;
  const selectedFirstHalf = eligibleSessions.find((session) => session.date === state.gameSplitDate && session.periodName === "1tempo") || null;
  const selectedSecondHalf = eligibleSessions.find((session) => session.date === state.gameSplitDate && session.periodName === "2tempo") || null;
  const peakMaxVelocity = Math.max(
    0,
    ...eligibleGames.map((event) => Number(event.maxVelocity) || 0),
    ...eligibleSessions.map((session) => Number(session.maxVelocity) || 0)
  );
  const segments = [
    {
      id: "complete",
      label: selectedGame ? `Jogo completo - ${dateLabel(selectedGame.date)}` : "Jogo completo",
      item: selectedGame,
      pool: eligibleGames,
    },
    {
      id: "1tempo",
      label: selectedFirstHalf ? `1tempo - ${dateLabel(selectedFirstHalf.date)}` : "1tempo",
      item: selectedFirstHalf,
      pool: eligibleSessions.filter((session) => session.periodName === "1tempo"),
    },
    {
      id: "2tempo",
      label: selectedSecondHalf ? `2tempo - ${dateLabel(selectedSecondHalf.date)}` : "2tempo",
      item: selectedSecondHalf,
      pool: eligibleSessions.filter((session) => session.periodName === "2tempo"),
    },
  ];
  const rows = segments.map((segment) => {
    const metricsByKey = Object.fromEntries(gameSplitMetrics.map((metric) => {
      const value = gameSplitMetricValue(segment.item, metric.key, peakMaxVelocity);
      const average = avg(segment.pool, (item) => gameSplitMetricValue(item, metric.key, peakMaxVelocity));
      const pctOfAverage = average > 0 ? (value / average) * 100 : 0;
      return [metric.key, { value, average, pctOfAverage, meta: metric }];
    }));
    return {
      ...segment,
      minutes: Number(segment.item?.minutes) || 0,
      minutesAverage: avg(segment.pool, (item) => Number(item?.minutes) || 0),
      metricsByKey,
    };
  });
  const selectedDateGames = teamGameRowsByDate(state.gameSplitDate);
  const selectedDateSessionMap = new Map(
    sessions
      .filter((session) => session.date === state.gameSplitDate && (session.periodName === "1tempo" || session.periodName === "2tempo"))
      .map((session) => [`${session.athleteId}|${session.periodName}`, session])
  );
  const playerRows = selectedDateGames.flatMap((event) => {
    const athletePool = athleteFilteredGames(event.athleteId);
    const firstHalfPool = athleteFilteredSessions(event.athleteId, "1tempo");
    const secondHalfPool = athleteFilteredSessions(event.athleteId, "2tempo");
    const playerPeakMaxVelocity = Math.max(
      0,
      ...athletePool.map((item) => Number(item.maxVelocity) || 0),
      ...firstHalfPool.map((item) => Number(item.maxVelocity) || 0),
      ...secondHalfPool.map((item) => Number(item.maxVelocity) || 0)
    );
    const playerSegments = [
      { label: "Jogo", item: event, pool: athletePool },
      { label: "1tempo", item: selectedDateSessionMap.get(`${event.athleteId}|1tempo`) || null, pool: firstHalfPool },
      { label: "2tempo", item: selectedDateSessionMap.get(`${event.athleteId}|2tempo`) || null, pool: secondHalfPool },
    ];
    return playerSegments
      .filter((segment) => segment.item)
      .map((segment) => {
        const metricsByKey = Object.fromEntries(gameSplitMetrics.map((metric) => {
          const value = gameSplitMetricValue(segment.item, metric.key, playerPeakMaxVelocity);
          const average = avg(segment.pool, (item) => gameSplitMetricValue(item, metric.key, playerPeakMaxVelocity));
          const pctOfAverage = average > 0 ? (value / average) * 100 : 0;
          const max = segment.pool.length
            ? Math.max(...segment.pool.map((item) => gameSplitMetricValue(item, metric.key, playerPeakMaxVelocity)))
            : 0;
          return [metric.key, { value, average, pctOfAverage, max, meta: metric }];
        }));
        return {
          ...event,
          segmentLabel: segment.label,
          segmentMinutes: Number(segment.item?.minutes) || 0,
          metricsByKey,
        };
      });
  });
  return {
    athlete,
    eligibleDatesList,
    eligibleGames,
    selectedGame,
    peakMaxVelocity,
    rows,
    playerRows,
    hasData: rows.some((row) => row.item),
  };
}

function avg(items, getter) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + getter(item), 0) / items.length;
}

function stdDev(items, getter) {
  if (items.length < 2) return 0;
  const mean = avg(items, getter);
  const variance = avg(items, (item) => {
    const diff = getter(item) - mean;
    return diff * diff;
  });
  return Math.sqrt(variance);
}

function isDerivedMetric(metricKey) {
  return Boolean(metrics[metricKey]?.derived);
}

function metricBaseValue(event, metricKey = state.metric, mode = state.loadMode) {
  const value = Number(event?.[metricKey]);
  if (!Number.isFinite(value)) return 0;
  if (mode !== "density") return value;
  const minutes = Number(event?.minutes);
  return minutes > 0 ? value / minutes : 0;
}

function metricReferenceCacheKey(metricKey, mode = state.loadMode) {
  return [
    metricKey,
    mode,
    state.minMinutes,
    state.completeOnly ? 1 : 0,
    state.activeOnly ? 1 : 0,
  ].join("|");
}

function athleteMetricReferenceMean(athleteId, metricKey, mode = state.loadMode) {
  const cacheKey = metricReferenceCacheKey(metricKey, mode);
  if (!metricReferenceCache.has(cacheKey)) {
    const aggregates = new Map();
    events.forEach((event) => {
      if (!baseFilter(event)) return;
      const id = String(event.athleteId || "");
      if (!id) return;
      const value = metricBaseValue(event, metricKey, mode);
      if (!Number.isFinite(value)) return;
      const current = aggregates.get(id) || { sum: 0, count: 0 };
      current.sum += value;
      current.count += 1;
      aggregates.set(id, current);
    });
    const means = new Map();
    aggregates.forEach((entry, id) => {
      means.set(id, entry.count ? entry.sum / entry.count : 0);
    });
    metricReferenceCache.set(cacheKey, means);
  }
  const means = metricReferenceCache.get(cacheKey);
  return means?.get(athleteId) || 0;
}

function eventMetricPercent(event, metricKey, mode = state.loadMode) {
  const athleteId = String(event?.athleteId || "");
  if (!athleteId) return 0;
  const value = metricBaseValue(event, metricKey, mode);
  const reference = athleteMetricReferenceMean(athleteId, metricKey, mode);
  if (!Number.isFinite(value) || !Number.isFinite(reference) || reference <= 0) return 0;
  return (value / reference) * 100;
}

function aggregateLoadPercent(event, mode = state.loadMode) {
  const values = demandMetricOrder.map((metricKey) => eventMetricPercent(event, metricKey, mode)).filter(Number.isFinite);
  return values.length ? avg(values, (value) => value) : 0;
}

function metricValue(event, metricKey = state.metric, mode = state.loadMode) {
  if (metricKey === "allVariablesVolumePct") return aggregateLoadPercent(event, "volume");
  if (metricKey === "allVariablesDensityPct") return aggregateLoadPercent(event, "density");
  if (metricKey === "allVariablesResultPct") {
    return avg([
      aggregateLoadPercent(event, "volume"),
      aggregateLoadPercent(event, "density"),
    ], (value) => value);
  }
  return metricBaseValue(event, metricKey, mode);
}

function metricLabel(metricKey = state.metric, mode = state.loadMode) {
  if (isDerivedMetric(metricKey)) return metrics[metricKey].label;
  return mode === "density" ? `${metrics[metricKey].label} / min` : metrics[metricKey].label;
}

function metricUnit(metricKey = state.metric, mode = state.loadMode) {
  const unit = metrics[metricKey].unit;
  if (isDerivedMetric(metricKey)) return unit;
  return mode === "density" ? `${unit}/min` : unit;
}

function metricDecimals(metricKey = state.metric, mode = state.loadMode) {
  if (isDerivedMetric(metricKey)) return metrics[metricKey].decimals;
  if (mode !== "density") return metrics[metricKey].decimals;
  if (metricKey === "explosiveActions" || metricKey === "rhieBouts" || metricKey === "fmpRunningHighMin" || metricKey === "fmpHighMin") return 2;
  return 1;
}

function correlationMetricValue(event, metricKey) {
  if (metricKey === "minutes") {
    const minutes = Number(event?.minutes);
    return Number.isFinite(minutes) ? minutes : 0;
  }
  return metricValue(event, metricKey, state.loadMode);
}

function correlationMetricMeta(metricKey) {
  return correlationMetrics.find((metric) => metric.key === metricKey) || { key: metricKey, label: metricKey, unit: "", decimals: 2 };
}

function correlationLabel(metricKey) {
  const meta = correlationMetricMeta(metricKey);
  if (metricKey === "minutes") return meta.label;
  return state.loadMode === "density" ? `${meta.label} / min` : meta.label;
}

function rolling(items) {
  return items.map((item, index) => {
    const start = Math.max(0, index - state.rollingWindow + 1);
    const slice = items.slice(start, index + 1);
    return {
      ...item,
      metricDisplayValue: metricValue(item),
      rollingValue: avg(slice, (event) => metricValue(event)),
    };
  });
}

function buildLoadResultSeries(athleteEvents, metricKey = state.metric) {
  const items = athleteEvents.slice(-10);
  return items.map((event) => {
    if (metricKey === "allVariablesVolumePct") {
      const volume = aggregateLoadPercent(event, "volume");
      const density = aggregateLoadPercent(event, "density");
      return { ...event, volumePct: volume, densityPct: density, resultPct: avg([volume, density], (value) => value) };
    }
    if (metricKey === "allVariablesDensityPct") {
      const volume = aggregateLoadPercent(event, "volume");
      const density = aggregateLoadPercent(event, "density");
      return { ...event, volumePct: volume, densityPct: density, resultPct: avg([volume, density], (value) => value) };
    }
    if (metricKey === "allVariablesResultPct") {
      const volume = aggregateLoadPercent(event, "volume");
      const density = aggregateLoadPercent(event, "density");
      return { ...event, volumePct: volume, densityPct: density, resultPct: avg([volume, density], (value) => value) };
    }
    const volumePct = eventMetricPercent(event, metricKey, "volume");
    const densityPct = eventMetricPercent(event, metricKey, "density");
    return {
      ...event,
      volumePct,
      densityPct,
      resultPct: avg([volumePct, densityPct], (value) => value),
    };
  });
}

function positionReference(position) {
  return events.filter((event) => event.position === position && baseFilter(event));
}

function format(value, metricKey = state.metric) {
  const metric = metrics[metricKey];
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString("pt-BR", {
    maximumFractionDigits: metric.decimals,
    minimumFractionDigits: metric.decimals,
  })} ${metric.unit}`;
}

function formatRankingValue(value, metricKey) {
  const metric = rankingMetrics[metricKey] || metrics[metricKey];
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString("pt-BR", {
    maximumFractionDigits: metric?.decimals ?? 1,
    minimumFractionDigits: metric?.decimals ?? 1,
  })} ${metric?.unit || ""}`.trim();
}

function formatMetric(value, metricKey = state.metric, mode = state.loadMode) {
  const safe = Number.isFinite(value) ? value : 0;
  const decimals = metricDecimals(metricKey, mode);
  return `${safe.toLocaleString("pt-BR", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })} ${metricUnit(metricKey, mode)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function normalizeToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return (parts.length ? parts.slice(0, 2).map((part) => part[0]).join("") : "?").toUpperCase();
}

function renderSelectedAthleteAvatar(athlete) {
  const fallback = initials(athlete?.athlete);
  els.athleteAvatarFallback.textContent = fallback;
  if (athlete?.photoUrl) {
    els.athletePhoto.onerror = () => {
      els.athletePhoto.style.display = "none";
    };
    els.athletePhoto.src = athlete.photoUrl;
    els.athletePhoto.style.display = "block";
  } else {
    els.athletePhoto.removeAttribute("src");
    els.athletePhoto.style.display = "none";
  }
}

function avatarNameHtml(entity) {
  const name = entity.athlete || "Atleta";
  const photo = entity.photoUrl || "";
  const image = photo ? `<img src="${escapeHtml(photo)}" alt="" loading="lazy" onerror="this.remove();">` : "";
  return `
    <div class="name-with-avatar">
      <span class="avatar-mini">${image}<b>${escapeHtml(initials(name))}</b></span>
      <span>${escapeHtml(name)}</span>
    </div>`;
}

function correlationStrengthLabel(value) {
  const abs = Math.abs(value);
  if (abs >= 0.8) return value >= 0 ? "muito forte +" : "muito forte -";
  if (abs >= 0.6) return value >= 0 ? "forte +" : "forte -";
  if (abs >= 0.4) return value >= 0 ? "moderada +" : "moderada -";
  if (abs >= 0.2) return value >= 0 ? "fraca +" : "fraca -";
  return "quase nula";
}

function correlationColor(value) {
  const safe = Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
  const hue = safe >= 0 ? 218 : 358;
  const saturation = 76;
  const lightness = 95 - Math.abs(safe) * 44;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function pearsonCorrelation(rows, keyA, keyB) {
  if (keyA === keyB) return 1;
  const pairs = rows
    .map((row) => [correlationMetricValue(row, keyA), correlationMetricValue(row, keyB)])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  if (pairs.length < 3) return 0;

  const meanA = pairs.reduce((sum, [value]) => sum + value, 0) / pairs.length;
  const meanB = pairs.reduce((sum, [, value]) => sum + value, 0) / pairs.length;
  let numerator = 0;
  let sumA = 0;
  let sumB = 0;

  for (const [a, b] of pairs) {
    const da = a - meanA;
    const db = b - meanB;
    numerator += da * db;
    sumA += da * da;
    sumB += db * db;
  }

  if (!sumA || !sumB) return 0;
  return numerator / Math.sqrt(sumA * sumB);
}

function buildCorrelationAnalysis() {
  const rows = events
    .filter(baseFilter)
    .sort((a, b) => a.date.localeCompare(b.date));
  const variables = correlationMetrics.map((metric) => ({
    key: metric.key,
    label: correlationLabel(metric.key),
  }));
  const matrix = variables.map((source) => variables.map((target) => ({
    keyA: source.key,
    keyB: target.key,
    value: pearsonCorrelation(rows, source.key, target.key),
  })));
  const pairs = [];

  for (let rowIndex = 0; rowIndex < variables.length; rowIndex += 1) {
    for (let colIndex = rowIndex + 1; colIndex < variables.length; colIndex += 1) {
      const item = matrix[rowIndex][colIndex];
      pairs.push({
        keyA: item.keyA,
        keyB: item.keyB,
        labelA: variables[rowIndex].label,
        labelB: variables[colIndex].label,
        value: item.value,
      });
    }
  }

  const strongestPositive = pairs
    .filter((item) => item.value >= 0)
    .sort((a, b) => b.value - a.value)[0] || null;
  const strongestNegative = pairs
    .filter((item) => item.value < 0)
    .sort((a, b) => a.value - b.value)[0] || null;

  return { rows, variables, matrix, pairs, strongestPositive, strongestNegative };
}

function renderCorrelation() {
  const analysis = buildCorrelationAnalysis();
  els.correlationGamesKpi.textContent = String(analysis.rows.length);
  els.correlationVariablesKpi.textContent = String(analysis.variables.length);
  els.correlationPositiveKpi.textContent = analysis.strongestPositive
    ? `${analysis.strongestPositive.value.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
    : "--";
  els.correlationNegativeKpi.textContent = analysis.strongestNegative
    ? `${analysis.strongestNegative.value.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
    : "--";
  els.correlationPositiveKpi.style.color = "var(--blue)";
  els.correlationNegativeKpi.style.color = analysis.strongestNegative ? "var(--red)" : "var(--ink)";

  if (analysis.rows.length < 3) {
    els.correlationNote.textContent = "Minimo de 3 jogos filtrados";
    els.correlationMatrix.innerHTML = `<div class="empty">Nao ha jogos suficientes para calcular a correlacao com o filtro atual.</div>`;
    els.correlationPairsCount.textContent = "0 pares";
    els.correlationPairsTable.innerHTML = `<tr><td colspan="5" class="empty">Sem dados para exibir.</td></tr>`;
    return;
  }

  els.correlationNote.textContent = `${analysis.rows.length} jogos | ${state.loadMode === "density" ? "modo densidade" : "modo volume"} | filtros globais ativos`;

  const cells = [];
  cells.push(`<div class="correlation-corner">Variaveis</div>`);
  cells.push(...analysis.variables.map((variable) => `<div class="correlation-header">${escapeHtml(variable.label)}</div>`));
  analysis.variables.forEach((rowVariable, rowIndex) => {
    cells.push(`<div class="correlation-row-label">${escapeHtml(rowVariable.label)}</div>`);
    analysis.matrix[rowIndex].forEach((cell, colIndex) => {
      const value = Number.isFinite(cell.value) ? cell.value : 0;
      const cssClass = rowIndex === colIndex ? "correlation-cell diagonal" : "correlation-cell";
      cells.push(`
        <div class="${cssClass}" style="background:${correlationColor(value)}">
          <strong>${value.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</strong>
          <span>${rowIndex === colIndex ? "auto" : escapeHtml(correlationStrengthLabel(value))}</span>
        </div>
      `);
    });
  });
  els.correlationMatrix.innerHTML = `<div class="correlation-grid" style="--correlation-count:${analysis.variables.length}">${cells.join("")}</div>`;

  const strongestPairs = analysis.pairs
    .slice()
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 12);
  els.correlationPairsCount.textContent = `${strongestPairs.length} pares`;
  els.correlationPairsTable.innerHTML = strongestPairs.map((pair, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(pair.labelA)}</td>
      <td>${escapeHtml(pair.labelB)}</td>
      <td><span class="percentile-pill" style="background:${correlationColor(pair.value)}; color:${pair.value < -0.15 ? "#8f1017" : "#0c223f"}">${pair.value.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span></td>
      <td>${escapeHtml(correlationStrengthLabel(pair.value))}</td>
    </tr>
  `).join("");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function demandBandMeta(score) {
  if (score >= 75) return { label: "Muito alta", color: "#d71920" };
  if (score >= 60) return { label: "Alta", color: "#f97316" };
  if (score >= 45) return { label: "Media", color: "#facc15" };
  if (score >= 30) return { label: "Baixa", color: "#84cc16" };
  return { label: "Muito baixa", color: "#0f766e" };
}

function dateToMs(value) {
  return new Date(`${value}T00:00:00`).getTime();
}

function isoDateAddDays(value, offset) {
  const next = new Date(`${value}T00:00:00`);
  next.setDate(next.getDate() + offset);
  return next.toISOString().slice(0, 10);
}

function scoreFromClippedZ(zScore) {
  return ((clamp(zScore, -3, 3) + 3) / 6) * 100;
}

function scoreFromCompositeRaw(rawValue) {
  return clamp(50 + rawValue * 18, 0, 100);
}

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  row.push(cell);
  if (row.some((value) => String(value).trim() !== "")) rows.push(row);
  return rows;
}

function numberFromCsv(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const normalized = text.includes(",") && text.includes(".")
    ? text.replace(/\./g, "").replace(",", ".")
    : text.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeExternalCandidateRows(csvRows) {
  if (csvRows.length < 2) throw new Error("o CSV precisa ter cabecalho e pelo menos 1 linha");
  const headers = csvRows[0].map((value) => String(value).trim());
  const required = [
    "candidateId",
    "athleteName",
    "position",
    "matchDate",
    "minutes",
    "totalDistanceMeters",
    "highIntensityMeters",
    "accelerationsB23",
    "decelerationsB23",
  ];
  const missing = required.filter((key) => !headers.includes(key));
  if (missing.length) throw new Error(`colunas ausentes: ${missing.join(", ")}`);

  const records = csvRows.slice(1).map((cells) => {
    const item = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    return {
      candidateId: String(item.candidateId || "").trim(),
      athleteName: String(item.athleteName || "").trim(),
      position: String(item.position || "").trim(),
      club: String(item.club || "").trim(),
      season: String(item.season || "").trim(),
      competition: String(item.competition || "").trim(),
      matchDate: String(item.matchDate || "").trim(),
      minutes: numberFromCsv(item.minutes),
      totalDistanceMeters: numberFromCsv(item.totalDistanceMeters),
      highIntensityMeters: numberFromCsv(item.highIntensityMeters),
      accelerationsB23: numberFromCsv(item.accelerationsB23),
      decelerationsB23: numberFromCsv(item.decelerationsB23),
      source: String(item.source || "").trim(),
      notes: String(item.notes || "").trim(),
    };
  }).filter((row) => row.candidateId && row.athleteName && row.position && row.matchDate);

  if (!records.length) throw new Error("nenhuma linha valida encontrada");
  const candidateIds = Array.from(new Set(records.map((row) => row.candidateId)));
  if (candidateIds.length > 1) throw new Error("o arquivo deve conter apenas 1 candidato por vez");
  return records.sort((a, b) => a.matchDate.localeCompare(b.matchDate));
}

function formatExternalValue(value, metric) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString("pt-BR", {
    maximumFractionDigits: metric.decimals,
    minimumFractionDigits: metric.decimals,
  })} ${metric.unit}`;
}

function buildExternalReferenceProfiles() {
  const grouped = new Map();
  for (const event of events.filter(baseFilter)) {
    if (!grouped.has(event.athleteId)) grouped.set(event.athleteId, []);
    grouped.get(event.athleteId).push(event);
  }
  return Array.from(grouped.entries())
    .map(([athleteId, items]) => {
      const first = items[0];
      const profile = {
        athleteId,
        athlete: first.athlete,
        position: first.position,
        photoUrl: first.photoUrl,
        games: items.length,
      };
      externalComparisonMetrics.forEach((metric) => {
        profile[metric.key] = avg(items, (event) => Number(event?.[metric.key]) || 0);
      });
      return profile;
    })
    .filter((profile) => profile.games >= 3);
}

function buildExternalComparison() {
  const candidateRows = externalCandidateRows.filter((row) => row.minutes >= state.minMinutes);
  if (!candidateRows.length) {
    return {
      candidate: null,
      candidateRows: [],
      teamProfiles: [],
      positionProfiles: [],
      comparisonRows: [],
      teamAveragePercentile: null,
      positionAveragePercentile: null,
      displayProfiles: [],
    };
  }

  const first = candidateRows[0];
  const candidate = {
    candidateId: first.candidateId,
    athlete: first.athleteName,
    position: first.position,
    club: first.club,
    source: first.source,
    games: candidateRows.length,
  };
  externalComparisonMetrics.forEach((metric) => {
    candidate[metric.key] = avg(candidateRows, (row) => Number(row?.[metric.sourceKey]) || 0);
  });

  const teamProfiles = buildExternalReferenceProfiles();
  const normalizedPosition = normalizeToken(candidate.position);
  const positionProfiles = teamProfiles.filter((profile) => normalizeToken(profile.position) === normalizedPosition);
  const comparisonRows = externalComparisonMetrics.map((metric) => {
    const teamSorted = teamProfiles.map((profile) => profile[metric.key]).sort((a, b) => a - b);
    const positionSorted = positionProfiles.map((profile) => profile[metric.key]).sort((a, b) => a - b);
    const teamPercentile = teamSorted.length ? percentileValue(candidate[metric.key], teamSorted) : null;
    const positionPercentile = positionSorted.length ? percentileValue(candidate[metric.key], positionSorted) : null;
    return {
      metric,
      candidateValue: candidate[metric.key],
      teamPercentile,
      positionPercentile,
    };
  });

  return {
    candidate,
    candidateRows,
    teamProfiles,
    positionProfiles,
    comparisonRows,
    teamAveragePercentile: comparisonRows.every((row) => row.teamPercentile !== null) ? avg(comparisonRows, (row) => row.teamPercentile) : null,
    positionAveragePercentile: comparisonRows.some((row) => row.positionPercentile !== null) ? avg(comparisonRows.filter((row) => row.positionPercentile !== null), (row) => row.positionPercentile) : null,
    displayProfiles: positionProfiles.length ? positionProfiles : teamProfiles,
  };
}

function renderExternalComparison() {
  const comparison = buildExternalComparison();
  els.externalMethodNote.textContent = "1 linha por jogo. Percentil calculado pela media do candidato contra medias por atleta da equipe e, quando houver amostra, da mesma posicao.";
  if (!comparison.candidate) {
    els.externalNote.textContent = externalCandidateRows.length
      ? `Nenhum jogo do candidato atende ao filtro atual de minutos (${state.minMinutes}+).`
      : "Nenhum arquivo carregado";
    els.externalGamesKpi.textContent = "0";
    els.externalPositionKpi.textContent = "--";
    els.externalTeamPctKpi.textContent = "--";
    els.externalPositionPctKpi.textContent = "--";
    els.externalProfileNote.textContent = "";
    els.externalProfileTable.innerHTML = `<tr><td colspan="4" class="empty">Carregue o CSV do atleta externo para comparar.</td></tr>`;
    els.externalSummaryNote.textContent = "";
    els.externalSummaryBars.innerHTML = `<div class="empty">Baixe o template, preencha 1 linha por jogo e envie o arquivo.</div>`;
    els.externalReferenceCount.textContent = "0 atletas";
    els.externalReferenceTable.innerHTML = `<tr><td colspan="7" class="empty">Sem referencia para exibir.</td></tr>`;
    return;
  }

  const teamPct = comparison.teamAveragePercentile;
  const positionPct = comparison.positionAveragePercentile;
  els.externalNote.textContent = `${comparison.candidate.athlete} | ${comparison.candidate.games} jogos | ${comparison.candidate.club || "clube nao informado"} | fonte: ${comparison.candidate.source || "nao informada"}`;
  els.externalGamesKpi.textContent = String(comparison.candidate.games);
  els.externalPositionKpi.textContent = comparison.candidate.position || "--";
  els.externalTeamPctKpi.textContent = teamPct === null ? "--" : `P${Math.round(teamPct)}`;
  els.externalPositionPctKpi.textContent = positionPct === null ? "--" : `P${Math.round(positionPct)}`;
  els.externalProfileNote.textContent = `${comparison.teamProfiles.length} atletas de referencia | ${comparison.positionProfiles.length} na mesma posicao`;
  els.externalProfileTable.innerHTML = comparison.comparisonRows.map((row) => `
    <tr>
      <td>${row.metric.label}</td>
      <td>${formatExternalValue(row.candidateValue, row.metric)}</td>
      <td>${row.teamPercentile === null ? "-" : `P${Math.round(row.teamPercentile)}`}</td>
      <td>${row.positionPercentile === null ? "-" : `P${Math.round(row.positionPercentile)}`}</td>
    </tr>
  `).join("");

  const maxPct = Math.max(...comparison.comparisonRows.flatMap((row) => [row.teamPercentile ?? 0, row.positionPercentile ?? 0]), 1);
  els.externalSummaryNote.textContent = "Cada barra mostra o percentil do candidato na equipe e na posicao.";
  els.externalSummaryBars.innerHTML = comparison.comparisonRows.map((row) => `
    <div class="group-metric-row">
      <div>
        <strong>${row.metric.label}</strong>
        <span>Equipe ${row.teamPercentile === null ? "-" : `P${Math.round(row.teamPercentile)}`} | Posicao ${row.positionPercentile === null ? "-" : `P${Math.round(row.positionPercentile)}`}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${(((row.positionPercentile ?? row.teamPercentile ?? 0) / maxPct) * 100).toFixed(1)}%"></div></div>
      <b>${formatExternalValue(row.candidateValue, row.metric)}</b>
    </div>
  `).join("");

  els.externalReferenceCount.textContent = comparison.positionProfiles.length
    ? `${comparison.positionProfiles.length} atletas da mesma posicao`
    : `${comparison.teamProfiles.length} atletas da equipe`;
  els.externalReferenceTable.innerHTML = comparison.displayProfiles.length
    ? comparison.displayProfiles
      .slice()
      .sort((a, b) => a.position.localeCompare(b.position, "pt-BR") || a.athlete.localeCompare(b.athlete, "pt-BR"))
      .map((profile) => `
        <tr>
          <td>${avatarNameHtml(profile)}</td>
          <td>${escapeHtml(profile.position || "-")}</td>
          <td>${profile.games}</td>
          <td>${formatExternalValue(profile.totalDistance, externalComparisonMetrics[0])}</td>
          <td>${formatExternalValue(profile.highIntensityMeters, externalComparisonMetrics[1])}</td>
          <td>${formatExternalValue(profile.accelerationsB23, externalComparisonMetrics[2])}</td>
          <td>${formatExternalValue(profile.decelerationsB23, externalComparisonMetrics[3])}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="7" class="empty">Sem referencia interna suficiente para comparar.</td></tr>`;
}

function buildDemandAnalysis() {
  const filteredEvents = events.filter(baseFilter).sort((a, b) =>
    a.athleteId.localeCompare(b.athleteId) || a.date.localeCompare(b.date)
  );
  const filteredSessions = sessions
    .filter((session) => passesActiveFilter(session) && session.periodName === "session")
    .sort((a, b) => a.athleteId.localeCompare(b.athleteId) || a.date.localeCompare(b.date));
  const statsCache = new Map();
  const byAthlete = new Map();
  const sessionsByAthlete = new Map();
  filteredEvents.forEach((event) => {
    if (!byAthlete.has(event.athleteId)) byAthlete.set(event.athleteId, []);
    byAthlete.get(event.athleteId).push(event);
  });
  filteredSessions.forEach((session) => {
    if (!sessionsByAthlete.has(session.athleteId)) sessionsByAthlete.set(session.athleteId, []);
    sessionsByAthlete.get(session.athleteId).push(session);
  });

  const referenceStats = (athleteId, metricKey) => {
    const athletePool = byAthlete.get(athleteId) || [];
    const cacheKey = `${athleteId}|${metricKey}`;
    if (statsCache.has(cacheKey)) return statsCache.get(cacheKey);
    const values = athletePool.map((event) => metricValue(event, metricKey, state.loadMode));
    const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const variance = values.length ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length : 0;
    const stats = { mean, sd: Math.sqrt(variance) };
    statsCache.set(cacheKey, stats);
    return stats;
  };

  const ewmaByAthlete = new Map();
  sessionsByAthlete.forEach((athleteSessions, athleteId) => {
    const sessionByDate = athleteSessions.reduce((map, session) => {
      const bucket = map.get(session.date) || { athleteId, date: session.date };
      demandMetricOrder.forEach((metricKey) => {
        bucket[metricKey] = (bucket[metricKey] || 0) + metricValue(session, metricKey, state.loadMode);
      });
      map.set(session.date, bucket);
      return map;
    }, new Map());

    const observedDates = [
      ...new Set([
        ...athleteSessions.map((session) => session.date),
        ...(byAthlete.get(athleteId) || []).map((event) => event.date),
      ]),
    ].sort();

    if (!observedDates.length) {
      ewmaByAthlete.set(athleteId, []);
      return;
    }

    const metricState = demandMetricOrder.reduce((map, metricKey) => {
      map[metricKey] = { EWMA_4: null, EWMA_7: null, EWMA_28: null };
      return map;
    }, {});

    const ewmaRows = [];
    for (let cursor = observedDates[0]; cursor <= observedDates[observedDates.length - 1]; cursor = isoDateAddDays(cursor, 1)) {
      const existing = sessionByDate.get(cursor) || { athleteId, date: cursor };
      const row = {
        athleteId,
        date: cursor,
        metrics: {},
      };
      demandMetricOrder.forEach((metricKey) => {
        const dailyLoad = Number(existing[metricKey] || 0);
        const values = { load: dailyLoad };
        Object.entries(ewmaWindows).forEach(([columnName, windowSize]) => {
          const lambda = 2 / (windowSize + 1);
          const previous = metricState[metricKey][columnName];
          const current = previous === null ? dailyLoad : (lambda * dailyLoad) + ((1 - lambda) * previous);
          metricState[metricKey][columnName] = current;
          values[columnName] = current;
        });
        values.EWMA_ACWR = values.EWMA_28 > 0 ? values.EWMA_7 / values.EWMA_28 : null;
        row.metrics[metricKey] = values;
      });
      ewmaRows.push(row);
    }

    demandMetricOrder.forEach((metricKey) => {
      const ewma4Rows = ewmaRows.filter((row) => Number.isFinite(row.metrics[metricKey].EWMA_4));
      const ewma4Mean = ewma4Rows.length ? avg(ewma4Rows, (row) => row.metrics[metricKey].EWMA_4) : 0;
      const ewma4Sd = ewma4Rows.length > 1 ? stdDev(ewma4Rows, (row) => row.metrics[metricKey].EWMA_4) : 0;
      const acwrRows = ewmaRows.filter((row) => Number.isFinite(row.metrics[metricKey].EWMA_ACWR));
      const acwrMean = acwrRows.length ? avg(acwrRows, (row) => row.metrics[metricKey].EWMA_ACWR) : 0;
      const acwrSd = acwrRows.length > 1 ? stdDev(acwrRows, (row) => row.metrics[metricKey].EWMA_ACWR) : 0;

      ewmaRows.forEach((row) => {
        const values = row.metrics[metricKey];
        const ewma4Z = ewma4Sd ? (values.EWMA_4 - ewma4Mean) / ewma4Sd : 0;
        values.Z_EWMA4 = clamp(ewma4Z, -3, 3);
        values.Score_EWMA4 = scoreFromClippedZ(values.Z_EWMA4);

        if (Number.isFinite(values.EWMA_ACWR)) {
          const acwrZ = acwrSd ? (values.EWMA_ACWR - acwrMean) / acwrSd : 0;
          values.Z_EWMA_ACWR = clamp(acwrZ, -3, 3);
          values.Score_EWMA_ACWR = scoreFromClippedZ(values.Z_EWMA_ACWR);
        } else {
          values.Z_EWMA_ACWR = null;
          values.Score_EWMA_ACWR = null;
        }
      });
    });

    ewmaByAthlete.set(athleteId, ewmaRows);
  });

  const analyses = [];
  byAthlete.forEach((athleteEvents) => {
    const sorted = athleteEvents.slice().sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((event) => {
      const contributions = demandMetricOrder.map((metricKey) => {
        const { mean, sd } = referenceStats(event.athleteId, metricKey);
        const value = metricValue(event, metricKey, state.loadMode);
        const zScore = sd ? (value - mean) / sd : 0;
        const clipped = clamp(zScore, -3, 3);
        const weighted = clipped * demandWeights[metricKey];
        return { metricKey, value, zScore, weighted, weight: demandWeights[metricKey] };
      });
      const gameRaw = contributions.reduce((sum, item) => sum + item.weighted, 0);
      const gameScore = scoreFromCompositeRaw(gameRaw);
      const ewmaRow = (ewmaByAthlete.get(event.athleteId) || []).find((item) => item.date === event.date) || null;
      const ewma4Contributions = demandMetricOrder.map((metricKey) => {
        const values = ewmaRow?.metrics?.[metricKey];
        const score = Number(values?.Score_EWMA4 || 50);
        const weighted = ((score - 50) / 18) * demandWeights[metricKey];
        return {
          metricKey,
          value: values?.EWMA_4 ?? 0,
          zScore: values?.Z_EWMA4 ?? 0,
          weighted,
          weight: demandWeights[metricKey],
          score,
        };
      });
      const acwrContributions = demandMetricOrder.map((metricKey) => {
        const values = ewmaRow?.metrics?.[metricKey];
        const score = Number(values?.Score_EWMA_ACWR ?? 50);
        const weighted = ((score - 50) / 18) * demandWeights[metricKey];
        return {
          metricKey,
          value: values?.EWMA_ACWR ?? null,
          zScore: values?.Z_EWMA_ACWR ?? null,
          weighted,
          weight: demandWeights[metricKey],
          score,
        };
      });
      const recent4Raw = ewma4Contributions.reduce((sum, item) => sum + item.weighted, 0);
      const recent4Score = scoreFromCompositeRaw(recent4Raw);
      const acwrRaw = acwrContributions.reduce((sum, item) => sum + item.weighted, 0);
      const acwrScore = scoreFromCompositeRaw(acwrRaw);
      const recentRaw = (recent4Raw * 0.5) + (acwrRaw * 0.5);
      const recentScore = (recent4Score * 0.5) + (acwrScore * 0.5);
      const finalRaw = (gameRaw * 0.6) + (recent4Raw * 0.2) + (acwrRaw * 0.2);
      const score = clamp((gameScore * 0.6) + (recent4Score * 0.2) + (acwrScore * 0.2), 0, 100);
      const band = demandBandMeta(score);
      analyses.push({
        athleteId: event.athleteId,
        athlete: event.athlete,
        photoUrl: event.photoUrl,
        position: event.position,
        date: event.date,
        gameRaw,
        gameScore,
        recent4Raw,
        recent4Score,
        acwrRaw,
        acwrScore,
        recentRaw,
        recentScore,
        finalRaw,
        score,
        band,
        contributions,
        ewma: ewmaRow,
      });
    });
  });

  const latestByAthlete = Array.from(
    analyses.reduce((map, item) => map.set(item.athleteId, item), new Map()).values()
  ).sort((a, b) => b.score - a.score || a.athlete.localeCompare(b.athlete, "pt-BR"));

  const selectedDate = state.demandDate || (filteredEvents[filteredEvents.length - 1]?.date ?? null);
  const gameRows = analyses
    .filter((item) => !selectedDate || item.date === selectedDate)
    .sort((a, b) => b.score - a.score || a.athlete.localeCompare(b.athlete, "pt-BR"));

  return { analyses, latestByAthlete, gameRows, selectedDate };
}

function renderDemand() {
  const analysis = buildDemandAnalysis();
  els.demandFormulaNote.textContent = "Jogo = z-score ponderado no historico individual do atleta. Carga recente = 20% EWMA 4 dias + 20% relacao aguda/cronica (EWMA 7 / EWMA 28), calculadas por atleta, por metrica, com carga zero nos dias sem sessao. Indice final = 60% jogo + 20% EWMA4 + 20% ACWR.";
  els.demandTableCount.textContent = `${analysis.gameRows.length} atletas`;

  const athleteHistory = analysis.analyses
    .filter((item) => item.athleteId === state.athleteId && (!analysis.selectedDate || item.date <= analysis.selectedDate));
  const latest = analysis.selectedDate
    ? athleteHistory.slice().reverse().find((item) => item.date === analysis.selectedDate) || null
    : athleteHistory[athleteHistory.length - 1];
  if (!latest) {
    els.demandNote.textContent = analysis.selectedDate ? `Sem jogo para o atleta selecionado em ${dateLabel(analysis.selectedDate)}` : "Sem dados";
    els.demandScoreKpi.textContent = "0";
    els.demandBandKpi.textContent = "--";
    els.demandGameLoadKpi.textContent = "0";
    els.demandRecentLoadKpi.textContent = "0";
    els.demandGaugeNote.textContent = "";
    els.demandGauge.innerHTML = `<div class="empty">Nao ha jogos suficientes para o atleta/filtro atual.</div>`;
    els.demandBreakdownNote.textContent = "";
    els.demandBreakdown.innerHTML = `<div class="empty">Sem contribuicoes para exibir.</div>`;
    els.demandTimelineNote.textContent = "0 jogos";
    els.demandTimeline.innerHTML = `<div class="empty">Sem historico para exibir.</div>`;
    els.demandTable.innerHTML = analysis.gameRows.length
      ? analysis.gameRows.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${avatarNameHtml(item)}</td>
          <td>${escapeHtml(item.position || "-")}</td>
          <td>${dateLabel(item.date)}</td>
          <td><span class="demand-badge" style="background:${item.band.color}">${item.score.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span></td>
          <td>${item.band.label}</td>
          <td>${item.gameScore.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
          <td>${item.recentScore.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="8" class="empty">Sem dados para exibir.</td></tr>`;
    return;
  }

  const band = latest.band;
  els.demandNote.textContent = analysis.selectedDate
    ? `${analysis.gameRows.length} atletas no jogo de ${dateLabel(analysis.selectedDate)} | referencia no historico individual`
    : `${analysis.analyses.length} jogos validos | referencia no historico individual`;
  els.demandScoreKpi.textContent = latest.score.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  els.demandBandKpi.textContent = band.label;
  els.demandBandKpi.style.color = band.color;
  els.demandGameLoadKpi.textContent = latest.gameScore.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  els.demandRecentLoadKpi.textContent = latest.recentScore.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  els.demandGaugeNote.textContent = `${latest.athlete} | ${dateLabel(latest.date)}`;
  els.demandGauge.innerHTML = `
    <div class="demand-scale">
      <div class="demand-scale-marker" style="left:${latest.score}%"></div>
    </div>
    <div class="demand-scale-labels">
      <span>Muito baixa</span>
      <span>Baixa</span>
      <span>Media</span>
      <span>Alta</span>
      <span>Muito alta</span>
    </div>
    <div class="demand-summary">
      <article><span>Indice</span><strong>${latest.score.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</strong></article>
      <article><span>Faixa</span><strong>${band.label}</strong></article>
      <article><span>Data</span><strong>${shortDate(latest.date)}</strong></article>
    </div>
  `;

  const rankedContributions = latest.contributions
    .slice()
    .sort((a, b) => Math.abs(b.weighted) - Math.abs(a.weighted));
  const maxContribution = Math.max(...rankedContributions.map((item) => Math.abs(item.weighted)), 0.01);
  els.demandBreakdownNote.textContent = "Maior barra = maior peso no componente de demanda do jogo";
  els.demandBreakdown.innerHTML = rankedContributions.map((item) => {
    const width = (Math.abs(item.weighted) / maxContribution) * 100;
    const color = item.weighted >= 0 ? "var(--blue)" : "var(--red)";
    return `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(metrics[item.metricKey].label)}</div>
        <div class="bar-track"><div class="bar-fill ${item.weighted < 0 ? "danger" : ""}" style="width:${width}%; background:${color}"></div></div>
        <div class="bar-value">${item.weighted.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</div>
      </div>`;
  }).join("");

  els.demandTimelineNote.textContent = `${athleteHistory.length} jogos ate a data`;
  const maxScore = Math.max(...athleteHistory.map((item) => item.score), 1);
  els.demandTimeline.innerHTML = athleteHistory.slice().reverse().map((item) => `
    <div class="group-metric-row">
      <div>
        <strong>${dateLabel(item.date)}</strong>
        <span>${item.band.label} | jogo ${item.gameScore.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })} | EWMA4 ${item.recent4Score.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })} | ACWR ${item.acwrScore.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${(item.score / maxScore) * 100}%; background:${item.band.color}"></div></div>
      <b>${item.score.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</b>
    </div>
  `).join("");

  els.demandTable.innerHTML = analysis.gameRows.length ? analysis.gameRows.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${avatarNameHtml(item)}</td>
      <td>${escapeHtml(item.position || "-")}</td>
      <td>${dateLabel(item.date)}</td>
      <td><span class="demand-badge" style="background:${item.band.color}">${item.score.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span></td>
      <td>${item.band.label}</td>
      <td>${item.gameScore.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
      <td>${item.recentScore.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
    </tr>
  `).join("") : `<tr><td colspan="8" class="empty">Sem dados para exibir.</td></tr>`;
}

function renderGameSplit() {
  const analysis = buildGameSplitAnalysis();
  els.gameSplitDateSelect.innerHTML = analysis.eligibleDatesList.length
    ? analysis.eligibleDatesList
      .slice()
      .reverse()
      .map((date) => `<option value="${date}">${dateLabel(date)}</option>`)
      .join("")
    : `<option value="">Sem jogos</option>`;
  els.gameSplitDateSelect.value = state.gameSplitDate || "";
  els.gameSplitGamesKpi.textContent = String(analysis.eligibleGames.length);
  els.gameSplitDateKpi.textContent = analysis.selectedGame ? dateLabel(analysis.selectedGame.date) : "--";
  els.gameSplitMinutesKpi.textContent = formatGameSplitNumber(Number(analysis.selectedGame?.minutes) || 0, 0, "min");
  els.gameSplitPeakVmaxKpi.textContent = formatGameSplitNumber(analysis.peakMaxVelocity, 1, "km/h");
  els.gameSplitPlayersCount.textContent = `${new Set(analysis.playerRows.map((row) => row.athleteId)).size} atletas`;
  els.gameSplitPlayersTable.innerHTML = analysis.playerRows.length ? analysis.playerRows.map((row) => `
    <tr>
      <td>${avatarNameHtml(row)}</td>
      <td>${escapeHtml(row.position || "-")}</td>
      <td>${escapeHtml(row.segmentLabel || "Jogo")}</td>
      <td>${formatGameSplitNumber(Number(row.segmentMinutes) || 0, 0, "min")}</td>
      ${gameSplitMetrics.map((metric) => {
        const cell = row.metricsByKey[metric.key];
        return `
          <td title="Media do atleta: ${formatGameSplitNumber(cell.average, cell.meta.decimals, cell.meta.unit)}">${formatGameSplitNumber(cell.value, cell.meta.decimals, cell.meta.unit)}</td>
          <td><span class="game-split-pill ${cell.pctOfAverage >= 100 ? "up" : "down"}">${formatGameSplitPct(cell.pctOfAverage)}</span></td>
          <td title="Maximo do atleta neste recorte">${formatGameSplitNumber(cell.max, cell.meta.decimals, cell.meta.unit)}</td>
        `;
      }).join("")}
    </tr>
  `).join("") : `<tr><td colspan="22" class="empty">Nenhum atleta passou pelo filtro atual nesta data.</td></tr>`;

  if (!analysis.eligibleGames.length) {
    els.gameSplitNote.textContent = `Nenhum jogo atende ao filtro atual de minutos (${state.minMinutes}+) para o atleta selecionado. A tabela coletiva abaixo continua mostrando os atletas elegiveis da data.`;
    els.gameSplitTableCount.textContent = "0 linhas";
    els.gameSplitTable.innerHTML = `<tr><td colspan="14" class="empty">Sem jogos elegiveis para exibir.</td></tr>`;
    els.gameSplitSummaryNote.textContent = "Sem referencia";
    els.gameSplitSummary.innerHTML = `<div class="empty">Ajuste o filtro de minutos ou escolha outro atleta.</div>`;
    return;
  }

  els.gameSplitNote.textContent = `Referencia calculada com ${analysis.eligibleGames.length} jogo(s) elegivel(eis) do atleta no filtro atual. Sprint >25 km/h = VB6 + VB7. % V.max = velocidade maxima do recorte / pico de V.max do atleta.`;
  if (!analysis.selectedGame) {
    els.gameSplitNote.textContent += ` O atleta selecionado nao tem jogo elegivel em ${dateLabel(state.gameSplitDate)}, mas a tabela coletiva da data continua disponivel abaixo.`;
  }
  els.gameSplitTableCount.textContent = `${analysis.rows.filter((row) => row.item).length} linhas`;
  els.gameSplitTable.innerHTML = analysis.rows.map((row) => {
    if (!row.item) {
      return `<tr><td>${escapeHtml(row.label)}</td><td colspan="13" class="empty">Sem dados neste recorte.</td></tr>`;
    }
    return `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        <td title="Media do atleta: ${formatGameSplitNumber(row.minutesAverage, 0, "min")}">${formatGameSplitNumber(row.minutes, 0, "min")}</td>
        ${gameSplitMetrics.map((metric) => {
          const cell = row.metricsByKey[metric.key];
          return `
            <td title="Media do atleta: ${formatGameSplitNumber(cell.average, cell.meta.decimals, cell.meta.unit)}">${formatGameSplitNumber(cell.value, cell.meta.decimals, cell.meta.unit)}</td>
            <td><span class="game-split-pill ${cell.pctOfAverage >= 100 ? "up" : "down"}">${formatGameSplitPct(cell.pctOfAverage)}</span></td>
          `;
        }).join("")}
      </tr>
    `;
  }).join("");

  const selectedRows = analysis.rows.filter((row) => row.item);
  const strongestUp = selectedRows
    .flatMap((row) => gameSplitMetrics.map((metric) => ({
      row,
      metric,
      pct: row.metricsByKey[metric.key].pctOfAverage,
      value: row.metricsByKey[metric.key].value,
    })))
    .sort((a, b) => b.pct - a.pct)[0];
  const strongestDown = selectedRows
    .flatMap((row) => gameSplitMetrics.map((metric) => ({
      row,
      metric,
      pct: row.metricsByKey[metric.key].pctOfAverage,
      value: row.metricsByKey[metric.key].value,
    })))
    .sort((a, b) => a.pct - b.pct)[0];

  els.gameSplitSummaryNote.textContent = analysis.selectedGame ? dateLabel(analysis.selectedGame.date) : "Sem jogo";
  els.gameSplitSummary.innerHTML = `
    <article class="game-split-card">
      <strong>Minutos por recorte</strong>
      <p>${analysis.rows.filter((row) => row.item).map((row) => `${escapeHtml(row.label)}: ${formatGameSplitNumber(row.minutes, 0, "min")}`).join(" | ")}</p>
    </article>
    <article class="game-split-card">
      <strong>Maior acima da media</strong>
      <p>${strongestUp ? `${escapeHtml(strongestUp.row.label)} | ${strongestUp.metric.label}: ${formatGameSplitPct(strongestUp.pct)} (${formatGameSplitNumber(strongestUp.value, strongestUp.metric.decimals, strongestUp.metric.unit)})` : "Sem leitura"}</p>
    </article>
    <article class="game-split-card">
      <strong>Maior abaixo da media</strong>
      <p>${strongestDown ? `${escapeHtml(strongestDown.row.label)} | ${strongestDown.metric.label}: ${formatGameSplitPct(strongestDown.pct)} (${formatGameSplitNumber(strongestDown.value, strongestDown.metric.decimals, strongestDown.metric.unit)})` : "Sem leitura"}</p>
    </article>
    <article class="game-split-card">
      <strong>Contexto</strong>
      <p>O filtro global de minutos continua valendo para montar a media de referencia do atleta, enquanto a tabela mostra os valores absolutos do jogo escolhido.</p>
    </article>
  `;

}

function render() {
  renderActiveView();
  const athlete = getSelectedAthlete();
  const athleteEvents = getAthleteEvents();
  const enriched = rolling(athleteEvents);
  const comparisonSeries = buildComparisonSeries();
  const refEvents = athlete ? positionReference(athlete.position) : [];
  const athleteAverage = avg(athleteEvents, (event) => metricValue(event));
  const positionAverage = avg(refEvents, (event) => metricValue(event));
  const diff = positionAverage ? ((athleteAverage - positionAverage) / positionAverage) * 100 : 0;

  els.contextLabel.textContent = athlete ? `${athlete.position} - ${athlete.status}` : "Analise longitudinal";
  els.athleteTitle.textContent = athlete ? athlete.athlete : "Atleta";
  renderSelectedAthleteAvatar(athlete);
  els.gamesKpi.textContent = String(athleteEvents.length);
  els.athleteAvgKpi.textContent = formatMetric(athleteAverage);
  els.positionAvgKpi.textContent = formatMetric(positionAverage);
  els.diffKpi.textContent = `${diff >= 0 ? "+" : ""}${diff.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  els.diffKpi.style.color = diff >= 0 ? "var(--blue)" : "var(--red)";
  els.chartTitle.textContent = `${metricLabel()} por jogo`;
  els.chartSubtitle.textContent = `${state.loadMode === "density" ? "Densidade por minuto" : "Volume total"}; media movel de ${state.rollingWindow} jogos; referencia calculada na posicao ${athlete?.position || ""}.`;
  els.loadResultTitle.textContent = `${metricLabel()} - volume, densidade e resultante`;
  els.loadResultSubtitle.textContent = "Ultimos 10 jogos filtrados; volume = percentual do jogo do atleta; densidade = percentual da densidade do atleta; resultante = media entre os dois.";
  els.metricHeader.textContent = metricLabel();
  renderCompareChips();
  renderAlerts();

  renderChart(enriched, positionAverage, comparisonSeries);
  renderLoadResultChart(athleteEvents);
  renderRadar(athleteEvents, refEvents);
  renderBars();
  renderTable(enriched, positionAverage);
  renderGameSplit();
  renderClusters();
  renderRanking();
  renderCorrelation();
  renderDemand();
  renderExternalComparison();
  renderAvailability();
}

function renderActiveView() {
  els.viewTabs.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  els.longitudinalView.classList.toggle("active", state.view === "longitudinal");
  els.gameSplitView.classList.toggle("active", state.view === "gameSplit");
  els.clustersView.classList.toggle("active", state.view === "clusters");
  els.rankingView.classList.toggle("active", state.view === "ranking");
  els.correlationView.classList.toggle("active", state.view === "correlation");
  els.demandView.classList.toggle("active", state.view === "demand");
  els.externalView.classList.toggle("active", state.view === "external");
  els.availabilityView.classList.toggle("active", state.view === "availability");
  els.alertsView.classList.toggle("active", state.view === "alerts");
  els.writtenView.classList.toggle("active", state.view === "written");
}

function reportFilterSummary(viewId) {
  if (viewId === "ranking") {
    return [
      `Referencia: ${state.rankingScope === "position" ? "Posicao" : "Equipe"}`,
      `Posicao: ${state.rankingPosition === "all" ? "Todas" : state.rankingPosition}`,
      `Min. jogos: ${state.rankingMinGames}`,
      `Variaveis: ${visibleRankingMetrics().map((key) => rankingMetrics[key].label).join(", ")}`,
    ];
  }
  if (viewId === "longitudinal") {
    return [
      `Atleta: ${getSelectedAthlete()?.athlete || "Nao selecionado"}`,
      `Metrica: ${metricLabel()}`,
      `Modo: ${state.loadMode === "density" ? "Densidade" : "Volume"}`,
      `Janela: ${state.rollingWindow} jogos`,
    ];
  }
  if (viewId === "gameSplit") {
    return [
      `Atleta: ${getSelectedAthlete()?.athlete || "Nao selecionado"}`,
      `Jogo: ${state.gameSplitDate || "-"}`,
      `Min. filtro: ${state.minMinutes}`,
    ];
  }
  if (viewId === "availability") {
    return [
      `Periodo: ${state.availabilityStart || "-"} ate ${state.availabilityEnd || "-"}`,
      `Metrica: ${metrics[state.availabilityMetric]?.label || "-"}`,
    ];
  }
  if (viewId === "demand") {
    return [`Data foco: ${state.demandDate || "-"}`];
  }
  if (viewId === "alerts") {
    return [`Limite: ${state.alertThreshold} DP`, `Data ref.: ${state.alertDate || "-"}`];
  }
  return [];
}

function sanitizeReportClone(node) {
  const clone = node.cloneNode(true);
  clone.classList.remove("active");
  clone.querySelectorAll(".cluster-controls, .view-tabs, .report-builder, button, input, select, .template-link").forEach((element) => {
    element.remove();
  });
  clone.querySelectorAll(".table-wrap").forEach((wrap) => {
    wrap.style.maxHeight = "none";
    wrap.style.overflow = "visible";
  });
  clone.querySelectorAll("[id]").forEach((element) => {
    element.removeAttribute("id");
  });
  return clone.innerHTML;
}

function reportCoverLogoSvg() {
  return `
    <svg viewBox="0 0 120 140" aria-hidden="true">
      <defs>
        <linearGradient id="reportShield" x1="0" x2="1">
          <stop offset="0%" stop-color="#0b3f8a"></stop>
          <stop offset="100%" stop-color="#d71920"></stop>
        </linearGradient>
      </defs>
      <path d="M18 10h84v54c0 31-16 53-42 66C34 117 18 95 18 64z" fill="url(#reportShield)"></path>
      <path d="M28 20h64v40c0 24-11 41-32 53C39 101 28 84 28 60z" fill="#ffffff"></path>
      <path d="M28 20h21v84c-8-7-14-16-18-27-2-6-3-12-3-17z" fill="#0b3f8a"></path>
      <path d="M71 20h21v40c0 5-1 11-3 17-4 11-10 20-18 27z" fill="#d71920"></path>
      <text x="60" y="58" text-anchor="middle" font-size="28" font-weight="900" fill="#0b3f8a">FEC</text>
    </svg>`;
}

function buildReportHtml() {
  const selectedViews = reportViews.filter((view) => state.reportSelectedViews.includes(view.id));
  const generatedAt = meta.generatedAt
    ? new Date(meta.generatedAt).toLocaleString("pt-BR")
    : new Date().toLocaleString("pt-BR");
  const coverTabs = reportViews.map((view) => `
    <span class="report-tab-chip ${state.reportSelectedViews.includes(view.id) ? "is-selected" : ""}">${view.label}</span>
  `).join("");
  const pages = selectedViews.map((view, index) => {
    const source = document.querySelector(view.selector);
    const summary = reportFilterSummary(view.id);
    const content = source ? sanitizeReportClone(source) : `<div class="report-empty">Conteudo nao disponivel.</div>`;
    return `
      <section class="report-page">
        <header class="report-page-head">
          <div>
            <p class="report-page-kicker">Fortaleza Esporte Clube</p>
            <h2>${view.label}</h2>
            <p class="report-page-quadrant">${state.reportQuadrants[view.id] || view.defaultQuadrant}</p>
          </div>
          <span class="report-page-index">${String(index + 1).padStart(2, "0")}</span>
        </header>
        ${summary.length ? `<div class="report-summary-row">${summary.map((item) => `<span>${item}</span>`).join("")}</div>` : ""}
        <div class="report-section-content">${content}</div>
      </section>
    `;
  }).join("");
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(state.reportTitle)}</title>
        <style>
          :root {
            --report-blue: #0b3f8a;
            --report-red: #d71920;
            --report-ink: #111827;
            --report-muted: #647184;
            --report-line: #d7dfeb;
            --report-paper: #ffffff;
            --report-soft: #f4f7fb;
          }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Inter, "Segoe UI", Arial, sans-serif; color: var(--report-ink); background: #e9edf5; }
          .report-shell { width: 1120px; margin: 0 auto; padding: 24px 0 48px; }
          .report-cover, .report-page { background: var(--report-paper); border-radius: 18px; margin-bottom: 24px; padding: 36px; box-shadow: 0 24px 60px rgba(6, 27, 58, 0.12); page-break-after: always; }
          .report-cover { min-height: 1480px; position: relative; overflow: hidden; }
          .report-cover::before { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(11,63,138,0.92), rgba(215,25,32,0.9)); }
          .report-cover-inner { position: relative; z-index: 1; color: #ffffff; display: grid; gap: 24px; height: 100%; }
          .report-brand { display: flex; align-items: center; gap: 18px; }
          .report-brand-mark { width: 88px; height: 102px; }
          .report-brand-mark svg { width: 100%; height: 100%; display: block; }
          .report-cover h1 { margin: 0; font-size: 44px; line-height: 1.05; max-width: 720px; }
          .report-cover p { margin: 0; }
          .report-subtitle { font-size: 18px; color: rgba(255,255,255,0.84); max-width: 720px; }
          .report-meta { display: flex; gap: 12px; flex-wrap: wrap; }
          .report-meta span, .report-tab-chip { display: inline-flex; min-height: 32px; align-items: center; border-radius: 999px; padding: 0 14px; font-size: 12px; font-weight: 900; }
          .report-meta span { background: rgba(255,255,255,0.14); }
          .report-tabs-block { margin-top: 12px; display: grid; gap: 12px; }
          .report-tabs-grid { display: flex; flex-wrap: wrap; gap: 10px; }
          .report-tab-chip { background: rgba(255,255,255,0.16); color: rgba(255,255,255,0.72); }
          .report-tab-chip.is-selected { background: #ffffff; color: var(--report-blue); }
          .report-cover-legend { display: grid; gap: 8px; margin-top: auto; }
          .report-page { min-height: 1480px; padding-top: 30px; }
          .report-page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 16px; border-bottom: 3px solid var(--report-red); margin-bottom: 18px; }
          .report-page-kicker { margin: 0 0 8px; color: var(--report-red); font-size: 12px; font-weight: 900; text-transform: uppercase; }
          .report-page h2 { margin: 0; font-size: 28px; color: var(--report-blue); }
          .report-page-quadrant { margin-top: 8px; color: var(--report-muted); font-size: 15px; font-weight: 700; }
          .report-page-index { display: inline-flex; min-width: 48px; min-height: 48px; align-items: center; justify-content: center; border-radius: 14px; background: var(--report-soft); color: var(--report-blue); font-size: 18px; font-weight: 900; }
          .report-summary-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
          .report-summary-row span { display: inline-flex; min-height: 28px; align-items: center; border-radius: 999px; background: var(--report-soft); color: var(--report-blue); padding: 0 12px; font-size: 12px; font-weight: 800; }
          .report-section-content .cluster-toolbar .panel-head, .report-section-content .panel-head { align-items: flex-start; }
          .report-section-content .panel, .report-section-content .chart-panel, .report-section-content .kpi { box-shadow: none; border-color: var(--report-line); break-inside: avoid; }
          .report-section-content .view-panel { display: grid !important; gap: 18px; }
          .report-section-content .table-wrap, .report-section-content .ranking-heatmap, .report-section-content .correlation-matrix { overflow: visible !important; max-height: none !important; }
          .report-section-content table { width: 100%; border-collapse: collapse; }
          .report-section-content th, .report-section-content td { border-bottom: 1px solid #edf2f3; }
          .report-empty { padding: 28px; border: 1px dashed var(--report-line); border-radius: 12px; color: var(--report-muted); text-align: center; }
          @media print {
            body { background: #ffffff; }
            .report-shell { width: auto; margin: 0; padding: 0; }
            .report-cover, .report-page { box-shadow: none; margin: 0; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <main class="report-shell">
          <section class="report-cover">
            <div class="report-cover-inner">
              <div class="report-brand">
                <div class="report-brand-mark">${reportCoverLogoSvg()}</div>
                <div>
                  <p class="report-page-kicker" style="color:#ffffff;">Fortaleza Esporte Clube</p>
                  <h1>${escapeHtml(state.reportTitle)}</h1>
                </div>
              </div>
              <p class="report-subtitle">Relatorio personalizado gerado a partir do dashboard local de controle de carga, com identidade visual do Fortaleza e paginas configuradas por quadrante.</p>
              <div class="report-meta">
                <span>Gerado em ${generatedAt}</span>
                <span>${selectedViews.length} aba(s) selecionada(s)</span>
                <span>Base: ${escapeHtml(meta.eventStart || "-")} ate ${escapeHtml(meta.eventEnd || "-")}</span>
              </div>
              <div class="report-tabs-block">
                <h2 style="margin:0;font-size:22px;">Abas disponiveis</h2>
                <div class="report-tabs-grid">${coverTabs}</div>
              </div>
              <div class="report-cover-legend">
                <strong>Legenda da capa</strong>
                <p>As abas destacadas em branco serao incluídas no relatorio. Cada pagina seguinte mostra o quadrante definido no gerador e o estado atual dos dados exibidos no dashboard.</p>
              </div>
            </div>
          </section>
          ${pages}
        </main>
      </body>
    </html>
  `;
}

function buildAthleteDemandReportHtml() {
  const analysis = buildDemandAnalysis();
  const athleteHistory = analysis.analyses
    .filter((item) => item.athleteId === state.athleteId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = athleteHistory[athleteHistory.length - 1] || null;
  if (!latest) return null;

  const formatScore = (value) => Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const contributionRows = latest.contributions
    .slice()
    .sort((a, b) => Math.abs(b.weighted) - Math.abs(a.weighted))
    .slice(0, 4)
    .map((item) => `
      <li>
        <strong>${escapeHtml(metrics[item.metricKey]?.label || item.metricKey)}</strong>
        <span>${escapeHtml(formatMetric(item.value, item.metricKey, state.loadMode))} | ${item.zScore >= 0 ? "+" : ""}${item.zScore.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })} DP</span>
      </li>
    `).join("");
  const ewmaMetricRows = demandMetricOrder
    .map((metricKey) => ({
      metricKey,
      score: Number(latest.ewma?.metrics?.[metricKey]?.Score_EWMA4 ?? 50),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => `<span>${escapeHtml(metrics[item.metricKey]?.label || item.metricKey)} ${item.score.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>`)
    .join("");
  const acwrMetricRows = demandMetricOrder
    .map((metricKey) => ({
      metricKey,
      value: latest.ewma?.metrics?.[metricKey]?.EWMA_ACWR,
    }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => `<li>${escapeHtml(metrics[item.metricKey]?.label || item.metricKey)} <strong>${item.value.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</strong></li>`)
    .join("");
  const photo = latest.photoUrl
    ? `<img src="${escapeHtml(latest.photoUrl)}" alt="${escapeHtml(latest.athlete)}">`
    : `<div class="athlete-placeholder">${escapeHtml(initials(latest.athlete))}</div>`;
  const thresholdNote = latest.score < 75 && latest.score >= 70
    ? `<p class="threshold-note">Muito alta começa em 75</p>`
    : `<p class="threshold-note">Classificação: ${escapeHtml(latest.band.label)}</p>`;

  return `<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Indice de exigencia - ${escapeHtml(latest.athlete)}</title>
        <style>
          :root { --blue:#0b3f8a; --navy:#082d62; --red:#d71920; --gold:#facc15; --ink:#0c223f; --paper:#fff; }
          * { box-sizing:border-box; }
          body { margin:0; background:#dfe6ef; color:var(--ink); font-family:Inter,"Segoe UI",Arial,sans-serif; }
          .sheet { position:relative; width:1080px; min-height:1350px; margin:24px auto; overflow:hidden; background:#fff; box-shadow:0 24px 70px rgba(8,45,98,.2); }
          .top-stripe { height:42px; background:linear-gradient(90deg,var(--red) 0 26%,#fff 26% 28%,var(--blue) 28% 63%,var(--gold) 63% 64%,var(--navy) 64%); }
          .hero { position:relative; min-height:440px; padding:54px 54px 28px; overflow:hidden; }
          .hero::after { content:""; position:absolute; right:-100px; top:60px; width:520px; height:370px; background:linear-gradient(140deg,var(--blue),var(--navy)); transform:skewX(-18deg); z-index:0; }
          .brand { position:relative; z-index:2; width:76px; height:88px; }
          .brand svg { width:100%; height:100%; }
          h1 { position:relative; z-index:2; max-width:620px; margin:18px 0 0; color:var(--navy); font-size:56px; line-height:.98; text-transform:uppercase; letter-spacing:-1px; }
          h1 strong { display:block; color:var(--red); font-size:64px; }
          .game-date { position:relative; z-index:2; display:inline-flex; margin-top:24px; border-radius:10px; padding:12px 22px; background:var(--blue); color:#fff; font-size:22px; font-weight:900; }
          .athlete-photo { position:absolute; z-index:1; top:0; right:0; width:480px; height:455px; display:flex; align-items:flex-start; justify-content:center; overflow:hidden; }
          .athlete-photo img { width:100%; height:100%; object-fit:cover; object-position:center top; }
          .athlete-placeholder { display:grid; width:100%; height:100%; place-items:center; color:#fff; font-size:90px; font-weight:900; }
          .score-card { position:relative; z-index:3; width:590px; margin:-78px 0 0 42px; padding:24px 34px; border:3px solid var(--gold); border-radius:20px; background:var(--navy); color:#fff; box-shadow:0 18px 40px rgba(8,45,98,.25); }
          .score-card strong { color:var(--gold); font-size:48px; line-height:1; }
          .score-card b { margin-left:12px; font-size:31px; text-transform:uppercase; }
          .threshold-note { margin:14px 0 0; font-size:20px; font-weight:900; }
          .formula { margin:26px 42px 0; padding:18px 22px; border-radius:14px; background:var(--navy); color:#fff; text-align:center; }
          .formula h2 { margin:0 0 9px; font-size:25px; }
          .formula p { margin:0; border-radius:8px; padding:10px; background:#fff; color:var(--navy); font-size:21px; font-weight:900; }
          .cards { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; margin:26px 42px 0; }
          .card { min-height:415px; overflow:hidden; border:2px solid var(--gold); border-radius:18px; background:#fff; }
          .card header { min-height:100px; display:grid; place-items:center; padding:16px; background:linear-gradient(135deg,var(--blue),#155fc0); color:#fff; text-align:center; }
          .card.recent header { background:linear-gradient(135deg,var(--red),#ed1b2f); }
          .card h3 { margin:0; font-size:22px; line-height:1.2; text-transform:uppercase; }
          .card ul { display:grid; gap:16px; margin:0; padding:24px 24px 18px 42px; font-size:17px; line-height:1.3; }
          .card li::marker { color:var(--blue); }
          .card li strong,.card li span { display:block; }
          .card li span { margin-top:3px; }
          .metric-pills { display:flex; flex-wrap:wrap; gap:9px; padding:24px; }
          .metric-pills span { border-radius:999px; padding:8px 11px; background:#f2f6fb; color:var(--blue); font-size:14px; font-weight:900; }
          .card-copy { margin:0; padding:22px 24px 4px; font-size:18px; line-height:1.4; }
          .conclusion { display:grid; grid-template-columns:130px 1fr; gap:20px; align-items:center; margin-top:28px; padding:25px 48px 30px; background:var(--navy); color:#fff; }
          .conclusion .target { font-size:68px; text-align:center; }
          .conclusion h2 { margin:0 0 7px; color:var(--gold); font-size:28px; }
          .conclusion p { margin:0; font-size:20px; line-height:1.35; }
          .bottom-stripe { height:20px; background:linear-gradient(90deg,var(--blue) 0 35%,var(--gold) 35% 36%,var(--red) 36%); }
          @media print { @page { size:A4 portrait; margin:0; } body { background:#fff; } .sheet { width:210mm; min-height:297mm; margin:0; box-shadow:none; transform-origin:top left; } }
        </style>
      </head>
      <body>
        <main class="sheet">
          <div class="top-stripe"></div>
          <section class="hero">
            <div class="brand">${reportCoverLogoSvg()}</div>
            <h1>Indice de exigencia <strong>${escapeHtml(latest.athlete)}</strong></h1>
            <div class="game-date">Jogo de ${dateLabel(latest.date)}</div>
            <div class="athlete-photo">${photo}</div>
          </section>
          <section class="score-card">
            <strong>${formatScore(latest.score)} PONTOS</strong><b>${escapeHtml(latest.band.label)}</b>
            ${thresholdNote}
          </section>
          <section class="formula">
            <h2>FORMULA FINAL</h2>
            <p>60% JOGO + 20% CARGA RECENTE + 20% AGUDA/CRONICA</p>
          </section>
          <section class="cards">
            <article class="card">
              <header><h3>1. Demanda do jogo — ${formatScore(latest.gameScore)}</h3></header>
              <ul>${contributionRows}</ul>
            </article>
            <article class="card recent">
              <header><h3>2. Carga recente — ${formatScore(latest.recent4Score)}</h3></header>
              <p class="card-copy">EWMA de 4 dias comparada ao padrão individual do atleta.</p>
              <div class="metric-pills">${ewmaMetricRows}</div>
            </article>
            <article class="card">
              <header><h3>3. Aguda/cronica — ${formatScore(latest.acwrScore)}</h3></header>
              <p class="card-copy">EWMA de 7 dias em relação à EWMA de 28 dias.</p>
              <ul>${acwrMetricRows}</ul>
            </article>
          </section>
          <footer class="conclusion">
            <div class="target">&#127919;</div>
            <div>
              <h2>CONCLUSAO</h2>
              <p>O indice combina a exigencia do jogo com a carga acumulada recente. Para ${escapeHtml(latest.athlete)}, o resultado foi <strong>${formatScore(latest.score)} pontos</strong>, classificado como <strong>${escapeHtml(latest.band.label)}</strong>.</p>
            </div>
          </footer>
          <div class="bottom-stripe"></div>
        </main>
      </body>
    </html>`;
}

function generateCustomReport() {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    alert("Nao foi possivel abrir a janela do relatorio. Verifique se o navegador bloqueou pop-up.");
    return;
  }
  const athleteReportHtml = buildAthleteDemandReportHtml();
  if (!athleteReportHtml) {
    reportWindow.close();
    alert("O atleta selecionado nao possui jogo elegivel para gerar o relatorio de exigencia.");
    return;
  }
  const reportHtml = athleteReportHtml.replace("</body>", `
    <script>
      window.addEventListener("load", () => {
        window.focus();
        setTimeout(() => window.print(), 250);
      });
    <\/script>
  </body>`);
  reportWindow.document.open();
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
  els.reportBuilder.hidden = true;
}

function buildComparisonSeries() {
  return state.compareAthleteIds
    .map((athleteId, index) => {
      const athlete = athletes.find((item) => item.athleteId === athleteId);
      if (!athlete) return null;
      const items = rolling(events
        .filter((event) => event.athleteId === athleteId && baseFilter(event))
        .sort((a, b) => a.date.localeCompare(b.date)));
      return {
        athlete,
        items,
        color: compareColors[index % compareColors.length],
      };
    })
    .filter((series) => series && series.items.length);
}

function renderChart(items, reference, comparisonSeries = []) {
  if (!items.length) {
    els.chart.innerHTML = `<div class="empty">Sem jogos para este filtro.</div>`;
    return;
  }

  const width = 980;
  const height = 378;
  const margin = { top: 24, right: 28, bottom: 48, left: 64 };
  const comparisonValues = comparisonSeries.flatMap((series) => series.items.map((item) => item.metricDisplayValue));
  const values = items.flatMap((item) => [item.metricDisplayValue, item.rollingValue, reference]).concat(comparisonValues).filter(Number.isFinite);
  const allDates = Array.from(new Set(items.map((item) => item.date).concat(comparisonSeries.flatMap((series) => series.items.map((item) => item.date))))).sort();
  const dateIndex = new Map(allDates.map((date, index) => [date, index]));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const pad = (max - min) * 0.12 || 1;
  const yMin = Math.max(0, min - pad);
  const yMax = max + pad;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = (index) => margin.left + (allDates.length === 1 ? innerW / 2 : (index / (allDates.length - 1)) * innerW);
  const xDate = (date) => x(dateIndex.get(date) || 0);
  const y = (value) => margin.top + innerH - ((value - yMin) / (yMax - yMin)) * innerH;
  const line = (getter) => items.map((item, index) => `${index === 0 ? "M" : "L"} ${xDate(item.date).toFixed(2)} ${y(getter(item)).toFixed(2)}`).join(" ");
  const grid = [0, 0.25, 0.5, 0.75, 1].map((step) => {
    const gy = margin.top + innerH * step;
    const value = yMax - (yMax - yMin) * step;
    return `<line class="grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${gy}" y2="${gy}"></line>
      <text x="${margin.left - 10}" y="${gy + 4}" text-anchor="end">${formatMetric(value).replace(` ${metricUnit()}`, "")}</text>`;
  }).join("");
  const labels = pickLabels(allDates.map((date) => ({ date }))).map(({ item }) =>
    `<text x="${xDate(item.date)}" y="${height - 15}" text-anchor="middle">${shortDate(item.date)}</text>`
  ).join("");
  const points = items.map((item, index) =>
    `<circle class="point" cx="${xDate(item.date)}" cy="${y(item.metricDisplayValue)}" r="4"><title>${dateLabel(item.date)} - ${formatMetric(item.metricDisplayValue)}</title></circle>`
  ).join("");
  const refLine = Number.isFinite(reference)
    ? `<line class="reference-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y(reference)}" y2="${y(reference)}"></line>`
    : "";
  const comparisonLines = comparisonSeries.map((series) => {
    const path = series.items.map((item, index) =>
      `${index === 0 ? "M" : "L"} ${xDate(item.date).toFixed(2)} ${y(item.metricDisplayValue).toFixed(2)}`
    ).join(" ");
    const points = series.items.map((item, index) =>
      `<circle class="compare-point" cx="${xDate(item.date)}" cy="${y(item.metricDisplayValue)}" r="3" fill="${series.color}"><title>${series.athlete.athlete} | ${dateLabel(item.date)} - ${formatMetric(item.metricDisplayValue)}</title></circle>`
    ).join("");
    return `<path class="compare-line" d="${path}" style="stroke:${series.color}"></path>${points}`;
  }).join("");

  els.chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <g class="axis">${grid}${labels}</g>
      ${refLine}
      ${comparisonLines}
      <path class="raw-line" d="${line((item) => item.metricDisplayValue)}"></path>
      <path class="rolling-line" d="${line((item) => item.rollingValue)}"></path>
      ${points}
    </svg>`;
}

function renderLoadResultChart(athleteEvents) {
  const items = buildLoadResultSeries(athleteEvents);
  if (!items.length) {
    els.loadResultChart.innerHTML = `<div class="empty">Sem jogos para este filtro.</div>`;
    return;
  }

  const width = 980;
  const height = 320;
  const margin = { top: 24, right: 28, bottom: 48, left: 64 };
  const values = items.flatMap((item) => [item.volumePct, item.densityPct, item.resultPct]).filter(Number.isFinite);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const pad = (max - min) * 0.12 || 10;
  const yMin = Math.max(0, min - pad);
  const yMax = max + pad;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = (index) => margin.left + (items.length === 1 ? innerW / 2 : (index / (items.length - 1)) * innerW);
  const y = (value) => margin.top + innerH - ((value - yMin) / (yMax - yMin)) * innerH;
  const line = (key) => items.map((item, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(item[key]).toFixed(2)}`).join(" ");
  const grid = [0, 0.25, 0.5, 0.75, 1].map((step) => {
    const gy = margin.top + innerH * step;
    const value = yMax - (yMax - yMin) * step;
    return `<line class="grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${gy}" y2="${gy}"></line>
      <text x="${margin.left - 10}" y="${gy + 4}" text-anchor="end">${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</text>`;
  }).join("");
  const labels = pickLabels(items).map(({ item, index }) =>
    `<text x="${x(index)}" y="${height - 15}" text-anchor="middle">${shortDate(item.date)}</text>`
  ).join("");
  const dots = (key, cssClass, formatterLabel) => items.map((item, index) =>
    `<circle class="${cssClass}" cx="${x(index)}" cy="${y(item[key])}" r="4"><title>${dateLabel(item.date)} - ${formatterLabel}: ${item[key].toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%</title></circle>`
  ).join("");

  els.loadResultChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <g class="axis">${grid}${labels}</g>
      <path class="result-volume-line" d="${line("volumePct")}"></path>
      <path class="result-density-line" d="${line("densityPct")}"></path>
      <path class="result-total-line" d="${line("resultPct")}"></path>
      ${dots("volumePct", "result-volume-point", "Volume")}
      ${dots("densityPct", "result-density-point", "Densidade")}
      ${dots("resultPct", "result-total-point", "Resultante")}
    </svg>`;
}

function pickLabels(items) {
  if (items.length <= 6) return items.map((item, index) => ({ item, index }));
  const last = items.length - 1;
  const indexes = new Set([0, Math.round(last * 0.25), Math.round(last * 0.5), Math.round(last * 0.75), last]);
  return Array.from(indexes).sort((a, b) => a - b).map((index) => ({ item: items[index], index }));
}

function shortDate(value) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}`;
}

function dateLabel(value) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function renderBars() {
  const grouped = new Map();
  for (const event of events.filter(baseFilter)) {
    if (!grouped.has(event.position)) grouped.set(event.position, []);
    grouped.get(event.position).push(event);
  }
  const rows = Array.from(grouped.entries())
    .map(([position, items]) => ({
      position,
      value: avg(items, (event) => metricValue(event)),
      count: items.length,
    }))
    .sort((a, b) => b.value - a.value);
  const max = Math.max(...rows.map((row) => row.value), 1);
  els.referenceNote.textContent = `${rows.reduce((sum, row) => sum + row.count, 0)} jogos-atleta`;
  els.positionBars.innerHTML = rows.map((row) => `
    <div class="bar-row">
      <div class="bar-label">${row.position}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(row.value / max) * 100}%"></div></div>
      <div class="bar-value">${formatMetric(row.value)}</div>
    </div>
  `).join("");
}

function renderRadar(athleteEvents, refEvents) {
  if (!athleteEvents.length || !refEvents.length) {
    els.radarNote.textContent = "Sem dados";
    els.radarChart.innerHTML = `<div class="empty">Sem jogos suficientes para o radar.</div>`;
    return;
  }

  const athleteValues = radarMetrics.map((key) => avg(athleteEvents, (event) => metricValue(event, key)));
  const positionValues = radarMetrics.map((key) => avg(refEvents, (event) => metricValue(event, key)));
  const ratios = athleteValues.map((value, index) => {
    const reference = positionValues[index];
    return reference > 0 ? (value / reference) * 100 : 0;
  });
  const scaleMax = Math.max(125, Math.ceil(Math.max(...ratios, 100) / 25) * 25);
  const width = 430;
  const height = 330;
  const cx = width / 2;
  const cy = 158;
  const radius = 104;
  const levels = [0.25, 0.5, 0.75, 1];
  const angleFor = (index) => -Math.PI / 2 + (index / radarMetrics.length) * Math.PI * 2;
  const point = (index, valuePercent) => {
    const capped = Math.max(0, Math.min(valuePercent, scaleMax));
    const r = (capped / scaleMax) * radius;
    const angle = angleFor(index);
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  const polygon = (values) => values
    .map((value, index) => point(index, value).map((number) => number.toFixed(2)).join(","))
    .join(" ");
  const rings = levels.map((level) =>
    `<polygon class="radar-ring" points="${polygon(radarMetrics.map(() => scaleMax * level))}"></polygon>`
  ).join("");
  const axis = radarMetrics.map((key, index) => {
    const [x2, y2] = point(index, scaleMax);
    const angle = angleFor(index);
    const labelRadius = radius + 38;
    const lx = cx + Math.cos(angle) * labelRadius;
    const ly = cy + Math.sin(angle) * labelRadius;
    const anchor = Math.abs(Math.cos(angle)) < 0.2 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
    const percent = ratios[index].toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    return `
      <line class="radar-axis" x1="${cx}" y1="${cy}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"></line>
      <text class="radar-label" x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" text-anchor="${anchor}">
        <tspan x="${lx.toFixed(2)}">${metricLabel(key)}</tspan>
        <tspan x="${lx.toFixed(2)}" dy="14">${percent}%</tspan>
      </text>`;
  }).join("");
  const athletePolygon = polygon(ratios);
  const positionPolygon = polygon(radarMetrics.map(() => 100));
  const averageRatio = avg(ratios, (value) => value);

  els.radarNote.textContent = `${averageRatio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% da posicao`;
  els.radarChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      ${rings}
      ${axis}
      <polygon class="radar-position" points="${positionPolygon}"></polygon>
      <polygon class="radar-athlete" points="${athletePolygon}"></polygon>
      ${ratios.map((value, index) => {
        const [x, y] = point(index, value);
        return `<circle class="radar-point" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4"></circle>`;
      }).join("")}
      <text class="radar-scale" x="${cx}" y="${cy + radius + 34}" text-anchor="middle">Posicao = 100% | escala ate ${scaleMax}%</text>
    </svg>`;
}

function buildAthleteProfiles(minGames = state.clusterMinGames, mode = state.loadMode, options = {}) {
  const metricKeys = options.metricKeys || radarMetrics;
  const grouped = new Map();
  for (const event of events.filter((item) => passesLoadFilter(item, options))) {
    if (!grouped.has(event.athleteId)) grouped.set(event.athleteId, []);
    grouped.get(event.athleteId).push(event);
  }
  return Array.from(grouped.entries())
    .map(([athleteId, items]) => {
      const first = items[0];
      const profile = {
        athleteId,
        athlete: first.athlete,
        position: first.position,
        status: first.status,
        photoUrl: first.photoUrl,
        games: items.length,
      };
      for (const key of metricKeys) {
        profile[key] = avg(items, (event) => metricValue(event, key, mode));
      }
      return profile;
    })
    .filter((profile) => profile.games >= minGames)
    .sort((a, b) => a.athlete.localeCompare(b.athlete, "pt-BR"));
}

function standardizeProfiles(profiles) {
  const means = radarMetrics.map((key) => avg(profiles, (profile) => profile[key]));
  const deviations = radarMetrics.map((key, index) => {
    const variance = avg(profiles, (profile) => (profile[key] - means[index]) ** 2);
    return Math.sqrt(variance) || 1;
  });
  return profiles.map((profile) => ({
    ...profile,
    vector: radarMetrics.map((key, index) => (profile[key] - means[index]) / deviations[index]),
  }));
}

function distanceSquared(a, b) {
  return a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0);
}

function runKMeans(points, requestedK) {
  const k = Math.max(1, Math.min(requestedK, points.length));
  const ranked = points
    .slice()
    .sort((a, b) => a.vector.reduce((sum, value) => sum + value, 0) - b.vector.reduce((sum, value) => sum + value, 0));
  let centroids = Array.from({ length: k }, (_, index) => {
    const pick = Math.round((index / Math.max(1, k - 1)) * (ranked.length - 1));
    return ranked[pick].vector.slice();
  });

  for (let iteration = 0; iteration < 60; iteration++) {
    let changed = false;
    for (const point of points) {
      const nextCluster = centroids
        .map((centroid, index) => ({ index, distance: distanceSquared(point.vector, centroid) }))
        .sort((a, b) => a.distance - b.distance)[0].index;
      if (point.cluster !== nextCluster) changed = true;
      point.cluster = nextCluster;
    }
    centroids = centroids.map((centroid, index) => {
      const members = points.filter((point) => point.cluster === index);
      if (!members.length) return centroid;
      return radarMetrics.map((_, metricIndex) => avg(members, (point) => point.vector[metricIndex]));
    });
    if (!changed) break;
  }

  return { points, centroids, k };
}

function clusterSummary(points) {
  const groups = new Map();
  const overall = {
    totalDistance: avg(points, (point) => point.totalDistance),
    highIntensityMeters: avg(points, (point) => point.highIntensityMeters),
    fmpHighMin: avg(points, (point) => point.fmpHighMin),
    sprintMeters: avg(points, (point) => point.sprintMeters),
    explosiveActions: avg(points, (point) => point.explosiveActions),
    rhieBouts: avg(points, (point) => point.rhieBouts),
    fmpRunningHighMin: avg(points, (point) => point.fmpRunningHighMin),
  };
  for (const point of points) {
    if (!groups.has(point.cluster)) groups.set(point.cluster, []);
    groups.get(point.cluster).push(point);
  }
  return Array.from(groups.entries())
    .map(([cluster, members]) => {
      const summary = {
        cluster,
        members,
        count: members.length,
        totalDistance: avg(members, (member) => member.totalDistance),
        highIntensityMeters: avg(members, (member) => member.highIntensityMeters),
        fmpHighMin: avg(members, (member) => member.fmpHighMin),
        sprintMeters: avg(members, (member) => member.sprintMeters),
        explosiveActions: avg(members, (member) => member.explosiveActions),
        rhieBouts: avg(members, (member) => member.rhieBouts),
        fmpRunningHighMin: avg(members, (member) => member.fmpRunningHighMin),
        games: avg(members, (member) => member.games),
      };
      summary.traits = describeClusterTraits(summary, overall);
      return summary;
    })
    .sort((a, b) => a.cluster - b.cluster);
}

function levelText(value, reference, highWord = "alta", lowWord = "baixa") {
  const ratio = reference > 0 ? value / reference : 1;
  if (ratio >= 1.12) return highWord;
  if (ratio <= 0.88) return lowWord;
  return "media";
}

function describeClusterTraits(summary, overall) {
  const resistanceLevel = levelText((summary.totalDistance + summary.fmpHighMin * 420) / 2, (overall.totalDistance + overall.fmpHighMin * 420) / 2);
  const highIntensityLevel = levelText(summary.highIntensityMeters, overall.highIntensityMeters, "alta", "baixa");
  const sprintLevel = levelText(summary.sprintMeters, overall.sprintMeters, "alto", "baixo");
  const explosiveLevel = levelText(summary.explosiveActions, overall.explosiveActions, "alta", "baixa");
  const metabolicLevel = levelText(summary.fmpHighMin, overall.fmpHighMin, "alta", "baixa");
  const titleParts = [];

  titleParts.push(`Resistencia ${resistanceLevel}`);
  if (highIntensityLevel !== "media") titleParts.push(`alta intensidade ${highIntensityLevel}`);
  if (titleParts.length < 2 && sprintLevel !== "media") titleParts.push(`sprint ${sprintLevel}`);
  if (titleParts.length < 2 && explosiveLevel !== "media") titleParts.push(`acoes explosivas ${explosiveLevel}`);
  if (titleParts.length < 2 && metabolicLevel !== "media") titleParts.push(`carga metabolica ${metabolicLevel}`);
  if (!titleParts.length) titleParts.push("Perfil equilibrado");

  const notes = [
    `Resistencia ${resistanceLevel}`,
    `alta intensidade ${highIntensityLevel}`,
    `sprint ${sprintLevel}`,
    `acoes explosivas ${explosiveLevel}`,
    `carga metabolica ${metabolicLevel}`,
  ];

  return {
    title: titleParts.join(" e "),
    notes: notes.join(" | "),
  };
}

function renderClusters() {
  const profiles = buildAthleteProfiles();
  if (profiles.length < 2) {
    els.clusterMapNote.textContent = "Sem dados";
    els.clusterSummaryNote.textContent = "";
    els.clusterScatter.innerHTML = `<div class="empty">Poucos atletas para agrupar.</div>`;
    els.clusterCards.innerHTML = "";
    els.clusterTable.innerHTML = `<tr><td colspan="11" class="empty">Sem dados para exibir.</td></tr>`;
    els.clusterTableCount.textContent = "0 atletas";
    return;
  }

  const normalized = standardizeProfiles(profiles);
  const result = runKMeans(normalized, state.clusterCount);
  const summaries = clusterSummary(result.points);

  els.clusterMapNote.textContent = `${result.points.length} atletas | k=${result.k}`;
  els.clusterSummaryNote.textContent = `${state.loadMode === "density" ? "densidade por minuto" : "volume total"} | min. ${state.clusterMinGames} jogos`;
  els.clusterModeNote.textContent = `O agrupamento usa ${state.loadMode === "density" ? "densidades por minuto" : "medias de volume"} por atleta nas metricas do radar, padronizadas por z-score.`;
  renderClusterScatter(result.points, summaries);
  renderClusterCards(summaries);
  renderClusterTable(result.points, summaries);
}

function renderClusterScatter(points, summaries) {
  const width = 760;
  const height = 360;
  const margin = { top: 24, right: 28, bottom: 52, left: 56 };
  const xIndex = radarMetrics.indexOf("totalDistance");
  const yIndex = radarMetrics.indexOf("sprintMeters");
  const xs = points.map((point) => point.vector[xIndex]);
  const ys = points.map((point) => point.vector[yIndex]);
  const xMin = Math.min(...xs) - 0.4;
  const xMax = Math.max(...xs) + 0.4;
  const yMin = Math.min(...ys) - 0.4;
  const yMax = Math.max(...ys) + 0.4;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = (value) => margin.left + ((value - xMin) / Math.max(0.01, xMax - xMin)) * innerW;
  const y = (value) => margin.top + innerH - ((value - yMin) / Math.max(0.01, yMax - yMin)) * innerH;
  const pointsSvg = points.map((point) => {
    const color = clusterColors[point.cluster % clusterColors.length];
    const trait = summaries.find((summary) => summary.cluster === point.cluster)?.traits.title || `Grupo ${point.cluster + 1}`;
    const px = x(point.vector[xIndex]);
    const py = y(point.vector[yIndex]);
    return `<g>
      <circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="7" fill="${color}" opacity="0.86"></circle>
      <text class="cluster-dot-label" x="${(px + 10).toFixed(2)}" y="${(py + 4).toFixed(2)}">${point.athlete}</text>
      <title>Grupo ${point.cluster + 1}: ${trait} | ${point.athlete} | ${point.position}</title>
    </g>`;
  }).join("");

  els.clusterScatter.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <line class="grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y(0)}" y2="${y(0)}"></line>
      <line class="grid-line" x1="${x(0)}" x2="${x(0)}" y1="${margin.top}" y2="${height - margin.bottom}"></line>
      ${pointsSvg}
      <text class="axis-title" x="${width / 2}" y="${height - 14}" text-anchor="middle">Total Distance padronizado</text>
      <text class="axis-title" x="16" y="${height / 2}" text-anchor="middle" transform="rotate(-90 16 ${height / 2})">Sprint padronizado</text>
    </svg>`;
}

function renderClusterCards(summaries) {
  els.clusterCards.innerHTML = summaries.map((summary) => {
    const color = clusterColors[summary.cluster % clusterColors.length];
    const topPositions = Array.from(summary.members.reduce((map, member) => {
      map.set(member.position, (map.get(member.position) || 0) + 1);
      return map;
    }, new Map()).entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([position, count]) => `${position} (${count})`)
      .join(", ");
    return `
      <article class="cluster-card" style="--cluster-color:${color}">
        <div>
          <span>Grupo ${summary.cluster + 1}</span>
          <strong>${summary.count} atletas</strong>
        </div>
        <h4>${summary.traits.title}</h4>
        <p>${summary.traits.notes}</p>
        <p>${topPositions || "Sem posicao dominante"}</p>
        <dl>
          <div><dt>Total Dist.</dt><dd>${formatMetric(summary.totalDistance, "totalDistance")}</dd></div>
          <div><dt>Alta int.</dt><dd>${formatMetric(summary.highIntensityMeters, "highIntensityMeters")}</dd></div>
          <div><dt>FMP High</dt><dd>${formatMetric(summary.fmpHighMin, "fmpHighMin")}</dd></div>
          <div><dt>Sprint</dt><dd>${formatMetric(summary.sprintMeters, "sprintMeters")}</dd></div>
          <div><dt>Acoes expl.</dt><dd>${formatMetric(summary.explosiveActions, "explosiveActions")}</dd></div>
          <div><dt>RHIE</dt><dd>${formatMetric(summary.rhieBouts, "rhieBouts")}</dd></div>
          <div><dt>FMP Run High</dt><dd>${formatMetric(summary.fmpRunningHighMin, "fmpRunningHighMin")}</dd></div>
        </dl>
      </article>`;
  }).join("");
}

function renderClusterTable(points, summaries) {
  const traitByCluster = new Map(summaries.map((summary) => [summary.cluster, summary.traits.title]));
  const rows = points.slice().sort((a, b) => a.cluster - b.cluster || a.athlete.localeCompare(b.athlete, "pt-BR"));
  els.clusterTableCount.textContent = `${rows.length} atletas`;
  els.clusterTable.innerHTML = rows.map((point) => `
    <tr>
      <td><span class="cluster-badge" title="${traitByCluster.get(point.cluster)}" style="--cluster-color:${clusterColors[point.cluster % clusterColors.length]}">G${point.cluster + 1}</span></td>
      <td>${avatarNameHtml(point)}</td>
      <td>${point.position}</td>
      <td>${point.games}</td>
      <td>${formatMetric(point.totalDistance, "totalDistance")}</td>
      <td>${formatMetric(point.highIntensityMeters, "highIntensityMeters")}</td>
      <td>${formatMetric(point.fmpHighMin, "fmpHighMin")}</td>
      <td>${formatMetric(point.sprintMeters, "sprintMeters")}</td>
      <td>${formatMetric(point.explosiveActions, "explosiveActions")}</td>
      <td>${formatMetric(point.rhieBouts, "rhieBouts")}</td>
      <td>${formatMetric(point.fmpRunningHighMin, "fmpRunningHighMin")}</td>
    </tr>
  `).join("");
}

function renderTable(items, reference) {
  els.tableCount.textContent = `${items.length} linhas`;
  if (!items.length) {
    els.eventsTable.innerHTML = `<tr><td colspan="5" class="empty">Sem dados para exibir.</td></tr>`;
    return;
  }
  els.eventsTable.innerHTML = items.slice().reverse().map((item) => `
    <tr>
      <td>${dateLabel(item.date)}</td>
      <td>${item.minutes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>
      <td>${formatMetric(item.metricDisplayValue)}</td>
      <td>${formatMetric(item.rollingValue)}</td>
      <td>${formatMetric(reference)}</td>
    </tr>
  `).join("");
}


function percentileValue(value, sortedValues) {
  if (!sortedValues.length) return 0;
  if (sortedValues.length === 1) return 100;
  let below = 0;
  let equal = 0;
  for (const item of sortedValues) {
    if (item < value) below += 1;
    else if (item === value) equal += 1;
  }
  return ((below + 0.5 * equal) / sortedValues.length) * 100;
}


function buildRankingRows() {
  const visibleMetrics = visibleRankingMetrics();
  const profiles = buildAthleteProfiles(state.rankingMinGames, "volume", { metricKeys: visibleMetrics });
  const fallbackProfiles = state.activeOnly
    ? buildAthleteProfiles(state.rankingMinGames, "volume", { ignoreActive: true, metricKeys: visibleMetrics })
    : profiles;
  return profiles.map((profile) => {
    let reference = state.rankingScope === "position"
      ? profiles.filter((item) => item.position === profile.position)
      : profiles;
    let referenceLabel = state.rankingScope === "position" ? "posicao" : "equipe";
    let referenceAdjusted = false;
    if (state.rankingScope === "position" && reference.length < 2) {
      const fallbackPosition = fallbackProfiles.filter((item) => item.position === profile.position);
      if (fallbackPosition.length >= 2) {
        reference = fallbackPosition;
        referenceLabel = "posicao ampliada";
        referenceAdjusted = true;
      } else if (fallbackProfiles.length >= 2) {
        reference = fallbackProfiles;
        referenceLabel = "equipe ampliada";
        referenceAdjusted = true;
      }
    }
    const percentiles = {};
    for (const key of visibleMetrics) {
      const sorted = reference.map((item) => item[key]).sort((a, b) => a - b);
      percentiles[key] = percentileValue(profile[key], sorted);
    }
    const averagePercentile = avg(visibleMetrics, (key) => percentiles[key]);
    return { ...profile, percentiles, averagePercentile, referenceCount: reference.length, referenceLabel, referenceAdjusted };
  }).filter((profile) => state.rankingPosition === "all" || profile.position === state.rankingPosition).sort((a, b) => {
    const key = state.rankingSort;
    const av = key === "averagePercentile" ? a.averagePercentile : a.percentiles[key];
    const bv = key === "averagePercentile" ? b.averagePercentile : b.percentiles[key];
    return bv - av || a.athlete.localeCompare(b.athlete, "pt-BR");
  });
}

function limitedRankingRows(rows) {
  if (state.rankingLimit === "all") return rows;
  return rows.slice(0, Number(state.rankingLimit));
}

function heatColor(value) {
  const pct = Math.max(0, Math.min(100, value));
  if (pct < 50) {
    const t = pct / 50;
    return blendColor([215, 25, 32], [255, 255, 255], t);
  }
  return blendColor([255, 255, 255], [11, 63, 138], (pct - 50) / 50);
}

function blendColor(a, b, t) {
  const rgb = a.map((value, index) => Math.round(value + (b[index] - value) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function renderRankingHeatmap(rows) {
  const visibleMetrics = visibleRankingMetrics();
  const visibleRows = limitedRankingRows(rows);
  if (!visibleRows.length) {
    els.rankingHeatmapNote.textContent = "0 atletas";
    els.rankingHeatmap.innerHTML = `<div class="empty">Sem dados para exibir.</div>`;
    return;
  }
  const adjustedCount = rows.filter((row) => row.referenceAdjusted).length;
  els.rankingHeatmapNote.textContent = adjustedCount
    ? `${visibleRows.length} de ${rows.length} atletas | ${adjustedCount} com referencia ampliada por amostra insuficiente`
    : `${visibleRows.length} de ${rows.length} atletas`;
  els.rankingHeatmap.innerHTML = `
    <div class="heatmap-grid" style="--metric-count:${visibleMetrics.length}">
      <div class="heatmap-corner">Atleta</div>
      ${visibleMetrics.map((key) => `<div class="heatmap-header">${rankingMetricShortLabels[key]}</div>`).join("")}
      ${visibleRows.map((row) => `
        <div class="heatmap-athlete">${avatarNameHtml(row)}<span>${row.position}</span></div>
        ${visibleMetrics.map((key) => {
          const value = row.percentiles[key];
          return `<div class="heat-cell" style="background:${heatColor(value)}; color:${value >= 72 || value <= 24 ? '#ffffff' : 'var(--ink)'}" title="${row.athlete} | ${rankingMetrics[key].label}: P${Math.round(value)} | ${formatRankingValue(row[key], key)}">P${Math.round(value)}</div>`;
        }).join("")}
      `).join("")}
    </div>
    <div class="heatmap-legend"><span>Baixo</span><i></i><span>Alto</span></div>`;
}

function renderRanking() {
  const visibleMetrics = visibleRankingMetrics();
  const rows = buildRankingRows();
  const headerCells = [
    "<th>#</th>",
    "<th>Atleta</th>",
    "<th>Posicao</th>",
    "<th>Jogos</th>",
    "<th>Media %</th>",
    ...visibleMetrics.map((key) => `<th>${rankingMetricShortLabels[key]}</th>`),
  ];
  els.rankingTableHead.innerHTML = `<tr>${headerCells.join("")}</tr>`;
  if (!rows.length) {
    els.rankingAthletesKpi.textContent = "0";
    els.rankingScopeKpi.textContent = state.rankingScope === "position" ? "Posicao" : "Equipe";
    els.rankingMetricKpi.textContent = "Media";
    els.rankingTableCount.textContent = "0 atletas";
    els.rankingTable.innerHTML = `<tr><td colspan="${5 + visibleMetrics.length}" class="empty">Sem dados para exibir.</td></tr>`;
    renderRankingHeatmap(rows);
    return;
  }

  els.rankingAthletesKpi.textContent = String(rows.length);
  els.rankingScopeKpi.textContent = state.rankingScope === "position" ? `Posicao${state.rankingPosition !== "all" ? `: ${state.rankingPosition}` : ""}` : `Equipe${state.rankingPosition !== "all" ? ` | ${state.rankingPosition}` : ""}`;
  els.rankingMetricKpi.textContent = state.rankingSort === "averagePercentile" ? "Media" : rankingMetrics[state.rankingSort].label;
  els.rankingTableCount.textContent = `${rows.length} atletas`;
  renderRankingHeatmap(rows);

  const pct = (value) => value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  els.rankingTable.innerHTML = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${avatarNameHtml(row)}</td>
      <td>${row.position}</td>
      <td>${row.games}</td>
      <td><span class="percentile-pill">P${pct(row.averagePercentile)}</span></td>
      ${visibleMetrics.map((key) => `<td title="${row.athlete} | ${rankingMetrics[key].label}: P${pct(row.percentiles[key])} | ${formatRankingValue(row[key], key)}">P${pct(row.percentiles[key])}</td>`).join("")}
    </tr>
  `).join("");
}


function availabilityRowsInRange() {
  const start = state.availabilityStart || "0000-01-01";
  const end = state.availabilityEnd || "9999-12-31";
  return availability.filter((item) => passesActiveFilter(item) && item.date >= start && item.date <= end);
}

function groupedCounts(items, getter) {
  const counts = new Map();
  for (const item of items) {
    const key = getter(item) || "Sem grupo";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
}

function buildDailyAvailability(rows) {
  const byDate = new Map();
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, { date: row.date, total: 0, available: 0, dm: 0 });
    const day = byDate.get(row.date);
    day.total += 1;
    if (row.available) day.available += 1;
    else day.dm += 1;
  }
  return Array.from(byDate.values())
    .map((day) => ({ ...day, rate: day.total ? (day.available / day.total) * 100 : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function renderAvailabilityChart(days) {
  if (!days.length) {
    els.availabilityChartNote.textContent = "Sem dados";
    els.availabilityChart.innerHTML = `<div class="empty">Sem dados para este periodo.</div>`;
    return;
  }
  const width = 980;
  const height = 320;
  const margin = { top: 24, right: 28, bottom: 48, left: 58 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = (index) => margin.left + (days.length === 1 ? innerW / 2 : (index / (days.length - 1)) * innerW);
  const y = (value) => margin.top + innerH - (value / 100) * innerH;
  const line = days.map((day, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(day.rate).toFixed(2)}`).join(" ");
  const bars = days.map((day, index) => {
    const barW = Math.max(3, Math.min(16, innerW / Math.max(1, days.length) - 2));
    const px = x(index) - barW / 2;
    const py = y(day.rate);
    return `<rect class="availability-bar" x="${px.toFixed(2)}" y="${py.toFixed(2)}" width="${barW.toFixed(2)}" height="${(height - margin.bottom - py).toFixed(2)}"><title>${dateLabel(day.date)} - ${day.rate.toFixed(0)}% disponivel | DM: ${day.dm}</title></rect>`;
  }).join("");
  const labels = pickLabels(days).map(({ item, index }) =>
    `<text x="${x(index)}" y="${height - 15}" text-anchor="middle">${shortDate(item.date)}</text>`
  ).join("");
  const grid = [0, 25, 50, 75, 100].map((value) => {
    const gy = y(value);
    return `<line class="grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${gy}" y2="${gy}"></line>
      <text x="${margin.left - 10}" y="${gy + 4}" text-anchor="end">${value}%</text>`;
  }).join("");
  els.availabilityChartNote.textContent = `${days.length} dias`;
  els.availabilityChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <g class="axis">${grid}${labels}</g>
      ${bars}
      <path class="availability-line" d="${line}"></path>
    </svg>`;
}

function renderAvailabilityGroups(rows) {
  const counts = groupedCounts(rows, (row) => row.group);
  const max = Math.max(...counts.map((row) => row.count), 1);
  els.availabilityGroupNote.textContent = `${rows.length} registros`;
  els.availabilityGroupBars.innerHTML = counts.map((row) => `
    <div class="bar-row">
      <div class="bar-label">${escapeHtml(row.label)}</div>
      <div class="bar-track"><div class="bar-fill ${row.label === "DM" ? "danger" : ""}" style="width:${(row.count / max) * 100}%"></div></div>
      <div class="bar-value">${row.count}</div>
    </div>
  `).join("");
}

function eventLookupByAthleteDate() {
  const lookup = new Map();
  for (const event of events) {
    const key = `${event.athleteId}|${event.date}`;
    if (!lookup.has(key)) lookup.set(key, []);
    lookup.get(key).push(event);
  }
  return lookup;
}

function availabilityRowsWithMetrics(rows) {
  const lookup = eventLookupByAthleteDate();
  const joined = [];
  for (const row of rows) {
    const matchedEvents = lookup.get(`${row.athleteId}|${row.date}`) || [];
    for (const event of matchedEvents) {
      joined.push({ ...event, group: row.group || "SEM GRUPO", availableGroup: row.available, sourceAvailability: row });
    }
  }
  return joined;
}

function buildGroupMetricSummary(metricRows) {
  const byGroup = new Map();
  for (const row of metricRows) {
    if (!byGroup.has(row.group)) byGroup.set(row.group, []);
    byGroup.get(row.group).push(row);
  }
  return Array.from(byGroup.entries()).map(([group, items]) => {
    const summary = {
      group,
      records: items.length,
      athletes: new Set(items.map((item) => item.athleteId)).size,
    };
    for (const key of radarMetrics) {
      summary[key] = avg(items, (item) => item[key]);
    }
    return summary;
  }).sort((a, b) => {
    const groupOrder = ["G1", "G2", "G3", "DM", "JUSTIFICADO", "SEM GRUPO"];
    const av = groupOrder.indexOf(a.group);
    const bv = groupOrder.indexOf(b.group);
    return (av === -1 ? 999 : av) - (bv === -1 ? 999 : bv) || a.group.localeCompare(b.group, "pt-BR");
  });
}

function buildG1G2DailyComparison(metricRows) {
  const metricKey = state.availabilityMetric;
  const byDateGroup = new Map();
  for (const row of metricRows.filter((item) => item.group === "G1" || item.group === "G2")) {
    const key = `${row.date}|${row.group}`;
    if (!byDateGroup.has(key)) byDateGroup.set(key, { date: row.date, group: row.group, values: [], athletes: new Set() });
    const bucket = byDateGroup.get(key);
    bucket.values.push(row[metricKey]);
    bucket.athletes.add(row.athleteId);
  }
  const dateMap = new Map();
  for (const bucket of byDateGroup.values()) {
    if (!dateMap.has(bucket.date)) dateMap.set(bucket.date, { date: bucket.date, G1: null, G2: null });
    dateMap.get(bucket.date)[bucket.group] = {
      average: avg(bucket.values, (value) => value),
      athletes: bucket.athletes.size,
      records: bucket.values.length,
    };
  }
  const dailyRows = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const totals = {
    G1: dailyRows.reduce((sum, row) => sum + (row.G1?.average || 0), 0),
    G2: dailyRows.reduce((sum, row) => sum + (row.G2?.average || 0), 0),
    G1Days: dailyRows.filter((row) => row.G1).length,
    G2Days: dailyRows.filter((row) => row.G2).length,
    G1Records: dailyRows.reduce((sum, row) => sum + (row.G1?.records || 0), 0),
    G2Records: dailyRows.reduce((sum, row) => sum + (row.G2?.records || 0), 0),
  };
  return { dailyRows, totals };
}

function renderAvailabilityMetricBars(metricRows) {
  const comparison = buildG1G2DailyComparison(metricRows);
  const metricKey = state.availabilityMetric;
  const rows = [
    { group: "G1", value: comparison.totals.G1, days: comparison.totals.G1Days, records: comparison.totals.G1Records },
    { group: "G2", value: comparison.totals.G2, days: comparison.totals.G2Days, records: comparison.totals.G2Records },
  ];
  if (!comparison.dailyRows.length || rows.every((row) => row.records === 0)) {
    els.availabilityMetricNote.textContent = "Sem carga fisica vinculada em G1/G2";
    els.availabilityMetricBars.innerHTML = `<div class="empty">Nao ha registros fisicos de G1 ou G2 neste periodo.</div>`;
    els.availabilityDailyGroupTable.innerHTML = `<tr><td colspan="6" class="empty">Sem dados para exibir.</td></tr>`;
    return;
  }
  const max = Math.max(...rows.map((row) => row.value), 1);
  els.availabilityMetricNote.textContent = `${metrics[metricKey].label} | soma das medias diarias`;
  els.availabilityMetricBars.innerHTML = rows.map((row) => {
    const width = Math.max(3, (row.value / max) * 100);
    return `
      <div class="group-metric-row">
        <div>
          <strong>${escapeHtml(row.group)}</strong>
          <span>${row.days} dias | ${row.records} registros</span>
        </div>
        <div class="bar-track"><div class="bar-fill ${row.group === "G2" ? "danger" : ""}" style="width:${width}%"></div></div>
        <b>${format(row.value, metricKey)}</b>
      </div>`;
  }).join("");
  renderAvailabilityDailyGroupTable(comparison.dailyRows);
}

function renderAvailabilityDailyGroupTable(dailyRows) {
  const metricKey = state.availabilityMetric;
  els.availabilityDailyGroupTable.innerHTML = dailyRows.slice().reverse().map((row) => {
    const g1 = row.G1?.average;
    const g2 = row.G2?.average;
    const diff = Number.isFinite(g1) && Number.isFinite(g2) ? g1 - g2 : null;
    return `
      <tr>
        <td>${dateLabel(row.date)}</td>
        <td>${row.G1 ? format(g1, metricKey) : "-"}</td>
        <td>${row.G1?.athletes || 0}</td>
        <td>${row.G2 ? format(g2, metricKey) : "-"}</td>
        <td>${row.G2?.athletes || 0}</td>
        <td>${diff === null ? "-" : format(diff, metricKey)}</td>
      </tr>`;
  }).join("");
}

function renderAvailabilityMetricTable(summaries) {
  els.availabilityMetricTableCount.textContent = `${summaries.length} grupos`;
  if (!summaries.length) {
    els.availabilityMetricTable.innerHTML = `<tr><td colspan="10" class="empty">Sem dados para exibir.</td></tr>`;
    return;
  }
  els.availabilityMetricTable.innerHTML = summaries.map((row) => `
    <tr>
      <td><span class="group-pill ${row.group === "DM" ? "danger" : ""}">${escapeHtml(row.group)}</span></td>
      <td>${row.records}</td>
      <td>${row.athletes}</td>
      <td>${format(row.totalDistance, "totalDistance")}</td>
      <td>${format(row.highIntensityMeters, "highIntensityMeters")}</td>
      <td>${format(row.fmpHighMin, "fmpHighMin")}</td>
      <td>${format(row.sprintMeters, "sprintMeters")}</td>
      <td>${format(row.explosiveActions, "explosiveActions")}</td>
      <td>${format(row.rhieBouts, "rhieBouts")}</td>
      <td>${format(row.fmpRunningHighMin, "fmpRunningHighMin")}</td>
    </tr>
  `).join("");
}

function renderAvailabilityTable(rows) {
  const byAthlete = new Map();
  for (const row of rows) {
    if (!byAthlete.has(row.athleteId)) {
      byAthlete.set(row.athleteId, {
        athleteId: row.athleteId,
        athlete: row.athlete,
        position: row.position,
        photoUrl: row.photoUrl,
        days: new Set(),
        dmDays: new Set(),
        groupRows: [],
      });
    }
    const profile = byAthlete.get(row.athleteId);
    profile.days.add(row.date);
    if (!row.available) profile.dmDays.add(row.date);
    profile.groupRows.push(row);
  }
  const rowsByAthlete = Array.from(byAthlete.values()).map((profile) => {
    const topGroup = groupedCounts(profile.groupRows, (row) => row.group)[0]?.label || "-";
    const days = profile.days.size;
    const dmDays = profile.dmDays.size;
    return {
      ...profile,
      days,
      dmDays,
      rate: days ? ((days - dmDays) / days) * 100 : 0,
      topGroup,
    };
  }).sort((a, b) => b.dmDays - a.dmDays || a.rate - b.rate || a.athlete.localeCompare(b.athlete, "pt-BR"));

  els.availabilityTableCount.textContent = `${rowsByAthlete.length} atletas`;
  if (!rowsByAthlete.length) {
    els.availabilityTable.innerHTML = `<tr><td colspan="6" class="empty">Sem dados para exibir.</td></tr>`;
    return;
  }
  els.availabilityTable.innerHTML = rowsByAthlete.map((row) => `
    <tr>
      <td>${avatarNameHtml(row)}</td>
      <td>${row.position || "-"}</td>
      <td>${row.days}</td>
      <td>${row.dmDays}</td>
      <td><span class="percentile-pill ${row.rate < 85 ? "danger" : ""}">${row.rate.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%</span></td>
      <td>${escapeHtml(row.topGroup)}</td>
    </tr>
  `).join("");
}

function renderAvailability() {
  if (!availability.length) {
    els.availabilityDaysKpi.textContent = "0";
    els.availabilityRateKpi.textContent = "0%";
    els.availabilityDmKpi.textContent = "0";
    els.availabilityAthletesKpi.textContent = "0";
    els.availabilityChart.innerHTML = `<div class="empty">Base de disponibilidade nao carregada.</div>`;
    els.availabilityMetricBars.innerHTML = `<div class="empty">Sem dados para comparar.</div>`;
    els.availabilityDailyGroupTable.innerHTML = `<tr><td colspan="6" class="empty">Sem dados para exibir.</td></tr>`;
    els.availabilityMetricTable.innerHTML = `<tr><td colspan="10" class="empty">Sem dados para exibir.</td></tr>`;
    return;
  }
  const rows = availabilityRowsInRange();
  const metricRows = availabilityRowsWithMetrics(rows);
  const metricSummaries = buildGroupMetricSummary(metricRows);
  const days = buildDailyAvailability(rows);
  const total = rows.length;
  const availableRows = rows.filter((row) => row.available).length;
  const dmRows = total - availableRows;
  const athletesCount = new Set(rows.map((row) => row.athleteId)).size;
  const rate = total ? (availableRows / total) * 100 : 0;

  els.availabilityDaysKpi.textContent = String(days.length);
  els.availabilityRateKpi.textContent = `${rate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  els.availabilityDmKpi.textContent = String(dmRows);
  els.availabilityAthletesKpi.textContent = String(athletesCount);
  els.availabilityRateKpi.style.color = rate >= 90 ? "var(--blue)" : "var(--red)";

  renderAvailabilityChart(days);
  renderAvailabilityMetricBars(metricRows);
  renderAvailabilityGroups(rows);
  renderAvailabilityTable(rows);
  renderAvailabilityMetricTable(metricSummaries);
}

async function refreshDashboardData() {
  if (!supportsLocalUpdate()) {
    alert("A atualizacao diaria deste app acontece fora do ambiente hospedado.");
    return;
  }
  els.refreshButton.textContent = "Atualizando...";
  els.refreshButton.disabled = true;
  const endpoint = window.location.protocol === "file:"
    ? "http://127.0.0.1:8765/api/update"
    : `${window.location.origin}/api/update`;
  try {
    const response = await fetch(`${endpoint}?t=${Date.now()}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.stderr || result.error || "Falha ao atualizar dados.");
    }
    const url = new URL(window.location.href);
    url.searchParams.set("v", `refresh-${Date.now()}`);
    window.location.href = url.toString();
  } catch (error) {
    els.refreshButton.textContent = "Atualizar dados";
    els.refreshButton.disabled = false;
    alert(`Nao foi possivel atualizar os dados.\n\nAbra pelo servidor local em http://127.0.0.1:8765 e tente novamente.\n\nDetalhe: ${error.message}`);
  }
}

function downloadCurrentCsv() {
  const athlete = getSelectedAthlete();
  const rows = rolling(getAthleteEvents());
  const header = ["data", "atleta", "posicao", "minutos", metricLabel(), "media_movel", "modo"];
  const body = rows.map((row) => [
    row.date,
    athlete.athlete,
    athlete.position,
    row.minutes,
    Number(row.metricDisplayValue.toFixed(3)),
    Number(row.rollingValue.toFixed(2)),
    state.loadMode === "density" ? "densidade" : "volume",
  ]);
  const csv = [header, ...body].map((line) => line.map(csvCell).join(";")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `longitudinal_${athlete.athlete.replaceAll(" ", "_")}_${state.metric}_${state.loadMode}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

init();

