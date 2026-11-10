# Idea: "Way Out", a one-tap exit for feeling trapped on Munich public transport

Team: Night Out (Challenge 5, Team 2), UnternehmerTUM Innovation Sprint, Nov 2026
Partner: MVG (Münchner Verkehrsgesellschaft)
Build time: 2 days, vibe-coded prototype for a live pitch demo

> Claude Code: read this whole file, then write an implementation plan (screens, components, data model, mock data, build order, demo script) before writing any code. Ask before adding anything outside the "Scope" section.

---

## 1. Problem

Young women travelling home alone at night feel unsafe on Munich public transport, especially when a big event (Oktoberfest, football at Allianz Arena, concerts) fills trains with drunk, loud groups. In our 12 interviews the moment they feel worst is not the planning before the trip. It is being inside a packed train or on a platform with no way out and nobody stepping in.

What we heard (interview notes):
- "fear of drunk people", "sports events attract drunk people"
- "no possibility to escape", "missing civil courage", "claustrophobia"
- "waiting alone is scary", "scared at night alone to go home"
- Two interviewees left the train to escape. One avoids travelling at night altogether.

Police data backs it up: in Munich 82 % of sexual offence victims are women, and Oktoberfest 2025 saw 72 sexual offences (2024: 56).

## 2. Persona and POV

**Luna, 21**, biology student at TUM, lives alone in an affordable area outside the centre, extrovert, goes out a lot, rather scared than confident on the way home.

**POV:** A young woman travelling home alone at night while an event is happening in the city needs a quick way to escape the crowd, because she feels trapped.

**HMW:** How might we give a young woman travelling alone on event nights a way out of a crowded train or platform the moment she feels trapped?

## 3. Why this is not Google Maps or SafeNow

| Existing | What it does | What it does not do |
|---|---|---|
| Google Maps / MVGO app | Plan a route before the trip, real-time departures | Nothing for the moment you feel trapped. No safety signal to MVG |
| MVG load indicator | Forecast how full a line is (based on past days) | No live data, no wagon level, no night lines |
| SafeNow | Alarm button, alerts friends and security in its zones (e.g. one Oktoberfest tent) | No zones in public transport, needs an emergency, only people you know |
| SafeUP | Community app, nearby "guardians", share journey | Not connected to the operator, no in-the-moment exit options |

**Our difference is two-sided:**
1. **Rider side:** one tap when she feels trapped gives 2 to 3 concrete options for *right now* (not a route plan).
2. **Operator side:** every tap is also an anonymous live signal to the MVG control room. Several taps from the same train = MVG sees a hotspot and can act (send security, add a train, make an announcement). Nobody offers this today.

The tap is for "I feel uncomfortable", not for emergencies. Low threshold, no drama. Emergencies still go to 110.

## 4. Core user flow (rider app)

1. Luna is on the U6 after a match at Allianz Arena. The train is packed with drunk fans. She opens the app and taps the big **"Way Out"** button.
2. The app knows her line, direction and next station (GPS + timetable; in the demo: selected manually or mocked).
3. It shows 2 to 3 options, ranked:
   - **Step out:** "Get off at Münchner Freiheit in 2 min. Staffed station, well lit. Next U6 in 4 min, expected less crowded."
   - **Move:** "The front car is usually emptier on this line." (simulated in the demo, see risks)
   - **Not alone:** "2 women heading towards Sendlinger Tor are waiting at the next stop. Ride together?" (opt-in matching, first names only)
4. Optional: a silent **"Tell MVG what's happening"** field (short text or quick chips: drunk group, harassment, too crowded, feel followed). No call, no confrontation.
5. After she is safe: one tap "I'm fine now" closes the session.

## 5. Core flow (MVG control room dashboard)

1. Map of Munich lines and stations with live "Way Out" taps as dots.
2. When 3+ taps come from the same train or station within a few minutes, it turns into a **hotspot** card: line, train, direction, number of taps, top reasons.
3. Actions on the card (mock): "Send security to next station", "Make announcement", "Request extra train", "Mark resolved".
4. Side panel: event calendar (e.g. "FC Bayern vs. Dortmund, ends 22:30") and a simple history of hotspots per station. This is the data MVG does not have today.

## 6. Demo script (the pitch moment)

- One laptop shows the MVG dashboard on the projector.
- 3 to 5 team members hold phones with the rider app, all "on the same U6 train".
- Presenter tells Luna's story, then everyone taps "Way Out".
- The train lights up as a hotspot on the dashboard in real time, the operator clicks "Send security to Münchner Freiheit", and Luna's phone shows "Security is waiting at Münchner Freiheit".

That live loop between rider and operator is the core of the pitch.

## 7. Scope for the 2-day build

**Must have**
- Rider web app (mobile-first, runs in a phone browser): Way Out button, options screen, quick-reason chips, "I'm fine now".
- Operator dashboard (desktop): map with live taps, hotspot detection, action buttons, feedback back to the rider.
- Real-time link between both (several phones, one dashboard).
- Mock scenario: U6 towards the city after a match at Allianz Arena, plus one quieter night scenario (dark outer station).

**Nice to have**
- "Ride together" matching between two demo phones.
- Event calendar panel.
- Station "comfort score" built from past taps (the data asset for MVG).

**Non-goals for now**
- ~~Real MVG integration~~ (deliberately reversed, see §12), real occupancy data, accounts, payments, native apps, emergency calls.
- Ride together and comfort score are pitch slides only. Also out: the free-text field (chips only), hotspot history per station, and station hotspots.

## 8. Suggested tech (Claude Code: propose the final stack in the plan)

- Frontend: Next.js or Vite + React, Tailwind. Mobile-first rider view, desktop operator view in the same app (`/rider`, `/control`).
- Real-time: Supabase Realtime, Firebase, or a small WebSocket server. Must work with several phones on venue Wi-Fi.
- Map: MapLibre or Leaflet with OpenStreetMap tiles.
- Data: Munich stations and lines from the official MVV GTFS feed on opendata.muenchen.de (static timetable). Everything live (taps, occupancy, staffed stations) is mocked in JSON.
- Deploy: Vercel or similar, so phones can open a URL during the pitch.

## 9. Data model (first draft)

- `Tap`: id, sessionId, timestamp, line, direction, trainId, nextStationId, lat, lng, reasons[], status (open / resolved)
- `Hotspot`: id, trainId or stationId, tapCount, firstTapAt, topReasons[], status, operatorAction
- `Station`: id, name, lat, lng, lines[], staffed (bool), lit (bool), comfortScore
- `Option`: type (stepOut / move / together), text, stationId, etaMinutes
- `Event`: name, venue, endTime, affectedLines[]

## 10. Privacy principles (say this in the pitch)

- Anonymous by default: no name, no account, session id only.
- Location only during an active Way Out session, deleted after it ends; MVG only sees aggregated taps per train or station.
- Matching is opt-in, first name only, meeting point always inside a station.

## 11. Risks and open questions

- **Wagon-level occupancy:** MVG's load indicator is a forecast from past days, and not all lines have passenger counters. The "move to the front car" option has to be simulated and named as a requirement in the pitch.
- **Misuse / false taps:** how many taps make a hotspot? Do we need rate limiting?
- **Who acts on a hotspot at night?** MVG security, U-Bahn-Wache, police? To validate with MVG.
- **Would women use it?** Low threshold vs. "I don't want to make a fuss". To test with 3 to 5 quick interviews tomorrow.

## 12. Decisions (plan + Goldfish review, 2026-11-09)

This file is the single source of decisions for the sprint. Exception to AGENTS.md: no GLOSSARY.md or ADRs during the sprint. Full plan: `docs/plan.md`. Review: `docs/review/consolidated_review_report.md`.

**Data**
- MVG API `https://www.mvg.de/api/bgw-pt/v3` (unofficial, free, CORS `*`, so no proxy):
  - `/locations` for autocomplete
  - `/routes` for stops, coordinates, planned times, escalator/elevator flags and `pathPolyline`
  - `/departures` for realtime departures

  `occupancy` returned `UNKNOWN` in all samples, so it is mocked.
- **This reverses the §7 non-goal**: the live API is used only in free mode (TripSetup), with `AbortSignal.timeout(3000)` falling back to the mock. **While a scenario runs, nothing calls MVG**: route, departures and escalator flags come from the snapshot relative to `virtualNow`.
- Mocked: occupancy per car, security teams + positions, 3-step walking directions, events, and route snapshots (live `/routes` captured once, saved as JSON in `src/mock.ts`).
- Dropped:
  - Google Maps: we have no map in the rider app, and Leaflet + OSM for the control room.
  - GTFS/MVV data: static only, no polyline. The MVG API is enough.
  - `mvg-api` (Python): we have no backend.
  - Sideloadly: we have no native app.

**Stack**
- Vite + React + TypeScript + Tailwind, one SPA.
- **Hash routing**: `#/rider`, `#/control`, `/` goes to Control. No router library.
- Supabase Realtime Broadcast, channel `wayout`, no tables.
- Leaflet + react-leaflet with OSM tiles.
- Vercel.
- Versions are decided in issue 1 via context7, not from memory.
- **`src/types.ts`** (Route, Stop, Position, Option, Tap, Hotspot, Action, DemoPayload), written in issue 1, before any parallel work.
- `position.ts` and `hotspots.ts` stay pure (no `import.meta.env`) and are checked by `npx tsx src/selfcheck.ts`.
- UI copy: German.

**Rider app**: no map. Enter start and destination once, and the app picks the next connection. Position = clock + timetable (platform | train). Flow: Way Out → 2-3 options → chips → operator feedback → "Mir geht's gut". Touch targets ≥ 44 px.

**Realtime events** (all times in epoch ms; sessionId = `crypto.randomUUID()` in sessionStorage; receivers ignore events from their own role):

| event | direction | content / behaviour |
|---|---|---|
| `tap` | rider → control | Sent again on every chip change with the same sessionId. Control upserts it into `Map<sessionId, Tap>`. (There is no separate `reasons` event.) |
| `fine` | rider → control | Removes the session's tap. |
| `action` | control → rider | `target = {trainKey} \| {sessionId}`, kind (security / announce / extraTrain / resolved), stationId (= the card's `nextStop`), text, steps[]. |
| `demo` | control → riders | scenario, the whole route, `virtualNow`, `reset`, optional `to` (catch-up reply). With `reset`, a phone jumps from any screen into Riding. **Changed during the build:** the scenario clock is **frozen** and only moves with ±1 Min in the demo panel, so the train cannot drive past Münchner Freiheit during the pitch. |
| `hello` | rider → control | On subscribe and on `visibilitychange`. Control resends the current `demo` and the last `action` for that trainKey/session. This is how phones that were locked or reloaded catch up. |

**Hotspots**
- `trainKey = line|destination|plannedDeparture(route.stops[0])`. It is **for the demo only**: it groups riders reliably only because `demo` pushes the same route to everyone.
- One card per trainKey: yellow at 1-2 distinct sessions, red at ≥ 3 sessions in a sliding window `[now-5min, now]` on the `virtualNow` clock.
- The top reason is the most frequent one (on a tie, the first). `resolved` grays out the card.
- The demo panel has a "+1 synthetic tap" button as a fallback in case phones fail.

**Scenarios**
- Arena: U6 Fröttmaning (`de:09162:470`) → Sendlinger Tor (`de:09162:50`). `virtualNow` is 2 min before Münchner Freiheit (`de:09162:500`).
- Garching: alone on the platform at Garching-Forschungszentrum at night, single tap. The globalId and night time are set in issue 2. The "Security in 6 Min" figure is computed from the mock team position.
- Luna is played by the projected rider window (dashboard + rider window at phone width). 4 team members tap on phones.

**Accepted demo risks** (production approach in brackets)
- Open anon-key channel: anyone with the URL can send taps or actions. (Authenticated channels + server-side aggregation + rate limiting.)
- trainKey only groups riders on the pushed route. (Trip ID or a reference stop shared by all riders.)
- Position assumes the rider is on the planned train and that it is on time. (GPS/realtime delay, choice of connection.)
- No station hotspots and no free text.
- Broadcast stores nothing, so a dashboard reload loses open taps. (Supabase table.)
- If the OSM tiles are offline, the map stays blank. The polyline and dots stay visible.

**Answers to §11**: a hotspot needs ≥ 3 distinct sessions in 5 min, and one phone cannot trigger it alone. Rate limiting is production-only. Who acts at night and whether women would use the app remain open and will be validated with MVG and in interviews.

**Build notes**: `Route = { legs[] }` (one leg per vehicle, so real trips with a change work). "Szenario beenden" in the demo panel switches back to live mode for real trips. Tests: `npm run check` (selfcheck), `npm run smoke` (live MVG), `npm run e2e` (full demo + 2 real trips, installed Chrome, headless).


**Navigation after Way Out (grilling round 2, 2026-11-10)**
- "Aussteigen", "Security" and "Notrufpunkt" open a **split screen**. "Wagen wechseln" only shows an arrow towards the front or back of the train.
- **Top half:** a calm violet background with a big white arrow. Fixed symbols for left, right, stairs up/down, escalator and elevator. On "straight ahead" the arrow turns with the phone's compass, if the rider allows it. Below the arrow: one short sentence. The last step is green ("Security wartet hier"). The rider moves to the next step by tapping or swiping (there is no GPS underground).
- **Start:** the middle of the platform (the front end after "Wagen wechseln"). The first step is phrased relative to the direction of travel.
- **Bottom half:** a street map at zoom 17-18 with the station area dimmed, the station outline bright and the route violet with a white glow.
  - Underground parts are dashed, street level is solid. Both stay clearly visible.
  - Icons for stairs, escalators and elevators sit on the route, with level labels.
  - The current step is highlighted and the map zooms to it.
  - Further icons: police (real stations from OSM), security teams (mock), crowds (hotspots from the control room, mock as fallback).
- **Routes** come from OSM indoor data (Overpass). They are fetched in advance for Münchner Freiheit and Garching-FZ and stored as a JSON graph; the route itself is computed in the browser. Other stations keep the 3 text steps.
- **Targets:**
  - "Aussteigen" goes to the safe waiting point in the mezzanine (staffed, camera). A button "Lieber raus auf die Straße" leads to an exit instead.
  - "Security" goes to the meeting point.
  - "Notrufpunkt" goes to the platform elevator.
- **Choosing the exit depends on the reason:**
  - "Fühle mich verfolgt": towards people (a busy exit, staff).
  - Any other reason, or none: away from crowds.
  - A reported hotspot with "Betrunkene Gruppe" or "Belästigung" never counts as a safe crowd.
- If MVG reports a broken escalator or elevator, the route avoids it and shows a hint.

**Build**: 10 issues as sub-issues of a `wayfinder:map` issue, labelled `wayfinder:task`, with native GitHub dependencies. Issue 1 blocks 2/3/4/6. The rule tables (position, options + copy, action texts, selfcheck cases) are acceptance criteria in the issues.
**SafeRide merge (grilling round 3, 2026-11-10)**

The source is `saferide-munich_1.zip` from a teammate: one vanilla-JS `index.html` with MapLibre and the network data inlined. Reports were kept only in localStorage.

- **Embedded, not ported:**
  - `saferide.html` is a second Vite entry; its code lives in `public/saferide/` (`app.js`, `app.css`, `maplibre.js`, `data.js`, `pwa.js`).
  - MapLibre stays inside SafeRide and Leaflet stays in Way Out.
  - SafeRide's routing (simulated timetables, `mvg_xxx` ids) stays as it is.
- **Bridge:**
  - `src/saferide-bridge.ts` uses `realtime.ts`, so it gets the same env vars, the same `?room` and the same reconnect.
  - It talks to SafeRide through `window` events `sr:report` (out) and `sr:crowds` (in).
- **Entry:** phones open `/saferide.html?room=…`. `/` stays the control room and `#/rider` stays Way Out.
- **Notfall → Way Out:**
  - The emergency sheet has a "Way Out" button that opens `/?room=…#/rider/wayout`.
  - With a scenario running, the phone comes into the ride via `hello`/`demo` and the Way Out options open immediately. Without a scenario, trip setup appears.
  - SafeRide's trip is not carried over, because its ids are not globalIds.
- **Reports:**
  - The new event `report` (rider → control) carries `Report`. Undo sends the same id with `to = now`.
  - The control room shows reports as markers only, with no cards or actions.
  - Reports flow into `crowds`: aggressive, harassing and panic pins become `unsafe`, and loud ones become `busy`. Catch-up happens via `hello`.
  - SafeRide shows `crowds` (Way Out hotspots + reports) as alerts, and its safe routing avoids them.
  - Reports run on **real time**: 45 minutes, panic pin 15 minutes. Starting, resetting or ending a scenario clears all shared reports.
- **Language:** everything is in German. The names "SafeRide München" and "Way Out" stay; "Panic" becomes "Notfall"; the tabs are Karte / Route / Hinweise / Melden.
- **Not deployed:**
  - The edge function `supabase/functions/monitor` is not deployed, so news stays demo data. MVG `/messages` sends CORS `*`, so it works directly.
  - SafeRide's demo examples stay on.

**One app: emergency = Way Out (grilling round 4, 2026-11-10)**

This replaces the "Notfall → Way Out" page jump.

- **Overlay instead of a page jump:**
  - Way Out runs as a React overlay inside `saferide.html`; `src/saferide/main.tsx` replaces the bridge.
  - The rider logic is shared via `useRide` and `WayOutPanel`.
  - `#/rider` stays only as a fallback and for tests.
- **One emergency flow:**
  - "Notfall" informs the control room immediately: a tap if a train is known, and the panic pin if the location is known. "Rückgängig" is available for 8 s.
  - At the top is "110 anrufen", followed by the status / control-room feedback, the Way Out options, the reason chips and "Mir geht's gut".
  - SafeRide's escape route via another line becomes the extra option "Andere Verbindung". It opens SafeRide's sheet, which has a "Zurück zum Notfall" button.
  - Navigation and feedback stay inside the overlay.
- **Design:**
  - SafeRide's tokens (`src/tokens.css`: light/dark, Atkinson Hyperlegible, ink-on-paper, red only for danger) apply to everything riders see, including `#/rider`.
  - The navigation arrow keeps its calm violet surface. The control room stays dark.
- **Which train:**
  - In the pitch it comes from the control-room scenario (`demo`/`hello`). SafeRide then shows a slim ride bar under the top bar and centres the map on the train.
  - Without a scenario, an active SafeRide trip (first boarding stop → destination) is mapped to an MVG route by name search.
  - With neither, the emergency flow offers 110, the pin and the escape route, but no train.
- **Luna window** in the control room shows the integrated `saferide.html`.
- **Navigation mini map** stays Leaflet, in the SafeRide look.

## 13. Sources

- Munich Police Security Report 2025 (PP München)
- KJR survey on young mobility in Munich (night safety on public transport)
- Strong! LGBTIQ* counselling centre, annual report 2025
- MVG press releases: MVGO live mode (Jul 2026), real-time data in Google Maps (Mar 2026)
- Abendzeitung on the MVG load indicator (forecast from the last 10 comparable days)
- SafeNow (Oktoberfest 2026 coverage), SafeUP, British Transport Police 61016 text service
