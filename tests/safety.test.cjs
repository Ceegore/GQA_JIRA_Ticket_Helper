"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_FILES = ["config.js", "shared.js", "popup.js", "content.js"];
const read = (name) => fs.readFileSync(path.join(ROOT, name), "utf8");
const source = SOURCE_FILES.map(read).join("\n");

test("runtime contains no network client or dynamic remote-load APIs", () => {
  const forbidden = [
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\bsendBeacon\b/,
    /\bEventSource\b/,
    /document\.createElement\s*\(\s*["'](?:script|img|link|iframe)["']\s*\)/i,
    /\bnew\s+Image\s*\(/,
    /\.src\s*=\s*[`"']https?:/i,
    /\.href\s*=\s*[`"']https?:/i
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `Forbidden network capability: ${pattern}`);
  }
});

test("runtime contains no storage, cookies or cache APIs", () => {
  const forbidden = [
    /\bbrowser\.storage\b/,
    /\bchrome\.storage\b/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bindexedDB\b/,
    /\bdocument\.cookie\b/,
    /\bcaches\s*\./,
    /\bCacheStorage\b/
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `Forbidden storage capability: ${pattern}`);
  }
});

test("runtime contains no Jira REST or credential handling", () => {
  const forbidden = [
    /\/rest\/api\//i,
    /\bAuthorization\b/,
    /\bBearer\b/,
    /api[_ -]?token/i,
    /api[_ -]?key/i,
    /\bpassword\b/i,
    /\bsecret\b/i
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `Forbidden credential/API pattern: ${pattern}`);
  }
});

test("runtime contains no unsafe HTML or dynamic-code sinks", () => {
  const forbidden = [
    /\.innerHTML\s*=/,
    /\binsertAdjacentHTML\s*\(/,
    /\bouterHTML\s*=/,
    /\beval\s*\(/,
    /new\s+Function\s*\(/,
    /document\.write\s*\(/
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `Forbidden execution/HTML sink: ${pattern}`);
  }
});

test("content script contains no form submission or synthesized keyboard APIs", () => {
  const content = read("content.js");
  const forbidden = [
    /\.submit\s*\(/,
    /\brequestSubmit\s*\(/,
    /new\s+Event\s*\(\s*["']submit["']/,
    /new\s+SubmitEvent\b/,
    /\bKeyboardEvent\b/,
    /new\s+Event\s*\(\s*["']key(?:down|up|press)["']/i
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(content), false, `Forbidden submit path: ${pattern}`);
  }
});

test("only safeClick implementation performs direct .click()", () => {
  const lines = read("content.js").split(/\r?\n/);
  const directClickLines = lines
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => /\.click\s*\(\s*\)/.test(line));
  assert.equal(directClickLines.length, 1, JSON.stringify(directClickLines));
  assert.match(directClickLines[0].line, /element\.click\s*\(\s*\)/);
});

test("safeClick explicitly rejects disabled and submit-capable elements", () => {
  const content = read("content.js");
  assert.match(content, /isDisabled\(clickable\)/);
  assert.match(content, /isSubmitCapableElement\(clickable\)/);
  assert.match(content, /type === "submit" \|\| type === "image"/);
  assert.match(content, /explicitType === "" && \(button\.closest\("form"\) \|\| button\.hasAttribute\("form"\)\)/);
  assert.match(content, /actionTextIsForbidden\(clickable\)/);
});

test("runtime logs do not pass clipboard payloads or raw error objects", () => {
  const popup = read("popup.js");
  const content = read("content.js");
  assert.doesNotMatch(popup, /console\.(?:log|debug|error)\([^\n]*(?:rawText|parsed\.ticket|error\s*\))/);
  assert.doesNotMatch(content, /log\([^\n]*(?:rawValue|desiredValue|ticket\s*[,}])/);
  assert.doesNotMatch(content, /log\([^\n]*,\s*error\s*\)/);
});

test("manifest permission scope remains exact and data collection is declared none", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.deepEqual(manifest.permissions, ["clipboardRead"]);
  assert.equal(manifest.host_permissions.length, 1);
  assert.match(manifest.host_permissions[0], /^https:\/\/[A-Za-z0-9.-]+\.atlassian\.net\/\*$/);
  assert.deepEqual(manifest.content_scripts[0].matches, manifest.host_permissions);
  assert.deepEqual(
    manifest.browser_specific_settings.gecko.data_collection_permissions,
    { required: ["none"] }
  );
});

test("runtime contains no modal dialog, navigation or tab modification APIs", () => {
  const forbidden = [
    /\balert\s*\(/,
    /\bconfirm\s*\(/,
    /\bprompt\s*\(/,
    /\bwindow\.open\s*\(/,
    /\blocation\.href\s*=/i,
    /\blocation\.replace\s*\(/i,
    /\blocation\.assign\s*\(/i
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `Forbidden UI/navigation capability: ${pattern}`);
  }
});

test("config defines all required forbidden click tokens", () => {
  const config = read("config.js");
  assert.match(config, /"Erstellen"/);
  assert.match(config, /"Create"/);
  assert.match(config, /"Submit"/);
  assert.match(config, /"Save"/);
  assert.match(config, /"Speichern"/);
});

