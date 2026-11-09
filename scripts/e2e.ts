// End-to-end demo check with the installed Chrome (headless). Run: npm run e2e [baseUrl]
// Default base: http://localhost:5173. Without Supabase env vars all pages share one browser
// context, so the BroadcastChannel fallback connects them; with Supabase it tests the real channel.
import assert from 'node:assert/strict'
import { chromium, type Page } from 'playwright-core'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED })
const ctx = await browser.newContext()
const errors: string[] = []
const open = async (hash: string, mobile = false) => {
  const p = await ctx.newPage()
  if (mobile) await p.setViewportSize({ width: 390, height: 844 })
  p.on('pageerror', (e) => errors.push(`${hash}: ${e.message}`))
  await p.goto(`${BASE}/${hash}`)
  return p
}
const step = (s: string) => console.log(`✓ ${s}`)
const ms = async (f: () => Promise<unknown>) => { const t = Date.now(); await f(); return Date.now() - t }

try {
  const control = await open('#/control?demo')
  await control.setViewportSize({ width: 1600, height: 900 })
  const riders = [await open('#/rider', true), await open('#/rider', true), await open('#/rider', true)]
  await riders[0].getByText('Einmal Start und Ziel').waitFor()
  step('rider shows TripSetup, control loads')

  // --- Arena ---
  await control.getByRole('button', { name: /Arena/ }).click()
  for (const r of riders) await r.getByText('Münchner Freiheit').first().waitFor({ timeout: 3000 })
  step('demo push: every rider is on the U6 before Münchner Freiheit')

  for (const r of riders) {
    await r.getByRole('button', { name: 'Way Out' }).click()
    await r.getByRole('button', { name: 'Betrunkene Gruppe' }).click()
  }
  await riders[0].getByText(/aussteigen/).waitFor()
  const t = await ms(() => control.getByText('Hotspot · 3 Meldungen').waitFor({ timeout: 2000 }))
  assert.ok(await control.getByText('Betrunkene Gruppe').first().isVisible())
  step(`3 taps -> red hotspot card in ${t} ms, top reason shown`)

  await control.getByRole('button', { name: /Security → Münchner Freiheit/ }).click()
  for (const r of riders) await r.getByText('Security wartet an Münchner Freiheit').waitFor({ timeout: 2000 })
  assert.ok(await riders[0].getByText('Rolltreppe hoch').isVisible())
  step('operator action reaches all 3 riders with walking steps')

  // A phone that missed the action (stored feedback wiped) reloads and catches up via hello.
  await riders[2].evaluate(() => {
    const k = 'wayout.state', s = JSON.parse(sessionStorage.getItem(k)!)
    sessionStorage.setItem(k, JSON.stringify({ ...s, feedback: null }))
  })
  await riders[2].reload()
  await riders[2].getByText('Security wartet an Münchner Freiheit').waitFor({ timeout: 3000 })
  step('rider that missed the action gets it replayed via hello')

  // A phone that opens after the scenario started joins the same train via hello.
  const late = await open('#/rider', true)
  await late.getByRole('button', { name: 'Way Out' }).waitFor({ timeout: 3000 })
  assert.ok(await late.getByText('Münchner Freiheit').first().isVisible())
  await late.close()
  step('late-joining phone lands on the scenario train')

  await riders[0].getByRole('button', { name: "Mir geht's gut" }).click()
  await riders[0].getByText('Gute Heimfahrt').waitFor()
  await control.getByText('Einzelmeldung · 2').waitFor({ timeout: 2000 })
  step('"Mir geht\'s gut" removes the tap; card drops to 2 sessions')

  await control.getByRole('button', { name: /^Erledigt/ }).click()
  await control.getByRole('button', { name: /Erledigt ✓/ }).waitFor()
  step('resolved card is greyed out')

  // --- Garching (single tap at night) ---
  await control.getByRole('button', { name: /Garching/ }).click()
  await riders[1].getByText(/Am Bahnsteig/).waitFor({ timeout: 3000 })
  await riders[1].getByRole('button', { name: 'Way Out' }).click()
  await control.getByText(/^Einzelmeldung/).waitFor({ timeout: 2000 })
  await control.getByRole('button', { name: /Security →/ }).click()
  await riders[1].getByText('Leitstelle schaut mit, Security in 6 Min bei dir').waitFor({ timeout: 2000 })
  step('Garching: single tap -> yellow card -> "Security in 6 Min"')

  // --- Fallback button + time jump ---
  await control.getByRole('button', { name: /Arena/ }).click()
  for (let i = 0; i < 3; i++) await control.getByRole('button', { name: '+1 Meldung' }).click()
  await control.getByText('Hotspot · 3 Meldungen').waitFor({ timeout: 2000 })
  step('"+1 Meldung" fallback builds a hotspot without phones')
  await control.getByRole('button', { name: '+1 Min' }).click()
  await riders[0].getByText(/Nächster Halt Giselastraße|Nächster Halt Münchner Freiheit/).waitFor()
  step('time jump reaches riders without resetting them')

  // --- Real trips (free mode, live MVG API) ---
  await control.getByRole('button', { name: /Szenario beenden/ }).click()
  for (const [from, to] of [['Hauptbahnhof', 'Münchner Freiheit'], ['Marienplatz', 'Garching, Forschungszentrum']]) {
    const r = await open('#/rider', true)
    await r.evaluate(() => sessionStorage.clear())
    await r.reload()
    for (const [label, q] of [['Start', from], ['Ziel', to]]) {
      await r.getByPlaceholder('Haltestelle').nth(label === 'Start' ? 0 : 1).fill(q)
      await r.getByRole('button', { name: new RegExp(`^${q}`) }).first().click()
    }
    await r.getByRole('button', { name: 'Los' }).click()
    await r.getByRole('button', { name: 'Way Out' }).waitFor({ timeout: 8000 })
    const header = (await r.locator('header').innerText()).replace(/\s+/g, ' ')
    await r.getByRole('button', { name: 'Way Out' }).click()
    await r.getByRole('button', { name: 'Fühle mich verfolgt' }).click()
    const opts = (await r.locator('section > div p.font-bold').allInnerTexts()).join(' / ')
    const line = header.match(/^(\S+)/)![1]
    await control.locator('article', { hasText: line }).filter({ hasText: 'Fühle mich verfolgt' }).first().waitFor({ timeout: 2000 })
    step(`real trip ${from} -> ${to}: "${header}" | option: "${opts}" | card on control`)
    await r.close()
  }

  if (process.env.SHOTS) {
    await control.getByRole('button', { name: /Arena/ }).click()
    await riders[0].getByRole('button', { name: 'Way Out' }).click()
    await riders[1].getByRole('button', { name: 'Way Out' }).click()
    await riders[1].getByRole('button', { name: 'Zu voll' }).click()
    await riders[2].getByRole('button', { name: 'Way Out' }).click()
    await control.getByRole('button', { name: /Security → Münchner Freiheit/ }).click()
    await riders[0].getByText('Security wartet an').waitFor()
    await control.waitForTimeout(1500)
    await control.screenshot({ path: `${process.env.SHOTS}/control.png` })
    await control.setViewportSize({ width: 1920, height: 1080 })
    await control.getByRole('button', { name: 'Luna-Fenster' }).click()
    await control.frameLocator('iframe').getByRole('button', { name: 'Way Out' }).waitFor()
    await control.screenshot({ path: `${process.env.SHOTS}/projector.png` })
    await riders[0].screenshot({ path: `${process.env.SHOTS}/rider-feedback.png`, fullPage: true })
    const fresh = await open('#/rider', true)
    await fresh.getByRole('button', { name: 'Way Out' }).waitFor()
    await fresh.screenshot({ path: `${process.env.SHOTS}/rider-riding.png` })
  }

  assert.deepEqual(errors, [])
  step('no page errors')
} finally {
  await browser.close()
}
