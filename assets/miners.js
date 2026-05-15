(function (root) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[ch];
    });
  }

  function shortHash(value) {
    var text = String(value || "");
    return text.length > 16 ? text.slice(0, 16) : text;
  }

  function middleHash(value) {
    var text = String(value || "");
    if (text.length <= 18) {
      return text;
    }
    return text.slice(0, 8) + "..." + text.slice(-6);
  }

  function targetLabel(value) {
    var parts = String(value || "").split("/");
    return parts[parts.length - 1] || "unknown target";
  }

  function dateText(unix) {
    if (!Number.isFinite(Number(unix))) {
      return "unknown";
    }
    return new Date(Number(unix) * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");
  }

  function countText(count, label) {
    return count + " " + label + (count === 1 ? "" : "s");
  }

  function shortList(values, emptyText) {
    var clean = values.filter(Boolean).map(shortHash);
    if (clean.length === 0) {
      return emptyText;
    }
    if (clean.length <= 3) {
      return clean.join(", ");
    }
    return clean.slice(0, 3).join(", ") + " +" + (clean.length - 3) + " more";
  }

  function targetStatus(target) {
    if (!target || !target.status) {
      return "queued";
    }
    return String(target.status);
  }

  function renderStat(label, value) {
    return (
      '<div class="stat">' +
      "<span>" + escapeHtml(label) + "</span>" +
      "<strong>" + escapeHtml(value) + "</strong>" +
      "</div>"
    );
  }

  function renderSolver(solver) {
    var weight = Number(solver.weight_share || 0) * 100;
    return (
      '<li class="solver-row">' +
      '<div class="record-id">' +
      "<strong>UID " + escapeHtml(solver.uid) + "</strong>" +
      '<span class="badge">' + escapeHtml(weight.toFixed(2)) + "% ledger split</span>" +
      "</div>" +
      '<div class="record-title">' +
      "<span>Hotkey</span>" +
      '<code title="' + escapeHtml(solver.hotkey || "hotkey unknown") + '">' +
      escapeHtml(middleHash(solver.hotkey || "hotkey unknown")) +
      "</code>" +
      "</div>" +
      '<dl class="record-facts">' +
      "<div><dt>Proof</dt><dd><code>" + escapeHtml(shortHash(solver.proof_sha256)) + "</code></dd></div>" +
      "<div><dt>Commit</dt><dd><code>" + escapeHtml(shortHash(solver.commitment_hash)) + "</code></dd></div>" +
      "</dl>" +
      "</li>"
    );
  }

  function renderCurrentSolvers(current) {
    if (!current || !Array.isArray(current.solvers) || current.solvers.length === 0) {
      return '<p class="muted">No target has been solved yet.</p>';
    }
    return (
      '<ul class="solver-list">' +
      current.solvers.map(renderSolver).join("") +
      "</ul>"
    );
  }

  function renderTarget(target) {
    var status = targetStatus(target);
    var solved = target.solved || {};
    var meta = "order " + escapeHtml(target.order) + " - " + escapeHtml(target.difficulty || "unlabeled");
    if (status === "solved") {
      meta += " - solved at block " + escapeHtml(solved.accepted_block || "unknown");
      if (Array.isArray(solved.solver_uids) && solved.solver_uids.length) {
        meta += " - solver UID " + escapeHtml(solved.solver_uids.join(", "));
      }
    }
    return (
      '<li class="target-row is-' + escapeHtml(status) + '">' +
      "<span>" + escapeHtml(status) + "</span>" +
      "<strong>" + escapeHtml(target.title || target.id) + "</strong>" +
      "<code>" + escapeHtml(target.id) + "</code>" +
      '<small class="muted">' + meta + "</small>" +
      "</li>"
    );
  }

  function renderWindowSlot(label, target) {
    if (!target) {
      return (
        '<article class="window-card is-empty">' +
        "<span>" + escapeHtml(label) + "</span>" +
        "<strong>None</strong>" +
        '<small class="muted">No theorem in this slot.</small>' +
        "</article>"
      );
    }
    var status = targetStatus(target);
    var meta = status + " - order " + target.order + " - " + (target.difficulty || "unlabeled");
    if (status === "solved" && target.solved && target.solved.accepted_block) {
      meta += " - block " + target.solved.accepted_block;
    }
    return (
      '<article class="window-card is-' + escapeHtml(status) + '">' +
      "<span>" + escapeHtml(label) + "</span>" +
      "<strong>" + escapeHtml(target.title || target.id) + "</strong>" +
      "<code>" + escapeHtml(target.id) + "</code>" +
      '<small class="muted">' + escapeHtml(meta) + "</small>" +
      "</article>"
    );
  }

  function renderTheoremWindow(windowData) {
    if (!windowData || typeof windowData !== "object") {
      return "";
    }
    return (
      '<section class="dashboard-section" aria-labelledby="theorem-window-title">' +
      '<p class="eyebrow">Theorem window</p>' +
      '<h2 id="theorem-window-title">Previous, current, next.</h2>' +
      '<div class="theorem-window">' +
      renderWindowSlot("Previous theorem", windowData.previous) +
      renderWindowSlot("Current theorem", windowData.current) +
      renderWindowSlot("Next theorem", windowData.next) +
      "</div>" +
      "</section>"
    );
  }

  function receiptKey(receipt) {
    return [
      receipt.target_id || "",
      receipt.solver_uid || "",
      receipt.solver_hotkey || "",
      receipt.proof_sha256 || "",
      receipt.commitment_hash || "",
    ].join("|");
  }

  function groupedReceipts(receipts) {
    var groups = [];
    var byKey = Object.create(null);
    receipts.forEach(function (receipt) {
      if (!receipt || typeof receipt !== "object") {
        return;
      }
      var key = receiptKey(receipt);
      var group = byKey[key];
      if (!group) {
        group = Object.assign({}, receipt, { receipts: [], validators: [] });
        byKey[key] = group;
        groups.push(group);
      }
      group.receipts.push(receipt);
      if (receipt.validator_hotkey && group.validators.indexOf(receipt.validator_hotkey) === -1) {
        group.validators.push(receipt.validator_hotkey);
      }
      var receiptBlock = Number(receipt.accepted_block);
      var groupBlock = Number(group.accepted_block);
      if (Number.isFinite(receiptBlock) && (!Number.isFinite(groupBlock) || receiptBlock < groupBlock)) {
        group.accepted_block = receipt.accepted_block;
        group.accepted_unix = receipt.accepted_unix;
      }
    });
    return groups;
  }

  function renderReceipt(receipt) {
    var validatorCount = receipt.validators && receipt.validators.length ? receipt.validators.length : 1;
    var receiptCount = receipt.receipts && receipt.receipts.length ? receipt.receipts.length : 1;
    var receiptNote = shortHash(receipt.receipt_sha256);
    var name = receipt.theorem_name || targetLabel(receipt.target_id);
    if (receiptCount > 1) {
      receiptNote += " +" + (receiptCount - 1) + " more";
    }
    return (
      '<li class="receipt-row">' +
      "<header>" +
      '<div class="record-id">' +
      "<strong>UID " + escapeHtml(receipt.solver_uid) + "</strong>" +
      '<span class="badge">' + escapeHtml(countText(validatorCount, "validator confirmation")) + "</span>" +
      "</div>" +
      '<div class="record-title">' +
      "<span>Target</span>" +
      '<strong title="' + escapeHtml(receipt.target_id) + '">' + escapeHtml(name) + "</strong>" +
      "</div>" +
      '<dl class="record-facts">' +
      "<div><dt>Proof</dt><dd><code>" + escapeHtml(shortHash(receipt.proof_sha256)) + "</code></dd></div>" +
      "<div><dt>Commit</dt><dd><code>" + escapeHtml(shortHash(receipt.commitment_hash)) + "</code></dd></div>" +
      "<div><dt>Accepted</dt><dd>block " + escapeHtml(receipt.accepted_block || "unknown") + "</dd></div>" +
      "</dl>" +
      "</header>" +
      '<details class="audit-details">' +
      "<summary>Audit details and proof</summary>" +
      '<dl class="audit-grid">' +
      "<div><dt>Target id</dt><dd><code>" + escapeHtml(receipt.target_id) + "</code></dd></div>" +
      "<div><dt>Validators</dt><dd>" + escapeHtml(shortList(receipt.validators || [receipt.validator_hotkey], "unknown")) + "</dd></div>" +
      "<div><dt>Receipt</dt><dd><code>" + escapeHtml(receiptNote || "unknown") + "</code></dd></div>" +
      "<div><dt>Commit window</dt><dd>committed " +
      escapeHtml(receipt.commitment_first_seen_block || "unknown") +
      " before cutoff " + escapeHtml(receipt.commit_cutoff_block || "unknown") + "</dd></div>" +
      "<div><dt>Accepted at</dt><dd>" + escapeHtml(dateText(receipt.accepted_unix)) + "</dd></div>" +
      "</dl>" +
      "<pre><code>" + escapeHtml(receipt.proof_script || "") + "</code></pre>" +
      "</details>" +
      "</li>"
    );
  }

  function renderReceipts(receipts) {
    if (!Array.isArray(receipts) || receipts.length === 0) {
      return '<p class="muted">No accepted proof receipts yet.</p>';
    }
    return '<ol class="receipt-list">' + groupedReceipts(receipts).map(renderReceipt).join("") + "</ol>";
  }

  function renderDashboard(data) {
    if (!data || data.schema_version !== 3) {
      throw new Error("unsupported miner dashboard schema");
    }

    var counts = data.counts || {};
    var active = data.active_target;
    var targets = Array.isArray(data.targets) ? data.targets : [];
    var activeHtml = active
      ? (
        "<h2>" + escapeHtml(active.title || active.id) + "</h2>" +
        '<p class="dashboard-meta">' +
        "Target " + escapeHtml(active.id) +
        " - " + escapeHtml(active.difficulty || "unlabeled") +
        " - " + escapeHtml(active.imports && active.imports.length ? active.imports.join(", ") : "imports unknown") +
        "</p>" +
        "<pre><code>" + escapeHtml(active.challenge_source || "") + "</code></pre>"
      )
      : "<h2>All listed targets are solved.</h2>";

    return (
      '<div class="stats-grid">' +
      renderStat("Total targets", counts.total_targets || 0) +
      renderStat("Solved", counts.solved_targets || 0) +
      renderStat("Remaining", counts.remaining_targets || 0) +
      renderStat("Current solvers", counts.current_solver_count || 0) +
      "</div>" +
      renderTheoremWindow(data.target_window) +
      '<section class="dashboard-section" aria-labelledby="active-target-title">' +
      '<p class="eyebrow">Active target</p>' +
      '<div id="active-target-title">' + activeHtml + "</div>" +
      "</section>" +
      '<section class="dashboard-section" aria-labelledby="current-solvers-title">' +
      '<p class="eyebrow">Latest accepted proof set</p>' +
      '<h2 id="current-solvers-title">Verified solvers.</h2>' +
      renderCurrentSolvers(data.current_solver_set) +
      "</section>" +
      '<section class="dashboard-section" aria-labelledby="queue-title">' +
      '<p class="eyebrow">Queue</p>' +
      '<h2 id="queue-title">Ordered target state.</h2>' +
      '<ol class="target-list">' + targets.map(renderTarget).join("") + "</ol>" +
      "</section>" +
      '<section class="dashboard-section" aria-labelledby="receipts-title">' +
      '<p class="eyebrow">Audit receipts</p>' +
      '<h2 id="receipts-title">Proof receipts.</h2>' +
      renderReceipts(data.accepted_proof_receipts) +
      "</section>" +
      '<p class="dashboard-meta">Generated ' + escapeHtml(dateText(data.generated_unix)) +
      " - manifest " + escapeHtml(shortHash(data.manifest_sha256)) + "</p>"
    );
  }

  function mount() {
    var el = root.document && root.document.getElementById("miner-dashboard");
    if (!el || typeof root.fetch !== "function") {
      return;
    }
    root.fetch("/data/miner-dashboard.json")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("dashboard JSON unavailable");
        }
        return response.json();
      })
      .then(function (data) {
        el.innerHTML = renderDashboard(data);
      })
      .catch(function (error) {
        el.innerHTML = '<p class="muted">Target board unavailable: ' + escapeHtml(error.message) + "</p>";
      });
  }

  var api = { renderDashboard: renderDashboard, targetStatus: targetStatus };
  root.LemmaMinerDashboard = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root.document) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
