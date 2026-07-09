// Grand Migration worker: /api/* (D1 global layer) + static assets.
// The server recomputes every race with the same deterministic engine — client results are never trusted.
import E from "./engine.mjs";

const FIELD = 400;

function json(o, status = 200, cache) {
  const headers = { "content-type": "application/json" };
  if (cache) headers["cache-control"] = cache;
  return new Response(JSON.stringify(o), { status, headers });
}

async function claim(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const name = E.normName(body.name || "");
  if (name.length < 2) return json({ error: "name too short" }, 400);
  const key = name.toUpperCase();

  const existing = await env.DB.prepare("SELECT name FROM racers WHERE name_key = ?").bind(key).first();
  if (existing) return json({ taken: true, name: existing.name });

  let recruiter = null;
  const ref = E.normName(body.ref || "").toUpperCase();
  if (ref && ref !== key) {
    const rec = await env.DB.prepare("SELECT name_key FROM racers WHERE name_key = ?").bind(ref).first();
    if (rec) recruiter = rec.name_key;
  }

  const token = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO racers (name_key, name, token, recruiter, claimed_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(key, name, token, recruiter, new Date().toISOString()).run();
  return json({ ok: true, name, token });
}

async function enter(request, env) {
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

async function standings(request, env) {
  const day = E.todayKey();
  const season = day.slice(0, 7);
  const url = new URL(request.url);
  const me = E.normName(url.searchParams.get("name") || "").toUpperCase();

  const today = await env.DB.prepare(
    "SELECT r.name, e.position, e.field, e.pts FROM entries e JOIN racers r ON r.name_key = e.name_key WHERE e.day = ? ORDER BY e.position LIMIT 20"
  ).bind(day).all();

  const rows = await env.DB.prepare(`
    SELECT r.name, r.name_key, SUM(e.pts) AS base,
      (SELECT COUNT(DISTINCT r2.name_key) FROM racers r2 JOIN entries e2 ON e2.name_key = r2.name_key
        WHERE r2.recruiter = r.name_key) AS recruits
    FROM entries e JOIN racers r ON r.name_key = e.name_key
    WHERE e.day LIKE ? GROUP BY r.name_key`).bind(season + "%").all();

  const scored = (rows.results || []).map((r) => {
    const rec = Math.min(10, r.recruits || 0);
    return { name: r.name, name_key: r.name_key, base: r.base, recruits: rec,
      total: Math.round(r.base * (1 + 0.02 * rec)) };
  }).sort((a, b) => b.total - a.total);

  let mine = null;
  if (me) {
    const i = scored.findIndex((s) => s.name_key === me);
    if (i >= 0) mine = { rank: i + 1, of: scored.length, name: scored[i].name, base: scored[i].base, recruits: scored[i].recruits, total: scored[i].total };
  }

  return json({
    day, season,
    today: today.results || [],
    seasonTop: scored.slice(0, 20).map(({ name, base, recruits, total }) => ({ name, base, recruits, total })),
    entered: scored.length,
    mine,
  }, 200, "public, max-age=30");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/claim" && request.method === "POST") return await claim(request, env);
        if (url.pathname === "/api/enter" && request.method === "POST") return await enter(request, env);
        if (url.pathname === "/api/standings" && request.method === "GET") return await standings(request, env);
        return json({ error: "not found" }, 404);
      } catch (e) {
        return json({ error: "server error" }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
