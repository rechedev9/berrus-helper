/**
 * Generate minimal valid PNG placeholder icons.
 * These are solid purple squares — enough to load the extension in Chrome.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = import.meta.dir.replace("/scripts", "");
const ICONS_DIR = join(ROOT, "public", "icons");

if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true });
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const combined = new Uint8Array(typeBytes.length + data.length);
  combined.set(typeBytes, 0);
  combined.set(data, typeBytes.length);
  const crc = crc32(combined);

  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc);
  return chunk;
}

function createPng(size: number): Uint8Array {
  // IHDR: width, height, bit depth 8, color type 2 (RGB)
  const ihdrData = new Uint8Array(13);
  const ihdrView = new DataView(ihdrData.buffer);
  ihdrView.setUint32(0, size);
  ihdrView.setUint32(4, size);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  // Image data: each row = filter byte (0) + RGB pixels
  const rowSize = 1 + size * 3;
  const rawData = new Uint8Array(rowSize * size);
  const PURPLE_R = 124;
  const PURPLE_G = 58;
  const PURPLE_B = 237;

  for (let y = 0; y < size; y++) {
    const rowStart = y * rowSize;
    rawData[rowStart] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 3;
      rawData[px] = PURPLE_R;
      rawData[px + 1] = PURPLE_G;
      rawData[px + 2] = PURPLE_B;
    }
  }

  // Compress with deflate (Bun supports this)
  const compressed = Bun.deflateSync(rawData);

  // Wrap in zlib format: CMF + FLG + compressed + adler32
  const adler = adler32(rawData);
  const zlibData = new Uint8Array(2 + compressed.length + 4);
  zlibData[0] = 0x78; // CMF
  zlibData[1] = 0x01; // FLG
  zlibData.set(compressed, 2);
  const adlerView = new DataView(zlibData.buffer, 2 + compressed.length);
  adlerView.setUint32(0, adler);

  const ihdr = createPngChunk("IHDR", ihdrData);
  const idat = createPngChunk("IDAT", zlibData);
  const iend = createPngChunk("IEND", new Uint8Array(0));

  // PNG signature + chunks
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = new Uint8Array(
    signature.length + ihdr.length + idat.length + iend.length,
  );
  let offset = 0;
  png.set(signature, offset);
  offset += signature.length;
  png.set(ihdr, offset);
  offset += ihdr.length;
  png.set(idat, offset);
  offset += idat.length;
  png.set(iend, offset);

  return png;
}

function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of data) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

const SIZES = [16, 48, 128] as const;

for (const size of SIZES) {
  const png = createPng(size);
  writeFileSync(join(ICONS_DIR, `icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png (${png.length} bytes)`);
}
