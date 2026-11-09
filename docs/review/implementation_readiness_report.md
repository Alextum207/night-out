# Stage 9: Implementation Readiness Report

**Target:** `C:/Users/alexa/.claude/plans/lovely-juggling-raccoon.md` (DetailedRange 32-91)
**Standard:** implementation-readiness-standard (readiness, codebase-details). Style used its persona rules.

| Reviewer | Status | Count | Verdict |
| --- | --- | --- | --- |
| egm-implementation-readiness | completed | 1 Blocker, 9 Major, 5 Nit | NOT READY |
| egm-codebase-details | completed | 1 Blocker, 13 Major, 4 Nit | not ready (no code, so no code-vs-doc checks) |
| egm-style | completed | 0 Blocker, 7 Major, 9 Nit | — |

Deduplicated. The tags show the source: IR = implementation-readiness, CB = codebase-details, ST = style.

## 🔴 Blockers

### R1 No shared data types while issues run in parallel on different devices [IR-B1, CB-M1, CB-M12] (L43-50, L57-61, L78)
`Route`, `Stop`, `Position`, `Option`, `Tap`, `Hotspot`, `Action` and `Scenario` are never defined. Nobody knows whether `Route` is the raw MVG response or a normalized object. idea.md §9 has a different draft (`trainId`, `nextStationId`, `status`). Issues 2, 3 and 6 would invent incompatible shapes.
**Fix:** add `src/types.ts`, owned by issue 1, which blocks 2-6. Spell out the normalized `Route`.

### R2 Routing undecided, and no Vercel rewrite [CB-B1, IR-M2, ST-1] (L33, L36, L41)
"Hash or path" contradicts the `location.pathname` switch. Path routing returns 404 on a reload. **Fix:** use hash routing, or add `vercel.json` with a rewrite. State what `/` renders.

## 🟡 Majors

### R3 File list incomplete, no versions [IR-M3, CB-M1, CB-M2, IR-N15]
Missing: `tsconfig.json`, `src/index.css`, Tailwind setup (v3 PostCSS vs v4 `@tailwindcss/vite`), `.gitignore` (.env), `vercel.json`, `types.ts`. React 18/19 vs react-leaflet 4/5 is not pinned. `tsx`, `@types/leaflet` and `@types/node` are missing. `selfcheck.ts` under `src/` gets compiled by `tsc` (it uses node:assert). position/hotspots must stay pure (no `import.meta.env`).

### R4 trainKey [IR-M4, CB-M3] (L45, L63)
Same as Z1/I2/C2/K6. Also unclear: the separator/format, the multi-part route after a change, and the key for platform taps.

### R5 Position rule table missing [IR-M5, CB-M7, ST-16] (L45, L88)
Unclear: platform or train exactly at departure; dwell time; before the first and after the last stop (no state for that); transfer gap; delay applied or not; etaMin rounding; prev/next on the platform.

### R6 `buildOptions` has no logic, and its signature lacks departures [IR-M6, CB-M8] (L46, L71)
The Option type, a per-state rule table, German copy and the "2-3" selection rule are missing. `options.ts` is not assigned to any issue.

### R7 Hotspot edge cases [IR-M7, CB-M6] (L47, L88)
Sliding window or not, inclusive 5:00 boundary, distinct sessions, effect of `fine`/`resolved`, clock source, top-reason aggregation. Same as C3/I3/A4.

### R8 Realtime event contract [IR-M8, CB-M4, ST-11/12/13] (L57-63)
Missing: field types (`at` as ms or ISO), `action` targeting (`trainKey | sessionId` as a field rule), the merge rule for `reasons`, the effect of `fine`, filtering of own messages with `self:true`, `direction` vs `destination`, sessionId generation and persistence.

### R9 Late join and virtualNow mechanics [CB-M5, IR-M8] (L61, L63)
Same as Z5/I1/A3/C4. "No matter when it was loaded" is false.

### R10 mvg.ts behaviour and fallback [IR-M9, CB-M9] (L43, L91)
Fallback trigger (error, non-2xx, timeout), no mock for `searchStations`, connection-picking rule, `routingDateTime` format, polyline precision. Snapshot timestamps lie in the past. Does `demo` build its route from the snapshot or live (if from the snapshot, the fallback test proves nothing)?

### R11 mock.ts and scenario data not defined [IR-M9, CB-M10] (L48, L28, L85)
Garching has no IDs, route or `virtualNow`. Arena has no offset. No capture procedure for snapshots. The shapes of security teams, directions, occupancy and events are missing, and so is the source of "Security in 6 Min".

### R12 Control actions and feedback copy [CB-M11, ST-7] (L50, L60, L73, L83-85)
How `stationId` is chosen, rider text per `kind`, when `steps[]` is filled, whether single cards have the same actions ("Leitstelle schaut mit"), and what `resolved` shows on the rider. Luna's role in the room.

### R13 Build-order dependencies and labels [IR-M10, CB-M12, ST-3/4/5] (L66-78)
Issue 1 blocks 2/3/4/6; 9 is blocked by 5 and 7; 10 is blocked by all. "Blocked by 2" refers to a list position, not an issue number. Labels are undefined. `selfcheck.ts` and `mock.ts` have no owner.

### R14 Test plan has no concrete cases [CB-M13, IR-N13] (L87-91)
Name the selfcheck inputs and expected outputs: polyline decode, trainKey, hotspot edges. Manual cases: late join, phone wake, Garching path.

### R15 Unmeasurable terms [ST-2, ST-6] (L34, L75)
"Verified API" (but context7 is still planned), "polish", "big touch targets" (use ≥44 px).

## 🟢 Nits
- Exact chip list and German labels (IR-N11).
- Supabase channel public/anon, who creates the project and sets the env vars (IR-N12).
- Card colors per state: acted on, resolved (IR-N14).
- Make version decisions now rather than in context7 at build time (CB-N1).
- Issue 10 appends to idea.md without conflicting (CB-N2).
- OSM tiles offline means a blank map, but the polyline stays (CB-N3).
- The ponytail comment should also name the late-join risk (CB-N4, ST-14).
- Drop "~15 lines" and "(short)"; one arrow style; "Closed"; "block `*mvg.de*`"; align phone counts (ST-8/9/10/15/16).
