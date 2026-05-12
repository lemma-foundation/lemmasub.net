const DATA_URL = new URL(
  document.body.dataset.page === "dashboard" ? "../data/public-dashboard.json" : "data/public-dashboard.json",
  document.baseURI,
).href;
const DASHBOARD_REFRESH_MS = 30000;

let miners = [];
let minerFilter = "";
let activeOnly = true;
let verifiedOnly = false;
let sortState = { key: "score", direction: "desc", type: "number" };
let scheduleTimer = 0;
let dashboardRefreshTimer = 0;
let scheduleCanRotate = false;
let controlsAttached = false;
let displayedTheorems = {};
let dashboardData = {};
let dashboardDataLoaded = false;

document.addEventListener("DOMContentLoaded", async () => {
  initializeTheme();
  initializeInfoTips();
  const result = await loadDashboardData();
  const data = normalizeDashboardData(result.data);
  hydrateHome(data, result.ok);
  hydrateDashboard(data, result.ok);
});

async function loadDashboardData() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      return { ok: false, data: {} };
    }
    return { ok: true, data: await response.json() };
  } catch {
    return { ok: false, data: {} };
  }
}

function normalizeDashboardData(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  return {
    schema_version: data.schema_version,
    generated_at: stringOrEmpty(data.generated_at),
    network: stringOrEmpty(data.network),
    netuid: data.netuid,
    chain_head_block: data.chain_head_block,
    problem_seed_chain_head: data.problem_seed_chain_head,
    problem_seed: data.problem_seed,
    problem_seed_tag: stringOrEmpty(data.problem_seed_tag),
    problem_seed_mode: stringOrEmpty(data.problem_seed_mode),
    problem_seed_quantize_blocks: data.problem_seed_quantize_blocks,
    block_time_sec_estimate: data.block_time_sec_estimate,
    score_source: stringOrEmpty(data.score_source),
    correct_count_window_hours: Number(data.correct_count_window_hours || 24),
    theorems: data.theorems && typeof data.theorems === "object" ? data.theorems : {},
    miners: Array.isArray(data.miners) ? data.miners.map(normalizeMiner) : []
  };
}

function normalizeMiner(miner) {
  return {
    uid: numberOrNull(miner?.uid),
    coldkey: stringOrEmpty(miner?.coldkey),
    hotkey: stringOrEmpty(miner?.hotkey),
    score: numberOrNull(miner?.score),
    correct: Number(miner?.correct_theorems_24h || 0),
    uid_url: stringOrEmpty(miner?.uid_url),
    coldkey_url: stringOrEmpty(miner?.coldkey_url),
    hotkey_url: stringOrEmpty(miner?.hotkey_url)
  };
}

function hydrateHome(data, dataLoaded) {
  if (document.body.dataset.page !== "home") {
    return;
  }

  const stats = dashboardStats(data);
  const current = data.theorems.current;

  setAll("[data-current-id]", current ? theoremTitle(current) : (dataLoaded ? "No current theorem" : "Data unavailable"));
  setAll("[data-current-goal]", current?.type_expr || "Public dashboard JSON is not available.");
  setAll("[data-network-label]", networkLabel(data));
  setAll("[data-top-score]", formatScore(stats.topMiner?.score));
  setAll("[data-top-miner]", stats.topMiner ? `UID ${stats.topMiner.uid}` : "No data");
  setAll("[data-proof-count]", String(stats.proofCount));
}

function hydrateDashboard(data, dataLoaded) {
  if (document.body.dataset.page !== "dashboard") {
    return;
  }

  attachMinerControls();
  applyDashboardData(data, dataLoaded, { animate: false });
  startDashboardPolling();
}

function applyDashboardData(data, dataLoaded, { animate = true } = {}) {
  const previousCurrent = theoremKey(displayedTheorems.current);
  miners = data.miners;
  dashboardData = data;
  dashboardDataLoaded = dataLoaded;
  displayedTheorems = { ...data.theorems };
  const stats = dashboardStats(data);

  setText("[data-dashboard-state]", dashboardStateText(data, dataLoaded));
  setText("[data-status-network]", networkLabel(data));
  setText("[data-status-age]", dataAgeLabel(data.generated_at));
  setText("[data-status-chain-head]", blockNumberLabel(data));
  setAll("[data-miner-count]", String(stats.minerCount));
  setAll("[data-top-score]", formatScore(stats.topMiner?.score));
  setAll("[data-top-miner]", stats.topMiner ? `UID ${stats.topMiner.uid}` : "No data");
  setAll("[data-proof-count]", String(stats.proofCount));

  const theoremChanged = previousCurrent && previousCurrent !== theoremKey(displayedTheorems.current);
  renderTheorems(displayedTheorems);
  if (animate && theoremChanged) {
    animateTheoremGrid();
  }
  startScheduleTicker(data);
  setHidden("[data-empty-miners]", stats.minerCount > 0);
  renderMiners();
}

function dashboardStats(data) {
  const validMiners = data.miners.filter(isActiveMiner);
  const topMiner = validMiners.sort((a, b) => {
    return b.score - a.score || Number(a.uid) - Number(b.uid);
  })[0];

  return {
    minerCount: validMiners.length,
    proofCount: validMiners.reduce((sum, miner) => sum + miner.correct, 0),
    topMiner
  };
}

function renderTheorems(theorems) {
  const grid = document.querySelector("[data-theorem-grid]");
  if (!grid) {
    return;
  }

  const current = theoremCard("current", theorems.current, true);
  const previous = theoremCard("previous", theorems.previous, false);
  const next = theoremCard("next", theorems.next, false);
  grid.innerHTML = `${current}<div class="side-theorems">${next}${previous}</div>`;
}

function theoremCard(label, theorem, isMain) {
  const heading = isMain ? "h2" : "h3";
  const title = label === "current" ? "Current theorem" : `${capitalize(label)} theorem`;
  if (!theorem) {
    return `<article class="theorem-card${isMain ? " current" : ""}">
      <p class="label">${escapeHtml(title)}</p>
      <${heading}>Waiting for fresh public data</${heading}>
      <p class="theorem-explain">The current snapshot does not include another theorem for this slot yet.</p>
    </article>`;
  }

  if (!isMain) {
    return `<article class="theorem-card compact">
      <div class="theorem-topline">
        <p class="label">${escapeHtml(title)}</p>
        <p class="theorem-name">${badge(humanSplit(theorem.split))} ${badge(humanTopic(theorem.topic))}</p>
      </div>
      <${heading}>${escapeHtml(theoremTitle(theorem))}</${heading}>
      <p class="statement-label">Lean type</p>
      <pre class="lean-statement">${escapeHtml(theorem.type_expr || "")}</pre>
      <p class="plain-type"><span>Plain English</span>${escapeHtml(plainTheorem(theorem))}</p>
      <details class="technical-details">
        <summary>Details</summary>
        <dl>
          <dt>Theorem id</dt><dd>${escapeHtml(theorem.theorem_id || "unknown")}</dd>
          <dt>Name</dt><dd>${escapeHtml(theorem.name || "unknown")}</dd>
          <dt>Seed</dt><dd>${escapeHtml(theorem.seed ?? "unknown")}</dd>
        </dl>
      </details>
    </article>`;
  }

  return `<article class="theorem-card current">
    <div class="theorem-topline">
      <p class="label">${escapeHtml(title)}</p>
      <div class="theorem-meta">
        <span>${escapeHtml(humanSplit(theorem.split))}</span>
        <span>${escapeHtml(humanTopic(theorem.topic))}</span>
        <span>Time left: <strong data-next-countdown>${escapeHtml(nextCountdownLabel(dashboardData))}</strong></span>
      </div>
    </div>
    <${heading}>${escapeHtml(theoremTitle(theorem))}</${heading}>
    <p class="statement-label">Lean type</p>
    <pre class="lean-statement">${escapeHtml(theorem.type_expr || "")}</pre>
    <p class="plain-type"><span>Plain English</span>${escapeHtml(plainTheorem(theorem))}</p>
    <details class="technical-details">
      <summary>Details</summary>
      <dl>
        <dt>Theorem id</dt><dd>${escapeHtml(theorem.theorem_id || "unknown")}</dd>
        <dt>Name</dt><dd>${escapeHtml(theorem.name || "unknown")}</dd>
        <dt>Seed</dt><dd>${escapeHtml(theorem.seed ?? "unknown")}</dd>
      </dl>
    </details>
  </article>`;
}

function attachMinerControls() {
  if (controlsAttached) {
    return;
  }
  controlsAttached = true;

  const activeInput = document.querySelector("[data-active-only]");
  if (activeInput) {
    activeInput.checked = activeOnly;
  }

  document.querySelector("[data-miner-search]")?.addEventListener("input", (event) => {
    minerFilter = event.target.value.trim().toLowerCase();
    renderMiners();
  });

  document.querySelector("[data-active-only]")?.addEventListener("change", (event) => {
    activeOnly = event.target.checked;
    renderMiners();
  });

  document.querySelector("[data-verified-only]")?.addEventListener("change", (event) => {
    verifiedOnly = event.target.checked;
    renderMiners();
  });

  document.querySelectorAll("[data-sort-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sortKey;
      const sameColumn = sortState.key === key;
      sortState = {
        key,
        type: button.dataset.sortType || "text",
        direction: sameColumn && sortState.direction === "asc" ? "desc" : "asc"
      };
      renderMiners();
    });
  });
}

function renderMiners() {
  const tbody = document.querySelector("[data-miners-body]");
  if (!tbody) {
    return;
  }

  const rows = filteredMiners().sort(compareMiners);
  tbody.innerHTML = rows.length
    ? rows.map(minerRow).join("")
    : `<tr><td colspan="5">${escapeHtml(emptyMinerText())}</td></tr>`;
}

function emptyMinerText() {
  if (!dashboardDataLoaded) {
    return "Public dashboard JSON is unavailable.";
  }
  if (minerFilter || verifiedOnly || activeOnly) {
    return "No miners match this view.";
  }
  return "No public miner rows in this export.";
}

function filteredMiners() {
  return miners.filter((miner) => {
    if (activeOnly && !isActiveMiner(miner)) {
      return false;
    }
    if (verifiedOnly && miner.correct <= 0) {
      return false;
    }
    if (!minerFilter) {
      return true;
    }
    return [miner.uid, miner.coldkey, miner.hotkey].join(" ").toLowerCase().includes(minerFilter);
  });
}

function isActiveMiner(miner) {
  return miner.uid !== null && Number(miner.score || 0) > 0;
}

function compareMiners(a, b) {
  const dir = sortState.direction === "asc" ? 1 : -1;
  const av = minerSortValue(a, sortState.key);
  const bv = minerSortValue(b, sortState.key);
  if (sortState.type === "number") {
    const an = av === null || av === undefined ? -Infinity : Number(av);
    const bn = bv === null || bv === undefined ? -Infinity : Number(bv);
    return dir * (an - bn || Number(a.uid) - Number(b.uid));
  }
  return dir * String(av || "").localeCompare(String(bv || ""));
}

function minerSortValue(miner, key) {
  if (key === "correct") {
    return miner.correct;
  }
  return miner[key];
}

function minerRow(miner) {
  return `<tr>
    <td>${linkOrText(miner.uid === null ? "?" : String(miner.uid), miner.uid_url)}</td>
    <td class="addr">${linkOrText(miner.coldkey, miner.coldkey_url)}</td>
    <td class="addr">${linkOrText(miner.hotkey, miner.hotkey_url)}</td>
    <td>${formatScore(miner.score)}</td>
    <td>${miner.correct}</td>
  </tr>`;
}

function networkLabel(data) {
  const network = data.network || "unknown";
  const netuid = data.netuid === undefined || data.netuid === null ? "?" : data.netuid;
  return `${network} / netuid ${netuid}`;
}

function plainTheorem(theorem) {
  if (theorem?.type_expr) {
    return englishishLean(theorem.type_expr);
  }
  const fromExplanation = theorem?.explanation?.match(/prove that (.+)\.?$/i);
  return fromExplanation?.[1] ? englishishLean(fromExplanation[1]) : "Unknown theorem.";
}

function theoremTitle(theorem) {
  const type = String(theorem?.type_expr || "");
  if (type.includes("⊆") && type.includes(".card")) {
    return "Subset size";
  }
  if (type.includes("Nat.Prime") && type.includes("∣")) {
    return "Prime divisor";
  }
  if (type.includes("Matrix.det")) {
    return "Matrix determinant";
  }
  return humanTopic(theorem?.topic) ? `${humanTopic(theorem.topic)} theorem` : "Generated theorem";
}

function englishishLean(typeExpr) {
  const text = String(typeExpr || "").trim().replace(/^∀\s+/, "forall ").replace(/^∃\s+/, "exists ");
  const notExists = text.match(/^¬\s*∃\s+(.+?)\s+:\s+(.+?),\s*(.+)$/);
  if (notExists) {
    const noun = leanTypeNoun(notExists[2]);
    return sentenceCase(`there is no ${noun} ${notExists[1].trim()} such that ${clauseText(englishishLean(notExists[3]))}`);
  }
  const exists = text.match(/^exists\s+(.+?)\s+:\s+(.+?),\s+(.+)$/);
  if (exists) {
    const noun = leanTypeNoun(exists[2]);
    return sentenceCase(`there exists ${articleFor(noun)} ${noun} ${exists[1].trim()} such that ${clauseText(englishishLean(exists[3]))}`);
  }
  const forall = text.match(/^forall\s+(.+?)\s+:\s+(.+?),\s+(.+)$/);
  if (forall) {
    return sentenceCase(`for every ${leanTypeNoun(forall[2])} ${joinNames(forall[1])}, ${clauseText(englishishLean(forall[3]))}`);
  }
  const implication = splitOnce(text, " → ") || splitOnce(text, " -> ");
  if (implication) {
    return sentenceCase(`if ${clauseText(englishishLean(implication[0]))}, then ${clauseText(englishishLean(implication[1]))}`);
  }
  const conjunction = splitOnce(text, " ∧ ");
  if (conjunction) {
    return sentenceCase(`${clauseText(englishishLean(conjunction[0]))} and ${clauseText(englishishLean(conjunction[1]))}`);
  }
  return sentenceCase(humanizeExpression(text));
}

function humanizeExpression(text) {
  const raw = String(text || "");
  const determinant = raw.match(/^Matrix\.det\s+\(.+\)\s+=\s+(.+)$/);
  if (determinant) {
    return `the determinant of the displayed matrix equals ${determinant[1]}`;
  }
  return raw
    .replace(/\(([^()]+)\s*:\s*ℚ\)/g, "$1")
    .replace(/Nat\.Prime\s+([A-Za-z0-9_]+)/g, "$1 is prime")
    .replace(/([A-Za-z0-9_]+)\.card\s*≤\s*([A-Za-z0-9_]+)\.card/g, "the number of elements in $1 is at most the number of elements in $2")
    .replace(/([A-Za-z0-9_]+)\s*∈\s*([A-Za-z0-9_]+)/g, "$1 is in $2")
    .replace(/([A-Za-z0-9_]+)\s*∉\s*([A-Za-z0-9_]+)/g, "$1 is not in $2")
    .replaceAll("¬", "not ")
    .replaceAll("⊆", "is a subset of")
    .replaceAll(".card", " cardinality")
    .replaceAll(" ∣ ", " divides ")
    .replaceAll(" → ", " implies ")
    .replaceAll(" -> ", " implies ")
    .replaceAll(" ∧ ", " and ")
    .replaceAll(" ∨ ", " or ")
    .replaceAll(" = ", " equals ")
    .replaceAll(" + ", " plus ")
    .replaceAll(" * ", " times ")
    .replaceAll(" ^ ", " to the power ")
    .replaceAll(" ≤ ", " is at most ")
    .replaceAll(" ≥ ", " is at least ");
}

function leanTypeNoun(typeName) {
  return {
    Nat: "natural number",
    Int: "integer",
    "ℕ": "natural number",
    Real: "real number",
    "ℝ": "real number",
    "ℤ": "integer",
    "ℚ": "rational number",
    Prop: "proposition",
    Type: "type",
    "Finset Nat": "finite set of natural numbers"
  }[typeName] || typeName;
}

function joinNames(names) {
  const parts = String(names || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return parts[0] || "";
  }
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

function splitOnce(text, token) {
  const index = text.indexOf(token);
  if (index < 0) {
    return null;
  }
  return [text.slice(0, index), text.slice(index + token.length)];
}

function articleFor(noun) {
  return /^[aeiou]/i.test(noun) ? "an" : "a";
}

function stripPeriod(value) {
  return String(value || "").trim().replace(/\.$/, "");
}

function clauseText(value) {
  const text = stripPeriod(value);
  if (/^[A-Z]\b(?= (is|is not|or|and|equals|divides|cardinality)\b)/.test(text)) {
    return text;
  }
  return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : "";
}

function sentenceCase(value) {
  const text = String(value || "").trim().replace(/\.$/, "");
  if (!text) {
    return "Unknown theorem.";
  }
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

function humanSplit(split) {
  return split ? `${capitalize(split)} difficulty` : "";
}

function humanTopic(topic) {
  const raw = String(topic || "").split(".").pop()?.replaceAll("_", " ") || "";
  return raw ? capitalize(raw) : "";
}

function capitalize(value) {
  const text = String(value || "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "";
}

function nextCountdownLabel(data) {
  const seconds = secondsUntilNextTheorem(data);
  if (seconds === null) {
    return "unknown";
  }
  return formatDuration(seconds);
}

function secondsUntilNextTheorem(data) {
  const generatedAt = Date.parse(data.generated_at);
  const blockTime = numberOrNull(data.block_time_sec_estimate);
  const interval = numberOrNull(data.problem_seed_quantize_blocks);
  const currentSeed = numberOrNull(data.problem_seed);
  const chainHead = numberOrNull(data.chain_head_block);
  if (Number.isNaN(generatedAt) || blockTime === null || interval === null || currentSeed === null || chainHead === null) {
    return null;
  }

  const blocksRemainingAtExport = Math.max(0, currentSeed + interval - chainHead);
  const deadline = generatedAt + blocksRemainingAtExport * blockTime * 1000;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

function startScheduleTicker(data) {
  window.clearInterval(scheduleTimer);
  const initialCountdown = secondsUntilNextTheorem(data);
  scheduleCanRotate = initialCountdown !== null && initialCountdown > 0;
  tickSchedule(data);
  scheduleTimer = window.setInterval(() => tickSchedule(data), 1000);
}

function tickSchedule(data) {
  const countdown = secondsUntilNextTheorem(data);
  setText("[data-status-age]", dataAgeLabel(data.generated_at));
  setText("[data-status-chain-head]", blockNumberLabel(data));
  setText("[data-dashboard-state]", dashboardStateText(data, dashboardDataLoaded));
  if (countdown === null) {
    setText("[data-next-countdown]", "unknown");
    return;
  }
  if (countdown === 0 && scheduleCanRotate && displayedTheorems.next) {
    scheduleCanRotate = false;
    rotateTheorems();
    refreshDashboardData();
    setText("[data-next-countdown]", "Waiting for public data");
    return;
  }
  setText("[data-next-countdown]", countdown === 0 ? "Waiting for public data" : formatDuration(countdown));
}

function rotateTheorems() {
  displayedTheorems = {
    previous: displayedTheorems.current,
    current: displayedTheorems.next,
    next: null
  };
  dashboardData = { ...dashboardData, theorems: displayedTheorems };
  renderTheorems(displayedTheorems);
  animateTheoremGrid();
}

function animateTheoremGrid() {
  const grid = document.querySelector("[data-theorem-grid]");
  grid?.classList.add("is-rotating");
  window.setTimeout(() => grid?.classList.remove("is-rotating"), 450);
}

function theoremKey(theorem) {
  if (!theorem) {
    return "";
  }
  return String(theorem.theorem_id || theorem.seed || theorem.type_expr || "");
}

function startDashboardPolling() {
  window.clearInterval(dashboardRefreshTimer);
  dashboardRefreshTimer = window.setInterval(refreshDashboardData, DASHBOARD_REFRESH_MS);
}

async function refreshDashboardData() {
  const result = await loadDashboardData();
  if (!result.ok) {
    setText("[data-dashboard-state]", "Unable to refresh public data. Showing the last loaded snapshot.");
    return;
  }
  applyDashboardData(normalizeDashboardData(result.data), true);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function initializeTheme() {
  const stored = storedTheme();
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  setTheme(stored || preferred);

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      storeTheme(next);
      setTheme(next);
    });
  });
}

function storedTheme() {
  try {
    return localStorage.getItem("lemma-theme");
  } catch {
    return "";
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem("lemma-theme", theme);
  } catch {
    // Theme still changes for the current page even when persistence is unavailable.
  }
}

function setTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = normalized;
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.textContent = normalized === "dark" ? "Light" : "Dark";
    button.setAttribute("aria-pressed", normalized === "dark" ? "true" : "false");
  });
}

function initializeInfoTips() {
  document.querySelectorAll(".info-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const tip = button.closest(".info-tip");
      const open = !tip?.classList.contains("is-open");
      closeInfoTips();
      if (tip && open) {
        tip.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("click", closeInfoTips);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInfoTips();
    }
  });
}

function closeInfoTips() {
  document.querySelectorAll(".info-tip.is-open").forEach((tip) => {
    tip.classList.remove("is-open");
    tip.querySelector(".info-button")?.setAttribute("aria-expanded", "false");
  });
}

function badge(value) {
  if (!value) {
    return "";
  }
  return `<span class="badge">${escapeHtml(value)}</span>`;
}

function linkOrText(text, url) {
  const label = escapeHtml(text || "");
  if (!url) {
    return label;
  }
  return `<a href="${escapeHtml(url)}" rel="noopener noreferrer">${label}</a>`;
}

function formatScore(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "?";
  }
  return Number(value).toFixed(6);
}

function formatInteger(value) {
  const number = numberOrNull(value);
  return number === null ? "unknown" : new Intl.NumberFormat("en-US").format(number);
}

function blockNumberLabel(data) {
  const number = estimatedBlockNumber(data);
  return number === null ? "unknown" : formatInteger(number);
}

function estimatedBlockNumber(data) {
  const chainHead = numberOrNull(data.chain_head_block);
  const blockTime = numberOrNull(data.block_time_sec_estimate);
  const generatedAt = Date.parse(data.generated_at);
  if (chainHead === null) {
    return null;
  }
  if (blockTime === null || blockTime <= 0 || Number.isNaN(generatedAt)) {
    return chainHead;
  }
  return Math.floor(chainHead + Math.max(0, Date.now() - generatedAt) / 1000 / blockTime);
}

function formatAge(value) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return "unknown";
  }
  const diffSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}

function dataAgeLabel(value) {
  return Date.parse(value) ? `${formatAge(value)} ago` : "unknown";
}

function dashboardStateText(data, dataLoaded) {
  if (!dataLoaded) {
    return "Public dashboard data unavailable.";
  }
  const ageSeconds = ageSecondsFromNow(data.generated_at);
  if (ageSeconds === null) {
    return "Public dashboard data loaded. Timestamp unavailable.";
  }
  const age = formatAge(data.generated_at);
  return ageSeconds > 900 ? `Stale public data: updated ${age} ago.` : `Fresh public data: updated ${age} ago.`;
}

function ageSecondsFromNow(value) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return null;
  }
  return Math.max(0, Math.floor((Date.now() - time) / 1000));
}

function setAll(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

function setHidden(selector, hidden) {
  document.querySelectorAll(selector).forEach((node) => {
    node.hidden = hidden;
  });
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value : "";
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
