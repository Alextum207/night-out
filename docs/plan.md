> Approved plan, copied from the planning session on 2026-11-09. Where it differs from `idea.md` §12, **§12 wins** (it includes the review results).

# Plan: "Way Out" prototype (rider app + MVG control room)

## Context
2-day innovation sprint, live pitch demo for MVG. `idea.md` describes the concept. The grilling session settled every open decision (below). The repo has no code yet (only `AGENTS.md`, `docs/agents/*`, untracked `idea.md`). Goal: a deployed web app where 3–5 phones tap "Way Out" in the same U6, the dashboard shows a hotspot live, the operator acts, and Luna's screen shows the response.

On approval, step 0 runs first: write the decisions into `idea.md`, commit, and create the GitHub issues listed under "Build order". Code comes after that.

## Settled decisions (grilling rounds 1–4)
- **Real data (MVG API `https://www.mvg.de/api/bgw-pt/v3`, unofficial, free, verified in-session):**
  - `/locations?query=…&locationTypes=STATION` for station autocomplete.
  - `/routes?originStationGlobalId&destinationStationGlobalId&routingDateTime` returns `parts[].intermediateStops[]`, each with name, lat/lng, `plannedDeparture`, `hasOutOfOrderEscalator`/`Elevator`, `occupancy` (always `UNKNOWN`), plus `pathPolyline` (Google encoded polyline).
  - `/departures?globalId=…` returns `realtime`, `delayInMinutes`, `platform`, `messages`.
  - **CORS returns `Access-Control-Allow-Origin: *`**, so the browser calls it directly and we need **no proxy**.
- **Mock data:** occupancy per car, security teams and their positions, the 3-step walking directions to security/exit, the event calendar, and a frozen route snapshot as fallback if the API is down.
- **Dropped:** Google Maps, Sideloadly, the MVV CSV, `mvg-api` (Python).
- **Rider app (mobile web, no map):**
  - Enter start and destination once; the app picks the next connection automatically.
  - Position comes from clock + timetable. Two states: "platform" (before departure or while changing trains) and "train" (between stops).
  - "Way Out" button, then 2–3 options, reason chips, operator feedback, and "Mir geht's gut".
- **Control room:**
  - Leaflet + OSM map with the U6 path from `pathPolyline`, stations, pulsing tap dots, and blue security dots.
  - Hotspot when ≥3 taps from the same train within 5 min. A single tap shows as a yellow "Einzelmeldung".
  - 4 actions (Security / Durchsage / Extra-Zug / Erledigt), each sends feedback to the rider.
  - Static event panel.
  - Hidden demo control: pick a scenario, jump the time.
- **Scenarios:**
  - Arena: U6 Fröttmaning (`de:09162:470`) → Sendlinger Tor (`de:09162:50`), hotspot before Münchner Freiheit (`de:09162:500`).
  - Garching: alone on the platform at Garching-Forschungszentrum at night, single tap.
- **Out of scope:** Ride together and comfort score (pitch slide only).
- **Projector:** dashboard plus a narrow rider window at phone width.

## Stack
- Vite + React + TypeScript + Tailwind, one SPA with routes `/rider` and `/control`. Hash or path routing via a tiny `location.pathname` switch, no router library.
- `@supabase/supabase-js` Realtime **Broadcast** only, one channel `wayout`, no tables. Verified API: `client.channel('wayout', { broadcast: { self: true } })`, `.on('broadcast', {event}, cb)`, `.subscribe()`, `.send({type:'broadcast', event, payload})`.
- `leaflet` + `react-leaflet` with OSM tiles.
- Deploy on Vercel, phones open the URL in Safari/Chrome.
- Before writing code, fetch current docs via context7 for Vite, Tailwind, react-leaflet, and supabase-js (global CLAUDE.md rule).

## Files (planned)
```
index.html, package.json, vite.config.ts, .env.example (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
src/main.tsx          – route switch: /rider | /control
src/mvg.ts            – searchStations, getRoute, getDepartures (fetch + fallback to mock), decodePolyline (~15 lines)
src/realtime.ts       – single channel, send(event,payload), on(event,cb)
src/position.ts       – where(route, now) -> {state:'platform'|'train', prevStop, nextStop, etaMin}; trainKey(route)
src/options.ts        – buildOptions(position, scenario) -> Option[]  (step out / move car / go to security)
src/hotspots.ts       – groupTaps(taps, now) -> {hotspots, singles}   (THRESHOLD=3, WINDOW_MIN=5)
src/mock.ts           – security teams, directions per station, occupancy, events, route snapshots (Arena, Garching)
src/rider/Rider.tsx   – screens: TripSetup → Riding (big button) → Options+Chips → Feedback → closed
src/control/Control.tsx – map, hotspot cards with 4 actions, event panel, hidden demo panel
src/selfcheck.ts      – assert-based check for position.ts + hotspots.ts (run with `npx tsx src/selfcheck.ts`)
```

## Realtime events (channel `wayout`)
| event | from → to | payload |
|---|---|---|
| `tap` | rider → control | sessionId, trainKey, line, direction, state, prevStop, nextStop, lat, lng, reasons[], at |
| `reasons` | rider → control | sessionId, reasons[] |
| `fine` | rider → control | sessionId |
| `action` | control → rider | trainKey or sessionId, kind (security/announce/extraTrain/resolved), stationId, text, steps[] |
| `demo` | control → riders | scenario, route (whole route object), virtualNow |

`demo` sends the route object itself, so every phone ends up on the identical train no matter when it was loaded. `trainKey = line + destination + plannedDeparture of the first stop`.
`// ponytail: broadcast is ephemeral, a dashboard reload loses open taps; add a Supabase table if needed beyond the demo.`

## Build order (one GitHub issue each, labels per `docs/agents/issue-tracker.md`)
1. **Scaffold + deploy**: Vite/React/Tailwind, `/rider` and `/control` stubs, Vercel deploy, Supabase project + env vars.
2. **MVG client + mock fallback**: `mvg.ts`, polyline decoder, frozen route snapshots for both scenarios.
3. **Position logic**: `position.ts` (platform/train, next stop, ETA, trainKey) plus selfcheck.
4. **Realtime channel**: `realtime.ts`, smoke test with two browser tabs.
5. **Rider flow**: TripSetup (autocomplete) → Way Out → options (incl. live next departure, defective escalator hint) → chips → feedback → "Mir geht's gut". Blocked by 2, 3, 4.
6. **Hotspot logic**: `hotspots.ts` plus selfcheck.
7. **Control dashboard**: map + polyline + stations + taps + security dots, hotspot/single cards, 4 actions → `action`. Blocked by 2, 4, 6.
8. **Demo control + scenarios**: hidden panel sending `demo` (Arena/Garching, time jump). Blocked by 5, 7.
9. **Event panel + polish**: static events, pulsing dots, big touch targets, German UI copy.
10. **Demo rehearsal**: 5 phones on venue-like Wi-Fi, API-down fallback test, demo script in `idea.md`.

Issues 1–4 and 6 can run in parallel on different devices.

## Demo script (short)
1. Projector shows the dashboard plus a narrow rider window. Presenter picks "Szenario Arena" in the demo panel. All phones are now on the same U6, just before Münchner Freiheit.
2. Luna's story. 4 team members and Luna tap "Way Out" and choose "Betrunkene Gruppe".
3. Dashboard shows the U6 card turning red ("5 Meldungen, Betrunkene Gruppe"). Operator clicks "Security nach Münchner Freiheit".
4. Luna's window shows "Security wartet an Münchner Freiheit" plus 3 walking steps, then "Mir geht's gut".
5. Switch to Garching: one tap → yellow single report → "Leitstelle schaut mit, Security in 6 Min".

## Verification
- `npx tsx src/selfcheck.ts` passes (position states at boundaries; 2 taps = single reports, 3 taps within 5 min = hotspot, 3 taps spread over 6 min = no hotspot).
- `npm run build` succeeds, and the Vercel URL loads on an iPhone and on Android.
- Manual end-to-end: open `/control` on the laptop and `/rider` on 3 phones, run the Arena scenario, confirm the hotspot appears within 2 s and the operator action reaches all 3 phones.
- Fallback: block `mvg.de` in devtools, then confirm the Arena scenario still runs from the snapshot.
