/*
 * GQA JIRA dialog-guard evidence probe — DEVELOPMENT ONLY.
 * Do NOT add to manifest.json.
 *
 * Run with the intended blank PERMAQA Bug create dialog open. The report helps
 * prove stable selectors for the dialog, project token, issue-type token and
 * Create button without guessing from screenshots.
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
  const structure = (el) => ({
    tag: el.tagName,
    text: normalize(el.innerText || el.textContent),
    id: el.id || "",
    role: el.getAttribute("role") || "",
    ariaLabel: el.getAttribute("aria-label") || "",
    ariaLabelledBy: el.getAttribute("aria-labelledby") || "",
    dataTestId: el.getAttribute("data-testid") || "",
    type: el.getAttribute("type") || ""
  });

  const dialogs = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')]
    .filter(visible)
    .map((dialog, dialogIndex) => {
      const rect = dialog.getBoundingClientRect();
      const lowerBoundary = rect.top + Math.min(240, Math.max(120, rect.height * 0.3));
      const upperCompactCandidates = [...dialog.querySelectorAll(
        "h1,h2,h3,h4,h5,h6,[role='heading'],label,legend,button,span,p,div,[aria-label],[aria-labelledby]"
      )]
        .filter(visible)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.top < lowerBoundary && r.bottom > rect.top &&
            r.height <= 100 && r.width <= 800 &&
            normalize(el.innerText || el.textContent).length <= 120;
        })
        .map(structure);
      const createCandidates = [...dialog.querySelectorAll(
        "button,input[type='submit'],input[type='button'],[role='button']"
      )].filter(visible).map(structure);

      return {
        dialogIndex,
        dialog: structure(dialog),
        dimensions: { width: rect.width, height: rect.height },
        upperCompactCandidates,
        createCandidates
      };
    });

  const report = {
    tool: "GQA JIRA dialog-guard evidence probe",
    capturedAt: new Date().toISOString(),
    pageOrigin: location.origin,
    pagePath: location.pathname,
    visibleDialogs: dialogs,
    requiredEvidence: {
      uniqueDialog: "Exactly one intended create dialog",
      projectToken: "One exact compact PERMAQA element in the dialog header area",
      issueTypeToken: "One exact compact Bug element in the dialog header area",
      createButton: "One exact Create or Erstellen action element; it is evidence only and must never be clicked by the extension"
    }
  };

  globalThis.__GQA_DIALOG_GUARD_REPORT = report;
  console.log("GQA dialog-guard report object is available as window.__GQA_DIALOG_GUARD_REPORT.", report);

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gqa-jira-dialog-guard-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.documentElement.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
})();
