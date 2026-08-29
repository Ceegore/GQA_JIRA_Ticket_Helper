/*
 * GQA JIRA dropdown relationship probe — DEVELOPMENT ONLY.
 * Do NOT add to manifest.json.
 *
 * Manually open exactly ONE Jira dropdown/person-picker first, then run this
 * script in Firefox DevTools Console. Option text can contain internal names;
 * keep the downloaded report inside approved company systems.
 */
(() => {
  "use strict";

  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const visible = (el) => {
    if (!(el instanceof Element) || !el.isConnected) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" &&
      Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
  };
  const attrs = (el) => ({
    tag: el.tagName,
    id: el.id || "",
    role: el.getAttribute("role") || "",
    ariaLabel: el.getAttribute("aria-label") || "",
    ariaControls: el.getAttribute("aria-controls") || "",
    ariaOwns: el.getAttribute("aria-owns") || "",
    ariaExpanded: el.getAttribute("aria-expanded") || "",
    dataTestId: el.getAttribute("data-testid") || ""
  });

  const controlSelector = [
    '[role="combobox"]',
    '[aria-haspopup="listbox"]',
    'select'
  ].join(",");
  const controls = [...document.querySelectorAll(controlSelector)]
    .filter(visible)
    .filter((el) => el.getAttribute("aria-expanded") === "true" ||
      el.getAttribute("aria-controls") || el.getAttribute("aria-owns"))
    .map((el, index) => ({ index, ...attrs(el) }));

  const optionSelector = [
    '[role="option"]',
    '[role="menuitemradio"]',
    '[role="menuitemcheckbox"]'
  ].join(",");
  const options = [...document.querySelectorAll(optionSelector)]
    .filter(visible)
    .map((el, index) => {
      const root = el.closest('[role="listbox"], [role="menu"]') || el.parentElement;
      return {
        index,
        tag: el.tagName,
        role: el.getAttribute("role") || "",
        text: normalize(el.innerText || el.textContent),
        id: el.id || "",
        ariaLabel: el.getAttribute("aria-label") || "",
        ariaSelected: el.getAttribute("aria-selected") || "",
        ariaChecked: el.getAttribute("aria-checked") || "",
        ariaDisabled: el.getAttribute("aria-disabled") || "",
        dataTestId: el.getAttribute("data-testid") || "",
        popupRootTag: root?.tagName || "",
        popupRootId: root?.id || "",
        popupRootRole: root?.getAttribute("role") || "",
        popupRootDataTestId: root?.getAttribute("data-testid") || ""
      };
    });

  const report = {
    tool: "GQA JIRA dropdown relationship probe",
    capturedAt: new Date().toISOString(),
    pageOrigin: location.origin,
    pagePath: location.pathname,
    expandedOrLinkedControls: controls,
    visibleOptions: options,
    interpretation: {
      expectedOpenDropdownCount: 1,
      rule: "Prefer aria-controls/aria-owns. Otherwise prove that opening the intended control creates one unique popup root. Never select from unrelated global options."
    }
  };

  globalThis.__GQA_DROPDOWN_REPORT = report;
  console.table(controls);
  console.table(options);
  console.log("GQA dropdown report object is available as window.__GQA_DROPDOWN_REPORT.");

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gqa-jira-dropdown-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.documentElement.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
})();
