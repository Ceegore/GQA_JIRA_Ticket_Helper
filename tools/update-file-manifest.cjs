"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "FILE_MANIFEST_SHA256.txt");
const EXCLUDED_TOP_LEVEL = new Set([".git", "dist"]);

function enumerate(directory, prefix = "") {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (prefix === "" && EXCLUDED_TOP_LEVEL.has(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...enumerate(absolute, relative));
    else if (entry.isFile() && relative !== "FILE_MANIFEST_SHA256.txt") output.push(relative);
  }
  return output;
}

const lines = enumerate(ROOT)
  .sort((a, b) => a.localeCompare(b, "en"))
  .map((relative) => {
    const digest = crypto.createHash("sha256")
      .update(fs.readFileSync(path.join(ROOT, relative)))
      .digest("hex");
    return `${digest}  ./${relative}`;
  });

fs.writeFileSync(OUTPUT, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${lines.length} SHA-256 entries to ${path.relative(process.cwd(), OUTPUT)}.`);
