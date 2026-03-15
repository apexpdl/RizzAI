/**
 * Generates placeholder SVG icons for the extension.
 * Run with: node scripts/generate-icons.js
 *
 * In production, replace these with actual designed icons.
 */
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of sizes) {
  // Create a simple SVG icon and save as a file
  // In production, you'd use actual PNG icons
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#g)"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-weight="bold" font-size="${size * 0.4}">R</text>
</svg>`;

  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);
  console.log(`Created icon${size}.svg`);
}

console.log('\\nNote: Chrome extensions require PNG icons.');
console.log('Convert these SVGs to PNGs using any image tool.');
console.log('For development, you can rename .svg to .png (it may work in some browsers).');
