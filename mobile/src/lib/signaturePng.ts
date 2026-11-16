// Pure-JS grayscale PNG encoder for signatures: no native module, works on
// Android, iOS and web. Uses uncompressed (stored) deflate blocks, so a
// 360x150 image is ~54 KB raw / ~72 KB base64, well under the 300 KB limit.
export type Stroke = { x: number; y: number }[];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array, start: number, end: number) {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64(bytes: Uint8Array) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)] + (b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)]) + (c === undefined ? '=' : B64[c & 63]);
  }
  return out;
}

/** Rasterises strokes (in a box of `boxWidth` x `boxHeight` points) into a PNG data URI. */
export function signatureToPng(strokes: Stroke[], boxWidth: number, boxHeight: number, width = 360, height = 150) {
  const sx = width / Math.max(1, boxWidth), sy = height / Math.max(1, boxHeight);
  const pixels = new Uint8Array(width * height).fill(255);
  const stamp = (cx: number, cy: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = Math.round(cx + dx), y = Math.round(cy + dy);
      if (x >= 0 && y >= 0 && x < width && y < height) pixels[y * width + x] = 0;
    }
  };
  for (const stroke of strokes) {
    for (let i = 0; i < stroke.length; i++) {
      const p = stroke[i], q = stroke[i + 1] || p;
      const x0 = p.x * sx, y0 = p.y * sy, x1 = q.x * sx, y1 = q.y * sy;
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      for (let s = 0; s <= steps; s++) stamp(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps);
    }
  }

  // Raw scanlines, each prefixed with filter type 0.
  const raw = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y++) raw.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);

  // zlib stream with stored blocks + Adler-32.
  const blocks = Math.ceil(raw.length / 65535);
  const zlib = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  let o = 0;
  zlib[o++] = 0x78; zlib[o++] = 0x01;
  for (let b = 0; b < blocks; b++) {
    const chunk = raw.subarray(b * 65535, Math.min(raw.length, (b + 1) * 65535));
    zlib[o++] = b === blocks - 1 ? 1 : 0;
    zlib[o++] = chunk.length & 0xff; zlib[o++] = chunk.length >> 8;
    zlib[o++] = ~chunk.length & 0xff; zlib[o++] = (~chunk.length >> 8) & 0xff;
    zlib.set(chunk, o); o += chunk.length;
  }
  let a = 1, d = 0;
  for (let i = 0; i < raw.length; i++) { a = (a + raw[i]) % 65521; d = (d + a) % 65521; }
  zlib[o++] = d >> 8; zlib[o++] = d & 0xff; zlib[o++] = a >> 8; zlib[o++] = a & 0xff;

  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    view.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const hv = new DataView(ihdr.buffer);
  hv.setUint32(0, width); hv.setUint32(4, height);
  ihdr[8] = 8; ihdr[9] = 0; // 8-bit grayscale
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib), chunk('IEND', new Uint8Array(0))];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) { png.set(p, offset); offset += p.length; }
  return `data:image/png;base64,${base64(png)}`;
}
