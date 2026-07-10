# The Studio — build notes

## What it is

`/studio/` — a dress-up concept page for Grand Migration racers. Three views in one page:

1. **Wardrobe** (default) — species toggle (Duck/Capybara), a live bobbing preview canvas, and five
   accessory categories (Hats, Eyewear, Neck, Trail, Taunt), each a grid of item cards with a
   canvas-drawn icon, a color swatch row (where relevant), and a "Wear it" button. A Season Pass
   panel and a "See it race" CTA sit below the grid.
2. **Race** — clicking "See it race" runs your dressed racer through a private 9-boat heat
   (`E.dailyResult`/`E.makeRace`/`E.step`, `fieldSize=8`) using **today's real date key**, so the
   heat is the same deterministic river the main game runs — same name today gives the same
   result everywhere, and the UI says so.
3. **Result** — position/time/percentile/points (via `E.pointsFor`/`E.percentile`), your equipped
   taunt line as a quote, and a 1200×630 result-card preview (canvas) rendered with your outfit,
   downloadable as a PNG via "Save card".

All accessories are drawn in code (`sprites.js`), layered onto the same duck/capybara body shapes
used on the main site (`js/app.js`'s `drawDuck`/`drawCapy`), so a dressed racer reads as "the same
duck, fancier" rather than a different character.

## Files

- `index.html` — markup for all three views.
- `studio.css` — overrides on top of `../css/style.css` (item grid/cards, swatches, tag pills,
  season pass panel, race/result canvases). Reuses the shared dark-water tokens (`--bg`, `--panel`,
  `--accent`, etc.) and several existing components (`.panel`, `.wideBtn`, `.division`, `.bigPos`
  /`.statRow`/`.award` result styles, `.fieldNote`, `.againRow`, `#toast`) unchanged.
- `sprites.js` — pure canvas drawing: `drawRacer(ctx,x,y,s,bob,isMe,base,outfit,t)` composes body +
  neck + hat + eyewear in local (rotated/bobbing) space, and a separate `drawTrail` draws the wake
  effect in world space behind the sprite. `drawIcon(...)` renders a single accessory standalone
  for the wardrobe grid thumbnails. No DOM, no state — same style as `js/engine.js`.
- `studio.js` — item registries (hats/eyewear/neck/trail/taunt, each with a `free`/`earn`/`premium`
  tag), outfit + progress persistence (`localStorage`), wardrobe rendering, the live preview loop,
  the mini-race (mirrors `js/app.js`'s live-race pattern: `E.dailyResult` for authoritative
  results + a fresh `E.makeRace`/`E.step` loop for the animated version), and the result-card
  canvas.

## Pricing / monetization model

- **Free, always available**: "bare" (no accessory) state in every category, one taunt line.
- **Free, earn by racing**: Beanie (2 heats), Bowtie (3), Monocle (4), Bubble Trail (1), and two
  taunt lines (2, 5). Progress is a simple **practice-heat counter**, incremented once per
  completed "See it race" (or "Race again") — not gated by calendar day, so the unlock flow is
  testable in one sitting. A real production version would likely gate this to one count per UTC
  day like the main game's streaks; that's called out here rather than hidden.
- **Premium ($1.99–$4.99)**: Captain's Cap, Top Hat, Golden Crown, Aviator Shades, Cozy Scarf, Gold
  Chain, Sparkle Trail, Rainbow Wake.
- **Season Pass ($9.99)**: framed as unlocking all 8 premium items (shown to the user as "$9.99 for
  $22.42 of premium gear" in the toast).
- **Every item — free, earn-locked, or premium — can be worn in the Studio for preview at any
  time.** This is a deliberate choice for a concept/sales page: the whole point is to show what the
  wardrobe *could* look like on your racer before anything is purchasable. Nothing is ever marked
  "owned" by wearing it — the item's tag (Free / "Free · earn X/Y" / "✓ Earned free" / "$price")
  always reflects true unlock state, never purchase state (there is no purchase state — payments
  aren't live).
- Every button that touches money — the price link on a premium item, and the Season Pass CTA — is
  labeled **"Preview — payments arm at launch"** (or shows that phrase in a toast) and does nothing
  except show that toast. No fake checkout flow, no simulated success state.

## How to test

```
cd spine/public
python3 -m http.server 8000
# browse http://localhost:8000/studio/
```

Suggested manual pass:
1. Toggle Duck/Capybara — preview canvas should keep bobbing and re-tint the water.
2. Visit each tab (Hats/Eyewear/Neck/Trail/Taunt); click a few "Wear it" buttons and swatches —
   the live preview above should update immediately, outfit persists across a page reload
   (`localStorage: studio_outfit_v1`).
3. Type a name, click "See it race" — mini heat should animate to a finish, then show the result
   panel + card preview with your outfit and taunt line. "Race again" with the same name should
   land on the exact same finishing position (determinism).
4. Click "See it race" (or "Race again") repeatedly and watch `#progressStrip` — Bubble Trail
   should read "✓" after 1 heat, Beanie after 2, Bowtie after 3, Monocle after 4.
5. Click a premium item's "Buy — preview only" link and the Season Pass button — both should only
   toast, never equip/purchase anything.
6. "Reset studio progress" link in the footer clears both `localStorage` keys for re-testing from
   zero.

Verified headlessly with Node (no browser tool available in this session):
- `node --check` on both `sprites.js` and `studio.js`.
- A standalone script exercising every `drawRacer`/`drawIcon` combination (2 bases × 5 hats × 3
  eyewear × 4 neck × 4 trails = 480 combinations) against a mocked 2D context, plus the
  `E.dailyResult`/`E.makeRace`/`E.step` mini-race path at `fieldSize=8` — all passed with no
  runtime errors.
- Confirmed via a local `python3 -m http.server` that `index.html` and every asset it references
  (`studio.css`, `studio.js`, `sprites.js`, `../js/engine.js`, `../css/style.css`) serve 200, and
  that every element ID referenced by `studio.js`'s `$()` calls exists exactly once in the HTML.

**Caveat**: this environment has no browser-automation tool, so the above is syntax + logic +
asset-wiring verification, not a visual/interactive browser check. Please eyeball it in an actual
browser before shipping — canvas layout math (accessory anchor points, icon framing) was tuned by
hand-calculation, not by looking at pixels.

## Notes / things a follow-up pass might want

- The mini-race always uses `E.todayKey()`, so it's literally the same river/roster as today's
  real Grand Migration heat (just with `fieldSize=8` instead of 400) — intentional, reinforces the
  "same day, same result" pitch, but means "Race again" is only interesting for the animation, not
  the outcome.
- Species (base) is a single global choice, matching the main site's `SKINS` model — there's no
  per-item "duck-only" restriction, everything fits both bases via the shared `ANCHORS` table.
