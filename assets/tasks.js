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
      '<small class="muted">' + escapeHtml(task.status || "queued") + "</small>" +
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
      '<small class="muted">' + escapeHtml(meta) + "</small>" +
      "</li>"
    );
  }

  function renderCadence(data) {
    if (!data || data.schema_version !== 4) {
      throw new Error("unsupported cadence schema");
    }
    var counts = data.counts || {};
    var current = data.active_target || (data.target_window && data.target_window.current);
    var currentId = current && current.id ? String(current.id) : "";
    var changed = lastCadenceId && currentId && currentId !== lastCadenceId;
    lastCadenceId = currentId || lastCadenceId;
    var updateClass = changed ? " is-updated" : "";
    var activeHtml = current
      ? (
        "<h2>" + renderTaskLink(current) + "</h2>" +
        '<p class="dashboard-meta">' + escapeHtml(current.source_lane || "cadence") + "</p>" +
        "<pre><code>" + escapeHtml(current.challenge_source || "") + "</code></pre>"
      )
      : "<h2>All listed cadence tasks are solved.</h2>";
    return (
      '<div class="task-feed' + updateClass + '">' +
      '<div class="stats-grid">' +
      renderStat("Total", counts.total_targets || 0) +
      renderStat("Solved", counts.solved_targets || 0) +
      renderStat("Remaining", counts.remaining_targets || 0) +
      renderStat("Current solvers", counts.current_solver_count || 0) +
      "</div>" +
      '<section class="dashboard-section"><p class="eyebrow">Theorem window</p>' +
      '<h2>Previous, current, next.</h2><div class="theorem-window">' +
      renderWindowSlot("Previous", data.target_window && data.target_window.previous) +
      renderWindowSlot("Current", data.target_window && data.target_window.current) +
      renderWindowSlot("Next", data.target_window && data.target_window.next) +
      "</div></section>" +
      '<section class="dashboard-section"><p class="eyebrow">Current cadence task</p>' +
      activeHtml +
      "</section>" +
      '<section class="dashboard-section"><p class="eyebrow">Latest accepted solver set</p>' +
      "<h2>Verified hotkeys.</h2>" +
      renderSolvers(data.current_solver_set) +
      "</section>" +
      '<section class="dashboard-section"><p class="eyebrow">Ordered target state</p>' +
      "<h2>Task links.</h2>" +
      '<ol class="target-list">' + (data.targets || []).map(renderTargetRow).join("") + "</ol>" +
      "</section>" +
      '<p class="dashboard-meta">Generated ' + escapeHtml(dateText(data.generated_unix)) + "</p>" +
      "</div>"
    );
  }

  function renderBounty(bounty) {
    var accepted = bounty.accepted || null;
    var acceptedHtml = accepted
      ? (
        "<div><dt>Accepted</dt><dd>" + escapeHtml(dateText(accepted.accepted_unix)) + "</dd></div>" +
        "<div><dt>Solver</dt><dd><code>" + escapeHtml(accepted.solver_hotkey || "unknown") + "</code></dd></div>" +
        (accepted.solver_uid == null ? "" : "<div><dt>UID</dt><dd>" + escapeHtml(accepted.solver_uid) + "</dd></div>")
      )
      : "";
    return (
      '<li class="bounty-row is-' + escapeHtml(bounty.status || "planned") + '">' +
      '<div class="record-id"><strong>' + escapeHtml(bounty.reward_label || "Reward TBD") + "</strong>" +
      '<span class="badge">' + escapeHtml(bounty.status || "planned") + "</span></div>" +
      '<div class="record-title"><span>Task</span>' +
      '<a href="' + escapeHtml(bounty.source_url || "#") + '">' + escapeHtml(bounty.title || bounty.id) + "</a>" +
      "</div>" +
      '<dl class="record-facts">' +
      "<div><dt>Declaration</dt><dd><code>" + escapeHtml(bounty.declaration || "pending") + "</code></dd></div>" +
      "<div><dt>Source</dt><dd>" + escapeHtml(bounty.lean_file || "pending") + "</dd></div>" +
      acceptedHtml +
      "</dl>" +
      "</li>"
    );
  }

  function renderBounties(data) {
    if (!data || data.schema_version !== 1) {
      throw new Error("unsupported bounty schema");
    }
    var campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
    return (
      '<div class="task-feed">' +
      '<div class="stats-grid">' +
      renderStat("Listed", campaigns.length) +
      renderStat("Open", campaigns.filter(function (c) { return c.status === "open"; }).length) +
      renderStat("Reward mode", "WTA") +
      renderStat("UID needed", "No") +
      "</div>" +
      '<section class="dashboard-section"><p class="eyebrow">Formal Conjectures bounties</p>' +
      "<h2>Selected tasks.</h2>" +
      (campaigns.length
        ? '<ol class="bounty-list">' + campaigns.map(renderBounty).join("") + "</ol>"
        : '<p class="muted">No bounty campaign is open yet.</p>') +
      "</section>" +
      '<p class="dashboard-meta">Generated ' + escapeHtml(dateText(data.generated_unix)) + "</p>" +
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

  var api = { renderBounties: renderBounties, renderCadence: renderCadence };
  root.LemmaTasks = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root.document) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", function () {
        mountFeed("cadence-board", renderCadence);
        mountFeed("bounty-board", renderBounties);
      });
    } else {
      mountFeed("cadence-board", renderCadence);
      mountFeed("bounty-board", renderBounties);
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
