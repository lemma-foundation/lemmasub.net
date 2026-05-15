(function () {
  "use strict";

  function codeText(button) {
    const panel = button.closest(".code-panel");
    const code = panel && panel.querySelector("code");
    return code ? code.textContent : "";
  }

  async function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.inset = "0 auto auto 0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-code]");
    if (!button) {
      return;
    }

    const label = button.querySelector(".copy-status");
    const original = label ? label.textContent : button.textContent;
    button.disabled = true;

    try {
      await copy(codeText(button));
      if (label) {
        label.textContent = "Copied";
      } else {
        button.textContent = "Copied";
      }
    } catch (_error) {
      if (label) {
        label.textContent = "Copy failed";
      } else {
        button.textContent = "Copy failed";
      }
    } finally {
      window.setTimeout(() => {
        button.disabled = false;
        if (label) {
          label.textContent = original;
        } else {
          button.textContent = original;
        }
      }, 1400);
    }
  });
})();
