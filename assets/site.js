const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion) {
  document.documentElement.classList.add("reduced-motion");
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 },
  );

  document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
}

const terminalLine = document.querySelector("[data-terminal-line]");

if (terminalLine && !reduceMotion) {
  const lines = [
    "open Lean theorem becomes active bounty",
    "miner submits proof",
    "validators check with Lean",
    "solver can claim bounty",
    "prepare upstream pull request",
  ];
  let index = 0;

  window.setInterval(() => {
    index = (index + 1) % lines.length;
    terminalLine.textContent = lines[index];
  }, 1700);
}
