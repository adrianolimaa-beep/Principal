const metricConfig = [
  {
    key: "totalDistanceMeters",
    label: "Distância total",
    unit: "m",
    decimals: 0,
  },
  {
    key: "highIntensityMeters",
    label: "Alta intensidade",
    unit: "m",
    decimals: 0,
  },
  {
    key: "accelerationsB23",
    label: "Acelerações B2-3",
    unit: "",
    decimals: 1,
  },
  {
    key: "decelerationsB23",
    label: "Desacelerações B2-3",
    unit: "",
    decimals: 1,
  },
];

const defaults = {
  athleteName: "NERIS",
  totalDistanceMeters: 9080.3,
  highIntensityMeters: 407,
  accelerationsB23: 16.7,
  decelerationsB23: 21.3,
};

let reference = null;

const form = document.querySelector("#external-form");
const referenceCount = document.querySelector("#reference-count");
const meanPercentile = document.querySelector("#mean-percentile");
const classification = document.querySelector("#classification");
const metricRows = document.querySelector("#metric-rows");
const radar = document.querySelector("#radar");

function formatNumber(value, decimals = 1) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatPercent(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentileRank(value, sortedValues) {
  if (!Number.isFinite(value) || sortedValues.length < 2) return 0;
  let low = 0;
  let high = sortedValues.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (sortedValues[mid] <= value) low = mid + 1;
    else high = mid;
  }
  return Math.max(0, Math.min(1, (low - 1) / (sortedValues.length - 1)));
}

function classify(percentile) {
  if (percentile >= 0.75) return "Top 25%";
  if (percentile >= 0.5) return "Acima da mediana";
  if (percentile >= 0.25) return "Abaixo da mediana";
  return "Quartil inferior";
}

function rankClass(percentile) {
  if (percentile >= 0.75) return "rank-top";
  if (percentile >= 0.25) return "rank-mid";
  return "rank-low";
}

function readInputs() {
  return {
    athleteName: document.querySelector("#athlete-name").value.trim() || "Atleta externo",
    totalDistanceMeters: Number(document.querySelector("#totalDistanceMeters").value),
    highIntensityMeters: Number(document.querySelector("#highIntensityMeters").value),
    accelerationsB23: Number(document.querySelector("#accelerationsB23").value),
    decelerationsB23: Number(document.querySelector("#decelerationsB23").value),
  };
}

function buildMetricState(input) {
  return metricConfig.map((metric) => {
    const values = reference.metrics[metric.key];
    const referenceMean = mean(values);
    const athleteValue = Number.isFinite(input[metric.key]) ? input[metric.key] : 0;
    const percentile = percentileRank(athleteValue, values);
    const index = referenceMean === 0 ? 0 : (athleteValue / referenceMean) * 100;
    return {
      ...metric,
      values,
      referenceMean,
      athleteValue,
      percentile,
      index,
    };
  });
}

function renderTable(metrics) {
  metricRows.innerHTML = metrics
    .map((metric) => {
      const unit = metric.unit ? ` ${metric.unit}` : "";
      const label = classify(metric.percentile);
      return `
        <tr>
          <td>${metric.label}</td>
          <td>${formatNumber(metric.athleteValue, metric.decimals)}${unit}</td>
          <td>${formatNumber(metric.referenceMean, metric.decimals)}${unit}</td>
          <td>${formatNumber(metric.index, 1)}</td>
          <td>${formatPercent(metric.percentile)}</td>
          <td><span class="rank-pill ${rankClass(metric.percentile)}">${label}</span></td>
        </tr>
      `;
    })
    .join("");
}

function polygonPoints(values, centerX, centerY, radius, maxValue) {
  const count = values.length;
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
      const scaled = Math.max(0, Math.min(value / maxValue, 1));
      const x = centerX + Math.cos(angle) * radius * scaled;
      const y = centerY + Math.sin(angle) * radius * scaled;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function drawRadar(metrics, athleteName) {
  const centerX = 210;
  const centerY = 178;
  const radius = 118;
  const labels = metrics.map((metric) => metric.label);
  const athleteValues = metrics.map((metric) => metric.index);
  const referenceValues = metrics.map(() => 100);
  const maxValue = Math.max(125, Math.ceil(Math.max(...athleteValues) / 50) * 50);
  const levels = [0.25, 0.5, 0.75, 1];

  const grid = levels
    .map((level) => {
      const values = labels.map(() => maxValue * level);
      return `<polygon points="${polygonPoints(values, centerX, centerY, radius, maxValue)}" class="radar-grid" />`;
    })
    .join("");

  const axes = labels
    .map((label, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / labels.length;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const labelX = centerX + Math.cos(angle) * (radius + 34);
      const labelY = centerY + Math.sin(angle) * (radius + 24);
      const anchor = Math.abs(Math.cos(angle)) < 0.3 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
      return `
        <line x1="${centerX}" y1="${centerY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-axis" />
        <text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="${anchor}" class="radar-label">${label}</text>
      `;
    })
    .join("");

  radar.innerHTML = `
    <defs>
      <style>
        .radar-grid { fill: none; stroke: #d7e0e8; stroke-width: 1; }
        .radar-axis { stroke: #d7e0e8; stroke-width: 1; }
        .radar-label { fill: #596877; font: 11px Arial, Helvetica, sans-serif; }
        .radar-reference { fill: rgba(199, 131, 32, 0.12); stroke: #c78320; stroke-width: 2; }
        .radar-athlete { fill: rgba(9, 125, 131, 0.18); stroke: #097d83; stroke-width: 3; }
        .radar-title { fill: #15202b; font: 700 15px Arial, Helvetica, sans-serif; }
        .radar-note { fill: #596877; font: 11px Arial, Helvetica, sans-serif; }
      </style>
    </defs>
    <text x="20" y="24" class="radar-title">${athleteName} vs média da posição</text>
    <text x="20" y="42" class="radar-note">Índice: média dos zagueiros = 100 | escala máxima = ${maxValue}</text>
    <g transform="translate(0, 20)">
      ${grid}
      ${axes}
      <polygon points="${polygonPoints(referenceValues, centerX, centerY, radius, maxValue)}" class="radar-reference" />
      <polygon points="${polygonPoints(athleteValues, centerX, centerY, radius, maxValue)}" class="radar-athlete" />
    </g>
  `;
}

function updateSimulation() {
  const input = readInputs();
  const metrics = buildMetricState(input);
  const averagePercentile = mean(metrics.map((metric) => metric.percentile));
  meanPercentile.textContent = formatPercent(averagePercentile);
  classification.textContent = classify(averagePercentile);
  renderTable(metrics);
  drawRadar(metrics, input.athleteName);
}

function restoreDefaults() {
  document.querySelector("#athlete-name").value = defaults.athleteName;
  for (const metric of metricConfig) {
    document.querySelector(`#${metric.key}`).value = defaults[metric.key];
  }
  updateSimulation();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateSimulation();
});

document.querySelector("#reset-defaults").addEventListener("click", restoreDefaults);

function boot(payload) {
  reference = payload;
  referenceCount.textContent = `Referência: ${payload.rows} registros`;
  updateSimulation();
}

if (window.ZAGUEIRO_REFERENCE) {
  boot(window.ZAGUEIRO_REFERENCE);
} else {
  fetch("./data/zagueiros_reference.json")
    .then((response) => response.json())
    .then(boot)
    .catch(() => {
      referenceCount.textContent = "Referência indisponível";
      meanPercentile.textContent = "--";
      classification.textContent = "Erro ao carregar";
    });
}

// Navegação entre as áreas do aplicativo.
document.querySelectorAll(".app-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".app-tab").forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".tab-view").forEach((view) => {
      view.classList.toggle("is-active", view.id === tab.dataset.tab);
    });
  });
});

const trainingMetricConfig = [
  { key: "m", label: "Distância total", volumeUnit: "m", densityUnit: "m/min" },
  { key: "h", label: "Alta intensidade", volumeUnit: "m", densityUnit: "m/min" },
  { key: "ac", label: "Acelerações", volumeUnit: "", densityUnit: "nº/min" },
  { key: "dc", label: "Desacelerações", volumeUnit: "", densityUnit: "nº/min" },
  { key: "s", label: "Sprint", volumeUnit: "m", densityUnit: "m/min" },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function trainingNumber(value, decimals) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function trainingDateLabel(value) {
  if (!value) return "--";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function trainingPolygonPoints(values, centerX, centerY, radius, maxValue) {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
      const scaled = Math.max(0, Math.min(value / maxValue, 1));
      return `${(centerX + Math.cos(angle) * radius * scaled).toFixed(1)},${(
        centerY +
        Math.sin(angle) * radius * scaled
      ).toFixed(1)}`;
    })
    .join(" ");
}

function drawTrainingRadar(metrics, athleteName, position) {
  const target = document.querySelector("#training-radar");
  const centerX = 260;
  const centerY = 238;
  const radius = 124;
  const athleteValues = metrics.map((metric) => metric.index);
  const referenceValues = metrics.map(() => 100);
  const maxValue = Math.max(125, Math.ceil(Math.max(...athleteValues, 100) / 25) * 25);
  const levels = [0.25, 0.5, 0.75, 1];

  const grid = levels
    .map((level) => {
      const values = metrics.map(() => maxValue * level);
      return `<polygon points="${trainingPolygonPoints(values, centerX, centerY, radius, maxValue)}" class="training-radar-grid" />`;
    })
    .join("");

  const axes = metrics
    .map((metric, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / metrics.length;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const labelX = centerX + Math.cos(angle) * (radius + 42);
      const labelY = centerY + Math.sin(angle) * (radius + 34);
      const anchor = Math.abs(Math.cos(angle)) < 0.25 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
      return `<line x1="${centerX}" y1="${centerY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="training-radar-axis" />
        <text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="${anchor}" class="training-radar-label">${escapeHtml(metric.label)}</text>`;
    })
    .join("");

  target.innerHTML = `
    <defs><style>
      .training-radar-grid,.training-radar-axis{fill:none;stroke:#d7e0e8;stroke-width:1}
      .training-radar-axis{fill:none}.training-radar-label{fill:#526476;font:12px Arial,Helvetica,sans-serif}
      .training-radar-reference{fill:rgba(199,131,32,.12);stroke:#c78320;stroke-width:2}
      .training-radar-athlete{fill:rgba(9,125,131,.2);stroke:#097d83;stroke-width:3}
      .training-radar-title{fill:#15202b;font:700 16px Arial,Helvetica,sans-serif}
      .training-radar-note{fill:#596877;font:11px Arial,Helvetica,sans-serif}
    </style></defs>
    <text x="22" y="26" class="training-radar-title">${escapeHtml(athleteName)} × ${escapeHtml(position)}</text>
    <text x="22" y="45" class="training-radar-note">Índice relativo | média da posição = 100% | escala máxima = ${maxValue}%</text>
    ${grid}${axes}
    <polygon points="${trainingPolygonPoints(referenceValues, centerX, centerY, radius, maxValue)}" class="training-radar-reference" />
    <polygon points="${trainingPolygonPoints(athleteValues, centerX, centerY, radius, maxValue)}" class="training-radar-athlete" />`;
}

function drawTrainingEmpty(message) {
  document.querySelector("#training-radar").innerHTML = `
    <rect x="45" y="90" width="430" height="230" rx="12" fill="#f4f7fa" stroke="#d8e0e8" />
    <text x="260" y="195" text-anchor="middle" fill="#526476" font-size="15" font-weight="700">Sem dados para a seleção</text>
    <text x="260" y="225" text-anchor="middle" fill="#6a7887" font-size="12">${escapeHtml(message)}</text>`;
}

function setupTrainingEvaluation(payload) {
  const records = payload.records || [];
  const athleteSelect = document.querySelector("#training-athlete");
  const startDate = document.querySelector("#training-start-date");
  const endDate = document.querySelector("#training-end-date");
  const blocksContainer = document.querySelector("#training-blocks");
  const metricRowsTarget = document.querySelector("#training-metric-rows");
  const athleteProfiles = new Map();
  let selectedBlocks = new Set();
  let blocksTouched = false;

  records.forEach((row) => athleteProfiles.set(row.i, { id: row.i, name: row.a, position: row.p }));
  const athletes = [...athleteProfiles.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  athleteSelect.innerHTML = athletes.map((athlete) => `<option value="${athlete.id}">${escapeHtml(athlete.name)}</option>`).join("");
  const neris = athletes.find((athlete) => athlete.name.toLocaleUpperCase("pt-BR").includes("NERIS"));
  if (neris) athleteSelect.value = String(neris.id);

  const dates = records.map((row) => row.d).sort();
  startDate.value = dates[0] || "";
  endDate.value = dates.at(-1) || "";
  startDate.min = endDate.min = dates[0] || "";
  startDate.max = endDate.max = dates.at(-1) || "";
  const updated = payload.updatedAt ? payload.updatedAt.slice(0, 10) : "";
  document.querySelector("#training-updated").textContent = updated ? `Atualizada em ${trainingDateLabel(updated)}` : "Base de treinos";

  function rowsInDateRange() {
    return records.filter((row) => row.d >= startDate.value && row.d <= endDate.value);
  }

  function availableBlocks() {
    const athleteId = Number(athleteSelect.value);
    return [...new Set(rowsInDateRange().filter((row) => row.i === athleteId).map((row) => row.b))].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }

  function renderBlocks(forceAll = false) {
    const available = availableBlocks();
    const previousAll = selectedBlocks.size > 0 && available.every((block) => selectedBlocks.has(block));
    selectedBlocks = new Set([...selectedBlocks].filter((block) => available.includes(block)));
    if (forceAll || !blocksTouched || previousAll) selectedBlocks = new Set(available);
    if (!available.length) {
      blocksContainer.innerHTML = '<span class="empty-blocks">Nenhum bloco elegível neste período.</span>';
      return;
    }
    blocksContainer.innerHTML = available
      .map(
        (block) => `<label class="block-chip"><input type="checkbox" value="${escapeHtml(block)}" ${
          selectedBlocks.has(block) ? "checked" : ""
        } /><span>${escapeHtml(block)}</span></label>`,
      )
      .join("");
    blocksContainer.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        blocksTouched = true;
        if (checkbox.checked) selectedBlocks.add(checkbox.value);
        else selectedBlocks.delete(checkbox.value);
        updateEvaluation();
      });
    });
  }

  function aggregateRows(rows, mode) {
    const totals = { t: 0, m: 0, h: 0, ac: 0, dc: 0, s: 0 };
    rows.forEach((row) => {
      totals.t += row.t;
      trainingMetricConfig.forEach((metric) => (totals[metric.key] += row[metric.key]));
    });
    const values = {};
    trainingMetricConfig.forEach((metric) => {
      values[metric.key] = mode === "density" ? (totals.t ? totals[metric.key] / totals.t : 0) : totals[metric.key];
    });
    return values;
  }

  function renderTrainingTable(metrics, mode) {
    metricRowsTarget.innerHTML = metrics
      .map((metric) => {
        const unit = mode === "density" ? metric.densityUnit : metric.volumeUnit;
        const decimals = mode === "density" ? 2 : metric.key === "ac" || metric.key === "dc" ? 1 : 0;
        const indexClass = metric.index >= 100 ? "index-above" : "index-below";
        return `<tr><td>${escapeHtml(metric.label)}</td><td>${trainingNumber(metric.athleteValue, decimals)}${unit ? ` ${unit}` : ""}</td>
          <td>${trainingNumber(metric.referenceMean, decimals)}${unit ? ` ${unit}` : ""}</td>
          <td><span class="index-pill ${indexClass}">${trainingNumber(metric.index, 0)}%</span></td></tr>`;
      })
      .join("");
  }

  function updateEvaluation() {
    const athleteId = Number(athleteSelect.value);
    const profile = athleteProfiles.get(athleteId);
    const mode = document.querySelector('input[name="training-mode"]:checked').value;
    const filtered = rowsInDateRange().filter((row) => selectedBlocks.has(row.b));
    const athleteRows = filtered.filter((row) => row.i === athleteId);
    const positionRows = filtered.filter((row) => row.p === profile.position);
    const grouped = new Map();
    positionRows.forEach((row) => {
      if (!grouped.has(row.i)) grouped.set(row.i, []);
      grouped.get(row.i).push(row);
    });

    document.querySelector("#training-position").textContent = profile.position;
    document.querySelector("#training-block-count").textContent = String(new Set(athleteRows.map((row) => `${row.d}|${row.b}`)).size);
    document.querySelector("#training-sample-count").textContent = String(grouped.size);
    document.querySelector("#training-athlete-legend").textContent = profile.name;
    document.querySelector("#training-mode-label").textContent = mode === "density" ? "Valores por minuto" : "Volume acumulado";

    if (!athleteRows.length || !grouped.size) {
      metricRowsTarget.innerHTML = '<tr><td colspan="4" class="empty-table">Ajuste as datas ou selecione ao menos um bloco.</td></tr>';
      drawTrainingEmpty("Ajuste as datas ou selecione ao menos um bloco.");
      document.querySelector("#training-note").textContent = "";
      return;
    }

    const athleteValues = aggregateRows(athleteRows, mode);
    const peerValues = [...grouped.values()].map((rows) => aggregateRows(rows, mode));
    const metrics = trainingMetricConfig.map((metric) => {
      const referenceMean = mean(peerValues.map((values) => values[metric.key]));
      const athleteValue = athleteValues[metric.key];
      return { ...metric, athleteValue, referenceMean, index: referenceMean ? (athleteValue / referenceMean) * 100 : 0 };
    });
    renderTrainingTable(metrics, mode);
    drawTrainingRadar(metrics, profile.name, profile.position);
    document.querySelector("#training-note").textContent = `Comparação de ${trainingDateLabel(startDate.value)} a ${trainingDateLabel(
      endDate.value,
    )}. A média inclui o próprio atleta e considera ${grouped.size} atleta(s) da posição.`;
  }

  athleteSelect.addEventListener("change", () => {
    blocksTouched = false;
    renderBlocks(true);
    updateEvaluation();
  });
  [startDate, endDate].forEach((input) => {
    input.addEventListener("change", () => {
      renderBlocks();
      updateEvaluation();
    });
  });
  document.querySelectorAll('input[name="training-mode"]').forEach((input) => input.addEventListener("change", updateEvaluation));
  document.querySelector("#select-all-blocks").addEventListener("click", () => {
    blocksTouched = true;
    selectedBlocks = new Set(availableBlocks());
    renderBlocks();
    updateEvaluation();
  });
  document.querySelector("#clear-blocks").addEventListener("click", () => {
    blocksTouched = true;
    selectedBlocks.clear();
    renderBlocks();
    updateEvaluation();
  });

  renderBlocks(true);
  updateEvaluation();
}

if (window.TRAINING_DATA?.records?.length) {
  setupTrainingEvaluation(window.TRAINING_DATA);
} else {
  document.querySelector("#training-athlete").innerHTML = '<option>Base indisponível</option>';
  drawTrainingEmpty("Atualize a base de treinos para visualizar o radar.");
}

function movingAverage(values, windowSize) {
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    return mean(values.slice(start, index + 1));
  });
}

function buildDailyDensitySeries(rows, athleteId, metricKey, windowSize) {
  const days = new Map();
  rows
    .filter((row) => row.i === athleteId)
    .forEach((row) => {
      const current = days.get(row.d) || { duration: 0, value: 0 };
      current.duration += row.t;
      current.value += row[metricKey];
      days.set(row.d, current);
    });
  const series = [...days.entries()]
    .map(([date, totals]) => ({ date, value: totals.duration ? totals.value / totals.duration : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const averages = movingAverage(
    series.map((point) => point.value),
    windowSize,
  );
  return series.map((point, index) => ({ ...point, moving: averages[index] }));
}

function buildPositionDensitySeries(rows, position, metricKey, windowSize) {
  const positionRows = rows.filter((row) => row.p === position);
  const athleteDays = new Map();
  positionRows.forEach((row) => {
    const key = `${row.d}|${row.i}`;
    const current = athleteDays.get(key) || { date: row.d, duration: 0, value: 0 };
    current.duration += row.t;
    current.value += row[metricKey];
    athleteDays.set(key, current);
  });
  const days = new Map();
  athleteDays.forEach((totals) => {
    if (!days.has(totals.date)) days.set(totals.date, []);
    days.get(totals.date).push(totals.duration ? totals.value / totals.duration : 0);
  });
  const series = [...days.entries()]
    .map(([date, values]) => ({ date, value: mean(values) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const averages = movingAverage(
    series.map((point) => point.value),
    windowSize,
  );
  return series.map((point, index) => ({ ...point, moving: averages[index] }));
}

function longitudinalEmpty(message) {
  document.querySelector("#longitudinal-chart").innerHTML = `
    <rect x="90" y="80" width="940" height="250" rx="12" fill="#f4f7fa" stroke="#d8e0e8" />
    <text x="560" y="190" text-anchor="middle" fill="#526476" font-size="17" font-weight="700">Sem dados para o acompanhamento</text>
    <text x="560" y="220" text-anchor="middle" fill="#6a7887" font-size="13">${escapeHtml(message)}</text>`;
}

function drawLongitudinalChart(athleteSeries, positionSeries, athleteName, metricLabel, unit, windowSize) {
  const chart = document.querySelector("#longitudinal-chart");
  if (!athleteSeries.length) {
    longitudinalEmpty("Ajuste o período ou selecione ao menos um bloco.");
    return;
  }
  const width = 1120;
  const height = 420;
  const margin = { top: 58, right: 42, bottom: 58, left: 74 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const allDates = [...athleteSeries, ...positionSeries].map((point) => Date.parse(`${point.date}T00:00:00Z`));
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const span = Math.max(1, maxDate - minDate);
  const allValues = [
    ...athleteSeries.flatMap((point) => [point.value, point.moving]),
    ...positionSeries.map((point) => point.moving),
  ].filter(Number.isFinite);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const padding = Math.max((rawMax - rawMin) * 0.16, rawMax * 0.08, 0.05);
  const yMin = Math.max(0, rawMin - padding);
  const yMax = rawMax + padding;
  const ySpan = Math.max(0.01, yMax - yMin);
  const x = (date) => margin.left + ((Date.parse(`${date}T00:00:00Z`) - minDate) / span) * plotWidth;
  const y = (value) => margin.top + (1 - (value - yMin) / ySpan) * plotHeight;
  const line = (series, accessor) =>
    series.map((point) => `${x(point.date).toFixed(1)},${y(accessor(point)).toFixed(1)}`).join(" ");
  const levels = [0, 0.25, 0.5, 0.75, 1];
  const grid = levels
    .map((level) => {
      const value = yMin + ySpan * (1 - level);
      const yPos = margin.top + plotHeight * level;
      return `<line x1="${margin.left}" y1="${yPos}" x2="${width - margin.right}" y2="${yPos}" class="long-grid" />
        <text x="${margin.left - 12}" y="${yPos + 4}" text-anchor="end" class="long-axis-label">${trainingNumber(value, 1)}</text>`;
    })
    .join("");
  const labelIndexes = [...new Set([0, ...[0.2, 0.4, 0.6, 0.8].map((ratio) => Math.round((athleteSeries.length - 1) * ratio)), athleteSeries.length - 1])];
  const xLabels = labelIndexes
    .map((index) => {
      const point = athleteSeries[index];
      return `<text x="${x(point.date)}" y="${height - 25}" text-anchor="middle" class="long-axis-label">${trainingDateLabel(point.date).slice(0, 5)}</text>`;
    })
    .join("");
  const points = athleteSeries
    .map((point) => `<circle cx="${x(point.date)}" cy="${y(point.value)}" r="3" class="long-daily-point"><title>${trainingDateLabel(point.date)}: ${trainingNumber(point.value, 2)} ${escapeHtml(unit)}</title></circle>`)
    .join("");

  chart.innerHTML = `
    <defs><style>
      .long-grid{stroke:#dce4ea;stroke-width:1}.long-axis-label{fill:#687787;font:11px Arial,Helvetica,sans-serif}
      .long-daily{fill:none;stroke:#9bb0bf;stroke-width:1.5}.long-moving{fill:none;stroke:#097d83;stroke-width:4;stroke-linejoin:round;stroke-linecap:round}
      .long-position{fill:none;stroke:#c78320;stroke-width:2.5;stroke-dasharray:7 6}.long-daily-point{fill:#7892a5;stroke:#fff;stroke-width:1}
      .long-title{fill:#15202b;font:700 16px Arial,Helvetica,sans-serif}.long-subtitle{fill:#596877;font:11px Arial,Helvetica,sans-serif}
    </style></defs>
    <text x="${margin.left}" y="25" class="long-title">${escapeHtml(athleteName)} · ${escapeHtml(metricLabel)}</text>
    <text x="${margin.left}" y="43" class="long-subtitle">Média móvel de ${windowSize} dias de treino · ${escapeHtml(unit)}</text>
    ${grid}${xLabels}
    <polyline points="${line(athleteSeries, (point) => point.value)}" class="long-daily" />
    <polyline points="${line(athleteSeries, (point) => point.moving)}" class="long-moving" />
    ${positionSeries.length ? `<polyline points="${line(positionSeries, (point) => point.moving)}" class="long-position" />` : ""}
    ${points}`;
}

function densitySparkline(values) {
  const recent = values.slice(-12);
  if (!recent.length) return "--";
  const width = 118;
  const height = 34;
  const minValue = Math.min(...recent);
  const maxValue = Math.max(...recent);
  const span = Math.max(maxValue - minValue, 0.01);
  const points = recent
    .map((value, index) => `${(index / Math.max(1, recent.length - 1)) * width},${height - 3 - ((value - minValue) / span) * (height - 6)}`)
    .join(" ");
  return `<svg class="density-sparkline" viewBox="0 0 ${width} ${height}" aria-label="Evolução dos últimos dias"><polyline points="${points}" /></svg>`;
}

function setupLongitudinalEvaluation(payload) {
  const records = payload.records || [];
  const athleteSelect = document.querySelector("#longitudinal-athlete");
  const metricSelect = document.querySelector("#longitudinal-metric");
  const windowSelect = document.querySelector("#longitudinal-window");
  const startDate = document.querySelector("#longitudinal-start-date");
  const endDate = document.querySelector("#longitudinal-end-date");
  const activeOnlyToggle = document.querySelector("#longitudinal-active-only");
  const blocksContainer = document.querySelector("#longitudinal-blocks");
  const groupRows = document.querySelector("#longitudinal-group-rows");
  const profiles = new Map();
  let selectedBlocks = new Set();
  let blocksTouched = false;

  records.forEach((row) => profiles.set(row.i, { id: row.i, name: row.a, position: row.p, status: row.st || "SEM STATUS" }));
  const allAthletes = [...profiles.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  function visibleAthletes() {
    return activeOnlyToggle.checked ? allAthletes.filter((athlete) => athlete.status === "ATIVO") : allAthletes;
  }

  function renderAthletes(preserveSelection = true) {
    const previousId = preserveSelection ? Number(athleteSelect.value) : null;
    const athletes = visibleAthletes();
    athleteSelect.innerHTML = athletes.map((athlete) => `<option value="${athlete.id}">${escapeHtml(athlete.name)}</option>`).join("");
    if (athletes.some((athlete) => athlete.id === previousId)) {
      athleteSelect.value = String(previousId);
      return;
    }
    const neris = athletes.find((athlete) => athlete.name.toLocaleUpperCase("pt-BR").includes("NERIS"));
    if (neris) athleteSelect.value = String(neris.id);
  }

  renderAthletes(false);
  metricSelect.innerHTML = trainingMetricConfig.map((metric) => `<option value="${metric.key}">${escapeHtml(metric.label)}</option>`).join("");
  const dates = records.map((row) => row.d).sort();
  startDate.value = dates[0] || "";
  endDate.value = dates.at(-1) || "";
  startDate.min = endDate.min = dates[0] || "";
  startDate.max = endDate.max = dates.at(-1) || "";

  function dateRows() {
    return records.filter((row) => row.d >= startDate.value && row.d <= endDate.value);
  }

  function availableBlocks() {
    const athleteId = Number(athleteSelect.value);
    return [...new Set(dateRows().filter((row) => row.i === athleteId).map((row) => row.b))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function renderBlocks(forceAll = false) {
    const available = availableBlocks();
    selectedBlocks = new Set([...selectedBlocks].filter((block) => available.includes(block)));
    if (forceAll || !blocksTouched) selectedBlocks = new Set(available);
    if (!available.length) {
      blocksContainer.innerHTML = '<span class="empty-blocks">Nenhum bloco elegível neste período.</span>';
      return;
    }
    blocksContainer.innerHTML = available
      .map((block) => `<label class="block-chip"><input type="checkbox" value="${escapeHtml(block)}" ${selectedBlocks.has(block) ? "checked" : ""} /><span>${escapeHtml(block)}</span></label>`)
      .join("");
    blocksContainer.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        blocksTouched = true;
        if (checkbox.checked) selectedBlocks.add(checkbox.value);
        else selectedBlocks.delete(checkbox.value);
        updateLongitudinal();
      });
    });
  }

  function updateLongitudinal() {
    const athleteId = Number(athleteSelect.value);
    const profile = profiles.get(athleteId);
    const metric = trainingMetricConfig.find((item) => item.key === metricSelect.value);
    const windowSize = Number(windowSelect.value);
    const filtered = dateRows().filter((row) => selectedBlocks.has(row.b) && (!activeOnlyToggle.checked || row.st === "ATIVO"));
    const athleteSeries = buildDailyDensitySeries(filtered, athleteId, metric.key, windowSize);
    const positionSeries = buildPositionDensitySeries(filtered, profile.position, metric.key, windowSize);
    const allSeries = [...new Set(filtered.map((row) => row.i))]
      .map((id) => {
        const series = buildDailyDensitySeries(filtered, id, metric.key, windowSize);
        if (!series.length) return null;
        const current = series.at(-1);
        const previous = series.length > 1 ? series.at(-2).moving : current.moving;
        const difference = previous ? ((current.moving - previous) / previous) * 100 : 0;
        return { profile: profiles.get(id), series, current: current.value, moving: current.moving, difference };
      })
      .filter(Boolean);
    const positionMeans = new Map();
    [...new Set(allSeries.map((item) => item.profile.position))].forEach((position) => {
      positionMeans.set(position, mean(allSeries.filter((item) => item.profile.position === position).map((item) => item.moving)));
    });
    const selected = allSeries.find((item) => item.profile.id === athleteId);
    const unit = metric.densityUnit;

    if (!selected) {
      document.querySelector("#longitudinal-current").textContent = "--";
      document.querySelector("#longitudinal-self-difference").textContent = "--";
      document.querySelector("#longitudinal-position-mean").textContent = "--";
      document.querySelector("#longitudinal-days").textContent = "0";
      document.querySelector("#longitudinal-self-difference").className = "";
      groupRows.innerHTML = '<tr><td colspan="7" class="empty-table">Ajuste o período ou selecione ao menos um bloco.</td></tr>';
      longitudinalEmpty("Ajuste o período ou selecione ao menos um bloco.");
      return;
    }

    document.querySelector("#longitudinal-current").textContent = `${trainingNumber(selected.moving, 2)} ${unit}`;
    const selfDifference = document.querySelector("#longitudinal-self-difference");
    selfDifference.textContent = `${selected.difference > 0 ? "+" : ""}${trainingNumber(selected.difference, 1)}%`;
    selfDifference.className = selected.difference > 0 ? "self-positive" : selected.difference < 0 ? "self-negative" : "self-neutral";
    document.querySelector("#longitudinal-position-mean").textContent = `${trainingNumber(positionMeans.get(profile.position) || 0, 2)} ${unit}`;
    document.querySelector("#longitudinal-days").textContent = String(selected.series.length);
    document.querySelector("#longitudinal-chart-caption").textContent = `${metric.label} · média móvel de ${windowSize} dias`;
    drawLongitudinalChart(athleteSeries, positionSeries, profile.name, metric.label, unit, windowSize);

    groupRows.innerHTML = allSeries
      .sort((a, b) => a.profile.position.localeCompare(b.profile.position, "pt-BR") || a.profile.name.localeCompare(b.profile.name, "pt-BR"))
      .map((item) => {
        const differenceClass = item.difference > 0 ? "self-positive" : item.difference < 0 ? "self-negative" : "self-neutral";
        const sign = item.difference > 0 ? "+" : "";
        return `<tr><td>${escapeHtml(item.profile.name)}</td><td>${escapeHtml(item.profile.position)}</td><td>${trainingNumber(item.current, 2)} ${unit}</td>
          <td>${trainingNumber(item.moving, 2)} ${unit}</td><td><span class="self-difference ${differenceClass}">${sign}${trainingNumber(item.difference, 1)}%</span></td>
          <td>${trainingNumber(positionMeans.get(item.profile.position) || 0, 2)} ${unit}</td><td>${densitySparkline(item.series.map((point) => point.moving))}</td></tr>`;
      })
      .join("");
  }

  athleteSelect.addEventListener("change", () => {
    blocksTouched = false;
    renderBlocks(true);
    updateLongitudinal();
  });
  activeOnlyToggle.addEventListener("change", () => {
    renderAthletes(true);
    blocksTouched = false;
    renderBlocks(true);
    updateLongitudinal();
  });
  [startDate, endDate].forEach((input) => input.addEventListener("change", () => {
    renderBlocks();
    updateLongitudinal();
  }));
  [metricSelect, windowSelect].forEach((input) => input.addEventListener("change", updateLongitudinal));
  document.querySelector("#longitudinal-select-all").addEventListener("click", () => {
    blocksTouched = true;
    selectedBlocks = new Set(availableBlocks());
    renderBlocks();
    updateLongitudinal();
  });
  document.querySelector("#longitudinal-clear").addEventListener("click", () => {
    blocksTouched = true;
    selectedBlocks.clear();
    renderBlocks();
    updateLongitudinal();
  });

  renderBlocks(true);
  updateLongitudinal();
}

if (window.TRAINING_DATA?.records?.length) {
  setupLongitudinalEvaluation(window.TRAINING_DATA);
} else {
  longitudinalEmpty("Atualize a base de treinos para visualizar a evolução.");
}

const microcycleMetricConfig = [
  { key: "m", decimals: 0 },
  { key: "h", decimals: 0 },
  { key: "s", decimals: 0 },
  { key: "ac", decimals: 1 },
  { key: "dc", decimals: 1 },
];

function normalizeMicrocycleName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-BR")
    .replace(/[^A-Z0-9]/g, "");
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function groupDateToIso(value) {
  const parts = String(value || "").trim().split("/").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return "";
  const [month, day, rawYear] = parts;
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildMicrocycleGroupMap(csvText) {
  const parsed = parseCsvRows(csvText);
  if (!parsed.length) return new Map();
  const headers = parsed[0].map((header) => header.trim());
  const nameIndex = headers.indexOf("Nome Catapult");
  const dateIndex = headers.indexOf("Data");
  const groupIndex = headers.indexOf("Grupo");
  const map = new Map();
  if ([nameIndex, dateIndex, groupIndex].some((index) => index < 0)) return map;
  parsed.slice(1).forEach((cells) => {
    const group = String(cells[groupIndex] || "").trim().toLocaleUpperCase("pt-BR");
    const date = groupDateToIso(cells[dateIndex]);
    const name = normalizeMicrocycleName(cells[nameIndex]);
    if (["G1", "G2", "G3"].includes(group) && date && name) map.set(`${date}|${name}`, group);
  });
  return map;
}

function buildMicrocycleGroupMapFromRecords(records) {
  const map = new Map();
  records.forEach(([rawDate, rawName, rawGroup]) => {
    const group = String(rawGroup || "").trim().toLocaleUpperCase("pt-BR");
    const date = groupDateToIso(rawDate);
    const name = normalizeMicrocycleName(rawName);
    if (["G1", "G2", "G3"].includes(group) && date && name) map.set(`${date}|${name}`, group);
  });
  return map;
}

function mondayUtc(dateValue) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  const weekday = date.getUTCDay();
  const distance = weekday === 0 ? 6 : weekday - 1;
  date.setUTCDate(date.getUTCDate() - distance);
  return date;
}

function dateToIsoUtc(date) {
  return date.toISOString().slice(0, 10);
}

function microcycleDetails(dateValue, year) {
  const firstMonday = mondayUtc(`${year}-01-01`);
  const start = mondayUtc(dateValue);
  const number = Math.floor((start - firstMonday) / 604800000) + 1;
  return { number, start: dateToIsoUtc(start) };
}

function setupMicrocycleEvaluation(payload) {
  // Session é o consolidado de cada atleta no dia. A base o mantém separado
  // dos blocos elegíveis para não duplicar as outras análises do aplicativo.
  const sessionRows = payload.sessions || (payload.records || []).filter((row) => String(row.b).toLocaleUpperCase("pt-BR") === "SESSION");
  const yearSelect = document.querySelector("#microcycle-year");
  const groupSelect = document.querySelector("#microcycle-group");
  const athleteSelect = document.querySelector("#microcycle-athlete");
  const tableRows = document.querySelector("#microcycle-rows");
  const status = document.querySelector("#microcycle-status");
  const athletes = [...new Map(sessionRows.map((row) => [row.i, { id: row.i, name: row.a }])).values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
  const years = [...new Set(sessionRows.map((row) => Number(row.d.slice(0, 4))))].sort((a, b) => b - a);
  let groupMap = new Map();
  let groupDataState = "loading";

  yearSelect.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join("");
  const currentYear = new Date().getFullYear();
  yearSelect.value = String(years.includes(currentYear) ? currentYear : years[0]);
  athleteSelect.innerHTML = `<option value="ALL">Todos os atletas</option>${athletes
    .map((athlete) => `<option value="${athlete.id}">${escapeHtml(athlete.name)}</option>`)
    .join("")}`;

  function selectedRows() {
    const year = Number(yearSelect.value);
    const athleteId = athleteSelect.value;
    const group = groupSelect.value;
    return sessionRows.filter((row) => {
      if (Number(row.d.slice(0, 4)) !== year) return false;
      if (athleteId !== "ALL" && row.i !== Number(athleteId)) return false;
      if (group !== "ALL" && groupMap.get(`${row.d}|${normalizeMicrocycleName(row.a)}`) !== group) return false;
      return true;
    });
  }

  function renderMicrocycles() {
    const year = Number(yearSelect.value);
    const rows = selectedRows();
    const sessions = new Map();
    rows.forEach((row) => {
      if (!sessions.has(row.d)) sessions.set(row.d, []);
      sessions.get(row.d).push(row);
    });

    const microcycles = new Map();
    sessions.forEach((dateRows, date) => {
      const details = microcycleDetails(date, year);
      if (!microcycles.has(details.number)) microcycles.set(details.number, { ...details, sessions: [] });
      // Há datas em que um atleta possui mais de uma linha Session. Antes de
      // calcular a média da equipe, consolida todas as linhas daquele atleta
      // no dia. Assim, uma segunda/terceira sessão compõe a carga diária em
      // vez de reduzir a média por receber peso extra como linha isolada.
      const athletesByDay = new Map();
      dateRows.forEach((row) => {
        if (!athletesByDay.has(row.i)) athletesByDay.set(row.i, []);
        athletesByDay.get(row.i).push(row);
      });
      const values = {};
      microcycleMetricConfig.forEach((metric) => {
        const dailyAthleteTotals = [...athletesByDay.values()].map((athleteRows) =>
          athleteRows.reduce((total, row) => total + (Number(row[metric.key]) || 0), 0),
        );
        values[metric.key] = mean(dailyAthleteTotals);
      });
      microcycles.get(details.number).sessions.push({ date, values });
    });

    const results = [...microcycles.values()]
      .sort((a, b) => a.number - b.number)
      .map((microcycle) => {
        const values = {};
        microcycleMetricConfig.forEach((metric) => {
          values[metric.key] = microcycle.sessions.reduce((total, session) => total + session.values[metric.key], 0);
        });
        return { ...microcycle, values };
      });

    if (!results.length) {
      const groupUnavailable = groupSelect.value !== "ALL" && groupDataState !== "ready";
      tableRows.innerHTML = `<tr><td colspan="7" class="empty-table">${
        groupUnavailable ? "Não foi possível carregar os grupos para este filtro." : "Não há sessões para os filtros selecionados."
      }</td></tr>`;
    } else {
      tableRows.innerHTML = results
        .map(
          (microcycle) => `<tr><td><span class="microcycle-code">MC ${microcycle.number}</span><span class="microcycle-session-note">${microcycle.sessions.length} sessão(ões)</span></td>
            <td>${trainingDateLabel(microcycle.start)}</td>${microcycleMetricConfig
              .map((metric) => `<td>${trainingNumber(microcycle.values[metric.key], metric.decimals)}</td>`)
              .join("")}</tr>`,
        )
        .join("");
    }

    const selectedAthlete = athletes.find((athlete) => String(athlete.id) === athleteSelect.value);
    const scopeParts = [selectedAthlete ? selectedAthlete.name : "Equipe"];
    if (groupSelect.value !== "ALL") scopeParts.push(groupSelect.value);
    document.querySelector("#microcycle-count").textContent = String(results.length);
    document.querySelector("#microcycle-session-count").textContent = String(sessions.size);
    document.querySelector("#microcycle-scope").textContent = scopeParts.join(" · ");
    document.querySelector("#microcycle-period").textContent = results.length
      ? `${trainingDateLabel(results[0].start).slice(0, 5)} a ${trainingDateLabel(results.at(-1).start).slice(0, 5)}`
      : "--";
    status.textContent =
      groupDataState === "ready"
        ? `${rows.length} registros Session`
        : groupDataState === "unavailable"
          ? `${rows.length} registros Session · grupos indisponíveis`
          : `${rows.length} registros Session · grupos carregando`;
  }

  [yearSelect, groupSelect, athleteSelect].forEach((select) => select.addEventListener("change", renderMicrocycles));
  renderMicrocycles();

  if (window.MICROCYCLE_GROUPS?.length) {
    groupMap = buildMicrocycleGroupMapFromRecords(window.MICROCYCLE_GROUPS);
    groupDataState = groupMap.size > 0 ? "ready" : "unavailable";
    renderMicrocycles();
  } else {
    fetch("./grupos_tag_pagina1.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Base de grupos indisponível");
        return response.text();
      })
      .then((csvText) => {
        groupMap = buildMicrocycleGroupMap(csvText);
        groupDataState = groupMap.size > 0 ? "ready" : "unavailable";
        renderMicrocycles();
      })
      .catch(() => {
        groupDataState = "unavailable";
        renderMicrocycles();
      });
  }
}

if (window.TRAINING_DATA?.records?.length) {
  setupMicrocycleEvaluation(window.TRAINING_DATA);
} else {
  document.querySelector("#microcycle-year").innerHTML = '<option value="">Base indisponível</option>';
  document.querySelector("#microcycle-athlete").innerHTML = '<option value="ALL">Todos os atletas</option>';
  document.querySelector("#microcycle-rows").innerHTML = '<tr><td colspan="7" class="empty-table">Atualize a base de treinos para visualizar os microciclos.</td></tr>';
}
