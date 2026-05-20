const storageKey = "lemma-theme";
const root = document.documentElement;
const toggle = document.querySelector("[data-theme-toggle]");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const problemBoard = document.querySelector("[data-current-problems]");
const problemPollMs = 60_000;

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

function shortHash(value) {
  return value ? `${value.slice(0, 10)}...${value.slice(-6)}` : "unknown";
}

function metric(label, value) {
  const item = node("div", "metric");
  item.append(node("dt", "", label), node("dd", "", value));
  return item;
}

function problemMeta(label, value) {
  const item = node("span", "problem-meta");
  item.append(node("span", "", label), document.createTextNode(String(value)));
  return item;
}

function renderProblem(task) {
  const article = node("article", "problem-card");
  const header = node("div", "problem-card-head");
  const title = node("div");
  title.append(node("p", "problem-id", task.task_id), node("h3", "", task.title || task.theorem_name));
  header.append(title, node("span", "difficulty", task.difficulty_band || "unknown"));

  const meta = node("div", "problem-meta-row");
  meta.append(
    problemMeta("position", task.queue_position ?? "open"),
    problemMeta("depth", task.queue_depth),
    problemMeta("source", task.source_stream),
    problemMeta("target", shortHash(task.target_sha256))
  );

  const theorem = node("div", "theorem-block");
  theorem.append(node("span", "", task.theorem_name), node("code", "", task.type_expr));

  const statement = node("pre", "statement");
  statement.append(node("code", "", task.statement));

  article.append(header, meta, theorem, statement);
  return article;
}

function renderProblems(board, snapshot) {
  const status = board.querySelector("[data-problem-status]");
  const summary = board.querySelector("[data-problem-summary]");
  const list = board.querySelector("[data-problem-list]");
  summary.replaceChildren(
    metric("Active tasks", String(snapshot.task_count)),
    metric("K", String(snapshot.active_K)),
    metric("Frontier depth", String(snapshot.frontier_depth)),
    metric("Registry", shortHash(snapshot.registry_sha256))
  );
  list.replaceChildren(...(snapshot.tasks || []).map(renderProblem));
  status.textContent = `Updated ${snapshot.generated_at}`;
}

async function loadProblems(board) {
  const status = board.querySelector("[data-problem-status]");
  try {
    const source = new URL(board.dataset.source || "data/current-problems.json", window.location.href);
    source.searchParams.set("t", Date.now().toString());
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    renderProblems(board, await response.json());
  } catch (error) {
    status.textContent = "Snapshot unavailable";
    board.querySelector("[data-problem-list]").replaceChildren(
      node("p", "empty-state", "The current problem snapshot could not be loaded.")
    );
  }
}

if (problemBoard) {
  loadProblems(problemBoard);
  setInterval(() => loadProblems(problemBoard), problemPollMs);
}
