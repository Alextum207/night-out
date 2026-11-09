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

assert.ok(true)
console.log('selfcheck ok')
