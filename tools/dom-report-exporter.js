/*
 * GQA JIRA DOM structural report exporter — DEVELOPMENT ONLY.
 * Do NOT add to manifest.json.
 *
 * Run in Firefox DevTools Console while the blank PERMAQA Bug create dialog is open.
 * Produces a local JSON download only; no network request is made.
 */
(() => {
  "use strict";

  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const visible = (el) => {
    if (!(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
  };

  const dialogs = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')].filter(visible);
  const dialog = dialogs.find((d) => /PERMAQA/i.test(d.innerText || "") && /\bBug\b/i.test(d.innerText || ""));

  if (!dialog) {
    console.error("GQA DOM exporter: no visible PERMAQA Bug dialog found.");
    return;
  }

  const controlSelector = [
    "input",
    "textarea",
    "select",
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="checkbox"]',
    '[aria-haspopup="listbox"]'
  ].join(",");

  const safeAttr = (el, name) => el.getAttribute(name) || "";
  const labelledText = (el) => String(safeAttr(el, "aria-labelledby"))
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id))
    .filter(Boolean)
    .map((node) => normalize(node.innerText || node.textContent))
    .join(" ");

  const labelForText = (el) => {
    if (!el.id) return "";
    try {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      return normalize(label?.innerText || label?.textContent);
    } catch {
      return "";
    }
  };

  const controls = [...dialog.querySelectorAll(controlSelector)]
    .filter(visible)
    .map((el, index) => ({
      index,
      tag: el.tagName,
      type: safeAttr(el, "type"),
      id: el.id || "",
      name: safeAttr(el, "name"),
      role: safeAttr(el, "role"),
      ariaLabel: safeAttr(el, "aria-label"),
      ariaLabelledBy: safeAttr(el, "aria-labelledby"),
      labelledText: labelledText(el),
      labelForText: labelForText(el),
      placeholder: safeAttr(el, "placeholder"),
      dataTestId: safeAttr(el, "data-testid"),
      ariaHasPopup: safeAttr(el, "aria-haspopup"),
      ariaExpanded: safeAttr(el, "aria-expanded"),
      ariaChecked: safeAttr(el, "aria-checked"),
      contentEditable: safeAttr(el, "contenteditable"),
      disabled: Boolean(el.disabled) || safeAttr(el, "aria-disabled") === "true"
    }));

  const buttons = [...dialog.querySelectorAll("button")]
    .filter(visible)
    .map((el, index) => ({
      index,
      text: normalize(el.innerText || el.textContent),
      id: el.id || "",
      ariaLabel: safeAttr(el, "aria-label"),
      dataTestId: safeAttr(el, "data-testid"),
      type: safeAttr(el, "type")
    }));

  const report = {
    tool: "GQA JIRA DOM structural report exporter",
    capturedAt: new Date().toISOString(),
    pageOrigin: location.origin,
    pagePath: location.pathname,
    dialog: {
      role: safeAttr(dialog, "role"),
      ariaModal: safeAttr(dialog, "aria-modal"),
      ariaLabel: safeAttr(dialog, "aria-label"),
      ariaLabelledBy: safeAttr(dialog, "aria-labelledby"),
      dataTestId: safeAttr(dialog, "data-testid")
    },
    controls,
    buttons
  };

  globalThis.__GQA_DOM_REPORT = report;
  console.table(controls);
  console.log("GQA DOM report object available as window.__GQA_DOM_REPORT", report);

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gqa-jira-dom-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.documentElement.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
})();
