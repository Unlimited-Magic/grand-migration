// POST /api/enter  {name, token} -> canonical result for today + season totals.
// The server recomputes the race itself (deterministic engine) — client results are never trusted.
import E from "../_lib/engine.mjs";

const FIELD = 400;

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const name = E.normName(body.name || "");
  const key = name.toUpperCase();
  const racer = await env.DB.prepare("SELECT name, token FROM racers WHERE name_key = ?").bind(key).first();
  if (!racer || racer.token !== body.token) return json({ error: "not claimed on this device" }, 403);

  const day = E.todayKey();
  const d = E.dailyResult(day, [racer.name], FIELD);
  const res = d.lookup(racer.name);
  const pts = E.pointsFor(res, d.results.length);

  await env.DB.prepare(
    "INSERT OR IGNORE INTO entries (day, name_key, position, field, pts) VALUES (?, ?, ?, ?, ?)"
  ).bind(day, key, res.position, d.results.length, pts).run();

  const season = day.slice(0, 7);
  const tot = await env.DB.prepare(
    "SELECT SUM(pts) AS pts, COUNT(*) AS races, MIN(position) AS best FROM entries WHERE name_key = ? AND day LIKE ?"
  ).bind(key, season + "%").first();
  const flock = await env.DB.prepare(
    "SELECT COUNT(DISTINCT r.name_key) AS n FROM racers r JOIN entries e ON e.name_key = r.name_key WHERE r.recruiter = ?"
  ).bind(key).first();
  const recruits = Math.min(10, flock.n || 0);

  return json({
    ok: true, day,
    position: res.position, field: d.results.length, pts,
    percentile: E.percentile(res, d.results.length),
    waterWorked: !!res.waterWorked,
    season: {
      basePts: tot.pts || 0, races: tot.races || 0, best: tot.best,
      recruits, multiplier: 1 + 0.02 * recruits,
      totalPts: Math.round((tot.pts || 0) * (1 + 0.02 * recruits)),
    },
  });
}

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
}
