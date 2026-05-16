#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const tasks = require("../assets/tasks.js");

const root = path.resolve(__dirname, "..");
const cadence = JSON.parse(fs.readFileSync(path.join(root, "data", "cadence.json"), "utf8"));
const bounties = JSON.parse(fs.readFileSync(path.join(root, "data", "bounties.json"), "utf8"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const cadenceRaw = JSON.stringify(cadence);
assert(cadence.schema_version === 5, "cadence schema_version must be 5");
assert(cadence.problem_source === "hybrid", "cadence problem_source must be hybrid");
assert(cadence.counts && Number.isInteger(cadence.counts.total_targets), "cadence counts must be present");
assert(Array.isArray(cadence.targets), "cadence targets must be an array");
assert(cadence.target_window && cadence.target_window.current, "cadence current theorem must be present");
assert(cadence.cadence && cadence.cadence.window_blocks === 100, "cadence window must be 100 blocks");
assert(cadence.cadence.variants_enabled === true, "UID variants must be enabled");
assert(!cadenceRaw.includes("proof_script"), "cadence JSON must not publish proof scripts");
assert(!cadenceRaw.includes("proof_sha256"), "cadence JSON must not publish proof hashes");
assert(!cadenceRaw.includes("commitment_hash"), "cadence JSON must not publish commitments");
assert(!cadenceRaw.includes("proof_nonce"), "cadence JSON must not publish proof nonces");

const cadenceHtml = tasks.renderCadence(cadence);
assert(cadenceHtml.includes("Theorem window"), "cadence render must include theorem window");
assert(cadenceHtml.includes("Ordered target state"), "cadence render must include ordered target state");
assert(cadenceHtml.includes("Current theorem"), "cadence render must emphasize current theorem");
assert(cadenceHtml.includes("Proof receipts"), "cadence render must include proof receipts");
assert(cadenceHtml.includes("5DvFMbph3has15zmHLd6WsZAKNhYN45ctmydJEQTWxA2U2No"), "hotkey must render in full");
assert(!cadenceHtml.includes("Proof</dt>"), "cadence render must not show proof fields");
assert(!cadenceHtml.includes("Commit</dt>"), "cadence render must not show commit fields");

assert(bounties.schema_version === 1, "bounty schema_version must be 1");
assert(Array.isArray(bounties.campaigns), "bounty campaigns must be an array");
assert(bounties.campaigns[0].reward_label === "1k SN467 alpha", "bounty reward placeholder must be present");
const bountiesRaw = JSON.stringify(bounties);
assert(!bountiesRaw.includes("proof_script"), "bounty JSON must not publish proof scripts");
assert(!bountiesRaw.includes("proof_sha256"), "bounty JSON must not publish proof hashes");
assert(!bountiesRaw.includes("signature"), "bounty JSON must not publish signatures");
const bountyHtml = tasks.renderBounties(bounties);
assert(bountyHtml.includes("1k SN467 alpha"), "bounty render must show reward");
assert(bountyHtml.includes("Accepted"), "bounty render must show accepted winner state");
assert(bountyHtml.includes("5DvFMbph3has15zmHLd6WsZAKNhYN45ctmydJEQTWxA2U2No"), "bounty solver hotkey must render");
assert(bountyHtml.includes("Google DeepMind Formal Conjectures"), "bounty render must show source attribution");
assert(bountyHtml.includes("not affiliated with Google DeepMind"), "bounty render must show non-affiliation note");
const dashboardHtml = tasks.renderDashboard(cadence, bounties);
assert(dashboardHtml.includes("Live cadence work"), "dashboard render must include cadence heading");
assert(dashboardHtml.includes("Current theorem"), "dashboard render must include current theorem section");
assert(dashboardHtml.includes("100 blocks"), "dashboard render must explain cadence duration");
assert(dashboardHtml.includes("Bounty solved, awaiting next bounty."), "dashboard render must show solved-bounty waiting note");
assert(dashboardHtml.includes("1k SN467 alpha"), "dashboard render must show current bounty reward");
assert(dashboardHtml.includes("no subnet UID is required"), "dashboard render must explain bounty access");
assert((dashboardHtml.match(/<article class="bounty-card/g) || []).length === 1, "dashboard render must show one bounty card");
const weakVisionCopy = ["The vision", "is deliberately", "small"].join(" ");

for (const page of [
  "index.html",
  "dashboard/index.html",
  "faq/index.html",
  "examples/cadence/0000/index.html",
  "examples/bounties/example/index.html",
]) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  assert(html.includes('href="/"'), `${page} must link to home`);
  assert(html.includes('href="/dashboard/"'), `${page} must link to /dashboard/`);
  assert(html.includes('href="/faq/"'), `${page} must link to /faq/`);
  assert(!html.includes('href="/cadence/"'), `${page} must not link to removed /cadence/`);
  assert(!html.includes('href="/bounties/"'), `${page} must not link to removed /bounties/`);
  assert(!html.includes('href="/setup/"'), `${page} must not link to removed /setup/`);
  assert(!html.includes('href="/solve/"'), `${page} must not link to removed /solve/`);
  assert(!html.includes(weakVisionCopy), `${page} must not use weak vision copy`);
}

const homeHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(homeHtml.includes("sum_first_odds"), "home page must show the concrete Lean proof example");
assert(homeHtml.includes("Lean is the referee."), "home page must explain Lean");
assert(homeHtml.includes("One idea, written in two forms."), "home page must not repeat layout instruction as copy");
assert(!homeHtml.includes("sit side by side"), "home page must not describe layout instructions literally");
assert(homeHtml.includes("Cadence scoring"), "home page must split cadence scoring copy");
assert(homeHtml.includes("Bounty rewards"), "home page must split bounty reward copy");
assert(homeHtml.includes("prover APIs"), "home page must explain API-assisted cadence work");
assert(!homeHtml.includes("Some bounty tasks use"), "home page must remove stale Some source copy");
assert(homeHtml.includes("not affiliated with Google DeepMind"), "home page must include source non-affiliation note");

const dashboardPageHtml = fs.readFileSync(path.join(root, "dashboard", "index.html"), "utf8");
assert(dashboardPageHtml.includes('id="dashboard-board"'), "dashboard page must mount combined dashboard");
assert(dashboardPageHtml.includes("data-cadence-live-url"), "dashboard page must include cadence live feed");
assert(dashboardPageHtml.includes("data-bounty-live-url"), "dashboard page must include bounty live feed");

const faqHtml = fs.readFileSync(path.join(root, "faq", "index.html"), "utf8");
for (const question of ["What is Lean?", "What is formal mathematics?", "What is a theorem?", "What is a proof?"]) {
  assert(faqHtml.includes(question), `FAQ must include ${question}`);
}
for (const copy of [
  "How long are cadence tasks?",
  "How does cadence scoring work?",
  "Do I have to be a miner to work on a bounty?",
  "How are bounty rewards paid?",
  "Google DeepMind Formal Conjectures",
  "not affiliated with Google DeepMind",
  "Apache 2.0",
]) {
  assert(faqHtml.includes(copy), `FAQ must include ${copy}`);
}

for (const redirect of ["cadence/index.html", "bounties/index.html", "miners/index.html"]) {
  const html = fs.readFileSync(path.join(root, redirect), "utf8");
  assert(html.includes('url=/dashboard/'), `${redirect} must redirect to dashboard`);
  assert(html.includes('href="/dashboard/"'), `${redirect} must link to dashboard`);
}

const setupHtml = fs.readFileSync(path.join(root, "setup", "index.html"), "utf8");
assert(setupHtml.includes('url=/'), "setup page must redirect to home");
assert(!setupHtml.includes("LEMMA_PROVER_BASE_URL"), "setup page must not keep setup instructions");
assert(!fs.existsSync(path.join(root, "assets", "site.js")), "setup copy helper must be removed");

console.log("task pages ok");
