(function () {
"use strict";

const E = window.GMEngine;
const DAY = E.todayKey();

const $ = (sel) => document.querySelector(sel);
function esc(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }

const FORFEITS = [
  { id: "soggy-baron", title: "The Rename", text: 'Loser changes the group chat name to "Soggy Baron" for 24 hours. No renaming it back early.' },
  { id: "l-card", title: "The L Card", text: "Loser posts the L card to their story. No caption. No context. No explaining." },
  { id: "profile-pic", title: "The Makeover", text: "Winner picks the loser's profile picture for 24 hours. Winner's choice is final." },
  { id: "voice-memo", title: "The Apology", text: "Loser sends the group a 30-second voice memo apologizing to the river, sincerely." },
  { id: "quack-only", title: "The Vow of Quack", text: 'Every message the loser sends for the next 2 hours must end in "quack."' },
  { id: "compliment-tour", title: "The Compliment Tour", text: "Loser DMs three people, unprompted, with a wildly specific compliment about their haircut." },
  { id: "walk-of-shame", title: "The Photo", text: 'Loser posts a photo holding a handwritten sign that reads "I LOST TO [WINNER]."' },
  { id: "duck-emoji", title: "The Duck Tongue", text: "Loser communicates only in duck emojis for the next 2 hours. 🦆 is a full sentence now." },
  { id: "buy-coffee", title: "The Tribute", text: "Loser buys the winner a coffee. In person. Within the week. No Venmo shortcuts." },
  { id: "ringtone", title: "The Quack Tone", text: "Loser sets their ringtone to a duck quack for seven days. Full volume, in public." },
  { id: "confession", title: "The Confession", text: "Loser publicly confesses their most embarrassing autocorrect fail in the group chat." },
  { id: "caption-lock", title: "The Caption Lock", text: 'Every post the loser makes today must be captioned "I lost a duck race." No exceptions.' },
];
function forfeitById(id) { return FORFEITS.find((f) => f.id === id) || null; }

let selectedForfeit = null;
let duel = null; // { race, dateKey, nameA, nameB, forfeit, last, done }

// ---------- setup screen ----------

function renderForfeitGrid() {
  const grid = $("#forfeitGrid");
  grid.innerHTML = FORFEITS.map((f) =>
    `<button type="button" class="forfeitCard" data-id="${f.id}">
      <div class="fTitle">${esc(f.title)}</div>
      <div class="fText">${esc(f.text)}</div>
    </button>`
  ).join("");
  grid.querySelectorAll(".forfeitCard").forEach((btn) => {
    btn.addEventListener("click", () => selectForfeit(btn.dataset.id));
  });
}

function selectForfeit(id) {
  selectedForfeit = forfeitById(id);
  $("#forfeitGrid").querySelectorAll(".forfeitCard").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.id === id);
  });
  validateSetup();
}

function validateSetup() {
  const a = E.normName($("#nameA").value);
  const b = E.normName($("#nameB").value);
  const ok = a && b && a.toUpperCase() !== b.toUpperCase() && selectedForfeit;
  $("#duelBtn").disabled = !ok;
}

function readChallenge() {
  const p = new URLSearchParams(location.search);
  const vs = p.get("vs");
  const f = p.get("f");
  if (!vs) return;
  const parts = vs.split("~");
  if (parts.length !== 2) return;
  const [a, b] = parts.map((s) => E.normName(decodeURIComponent(s)));
  if (!a || !b) return;
  $("#nameA").value = a;
  $("#nameB").value = b;
  const forfeit = forfeitById(f) || FORFEITS[0];
  selectForfeit(forfeit.id);
  const note = $("#challengeNote");
  note.innerHTML = `\u{1F3AF} Challenge received: <b>${esc(a)}</b> vs <b>${esc(b)}</b> — forfeit "<b>${esc(forfeit.title)}</b>". Today's river is fixed, so hitting DUEL replays the exact same race they saw.`;
  note.classList.remove("hidden");
}

// ---------- race ----------

function startDuel() {
  const nameA = E.normName($("#nameA").value);
  const nameB = E.normName($("#nameB").value);
  if (!nameA || !nameB || !selectedForfeit) return;
  duel = {
    dateKey: DAY, nameA, nameB, forfeit: selectedForfeit,
    race: E.makeRace(DAY, [nameA, nameB], 0),
    last: 0, simAcc: 0, done: false,
  };
  $("#raceLabel").textContent = nameA + " vs " + nameB;
  $("#ticker").textContent = "\u{1F399} They're in the water…";
  show("race");
  sizeCanvas();
  requestAnimationFrame(tick);
}

function sizeCanvas() {
  const cv = $("#river");
  const w = Math.min(cv.parentElement.clientWidth, 640);
  cv.width = w * devicePixelRatio;
  cv.height = Math.floor(Math.min(innerHeight * 0.6, 540) * devicePixelRatio);
  cv.style.width = w + "px";
  cv.style.height = cv.height / devicePixelRatio + "px";
}

const SPEED = 8;
const TICKER_LINES = [
  "{L} catches a clean line through the middle.",
  "{L} finds the current and doesn't let go.",
  "It's tight out there — nobody's giving an inch.",
  "{L} threads past the rocks like it planned that.",
  "The eddies are chaos today. Pure chaos.",
  "{L} is sailing further than it needs to — style points don't count.",
];

function tick(now) {
  if (!duel || duel.done) return;
  const dtReal = Math.min(1.0, (now - (duel.last || now)) / 1000);
  duel.last = now;
  duel.simAcc += dtReal * SPEED;
  let alive = 1;
  while (duel.simAcc >= E.DT) {
    duel.simAcc -= E.DT;
    alive = E.step(duel.race);
    if (alive === 0) break;
  }
  if (!duel.lastClip || now - duel.lastClip > 2600) {
    duel.lastClip = now;
    let lead = duel.race.racers[0];
    for (const r of duel.race.racers) if (!r.done && r.y > lead.y) lead = r;
    const line = TICKER_LINES[Math.floor((duel.race.clock * 3.7) % TICKER_LINES.length)].replace("{L}", esc(lead.name));
    $("#ticker").textContent = "\u{1F399} " + line;
  }
  drawRace();
  $("#raceClock").textContent = duel.race.clock.toFixed(0) + "s";
  if (alive === 0) {
    duel.done = true;
    E.runRace(duel.race);
    setTimeout(finishDuel, 700);
    return;
  }
  requestAnimationFrame(tick);
}

function skipToEnd() {
  if (!duel || duel.done) return;
  E.runRace(duel.race);
  duel.done = true;
  drawRace();
  finishDuel();
}

function drawDuckSprite(ctx, x, y, s, bob, tint) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bob * 0.25);
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = s * 0.8;
  ctx.fillStyle = tint;
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.8, 0, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffdf6b";
  ctx.beginPath(); ctx.arc(0, s * 0.75, s * 0.55, 0, 7); ctx.fill();
  ctx.fillStyle = "#ff8c00";
  ctx.beginPath(); ctx.ellipse(0, s * 1.25, s * 0.28, s * 0.16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#082033";
  ctx.beginPath(); ctx.arc(-s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.arc(s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.fill();
  ctx.restore();
}

function drawRace() {
  const cv = $("#river"), ctx = cv.getContext("2d");
  const race = duel.race;
  const scale = cv.width / E.COURSE.width;
  const t = race.clock;
  let target = race.racers[0];
  for (const r of race.racers) if (!r.done && r.y > (target.done ? -1 : target.y)) target = r;
  if (target.done) target = race.racers.reduce((a, b) => (a.y > b.y ? a : b));
  const camY = Math.max(0, Math.min(E.COURSE.length - cv.height / scale + 80, target.y - (cv.height / scale) * 0.35));
  const w2s = (x, y) => [x * scale, (y - camY) * scale];

  const g = ctx.createLinearGradient(0, 0, 0, cv.height);
  g.addColorStop(0, "#0d3b66"); g.addColorStop(1, "#1b6ca8");
  ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 2 * devicePixelRatio;
  for (let i = 0; i < 14; i++) {
    const wx = (i * 73) % E.COURSE.width;
    const wy = (i * 431 + t * 26) % E.COURSE.length;
    const [sx, sy] = w2s(wx + E.dsin(wy * 0.02 + i) * 6, wy);
    if (sy < -40 || sy > cv.height + 40) continue;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + E.dsin(i + t * 0.4) * 6 * devicePixelRatio, sy + 26 * devicePixelRatio); ctx.stroke();
  }

  ctx.fillStyle = "#123049";
  ctx.fillRect(0, 0, 6 * devicePixelRatio, cv.height);
  ctx.fillRect(cv.width - 6 * devicePixelRatio, 0, 6 * devicePixelRatio, cv.height);

  for (const e of race.course.eddies) {
    const [ex, ey] = w2s(e.x, e.y);
    if (ey < -e.r * scale || ey > cv.height + e.r * scale) continue;
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1.5 * devicePixelRatio;
    for (let k = 1; k <= 2; k++) {
      ctx.beginPath();
      ctx.arc(ex, ey, e.r * scale * 0.4 * k, t * e.spin + k, t * e.spin + k + 4.6);
      ctx.stroke();
    }
  }
  for (const rock of race.course.rocks) {
    const [rx, ry] = w2s(rock.x, rock.y);
    if (ry < -60 || ry > cv.height + 60) continue;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath(); ctx.arc(rx, ry - rock.r * scale * 0.4, rock.r * scale * 1.15, 3.4, 6.0); ctx.fill();
    ctx.fillStyle = "#5c6b73";
    ctx.beginPath(); ctx.arc(rx, ry, rock.r * scale, 0, 7); ctx.fill();
  }
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

  const spriteS = 11 * devicePixelRatio;
  const tints = ["#ffd447", "#ff7a6b"];
  race.racers.forEach((r, i) => {
    if (r.done) return;
    const [x, y] = w2s(r.x, r.y);
    if (y < -30 || y > cv.height + 30) return;
    const bob = E.dsin(t * 2.1 + r.t.phase);
    drawDuckSprite(ctx, x, y, spriteS, bob, tints[i] || "#ffd447");
    ctx.font = `${12 * devicePixelRatio}px -apple-system,system-ui,sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(r.name, x, y - spriteS * 2.2);
  });
}

// ---------- results ----------

function updateRecord(name, won) {
  const key = E.normName(name).toUpperCase();
  let rec;
  try { rec = JSON.parse(localStorage.getItem("duel_record_v1")) || {}; } catch { rec = {}; }
  const cur = rec[key] || { name: E.normName(name), wins: 0, losses: 0 };
  if (won) cur.wins++; else cur.losses++;
  rec[key] = cur;
  localStorage.setItem("duel_record_v1", JSON.stringify(rec));
  return cur;
}

function challengeURL(nameA, nameB, forfeitId) {
  const u = new URL(location.origin + location.pathname);
  u.searchParams.set("vs", encodeURIComponent(nameA) + "~" + encodeURIComponent(nameB));
  u.searchParams.set("f", forfeitId);
  return u.toString();
}

function finishDuel() {
  const results = duel.race.results;
  const winner = results[0], loser = results[1];
  const record = updateRecord(duel.nameA, E.normName(duel.nameA).toUpperCase() === E.normName(winner.name).toUpperCase());
  updateRecord(duel.nameB, E.normName(duel.nameB).toUpperCase() === E.normName(winner.name).toUpperCase());

  $("#verdictPanel").innerHTML = `
    <div class="verdictKicker">${esc(DAY)} · verdict is final</div>
    <div class="verdictLine"><span class="winnerName">${esc(winner.name)}</span> wins.<br><span class="loserName">${esc(loser.name)}</span> answers for it.</div>
    <div class="verdictSub">Forfeit: <b>${esc(duel.forfeit.title)}</b></div>
    <div class="verdictStats">
      <div><span>${winner.time.toFixed(1)}s</span><label>winning time</label></div>
      <div><span>+${(loser.time - winner.time).toFixed(1)}s</span><label>margin</label></div>
      <div><span>×${loser.sailed.toFixed(2)}</span><label>loser sailed</label></div>
    </div>
    <div class="recordLine">Your record (${esc(E.normName(duel.nameA))}): <b>${record.wins}W – ${record.losses}L</b></div>`;

  drawSummonsCard(winner.name, loser.name, duel.forfeit, DAY);

  $("#downloadBtn").onclick = () => {
    const cv = $("#summonsCanvas");
    const a = document.createElement("a");
    a.download = `forfeit-${E.normName(loser.name).replace(/\W+/g, "_")}-${DAY}.png`;
    a.href = cv.toDataURL("image/png");
    a.click();
    toast("Card saved. Serve it.");
  };
  $("#copyBtn").onclick = async () => {
    const url = challengeURL(duel.nameA, duel.nameB, duel.forfeit.id);
    const txt = `${winner.name} beat ${loser.name} in today's Forfeit Duel. Forfeit: ${duel.forfeit.title}. Verify it yourself: ${url}`;
    try { await navigator.clipboard.writeText(txt); toast("Challenge link copied."); }
    catch { prompt("Copy your challenge:", txt); }
  };

  renderRematch();
  show("results");
}

function drawSummonsCard(winnerName, loserName, forfeit, dateKey) {
  const cv = $("#summonsCanvas"), ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;

  ctx.fillStyle = "#081627"; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0c1e30"); g.addColorStop(1, "#081422");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#ffd447"; ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(38, 38, W - 76, H - 76);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd447";
  ctx.font = "700 26px -apple-system,system-ui,sans-serif";
  ctx.fillText("⚖️ BY ORDER OF THE RIVER COURT ⚖️", W / 2, 100);

  ctx.fillStyle = "#eaf2f8";
  ctx.font = "800 46px -apple-system,system-ui,sans-serif";
  ctx.fillText("OFFICIAL FORFEIT SUMMONS", W / 2, 165);

  ctx.fillStyle = "#8fa8bc";
  ctx.font = "20px -apple-system,system-ui,sans-serif";
  ctx.fillText("Case No. " + dateKey.replace(/-/g, "") + " — Forfeit Duels", W / 2, 200);

  ctx.fillStyle = "#8fa8bc";
  ctx.font = "18px -apple-system,system-ui,sans-serif";
  ctx.fillText("THE COURT FINDS, BY UNANIMOUS CURRENT:", W / 2, 270);

  ctx.fillStyle = "#ff7a6b";
  ctx.font = "800 60px -apple-system,system-ui,sans-serif";
  wrapCentered(ctx, loserName.toUpperCase(), W / 2, 340, W - 140, 62);

  ctx.fillStyle = "#eaf2f8";
  ctx.font = "26px -apple-system,system-ui,sans-serif";
  ctx.fillText("GUILTY OF LOSING", W / 2, 430);

  ctx.strokeStyle = "#204866"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(90, 470); ctx.lineTo(W - 90, 470); ctx.stroke();

  ctx.fillStyle = "#8fa8bc";
  ctx.font = "18px -apple-system,system-ui,sans-serif";
  ctx.fillText("IS HEREBY SENTENCED TO:", W / 2, 520);

  ctx.fillStyle = "#ffd447";
  ctx.font = "700 22px -apple-system,system-ui,sans-serif";
  wrapCentered(ctx, forfeit.title.toUpperCase(), W / 2, 565, W - 140, 28);

  ctx.fillStyle = "#eaf2f8";
  ctx.font = "22px -apple-system,system-ui,sans-serif";
  wrapCentered(ctx, forfeit.text, W / 2, 630, W - 160, 32);

  ctx.strokeStyle = "#204866"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(90, 830); ctx.lineTo(W - 90, 830); ctx.stroke();

  ctx.fillStyle = "#8fa8bc";
  ctx.font = "18px -apple-system,system-ui,sans-serif";
  ctx.fillText("SO ORDERED, ON THIS DAY,", W / 2, 875);
  ctx.fillStyle = "#eaf2f8";
  ctx.font = "700 24px -apple-system,system-ui,sans-serif";
  ctx.fillText(dateKey, W / 2, 908);

  ctx.fillStyle = "#8fa8bc";
  ctx.font = "18px -apple-system,system-ui,sans-serif";
  ctx.fillText("VICTOR & SIGNATORY", W / 2, 960);
  ctx.fillStyle = "#ffd447";
  ctx.font = "italic 700 30px -apple-system,system-ui,sans-serif";
  wrapCentered(ctx, winnerName, W / 2, 1000, W - 140, 34);

  ctx.save();
  ctx.translate(W - 175, 1000);
  ctx.rotate(-0.28);
  ctx.strokeStyle = "#ff7a6b"; ctx.lineWidth = 5;
  ctx.strokeRect(-95, -34, 190, 68);
  ctx.fillStyle = "#ff7a6b";
  ctx.font = "800 26px -apple-system,system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SERVED", 0, 9);
  ctx.restore();

  ctx.fillStyle = "#4a6378";
  ctx.font = "16px -apple-system,system-ui,sans-serif";
  ctx.fillText((location.host || "forfeit duels") + location.pathname, W / 2, H - 46);
}

function wrapCentered(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = "", lines = [];
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
}

// ---------- rematch ----------

function msUntilNextUTCMidnight() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return next.getTime() - now.getTime();
}

let rematchTimer = null;
function renderRematch() {
  const box = $("#rematchPanel");
  box.innerHTML = `<div class="sectionLabel">Rematch</div>
    <div>Tomorrow's river is a different draw — same names, new current.</div>
    <div class="countdown" id="rematchClock"></div>
    <button class="wideBtn" id="rematchBtn" type="button" disabled>Rematch unlocks at 00:00 UTC</button>`;
  clearInterval(rematchTimer);
  const tick2 = () => {
    const ms = msUntilNextUTCMidnight();
    if (ms <= 0) {
      $("#rematchClock").textContent = "The river has turned over.";
      const btn = $("#rematchBtn");
      if (btn) { btn.disabled = false; btn.textContent = "Rematch ⚔️"; }
      clearInterval(rematchTimer);
      return;
    }
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    $("#rematchClock").textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  tick2();
  rematchTimer = setInterval(tick2, 1000);
  $("#rematchBtn").addEventListener("click", () => location.reload());
}

// ---------- chrome ----------

function show(view) {
  ["setup", "race", "results"].forEach((v) => {
    const el = $("#" + v);
    if (el) el.classList.toggle("hidden", v !== view);
  });
}

let toastT = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("on"), 2600);
}

function wire() {
  renderForfeitGrid();
  readChallenge();
  $("#nameA").addEventListener("input", validateSetup);
  $("#nameB").addEventListener("input", validateSetup);
  $("#duelBtn").addEventListener("click", startDuel);
  $("#skipBtn").addEventListener("click", skipToEnd);
  window.addEventListener("resize", () => { if (duel && !duel.done) sizeCanvas(); });
  validateSetup();
}

wire();
})();
