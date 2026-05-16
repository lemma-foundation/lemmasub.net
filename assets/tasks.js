(function (root) {
  "use strict";

  var pollMs = 60000;
  var lastCadenceId = "";

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

  function dateText(unix) {
    if (!Number.isFinite(Number(unix))) {
      return "unknown";
    }
    return new Date(Number(unix) * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");
  }

  function shortHash(value) {
    var text = String(value || "");
    return text.length > 18 ? text.slice(0, 10) + "..." + text.slice(-6) : text;
  }

  function taskHref(task) {
    return task && task.source_url ? String(task.source_url) : "";
  }

  function taskTitle(task) {
    return String((task && (task.title || task.theorem_name || task.id)) || "No theorem");
  }

  function renderTaskLink(task) {
    var title = escapeHtml(taskTitle(task));
    var href = taskHref(task);
    if (!href) {
      return "<strong>" + title + "</strong>";
    }
    return '<a href="' + escapeHtml(href) + '">' + title + "</a>";
  }

  function renderStat(label, value) {
    return (
      '<div class="stat">' +
      "<span>" + escapeHtml(label) + "</span>" +
      "<strong>" + escapeHtml(value) + "</strong>" +
      "</div>"
    );
  }

  function renderWindowSlot(label, task) {
    if (!task) {
      return (
        '<article class="window-card is-empty">' +
        "<span>" + escapeHtml(label) + "</span>" +
        "<strong>None</strong>" +
        '<small class="muted">No theorem in this slot.</small>' +
        "</article>"
      );
    }
    return (
      '<article class="window-card is-' + escapeHtml(task.status || "queued") + '">' +
      "<span>" + escapeHtml(label) + "</span>" +
      renderTaskLink(task) +
      "<code>" + escapeHtml(task.id || "") + "</code>" +
      '<small class="muted">' +
      escapeHtml((task.split || task.difficulty || task.status || "queued") + " - seed " + (task.window_seed || "")) +
      "</small>" +
      "</article>"
    );
  }

  function renderFact(label, value) {
    return "<div><dt>" + escapeHtml(label) + "</dt><dd>" + escapeHtml(value || "unknown") + "</dd></div>";
  }

  function renderCurrentTheorem(task, cadence) {
    if (!task) {
      return "<h2>No current cadence theorem.</h2>";
    }
    var imports = Array.isArray(task.imports) && task.imports.length ? task.imports.join(", ") : "imports unknown";
    var countdown = cadence && cadence.next_rotation_block
      ? "block " + cadence.next_rotation_block + " - " + (cadence.next_rotation_eta || "about 20 minutes")
      : "next 100-block boundary";
    var toolchain = [task.lean_toolchain, task.mathlib_rev].filter(Boolean).join(" / ") || "unknown";
    var meta = "Target " + (task.id || "unknown") +
      " - " + (task.split || task.difficulty || "cadence") +
      " - " + imports;
    return (
      '<article class="current-theorem">' +
      "<h2>" + renderTaskLink(task) + "</h2>" +
      '<p class="dashboard-meta">' + escapeHtml(meta) + "</p>" +
      '<dl class="detail-grid is-compact">' +
      renderFact("Split", task.split || task.source_lane) +
      renderFact("Difficulty", task.difficulty || task.split) +
      renderFact("Topic", task.topic || task.source_lane) +
      renderFact("Theorem id", task.id) +
      renderFact("Theorem name", task.theorem_name) +
      renderFact("Seed/window", "seed " + ((cadence && cadence.seed) || task.window_seed || 0)) +
      renderFact("Next rotation", countdown) +
      renderFact("Imports", imports) +
      renderFact("Toolchain", toolchain) +
      renderFact("Statement hash", shortHash(task.theorem_statement_sha256)) +
      "</dl>" +
      "<pre><code>" + escapeHtml(task.challenge_source || "") + "</code></pre>" +
      "</article>"
    );
  }

  function renderSolver(solver) {
    var weight = Number(solver.weight_share || 0) * 100;
    return (
      '<li class="solver-row">' +
      '<div class="record-id"><strong>UID ' + escapeHtml(solver.uid) + "</strong>" +
      '<span class="badge">' + escapeHtml(weight.toFixed(2)) + "% split</span></div>" +
      '<div class="record-title"><span>Hotkey</span><code>' +
      escapeHtml(solver.hotkey || "unknown") +
      "</code></div>" +
      '<dl class="record-facts">' +
      "<div><dt>Accepted</dt><dd>" + escapeHtml(solver.verify_reason || "ok") + "</dd></div>" +
      "<div><dt>Lean time</dt><dd>" + escapeHtml(Number(solver.build_seconds || 0).toFixed(1)) + "s</dd></div>" +
      "</dl>" +
      "</li>"
    );
  }

  function renderSolvers(current) {
    if (!current || !Array.isArray(current.solvers) || current.solvers.length === 0) {
      return '<p class="muted">No accepted cadence solver set yet.</p>';
    }
    return '<ul class="solver-list">' + current.solvers.map(renderSolver).join("") + "</ul>";
  }

  function renderTargetRow(task) {
    var solved = task.solved || {};
    var meta = task.status || "queued";
    if (task.status === "solved" && solved.accepted_block) {
      meta += " at block " + solved.accepted_block;
    }
    return (
      '<li class="target-row is-' + escapeHtml(task.status || "queued") + '">' +
      "<span>" + escapeHtml(task.status || "queued") + "</span>" +
      renderTaskLink(task) +
      "<code>" + escapeHtml(task.id || "") + "</code>" +
      '<small class="muted">' +
      escapeHtml(meta + " - " + (task.split || task.difficulty || "cadence") + " - seed " + (task.window_seed || "")) +
      "</small>" +
      "</li>"
    );
  }

  function renderReceipt(receipt) {
    return (
      '<li class="receipt-row">' +
      "<header>" +
      '<div class="record-id"><strong>UID ' + escapeHtml(receipt.solver_uid) + "</strong>" +
      '<span class="badge">' + escapeHtml(receipt.verify_reason || "ok") + "</span></div>" +
      '<div class="record-title"><span>Theorem</span><strong>' +
      escapeHtml(receipt.title || receipt.theorem_name || receipt.target_id) +
      "</strong></div>" +
      '<dl class="record-facts">' +
      renderFact("Accepted", "block " + (receipt.accepted_block || "unknown")) +
      renderFact("Hotkey", receipt.solver_hotkey || "unknown") +
      renderFact("Lean time", Number(receipt.build_seconds || 0).toFixed(1) + "s") +
      "</dl>" +
      "</header>" +
      "</li>"
    );
  }

  function renderReceipts(receipts) {
    if (!Array.isArray(receipts) || receipts.length === 0) {
      return '<p class="muted">No accepted proof receipts yet.</p>';
    }
    return '<ol class="receipt-list">' + receipts.slice(-12).reverse().map(renderReceipt).join("") + "</ol>";
  }

  function renderCadence(data) {
    if (!data || (data.schema_version !== 5 && data.schema_version !== 4)) {
      throw new Error("unsupported cadence schema");
    }
    var counts = data.counts || {};
    var cadence = data.cadence || {};
    var current = data.active_target || (data.target_window && data.target_window.current);
    var currentId = current && current.id ? String(current.id) : "";
    var changed = lastCadenceId && currentId && currentId !== lastCadenceId;
    lastCadenceId = currentId || lastCadenceId;
    var updateClass = changed ? " is-updated" : "";
    var receipts = data.accepted_proof_receipts || data.accepted_solver_receipts || [];
    return (
      '<div class="task-feed miner-board' + updateClass + '">' +
      '<div class="stats-grid">' +
      renderStat("Total targets", counts.total_targets || 0) +
      renderStat("Accepted", counts.accepted_targets || 0) +
      renderStat("Window seed", cadence.seed || data.seed || 0) +
      renderStat("Current solvers", counts.current_solver_count || 0) +
      "</div>" +
      '<p class="dashboard-meta">Registered miners use prover APIs for cadence. The theorem window is 100 blocks, about 20 minutes, and validators score only Lean proofs that pass.</p>' +
      '<section class="dashboard-section"><p class="eyebrow">Theorem window</p>' +
      '<h2>Previous, current, next.</h2><div class="theorem-window">' +
      renderWindowSlot("Previous theorem", data.target_window && data.target_window.previous) +
      renderWindowSlot("Current theorem", data.target_window && data.target_window.current) +
      renderWindowSlot("Next theorem", data.target_window && data.target_window.next) +
      "</div></section>" +
      '<section class="dashboard-section theorem-focus">' +
      '<p class="eyebrow">Active target</p>' +
      renderCurrentTheorem(current, cadence) +
      "</section>" +
      '<section class="dashboard-section"><p class="eyebrow">Latest accepted proof set</p>' +
      "<h2>Verified solvers.</h2>" +
      renderSolvers(data.current_solver_set) +
      "</section>" +
      '<section class="dashboard-section"><p class="eyebrow">Queue</p>' +
      "<h2>Ordered target state.</h2>" +
      '<ol class="target-list">' + (data.targets || []).map(renderTargetRow).join("") + "</ol>" +
      "</section>" +
      '<section class="dashboard-section"><p class="eyebrow">Audit receipts</p>' +
      "<h2>Proof receipts.</h2>" +
      renderReceipts(receipts) +
      "</section>" +
      '<p class="dashboard-meta">Generated ' + escapeHtml(dateText(data.generated_unix)) + "</p>" +
      "</div>"
    );
  }

  function acceptedDetails(accepted) {
    if (!accepted) {
      return "";
    }
    return (
      "<div><dt>Accepted</dt><dd>" + escapeHtml(dateText(accepted.accepted_unix)) + "</dd></div>" +
      "<div><dt>Solver</dt><dd><code>" + escapeHtml(accepted.solver_hotkey || "unknown") + "</code></dd></div>" +
      (accepted.solver_uid == null ? "" : "<div><dt>UID</dt><dd>" + escapeHtml(accepted.solver_uid) + "</dd></div>")
    );
  }

  function renderBounty(bounty, stateNote) {
    var accepted = bounty.accepted || null;
    var title = escapeHtml(bounty.title || bounty.id || "Current bounty");
    var href = bounty.source_url ? ' href="' + escapeHtml(bounty.source_url) + '"' : "";
    var note = stateNote ? '<p class="bounty-note">' + escapeHtml(stateNote) + "</p>" : "";
    var sourceName = bounty.upstream_repo === "google-deepmind/formal-conjectures"
      ? "Google DeepMind Formal Conjectures"
      : (bounty.upstream_repo || "source pending");
    return (
      '<article class="bounty-card is-' + escapeHtml(bounty.status || "planned") + '">' +
      '<div class="bounty-card-head">' +
      '<div><p class="eyebrow">Current bounty</p><h2>' +
      (href ? "<a" + href + ">" + title + "</a>" : title) +
      "</h2></div>" +
      '<strong class="reward-pill">' + escapeHtml(bounty.reward_label || "Reward TBD") + "</strong>" +
      "</div>" +
      note +
      '<p class="source-credit bounty-source">Source: <a href="https://google-deepmind.github.io/formal-conjectures/" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(sourceName) +
      "</a>. Lemma is not affiliated with Google DeepMind.</p>" +
      '<dl class="record-facts bounty-facts">' +
      "<div><dt>Status</dt><dd>" + escapeHtml(bounty.status || "planned") + "</dd></div>" +
      "<div><dt>Declaration</dt><dd><code>" + escapeHtml(bounty.declaration || "pending") + "</code></dd></div>" +
      "<div><dt>Lean file</dt><dd>" + escapeHtml(bounty.lean_file || "pending") + "</dd></div>" +
      acceptedDetails(accepted) +
      "</dl>" +
      "</article>"
    );
  }

  function currentBounty(campaigns) {
    var open = campaigns.filter(function (bounty) { return bounty.status === "open"; });
    if (open.length) {
      return { bounty: open[0], note: "" };
    }
    var accepted = campaigns.filter(function (bounty) { return bounty.accepted || bounty.status === "accepted"; });
    if (accepted.length) {
      return { bounty: accepted[0], note: "Bounty solved, awaiting next bounty." };
    }
    return campaigns.length ? { bounty: campaigns[0], note: "No bounty is open yet." } : null;
  }

  function renderCurrentBounty(data) {
    if (!data || data.schema_version !== 1) {
      throw new Error("unsupported bounty schema");
    }
    var campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
    var selected = currentBounty(campaigns);
    return (
      '<div class="task-feed">' +
      '<section class="dashboard-section bounty-focus"><p class="eyebrow">Bounty</p>' +
      (selected
        ? renderBounty(selected.bounty, selected.note)
        : '<div class="empty-panel"><h2>No bounty posted yet.</h2><p class="muted">The next focused campaign will appear here when it opens.</p></div>') +
      "</section>" +
      '<p class="dashboard-meta">Generated ' + escapeHtml(dateText(data.generated_unix)) + "</p>" +
      "</div>"
    );
  }

  function renderBounties(data) {
    if (!data || data.schema_version !== 1) {
      throw new Error("unsupported bounty schema");
    }
    return renderCurrentBounty(data);
  }

  function renderDashboard(cadenceData, bountyData) {
    return (
      '<div class="dashboard-stack miner-board-stack">' +
      renderCadence(cadenceData) +
      '<section class="bounty-secondary" aria-labelledby="bounty-title"><p class="eyebrow">Bounty</p>' +
      '<h2 id="bounty-title">One focused campaign.</h2>' +
      '<p class="dashboard-meta">Bounty work is open to anyone; no subnet UID is required.</p>' +
      renderCurrentBounty(bountyData) +
      "</section>" +
      "</div>"
    );
  }

  function fetchJson(url, etag) {
    var headers = etag ? { "If-None-Match": etag } : {};
    return root.fetch(url, { cache: "no-cache", headers: headers }).then(function (response) {
      if (response.status === 304) {
        return null;
      }
      if (!response.ok) {
        throw new Error(url + " unavailable");
      }
      return response.json().then(function (data) {
        return { data: data, etag: response.headers.get("ETag") || "" };
      });
    });
  }

  function mountFeed(id, render) {
    var el = root.document && root.document.getElementById(id);
    if (!el || typeof root.fetch !== "function") {
      return;
    }
    var fallbackUrl = el.getAttribute("data-fallback-url");
    var liveUrl = el.getAttribute("data-live-url");
    var etag = "";

    function paint(result) {
      if (!result) {
        return;
      }
      etag = result.etag || etag;
      el.innerHTML = render(result.data);
    }

    fetchJson(fallbackUrl).then(paint).catch(function (error) {
      el.innerHTML = '<p class="muted">Task data unavailable: ' + escapeHtml(error.message) + "</p>";
    });

    function refreshLive() {
      if (!liveUrl) {
        return;
      }
      fetchJson(liveUrl, etag).then(paint).catch(function () {});
    }

    refreshLive();
    root.setInterval(refreshLive, pollMs);
  }

  function mountDashboard(id) {
    var el = root.document && root.document.getElementById(id);
    if (!el || typeof root.fetch !== "function") {
      return;
    }
    var cadenceFallbackUrl = el.getAttribute("data-cadence-fallback-url");
    var cadenceLiveUrl = el.getAttribute("data-cadence-live-url");
    var bountyFallbackUrl = el.getAttribute("data-bounty-fallback-url");
    var bountyLiveUrl = el.getAttribute("data-bounty-live-url");
    var cadenceEtag = "";
    var bountyEtag = "";
    var cadenceData = null;
    var bountyData = null;

    function paint() {
      if (cadenceData && bountyData) {
        el.innerHTML = renderDashboard(cadenceData, bountyData);
      }
    }

    Promise.all([fetchJson(cadenceFallbackUrl), fetchJson(bountyFallbackUrl)])
      .then(function (results) {
        cadenceData = results[0].data;
        bountyData = results[1].data;
        cadenceEtag = results[0].etag || "";
        bountyEtag = results[1].etag || "";
        paint();
        refreshLive();
      })
      .catch(function (error) {
        el.innerHTML = '<p class="muted">Dashboard data unavailable: ' + escapeHtml(error.message) + "</p>";
      });

    function refreshLive() {
      var cadencePromise = cadenceLiveUrl ? fetchJson(cadenceLiveUrl, cadenceEtag).catch(function () { return null; }) : Promise.resolve(null);
      var bountyPromise = bountyLiveUrl ? fetchJson(bountyLiveUrl, bountyEtag).catch(function () { return null; }) : Promise.resolve(null);
      Promise.all([cadencePromise, bountyPromise]).then(function (results) {
        var changed = false;
        if (results[0]) {
          cadenceData = results[0].data;
          cadenceEtag = results[0].etag || cadenceEtag;
          changed = true;
        }
        if (results[1]) {
          bountyData = results[1].data;
          bountyEtag = results[1].etag || bountyEtag;
          changed = true;
        }
        if (changed) {
          paint();
        }
      });
    }

    root.setInterval(refreshLive, pollMs);
  }

  var api = {
    renderBounties: renderBounties,
    renderCadence: renderCadence,
    renderCurrentBounty: renderCurrentBounty,
    renderDashboard: renderDashboard,
  };
  root.LemmaTasks = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root.document) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", function () {
        mountFeed("cadence-board", renderCadence);
        mountFeed("bounty-board", renderBounties);
        mountDashboard("dashboard-board");
      });
    } else {
      mountFeed("cadence-board", renderCadence);
      mountFeed("bounty-board", renderBounties);
      mountDashboard("dashboard-board");
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
