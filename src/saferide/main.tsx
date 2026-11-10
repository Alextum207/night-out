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
import { WayOutScreens, Where } from '../rider/WayOutPanel'

const emit = (name: string, detail?: unknown) => dispatchEvent(new CustomEvent(name, { detail }))
type EmergencyContext = { line: string | null; direction: string; next: string; eta: number; accuracy: string }

function SafeRideLayer() {
  const ride = useRide({ persist: false })
  const [open, setOpen] = useState(false)
  const [emergencyContext, setEmergencyContext] = useState<EmergencyContext | null>(null)
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

  // Opening SOS is intentionally neutral. The rider explicitly chooses one of
  // three actions before anything is sent to the control room.
  useEffect(() => {
    const onEmergency = (e: Event) => {
      const context = (e as CustomEvent<{ context?: EmergencyContext }>).detail?.context
      if (context) setEmergencyContext(context)
      setOpen(true)
    }
    const onReopen = () => setOpen(true)
    addEventListener('sr:emergency', onEmergency)
    addEventListener('sr:emergency-open', onReopen)
    return () => { removeEventListener('sr:emergency', onEmergency); removeEventListener('sr:emergency-open', onReopen) }
  }, [])
  const end = () => setOpen(false)

  if (!open) return ride.scenario ? <RideStrip ride={ride} /> : null
  if (ride.screen === 'wayout' && (ride.nav || ride.showFront)) return <WayOutScreens ride={ride} />
  return <Emergency context={emergencyContext} onEnd={end}
    onSecurity={() => emit('sr:security')}
    onWayOut={() => { setOpen(false); emit('sr:escape') }}
    onReport={() => { setOpen(false); emit('sr:open-report') }} />
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

function Emergency({ context, onEnd, onSecurity, onWayOut, onReport }: {
  context: EmergencyContext | null; onEnd: () => void; onSecurity: () => void; onWayOut: () => void; onReport: () => void
}) {
  const [stage, setStage] = useState<'menu' | 'security'>('menu')
  const contextLine = context?.line ? `${context.line} Richtung ${context.direction}` : context?.direction ?? 'Live-Standort verfügbar'
  const contextDetail = context?.next ? `Nächster Halt ${context.next}${context.eta > 0 ? ` · ${context.eta} Min` : ''}` : 'Standort wird automatisch mitgesendet'
  const security = () => { onSecurity(); setStage('security') }
  return (
    <main role="dialog" aria-modal="true" aria-label="SOS" className="fixed inset-0 z-40 overflow-y-auto bg-paper font-ride text-ink">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)' }}>
        <div className="flex min-h-12 items-center gap-3">
          <span className="inline-flex h-9 items-center rounded-full bg-danger px-4 text-sm font-black tracking-[.08em] text-white">SOS</span>
          <span className="text-sm font-semibold text-muted">Nur du entscheidest, was gesendet wird</span>
          <button onClick={onEnd} aria-label="SOS schließen" className="ml-auto grid size-11 shrink-0 place-items-center rounded-full border-0 bg-surface-2 text-ink">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {stage === 'security' ? (
          <section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <span className="relative grid size-24 place-items-center rounded-full bg-ok text-white shadow-xl">
              <span className="absolute inset-0 animate-ping rounded-full bg-ok/20" />
              <svg viewBox="0 0 24 24" className="relative size-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" /></svg>
            </span>
            <p className="m-0 mt-8 text-sm font-bold uppercase tracking-[.12em] text-ok">Verbindung aktiv</p>
            <h1 className="m-0 mt-2 text-[30px] font-black leading-tight">Stationssicherheit ist informiert.</h1>
            <p className="m-0 mt-3 max-w-xs text-muted">{contextLine}<br />{contextDetail}</p>
            <button onClick={() => setStage('menu')} className="mt-10 h-14 w-full rounded-full border-0 bg-ink text-[17px] font-bold text-paper">Zurück zu SOS</button>
          </section>
        ) : (
          <>
            <header className="pb-5 pt-8">
              <h1 className="m-0 text-[32px] font-black leading-[1.05] tracking-[-.035em]">Was brauchst du jetzt?</h1>
              <p className="m-0 mt-3 text-[15px] text-muted">{contextLine}<br />{contextDetail}</p>
            </header>

            <section className="grid gap-3">
              <button onClick={security} className="flex min-h-[96px] w-full items-center gap-4 rounded-[24px] border-0 bg-danger p-4 text-left text-white shadow-lg active:scale-[.99]">
                <span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-white/16"><svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" /></svg></span>
                <span className="flex-1"><strong className="block text-xl">Stationssicherheit</strong><small className="mt-1 block text-sm text-white/75">Jetzt direkt verbinden</small></span><Arrow />
              </button>
              <button onClick={onWayOut} className="flex min-h-[96px] w-full items-center gap-4 rounded-[24px] border-0 bg-ink p-4 text-left text-paper shadow-lg active:scale-[.99]">
                <span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-paper/12"><svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h12M12 6l6 6-6 6"/><path d="M20 4v16"/></svg></span>
                <span className="flex-1"><strong className="block text-xl">Way Out starten</strong><small className="mt-1 block text-sm text-paper/65">Ruhige Schritt-für-Schritt-Hilfe</small></span><Arrow />
              </button>
              <button onClick={onReport} className="flex min-h-[88px] w-full items-center gap-4 rounded-[24px] border border-hairline bg-surface p-4 text-left text-ink active:scale-[.99]">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2"><svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg></span>
                <span className="flex-1"><strong className="block text-lg">Vorfall melden</strong><small className="mt-1 block text-sm text-muted">Nicht dringend · an das Verkehrsunternehmen</small></span><Arrow />
              </button>
            </section>
            <p className="m-0 mt-auto pt-7 text-center text-sm text-muted">Akute Gefahr? <a href="tel:110" className="font-bold text-danger underline underline-offset-4">110 anrufen</a></p>
          </>
        )}
      </div>
    </main>
  )
}

const Arrow = () => <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>

const root = document.createElement('div')
document.body.append(root)
createRoot(root).render(<StrictMode><SafeRideLayer /></StrictMode>)
