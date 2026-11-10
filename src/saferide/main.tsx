// SafeRide page entry: Way Out lives inside SafeRide (public/saferide/app.js, plain JS).
// Window events with app.js:
//   in:  sr:report (share a report or pin with the control room), sr:wayout {id, name, lat, lng, travelBearing} (Way Out tapped:
//        guide from this station's platform to the nearest staff point or busy area), sr:trip {from, to} | null (SafeRide trip
//        started/ended: mapped to an MVG route)
//   out: sr:crowds (control-room crowds as alerts), sr:fine ("Mir geht's gut": take the Way Out pin back),
//        sr:train {lat, lng, line, fly} | null (scenario train marker)
import '../saferide.css'
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { getRoute, searchStations } from '../mvg'
import { MOCK_CROWDS } from '../mock'
import type { Report, Stop } from '../types'
import { sessionId, useRide, type Ride } from '../rider/useRide'
import { SafetyBar, Where } from '../rider/WayOutPanel'
import Navigate from '../rider/Navigate'

const emit = (name: string, detail?: unknown) => dispatchEvent(new CustomEvent(name, { detail }))
type WayOutStop = { id: string; name: string; lat: number; lng: number; travelBearing: number | null }

function SafeRideLayer() {
  const ride = useRide({ persist: false })
  const [wayOut, setWayOut] = useState<WayOutStop | null>(null)
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

  // Way Out: one tap in the dock, straight into the steps.
  useEffect(() => {
    const on = (e: Event) => setWayOut((e as CustomEvent<WayOutStop>).detail)
    addEventListener('sr:wayout', on)
    return () => removeEventListener('sr:wayout', on)
  }, [])

  if (wayOut) {
    const stop: Stop = { ...wayOut, dep: Date.now(), escalatorOut: false, elevatorOut: false }
    const fine = () => { emit('sr:fine'); setWayOut(null) }
    return <Navigate key={stop.id} wayOut stop={stop} target="wait" travelBearing={wayOut.travelBearing} frontCar={false} reasons={[]}
      crowds={[...(MOCK_CROWDS[stop.id] ?? []), ...ride.liveCrowds]} nextTrainMin={5} feedback={null}
      onClose={() => setWayOut(null)} footer={<SafetyBar onFine={fine} className="shrink-0 bg-paper" />} />
  }
  return ride.scenario ? <RideStrip ride={ride} /> : null
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

const root = document.createElement('div')
document.body.append(root)
createRoot(root).render(<StrictMode><SafeRideLayer /></StrictMode>)
