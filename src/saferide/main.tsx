// SafeRide page entry: Way Out lives inside SafeRide (public/saferide/app.js, plain JS).
// Window events with app.js:
//   in:  sr:report (share a report), sr:emergency {pin} (Notfall tapped), sr:emergency-open (back from the escape sheet)
//   out: sr:crowds (control-room crowds as alerts), sr:escape (open SafeRide's escape-route sheet), sr:unpin (undo the panic pin)
import '../saferide.css'
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Report } from '../types'
import { sessionId, useRide, type Ride } from '../rider/useRide'
import WayOutPanel, { RideBar, WayOutScreens } from '../rider/WayOutPanel'

const UNDO_MS = 8000
const emit = (name: string, detail?: unknown) => dispatchEvent(new CustomEvent(name, { detail }))

function SafeRideLayer() {
  const ride = useRide(false)
  const [open, setOpen] = useState(false)
  const [undo, setUndo] = useState(false)
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

  // Notfall: tell the control room right away (tap if the train is known; app.js already dropped the pin), undo for 8 s.
  useEffect(() => {
    const onEmergency = (e: Event) => {
      const r = rideRef.current, pin = !!(e as CustomEvent<{ pin: boolean }>).detail?.pin
      setOpen(true) // the effect below sends the tap once the train is known
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
  const tapped = useRef(false)
  useEffect(() => {
    if (open && ride.pos && !tapped.current) { tapped.current = true; ride.wayOut() }
  })
  const end = () => { ride.fine('riding'); tapped.current = false; setOpen(false); setUndo(false) }
  const cancel = () => { emit('sr:unpin'); end() }

  if (!open) return null
  if (ride.screen === 'wayout' && (ride.nav || ride.showFront)) return <WayOutScreens ride={ride} />
  return <Emergency ride={ride} undo={undo} onUndo={cancel} onEnd={end} onEscape={() => { setOpen(false); emit('sr:escape') }} />
}

function Emergency({ ride, undo, onUndo, onEnd, onEscape }: { ride: Ride; undo: boolean; onUndo: () => void; onEnd: () => void; onEscape: () => void }) {
  const known = !!ride.pos && ride.screen === 'wayout'
  const escape = (
    <button onClick={onEscape} className="rounded-2xl border border-hairline bg-surface p-4 text-left text-ink shadow-sm active:scale-[0.98]">
      <p className="m-0 text-lg font-bold">Andere Verbindung<span className="float-right">→</span></p>
      <p className="m-0 mt-1 text-muted">Fluchtroute über eine andere Linie, an gemeldeten Gruppen vorbei.</p>
    </button>
  )
  return (
    <div role="dialog" aria-modal="true" aria-label="Notfall" className="fixed inset-0 z-40 overflow-y-auto bg-paper font-ride text-ink">
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-10" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}>
        <header className="flex items-center gap-3">
          <h2 className="m-0 mr-auto text-2xl font-extrabold">Notfall</h2>
          <button onClick={onEnd} aria-label="Notfall beenden" className="closebtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <a className="call" href="tel:110">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" /></svg>
          110 anrufen
        </a>
        {undo && (
          <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
            <span className="mr-auto font-semibold">Leitstelle ist informiert.</span>
            <button onClick={onUndo} className="txtbtn">Rückgängig</button>
          </div>
        )}
        {known ? (
          <>
            <RideBar ride={ride} />
            <WayOutPanel ride={ride} extra={escape} onFine={onEnd} />
          </>
        ) : (
          <>
            <p className="m-0 rounded-2xl border border-dashed border-hairline p-3 text-muted">
              Ohne laufende Fahrt kennt die Leitstelle deinen Zug nicht. Geh dorthin, wo Menschen und Licht sind, und ruf 110 an, wenn du dich bedroht fühlst.
            </p>
            <section className="flex flex-col gap-3">{escape}</section>
            <button onClick={onEnd} className="min-h-14 rounded-full border-0 bg-ink text-lg font-bold text-paper">Mir geht's gut</button>
          </>
        )}
      </div>
    </div>
  )
}

const root = document.createElement('div')
document.body.append(root)
createRoot(root).render(<StrictMode><SafeRideLayer /></StrictMode>)
