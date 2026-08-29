"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../shared.js");

const parse = (text, maxBytes = 100000) =>
  S.parseClipboardTicket(text, 1, maxBytes);

test("normalizeText trims, collapses whitespace and ignores case", () => {
  assert.equal(S.normalizeText("  Single   PLAYER \n\t\r"), "single player");
  assert.equal(S.normalizeText(""), "");
  assert.equal(S.normalizeText(null), "");
  assert.equal(S.normalizeText(undefined), "");
  assert.equal(S.normalizeText(123), "123");
});

test("isNonBlankString accepts useful strings only", () => {
  assert.equal(S.isNonBlankString("High"), true);
  assert.equal(S.isNonBlankString("   "), false);
  assert.equal(S.isNonBlankString("\t\n\r"), false);
  assert.equal(S.isNonBlankString(""), false);
  assert.equal(S.isNonBlankString(null), false);
  assert.equal(S.isNonBlankString(undefined), false);
  assert.equal(S.isNonBlankString(123), false);
  assert.equal(S.isNonBlankString({}), false);
  assert.equal(S.isNonBlankString([]), false);
});

test("isFiniteNonNegativeNumber accepts zero and decimals only when finite", () => {
  assert.equal(S.isFiniteNonNegativeNumber(0), true);
  assert.equal(S.isFiniteNonNegativeNumber(0.0), true);
  assert.equal(S.isFiniteNonNegativeNumber(1.5), true);
  assert.equal(S.isFiniteNonNegativeNumber(1000), true);
  assert.equal(S.isFiniteNonNegativeNumber(-0.0001), false);
  assert.equal(S.isFiniteNonNegativeNumber(-1), false);
  assert.equal(S.isFiniteNonNegativeNumber("2"), false);
  assert.equal(S.isFiniteNonNegativeNumber(Number.NaN), false);
  assert.equal(S.isFiniteNonNegativeNumber(Number.POSITIVE_INFINITY), false);
  assert.equal(S.isFiniteNonNegativeNumber(Number.NEGATIVE_INFINITY), false);
  assert.equal(S.isFiniteNonNegativeNumber(null), false);
  assert.equal(S.isFiniteNonNegativeNumber(undefined), false);
  assert.equal(S.isFiniteNonNegativeNumber(true), false);
  assert.equal(S.isFiniteNonNegativeNumber(false), false);
  assert.equal(S.isFiniteNonNegativeNumber({}), false);
});

test("isIsoDate accepts real leap dates and rejects impossible dates", () => {
  assert.equal(S.isIsoDate("2024-02-29"), true); // leap year
  assert.equal(S.isIsoDate("2000-02-29"), true); // century leap year
  assert.equal(S.isIsoDate("1900-02-29"), false); // century non-leap year
  assert.equal(S.isIsoDate("2026-09-15"), true);
  assert.equal(S.isIsoDate("2026-02-29"), false);
  assert.equal(S.isIsoDate("2026-04-31"), false);
  assert.equal(S.isIsoDate("2026-00-01"), false);
  assert.equal(S.isIsoDate("2026-13-01"), false);
  assert.equal(S.isIsoDate("2026-01-00"), false);
  assert.equal(S.isIsoDate("2026-01-32"), false);
  assert.equal(S.isIsoDate("15.09.2026"), false);
  assert.equal(S.isIsoDate("2026/09/15"), false);
  assert.equal(S.isIsoDate("2026-9-15"), false);
  assert.equal(S.isIsoDate("tomorrow"), false);
  assert.equal(S.isIsoDate(""), false);
  assert.equal(S.isIsoDate(null), false);
  assert.equal(S.isIsoDate(undefined), false);
  assert.equal(S.isIsoDate(20260915), false);
});

test("sanitizeStringArray removes invalid, blank and normalized duplicates", () => {
  assert.deepEqual(
    S.sanitizeStringArray([" crash ", "", null, "inventory", 4, "CRASH", " inventory  ", undefined, "   "]),
    ["crash", "inventory"]
  );
  assert.deepEqual(S.sanitizeStringArray(null), []);
  assert.deepEqual(S.sanitizeStringArray(undefined), []);
  assert.deepEqual(S.sanitizeStringArray("not an array"), []);
  assert.deepEqual(S.sanitizeStringArray(123), []);
  assert.deepEqual(S.sanitizeStringArray({}), []);
  assert.deepEqual(S.sanitizeStringArray([]), []);

  const twentyItems = Array.from({ length: 20 }, (_, i) => `label_${i}`);
  assert.equal(S.sanitizeStringArray(twentyItems).length, 20);

  const twentyOneItems = Array.from({ length: 21 }, (_, i) => `label_${i}`);
  assert.equal(S.sanitizeStringArray(twentyOneItems).length, 21);
});

test("utf8ByteLength measures bytes rather than JavaScript characters", () => {
  assert.equal(S.utf8ByteLength("abc"), 3);
  assert.equal(S.utf8ByteLength("ä"), 2);
  assert.equal(S.utf8ByteLength("€"), 3);
  assert.equal(S.utf8ByteLength("中"), 3);
  assert.equal(S.utf8ByteLength("😀"), 4);
  assert.equal(S.utf8ByteLength(""), 0);
  assert.equal(S.utf8ByteLength(null), 0);
});

test("parseClipboardTicket accepts a valid schema-1 JSON object", () => {
  const result = parse(JSON.stringify({ schema_version: 1, summary: "Bug" }));
  assert.equal(result.ok, true);
  assert.equal(result.ticket.summary, "Bug");
});

test("parseClipboardTicket accepts leading JSON whitespace and one UTF-8 BOM", () => {
  assert.equal(parse('  {"schema_version":1}').ok, true);
  assert.equal(parse('\ufeff{"schema_version":1}').ok, true);
  assert.equal(parse('\r\n\t {"schema_version":1}').ok, true);
});

test("parseClipboardTicket accepts unknown keys without interpreting them", () => {
  const result = parse('{"schema_version":1,"unknown_future_key":"ignored","extra":123}');
  assert.equal(result.ok, true);
  assert.equal(result.ticket.unknown_future_key, "ignored");
  assert.equal(result.ticket.extra, 123);
});

test("parseClipboardTicket rejects empty and whitespace-only clipboard text", () => {
  assert.equal(parse("").ok, false);
  assert.equal(parse("   ").ok, false);
  assert.equal(parse("\n\t\r").ok, false);
  assert.equal(parse(null).ok, false);
  assert.equal(parse(undefined).ok, false);
});

test("parseClipboardTicket rejects malformed JSON", () => {
  assert.equal(parse("{bad").ok, false);
  assert.equal(parse("{").ok, false);
  assert.equal(parse("undefined").ok, false);
});

test("parseClipboardTicket rejects non-object JSON roots", () => {
  for (const value of ["[]", "[1, 2]", "null", '"text"', "42", "true", "false"]) {
    assert.equal(parse(value).ok, false, value);
  }
});

test("parseClipboardTicket requires schema_version", () => {
  const result = parse('{"summary":"Bug"}');
  assert.equal(result.ok, false);
  assert.match(result.error, /Missing schema_version/);
});

test("parseClipboardTicket rejects wrong schema version and wrong version type", () => {
  assert.equal(parse('{"schema_version":2}').ok, false);
  assert.equal(parse('{"schema_version":0}').ok, false);
  assert.equal(parse('{"schema_version":-1}').ok, false);
  assert.equal(parse('{"schema_version":1.5}').ok, false);
  assert.equal(parse('{"schema_version":"1"}').ok, false);
  assert.equal(parse('{"schema_version":true}').ok, false);
  assert.equal(parse('{"schema_version":null}').ok, false);
  assert.equal(parse('{"schema_version":[1]}').ok, false);
  assert.equal(parse('{"schema_version":{"v":1}}').ok, false);
});

test("parseClipboardTicket accepts an exact ASCII byte boundary", () => {
  const prefix = '{"schema_version":1,"summary":"';
  const suffix = '"}';
  const exact = `${prefix}${"a".repeat(100 - prefix.length - suffix.length)}${suffix}`;
  assert.equal(S.utf8ByteLength(exact), 100);
  assert.equal(parse(exact, 100).ok, true);
  assert.equal(parse(`${exact} `, 100).ok, false);
});

test("parseClipboardTicket enforces the byte boundary for multibyte Unicode", () => {
  const value = '{"schema_version":1,"summary":"ä"}';
  const bytes = S.utf8ByteLength(value);
  assert.equal(parse(value, bytes).ok, true);
  assert.equal(parse(value, bytes - 1).ok, false);
});

test("normalizedExactMatch is exact except whitespace/case normalization", () => {
  assert.equal(S.normalizedExactMatch("High", " high "), true);
  assert.equal(S.normalizedExactMatch("  Single   PLAYER \n", "single player"), true);
  assert.equal(S.normalizedExactMatch("Single", "Single player"), false);
  assert.equal(S.normalizedExactMatch("High", "Highest"), false);
  assert.equal(S.normalizedExactMatch("123", " 123 "), true);
});
