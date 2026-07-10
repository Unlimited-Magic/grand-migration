/* THE REGISTRY — deed lookup + career computation. Classic script; engine in ../js/engine.js (GMEngine). */
(function () {
"use strict";

const E = window.GMEngine;
const FIELD = 400;
const DAYS = 14;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

function dateKeyForOffset(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function fmtDate(dateKey) {
  const d = new Date(dateKey + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function racerNo(name) {
  const n = E.xmur3("REGISTRY:" + E.normName(name).toUpperCase())();
  return String((n % 999999) + 1).padStart(6, "0");
}

function founderNo(name) {
  const n = E.xmur3("FOUNDER:" + E.normName(name).toUpperCase())();
  return String((n % 500) + 1).padStart(3, "0");
}

function careerFor(name) {
  const days = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const dateKey = dateKeyForOffset(i);
    const d = E.dailyResult(dateKey, [name], FIELD);
    const r = d.lookup(name);
    const N = d.results.length;
    days.push({
      dateKey, r, N,
      pct: E.percentile(r, N),
      isToday: i === 0,
    });
  }
  return days;
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._h);
  toast._h = setTimeout(() => t.classList.remove("show"), 1800);
}

function drawSpark(canvas, days) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 460, h = 60;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const n = days.length;
  const gap = 4;
  const bw = (w - gap * (n - 1)) / n;
  days.forEach((d, i) => {
    const bh = Math.max(3, (d.pct / 100) * (h - 14));
    const x = i * (bw + gap);
    const y = h - bh;
    ctx.fillStyle = d.isToday ? "#ffd447"
      : d.pct >= 90 ? "rgba(255, 212, 71, 0.75)"
      : d.pct >= 50 ? "rgba(143, 168, 188, 0.55)"
      : "rgba(143, 168, 188, 0.28)";
    ctx.fillRect(x, y, bw, bh);
  });
}

function awardLine(r) {
  if (r.dnf) return "Did not finish this heat.";
  if (r.waterWorked) return "★ Water Worked — hardest-fought line in the top half.";
  return "";
}

let lastDays = null;

function renderDeed(name) {
  const days = careerFor(name);
  lastDays = days;
  const today = days[days.length - 1];
  const finished = days.filter((d) => !d.r.dnf);

  const best = finished.length
    ? finished.reduce((a, b) => (b.r.position < a.r.position ? b : a))
    : null;
  const avgPct = days.reduce((s, d) => s + d.pct, 0) / days.length;
  const avgSailed = days.reduce((s, d) => s + d.r.sailed, 0) / days.length;

  const deed = $("deed");
  deed.innerHTML = `
    <span class="deedCorner tl">✦</span><span class="deedCorner tr">✦</span>
    <span class="deedCorner bl">✦</span><span class="deedCorner br">✦</span>
    <div class="deedKicker">The Grand Migration — Official Racer Deed</div>
    <div class="racerNo">RACER NO. ${racerNo(name)}</div>
    <div class="deedName">${esc(E.normName(name))}</div>
    <div class="deedFlourish"></div>
    <div class="heatLine">
      <div class="heatDate">TODAY'S HEAT — ${fmtDate(today.dateKey)}</div>
      <div class="heatPos">P${today.r.position}<span class="ofN"> / ${today.N}</span></div>
      <div class="heatBeat">beat <b>${today.pct}%</b> of the field</div>
      ${awardLine(today.r) ? `<div class="heatAward">${awardLine(today.r)}</div>` : ""}
    </div>
    <div id="sparkWrap">
      <div id="sparkLabel">Last ${DAYS} heats</div>
      <canvas id="spark"></canvas>
    </div>
    <div class="deedStats">
      <div><span>${best ? "P" + best.r.position : "—"}</span><label>Best Finish</label></div>
      <div><span>${avgPct.toFixed(1)}%</span><label>Avg Percentile</label></div>
      <div><span>${(avgSailed * 100).toFixed(0)}%</span><label>Avg Distance Sailed</label></div>
      <div><span>${DAYS}</span><label>Heats On Record</label></div>
    </div>
    <div class="deedFoot">
      This deed is generated fresh from the river, not stored anywhere — anyone who types
      "${esc(E.normName(name))}" today sees this exact card. A Permanent Deed is what makes it yours.
    </div>
  `;

  drawSpark($("spark"), days);
  $("founderNo").textContent = `#${founderNo(name)}/500`;
  $("deedWrap").classList.remove("hidden");
  $("emptyState").classList.add("hidden");
}

function currentName() {
  return $("nameInput").value.trim();
}

function lookup(name, updateUrl) {
  const clean = E.normName(name);
  if (!clean) return;
  $("nameInput").value = clean;
  renderDeed(clean);
  if (updateUrl) {
    const url = new URL(location.href);
    url.searchParams.set("name", clean);
    history.replaceState(null, "", url);
  }
}

$("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  lookup(currentName(), true);
});

$("giftBtn").addEventListener("click", () => {
  $("giftExplainer").classList.toggle("hidden");
});

$("permBtn").addEventListener("click", () => {
  toast("Preview only — deeds arm at launch.");
});
$("founderBtn").addEventListener("click", () => {
  toast("Preview only — deeds arm at launch.");
});

$("copyLinkBtn").addEventListener("click", async () => {
  const url = new URL(location.href);
  url.searchParams.set("name", currentName());
  const text = url.toString();
  try {
    await navigator.clipboard.writeText(text);
    toast("Deed link copied");
  } catch (err) {
    toast(text);
  }
});

window.addEventListener("resize", () => {
  const wrap = $("deedWrap");
  if (!wrap.classList.contains("hidden") && lastDays) drawSpark($("spark"), lastDays);
});

// boot
const params = new URLSearchParams(location.search);
const initial = params.get("name");
if (initial) lookup(initial, false);

})();
