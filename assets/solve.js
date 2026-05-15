(function () {
  "use strict";

  var EXTENSION_URL = "https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp/+esm";
  var API_URL = "https://cdn.jsdelivr.net/npm/@polkadot/api/+esm";
  var SIGNING_DOMAIN = "lemma:portal:v1";
  var COMMITMENT_SCHEMA = "lemma_proof_commitment_v1";
  var SUBMISSION_SCHEMA = "lemma_portal_submission_v1";
  var COMMITMENT_PREFIX = "lemma:v1:";

  var els = {};
  var state = {
    api: null,
    apiEndpoint: "",
    accounts: [],
    portal: null,
    prepared: null,
    verified: null,
    commitmentBlock: null,
    commitmentBlockHash: "",
  };
  var libsPromise = null;

  function init() {
    var app = document.getElementById("solve-app");
    if (!app) {
      return;
    }
    [
      "portal-url",
      "chain-url",
      "refresh-target",
      "connect-wallet",
      "target-id",
      "target-phase",
      "wallet-state",
      "commitment-state",
      "verify-state",
      "solve-message",
      "account-select",
      "proof-script",
      "challenge-source",
      "manifest-sha",
      "proof-sha",
      "proof-nonce",
      "commitment-hash",
      "verify-proof",
      "prepare-commitment",
      "publish-commitment",
      "check-chain",
      "submit-proof",
      "chain-payload",
    ].forEach(function (id) {
      els[id] = document.getElementById(id);
    });

    els["refresh-target"].addEventListener("click", function () {
      runAction(els["refresh-target"], refreshPortalState);
    });
    els["connect-wallet"].addEventListener("click", function () {
      runAction(els["connect-wallet"], connectWallet);
    });
    els["prepare-commitment"].addEventListener("click", function () {
      runAction(els["prepare-commitment"], prepareCommitment);
    });
    els["verify-proof"].addEventListener("click", function () {
      runAction(els["verify-proof"], verifyProof);
    });
    els["publish-commitment"].addEventListener("click", function () {
      runAction(els["publish-commitment"], publishCommitment);
    });
    els["check-chain"].addEventListener("click", function () {
      runAction(els["check-chain"], checkChainCommitment);
    });
    els["submit-proof"].addEventListener("click", function () {
      runAction(els["submit-proof"], submitProof);
    });
    els["proof-script"].addEventListener("input", resetPrepared);
    els["account-select"].addEventListener("change", resetPrepared);
    els["portal-url"].addEventListener("change", resetPrepared);

    renderAccounts();
    refreshPortalState().catch(function (error) {
      setMessage(error.message, "error");
    });
  }

  function portalBase() {
    return String(els["portal-url"].value || "/api/portal/v1").replace(/\/+$/, "");
  }

  function setMessage(message, kind) {
    els["solve-message"].textContent = message;
    els["solve-message"].dataset.kind = kind || "info";
  }

  async function runAction(button, fn) {
    button.disabled = true;
    try {
      await fn();
    } catch (error) {
      setMessage(error.message || String(error), "error");
    } finally {
      button.disabled = false;
    }
  }

  async function requestJson(path, options) {
    var response = await fetch(portalBase() + path, options || {});
    var payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      throw new Error(payload.error || "portal request failed");
    }
    return payload;
  }

  async function refreshPortalState() {
    state.portal = await requestJson("/state");
    resetPrepared();
    renderPortalState();
    setMessage("Portal state loaded.", "ok");
  }

  function renderPortalState() {
    var target = activeTarget();
    var phase = state.portal && state.portal.phase;
    els["target-id"].textContent = target ? target.id : "No active target";
    els["target-phase"].textContent = phase ? phase.name + " at block " + phase.current_block : "Unavailable";
    els["manifest-sha"].textContent = state.portal ? shortText(state.portal.manifest_sha256) : "Unknown";
    els["challenge-source"].textContent = target ? target.challenge_source : "No active target.";
    if (target && target.submission_stub && !els["proof-script"].value.trim()) {
      els["proof-script"].value = target.submission_stub;
    }
    renderPrepared();
  }

  function renderAccounts() {
    els["account-select"].innerHTML = "";
    if (!state.accounts.length) {
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "No wallet connected";
      els["account-select"].appendChild(empty);
      els["wallet-state"].textContent = "Disconnected";
      return;
    }
    state.accounts.forEach(function (account) {
      var option = document.createElement("option");
      option.value = account.address;
      option.textContent = (account.meta && account.meta.name ? account.meta.name + " - " : "") + middleText(account.address);
      els["account-select"].appendChild(option);
    });
    els["wallet-state"].textContent = state.accounts.length + " account" + (state.accounts.length === 1 ? "" : "s");
  }

  function renderPrepared() {
    var prepared = state.prepared;
    els["proof-sha"].textContent = prepared ? shortText(prepared.proofSha256) : "Not prepared";
    if (!prepared && state.verified) {
      els["proof-sha"].textContent = shortText(state.verified.proofSha256);
    }
    els["proof-nonce"].textContent = prepared ? shortText(prepared.proofNonce) : "Not prepared";
    els["commitment-hash"].textContent = prepared ? shortText(prepared.commitmentHash) : "Not prepared";
    els["chain-payload"].textContent = state.chainPayload ? shortText(state.chainPayload) : "Not checked";
    if (state.commitmentBlock) {
      els["commitment-state"].textContent = "Included at block " + state.commitmentBlock;
    } else {
      els["commitment-state"].textContent = prepared ? "Prepared" : "Not prepared";
    }
    if (state.verified) {
      els["verify-state"].textContent = state.verified.passed ? "Accepted" : "Rejected";
    } else {
      els["verify-state"].textContent = "Not checked";
    }
  }

  async function loadLibs() {
    if (!libsPromise) {
      libsPromise = Promise.all([import(EXTENSION_URL), import(API_URL)]);
    }
    var libs = await libsPromise;
    return {
      extension: libs[0],
      api: libs[1],
    };
  }

  async function connectWallet() {
    var libs = await loadLibs();
    var extensions = await libs.extension.web3Enable("Lemma Solve");
    if (!extensions.length) {
      throw new Error("No injected Substrate wallet approved the connection.");
    }
    state.accounts = await libs.extension.web3Accounts();
    if (!state.accounts.length) {
      throw new Error("No wallet accounts were exposed by the extension.");
    }
    renderAccounts();
    resetPrepared();
    setMessage("Wallet connected.", "ok");
  }

  async function ensureApi() {
    var endpoint = String(els["chain-url"].value || "").trim();
    if (!endpoint) {
      throw new Error("Chain RPC is required.");
    }
    if (state.api && state.apiEndpoint === endpoint) {
      return state.api;
    }
    var libs = await loadLibs();
    state.api = await libs.api.ApiPromise.create({ provider: new libs.api.WsProvider(endpoint) });
    state.apiEndpoint = endpoint;
    return state.api;
  }

  async function prepareCommitment() {
    var target = requireTarget();
    var account = requireAccount();
    var proof = normalizeProof(els["proof-script"].value);
    var proofHash = await sha256Hex(proof);
    var nonce = state.prepared && state.prepared.proof === proof && state.prepared.account === account.address
      ? state.prepared.proofNonce
      : randomHex(32);
    var preimage = {
      schema: COMMITMENT_SCHEMA,
      netuid: Number(state.portal.netuid),
      miner_hotkey: account.address,
      manifest_sha256: state.portal.manifest_sha256,
      target_id: target.id,
      theorem_statement_sha256: target.theorem_statement_sha256,
      proof_sha256: proofHash,
      nonce: nonce,
    };
    var commitmentHash = await sha256Hex(canonicalJson(preimage));
    state.prepared = {
      account: account.address,
      proof: proof,
      proofSha256: proofHash,
      proofNonce: nonce,
      commitmentHash: commitmentHash,
      payload: COMMITMENT_PREFIX + commitmentHash,
    };
    state.commitmentBlock = null;
    state.commitmentBlockHash = "";
    renderPrepared();
    setMessage("Commitment prepared.", "ok");
  }

  async function verifyProof() {
    var payload = await buildPortalPayload();
    setMessage("Checking proof with portal Lean verifier.", "info");
    var result = await requestJson("/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    state.verified = {
      proof: payload.proof_script,
      proofSha256: result.proof_sha256 || payload.proof_sha256,
      passed: Boolean(result.passed),
      reason: result.reason || "",
    };
    renderPrepared();
    if (!state.verified.passed) {
      throw new Error("Lean rejected this proof: " + (state.verified.reason || "verification_failed"));
    }
    setMessage("Lean accepted proof. Submit the proof package next.", "ok");
  }

  async function publishCommitment() {
    var phase = requireCommitPhase();
    var prepared = await ensurePrepared();
    var account = requireAccount();
    var api = await ensureApi();
    if (!api.tx.commitments || !api.tx.commitments.setCommitment) {
      throw new Error("Connected chain does not expose commitments.setCommitment.");
    }
    var libs = await loadLibs();
    var injector = await libs.extension.web3FromAddress(account.address);
    var tx = api.tx.commitments.setCommitment(Number(state.portal.netuid), commitmentInfoFromPayload(prepared.payload));
    setMessage("Waiting for wallet signature.", "info");
    var included = await signAndWaitForBlock(api, tx, account.address, injector.signer);
    state.commitmentBlock = included.blockNumber;
    state.commitmentBlockHash = included.blockHash;
    await checkChainCommitment();
    renderPrepared();
    setMessage("Commitment included before cutoff " + phase.commit_cutoff_block + ".", "ok");
  }

  async function checkChainCommitment() {
    var prepared = requirePrepared();
    var account = requireAccount();
    var api = await ensureApi();
    if (!api.query.commitments || !api.query.commitments.commitmentOf) {
      throw new Error("Connected chain does not expose commitments.commitmentOf.");
    }
    var raw = await api.query.commitments.commitmentOf(Number(state.portal.netuid), account.address);
    var payload = metadataPayloadFromJson(raw && raw.toJSON ? raw.toJSON() : raw);
    state.chainPayload = payload;
    renderPrepared();
    if (payload !== prepared.payload) {
      throw new Error("Chain commitment does not match the prepared payload.");
    }
    setMessage("Chain commitment matches the prepared payload.", "ok");
  }

  async function submitProof() {
    var payload = await buildPortalPayload();
    setMessage("Sending proof package to portal.", "info");
    var result = await requestJson("/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMessage(result.accepted ? "Proof accepted by portal verifier." : "Portal response received.", "ok");
  }

  async function buildPortalPayload() {
    var target = requireTarget();
    var phase = requirePhase();
    var prepared = requirePrepared();
    var account = requireAccount();
    if (!state.commitmentBlock || state.chainPayload !== prepared.payload) {
      throw new Error("Publish and check the chain commitment first.");
    }
    var submittedUnix = Math.floor(Date.now() / 1000);
    var header = {
      schema: SUBMISSION_SCHEMA,
      netuid: Number(state.portal.netuid),
      miner_hotkey: account.address,
      target_id: target.id,
      manifest_sha256: state.portal.manifest_sha256,
      theorem_statement_sha256: target.theorem_statement_sha256,
      proof_sha256: prepared.proofSha256,
      proof_nonce: prepared.proofNonce,
      commitment_hash: prepared.commitmentHash,
      commitment_block: Number(state.commitmentBlock),
      commit_cutoff_block: Number(phase.commit_cutoff_block),
      reveal_block: Number(phase.reveal_block),
      submitted_unix: submittedUnix,
    };
    var signature = await signPortalHeader(account.address, header);
    return Object.assign({}, header, {
      signature: signature,
      proof_script: prepared.proof,
    });
  }

  async function signPortalHeader(address, header) {
    var libs = await loadLibs();
    var injector = await libs.extension.web3FromAddress(address);
    if (!injector.signer || !injector.signer.signRaw) {
      throw new Error("Selected wallet does not support raw message signing.");
    }
    var message = portalSigningMessage(header);
    var signed = await injector.signer.signRaw({
      address: address,
      data: stringToHex(message),
      type: "bytes",
    });
    return signed.signature;
  }

  function signAndWaitForBlock(api, tx, address, signer) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var unsubscribe = null;
      tx.signAndSend(address, { signer: signer }, async function (result) {
        if (settled) {
          return;
        }
        try {
          if (result.dispatchError) {
            throw new Error(dispatchErrorText(api, result.dispatchError));
          }
          if (result.status.isInBlock || result.status.isFinalized) {
            settled = true;
            var blockHash = (result.status.isInBlock ? result.status.asInBlock : result.status.asFinalized).toString();
            var header = await api.rpc.chain.getHeader(blockHash);
            if (unsubscribe) {
              unsubscribe();
            }
            resolve({
              blockHash: blockHash,
              blockNumber: Number(header.number.toString()),
            });
          }
        } catch (error) {
          if (!settled) {
            settled = true;
            reject(error);
          }
        }
      }).then(function (unsub) {
        unsubscribe = unsub;
      }).catch(reject);
    });
  }

  function dispatchErrorText(api, dispatchError) {
    if (dispatchError.isModule) {
      var decoded = api.registry.findMetaError(dispatchError.asModule);
      return decoded.section + "." + decoded.name;
    }
    return dispatchError.toString();
  }

  async function ensurePrepared() {
    var account = requireAccount();
    if (!state.prepared || state.prepared.account !== account.address) {
      await prepareCommitment();
    }
    return state.prepared;
  }

  function requirePrepared() {
    var account = requireAccount();
    if (!state.prepared || state.prepared.account !== account.address) {
      throw new Error("Prepare the commitment first.");
    }
    return state.prepared;
  }

  function resetPrepared() {
    state.prepared = null;
    state.verified = null;
    state.commitmentBlock = null;
    state.commitmentBlockHash = "";
    state.chainPayload = "";
    renderPrepared();
  }

  function requireTarget() {
    var target = activeTarget();
    if (!target) {
      throw new Error("No active target is available.");
    }
    return target;
  }

  function requirePhase() {
    if (!state.portal || !state.portal.phase) {
      throw new Error("Portal phase is unavailable.");
    }
    return state.portal.phase;
  }

  function requireCommitPhase() {
    var phase = requirePhase();
    if (phase.name !== "commit") {
      throw new Error("Current target is not in commit phase.");
    }
    return phase;
  }

  function requireAccount() {
    var address = els["account-select"].value;
    var account = state.accounts.find(function (item) {
      return item.address === address;
    });
    if (!account) {
      throw new Error("Connect and select a wallet account.");
    }
    return account;
  }

  function activeTarget() {
    return state.portal && state.portal.active_target ? state.portal.active_target : null;
  }

  function normalizeProof(proof) {
    var text = String(proof || "").trim() + "\n";
    if (!text.trim()) {
      throw new Error("Submission.lean is empty.");
    }
    return text;
  }

  function rawField(bytes) {
    var out = {};
    out["Raw" + bytes.length] = bytesToHex(bytes);
    return out;
  }

  function commitmentInfoFromPayload(payload) {
    return { fields: [[rawField(new TextEncoder().encode(String(payload || "")))]] };
  }

  function metadataPayloadFromJson(metadata) {
    var fields = metadata && metadata.info && metadata.info.fields;
    if (!Array.isArray(fields) || !fields.length) {
      return "";
    }
    var field = fields[0];
    if (Array.isArray(field)) {
      field = field[0];
    }
    if (!field || typeof field === "string") {
      return "";
    }
    var hex = field[Object.keys(field)[0]];
    return hexToString(hex);
  }

  function portalSigningMessage(header) {
    return SIGNING_DOMAIN + ":" + canonicalJson(header);
  }

  function canonicalJson(value) {
    if (Array.isArray(value)) {
      return "[" + value.map(canonicalJson).join(",") + "]";
    }
    if (value && typeof value === "object") {
      return "{" + Object.keys(value).sort().map(function (key) {
        return JSON.stringify(key) + ":" + canonicalJson(value[key]);
      }).join(",") + "}";
    }
    return JSON.stringify(value);
  }

  async function sha256Hex(text) {
    var bytes = new TextEncoder().encode(text);
    var digest = await webCrypto().subtle.digest("SHA-256", bytes);
    return bytesToHex(new Uint8Array(digest)).slice(2);
  }

  function randomHex(byteLength) {
    var bytes = new Uint8Array(byteLength);
    webCrypto().getRandomValues(bytes);
    return bytesToHex(bytes).slice(2);
  }

  function webCrypto() {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      return crypto;
    }
    if (typeof require === "function") {
      return require("node:crypto").webcrypto;
    }
    throw new Error("Web Crypto is unavailable.");
  }

  function stringToHex(text) {
    return bytesToHex(new TextEncoder().encode(text));
  }

  function bytesToHex(bytes) {
    return "0x" + Array.prototype.map.call(bytes, function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function hexToString(hex) {
    var clean = String(hex || "").replace(/^0x/, "");
    var out = "";
    for (var i = 0; i < clean.length; i += 2) {
      out += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
    }
    return out;
  }

  function shortText(value) {
    var text = String(value || "");
    return text.length > 20 ? text.slice(0, 16) + "..." : text;
  }

  function middleText(value) {
    var text = String(value || "");
    return text.length > 22 ? text.slice(0, 10) + "..." + text.slice(-8) : text;
  }

  var api = {
    canonicalJson: canonicalJson,
    commitmentHashFromPreimage: function (preimage) {
      return sha256Hex(canonicalJson(preimage));
    },
    commitmentInfoFromPayload: commitmentInfoFromPayload,
    portalSigningMessage: portalSigningMessage,
    commitmentPayloadFromPreimage: async function (preimage) {
      return COMMITMENT_PREFIX + await sha256Hex(canonicalJson(preimage));
    },
    metadataPayloadFromJson: metadataPayloadFromJson,
    normalizeProof: normalizeProof,
    proofSha256: sha256Hex,
  };

  if (typeof window !== "undefined") {
    window.LemmaSolveCommitment = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof document === "undefined") {
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
