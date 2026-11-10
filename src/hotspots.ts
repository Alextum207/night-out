// Group taps into one card per train. Counts distinct sessions in a sliding window. Pure.
import type { Crowd, Hotspot, Report, Tap } from './types'

export const THRESHOLD = 3
export const WINDOW_MIN = 5

export function groupTaps(taps: Map<string, Tap>, now: number): { hotspots: Hotspot[]; singles: Hotspot[] } {
  const from = now - WINDOW_MIN * 60_000
  const byTrain = new Map<string, Tap[]>()
  for (const t of taps.values()) {
    if (t.at < from || t.at > now) continue
    byTrain.set(t.trainKey, [...(byTrain.get(t.trainKey) ?? []), t])
  }
  const cards: Hotspot[] = []
  for (const [trainKey, ts] of byTrain) {
    ts.sort((a, b) => a.at - b.at)
    const last = ts.at(-1)!
    const counts = new Map<string, number>()
    for (const r of ts.flatMap((t) => t.reasons)) counts.set(r, (counts.get(r) ?? 0) + 1)
    let topReason: string | null = null
    for (const [r, c] of counts) if (topReason === null || c > counts.get(topReason)!) topReason = r // ties: first seen
    cards.push({
      trainKey, line: last.line, destination: last.destination, nextStopId: last.nextStopId, nextStopName: last.nextStopName,
      sessions: ts.length, topReason, lat: last.lat, lng: last.lng, level: ts.length >= THRESHOLD ? 'hotspot' : 'single', lastAt: last.at,
    })
  }
  cards.sort((a, b) => b.sessions - a.sessions || b.lastAt - a.lastAt)
  return { hotspots: cards.filter((c) => c.level === 'hotspot'), singles: cards.filter((c) => c.level === 'single') }
}

// SafeRide report categories (public/saferide/app.js REPORT_TYPES): the operator's label and how riders' maps treat them.
// unsafe = never a safe crowd, busy = crowded, info = only for the control room (no crowd on any map).
export const REPORT_CATEGORIES: Record<string, { label: string; kind: 'unsafe' | 'busy' | 'info' }> = {
  harassment: { label: 'Belästigung', kind: 'unsafe' },
  aggressive: { label: 'Aggressive Person', kind: 'unsafe' },
  drunk: { label: 'Betrunkene Gruppe', kind: 'unsafe' },
  followed: { label: 'Verfolgt oder beobachtet', kind: 'unsafe' },
  theft: { label: 'Diebstahl', kind: 'unsafe' },
  crowded: { label: 'Überfüllt', kind: 'busy' },
  broken: { label: 'Defekt', kind: 'info' },
  dirty: { label: 'Verschmutzung', kind: 'info' },
  other: { label: 'Eigene Meldung', kind: 'info' },
}
export const reportKind = (r: Report): 'unsafe' | 'busy' | 'info' =>
  r.panic || r.intensity === 'aggressive' || r.intensity === 'harassing' ? 'unsafe'
    : r.category ? REPORT_CATEGORIES[r.category]?.kind ?? 'info'
      : 'busy' // legacy group reports (size/intensity only)

export const activeReports = (reports: Iterable<Report>, nowMs: number) => [...reports].filter((r) => r.from <= nowMs && nowMs < r.to)

// SafeRide reports as crowds for every map. Info reports (broken, dirty, free text) are not crowds.
export function reportCrowds(reports: Iterable<Report>, nowMs: number): Crowd[] {
  return activeReports(reports, nowMs).flatMap((r) => {
    const kind = reportKind(r)
    return kind === 'info' ? [] : [{ id: r.id, from: r.from, to: r.to, lat: r.lat, lng: r.lng, label: r.title, kind }]
  })
}
