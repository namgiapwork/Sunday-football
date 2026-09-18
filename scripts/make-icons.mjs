/**
 * Renders the home-screen icons from one SVG. Pure geometry, no fonts, so it
 * renders identically everywhere. Run it with: npm run icons
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const PITCH = "#090d0c";
const LIME = "#c8ff45";

/** A football: lime circle, dark pentagon, five seams. */
const svg = (size) => {
  const c = size / 2;
  const r = size * 0.33;
  const pent = (radius, rotation = -90) =>
    Array.from({ length: 5 }, (_, i) => {
      const a = ((rotation + i * 72) * Math.PI) / 180;
      return `${(c + radius * Math.cos(a)).toFixed(2)},${(c + radius * Math.sin(a)).toFixed(2)}`;
    }).join(" ");

  const seams = Array.from({ length: 5 }, (_, i) => {
    const a = ((-90 + i * 72 + 36) * Math.PI) / 180;
    const x1 = c + r * 0.42 * Math.cos(a);
    const y1 = c + r * 0.42 * Math.sin(a);
    const x2 = c + r * 0.98 * Math.cos(a);
    const y2 = c + r * 0.98 * Math.sin(a);
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"
              stroke="${PITCH}" stroke-width="${(size * 0.035).toFixed(2)}" stroke-linecap="round"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${PITCH}"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="${LIME}"/>
    <polygon points="${pent(r * 0.42)}" fill="${PITCH}"/>
    ${seams}
  </svg>`;
};

const targets = [
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["public/apple-touch-icon.png", 180],
];

for (const [path, size] of targets) {
  await sharp(Buffer.from(svg(size))).png().toFile(path);
  console.log(`  ${path}  ${size}×${size}`);
}

writeFileSync("public/icon.svg", svg(512));
console.log("  public/icon.svg");
