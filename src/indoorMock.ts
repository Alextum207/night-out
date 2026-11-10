// Mock station layout for every U3 station without real indoor data (Münchner Freiheit has one). Pure.
// Platform (level -2) along the direction of travel, escalator at the back and stairs at the front up to the
// Sperrengeschoss (-1) with the staff point, one exit per end at street level; one exit is usually busy.
import type { Crowd, LatLng } from './types'
import { metres, type EdgeKind, type Graph } from './indoor'

// Street names for the first stations of the demo ride; the rest get generic ones.
const STREETS: Record<string, [string, string]> = {
  Odeonsplatz: ['Ludwigstraße', 'Hofgarten'],
  Universität: ['Schellingstraße', 'Geschwister-Scholl-Platz'],
  Giselastraße: ['Leopoldstraße', 'Giselastraße'],
}

const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0

export type MockStation = { graph: Graph; crowds: Crowd[] }

export function mockStation(stop: { name: string; lat: number; lng: number }, travelBearing: number | null): MockStation {
  const th = ((travelBearing ?? 0) * Math.PI) / 180
  const kLat = 1 / 111_320, kLng = 1 / (111_320 * Math.cos((stop.lat * Math.PI) / 180))
  // x = metres along the direction of travel, y = metres to the right of it
  const at = (x: number, y: number): LatLng => [
    stop.lat + (x * Math.cos(th) - y * Math.sin(th)) * kLat,
    stop.lng + (x * Math.sin(th) + y * Math.cos(th)) * kLng,
  ]
  const h = hash(stop.name), staffFront = h % 2 === 0, busyFront = (h >> 1) % 2 === 0
  const nodes: Graph['nodes'] = [], edges: Graph['edges'] = []
  const node = (x: number, y: number, level: number) => { const [lat, lng] = at(x, y); nodes.push([lat, lng, level]); return nodes.length - 1 }
  const edge = (a: number, b: number, kind: EdgeKind) => edges.push([a, b, kind, metres([nodes[a][0], nodes[a][1]], [nodes[b][0], nodes[b][1]]), 0])
  const chain = (ids: number[]) => ids.slice(1).forEach((b, i) => edge(ids[i], b, 'walk'))

  // platform
  const P = [-60, -20, 0, 20, 60].map((x) => node(x, 0, -2))
  chain(P)
  const sos = node(0, -3, -2) // Notruf- und Infopunkt in the middle of the platform
  edge(P[2], sos, 'walk')
  // Sperrengeschoss
  const M = [-30, -15, 0, 15, 30].map((x) => node(x, 0, -1))
  chain(M)
  edge(P[1], M[0], 'escalator') // back
  edge(P[3], M[4], 'steps') // front
  const staff = node(staffFront ? 25 : -25, 8, -1)
  edge(staffFront ? M[4] : M[0], staff, 'walk')
  // street
  const back = node(-45, 0, 0), front = node(45, 0, 0)
  edge(M[0], back, 'escalator'); edge(M[4], front, 'steps')

  const [sBack, sFront] = STREETS[stop.name] ?? [`${stop.name} Süd`, `${stop.name} Nord`]
  const busyNode = busyFront ? front : back
  const graph: Graph = {
    id: `mock:${stop.name}`, name: stop.name, nodes, edges,
    platforms: [{ ref: '1;2', level: -2, center: at(0, 0), ends: [at(-60, 0), at(60, 0)] }],
    exits: [{ node: back, ref: 'A', street: sBack }, { node: front, ref: 'B', street: sFront }],
    wait: staff, emergency: sos, police: [],
    outline: [[at(-66, -8), at(66, -8), at(66, 10), at(-66, 10)]],
  }
  const crowds: Crowd[] = [{ lat: nodes[busyNode][0], lng: nodes[busyNode][1], kind: 'busy', label: `Belebt: ${busyFront ? sFront : sBack}` }]
  return { graph, crowds }
}
