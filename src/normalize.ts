// Pure MVG helpers (used by mvg.ts, mock.ts and selfcheck).
import type { LatLng, Leg, Route, Stop } from './types'

// Google encoded polyline, precision 5 (checked against a real U6 pathPolyline in selfcheck).
export function decodePolyline(s: string): LatLng[] {
  const out: LatLng[] = []
  let i = 0, lat = 0, lng = 0
  while (i < s.length) {
    for (const k of [0, 1]) {
      let shift = 0, result = 0, b
      do {
        b = s.charCodeAt(i++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const d = result & 1 ? ~(result >> 1) : result >> 1
      if (k === 0) lat += d
      else lng += d
    }
    out.push([lat / 1e5, lng / 1e5])
  }
  return out
}

type RawStop = {
  name: string; stationGlobalId: string; latitude: number; longitude: number; plannedDeparture: string
  hasOutOfOrderEscalator: boolean; hasOutOfOrderElevator: boolean
}
type RawPart = {
  line: { label: string; transportType: string; destination: string }
  from: RawStop; to: RawStop; intermediateStops: RawStop[]; pathPolyline: string
}
export type RawConnection = { parts: RawPart[] }

const stop = (s: RawStop): Stop => ({
  id: s.stationGlobalId, name: s.name, lat: s.latitude, lng: s.longitude,
  dep: Date.parse(s.plannedDeparture), escalatorOut: s.hasOutOfOrderEscalator, elevatorOut: s.hasOutOfOrderElevator,
})

// Drops footpaths; one leg per vehicle.
export function normalize(c: RawConnection): Route {
  const legs: Leg[] = c.parts
    .filter((p) => p.line.transportType !== 'PEDESTRIAN')
    .map((p) => ({
      line: p.line.label,
      destination: p.line.destination,
      stops: [p.from, ...p.intermediateStops, p.to].map(stop),
      polyline: p.pathPolyline ? decodePolyline(p.pathPolyline) : [],
    }))
  return { legs }
}
