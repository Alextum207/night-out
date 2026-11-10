// Fetch OSM indoor data for the demo stations and write a routing graph per station.
// Run: npx tsx scripts/indoor-fetch.ts   (output committed to src/data/indoor/)
import { writeFileSync, mkdirSync } from 'node:fs'

type LatLng = [number, number]
const STATIONS = [
  { id: 'de:09162:500', name: 'Münchner Freiheit', at: [48.16195, 11.58616] as LatLng },
  { id: 'de:09184:460', name: 'Garching, Forschungszentrum', at: [48.26486, 11.67123] as LatLng },
]

type El = { type: 'node' | 'way'; id: number; lat?: number; lon?: number; nodes?: number[]; tags?: Record<string, string>; center?: { lat: number; lon: number } }

const metres = (a: LatLng, b: LatLng) => {
  const k = Math.PI / 180
  const x = (b[1] - a[1]) * k * Math.cos(((a[0] + b[0]) / 2) * k), y = (b[0] - a[0]) * k
  return Math.sqrt(x * x + y * y) * 6371000
}
const levels = (s?: string) => (s ?? '').split(';').map(Number).filter((x) => !isNaN(x) && s !== undefined && s !== '')

async function overpass(q: string): Promise<El[]> {
  const r = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', body: new URLSearchParams({ data: q }), headers: { 'User-Agent': 'way-out-prototype' },
  })
  if (!r.ok) throw new Error(`overpass ${r.status}`)
  return (await r.json()).elements
}

for (const st of STATIONS) {
  const [lat, lon] = st.at
  const A = `(around:250,${lat},${lon})`
  const els = await overpass(`[out:json][timeout:60];(
    way${A}[highway~"^(footway|steps|corridor|pedestrian|path|elevator)$"];
    way${A}[railway=platform];
    way${A}[indoor~"^(corridor|area)$"];
    node${A}[railway=subway_entrance];
    node${A}[highway=elevator];
    node${A}[vending=public_transport_tickets];
  );out body;>;out skel qt;
  (node(around:1500,${lat},${lon})[amenity=police];way(around:1500,${lat},${lon})[amenity=police];);out center tags;
  way(around:120,${lat},${lon})[highway~"^(primary|secondary|tertiary|residential|living_street|pedestrian|unclassified)$"][name];out geom tags;`)

  const nodeById = new Map<number, El>(), ways: El[] = []
  for (const e of els) {
    if (e.type === 'node' && e.lat !== undefined) nodeById.set(e.id, { ...nodeById.get(e.id), ...e, tags: { ...nodeById.get(e.id)?.tags, ...e.tags } })
    if (e.type === 'way' && e.nodes) ways.push(e)
  }
  const ll = (id: number): LatLng => [nodeById.get(id)!.lat!, nodeById.get(id)!.lon!]
  const walkWays = ways.filter((w) => /^(footway|steps|corridor|pedestrian|path)$/.test(w.tags?.highway ?? ''))

  // Graph nodes: every node of a walkable way.
  const index = new Map<number, number>(), nodes: [number, number, number | null][] = []
  const idx = (id: number) => {
    if (!index.has(id)) { index.set(id, nodes.length); nodes.push([...ll(id), null]) }
    return index.get(id)!
  }
  // Node level from single-level non-steps ways; ways without a level tag are street level (0).
  for (const w of walkWays) {
    if (w.tags!.highway === 'steps') continue
    const lv = w.tags!.level === undefined ? [0] : levels(w.tags!.level)
    if (lv.length === 1) for (const n of w.nodes!) nodes[idx(n)][2] ??= lv[0]
  }
  const edges: [number, number, string, number, 0 | 1][] = []
  for (const w of walkWays) {
    const t = w.tags!, steps = t.highway === 'steps', esc = steps && t.conveying !== undefined && t.conveying !== 'no'
    const kind = esc ? 'escalator' : steps ? 'steps' : 'walk'
    const ids = t.conveying === 'backward' ? [...w.nodes!].reverse() : w.nodes!
    const oneway: 0 | 1 = esc && (t.conveying === 'forward' || t.conveying === 'backward') ? 1 : 0
    for (let i = 1; i < ids.length; i++) {
      const a = idx(ids[i - 1]), b = idx(ids[i])
      edges.push([a, b, kind, Math.round(metres(ll(ids[i - 1]), ll(ids[i])) * 10) / 10, oneway])
    }
  }
  // Propagate levels over walk edges to nodes that only sit on stairs.
  for (let changed = true; changed;) {
    changed = false
    for (const [a, b, k] of edges) {
      if (k !== 'walk') continue
      if (nodes[a][2] === null && nodes[b][2] !== null) { nodes[a][2] = nodes[b][2]; changed = true }
      if (nodes[b][2] === null && nodes[a][2] !== null) { nodes[b][2] = nodes[a][2]; changed = true }
    }
  }
  // Steps endpoints still without level: take the step way's level range by direction.
  for (const w of walkWays.filter((w) => w.tags!.highway === 'steps')) {
    const lv = levels(w.tags!.level).sort((a, b) => a - b)
    if (lv.length < 2) continue
    const [first, last] = [index.get(w.nodes![0])!, index.get(w.nodes!.at(-1)!)!]
    const up = (w.tags!.incline ?? 'up') !== 'down'
    if (nodes[first][2] === null) nodes[first][2] = nodes[last][2] !== null ? (nodes[last][2] === lv[0] ? lv.at(-1)! : lv[0]) : up ? lv[0] : lv.at(-1)!
    if (nodes[last][2] === null) nodes[last][2] = nodes[first][2] === lv[0] ? lv.at(-1)! : lv[0]
  }
  // Elevators: connect graph nodes within 4 m of an elevator node across levels.
  const elevators = [...nodeById.values()].filter((n) => n.tags?.highway === 'elevator')
  for (const e of elevators) {
    const near = nodes.map((n, i) => ({ i, d: metres([n[0], n[1]], [e.lat!, e.lon!]), lv: n[2] })).filter((x) => x.d < 4)
    for (const a of near) for (const b of near) if (a.i < b.i && a.lv !== b.lv) edges.push([a.i, b.i, 'elevator', 0, 0])
  }

  // A walk edge that changes level hides missing tags: it is really stairs (or the elevator if one is next to it).
  for (const e of edges) {
    const [a, b] = e, la = nodes[a][2], lb = nodes[b][2]
    if (e[2] !== 'walk' || la === null || lb === null || la === lb) continue
    const atLift = elevators.some((l) => metres([nodes[a][0], nodes[a][1]], [l.lat!, l.lon!]) < 6 || metres([nodes[b][0], nodes[b][1]], [l.lat!, l.lon!]) < 6)
    e[2] = atLift ? 'elevator' : 'steps'
  }

  const nearest = (p: LatLng, level: number | null) => {
    let best = -1, bd = Infinity
    nodes.forEach((n, i) => { const d = metres(p, [n[0], n[1]]); if ((level === null || n[2] === level) && d < bd) { bd = d; best = i } })
    return best
  }
  const centroid = (pts: LatLng[]): LatLng => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]

  // Underground platforms (the U-Bahn ones) with both ends of the long axis.
  const platforms = ways.filter((w) => w.tags?.railway === 'platform' && levels(w.tags.level).some((l) => l < 0)).map((w) => {
    const pts = w.nodes!.map(ll)
    let ends: [LatLng, LatLng] = [pts[0], pts[1]], far = 0
    for (const a of pts) for (const b of pts) if (metres(a, b) > far) { far = metres(a, b); ends = [a, b] }
    return { ref: w.tags!.ref ?? '', level: levels(w.tags!.level)[0], center: centroid(pts), ends }
  })
  const pfLevel = Math.min(...platforms.map((p) => p.level))

  const streets = ways.filter((w) => w.tags?.name && w.tags.highway && !/footway|steps|corridor|path/.test(w.tags.highway)) as (El & { geometry?: { lat: number; lon: number }[] })[]
  const streetOf = (p: LatLng) => {
    let best = '', bd = 80
    for (const s of els as (El & { geometry?: { lat: number; lon: number }[] })[]) {
      if (s.type !== 'way' || !s.geometry || !s.tags?.name) continue
      for (const g of s.geometry) { const d = metres(p, [g.lat, g.lon]); if (d < bd) { bd = d; best = s.tags.name } }
    }
    return best
  }
  void streets
  const exits = [...nodeById.values()].filter((n) => n.tags?.railway === 'subway_entrance' && index.has(n.id))
    .map((n) => ({ node: index.get(n.id)!, ref: n.tags!.ref ?? '', street: streetOf([n.lat!, n.lon!]) }))
    .filter((e) => e.ref)
  // Meeting / waiting point: at the ticket machines on the mezzanine (or platform level if there is none).
  const machines = [...nodeById.values()].filter((n) => n.tags?.vending === 'public_transport_tickets')
  const mezz = machines.filter((m) => levels(m.tags!.level).some((l) => l > pfLevel && l < 0))
  const atMachines = (mezz.length ? mezz : machines.filter((m) => levels(m.tags!.level).includes(pfLevel))).map((m) => [m.lat!, m.lon!] as LatLng)
  const mezzLevel = mezz.length ? levels(mezz[0].tags!.level)[0] : pfLevel
  const wait = nearest(centroid(atMachines.length ? atMachines : [st.at]), mezzLevel)
  // Emergency point: the elevator closest to the platform centre, on platform level.
  const pfCenter = centroid(platforms.map((p) => p.center))
  const lift = elevators.filter((e) => levels(e.tags!.level).includes(pfLevel)).sort((a, b) => metres([a.lat!, a.lon!], pfCenter) - metres([b.lat!, b.lon!], pfCenter))[0]
  const emergency = lift ? nearest([lift.lat!, lift.lon!], pfLevel) : null

  const police = els.filter((e) => e.tags?.amenity === 'police').map((e) => ({
    name: e.tags!.name ?? 'Polizei', lat: e.lat ?? e.center!.lat, lng: e.lon ?? e.center!.lon,
  }))
  const outline = ways.filter((w) => (w.tags?.railway === 'platform' || /corridor|area/.test(w.tags?.indoor ?? ''))
    && levels(w.tags!.level).some((l) => l < 0) && w.nodes![0] === w.nodes!.at(-1) && metres(ll(w.nodes![0]), st.at) < 160)
    .map((w) => w.nodes!.map((n) => ll(n).map((x) => Math.round(x * 1e6) / 1e6) as LatLng))

  // Keep only the connected component that contains the platforms.
  const adj = nodes.map(() => [] as number[])
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a) }
  const seed = nearest(pfCenter, pfLevel), keep = new Set([seed]), queue = [seed]
  while (queue.length) for (const n of adj[queue.pop()!]) if (!keep.has(n)) { keep.add(n); queue.push(n) }
  const remap = new Map<number, number>(), outNodes: typeof nodes = []
  nodes.forEach((n, i) => { if (keep.has(i)) { remap.set(i, outNodes.length); outNodes.push([Math.round(n[0] * 1e7) / 1e7, Math.round(n[1] * 1e7) / 1e7, n[2]]) } })
  const R = (i: number | null) => (i === null ? null : remap.get(i) ?? null)
  const graph = {
    id: st.id, name: st.name, nodes: outNodes,
    edges: edges.filter(([a, b]) => keep.has(a) && keep.has(b)).map(([a, b, k, l, o]) => [R(a), R(b), k, l, o]),
    platforms, exits: exits.filter((e) => keep.has(e.node)).map((e) => ({ ...e, node: R(e.node) })),
    wait: R(wait), emergency: R(emergency), police, outline,
  }
  mkdirSync('src/data/indoor', { recursive: true })
  const file = `src/data/indoor/${st.id.replaceAll(':', '-')}.json`
  writeFileSync(file, JSON.stringify(graph))
  console.log(`${st.name}: ${outNodes.length} nodes, ${graph.edges.length} edges, platforms ${platforms.map((p) => `${p.ref}@${p.level}`).join(' ')}, exits ${graph.exits.map((e) => `${e.ref}(${e.street})`).join(' ')} [${exits.length - graph.exits.length} unreachable], wait=${graph.wait}, emergency=${graph.emergency}, police ${police.length}, outline ${outline.length} -> ${file}`)
}
