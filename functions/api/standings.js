// GET /api/standings[?name=X] -> today's global top 20 + season top 20 (flock multiplier applied) + optional my-rank.
import E from "../_lib/engine.mjs";

export async function onRequestGet({ request, env }) {
  const day = E.todayKey();
  const season = day.slice(0, 7);
  const url = new URL(request.url);
  const me = E.normName(url.searchParams.get("name") || "").toUpperCase();

  const today = await env.DB.prepare(
    "SELECT r.name, e.position, e.field, e.pts FROM entries e JOIN racers r ON r.name_key = e.name_key WHERE e.day = ? ORDER BY e.position LIMIT 20"
  ).bind(day).all();

  // Season: base pts + active-recruit count -> multiplier (cap 10 recruits / 1.2x).
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
    if (i >= 0) mine = { rank: i + 1, of: scored.length, ...scored[i] };
  }

  return new Response(JSON.stringify({
    day, season,
    today: today.results || [],
    seasonTop: scored.slice(0, 20).map(({ name, base, recruits, total }) => ({ name, base, recruits, total })),
    entered: scored.length,
    mine,
  }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=30" } });
}
