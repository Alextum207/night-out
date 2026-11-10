// The calm emergency screen every rider view shares. One decision per screen: where you are, one primary
// action, slim alternatives, optional reasons; 110 and "Mir geht's gut" stay in the thumb zone.
import type { ReactNode } from 'react'
import { now } from '../clock'
import { emptiestCar } from '../mock'
import type { Option } from '../types'
import Navigate from './Navigate'
import { REASONS, type Ride } from './useRide'

const hhmm = (t: number) => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
const firstSentence = (s: string) => s.split(/(?<=\.)\s/)[0]

// Where the rider is, in one sentence (headline, ride bar, SafeRide's ride strip).
export function Where({ pos }: { pos: NonNullable<Ride['pos']> }) {
  return pos.state === 'train'
    ? <>Nächster Halt <b>{pos.nextStop.name}</b> in {pos.etaMin} Min</>
    : pos.etaMin > 0
      ? <>Am Bahnsteig <b>{pos.nextStop.name}</b>, Abfahrt in {pos.etaMin} Min</>
      : <>Angekommen: <b>{pos.nextStop.name}</b></>
}

// Line, direction and next stop (#/rider while riding).
export function RideBar({ ride, clock = false }: { ride: Ride; clock?: boolean }) {
  const { pos, leg } = ride
  if (!pos || !leg) return null
  return (
    <header className="rounded-[22px] border border-hairline bg-surface p-4 text-ink shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="rounded-md bg-ink px-2 py-0.5 font-bold text-paper">{leg.line}</span>
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
      <main onClick={() => ride.setShowFront(false)} className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-[#141a2e] p-8 text-center font-ride text-white">
        <svg viewBox="0 0 100 100" className="size-36" aria-hidden><path d="M50 8 L84 48 H61 V92 H39 V48 H16 Z" fill="white" /></svg>
        <p className="m-0 max-w-sm text-[26px] font-bold leading-tight">Geh nach vorne in den {emptiestCar(leg.line)} Wagen.</p>
        <p className="m-0 text-sm text-white/65">Beim Aussteigen startet der Weg am vorderen Bahnsteigende.</p>
        <button className="mt-4 h-11 rounded-full border-0 bg-white px-6 font-bold text-[#141a2e]">Fertig</button>
      </main>
    )
  }
  return null
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
)

// A slim secondary action.
export function Row({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button data-testid="option" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 border-0 border-b border-hairline bg-transparent px-1 text-left text-[17px] font-semibold text-ink last:border-b-0">
      <span className="flex-1">{title}</span><span className="text-muted"><Arrow /></span>
    </button>
  )
}

// Full-screen calm shell: status row, content, and the fixed thumb-zone bar (110 + "Mir geht's gut").
export function CalmScreen({ status, onClose, onFine, children, label }: {
  status: ReactNode; onClose?: () => void; onFine: () => void; children: ReactNode; label: string
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-40 overflow-y-auto bg-paper font-ride text-ink">
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-7 px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}>
        <div className="flex min-h-11 items-center gap-3">
          {status}
          {onClose && (
            <button onClick={onClose} aria-label="Notfall beenden" className="ml-auto grid size-11 place-items-center rounded-full border-0 bg-surface-2 text-ink">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          )}
        </div>
        {children}
        <div className="sticky bottom-0 -mx-5 mt-auto flex gap-3 bg-paper/95 px-5 pt-4 backdrop-blur" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
          <a href="tel:110" className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-danger text-[17px] font-bold text-white no-underline">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" /></svg>
            110 anrufen
          </a>
          <button onClick={onFine} className="h-14 flex-1 rounded-full border border-hairline bg-surface text-[17px] font-bold text-ink">Mir geht's gut</button>
        </div>
      </div>
    </div>
  )
}

export function Status({ live, children }: { live: boolean; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
      <span className={`size-2.5 rounded-full ${live ? 'animate-pulse bg-ok' : 'bg-hairline'}`} />{children}
    </span>
  )
}

// The Way Out content: where you are, control-room feedback, one primary action, slim alternatives, reasons.
export default function WayOutPanel({ ride, rows = [] }: { ride: Ride; rows?: { title: string; onClick: () => void }[] }) {
  const { pos, leg, feedback } = ride
  if (!pos || !leg) return null
  const acts = ride.options.filter((o) => o.target), info = ride.options.filter((o) => !o.target)
  const [first, ...rest] = acts
  const go = (target: NonNullable<Option['target']>) => ride.choose({ kind: 'security', target, title: '', detail: '' })
  return (
    <>
      <header>
        <p className="m-0 flex items-center gap-2 text-sm text-muted">
          <span data-testid="ride-line" className="rounded-md bg-ink px-2 py-0.5 font-bold text-paper">{leg.line}</span>Richtung {leg.destination}
        </p>
        <h1 className="m-0 mt-3 text-[28px] font-bold leading-tight [&_b]:font-extrabold"><Where pos={pos} /></h1>
      </header>

      {feedback && (
        <section className="flex items-center gap-3 rounded-[22px] bg-ok p-4 text-white">
          <div className="flex-1">
            <p className="m-0 text-lg font-bold leading-snug">{feedback.text}</p>
            {feedback.kind !== 'security' && feedback.steps[0] && <p className="m-0 mt-1 text-sm text-white/85">{feedback.steps[0]}</p>}
          </div>
          {feedback.kind === 'security' && (
            <button onClick={() => go('security')} className="h-11 shrink-0 rounded-full border-0 bg-white px-4 font-bold text-[#1f8a57]">Weg zeigen</button>
          )}
        </section>
      )}

      {first && (
        <button data-testid="option" onClick={() => ride.choose(first)} className="flex w-full items-center gap-4 rounded-[22px] border-0 bg-ink p-5 text-left text-paper shadow-lg active:scale-[0.99]">
          <span className="flex-1">
            <span className="block text-xl font-bold leading-snug">{first.title}</span>
            <span className="mt-1 block text-sm opacity-70">{firstSentence(first.detail)}</span>
          </span>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper/15"><Arrow /></span>
        </button>
      )}

      {(rest.length > 0 || rows.length > 0 || info.length > 0) && (
        <section>
          {rest.map((o) => <Row key={o.kind} title={o.title} onClick={() => ride.choose(o)} />)}
          {rows.map((r) => <Row key={r.title} {...r} />)}
          {info.map((o) => <p key={o.kind} className="m-0 mt-3 text-sm text-muted">{o.title}. {firstSentence(o.detail)}</p>)}
        </section>
      )}

      <section>
        <p className="m-0 mb-3 text-sm text-muted">Was ist los? Optional, geht leise an die Leitstelle.</p>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button key={r} onClick={() => ride.toggle(r)} aria-pressed={ride.reasons.includes(r)}
              className={`h-10 rounded-full border px-4 text-sm font-semibold ${ride.reasons.includes(r) ? 'border-ink bg-ink text-paper' : 'border-hairline bg-transparent text-ink'}`}>
              {r}
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
