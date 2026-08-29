"use strict";

/*
 * Executable Jira-like DOM harness.
 *
 * The other test files assert source-level contracts. This harness loads the
 * real runtime files (config.js, shared.js, content.js) into a jsdom window and
 * drives them through the same message the popup sends, so behavior is proven
 * instead of pattern-matched.
 */

const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.resolve(__dirname, "..", "..");

const RUNTIME_SOURCES = ["config.js", "shared.js", "content.js"].map((file) => ({
  file,
  code: fs.readFileSync(path.join(ROOT, file), "utf8")
}));

const DEFAULT_RECT = Object.freeze({
  top: 0,
  left: 0,
  width: 200,
  height: 20
});

// Keeps a full paste under a second while leaving the real ordering, guard and
// ambiguity logic untouched.
const FAST_TIMINGS = Object.freeze({
  WAIT_STEP_MS: 1,
  WAIT_TIMEOUT_MS: 60,
  OPTION_WAIT_TIMEOUT_MS: 60,
  BETWEEN_FIELDS_MS: 0
});

function installCssEscape(window) {
  if (!window.CSS) window.CSS = {};
  if (typeof window.CSS.escape !== "function") {
    window.CSS.escape = (value) =>
      String(value).replace(/[^\w-]/g, (character) => `\${character}`);
  }
}

function isInHiddenSubtree(element, window) {
  let node = element;
  while (node && node.nodeType === 1) {
    if (node.hasAttribute("hidden")) return true;
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return true;
    node = node.parentElement;
  }
  return false;
}

const ZERO_RECT = Object.freeze({ top: 0, left: 0, width: 0, height: 0 });

function installLayout(window) {
  // jsdom performs no layout, so every element would read as 0x0 and the real
  // visibility/compactness guards could never be exercised. Elements opt into a
  // specific box with data-rect; everything else gets a plausible small box.
  // Anything inside a hidden subtree collapses to 0x0 exactly as a browser
  // reports it, which is what makes closed dropdown popups genuinely invisible.
  window.Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    if (!this.isConnected || isInHiddenSubtree(this, window)) {
      return {
        ...ZERO_RECT,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ZERO_RECT
      };
    }

    let overrides = {};
    const raw = this.getAttribute && this.getAttribute("data-rect");
    if (raw) {
      try {
        overrides = JSON.parse(raw);
      } catch {
        overrides = {};
      }
    }

    const rect = { ...DEFAULT_RECT, ...overrides };
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON() {
        return rect;
      }
    };
  };
}

function installBrowserMock(window) {
  const listeners = [];
  window.browser = {
    runtime: {
      onMessage: {
        addListener(listener) {
          listeners.push(listener);
        }
      }
    }
  };
  return listeners;
}

function recordClicks(window) {
  const clicks = [];
  window.document.addEventListener(
    "click",
    (event) => {
      clicks.push(event.target);
    },
    true
  );
  return clicks;
}

/**
 * @param {string} bodyHtml markup placed inside <body>
 * @param {{fastTimings?: boolean, onReady?: (window: object) => void}} [options]
 */
function createHarness(bodyHtml, options = {}) {
  const { fastTimings = true, onReady } = options;

  const dom = new JSDOM(`<!doctype html><html><body>${bodyHtml}</body></html>`, {
    url: "https://example.atlassian.net/jira/browse/PERMAQA-1",
    runScripts: "outside-only",
    pretendToBeVisual: true
  });

  const { window } = dom;
  installCssEscape(window);
  installLayout(window);
  const listeners = installBrowserMock(window);
  const clicks = recordClicks(window);

  if (typeof onReady === "function") onReady(window);

  for (const source of RUNTIME_SOURCES) {
    if (source.file === "content.js" && fastTimings) {
      window.eval(
        `globalThis.GQA_CONFIG = Object.freeze({ ...globalThis.GQA_CONFIG, ${Object.entries(
          FAST_TIMINGS
        )
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")} });`
      );
    }
    window.eval(source.code);
  }

  if (listeners.length !== 1) {
    throw new Error(`content.js registered ${listeners.length} message listeners`);
  }

  // browser.tabs.sendMessage structured-clones the payload into the content
  // script realm. Re-parsing inside the window reproduces that boundary, so
  // prototype checks are exercised exactly as they are in Firefox.
  function intoPageRealm(value) {
    return window.JSON.parse(JSON.stringify(value));
  }

  // Results are created inside the window realm, so their prototype is not
  // Node's Object.prototype and strict deep equality would reject them.
  // Every field of a paste result is JSON-safe, so a round trip is lossless.
  async function intoNodeRealm(promiseLike) {
    const result = promiseLike === undefined ? undefined : await promiseLike;
    return result === undefined ? undefined : JSON.parse(JSON.stringify(result));
  }

  async function paste(ticket) {
    const payload = ticket === undefined || typeof ticket === "function"
      ? ticket
      : intoPageRealm(ticket);
    return intoNodeRealm(listeners[0]({ type: "GQA_PASTE_TICKET", ticket: payload }));
  }

  function send(message) {
    return listeners[0](message);
  }

  return {
    dom,
    window,
    document: window.document,
    clicks,
    paste,
    pasteRaw: (ticket) =>
      intoNodeRealm(listeners[0]({ type: "GQA_PASTE_TICKET", ticket })),
    intoPageRealm,
    send,
    query: (selector) => window.document.querySelector(selector),
    queryAll: (selector) => [...window.document.querySelectorAll(selector)],
    close: () => window.close()
  };
}

/** Guard header markup that satisfies the project/issue-type/Create contract. */
function dialogHeader({ project = "PERMAQA", issueType = "Bug", createText = "Erstellen" } = {}) {
  return `
    <div class="hdr" data-rect='{"top":4,"height":24,"width":300}'>
      <span data-rect='{"top":4,"height":20,"width":120}'>${project}</span>
      <span data-rect='{"top":4,"height":20,"width":120}'>${issueType}</span>
    </div>
    <button type="button" class="create-btn" data-rect='{"top":400,"height":32,"width":120}'>${createText}</button>
  `;
}

/**
 * Builds one create-issue dialog. `fields` is raw markup for the field rows.
 */
function dialog(fields, headerOptions = {}, attributes = "") {
  return `
    <div role="dialog" ${attributes} data-rect='{"top":0,"height":600,"width":700}'>
      ${dialogHeader(headerOptions)}
      ${fields}
    </div>
  `;
}

/** One labelled text/number/date input row. */
function inputRow(label, { id, type = "text", extra = "" } = {}) {
  const inputId = id || `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return `
    <div class="row" data-rect='{"top":100,"height":40,"width":600}'>
      <label for="${inputId}" data-rect='{"top":100,"height":18,"width":200}'>${label}</label>
      <input id="${inputId}" type="${type}" ${extra} data-rect='{"top":120,"height":24,"width":300}'>
    </div>
  `;
}

module.exports = {
  createHarness,
  dialog,
  dialogHeader,
  inputRow,
  FAST_TIMINGS
};
