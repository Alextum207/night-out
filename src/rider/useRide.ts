// Way Out rider state + realtime wiring, shared by #/rider and the SafeRide emergency overlay.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Action, Crowd, Option, Route, ScenarioId } from '../types'
import { connect } from '../realtime'
import { isVirtual, now, onClock, setVirtual } from '../clock'
import { where } from '../position'
import { buildOptions } from '../options'
import { getDepartures, type Departure } from '../mvg'
import { MOCK_CROWDS, SNAPSHOTS } from '../mock'
import { bearing } from '../indoor'
import { requestCompass } from '../compass'
import type { NavTarget } from './Navigate'

export const REASONS = ['Betrunkene Gruppe', 'Belästigung', 'Zu voll', 'Fühle mich verfolgt']

export type Screen = 'setup' | 'riding' | 'wayout' | 'closed'
type Saved = { route: Route | null; scenario: ScenarioId | null; screen: Screen; reasons: string[]; virtual: number | null; feedback: Action | null; nav: NavTarget | null; frontCar: boolean }

const store = {
  get<T>(k: string): T | null {
    try { return JSON.parse(sessionStorage.getItem(k) ?? 'null') } catch { return null }
  },
  set(k: string, v: unknown) {
    try { sessionStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ }
  },
}
export const sessionId: string = store.get('wayout.session') ?? (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2))
store.set('wayout.session', sessionId)

// persist: keep the ride in sessionStorage across reloads (#/rider). The SafeRide page recovers via hello instead.
export function useRide({ persist }: { persist: boolean }) {
  const [saved] = useState(() => {
    const s = persist ? store.get<Saved>('wayout.state') : null
    if (s?.virtual) setVirtual(s.virtual) // restore the scenario clock before the first position is computed
    return s
  })
  const [route, setRoute] = useState<Route | null>(saved?.route ?? null)
  const [scenario, setScenario] = useState<ScenarioId | null>(saved?.scenario ?? null)
  const [screen, setScreen] = useState<Screen>(saved?.screen ?? 'setup')
  const [reasons, setReasons] = useState<string[]>(saved?.reasons ?? [])
  const [feedback, setFeedback] = useState<Action | null>(saved?.feedback ?? null)
  const [departures, setDepartures] = useState<Departure[] | null>(null)
  const [nav, setNav] = useState<NavTarget | null>(saved?.nav ?? null)
  const [frontCar, setFrontCar] = useState(saved?.frontCar ?? false)
  const [showFront, setShowFront] = useState(false)
  const [liveCrowds, setLiveCrowds] = useState<Crowd[]>([])
  const [, tick] = useState(0)

  const pos = route ? where(route, now()) : null

  // Re-render on clock changes and every 5 s so position/ETA stay current.
  useEffect(() => {
    const off = onClock(() => tick((x) => x + 1))
    const id = setInterval(() => tick((x) => x + 1), 5000)
    return () => { off(); clearInterval(id) }
  }, [])

  useEffect(() => {
    if (persist) store.set('wayout.state', { route, scenario, screen, reasons, virtual: isVirtual() ? now() : null, feedback, nav, frontCar } satisfies Saved)
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
        setRoute(d.route); setScenario(d.scenario); setScreen('riding'); setReasons([]); setFeedback(null); setNav(null); setFrontCar(false)
      }),
      rt.on('action', (a) => {
        const s = state.current
        if (s.screen !== 'wayout' || !s.pos) return
        const mine = 'sessionId' in a.target ? a.target.sessionId === sessionId : a.target.trainKey === s.pos.trainKey
        if (mine) setFeedback(a)
      }),
      rt.on('crowds', (c) => setLiveCrowds(c.crowds)),
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

  const leg = route && pos ? route.legs[pos.leg] : null
  const nextTrainMin = scenario ? SNAPSHOTS[scenario].nextTrainMin : 10
  const options: Option[] = route && pos ? buildOptions(pos, route, departures, nextTrainMin) : []
  // Direction of travel at the station: arriving train (on board) or departing train (on the platform).
  let travelBearing: number | null = null
  if (pos && leg) {
    const st = pos.nextStop, stops = leg.stops, k = stops.findIndex((x) => x.id === st.id)
    travelBearing = pos.prevStop ? bearing([pos.prevStop.lat, pos.prevStop.lng], [st.lat, st.lng])
      : stops[k + 1] ? bearing([st.lat, st.lng], [stops[k + 1].lat, stops[k + 1].lng]) : null
  }
  const crowds = pos ? [...(MOCK_CROWDS[pos.nextStop.id] ?? []), ...liveCrowds] : liveCrowds

  return {
    route, scenario, screen, setScreen, pos, leg, reasons, feedback, nav, setNav, frontCar, showFront, setShowFront,
    options, crowds, liveCrowds, travelBearing, nextTrainMin, rt,
    // A trip the rider picked (TripSetup, force) or SafeRide's active trip (a running scenario keeps priority).
    setFreeRoute(r: Route | null, force = false) {
      if (!force && scenario) return
      setVirtual(null); setScenario(null); setRoute(r); setScreen(r ? 'riding' : 'setup')
    },
    // Play a scenario on this phone alone (no control room needed), e.g. when nobody started one in the demo panel.
    startDemo(id: ScenarioId) {
      const s = SNAPSHOTS[id]
      setVirtual(s.virtualNow); setRoute(s.route); setScenario(id); setScreen('riding'); setReasons([]); setFeedback(null); setNav(null); setFrontCar(false)
    },
    wayOut() { setReasons([]); setFeedback(null); setNav(null); setFrontCar(false); setScreen('wayout'); sendTap([]) },
    toggle(r: string) {
      const next = reasons.includes(r) ? reasons.filter((x) => x !== r) : [...reasons, r]
      setReasons(next); sendTap(next)
    },
    fine(next: Screen = 'closed') { rt.send('fine', { sessionId }); setScreen(next); setNav(null) },
    choose(o: Option) {
      if (o.target === 'frontCar') { setFrontCar(true); setShowFront(true); return }
      if (!o.target) return
      requestCompass() // iOS only asks inside a tap
      setNav(o.target)
    },
  }
}
export type Ride = ReturnType<typeof useRide>
