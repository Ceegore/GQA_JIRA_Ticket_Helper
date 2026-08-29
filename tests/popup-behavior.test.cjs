"use strict";

/*
 * Executable popup tests. The popup is the only user-facing surface, so its
 * failure messages have to be accurate: a clipboard problem and an unreachable
 * content script need different actions from the tester.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

let harness = null;
let loadError = null;
try {
  harness = require("./helpers/popup-harness.cjs");
} catch (error) {
  loadError = error;
}

if (!harness) {
  test("popup behaviour suite requires jsdom (run npm ci first)", (t) => {
    t.skip(`jsdom unavailable: ${loadError?.message}`);
  });
  return;
}

const { createPopup, popupScriptFiles } = harness;

const VALID_TICKET = JSON.stringify({ schema_version: 1, summary: "Crash on load" });

test("popup loads exactly the runtime scripts in the documented order", () => {
  assert.deepEqual(popupScriptFiles(), ["config.js", "shared.js", "popup.js"]);
});

test("a valid ticket is forwarded to the active tab and the outcome is reported", async () => {
  const popup = createPopup({
    clipboard: async () => VALID_TICKET,
    respond: async () => ({ ok: true, filled: 5, partial: 0, skipped: 11, stopped: null })
  });

  const status = await popup.clickPaste();

  assert.equal(popup.sentMessages.length, 1);
  assert.equal(popup.sentMessages[0].tabId, 7);
  assert.equal(popup.sentMessages[0].message.type, "GQA_PASTE_TICKET");
  assert.equal(popup.sentMessages[0].message.ticket.summary, "Crash on load");
  assert.equal(status, "Done: 5 filled, 11 skipped.");
});

test("partly filled fields are reported separately from filled fields", async () => {
  const popup = createPopup({
    clipboard: async () => VALID_TICKET,
    respond: async () => ({ ok: true, filled: 3, partial: 2, skipped: 11, stopped: null })
  });

  assert.equal(await popup.clickPaste(), "Done: 3 filled, 2 partly filled, 11 skipped.");
});

test("a safe stop caused by a lost dialog is spelled out", async () => {
  const popup = createPopup({
    clipboard: async () => VALID_TICKET,
    respond: async () => ({ ok: true, filled: 1, partial: 0, skipped: 15, stopped: "dialog-lost" })
  });

  assert.equal(
    await popup.clickPaste(),
    "Done: 1 filled, 15 skipped. The dialog was no longer available; processing stopped safely."
  );
});

test("an unreadable clipboard is reported as a clipboard problem", async () => {
  const popup = createPopup({
    clipboard: async () => {
      throw new Error("NotAllowedError");
    }
  });

  const status = await popup.clickPaste();

  assert.match(status, /clipboard/i);
  assert.doesNotMatch(status, /Cannot reach the Jira helper/);
  assert.equal(popup.sentMessages.length, 0);
});

test("an unreachable content script is reported as a page problem", async () => {
  const popup = createPopup({
    clipboard: async () => VALID_TICKET,
    respond: async () => {
      throw new Error("Could not establish connection.");
    }
  });

  const status = await popup.clickPaste();

  assert.match(status, /Cannot reach the Jira helper/);
  assert.doesNotMatch(status, /clipboard/i);
});

test("clipboard content that is not a valid ticket is rejected before any messaging", async () => {
  const cases = [
    ["", /empty/i],
    ["not json", /valid JSON/i],
    ["[1,2,3]", /must be an object/i],
    ['{"summary":"x"}', /schema_version/i],
    ['{"schema_version":2,"summary":"x"}', /schema_version/i]
  ];

  for (const [clipboardText, expected] of cases) {
    const popup = createPopup({ clipboard: async () => clipboardText });
    const status = await popup.clickPaste();

    assert.match(status, expected, `clipboard ${JSON.stringify(clipboardText)}`);
    assert.equal(popup.sentMessages.length, 0);
  }
});

test("oversized clipboard content is rejected without messaging", async () => {
  const huge = JSON.stringify({ schema_version: 1, summary: "x".repeat(200000) });
  const popup = createPopup({ clipboard: async () => huge });

  const status = await popup.clickPaste();

  assert.match(status, /too large/i);
  assert.equal(popup.sentMessages.length, 0);
});

test("a missing active tab is reported and nothing is sent", async () => {
  const popup = createPopup({ clipboard: async () => VALID_TICKET, tabs: [] });

  assert.match(await popup.clickPaste(), /No active browser tab/i);
  assert.equal(popup.sentMessages.length, 0);
});

test("a failing tab lookup is reported and nothing is sent", async () => {
  const popup = createPopup({
    clipboard: async () => VALID_TICKET,
    tabs: new Error("no permission")
  });

  assert.match(await popup.clickPaste(), /active browser tab/i);
  assert.equal(popup.sentMessages.length, 0);
});

test("an error result from the content script is shown verbatim", async () => {
  const popup = createPopup({
    clipboard: async () => VALID_TICKET,
    respond: async () => ({ ok: false, error: "No unique open PERMAQA Bug creation dialog found." })
  });

  assert.equal(await popup.clickPaste(), "No unique open PERMAQA Bug creation dialog found.");
});

test("the button is re-enabled after every outcome", async () => {
  const outcomes = [
    { clipboard: async () => VALID_TICKET },
    {
      clipboard: async () => {
        throw new Error("denied");
      }
    },
    { clipboard: async () => "not json" },
    {
      clipboard: async () => VALID_TICKET,
      respond: async () => {
        throw new Error("disconnected");
      }
    }
  ];

  for (const outcome of outcomes) {
    const popup = createPopup(outcome);
    await popup.clickPaste();
    assert.equal(popup.button.disabled, false);
  }
});

test("popup logs never contain clipboard content or raw error objects", async () => {
  const secret = "SECRET-TICKET-CONTENT";
  const popup = createPopup({
    clipboard: async () => JSON.stringify({ schema_version: 1, summary: secret }),
    respond: async () => {
      throw new Error(`boom ${secret}`);
    }
  });

  await popup.clickPaste();

  assert.ok(popup.consoleErrors.length > 0, "expected a diagnostic log line");
  for (const line of popup.consoleErrors) {
    assert.doesNotMatch(line, new RegExp(secret));
  }
});

test("status text is written as text, never as markup", async () => {
  const popup = createPopup({
    clipboard: async () => VALID_TICKET,
    respond: async () => ({ ok: false, error: "<img src=x onerror=alert(1)>" })
  });

  await popup.clickPaste();

  assert.equal(popup.status.children.length, 0);
  assert.equal(popup.status.textContent, "<img src=x onerror=alert(1)>");
});
