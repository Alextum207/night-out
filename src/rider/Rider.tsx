import { useEffect, useMemo, useRef, useState } from 'react'
import type { Action, Route, ScenarioId } from '../types'
import { connect } from '../realtime'
import { isVirtual, now, onClock, setVirtual } from '../clock'
import { where } from '../position'
import { buildOptions } from '../options'
import { getDepartures, getRoute, searchStations, type Departure, type StationHit } from '../mvg'
import { SNAPSHOTS } from '../mock'

const REASONS = ['Betrunkene Gruppe', 'Belästigung', 'Zu voll', 'Fühle mich verfolgt']

type Screen = 'setup' | 'riding' | 'wayout' | 'closed'
type Saved = { route: Route | null; scenario: ScenarioId | null; screen: Screen; reasons: string[]; virtual: number | null; feedback: Action | null }

const store = {
  get<T>(k: string): T | null {
    try { return JSON.parse(sessionStorage.getItem(k) ?? 'null') } catch { return null }
  },
  set(k: string, v: unknown) {
    try { sessionStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ }
  },
}
const sessionId: string = store.get('wayout.session') ?? (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2))
store.set('wayout.session', sessionId)

// Restore the scenario clock after a reload (sessionStorage is per tab).
const initial = location.hash.startsWith('#/rider') ? store.get<Saved>('wayout.state') : null
if (initial?.virtual) setVirtual(initial.virtual)

const hhmm = (t: number) => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

export default function Rider() {
  const saved = initial
  const [route, setRoute] = useState<Route | null>(saved?.route ?? null)
  const [scenario, setScenario] = useState<ScenarioId | null>(saved?.scenario ?? null)
  const [screen, setScreen] = useState<Screen>(saved?.screen ?? 'setup')
  const [reasons, setReasons] = useState<string[]>(saved?.reasons ?? [])
  const [feedback, setFeedback] = useState<Action | null>(saved?.feedback ?? null)
  const [departures, setDepartures] = useState<Departure[] | null>(null)
  const [, tick] = useState(0)

  const pos = route ? where(route, now()) : null

  // Re-render on clock changes and every 5 s so position/ETA stay current.
  useEffect(() => {
    const off = onClock(() => tick((x) => x + 1))
    const id = setInterval(() => tick((x) => x + 1), 5000)
    return () => { off(); clearInterval(id) }
  }, [])

  useEffect(() => {
    store.set('wayout.state', { route, scenario, screen, reasons, virtual: isVirtual() ? now() : null, feedback } satisfies Saved)
  })

  // Realtime wiring. Refs keep handlers current without resubscribing.
  const state = useRef({ route, pos, screen, reasons })
  state.current = { route, pos, screen, reasons }
  const rt = useMemo(() => connect('rider', () => hello()), [])
  const hello = () => rt.send('hello', { sessionId, trainKey: state.current.pos?.trainKey ?? null })

  useEffect(() => {
    const offs = [
      rt.on('demo', (d) => {
        if (d.to && d.to !== sessionId) return
        const sameTrain = state.current.route && where(state.current.route, d.virtualNow).trainKey === where(d.route, d.virtualNow).trainKey
        setVirtual(d.virtualNow)
        if (d.to && sameTrain) return // catch-up reply: keep our screen
        if (!d.reset && sameTrain) return // time jump only
        setRoute(d.route); setScenario(d.scenario); setScreen('riding'); setReasons([]); setFeedback(null)
      }),
      rt.on('action', (a) => {
        const s = state.current
        if (s.screen !== 'wayout' || !s.pos) return
        const mine = 'sessionId' in a.target ? a.target.sessionId === sessionId : a.target.trainKey === s.pos.trainKey
        if (mine) setFeedback(a)
      }),
    ]
    hello()
    const vis = () => document.visibilityState === 'visible' && hello()
    document.addEventListener('visibilitychange', vis)
    return () => { offs.forEach((f) => f()); document.removeEventListener('visibilitychange', vis) }
  }, [rt])

  // Live departures for the "next train" hint (free mode only; scenarios use the snapshot).
  const depStation = pos?.nextStop.id
  useEffect(() => {
    setDepartures(null)
    if (!depStation || scenario || screen !== 'wayout') return
    let live = true
    void getDepartures(depStation).then((d) => live && setDepartures(d))
    return () => { live = false }
  }, [depStation, scenario, screen])

  const sendTap = (rs: string[]) => {
    if (!pos || !route) return
    const leg = route.legs[pos.leg]
    rt.send('tap', {
      sessionId, trainKey: pos.trainKey, line: leg.line, destination: leg.destination, state: pos.state,
      nextStopId: pos.nextStop.id, nextStopName: pos.nextStop.name, lat: pos.lat, lng: pos.lng, reasons: rs, at: now(),
    })
  }

  const wayOut = () => { setReasons([]); setFeedback(null); setScreen('wayout'); sendTap([]) }
  const toggle = (r: string) => {
    const next = reasons.includes(r) ? reasons.filter((x) => x !== r) : [...reasons, r]
    setReasons(next); sendTap(next)
  }
  const fine = () => { rt.send('fine', { sessionId }); setScreen('closed') }

  if (screen === 'setup' || !route || !pos) {
    return <TripSetup onRoute={(r) => { setVirtual(null); setScenario(null); setRoute(r); setScreen('riding') }} />
  }

  const leg = route.legs[pos.leg]
  const options = buildOptions(pos, route, departures, scenario ? SNAPSHOTS[scenario].nextTrainMin : 10)

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-4 pb-8">
      <header className="rounded-2xl bg-slate-800/80 p-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="rounded bg-sky-600 px-2 py-0.5 font-bold text-white">{leg.line}</span>
          <span>Richtung {leg.destination}</span>
          <span className="ml-auto tabular-nums">{hhmm(now())}</span>
        </div>
        <p className="mt-2 text-lg font-semibold">
          {pos.state === 'train'
            ? <>Nächster Halt <b>{pos.nextStop.name}</b> in {pos.etaMin} Min</>
            : pos.etaMin > 0
              ? <>Am Bahnsteig <b>{pos.nextStop.name}</b>, Abfahrt in {pos.etaMin} Min</>
              : <>Angekommen: <b>{pos.nextStop.name}</b></>}
        </p>
      </header>

      {screen === 'riding' && (
        <>
          <button onClick={wayOut} className="mt-6 aspect-square w-full rounded-full bg-violet-600 text-4xl font-black text-white shadow-2xl shadow-violet-900/60 active:scale-95">
            Way Out
          </button>
          <p className="text-center text-sm text-slate-400">Ein Tipp, wenn du dich unwohl fühlst. Anonym. Im Notfall: 110.</p>
          <button onClick={() => setScreen('setup')} className="min-h-11 text-sm text-slate-500 underline">Andere Fahrt</button>
        </>
      )}

      {screen === 'wayout' && (
        <>
          {feedback ? (
            <section className="rounded-2xl bg-emerald-600 p-4 text-white">
              <p className="text-xl font-bold">{feedback.text}</p>
              {feedback.steps.length > 0 && (
                <ol className="mt-3 list-decimal space-y-1 pl-5">{feedback.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              )}
            </section>
          ) : (
            <p className="rounded-2xl bg-slate-800 p-3 text-center text-slate-300">Die Leitstelle sieht deine Meldung.</p>
          )}
          <section className="flex flex-col gap-3">
            {options.map((o) => (
              <div key={o.kind} className="rounded-2xl bg-slate-800 p-4">
                <p className="text-lg font-bold">{o.title}</p>
                <p className="mt-1 text-slate-300">{o.detail}</p>
              </div>
            ))}
          </section>
          <section>
            <p className="mb-2 text-sm text-slate-400">Was ist los? (optional, leise an die Leitstelle)</p>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button key={r} onClick={() => toggle(r)}
                  className={`min-h-11 rounded-full px-4 ${reasons.includes(r) ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                  {r}
                </button>
              ))}
            </div>
          </section>
          <button onClick={fine} className="min-h-14 rounded-2xl bg-slate-200 text-lg font-bold text-slate-900">Mir geht's gut</button>
        </>
      )}

      {screen === 'closed' && (
        <section className="mt-8 flex flex-col gap-4 text-center">
          <p className="text-2xl font-bold">Gute Heimfahrt.</p>
          <p className="text-slate-400">Sitzung beendet, dein Standort wurde gelöscht.</p>
          <button onClick={() => setScreen('riding')} className="min-h-11 rounded-2xl bg-slate-700">Zurück</button>
        </section>
      )}
    </main>
  )
}

function TripSetup({ onRoute }: { onRoute: (r: Route) => void }) {
  const [from, setFrom] = useState<StationHit | null>(null)
  const [to, setTo] = useState<StationHit | null>(null)
  const [msg, setMsg] = useState('')
  const go = async () => {
    if (!from || !to) return
    setMsg('Suche Verbindung …')
    const r = await getRoute(from.id, to.id)
    if (!r) return setMsg('Keine Verbindung gefunden (MVG nicht erreichbar).')
    onRoute(r.route)
  }
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-4">
      <h1 className="mt-6 text-3xl font-black">Way Out</h1>
      <p className="text-slate-400">Einmal Start und Ziel eingeben. Wir nehmen die nächste Verbindung.</p>
      <StationInput label="Start" value={from} onPick={setFrom} />
      <StationInput label="Ziel" value={to} onPick={setTo} />
      <button disabled={!from || !to} onClick={go} className="min-h-14 rounded-2xl bg-violet-600 text-lg font-bold text-white disabled:opacity-40">Los</button>
      {msg && <p className="text-center text-slate-400">{msg}</p>}
    </main>
  )
}

function StationInput({ label, value, onPick }: { label: string; value: StationHit | null; onPick: (s: StationHit) => void }) {
  const [q, setQ] = useState(value?.name ?? '')
  const [hits, setHits] = useState<StationHit[]>([])
  useEffect(() => {
    if (q.length < 2 || q === value?.name) return setHits([])
    const id = setTimeout(() => void searchStations(q).then(setHits), 250)
    return () => clearTimeout(id)
  }, [q, value])
  return (
    <label className="relative flex flex-col gap-1">
      <span className="text-sm text-slate-400">{label}</span>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Haltestelle"
        className="min-h-12 rounded-xl bg-slate-800 px-4 text-lg outline-none focus:ring-2 focus:ring-violet-500" />
      {hits.length > 0 && (
        <ul className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl bg-slate-700 shadow-xl">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => { onPick(h); setQ(h.name); setHits([]) }} className="min-h-11 w-full px-4 text-left hover:bg-slate-600">
                {h.name} <span className="text-sm text-slate-400">{h.place}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  )
}
