// End-to-end demo check with the installed Chrome (headless). Run: npm run e2e [baseUrl]
// Default base: http://localhost:5173. Without Supabase env vars all pages share one browser
// context, so the BroadcastChannel fallback connects them. With Supabase use SEPARATE=1.
import assert from 'node:assert/strict'
import { chromium, type Page } from 'playwright-core'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const ROOM = `e2e-${Date.now()}` // own channel, so a running demo never sees test traffic
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED })
// SEPARATE=1: every page gets its own browser profile, like separate phones (needs Supabase).
// Protected Vercel previews: VERCEL_OIDC_TOKEN (vc env run) goes only to the deployment's own origin.
const newContext = async () => {
  const c = await browser.newContext(), token = process.env.VERCEL_OIDC_TOKEN
  if (token) await c.route(`${new URL(BASE).origin}/**`, (r) => r.continue({ headers: { ...r.request().headers(), 'x-vercel-trusted-oidc-idp-token': token } }))
  return c
}
const shared = process.env.SEPARATE ? null : await newContext()
const errors: string[] = []
const open = async (hash: string, mobile = false, page = '/') => {
  const p = await (shared ?? (await newContext())).newPage()
  if (mobile) await p.setViewportSize({ width: 390, height: 844 })
  p.on('pageerror', (e) => errors.push(`${page}${hash}: ${e.message}`))
  await p.goto(`${BASE}${page}?room=${ROOM}${hash}`)
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
  assert.ok(await riders[0].getByRole('button', { name: 'Weg zeigen' }).isVisible())
  step('operator action reaches all 3 riders, with "Weg zeigen" into the navigation')

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
      if (await r.locator('section[data-done="true"]').count()) break
      await r.locator('section').first().click({ position: { x: 30, y: 200 } })
    }
    return texts
  }
  // Sync on the reset itself: put every rider into Way Out first; the reset sends them back to riding.
  const screenOf = (r: Page) => r.evaluate(() => JSON.parse(sessionStorage.getItem('wayout.state')!).screen as string)
  for (const r of riders) if (await screenOf(r) === 'riding') await r.getByRole('button', { name: 'Way Out' }).click()
  await control.getByRole('button', { name: /Arena/ }).click()
  for (const r of riders) {
    await r.waitForFunction(() => JSON.parse(sessionStorage.getItem('wayout.state')!).screen === 'riding', null, { timeout: 3000 })
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

  // --- SafeRide (English by default): shared reports (issues #19, #32) ---
  await control.getByRole('button', { name: /Arena/ }).click()
  const srA = await open('', true, '/saferide.html'), srB = await open('', true, '/saferide.html')
  const ready = (s: Page) => s.waitForFunction(() => !document.querySelector('#loading') && (window as any).__sr?.Loc?.demo, null, { timeout: 20000 })
  for (const s of [srA, srB]) await ready(s)
  await srA.getByTestId('ride-strip').getByText('Münchner Freiheit').waitFor({ timeout: 5000 })
  await srA.locator('.sr-train').waitFor()
  step('SafeRide shows the scenario train: ride bar under the top bar + marker on the map (issue #25)')
  assert.deepEqual([...new Set(await srA.locator('.friend-marker').evaluateAll((els) => els.map((el) => getComputedStyle(el).position)))], ['absolute'])
  const markerAnchorError = () => srA.locator('.friend-marker').first().evaluate((el) => {
    const rect = el.getBoundingClientRect(), mapRect = document.querySelector('#map')!.getBoundingClientRect()
    const match = getComputedStyle(el).transform.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,\s*([^,]+),\s*([^)]+)\)/)
    return match ? Math.max(Math.abs(rect.left - mapRect.left - Number(match[1])), Math.abs(rect.top - mapRect.top - Number(match[2]))) : Infinity
  })
  assert.ok(await markerAnchorError() < 0.5)
  await srA.locator('#map').dblclick({ position: { x: 195, y: 300 } })
  await srA.waitForTimeout(400)
  assert.ok(await markerAnchorError() < 0.5)
  step('friend markers stay anchored to map coordinates while zooming')
  assert.equal(await srA.locator('#btnStaff strong').innerText(), 'Station staff')
  assert.deepEqual(await srA.locator('.tab-actions button > span:first-of-type').allInnerTexts(), ['Friends', 'Alerts', 'Settings'])
  step('home: SOS dock (Station staff, Way Out, Report) + tabs Friends / Alerts / Settings, in English')

  await srA.locator('#btnReport').click()
  await srA.locator('[data-report-kind="drunk"]').click()
  await control.locator('path.sr-report').first().waitFor({ timeout: 3000 })
  await control.getByTestId('sr-report').filter({ hasText: 'Betrunkene Gruppe' }).waitFor({ timeout: 3000 })
  await srB.locator('[data-tab="alerts"]').click()
  await srB.locator('[data-alert^="shared-me-"]').waitFor({ timeout: 3000 })
  assert.equal(await srB.locator('#alertsBody .wx, #alertsBody [data-afilter]').count(), 0)
  assert.equal(await srB.getByText('On your way home').count(), 0)
  await srB.locator('#sheet-alerts [data-close]').click()
  step('one tap on "Drunk group" -> marker + category on control, alert on a second SafeRide phone')
  await srA.locator('#btnReport').click()
  await srA.locator('[data-report-kind="dirty"]').click()
  await control.getByTestId('sr-report').filter({ hasText: 'Verschmutzung' }).waitFor({ timeout: 3000 })
  await srA.locator('#toast button').click() // Undo
  await control.getByTestId('sr-report').filter({ hasText: 'Verschmutzung' }).waitFor({ state: 'detached', timeout: 3000 })
  step('report "Dirty" -> control, "Undo" in the toast withdraws it')
  await srA.locator('#btnReport').click()
  await srA.locator('#reportText').fill('Mann belästigt Fahrgäste im letzten Wagen')
  await srA.locator('[data-report-form] button[type=submit]').click()
  await control.getByTestId('sr-report').filter({ hasText: 'Mann belästigt Fahrgäste im letzten Wagen' }).waitFor({ timeout: 3000 })
  await srB.locator('[data-tab="alerts"]').click()
  assert.equal(await srB.locator('[data-alert^="shared-me-"]').count(), 1) // info reports (dirty, free text) are no crowd
  await srB.locator('#sheet-alerts [data-close]').click()
  step('free-text report -> text on control; info reports do not become crowds on other phones')
  await riders[0].getByText('Nächster Halt Münchner Freiheit').waitFor({ timeout: 3000 })
  await riders[0].getByRole('button', { name: 'Way Out' }).click()
  await srB.locator('[data-tab="alerts"]').click()
  await srB.locator('[data-alert^="shared-4"]').waitFor({ timeout: 3000 }) // Way Out hotspot crowd (id = lat,lng)
  await srB.locator('#sheet-alerts [data-close]').click()
  step('Way Out tap -> alert on SafeRide')

  // --- one-tap station staff dispatch ---
  await srA.locator('#btnStaff').click()
  await srA.locator('#sheet-staff.open').waitFor({ timeout: 3000 })
  await srA.getByText('Staff have been notified').waitFor()
  await control.getByTestId('sr-report').filter({ hasText: 'Stationspersonal angefordert' }).waitFor({ timeout: 3000 })
  await srA.getByRole('button', { name: 'Understood' }).click()
  await srA.locator('#sheet-staff.open').waitFor({ state: 'detached' })
  step('one tap immediately notifies station staff and shares location with control')

  // --- Way Out simulation: one tap, from the U3 demo ride's station (issue #32) ---
  await srB.locator('#btnWayOut').click()
  const station = await srB.getByTestId('nav-station').innerText()
  const first = await srB.getByTestId('nav-text').innerText()
  assert.match(first, /^Get off and walk/)
  await control.getByTestId('sr-report').filter({ hasText: 'Way Out aktiv' }).waitFor({ timeout: 3000 })
  await srB.getByTestId('nav-alt').click()
  const walkTo = async (s: Page) => { // tap through to the destination, return the texts
    const texts: string[] = []
    for (let n = 0; n < 20; n++) {
      texts.push(await s.getByTestId('nav-text').innerText())
      if (await s.locator('section[data-done="true"]').count()) break
      await s.getByRole('button', { name: 'Next' }).click()
    }
    return texts
  }
  const alt = await walkTo(srB)
  assert.match(alt.at(-1)!, /staff and a camera|people around/)
  await srB.getByRole('button', { name: "I'm okay" }).click()
  await srB.getByTestId('nav-text').waitFor({ state: 'detached' })
  await control.getByTestId('sr-report').filter({ hasText: 'Way Out aktiv' }).waitFor({ state: 'detached', timeout: 3000 })
  step(`Way Out: ${station}, nearest safe spot, one-tap alternative: ${alt.join(' → ')}; "I'm okay" takes the pin back`)
  // fast-forward the simulated U3 to just before Münchner Freiheit: real indoor data there
  await srB.evaluate(() => {
    const dm = (window as any).__sr.Loc.demo, k = dm.pd.names.indexOf('Münchner Freiheit')
    dm.t0 = Date.now() - ((dm.pd.arr[k] - 40) - dm.e0) / dm.speed * 1000
  })
  await srB.locator('#btnWayOut').click()
  await srB.getByTestId('nav-station').getByText('Münchner Freiheit').waitFor()
  const mf = await walkTo(srB)
  assert.ok(mf.some((t) => /Escalator up|Stairs up/.test(t)), mf.join(' | '))
  await srB.getByRole('button', { name: 'Close' }).first().click()
  step(`Way Out at Münchner Freiheit (real indoor data): ${mf.join(' → ')}`)

  // --- language: English by default, German in Settings ---
  await srA.locator('[data-tab="profile"]').click()
  assert.deepEqual(await srA.locator('#profileBody h3').allInnerTexts(), ['Language', 'Appearance'])
  await Promise.all([srA.waitForEvent('load'), srA.locator('[data-lang="de"]').click()])
  await ready(srA)
  assert.equal(await srA.locator('#btnStaff strong').innerText(), 'Stationspersonal')
  assert.equal(await srA.locator('#btnStaff small').innerText(), 'Einmal tippen · sofort Hilfe anfordern')
  await srA.locator('#btnWayOut').click()
  assert.match(await srA.getByTestId('nav-text').innerText(), /^Steig aus und geh/)
  await srA.getByRole('button', { name: 'Schließen' }).first().click()
  await srA.locator('[data-tab="profile"]').click()
  await Promise.all([srA.waitForEvent('load'), srA.locator('[data-lang="en"]').click()])
  await ready(srA)
  step('Settings: only Language + Appearance; Deutsch switches the whole app (dock, Way Out steps) and back')

  // --- Luna window on the projector = the integrated SafeRide page (issue #26) ---
  await control.getByRole('button', { name: 'Luna-Fenster' }).click()
  const luna = control.frameLocator('iframe[title="Luna"]')
  await luna.locator('#loading').waitFor({ state: 'detached', timeout: 15000 })
  await luna.getByTestId('ride-strip').getByText('Münchner Freiheit').waitFor({ timeout: 5000 })
  await luna.locator('#btnWayOut').click()
  await luna.getByTestId('nav-text').waitFor()
  await luna.getByRole('button', { name: 'Close' }).first().click()
  await control.getByRole('button', { name: 'Luna-Fenster' }).click()
  step('Luna window shows SafeRide with the scenario train; Way Out opens there')

  await control.getByRole('button', { name: /Arena/ }).click()
  await srB.locator('[data-tab="alerts"]').click()
  await srB.locator('[data-alert^="shared-me-"]').waitFor({ state: 'detached', timeout: 3000 })
  assert.equal(await control.locator('path.sr-report').count(), 0)
  step('scenario reset clears shared reports')
  await srA.close(); await srB.close()

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
    const opts = (await r.getByTestId('option').allInnerTexts()).map((t) => t.split(String.fromCharCode(10))[0]).join(' / ')
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
    await control.frameLocator('iframe').locator('#btnStaff').waitFor()
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
