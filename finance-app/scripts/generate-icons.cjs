// Generates PWA icons from public/Budgify.png using sharp.
// Run: node scripts/generate-icons.cjs
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, '../public/Budgify.png');
const outDir = path.join(__dirname, '../public/icons');

fs.mkdirSync(outDir, { recursive: true });

async function generate() {
  // Standard 192×192
  await sharp(src).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'));
  console.log('✓ icon-192.png');

  // Standard 512×512
  await sharp(src).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'));
  console.log('✓ icon-512.png');

  // Maskable 512×512 — white background with ~80% safe-zone content (410px logo centered)
  const logoBuffer = await sharp(src).resize(410, 410).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'icon-512-maskable.png'));
  console.log('✓ icon-512-maskable.png');

  console.log('\nAll icons generated in public/icons/');
}

generate().catch(err => { console.error(err); process.exit(1); });
