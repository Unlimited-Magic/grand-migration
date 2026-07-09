/* GRAND MIGRATION — UI layer. Classic script; engine in js/engine.js (GMEngine). */
(function () {
"use strict";
const E = window.GMEngine;
const $ = (s) => document.querySelector(s);
const FIELD = 400;

// ---------- skins (species = theme layer, per DECISION_SPINE.md) ----------
const SKINS = {
  duck: {
    label: "Rubber Duck Division",
    tag: "The classic. Est. in every charity river on Earth.",
    water0: "#0d3b66", water1: "#1b6ca8", bank: "#092a4a",
    accent: "#ffd447", accentDark: "#c79a00", ink: "#082033",
    sprite: drawDuck,
  },
  capy: {
    label: "Capybara Division",
    tag: "Unbothered. Moisturized. In their lane. Literally.",
    water0: "#0e4d45", water1: "#1f7a6d", bank: "#0a332e",
    accent: "#ff9f1c", accentDark: "#b86a00", ink: "#10281f",
    sprite: drawCapy,
  },
};

function drawDuck(ctx, x, y, s, bob, me) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bob * 0.25);
  if (me) { ctx.shadowColor = "#fff"; ctx.shadowBlur = s * 1.2; }
  // body
  ctx.fillStyle = "#ffd447";
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.8, 0, 0, 7); ctx.fill();
  // wing
  ctx.fillStyle = "#eab520";
  ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.05, s * 0.45, s * 0.3, 0.5, 0, 7); ctx.fill();
  // head (faces downstream = down-screen)
  ctx.fillStyle = "#ffdf6b";
  ctx.beginPath(); ctx.arc(0, s * 0.75, s * 0.55, 0, 7); ctx.fill();
  // beak
  ctx.fillStyle = "#ff8c00";
  ctx.beginPath(); ctx.ellipse(0, s * 1.25, s * 0.28, s * 0.16, 0, 0, 7); ctx.fill();
  // eyes
  ctx.fillStyle = "#082033";
  ctx.beginPath(); ctx.arc(-s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.arc(s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.fill();
  ctx.restore();
}

function drawCapy(ctx, x, y, s, bob, me) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bob * 0.18);
  if (me) { ctx.shadowColor = "#fff"; ctx.shadowBlur = s * 1.2; }
  // body
  ctx.fillStyle = "#a8764f";
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.95, s * 0.8, 0, 0, 7); ctx.fill();
  // head + blunt snout, facing downstream
  ctx.fillStyle = "#b5835a";
  ctx.beginPath(); ctx.ellipse(0, s * 0.7, s * 0.5, s * 0.45, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#c69066";
  ctx.beginPath(); ctx.ellipse(0, s * 1.0, s * 0.32, s * 0.22, 0, 0, 7); ctx.fill();
  // ears
  ctx.fillStyle = "#8d5f3d";
  ctx.beginPath(); ctx.arc(-s * 0.34, s * 0.38, s * 0.13, 0, 7); ctx.arc(s * 0.34, s * 0.38, s * 0.13, 0, 7); ctx.fill();
  // the emotional-support orange
  ctx.fillStyle = "#ff9f1c";
  ctx.beginPath(); ctx.arc(0, s * 0.28, s * 0.18, 0, 7); ctx.fill();
  // sleepy eyes
  ctx.strokeStyle = "#10281f"; ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath(); ctx.moveTo(-s * 0.26, s * 0.62); ctx.lineTo(-s * 0.1, s * 0.62);
  ctx.moveTo(s * 0.1, s * 0.62); ctx.lineTo(s * 0.26, s * 0.62); ctx.stroke();
  ctx.restore();
}

// ---------- state ----------
const params = new URLSearchParams(location.search);
const dayParam = params.get("d");
const DAY = /^\d{4}-\d{2}-\d{2}$/.test(dayParam || "") ? dayParam : E.todayKey();
const IS_TODAY = DAY === E.todayKey();
const EPOCH = Date.UTC(2026, 6, 1); // Season 0 begins 2026-07-01
const HEAT = Math.max(1, Math.floor((Date.parse(DAY + "T00:00:00Z") - EPOCH) / 86400000) + 1);
const GUESTS = (params.get("vs") || "").split("~").map(E.normName).filter(Boolean).slice(0, 8);

const REF = params.get("ref");
if (REF) localStorage.setItem("gm_ref", REF);

let skinId = params.get("skin") || localStorage.getItem("gm_skin") || "duck";
if (!SKINS[skinId]) skinId = "duck";
let myName = localStorage.getItem("gm_name") || "";
let speedIdx = +(localStorage.getItem("gm_speed") || 1);
const SPEEDS = [12, 24, 48];
let daily = null;      // computed results for DAY (+my name +guests)
let playing = null;    // playback state
let careerApplied = false;

const skin = () => SKINS[skinId];

// ---------- career (localStorage) ----------
function loadCareer() {
  try { return JSON.parse(localStorage.getItem("gm_career_v1")) || { racers: {} }; }
  catch { return { racers: {} }; }
}
function saveCareer(c) { localStorage.setItem("gm_career_v1", JSON.stringify(c)); }
function applyCareer(name, res, fieldN) {
  const c = loadCareer();
  const k = E.normName(name).toUpperCase();
  const r = c.racers[k] || { name: E.normName(name), pts: 0, races: 0, best: 9999, hist: [] };
  if (r.hist.some((h) => h.d === DAY)) return r; // one entry per heat
  const pts = E.pointsFor(res, fieldN);
  r.pts += pts; r.races += 1; r.best = Math.min(r.best, res.position);
  r.hist.unshift({ d: DAY, p: res.position, of: fieldN, pts });
  r.hist = r.hist.slice(0, 60);
  c.racers[k] = r; saveCareer(c);
  return r;
}

// ---------- compute ----------
function compute() {
  const names = [];
  if (myName) names.push(myName);
  for (const g of GUESTS) names.push(g);
  daily = E.dailyResult(DAY, names, FIELD);
  return daily;
}

// ---------- views ----------
function show(view) {
  for (const v of ["enter", "race", "results"]) $("#" + v).classList.toggle("hidden", v !== view);
}

function applySkinChrome() {
  const s = skin();
  document.documentElement.style.setProperty("--accent", s.accent);
  document.documentElement.style.setProperty("--water0", s.water0);
  document.documentElement.style.setProperty("--water1", s.water1);
  $("#divisionLabel").textContent = s.label;
  $("#divisionTag").textContent = s.tag;
  $("#skinDuck").classList.toggle("on", skinId === "duck");
  $("#skinCapy").classList.toggle("on", skinId === "capy");
  drawHeroSprite();
}

function drawHeroSprite() {
  const cv = $("#heroSprite"); const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, cv.width, cv.height);
  skin().sprite(ctx, cv.width / 2, cv.height / 2 - 8, 22, 0.15, false);
}

function renderEnter() {
  $("#heatNo").textContent = "HEAT #" + HEAT;
  $("#heatDate").textContent = DAY + (IS_TODAY ? " · today" : " · replay");
  $("#nameInput").value = myName;
  $("#fieldCount").textContent = String(FIELD + GUESTS.length + (myName ? 1 : 0));
  // challenge banner
  const cb = $("#challengeBox");
  if (GUESTS.length) {
    const d = compute();
    const rows = GUESTS.map((g) => {
      const r = d.lookup(g);
      return `<tr><td>${esc(g)}</td><td>P${r.position}</td><td>${E.percentile(r, d.results.length)}%</td></tr>`;
    }).join("");
    cb.innerHTML = `<div class="chTitle">⚔️ YOU'VE BEEN CHALLENGED</div>
      <table class="miniTable"><thead><tr><th>racer</th><th>finish</th><th>beat</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="chSub">Think your racer beats that? Name one. Same river, same current — no excuses.</div>`;
    cb.classList.remove("hidden");
  } else cb.classList.add("hidden");
  // career strip
  const c = loadCareer();
  const mine = myName ? c.racers[E.normName(myName).toUpperCase()] : null;
  $("#careerStrip").innerHTML = mine
    ? `<b>${esc(mine.name)}</b> — ${mine.pts} pts · best P${mine.best} · ${mine.races} heat${mine.races === 1 ? "" : "s"}`
    : "New here? Your racer's career starts the moment you name it.";
  show("enter");
}

function esc(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }

// ---------- playback ----------
const CLIPS = [
  "{L} has found the fast water!",
  "{L} leads — the current is DOING THINGS.",
  "Stewards watching {L} closely. For vibes.",
  "{L} working the inside line like a professional.",
  "An eddy! {L} holds on!",
  "{L} in front. The flock is furious.",
  "Absolute scenes. {L} by half a length.",
  "{L} refuses to acknowledge the rocks.",
];

function startRace() {
  compute();
  const live = E.makeRace(DAY, daily.race.racers.slice(FIELD).map((r) => r.name), FIELD);
  playing = {
    live, last: performance.now(), simAcc: 0,
    ticker: E.mulberry32(E.xmur3("CLIP:" + DAY)()),
    lastClip: 0, done: false,
  };
  $("#raceHeat").textContent = "HEAT #" + HEAT + " · " + skin().label;
  $("#speedBtn").textContent = "▶ " + SPEEDS[speedIdx] + "×";
  show("race");
  sizeCanvas();
  requestAnimationFrame(tick);
}

function sizeCanvas() {
  const cv = $("#river");
  const w = Math.min(cv.parentElement.clientWidth, 640);
  cv.width = w * devicePixelRatio;
  cv.height = Math.floor(Math.min(innerHeight * 0.62, 560) * devicePixelRatio);
  cv.style.width = w + "px";
  cv.style.height = cv.height / devicePixelRatio + "px";
}

function myLive() {
  if (!myName) return null;
  const k = E.normName(myName).toUpperCase();
  return playing.live.racers.find((r) => r.name.toUpperCase() === k) || null;
}

function livePosition(r) {
  let p = 1;
  for (const o of playing.live.racers) {
    if (o === r) continue;
    if (o.done ? (r.done ? o.time < r.time : true) : (!r.done && o.y > r.y)) p++;
  }
  return p;
}

function tick(now) {
  if (!playing || playing.done) return;
  const p = playing;
  // Cap at 1s so throttled/background tabs still progress at true speed.
  const dtReal = Math.min(1.0, (now - p.last) / 1000);
  p.last = now;
  p.simAcc += dtReal * SPEEDS[speedIdx];
  let alive = 1;
  while (p.simAcc >= E.DT) {
    p.simAcc -= E.DT;
    alive = E.step(p.live);
    if (alive === 0) break;
  }
  if (now - p.lastClip > 3500 && alive > 0) {
    p.lastClip = now;
    let lead = p.live.racers[0];
    for (const r of p.live.racers) if (!r.done && r.y > lead.y) lead = r;
    const line = CLIPS[(p.ticker() * CLIPS.length) | 0].replace("{L}", lead.name);
    $("#ticker").textContent = "🎙 " + line;
  }
  draw();
  const me = myLive();
  const meDone = me ? me.done : true;
  if (me) {
    $("#livePos").textContent = (me.done ? "FINISHED P" : "P") + livePosition(me);
  } else $("#livePos").textContent = "field: " + alive + " racing";
  $("#raceClock").textContent = p.live.clock.toFixed(0) + "s";
  if (alive === 0 || (meDone && p.live.clock > 30 && topTenDone())) {
    p.done = true;
    setTimeout(finishRace, 900);
    return;
  }
  requestAnimationFrame(tick);
}

function topTenDone() {
  let n = 0;
  for (const r of playing.live.racers) if (r.done) n++;
  return n >= 10;
}

function draw() {
  const cv = $("#river"), ctx = cv.getContext("2d");
  const s = skin();
  const scale = cv.width / E.COURSE.width;
  const me = myLive();
  let target = me;
  if (!target || target.done) {
    target = playing.live.racers[0];
    for (const r of playing.live.racers) if (!r.done && r.y > (target.done ? -1 : target.y)) target = r;
  }
  const camY = Math.max(0, Math.min(E.COURSE.length - cv.height / scale + 80, target.y - cv.height / scale * 0.3));
  const w2s = (x, y) => [x * scale, (y - camY) * scale];

  // water
  const g = ctx.createLinearGradient(0, 0, 0, cv.height);
  g.addColorStop(0, s.water0); g.addColorStop(1, s.water1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  // moving current streaks
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 2 * devicePixelRatio;
  const t = playing.live.clock;
  for (let i = 0; i < 14; i++) {
    const wx = ((i * 73) % E.COURSE.width);
    const wy = ((i * 431 + t * 26) % (E.COURSE.length));
    const [sx, sy] = w2s(wx + E.dsin(wy * 0.02 + i) * 6, wy);
    if (sy < -40 || sy > cv.height + 40) continue;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + E.dsin(i + t * 0.4) * 6 * devicePixelRatio, sy + 26 * devicePixelRatio); ctx.stroke();
  }
  // banks
  ctx.fillStyle = s.bank;
  ctx.fillRect(0, 0, 6 * devicePixelRatio, cv.height);
  ctx.fillRect(cv.width - 6 * devicePixelRatio, 0, 6 * devicePixelRatio, cv.height);
  // eddies
  for (const e of playing.live.course.eddies) {
    const [ex, ey] = w2s(e.x, e.y);
    if (ey < -e.r * scale || ey > cv.height + e.r * scale) continue;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.5 * devicePixelRatio;
    for (let k = 1; k <= 2; k++) {
      ctx.beginPath();
      ctx.arc(ex, ey, e.r * scale * 0.4 * k, t * e.spin + k, t * e.spin + k + 4.6);
      ctx.stroke();
    }
  }
  // rocks
  for (const rock of playing.live.course.rocks) {
    const [rx, ry] = w2s(rock.x, rock.y);
    if (ry < -60 || ry > cv.height + 60) continue;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath(); ctx.arc(rx, ry - rock.r * scale * 0.4, rock.r * scale * 1.15, 3.4, 6.0); ctx.fill();
    ctx.fillStyle = "#5c6b73";
    ctx.beginPath(); ctx.arc(rx, ry, rock.r * scale, 0, 7); ctx.fill();
    ctx.fillStyle = "#78878f";
    ctx.beginPath(); ctx.arc(rx - rock.r * scale * 0.25, ry - rock.r * scale * 0.3, rock.r * scale * 0.55, 0, 7); ctx.fill();
  }
  // finish line
  {
    const [, fy] = w2s(0, E.COURSE.length);
    if (fy > -30 && fy < cv.height + 30) {
      const sq = 10 * devicePixelRatio;
      for (let i = 0; i * sq < cv.width; i++) {
        ctx.fillStyle = i % 2 ? "#111" : "#fff";
        ctx.fillRect(i * sq, fy - sq, sq, sq);
        ctx.fillStyle = i % 2 ? "#fff" : "#111";
        ctx.fillRect(i * sq, fy, sq, sq);
      }
    }
  }
  // racers
  const spriteS = 7 * devicePixelRatio;
  for (const r of playing.live.racers) {
    if (r.done) continue;
    const [x, y] = w2s(r.x, r.y);
    if (y < -30 || y > cv.height + 30) continue;
    const isMe = me === r;
    const isGuest = GUESTS.some((gn) => gn.toUpperCase() === r.name.toUpperCase());
    const bob = E.dsin(t * 2.1 + r.t.phase);
    s.sprite(ctx, x, y, isMe ? spriteS * 1.5 : isGuest ? spriteS * 1.25 : spriteS, bob, isMe);
    if (isMe || isGuest) {
      ctx.font = `${11 * devicePixelRatio}px -apple-system,system-ui,sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = isMe ? "#fff" : "rgba(255,255,255,0.75)";
      ctx.fillText(r.name, x, y - spriteS * 2.1);
    }
  }
  // minimap
  const mmX = cv.width - 14 * devicePixelRatio;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(mmX - 4 * devicePixelRatio, 8 * devicePixelRatio, 8 * devicePixelRatio, cv.height - 16 * devicePixelRatio);
  for (const r of playing.live.racers) {
    if (r.done) continue;
    const my_ = 8 * devicePixelRatio + (r.y / E.COURSE.length) * (cv.height - 16 * devicePixelRatio);
    ctx.fillStyle = r === me ? "#fff" : "rgba(255,255,255,0.35)";
    ctx.fillRect(mmX - (r === me ? 3 : 1.5) * devicePixelRatio, my_, (r === me ? 6 : 3) * devicePixelRatio, 2 * devicePixelRatio);
  }
}

// ---------- results ----------
function finishRace() {
  const d = daily;
  const N = d.results.length;
  const my = myName ? d.lookup(myName) : null;
  if (my && !careerApplied) { applyCareer(myName, my, N); careerApplied = true; }

  // my card
  const cardBox = $("#myCard");
  if (my) {
    const pts = E.pointsFor(my, N);
    cardBox.innerHTML = `
      <div class="bigPos">P${my.position}<span class="ofN"> / ${N}</span></div>
      <div class="cardName">${esc(my.name)}</div>
      <div class="beatLine">beat <b>${E.percentile(my, N)}%</b> of the field</div>
      <div class="statRow">
        <div><span>${my.time.toFixed(1)}s</span><label>time</label></div>
        <div><span>×${my.sailed.toFixed(2)}</span><label>distance sailed</label></div>
        <div><span>+${pts}</span><label>points</label></div>
      </div>
      ${my.waterWorked ? '<div class="award">🌊 WATER WORKED — sailed the longest line of the top half (+5)</div>' : ""}`;
    cardBox.classList.remove("hidden");
    $("#shareRow").classList.remove("hidden");
  } else { cardBox.classList.add("hidden"); $("#shareRow").classList.add("hidden"); }

  // head-to-head
  const h2h = $("#h2hBox");
  if (GUESTS.length && my) {
    const all = [my, ...GUESTS.map((g) => d.lookup(g))].sort((a, b) => a.position - b.position);
    h2h.innerHTML = `<h3>⚔️ Head-to-head</h3><table class="miniTable"><tbody>` +
      all.map((r) => `<tr class="${r === my ? "meRow" : ""}"><td>${r === my ? "🏁 " : ""}${esc(r.name)}</td><td>P${r.position}</td><td>${r === all[0] ? "WINNER" : "+" + (r.position - all[0].position)}</td></tr>`).join("") +
      `</tbody></table>`;
    h2h.classList.remove("hidden");
  } else h2h.classList.add("hidden");

  // podium + standings
  const top = d.results.slice(0, 10);
  $("#standings").innerHTML = top.map((r) => {
    const medal = r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : String(r.position);
    return `<tr><td>${medal}</td><td>${esc(r.name)}</td><td>${r.time.toFixed(1)}s</td><td>+${E.pointsFor(r, N)}</td></tr>`;
  }).join("");

  // career
  const c = loadCareer();
  const mine = myName ? c.racers[E.normName(myName).toUpperCase()] : null;
  $("#careerBox").innerHTML = mine
    ? `<h3>Career — ${esc(mine.name)}</h3>
       <div class="careerStats"><div><span>${mine.pts}</span><label>season pts</label></div>
       <div><span>P${mine.best}</span><label>best finish</label></div>
       <div><span>${mine.races}</span><label>heats</label></div></div>
       <table class="miniTable"><tbody>${mine.hist.slice(0, 5).map((h) => `<tr><td>${h.d}</td><td>P${h.p}/${h.of}</td><td>+${h.pts}</td></tr>`).join("")}</tbody></table>`
    : "";
  $("#resultHeat").textContent = "HEAT #" + HEAT + " · " + DAY + " · " + skin().label;
  if (IS_TODAY) syncGlobal();
  $("#tomorrowLine").textContent = IS_TODAY
    ? "New heat at 00:00 UTC. Same name, new river, new draw."
    : "This was a replay. Today's heat is running — race it.";
  show("results");
}

// ---------- global layer (D1 via Pages Functions; silently absent on file://) ----------
function claimState() {
  try { return JSON.parse(localStorage.getItem("gm_claim")) || null; } catch { return null; }
}
async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error("api " + res.status);
  return res.json();
}
async function syncGlobal() {
  const box = $("#globalBox");
  if (!myName || !box) return;
  try {
    let claim = claimState();
    if (claim && claim.name.toUpperCase() !== E.normName(myName).toUpperCase()) claim = null;
    if (!claim) {
      // Offer the claim; don't auto-claim someone's casual name entry.
      box.innerHTML = `<h3>🌐 Global season</h3>
        <p class="dim">"${esc(E.normName(myName))}" isn't claimed yet. Claim it globally — first come, first named, and your points start counting in the world standings.</p>
        <button id="claimBtn" class="wideBtn" type="button">Claim "${esc(E.normName(myName))}" worldwide</button>`;
      box.classList.remove("hidden");
      $("#claimBtn").addEventListener("click", doClaim);
      return;
    }
    const entered = await api("/api/enter", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: claim.name, token: claim.token }),
    });
    const st = await api("/api/standings?name=" + encodeURIComponent(claim.name));
    const s = entered.season;
    box.innerHTML = `<h3>🌐 Global season — ${st.season}</h3>
      <div class="careerStats">
        <div><span>${st.mine ? "#" + st.mine.rank : "—"}</span><label>world rank</label></div>
        <div><span>${s.totalPts}</span><label>season pts</label></div>
        <div><span>${s.recruits}</span><label>flock</label></div>
        <div><span>×${s.multiplier.toFixed(2)}</span><label>flock boost</label></div>
      </div>
      <p class="dim">Every racer who joins from your link grows your Flock — each active recruit boosts your season points 2% (max ×1.20). ${st.entered} racers entered worldwide.</p>
      <table class="miniTable"><tbody>${st.seasonTop.slice(0, 10).map((r, i) =>
        `<tr class="${claim && r.name.toUpperCase() === claim.name.toUpperCase() ? "meRow" : ""}"><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.total} pts</td><td>${r.recruits ? "🪿×" + r.recruits : ""}</td></tr>`).join("")}</tbody></table>`;
    box.classList.remove("hidden");
  } catch {
    box.classList.add("hidden"); // no backend (local file mode) — stay quiet
  }
}
async function doClaim() {
  try {
    const ref = localStorage.getItem("gm_ref") || "";
    const out = await api("/api/claim", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: myName, ref }),
    });
    if (out.taken) { toast(`"${out.name}" is already claimed — race under a new name to claim one.`); return; }
    localStorage.setItem("gm_claim", JSON.stringify({ name: out.name, token: out.token }));
    toast("Claimed worldwide. Your points count now.");
    syncGlobal();
  } catch { toast("Couldn't reach the league right now."); }
}

// ---------- share ----------
function challengeURL() {
  const u = new URL(location.origin + location.pathname);
  u.searchParams.set("d", DAY);
  u.searchParams.set("vs", E.normName(myName));
  u.searchParams.set("skin", skinId);
  u.searchParams.set("ref", E.normName(myName));
  return u.toString();
}

async function copyChallenge() {
  const my = daily.lookup(myName);
  const txt = `My racer "${E.normName(myName)}" finished P${my.position}/${daily.results.length} in today's Grand Migration heat. Beat that — same river, same current: ${challengeURL()}`;
  try { await navigator.clipboard.writeText(txt); toast("Challenge copied — paste it in the group chat."); }
  catch { prompt("Copy your challenge:", txt); }
}

function makeCardPNG() {
  const my = daily.lookup(myName);
  const N = daily.results.length;
  const s = skin();
  const cv = document.createElement("canvas");
  cv.width = 1200; cv.height = 630;
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 1200, 630);
  g.addColorStop(0, s.water0); g.addColorStop(1, s.water1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 630);
  ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    for (let x = 0; x <= 1200; x += 12) {
      const y = 80 + i * 60 + E.dsin(x * 0.012 + i * 1.7) * 14;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 30px -apple-system,system-ui,sans-serif";
  ctx.fillText("THE GRAND MIGRATION", 60, 78);
  ctx.font = "24px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = s.accent;
  ctx.fillText(s.label.toUpperCase() + "  ·  HEAT #" + HEAT + "  ·  " + DAY, 60, 118);
  ctx.fillStyle = "#fff";
  ctx.font = "800 170px -apple-system,system-ui,sans-serif";
  ctx.fillText("P" + my.position, 60, 320);
  ctx.font = "600 44px -apple-system,system-ui,sans-serif";
  ctx.fillText(E.normName(myName), 60, 396);
  ctx.font = "30px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`beat ${E.percentile(my, N)}% of ${N} racers`, 60, 448);
  ctx.fillText(`time ${my.time.toFixed(1)}s   ·   distance sailed ×${my.sailed.toFixed(2)}${my.waterWorked ? "   ·   🌊 WATER WORKED" : ""}`, 60, 496);
  s.sprite(ctx, 1010, 240, 95, 0.12, false);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "26px -apple-system,system-ui,sans-serif";
  ctx.fillText("Race yours free — every day — " + (location.host || "grand migration"), 60, 576);
  return cv;
}

function downloadCard() {
  const cv = makeCardPNG();
  const a = document.createElement("a");
  a.download = `migration-heat${HEAT}-${E.normName(myName).replace(/\W+/g, "_")}.png`;
  a.href = cv.toDataURL("image/png");
  a.click();
  toast("Card saved. It's yours — post the L or the W.");
}

async function nativeShare() {
  const my = daily.lookup(myName);
  const data = {
    title: "The Grand Migration",
    text: `"${E.normName(myName)}" finished P${my.position}/${daily.results.length} in today's heat. Beat that:`,
    url: challengeURL(),
  };
  if (navigator.share) { try { await navigator.share(data); } catch { /* user cancelled */ } }
  else copyChallenge();
}

let toastT = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("on"), 2600);
}

// ---------- wire ----------
function setSkin(id) {
  skinId = id; localStorage.setItem("gm_skin", id); applySkinChrome();
}
$("#skinDuck").addEventListener("click", () => setSkin("duck"));
$("#skinCapy").addEventListener("click", () => setSkin("capy"));
$("#enterForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const n = E.normName($("#nameInput").value);
  if (!n) { toast("Name your racer first."); return; }
  myName = n; localStorage.setItem("gm_name", n);
  careerApplied = false;
  startRace();
});
$("#speedBtn").addEventListener("click", () => {
  speedIdx = (speedIdx + 1) % SPEEDS.length;
  localStorage.setItem("gm_speed", String(speedIdx));
  $("#speedBtn").textContent = "▶ " + SPEEDS[speedIdx] + "×";
});
$("#skipBtn").addEventListener("click", () => { if (playing) { playing.done = true; finishRace(); } });
$("#copyBtn").addEventListener("click", copyChallenge);
$("#cardBtn").addEventListener("click", downloadCard);
$("#shareBtn").addEventListener("click", nativeShare);
$("#againBtn").addEventListener("click", () => { location.href = location.pathname + (skinId !== "duck" ? "?skin=" + skinId : ""); });
$("#rewatchBtn").addEventListener("click", startRace);
window.addEventListener("resize", () => { if (playing && !playing.done) sizeCanvas(); });

applySkinChrome();
renderEnter();
})();
