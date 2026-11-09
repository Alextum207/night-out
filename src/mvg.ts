// MVG client (unofficial API, CORS *). Every call times out after 3 s and falls back to mock data.
import type { Route } from './types'
import { normalize, type RawConnection } from './normalize'
import { SNAPSHOTS, STATIONS } from './mock'

const BASE = 'https://www.mvg.de/api/bgw-pt/v3'

async function get<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path, { signal: AbortSignal.timeout(3000) })
  if (!r.ok) throw new Error(`MVG ${r.status}`)
  return r.json()
}

export type StationHit = { id: string; name: string; place: string }

export async function searchStations(q: string): Promise<StationHit[]> {
  try {
    const r = await get<{ globalId: string; name: string; place: string }[]>(
      `/locations?query=${encodeURIComponent(q)}&locationTypes=STATION`,
    )
    return r.slice(0, 6).map((x) => ({ id: x.globalId, name: x.name, place: x.place }))
  } catch {
    const n = q.toLowerCase()
    return STATIONS.filter((s) => s.name.toLowerCase().includes(n)).slice(0, 6)
  }
}

// Next connection departing at or after `at`. Falls back to a snapshot with the same endpoints.
export async function getRoute(fromId: string, toId: string, at = Date.now()): Promise<{ route: Route; live: boolean } | null> {
  try {
    const r = await get<RawConnection[]>(
      `/routes?originStationGlobalId=${fromId}&destinationStationGlobalId=${toId}&routingDateTime=${new Date(at).toISOString()}`,
    )
    const routes = r.map(normalize).filter((x) => x.legs.length)
    const next = routes.find((x) => x.legs[0].stops[0].dep >= at - 60_000) ?? routes[0]
    if (next) return { route: next, live: true }
  } catch { /* fall through */ }
  const snap = Object.values(SNAPSHOTS).find((s) => {
    const legs = s.route.legs
    return legs[0].stops[0].id === fromId && legs.at(-1)!.stops.at(-1)!.id === toId
  })
  return snap ? { route: snap.route, live: false } : null
}

export type Departure = { line: string; destination: string; dep: number; delay: number }

export async function getDepartures(stationId: string): Promise<Departure[] | null> {
  try {
    const r = await get<{ label: string; destination: string; realtimeDepartureTime: number; plannedDepartureTime: number; delayInMinutes?: number; cancelled: boolean }[]>(
      `/departures?globalId=${stationId}&limit=8`,
    )
    return r.filter((d) => !d.cancelled).map((d) => ({
      line: d.label, destination: d.destination, dep: d.realtimeDepartureTime ?? d.plannedDepartureTime, delay: d.delayInMinutes ?? 0,
    }))
  } catch {
    return null
  }
}
