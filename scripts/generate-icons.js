import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Exact replica SVG of the uploaded bookmark icon: Dark Navy background + Golden Open Book emblem
const createIconSvg = (size, isSquircle = false, safePadding = false) => {
  const cornerRadius = isSquircle ? size * 0.22 : 0;
  const scale = safePadding ? 0.72 : 0.82;
  const bookSize = size * scale;
  const offset = (size - bookSize) / 2;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient for subtle depth -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#242c38" />
      <stop offset="100%" stop-color="#181e28" />
    </linearGradient>
    <!-- Golden Yellow Gradient matching the user icon -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${size * 0.015}" stdDeviation="${size * 0.02}" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Background container -->
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bgGrad)" />

  <!-- Centered Golden Open Book Emblem -->
  <g transform="translate(${offset}, ${offset}) scale(${bookSize / 100})" filter="url(#subtleGlow)">
    <!-- Left Page Outline -->
    <path
      d="M 47 78 C 36 74 24 74 15 76 C 13.5 76.3 12 75.2 12 73.6 L 12 25.4 C 12 24.1 13.2 23.1 14.5 22.8 C 24 20.8 36 21 47 25.5 Z"
      fill="none"
      stroke="url(#goldGrad)"
      stroke-width="7.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- Right Page Outline -->
    <path
      d="M 53 25.5 C 64 21 76 20.8 85.5 22.8 C 86.8 23.1 88 24.1 88 25.4 L 88 73.6 C 88 75.2 86.5 76.3 85 76 C 76 74 64 74 53 78 Z"
      fill="none"
      stroke="url(#goldGrad)"
      stroke-width="7.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- Center Spine Line with Notch -->
    <path
      d="M 50 25 L 50 82 L 47 78 M 50 82 L 53 78"
      fill="none"
      stroke="url(#goldGrad)"
      stroke-width="7.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</svg>`;
};

async function generateAllIcons() {
  console.log('Generating mobile bookmark icons...');

  // 1. Apple Touch Icon (180x180) for iOS Safari home screen & bookmarks
  const appleTouchSvg = Buffer.from(createIconSvg(180, true));
  await sharp(appleTouchSvg)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png (180x180)');

  // 2. Android & PWA Icon 192x192
  const icon192Svg = Buffer.from(createIconSvg(192, true));
  await sharp(icon192Svg)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Created icon-192.png (192x192)');

  // 3. Android & PWA Icon 512x512
  const icon512Svg = Buffer.from(createIconSvg(512, true));
  await sharp(icon512Svg)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Created icon-512.png (512x512)');

  // 4. Android Maskable Icon 512x512 (with safe zone padding)
  const iconMaskableSvg = Buffer.from(createIconSvg(512, false, true));
  await sharp(iconMaskableSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));
  console.log('Created icon-maskable-512.png (512x512)');

  // 5. Standard Favicon 32x32 and 16x16
  const fav32Svg = Buffer.from(createIconSvg(32, true));
  await sharp(fav32Svg)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  const fav16Svg = Buffer.from(createIconSvg(16, true));
  await sharp(fav16Svg)
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('Created favicons 32x32 & 16x16');

  // 6. Vector SVG icon for modern browser tabs
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), createIconSvg(128, true));
  console.log('Created favicon.svg');

  // 7. Web App Manifest
  const manifest = {
    id: "/",
    name: "BookLens - AI Book Identifier",
    short_name: "BookLens",
    description: "Snap or search any book cover to instantly get AI-powered spoiler-free summaries, reading vibes, takeaways, and smart next-read recommendations.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#181e28",
    theme_color: "#181e28",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };

  fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Created manifest.json');
}

generateAllIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
