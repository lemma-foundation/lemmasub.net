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
let problemRefreshTimer;
let activeGuide;
let guideReturnFocus;
let activeTerm;

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

function tempoMilliseconds(snapshot) {
  const seconds = Number(snapshot.active_tempo_seconds);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

function expectedRefreshTime(snapshot) {
  if (snapshot.active_tempo_source === "chain") {
    return undefined;
  }
  const tempoMs = tempoMilliseconds(snapshot);
  const tempo = Number(snapshot.tempo);
  if (tempoMs && Number.isInteger(tempo) && tempo >= 0) {
    return (tempo + 1) * tempoMs;
  }
  const generated = new Date(snapshot.generated_at);
  if (!tempoMs || Number.isNaN(generated.valueOf())) {
    return undefined;
  }
  return generated.valueOf() + tempoMs;
}

function expectedRefresh(snapshot) {
  if (snapshot.active_tempo_source === "chain") {
    return "Chain epoch";
  }
  const next = expectedRefreshTime(snapshot);
  if (!next) {
    return "Unknown";
  }
  return localTime(next);
}

function refreshOverdue(snapshot) {
  const next = expectedRefreshTime(snapshot);
  return Boolean(next && next <= Date.now());
}

function refreshHint(snapshot) {
  if (snapshot.active_tempo_source === "chain") {
    return "Chain blocks decide the next problem-set refresh";
  }
  return refreshOverdue(snapshot) ? "Overdue; waiting for a fresh snapshot" : "Expected problem-set refresh";
}

function snapshotProblem(snapshot) {
  const tasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks : [];
  if (!tasks.length) {
    return "No active problems are available yet.";
  }
  return "";
}

function difficultyLabel(value) {
  if (!value) {
    return "Open";
  }
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function metric(label, value, hint, variant) {
  const item = node("div", variant ? `metric ${variant}` : "metric");
  item.append(node("dt", "", label), node("dd", "", value));
  if (hint) {
    item.append(node("p", "", hint));
  }
  return item;
}

function problemTitle(task) {
  const title = task.title || task.theorem_name || "Open theorem";
  return title.replace(/^(Generated|Smoke-test)\s+/i, "");
}

function problemTopic(task) {
  const explicit = task.topic || task.metadata?.topic;
  if (explicit) {
    return explicit;
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

function renderProblem(task) {
  const article = node("article", "problem-card");
  const header = node("div", "problem-card-head");
  const title = node("div");
  const actions = node("div", "problem-card-actions");
  const toggle = node("button", "problem-toggle");
  const showText = node("span", "show-text", "Show statement");
  const hideText = node("span", "hide-text", "Hide statement");
  const statementId = `statement-${task.task_id.replace(/[^a-z0-9]+/gi, "-")}`;
  hideText.hidden = true;
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Show statement");
  toggle.setAttribute("aria-controls", statementId);
  toggle.setAttribute("aria-expanded", "false");
  toggle.append(showText, hideText);

  const statement = node("pre", "statement");
  statement.id = statementId;
  statement.hidden = true;
  statement.append(node("code", "", task.statement));

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    const nextOpen = !isOpen;
    toggle.setAttribute("aria-expanded", String(nextOpen));
    toggle.setAttribute("aria-label", nextOpen ? "Hide statement" : "Show statement");
    article.classList.toggle("is-open", nextOpen);
    showText.hidden = nextOpen;
    hideText.hidden = !nextOpen;
    statement.hidden = !nextOpen;
  });
  title.append(node("p", "problem-id", `Topic: ${problemTopic(task)}`), node("h3", "", problemTitle(task)));
  actions.append(node("span", "difficulty", difficultyLabel(task.difficulty_band)), toggle);
  header.append(title, actions);

  article.append(header, statement);
  return article;
}

function renderProblemSet(tasks) {
  const section = node("section", "problem-set");
  const toggle = node("button", "problem-set-toggle");
  const copy = node("span", "");
  const count = node("span", "problem-set-count", "Showing all theorem statements");
  const body = node("div", "problem-set-body");

  body.hidden = true;
  copy.append(node("strong", "", "View current problem set"), count);
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
  board.querySelector("[data-problem-summary]").replaceChildren();
  board.querySelector("[data-problem-list]").replaceChildren(node("p", "empty-state", message));
  const status = board.querySelector("[data-problem-status]");
  status.hidden = false;
  status.className = `problem-status ${sourceKind}`;
  status.textContent = "Problem feed pending.";
  problemRefreshTimer = setTimeout(() => loadProblems(board), updateRetryMs);
}

function statusText(snapshot, sourceKind) {
  if (sourceKind === "fallback") {
    return "Using fallback snapshot until the live API responds.";
  }
  return refreshOverdue(snapshot) ? "Snapshot overdue: waiting for the problem set to advance." : "Snapshot loaded.";
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
  summary.replaceChildren(
    metric("Open problems", String(snapshot.task_count ?? tasks.length), "Chosen for miners right now"),
    metric("Last updated", localTime(snapshot.generated_at), "Your local time"),
    metric(overdue ? "Expected update" : "Next update", expectedRefresh(snapshot), refreshHint(snapshot), overdue ? "warning" : "")
  );
  list.replaceChildren(renderProblemSet(tasks));
  status.hidden = false;
  status.className = `problem-status ${sourceKind}`;
  status.textContent = statusText(snapshot, sourceKind);
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

async function loadProblems(board) {
  const status = board.querySelector("[data-problem-status]");
  const fallbackSource = board.dataset.source || "data/current-problems.json";
  try {
    if (board.dataset.liveSource) {
      try {
        renderProblems(board, await fetchSnapshot(board.dataset.liveSource), "live");
        return;
      } catch (_error) {
        renderProblems(board, await fetchSnapshot(fallbackSource), "fallback");
        return;
      }
    }
    renderProblems(board, await fetchSnapshot(fallbackSource), "fallback");
  } catch (error) {
    status.hidden = false;
    status.className = "problem-status fallback";
    status.textContent = "Snapshot unavailable";
    board.querySelector("[data-problem-list]").replaceChildren(
      node("p", "empty-state", "The current problem snapshot could not be loaded.")
    );
  }
}

if (problemBoard) {
  loadProblems(problemBoard);
}
