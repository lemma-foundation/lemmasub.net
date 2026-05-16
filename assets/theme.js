(function () {
  "use strict";

  var key = "lemma-theme";
  var root = document.documentElement;
  var saved = localStorage.getItem(key);
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.classList.add("js");

  function currentTheme() {
    return saved === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    document.querySelectorAll(".theme-toggle").forEach(function (button) {
      button.setAttribute("aria-label", "Use " + (theme === "dark" ? "light" : "dark") + " mode");
      button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    });
  }

  function toggleTheme() {
    saved = currentTheme() === "dark" ? "light" : "dark";
    localStorage.setItem(key, saved);
    applyTheme(saved);
  }

  applyTheme(currentTheme());
  document.querySelectorAll(".theme-toggle").forEach(function (button) {
    button.addEventListener("click", toggleTheme);
  });

  function showReveals() {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  if (reduceMotion || !("IntersectionObserver" in window)) {
    showReveals();
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 });
    document.querySelectorAll(".reveal").forEach(function (el) {
      observer.observe(el);
    });
  }

  document.querySelectorAll('a[href^="/"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (reduceMotion || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      var url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) {
        return;
      }
      event.preventDefault();
      document.body.classList.add("is-leaving");
      window.setTimeout(function () {
        window.location.href = url.href;
      }, 150);
    });
  });
})();
