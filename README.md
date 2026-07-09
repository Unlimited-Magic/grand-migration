# THE GRAND MIGRATION — digital spine v1

The daily floating race. Name a racer; it races 400 procedurally-named others down a river that regenerates every day at 00:00 UTC. Same name + same day = same result on any device on Earth — **determinism is the server** (see `DECISION_SPINE.md`). Zero backend, static-host ready, free-entry by legal design.

Built 2026-07-09, authorized by the Architect (supersedes the bluepaper's "no code" footer for the digital spine only). Verified end-to-end in real Chrome: entry → live race → results → challenge link (`?d=&vs=&skin=`) → head-to-head → result-card PNG → career persistence.

## Files
- `index.html` — single page, both divisions (Duck / Capybara — species is a theme layer).
- `js/engine.js` — deterministic race engine (UMD: browser global `GMEngine` + node `require`). No `Math.random`, no `Math.sin` (polynomial trig → cross-engine identical), no `Date` inside the sim.
- `js/app.js` — UI: canvas race renderer, commentary ticker, results, share loops, localStorage careers.
- `test/determinism.cjs` — headless proof: `node test/determinism.cjs` (12 checks; run before any engine change).
- Local run: open `index.html` directly (`file://` works — classic scripts, no modules) or any static server.

## What maps to the bluepaper (§6 loops)
- **Loop A (finish artifact):** result card PNG per racer per heat — position, percentile, time, Distance Sailed (the §4 signature stat), Water Worked award.
- **Challenge links:** `?d=DATE&vs=NAME` — recipient sees the challenger's finish *before* naming their own racer. Verifiable because deterministic.
- **Careers/standings:** local career ledger (pts, best, history); daily top-10 podium.
- **Real-world lane:** "Run a real one" section → sanctioning contact. Event mode = swap the sim for real finish data behind the same results/identity layer (v2).

## Known v1 honesty notes
- A challenge recipient's racer joins the field, so the printed field size grows (401 → 402…) and positions *behind* a new finisher can shift by one on later views. Same river, bigger field — coherent, stated here, not a bug.
- Career/standings are per-device (localStorage). Global standings, Rafts, Duckpool, and clip video need the first backend (D1/Workers) — v2.
- Race playback uses rAF; hidden tabs freeze mid-race and catch up on return (capped at 1s/frame). Results are never affected — they're computed, not played.

## Deploy (Architect, when ready)
New CF Pages project pointed at this folder (or split to its own repo per Hive convention). No build step, no env, no bindings. The share-card CTA auto-brands from `location.host`.

## v2 backlog (ranked)
1. D1-backed named-racer claims + global season standings (first real moat data).
2. Rafts (§6 Loop B — the structural recruiter: 5+ racers or no team score).
3. Duckpool free pick'em (sweepstakes-safe: free entry only).
4. Event mode: ingest a real race's finish order → same cards/clips for physical adopters.
5. Cosmetic monetization (liveries/passes) — never pay-to-enter-chance.
