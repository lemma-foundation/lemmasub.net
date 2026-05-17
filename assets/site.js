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
    "fetch target registry",
    "pin Lean and mathlib toolchain",
    "check Submission.lean",
    "result: verified",
  ];
  let index = 0;

  window.setInterval(() => {
    index = (index + 1) % lines.length;
    terminalLine.textContent = lines[index];
  }, 1700);
}
