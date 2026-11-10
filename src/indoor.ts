// Indoor routing on a precomputed OSM station graph (scripts/indoor-fetch.ts). Pure, no env access.
import type { Crowd, LatLng } from './types'
import { t } from './i18n'
import mf from './data/indoor/de-09162-500.json'
import gfz from './data/indoor/de-09184-460.json'

export type EdgeKind = 'walk' | 'steps' | 'escalator' | 'elevator'
export type Graph = {
  id: string
  name: string
  nodes: [number, number, number | null][] // lat, lng, level
  edges: [number, number, EdgeKind, number, 0 | 1][] // a, b, kind, metres, oneway a->b
  platforms: { ref: string; level: number; center: LatLng; ends: [LatLng, LatLng] }[]
  exits: { node: number; ref: string; street: string }[]
  wait: number
  emergency: number | null
  police: { name: string; lat: number; lng: number }[]
  outline: LatLng[][]
}

const GRAPHS: Record<string, Graph> = {
  'de:09162:500': mf as unknown as Graph,
  'de:09184:460': gfz as unknown as Graph,
}
export const loadIndoor = (stationId: string): Graph | null => GRAPHS[stationId] ?? null

export const metres = (a: LatLng, b: LatLng) => {
  const k = Math.PI / 180
  const x = (b[1] - a[1]) * k * Math.cos(((a[0] + b[0]) / 2) * k), y = (b[0] - a[0]) * k
  return Math.sqrt(x * x + y * y) * 6371000
}
export const bearing = (a: LatLng, b: LatLng) => {
  const k = Math.PI / 180
  const y = Math.sin((b[1] - a[1]) * k) * Math.cos(b[0] * k)
  const x = Math.cos(a[0] * k) * Math.sin(b[0] * k) - Math.sin(a[0] * k) * Math.cos(b[0] * k) * Math.cos((b[1] - a[1]) * k)
  return (Math.atan2(y, x) / k + 360) % 360
}
const turn = (from: number, to: number) => ((to - from + 540) % 360) - 180 // -180..180, + = right

const pt = (g: Graph, i: number): LatLng => [g.nodes[i][0], g.nodes[i][1]]

export function nearestNode(g: Graph, p: LatLng, level: number | null) {
  let best = -1, bd = Infinity
  g.nodes.forEach((n, i) => {
    if (level !== null && n[2] !== level) return
    const d = metres(p, [n[0], n[1]])
    if (d < bd) { bd = d; best = i }
  })
  return best
}

type Adj = { to: number; kind: EdgeKind; len: number }[][]
const adjCache = new WeakMap<Graph, Adj>()
function adjacency(g: Graph): Adj {
  let adj = adjCache.get(g)
  if (adj) return adj
  adj = g.nodes.map(() => [])
  for (const [a, b, kind, len, oneway] of g.edges) {
    adj[a].push({ to: b, kind, len })
    if (!oneway) adj[b].push({ to: a, kind, len })
  }
  adjCache.set(g, adj)
  return adj
}

export type RouteOpts = { brokenEscalator?: boolean; brokenElevator?: boolean }
export type Path = { nodes: number[]; kinds: EdgeKind[]; length: number }

// Dijkstra. Escalators are slightly preferred, stairs slightly penalised, broken ones avoided.
export function findRoute(g: Graph, from: number, to: number, o: RouteOpts = {}): Path | null {
  const adj = adjacency(g)
  const cost = (e: { kind: EdgeKind; len: number }) =>
    e.kind === 'walk' ? e.len
      : e.kind === 'steps' ? e.len * 1.4 + 4
        : e.kind === 'escalator' ? e.len * 0.8 + (o.brokenEscalator ? 1e6 : 0)
          : 25 + (o.brokenElevator ? 1e6 : 0)
  const dist = new Float64Array(g.nodes.length).fill(Infinity)
  const prev = new Int32Array(g.nodes.length).fill(-1)
  const prevKind: EdgeKind[] = []
  const done = new Uint8Array(g.nodes.length)
  dist[from] = 0
  // ponytail: O(n²) scan instead of a heap; station graphs have a few hundred nodes.
  for (;;) {
    let u = -1, best = Infinity
    for (let i = 0; i < dist.length; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i }
    if (u < 0 || u === to) break
    done[u] = 1
    for (const e of adj[u]) {
      const d = dist[u] + cost(e)
      if (d < dist[e.to]) { dist[e.to] = d; prev[e.to] = u; prevKind[e.to] = e.kind }
    }
  }
  if (!isFinite(dist[to]) || dist[to] >= 1e6) return null
  const nodes = [to], kinds: EdgeKind[] = []
  while (nodes[0] !== from) { kinds.unshift(prevKind[nodes[0]]); nodes.unshift(prev[nodes[0]]) }
  let length = 0
  for (let i = 1; i < nodes.length; i++) length += metres(pt(g, nodes[i - 1]), pt(g, nodes[i]))
  return { nodes, kinds, length }
}

// Platforms are often only areas in OSM, so two points on the same level may be joined via other floors.
// If the target is on the start's level and the graph detour is long, walk straight across instead.
export function routeTo(g: Graph, from: number, to: number, o: RouteOpts = {}): Path | null {
  const p = findRoute(g, from, to, o)
  const a = g.nodes[from], b = g.nodes[to], direct = metres([a[0], a[1]], [b[0], b[1]])
  const leavesLevel = p?.nodes.some((n) => g.nodes[n][2] !== a[2])
  if (a[2] === b[2] && direct < 150 && (!p || leavesLevel || p.length > direct * 2 + 30)) return { nodes: [from, to], kinds: ['walk'], length: direct }
  return p
}

export type StepKind = 'straight' | 'left' | 'right' | 'stairsUp' | 'stairsDown' | 'escalatorUp' | 'escalatorDown' | 'elevator' | 'arrive'
export type Step = { kind: StepKind; text: string; bearing: number; level: number | null; points: LatLng[]; underground: boolean }

export function levelName(g: Graph, level: number | null) {
  if (level === null) return ''
  const platform = Math.min(...g.platforms.map((p) => p.level))
  if (level >= 0) return t('Straße')
  if (level === platform) return t('Bahnsteig')
  return t('Sperrengeschoss')
}
const round10 = (m: number) => Math.max(10, Math.round(m / 10) * 10)

// Turn a path into one instruction per action. travelBearing phrases the first step relative to the train.
export function toSteps(g: Graph, p: Path, travelBearing: number | null, arriveText: string, origin?: LatLng): Step[] {
  type Seg = { kind: EdgeKind; nodes: number[] }
  const segs: Seg[] = []
  for (let i = 0; i < p.kinds.length; i++) {
    const kind = p.kinds[i], a = p.nodes[i], b = p.nodes[i + 1]
    const last = segs.at(-1)
    const prevBear = last && last.nodes.length > 1 ? bearing(pt(g, last.nodes.at(-2)!), pt(g, last.nodes.at(-1)!)) : null
    const len = metres(pt(g, a), pt(g, b))
    const bends = kind === 'walk' && last?.kind === 'walk' && prevBear !== null && len > 4 && Math.abs(turn(prevBear, bearing(pt(g, a), pt(g, b)))) > 40
      && metres(pt(g, last.nodes[0]), pt(g, a)) > 6
    if (last && last.kind === kind && !bends) last.nodes.push(b)
    else segs.push({ kind, nodes: [a, b] })
  }
  const lvl = (i: number) => g.nodes[i][2]
  const steps: Step[] = []
  let heading: number | null = null
  const rel = (b: number, len: number, what: string) => {
    if (travelBearing === null) return t('Steig aus und geh {what}, {m} m', { what, m: round10(len) }).replace(/ ,/, ',')
    const d = Math.abs(turn(travelBearing, b))
    const dir = d < 60 ? t('in Fahrtrichtung nach vorne') : d > 120 ? t('entgegen der Fahrtrichtung') : t('quer über den Bahnsteig')
    return t('Steig aus und geh {what}, {m} m', { what: what ? `${dir} ${what}` : dir, m: round10(len) })
  }
  // The platform itself is often only an area in OSM: walk from where you stand to the first graph node.
  const first = pt(g, p.nodes[0])
  if (origin && metres(origin, first) > 5) {
    const b = bearing(origin, first)
    const what = p.kinds[0] === 'escalator' ? t('zur Rolltreppe') : p.kinds[0] === 'steps' ? t('zur Treppe') : p.kinds[0] === 'elevator' ? t('zum Aufzug') : ''
    steps.push({ kind: 'straight', text: rel(b, metres(origin, first), what), bearing: b, level: lvl(p.nodes[0]), points: [origin, first], underground: (lvl(p.nodes[0]) ?? 0) < 0 })
    heading = b
  }
  for (const s of segs) {
    const pts = s.nodes.map((i) => pt(g, i))
    const len = pts.slice(1).reduce((m, q, i) => m + metres(pts[i], q), 0)
    const b0 = bearing(pts[0], pts[Math.min(pts.length - 1, 1)])
    const from = lvl(s.nodes[0]), to = lvl(s.nodes.at(-1)!)
    const same = from !== null && from === to
    const up = from !== null && to !== null ? to > from : true
    const under = (from ?? 0) < 0 || (to ?? 0) < 0
    const into = levelName(g, to) ? ` (${levelName(g, to)})` : ''
    if (s.kind === 'walk') {
      if (len < 5 && steps.length) { steps.at(-1)!.points.push(...pts.slice(1)); continue }
      let kind: StepKind = 'straight', text = t('Geradeaus, {m} m', { m: round10(len) })
      if (!steps.length) {
        text = rel(b0, len, '')
      } else if (heading !== null) {
        const tr = turn(heading, b0)
        if (tr > 40) { kind = 'right'; text = t('Rechts abbiegen, dann {m} m', { m: round10(len) }) }
        else if (tr < -40) { kind = 'left'; text = t('Links abbiegen, dann {m} m', { m: round10(len) }) }
      }
      steps.push({ kind, text, bearing: b0, level: from, points: pts, underground: under })
    } else if (s.kind === 'elevator') {
      steps.push({ kind: 'elevator', text: t('Aufzug nach Ebene {n}', { n: String(to) }) + into, bearing: b0, level: to, points: pts, underground: under })
    } else {
      const esc = s.kind === 'escalator'
      steps.push({
        kind: esc ? (up ? 'escalatorUp' : 'escalatorDown') : up ? 'stairsUp' : 'stairsDown',
        text: same ? t(esc ? 'Rolltreppe, dann weiter' : 'Ein paar Stufen, dann weiter') : t(esc ? (up ? 'Rolltreppe hoch' : 'Rolltreppe runter') : (up ? 'Treppe hoch' : 'Treppe runter')) + into,
        bearing: b0, level: from, points: pts, underground: under,
      })
    }
    heading = bearing(pts.at(-2) ?? pts[0], pts.at(-1)!)
  }
  const end = pt(g, p.nodes.at(-1)!)
  steps.push({ kind: 'arrive', text: arriveText, bearing: heading ?? 0, level: lvl(p.nodes.at(-1)!), points: [end], underground: (lvl(p.nodes.at(-1)!) ?? 0) < 0 })
  return steps
}

// Start on the rider's platform: centre, or the end in the direction of travel after moving to the front car.
export function startNode(g: Graph, stop: { lat: number; lng: number; platform?: number }, frontCar: boolean, travelBearing: number | null) {
  const byRef = stop.platform !== undefined ? g.platforms.find((p) => p.ref.split(';').includes(String(stop.platform))) : undefined
  const pf = byRef ?? [...g.platforms].sort((a, b) => metres(a.center, [stop.lat, stop.lng]) - metres(b.center, [stop.lat, stop.lng]))[0]
  let target = pf.center
  if (frontCar && travelBearing !== null) {
    const ahead = (e: LatLng) => Math.abs(turn(travelBearing, bearing(pf.center, e)))
    target = ahead(pf.ends[0]) < ahead(pf.ends[1]) ? pf.ends[0] : pf.ends[1]
  }
  return nearestNode(g, target, pf.level)
}

// Exits of one station are often only 40-60 m apart, so a crowd only counts for the exit it stands at.
export const CROWD_RADIUS = 30

export type ExitChoice = { exit: Graph['exits'][number]; path: Path; avoided: Graph['exits'][number] | null }

// Followed riders go towards people; everyone else away from crowds. Unsafe crowds are always avoided.
export function pickExit(g: Graph, start: number, crowds: Crowd[], reasons: string[], o: RouteOpts = {}): ExitChoice | null {
  const followed = reasons.includes('Fühle mich verfolgt')
  const scored = g.exits.flatMap((exit) => {
    const path = routeTo(g, start, exit.node, o)
    if (!path) return []
    const near = crowds.filter((c) => metres([c.lat, c.lng], pt(g, exit.node)) < CROWD_RADIUS)
    let penalty = 0
    for (const c of near) penalty += c.kind === 'unsafe' ? 1000 : followed ? -150 : 300
    return [{ exit, path, score: path.length + penalty, penalty }]
  }).sort((a, b) => a.score - b.score)
  if (!scored.length) return null
  const shortest = [...scored].sort((a, b) => a.path.length - b.path.length)[0]
  const best = scored[0]
  return { exit: best.exit, path: best.path, avoided: shortest.exit !== best.exit && shortest.penalty > 0 ? shortest.exit : null }
}

// Way Out targets: the staff point (people who work here) and the nearest exit where people usually are (busy, never unsafe).
// Sorted nearest first.
export type SafeSpot = { kind: 'staff' | 'people'; path: Path; exit: Graph['exits'][number] | null }
export function safeSpots(g: Graph, start: number, crowds: Crowd[], o: RouteOpts = {}): SafeSpot[] {
  const out: SafeSpot[] = []
  const staff = routeTo(g, start, g.wait, o)
  if (staff) out.push({ kind: 'staff', path: staff, exit: null })
  const busy = g.exits.flatMap((exit) => {
    const near = crowds.filter((c) => metres([c.lat, c.lng], pt(g, exit.node)) < CROWD_RADIUS)
    if (!near.some((c) => c.kind === 'busy') || near.some((c) => c.kind === 'unsafe')) return []
    const path = routeTo(g, start, exit.node, o)
    return path ? [{ kind: 'people' as const, path, exit }] : []
  }).sort((a, b) => a.path.length - b.path.length)[0]
  if (busy) out.push(busy)
  return out.sort((a, b) => a.path.length - b.path.length)
}
