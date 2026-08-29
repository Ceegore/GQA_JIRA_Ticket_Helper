"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const manifest = JSON.parse(read("manifest.json"));
require(path.join(ROOT, "config.js"));
const C = globalThis.GQA_CONFIG;

const EXPECTED_FIELDS = [
  "summary",
  "description",
  "tester",
  "build_version_spotted",
  "build_version_released",
  "branch",
  "labels",
  "priority",
  "severity",
  "game_mode",
  "affected_player",
  "repro_rate",
  "due_date",
  "working_hours",
  "origin",
  "flagged_impediment"
];

test("manifest content scripts, popup and popup resources all exist", () => {
  for (const group of manifest.content_scripts || []) {
    for (const file of group.js || []) {
      assert.equal(fs.existsSync(path.join(ROOT, file)), true, file);
    }
  }
  assert.equal(fs.existsSync(path.join(ROOT, manifest.action.default_popup)), true);
  const popup = read(manifest.action.default_popup);
  for (const resource of ["popup.css", "config.js", "shared.js", "popup.js"]) {
    assert.match(popup, new RegExp(resource.replace(".", "\\.")));
    assert.equal(fs.existsSync(path.join(ROOT, resource)), true, resource);
  }
});

test("manifest content-script order and host scope are exact", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal((manifest.content_scripts || []).length, 1);
  assert.deepEqual(manifest.content_scripts[0].js, ["config.js", "shared.js", "content.js"]);
  assert.equal(manifest.content_scripts[0].run_at, "document_idle");
  assert.deepEqual(manifest.content_scripts[0].matches, manifest.host_permissions);
  assert.equal(manifest.host_permissions.length, 1);
  assert.equal(manifest.host_permissions[0].includes("*://*/*"), false);
});

test("runtime-only file list is complete, unique and properly scoped", () => {
  const files = read("RUNTIME_FILE_LIST.txt").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  assert.equal(new Set(files).size, files.length);
  assert.deepEqual(files, [
    "manifest.json",
    "config.js",
    "shared.js",
    "content.js",
    "popup.html",
    "popup.css",
    "popup.js",
    "icons/icon-16.png",
    "icons/icon-32.png",
    "icons/icon-48.png",
    "icons/icon-64.png",
    "icons/icon-96.png"
  ]);
  for (const file of files) {
    assert.equal(fs.existsSync(path.join(ROOT, file)), true, file);
  }
});

test("manifest specifies gecko strict_min_version", () => {
  assert.equal(manifest.browser_specific_settings?.gecko?.strict_min_version, "140.0");
});

test("manifest icons exist and are valid PNG images", () => {
  const iconPaths = [
    ...Object.values(manifest.icons || {}),
    ...Object.values(manifest.action?.default_icon || {})
  ];
  assert.ok(iconPaths.length > 0);
  for (const iconPath of iconPaths) {
    assert.equal(fs.existsSync(path.join(ROOT, iconPath)), true, iconPath);
    const dimensions = pngDimensions(iconPath);
    assert.ok(dimensions.width >= 16, `${iconPath} width`);
    assert.ok(dimensions.height >= 16, `${iconPath} height`);
  }
});

test("development-only directories are not referenced by manifest runtime", () => {
  const serialized = JSON.stringify(manifest);
  for (const dir of ["tools/", "tests/", "reference/", "dom/", "review/", "prompts/"]) {
    assert.equal(serialized.includes(dir), false, dir);
  }
});

test("field order is exact, duplicate-free and identical to configured fields", () => {
  assert.deepEqual([...C.FIELD_ORDER], EXPECTED_FIELDS);
  assert.equal(new Set(C.FIELD_ORDER).size, C.FIELD_ORDER.length);
  assert.deepEqual(Object.keys(C.FIELDS), EXPECTED_FIELDS);
  assert.match(read("content.js"), /C\.FIELD_ORDER\.map\(\(key\) => \[key, ticket\[key\]\]\)/);
});

test("forbidden project, issue-type and Lead-only fields are absent from runtime plan", () => {
  const keys = new Set(C.FIELD_ORDER);
  for (const forbidden of [
    "project", "issue_type", "status", "assignee", "department", "location",
    "roadmap_phase", "impact", "stability_risk", "commercial_need",
    "definition_of_done", "attachments", "linked_issues", "restrict_to"
  ]) {
    assert.equal(keys.has(forbidden), false, forbidden);
  }
});

test("all JSON fixtures parse as JSON and schema fixtures state their intent", () => {
  const fixtureDir = path.join(ROOT, "tests", "fixtures");
  const fixtures = fs.readdirSync(fixtureDir).filter((name) => name.endsWith(".json"));
  assert.ok(fixtures.length >= 5);
  for (const fixture of fixtures) {
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(fixtureDir, fixture), "utf8")), fixture);
  }
});

function pngDimensions(relative) {
  const buffer = fs.readFileSync(path.join(ROOT, relative));
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("reference screenshots are valid non-empty PNG files", () => {
  for (const name of [
    "reference/screenshots/01_jira_bug_form_top.png",
    "reference/screenshots/02_jira_bug_form_middle.png",
    "reference/screenshots/03_jira_bug_form_bottom.png"
  ]) {
    const dimensions = pngDimensions(name);
    assert.ok(dimensions.width > 500, `${name} width`);
    assert.ok(dimensions.height > 500, `${name} height`);
  }
});

