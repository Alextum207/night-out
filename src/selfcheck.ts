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

// --- hotspots (issue #7) ---

assert.ok(true)
console.log('selfcheck ok')
