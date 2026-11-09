# Consolidated Review: "Way Out" Plan

**Target:** `C:/Users/alexa/.claude/plans/lovely-juggling-raccoon.md` (91 lines; FeatureRange 1-31, DetailedRange 32-91)
**Context:** idea.md, AGENTS.md, docs/agents/issue-tracker.md
**Mode:** Consolidated (Stages 5-9 without checkpoints). The plan was not changed during the review.

| Stage | Report | Reviewers (all completed) |
| --- | --- | --- |
| 5 Zoom Out | zoom_out_report.md | zoom-out, inventive-catalyst |
| 6 Comprehension | comprehension_report.md | comprehension |
| 7 Critic | critic_report.md | design, structural, style |
| 8 Intermediate Zoom Out | intermediate_zoom_out_report.md | zoom-out |
| 9 Readiness | implementation_readiness_report.md | implementation-readiness, codebase-details, style |

## Overall verdict
The architecture holds: no proxy, Broadcast with no tables, `demo` pushes the route, snapshot fallback. Three problems would break the pitch:
1. **Shared types are missing** while tickets run in parallel on different devices.
2. **Path routing** returns 404 on Vercel.
3. **Ephemeral broadcast**: a phone that locks or reloads misses `demo`/`action`. That breaks demo step 4.

Everything else is semantics that are currently left to whoever implements them. For a 2-day sprint, those details belong in the **issue bodies as acceptance criteria**, not as a full re-spec in the plan. The reviewers' demand for "Zero-Decision" assumes a larger project.

## Action items

### 🔴 Blocker
| ID | Action | Raw findings |
| --- | --- | --- |
| **A1** | Hash routing (`#/rider`, `#/control`, `/` → Control). Delete "Hash or path". | Z3, C13, K11, S8-B1, R2 (CB-B1, IR-M2, ST-1) |
| **A2** | `src/types.ts` with normalized `Route`/`Stop`/`Tap`/`Action`/`DemoPayload`/`Position`/`Option`/`Hotspot`, written in issue 1. Issue 1 blocks 2, 3, 4, 6. | R1 (IR-B1, CB-M1, CB-M12), Z4 |
| **A3** | Rider sends `hello` (sessionId, trainKey) on subscribe and on `visibilitychange`. Control replies with the current `demo` and the last `action` for that trainKey/session. Rehearsal tests lock/unlock. | Z5, I1, S8-A3, R9 (CB-M5, IR-M8) |

### 🟡 Major
| ID | Action | Raw findings |
| --- | --- | --- |
| **A4** | **Scenario mode never calls MVG.** Route, departures and escalator flags come from the snapshot relative to `virtualNow`. Live API is only for free mode (TripSetup) and only via `AbortSignal.timeout(3000)` → mock. Record in idea.md: the §7 non-goal "Real MVG integration" is consciously reversed. | Z2, K3, K4, I4, I5, K8, S8-A1, R10 |
| **A5** | **trainKey is demo-only:** `${line}|${destination}|${plannedDeparture of route.stops[0]}`. Grouping is guaranteed only through the pushed route. Recorded as an accepted risk. Platform taps get no key of their own (no station hotspots). | Z1, I2, C2, K6, K7, R4 (IR-M4, CB-M3) |
| **A6** | **Event contract:** drop `reasons`. The rider re-sends `tap` with the same sessionId and control upserts into `Map<sessionId,Tap>`. `fine` removes the session's tap. `action.target = {trainKey}|{sessionId}`. `at`/`virtualNow` in epoch ms. sessionId = `crypto.randomUUID()` in sessionStorage. Receivers ignore events from their own role. | Z6, I3, C5, S8-A2, R8 (IR-M8, CB-M4, ST-11/12/13) |
| **A7** | **Semantics line:** one card per trainKey. Yellow for 1-2 distinct sessions, red for ≥3 in a sliding window `[now-5min, now]` on the `virtualNow` clock. `resolved` → card gray/disappears. Top reason = most frequent (tie: first). `virtualNow` = offset that keeps ticking after receipt. `demo` jumps from any screen into Riding. | C3, C4, N3, S8-A4, R7 (IR-M7, CB-M6), IR-N14 |
| **A8** | **Build order:** issue 1 blocks 2/3/4/6; 7 blocks 9; 5 blocks 9; 10 blocked by all. Native GitHub dependencies instead of "Blocked by list position". Label scheme per issue-tracker.md (`wayfinder:map` parent? ← decision). `options.ts` → issue 5. One `selfcheck.ts`, created in issue 3, extended by issue 6. | Z4, Z9, S8-B3, S8-B6, R13 (IR-M10, CB-M12, ST-3/4/5) |
| **A9** | **Stack details in issue 1:** decide Tailwind major, React/react-leaflet pair, `tsx` + `@types/leaflet` as devDeps, `.gitignore`, `tsconfig.json`, `src/index.css`. Exclude `selfcheck.ts` from the app tsconfig. position/hotspots stay pure. Fix versions via context7 when writing the issue, not from memory. | R3 (IR-M3, CB-M1, CB-M2, IR-N15), CB-N1, ST-2 |
| **A10** | **Rule tables as acceptance criteria in the issue bodies** (not in the plan): position states (issue 3), options per state + German copy + chips (issue 5), action → rider text per `kind`, `stationId` = card's `nextStop` (issue 7), selfcheck cases with input and expected output (issues 3/6). | R5, R6, R12, R14, C12, IR-N11 |
| **A11** | **Make scenario data concrete:** Garching globalId + line + night `virtualNow`. Arena offset ("2 min before Münchner Freiheit"). Snapshot = live `/routes` captured once and saved as JSON in `src/mock.ts`. "Security in 6 Min" computed from the mock team position. | B2, C11, N7, R11 (IR-M9, CB-M10) |
| **A12** | **"Accepted demo risks" list** (5 bullets): spoofable anon channel, trainKey demo-only, position assumes an on-time train, no station hotspots and no free text, broadcast without persistence (a dashboard reload loses taps). | K2, K5, K8, N2, S8-A5, CB-N4 |
| **A13** | **Luna** gloss: "Luna = persona from idea.md §2, played by the projected rider window. 4 team members tap on phones." | C1, K9, S8-B5, ST-7 |

### 🟢 Nit
| ID | Action | Raw findings |
| --- | --- | --- |
| A14 | Demo panel button "+1 synthetic tap" as a fallback if phones fail | N3, S8-B4 |
| A15 | Give each "Dropped" item 3-5 words of reason | K1 (reduced), N1, C9 |
| A16 | Calibrate claims: "every build decision", "UNKNOWN in samples", "API per context7 check" | K11, ST-2, Nit 1 design |
| A17 | Record in step 0: idea.md is the single source of decisions for the sprint (exception to AGENTS.md GLOSSARY/ADR) | Z8 |
| A18 | "UI copy: German" as a settled decision; touch targets ≥44 px instead of "big"; drop "polish" | N4, ST-6 |
| A19 | OSM tiles offline → map blank, polyline + dots still visible (test it in rehearsal) | CB-N3 |
| A20 | Small wording fixes (arrows, "Closed", `*mvg.de*`, "~15 lines", "(short)", phone counts) | ST-8/9/10/15/16, N5, N6, N8-N10 |

## Rejected (recommendation: do not implement)
| Proposal | Reason | Raw findings |
| --- | --- | --- |
| Full "Alternatives Considered" section | Ceremony for user-settled choices. A15 is enough. | K1 |
| Full "Risks & Mitigations" section | A12 covers it. | K2 |
| Restructure into Goals/Non-goals/Architecture | Churn with no build value | K10 |
| Make live MVG API an optional late issue | Overrides a settled user decision. A4 removes the risk. | Z2 |
| Random channel name as protection | Ships in the bundle, so it is security theater. Goes into A12. | K5 |
| Dashboard `sync` / Supabase Presence | A dashboard reload mid-pitch is unlikely. A3 covers the real case. | I1 (partial) |
| Trip-ID research, cross-station trainKey | Not exercised by the demo | I2, K6 |
| Connection picker + delay in `where()` | `demo` overrides both | K8 |
| Station hotspots | Garching is deliberately a single tap. Goes into A12. | K7 |
| "Offline-Daten" indicator | Extra UI for a path that A4 avoids in the pitch | I4 (partial) |
| Separate check files per module | A8: one owner (issue 3), issue 6 extends it | Z4/IR/CB (partial) |
| curl/date proof for verification | A16 is enough | K11 (partial) |
| Gloss for MVG/U6/grilling/context7 | The readers are the team | C6, C7, C8, C10 |

## Traceability matrix (raw finding → action item)
| Raw | → | Raw | → | Raw | → |
| --- | --- | --- | --- | --- | --- |
| Z1 | A5 | C1 | A13 | K1 | A15/rej |
| Z2 | A4/rej | C2 | A5 | K2 | A12/rej |
| Z3 | A1 | C3 | A7 | K3 | A4 |
| Z4 | A2, A8 | C4 | A7 | K4 | A4 |
| Z5 | A3 | C5 | A6, A10 | K5 | A12/rej |
| Z6 | A6 | C6-C10 | rej | K6 | A5 |
| Z7 | — | C11 | A11 | K7 | A5, A12 |
| Z8 | A17 | C12 | A10 | K8 | A12/rej |
| Z9 | A8 | C13 | A1 | K9 | A13 |
| I1 | A3 | N1 | A15 | K10 | rej |
| I2 | A5 | N2 | A12 | K11 | A16 |
| I3 | A6 | N3 | A7, A14 | R1 | A2 |
| I4 | A4 | N4 | A18 | R2 | A1 |
| I5 | A4 | N5-N10 | A20 | R3 | A9 |
| R4 | A5 | R5 | A10 | R6 | A10 |
| R7 | A7 | R8 | A6 | R9 | A3, A7 |
| R10 | A4 | R11 | A11 | R12 | A10, A13 |
| R13 | A8 | R14 | A10 | R15 | A16, A18 |
