const storageKey = "lemma-theme";
const root = document.documentElement;
const toggle = document.querySelector("[data-theme-toggle]");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const termTriggers = document.querySelectorAll("[data-definition]");
const termPopover = document.querySelector("[data-term-popover]");
let activeTerm;

function chosenTheme() {
  return localStorage.getItem(storageKey) || "light";
}

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem(storageKey, theme);
  if (themeMeta) {
    themeMeta.setAttribute("content", theme === "dark" ? "#101712" : "#f7faf8");
  }
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
    toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
}

setTheme(chosenTheme());

if (toggle) {
  toggle.addEventListener("click", () => {
    setTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });
}

function closeTerm() {
  if (activeTerm) {
    activeTerm.setAttribute("aria-expanded", "false");
    activeTerm = undefined;
  }
  if (termPopover) {
    termPopover.hidden = true;
    termPopover.textContent = "";
  }
}

function positionTermPopover(trigger) {
  if (!termPopover) {
    return;
  }
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  termPopover.hidden = false;
  const popoverRect = termPopover.getBoundingClientRect();
  const left = Math.min(
    Math.max(16, rect.left),
    window.innerWidth - popoverRect.width - 16,
  );
  let top = rect.bottom + gap;
  if (top + popoverRect.height > window.innerHeight - 16) {
    top = rect.top - popoverRect.height - gap;
  }
  termPopover.style.left = `${left}px`;
  termPopover.style.top = `${Math.max(16, top)}px`;
}

termTriggers.forEach((trigger) => {
  trigger.setAttribute("aria-expanded", "false");
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!termPopover || activeTerm === trigger) {
      closeTerm();
      return;
    }
    closeTerm();
    activeTerm = trigger;
    termPopover.textContent = trigger.dataset.definition || "";
    trigger.setAttribute("aria-expanded", "true");
    positionTermPopover(trigger);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeTerm();
  }
});

document.addEventListener("click", closeTerm);
window.addEventListener("resize", closeTerm);
window.addEventListener("scroll", closeTerm, { passive: true });
