import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { Circle, MapContainer, Marker, Polygon, Polyline, TileLayer, useMap } from 'react-leaflet'
import type { Action, Crowd, LatLng, Stop } from '../types'
import { levelName, loadIndoor, pickExit, routeTo, startNode, toSteps, type Step, type StepKind } from '../indoor'
import { directions, SECURITY_TEAMS } from '../mock'
import { useHeading } from '../compass'

export type NavTarget = 'wait' | 'security' | 'emergency'

type Props = {
  stop: Stop
  target: NavTarget
  travelBearing: number | null
  frontCar: boolean
  reasons: string[]
  crowds: Crowd[]
  nextTrainMin: number
  feedback: Action | null
  onClose: () => void
}

const ARRIVE: Record<NavTarget, string> = {
  wait: 'Hier ist es sicher: Personal und Kamera. Warte hier auf die nächste Bahn.',
  security: 'Security wartet hier.',
  emergency: 'Notruf- und Infopunkt am Aufzug. Hier bist du gut sichtbar.',
}

export default function Navigate(p: Props) {
  const g = loadIndoor(p.stop.id)
  const [out, setOut] = useState(false)
  const [i, setI] = useState(0)
  const heading = useHeading()
  const opts = { brokenEscalator: p.stop.escalatorOut, brokenElevator: p.stop.elevatorOut }

  const plan = useMemo(() => {
    if (!g) {
      const steps: Step[] = directions(p.stop.id).map((text) => ({ kind: 'straight', text, bearing: 0, level: null, points: [[p.stop.lat, p.stop.lng]], underground: true }))
      steps.push({ kind: 'arrive', text: ARRIVE[p.target], bearing: 0, level: null, points: [[p.stop.lat, p.stop.lng]], underground: true })
      return { steps, hint: '' }
    }
    const start = startNode(g, p.stop, p.frontCar, p.travelBearing)
    const pf = g.platforms.find((x) => x.level === g.nodes[start][2]) ?? g.platforms[0]
    const origin: LatLng = p.frontCar ? [g.nodes[start][0], g.nodes[start][1]] : pf.center
    let hint = p.stop.escalatorOut ? 'Rolltreppe außer Betrieb – wir nehmen die Treppe.' : p.stop.elevatorOut ? 'Aufzug außer Betrieb.' : ''
    if (out) {
      const c = pickExit(g, start, p.crowds, p.reasons, opts)
      if (c) {
        if (c.avoided) hint = `Menschenmenge an Ausgang ${c.avoided.ref} – wir nehmen Ausgang ${c.exit.ref}.`
        else if (p.reasons.includes('Fühle mich verfolgt')) hint = `Ausgang ${c.exit.ref}: dort sind Menschen unterwegs.`
        return { steps: toSteps(g, c.path, p.travelBearing, `Ausgang ${c.exit.ref}${c.exit.street ? ` – ${c.exit.street}` : ''}. Du bist draußen.`, origin), hint }
      }
    }
    const to = p.target === 'emergency' ? g.emergency ?? g.wait : g.wait
    const path = routeTo(g, start, to, opts)
    return { steps: path ? toSteps(g, path, p.travelBearing, ARRIVE[p.target], origin) : [], hint }
  }, [g, p.stop, p.target, p.frontCar, p.travelBearing, p.reasons, p.crowds, out]) // eslint-disable-line react-hooks/exhaustive-deps

  const steps = plan.steps
  const idx = Math.min(i, steps.length - 1)
  const step = steps[idx]
  const next = () => setI((x) => Math.min(x + 1, steps.length - 1))
  const back = () => setI((x) => Math.max(0, x - 1))

  // Swipe left = next, right = back. A plain tap also goes forward.
  const sx = useRef<number | null>(null)
  const onUp = (e: React.PointerEvent) => {
    const dx = sx.current === null ? 0 : e.clientX - sx.current
    sx.current = null
    if (dx > 50) back()
    else next()
  }

  if (!step) return null
  const done = step.kind === 'arrive'
  const level = g ? levelName(g, step.level) : ''
  const rot = step.kind === 'straight' && heading !== null ? step.bearing - heading : 0

  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col bg-slate-950">
      <section
        onPointerDown={(e) => (sx.current = e.clientX)} onPointerUp={onUp}
        className={`relative flex flex-1 select-none flex-col items-center justify-center gap-3 px-6 text-white ${done ? 'bg-emerald-600' : 'bg-violet-700'}`}>
        <div className="absolute left-4 right-4 top-3 flex items-center text-sm text-white/80">
          <span>Schritt {idx + 1}/{steps.length}{level && ` · ${level}`}</span>
          <button onPointerUp={(e) => e.stopPropagation()} onClick={p.onClose} className="ml-auto min-h-11 min-w-11 text-2xl" aria-label="Schließen">✕</button>
        </div>
        {p.feedback && <p className="absolute top-14 rounded-full bg-white/20 px-3 py-1 text-sm">{p.feedback.text}</p>}
        <Glyph kind={step.kind} rotate={rot} />
        <p className="text-center text-2xl font-bold leading-snug" data-testid="nav-text">{step.text}</p>
        {plan.hint && <p className="rounded-lg bg-black/25 px-3 py-1 text-center text-sm">{plan.hint}</p>}
        <div className="absolute bottom-3 left-4 right-4 flex gap-2" onPointerUp={(e) => e.stopPropagation()}>
          {idx > 0 && <button onClick={back} className="min-h-11 rounded-full bg-white/15 px-4">Zurück</button>}
          {!out && p.target !== 'emergency' && g && (
            <button onClick={() => { setOut(true); setI(0) }} className="ml-auto min-h-11 rounded-full bg-white px-4 font-semibold text-violet-800">Lieber raus auf die Straße</button>
          )}
          {!done && <span className="ml-auto self-center text-sm text-white/70">Tippen für weiter</span>}
        </div>
      </section>
      <section className="relative h-[45%] shrink-0">
        <NavMap steps={steps} current={idx} stop={p.stop} crowds={p.crowds} outline={g?.outline ?? []} police={g?.police ?? []} />
      </section>
    </div>
  )
}

function Glyph({ kind, rotate }: { kind: StepKind; rotate: number }) {
  const arrow = (deg: number) => (
    <svg viewBox="0 0 100 100" className="h-40 w-40 drop-shadow-lg transition-transform duration-300" style={{ transform: `rotate(${deg}deg)` }} aria-hidden>
      <path d="M50 6 L86 50 H62 V94 H38 V50 H14 Z" fill="white" />
    </svg>
  )
  const box = (label: string, up: boolean | null) => (
    <div className="flex h-40 w-40 flex-col items-center justify-center rounded-3xl border-4 border-white text-white">
      <svg viewBox="0 0 100 60" className="h-16 w-24" aria-hidden>
        {label === 'Aufzug'
          ? <><rect x="25" y="2" width="50" height="56" rx="6" fill="none" stroke="white" strokeWidth="6" /><path d="M40 24 L50 12 L60 24 M40 36 L50 48 L60 36" stroke="white" strokeWidth="6" fill="none" /></>
          : <path d="M5 55 H25 V42 H45 V29 H65 V16 H95" stroke="white" strokeWidth="8" fill="none" style={{ transform: up ? 'none' : 'scaleX(-1)', transformOrigin: '50px 30px' }} />}
      </svg>
      <span className="mt-1 text-lg font-bold">{label}{up === null ? '' : up ? ' ↑' : ' ↓'}</span>
    </div>
  )
  switch (kind) {
    case 'straight': return arrow(rotate)
    case 'left': return arrow(-90)
    case 'right': return arrow(90)
    case 'stairsUp': return box('Treppe', true)
    case 'stairsDown': return box('Treppe', false)
    case 'escalatorUp': return box('Rolltreppe', true)
    case 'escalatorDown': return box('Rolltreppe', false)
    case 'elevator': return box('Aufzug', null)
    case 'arrive': return <div className="flex h-40 w-40 items-center justify-center rounded-full border-8 border-white text-7xl">✓</div>
  }
}

const badge = (html: string, cls = '') => L.divIcon({ className: '', html: `<div class="poi ${cls}">${html}</div>`, iconSize: undefined })
const POI: Partial<Record<StepKind, string>> = {
  stairsUp: 'Treppe ↑', stairsDown: 'Treppe ↓', escalatorUp: 'Rolltreppe ↑', escalatorDown: 'Rolltreppe ↓', elevator: 'Aufzug',
}

function Fit({ points }: { points: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [50, 50], maxZoom: 19, animate: false })
    else if (points.length) map.setView(points[0], 19, { animate: false })
  }, [map, points])
  return null
}

function NavMap({ steps, current, stop, crowds, outline, police }: {
  steps: Step[]; current: number; stop: Stop; crowds: Crowd[]; outline: LatLng[][]; police: { name: string; lat: number; lng: number }[]
}) {
  const here = steps[current]
  const all = steps.flatMap((s) => s.points)
  const levelLabels = steps.filter((s, i) => s.level !== null && (i === 0 || steps[i - 1].level !== s.level) && s.kind !== 'arrive')
  return (
    <MapContainer center={[stop.lat, stop.lng]} zoom={18} zoomControl={false} attributionControl={false} className="h-full w-full">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles" maxZoom={20} maxNativeZoom={19} />
      <Circle center={[stop.lat, stop.lng]} radius={140} pathOptions={{ stroke: false, fillColor: '#020617', fillOpacity: 0.55 }} />
      {outline.map((o, i) => <Polygon key={i} positions={o} pathOptions={{ color: '#cbd5e1', weight: 1.5, fillColor: '#94a3b8', fillOpacity: 0.12 }} />)}
      {steps.map((s, i) => s.points.length > 1 && (
        <Polyline key={`g${i}`} positions={s.points} pathOptions={{ color: '#ffffff', weight: i === current ? 16 : 12, opacity: 0.55, lineCap: 'round' }} />
      ))}
      {steps.map((s, i) => s.points.length > 1 && (
        <Polyline key={`r${i}-${current}`} positions={s.points}
          pathOptions={{ color: i < current ? '#a78bfa' : '#7c3aed', weight: i === current ? 10 : 7, dashArray: s.underground ? '12 9' : undefined, lineCap: 'round', className: i === current ? 'pulse-line' : '' }} />
      ))}
      {steps.map((s, i) => POI[s.kind] && <Marker key={`p${i}`} position={s.points[0]} icon={badge(POI[s.kind]!, 'poi-step')} />)}
      {levelLabels.map((s, i) => <Marker key={`l${i}`} position={s.points.at(-1)!} icon={badge(s.level! < 0 ? `Ebene ${s.level}` : 'Straße', 'poi-level')} />)}
      {police.map((x) => <Marker key={x.name} position={[x.lat, x.lng]} icon={badge('🚓 Polizei', 'poi-police')} />)}
      {SECURITY_TEAMS.map((t) => <Marker key={t.id} position={[t.lat, t.lng]} icon={badge('🛡 Security', 'poi-security')} />)}
      {crowds.map((c, i) => <Marker key={`c${i}`} position={[c.lat, c.lng]} icon={badge(`👥 ${c.kind === 'unsafe' ? 'Gruppe' : 'Belebt'}`, c.kind === 'unsafe' ? 'poi-unsafe' : 'poi-busy')} />)}
      <Marker position={steps.at(-1)!.points.at(-1)!} icon={badge('Ziel', 'poi-goal')} />
      <Marker position={here.points[0]} icon={L.divIcon({ className: '', html: '<div class="me-dot"></div>' })} />
      <Fit points={here.points.length > 1 ? here.points : all.length > 1 && current === steps.length - 1 ? all : here.points} />
    </MapContainer>
  )
}
