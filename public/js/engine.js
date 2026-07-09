/* GRAND MIGRATION — deterministic race engine.
 * Pure module: no DOM, no Date, no Math.random, no Math.sin/cos
 * (trig via polynomial so results match across JS engines).
 * Same (dateKey, names) in -> same finish order out, on any device.
 */

(function (root) {
"use strict";

// ---------- deterministic primitives ----------

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = 6.283185307179586;

// Deterministic sine: range-reduce then Bhaskara I approximation.
// Max error ~0.0016 — plenty for water wobble, identical everywhere.
function dsin(x) {
  x = x % TAU;
  if (x < 0) x += TAU;
  let sign = 1;
  if (x > Math.PI) { x -= Math.PI; sign = -1; }
  const v = (16 * x * (Math.PI - x)) / (5 * Math.PI * Math.PI - 4 * x * (Math.PI - x));
  return sign * v;
}
function dcos(x) { return dsin(x + Math.PI / 2); }

function normName(name) {
  return String(name).trim().replace(/\s+/g, " ").slice(0, 28);
}
function nameKey(name) { return normName(name).toUpperCase(); }

// ---------- roster generation ----------

const ADJ = ["Soggy","Captain","Baron","Turbo","Sir","Lady","Damp","Mighty","Silent","Feral",
  "Bogwater","Duke","Princess","Gentle","Unhinged","Moist","Admiral","Cosmic","Sleepy","Rogue",
  "Professor","Wobbly","Grand","Humble","Chaotic","Velvet","Doctor","Salty","Midnight","Bubbly",
  "Slippery","Golden","Reverend","Crispy","Warlord","Tiny","Colossal","Anxious","Smug","Drowsy"];
const NOUN = ["Paddles","Splashley","Bobbington","McFloat","Driftwood","Puddle","Wake","Current",
  "Ripplesworth","Soakes","Marsh","Eddy","Brook","Torrent","Bilge","Skipper","Waverly","Dampier",
  "Flotsam","Jetsam","Swells","Mistral","Undertow","Shallows","Cascade","Drizzle","Monsoon","Foam",
  "Delta","Estuary","Lagoon","Rapids","Squall","Tides","Whirlpool","Plank","Buoy","Keel","Snorkel","Galosh"];

function rosterFor(dateKey, size) {
  const rand = mulberry32(xmur3("ROSTER:" + dateKey)());
  const names = [];
  const used = new Set();
  while (names.length < size) {
    const n = ADJ[(rand() * ADJ.length) | 0] + " " + NOUN[(rand() * NOUN.length) | 0];
    if (!used.has(n)) { used.add(n); names.push(n); }
  }
  return names;
}

// ---------- racer traits ----------

function traitsFor(name) {
  const r = mulberry32(xmur3("TRAIT:" + nameKey(name))());
  return {
    drift: 0.82 + r() * 0.36,   // how much of the current the hull catches
    chaos: 0.35 + r() * 1.15,   // wobble amplitude
    heft: 0.75 + r() * 0.5,     // damping vs eddies
    phase: r() * TAU,
    micro: r() * 1000,
  };
}

// ---------- course ----------

const COURSE = { length: 3000, width: 260 };

function courseFor(dateKey) {
  const rand = mulberry32(xmur3("COURSE:" + dateKey)());
  const eddies = [];
  const nE = 5 + ((rand() * 4) | 0);
  for (let i = 0; i < nE; i++) {
    eddies.push({
      y: 250 + rand() * (COURSE.length - 500),
      x: 30 + rand() * (COURSE.width - 60),
      r: 60 + rand() * 120,
      spin: (rand() < 0.5 ? -1 : 1) * (0.35 + rand() * 0.85),
    });
  }
  const rocks = [];
  const nR = 4 + ((rand() * 4) | 0);
  for (let i = 0; i < nR; i++) {
    rocks.push({
      y: 350 + rand() * (COURSE.length - 700),
      x: 25 + rand() * (COURSE.width - 50),
      r: 14 + rand() * 22,
    });
  }
  return {
    eddies, rocks,
    baseFlow: 9.5 + rand() * 3.5,        // units/sec downstream
    meander: 0.6 + rand() * 1.4,
    meanderFreq: 0.0018 + rand() * 0.0025,
  };
}

// Flow field at a point (pure function of course + position + time).
function flowAt(course, x, y, t) {
  let vx = dsin(y * course.meanderFreq * TAU + t * 0.05) * course.meander * 6;
  let vy = course.baseFlow;
  // Center of channel is faster (parabolic profile), banks are slow.
  const c = x / COURSE.width - 0.5;
  vy *= 1.15 - 2.2 * c * c;
  for (const e of course.eddies) {
    const dx = x - e.x, dy = y - e.y;
    const d2 = dx * dx + dy * dy, r2 = e.r * e.r;
    if (d2 < r2 * 4) {
      const f = Math.exp(-d2 / r2) * e.spin;
      vx += -dy * f * 0.09;
      vy += dx * f * 0.09;
    }
  }
  return { vx, vy };
}

// ---------- simulation ----------

const DT = 0.1;         // sim seconds per step
const TMAX = 900;       // safety cap

function makeRace(dateKey, extraNames = [], fieldSize = 400) {
  const roster = rosterFor(dateKey, fieldSize);
  const seen = new Set(roster.map(nameKey));
  const extras = [];
  for (const raw of extraNames) {
    const n = normName(raw);
    if (n && !seen.has(nameKey(n))) { seen.add(nameKey(n)); extras.push(n); }
  }
  const names = roster.concat(extras);
  const laneRand = mulberry32(xmur3("LANES:" + dateKey)());
  const racers = names.map((name) => {
    const t = traitsFor(name);
    // Start position depends on date AND name -> new draw every day.
    const lr = mulberry32(xmur3("START:" + dateKey + ":" + nameKey(name))());
    return {
      name, t,
      x: 14 + lr() * (COURSE.width - 28),
      y: 8 + lr() * 30,
      path: 0, time: -1, done: false,
    };
  });
  void laneRand;
  return { dateKey, course: courseFor(dateKey), racers, clock: 0 };
}

// Advance the whole field by one step. Mutates race. Returns count still racing.
function step(race) {
  const { course } = race;
  const t = race.clock;
  let alive = 0;
  for (const r of race.racers) {
    if (r.done) continue;
    const f = flowAt(course, r.x, r.y, t);
    const wob = t * (0.9 + r.t.heft * 0.35) + r.t.phase;
    let vx = f.vx * r.t.drift + dsin(wob * 1.7 + r.t.micro) * r.t.chaos * 3.2;
    let vy = f.vy * r.t.drift + dcos(wob * 1.3) * r.t.chaos * 1.1;
    // rocks: soft radial push
    for (const rock of course.rocks) {
      const dx = r.x - rock.x, dy = r.y - rock.y;
      const d2 = dx * dx + dy * dy;
      const rr = rock.r + 8;
      if (d2 < rr * rr && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (rr - d) * 2.4;
        vx += (dx / d) * push;
        vy += (dy / d) * push * 0.4;
      }
    }
    const nx = Math.min(COURSE.width - 4, Math.max(4, r.x + vx * DT));
    const ny = r.y + vy * DT;
    const ddx = nx - r.x, ddy = ny - r.y;
    r.path += Math.sqrt(ddx * ddx + ddy * ddy);
    r.x = nx; r.y = ny;
    if (r.y >= COURSE.length) {
      r.done = true;
      // Sub-step interpolation for fair photo-finishes.
      const over = (r.y - COURSE.length) / Math.max(ddy, 0.0001);
      r.time = t + DT - over * DT;
    } else alive++;
  }
  race.clock = t + DT;
  return alive;
}

// Run to completion. Returns results array (also cached on race.results).
function runRace(race) {
  while (race.clock < TMAX && step(race) > 0) { /* advance */ }
  for (const r of race.racers) {
    if (!r.done) { r.time = TMAX + (COURSE.length - r.y); r.dnf = true; }
  }
  const results = race.racers.slice().sort((a, b) => a.time - b.time);
  results.forEach((r, i) => {
    r.position = i + 1;
    r.sailed = r.path / COURSE.length; // Distance Sailed ratio — the signature stat
  });
  // Water Worked award: finisher with highest sailed ratio in the top half.
  const half = results.filter((r) => !r.dnf).slice(0, Math.ceil(results.length / 2));
  let ww = null;
  for (const r of half) if (!ww || r.sailed > ww.sailed) ww = r;
  if (ww) ww.waterWorked = true;
  race.results = results;
  return results;
}

const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
function pointsFor(r, fieldSize) {
  let p = r.position <= POINTS.length ? POINTS[r.position - 1] : 0;
  if (r.waterWorked) p += 5;
  if (!r.dnf) p += 1; // showing up matters
  void fieldSize;
  return p;
}

function percentile(r, fieldSize) {
  return Math.max(0, Math.round((1 - (r.position - 1) / fieldSize) * 1000) / 10);
}

// Convenience: full daily result for a set of user names.
function dailyResult(dateKey, userNames, fieldSize = 400) {
  const race = makeRace(dateKey, userNames, fieldSize);
  const results = runRace(race);
  const byKey = new Map(results.map((r) => [nameKey(r.name), r]));
  return {
    race, results,
    lookup: (name) => byKey.get(nameKey(name)) || null,
  };
}

function todayKey(now = new Date()) {
  // UTC race day — same race for the whole planet.
  return now.toISOString().slice(0, 10);
}

const GMEngine = { xmur3, mulberry32, dsin, dcos, normName, rosterFor, traitsFor,
  COURSE, courseFor, flowAt, DT, TMAX, makeRace, step, runRace, POINTS,
  pointsFor, percentile, dailyResult, todayKey };

if (typeof module !== "undefined" && module.exports) module.exports = GMEngine;
root.GMEngine = GMEngine;
})(typeof globalThis !== "undefined" ? globalThis : this);
