const state = {
  activeView: "executive",
  role: "exec",
  services: [],
  riskEngine: [],
  sourceWorkbook: "",
  extractedAt: "",
  evaluations: [],
  evidence: [],
  jiraTickets: []
};

const sampleServices = [
  { id: "svc-payments", name: "Payments Gateway", pillar: "Customer", tier: "Tier 1", owner: "Payments Platform", serviceType: "Internal", status: "TechOps Review", dueDate: "2026-05-20", completedOnTime: "Late" },
  { id: "svc-ledger", name: "Core Ledger", pillar: "Finance", tier: "Tier 1", owner: "Ledger Team", serviceType: "Internal", status: "Awaiting Evidence", dueDate: "2026-06-04", completedOnTime: "Completed" },
  { id: "svc-identity", name: "Identity Access", pillar: "Security", tier: "Tier 2", owner: "IAM", serviceType: "Internal", status: "Scheduled", dueDate: "2026-06-18", completedOnTime: "" },
  { id: "svc-pricing", name: "Pricing Service", pillar: "Commercial", tier: "Tier 2", owner: "Revenue Engineering", serviceType: "Internal", status: "TechOps Review", dueDate: "2026-05-28", completedOnTime: "Late" },
  { id: "svc-notify", name: "Notification Hub", pillar: "Operations", tier: "Tier 3", owner: "Comms Platform", serviceType: "Internal", status: "Done", dueDate: "2026-07-10", completedOnTime: "Completed" },
  { id: "svc-reporting", name: "Regulatory Reporting", pillar: "Risk", tier: "Tier 1", owner: "Risk Data", serviceType: "Internal", status: "Scheduled", dueDate: "2026-07-22", completedOnTime: "" },
  { id: "svc-data", name: "Data Exchange", pillar: "Data", tier: "Tier 2", owner: "Data Platform", serviceType: "Internal", status: "Awaiting Evidence", dueDate: "2026-08-14", completedOnTime: "" },
  { id: "svc-corp", name: "Corporate Intranet", pillar: "Corporate", tier: "Tier 4", owner: "Workplace IT", serviceType: "Corporate", status: "Scheduled", dueDate: "2026-08-28", completedOnTime: "" }
];

const sampleEvaluations = [
  { serviceId: "svc-payments", testingAbilityScore: 1, resiliencePostureScore: 2, architecturalRiskScore: 3, riskAlignmentScore: 1, urgencyLabel: "Critical", dimensionViolationCount: 3, totalViolationCount: 5, fullScaleViolation: 1, simulationViolation: 0 },
  { serviceId: "svc-pricing", testingAbilityScore: 1, resiliencePostureScore: 3, architecturalRiskScore: 2, riskAlignmentScore: 1, urgencyLabel: "High", dimensionViolationCount: 2, totalViolationCount: 3, fullScaleViolation: 0, simulationViolation: 1 },
  { serviceId: "svc-ledger", testingAbilityScore: 2, resiliencePostureScore: 4, architecturalRiskScore: 1, riskAlignmentScore: 2, urgencyLabel: "Moderate", dimensionViolationCount: 1, totalViolationCount: 1, fullScaleViolation: 0, simulationViolation: 0 },
  { serviceId: "svc-identity", testingAbilityScore: 2, resiliencePostureScore: 3, architecturalRiskScore: 2, riskAlignmentScore: 2, urgencyLabel: "Moderate", dimensionViolationCount: 1, totalViolationCount: 1, fullScaleViolation: 0, simulationViolation: 0 },
  { serviceId: "svc-notify", testingAbilityScore: 3, resiliencePostureScore: 5, architecturalRiskScore: 1, riskAlignmentScore: 3, urgencyLabel: "Low", dimensionViolationCount: 0, totalViolationCount: 0, fullScaleViolation: 0, simulationViolation: 0 },
  { serviceId: "svc-reporting", testingAbilityScore: 2, resiliencePostureScore: 4, architecturalRiskScore: 2, riskAlignmentScore: 2, urgencyLabel: "Moderate", dimensionViolationCount: 1, totalViolationCount: 1, fullScaleViolation: 0, simulationViolation: 0 },
  { serviceId: "svc-data", testingAbilityScore: 2, resiliencePostureScore: 3, architecturalRiskScore: 2, riskAlignmentScore: 2, urgencyLabel: "Moderate", dimensionViolationCount: 1, totalViolationCount: 1, fullScaleViolation: 0, simulationViolation: 0 }
];

async function init() {
  await loadWorkbookData();
  if (!state.services.length) state.services = load("services", sampleServices);
  if (!state.riskEngine.length) state.riskEngine = load("riskEngine", []);
  state.evaluations = load("evaluations", state.riskEngine.length ? [] : sampleEvaluations);
  state.evidence = load("evidence", []);
  state.jiraTickets = load("jiraTickets", []);
  bindEvents();
  render();
}

async function loadWorkbookData() {
  try {
    const response = await fetch("./data/workbook-data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.services = data.services || [];
    state.riskEngine = data.riskEngine || [];
    state.sourceWorkbook = data.sourceWorkbook || "";
    state.extractedAt = data.extractedAt || "";
  } catch (error) {
    state.services = sampleServices;
    state.riskEngine = [];
  }
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  document.getElementById("refreshBtn").addEventListener("click", render);
  document.getElementById("roleSelect").addEventListener("change", event => {
    state.role = event.target.value;
    renderQueue();
  });
  document.getElementById("runEvaluationBtn").addEventListener("click", runEvaluationForNextReadyService);
  document.getElementById("autoRunReadyBtn").addEventListener("click", autoRunReviewReady);
  document.getElementById("rebalanceBtn").addEventListener("click", rebalanceSchedule);
  document.getElementById("loadYamlBtn").addEventListener("click", loadCatalogueYaml);
  document.getElementById("serviceSearch").addEventListener("input", renderCatalogue);
  document.getElementById("tierFilter").addEventListener("change", renderCatalogue);
  document.getElementById("uploadForm").addEventListener("submit", handleUpload);
  document.getElementById("createJiraBtn").addEventListener("click", generateJiraTickets);
}

function setView(view) {
  state.activeView = view;
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  document.querySelectorAll(".view").forEach(section => section.classList.toggle("active", section.id === `view${capitalize(view)}`));
  const titles = {
    executive: "Executive Portfolio Report",
    queue: "TechOps Evaluation Actions",
    catalogue: "Service Catalogue Extract",
    schedule: "Testing Schedule",
    evidence: "Evidence Repository",
    jira: "Jira Actions",
    admin: "Admin Controls"
  };
  document.getElementById("pageTitle").textContent = titles[view];
}

function render() {
  const payload = getDashboardPayload();
  document.getElementById("summaryText").innerHTML = payload.executiveSummary;
  document.getElementById("lastSync").textContent = payload.lastSyncText;
  document.getElementById("breachRatio").textContent = `${payload.breachSummary.shown} / ${payload.breachSummary.total} violating target`;
  renderTopMetrics(payload.executiveMetrics);
  renderPostureMetrics(payload.postureMetrics);
  renderRiskTable(payload.servicesInBreach);
  renderChart(payload);
  renderQueue();
  renderCatalogue();
  renderSchedule();
  renderEvidence();
  renderJira();
  fillUploadServices();
}

function getDashboardPayload() {
  const scheduleRows = state.services.filter(row => !isCorporate(row));
  const scoredRows = scheduleRows.map(service => ({ ...service, ...evaluationFor(service.id, service.name) })).filter(hasAnyScore);
  const scheduledRows = scheduleRows.filter(row => row.dueDate);
  const overdueRows = scheduleRows.filter(row => row.completedOnTime === "Late");
  const pendingRows = scheduleRows.filter(row => isTechOpsReviewStatus(row.status));
  const riskRows = state.riskEngine.length
    ? state.riskEngine.filter(row => scheduleRows.some(service => service.name === row.serviceName))
    : scoredRows;
  const servicesInBreach = riskRows
    .filter(row => ["Critical", "High"].includes(cleanLabel(row.urgencyLabel)))
    .sort((a, b) => urgencySeverity(b.urgencyLabel) - urgencySeverity(a.urgencyLabel) || numericBreachScore(b) - numericBreachScore(a))
    .map(row => ({
      serviceName: row.name || row.serviceName,
      meta: [row.pillar, row.tier, row.owner || row.quarter].filter(Boolean).join(" · "),
      riskTier: cleanLabel(row.urgencyLabel).toUpperCase(),
      riskTierStyle: cleanLabel(row.urgencyLabel).toLowerCase(),
      score: `${buildRiskDisplayScore(row)}/100`,
      scoreStyle: cleanLabel(row.urgencyLabel) === "Critical" ? "red" : "dark",
      driver: buildRiskDriverText(row),
      violationCount: row.totalViolationCount,
      dimensionViolationCount: row.dimensionViolationCount
    }));
  const completionStats = buildServiceCompletionStats(scheduledRows);
  const postureMetrics = {
    resiliencePosture: buildNumericPostureMetric(scoredRows, "resiliencePostureScore", 5),
    testingAbility: buildNumericPostureMetric(scoredRows, "testingAbilityScore", 3),
    architecturalRisk: buildArchitecturalRiskMetric(scoredRows),
    riskAlignment: buildRiskAlignmentMetric(scoredRows)
  };

  return {
    executiveSummary: buildExecutiveSummary({
      totalServices: scheduleRows.length,
      overdueTests: overdueRows.length,
      pendingReviews: pendingRows.length,
      momentumPercent: completionStats.overallPercent,
      postureMetrics,
      topPortfolioRisks: servicesInBreach
    }),
    lastSyncText: state.sourceWorkbook
      ? `SOURCE: ${state.sourceWorkbook} · ${state.services.length} ROWS`
      : `LAST SYNC: ${new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
    executiveMetrics: {
      totalServices: { value: scheduleRows.length, tierBreakdown: buildTierBreakdown(scheduleRows), note: "Count of unique non-corporate services" },
      overdueTests: { value: overdueRows.length, tierBreakdown: buildTierBreakdown(overdueRows), note: "Service tests past their due date" },
      pendingReviews: { value: pendingRows.length, tierBreakdown: buildTierBreakdown(pendingRows), note: "Service tests awaiting evaluation" },
      testingMomentum: { completed: completionStats.completedServices, target: completionStats.totalServices, progressPercent: completionStats.overallPercent, tierCompletion: completionStats.tierCompletion, note: "A service counts as completed if it has been tested in the current cycle" }
    },
    postureMetrics,
    servicesInBreach,
    breachSummary: { shown: servicesInBreach.length, total: servicesInBreach.length }
  };
}

function renderTopMetrics(metrics) {
  document.getElementById("topMetrics").innerHTML = [
    renderTopMetricCard("Total Services", metrics.totalServices.value, renderTierBreakdown(metrics.totalServices.tierBreakdown), metrics.totalServices.note),
    renderTopMetricCard("Overdue Tests", metrics.overdueTests.value, renderTierBreakdown(metrics.overdueTests.tierBreakdown, true), metrics.overdueTests.note, true),
    renderTopMetricCard("Pending Reviews", metrics.pendingReviews.value, renderTierBreakdown(metrics.pendingReviews.tierBreakdown), metrics.pendingReviews.note),
    renderMomentumCard(metrics.testingMomentum)
  ].join("");
}

function renderPostureMetrics(metrics) {
  document.getElementById("postureMetrics").innerHTML = [
    renderPostureCard("Resilience Posture", metrics.resiliencePosture, false),
    renderPostureCard("Testing Ability", metrics.testingAbility, false),
    renderPostureCard("Architectural Risk", metrics.architecturalRisk, false),
    renderPostureCard("Risk Alignment", metrics.riskAlignment, true)
  ].join("");
}

function renderRiskTable(rows) {
  document.getElementById("riskTableBody").innerHTML = rows.map(row => `
    <tr>
      <td><div class="entity-name">${escapeHtml(row.serviceName)}</div><div class="entity-meta">${escapeHtml(row.meta)} · ${escapeHtml(row.violationCount)} violations</div></td>
      <td><span class="risk-badge ${riskClass(row.riskTierStyle)}">${escapeHtml(row.riskTier)}</span></td>
      <td><span class="${row.scoreStyle === "red" ? "score-red" : "score-dark"}">${escapeHtml(row.score)}</span></td>
      <td><div class="driver-text">${escapeHtml(row.driver)}</div></td>
    </tr>
  `).join("") || `<tr><td colspan="4">No target breaches detected.</td></tr>`;
}

function renderQueue() {
  const rows = state.services.filter(service => !isCorporate(service) && ["TechOps Review", "Awaiting Evidence", "Scheduled"].includes(service.status));
  document.getElementById("queueCards").innerHTML = rows.map(service => {
    const evaluation = evaluationFor(service.id, service.name);
    return `
      <article class="work-card">
        <h3>${escapeHtml(service.name)}</h3>
        <p>${escapeHtml(service.pillar)} · ${escapeHtml(service.tier)} · ${escapeHtml(service.owner)}</p>
        <p><span class="status-badge">${escapeHtml(service.status)}</span></p>
        <p>Due ${escapeHtml(service.dueDate)} · Risk ${escapeHtml(evaluation.urgencyLabel || "Not scored")}</p>
        <button class="secondary" onclick="runEvaluation('${service.id}')">Evaluate</button>
      </article>
    `;
  }).join("");
}

function renderCatalogue() {
  const search = document.getElementById("serviceSearch").value.toLowerCase();
  const tier = document.getElementById("tierFilter").value;
  const rows = state.services.filter(service => {
    const matchesSearch = [service.name, service.owner, service.pillar].join(" ").toLowerCase().includes(search);
    return matchesSearch && (!tier || service.tier === tier);
  });
  document.getElementById("catalogueBody").innerHTML = rows.slice(0, 80).map(service => `
    <tr>
      <td><div class="entity-name">${escapeHtml(service.name)}</div><div class="entity-meta">${escapeHtml(service.id)}</div></td>
      <td>${escapeHtml(service.pillar)}</td>
      <td>${escapeHtml(service.tier)}</td>
      <td>${escapeHtml(service.owner)}</td>
      <td><span class="status-badge">${escapeHtml(service.status)}</span></td>
    </tr>
  `).join("") + (rows.length > 80 ? `<tr><td colspan="5">Showing 80 of ${rows.length} services. Use search or tier filter to narrow the extract.</td></tr>` : "");
}

function renderSchedule() {
  const buckets = groupBy(state.services.filter(service => !isCorporate(service)), service => quarterFor(service.dueDate));
  document.getElementById("scheduleTimeline").innerHTML = Object.entries(buckets).map(([quarter, services]) => `
    <section class="schedule-item">
      <h3>${escapeHtml(quarter)}</h3>
      ${services.map(service => `<p><strong>${escapeHtml(service.name)}</strong><br>${escapeHtml(service.tier)} · ${escapeHtml(service.pillar)} · ${escapeHtml(service.dueDate)}</p>`).join("")}
    </section>
  `).join("");
}

function renderEvidence() {
  document.getElementById("evidenceCards").innerHTML = state.evidence.map(item => `
    <article class="work-card">
      <h3>${escapeHtml(item.fileName)}</h3>
      <p>${escapeHtml(serviceById(item.serviceId).name)} · ${escapeHtml(item.type)}</p>
      <p>Stored in ${escapeHtml(item.folder)}</p>
      <p><span class="status-badge">${escapeHtml(item.status)}</span></p>
    </article>
  `).join("") || `<article class="work-card"><h3>No evidence uploaded</h3><p>Upload a document to extract it for evaluation and link it to a service.</p></article>`;
}

function renderJira() {
  document.getElementById("jiraBody").innerHTML = state.jiraTickets.map(ticket => `
    <tr>
      <td><div class="entity-name">${escapeHtml(ticket.key)}</div><div class="entity-meta">${escapeHtml(ticket.summary)}</div></td>
      <td>${escapeHtml(serviceById(ticket.serviceId).name)}</td>
      <td>${escapeHtml(ticket.board)}</td>
      <td><span class="status-badge">${escapeHtml(ticket.status)}</span></td>
      <td>${escapeHtml(ticket.priority)}</td>
    </tr>
  `).join("") || `<tr><td colspan="5">No Jira tickets generated yet.</td></tr>`;
}

function renderChart(payload) {
  const canvas = document.getElementById("portfolioChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const labels = ["Resilience", "Testing", "Arch Risk", "Alignment"];
  const values = [
    payload.postureMetrics.resiliencePosture.value / 5 * 100,
    payload.postureMetrics.testingAbility.value / 3 * 100,
    (3 - payload.postureMetrics.architecturalRisk.value) / 3 * 100,
    payload.postureMetrics.riskAlignment.value
  ];
  const colors = ["#244a9b", "#3c68a8", "#d87a1c", "#1f7a4d"];
  ctx.font = "16px Arial";
  labels.forEach((label, index) => {
    const y = 56 + index * 82;
    ctx.fillStyle = "#647189";
    ctx.fillText(label, 24, y);
    ctx.fillStyle = "#e5ebf5";
    roundedRect(ctx, 160, y - 20, 430, 24, 12);
    ctx.fillStyle = colors[index];
    roundedRect(ctx, 160, y - 20, Math.max(10, values[index] * 4.3), 24, 12);
    ctx.fillStyle = "#172033";
    ctx.fillText(`${Math.round(values[index])}%`, 610, y);
  });
}

function renderTopMetricCard(title, value, detailHtml, note, alertCard = false) {
  return `<article class="metric-card ${alertCard ? "alert" : ""}">
    <div class="metric-label">${escapeHtml(title)}</div>
    <div class="metric-value">${escapeHtml(value)}</div>
    <div class="divider"></div>
    <div class="subheading">Tier Breakdown</div>
    ${detailHtml}
    <div class="micro-note">${escapeHtml(note)}</div>
  </article>`;
}

function renderMomentumCard(data) {
  return `<article class="metric-card">
    <div class="metric-label">Testing Momentum</div>
    <div class="metric-value">${escapeHtml(data.progressPercent)}%</div>
    <div class="divider"></div>
    <div class="subheading">Tier Breakdown</div>
    ${renderTierCompletionBreakdown(data.tierCompletion)}
    <div class="micro-note">${escapeHtml(data.note)}</div>
  </article>`;
}

function renderPostureCard(title, metric, isPercent) {
  return `<article class="metric-card">
    <div class="metric-label">${escapeHtml(title)}</div>
    <div class="metric-value">${escapeHtml(metric.value)}${isPercent ? "%" : ""}<span class="micro-note"> / ${escapeHtml(metric.max)}</span></div>
    <span class="pill ${escapeHtml(metric.labelStyle)}">${escapeHtml(metric.label)}</span>
    <div class="divider"></div>
    <div class="subheading">${isPercent ? "Tier Breakdown" : "Tier Averages"}</div>
    ${isPercent ? renderTierPercentBreakdown(metric.tierBreakdown) : renderTierBreakdown(metric.tierAverages)}
    <div class="micro-note">${escapeHtml(metric.note)}</div>
  </article>`;
}

function renderTierBreakdown(breakdown, redBars = false) {
  const max = Math.max(...Object.values(breakdown), 1);
  return ["T1", "T2", "T3", "T4"].map(tier => {
    const value = Number(breakdown[tier] || 0);
    const width = Math.max((value / max) * 100, value > 0 ? 8 : 0);
    return `<div class="tier-line"><div>${tier}</div><div class="bar"><div class="bar-fill ${redBars ? "red" : ""}" style="width:${width}%"></div></div><div>${escapeHtml(value)}</div></div>`;
  }).join("");
}

function renderTierPercentBreakdown(breakdown) {
  return ["T1", "T2", "T3", "T4"].map(tier => {
    const percent = Number(breakdown[tier] || 0);
    const tone = percent < 45 ? "red" : percent < 75 ? "orange" : "";
    return `<div class="tier-line"><div>${tier}</div><div class="bar"><div class="bar-fill ${tone}" style="width:${percent}%"></div></div><div>${percent}%</div></div>`;
  }).join("");
}

function renderTierCompletionBreakdown(breakdown) {
  return ["T1", "T2", "T3", "T4"].map(tier => {
    const item = breakdown[tier] || { percent: 0 };
    return `<div class="tier-line"><div>${tier}</div><div class="bar"><div class="bar-fill" style="width:${item.percent}%"></div></div><div>${item.percent}%</div></div>`;
  }).join("");
}

function runEvaluationForNextReadyService() {
  const next = state.services.find(service => isTechOpsReviewStatus(service.status));
  if (next) runEvaluation(next.id);
}

function autoRunReviewReady() {
  state.services.filter(service => isTechOpsReviewStatus(service.status)).forEach(service => runEvaluation(service.id, false));
  persist();
  render();
}

function runEvaluation(serviceId, shouldRender = true) {
  const service = serviceById(serviceId);
  const evidenceCount = state.evidence.filter(item => item.serviceId === serviceId).length;
  const tierPenalty = service.tier === "Tier 1" ? 1 : 0;
  const testingAbilityScore = Math.min(3, 1 + evidenceCount);
  const resiliencePostureScore = Math.min(5, 2 + evidenceCount + (service.completedOnTime === "Completed" ? 1 : 0));
  const architecturalRiskScore = Math.max(1, 3 - evidenceCount + tierPenalty);
  const riskAlignmentScore = Math.min(3, 1 + evidenceCount);
  const dimensionViolationCount = [testingAbilityScore < 2, resiliencePostureScore < 3, architecturalRiskScore > 2, riskAlignmentScore < 2].filter(Boolean).length;
  const urgencyLabel = dimensionViolationCount >= 3 || service.completedOnTime === "Late" && service.tier === "Tier 1" ? "Critical" : dimensionViolationCount >= 2 ? "High" : dimensionViolationCount === 1 ? "Moderate" : "Low";
  const evaluation = { serviceId, testingAbilityScore, resiliencePostureScore, architecturalRiskScore, riskAlignmentScore, urgencyLabel, dimensionViolationCount, totalViolationCount: dimensionViolationCount + (service.completedOnTime === "Late" ? 1 : 0), fullScaleViolation: service.completedOnTime === "Late" ? 1 : 0, simulationViolation: testingAbilityScore < 2 ? 1 : 0 };
  state.evaluations = state.evaluations.filter(item => item.serviceId !== serviceId).concat(evaluation);
  state.riskEngine = state.riskEngine.filter(item => item.serviceName !== service.name).concat({
    ...evaluation,
    serviceName: service.name,
    pillar: service.pillar,
    tier: service.tier,
    quarter: service.quarter,
    status: "Done"
  });
  service.status = "Done";
  persist();
  if (shouldRender) render();
}

function rebalanceSchedule() {
  const services = state.services.filter(service => !isCorporate(service)).sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.pillar.localeCompare(b.pillar));
  const start = new Date("2026-06-01T00:00:00");
  services.forEach((service, index) => {
    const due = new Date(start);
    due.setDate(start.getDate() + index * 14);
    service.dueDate = due.toISOString().slice(0, 10);
    if (service.status === "Done") service.status = "Scheduled";
  });
  persist();
  render();
}

async function loadCatalogueYaml() {
  try {
    const response = await fetch("./data/service-catalogue.yaml");
    const text = await response.text();
    state.services = parseSimpleCatalogueYaml(text);
    persist();
    render();
  } catch (error) {
    alert("Could not read data/service-catalogue.yaml. Keep the sample data or add the file to your GitHub repo.");
  }
}

function handleUpload(event) {
  event.preventDefault();
  const file = document.getElementById("uploadFile").files[0];
  const serviceId = document.getElementById("uploadService").value;
  if (!file || !serviceId) return;
  state.evidence.push({
    id: `ev-${Date.now()}`,
    serviceId,
    fileName: file.name,
    type: file.name.split(".").pop().toUpperCase(),
    folder: `/Resilience/Evidence/${serviceId}/${new Date().toISOString().slice(0, 10)}`,
    status: "Extracted"
  });
  const service = serviceById(serviceId);
  service.status = "TechOps Review";
  persist();
  event.target.reset();
  render();
}

function generateJiraTickets() {
  const breachServices = getDashboardPayload().servicesInBreach;
  const nextNumber = state.jiraTickets.length + 101;
  breachServices.forEach((breach, index) => {
    const service = state.services.find(item => item.name === breach.serviceName);
    if (!service || state.jiraTickets.some(ticket => ticket.serviceId === service.id)) return;
    state.jiraTickets.push({
      key: `RT-${nextNumber + index}`,
      serviceId: service.id,
      summary: `Complete resilience testing action for ${service.name}`,
      board: service.owner,
      status: "To Do",
      priority: breach.riskTier === "CRITICAL" ? "Highest" : "High"
    });
  });
  persist();
  render();
}

function fillUploadServices() {
  document.getElementById("uploadService").innerHTML = state.services.filter(service => !isCorporate(service)).map(service => `<option value="${escapeHtml(service.id)}">${escapeHtml(service.name)}</option>`).join("");
}

function parseSimpleCatalogueYaml(text) {
  const blocks = text.split(/\n(?=\s*-\s+id:)/g);
  return blocks.map(block => {
    const item = {};
    block.split("\n").forEach(line => {
      const match = line.match(/^\s*-?\s*([a-zA-Z_]+):\s*(.+)\s*$/);
      if (match) item[match[1]] = match[2].replace(/^["']|["']$/g, "");
    });
    return {
      id: item.id,
      name: item.name,
      pillar: item.pillar,
      tier: item.tier,
      owner: item.owner,
      serviceType: item.service_type || "Internal",
      status: item.status || "Scheduled",
      dueDate: item.due_date || "",
      completedOnTime: item.completed_on_time || ""
    };
  }).filter(item => item.id && item.name);
}

function buildExecutiveSummary(ctx) {
  const cautionLabel = ctx.overdueTests >= 20 ? "High Caution" : ctx.overdueTests >= 10 ? "Elevated Watch" : "Controlled";
  const resilience = ctx.postureMetrics.resiliencePosture.value || 0;
  const testing = ctx.postureMetrics.testingAbility.value || 0;
  const arch = ctx.postureMetrics.architecturalRisk.value || 0;
  const topRiskName = ctx.topPortfolioRisks.length ? ctx.topPortfolioRisks[0].serviceName : "no critical service";
  const topRiskDriver = ctx.topPortfolioRisks.length ? ctx.topPortfolioRisks[0].driver : "no material threshold breaches detected";
  return `Current organisational resilience maintains a <strong>"${cautionLabel}"</strong> status across <strong>${ctx.totalServices}</strong> services. The portfolio currently shows <strong>${ctx.overdueTests}</strong> overdue tests and <strong>${ctx.pendingReviews}</strong> pending reviews, with testing momentum at <strong>${ctx.momentumPercent}%</strong>. Average resilience posture is <strong>${resilience.toFixed(1)}/5</strong>, testing ability is <strong>${testing.toFixed(1)}/3</strong>, and architectural risk stands at <strong>${arch.toFixed(1)}/3</strong>. Immediate executive focus is recommended on <strong>${escapeHtml(topRiskName)}</strong> because <strong>${escapeHtml(topRiskDriver)}</strong>.`;
}

function buildNumericPostureMetric(rows, scoreField, max) {
  const values = rows.map(row => Number(row[scoreField] || 0)).filter(Boolean);
  const value = round1(average(values));
  return { value, max, label: labelFor(scoreField, value, max), labelStyle: labelStyle(scoreField, value, max), tierAverages: buildTierAverageMap(rows, scoreField), note: `Average based on populated ${scoreField} values` };
}

function buildArchitecturalRiskMetric(rows) {
  const metric = buildNumericPostureMetric(rows, "architecturalRiskScore", 3);
  metric.note = "Lower score indicates lower architectural risk";
  return metric;
}

function buildRiskAlignmentMetric(rows) {
  const avg = average(rows.map(row => row.riskAlignmentScore).filter(Boolean));
  const value = Math.round(avg / 3 * 100);
  return { value, max: 100, label: value >= 75 ? "Aligned" : value >= 45 ? "Partially aligned" : "Misaligned", labelStyle: value >= 75 ? "blue" : value >= 45 ? "orange" : "red", tierBreakdown: buildTierPercentMap(rows, "riskAlignmentScore", 3), note: "Converted from average Risk Alignment Score out of 3" };
}

function buildTierBreakdown(rows) {
  return ["T1", "T2", "T3", "T4"].reduce((acc, tier) => ({ ...acc, [tier]: rows.filter(row => tierGroup(row.tier) === tier).length }), {});
}

function buildTierAverageMap(rows, field) {
  return ["T1", "T2", "T3", "T4"].reduce((acc, tier) => ({ ...acc, [tier]: round1(average(rows.filter(row => tierGroup(row.tier) === tier).map(row => row[field]).filter(Boolean))) }), {});
}

function buildTierPercentMap(rows, field, max) {
  return ["T1", "T2", "T3", "T4"].reduce((acc, tier) => ({ ...acc, [tier]: Math.round(average(rows.filter(row => tierGroup(row.tier) === tier).map(row => row[field]).filter(Boolean)) / max * 100) || 0 }), {});
}

function buildServiceCompletionStats(rows) {
  const completed = rows.filter(row => row.completedOnTime === "Completed");
  return {
    totalServices: rows.length,
    completedServices: completed.length,
    overallPercent: rows.length ? Math.round(completed.length / rows.length * 100) : 0,
    tierCompletion: ["T1", "T2", "T3", "T4"].reduce((acc, tier) => {
      const tierRows = rows.filter(row => tierGroup(row.tier) === tier);
      const tierDone = tierRows.filter(row => row.completedOnTime === "Completed");
      acc[tier] = { completed: tierDone.length, total: tierRows.length, percent: tierRows.length ? Math.round(tierDone.length / tierRows.length * 100) : 0 };
      return acc;
    }, {})
  };
}

function buildRiskDisplayScore(row) {
  const base = row.urgencyLabel === "Critical" ? 75 : row.urgencyLabel === "High" ? 50 : row.urgencyLabel === "Moderate" ? 25 : 0;
  return Math.min(100, base + Number(row.dimensionViolationCount || 0) * 5 + Number(row.fullScaleViolation || 0) * 10 + Number(row.simulationViolation || 0) * 5);
}

function buildRiskDriverText(row) {
  if (row.fullScaleViolation && row.dimensionViolationCount > 0) return `Missing Full Scale in the last 12 months and below expected threshold in ${row.dimensionViolationCount} review dimensions for ${row.tier}.`;
  if (row.simulationViolation) return "Below the minimum Simulation-ready baseline.";
  if (row.dimensionViolationCount >= 2) return `${row.dimensionViolationCount} review dimensions are below the expected threshold for ${row.tier}.`;
  if (row.dimensionViolationCount === 1) return `One review dimension is below the expected threshold for ${row.tier}.`;
  return "Flagged for review based on current urgency ranking.";
}

function numericBreachScore(row) {
  return Math.min(100, Number(row.dimensionViolationCount || 0) * 15 + Number(row.fullScaleViolation || 0) * 20 + Number(row.simulationViolation || 0) * 10 + (row.tier === "Tier 1" ? 20 : row.tier === "Tier 2" ? 10 : 5));
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function labelFor(field, value, max) {
  if (field === "architecturalRiskScore") return value <= 1 ? "Low" : value <= 2 ? "Moderate" : "High";
  const pct = value / max;
  return pct >= 0.75 ? "Strong" : pct >= 0.45 ? "Developing" : "Weak";
}

function labelStyle(field, value, max) {
  if (field === "architecturalRiskScore") return value <= 1 ? "blue" : value <= 2 ? "orange" : "red";
  const pct = value / max;
  return pct >= 0.75 ? "blue" : pct >= 0.45 ? "orange" : "red";
}

function isTechOpsReviewStatus(status) {
  return ["techops review", "in techops review"].includes(String(status || "").toLowerCase());
}

function hasAnyScore(row) {
  return ["testingAbilityScore", "resiliencePostureScore", "architecturalRiskScore", "riskAlignmentScore"].some(field => Number.isFinite(Number(row[field])));
}

function tierGroup(value) {
  if (String(value).includes("1")) return "T1";
  if (String(value).includes("2")) return "T2";
  if (String(value).includes("3")) return "T3";
  return "T4";
}

function tierRank(tier) {
  return Number(String(tier).match(/\d/)?.[0] || 4);
}

function urgencySeverity(label) {
  return { Critical: 4, High: 3, Moderate: 2, Low: 1 }[cleanLabel(label)] || 0;
}

function isCorporate(service) {
  return String(service.serviceType || "").toLowerCase().includes("corporate");
}

function riskClass(style) {
  if (style === "critical") return "risk-critical";
  if (style === "high") return "risk-high";
  return "risk-moderate";
}

function evaluationFor(serviceId, serviceName = "") {
  return state.evaluations.find(item => item.serviceId === serviceId) ||
    state.riskEngine.find(item => item.serviceName === serviceName) ||
    {};
}

function cleanLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "Moderate";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function serviceById(serviceId) {
  return state.services.find(item => item.id === serviceId) || { name: "Unknown service" };
}

function quarterFor(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}

function groupBy(items, fn) {
  return items.reduce((acc, item) => {
    const key = fn(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : 0;
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[char]));
}

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(`stratosphere:${key}`)) || fallback;
  } catch {
    return fallback;
  }
}

function persist() {
  localStorage.setItem("stratosphere:services", JSON.stringify(state.services));
  localStorage.setItem("stratosphere:riskEngine", JSON.stringify(state.riskEngine));
  localStorage.setItem("stratosphere:evaluations", JSON.stringify(state.evaluations));
  localStorage.setItem("stratosphere:evidence", JSON.stringify(state.evidence));
  localStorage.setItem("stratosphere:jiraTickets", JSON.stringify(state.jiraTickets));
}

init();
