// Quick check of the SOS dock in a phone-sized headless Chrome. Run: npx tsx scripts/smoke-sos.ts [baseUrl]
import { chromium } from 'playwright-core'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const errors: string[] = []
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push(String(e)))
const control = await ctx.newPage()
control.on('pageerror', (e) => errors.push('control: ' + String(e)))
await control.goto(`${BASE}/#/control`)
await page.goto(`${BASE}/saferide.html`)
await page.waitForFunction(() => !document.querySelector('#loading') && (window as any).__sr?.Loc?.demo, null, { timeout: 30000 })
const ok = (m: string) => console.log('✓', m)

// short tap does not call
await page.click('#btnCall')
await page.waitForTimeout(300)
if (await page.locator('#sheet-call.open').count()) throw new Error('short tap opened the call')
ok('short tap on Stationssicherheit does not call')
// hold 1.6 s
const b = await page.locator('#btnCall').boundingBox()
await page.mouse.move(b!.x + 40, b!.y + 20); await page.mouse.down(); await page.waitForTimeout(1700); await page.mouse.up()
await page.locator('#sheet-call.open').waitFor({ timeout: 3000 })
await page.waitForTimeout(2200)
ok('hold 1.5 s -> call sheet: ' + (await page.locator('#callBody .call-live strong').innerText()))
await page.screenshot({ path: 'scripts/.shot-call.png' })
await page.click('#callBody .hangup')

// Way Out
await page.click('#btnWayOut')
await page.getByTestId('nav-text').waitFor({ timeout: 5000 })
ok(`Way Out: ${await page.getByTestId('nav-station').innerText()} -> ${await page.getByTestId('nav-text').innerText()}`)
await page.screenshot({ path: 'scripts/.shot-wayout.png' })
if (await page.getByTestId('nav-alt').count()) { await page.getByTestId('nav-alt').click(); ok('alternative: ' + (await page.getByTestId('nav-text').innerText())) }
await page.getByRole('button', { name: /gut|okay/i }).click()
await page.getByTestId('nav-text').waitFor({ state: 'detached', timeout: 3000 })
ok('"Mir geht\'s gut" ends Way Out')

// Report: category + free text
await page.click('#btnReport')
await page.locator('[data-report-kind="dirty"]').click()
await page.click('#btnReport')
await page.fill('#reportText', 'Licht im Aufgang kaputt')
await page.locator('[data-report-form] button[type=submit]').click()
await control.getByText('Licht im Aufgang kaputt').first().waitFor({ timeout: 8000 })
ok('report category + free text reach the Leitstelle')
await page.click('[data-tab="profile"]')
await page.screenshot({ path: 'scripts/.shot-settings.png' })
await page.click('[data-close]:visible')
await page.screenshot({ path: 'scripts/.shot-home.png' })
if (errors.length) throw new Error('page errors:\n' + errors.join('\n'))
ok('no page errors')
await browser.close()
