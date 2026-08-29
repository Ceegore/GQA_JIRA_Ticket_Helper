/*
 * Shared pure helpers. This file intentionally contains no Jira-specific DOM code.
 * It is used by the extension and by Node's built-in test runner.
 */

(function initShared(globalObject) {
  "use strict";

  function normalizeText(value) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isNonBlankString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function isFiniteNonNegativeNumber(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }

  function isIsoDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  function sanitizeStringArray(value) {
    if (!Array.isArray(value)) return [];

    const seen = new Set();
    const output = [];

    for (const item of value) {
      if (!isNonBlankString(item)) continue;
      const trimmed = item.trim();
      const normalized = normalizeText(trimmed);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      output.push(trimmed);
    }

    return output;
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function utf8ByteLength(value) {
    const text = String(value ?? "");
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(text).byteLength;
    }

    // TextEncoder exists in supported Firefox and current Node versions. This
    // deterministic fallback counts UTF-8 bytes without deprecated globals.
    let bytes = 0;
    for (const symbol of text) {
      const codePoint = symbol.codePointAt(0);
      if (codePoint <= 0x7f) bytes += 1;
      else if (codePoint <= 0x7ff) bytes += 2;
      else if (codePoint <= 0xffff) bytes += 3;
      else bytes += 4;
    }
    return bytes;
  }

  function parseClipboardTicket(rawText, expectedSchemaVersion, maxBytes) {
    if (typeof rawText !== "string") {
      return { ok: false, error: "Clipboard does not contain text." };
    }

    if (rawText.length === 0) {
      return { ok: false, error: "Clipboard is empty." };
    }

    if (utf8ByteLength(rawText) > maxBytes) {
      return { ok: false, error: "Clipboard content is too large." };
    }

    // A UTF-8 BOM can be introduced by Windows-oriented tooling. Ignore one
    // leading BOM only; do not trim or otherwise rewrite the JSON text.
    const jsonText = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return { ok: false, error: "Clipboard does not contain valid JSON." };
    }

    if (!isPlainObject(parsed)) {
      return { ok: false, error: "Ticket JSON must be an object." };
    }

    if (!Object.prototype.hasOwnProperty.call(parsed, "schema_version")) {
      return {
        ok: false,
        error: `Missing schema_version. Expected ${expectedSchemaVersion}.`
      };
    }

    if (parsed.schema_version !== expectedSchemaVersion) {
      return {
        ok: false,
        error: `Unsupported schema_version. Expected ${expectedSchemaVersion}.`
      };
    }

    return { ok: true, ticket: parsed };
  }

  function normalizedExactMatch(a, b) {
    return normalizeText(a) === normalizeText(b);
  }

  const api = Object.freeze({
    normalizeText,
    isNonBlankString,
    isFiniteNonNegativeNumber,
    isIsoDate,
    sanitizeStringArray,
    isPlainObject,
    utf8ByteLength,
    parseClipboardTicket,
    normalizedExactMatch
  });

  globalObject.GQAShared = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
