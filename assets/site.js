const PAGE = document.body.dataset.page;
const DATA_URL = new URL(
  PAGE === "dashboard" ? "../data/public-dashboard.json" : "data/public-dashboard.json",
  document.baseURI,
).href;
const DASHBOARD_REFRESH_MS = 10000;
const DASHBOARD_CATCHUP_MS = 5000;
const DASHBOARD_CATCHUP_ATTEMPTS = 24;

let miners = [];
let minerFilter = "";
let showAllUids = false;
let sortState = { key: "score", direction: "desc", type: "number" };
let scheduleTimer = 0;
let homeRefreshTimer = 0;
let dashboardRefreshTimer = 0;
let dashboardCatchupTimer = 0;
let dashboardCatchupAttempts = 0;
let scheduleCanRotate = false;
let controlsAttached = false;
let displayedTheorems = {};
let dashboardData = {};
let dashboardDataLoaded = false;
let optimisticRotationKey = "";

document.addEventListener("DOMContentLoaded", async () => {
  initializeTheme();
  initializeInfoTips();
  initializeFaqAccordion();
  if (PAGE !== "home" && PAGE !== "dashboard") {
    return;
  }
  const result = await loadDashboardData();
  const data = normalizeDashboardData(result.data);
  hydrateHome(data, result.ok);
  hydrateDashboard(data, result.ok);
});

async function loadDashboardData() {
  try {
    const url = new URL(DATA_URL);
    url.searchParams.set("t", String(Date.now()));
    const response = await fetch(url.href, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
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
    uid_variant_problems: true,
    theorem_display_mode: "uid_variants",
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
    correct_count_window_hours: numberOrNull(data.correct_count_window_hours) ?? 24,
    proofs_passed_prior_round: numberOrNull(data.proofs_passed_prior_round),
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
    correct: numberOrNull(miner?.correct_theorems_24h) ?? 0,
    passedPriorRound: boolOrNull(miner?.passed_prior_round),
    uid_url: stringOrEmpty(miner?.uid_url),
    coldkey_url: stringOrEmpty(miner?.coldkey_url),
    hotkey_url: stringOrEmpty(miner?.hotkey_url)
  };
}

function hydrateHome(data, dataLoaded) {
  if (document.body.dataset.page !== "home") {
    return;
  }

  applyHomeData(data, dataLoaded);
  startHomePolling();
}

function applyHomeData(data, dataLoaded) {
  const stats = dashboardStats(data);
  const current = data.theorems.current;

  setAll("[data-current-id]", current ? plainTheorem(current) : (dataLoaded ? "No current theorem" : "Data unavailable"));
  setAll("[data-current-goal]", current?.type_expr || "Public dashboard JSON is not available.");
  setAll("[data-theorem-mode-note]", theoremModeNote(data));
  setAll("[data-network-label]", networkLabel(data));
  setAll("[data-top-score]", formatScore(stats.topScore));
  setAll("[data-proof-count]", proofCountLabel(stats.priorRoundProofCount));
}

function startHomePolling() {
  window.clearInterval(homeRefreshTimer);
  homeRefreshTimer = window.setInterval(refreshHomeData, DASHBOARD_REFRESH_MS);
}

async function refreshHomeData() {
  const result = await loadDashboardData();
  if (result.ok) {
    applyHomeData(normalizeDashboardData(result.data), true);
  }
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
  const previousTheoremGridKey = theoremGridKey(displayedTheorems);
  const previousDisplayMode = dashboardData.theorem_display_mode;
  miners = data.miners;
  dashboardData = data;
  dashboardDataLoaded = dataLoaded;
  displayedTheorems = { ...data.theorems };
  optimisticRotationKey = "";
  const stats = dashboardStats(data);

  setText("[data-dashboard-state]", dashboardStateText(data, dataLoaded));
  setText("[data-status-network]", networkLabel(data));
  setText("[data-status-age]", dataAgeLabel(data.generated_at));
  setText("[data-status-chain-head]", blockNumberLabel(data));
  setAll("[data-miner-count]", String(stats.minerCount));
  setAll("[data-top-score]", formatScore(stats.topScore));
  setAll("[data-proof-count]", proofCountLabel(stats.priorRoundProofCount));

  const theoremChanged = previousCurrent && previousCurrent !== theoremKey(displayedTheorems.current);
  const shouldRenderTheorems = !document.querySelector("[data-theorem-grid] [data-theorem-slot]")
    || previousDisplayMode !== data.theorem_display_mode
    || previousTheoremGridKey !== theoremGridKey(displayedTheorems);
  if (shouldRenderTheorems) {
    renderTheorems(displayedTheorems);
  }
  if (animate && theoremChanged && shouldRenderTheorems) {
    animateTheoremGrid();
  }
  startScheduleTicker(data);
  setHidden("[data-empty-miners]", stats.minerCount > 0);
  renderMiners();
}

function dashboardStats(data) {
  const validMiners = data.miners.filter((miner) => isMinerRow(miner, data));
  const topScore = validMiners.reduce((best, miner) => {
    if (miner.score === null) {
      return best;
    }
    return best === null || miner.score > best ? miner.score : best;
  }, null);
  return {
    minerCount: validMiners.length,
    priorRoundProofCount: data.proofs_passed_prior_round,
    topScore
  };
}

function renderTheorems(theorems) {
  const grid = document.querySelector("[data-theorem-grid]");
  if (!grid) {
    return;
  }

  const openSlots = openTheoremDetailSlots();
  const current = theoremCard("current", theorems.current, true, openSlots);
  const previous = theoremCard("previous", theorems.previous, false, openSlots);
  const next = theoremCard("next", theorems.next, false, openSlots);
  grid.innerHTML = `${current}<div class="side-theorems">${next}${previous}</div>`;
}

function openTheoremDetailSlots() {
  return new Set(
    Array.from(document.querySelectorAll("[data-theorem-slot] details[open]"))
      .map((details) => details.closest("[data-theorem-slot]")?.dataset.theoremSlot)
      .filter(Boolean)
  );
}

function theoremCard(label, theorem, isMain, openSlots = new Set()) {
  const heading = isMain ? "h2" : "h3";
  const title = label === "current" ? "Current theorem" : `${capitalize(label)} theorem`;
  if (!theorem) {
    return `<article class="theorem-card${isMain ? " current" : ""}" data-theorem-slot="${escapeHtml(label)}">
      <p class="label">${escapeHtml(title)}</p>
      <${heading}>Waiting for fresh public data</${heading}>
      <p class="theorem-explain">The current snapshot does not include another theorem for this slot yet.</p>
    </article>`;
  }

  const detailsOpen = openSlots.has(label) ? " open" : "";

  if (!isMain) {
    return `<article class="theorem-card compact" data-theorem-slot="${escapeHtml(label)}">
      <div class="theorem-topline">
        <p class="label">${escapeHtml(title)}</p>
      </div>
      <${heading}>${escapeHtml(plainTheorem(theorem))}</${heading}>
      <p class="statement-label">Formal theorem to prove</p>
      <pre class="lean-statement">${escapeHtml(theorem.type_expr || "")}</pre>
      <details class="technical-details"${detailsOpen}>
        <summary>Details</summary>
        <dl>
          ${theoremDetails(theorem)}
        </dl>
      </details>
    </article>`;
  }

  return `<article class="theorem-card current" data-theorem-slot="${escapeHtml(label)}">
    <div class="theorem-topline">
      <p class="label">${escapeHtml(title)}</p>
      <div class="theorem-meta">
        <span>Time left in theorem window: <strong data-next-countdown>${escapeHtml(nextCountdownLabel(dashboardData))}</strong></span>
      </div>
    </div>
    <${heading}>${escapeHtml(plainTheorem(theorem))}</${heading}>
    <p class="theorem-mode-note">${escapeHtml(theoremModeNote(dashboardData))}</p>
    <p class="statement-label">Formal theorem to prove</p>
    <pre class="lean-statement">${escapeHtml(theorem.type_expr || "")}</pre>
    <details class="technical-details"${detailsOpen}>
      <summary>Details</summary>
      <dl>
        ${theoremDetails(theorem)}
      </dl>
    </details>
  </article>`;
}

function attachMinerControls() {
  if (controlsAttached) {
    return;
  }
  controlsAttached = true;

  const showAllInput = document.querySelector("[data-show-all-uids]");
  if (showAllInput) {
    showAllInput.checked = showAllUids;
  }

  document.querySelector("[data-miner-search]")?.addEventListener("input", (event) => {
    minerFilter = event.target.value.trim().toLowerCase();
    renderMiners();
  });

  document.querySelector("[data-show-all-uids]")?.addEventListener("change", (event) => {
    showAllUids = event.target.checked;
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
    : `<tr><td colspan="6">${escapeHtml(emptyMinerText())}</td></tr>`;
}

function emptyMinerText() {
  if (!dashboardDataLoaded) {
    return "Public dashboard JSON is unavailable.";
  }
  if (minerFilter || !showAllUids) {
    return "No miners match this view.";
  }
  return "No public miner rows in this export.";
}

function filteredMiners() {
  return miners.filter((miner) => {
    if (!showAllUids && !isMinerRow(miner, dashboardData)) {
      return false;
    }
    if (!minerFilter) {
      return true;
    }
    return [miner.uid, miner.coldkey, miner.hotkey].join(" ").toLowerCase().includes(minerFilter);
  });
}

function isMinerRow(miner, data = dashboardData) {
  const uid = numberOrNull(miner?.uid);
  if (uid === null) {
    return false;
  }
  if (data.network === "test" && Number(data.netuid) === 467) {
    return uid > 1;
  }
  return true;
}

function compareMiners(a, b) {
  const dir = sortState.direction === "asc" ? 1 : -1;
  const av = minerSortValue(a, sortState.key);
  const bv = minerSortValue(b, sortState.key);
  if (sortState.type === "number") {
    const an = numberOrNull(av);
    const bn = numberOrNull(bv);
    if (an === null || bn === null) {
      return an === bn ? compareUid(a, b) : (an === null ? 1 : -1);
    }
    const byValue = an - bn;
    return byValue === 0 ? compareUid(a, b) : dir * byValue;
  }
  const at = String(av || "");
  const bt = String(bv || "");
  if (!at || !bt) {
    return at === bt ? compareUid(a, b) : (!at ? 1 : -1);
  }
  const byText = at.localeCompare(bt);
  return byText === 0 ? compareUid(a, b) : dir * byText;
}

function compareUid(a, b) {
  const auid = numberOrNull(a.uid) ?? Number.MAX_SAFE_INTEGER;
  const buid = numberOrNull(b.uid) ?? Number.MAX_SAFE_INTEGER;
  return auid - buid;
}

function minerSortValue(miner, key) {
  if (key === "correct") {
    return miner.correct;
  }
  if (key === "passedPriorRound") {
    return miner.passedPriorRound === null ? null : Number(miner.passedPriorRound);
  }
  return miner[key];
}

function minerRow(miner) {
  return `<tr>
    <td>${linkOrText(miner.uid === null ? "?" : String(miner.uid), miner.uid_url)}</td>
    <td class="addr">${linkOrText(miner.coldkey, miner.coldkey_url)}</td>
    <td class="addr">${linkOrText(miner.hotkey, miner.hotkey_url)}</td>
    <td>${formatScore(miner.score)}</td>
    <td>${passMark(miner.passedPriorRound)}</td>
    <td>${miner.correct}</td>
  </tr>`;
}

function networkLabel(data) {
  const network = data.network || "unknown";
  const netuid = data.netuid === undefined || data.netuid === null ? "?" : data.netuid;
  if (network === "test" && Number(netuid) === 467) {
    return "Testnet SN467";
  }
  return `${network} / netuid ${netuid}`;
}

function proofCountLabel(value) {
  return value === null ? "No round data" : String(value);
}

function plainTheorem(theorem) {
  return cleanPlainTheorem(theorem?.plain_english || theorem?.plainEnglish || theorem?.explanation)
    || "Generated Lean theorem.";
}

function cleanPlainTheorem(value) {
  const text = String(value || "").trim().replace(/\.$/, "");
  if (!text) {
    return "";
  }
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

function theoremDetails(theorem) {
  return [
    ["ID", theorem.theorem_id || "unknown", "Stable public theorem identifier."],
    ["Lean name", theorem.name || "unknown", "The theorem name in Lean."],
    ["Seed", theorem.seed ?? "unknown", "The chain number used to pick this theorem."],
    ["Difficulty", humanDifficulty(theorem.split) || "unknown", "The theorem difficulty group."],
    ["Topic", humanTopic(theorem.topic) || "unknown", "The theorem topic group."],
    ["Source", humanSource(theorem.source_lane) || "unknown", "The theorem source lane."]
  ]
    .map(([label, value, help]) => `<dt>${label}</dt><dd><span class="detail-value">${escapeHtml(value)}</span><span class="detail-help">${escapeHtml(help)}</span></dd>`)
    .join("");
}

function humanDifficulty(split) {
  return split ? capitalize(split) : "";
}

function humanSource(lane) {
  const text = String(lane || "").replaceAll("_", " ").trim().toLowerCase();
  if (text === "catalog") {
    return "Curated";
  }
  if (text === "generated") {
    return "Synthesized";
  }
  return text ? capitalize(text) : "";
}

function humanTopic(topic) {
  const raw = String(topic || "")
    .split(".")
    .pop()
    ?.replace(/_(light|lite)$/i, "")
    .replaceAll("_", " ") || "";
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

function scheduleTimestamp(data) {
  return data.schedule_generated_at || data.generated_at;
}

function secondsUntilNextTheorem(data) {
  const generatedAt = Date.parse(scheduleTimestamp(data));
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
  scheduleCanRotate = initialCountdown !== null;
  scheduleTimer = window.setInterval(() => tickSchedule(data), 1000);
  tickSchedule(data);
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
    rotateTheoremPreview(data);
    refreshDashboardData();
    startCatchupPolling();
    return;
  }
  setText("[data-next-countdown]", countdown === 0 ? "Waiting for public data" : formatDuration(countdown));
}

function rotateTheoremPreview(data) {
  const current = displayedTheorems.current || data.theorems.current;
  const next = displayedTheorems.next || data.theorems.next;
  if (!next) {
    setText("[data-next-countdown]", "Waiting for public data");
    return;
  }

  const seed = numberOrNull(next.seed) ?? nextProblemSeed(data);
  const rotated = { previous: current, current: next, next: null };
  dashboardData = {
    ...data,
    schedule_generated_at: new Date().toISOString(),
    chain_head_block: seed ?? data.chain_head_block,
    problem_seed_chain_head: seed ?? data.problem_seed_chain_head,
    problem_seed: seed ?? data.problem_seed,
    theorems: rotated
  };
  displayedTheorems = rotated;
  optimisticRotationKey = theoremKey(next);
  renderTheorems(displayedTheorems);
  animateTheoremGrid();
  startScheduleTicker(dashboardData);
  setText("[data-dashboard-state]", "Waiting for fresh public data for the new theorem.");
}

function nextProblemSeed(data) {
  const currentSeed = numberOrNull(data.problem_seed);
  const interval = numberOrNull(data.problem_seed_quantize_blocks);
  return currentSeed === null || interval === null ? null : currentSeed + interval;
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

function theoremGridKey(theorems) {
  return ["previous", "current", "next"].map((slot) => theoremKey(theorems?.[slot])).join("|");
}

function theoremModeNote(data) {
  return "The dashboard shows the round's representative theorem. Each UID receives a deterministic same-difficulty variant, and validators check the exact theorem sent to that UID.";
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
  const data = normalizeDashboardData(result.data);
  if (isStaleAfterPreviewRotation(data)) {
    setText("[data-dashboard-state]", "Waiting for fresh public data for the new theorem.");
    return;
  }
  applyDashboardData(data, true);
  if (dashboardCatchupTimer && secondsUntilNextTheorem(data) > 0) {
    stopCatchupPolling();
  }
}

function isStaleAfterPreviewRotation(data) {
  if (!optimisticRotationKey) {
    return false;
  }
  const incomingSeed = numberOrNull(data.problem_seed);
  const previewSeed = numberOrNull(dashboardData.problem_seed);
  if (incomingSeed !== null && previewSeed !== null && incomingSeed < previewSeed) {
    return true;
  }
  const incomingCurrent = theoremKey(data.theorems.current);
  return incomingCurrent && incomingCurrent !== optimisticRotationKey;
}

function startCatchupPolling() {
  stopCatchupPolling();
  dashboardCatchupAttempts = 0;
  dashboardCatchupTimer = window.setInterval(async () => {
    dashboardCatchupAttempts += 1;
    await refreshDashboardData();
    if (dashboardCatchupAttempts >= DASHBOARD_CATCHUP_ATTEMPTS) {
      stopCatchupPolling();
    }
  }, DASHBOARD_CATCHUP_MS);
}

function stopCatchupPolling() {
  window.clearInterval(dashboardCatchupTimer);
  dashboardCatchupTimer = 0;
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

  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.themeChoice === "dark" ? "dark" : "light";
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
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    const active = button.dataset.themeChoice === normalized;
    button.setAttribute("aria-pressed", active ? "true" : "false");
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

function initializeFaqAccordion() {
  const items = Array.from(document.querySelectorAll(".faq-list details"));
  if (!items.length) {
    return;
  }
  if (!items.some((item) => item.open)) {
    items[0].open = true;
  }
  items.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) {
        return;
      }
      items.forEach((other) => {
        if (other !== item) {
          other.open = false;
        }
      });
    });
  });
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

function passMark(value) {
  if (value === true) {
    return '<span class="pass-mark pass-yes" title="Passed previous round" aria-label="Passed previous round">&#10003;</span>';
  }
  if (value === false) {
    return '<span class="pass-mark pass-no" title="Did not pass previous round" aria-label="Did not pass previous round">&times;</span>';
  }
  return '<span class="pass-mark pass-unknown" title="Previous round data unavailable" aria-label="Previous round data unavailable">?</span>';
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
  const generatedAt = Date.parse(scheduleTimestamp(data));
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
  return Number.isNaN(Date.parse(value)) ? "unknown" : `${formatAge(value)} ago`;
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

function boolOrNull(value) {
  return typeof value === "boolean" ? value : null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
