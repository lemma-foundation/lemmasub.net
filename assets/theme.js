(function () {
  "use strict";

  var key = "lemma-theme";
  var root = document.documentElement;
  var saved = localStorage.getItem(key);

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
})();
