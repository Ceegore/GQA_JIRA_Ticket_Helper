"use strict";

const pasteButton = document.getElementById("pasteButton");
const statusElement = document.getElementById("status");

function setStatus(text) {
  statusElement.textContent = text;
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

  return `Done: ${filled} filled${partialText}, ${skipped} skipped.${suffix}`;
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

pasteButton.addEventListener("click", async () => {
  pasteButton.disabled = true;
  setStatus("Reading clipboard...");

  try {
    const parsed = await readTicketFromClipboard();
    if (!parsed.ok) {
      setStatus(parsed.error);
      return;
    }

    let activeTab;
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      activeTab = tabs[0];
    } catch {
      console.error("[GQA JIRA Helper] active tab lookup failed");
      setStatus("Could not determine the active browser tab.");
      return;
    }

    if (!activeTab || typeof activeTab.id !== "number") {
      setStatus("No active browser tab found.");
      return;
    }

    setStatus("Filling supported fields...");

    let result;
    try {
      result = await browser.tabs.sendMessage(activeTab.id, {
        type: "GQA_PASTE_TICKET",
        ticket: parsed.ticket
      });
    } catch {
      console.error("[GQA JIRA Helper] content script is not reachable");
      setStatus(
        "Cannot reach the Jira helper on this page. Open the configured Jira tenant and a PERMAQA Bug creation dialog, then try again."
      );
      return;
    }

    setStatus(formatResult(result));
  } catch {
    console.error("[GQA JIRA Helper] popup operation failed");
    setStatus("The helper could not complete this paste. Nothing was submitted.");
  } finally {
    pasteButton.disabled = false;
  }
});
