/* FUNDRAISER GENERATOR — demo tool UI. Classic script; engine in /js/engine.js (GMEngine). */
(function () {
"use strict";
const E = window.GMEngine;
const $ = (s) => document.querySelector(s);

const FREE_CAP = 50;
const HARD_CAP = 500;
const SWATCHES = ["#ffd447", "#ff6b6b", "#4ecdc4", "#a78bfa", "#34d399", "#f97316", "#60a5fa", "#f472b6"];
const SAMPLE_DONORS = [
  "Alex Johnson", "The Martinez Family", "Riverside Dental", "Priya & Sam Shah", "Maple Street Book Club",
  "Jordan Lee", "Unit 4B Softball League", "Grandma Rosa", "Taylor & Jamie Chen", "Downtown Coffee Co.",
  "Casey Nguyen", "The Patel-Wilson Household", "Oakview Elementary PTA", "Morgan Ruiz", "Barkley (in memory of)",
  "Sunrise Yoga Studio", "The Kowalski Crew", "Devon Brooks", "Third Street Auto Repair", "Riley & Quinn Adams",
  "The Johnsons Next Door", "Fernanda Alvarez", "Lakeside Rotary Club", "Micah Thompson", "The Singh Family",
  "Cedar Grove Vet Clinic", "Harper & Wren", "Boba Bros", "Retired Firefighters Assoc.", "Elena Petrova",
  "Northgate Middle School Band", "Tyler & Bailey", "The Ortiz-Kim Family", "Sunny Acres Farm", "Nadia Hassan",
  "Golden Years Book Club", "The Fitzgerald Clan", "Marcus Webb", "Pete's Hardware", "The Andersons",
  "Zoe Whitfield", "Little Paws Rescue Volunteers", "Ben & Grace Turner", "The Choi Family", "Ridgeline Running Club",
  "Omar Farouk", "Nana & Papa Diaz", "7th Grade Class of Lincoln Middle", "Willow Creek Garden Club", "Sam Okafor",
  "The Bergstrom Household", "Twin Oaks Diner", "Ava & Noah's Grandparents", "The Whitmore-Lee Family",
  "Riverside Youth Hockey", "Chloe Mensah", "The Neighborhood Watch Crew", "Deacon & Ruth", "Old Town Barbershop",
  "The Committee (you know who you are)",
];
const CLIPS = [
  "{L} has found the fast water!",
  "{L} leads — the crowd on the bank is losing it.",
  "Stewards watching {L} closely. For vibes.",
  "{L} working the inside line like a professional.",
  "An eddy! {L} holds on!",
  "{L} out front, donors screaming from the shore.",
  "Absolute scenes. {L} by half a length.",
  "{L} refuses to acknowledge the rocks.",
];

// ---------- color helpers ----------
function hexToRgb(hex) {
  hex = String(hex).replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16) || 0;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function shade(hex, pct) {
  const { r, g, b } = hexToRgb(hex);
  const t = pct < 0 ? 0 : 255;
  const p = Math.abs(pct);
  return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
}

function drawBrandedDuck(ctx, x, y, s, bob, glow, color) {
  const wing = shade(color, -0.28);
  const head = shade(color, 0.22);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bob * 0.25);
  if (glow) { ctx.shadowColor = "#fff"; ctx.shadowBlur = s * 1.2; }
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = wing;
  ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.05, s * 0.45, s * 0.3, 0.5, 0, 7); ctx.fill();
  ctx.fillStyle = head;
  ctx.beginPath(); ctx.arc(0, s * 0.75, s * 0.55, 0, 7); ctx.fill();
  ctx.fillStyle = "#ff8c00";
  ctx.beginPath(); ctx.ellipse(0, s * 1.25, s * 0.28, s * 0.16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#0a1520";
  ctx.beginPath(); ctx.arc(-s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.arc(s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.fill();
  ctx.restore();
}

function esc(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
function fmtMoney(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

// ---------- state ----------
let tier = "free";
let state = null;   // { orgName, causeLine, brandColor, goal, donors, tier }
let DAY = null;
let daily = null;    // precomputed final results
let playing = null;  // animation state

// ---------- setup form ----------
function renderSwatches() {
  const box = $("#swatches");
  box.innerHTML = SWATCHES.map((c) => `<button type="button" class="swatch" style="background:${c}" data-c="${c}" aria-label="${c}"></button>`).join("");
  box.querySelectorAll(".swatch").forEach((btn) => {
    btn.addEventListener("click", () => { $("#brandColor").value = btn.dataset.c; });
  });
}

function setTier(t) {
  tier = t;
  $("#tierFree").classList.toggle("on", t === "free");
  $("#tierEvent").classList.toggle("on", t === "event");
  $("#tierNote").textContent = t === "free"
    ? "Free preview caps at 50 donor ducks and shows Grand Migration branding on the race and cards."
    : "Event preview shows unlimited ducks with only your branding — this is a preview of the paid tier; payments arm at launch.";
}

function parseDonors(raw) {
  const seen = new Set();
  const out = [];
  for (const piece of String(raw).split(/[\n,]+/)) {
    const n = E.normName(piece);
    if (!n) continue;
    const k = n.toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k); out.push(n);
  }
  return out;
}

function updateDonorCount() {
  const n = parseDonors($("#donorText").value).length;
  $("#donorCount").textContent = n + " donor" + (n === 1 ? "" : "s");
}

// ---------- generate ----------
function onGenerate(ev) {
  ev.preventDefault();
  const orgName = $("#orgName").value.trim();
  if (!orgName) { toast("Add your organization name."); $("#orgName").focus(); return; }
  const causeLine = $("#causeLine").value.trim();
  const brandColor = $("#brandColor").value || "#ffd447";
  const goal = Math.max(0, parseInt($("#goalAmount").value, 10) || 0);
  let donors = parseDonors($("#donorText").value);
  if (donors.length < 2) { toast("Add at least 2 donor names to race."); $("#donorText").focus(); return; }

  let overflow = 0;
  const cap = tier === "free" ? FREE_CAP : HARD_CAP;
  if (donors.length > cap) { overflow = donors.length - cap; donors = donors.slice(0, cap); }

  state = { orgName, causeLine, brandColor, goal, donors, tier, overflow };
  buildPreview();
}

function buildPreview() {
  const s = state;
  document.getElementById("brandedScope").style.setProperty("--brand", s.brandColor);
  document.getElementById("brandedScope").style.setProperty("--brandInk", "#0a1520");

  $("#pOrgName").textContent = s.orgName;
  $("#pCauseLine").textContent = s.causeLine || "A live duck race for a good cause.";
  if (s.goal > 0) {
    $("#pGoalFill").style.width = "0%";
    $("#pGoalLabel").textContent = `Goal: ${fmtMoney(s.goal)} — donations happen on your platform, this bar is just a preview placeholder.`;
    $("#pGoalWrap").classList.remove("hidden");
  } else {
    $("#pGoalWrap").classList.add("hidden");
  }
  $("#tierBadge").textContent = s.tier === "free"
    ? "🌊 Powered by Grand Migration — upgrade to remove this line"
    : "★ Your branding only — no watermark (preview)";

  DAY = E.todayKey();
  daily = E.dailyResult(DAY, s.donors, 0);

  $("#previewWrap").classList.remove("hidden");
  $("#resultsSection").classList.add("hidden");
  $("#overflowNote").classList.add("hidden");
  $("#previewWrap").scrollIntoView({ behavior: "smooth", block: "start" });

  startRace();
}

// ---------- animation ----------
const SPEEDS = [12, 24, 48];
let speedIdx = 1;

function startRace() {
  const s = state;
  playing = {
    live: E.makeRace(DAY, s.donors, 0),
    last: performance.now(), simAcc: 0,
    ticker: E.mulberry32(E.xmur3("CLIP:" + DAY + ":" + s.orgName)()),
    lastClip: 0, done: false,
  };
  $("#raceInfo").textContent = `${s.orgName} · ${s.donors.length} ducks racing`;
  $("#speedBtn2").textContent = "▶ " + SPEEDS[speedIdx] + "×";
  $("#ticker2").textContent = "🎙 Ducks entering the water…";
  sizeCanvas();
  requestAnimationFrame(tick);
}

function sizeCanvas() {
  const cv = $("#raceCanvas");
  const w = Math.min(cv.parentElement.clientWidth, 640);
  cv.width = w * devicePixelRatio;
  cv.height = Math.floor(Math.min(innerHeight * 0.5, 460) * devicePixelRatio);
  cv.style.width = w + "px";
  cv.style.height = cv.height / devicePixelRatio + "px";
}

function leaderboardRows(racers) {
  const done = racers.filter((r) => r.done).sort((a, b) => a.time - b.time);
  const running = racers.filter((r) => !r.done).sort((a, b) => b.y - a.y);
  return done.concat(running).slice(0, 5);
}

function currentLeader(racers) {
  const rows = leaderboardRows(racers);
  return rows[0] || null;
}

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
    const lead = currentLeader(p.live.racers);
    if (lead) {
      const line = CLIPS[(p.ticker() * CLIPS.length) | 0].replace("{L}", lead.name);
      $("#ticker2").textContent = "🎙 " + line;
    }
  }
  draw();
  renderLiveLeaders();
  $("#raceClock2").textContent = p.live.clock.toFixed(0) + "s";
  if (alive === 0) {
    p.done = true;
    setTimeout(finishRace, 700);
    return;
  }
  requestAnimationFrame(tick);
}

function renderLiveLeaders() {
  const rows = leaderboardRows(playing.live.racers);
  $("#liveLeaders").innerHTML = rows.map((r, i) =>
    `<div class="lrow"><span>${i + 1}</span><span>${esc(r.name)}</span><span>${r.done ? r.time.toFixed(1) + "s" : "racing"}</span></div>`
  ).join("");
}

function draw() {
  const cv = $("#raceCanvas"), ctx = cv.getContext("2d");
  const color = state.brandColor;
  const scale = cv.width / E.COURSE.width;
  const lead = currentLeader(playing.live.racers);
  let target = lead && !lead.done ? lead : playing.live.racers[0];
  for (const r of playing.live.racers) if (!r.done && r.y > (target.done ? -1 : target.y)) target = r;
  const camY = Math.max(0, Math.min(E.COURSE.length - cv.height / scale + 80, target.y - cv.height / scale * 0.3));
  const w2s = (x, y) => [x * scale, (y - camY) * scale];

  const water0 = shade(color, -0.55), water1 = shade(color, -0.3);
  const g = ctx.createLinearGradient(0, 0, 0, cv.height);
  g.addColorStop(0, water0); g.addColorStop(1, water1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 2 * devicePixelRatio;
  const t = playing.live.clock;
  for (let i = 0; i < 14; i++) {
    const wx = (i * 73) % E.COURSE.width;
    const wy = (i * 431 + t * 26) % E.COURSE.length;
    const [sx, sy] = w2s(wx + E.dsin(wy * 0.02 + i) * 6, wy);
    if (sy < -40 || sy > cv.height + 40) continue;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + E.dsin(i + t * 0.4) * 6 * devicePixelRatio, sy + 26 * devicePixelRatio); ctx.stroke();
  }

  ctx.fillStyle = shade(color, -0.65);
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
  for (const r of playing.live.racers) {
    if (r.done) continue;
    const [x, y] = w2s(r.x, r.y);
    if (y < -30 || y > cv.height + 30) continue;
    const isLeader = r === lead;
    const bob = E.dsin(t * 2.1 + r.t.phase);
    drawBrandedDuck(ctx, x, y, isLeader ? spriteS * 1.5 : spriteS, bob, isLeader, color);
    if (isLeader) {
      ctx.font = `${11 * devicePixelRatio}px -apple-system,system-ui,sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText(r.name, x, y - spriteS * 2.1);
    }
  }
}

// ---------- results ----------
function finishRace() {
  const s = state, N = daily.results.length;
  $("#resultsSection").classList.remove("hidden");
  $("#resultsTitle").textContent = `🏁 Results — every donor, ${N} total`;
  $("#donorTable").innerHTML = daily.results.map((r) => {
    const medal = r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : String(r.position);
    return `<tr><td>${medal}</td><td>${esc(r.name)}</td><td>${r.time.toFixed(1)}s</td><td>×${r.sailed.toFixed(2)}</td></tr>`;
  }).join("");

  if (s.overflow > 0) {
    $("#overflowNote").textContent = `+${s.overflow} more donor${s.overflow === 1 ? "" : "s"} not included — free preview caps at ${FREE_CAP} ducks. Upgrade to race everyone.`;
    $("#overflowNote").classList.remove("hidden");
  } else {
    $("#overflowNote").classList.add("hidden");
  }

  const sel = $("#cardDonorSelect");
  sel.innerHTML = daily.results.map((r) => `<option value="${esc(r.name)}">P${r.position} — ${esc(r.name)}</option>`).join("");
  sel.value = daily.results[0].name;
  renderCard(daily.results[0].name);

  $("#resultsSection").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderCard(name) {
  const s = state, N = daily.results.length;
  const r = daily.lookup(name);
  if (!r) return;
  const cv = $("#cardCanvas"), ctx = cv.getContext("2d");
  const color = s.brandColor;
  const g = ctx.createLinearGradient(0, 0, 1200, 630);
  g.addColorStop(0, shade(color, -0.55)); g.addColorStop(1, shade(color, -0.25));
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
  ctx.fillText(s.orgName.toUpperCase(), 60, 78);
  ctx.font = "22px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText((s.causeLine || "A live duck race for a good cause") + "  ·  " + DAY, 60, 116);

  ctx.fillStyle = "#fff";
  ctx.font = "800 170px -apple-system,system-ui,sans-serif";
  ctx.fillText("P" + r.position, 60, 320);
  ctx.font = "600 44px -apple-system,system-ui,sans-serif";
  ctx.fillText(r.name, 60, 396);
  ctx.font = "30px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`beat ${E.percentile(r, N)}% of ${N} donors`, 60, 448);
  ctx.fillText(`time ${r.time.toFixed(1)}s   ·   distance sailed ×${r.sailed.toFixed(2)}${r.waterWorked ? "   ·   🌊 WATER WORKED" : ""}`, 60, 496);

  drawBrandedDuck(ctx, 1010, 240, 95, 0.12, false, color);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "26px -apple-system,system-ui,sans-serif";
  ctx.fillText(s.tier === "free"
    ? "Free demo card — generated at the Grand Migration Fundraiser Generator"
    : `Thank you for racing for ${s.orgName}!`, 60, 576);
}

function downloadCard() {
  const sel = $("#cardDonorSelect");
  const cv = $("#cardCanvas");
  const a = document.createElement("a");
  const slug = (state.orgName + "-" + sel.value).replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  a.download = `${slug}-card.png`;
  a.href = cv.toDataURL("image/png");
  a.click();
  toast("Card saved.");
}

function mailtoURL(subject, body) {
  return "mailto:dan.cohen@defimagic.io?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
}

function openPackMailto() {
  const s = state;
  const subject = `Card pack — ${s.orgName}`;
  const body = `Hi Dan,\n\nWe ran the free demo for "${s.orgName}" (${s.donors.length} donors) and want the full card pack + unlimited field.\n\nEvent date:\nExpected donor count:\nAnything else:\n`;
  window.location.href = mailtoURL(subject, body);
}

function openEventMailto() {
  const subject = state ? `EVENT tier interest — ${state.orgName}` : "EVENT tier interest";
  const body = state
    ? `Hi Dan,\n\nWe're interested in the $199 EVENT tier for "${state.orgName}".\n\nEvent date:\nExpected donor count:\nAnything else:\n`
    : `Hi Dan,\n\nWe're interested in the $199 EVENT tier for our fundraiser.\n\nOrganization:\nEvent date:\nExpected donor count:\n`;
  window.location.href = mailtoURL(subject, body);
}

// ---------- toast ----------
let toastT = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("on"), 2600);
}

// ---------- wire ----------
renderSwatches();
setTier("free");
updateDonorCount();

$("#tierFree").addEventListener("click", () => setTier("free"));
$("#tierEvent").addEventListener("click", () => setTier("event"));
$("#donorText").addEventListener("input", updateDonorCount);
$("#loadSampleBtn").addEventListener("click", () => {
  $("#donorText").value = SAMPLE_DONORS.join("\n");
  updateDonorCount();
});
$("#setupForm").addEventListener("submit", onGenerate);

$("#speedBtn2").addEventListener("click", () => {
  speedIdx = (speedIdx + 1) % SPEEDS.length;
  $("#speedBtn2").textContent = "▶ " + SPEEDS[speedIdx] + "×";
});
$("#skipBtn2").addEventListener("click", () => {
  if (playing && !playing.done) { playing.done = true; finishRace(); }
});
$("#cardDonorSelect").addEventListener("change", (ev) => renderCard(ev.target.value));
$("#downloadCardBtn").addEventListener("click", downloadCard);
$("#packBtn").addEventListener("click", openPackMailto);
$("#rebuildBtn").addEventListener("click", () => {
  $("#setup").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#freeCTA").addEventListener("click", () => {
  setTier("free");
  $("#setup").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#donorText").focus();
});
$("#eventCTA").addEventListener("click", openEventMailto);

window.addEventListener("resize", () => { if (playing && !playing.done) sizeCanvas(); });
})();
