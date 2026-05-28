const storageKey = "lemma-theme";
const root = document.documentElement;
const toggle = document.querySelector("[data-theme-toggle]");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const problemBoard = document.querySelector("[data-current-problems]");
const guideTriggers = document.querySelectorAll("[data-guide-open]");
const guideModals = document.querySelectorAll("[data-guide-modal]");
const termTriggers = document.querySelectorAll("[data-definition]");
const termPopover = document.querySelector("[data-term-popover]");
const updateRetryMs = 30_000;
const liveFetchTimeoutMs = 5_000;
const guideCloseMs = 180;
const chainBlockSeconds = 12;
let problemRefreshTimer;
let countdownTimer;
let activeGuide;
let guideReturnFocus;
let activeTerm;
let guideScrollY = 0;

function chosenTheme() {
  return localStorage.getItem(storageKey) || "light";
}

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem(storageKey, theme);
  if (themeMeta) {
    themeMeta.setAttribute("content", theme === "dark" ? "#101712" : "#f7faf8");
  }
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
    toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
}

setTheme(chosenTheme());

if (toggle) {
  toggle.addEventListener("click", () => {
    setTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });
}

function closeTerm() {
  if (activeTerm) {
    activeTerm.setAttribute("aria-expanded", "false");
    activeTerm = undefined;
  }
  if (termPopover) {
    termPopover.hidden = true;
    termPopover.textContent = "";
  }
}

function positionTermPopover(trigger) {
  if (!termPopover) {
    return;
  }
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  termPopover.hidden = false;
  const popoverRect = termPopover.getBoundingClientRect();
  const left = Math.min(
    Math.max(16, rect.left),
    window.innerWidth - popoverRect.width - 16,
  );
  let top = rect.bottom + gap;
  if (top + popoverRect.height > window.innerHeight - 16) {
    top = rect.top - popoverRect.height - gap;
  }
  termPopover.style.left = `${left}px`;
  termPopover.style.top = `${Math.max(16, top)}px`;
}

function lockGuideScroll() {
  if (document.body.classList.contains("guide-scroll-lock")) {
    return;
  }
  guideScrollY = window.scrollY;
  document.body.style.top = `-${guideScrollY}px`;
  document.body.classList.add("guide-scroll-lock");
}

function unlockGuideScroll() {
  if (!document.body.classList.contains("guide-scroll-lock")) {
    return;
  }
  document.body.classList.remove("guide-scroll-lock");
  document.body.style.top = "";
  window.scrollTo(0, guideScrollY);
}

termTriggers.forEach((trigger) => {
  trigger.setAttribute("aria-expanded", "false");
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!termPopover || activeTerm === trigger) {
      closeTerm();
      return;
    }
    closeTerm();
    activeTerm = trigger;
    termPopover.textContent = trigger.dataset.definition || "";
    trigger.setAttribute("aria-expanded", "true");
    positionTermPopover(trigger);
  });
});

function openGuide(modal) {
  if (!modal) {
    return;
  }
  if (activeGuide && activeGuide !== modal) {
    activeGuide.hidden = true;
    activeGuide.classList.remove("is-closing");
  }
  guideReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  activeGuide = modal;
  lockGuideScroll();
  modal.hidden = false;
  modal.classList.remove("is-closing");
  modal.querySelector("[role='dialog']").focus();
}

function finishGuideClose(modal) {
  modal.hidden = true;
  modal.classList.remove("is-closing");
  if (activeGuide === modal) {
    activeGuide = undefined;
  }
  unlockGuideScroll();
  if (guideReturnFocus) {
    guideReturnFocus.focus();
    guideReturnFocus = undefined;
  }
}

function closeGuide(modal = activeGuide) {
  if (!modal || modal.hidden || modal.classList.contains("is-closing")) {
    return;
  }
  modal.classList.add("is-closing");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishGuideClose(modal);
    return;
  }
  setTimeout(() => finishGuideClose(modal), guideCloseMs);
}

guideTriggers.forEach((trigger) => {
  const modal = document.querySelector(`[data-guide-modal="${trigger.dataset.guideOpen}"]`);
  trigger.addEventListener("click", () => openGuide(modal));
});

guideModals.forEach((modal) => {
  modal.querySelector("[data-guide-close]").addEventListener("click", () => closeGuide(modal));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeGuide(modal);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeGuide();
    closeTerm();
  }
});

document.addEventListener("click", closeTerm);

window.addEventListener("resize", closeTerm);
window.addEventListener("scroll", closeTerm, { passive: true });

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) {
    item.className = className;
  }
  if (text !== undefined) {
    item.textContent = text;
  }
  return item;
}

function localTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function nonnegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : undefined;
}

function epochBlockCount(snapshot) {
  const explicit = positiveInteger(snapshot.active_tempo_blocks ?? snapshot.active_window_blocks ?? snapshot.epoch_blocks);
  if (explicit) {
    return explicit;
  }
  const seconds = Number(snapshot.active_tempo_seconds);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds / chainBlockSeconds) : undefined;
}

function epochIndex(snapshot) {
  return nonnegativeInteger(snapshot.tempo ?? snapshot.epoch);
}

function epochStartBlock(snapshot) {
  const explicit = nonnegativeInteger(snapshot.epoch_start_block);
  if (explicit !== undefined) {
    return explicit;
  }
  const index = epochIndex(snapshot);
  const blocks = epochBlockCount(snapshot);
  return index !== undefined && blocks ? index * blocks : undefined;
}

function nextEpochBlock(snapshot) {
  const explicit = nonnegativeInteger(snapshot.next_epoch_start_block);
  if (explicit !== undefined) {
    return explicit;
  }
  const start = epochStartBlock(snapshot);
  const blocks = epochBlockCount(snapshot);
  return start !== undefined && blocks ? start + blocks : undefined;
}

function validDate(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

function epochStartTime(snapshot) {
  return validDate(snapshot.epoch_started_at);
}

function nextEpochTime(snapshot) {
  return confirmedNextEpochTime(snapshot) || validDate(snapshot.estimated_next_epoch_starts_at);
}

function confirmedNextEpochTime(snapshot) {
  return validDate(snapshot.next_epoch_starts_at);
}

function expectedRefreshTime(snapshot) {
  return nextEpochTime(snapshot)?.valueOf();
}

function refreshOverdue(snapshot) {
  const next = confirmedNextEpochTime(snapshot)?.valueOf();
  return Boolean(next && next <= Date.now());
}

function blockLabel(block) {
  if (block === undefined) {
    return "Block unknown";
  }
  return `Block ${new Intl.NumberFormat().format(block)}`;
}

function remainingTime(value) {
  if (!value || Number.isNaN(value.valueOf())) {
    return "Time remaining unavailable";
  }
  const totalMinutes = Math.ceil((value.valueOf() - Date.now()) / 60_000);
  if (totalMinutes <= 0) {
    return "Due now";
  }
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days) {
    return `${days} day ${hours} hr remaining`;
  }
  if (hours) {
    return `${hours} hr ${minutes} min remaining`;
  }
  return `${minutes} min remaining`;
}

function nextEpochHintText(next, block, estimated) {
  if (!next || Number.isNaN(next.valueOf())) {
    return blockLabel(block);
  }
  if (next.valueOf() <= Date.now()) {
    return estimated ? `Estimated ${localTime(next)} · ${blockLabel(block)}` : blockLabel(block);
  }
  const remaining = remainingTime(next);
  return `${estimated && remaining !== "Due now" ? "About " : ""}${remaining} · ${blockLabel(block)}`;
}

function nextEpochHint(snapshot) {
  const next = nextEpochTime(snapshot);
  const block = nextEpochBlock(snapshot);
  if (!next) {
    return blockLabel(nextEpochBlock(snapshot));
  }
  const estimated = !validDate(snapshot.next_epoch_starts_at);
  return nextEpochHintText(next, block, estimated);
}

function currentEpochHint(snapshot) {
  const started = epochStartTime(snapshot);
  return started ? blockLabel(epochStartBlock(snapshot)) : "Start time pending";
}

function currentEpochLabel(snapshot) {
  const started = epochStartTime(snapshot);
  return started ? localTime(started) : "Start time pending";
}

function currentSetHint(snapshot) {
  const block = blockLabel(epochStartBlock(snapshot));
  const epochBlocks = epochBlockCount(snapshot);
  if (!epochBlocks) {
    return block;
  }
  return `${block} · ${new Intl.NumberFormat().format(epochBlocks)} block epoch`;
}

function nextEpochLabel(snapshot) {
  const next = nextEpochTime(snapshot);
  if (!next) {
    return "Timing pending";
  }
  const confirmed = confirmedNextEpochTime(snapshot);
  if (confirmed && confirmed.valueOf() <= Date.now()) {
    return "Building next set";
  }
  if (!confirmed && next.valueOf() <= Date.now()) {
    return "Waiting for block";
  }
  const estimated = !confirmed;
  return `${estimated ? "Around " : ""}${localTime(next)}`;
}

function snapshotProblem(snapshot) {
  const tasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks : [];
  if (!tasks.length) {
    return "No active tasks are available yet.";
  }
  return "";
}

function snapshotHasTasks(snapshot) {
  return Array.isArray(snapshot?.tasks) && snapshot.tasks.length > 0;
}

function taskNameSeed(task) {
  return (task.title || task.theorem_name || "")
    .replace(/^Procedural\s+/i, "")
    .replace(/^procedural_/i, "")
    .replace(/_[a-f0-9]{12,}$/i, "");
}

function compactTaskName(task) {
  const seed = taskNameSeed(task);
  const patterns = [
    [/isDomain.*cancelMulZero/i, "Domain cancellation"],
    [/noZeroDivisors/i, "Zero divisors"],
    [/isCancelMulZero/i, "Cancel-zero condition"],
    [/AddMonoidHom.*map_mul/i, "Map multiplication"],
    [/Pi.*RingHom.*injective/i, "Ring hom injectivity"],
    [/invOf.*add/i, "Inverse addition"],
    [/Finset.*disjoint_filter/i, "Filtered sets"],
    [/Set.*centralizer/i, "Centralizer addition"],
    [/associator.*cocycle/i, "Associator cocycle"],
    [/IsIdempotentElem.*sub/i, "Idempotent subtraction"],
  ];
  const matched = patterns.find(([pattern]) => pattern.test(seed));
  if (matched) {
    return matched[1];
  }
  const words = seed
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => !/^(iff|tfae|eq|of|and|or|is)$/i.test(word))
    .slice(0, 3);
  if (!words.length) {
    return "Lean proof task";
  }
  const label = words.join(" ").toLowerCase();
  return `${label.slice(0, 1).toUpperCase()}${label.slice(1)}`;
}

function metric(label, value, hint, variant) {
  const item = node("div", variant ? `metric ${variant}` : "metric");
  item.append(node("dt", "", label), node("dd", "", value));
  if (hint) {
    item.append(node("p", "", hint));
  }
  return item;
}

function updateCountdowns(scope = document) {
  scope.querySelectorAll("[data-countdown-at]").forEach((item) => {
    const next = validDate(item.dataset.countdownAt);
    const block = item.dataset.countdownBlock === "" ? undefined : nonnegativeInteger(item.dataset.countdownBlock);
    const estimated = item.dataset.countdownEstimated === "true";
    item.textContent = nextEpochHintText(next, block, estimated);
  });
}

function startCountdown(board) {
  clearInterval(countdownTimer);
  updateCountdowns(board);
  if (board.querySelector("[data-countdown-at]")) {
    countdownTimer = setInterval(() => updateCountdowns(board), 10_000);
  }
}

function sourcePathTopic(path = "") {
  if (path.includes("/Algebra/") || path.includes("/Ring/") || path.includes("/GroupTheory/")) {
    return "Algebra";
  }
  if (path.includes("/Data/Finset/")) {
    return "Finite sets";
  }
  if (path.includes("/Data/List/")) {
    return "Lists";
  }
  if (path.includes("/Data/Bool/")) {
    return "Booleans";
  }
  if (path.includes("/Data/Nat/") || path.includes("/Init/Data/Nat/") || path.includes("/NumberTheory/")) {
    return "Natural numbers";
  }
  if (path.includes("/Order/")) {
    return "Order";
  }
  if (path.includes("/Logic/")) {
    return "Logic";
  }
  return "";
}

function problemTopic(task) {
  const explicit = task.topic || task.metadata?.topic;
  if (explicit) {
    return explicit;
  }
  const sourceTopic = sourcePathTopic(task.source_ref?.path);
  if (sourceTopic) {
    return sourceTopic;
  }
  const text = [task.title, task.theorem_name, task.task_id, task.type_expr].join(" ").toLowerCase();
  if (text.includes("list")) {
    return "Lists";
  }
  if (text.includes("bool")) {
    return "Booleans";
  }
  if (text.includes("exists")) {
    return "Existence";
  }
  if (text.includes("_le") || text.includes("_lt") || text.includes(" le ") || text.includes(" lt ") || text.includes("order")) {
    return "Order";
  }
  if (text.includes("equality") || text.includes("reflex") || text.includes("_eq") || text.includes("symm") || text.includes("trans")) {
    return "Equality";
  }
  if (text.includes("nat") || text.includes("succ") || text.includes("zero") || text.includes("arith")) {
    return "Natural numbers";
  }
  if (text.includes("function")) {
    return "Functions";
  }
  if (text.includes("group") || text.includes("ring") || text.includes("algebra")) {
    return "Algebra";
  }
  return "Logic";
}

function renderProblem(task, index) {
  const article = node("article", "problem-card");
  const header = node("button", "problem-card-head");
  const title = node("div");
  const indicator = node("span", "statement-indicator", "+");
  const statementId = `statement-${task.task_id.replace(/[^a-z0-9]+/gi, "-")}`;
  const topic = problemTopic(task);
  const name = compactTaskName(task);

  header.type = "button";
  header.setAttribute("aria-label", `Show statement for ${name}`);
  header.setAttribute("aria-controls", statementId);
  header.setAttribute("aria-expanded", "false");

  const statement = node("pre", "statement");
  statement.id = statementId;
  statement.hidden = true;
  statement.append(node("code", "", task.statement));

  header.addEventListener("click", () => {
    const isOpen = header.getAttribute("aria-expanded") === "true";
    const nextOpen = !isOpen;
    header.setAttribute("aria-expanded", String(nextOpen));
    header.setAttribute("aria-label", `${nextOpen ? "Hide" : "Show"} statement for ${name}`);
    article.classList.toggle("is-open", nextOpen);
    indicator.textContent = nextOpen ? "-" : "+";
    statement.hidden = !nextOpen;
  });
  title.append(
    node("p", "problem-id", `Task ${index + 1} · ${topic}`),
    node("h3", "", name),
  );
  header.append(title, indicator);

  article.append(header, statement);
  return article;
}

function renderProblemSet(tasks, snapshot) {
  const section = node("section", "problem-set");
  const toggle = node("button", "problem-set-toggle");
  const copy = node("span", "");
  const isOverdue = refreshOverdue(snapshot);
  const body = node("div", "problem-set-body");

  body.hidden = true;
  copy.append(node("strong", "", isOverdue ? "Latest task set" : "Current task set"));
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.append(copy, node("span", "problem-set-action", "Open"));
  body.append(...tasks.map(renderProblem));
  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    const nextOpen = !isOpen;
    toggle.setAttribute("aria-expanded", String(nextOpen));
    toggle.querySelector(".problem-set-action").textContent = nextOpen ? "Close" : "Open";
    body.hidden = !nextOpen;
    section.classList.toggle("is-open", nextOpen);
  });

  section.append(toggle, body);
  return section;
}

function renderProblemUnavailable(board, message, sourceKind) {
  clearTimeout(problemRefreshTimer);
  clearInterval(countdownTimer);
  board.querySelector("[data-problem-summary]").replaceChildren();
  board.querySelector("[data-problem-list]").replaceChildren(node("p", "empty-state", message));
  const status = board.querySelector("[data-problem-status]");
  status.hidden = false;
  status.className = `problem-status ${sourceKind}`;
  status.textContent = "Task feed pending.";
  problemRefreshTimer = setTimeout(() => loadProblems(board), updateRetryMs);
}

function statusText(snapshot, sourceKind) {
  if (sourceKind === "fallback") {
    return "Using backup task list.";
  }
  return refreshOverdue(snapshot) ? "Building next task set." : "Live tasks loaded.";
}

function scheduleRefresh(board, snapshot, sourceKind) {
  clearTimeout(problemRefreshTimer);
  if (sourceKind === "fallback") {
    problemRefreshTimer = setTimeout(() => loadProblems(board), updateRetryMs);
    return;
  }
  const next = expectedRefreshTime(snapshot);
  if (!next) {
    return;
  }
  const wait = next <= Date.now() ? updateRetryMs : next - Date.now() + 1000;
  problemRefreshTimer = setTimeout(() => loadProblems(board), wait);
}

function renderProblems(board, snapshot, sourceKind) {
  const status = board.querySelector("[data-problem-status]");
  const summary = board.querySelector("[data-problem-summary]");
  const list = board.querySelector("[data-problem-list]");
  const tasks = snapshot.tasks || [];
  const problem = snapshotProblem(snapshot);
  if (problem) {
    renderProblemUnavailable(board, problem, sourceKind);
    return;
  }
  const overdue = refreshOverdue(snapshot);
  const nextMetric = metric("Next change", nextEpochLabel(snapshot), nextEpochHint(snapshot), overdue ? "warning" : "");
  const next = nextEpochTime(snapshot);
  const hint = nextMetric.querySelector("p");
  if (hint && next && next.valueOf() > Date.now()) {
    hint.dataset.countdownAt = next.toISOString();
    hint.dataset.countdownBlock = String(nextEpochBlock(snapshot) ?? "");
    hint.dataset.countdownEstimated = String(!validDate(snapshot.next_epoch_starts_at));
  }
  summary.replaceChildren(
    metric(
      overdue ? "Tasks shown" : "Open tasks",
      String(snapshot.task_count ?? tasks.length),
      overdue ? "Last published task set" : "Tasks miners can try now",
    ),
    metric("Task set", currentEpochLabel(snapshot), currentSetHint(snapshot)),
    nextMetric,
  );
  list.replaceChildren(renderProblemSet(tasks, snapshot));
  status.hidden = false;
  status.className = `problem-status ${sourceKind}`;
  status.textContent = statusText(snapshot, sourceKind);
  startCountdown(board);
  scheduleRefresh(board, snapshot, sourceKind);
}

async function fetchSnapshot(sourceUrl, timeoutMs = liveFetchTimeoutMs) {
  const source = new URL(sourceUrl, window.location.href);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  source.searchParams.set("t", Date.now().toString());
  try {
    const response = await fetch(source, { cache: "no-store", signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBackupSnapshot(...sources) {
  let emptySnapshot;
  for (const source of sources) {
    if (!source) {
      continue;
    }
    try {
      const snapshot = await fetchSnapshot(source);
      if (snapshotHasTasks(snapshot)) {
        return snapshot;
      }
      emptySnapshot ||= snapshot;
    } catch (_error) {
      // Try the next backup source.
    }
  }
  if (emptySnapshot) {
    return emptySnapshot;
  }
  throw new Error("Snapshot unavailable");
}

async function loadProblems(board) {
  const status = board.querySelector("[data-problem-status]");
  const fallbackSource = board.dataset.source || "data/current-problems.json";
  const backupSource = board.dataset.backupSource;
  try {
    if (board.dataset.liveSource) {
      try {
        const liveSnapshot = await fetchSnapshot(board.dataset.liveSource);
        renderProblems(board, liveSnapshot, "live");
        return;
      } catch (_error) {
        try {
          renderProblems(board, await fetchBackupSnapshot(fallbackSource), "live");
          return;
        } catch (_fallbackError) {
          renderProblems(board, await fetchBackupSnapshot(backupSource), "fallback");
          return;
        }
      }
    }
    try {
      renderProblems(board, await fetchBackupSnapshot(fallbackSource), "live");
    } catch (_fallbackError) {
      renderProblems(board, await fetchBackupSnapshot(backupSource), "fallback");
    }
  } catch (error) {
    status.hidden = false;
    status.className = "problem-status fallback";
    status.textContent = "Snapshot unavailable";
    board.querySelector("[data-problem-list]").replaceChildren(
      node("p", "empty-state", "The current task snapshot could not be loaded.")
    );
  }
}

if (problemBoard) {
  loadProblems(problemBoard);
}
