"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "manifest.json");

const hostArg = process.argv[2];
if (!hostArg) {
  console.error("Usage: node tools/configure-jira-host.cjs <hostname.atlassian.net>");
  process.exit(2);
}

let hostName = hostArg.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
const hostPattern = /^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+atlassian\.net$/;

if (!hostPattern.test(hostName)) {
  console.error(`Expected an exact Jira Cloud hostname such as company.atlassian.net, got: ${hostName}`);
  process.exit(1);
}

const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
const placeholder = "YOUR-COMPANY.atlassian.net";

const placeholderMatches = (raw.match(new RegExp(placeholder.replace(/\./g, "\\."), "g")) || []).length;
const requestedMatches = (raw.match(new RegExp(hostName.replace(/\./g, "\\."), "g")) || []).length;

if (placeholderMatches === 0 && requestedMatches === 2) {
  console.log(`manifest.json is already configured for: ${hostName}`);
  process.exit(0);
}

if (placeholderMatches !== 2) {
  console.error(`Expected exactly two Jira hostname placeholders in manifest.json, found: ${placeholderMatches}. Refusing blind replacement.`);
  process.exit(1);
}

const updated = raw.replaceAll(placeholder, hostName);
try {
  JSON.parse(updated);
} catch (err) {
  console.error(`Replacement produced invalid manifest JSON: ${err.message}. Nothing was written.`);
  process.exit(1);
}

fs.writeFileSync(MANIFEST_PATH, updated, "utf8");

console.log(`Configured Jira hostname in manifest.json: ${hostName}`);
console.log("Run: node tools/preflight.cjs");
console.log("Then reload the temporary extension in about:debugging and reload Jira.");
