// Headless proof the engine is the server:
// same inputs -> identical results, twice, plus sanity checks.
const E = require("../public/js/engine.js");

const DAY = "2026-07-09";
const USERS = ["Gregory, Destroyer of Worlds", "Sir Quacksalot", "  spaced   name  "];

function fingerprint(res) {
  return res.results.map((r) => `${r.position}|${r.name}|${r.time.toFixed(4)}|${r.sailed.toFixed(5)}`).join("\n");
}

const a = E.dailyResult(DAY, USERS);
const b = E.dailyResult(DAY, USERS);
const fa = fingerprint(a), fb = fingerprint(b);

let fails = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) fails++;
}

check("determinism: identical runs", fa === fb);
check("field size", a.results.length === 400 + USERS.length, `${a.results.length} racers`);
const greg = a.lookup("gregory, destroyer of worlds"); // case-insensitive lookup
check("user racer present + case-insensitive lookup", !!greg, greg ? `pos ${greg.position}` : "missing");
const spaced = a.lookup("Spaced Name");
check("name normalization (collapse spaces)", !!spaced);
check("all finished or DNF-marked", a.results.every((r) => r.time > 0));
check("positions are 1..N unique", new Set(a.results.map((r) => r.position)).size === a.results.length);
check("sailed ratio sane (1.0-2.5x course)", a.results.every((r) => r.sailed > 0.99 && r.sailed < 2.5));
check("Water Worked awarded once", a.results.filter((r) => r.waterWorked).length === 1);
const p1 = a.results[0];
check("winner points = 25+1(+5?)", [26, 31].includes(E.pointsFor(p1, 400)), `${E.pointsFor(p1, 400)} pts`);
check("winner percentile 100", E.percentile(p1, a.results.length) === 100);

const c = E.dailyResult("2026-07-10", USERS);
check("different day -> different order", fingerprint(c) !== fa);

const t0 = Date.now();
E.dailyResult(E.todayKey(), USERS);
console.log(`timing: full 400-racer race simulated in ${Date.now() - t0}ms`);

if (fails) { console.error(`\n${fails} check(s) FAILED`); process.exit(1); }
console.log("\nALL CHECKS PASSED");
