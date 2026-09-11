"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const content = fs.readFileSync(path.resolve(__dirname, "..", "content.js"), "utf8");

test("dialog guard accepts exactly one matching dialog and uses compact upper tokens", () => {
  assert.match(content, /return matches\.length === 1 \? matches\[0\] : null/);
  assert.match(content, /DIALOG_GUARD_TOP_PX/);
  assert.match(content, /compactElementExactMatch/);
  assert.match(content, /hasCreateButton\(dialog\)/);
});

test("dropdown lookup binds to linked or newly opened popup roots", () => {
  assert.match(content, /aria-controls/);
  assert.match(content, /aria-owns/);
  assert.match(content, /newGroups\.length === 1/);
  assert.match(content, /Multiple groups are always ambiguous/);
  assert.doesNotMatch(content, /return options\.find\(/);
});

test("dropdown matching rejects duplicate exact options", () => {
  assert.match(content, /if \(matches\.length > 1\)/);
  assert.match(content, /matches\.length !== 1/);
});

test("multi-select reacquires its control for every clean value", () => {
  assert.match(content, /for \(const value of cleanValues\) \{\s*const control = getControl\(\)/s);
  assert.match(content, /getFreshControl/);
});

test("dialog is revalidated before every field and loss stops safely", () => {
  assert.match(content, /for \(let index = 0; index < plan\.length; index \+= 1\)/);
  assert.match(content, /const dialog = findIssueDialog\(\)/);
  assert.match(content, /stopped = "dialog-lost"/);
});

test("text inputs preserve the supplied string and role=textbox alone is not editable proof", () => {
  assert.match(content, /return setNativeInputValue\(control, value\)/);
  assert.doesNotMatch(content, /setNativeInputValue\(control, value\.trim\(\)\)/);
  assert.match(content, /function isEditableElement/);
  assert.doesNotMatch(content, /getAttribute\("role"\) === "textbox"\) \{\s*return replaceContentEditableText/s);
});

test("import operations are protected by a single in-flight mutex lock", () => {
  assert.match(content, /let pasteInProgress = false;/);
  assert.match(content, /if \(pasteInProgress\)\s*\{\s*return \{\s*ok:\s*false,\s*error:\s*"A ticket paste is already in progress\."/);
  assert.match(content, /pasteInProgress = true;/);
  assert.match(content, /finally\s*\{\s*pasteInProgress = false;\s*\}/);
});

test("multi-select validation enforces maximum value limit", () => {
  assert.match(content, /clean\.length > maxAllowed/);
  assert.match(content, /return "too-many-values"/);
});

test("production debug logging is configured from GQA_CONFIG", () => {
  assert.match(content, /const DEBUG = C\.DEBUG \?\? false;/);
});

test("isSubmitCapableElement rejects buttons with form attribute or form parent", () => {
  assert.match(content, /button\.closest\("form"\) \|\| button\.hasAttribute\("form"\)/);
});

test("buildFieldPlan safely ignores prototype pollution properties", () => {
  assert.match(content, /Object\.prototype\.hasOwnProperty\.call\(ticket,\s*key\)/);
});

test("a pointer press is only ever sent to select-like controls and passes the click refusal rules", () => {
  const presses = content.match(/new MouseEvent\(/g) || [];
  assert.equal(presses.length, 1);
  assert.match(content, /function safePress\(element\) \{\s*if \(!element \|\| !isRendered\(element\) \|\| !isSelectLike\(element\)\) return false;\s*if \(isForbiddenClickTarget\(element\)\) return false;/);
});

test("row activation never clicks a label that owns a control and only uses safeClick", () => {
  assert.match(content, /if \(labelElement\.closest\("label"\)\?\.control\) return \[\];/);
  assert.match(content, /for \(const target of activationTargets\(labelElement\)\) \{\s*if \(!safeClick\(target\)\) continue;/);
});

test("an activated row is committed by blur only and its outcome is verified", () => {
  assert.match(content, /control\.blur\?\.\(\);\s*\}\s*await sleep\(C\.SETTLE_MS\);\s*return editPersisted\(control, containers, valueTexts, fieldConfig\);/);
  assert.match(content, /if \(!persisted\) return \{ status: "skipped", reason: "not-confirmed" \};/);
});

test("discovery only pairs a field with a control of a compatible kind", () => {
  assert.match(content, /function controlAcceptsField\(control, fieldConfig\)/);
  assert.match(content, /if \(containsOtherFieldLabel\(node, fieldKey\)\) return null;/);
  assert.match(content, /return isNearLabel\(controls\[0\], labelElement\) \? controls\[0\] : null;/);
});

test("the diagnosis report is read-only and reports structure, never values", () => {
  const diagnosis = content.slice(content.indexOf("function describeControl"), content.indexOf("function handleDiagnose"));
  assert.doesNotMatch(diagnosis, /safeClick|safePress|\.focus\(|\.click\(|setNativeInputValue|activateRow/);
  assert.doesNotMatch(diagnosis, /\.value\b|textContent\.slice|innerText\.slice/);
});
