import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { AttributionControl, Circle, MapContainer, Marker, Polygon, Polyline, TileLayer, useMap } from 'react-leaflet'
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
  const keep = (e: React.PointerEvent) => e.stopPropagation() // buttons don't also count as "tap = next"

  if (!step) return null
  const done = step.kind === 'arrive'
  const level = g ? levelName(g, step.level) : ''
  const rot = step.kind === 'straight' && heading !== null ? step.bearing - heading : 0

  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col bg-paper font-ride">
      <section
        data-done={done}
        onPointerDown={(e) => (sx.current = e.clientX)} onPointerUp={onUp}
        className={`relative flex flex-1 select-none flex-col px-6 pb-8 text-white transition-colors duration-500 ${done ? 'bg-[#1f8a57]' : 'bg-[#141a2e]'}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <div className="flex items-center gap-3" onPointerUp={keep}>
          <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={idx + 1} aria-label="Schritte">
            {steps.map((_, k) => <span key={k} className={`h-1 flex-1 rounded-full ${k <= idx ? 'bg-white' : 'bg-white/25'}`} />)}
          </div>
          <button onClick={p.onClose} aria-label="Schließen" className="grid size-11 place-items-center rounded-full border-0 bg-white/10 text-white">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {p.feedback && <p className="m-0 mt-3 self-start rounded-full bg-white/10 px-3 py-1 text-sm text-white/90">{p.feedback.text}</p>}

        <div className="flex flex-1 flex-col items-center justify-center gap-5 py-4 text-center">
          <Glyph kind={step.kind} rotate={rot} />
          <p className="m-0 max-w-sm text-[26px] font-bold leading-tight" data-testid="nav-text">{step.text}</p>
          {(level || plan.hint) && <p className="m-0 text-sm text-white/65">{[level, plan.hint].filter(Boolean).join(' · ')}</p>}
        </div>

        <div className="flex min-h-11 items-center gap-2" onPointerUp={keep}>
          {idx > 0 && (
            <button onClick={back} aria-label="Zurück" className="grid size-11 place-items-center rounded-full border-0 bg-white/10 text-white">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}
          {!out && p.target !== 'emergency' && g && (
            <button onClick={() => { setOut(true); setI(0) }} className="border-0 bg-transparent px-1 text-sm font-semibold text-white/75 underline underline-offset-4">Lieber raus auf die Straße</button>
          )}
          {!done && <button onClick={next} className="ml-auto h-11 rounded-full border-0 bg-white px-6 font-bold text-[#141a2e]">Weiter</button>}
        </div>
      </section>
      <section className="relative -mt-5 h-[42%] shrink-0 overflow-hidden rounded-t-[22px] bg-paper">
        <NavMap steps={steps} current={idx} stop={p.stop} crowds={p.crowds} outline={g?.outline ?? []} security={p.target === 'security'} />
      </section>
    </div>
  )
}

function Glyph({ kind, rotate }: { kind: StepKind; rotate: number }) {
  const arrow = (deg: number) => (
    <svg viewBox="0 0 100 100" className="size-36 transition-transform duration-300" style={{ transform: `rotate(${deg}deg)` }} aria-hidden>
      <path d="M50 8 L84 48 H61 V92 H39 V48 H16 Z" fill="white" />
    </svg>
  )
  const box = (label: string, up: boolean | null) => (
    <div className="flex size-36 flex-col items-center justify-center gap-2 rounded-[28px] border-2 border-white/80 text-white">
      <svg viewBox="0 0 100 60" className="h-14 w-20" aria-hidden>
        {label === 'Aufzug'
          ? <><rect x="25" y="2" width="50" height="56" rx="8" fill="none" stroke="white" strokeWidth="6" /><path d="M40 24 L50 12 L60 24 M40 36 L50 48 L60 36" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>
          : <path d="M5 55 H25 V42 H45 V29 H65 V16 H95" stroke="white" strokeWidth="7" fill="none" strokeLinejoin="round" style={{ transform: up ? 'none' : 'scaleX(-1)', transformOrigin: '50px 30px' }} />}
      </svg>
      <span className="text-base font-bold">{label}{up === null ? '' : up ? ' ↑' : ' ↓'}</span>
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
    case 'arrive': return (
      <div className="grid size-36 place-items-center rounded-full border-[6px] border-white">
        <svg viewBox="0 0 24 24" className="size-16" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </div>
    )
  }
}

const dot = (cls: string) => L.divIcon({ className: '', html: `<div class="nav-dot ${cls}"></div>`, iconSize: undefined })

function Fit({ points }: { points: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [44, 44], maxZoom: 18, animate: false })
    else if (points.length) map.setView(points[0], 18, { animate: false })
  }, [map, points])
  return null
}

// Clean map: no shop/POI clutter (SafeRide's Esri gray canvas), only outline, route, you, destination, groups (and Security when it is the destination).
function NavMap({ steps, current, stop, crowds, outline, security }: {
  steps: Step[]; current: number; stop: Stop; crowds: Crowd[]; outline: LatLng[][]; security: boolean
}) {
  const here = steps[current]
  const all = steps.flatMap((s) => s.points)
  const dark = document.documentElement.dataset.mode === 'dark'
  return (
    <MapContainer center={[stop.lat, stop.lng]} zoom={18} maxZoom={19} zoomControl={false} attributionControl={false} className="nav-map h-full w-full">
      <AttributionControl prefix={false} />
      {/* SafeRide's own basemap (Esri gray canvas): no POI clutter; native up to z16, scaled beyond that */}
      <TileLayer key={dark ? 'd' : 'l'} url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${dark ? 'Dark' : 'Light'}_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
        maxNativeZoom={16} maxZoom={19} opacity={0.75} attribution="Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap" />
      <Circle center={[stop.lat, stop.lng]} radius={140} pathOptions={{ stroke: false, fillColor: '#141a2e', fillOpacity: dark ? 0.25 : 0.06 }} />
      {outline.map((o, i) => <Polygon key={i} positions={o} pathOptions={{ color: dark ? '#5d6c7c' : '#9aa7b4', weight: 1.5, fillColor: dark ? '#212d3a' : '#ffffff', fillOpacity: 0.6 }} />)}
      {steps.map((s, i) => s.points.length > 1 && (
        <Polyline key={`r${i}-${current}`} positions={s.points}
          pathOptions={{ color: i < current ? '#a99cf0' : '#6d4aff', weight: i === current ? 9 : 6, opacity: i === current ? 1 : 0.7, dashArray: s.underground ? '10 8' : undefined, lineCap: 'round', lineJoin: 'round' }} className={i === current ? 'pulse-line' : undefined} />
      ))}
      {crowds.map((c, i) => <Marker key={`c${i}`} position={[c.lat, c.lng]} icon={dot(c.kind === 'unsafe' ? 'nav-dot-unsafe' : 'nav-dot-busy')} />)}
      {security && SECURITY_TEAMS.map((t) => <Marker key={t.id} position={[t.lat, t.lng]} icon={dot('nav-dot-security')} />)}
      <Marker position={steps.at(-1)!.points.at(-1)!} icon={dot('nav-dot-goal')} />
      <Marker position={here.points[0]} icon={L.divIcon({ className: '', html: '<div class="me-dot"></div>' })} />
      <Fit points={here.points.length > 1 ? here.points : all.length > 1 && current === steps.length - 1 ? all : here.points} />
    </MapContainer>
  )
}
