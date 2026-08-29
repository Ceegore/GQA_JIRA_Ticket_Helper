"use strict";

/*
 * Loads the real popup document and its real scripts into jsdom with mocked
 * clipboard and messaging, so popup behaviour is tested instead of described.
 */

const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.resolve(__dirname, "..", "..");
const POPUP_HTML = fs.readFileSync(path.join(ROOT, "popup.html"), "utf8");

/** Script order is taken from popup.html so the harness cannot drift from it. */
function popupScriptFiles() {
  const files = [...POPUP_HTML.matchAll(/<script\s+src="([^"]+)"><\/script>/g)].map(
    (match) => match[1]
  );
  if (files.length === 0) {
    throw new Error("popup.html declares no scripts");
  }
  return files;
}

function popupBody() {
  const match = POPUP_HTML.match(/<body>([\s\S]*)<\/body>/);
  if (!match) throw new Error("popup.html has no body");
  return match[1].replace(/<script\s+src="[^"]+"><\/script>/g, "");
}

/**
 * @param {{clipboard?: () => Promise<string>, tabs?: object[]|Error,
 *          respond?: (message: object) => unknown}} [options]
 */
function createPopup(options = {}) {
  const {
    clipboard = async () => "",
    tabs = [{ id: 7, active: true }],
    respond = async () => ({ ok: true, filled: 0, partial: 0, skipped: 16, stopped: null })
  } = options;

  const dom = new JSDOM(`<!doctype html><html><body>${popupBody()}</body></html>`, {
    url: "moz-extension://gqa-test/popup.html",
    runScripts: "outside-only"
  });

  const { window } = dom;
  const sentMessages = [];
  const consoleErrors = [];

  window.navigator.clipboard = { readText: () => clipboard() };
  window.console.error = (...args) => consoleErrors.push(args.join(" "));

  window.browser = {
    tabs: {
      query: async () => {
        if (tabs instanceof Error) throw tabs;
        return tabs;
      },
      sendMessage: async (tabId, message) => {
        sentMessages.push({ tabId, message });
        return respond(message);
      }
    }
  };

  for (const file of popupScriptFiles()) {
    window.eval(fs.readFileSync(path.join(ROOT, file), "utf8"));
  }

  const button = window.document.getElementById("pasteButton");
  const status = window.document.getElementById("status");

  async function clickPaste() {
    button.click();
    // The handler is async; yield until it re-enables the button.
    for (let attempt = 0; attempt < 200 && button.disabled; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1));
    }
    return status.textContent;
  }

  return {
    window,
    button,
    status,
    sentMessages,
    consoleErrors,
    clickPaste,
    scriptFiles: popupScriptFiles()
  };
}

module.exports = { createPopup, popupScriptFiles };
