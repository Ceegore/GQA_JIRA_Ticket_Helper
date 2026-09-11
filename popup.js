"use strict";

const pasteButton = document.getElementById("pasteButton");
const diagnoseButton = document.getElementById("diagnoseButton");
const statusElement = document.getElementById("status");
const reportElement = document.getElementById("report");

const UNREACHABLE_TEXT =
  "Cannot reach the Jira helper on this page. Open the configured Jira tenant and a PERMAQA Bug creation dialog, then try again.";

// Field keys and reason codes only; ticket values never reach the status line.
const REASON_TEXT = Object.freeze({
  "control-not-found": "field not found on this form",
  "control-not-mounted": "row found but its input did not open",
  "control-unavailable": "control is disabled or read-only",
  "not-filled": "value could not be applied",
  "not-confirmed": "value was not kept after editing",
  "partial-values": "only some values applied",
  "too-many-values": "more values than allowed",
  "invalid-date": "date must be YYYY-MM-DD",
  "invalid-number": "must be a non-negative number",
  "dialog-lost": "dialog was gone",
  "unsupported-adapter": "unsupported field type",
  "unknown-field": "unknown field",
  error: "unexpected error"
});

// Reasons that describe the ticket rather than the page: nothing to show.
const SILENT_REASONS = new Set(["empty", "not-true"]);

function setStatus(text) {
  statusElement.textContent = text;
}

function showReport(text) {
  reportElement.value = text;
  reportElement.hidden = false;
}

function hideReport() {
  reportElement.value = "";
  reportElement.hidden = true;
}

function describeField(field) {
  const reason = REASON_TEXT[field.reason] || String(field.reason || "skipped");
  if (field.reason === "partial-values" && field.requested) {
    return `${field.key}: ${field.selected} of ${field.requested} values applied`;
  }
  return `${field.key}: ${reason}`;
}

function formatResult(result) {
  if (!result || result.ok !== true) {
    return result?.error || "Paste failed.";
  }

  const filled = Number(result.filled || 0);
  const partial = Number(result.partial || 0);
  const skipped = Number(result.skipped || 0);

  // Partly filled fields are reported separately. A multi-value field that
  // received only some of its values must never look like a complete field,
  // because the tester reviews the form before creating the issue.
  const partialText = partial > 0 ? `, ${partial} partly filled` : "";
  const suffix = result.stopped === "dialog-lost"
    ? " The dialog was no longer available; processing stopped safely."
    : "";

  const summary = `Done: ${filled} filled${partialText}, ${skipped} skipped.${suffix}`;

  // A field that had a value but did not land is named with its reason, so a
  // tester can see what to complete by hand instead of guessing.
  const problems = Array.isArray(result.fields)
    ? result.fields.filter(
        (field) =>
          field &&
          typeof field.key === "string" &&
          field.status !== "filled" &&
          !SILENT_REASONS.has(field.reason)
      )
    : [];

  if (problems.length === 0) return summary;
  return `${summary}\nNot applied:\n${problems.map(describeField).join("\n")}`;
}

async function readTicketFromClipboard() {
  let rawText;
  try {
    rawText = await navigator.clipboard.readText();
  } catch {
    // Distinguishing this from a messaging failure matters: the two problems
    // have completely different fixes for the tester.
    console.error("[GQA JIRA Helper] clipboard read failed");
    return {
      ok: false,
      error: "Could not read the clipboard. Copy the ticket JSON again, then retry."
    };
  }

  return GQAShared.parseClipboardTicket(
    rawText,
    GQA_CONFIG.SCHEMA_VERSION,
    GQA_CONFIG.MAX_CLIPBOARD_BYTES
  );
}

async function findActiveTab() {
  let activeTab;
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    activeTab = tabs[0];
  } catch {
    console.error("[GQA JIRA Helper] active tab lookup failed");
    return { ok: false, error: "Could not determine the active browser tab." };
  }

  if (!activeTab || typeof activeTab.id !== "number") {
    return { ok: false, error: "No active browser tab found." };
  }
  return { ok: true, tabId: activeTab.id };
}

async function sendToHelper(tabId, message) {
  try {
    return { ok: true, result: await browser.tabs.sendMessage(tabId, message) };
  } catch {
    console.error("[GQA JIRA Helper] content script is not reachable");
    return { ok: false, error: UNREACHABLE_TEXT };
  }
}

function setBusy(busy) {
  pasteButton.disabled = busy;
  diagnoseButton.disabled = busy;
}

pasteButton.addEventListener("click", async () => {
  setBusy(true);
  hideReport();
  setStatus("Reading clipboard...");

  try {
    const parsed = await readTicketFromClipboard();
    if (!parsed.ok) {
      setStatus(parsed.error);
      return;
    }

    const tab = await findActiveTab();
    if (!tab.ok) {
      setStatus(tab.error);
      return;
    }

    setStatus("Filling supported fields...");

    const response = await sendToHelper(tab.tabId, {
      type: "GQA_PASTE_TICKET",
      ticket: parsed.ticket
    });
    if (!response.ok) {
      setStatus(response.error);
      return;
    }

    setStatus(formatResult(response.result));
  } catch {
    console.error("[GQA JIRA Helper] popup operation failed");
    setStatus("The helper could not complete this paste. Nothing was submitted.");
  } finally {
    setBusy(false);
  }
});

diagnoseButton.addEventListener("click", async () => {
  setBusy(true);
  hideReport();
  setStatus("Inspecting the page...");

  try {
    const tab = await findActiveTab();
    if (!tab.ok) {
      setStatus(tab.error);
      return;
    }

    const response = await sendToHelper(tab.tabId, { type: "GQA_DIAGNOSE" });
    if (!response.ok) {
      setStatus(response.error);
      return;
    }

    const report = response.result;
    if (!report || report.ok !== true) {
      setStatus(report?.error || "Diagnosis failed.");
      return;
    }

    // The report names labels and control attributes only, never values.
    showReport(JSON.stringify(report, null, 2));
    setStatus(
      report.dialogFound
        ? "Diagnosis ready. Copy the text below when reporting a field problem."
        : "No unique PERMAQA Bug dialog was recognised. The report below shows every visible dialog and which guard checks failed."
    );
  } catch {
    console.error("[GQA JIRA Helper] popup diagnosis failed");
    setStatus("The helper could not inspect this page.");
  } finally {
    setBusy(false);
  }
});
