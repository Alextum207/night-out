# Stage 6: Comprehension Test Report

**Target:** `C:/Users/alexa/.claude/plans/lovely-juggling-raccoon.md` (FeatureRange 1-31, DetailedRange 32-91). The reviewer read only the target.
**Reviewer:** egm-comprehension, completed. 0 Blocker, 5 Major, 8 Nit.

### What this proposes
The plan is a two-day prototype for a pitch to MVG. It is one web app with two views. `/rider` is a phone view. A rider enters a start and a destination. The app works out from the clock and the timetable whether they are on the platform or on the train, and lets them tap "Way Out". They then get 2–3 options (step out, move to another car, go to security), can pick reason chips, receive feedback from the operator, and can close with "Mir geht's gut". `/control` is an operator dashboard. It shows a Leaflet map with the line's path, tap dots and security dots. When 3 or more taps come from the same train within 5 minutes it raises a hotspot. A single tap shows as a yellow "Einzelmeldung" (single report). The operator has 4 actions, and each one sends a message back to riders. The two views talk only through Supabase Realtime Broadcast on one channel, with no database. A hidden demo panel pushes a scenario (Arena or Garching) and a virtual time to every phone, so the live demo is repeatable. Build order is 10 GitHub issues, with a self-check script and manual end-to-end checks as verification.

### How the existing system works, per this document
There is no code yet. The repo contains only agent and issue-tracker docs plus an untracked `idea.md`. The outside system is MVG's unofficial, free REST API. It provides station search, routes (intermediate stops with coordinates, planned times, escalator/elevator outage flags, an encoded polyline, and occupancy that is always UNKNOWN) and realtime departures. It sends permissive CORS headers, so the browser can call it directly. Everything else is mocked: occupancy, security teams, walking directions, events, and fallback route snapshots.

## Findings

### 🟡 C1 "Luna" is never introduced (L4, L82, L84)
The goal and demo steps 2 and 4 depend on Luna, but the plan never says who she is (a persona? the projector's rider window?).

### 🟡 C2 trainKey is ambiguous (L63 vs L22, L57)
"destination" could mean the rider's destination or the train's terminus, and "first stop" could mean the rider's origin or the start of the train's run. Read the rider's way, the hotspot breaks outside the demo. Same issue as Z1/I2.

### 🟡 C3 Hotspot counting rules are underspecified (L22, L47, L88)
- Do taps or distinct sessions count? (Same as I3.)
- Is the window sliding or anchored?
- What happens to the single-report card when a train gets promoted to a hotspot?
- Is it one card per tap or per train? Line 88 says "single reports" (plural) and line 83 says "5 Meldungen".

### 🟡 C4 virtualNow semantics are unstated (L25, L61, L74)
Is it a fixed instant or an offset that keeps ticking? What happens to a phone that is still on TripSetup or on another trip when `demo` arrives? Line 81's "every phone is just before Münchner Freiheit" depends on the answer.

### 🟡 C5 Reason chips and event flow are unclear (L19, L57-58, L71, L49)
The chip list is not defined. The order of `tap` and `reasons` is unclear, and so is whether chips come before or after the options.

### 🟢 C6 MVG and U6 are not expanded (L1, L4, L9, L21, L27)
### 🟢 C7 German UI strings have no gloss, and the label→`kind` / "Mir geht's gut"→`fine` mapping is implicit
### 🟢 C8 "grilling rounds" and "step 0" are local process terms (L3, L6, L8)
### 🟢 C9 Dropped items are unexplained (L15: Sideloadly, MVV CSV)
### 🟢 C10 context7 / CLAUDE.md rule are unexplained (L37)
### 🟢 C11 Garching scenario has no IDs or route, and the source of "Security in 6 Min" is unclear (L28, L85)
### 🟢 C12 How the demo panel is hidden is unclear, and so is how an action picks its `stationId` (L25, L83)
### 🟢 C13 Hash vs path routing is open, and path routing needs a Vercel rewrite (L33). Same issue as Z3.
