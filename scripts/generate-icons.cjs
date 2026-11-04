const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function createPNG(width, height, drawFn) {
  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowStride);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // No interlace

  const ihdrChunk = Buffer.concat([
    Buffer.from('IHDR'),
    ihdrData
  ]);
  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(ihdrChunk), 0);

  // IDAT
  const idatChunk = Buffer.concat([
    Buffer.from('IDAT'),
    compressedData
  ]);
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressedData.length, 0);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(idatChunk), 0);

  // IEND
  const iendChunk = Buffer.from('IEND');
  const iendLen = Buffer.alloc(4);
  iendLen.writeUInt32BE(0, 0);
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendChunk), 0);

  return Buffer.concat([
    signature,
    ihdrLen,
    ihdrChunk,
    ihdrCrc,
    idatLen,
    idatChunk,
    idatCrc,
    iendLen,
    iendChunk,
    iendCrc
  ]);
}

// Drawing function for FireArena Pro logo
function drawFireArenaIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background: Dark midnight navy (#0b0e14)
  let bgR = 11, bgG = 14, bgB = 20;

  // Outer circular shield / border with gold accent
  const outerBorderWidth = w * 0.05;
  const innerRadius = r - outerBorderWidth;

  if (dist > r) {
    // Transparent outside icon boundary (for maskable corners, keep background solid inside standard box)
    return [bgR, bgG, bgB, 255];
  }

  // Golden glowing ring
  if (dist >= innerRadius && dist <= r) {
    const t = (dist - innerRadius) / outerBorderWidth;
    // Gold gradient (#f59e0b to #fbbf24)
    return [245, 158 + Math.floor(t * 33), 11 + Math.floor(t * 25), 255];
  }

  // Inner subtle radial dark glow
  const normDist = dist / innerRadius;
  bgR = Math.floor(11 + (1 - normDist) * 15);
  bgG = Math.floor(14 + (1 - normDist) * 20);
  bgB = Math.floor(20 + (1 - normDist) * 35);

  // Flame / Gamepad Center Emblem
  // 1. Stylized Fire Flame Shape:
  // Center is at (cx, cy + h*0.05)
  const fx = (x - cx) / (w * 0.35);
  const fy = (y - (cy + h * 0.08)) / (h * 0.38);

  // Heart-inverted flame curve: (fx^2 + (fy - sqrt(|fx|))^2 <= 1)
  const absFx = Math.abs(fx);
  const flameEq = (fx * fx * 1.3) + Math.pow(fy + absFx * 0.45, 2);

  if (flameEq <= 0.95 && fy < 0.85) {
    // Flame gradient: Outer fiery orange/red (#ea580c), center bright amber (#f59e0b) to yellow (#fef08a)
    const flameRatio = Math.sqrt(flameEq);
    if (flameRatio < 0.45) {
      // Inner core: bright golden yellow
      return [254, 240, 138, 255];
    } else if (flameRatio < 0.75) {
      // Mid flame: amber orange
      return [245, 158, 11, 255];
    } else {
      // Outer flame: crimson fire
      return [234, 88, 12, 255];
    }
  }

  // 2. Cyan Crosshair / Esports Diamond Inlay
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const diamondDist = (absDx + absDy) / (w * 0.22);
  if (diamondDist >= 0.88 && diamondDist <= 1.05 && (absDx < w * 0.04 || absDy < h * 0.04)) {
    // Neon Cyan targeting reticle (#00f2fe)
    return [0, 242, 254, 255];
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate icon-192.png
const png192 = createPNG(192, 192, drawFireArenaIcon);
const path192 = path.join(publicDir, 'icon-192.png');
fs.writeFileSync(path192, png192);
console.log(`Generated ${path192} (${png192.length} bytes)`);

// Generate icon-512.png
const png512 = createPNG(512, 512, drawFireArenaIcon);
const path512 = path.join(publicDir, 'icon-512.png');
fs.writeFileSync(path512, png512);
console.log(`Generated ${path512} (${png512.length} bytes)`);
