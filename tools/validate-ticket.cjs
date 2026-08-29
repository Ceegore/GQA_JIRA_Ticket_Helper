"use strict";

const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const S = require(path.join(ROOT, "shared.js"));
require(path.join(ROOT, "config.js"));
const C = globalThis.GQA_CONFIG;

const args = process.argv.slice(2);
const fileArg = args.find((arg) => !arg.startsWith("--"));
const allowedIndex = args.indexOf("--allowed");
const allowedPath = allowedIndex >= 0 ? args[allowedIndex + 1] : null;

if (!fileArg) {
  console.error("Usage: node tools/validate-ticket.cjs <ticket.json> [--allowed dom/JIRA_ALLOWED_VALUES_TEMPLATE.json]");
  process.exit(2);
}

const ticketPath = path.resolve(process.cwd(), fileArg);
const raw = fs.readFileSync(ticketPath, "utf8");
const parsed = S.parseClipboardTicket(raw, C.SCHEMA_VERSION, C.MAX_CLIPBOARD_BYTES);
if (!parsed.ok) {
  console.error(`[INVALID PAYLOAD] ${parsed.error}`);
  process.exit(1);
}

const t = parsed.ticket;
let allowed = null;
if (allowedPath) {
  allowed = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), allowedPath), "utf8"));
}

const checks = [
  ["summary", "string", S.isNonBlankString(t.summary)],
  ["description", "string", S.isNonBlankString(t.description)],
  ["tester", "string", S.isNonBlankString(t.tester)],
  ["build_version_spotted", "string", S.isNonBlankString(t.build_version_spotted)],
  ["build_version_released", "string", S.isNonBlankString(t.build_version_released)],
  ["branch", "string", S.isNonBlankString(t.branch)],
  ["labels", "array", S.sanitizeStringArray(t.labels).length > 0],
  ["priority", "string", S.isNonBlankString(t.priority)],
  ["severity", "string", S.isNonBlankString(t.severity)],
  ["game_mode", "string", S.isNonBlankString(t.game_mode)],
  ["affected_player", "string", S.isNonBlankString(t.affected_player)],
  ["repro_rate", "string", S.isNonBlankString(t.repro_rate)],
  ["due_date", "date", S.isIsoDate(t.due_date)],
  ["working_hours", "number", S.isFiniteNonNegativeNumber(t.working_hours)],
  ["origin", "string", S.isNonBlankString(t.origin)],
  ["flagged_impediment", "true-only", t.flagged_impediment === true]
];

console.log(`Payload JSON: valid object (schema ${t.schema_version})`);
for (const [key, type, valid] of checks) {
  console.log(`${valid ? "VALID/ACTIONABLE" : "SKIP/EMPTY/INVALID"}\t${key}\t${type}`);
}

if (allowed) {
  const exactKeys = ["tester", "build_version_spotted", "build_version_released", "branch", "priority", "severity", "game_mode", "affected_player", "repro_rate", "origin"];
  console.log("\nAllowed-value checks (only non-empty catalogs are enforced here):");
  for (const key of exactKeys) {
    const catalogKey = key === "tester" ? "tester_display_names" : key;
    const catalog = Array.isArray(allowed[catalogKey]) ? allowed[catalogKey] : [];
    if (catalog.length === 0 || !S.isNonBlankString(t[key])) continue;
    const match = catalog.some((value) => S.normalizedExactMatch(value, t[key]));
    console.log(`${match ? "MATCH" : "NO MATCH"}\t${key}\t${t[key]}`);
  }
  const labelCatalog = Array.isArray(allowed.labels) ? allowed.labels : [];
  if (labelCatalog.length > 0) {
    for (const label of S.sanitizeStringArray(t.labels)) {
      const match = labelCatalog.some((value) => S.normalizedExactMatch(value, label));
      console.log(`${match ? "MATCH" : "NO MATCH"}\tlabel\t${label}`);
    }
  }
}
