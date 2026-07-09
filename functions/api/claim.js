// POST /api/claim  {name, ref?} -> {ok, name, token} | {taken, name}
import E from "../_lib/engine.mjs";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const name = E.normName(body.name || "");
  if (name.length < 2) return json({ error: "name too short" }, 400);
  const key = name.toUpperCase();

  const existing = await env.DB.prepare("SELECT name FROM racers WHERE name_key = ?").bind(key).first();
  if (existing) return json({ taken: true, name: existing.name });

  // Referral attribution: recruiter must exist and not be self.
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

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
}
