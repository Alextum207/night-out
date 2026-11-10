import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Action, ActionKind, Crowd, DemoPayload, Hotspot, Report, Route, ScenarioId, Tap } from '../types'
import { connect, transport } from '../realtime'
import { isVirtual, now, onClock, setVirtual } from '../clock'
import { groupTaps, reportCrowds } from '../hotspots'
import { where } from '../position'
import { directions, EVENTS, nearestTeam, SECURITY_TEAMS, SNAPSHOTS } from '../mock'

const hhmm = (t: number) => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

// Reported groups go to the riders' maps. Drunk groups / harassment are never a safe crowd.
const toCrowds = (cards: Hotspot[]): Crowd[] => cards.map((c) => ({
  lat: c.lat, lng: c.lng, label: `${c.line}: ${c.sessions} Meldung${c.sessions > 1 ? 'en' : ''}`,
  kind: c.topReason === 'Betrunkene Gruppe' || c.topReason === 'Belästigung' ? 'unsafe' : 'busy',
}))

const ACTIONS: { kind: ActionKind; label: string }[] = [
  { kind: 'security', label: 'Security' },
  { kind: 'announce', label: 'Durchsage' },
  { kind: 'extraTrain', label: 'Extra-Zug' },
  { kind: 'resolved', label: 'Erledigt' },
]

function actionFor(kind: ActionKind, c: Hotspot): Action {
  const base = { target: { trainKey: c.trainKey }, kind, stationId: c.nextStopId, stationName: c.nextStopName, at: now() }
  const { minutes } = nearestTeam(c)
  switch (kind) {
    case 'security':
      return c.level === 'hotspot'
        ? { ...base, text: `Security wartet an ${c.nextStopName}`, steps: directions(c.nextStopId) }
        : { ...base, text: `Leitstelle schaut mit, Security in ${minutes} Min bei dir`, steps: directions(c.nextStopId) }
    case 'announce':
      return { ...base, text: 'Durchsage läuft', steps: ['Die Leitstelle hat eine Durchsage in deinem Zug gemacht.'] }
    case 'extraTrain':
      return { ...base, text: 'Extra-Zug kommt', steps: [`Ab ${c.nextStopName} fährt in wenigen Minuten ein zusätzlicher ${c.line}.`] }
    case 'resolved':
      return { ...base, text: 'Leitstelle hat die Lage geklärt', steps: [] }
  }
}

// Zoom the map to the current route whenever it changes.
function FitRoute({ route }: { route: Route }) {
  const map = useMap()
  useEffect(() => {
    const pts = route.legs.flatMap((l) => l.stops.map((s) => [s.lat, s.lng] as [number, number]))
    if (pts.length) map.fitBounds(pts, { padding: [40, 40] })
  }, [map, route])
  return null
}

export default function Control() {
  const [taps, setTaps] = useState(() => new Map<string, Tap>())
  const [reports, setReports] = useState(() => new Map<string, Report>()) // SafeRide, real time
  const [demo, setDemo] = useState<DemoPayload | null>(null)
  const [sent, setSent] = useState<Record<string, ActionKind[]>>({}) // per trainKey
  const [resolvedAt, setResolvedAt] = useState<Record<string, number>>({})
  const [panel, setPanel] = useState(location.hash.includes('demo'))
  const [luna, setLuna] = useState(location.hash.includes('luna'))
  const [, tick] = useState(0)
  const lastAction = useRef(new Map<string, Action>()) // trainKey -> last action, replayed on `hello`
  const demoRef = useRef(demo)
  demoRef.current = demo

  const rt = useMemo(() => connect('control'), [])
  useEffect(() => {
    const offs = [
      rt.on('tap', (t) => setTaps((m) => new Map(m).set(t.sessionId, t))),
      rt.on('report', (r) => setReports((m) => new Map(m).set(r.id, r))),
      rt.on('fine', ({ sessionId }) => setTaps((m) => { const n = new Map(m); n.delete(sessionId); return n })),
      rt.on('hello', ({ sessionId, trainKey }) => {
        const d = demoRef.current
        if (d) rt.send('demo', { ...d, virtualNow: now(), reset: false, to: sessionId })
        const a = trainKey && lastAction.current.get(trainKey)
        if (a) rt.send('action', { ...a, target: { sessionId } })
        rt.send('crowds', { crowds: crowdsRef.current })
      }),
    ]
    const off = onClock(() => tick((x) => x + 1))
    const id = setInterval(() => tick((x) => x + 1), 2000)
    const hash = () => { if (location.hash.includes('demo')) setPanel(true) }
    addEventListener('hashchange', hash)
    const key = (e: KeyboardEvent) => { if (e.key === 'd' && !(e.target instanceof HTMLInputElement)) setPanel((p) => !p) }
    addEventListener('keydown', key)
    return () => { offs.forEach((f) => f()); off(); clearInterval(id); removeEventListener('keydown', key); removeEventListener('hashchange', hash) }
  }, [rt])

  const t = now()
  const { hotspots, singles } = groupTaps(taps, t)
  const cards = [...hotspots, ...singles]
  const isResolved = (c: Hotspot) => (resolvedAt[c.trainKey] ?? -1) >= c.lastAt
  const liveReports = reportCrowds(reports.values(), Date.now())
  const crowds = [...toCrowds(cards.filter((c) => !isResolved(c))), ...liveReports]
  const crowdsKey = JSON.stringify(crowds)
  const crowdsRef = useRef(crowds)
  crowdsRef.current = crowds
  useEffect(() => { rt.send('crowds', { crowds: JSON.parse(crowdsKey) }) }, [rt, crowdsKey])

  const act = (kind: ActionKind, c: Hotspot) => {
    const a = actionFor(kind, c)
    lastAction.current.set(c.trainKey, a)
    rt.send('action', a)
    setSent((s) => ({ ...s, [c.trainKey]: [...(s[c.trainKey] ?? []), kind] }))
    if (kind === 'resolved') setResolvedAt((r) => ({ ...r, [c.trainKey]: c.lastAt }))
  }

  const startScenario = (scenario: ScenarioId) => {
    const s = SNAPSHOTS[scenario]
    const d: DemoPayload = { scenario, route: s.route, virtualNow: s.virtualNow, reset: true }
    setVirtual(s.virtualNow)
    setTaps(new Map()); setReports(new Map()); setSent({}); setResolvedAt({}); lastAction.current.clear()
    setDemo(d)
    rt.send('demo', d)
  }
  const endScenario = () => {
    setDemo(null); setVirtual(null)
    setTaps(new Map()); setReports(new Map()); setSent({}); setResolvedAt({}); lastAction.current.clear()
  }
  const jump = (min: number) => {
    if (!demo) return
    setVirtual(now() + min * 60_000)
    rt.send('demo', { ...demo, virtualNow: now(), reset: false })
  }
  // Fallback if phones fail on stage: one fake rider on the scenario train.
  const syntheticTap = () => {
    if (!demo) return
    const p = where(demo.route, now()), leg = demo.route.legs[p.leg]
    const id = `synthetic-${Math.random().toString(36).slice(2, 8)}`
    setTaps((m) => new Map(m).set(id, {
      sessionId: id, trainKey: p.trainKey, line: leg.line, destination: leg.destination, state: p.state, nextStopId: p.nextStop.id,
      nextStopName: p.nextStop.name, lat: p.lat + (Math.random() - 0.5) * 0.002, lng: p.lng + (Math.random() - 0.5) * 0.002,
      reasons: ['Betrunkene Gruppe'], at: now(),
    }))
  }

  const route = demo?.route ?? SNAPSHOTS.arena.route
  const stops = route.legs.flatMap((l) => l.stops)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-slate-800 px-4 py-2">
        <h1 className="text-xl font-black">Way Out · Leitstelle</h1>
        <span className="text-sm text-slate-400">MVG Live-Lage</span>
        <span className="ml-auto text-2xl font-bold tabular-nums">{hhmm(t)}</span>
        {isVirtual() && <span className="rounded bg-amber-500/20 px-2 text-xs text-amber-300">Szenario</span>}
        <button onClick={() => setPanel((p) => !p)} className="text-xs text-slate-500 hover:text-slate-300">{transport === 'supabase' ? 'live' : 'lokal'} · Demo</button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <MapContainer center={[48.17, 11.6]} zoom={12} className="h-full w-full bg-slate-900" zoomControl={false}>
            <FitRoute route={route} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" className="map-tiles" />
            {route.legs.map((l, i) => <Polyline key={i} positions={l.polyline} pathOptions={{ color: l.line === 'U3' ? '#f97316' : '#2563eb', weight: 6, opacity: 0.8 }} />)}
            {stops.map((s, i) => (
              <CircleMarker key={s.id + i} center={[s.lat, s.lng]} radius={5} pathOptions={{ color: '#e2e8f0', fillColor: '#0f172a', fillOpacity: 1, weight: 2 }}>
                <Tooltip direction="right" offset={[6, 0]} permanent={s.id === 'de:09162:500' || s.id === 'de:09184:460'}>{s.name}</Tooltip>
              </CircleMarker>
            ))}
            {SECURITY_TEAMS.map((s) => (
              <CircleMarker key={s.id} center={[s.lat, s.lng]} radius={7} pathOptions={{ color: '#38bdf8', fillColor: '#0284c7', fillOpacity: 0.9, weight: 2 }}>
                <Tooltip>{s.name}</Tooltip>
              </CircleMarker>
            ))}
            {/* className as a prop: react-leaflet applies pathOptions via setStyle, which ignores className */}
            {[...taps.values()].map((tp) => (
              <CircleMarker key={tp.sessionId} center={[tp.lat, tp.lng]} radius={9}
                pathOptions={{ color: '#f43f5e', fillColor: '#f43f5e', fillOpacity: 0.8, weight: 2 }} className="pulse" />
            ))}
            {liveReports.map((c) => {
              const r = reports.get(c.id!)!
              const col = c.kind === 'unsafe' ? '#ef4444' : '#f59e0b'
              return (
                <CircleMarker key={c.id} center={[c.lat, c.lng]} radius={r.panic ? 8 : 11}
                  pathOptions={{ color: '#fff', fillColor: col, fillOpacity: 0.85, weight: 2, dashArray: r.panic ? undefined : '3 3' }} className="sr-report">
                  <Tooltip>{r.panic ? 'Notfall-Pin' : 'SafeRide-Meldung'}: {r.title} · vor {Math.max(0, Math.round((Date.now() - r.from) / 60_000))} Min</Tooltip>
                </CircleMarker>
              )
            })}
          </MapContainer>
          {luna && (
            <iframe src={`saferide.html${location.search}`} title="Luna" className="absolute bottom-3 left-3 z-[1000] h-[720px] max-h-[85%] w-[375px] rounded-3xl border-4 border-slate-700 bg-slate-950 shadow-2xl" />
          )}
        </div>

        <aside className="flex w-[400px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-slate-800 p-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Meldungen</h2>
          {cards.length === 0 && <p className="text-slate-500">Keine offenen Meldungen.</p>}
          {cards.map((c) => {
            const done = isResolved(c)
            const tone = done ? 'border-slate-700 bg-slate-800/50 opacity-60' : c.level === 'hotspot' ? 'border-rose-500 bg-rose-950/70' : 'border-amber-400 bg-amber-950/50'
            return (
              <article key={c.trainKey} className={`rounded-xl border-2 p-3 ${tone}`}>
                <div className="flex items-baseline gap-2">
                  <span className="rounded bg-sky-600 px-2 font-bold">{c.line}</span>
                  <span className="text-sm text-slate-300">→ {c.destination}</span>
                  <span className="ml-auto text-xs text-slate-400">{hhmm(c.lastAt)}</span>
                </div>
                <p className="mt-2 text-lg font-bold">
                  {c.level === 'hotspot' ? `Hotspot · ${c.sessions} Meldungen` : `Einzelmeldung${c.sessions > 1 ? ` · ${c.sessions}` : ''}`}
                  {c.topReason && <span className="font-normal">, {c.topReason}</span>}
                </p>
                <p className="text-sm text-slate-300">Nächster Halt: {c.nextStopName}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {ACTIONS.map((a) => (
                    <button key={a.kind} onClick={() => act(a.kind, c)} disabled={done}
                      className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${sent[c.trainKey]?.includes(a.kind) ? 'bg-emerald-700' : 'bg-slate-700 hover:bg-slate-600'}`}>
                      {a.kind === 'security' ? `Security → ${c.nextStopName}` : a.label}{sent[c.trainKey]?.includes(a.kind) ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              </article>
            )
          })}

          <h2 className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Events heute</h2>
          {EVENTS.map((e) => (
            <div key={e.name} className="rounded-lg bg-slate-800 p-2 text-sm">
              <p className="font-semibold">{e.name}</p>
              <p className="text-slate-400">{e.venue} · endet {e.ends} · {e.lines.join(', ')}</p>
            </div>
          ))}

          {panel && (
            <section className="mt-4 rounded-xl border border-dashed border-slate-600 p-3">
              <h2 className="mb-2 text-sm font-semibold text-slate-400">Demo-Steuerung (Taste d)</h2>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(SNAPSHOTS) as ScenarioId[]).map((s) => (
                  <button key={s} onClick={() => startScenario(s)} className={`min-h-11 rounded-lg text-sm ${demo?.scenario === s ? 'bg-violet-700' : 'bg-slate-700'}`}>
                    {SNAPSHOTS[s].label}
                  </button>
                ))}
                <button onClick={() => jump(-1)} disabled={!demo} className="min-h-11 rounded-lg bg-slate-700">−1 Min</button>
                <button onClick={() => jump(1)} disabled={!demo} className="min-h-11 rounded-lg bg-slate-700">+1 Min</button>
                <button onClick={syntheticTap} disabled={!demo} className="min-h-11 rounded-lg bg-slate-700">+1 Meldung</button>
                <button onClick={() => setLuna((l) => !l)} className="min-h-11 rounded-lg bg-slate-700">Luna-Fenster</button>
                <button onClick={endScenario} disabled={!demo} className="col-span-2 min-h-11 rounded-lg bg-slate-700">Szenario beenden (Live-Modus)</button>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
