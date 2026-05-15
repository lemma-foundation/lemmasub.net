#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const dashboard = require("../assets/miners.js");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "miner-dashboard.json");
const raw = fs.readFileSync(dataPath, "utf8");
const data = JSON.parse(raw);
const setupHtml = fs.readFileSync(path.join(root, "setup", "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(data.schema_version === 3, "schema_version must be 3");
assert(data.problem_source === "known_theorems", "problem_source must be known_theorems");
assert(
  data.reward && data.reward.mode === "current_epoch_observed_difficulty_with_owner_burn",
  "reward mode must be current_epoch_observed_difficulty_with_owner_burn",
);
assert(data.counts && Number.isInteger(data.counts.total_targets), "counts.total_targets must be an integer");
assert(Array.isArray(data.targets), "targets must be an array");
assert(data.targets.length === data.counts.total_targets, "targets length must match counts.total_targets");
if (raw.includes("proof_script")) {
  assert(Array.isArray(data.accepted_proof_receipts), "proof_script must appear only with accepted receipts");
}
assert(!raw.includes("coldkey"), "public dashboard must not include coldkey");

const activeCount = data.targets.filter((target) => target.status === "active").length;
assert(activeCount <= 1, "at most one target can be active");
if (data.active_target) {
  assert(data.active_target.status === "active", "active_target must have active status");
}

const html = dashboard.renderDashboard(data);
assert(html.includes("Active target"), "rendered dashboard should include the active section");
assert(html.includes("Ordered target state"), "rendered dashboard should include the target queue");

const solvedFixture = JSON.parse(JSON.stringify(data));
solvedFixture.schema_version = 3;
solvedFixture.targets[0].status = "solved";
solvedFixture.targets[0].solved = {
  accepted_block: 123,
  solver_uids: [7],
  commitment_hash: ["c".repeat(64)],
  commitment_block: [111],
  commit_cutoff_block: [122],
};
solvedFixture.accepted_proof_receipts = [{
  target_id: solvedFixture.targets[0].id,
  solver_uid: 7,
  solver_hotkey: "hotkey-7",
  validator_hotkey: "validator-7",
  accepted_block: 123,
  accepted_unix: 1778783671,
  proof_sha256: "a".repeat(64),
  proof_nonce: "n".repeat(64),
  commitment_hash: "c".repeat(64),
  commitment_first_seen_block: 111,
  commit_cutoff_block: 122,
  receipt_sha256: "b".repeat(64),
  proof_script: "import Mathlib\n\nnamespace Submission\n\nexample : True := by\n  trivial\n\nend Submission\n",
}, {
  target_id: solvedFixture.targets[0].id,
  solver_uid: 7,
  solver_hotkey: "hotkey-7",
  validator_hotkey: "validator-8",
  accepted_block: 124,
  accepted_unix: 1778783683,
  proof_sha256: "a".repeat(64),
  proof_nonce: "n".repeat(64),
  commitment_hash: "c".repeat(64),
  commitment_first_seen_block: 111,
  commit_cutoff_block: 122,
  receipt_sha256: "d".repeat(64),
  proof_script: "import Mathlib\n\nnamespace Submission\n\nexample : True := by\n  trivial\n\nend Submission\n",
}];
const solvedHtml = dashboard.renderDashboard(solvedFixture);
assert(solvedHtml.includes("solver UID 7"), "rendered solved rows should include solver UIDs");
assert(solvedHtml.includes("Audit receipts"), "rendered dashboard should include audit receipts");
assert(solvedHtml.includes("2 validator confirmations"), "rendered receipts should group validator confirmations");
assert(solvedHtml.includes("Audit details and proof"), "rendered receipts should keep audit details collapsed");
assert(solvedHtml.includes("committed 111"), "rendered receipts should include commitment timing");
assert(solvedHtml.includes("trivial"), "rendered receipts should include accepted proof text");

for (const page of ["index.html", "faq/index.html", "miners/index.html", "setup/index.html"]) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  assert(html.includes('href="/setup/"'), `${page} must link to /setup/`);
  assert(!html.includes('href="/solve/"'), `${page} must not link to removed /solve/`);
}

assert(setupHtml.includes("uv run lemma setup"), "setup page must show lemma setup");
assert(setupHtml.includes("git clone https://github.com/spacetime-tao/lemma.git"), "setup page must show clone");
assert(setupHtml.includes("cd lemma"), "setup page must show entering the repo");
assert(setupHtml.includes("uv run lemma mine"), "setup page must show lemma mine");
assert(setupHtml.includes("uv run lemma validate"), "setup page must show lemma validate");
assert(setupHtml.includes("btcli wallet create"), "setup page must show btcli wallet creation");
assert(setupHtml.includes("btcli subnets register"), "setup page must show btcli registration");
assert(setupHtml.includes("A commitment is a public fingerprint"), "setup page must explain commit/reveal");

console.log("miner dashboard ok");
