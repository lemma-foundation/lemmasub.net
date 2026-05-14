#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const dashboard = require("../assets/miners.js");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "miner-dashboard.json");
const raw = fs.readFileSync(dataPath, "utf8");
const data = JSON.parse(raw);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(data.schema_version === 1, "schema_version must be 1");
assert(data.problem_source === "known_theorems", "problem_source must be known_theorems");
assert(data.reward && data.reward.mode === "binary_lean_verify", "reward mode must be binary_lean_verify");
assert(data.counts && Number.isInteger(data.counts.total_targets), "counts.total_targets must be an integer");
assert(Array.isArray(data.targets), "targets must be an array");
assert(data.targets.length === data.counts.total_targets, "targets length must match counts.total_targets");
assert(!raw.includes("proof_script"), "public dashboard must not include proof_script");
assert(!raw.includes("coldkey"), "public dashboard must not include coldkey");
assert(!raw.includes("validator-hotkey"), "public dashboard must not include validator hotkey fixtures");

const activeCount = data.targets.filter((target) => target.status === "active").length;
assert(activeCount <= 1, "at most one target can be active");
if (data.active_target) {
  assert(data.active_target.status === "active", "active_target must have active status");
}

const html = dashboard.renderDashboard(data);
assert(html.includes("Active target"), "rendered dashboard should include the active section");
assert(html.includes("Ordered target state"), "rendered dashboard should include the target queue");

console.log("miner dashboard ok");
