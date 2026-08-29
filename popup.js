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
  const skipped = Number(result.skipped || 0);
  const suffix = result.stopped === "dialog-lost"
    ? " The dialog was no longer available; processing stopped safely."
    : "";
  return `Done: ${filled} filled, ${skipped} skipped.${suffix}`;
}

pasteButton.addEventListener("click", async () => {
  pasteButton.disabled = true;
  setStatus("Reading clipboard...");

  try {
    const rawText = await navigator.clipboard.readText();
    const parsed = GQAShared.parseClipboardTicket(
      rawText,
      GQA_CONFIG.SCHEMA_VERSION,
      GQA_CONFIG.MAX_CLIPBOARD_BYTES
    );

    if (!parsed.ok) {
      setStatus(parsed.error);
      return;
    }

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab || typeof activeTab.id !== "number") {
      setStatus("No active browser tab found.");
      return;
    }

    const result = await browser.tabs.sendMessage(activeTab.id, {
      type: "GQA_PASTE_TICKET",
      ticket: parsed.ticket
    });

    setStatus(formatResult(result));
  } catch {
    console.error("[GQA JIRA Helper] popup operation failed");
    setStatus(
      "Cannot reach the Jira helper on this page. Open the PERMAQA Bug creation dialog and try again."
    );
  } finally {
    pasteButton.disabled = false;
  }
});
