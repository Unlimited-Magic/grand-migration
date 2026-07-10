/* PASTE-A-RACE — race any pasted list of names on today's Grand Migration river.
 * Uses js/engine.js (GMEngine) with fieldSize=0: ONLY the pasted names race, no filler roster.
 */
(function () {
"use strict";
const E = window.GMEngine;
const $ = (s) => document.querySelector(s);
const MAX_NAMES = 200;
const MAX_SHARE_URL = 1900; // stay well under practical browser/URL-bar limits

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// ---------- name parsing ----------
function parseNames(text) {
  const raw = String(text).split(/[\n,]+/);
  const seen = new Set();
  const out = [];
  for (const line of raw) {
    let n = E.normName(line).replace(/~/g, "").trim();
    if (!n) continue;
    const k = n.toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

function updateCount() {
  const all = parseNames($("#nameBox").value);
  const capped = all.length > MAX_NAMES;
  $("#countLabel").textContent = `${Math.min(all.length, MAX_NAMES)} name${all.length === 1 ? "" : "s"}`;
  const warn = $("#countWarn");
  if (capped) {
    warn.textContent = `only the first ${MAX_NAMES} will race`;
    warn.classList.remove("hidden");
  } else warn.classList.add("hidden");
  return all.slice(0, MAX_NAMES);
}

// ---------- deterministic racer color ----------
function hueFor(name) {
  return E.xmur3("COLOR:" + name.toUpperCase())() % 360;
}

function drawRacer(ctx, x, y, s, bob, hue, highlight) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bob * 0.25);
  if (highlight) { ctx.shadowColor = "#fff"; ctx.shadowBlur = s * 1.3; }
  ctx.fillStyle = `hsl(${hue},70%,60%)`;
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = `hsl(${hue},65%,42%)`;
  ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.05, s * 0.45, s * 0.3, 0.5, 0, 7); ctx.fill();
  ctx.fillStyle = `hsl(${hue},78%,72%)`;
  ctx.beginPath(); ctx.arc(0, s * 0.75, s * 0.55, 0, 7); ctx.fill();
  ctx.fillStyle = `hsl(${(hue + 30) % 360},80%,55%)`;
  ctx.beginPath(); ctx.ellipse(0, s * 1.25, s * 0.28, s * 0.16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#082033";
  ctx.beginPath(); ctx.arc(-s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.arc(s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.fill();
  ctx.restore();
}

// ---------- state ----------
const params = new URLSearchParams(location.search);
const dParam = params.get("d");
const nParam = params.get("n");
const TODAY = E.todayKey();
const DAY = /^\d{4}-\d{2}-\d{2}$/.test(dParam || "") ? dParam : TODAY;
const IS_TODAY = DAY === TODAY;

let currentNames = [];
let daily = null;    // authoritative full-result E.dailyResult(...)
let playing = null;  // live animation state
let toastT = null;

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("on"), 2600);
}

// ---------- views ----------
function show(view) {
  for (const v of ["enter", "race", "results"]) $("#" + v).classList.toggle("hidden", v !== view);
}

function renderHeatLine() {
  $("#heatLine").textContent = DAY + (IS_TODAY ? " · today's river" : " · replay");
}

// ---------- share URL ----------
function buildShareURL(names, dateKey) {
  const base = location.origin + location.pathname;
  let list = names.slice();
  let url = "";
  while (list.length > 0) {
    const u = new URL(base);
    u.searchParams.set("d", dateKey);
    u.searchParams.set("n", list.join("~"));
    url = u.toString();
    if (url.length <= MAX_SHARE_URL) break;
    list = list.slice(0, Math.max(1, list.length - 5));
  }
  return { url, includedCount: list.length, totalCount: names.length };
}

// ---------- race playback ----------
const CLIPS = [
  "{L} has found the fast water!",
  "{L} leads — the current is DOING THINGS.",
  "Stewards watching {L} closely. For vibes.",
  "{L} working the inside line like a professional.",
  "An eddy! {L} holds on!",
  "{L} in front. Everyone else is furious.",
  "Absolute scenes. {L} by half a length.",
  "{L} refuses to acknowledge the rocks.",
];

function sizeCanvas() {
  const cv = $("#river");
  const w = Math.min(cv.parentElement.clientWidth, 640);
  cv.width = w * devicePixelRatio;
  cv.height = Math.floor(Math.min(innerHeight * 0.62, 560) * devicePixelRatio);
  cv.style.width = w + "px";
  cv.style.height = cv.height / devicePixelRatio + "px";
}

function currentLeader() {
  let lead = playing.live.racers[0];
  for (const r of playing.live.racers) if (!r.done && r.y > (lead.done ? -1 : lead.y)) lead = r;
  return lead;
}

function enoughDone() {
  let n = 0;
  for (const r of playing.live.racers) if (r.done) n++;
  return n >= Math.min(playing.live.racers.length, 10);
}

function startRace(names, dateKey) {
  currentNames = names;
  daily = E.dailyResult(dateKey, names, 0);
  const live = E.makeRace(dateKey, names, 0);
  playing = {
    live, last: performance.now(), simAcc: 0,
    ticker: E.mulberry32(E.xmur3("CLIP:" + dateKey)()),
    lastClip: 0, done: false,
  };
  $("#raceHeat").textContent = dateKey + " · " + names.length + " racer" + (names.length === 1 ? "" : "s");
  $("#speedBtn").textContent = "▶ " + SPEEDS[speedIdx] + "×";
  show("race");
  sizeCanvas();
  requestAnimationFrame(tick);
}

const SPEEDS = [12, 24, 48];
let speedIdx = 1;

function tick(now) {
  if (!playing || playing.done) return;
  const p = playing;
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
    const lead = currentLeader();
    const line = CLIPS[(p.ticker() * CLIPS.length) | 0].replace("{L}", lead.name);
    $("#ticker").textContent = "🎙 " + line;
  }
  draw();
  const lead = currentLeader();
  $("#livePos").textContent = "leading: " + lead.name;
  $("#raceClock").textContent = p.live.clock.toFixed(0) + "s";
  if (alive === 0 || (p.live.clock > 25 && enoughDone())) {
    p.done = true;
    setTimeout(finishRace, 700);
    return;
  }
  requestAnimationFrame(tick);
}

function draw() {
  const cv = $("#river"), ctx = cv.getContext("2d");
  const scale = cv.width / E.COURSE.width;
  const target = currentLeader();
  const camY = Math.max(0, Math.min(E.COURSE.length - cv.height / scale + 80, (target.done ? E.COURSE.length : target.y) - cv.height / scale * 0.3));
  const w2s = (x, y) => [x * scale, (y - camY) * scale];
  const t = playing.live.clock;

  const g = ctx.createLinearGradient(0, 0, 0, cv.height);
  g.addColorStop(0, "#0d3b66"); g.addColorStop(1, "#1b6ca8");
  ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 2 * devicePixelRatio;
  for (let i = 0; i < 14; i++) {
    const wx = ((i * 73) % E.COURSE.width);
    const wy = ((i * 431 + t * 26) % (E.COURSE.length));
    const [sx, sy] = w2s(wx + E.dsin(wy * 0.02 + i) * 6, wy);
    if (sy < -40 || sy > cv.height + 40) continue;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + E.dsin(i + t * 0.4) * 6 * devicePixelRatio, sy + 26 * devicePixelRatio); ctx.stroke();
  }

  ctx.fillStyle = "#092a4a";
  ctx.fillRect(0, 0, 6 * devicePixelRatio, cv.height);
  ctx.fillRect(cv.width - 6 * devicePixelRatio, 0, 6 * devicePixelRatio, cv.height);

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

  const spriteS = 7 * devicePixelRatio;
  const leadName = target.name;
  for (const r of playing.live.racers) {
    if (r.done) continue;
    const [x, y] = w2s(r.x, r.y);
    if (y < -30 || y > cv.height + 30) continue;
    const isLead = r.name === leadName;
    const bob = E.dsin(t * 2.1 + r.t.phase);
    drawRacer(ctx, x, y, isLead ? spriteS * 1.5 : spriteS, bob, hueFor(r.name), isLead);
    if (isLead) {
      ctx.font = `${11 * devicePixelRatio}px -apple-system,system-ui,sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText(r.name, x, y - spriteS * 2.1);
    }
  }

  const mmX = cv.width - 14 * devicePixelRatio;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(mmX - 4 * devicePixelRatio, 8 * devicePixelRatio, 8 * devicePixelRatio, cv.height - 16 * devicePixelRatio);
  for (const r of playing.live.racers) {
    if (r.done) continue;
    const my_ = 8 * devicePixelRatio + (r.y / E.COURSE.length) * (cv.height - 16 * devicePixelRatio);
    ctx.fillStyle = r.name === leadName ? "#fff" : "rgba(255,255,255,0.35)";
    ctx.fillRect(mmX - (r.name === leadName ? 3 : 1.5) * devicePixelRatio, my_, (r.name === leadName ? 6 : 3) * devicePixelRatio, 2 * devicePixelRatio);
  }
}

// ---------- results ----------
function finishRace() {
  const N = daily.results.length;
  $("#resultHeat").textContent = DAY + " · " + N + " racer" + (N === 1 ? "" : "s") + (IS_TODAY ? " · today" : " · replay");
  $("#resultsBody").innerHTML = daily.results.map((r) => {
    const medal = r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : "P" + r.position;
    const ww = r.waterWorked ? '<span class="pr-wwBadge" title="Water Worked — sailed the longest line of the top half">🌊</span>' : "";
    return `<tr><td>${medal}</td><td>${esc(r.name)}</td><td>${r.dnf ? "DNF" : r.time.toFixed(1) + "s"}</td><td>×${r.sailed.toFixed(2)}${ww}</td><td><button class="pr-cardBtn" type="button" data-name="${esc(r.name)}">card</button></td></tr>`;
  }).join("");
  $("#tomorrowLine").textContent = IS_TODAY
    ? "New river at 00:00 UTC. Same list tomorrow draws a brand new race."
    : "This was a replay of a past river. Paste your list again with no ?d= to race today's current.";
  show("results");
}

// ---------- card PNG ----------
function makeCardPNG(r, N) {
  const cv = document.createElement("canvas");
  cv.width = 1200; cv.height = 630;
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 1200, 630);
  g.addColorStop(0, "#0d3b66"); g.addColorStop(1, "#1b6ca8");
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
  ctx.fillText("PASTE-A-RACE", 60, 78);
  ctx.font = "24px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "#ffd447";
  ctx.fillText("GRAND MIGRATION LANE  ·  " + DAY + "  ·  " + N + " racers", 60, 118);
  ctx.fillStyle = "#fff";
  ctx.font = "800 170px -apple-system,system-ui,sans-serif";
  ctx.fillText(r.dnf ? "DNF" : "P" + r.position, 60, 320);
  ctx.font = "600 44px -apple-system,system-ui,sans-serif";
  ctx.fillText(r.name.length > 26 ? r.name.slice(0, 26) + "…" : r.name, 60, 396);
  ctx.font = "30px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`beat ${E.percentile(r, N)}% of ${N} racers`, 60, 448);
  ctx.fillText(`time ${r.dnf ? "—" : r.time.toFixed(1) + "s"}   ·   distance sailed ×${r.sailed.toFixed(2)}${r.waterWorked ? "   ·   🌊 WATER WORKED" : ""}`, 60, 496);
  drawRacer(ctx, 1010, 240, 95, 0.12, hueFor(r.name), false);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "26px -apple-system,system-ui,sans-serif";
  ctx.fillText("Race your own list free — " + (location.host ? location.host + location.pathname : "grand migration /paste"), 60, 576);
  return cv;
}

function downloadCard(name) {
  const r = daily.lookup(name);
  if (!r) return;
  const cv = makeCardPNG(r, daily.results.length);
  const a = document.createElement("a");
  a.download = `paste-a-race-${DAY}-${name.replace(/\W+/g, "_")}.png`;
  a.href = cv.toDataURL("image/png");
  a.click();
  toast("Card saved.");
}

// ---------- share ----------
function doShare(mode) {
  const { url, includedCount, totalCount } = buildShareURL(currentNames, DAY);
  const warn = $("#urlWarn");
  if (includedCount < totalCount) {
    warn.textContent = `Link includes the first ${includedCount} of ${totalCount} names (URL length limit) — the race itself still counted all ${totalCount}.`;
    warn.classList.remove("hidden");
  } else warn.classList.add("hidden");
  const text = `I raced ${totalCount} names down today's Grand Migration river. Same list, same day, same result for you too: ${url}`;
  if (mode === "share" && navigator.share) {
    navigator.share({ title: "Paste-a-Race", text: `Raced ${totalCount} names down today's river:`, url }).catch(() => {});
    return;
  }
  navigator.clipboard.writeText(mode === "share" ? text : url)
    .then(() => toast(mode === "share" ? "Challenge copied — paste it in the group chat." : "Link copied."))
    .catch(() => prompt("Copy your link:", url));
}

// ---------- wire ----------
$("#nameBox").addEventListener("input", updateCount);
$("#raceBtn").addEventListener("click", () => {
  const names = updateCount();
  if (!names.length) { toast("Paste some names first."); return; }
  startRace(names, DAY);
});
$("#speedBtn").addEventListener("click", () => {
  speedIdx = (speedIdx + 1) % SPEEDS.length;
  $("#speedBtn").textContent = "▶ " + SPEEDS[speedIdx] + "×";
});
$("#skipBtn").addEventListener("click", () => { if (playing) { playing.done = true; finishRace(); } });
$("#resultsBody").addEventListener("click", (ev) => {
  const btn = ev.target.closest(".pr-cardBtn");
  if (btn) downloadCard(btn.dataset.name);
});
$("#shareBtn").addEventListener("click", () => doShare("share"));
$("#copyBtn").addEventListener("click", () => doShare("copy"));
$("#rewatchBtn").addEventListener("click", () => startRace(currentNames, DAY));
$("#againBtn").addEventListener("click", () => show("enter"));
window.addEventListener("resize", () => { if (playing && !playing.done) sizeCanvas(); });

renderHeatLine();
if (nParam) {
  const shared = nParam.split("~").map((n) => E.normName(n)).filter(Boolean).slice(0, MAX_NAMES);
  if (shared.length) {
    $("#nameBox").value = shared.join("\n");
    updateCount();
    startRace(shared, DAY);
  }
} else {
  updateCount();
}
})();
