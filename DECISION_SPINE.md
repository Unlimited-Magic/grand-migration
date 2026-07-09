# Digital Spine — build decision record

**2026-07-09. Build authorized by the Architect this session ("go — build the digital spine... we can go multiple routes"). This supersedes the bluepaper's "no code authorized" footer for the digital spine only. The physical event layer remains unauthorized.**

**The person:** the 19-year-old group-chat instigator at 11pm who names their capybara "Gregory, Destroyer of Worlds," watches it finish 213th of 400, and needs the loss to be funny and *provable* enough to drop in the group chat so four friends type a name in before midnight. Secondary: the kid at the barrier (bluepaper §14) whose dad must one day get the same result card fed by real race data.

## Decisions (made here, owned here)

1. **Skin-agnostic engine.** The Architect asked whether the idea should wear a trendier genre. Answer: don't choose — make the species a *theme layer* over one race engine. Ship two divisions: **Rubber Duck Division** (nostalgia + the verified real-world charity lane) and **Capybara Division** (meme-native, water-native, digital-first lane). Adding a third skin is data, not code. If a trend tests better, the league follows it without a rebuild.

2. **Free-entry by design — the legal law of the digital league.** The Section 15 gates proved paid + chance + prize = raffle/lottery in every checked jurisdiction, online included. So the digital league takes no money for entry, ever. Monetization surface is identity and status (cosmetics, liveries, season passes), sponsorship, and sanctioning SaaS for real-world events — never pay-for-a-chance-to-win. No fake checkout; nothing is sold in v1 at all.

3. **Determinism is the server.** v1 runs with zero backend: each day's race is computed from the date's seed, and any racer's run is computed from (date + name). Same name, same day → same result on any device on Earth. That makes every result *verifiable by the person you brag to* — the share loop's proof-of-work is built into the physics. It also means CF Pages static hosting, $0 marginal cost (infinite-ROI doctrine), and no accounts before product-market fit. Engine avoids `Math.sin`/`Math.random` (engine-implementation-defined) — all trig is a deterministic polynomial, all randomness seeded.

4. **The signature stat survives the port.** "Distance Sailed" (path length vs. straight-line course) — the bluepaper's one arguable-about stat — is computed for every racer every race.

5. **v1 scope = Loop A + daily cadence + challenge links.** Result cards (canvas-rendered PNG), head-to-head challenge URLs, local careers. Rafts, Duckpool brackets, video clips, sanctioning SaaS = v2+, listed in README. Real-world event mode (ingesting actual finish data) is a data-source swap behind the same results/identity layer — by design.

## What this is NOT
- Not a gambling product (design law #2).
- Not the event company (bluepaper §12 stands: trucks and rivers need a human operating company).
- Not a parallel-model mock — the engine below is the shipped engine.
