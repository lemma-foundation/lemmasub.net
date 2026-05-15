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
assert(cadence.schema_version === 4, "cadence schema_version must be 4");
assert(cadence.problem_source === "hybrid", "cadence problem_source must be hybrid");
assert(cadence.counts && Number.isInteger(cadence.counts.total_targets), "cadence counts must be present");
assert(Array.isArray(cadence.targets), "cadence targets must be an array");
assert(cadence.target_window && cadence.target_window.current, "cadence current theorem must be present");
assert(!cadenceRaw.includes("proof_script"), "cadence JSON must not publish proof scripts");
assert(!cadenceRaw.includes("proof_sha256"), "cadence JSON must not publish proof hashes");
assert(!cadenceRaw.includes("commitment_hash"), "cadence JSON must not publish commitments");
assert(!cadenceRaw.includes("proof_nonce"), "cadence JSON must not publish proof nonces");

const cadenceHtml = tasks.renderCadence(cadence);
assert(cadenceHtml.includes("Theorem window"), "cadence render must include theorem window");
assert(cadenceHtml.includes("Ordered target state"), "cadence render must include ordered target state");
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
assert(bountyHtml.includes("Formal Conjectures bounties"), "bounty render must include title");
assert(bountyHtml.includes("UID needed"), "bounty render must explain UID is not needed");
assert(bountyHtml.includes("1k SN467 alpha"), "bounty render must show reward");
assert(bountyHtml.includes("Accepted"), "bounty render must show accepted winner state");
assert(bountyHtml.includes("5DvFMbph3has15zmHLd6WsZAKNhYN45ctmydJEQTWxA2U2No"), "bounty solver hotkey must render");
const weakVisionCopy = ["The vision", "is deliberately", "small"].join(" ");

for (const page of [
  "index.html",
  "cadence/index.html",
  "bounties/index.html",
  "setup/index.html",
  "faq/index.html",
]) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  assert(html.includes('href="/cadence/"'), `${page} must link to /cadence/`);
  assert(html.includes('href="/bounties/"'), `${page} must link to /bounties/`);
  assert(html.includes('href="/setup/"'), `${page} must link to /setup/`);
  assert(!html.includes('href="/solve/"'), `${page} must not link to removed /solve/`);
  assert(!html.includes(weakVisionCopy), `${page} must not use weak vision copy`);
}

const setupHtml = fs.readFileSync(path.join(root, "setup", "index.html"), "utf8");
const codePanels = setupHtml.match(/class="code-panel"/g) || [];
const copyButtons = setupHtml.match(/data-copy-code/g) || [];
assert(codePanels.length > 0, "setup page must have code panels");
assert(copyButtons.length === codePanels.length, "every setup code panel must have a copy button");
assert(setupHtml.includes("LEMMA_PROVER_BASE_URL"), "setup page must show provider base URL");
assert(setupHtml.includes("LEMMA_PROVER_API_KEY"), "setup page must show provider API key");
assert(setupHtml.includes("LEMMA_PROVER_MODEL"), "setup page must show provider model");
assert(setupHtml.includes("$LEMMA_PROVER_BASE_URL/models"), "setup page must show model-list request");
assert(setupHtml.includes("/assets/site.js"), "setup page must load copy-button helper");
assert(setupHtml.includes("https://platform.openai.com/docs/api-reference/models/list"), "setup page must link OpenAI model docs");
assert(setupHtml.includes("https://ai.google.dev/gemini-api/docs/openai"), "setup page must link Gemini compatibility docs");
assert(setupHtml.includes("https://chutes.ai/docs/examples/llm-chat"), "setup page must link Chutes LLM docs");
assert(setupHtml.includes("https://docs.anthropic.com/en/api/openai-sdk"), "setup page must link Anthropic compatibility docs");
assert(setupHtml.includes("https://api.openai.com/v1"), "setup page must show OpenAI base URL");
assert(setupHtml.includes("https://generativelanguage.googleapis.com/v1beta/openai"), "setup page must show Gemini base URL");
assert(setupHtml.includes("https://llm.chutes.ai/v1"), "setup page must show Chutes base URL");
assert(setupHtml.includes("https://api.anthropic.com/v1"), "setup page must show Anthropic base URL");
assert(setupHtml.includes("uv run lemma mine --bounty"), "setup page must show bounty verification");
assert(setupHtml.includes("uv run lemma validate"), "setup page must show validator command");

console.log("task pages ok");
