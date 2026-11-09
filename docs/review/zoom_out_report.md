# Stage 5: Initial Zoom Out Report

**Target:** `C:/Users/alexa/.claude/plans/lovely-juggling-raccoon.md` (full file, 1-91)
**Context:** idea.md, AGENTS.md, docs/agents/issue-tracker.md

| Reviewer | Status | Verdict |
| --- | --- | --- |
| egm-zoom-out | completed | pass with changes (0 Blocker, 4 Major, 5 Nit) |
| egm-inventive-catalyst | completed | false compromises found (2 Major, 3 Nit; persona caps at Major) |

## egm-zoom-out

### 🟡 Z1 trainKey only matches inside the demo (L45, L63, L22)
`plannedDeparture of the first stop` is each rider's own boarding stop. Riders who boarded at different stations get different keys, so in real trips the hotspot never fires. Only the `demo` route push hides this.
**Fix:** state that grouping is demo-only, or key on a value all riders share (line + direction + time at terminus or a fixed reference station).

### 🟡 Z2 Live MVG path is speculative for a scripted demo (L9-13, L17-18, L43, issues 2 and 5)
Autocomplete, connection picking, live departures and position-from-clock are all overridden by `demo` during the pitch. idea.md L87 lists "Real MVG integration" as a non-goal. If grilling changed this, say so explicitly.
**Fix:** issue 2 snapshot-first (frozen routes + polyline decoder). Live `/routes`, `/departures` and autocomplete become an optional issue after issue 8.

### 🟡 Z3 Path routing 404s on Vercel deep links (L33, L40-41)
"Hash or path routing" is undecided, and `location.pathname` means path routing. Vercel returns 404 for `/rider` without a rewrite, and no `vercel.json` is planned.
**Fix:** hash routing (`#/rider`, `#/control`), or add `vercel.json` with a catch-all rewrite.

### 🟡 Z4 "Issues 1-4 and 6 in parallel" conflicts with the scaffold (L78, L67-73)
Issues 2, 3, 4 and 6 need the scaffold from issue 1. Issues 3 and 6 both edit `src/selfcheck.ts`.
**Fix:** issue 1 blocks 2/3/4/6. Use one check file per module. Add the missing blockers: issue 9 is blocked by 7, issue 10 by all.

### 🟢 Z5 Late-joining phones miss `demo` (L63, L81)
Broadcast is ephemeral, so a phone that reloads after the scenario starts is on no train. **Fix:** riders send `hello` and control resends `demo`, or the demo script includes re-sending the scenario.

### 🟢 Z6 `reasons` event is redundant (L57-58)
`tap` already carries `reasons[]`. Re-send `tap` and have control upsert by sessionId.

### 🟢 Z7 Files list is low-level (L43-51)
Signatures and constants are fine for parallel agents, but issues should not treat them as binding.

### 🟢 Z8 Where decisions go (L6 vs AGENTS.md L11)
AGENTS.md routes decisions to `GLOSSARY.md` + `docs/adr/`. Either follow that or declare idea.md the single source for the sprint.

### 🟢 Z9 Which labels (L66)
Name the labels (`in-progress`, `wayfinder:*`?) and whether there is a parent map issue.

## egm-inventive-catalyst

### 🟡 I1 Ephemeral broadcast also loses `action` on the rider side (L64, L34, L54-63)
iOS Safari drops the websocket on screen lock or when the tab is in the background. A phone that misses `action` never shows "Security wartet…" (demo step 4, the core of the pitch). The plan treats "no tables means no catch-up" as unavoidable.
**Fix (pull, not push):** control sends `sync` on subscribe and riders re-send their latest tap. Riders send `hello` on (re)subscribe and control replays the last action. Alternative: Supabase Presence on `wayout`, still with no tables.
**Liabilities:** about 2 more events, sessionId kept in sessionStorage. Rehearsal must test phone lock/unlock and a dashboard reload.

### 🟡 I2 trainKey false compromise (duplicate of Z1)
Same finding. Extra options: a trip/run ID from the API, if one exists. Add a selfcheck case: different boarding stations give the same key.

### 🟢 I3 Threshold counts taps, not riders (L22, L47, L88)
One user tapping 3 times makes a hotspot, which is the misuse risk idea.md §11 raises. **Fix:** count distinct sessionIds per trainKey in the window, and add a selfcheck case.

### 🟢 I4 Fallback triggers only on failure, not on a hang (L43, L91)
Congested venue Wi-Fi hangs rather than fails. **Fix:** `AbortSignal.timeout(3000)` routes to the mock path, plus a small "Offline-Daten" indicator and a throttled-network test in rehearsal.

### 🟢 I5 Live data contradicts `virtualNow` (L71 vs L61-63)
Live `/departures` shows real daytime trains while the scenario runs at night. **Fix:** in scenario mode, take departures from the snapshot relative to `virtualNow`.

## What held up
No proxy (CORS verified), the whole route sent in `demo`, snapshot fallback, no router library, and Ride together/comfort score kept to slides.
