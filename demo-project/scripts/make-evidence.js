"use strict";
// Generates small, real evidence assets so the analyzer's HTML report shows working
// screenshot previews and trace/video links. Screenshots are rendered as a simple Meridian
// UI mock (valid PNGs) so previews look like real captures; traces are valid ZIP files;
// videos are tiny placeholder WEBM files.
//
// Note: traces/videos are placeholders — a real Playwright trace/video only comes from an
// actual run. Screenshots are drawn here so demos and screenshots look realistic.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT = path.join(__dirname, "..", "evidence");
fs.mkdirSync(OUT, { recursive: true });

// ---- tiny framebuffer + PNG encoder ----
const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
})();
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}
class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.buf = Buffer.alloc(w * h * 3); }
  fill([r, g, b]) { for (let i = 0; i < this.buf.length; i += 3) { this.buf[i] = r; this.buf[i + 1] = g; this.buf[i + 2] = b; } }
  rect(x, y, w, h, [r, g, b]) {
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) { const i = (yy * this.w + xx) * 3; this.buf[i] = r; this.buf[i + 1] = g; this.buf[i + 2] = b; }
  }
  png() {
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(this.w, 0); ihdr.writeUInt32BE(this.h, 4); ihdr[8] = 8; ihdr[9] = 2;
    const rows = [];
    for (let y = 0; y < this.h; y++) { const row = Buffer.alloc(1 + this.w * 3); this.buf.copy(row, 1, y * this.w * 3, (y + 1) * this.w * 3); rows.push(row); }
    const idat = zlib.deflateSync(Buffer.concat(rows));
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
  }
}

// Draw a believable Meridian screen. accent tints the top bar; every shot shows a red
// error toast (these are failure captures).
function shot(accent, title) {
  const c = new Canvas(560, 340);
  c.fill([244, 246, 251]);              // app background
  c.rect(0, 0, 560, 44, accent);        // top bar
  c.rect(16, 16, 120, 12, [255, 255, 255]); // brand wordmark
  c.rect(470, 14, 74, 16, [255, 255, 255]); // avatar/menu
  c.rect(0, 44, 96, 296, [255, 255, 255]);  // sidebar
  for (let i = 0; i < 6; i++) c.rect(14, 68 + i * 34, 68, 10, [214, 220, 230]); // nav items
  c.rect(112, 60, 180, 14, [60, 66, 82]); // page title
  for (let i = 0; i < 3; i++) c.rect(112 + i * 148, 92, 132, 64, [255, 255, 255]); // stat cards
  for (let i = 0; i < 3; i++) c.rect(124 + i * 148, 104, 60, 20, [accent[0], accent[1], accent[2]]);
  c.rect(112, 172, 432, 150, [255, 255, 255]); // table
  for (let r = 0; r < 6; r++) { c.rect(124, 184 + r * 22, 300, 8, [90, 98, 116]); c.rect(470, 184 + r * 22, 60, 8, [200, 206, 218]); }
  // red error toast
  c.rect(300, 250, 244, 56, [190, 60, 60]);
  c.rect(312, 264, 140, 10, [255, 255, 255]);
  c.rect(312, 282, 200, 8, [255, 220, 220]);
  return c.png();
}

const SHOTS = {
  "checkout-decline": [88, 92, 198], "invoice-500": [176, 84, 84], "archive-hidden": [64, 96, 176],
  "drag-detached": [96, 80, 176], "kpi-mismatch": [60, 140, 110], "session-expired": [180, 140, 60],
  "export-crash": [150, 80, 150], "duplicate-strict": [70, 130, 150], "invite-missing": [170, 100, 80],
  "sso-title": [100, 120, 80], "stream-reset": [140, 90, 90], "toast-race": [90, 130, 130],
};
for (const [name, accent] of Object.entries(SHOTS)) fs.writeFileSync(path.join(OUT, `${name}.png`), shot(accent, name));

// One real, playable video ships as a committed asset — evidence/checkout-decline.webm, a small
// public-domain WebM test clip — so the report has a genuinely working "Open Video" link to demo
// (attached to the Billing "declined card" flaky test alongside its screenshot and trace). It's a
// committed binary, not redrawn here. To use your own capture instead, drop a .webm into evidence/
// and point a catalog entry's `evidence.video` at its basename.

// traces: a valid ZIP containing a note (opens cleanly; a real Playwright trace comes from a run).
function noteZip(text) {
  const data = Buffer.from(text, "utf8");
  const name = Buffer.from("README.txt", "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32LE(CRC(data), 0);
  const lh = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0]), crc, u32(data.length), u32(data.length), u16(name.length), u16(0), name, data]);
  const cd = Buffer.concat([Buffer.from([0x50, 0x4b, 0x01, 0x02, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0]), crc, u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), name]);
  const eocd = Buffer.concat([Buffer.from([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 1, 0, 1, 0]), u32(cd.length), u32(lh.length), u16(0)]);
  return Buffer.concat([lh, cd, eocd]);
  function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n, 0); return b; }
  function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n, 0); return b; }
}
for (const name of Object.keys(SHOTS))
  fs.writeFileSync(path.join(OUT, `${name}.trace.zip`), noteZip("Demo trace placeholder for " + name + ".\nA real Playwright trace is produced by running the suite with trace: 'retain-on-failure'."));

console.log("evidence assets written to", OUT, "-", fs.readdirSync(OUT).length, "files (screenshots are UI mocks; traces are valid zips; one playable checkout-decline.webm is shipped)");
