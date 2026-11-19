// Writes one placeholder SVG portrait per seeded profile into public/avatars.
// The output is committed, so this only needs to run if the seed list changes.
import fs from "node:fs";
import path from "node:path";
import { buildSeed } from "../lib/seed.js";

const outDir = path.join(process.cwd(), "public", "avatars");
fs.mkdirSync(outDir, { recursive: true });

for (const p of buildSeed().profiles) {
  const hue = (p.id * 47) % 360;
  const hue2 = (hue + 40) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" role="img" aria-label="${p.name}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 70% 62%)"/>
      <stop offset="1" stop-color="hsl(${hue2} 65% 42%)"/>
    </linearGradient>
  </defs>
  <rect width="400" height="500" fill="url(#g)"/>
  <circle cx="200" cy="190" r="72" fill="rgba(255,255,255,0.28)"/>
  <path d="M60 500c0-92 62-150 140-150s140 58 140 150z" fill="rgba(255,255,255,0.28)"/>
  <text x="200" y="215" font-family="system-ui, sans-serif" font-size="84" font-weight="700" fill="#fff" text-anchor="middle">${p.name[0]}</text>
</svg>
`;
  fs.writeFileSync(path.join(outDir, `${p.id}.svg`), svg);
}
console.log("Wrote avatars to public/avatars");
