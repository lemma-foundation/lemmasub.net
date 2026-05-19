const storageKey = "lemma-theme";
const root = document.documentElement;
const toggle = document.querySelector("[data-theme-toggle]");
const themeMeta = document.querySelector('meta[name="theme-color"]');

function chosenTheme() {
  return localStorage.getItem(storageKey) || "light";
}

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem(storageKey, theme);
  themeMeta.setAttribute("content", theme === "dark" ? "#101712" : "#f7faf8");
  toggle.setAttribute("aria-pressed", String(theme === "dark"));
  toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
}

setTheme(chosenTheme());

toggle.addEventListener("click", () => {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
});
