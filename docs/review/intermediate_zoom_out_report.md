# Stage 8: Intermediate Zoom Out Report

**Target:** `C:/Users/alexa/.claude/plans/lovely-juggling-raccoon.md` (full file, 1-91), unchanged since Stage 5.
**Reviewer:** egm-zoom-out, completed. Verdict: pass with changes. It triaged the proposals from Stages 5-7.

## A. Consolidations (one change covers several findings)
- 🟡 **A1 Scenario mode never calls the MVG API.** Covers Z2, K3, K4, I4, I5, K8, and part of K2/K11. While a scenario runs, every value comes from the snapshot and `virtualNow`; the live API serves free mode only. Keep the live API (the user settled it), but record in idea.md that this approves a change to the §7 non-goal. Keep `AbortSignal.timeout(3000)` and drop the "Offline-Daten" indicator.
- 🟡 **A2 One upserted `tap` per session, and drop `reasons`.** Covers Z6, I3, C5, C3a. Control keeps a `Map<sessionId, tap>` and counts sessions per trainKey. Selfcheck case: "the same session tapping 3× is not a hotspot".
- 🟡 **A3 Rider `hello` makes control reply with the current `demo` and the last `action`.** Covers Z5 and I1 (rider side). Reject the dashboard-side `sync` and Presence. Add a lock/unlock test to rehearsal.
- 🟡 **A4 Semantics line.** Covers C3, C4, N3, K7 (the 2-tap case):
  - one card per trainKey: yellow at 1-2 sessions, red at ≥3 sessions in a sliding 5-minute window measured on `virtualNow`;
  - `virtualNow` is an offset that keeps ticking after it is received;
  - `demo` jumps straight to Riding from any screen.
- 🟡 **A5 Short "Accepted demo risks" list** instead of a Risks section. Covers K2, K5, K6/Z1/C2/I2, K7, K8, N2, and L64:
  - spoofable anon channel
  - trainKey groups only riders on the pushed route
  - position assumes an on-time train
  - no station hotspots and no free text
  - broadcast is ephemeral

## B. Load-bearing single fixes (accept)
- 🟡 **B1 Hash routing.** Covers Z3, C13, K11. Delete "Hash or path".
- 🟡 **B2 Concrete Garching inputs.** Covers C11, N7, C12. Needs globalIds and the night `virtualNow`. "Security in 6 Min" is computed from the mock positions, and `action.stationId` is the card's `nextStop`.
- 🟡 **B3 Build-order blockers.** Covers Z4. Issue 1 blocks 2/3/4/6, issue 7 blocks 9, and issue 10 is blocked by all. Keep a single `selfcheck.ts`.
- 🟢 **B4 Demo panel "+1 synthetic tap" button** as fallback (N3).
- 🟢 **B5 Luna gloss in L4** (C1, K9).
- 🟢 **B6 Name the labels:** `wayfinder:map` parent + `wayfinder:task` children, claimed with `in-progress` (Z9).

## C. Reject (scope bloat)
- **K1 Alternatives Considered:** a few-word reason per "Dropped" item is enough (also covers N1, C9).
- **K2 full Risks section:** A5 replaces it.
- **K10 restructure:** churn.
- **K8 connection picker and delay:** `demo` overrides both; list it in A5.
- **K7 station hotspots:** list as a non-goal.
- **K5 random channel name:** security theater, because it ships in the bundle. List as an accepted risk.
- **I2 trip-ID research and its selfcheck case:** not exercised by the demo.
- **K11 curl or date records:** "UNKNOWN in samples" is enough.
- **Z8 GLOSSARY/ADRs:** declare idea.md the single source for the sprint.
- **Gloss and style nits** C6, C7, C8, C10, N4-N6, N8-N10, Z7. "UI copy: German" can go into the decisions as an option.

**Net:** about 8-10 added lines, one event removed (`reasons`), one added (`hello`), no new files or dependencies.
