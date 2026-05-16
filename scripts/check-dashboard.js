const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync(new URL("../assets/site.js", `file://${__filename}`), "utf8");

const context = {
  console,
  Date,
  Intl,
  Math,
  Number,
  String,
  URL,
  document: {
    body: { dataset: { page: "dashboard" } },
    baseURI: "https://example.invalid/dashboard/index.html",
    documentElement: { dataset: {} },
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  },
  window: {
    clearInterval() {},
    setInterval() { return 0; },
    setTimeout() {},
    matchMedia() { return { matches: false }; }
  },
  localStorage: {
    getItem() { return ""; },
    setItem() {}
  }
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "assets/site.js" });

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const data = context.normalizeDashboardData({
  correct_count_window_hours: "bad",
  proofs_passed_prior_round: "0",
  miners: [
    { uid: 1, score: 0.5, correct_theorems_24h: "3", passed_prior_round: true },
    { uid: 2, score: "", correct_theorems_24h: "bad", passed_prior_round: false }
  ],
  theorems: {
    current: {
      plain_english: "prove a useful lemma",
      split: "hard",
      topic: "set_theory.finite_sets",
      source_lane: "catalog"
    },
    previous: {
      plain_english: "prove another useful lemma",
      split: "medium",
      topic: "logic.propositions",
      source_lane: "generated"
    }
  }
});

assert(data.correct_count_window_hours === 24, "invalid lookback should default to 24h");
assert(data.proofs_passed_prior_round === 0, "zero prior-round proof count should survive normalization");
assert(data.miners[0].correct === 3, "numeric miner counts should normalize");
assert(data.miners[1].correct === 0, "invalid miner counts should default to zero");
assert(context.theoremDetails(data.theorems.current).includes("<dt>Source</dt><dd>Curated</dd>"), "catalog source should render as curated");
assert(context.theoremDetails(data.theorems.previous).includes("<dt>Source</dt><dd>Synthesized</dd>"), "generated source should render as synthesized");
assert(context.dataAgeLabel("1970-01-01T00:00:00Z") !== "unknown", "Unix epoch timestamp should be valid");

const sorted = [...data.miners].sort(context.compareMiners);
assert(sorted[sorted.length - 1].uid === 2, "missing scores should sort last");

console.log("dashboard checks passed");
