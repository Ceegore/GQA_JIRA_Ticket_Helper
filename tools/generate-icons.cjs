"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

// CRC32 table
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

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // Color type 6 (RGBA)
  ihdrData[10] = 0; // Compression deflate
  ihdrData[11] = 0; // Filter adaptive
  ihdrData[12] = 0; // Interlace none
  const ihdrChunk = createChunk("IHDR", ihdrData);

  // Scanlines with filter byte 0 (None)
  const rowStride = width * 4;
  const rawData = Buffer.alloc(height * (1 + rowStride));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + rowStride);
    rawData[rowOffset] = 0; // Filter type 0
    rgbaBuffer.copy(rawData, rowOffset + 1, y * rowStride, (y + 1) * rowStride);
  }

  const idatData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk("IDAT", idatData);

  // IEND
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function drawIcon(size) {
  const buffer = Buffer.alloc(size * size * 4, 0); // start transparent

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (Math.floor(y) * size + Math.floor(x)) * 4;
    const existingA = buffer[idx + 3] / 255;
    const newA = a / 255;
    const outA = newA + existingA * (1 - newA);
    if (outA <= 0) return;
    buffer[idx] = Math.round((r * newA + buffer[idx] * existingA * (1 - newA)) / outA);
    buffer[idx + 1] = Math.round((g * newA + buffer[idx + 1] * existingA * (1 - newA)) / outA);
    buffer[idx + 2] = Math.round((b * newA + buffer[idx + 2] * existingA * (1 - newA)) / outA);
    buffer[idx + 3] = Math.round(outA * 255);
  }

  function fillCircle(cx, cy, radius, r, g, b, a) {
    const minX = Math.max(0, Math.floor(cx - radius - 1));
    const maxX = Math.min(size - 1, Math.ceil(cx + radius + 1));
    const minY = Math.max(0, Math.floor(cy - radius - 1));
    const maxY = Math.min(size - 1, Math.ceil(cy + radius + 1));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (dist <= radius) {
          const edge = radius - dist;
          const alpha = edge < 1 ? Math.min(1, Math.max(0, edge)) * a : a;
          setPixel(x, y, r, g, b, alpha);
        }
      }
    }
  }

  function fillRoundedRect(x0, y0, w, h, radius, r, g, b, a) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        if (px >= x0 && px <= x0 + w && py >= y0 && py <= y0 + h) {
          const dx = Math.max(0, Math.max(x0 + radius - px, px - (x0 + w - radius)));
          const dy = Math.max(0, Math.max(y0 + radius - py, py - (y0 + h - radius)));
          const dist = Math.hypot(dx, dy);
          if (dist <= radius) {
            const edge = radius - dist;
            const alpha = edge < 1 ? Math.min(1, Math.max(0, edge)) * a : a;
            setPixel(x, y, r, g, b, alpha);
          }
        }
      }
    }
  }

  function drawLine(x1, y1, x2, y2, thickness, r, g, b, a) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(length * 3);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      fillCircle(x, y, thickness / 2, r, g, b, a);
    }
  }

  const s = size / 32;

  // Background rounded squircle
  fillRoundedRect(1.5 * s, 1.5 * s, 29 * s, 29 * s, 6 * s, 15, 23, 42, 255); // #0f172a
  fillRoundedRect(2.5 * s, 2.5 * s, 27 * s, 27 * s, 5 * s, 30, 41, 59, 255); // #1e293b

  // Bug body / Ticket shape
  fillCircle(16 * s, 17 * s, 7 * s, 20, 184, 166, 255); // #14b8a6
  fillCircle(16 * s, 9 * s, 3.5 * s, 13, 148, 136, 255); // #0d9488

  // Antennae
  drawLine(14.5 * s, 7 * s, 11 * s, 4 * s, 1.5 * s, 45, 212, 191, 255);
  drawLine(17.5 * s, 7 * s, 21 * s, 4 * s, 1.5 * s, 45, 212, 191, 255);
  fillCircle(10.5 * s, 3.5 * s, 1.2 * s, 45, 212, 191, 255);
  fillCircle(21.5 * s, 3.5 * s, 1.2 * s, 45, 212, 191, 255);

  // Bug legs
  drawLine(10 * s, 13 * s, 6 * s, 10 * s, 1.4 * s, 45, 212, 191, 255);
  drawLine(22 * s, 13 * s, 26 * s, 10 * s, 1.4 * s, 45, 212, 191, 255);
  drawLine(9 * s, 17 * s, 5 * s, 17 * s, 1.4 * s, 45, 212, 191, 255);
  drawLine(23 * s, 17 * s, 27 * s, 17 * s, 1.4 * s, 45, 212, 191, 255);
  drawLine(10 * s, 21 * s, 6 * s, 24 * s, 1.4 * s, 45, 212, 191, 255);
  drawLine(22 * s, 21 * s, 26 * s, 24 * s, 1.4 * s, 45, 212, 191, 255);

  // Checkmark on the back
  drawLine(12 * s, 17 * s, 15 * s, 20 * s, 2.2 * s, 255, 255, 255, 255);
  drawLine(15 * s, 20 * s, 20.5 * s, 13.5 * s, 2.2 * s, 255, 255, 255, 255);

  return encodePNG(size, size, buffer);
}

const iconsDir = path.resolve(__dirname, "..", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [16, 32, 48, 64, 96, 512];
for (const size of sizes) {
  const png = drawIcon(size);
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${png.length} bytes)`);
}
