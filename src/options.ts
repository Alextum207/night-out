// 2-3 concrete options for right now, ranked. Pure.
import type { Option, Position, Route } from './types'
import type { Departure } from './mvg'
import { directions, emptiestCar } from './mock'

// departures: live departures at the relevant station, or null (offline / scenario).
// nextTrainMin: fallback minutes until the next train of the same line (scenario snapshot).
export function buildOptions(p: Position, route: Route, departures: Departure[] | null, nextTrainMin: number): Option[] {
  const leg = route.legs[p.leg]
  const st = p.nextStop
  const access = st.escalatorOut ? ' Achtung: Rolltreppe außer Betrieb, nimm den Aufzug.' : st.elevatorOut ? ' Achtung: Aufzug außer Betrieb.' : ''

  if (p.state === 'train') {
    const arrive = st.dep
    const next = departures?.find((d) => d.line === leg.line && d.destination === leg.destination && d.dep > arrive + 30_000)
    const wait = next ? Math.max(1, Math.round((next.dep - arrive) / 60_000)) : nextTrainMin
    return [
      { kind: 'stepOut', title: `In ${p.etaMin} Min an ${st.name} aussteigen`, detail: `Gut beleuchtete Station mit Personal. Nächste ${leg.line} ${wait} Min später.${access}` },
      { kind: 'move', title: `In den ${emptiestCar(leg.line)} Wagen wechseln`, detail: 'Dort ist es auf dieser Linie meist leerer. Beim nächsten Halt umsteigen.' },
      { kind: 'security', title: `Security an ${st.name}`, detail: 'Die Leitstelle sieht deine Meldung und kann Security zum nächsten Halt schicken.' },
    ]
  }
  if (p.etaMin === 0 && p.leg === route.legs.length - 1) {
    return [{ kind: 'security', title: 'Zum Notruf- und Infopunkt', detail: directions(st.id)[0] }]
  }
  return [
    { kind: 'security', title: 'Zum Notruf- und Infopunkt', detail: `${directions(st.id)[0]}${access}` },
    { kind: 'nextTrain', title: `${leg.line} Richtung ${leg.destination} in ${p.etaMin} Min`, detail: 'Steig vorne beim Fahrer ein, dort ist es am hellsten.' },
    { kind: 'move', title: 'Im hellen Bereich bleiben', detail: 'Stell dich unter die Kamera, nicht ans Bahnsteigende.' },
  ]
}
