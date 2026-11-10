// End-to-end demo check with the installed Chrome (headless). Run: npm run e2e [baseUrl]
// Default base: http://localhost:5173. Without Supabase env vars all pages share one browser
// context, so the BroadcastChannel fallback connects them. With Supabase use SEPARATE=1.
import assert from 'node:assert/strict'
import { chromium, type Page } from 'playwright-core'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const ROOM = `e2e-${Date.now()}` // own channel, so a running demo never sees test traffic
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED })
// SEPARATE=1: every page gets its own browser profile, like separate phones (needs Supabase).
const shared = process.env.SEPARATE ? null : await browser.newContext()
const errors: string[] = []
const open = async (hash: string, mobile = false) => {
  const p = await (shared ?? (await browser.newContext())).newPage()
  if (mobile) await p.setViewportSize({ width: 390, height: 844 })
  p.on('pageerror', (e) => errors.push(`${hash}: ${e.message}`))
  await p.goto(`${BASE}/?room=${ROOM}${hash}`)
  return p
}
const step = (s: string) => console.log(`✓ ${s}`)
const ms = async (f: () => Promise<unknown>) => { const t = Date.now(); await f(); return Date.now() - t }

try {
  const control = await open('#/control')
  await control.evaluate(() => { location.hash = '#/control?demo' }) // panel must also open when ?demo is added later
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

  // --- Navigation split screen ---
  const walk = async (r: Page) => { // tap through all steps, return the texts
    const texts: string[] = []
    for (let n = 0; n < 20; n++) {
      const t = await r.getByTestId('nav-text').innerText()
      texts.push(t)
      if (await r.locator('section.bg-emerald-600').count()) break
      await r.locator('section').first().click({ position: { x: 30, y: 200 } })
    }
    return texts
  }
  await control.getByRole('button', { name: /Arena/ }).click()
  for (const r of riders) {
    await r.getByText('Nächster Halt Münchner Freiheit').waitFor({ timeout: 3000 })
    await r.getByRole('button', { name: 'Way Out' }).click()
  }
  await riders[0].getByRole('button', { name: /aussteigen/ }).click()
  const toWait = await walk(riders[0])
  assert.match(toWait[0], /Steig aus/)
  assert.ok(toWait.some((t) => /Treppe hoch|Rolltreppe hoch/.test(t)), toWait.join(' | '))
  assert.match(toWait.at(-1)!, /sicher/)
  step(`navigation to the safe waiting point: ${toWait.join(' → ')}`)
  if (process.env.SHOTS) await riders[0].screenshot({ path: `${process.env.SHOTS}/nav-arrive.png` })

  const exitFor = async (r: Page, reason: string) => {
    await r.getByRole('button', { name: reason }).click()
    await r.getByRole('button', { name: /aussteigen/ }).click()
    await r.getByRole('button', { name: 'Lieber raus auf die Straße' }).click()
    if (process.env.SHOTS) await r.screenshot({ path: `${process.env.SHOTS}/nav-${reason.split(' ')[0]}.png` })
    const hint = await r.locator('section').first().innerText()
    const texts = await walk(r)
    return { exit: texts.at(-1)!.match(/Ausgang (\w)/)![1], hint, texts }
  }
  const drunk = await exitFor(riders[1], 'Betrunkene Gruppe')
  const followed = await exitFor(riders[2], 'Fühle mich verfolgt')
  assert.notEqual(drunk.exit, 'E')
  assert.match(drunk.hint, /Menschenmenge an Ausgang E/)
  assert.equal(followed.exit, 'A')
  assert.notEqual(drunk.exit, followed.exit)
  step(`exit by reason: drunk group -> ${drunk.exit} (avoids E), followed -> ${followed.exit} (busy Leopoldstraße)`)
  step(`  route out: ${drunk.texts.join(' → ')}`)

  await control.getByRole('button', { name: /Garching/ }).click()
  await riders[0].getByText(/Am Bahnsteig/).waitFor({ timeout: 3000 })
  await riders[0].getByRole('button', { name: 'Way Out' }).click()
  await riders[0].getByRole('button', { name: /Notruf- und Infopunkt/ }).click()
  const toSos = await walk(riders[0])
  assert.match(toSos.at(-1)!, /Notruf- und Infopunkt am Aufzug/)
  step(`Garching: platform -> emergency point: ${toSos.join(' → ')}`)

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
    const opts = (await r.locator('section > button p.font-bold').allInnerTexts()).join(' / ')
    const line = await r.locator('header span').first().innerText()
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
