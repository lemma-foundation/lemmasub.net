const fallbackData = {
  generated_at: "2026-05-11T22:10:00Z",
  netuid: 467,
  network: "test",
  score_source: "metagraph_incentive",
  theorems: {
    previous: {
      theorem_id: "gen/7095700",
      name: "lemma_add_zero_nat",
      split: "easy",
      type_expr: "forall n : Nat, n + 0 = n",
      explanation: "An easy natural-number arithmetic statement: prove that for every natural number n, n plus 0 equals n."
    },
    current: {
      theorem_id: "gen/7095800",
      name: "lemma_mul_one_nat",
      split: "easy",
      type_expr: "forall n : Nat, n * 1 = n",
      explanation: "An easy natural-number arithmetic statement: prove that for every natural number n, n times 1 equals n."
    },
    next: {
      theorem_id: "gen/7095900",
      name: "lemma_and_comm",
      split: "medium",
      type_expr: "forall p q : Prop, p and q -> q and p",
      explanation: "A medium propositional logic statement: prove that for every proposition p and q, p and q implies q and p."
    }
  },
  miners: [
    {
      uid: 18,
      coldkey: "5FakeColdkeyAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaA",
      hotkey: "5FakeHotkey111111111111111111111111111111111111",
      score: 0.184231,
      correct_theorems_24h: 14
    },
    {
      uid: 7,
      coldkey: "5FakeColdkeyBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbB",
      hotkey: "5FakeHotkey222222222222222222222222222222222222",
      score: 0.142008,
      correct_theorems_24h: 11
    },
    {
      uid: 41,
      coldkey: "5FakeColdkeyCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcC",
      hotkey: "5FakeHotkey333333333333333333333333333333333333",
      score: 0.097112,
      correct_theorems_24h: 8
    },
    {
      uid: 3,
      coldkey: "5FakeColdkeyDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdD",
      hotkey: "5FakeHotkey444444444444444444444444444444444444",
      score: 0.041883,
      correct_theorems_24h: 3
    }
  ]
};

document.addEventListener("DOMContentLoaded", async () => {
  const data = await loadDashboardData();
  hydrateHome(data);
  hydrateDashboard(data);
});

async function loadDashboardData() {
  try {
    const response = await fetch("/data/public-dashboard.json", { cache: "no-store" });
    if (!response.ok) {
      return fallbackData;
    }
    return await response.json();
  } catch {
    return fallbackData;
  }
}

function hydrateHome(data) {
  if (document.body.dataset.page !== "home") {
    return;
  }
  const current = data.theorems?.current || fallbackData.theorems.current;
  const miners = Array.isArray(data.miners) ? data.miners : [];
  const topMiner = miners[0];
  const proofCount = miners.reduce((sum, miner) => sum + Number(miner.correct_theorems_24h || 0), 0);

  setAll("[data-current-id]", current.theorem_id || "gen/current");
  setAll("[data-current-goal]", current.type_expr || "");
  setAll("[data-miner-count]", String(miners.length));
  setAll("[data-top-score]", formatScore(topMiner?.score));
  setAll("[data-top-miner]", topMiner ? `UID ${topMiner.uid}` : "No miners");
  setAll("[data-proof-count]", String(proofCount));
}

function hydrateDashboard(data) {
  if (document.body.dataset.page !== "dashboard") {
    return;
  }

  const meta = document.querySelector("[data-dashboard-meta]");
  if (meta) {
    meta.innerHTML = `Updated ${escapeHtml(data.generated_at || "unknown")}<br>Score source: ${escapeHtml(data.score_source || "unknown")}`;
  }

  const theoremGrid = document.querySelector("[data-theorem-grid]");
  if (theoremGrid) {
    const theorems = data.theorems || fallbackData.theorems;
    theoremGrid.innerHTML = ["previous", "current", "next"].map((label) => theoremCard(label, theorems[label])).join("");
  }

  const tbody = document.querySelector("[data-miners-body]");
  if (tbody) {
    const miners = Array.isArray(data.miners) ? data.miners : [];
    tbody.innerHTML = miners.length
      ? miners.map(minerRow).join("")
      : '<tr><td colspan="5">No miners found.</td></tr>';
  }

  attachTableSort();
}

function theoremCard(label, theorem) {
  if (!theorem) {
    return `<article class="theorem-card"><p class="label">${escapeHtml(label)}</p><h3>Unknown</h3></article>`;
  }
  const currentClass = label === "current" ? " current" : "";
  return `<article class="theorem-card${currentClass}">
    <p class="label">${escapeHtml(label)}</p>
    <h3>${escapeHtml(theorem.theorem_id || "")}</h3>
    <p class="theorem-name">${escapeHtml(theorem.name || "")} - ${escapeHtml(theorem.split || "")}</p>
    <pre>${escapeHtml(theorem.type_expr || "")}</pre>
    <p class="theorem-explain">${escapeHtml(theorem.explanation || "")}</p>
  </article>`;
}

function minerRow(miner) {
  const uid = Number(miner.uid || 0);
  const score = miner.score == null ? "" : Number(miner.score);
  const correct = Number(miner.correct_theorems_24h || 0);
  return `<tr>
    <td data-value="${uid}">${linkOrText(String(uid), miner.uid_url)}</td>
    <td class="addr" data-value="${escapeHtml(miner.coldkey || "")}">${linkOrText(miner.coldkey || "", miner.coldkey_url)}</td>
    <td class="addr" data-value="${escapeHtml(miner.hotkey || "")}">${linkOrText(miner.hotkey || "", miner.hotkey_url)}</td>
    <td data-value="${score}">${score === "" ? "?" : formatScore(score)}</td>
    <td data-value="${correct}">${correct}</td>
  </tr>`;
}

function attachTableSort() {
  const table = document.querySelector("[data-miners-table]");
  if (!table) {
    return;
  }
  const tbody = table.querySelector("tbody");
  const directions = new Map();
  table.querySelectorAll("th button").forEach((button, column) => {
    button.addEventListener("click", () => {
      const dir = directions.get(column) === "asc" ? "desc" : "asc";
      directions.set(column, dir);
      const numeric = button.dataset.sort === "number";
      const rows = Array.from(tbody.querySelectorAll("tr"));
      rows.sort((a, b) => {
        const av = a.children[column].dataset.value || a.children[column].textContent.trim();
        const bv = b.children[column].dataset.value || b.children[column].textContent.trim();
        const cmp = numeric ? Number(av) - Number(bv) : av.localeCompare(bv);
        return dir === "asc" ? cmp : -cmp;
      });
      rows.forEach((row) => tbody.appendChild(row));
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
  if (value == null || value === "") {
    return "?";
  }
  return Number(value).toFixed(6);
}

function setAll(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
