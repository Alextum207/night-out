// SafeRide page entry: Way Out lives inside SafeRide (public/saferide/app.js, plain JS).
// Window events with app.js:
//   in:  sr:report (share a report), sr:emergency {pin} (Notfall tapped), sr:emergency-open (back from the escape sheet)
//        sr:trip {from, to} | null (SafeRide trip started/ended: mapped to an MVG route)
//   out: sr:crowds (control-room crowds as alerts), sr:escape (open SafeRide's escape-route sheet), sr:unpin (undo the panic pin),
//        sr:train {lat, lng, line, fly} | null (scenario train marker)
import '../saferide.css'
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { getRoute, searchStations } from '../mvg'
import type { Report } from '../types'
import { sessionId, useRide, type Ride } from '../rider/useRide'
import WayOutPanel, { CalmScreen, Row, Status, WayOutScreens, Where } from '../rider/WayOutPanel'

const UNDO_MS = 8000
const emit = (name: string, detail?: unknown) => dispatchEvent(new CustomEvent(name, { detail }))

function SafeRideLayer() {
  const ride = useRide({ persist: false })
  const [open, setOpen] = useState(false)
  const [undo, setUndo] = useState(false)
  const active = useRef(false) // an emergency is running (overlay may be hidden behind the escape-route sheet)
  const rideRef = useRef(ride)
  rideRef.current = ride

  // Reports out, crowds in.
  useEffect(() => {
    const onReport = (e: Event) => ride.rt.send('report', { ...(e as CustomEvent<Omit<Report, 'sessionId'>>).detail, sessionId })
    addEventListener('sr:report', onReport)
    return () => removeEventListener('sr:report', onReport)
  }, [ride.rt])
  const crowdsKey = JSON.stringify(ride.liveCrowds)
  useEffect(() => { emit('sr:crowds', JSON.parse(crowdsKey)) }, [crowdsKey])

  // An active SafeRide trip becomes the Way Out train (a running scenario keeps priority, see setFreeRoute).
  useEffect(() => {
    let seq = 0 // only the latest trip counts; bumped on unmount too
    const onTrip = async (e: Event) => {
      const t = (e as CustomEvent<{ from: string; to: string } | null>).detail, my = ++seq
      if (!t) return rideRef.current.setFreeRoute(null)
      const [[a], [b]] = await Promise.all([searchStations(t.from), searchStations(t.to)])
      const r = a && b ? await getRoute(a.id, b.id) : null
      if (my === seq && r) rideRef.current.setFreeRoute(r.route)
    }
    addEventListener('sr:trip', onTrip)
    return () => { seq++; removeEventListener('sr:trip', onTrip) }
  }, [])

  // Scenario train on the SafeRide map; fly there when a scenario (re)starts.
  const train = ride.scenario && ride.pos && ride.leg ? { lat: ride.pos.lat, lng: ride.pos.lng, line: ride.leg.line } : null
  const trainKey = JSON.stringify(train), flownFor = useRef<string | null>(null)
  useEffect(() => {
    const t = JSON.parse(trainKey) as typeof train
    const scenarioKey = `${ride.scenario}|${ride.route?.legs[0].stops[0].dep}`
    const fly = !!t && flownFor.current !== scenarioKey
    if (fly) flownFor.current = scenarioKey
    emit('sr:train', t && { ...t, fly })
  }, [trainKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Notfall: tell the control room right away (tap if the train is known; app.js already dropped the pin), undo for 8 s.
  useEffect(() => {
    const onEmergency = (e: Event) => {
      const r = rideRef.current, pin = !!(e as CustomEvent<{ pin: boolean }>).detail?.pin
      active.current = true; setOpen(true) // the effect below sends the tap once the train is known
      setUndo(!!r.pos || pin)
    }
    const onReopen = () => setOpen(true)
    addEventListener('sr:emergency', onEmergency)
    addEventListener('sr:emergency-open', onReopen)
    return () => { removeEventListener('sr:emergency', onEmergency); removeEventListener('sr:emergency-open', onReopen) }
  }, [])
  useEffect(() => {
    if (!undo) return
    const id = setTimeout(() => setUndo(false), UNDO_MS)
    return () => clearTimeout(id)
  }, [undo])

  // The train can become known after Notfall was tapped (scenario catch-up, trip mapping): tell the control room then.
  // Refs, not state: an effect from an older render must not send a tap after "Rückgängig"/"Mir geht's gut".
  const tapped = useRef(false)
  useEffect(() => {
    if (active.current && ride.pos && !tapped.current) { tapped.current = true; ride.wayOut(); setUndo(true) }
  })
  const end = () => { active.current = false; tapped.current = false; ride.fine('riding'); setOpen(false); setUndo(false) }
  const cancel = () => { emit('sr:unpin'); end() }

  if (!open) return ride.scenario ? <RideStrip ride={ride} /> : null
  if (ride.screen === 'wayout' && (ride.nav || ride.showFront)) return <WayOutScreens ride={ride} />
  return <Emergency ride={ride} undo={undo} onUndo={cancel} onEnd={end} onEscape={() => { setOpen(false); emit('sr:escape') }} />
}

// Slim scenario ride bar under SafeRide's top bar.
const top = document.querySelector('.top')
function RideStrip({ ride }: { ride: Ride }) {
  const { pos, leg } = ride
  if (!top || !pos || !leg) return null
  return createPortal(
    <div data-testid="ride-strip" className="pointer-events-auto flex min-h-[42px] items-center gap-2 rounded-full border border-hairline bg-surface px-2 pr-4 text-sm text-ink shadow-md">
      <span className="rounded-full bg-ink px-2.5 py-1 font-bold text-paper">{leg.line}</span>
      <span><Where pos={pos} /></span>
    </div>,
    top,
  )
}

function Emergency({ ride, undo, onUndo, onEnd, onEscape }: { ride: Ride; undo: boolean; onUndo: () => void; onEnd: () => void; onEscape: () => void }) {
  const known = !!ride.pos && ride.screen === 'wayout'
  const escape = { title: 'Andere Verbindung', onClick: onEscape }
  const status = (
    <>
      <Status live={known || undo}>{known || undo ? 'Leitstelle informiert' : 'Kein Zug erkannt'}</Status>
      {undo && <button onClick={onUndo} className="border-0 bg-transparent p-2 text-sm font-bold text-ink underline underline-offset-4">Rückgängig</button>}
    </>
  )
  return (
    <CalmScreen label="Notfall" status={status} onClose={onEnd} onFine={onEnd}>
      {known ? <WayOutPanel ride={ride} rows={[escape]} /> : (
        <>
          <header>
            <h1 className="m-0 text-[28px] font-bold leading-tight">Geh zu Menschen und Licht.</h1>
            <p className="m-0 mt-3 text-muted">Ohne laufende Fahrt kennt die Leitstelle deinen Zug nicht. Fühlst du dich bedroht, ruf 110.</p>
          </header>
          <section>
            <Row {...escape} />
            <p className="m-0 mb-1 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Demo</p>
            <Row title="U6 vor Münchner Freiheit" onClick={() => ride.startDemo('arena')} />
            <Row title="Bahnsteig Garching-Forschungszentrum" onClick={() => ride.startDemo('garching')} />
          </section>
        </>
      )}
    </CalmScreen>
  )
}

const root = document.createElement('div')
document.body.append(root)
createRoot(root).render(<StrictMode><SafeRideLayer /></StrictMode>)
