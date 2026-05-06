import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public', 'splash')
const logoPath = join(__dirname, '..', 'public', 'BudgifyWithLabel.png')

mkdirSync(publicDir, { recursive: true })

// Logo occupies ~40% of shortest dimension
const LOGO_RATIO = 0.4

const devices = [
  { name: 'iphone-14-pro-max', w: 1290, h: 2796 },
]

for (const device of devices) {
  const logoSize = Math.round(Math.min(device.w, device.h) * LOGO_RATIO)
  const outPath = join(publicDir, `${device.name}.png`)

  await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toBuffer()
    .then(logoBuffer => {
      const left = Math.round((device.w - logoSize) / 2)
      const top = Math.round((device.h - logoSize) / 2)
      return sharp({
        create: { width: device.w, height: device.h, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
      })
        .composite([{ input: logoBuffer, left, top }])
        .png()
        .toFile(outPath)
    })

  console.log(`✓ ${device.name} (${device.w}x${device.h})`)
}

console.log('\nAll splash images generated in public/splash/')
