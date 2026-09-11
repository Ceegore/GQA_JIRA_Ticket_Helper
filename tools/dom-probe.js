/*
 * GQA JIRA DOM probe
 *
 * DEVELOPMENT ONLY. Do NOT add this file to manifest.json.
 * Run on a blank PERMAQA Bug create dialog and treat output as internal data.
 */

(() => {
  "use strict";

  // Opacity is deliberately not a filter here: transparent-but-rendered
  // inputs (react-select search box, Atlaskit checkbox) are real controls.
  const visible = (el) => {
    if (!(el instanceof Element) || !el.isConnected) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" &&
      rect.width > 0 && rect.height > 0;
  };

  const exact = (a, b) => String(a || "").replace(/\s+/g, " ").trim().toLowerCase() ===
    String(b || "").replace(/\s+/g, " ").trim().toLowerCase();

  const dialogs = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')]
    .filter(visible);
  const matching = dialogs.filter((dialog) => {
    const texts = [...dialog.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading'],span,p,div,button")]
      .filter(visible)
      .map((el) => el.innerText || el.textContent || "");
    return texts.some((text) => exact(text, "PERMAQA")) &&
      texts.some((text) => exact(text, "Bug"));
  });

  if (matching.length !== 1) {
    console.error(`GQA probe: expected one exact PERMAQA Bug dialog, found ${matching.length}.`);
    return;
  }
  const dialog = matching[0];

  const selector = [
    "input",
    "textarea",
    "select",
    '[contenteditable]:not([contenteditable="false"])',
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="checkbox"]',
    '[aria-haspopup="listbox"]'
  ].join(",");

  const rows = [...dialog.querySelectorAll(selector)]
    .filter(visible)
    .map((el, index) => {
      const labelledIds = String(el.getAttribute("aria-labelledby") || "")
        .split(/\s+/)
        .filter(Boolean);
      const labelledText = labelledIds
        .map((id) => document.getElementById(id)?.innerText || document.getElementById(id)?.textContent || "")
        .join(" ")
        .trim();
      const labelFor = el.id
        ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
        : null;
      const hasNonBlankValue = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        ? el.value.trim().length > 0
        : false;

      return {
        index,
        tag: el.tagName,
        type: el.getAttribute("type") || "",
        id: el.id || "",
        name: el.getAttribute("name") || "",
        role: el.getAttribute("role") || "",
        ariaLabel: el.getAttribute("aria-label") || "",
        ariaLabelledBy: el.getAttribute("aria-labelledby") || "",
        labelledText,
        placeholder: el.getAttribute("placeholder") || "",
        dataTestId: el.getAttribute("data-testid") || "",
        contentEditable: el.getAttribute("contenteditable") || "",
        ariaControls: el.getAttribute("aria-controls") || "",
        ariaOwns: el.getAttribute("aria-owns") || "",
        ariaExpanded: el.getAttribute("aria-expanded") || "",
        disabled: Boolean(el.disabled) || el.getAttribute("aria-disabled") === "true",
        readOnly: Boolean(el.readOnly) || el.getAttribute("aria-readonly") === "true",
        labelForText: labelFor?.innerText || labelFor?.textContent || "",
        hasNonBlankValue
      };
    });

  globalThis.__GQA_DOM_PROBE_ROWS = rows;
  console.table(rows);
  console.log("GQA probe rows are available as window.__GQA_DOM_PROBE_ROWS.");
})();
