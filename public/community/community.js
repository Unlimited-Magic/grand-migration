/* COMMUNITY DIVISIONS — team-vs-team race UI. Classic script; engine in ../js/engine.js (GMEngine). */
(function () {
"use strict";
const E = window.GMEngine;
const $ = (s) => document.querySelector(s);
const DAY = E.todayKey();
const EPOCH = Date.UTC(2026, 6, 1);
const HEAT = Math.max(1, Math.floor((Date.parse(DAY + "T00:00:00Z") - EPOCH) / 86400000) + 1);
const SPEED = 24;

const DEFAULTS = {
  teamAName: "Temple Beth El",
  teamBName: "Congregation Beth Shalom",
  teamA: ["Rabbi Feldman", "Cantor Ruth Levine", "Board President Marty Katz", "Sisterhood Debbie",
    "Hebrew School Dave", "Bar Mitzvah Eli", "Gift Shop Gail", "Kiddush Committee Stan",
    "Brotherhood Howard", "Membership Chair Nan"],
  teamB: ["Rabbi Adler", "Cantor Sam Weiss", "Board President Linda Ostrow", "Sisterhood Barb",
    "Religious School Jake", "Confirmation Class Mia", "Book Club Rachel", "Ritual Committee Lou",
    "Brotherhood Bob", "Fundraising Chair Ellen"],
};

function esc(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem("gm_community_v1"));
    if (s && s.teamA && s.teamB && s.teamA.length === 10 && s.teamB.length === 10) return s;
  } catch (e) { /* ignore corrupt storage */ }
  return { teamAName: DEFAULTS.teamAName, teamBName: DEFAULTS.teamBName, teamA: DEFAULTS.teamA.slice(), teamB: DEFAULTS.teamB.slice() };
}
function saveState() {
  localStorage.setItem("gm_community_v1", JSON.stringify(state));
}

let state = loadState();
let toastTimer = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("on"), 2200);
}

// ---------- setup panel ----------
function buildRosterInputs() {
  for (const team of ["A", "B"]) {
    const col = $("#roster" + team);
    col.innerHTML = "";
    for (let i = 0; i < 10; i++) {
      const inp = document.createElement("input");
      inp.className = "rosterSlot";
      inp.maxLength = 28;
      inp.placeholder = "Racer " + (i + 1);
      inp.value = state["team" + team][i] || "";
      inp.addEventListener("input", () => {
        state["team" + team][i] = inp.value;
        saveState();
      });
      col.appendChild(inp);
    }
  }
}

function renderSetup() {
  $("#teamAName").value = state.teamAName;
  $("#teamBName").value = state.teamBName;
  $("#heatTag").textContent = "HEAT #" + HEAT + " · " + DAY;
  buildRosterInputs();
}

$("#teamAName").addEventListener("input", (e) => { state.teamAName = e.target.value; saveState(); });
$("#teamBName").addEventListener("input", (e) => { state.teamBName = e.target.value; saveState(); });

$("#sampleA").addEventListener("click", () => {
  state.teamA = DEFAULTS.teamA.slice();
  state.teamAName = state.teamAName || DEFAULTS.teamAName;
  saveState(); buildRosterInputs(); toast("Sample roster filled — Team A");
});
$("#sampleB").addEventListener("click", () => {
  state.teamB = DEFAULTS.teamB.slice();
  state.teamBName = state.teamBName || DEFAULTS.teamBName;
  saveState(); buildRosterInputs(); toast("Sample roster filled — Team B");
});
$("#randomA").addEventListener("click", () => {
  state.teamA = E.rosterFor("COMMUNITY:A:" + DAY, 10);
  saveState(); buildRosterInputs(); toast("Randomized — Team A");
});
$("#randomB").addEventListener("click", () => {
  state.teamB = E.rosterFor("COMMUNITY:B:" + DAY, 10);
  saveState(); buildRosterInputs(); toast("Randomized — Team B");
});

// ---------- race name assembly (dedupe across both rosters) ----------
function buildRaceRoster() {
  const used = new Map();
  const roster = [];
  function addAll(list, team) {
    for (const raw of list) {
      let n = E.normName(raw);
      if (!n) continue;
      let key = n.toUpperCase();
      if (used.has(key)) {
        const c = used.get(key) + 1;
        used.set(key, c);
        n = n + " (" + c + ")";
        key = n.toUpperCase();
      }
      used.set(key, used.get(key) || 1);
      roster.push({ name: n, team });
    }
  }
  addAll(state.teamA, "A");
  addAll(state.teamB, "B");
  return roster;
}

// ---------- ducks ----------
function drawDuck(ctx, x, y, s, bob, ribbon, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bob * 0.25);
  if (glow) { ctx.shadowColor = "#fff"; ctx.shadowBlur = s * 1.1; }
  ctx.fillStyle = "#ffd447";
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#eab520";
  ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.05, s * 0.45, s * 0.3, 0.5, 0, 7); ctx.fill();
  if (ribbon) {
    ctx.fillStyle = ribbon;
    ctx.beginPath(); ctx.ellipse(0, -s * 0.05, s * 0.28, s * 0.5, 0, 0, 7); ctx.fill();
  }
  ctx.fillStyle = "#ffdf6b";
  ctx.beginPath(); ctx.arc(0, s * 0.75, s * 0.55, 0, 7); ctx.fill();
  ctx.fillStyle = "#ff8c00";
  ctx.beginPath(); ctx.ellipse(0, s * 1.25, s * 0.28, s * 0.16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#082033";
  ctx.beginPath(); ctx.arc(-s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.arc(s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.fill();
  ctx.restore();
}

// ---------- race state ----------
let roster = null;       // [{name, team}]
let teamOf = null;       // Map(nameKey -> 'A'|'B')
let daily = null;        // authoritative scored results (E.dailyResult)
let live = null;         // separate race object driven for animation
let raf = null;
let ticker = null;
let lastClipT = 0;
let ended = false;

function show(view) {
  for (const v of ["setup", "raceC", "resultsC"]) $("#" + v).classList.toggle("hidden", v !== view);
}

function startRace() {
  roster = buildRaceRoster();
  const teamACount = roster.filter((r) => r.team === "A").length;
  const teamBCount = roster.filter((r) => r.team === "B").length;
  if (!state.teamAName.trim() || !state.teamBName.trim()) { toast("Name both teams first"); return; }
  if (teamACount === 0 || teamBCount === 0) { toast("Add at least one racer per team"); return; }

  const names = roster.map((r) => r.name);
  teamOf = new Map(roster.map((r) => [r.name.toUpperCase(), r.team]));
  daily = E.dailyResult(DAY, names, 0);
  live = E.makeRace(DAY, names, 0);
  ended = false;
  ticker = E.mulberry32(E.xmur3("CCLIP:" + DAY)());
  lastClipT = 0;

  $("#raceCHeat").textContent = "HEAT #" + HEAT + " · " + state.teamAName + " vs " + state.teamBName;
  $("#raceCTicker").textContent = "🎙 They're in the water…";
  show("raceC");
  sizeCanvas();
  let last = performance.now();
  let simAcc = 0;
  function tick(now) {
    if (ended) return;
    const dtReal = Math.min(1.0, (now - last) / 1000);
    last = now;
    simAcc += dtReal * SPEED;
    let alive = 1;
    while (simAcc >= E.DT) {
      simAcc -= E.DT;
      alive = E.step(live);
      if (alive === 0) break;
    }
    if (now - lastClipT > 3200 && alive > 0) {
      lastClipT = now;
      let lead = live.racers[0];
      for (const r of live.racers) if (!r.done && r.y > lead.y) lead = r;
      const CLIPS = [
        "{L} has found the fast water!",
        "{L} leads — the current is DOING THINGS.",
        "{L} working the inside line like a pro.",
        "An eddy! {L} holds on!",
        "{L} refuses to acknowledge the rocks.",
        "Both benches on their feet for {L}.",
      ];
      $("#raceCTicker").textContent = "🎙 " + CLIPS[(ticker() * CLIPS.length) | 0].replace("{L}", lead.name);
    }
    drawRace();
    if (alive === 0) {
      ended = true;
      setTimeout(finishRace, 800);
      return;
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
}

function sizeCanvas() {
  const cv = $("#raceCanvas");
  const w = Math.min(cv.parentElement.clientWidth, 640);
  cv.width = w * devicePixelRatio;
  cv.height = Math.floor(Math.min(innerHeight * 0.56, 520) * devicePixelRatio);
  cv.style.width = w + "px";
  cv.style.height = cv.height / devicePixelRatio + "px";
}

function drawRace() {
  const cv = $("#raceCanvas"), ctx = cv.getContext("2d");
  const scale = cv.width / E.COURSE.width;
  let target = live.racers[0];
  for (const r of live.racers) if (!r.done && r.y > (target.done ? -1 : target.y)) target = r;
  const t = live.clock;
  const camY = Math.max(0, Math.min(E.COURSE.length - cv.height / scale + 80, target.y - cv.height / scale * 0.3));
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
  ctx.fillStyle = "#092a4a";
  ctx.fillRect(0, 0, 6 * devicePixelRatio, cv.height);
  ctx.fillRect(cv.width - 6 * devicePixelRatio, 0, 6 * devicePixelRatio, cv.height);

  for (const rock of live.course.rocks) {
    const [rx, ry] = w2s(rock.x, rock.y);
    if (ry < -60 || ry > cv.height + 60) continue;
    ctx.fillStyle = "#5c6b73";
    ctx.beginPath(); ctx.arc(rx, ry, rock.r * scale, 0, 7); ctx.fill();
  }

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

  const spriteS = 8 * devicePixelRatio;
  for (const r of live.racers) {
    if (r.done) continue;
    const [x, y] = w2s(r.x, r.y);
    if (y < -30 || y > cv.height + 30) continue;
    const team = teamOf.get(r.name.toUpperCase());
    const ribbon = team === "A" ? "#ffd447" : "#5fd3c4";
    const bob = E.dsin(t * 2.1 + r.t.phase);
    drawDuck(ctx, x, y, spriteS, bob, ribbon, false);
    ctx.font = `${10 * devicePixelRatio}px -apple-system,system-ui,sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillText(r.name, x, y - spriteS * 1.9);
  }

  const mmX = cv.width - 14 * devicePixelRatio;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(mmX - 4 * devicePixelRatio, 8 * devicePixelRatio, 8 * devicePixelRatio, cv.height - 16 * devicePixelRatio);
  for (const r of live.racers) {
    if (r.done) continue;
    const team = teamOf.get(r.name.toUpperCase());
    const my_ = 8 * devicePixelRatio + (r.y / E.COURSE.length) * (cv.height - 16 * devicePixelRatio);
    ctx.fillStyle = team === "A" ? "#ffd447" : "#5fd3c4";
    ctx.fillRect(mmX - 2 * devicePixelRatio, my_, 4 * devicePixelRatio, 2 * devicePixelRatio);
  }
}

$("#skipCBtn").addEventListener("click", () => {
  if (ended || !live) return;
  cancelAnimationFrame(raf);
  let guard = 0;
  while (E.step(live) > 0 && guard < 100000) guard++;
  ended = true;
  finishRace();
});

function finishRace() {
  const N = daily.results.length;
  const rows = daily.results.map((r) => {
    const team = teamOf.get(r.name.toUpperCase());
    return { r, team, pts: E.pointsFor(r, N) };
  });
  const teamARows = rows.filter((x) => x.team === "A");
  const teamBRows = rows.filter((x) => x.team === "B");
  const teamATotal = teamARows.reduce((s, x) => s + x.pts, 0);
  const teamBTotal = teamBRows.reduce((s, x) => s + x.pts, 0);

  $("#resultsCHeat").textContent = "HEAT #" + HEAT + " · " + DAY + " · community division";
  const bannerBox = $("#winnerBanner");
  if (teamATotal === teamBTotal) {
    bannerBox.innerHTML = `<div class="winnerBanner">🤝 IT'S A TIE</div><div class="scoreLine">${teamATotal} — ${teamBTotal}</div><div class="vsLine">${esc(state.teamAName)} vs ${esc(state.teamBName)}</div>`;
  } else {
    const win = teamATotal > teamBTotal ? state.teamAName : state.teamBName;
    const lose = teamATotal > teamBTotal ? state.teamBName : state.teamAName;
    const hi = Math.max(teamATotal, teamBTotal), lo = Math.min(teamATotal, teamBTotal);
    bannerBox.innerHTML = `<div class="winnerBanner">🏆 ${esc(win)} WINS</div><div class="scoreLine">${hi} — ${lo}</div><div class="vsLine">vs ${esc(lose)}</div>`;
  }

  const mvpA = teamARows[0], mvpB = teamBRows[0];
  $("#mvpRow").innerHTML = [
    mvpA ? `<div class="mvpCard"><div class="mvpTeam">MVP · ${esc(state.teamAName)}</div><div class="mvpName">${esc(mvpA.r.name)}</div><div class="mvpStat">P${mvpA.r.position} of ${N} · +${mvpA.pts} pts</div></div>` : "",
    mvpB ? `<div class="mvpCard"><div class="mvpTeam">MVP · ${esc(state.teamBName)}</div><div class="mvpName">${esc(mvpB.r.name)}</div><div class="mvpStat">P${mvpB.r.position} of ${N} · +${mvpB.pts} pts</div></div>` : "",
  ].join("");

  $("#legendRow").innerHTML = `<span><i style="background:#ffd447"></i>${esc(state.teamAName)}</span><span><i style="background:#5fd3c4"></i>${esc(state.teamBName)}</span>`;

  $("#standingsBody").innerHTML = rows.map((x) => `
    <tr>
      <td>P${x.r.position}</td>
      <td><span class="standTeam"><i style="background:${x.team === "A" ? "#ffd447" : "#5fd3c4"}"></i>${esc(x.r.name)}</span></td>
      <td>${x.r.time.toFixed(1)}s</td>
      <td>+${x.pts}</td>
    </tr>`).join("");

  show("resultsC");
  window.__gmLastResult = { teamATotal, teamBTotal, N };
}

$("#rewatchBtn").addEventListener("click", () => { startRace(); });
$("#editBtn").addEventListener("click", () => { show("setup"); });
$("#raceBtn").addEventListener("click", () => { startRace(); });

// ---------- share card ----------
function buildShareCard() {
  const cv = document.createElement("canvas");
  cv.width = 1200; cv.height = 630;
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 630);
  g.addColorStop(0, "#0c1e30"); g.addColorStop(1, "#06121f");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 630);

  ctx.textAlign = "center";
  ctx.fillStyle = "#8fa8bc";
  ctx.font = "600 24px -apple-system,system-ui,sans-serif";
  ctx.fillText("THE GRAND MIGRATION · COMMUNITY DIVISIONS", 600, 90);

  const { teamATotal, teamBTotal } = window.__gmLastResult || { teamATotal: 0, teamBTotal: 0 };
  const winner = teamATotal >= teamBTotal ? state.teamAName : state.teamBName;
  const winColor = teamATotal >= teamBTotal ? "#ffd447" : "#5fd3c4";
  ctx.fillStyle = winColor;
  ctx.font = "800 46px -apple-system,system-ui,sans-serif";
  ctx.fillText((teamATotal === teamBTotal ? "IT'S A TIE" : "🏆 " + winner.toUpperCase() + " WINS"), 600, 220);

  ctx.fillStyle = "#eaf2f8";
  ctx.font = "800 96px -apple-system,system-ui,sans-serif";
  ctx.fillText(`${teamATotal} — ${teamBTotal}`, 600, 340);

  ctx.font = "600 26px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "#ffd447";
  ctx.fillText(state.teamAName, 340, 420);
  ctx.fillStyle = "#5fd3c4";
  ctx.fillText(state.teamBName, 860, 420);

  ctx.fillStyle = "#8fa8bc";
  ctx.font = "500 20px -apple-system,system-ui,sans-serif";
  ctx.fillText("HEAT #" + HEAT + " · " + DAY + " · deterministic river, everyone gets the same result", 600, 560);

  return cv.toDataURL("image/png");
}

$("#cardCBtn").addEventListener("click", () => {
  const url = buildShareCard();
  const a = document.createElement("a");
  a.href = url;
  a.download = "community-division-" + DAY + ".png";
  a.click();
  toast("Card saved");
});

$("#copyCBtn").addEventListener("click", async () => {
  const { teamATotal, teamBTotal } = window.__gmLastResult || { teamATotal: 0, teamBTotal: 0 };
  const winner = teamATotal >= teamBTotal ? state.teamAName : state.teamBName;
  const line = teamATotal === teamBTotal
    ? `🤝 ${state.teamAName} tied ${state.teamBName} ${teamATotal}-${teamBTotal} in today's Grand Migration Community Division!`
    : `🏆 ${winner} beat ${teamATotal >= teamBTotal ? state.teamBName : state.teamAName} ${Math.max(teamATotal, teamBTotal)}-${Math.min(teamATotal, teamBTotal)} in today's Grand Migration Community Division!`;
  try {
    await navigator.clipboard.writeText(line);
    toast("Copied to clipboard");
  } catch (e) {
    toast("Copy failed — select and copy manually");
  }
});

// ---------- livery mockups ----------
function drawLivery(canvasId, beakColor) {
  const cv = $(canvasId), ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, cv.width, cv.height);
  const s = 24;
  ctx.save();
  ctx.translate(cv.width / 2, cv.height / 2 + 6);
  ctx.fillStyle = "#ffd447";
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#eab520";
  ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.05, s * 0.45, s * 0.3, 0.5, 0, 7); ctx.fill();
  ctx.fillStyle = "#ffdf6b";
  ctx.beginPath(); ctx.arc(0, s * 0.75, s * 0.55, 0, 7); ctx.fill();
  ctx.fillStyle = beakColor;
  ctx.beginPath(); ctx.ellipse(0, s * 1.25, s * 0.3, s * 0.18, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#082033";
  ctx.beginPath(); ctx.arc(-s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.arc(s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.fill();
  ctx.restore();
}

$("#giveBtn").addEventListener("click", () => {
  toast("Preview — payments arm at launch");
});

// ---------- init ----------
renderSetup();
show("setup");
drawLivery("#liveryBronze", "#cd7f32");
drawLivery("#liverySilver", "#d8d8d8");
drawLivery("#liveryGold", "#ffd447");

})();
