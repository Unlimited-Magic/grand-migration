# THE GRAND MIGRATION — digital spine v1

The daily floating race. Name a racer; it races 400 procedurally-named others down a river that regenerates every day at 00:00 UTC. Same name + same day = same result on any device on Earth — **determinism is the server** (see `DECISION_SPINE.md`). Zero backend, static-host ready, free-entry by legal design.

Built 2026-07-09, authorized by the Architect (supersedes the bluepaper's "no code" footer for the digital spine only). Verified end-to-end in real Chrome: entry → live race → results → challenge link (`?d=&vs=&skin=`) → head-to-head → result-card PNG → career persistence.

## LIVE
**https://migration.defimagic.io** (also grand-migration.kingshotpro.workers.dev). Deploys automatically on push to `main` via GitHub Actions → `wrangler deploy` (wranglerVersion pinned to 4.x — the action default is too old for `wrangler.jsonc`). Never deploy from a session.

## Files
- `public/` — the site (`index.html`, `css/`, `js/`). Both divisions (Duck / Capybara — species is a theme layer). Opens over `file://` too (classic scripts, no modules).
- `public/js/engine.js` — deterministic race engine (UMD: browser global `GMEngine` + node `require`). No `Math.random`, no `Math.sin` (polynomial trig → cross-engine identical), no `Date` inside the sim.
- `worker/index.mjs` — Workers runtime: serves assets + `/api/claim`, `/api/enter`, `/api/standings` against D1 (`grand-migration-db`). The server RECOMPUTES every race with the same engine — client results are never trusted, so results can't be faked.
- `worker/engine.mjs` — generated ESM copy of the engine: `cat public/js/engine.js` + `export default globalThis.GMEngine;`. **Regenerate whenever the engine changes.**
- `schema.sql` — D1 schema (racers with recruiter attribution, entries). Applied via the D1 HTTP API.
- `test/determinism.cjs` — headless proof: `node test/determinism.cjs` (12 checks; run before any engine change).

## Global layer mechanics
- **Claim** — first-come worldwide name claim; `?ref=<name>` on any link attributes the recruit to a Flock.
- **Enter** — records today's canonical result (field of 400 procedural + that racer alone — stable regardless of local guests).
- **Flock multiplier** — each recruit with ≥1 entry boosts the recruiter's season points +2%, capped at ×1.20. Recruiting pays in rank, never money.

## What maps to the bluepaper (§6 loops)
- **Loop A (finish artifact):** result card PNG per racer per heat — position, percentile, time, Distance Sailed (the §4 signature stat), Water Worked award.
- **Challenge links:** `?d=DATE&vs=NAME` — recipient sees the challenger's finish *before* naming their own racer. Verifiable because deterministic.
- **Careers/standings:** local career ledger (pts, best, history); daily top-10 podium.
- **Real-world lane:** "Run a real one" section → sanctioning contact. Event mode = swap the sim for real finish data behind the same results/identity layer (v2).

## Known v1 honesty notes
- A challenge recipient's racer joins the field, so the printed field size grows (401 → 402…) and positions *behind* a new finisher can shift by one on later views. Same river, bigger field — coherent, stated here, not a bug.
- Career/standings are per-device (localStorage). Global standings, Rafts, Duckpool, and clip video need the first backend (D1/Workers) — v2.
- Race playback uses rAF; hidden tabs freeze mid-race and catch up on return (capped at 1s/frame). Results are never affected — they're computed, not played.

## v2 backlog (ranked)
1. ~~D1-backed named-racer claims + global season standings~~ **SHIPPED** (see Global layer above).
2. Rafts (§6 Loop B — the structural recruiter: 5+ racers or no team score).
3. Duckpool free pick'em (sweepstakes-safe: free entry only).
4. Event mode: ingest a real race's finish order → same cards/clips for physical adopters.
5. Cosmetic monetization (liveries/passes) — never pay-to-enter-chance.
