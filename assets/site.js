document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  initializeInfoTips();
});

function initializeTheme() {
  const stored = storedTheme();
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  setTheme(stored || preferred);

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      storeTheme(next);
      setTheme(next);
    });
  });
}

function storedTheme() {
  try {
    return localStorage.getItem("lemma-theme");
  } catch {
    return "";
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem("lemma-theme", theme);
  } catch {
    // Theme still changes for the current page even when persistence is unavailable.
  }
}

function setTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = normalized;
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.textContent = normalized === "dark" ? "Light" : "Dark";
    button.setAttribute("aria-pressed", normalized === "dark" ? "true" : "false");
  });
}

function initializeInfoTips() {
  document.querySelectorAll(".info-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const tip = button.closest(".info-tip");
      const open = !tip?.classList.contains("is-open");
      closeInfoTips();
      if (tip && open) {
        tip.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("click", closeInfoTips);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInfoTips();
    }
  });
}

function closeInfoTips() {
  document.querySelectorAll(".info-tip.is-open").forEach((tip) => {
    tip.classList.remove("is-open");
    tip.querySelector(".info-button")?.setAttribute("aria-expanded", "false");
  });
}
