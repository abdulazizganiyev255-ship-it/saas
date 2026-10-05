import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createSolidPNG(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([typeBuf, data]);
    const crc = calcCRC(crcBuf);
    const crcOut = Buffer.alloc(4);
    crcOut.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcOut]);
  }

  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }

  function calcCRC(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return c ^ 0xffffffff;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      const factor = (x + y) / (width + height);
      rawData[pxOffset] = Math.round(r * (1 - factor * 0.3));
      rawData[pxOffset + 1] = Math.round(g * (1 - factor * 0.2));
      rawData[pxOffset + 2] = Math.round(b + (255 - b) * factor * 0.4);
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, chunk('IHDR', ihdr), idat, iend]);
}

const pubDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(pubDir)) {
  fs.mkdirSync(pubDir, { recursive: true });
}

fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), createSolidPNG(192, 192, 79, 70, 229));
fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), createSolidPNG(512, 512, 79, 70, 229));
fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), createSolidPNG(512, 512, 99, 102, 241));
fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), createSolidPNG(180, 180, 79, 70, 229));
fs.writeFileSync(path.join(pubDir, 'favicon.ico'), createSolidPNG(32, 32, 99, 102, 241));

console.log('PWA icons successfully written to', pubDir);
