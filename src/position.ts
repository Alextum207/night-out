// Where is the rider? Clock + planned timetable only (delays ignored, see accepted risks). Pure.
import type { Leg, Position, Route } from './types'

// Demo-only grouping key: identical for everyone who got the same pushed route (idea.md §12).
export const trainKey = (leg: Leg) => `${leg.line}|${leg.destination}|${leg.stops[0].dep}`

const ceilMin = (ms: number) => Math.max(0, Math.ceil(ms / 60_000))

export function where(route: Route, now: number): Position {
  for (let l = 0; l < route.legs.length; l++) {
    const leg = route.legs[l], s = leg.stops
    // Before this leg departs: waiting on the platform (start of trip or changing trains).
    if (now < s[0].dep) {
      return { state: 'platform', leg: l, prevStop: null, nextStop: s[0], etaMin: ceilMin(s[0].dep - now), trainKey: trainKey(leg), lat: s[0].lat, lng: s[0].lng }
    }
    for (let i = 0; i < s.length - 1; i++) {
      if (s[i].dep <= now && now < s[i + 1].dep) {
        const f = (now - s[i].dep) / (s[i + 1].dep - s[i].dep)
        return {
          state: 'train', leg: l, prevStop: s[i], nextStop: s[i + 1], etaMin: ceilMin(s[i + 1].dep - now), trainKey: trainKey(leg),
          lat: s[i].lat + (s[i + 1].lat - s[i].lat) * f, lng: s[i].lng + (s[i + 1].lng - s[i].lng) * f,
        }
      }
    }
  }
  // Arrived: on the platform at the destination.
  const l = route.legs.length - 1, leg = route.legs[l], last = leg.stops.at(-1)!
  return { state: 'platform', leg: l, prevStop: null, nextStop: last, etaMin: 0, trainKey: trainKey(leg), lat: last.lat, lng: last.lng }
}
