// Mock data: route snapshots (captured once from live MVG /routes on 2026-11-09), security teams,
// walking directions, occupancy per car, events. Pure module, safe for selfcheck.
import type { Route, ScenarioId, Stop } from './types'
import { normalize, type RawConnection } from './normalize'
import arena from './data/arena.json'
import garching from './data/garching.json'

const route = (raw: unknown) => normalize(raw as RawConnection)

const stopById = (r: Route, id: string): Stop =>
  r.legs.flatMap((l) => l.stops).find((s) => s.id === id)!

const arenaRoute = route(arena) // U6 Fröttmaning -> Sendlinger Tor, after the match
const garchingRoute = route(garching) // U6 Garching-Forschungszentrum -> Münchner Freiheit -> U3 Marienplatz, ~00:46

export const SNAPSHOTS: Record<ScenarioId, { label: string; route: Route; virtualNow: number }> = {
  // On the train, just past Dietlindenstraße; next stop Münchner Freiheit.
  arena: { label: 'Arena (U6 nach dem Spiel)', route: arenaRoute, virtualNow: stopById(arenaRoute, 'de:09162:510').dep + 10_000 },
  // Alone on the platform, 4 min before the night U6 leaves.
  garching: { label: 'Garching (nachts allein am Bahnsteig)', route: garchingRoute, virtualNow: garchingRoute.legs[0].stops[0].dep - 4 * 60_000 },
}

// Offline autocomplete: every stop from the snapshots.
export const STATIONS = [...new Map(
  Object.values(SNAPSHOTS).flatMap((s) => s.route.legs.flatMap((l) => l.stops))
    .map((s) => [s.id, { id: s.id, name: s.name, place: 'München' }] as const),
).values()]

export type SecurityTeam = { id: string; name: string; lat: number; lng: number }
export const SECURITY_TEAMS: SecurityTeam[] = [
  { id: 'nord', name: 'U-Bahn-Wache Nord', lat: 48.16195, lng: 11.58616 }, // at Münchner Freiheit
  { id: 'mitte', name: 'U-Bahn-Wache Mitte', lat: 48.13719, lng: 11.57540 }, // Marienplatz
  { id: 'sued', name: 'U-Bahn-Wache Süd', lat: 48.13340, lng: 11.56650 }, // Sendlinger Tor
  { id: 'garching', name: 'Streife Campus Garching', lat: 48.26250, lng: 11.66650 }, // ~450 m from Garching-FZ
]

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const k = Math.PI / 180, R = 6371000
  const x = (b.lng - a.lng) * k * Math.cos(((a.lat + b.lat) / 2) * k), y = (b.lat - a.lat) * k
  return Math.sqrt(x * x + y * y) * R
}

// Nearest team and its walking time (75 m/min) to a point.
export function nearestTeam(p: { lat: number; lng: number }) {
  const t = SECURITY_TEAMS.map((t) => ({ t, d: metres(t, p) })).sort((a, b) => a.d - b.d)[0]
  return { team: t.t, minutes: Math.max(1, Math.round(t.d / 75)) }
}

// 3 walking steps from the platform to where security meets the rider.
const DIRECTIONS: Record<string, string[]> = {
  'de:09162:500': [ // Münchner Freiheit
    'Steig aus und geh am Bahnsteig nach vorne Richtung Ausgang Leopoldstraße.',
    'Nimm die Rolltreppe hoch ins Sperrengeschoss.',
    'Security wartet am Kiosk direkt neben den Fahrkartenautomaten.',
  ],
  'de:09184:460': [ // Garching, Forschungszentrum
    'Bleib am Bahnsteig unter der Kamera beim Notruf- und Infopunkt.',
    'Der Bereich vorne am Aufzug ist hell beleuchtet.',
    'Die Streife kommt zu dir an den Bahnsteig.',
  ],
}
export const directions = (stationId: string) => DIRECTIONS[stationId] ?? [
  'Geh zur Bahnsteigmitte, dort ist der Notruf- und Infopunkt.',
  'Bleib im hellen Bereich unter der Kamera.',
  'Security kommt zu dir an den Bahnsteig.',
]

// Simulated occupancy per car (MVG has no live wagon-level data; see idea.md §11).
export const emptiestCar = (line: string) => (line === 'U6' ? 'vorderste' : 'hinterste')

export type CityEvent = { name: string; venue: string; ends: string; lines: string[] }
export const EVENTS: CityEvent[] = [
  { name: 'FC Bayern – Borussia Dortmund', venue: 'Allianz Arena', ends: '22:30', lines: ['U6'] },
  { name: 'Konzert: Paula Hartmann', venue: 'Olympiahalle', ends: '23:00', lines: ['U3'] },
  { name: 'Semesterparty TUM', venue: 'Campus Garching', ends: '02:00', lines: ['U6'] },
]
