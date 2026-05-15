#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const solve = require("../assets/solve.js");

const root = path.resolve(__dirname, "..");
const fixture = JSON.parse(fs.readFileSync(path.join(root, "fixtures", "commitment_v1.json"), "utf8"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  assert(solve.canonicalJson(fixture.preimage) === fixture.canonical_json, "canonical JSON mismatch");
  assert(await solve.proofSha256(fixture.proof_script) === fixture.preimage.proof_sha256, "proof hash mismatch");
  assert(
    await solve.commitmentHashFromPreimage(fixture.preimage) === fixture.commitment_hash,
    "commitment hash mismatch",
  );
  assert(
    await solve.commitmentPayloadFromPreimage(fixture.preimage) === fixture.payload_text,
    "commitment payload mismatch",
  );
  assert(
    JSON.stringify(solve.commitmentInfoFromPayload(fixture.payload_text)) === JSON.stringify(fixture.metadata_info),
    "commitment metadata info mismatch",
  );
  assert(
    solve.metadataPayloadFromJson({ info: fixture.metadata_info }) === fixture.payload_text,
    "commitment metadata decode mismatch",
  );
  assert(solve.canonicalJson(fixture.portal_header) === fixture.portal_header_canonical_json, "portal header mismatch");
  assert(solve.portalSigningMessage(fixture.portal_header) === fixture.portal_signing_message, "portal signing mismatch");
  console.log("solve commitment ok");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
