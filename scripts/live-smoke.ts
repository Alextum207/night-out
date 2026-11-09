// Run before the pitch: npm run smoke. Checks the live MVG API that free mode depends on.
import { getDepartures, getRoute, searchStations } from '../src/mvg'

const hhmm = (t: number) => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
const r = await getRoute('de:09162:6', 'de:09162:500') // Hauptbahnhof -> Münchner Freiheit (with a change)
if (!r?.live) throw new Error('routes: no live result')
console.log('routes ok:', r.route.legs.map((l) => `${l.line} ${l.stops[0].name} ${hhmm(l.stops[0].dep)} -> ${l.stops.at(-1)!.name}`).join(' | '))
const d = await getDepartures('de:09162:500')
if (!d?.length) throw new Error('departures: empty')
console.log('departures ok:', d.slice(0, 3).map((x) => `${x.line} ${x.destination} ${hhmm(x.dep)}`).join(' | '))
const s = await searchStations('Münchner Frei')
if (!s.some((x) => x.id === 'de:09162:500')) throw new Error('locations: Münchner Freiheit missing')
console.log('locations ok:', s.slice(0, 3).map((x) => x.name).join(', '))
