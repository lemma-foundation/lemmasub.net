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

  function dateText(unix) {
    if (!Number.isFinite(Number(unix))) {
      return "unknown";
    }
    return new Date(Number(unix) * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");
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
      "<li>" +
      "<span>UID " + escapeHtml(solver.uid) + "</span>" +
      "<code>" + escapeHtml(solver.hotkey || "hotkey unknown") + "</code>" +
      '<span class="muted">proof ' + escapeHtml(shortHash(solver.proof_sha256)) + "</span>" +
      '<span class="muted">' + escapeHtml(weight.toFixed(2)) + "% weight</span>" +
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

  function renderDashboard(data) {
    if (!data || data.schema_version !== 1) {
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
      '<section class="dashboard-section" aria-labelledby="active-target-title">' +
      '<p class="eyebrow">Active target</p>' +
      '<div id="active-target-title">' + activeHtml + "</div>" +
      "</section>" +
      '<section class="dashboard-section" aria-labelledby="current-solvers-title">' +
      '<p class="eyebrow">Current solver set</p>' +
      '<h2 id="current-solvers-title">Weight stays with the latest verified solver set.</h2>' +
      renderCurrentSolvers(data.current_solver_set) +
      "</section>" +
      '<section class="dashboard-section" aria-labelledby="queue-title">' +
      '<p class="eyebrow">Queue</p>' +
      '<h2 id="queue-title">Ordered target state.</h2>' +
      '<ol class="target-list">' + targets.map(renderTarget).join("") + "</ol>" +
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
