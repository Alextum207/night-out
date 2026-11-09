# Stage 7: Critic Review Report

**Target:** `C:/Users/alexa/.claude/plans/lovely-juggling-raccoon.md` (FeatureRange 1-31)
**Standard:** feature-spec-standard (design, structural). Style used its persona rules.

| Reviewer | Status | Count |
| --- | --- | --- |
| egm-design | completed | 2 Blocker, 5 Major, 4 Nit |
| egm-structural | completed | 2 Blocker, 4 Major, 4 Nit |
| egm-style | completed | 0 Blocker, 5 Major, 8 Nit |

Deduplicated below. The tag shows which reviewers raised each finding.

## 🔴 Blockers

### K1 Alternatives Considered missing [design, structural] (L8-15)
"Dropped" (L15) lists items without reasons. The open choices from idea.md §8 are picked without comparison: Vite vs Next.js, Supabase vs Firebase vs WebSocket server, Leaflet vs MapLibre, MVG API vs MVV GTFS.
**Fix:** one line per option with the reason it was rejected.

### K2 Risks & Mitigations missing [design, structural] (L1-31)
The only mitigation is the route snapshot (L14). These are missing:
- the unofficial API changing or rate-limiting
- an open anon-key channel (spoofed taps or actions)
- venue Wi-Fi
- clock skew and delays
- the open questions in idea.md §11

**Fix:** a Risks section in which each item gets a mitigation or "accepted for demo".

## 🟡 Majors

### K3 Real MVG API reverses an idea.md non-goal without saying so [design, structural, style] (L9 vs idea.md L87)
**Fix:** mark it as a scope change with a reason, update idea.md §7, and make offline-from-snapshot the primary mitigation. (Overlaps Z2.)

### K4 Fallback covers only routes, not autocomplete or departures [design] (L10, L12, L14, L17)
If the API is down, a rider cannot get past TripSetup. "API down" is not defined (timeout, non-2xx, CORS?). (Overlaps I4.)

### K5 Public realtime channel has no access control [design] (L21-25, L34, L54-61)
Anyone with the URL plus the anon key can send `action`/`demo`/fake `tap`. Lat/lng and sessionId go out unaggregated, which conflicts with idea.md §10.
**Fix:** a random channel name via env/URL param, or at least list it as an accepted demo risk with the production path.

### K6 trainKey grouping breaks across boarding stations [design] (L21, L63)
Duplicate of Z1/I2/C2.

### K7 Station hotspots dropped silently [design, structural, style] (L22 vs idea.md L60)
idea.md says "train or station". Garching is a platform case. Either key on station as well or list it as a non-goal. The 2-tap case is also not stated (style).

### K8 Position assumes the rider is on the train the app picked and that it runs on time [design] (L17-18)
The rider may already be on a train or may miss the connection. `delayInMinutes` is ignored. GPS from idea.md was dropped without a note.
**Fix:** let the rider pick from the next 2-3 connections and add the delay in `where()`, or list both as known limits.

### K9 No problem statement, and Luna is undefined [structural] (L3-6)
Same as C1. Step 0 is a process instruction inside Context.

### K10 Goals/Non-goals scattered inside "Settled decisions" [structural] (L8-30)
One list mixes data, scope, rider UX and control room.
**Fix:** split into Goals & Non-Goals and Architecture.

### K11 Overstated claims [style] (L4, L8, L9, L11)
- "grilling settled every open decision": hash vs path routing is still open (L33).
- "verified in-session": no date, nothing to reproduce.
- "always UNKNOWN": only seen in the sampled responses.

**Fix:** calibrate the wording and record how each check can be repeated (curl or a sample response).

## 🟢 Nits
- N1 "Dropped" items are unexplained. Sideloadly and the MVV CSV appear nowhere in idea.md [style, comprehension].
- N2 Two dropped features are missing from Out of scope: free-text "Tell MVG" and hotspot history per station [design].
- N3 Thin demo margin: losing 2 of 5 phones kills the hotspot. Which clock does the 5-min window use, `virtualNow` or wall clock? Option: the demo panel injects synthetic taps [design].
- N4 "UI copy: German" belongs in the settled decisions [structural, style].
- N5 Spell out `hasOutOfOrderElevator`, and use consistent parameter notation (L10-11) [structural, style].
- N6 Inconsistent bold on L13, and "we" [structural, style].
- N7 Garching has no globalId and no virtual time, so it cannot be reproduced [style].
- N8 "step 0" does not match a build order that starts at 1 [style].
- N9 "3–5 phones in the same U6": it is a simulated train [style].
- N10 Wording: "jump the time" should be "set `virtualNow`" [style].
