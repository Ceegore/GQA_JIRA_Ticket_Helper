"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const STAGE = path.join(DIST, "runtime-stage");
const ZIP_PATH = path.join(DIST, "gqa-jira-bug-reporter-helper-runtime.zip");
const XPI_PATH = path.join(DIST, "gqa-jira-bug-reporter-helper-runtime.xpi");

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(filesMap) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const [relPath, fileBuf] of filesMap.entries()) {
    const normPath = relPath.replace(/\\/g, "/");
    const pathBuf = Buffer.from(normPath, "utf8");
    const fileCrc = crc32(fileBuf);
    const deflated = zlib.deflateRawSync(fileBuf, { level: 9 });

    // Local file header (30 bytes)
    const local = Buffer.alloc(30 + pathBuf.length);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4); // min version 2.0
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // compression DEFLATE
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0, 12); // mod date
    local.writeUInt32LE(fileCrc, 14); // crc32
    local.writeUInt32LE(deflated.length, 18); // compressed size
    local.writeUInt32LE(fileBuf.length, 22); // uncompressed size
    local.writeUInt16LE(pathBuf.length, 26); // file name length
    local.writeUInt16LE(0, 28); // extra field length
    pathBuf.copy(local, 30);

    const localOffset = offset;
    localHeaders.push(local, deflated);
    offset += local.length + deflated.length;

    // Central directory header (46 bytes)
    const central = Buffer.alloc(46 + pathBuf.length);
    central.writeUInt32LE(0x02014b50, 0); // signature
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // min version
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(8, 10); // compression DEFLATE
    central.writeUInt16LE(0, 12); // mod time
    central.writeUInt16LE(0, 14); // mod date
    central.writeUInt32LE(fileCrc, 16); // crc32
    central.writeUInt32LE(deflated.length, 20); // compressed size
    central.writeUInt32LE(fileBuf.length, 24); // uncompressed size
    central.writeUInt16LE(pathBuf.length, 28); // file name length
    central.writeUInt16LE(0, 30); // extra field length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(localOffset, 42); // offset of local header
    pathBuf.copy(central, 46);

    centralHeaders.push(central);
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const c of centralHeaders) {
    centralSize += c.length;
  }

  // End of Central Directory (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with central dir
  eocd.writeUInt16LE(filesMap.size, 8); // total entries on this disk
  eocd.writeUInt16LE(filesMap.size, 10); // total entries
  eocd.writeUInt32LE(centralSize, 12); // size of central dir
  eocd.writeUInt32LE(centralStart, 16); // offset of central dir
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

function main() {
  const isRelease = process.argv.includes("--release");
  const preflightArgs = isRelease ? ["tools/preflight.cjs", "--release"] : ["tools/preflight.cjs"];
  
  console.log(`Running preflight check...`);
  const preflight = spawnSync(process.execPath, preflightArgs, {
    cwd: ROOT,
    stdio: "inherit"
  });

  if (preflight.status !== 0) {
    console.error("Preflight check failed. Packaging aborted.");
    process.exit(1);
  }

  if (fs.existsSync(STAGE)) {
    fs.rmSync(STAGE, { recursive: true, force: true });
  }
  fs.mkdirSync(STAGE, { recursive: true });
  fs.mkdirSync(DIST, { recursive: true });

  const runtimeListPath = path.join(ROOT, "RUNTIME_FILE_LIST.txt");
  const runtimeFiles = fs.readFileSync(runtimeListPath, "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const filesMap = new Map();

  for (const file of runtimeFiles) {
    const src = path.join(ROOT, file);
    if (!fs.existsSync(src)) {
      throw new Error(`Runtime file missing: ${file}`);
    }
    const dest = path.join(STAGE, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);

    filesMap.set(file, fs.readFileSync(src));
  }

  const zipBuf = buildZip(filesMap);
  fs.writeFileSync(ZIP_PATH, zipBuf);
  fs.copyFileSync(ZIP_PATH, XPI_PATH);

  console.log(`\nCreated runtime-only package:`);
  console.log(`  ${ZIP_PATH} (${zipBuf.length} bytes)`);
  console.log(`  ${XPI_PATH} (${zipBuf.length} bytes)`);
  console.log(`NOTE: This builds the runtime package. Final Mozilla signing remains required.`);
}

main();
