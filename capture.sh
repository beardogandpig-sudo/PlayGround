#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to the evidence output directory}"
/usr/bin/time -p mkdir -p "$CAPTURE_DIR"

/usr/bin/time -p node --input-type=module <<'NODE'
import { createRequire } from 'node:module'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const runtime = join(process.env.HOME, '.local/share/omgithub-playwright')
const require = createRequire(join(runtime, 'package.json'))
const { chromium } = require('playwright')
const config = JSON.parse(readFileSync(join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8'))
if (process.platform === 'linux') process.env.DISPLAY ||= ':' + readFileSync(join(runtime, 'display'), 'utf8').trim()
const url = process.env.CAPTURE_URL
const output = process.env.CAPTURE_DIR
mkdirSync(output, { recursive: true })
const transient = error => { throw Object.assign(error, { exitCode: 75 }) }
let browser
let exitCode = 0
try {
  browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(transient)
  for (const [name, width, height] of [['desktop', 1280, 800], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } }).catch(transient)
    page.setDefaultTimeout(30000)
    const failures = []
    page.on('pageerror', error => { console.error(error.message); failures.push(error.message) })
    page.on('response', response => {
      if (response.status() >= 400 && new URL(response.url()).origin === new URL(url).origin) failures.push(`HTTP ${response.status()}: ${response.url()}`)
    })
    const response = await page.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(transient)
    if (!response?.ok()) throw Object.assign(new Error(`HTTP ${response?.status()} loading preview`), { exitCode: !response || [408, 429, 500, 502, 503, 504].includes(response.status()) ? 75 : 1 })
    await page.locator(process.env.CAPTURE_READY_SELECTOR || '#game-canvas').waitFor({ state: 'visible' })
    await page.waitForFunction(() => document.fonts.status === 'loaded')
    const play = page.locator('#play-button')
    if (await play.count()) await play.click({ timeout: 5000 })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: join(output, `final-${name}.png`), timeout: 30000 }).catch(error => {
      if (error.name === 'TimeoutError' || !browser.isConnected()) transient(error)
      throw error
    })
    if (failures.length) throw new Error(`Rendered page failed: ${failures.join('; ')}`)
    await page.close()
  }
} catch (error) {
  console.error(error)
  exitCode = error.exitCode || 1
} finally {
  await browser?.close().catch(error => { console.error(error); exitCode ||= 75 })
}
process.exitCode = exitCode
NODE
