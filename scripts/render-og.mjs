// Renders scripts/og.html to public/og.png, the link-preview image.
//
//   npm i -D playwright && npx playwright install chromium   # once
//   node scripts/render-og.mjs
//
// Set CHROMIUM_PATH to use a browser you already have instead of Playwright's.
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
)
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
})
await page.goto(new URL('og.html', import.meta.url).href, { waitUntil: 'networkidle' })
await page.screenshot({ path: here + '../public/og.png' })
await browser.close()
console.log('wrote public/og.png')
