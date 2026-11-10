// #/rider: standalone Way Out (fallback and tests). The main rider app is SafeRide with the emergency overlay.
import { useEffect, useState } from 'react'
import { getRoute, searchStations, type StationHit } from '../mvg'
import type { Route } from '../types'
import { useRide } from './useRide'
import WayOutPanel, { CalmScreen, RideBar, Status, WayOutScreens } from './WayOutPanel'

const shell = 'mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-paper p-4 pb-8 font-ride text-ink'

export default function Rider() {
  const ride = useRide({ persist: true })
  // Same theme rule as SafeRide (auto: dark 20:00-06:00); the control room on this page stays as it is.
  useEffect(() => {
    const h = new Date().getHours()
    document.documentElement.dataset.mode = h >= 20 || h < 6 ? 'dark' : 'light'
    return () => { delete document.documentElement.dataset.mode }
  }, [])
  const { route, pos, leg, screen } = ride

  if (screen === 'setup' || !route || !pos || !leg) {
    return <TripSetup onRoute={(r) => ride.setFreeRoute(r, true)} />
  }
  if (screen === 'wayout' && (ride.nav || ride.showFront)) return <WayOutScreens ride={ride} />
  if (screen === 'wayout') {
    return (
      <CalmScreen label="Way Out" status={<Status live>Leitstelle informiert</Status>} onFine={() => ride.fine()}>
        <WayOutPanel ride={ride} />
      </CalmScreen>
    )
  }

  return (
    <div className="min-h-dvh bg-paper">
      <main className={shell}>
        <RideBar ride={ride} clock />

        {screen === 'riding' && (
          <>
            <button onClick={ride.wayOut} className="mt-6 aspect-square w-full rounded-full border-0 bg-violet-600 text-4xl font-black text-white shadow-2xl shadow-violet-900/40 active:scale-95">
              Way Out
            </button>
            <p className="m-0 text-center text-sm text-muted">Ein Tipp, wenn du dich unwohl fühlst. Anonym. Im Notfall: 110.</p>
            <button onClick={() => ride.setScreen('setup')} className="min-h-11 border-0 bg-transparent text-sm text-muted underline">Andere Fahrt</button>
          </>
        )}

        {screen === 'closed' && (
          <section className="mt-8 flex flex-col gap-4 text-center">
            <p className="m-0 text-2xl font-bold">Gute Heimfahrt.</p>
            <p className="m-0 text-muted">Sitzung beendet, dein Standort wurde gelöscht.</p>
            <button onClick={() => ride.setScreen('riding')} className="min-h-11 rounded-full border border-hairline bg-surface-2 font-semibold">Zurück</button>
          </section>
        )}
      </main>
    </div>
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
    <div className="min-h-dvh bg-paper">
      <main className={shell}>
        <h1 className="m-0 mt-6 text-3xl font-black">Way Out</h1>
        <p className="m-0 text-muted">Einmal Start und Ziel eingeben. Wir nehmen die nächste Verbindung.</p>
        <StationInput label="Start" value={from} onPick={setFrom} />
        <StationInput label="Ziel" value={to} onPick={setTo} />
        <button disabled={!from || !to} onClick={go} className="min-h-14 rounded-full border-0 bg-ink text-lg font-bold text-paper disabled:opacity-40">Los</button>
        {msg && <p className="m-0 text-center text-muted">{msg}</p>}
      </main>
    </div>
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
      <span className="text-sm text-muted">{label}</span>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Haltestelle"
        className="min-h-12 rounded-xl border border-hairline bg-surface-2 px-4 text-lg text-ink outline-none focus:ring-2 focus:ring-ink" />
      {hits.length > 0 && (
        <ul className="absolute top-full z-10 m-0 mt-1 w-full list-none overflow-hidden rounded-xl border border-hairline bg-surface p-0 shadow-xl">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => { onPick(h); setQ(h.name); setHits([]) }} className="min-h-11 w-full border-0 bg-transparent px-4 text-left text-ink hover:bg-surface-2">
                {h.name} <span className="text-sm text-muted">{h.place}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  )
}
