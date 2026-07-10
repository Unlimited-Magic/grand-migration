# The Registry

Racer deed pages + permanence pitch for The Grand Migration.

## What it is

- **Search** (`index.html` + `registry.js`): type any racer name, no restrictions — every
  name already has a computed career because the engine is deterministic, so the pitch is
  "you don't need to have raced, the river already ran without you."
- **Deed certificate** (`.deed` in `style.css`): serif-accented card with a double border,
  corner flourishes, a deterministic 6-digit "Racer No." hashed from the name
  (`REGISTRY:` + name → `E.xmur3` → mod 999999), today's heat result, a 14-day sparkline
  canvas (percentile per day, today highlighted), and stat tiles: Best Finish, Avg
  Percentile, Avg Distance Sailed, Heats On Record.
- **Career computation**: loops the last 14 UTC date keys, calls
  `E.dailyResult(dateKey, [name], 400)` for each, pulls `lookup(name)` and
  `E.percentile(r, N)`. All client-side, nothing stored.
- **Buy panel**: "Permanent Deed $4.99" and "Founder Edition #NNN/500 $9.99" (founder
  number also hashed deterministically from the name, `FOUNDER:` prefix, mod 500). Both
  buttons show a toast — "Preview only — deeds arm at launch." — no fake checkout flow.
  "Gift a deed" toggles an explainer instead of buying.
- **Seasonal explainer panel**: free claims (on the main track) reset each season;
  Permanent Deeds don't.
- **Shareable URL**: `/registry/?name=X` renders that deed directly on load
  (`URLSearchParams` on boot). Searching updates the URL via `history.replaceState`
  (no page reload). "Copy this deed's link" button copies the current `?name=` URL.

## Files

- `index.html` — structure, links `../css/style.css` (shared dark-water theme) then local `style.css`
- `style.css` — deed certificate look, buy panel, stat grid, sparkline sizing
- `registry.js` — all logic; classic script (no modules), depends on `window.GMEngine`
  from `../js/engine.js`

## How to test

```
cd spine/public   # the parent of registry/
python3 -m http.server 8000
# browse http://localhost:8000/registry/
```

- Type a name → deed renders, URL gains `?name=`.
- Reload with `?name=Soggy%20Bottom` in the URL → deed renders on load without touching the form.
- Resize the window with a deed showing → sparkline redraws from cached data (no
  re-simulation — `careerFor()` is 14 full 400-racer races, so resize does not recompute it).
- Click either buy button → toast, no navigation, no charge.
- Click "Gift a deed instead" → explainer expands/collapses.
- Click "Copy this deed's link" → clipboard gets the `?name=` URL, toast confirms (falls
  back to showing the URL in the toast if clipboard permission is denied).

Headless logic check (no DOM): ran the career-loop math directly against
`../js/engine.js` via `node -e` for a sample name across 14 days — dates align with
`E.todayKey()`, percentiles and Distance Sailed ratios come back sane, and the racer/founder
hashes are stable across repeated runs. `node --check registry.js` passes.

## Caveats

- No visual/browser screenshot was taken this session (no headless browser tool was
  available) — verified via served HTTP 200s, ID cross-referencing between the HTML and
  JS, and the headless engine-logic check above. Worth a manual look in an actual browser
  before shipping.
- `careerFor()` runs 14 full race simulations (400+ racers each) synchronously on every
  search — fine on a modern phone/desktop but noticeable (a beat or two) on very old
  hardware; there's no loading indicator.
- Racer No. and Founder No. are cosmetic/deterministic previews, not reserved against any
  backend — two different builders' pages could theoretically show the same numbering
  scheme conflict-free since it's a pure hash, but nothing currently prevents number
  collisions across names (expected/acceptable for a preview).
