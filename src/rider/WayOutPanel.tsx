// The Way Out part every rider view shares: control-room status, options, reasons, "Mir geht's gut".
import type { ReactNode } from 'react'
import { now } from '../clock'
import { emptiestCar } from '../mock'
import Navigate from './Navigate'
import { REASONS, type Ride } from './useRide'

const hhmm = (t: number) => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

// Where the rider is, in one sentence (ride bar, SafeRide's ride strip).
export function Where({ pos }: { pos: NonNullable<Ride['pos']> }) {
  return pos.state === 'train'
    ? <>Nächster Halt <b>{pos.nextStop.name}</b> in {pos.etaMin} Min</>
    : pos.etaMin > 0
      ? <>Am Bahnsteig <b>{pos.nextStop.name}</b>, Abfahrt in {pos.etaMin} Min</>
      : <>Angekommen: <b>{pos.nextStop.name}</b></>
}

// Line, direction and next stop.
export function RideBar({ ride, clock = false }: { ride: Ride; clock?: boolean }) {
  const { pos, leg } = ride
  if (!pos || !leg) return null
  return (
    <header className="rounded-2xl border border-hairline bg-surface p-4 text-ink shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="rounded bg-ink px-2 py-0.5 font-bold text-paper">{leg.line}</span>
        <span>Richtung {leg.destination}</span>
        {clock && <span className="ml-auto tabular-nums">{hhmm(now())}</span>}
      </div>
      <p className="m-0 mt-2 text-lg font-semibold"><Where pos={pos} /></p>
    </header>
  )
}

// Full-screen steps after an option was chosen (navigation, front car). null = show the panel.
export function WayOutScreens({ ride }: { ride: Ride }) {
  const { pos, leg, nav } = ride
  if (!pos || !leg) return null
  if (nav) {
    return <Navigate stop={pos.nextStop} target={nav} travelBearing={ride.travelBearing} frontCar={ride.frontCar} reasons={ride.reasons}
      crowds={ride.crowds} nextTrainMin={ride.nextTrainMin} feedback={ride.feedback} onClose={() => ride.setNav(null)} />
  }
  if (ride.showFront) {
    return (
      <main onClick={() => ride.setShowFront(false)} className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-violet-700 p-6 text-center text-white">
        <svg viewBox="0 0 100 100" className="h-44 w-44" aria-hidden><path d="M50 6 L86 50 H62 V94 H38 V50 H14 Z" fill="white" /></svg>
        <p className="m-0 text-2xl font-bold">Geh im Zug in Fahrtrichtung nach vorne in den {emptiestCar(leg.line)} Wagen.</p>
        <p className="m-0 text-white/80">Beim Aussteigen starten wir den Weg dann vom vorderen Bahnsteigende.</p>
        <button className="min-h-12 rounded-full border-0 bg-white px-6 font-bold text-violet-800">Fertig</button>
      </main>
    )
  }
  return null
}

export default function WayOutPanel({ ride, extra, onFine }: { ride: Ride; extra?: ReactNode; onFine: () => void }) {
  const { feedback } = ride
  return (
    <>
      {feedback ? (
        <section className="rounded-2xl bg-ok p-4 text-white">
          <p className="m-0 text-xl font-bold">{feedback.text}</p>
          {feedback.steps.length > 0 && (
            <ol className="mb-0 mt-3 list-decimal space-y-1 pl-5">{feedback.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          )}
        </section>
      ) : (
        <p className="m-0 rounded-2xl border border-dashed border-hairline p-3 text-center text-muted">Die Leitstelle sieht deine Meldung.</p>
      )}
      <section className="flex flex-col gap-3">
        {ride.options.map((o) => (
          <button key={o.kind} onClick={() => ride.choose(o)} disabled={!o.target}
            className="rounded-2xl border border-hairline bg-surface p-4 text-left text-ink shadow-sm enabled:active:scale-[0.98] disabled:opacity-80">
            <p className="m-0 text-lg font-bold">{o.title}{o.target && <span className="float-right">→</span>}</p>
            <p className="m-0 mt-1 text-muted">{o.detail}</p>
          </button>
        ))}
        {extra}
      </section>
      <section>
        <p className="m-0 mb-2 text-sm text-muted">Was ist los? (optional, leise an die Leitstelle)</p>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button key={r} onClick={() => ride.toggle(r)} aria-pressed={ride.reasons.includes(r)}
              className={`min-h-11 rounded-full border px-4 font-semibold ${ride.reasons.includes(r) ? 'border-ink bg-ink text-paper' : 'border-hairline bg-surface-2 text-ink'}`}>
              {r}
            </button>
          ))}
        </div>
      </section>
      <button onClick={onFine} className="min-h-14 rounded-full border-0 bg-ink text-lg font-bold text-paper">Mir geht's gut</button>
    </>
  )
}
