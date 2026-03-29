import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICON_DIR = join(__dirname, "..", "src-tauri", "icons");

// Default color — steel blue from VISION.md
const color = process.argv[2] || "#4A6FA5";

function makeSvg(size, bgColor) {
  const rx = Math.round(size * 0.22); // rounded corner ratio like iOS
  // All coordinates designed for 512 viewBox, scaled via viewBox
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${Math.round(512 * 0.22)}" fill="${bgColor}"/>
  <g fill="white">
    <!-- Body: pear/bell shape -->
    <ellipse cx="256" cy="320" rx="110" ry="135"/>
    <!-- Head -->
    <circle cx="256" cy="185" r="85"/>
    <!-- Neck fill -->
    <rect x="185" y="185" width="142" height="80"/>
    <!-- Left flipper -->
    <path d="M150 240 C125 260 115 310 125 345 L150 330 C148 300 148 270 150 240Z"/>
    <!-- Right flipper -->
    <path d="M362 240 C387 260 397 310 387 345 L362 330 C364 300 364 270 362 240Z"/>
    <!-- Left foot -->
    <ellipse cx="215" cy="445" rx="32" ry="14"/>
    <!-- Right foot -->
    <ellipse cx="297" cy="445" rx="32" ry="14"/>
  </g>
</svg>`;
}

async function generate() {
  const svg512 = Buffer.from(makeSvg(512, color));

  // Generate PNGs at required sizes
  const sizes = [
    { name: "32x32.png", size: 32 },
    { name: "128x128.png", size: 128 },
    { name: "128x128@2x.png", size: 256 },
    { name: "icon.png", size: 512 },
    // Windows Store
    { name: "Square30x30Logo.png", size: 30 },
    { name: "Square44x44Logo.png", size: 44 },
    { name: "Square71x71Logo.png", size: 71 },
    { name: "Square89x89Logo.png", size: 89 },
    { name: "Square107x107Logo.png", size: 107 },
    { name: "Square142x142Logo.png", size: 142 },
    { name: "Square150x150Logo.png", size: 150 },
    { name: "Square284x284Logo.png", size: 284 },
    { name: "Square310x310Logo.png", size: 310 },
    { name: "StoreLogo.png", size: 50 },
  ];

  for (const { name, size } of sizes) {
    const svg = Buffer.from(makeSvg(size, color));
    await sharp(svg).resize(size, size).png().toFile(join(ICON_DIR, name));
    console.log(`  ${name}`);
  }

  // Generate ICO (Windows) — 256x256 PNG inside ICO container
  // sharp can output ico via raw PNG, but Tauri wants a proper .ico
  // We'll create a multi-size ICO manually
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    icoSizes.map(async (s) => {
      const svg = Buffer.from(makeSvg(s, color));
      return { size: s, buf: await sharp(svg).resize(s, s).png().toBuffer() };
    })
  );

  // ICO file format
  const icoBuffer = createIco(pngBuffers);
  writeFileSync(join(ICON_DIR, "icon.ico"), icoBuffer);
  console.log("  icon.ico");

  console.log("Done!");
}

function createIco(images) {
  // ICO header: 6 bytes
  // Each directory entry: 16 bytes
  // Then PNG data
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = images.length * dirEntrySize;
  let dataOffset = headerSize + dirSize;

  const entries = images.map(({ size, buf }) => {
    const entry = { size: size >= 256 ? 0 : size, buf, offset: dataOffset };
    dataOffset += buf.length;
    return entry;
  });

  const totalSize = dataOffset;
  const ico = Buffer.alloc(totalSize);

  // Header
  ico.writeUInt16LE(0, 0);      // reserved
  ico.writeUInt16LE(1, 2);      // type: 1 = ICO
  ico.writeUInt16LE(images.length, 4); // count

  // Directory entries
  entries.forEach((e, i) => {
    const off = headerSize + i * dirEntrySize;
    ico.writeUInt8(e.size, off);        // width (0 = 256)
    ico.writeUInt8(e.size, off + 1);    // height
    ico.writeUInt8(0, off + 2);         // color palette
    ico.writeUInt8(0, off + 3);         // reserved
    ico.writeUInt16LE(1, off + 4);      // color planes
    ico.writeUInt16LE(32, off + 6);     // bits per pixel
    ico.writeUInt32LE(e.buf.length, off + 8);  // data size
    ico.writeUInt32LE(e.offset, off + 12);     // data offset
  });

  // Image data
  entries.forEach((e) => {
    e.buf.copy(ico, e.offset);
  });

  return ico;
}

generate().catch(console.error);
