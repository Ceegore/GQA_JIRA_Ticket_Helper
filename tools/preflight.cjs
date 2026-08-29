"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const releaseMode = process.argv.includes("--release");
const EXCLUDED_TOP_LEVEL = new Set([".git", "dist"]);
let failed = false;
let warned = false;

function ok(message) { console.log(`[PASS] ${message}`); }
function warn(message) { warned = true; console.warn(`[WARN] ${message}`); }
function fail(message) { failed = true; console.error(`[FAIL] ${message}`); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }

function enumerate(directory = ROOT, prefix = "") {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (prefix === "" && EXCLUDED_TOP_LEVEL.has(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...enumerate(absolute, relative));
    else if (entry.isFile()) output.push(relative);
  }
  return output.sort((a, b) => a.localeCompare(b, "en"));
}

const allFiles = enumerate();
const required = [
  "manifest.json", "config.js", "shared.js", "content.js", "popup.html", "popup.css", "popup.js",
  "00_START_HERE.md", "README.md", "PROJECT_PLAN.md", "IMPLEMENTATION_PROMPT_FOR_WEAK_AI.md",
  "FULL_PROJECT_REVIEW_PROMPT.md", "PACKAGE_INDEX.md", "FILE_MANIFEST_SHA256.txt",
  "tools/dom-probe.js", "tools/dom-report-exporter.js", "tools/dropdown-probe.js",
  "tools/dialog-guard-probe.js", "tools/update-file-manifest.cjs", "tools/validate-ticket.cjs",
  "tests/shared.test.cjs", "tests/safety.test.cjs", "tests/package.test.cjs",
  "tests/content-contract.test.cjs", "dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json"
];

for (const rel of required) {
  if (exists(rel)) ok(`required file exists: ${rel}`);
  else fail(`required file missing: ${rel}`);
}

for (const rel of allFiles.filter((name) => name.endsWith(".json"))) {
  try {
    JSON.parse(read(rel));
  } catch (error) {
    fail(`JSON cannot be parsed: ${rel}: ${error.message}`);
  }
}
if (!failed) ok("all repository JSON files parse");

for (const rel of allFiles.filter((name) => /\.(?:js|cjs)$/.test(name))) {
  const result = spawnSync(process.execPath, ["--check", path.join(ROOT, rel)], {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (result.status !== 0) fail(`JavaScript syntax check failed: ${rel}: ${(result.stderr || "").trim()}`);
}
if (!failed) ok("all JavaScript/CJS files pass node --check");

let manifest;
try {
  manifest = JSON.parse(read("manifest.json"));
  ok("manifest.json parses as JSON");
} catch (error) {
  fail(`manifest.json cannot be parsed: ${error.message}`);
}

if (manifest) {
  if (manifest.manifest_version === 3) ok("manifest_version is 3");
  else fail(`unexpected manifest_version: ${manifest.manifest_version}`);

  if (JSON.stringify(manifest.permissions || []) === JSON.stringify(["clipboardRead"])) {
    ok("permissions remain clipboardRead only");
  } else {
    fail(`unexpected permissions: ${JSON.stringify(manifest.permissions || [])}`);
  }

  const hosts = manifest.host_permissions || [];
  const hostPattern = /^https:\/\/[A-Za-z0-9.-]+\.atlassian\.net\/\*$/;
  if (hosts.length === 1 && hostPattern.test(hosts[0]) && !hosts[0].includes("*://*/*")) {
    ok("host permission is one exact Atlassian host pattern");
  } else {
    fail(`host permissions are too broad or malformed: ${JSON.stringify(hosts)}`);
  }

  if ((manifest.content_scripts || []).length !== 1) {
    fail("expected exactly one content_scripts entry");
  } else {
    const group = manifest.content_scripts[0];
    if (JSON.stringify(group.matches || []) === JSON.stringify(hosts)) ok("content-script matches equal host_permissions");
    else fail("content-script matches differ from host_permissions");
    if (JSON.stringify(group.js || []) === JSON.stringify(["config.js", "shared.js", "content.js"])) {
      ok("content-script runtime order is exact");
    } else {
      fail(`unexpected content-script files/order: ${JSON.stringify(group.js || [])}`);
    }
    if (group.run_at === "document_idle") ok("content script runs at document_idle");
    else fail(`unexpected content-script run_at: ${group.run_at}`);
  }

  const gecko = manifest.browser_specific_settings?.gecko;
  if (typeof gecko?.id === "string" && gecko.id.length > 0) ok("Firefox extension ID is present");
  else fail("browser_specific_settings.gecko.id is missing");
  if (JSON.stringify(gecko?.data_collection_permissions) === JSON.stringify({ required: ["none"] })) {
    ok("Firefox data collection declaration is required:none");
  } else {
    fail("Firefox data collection declaration must be {required:[\"none\"]}");
  }

  const serialized = JSON.stringify(manifest);
  for (const rel of manifest.content_scripts?.flatMap((group) => group.js || []) || []) {
    if (exists(rel)) ok(`manifest content script exists: ${rel}`);
    else fail(`manifest references missing content script: ${rel}`);
    if (/^(tools|tests|reference|dom|review|prompts)\//.test(rel)) {
      fail(`development-only file loaded by manifest: ${rel}`);
    }
  }
  const popup = manifest.action?.default_popup;
  if (popup && exists(popup)) ok(`manifest popup exists: ${popup}`);
  else fail(`manifest popup missing or absent: ${popup}`);
  if (/tools\/|tests\/|reference\/|dom\/|review\/|prompts\//.test(serialized)) {
    fail("manifest references a development-only directory");
  } else {
    ok("manifest does not reference development-only directories");
  }

  if (serialized.includes("YOUR-COMPANY")) {
    if (releaseMode) fail("YOUR-COMPANY placeholder remains in release mode");
    else warn("YOUR-COMPANY placeholder remains; expected before environment configuration");
  } else {
    ok("Jira hostname placeholder has been replaced");
  }
}

const expectedRuntimeFiles = [
  "manifest.json", "config.js", "shared.js", "content.js",
  "popup.html", "popup.css", "popup.js"
];
const runtimeList = read("RUNTIME_FILE_LIST.txt")
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean);
if (JSON.stringify(runtimeList) === JSON.stringify(expectedRuntimeFiles)) {
  ok("RUNTIME_FILE_LIST.txt is exact and ordered");
} else {
  fail(`unexpected runtime file list: ${JSON.stringify(runtimeList)}`);
}
for (const rel of runtimeList) {
  if (exists(rel)) ok(`runtime package file exists: ${rel}`);
  else fail(`runtime package file missing: ${rel}`);
  if (rel.includes("/")) fail(`runtime package file is not root-scoped: ${rel}`);
}

const runtimeSource = ["config.js", "shared.js", "content.js", "popup.js"].map(read).join("\n");
const forbiddenPatterns = [
  ["fetch", /\bfetch\s*\(/],
  ["XMLHttpRequest", /\bXMLHttpRequest\b/],
  ["WebSocket", /\bWebSocket\b/],
  ["EventSource", /\bEventSource\b/],
  ["sendBeacon", /\bsendBeacon\b/],
  ["dynamic remote element", /document\.createElement\s*\(\s*["'](?:script|img|link|iframe)["']\s*\)/i],
  ["browser.storage", /\bbrowser\.storage\b/],
  ["chrome.storage", /\bchrome\.storage\b/],
  ["localStorage", /\blocalStorage\b/],
  ["sessionStorage", /\bsessionStorage\b/],
  ["indexedDB", /\bindexedDB\b/],
  ["cookies", /\bdocument\.cookie\b/],
  ["Cache API", /\bcaches\s*\./],
  ["innerHTML assignment", /\.innerHTML\s*=/],
  ["outerHTML assignment", /\.outerHTML\s*=/],
  ["insertAdjacentHTML", /\binsertAdjacentHTML\s*\(/],
  ["eval", /\beval\s*\(/],
  ["new Function", /new\s+Function\s*\(/],
  ["Jira REST path", /\/rest\/api\//i],
  ["Authorization header", /\bAuthorization\b/],
  ["Bearer token", /\bBearer\b/],
  ["form submit", /\.submit\s*\(/],
  ["requestSubmit", /\brequestSubmit\s*\(/],
  ["SubmitEvent", /\bSubmitEvent\b/],
  ["KeyboardEvent", /\bKeyboardEvent\b/]
];
for (const [name, pattern] of forbiddenPatterns) {
  if (pattern.test(runtimeSource)) fail(`forbidden runtime pattern found: ${name}`);
  else ok(`forbidden runtime pattern absent: ${name}`);
}

const index = read("PACKAGE_INDEX.md");
for (const rel of allFiles) {
  if (!index.includes(`\`${rel}\``)) fail(`PACKAGE_INDEX.md does not account for: ${rel}`);
}
if (!failed) ok(`PACKAGE_INDEX.md accounts for all ${allFiles.length} repository files`);

try {
  const entries = read("FILE_MANIFEST_SHA256.txt")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const match = /^([a-f0-9]{64})  \.\/(.+)$/.exec(line);
      if (!match) throw new Error(`invalid manifest line: ${line}`);
      return { digest: match[1], relative: match[2] };
    });
  const expectedFiles = allFiles.filter((rel) => rel !== "FILE_MANIFEST_SHA256.txt");
  const listed = entries.map((entry) => entry.relative);
  if (JSON.stringify(listed) !== JSON.stringify(expectedFiles)) {
    fail("FILE_MANIFEST_SHA256.txt file list differs from current repository; run node tools/update-file-manifest.cjs");
  } else {
    let hashesOkay = true;
    for (const entry of entries) {
      const digest = crypto.createHash("sha256")
        .update(fs.readFileSync(path.join(ROOT, entry.relative)))
        .digest("hex");
      if (digest !== entry.digest) {
        hashesOkay = false;
        fail(`SHA-256 mismatch: ${entry.relative}`);
      }
    }
    if (hashesOkay) ok(`SHA-256 manifest verifies ${entries.length} files`);
  }
} catch (error) {
  fail(`cannot verify FILE_MANIFEST_SHA256.txt: ${error.message}`);
}

const evidencePending = exists("dom/ACTUAL_DOM_NOT_YET_CAPTURED.md");
const completedManualReport = exists("tests/MANUAL_TEST_REPORT_COMPLETED.md");
if (evidencePending) {
  if (releaseMode) fail("real Jira DOM evidence marker still exists in release mode");
  else warn("real Jira DOM evidence has not yet been captured");
} else {
  ok("real Jira DOM evidence pending marker is absent");
}
if (!completedManualReport) {
  if (releaseMode) fail("tests/MANUAL_TEST_REPORT_COMPLETED.md is missing in release mode");
  else warn("completed real-Jira manual test report is not present");
} else {
  ok("completed real-Jira manual test report is present");
}

const testFiles = fs.readdirSync(path.join(ROOT, "tests"))
  .filter((name) => name.endsWith(".test.cjs"))
  .sort()
  .map((name) => path.join("tests", name));
if (testFiles.length === 0) {
  fail("no automated test files found");
} else {
  const result = spawnSync(process.execPath, ["--test", ...testFiles], {
    cwd: ROOT,
    stdio: "inherit"
  });
  if (result.status === 0) ok(`node tests passed (${testFiles.length} test files)`);
  else fail(`node tests failed with exit code ${result.status}`);
}

if (failed) {
  console.error("\nPRE-FLIGHT RESULT: FAIL");
  process.exit(1);
}
if (warned) console.warn("\nPRE-FLIGHT RESULT: PASS WITH WARNINGS");
else console.log("\nPRE-FLIGHT RESULT: PASS");
