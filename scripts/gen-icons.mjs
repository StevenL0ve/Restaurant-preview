// Generates CoParent app icons as real PNGs with zero dependencies.
// Draws the brand mark (a teal rounded tile with a white "◐" half-disc) at the
// sizes the app stores and PWA manifest require. Run: `node scripts/gen-icons.mjs`.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const TEAL = [15, 118, 110]; // #0f766e
const TEAL_DARK = [13, 94, 88];
const WHITE = [255, 255, 255];

// --- minimal PNG encoder ---------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rows with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- drawing ---------------------------------------------------------------
function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function drawIcon(size, { padding = 0 } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const radius = size * 0.22; // rounded-corner radius
  const inset = size * padding;
  const cx = size / 2;
  const cy = size / 2;
  const circleR = (size / 2 - inset) * 0.56;
  const stroke = size * 0.045;

  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // rounded-rect background mask
      const rx = Math.min(x - inset, size - inset - 1 - x);
      const ry = Math.min(y - inset, size - inset - 1 - y);
      let inside = rx >= 0 && ry >= 0;
      if (inside && rx < radius && ry < radius) {
        const dx = radius - rx;
        const dy = radius - ry;
        if (dx * dx + dy * dy > radius * radius) inside = false;
      }
      if (!inside) {
        set(x, y, [0, 0, 0], 0); // transparent outside the tile
        continue;
      }
      // diagonal teal gradient background
      const t = (x + y) / (2 * size);
      let color = lerp(TEAL, TEAL_DARK, t);

      // the "◐" mark: outlined circle with the left half filled white
      const dist = Math.hypot(x - cx, y - cy);
      if (dist <= circleR) {
        if (dist >= circleR - stroke) color = WHITE; // ring
        else if (x < cx) color = WHITE; // filled left half
      }
      set(x, y, color);
    }
  }
  return encodePNG(size, size, buf);
}

mkdirSync(new URL("../public/icons/", import.meta.url), { recursive: true });
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url);

const jobs = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-maskable-512.png", 512, { padding: 0.1 }],
  ["apple-touch-icon-180.png", 180, {}],
  ["favicon-32.png", 32, {}],
];
for (const [name, size, opts] of jobs) {
  writeFileSync(out(name), drawIcon(size, opts));
  console.log("wrote", name, `${size}x${size}`);
}
