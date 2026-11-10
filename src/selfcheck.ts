// Run: npm run check  (npx tsx src/selfcheck.ts). Pure modules only, no import.meta.env.
import assert from 'node:assert/strict'

// --- mvg snapshots + polyline (issue #3) ---
import { SNAPSHOTS, nearestTeam } from './mock'
{
  const a = SNAPSHOTS.arena.route
  assert.equal(a.legs.length, 1)
  assert.equal(a.legs[0].line, 'U6')
  assert.equal(a.legs[0].stops[0].name, 'Fröttmaning')
  assert.equal(a.legs[0].stops.at(-1)!.name, 'Sendlinger Tor')
  // precision 5: first decoded point lies on Fröttmaning (48.2118, 11.6166)
  const [lat, lng] = a.legs[0].polyline[0]
  assert.ok(Math.abs(lat - 48.2118) < 0.002 && Math.abs(lng - 11.6166) < 0.002, `polyline start ${lat},${lng}`)
  const g = SNAPSHOTS.garching.route
  assert.deepEqual(g.legs.map((l) => l.line), ['U6', 'U3'])
  assert.equal(nearestTeam(g.legs[0].stops[0]).minutes, 6)
  assert.equal(nearestTeam({ lat: 48.16195, lng: 11.58616 }).minutes, 1)
}

// --- position (issue #4) ---
import { where, trainKey } from './position'
import type { Route, Stop } from './types'
{
  const st = (id: string, min: number): Stop => ({ id, name: id, lat: 48 + min / 100, lng: 11, dep: min * 60_000, escalatorOut: false, elevatorOut: false })
  const r: Route = {
    legs: [
      { line: 'U6', destination: 'X', stops: [st('A', 10), st('B', 12), st('C', 15)], polyline: [] },
      { line: 'U3', destination: 'Y', stops: [st('C', 20), st('D', 23)], polyline: [] },
    ],
  }
  const m = (x: number) => x * 60_000
  let p = where(r, m(7)) // before first departure
  assert.deepEqual([p.state, p.nextStop.id, p.etaMin, p.leg], ['platform', 'A', 3, 0])
  p = where(r, m(10)) // exactly at departure -> on the train
  assert.deepEqual([p.state, p.prevStop?.id, p.nextStop.id, p.etaMin], ['train', 'A', 'B', 2])
  p = where(r, m(10) - 1) // just before departure -> still platform
  assert.deepEqual([p.state, p.etaMin], ['platform', 1])
  p = where(r, m(12)) // exactly at B -> between B and C
  assert.deepEqual([p.state, p.prevStop?.id, p.nextStop.id, p.etaMin], ['train', 'B', 'C', 3])
  p = where(r, m(13.5)) // halfway B->C, interpolated position
  assert.equal(p.etaMin, 2)
  assert.ok(Math.abs(p.lat - (48 + 13.5 / 100)) < 1e-9)
  p = where(r, m(16)) // changing trains at C
  assert.deepEqual([p.state, p.nextStop.id, p.leg, p.etaMin, p.trainKey], ['platform', 'C', 1, 4, trainKey(r.legs[1])])
  p = where(r, m(30)) // arrived
  assert.deepEqual([p.state, p.nextStop.id, p.etaMin], ['platform', 'D', 0])
  assert.equal(trainKey(r.legs[0]), trainKey(structuredClone(r).legs[0])) // same route -> same key
  assert.notEqual(trainKey(r.legs[0]), trainKey(r.legs[1]))
  // Arena scenario: 2 min before Münchner Freiheit, on the train
  const a = SNAPSHOTS.arena
  p = where(a.route, a.virtualNow)
  assert.deepEqual([p.state, p.prevStop?.name, p.nextStop.id], ['train', 'Dietlindenstraße', 'de:09162:500'])
  assert.ok(p.etaMin >= 1)
  const g = SNAPSHOTS.garching
  p = where(g.route, g.virtualNow)
  assert.deepEqual([p.state, p.nextStop.id, p.etaMin], ['platform', 'de:09184:460', 4])
}

// --- hotspots (issue #7) ---
import { groupTaps } from './hotspots'
import type { Tap } from './types'
{
  const M = 60_000
  const tap = (sessionId: string, at: number, reasons: string[] = [], trainKey = 'U6|X|1'): Tap => ({
    sessionId, trainKey, line: 'U6', destination: 'X', state: 'train', nextStopId: 'mf', nextStopName: 'MF', lat: 48, lng: 11, reasons, at,
  })
  const map = (...ts: Tap[]) => new Map(ts.map((t) => [t.sessionId, t])) // upsert by sessionId, like Control
  const now = 100 * M
  let g = groupTaps(map(tap('a', now - M), tap('b', now)), now)
  assert.deepEqual([g.hotspots.length, g.singles.length, g.singles[0].sessions], [0, 1, 2]) // 2 sessions = single card
  g = groupTaps(map(tap('a', now - 4 * M, ['Betrunkene Gruppe']), tap('b', now - M, ['Zu voll']), tap('c', now, ['Betrunkene Gruppe'])), now)
  assert.deepEqual([g.hotspots.length, g.hotspots[0].sessions, g.hotspots[0].topReason], [1, 3, 'Betrunkene Gruppe'])
  g = groupTaps(map(tap('a', now - 6 * M), tap('b', now - 3 * M), tap('c', now)), now) // spread over 6 min
  assert.deepEqual([g.hotspots.length, g.singles[0].sessions], [0, 2])
  g = groupTaps(map(tap('a', now - 2 * M), tap('a', now - M), tap('a', now)), now) // one phone tapping 3x
  assert.deepEqual([g.hotspots.length, g.singles[0].sessions], [0, 1])
  g = groupTaps(map(tap('a', now - 5 * M), tap('b', now), tap('c', now)), now) // exactly 5:00 old still counts
  assert.equal(g.hotspots.length, 1)
  g = groupTaps(map(tap('a', now - 5 * M - 1), tap('b', now), tap('c', now)), now)
  assert.equal(g.hotspots.length, 0)
  g = groupTaps(map(tap('a', now, ['Zu voll']), tap('b', now, ['Belästigung'])), now) // tie -> first seen
  assert.equal(g.singles[0].topReason, 'Zu voll')
  g = groupTaps(map(tap('a', now), tap('b', now, [], 'U3|Y|2')), now) // different trains = separate cards
  assert.equal(g.singles.length, 2)
}

// --- indoor routing (issue #13) ---
import { loadIndoor, startNode, routeTo, findRoute, toSteps, pickExit, bearing } from './indoor'
import { MOCK_CROWDS } from './mock'
{
  const mf = loadIndoor('de:09162:500')!
  const mfStop = SNAPSHOTS.arena.route.legs[0].stops.find((s) => s.id === 'de:09162:500')!
  assert.equal(mfStop.platform, 2)
  const start = startNode(mf, mfStop, false, 209)
  assert.equal(mf.nodes[start][2], -2) // starts on the U-Bahn platform
  assert.deepEqual(mf.exits.map((e) => e.ref).sort(), ['A', 'B', 'C', 'D', 'E', 'F', 'G'])
  for (const e of mf.exits) assert.ok(routeTo(mf, start, e.node), `exit ${e.ref} reachable`)
  const toWait = toSteps(mf, routeTo(mf, start, mf.wait)!, 209, 'Hier warten', mfStop && [mfStop.lat, mfStop.lng])
  assert.ok(toWait.some((s) => s.kind === 'stairsUp' || s.kind === 'escalatorUp'), 'goes up to the mezzanine')
  assert.equal(toWait.at(-1)!.kind, 'arrive')
  assert.equal(toWait.at(-1)!.level, -1)
  // An escalator on the way out is avoided when MVG reports it broken.
  const escPath = mf.exits.map((e) => findRoute(mf, start, e.node)!).find((p) => p.kinds.includes('escalator'))!
  const target = escPath.nodes.at(-1)!
  assert.ok(!findRoute(mf, start, target, { brokenEscalator: true })?.kinds.includes('escalator'))
  // Reason decides: followed -> towards people; drunk group -> away from crowds.
  const crowds = MOCK_CROWDS['de:09162:500']
  const followed = pickExit(mf, start, crowds, ['Fühle mich verfolgt'])!
  const drunk = pickExit(mf, start, crowds, ['Betrunkene Gruppe'])!
  assert.notEqual(followed.exit.ref, drunk.exit.ref)
  assert.notEqual(drunk.exit.ref, 'E') // unsafe fans stand at E
  assert.equal(drunk.avoided?.ref, 'E')
  assert.equal(followed.exit.ref, 'A') // busy Leopoldstraße
  // Garching: platform to the emergency point (elevator) stays on the platform.
  const gf = loadIndoor('de:09184:460')!
  const gStop = SNAPSHOTS.garching.route.legs[0].stops[0]
  const gs = startNode(gf, gStop, false, null)
  const em = routeTo(gf, gs, gf.emergency!)!
  assert.ok(em.nodes.every((n) => gf.nodes[n][2] === -1))
  // toSteps: a 90° turn becomes left/right.
  const sq = { ...gf, nodes: [[48, 11, -1], [48.0005, 11, -1], [48.0005, 11.0007, -1]] as [number, number, number][], edges: [] }
  const st = toSteps(sq, { nodes: [0, 1, 2], kinds: ['walk', 'walk'], length: 100 }, bearing([48, 11], [48.0005, 11]), 'x')
  assert.deepEqual(st.map((s) => s.kind), ['straight', 'right', 'arrive'])
}

// --- SafeRide reports -> crowds (issue #19) ---
import { reportCrowds } from './hotspots'
import type { Report } from './types'
{
  const r = (id: string, o: Partial<Report>): Report => ({ id, sessionId: 's', lat: 48, lng: 11, size: 'small', intensity: 'loud', panic: false, title: id, from: 0, to: 100, ...o })
  const c = reportCrowds([r('loud', {}), r('agg', { intensity: 'aggressive' }), r('har', { intensity: 'harassing' }), r('pin', { panic: true, size: null, intensity: null }),
    r('old', { to: 50 }), r('undo', { to: 60 })], 60)
  assert.deepEqual(c.map((x) => [x.id, x.kind]), [['loud', 'busy'], ['agg', 'unsafe'], ['har', 'unsafe'], ['pin', 'unsafe']]) // expired + undone dropped
  assert.deepEqual([c[0].from, c[0].to], [0, 100]) // real report times reach the other phones
}

console.log('selfcheck ok')
