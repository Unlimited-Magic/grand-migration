/* THE STUDIO — dress-up + "see it race" + result card preview.
 * Classic script; engine in ../js/engine.js (GMEngine), sprites in sprites.js.
 */
(function () {
"use strict";
const E = window.GMEngine;
const SP = window.StudioSprites;
const $ = (s) => document.querySelector(s);
const FIELD = 8;

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// ---------- item registries ----------
const HATS = [
  { id: "none", name: "Bare Head", tag: "free" },
  { id: "beanie", name: "Beanie", tag: "earn", threshold: 2, colors: ["#d64545", "#3a6ea5", "#3f9142"] },
  { id: "cap", name: "Captain's Cap", tag: "premium", price: 1.99, colors: ["#1b2a4a", "#f4ede1", "#c65d8a"] },
  { id: "tophat", name: "Top Hat", tag: "premium", price: 2.99, colors: ["#111111", "#5c1a2b"] },
  { id: "crown", name: "Golden Crown", tag: "premium", price: 4.99, colors: ["#ffd447", "#e8b6c9"] },
];
const EYEWEAR = [
  { id: "none", name: "Bare Eyes", tag: "free" },
  { id: "monocle", name: "Monocle", tag: "earn", threshold: 4, colors: ["#ffd447"] },
  { id: "shades", name: "Aviator Shades", tag: "premium", price: 2.49, colors: ["#111111", "#3fa7d6"] },
];
const NECK = [
  { id: "none", name: "Bare Neck", tag: "free" },
  { id: "bowtie", name: "Bowtie", tag: "earn", threshold: 3, colors: ["#d64545", "#3a6ea5", "#111111"] },
  { id: "scarf", name: "Cozy Scarf", tag: "premium", price: 1.99, colors: ["#d64545", "#3a9142", "#3a6ea5"] },
  { id: "chain", name: "Gold Chain", tag: "premium", price: 2.99, colors: ["#ffd447", "#cfd8dc"] },
];
const TRAIL = [
  { id: "none", name: "Still Water", tag: "free" },
  { id: "bubbles", name: "Bubble Trail", tag: "earn", threshold: 1 },
  { id: "sparkle", name: "Sparkle Trail", tag: "premium", price: 1.99 },
  { id: "rainbow", name: "Rainbow Wake", tag: "premium", price: 2.99 },
];
const TAUNTS = [
  { id: "gg", name: "GG duckies.", tag: "free" },
  { id: "current", name: "Told you the current loves me.", tag: "earn", threshold: 2 },
  { id: "notoday", name: "Not today, rivals.", tag: "earn", threshold: 4 },
  { id: "bubble", name: "Bubble bubble, next level trouble.", tag: "earn", threshold: 5 },
];
const REG = { hat: HATS, eyewear: EYEWEAR, neck: NECK, trail: TRAIL, taunt: TAUNTS };
const CATS = [
  { key: "hat", label: "Hats" },
  { key: "eyewear", label: "Eyewear" },
  { key: "neck", label: "Neck" },
  { key: "trail", label: "Trail" },
  { key: "taunt", label: "Taunt" },
];
const PREMIUM_TOTAL = Object.values(REG).flat().filter((i) => i.tag === "premium").reduce((a, i) => a + i.price, 0);

// ---------- persistence ----------
function defaultOutfit() {
  return { base: "duck", hat: { id: "none", color: null }, eyewear: { id: "none", color: null },
    neck: { id: "none", color: null }, trail: { id: "none" }, taunt: "gg" };
}
function loadOutfit() {
  try {
    const o = JSON.parse(localStorage.getItem("studio_outfit_v1"));
    return o && o.hat ? Object.assign(defaultOutfit(), o) : defaultOutfit();
  } catch { return defaultOutfit(); }
}
function saveOutfit() { localStorage.setItem("studio_outfit_v1", JSON.stringify(outfit)); }
function loadProgress() {
  try { return Object.assign({ practiceRaces: 0 }, JSON.parse(localStorage.getItem("studio_progress_v1")) || {}); }
  catch { return { practiceRaces: 0 }; }
}
function saveProgress() { localStorage.setItem("studio_progress_v1", JSON.stringify(progress)); }

let outfit = loadOutfit();
let progress = loadProgress();
let activeCat = "hat";
let racerName = localStorage.getItem("studio_name") || localStorage.getItem("gm_name") || "";

// ---------- toast ----------
let toastT = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("on"), 2800);
}

// ---------- wardrobe rendering ----------
function itemTag(item) {
  if (item.tag === "free") return { text: "Free", cls: "tagFree" };
  if (item.tag === "earn") {
    const have = progress.practiceRaces >= item.threshold;
    return have ? { text: "✓ Earned free", cls: "tagEarned" } : { text: `Free · race ${progress.practiceRaces}/${item.threshold} to earn`, cls: "tagEarn" };
  }
  return { text: "$" + item.price.toFixed(2), cls: "tagPremium" };
}

function currentColorIdx(cat, item) {
  if (!item.colors) return 0;
  if (outfit[cat] && outfit[cat].id === item.id) {
    const i = item.colors.indexOf(outfit[cat].color);
    if (i >= 0) return i;
  }
  return 0;
}

function itemCardHTML(cat, item) {
  const tag = itemTag(item);
  const isNone = item.id === "none";
  const equipped = cat === "taunt" ? outfit.taunt === item.id : (outfit[cat] && outfit[cat].id === item.id);
  const idx = currentColorIdx(cat, item);
  const swatches = item.colors
    ? `<div class="swatchRow">${item.colors.map((c, i) => `<button class="swatch${i === idx ? " on" : ""}" data-swatch="${cat}:${item.id}:${i}" style="background:${c}" aria-label="color ${i}"></button>`).join("")}</div>`
    : "";
  const icon = isNone
    ? `<div class="itemIconNone">—</div>`
    : `<canvas class="itemIcon" data-icon="${cat}:${item.id}" width="64" height="64"></canvas>`;
  const buy = item.tag === "premium" ? `<button class="buyLink" data-buy="${cat}:${item.id}">Buy — preview only</button>` : "";
  return `<div class="itemCard${equipped ? " equipped" : ""}" data-cat="${cat}" data-id="${item.id}">
    ${icon}
    <div class="itemName">${esc(item.name)}</div>
    <div class="itemTag ${tag.cls}">${esc(tag.text)}</div>
    ${swatches}
    <button class="equipBtn" data-equip="${cat}:${item.id}">${equipped ? "Equipped ✓" : "Wear it"}</button>
    ${buy}
  </div>`;
}

function tauntCardHTML(item) {
  const tag = itemTag(item);
  const equipped = outfit.taunt === item.id;
  return `<div class="itemCard tauntCard${equipped ? " equipped" : ""}" data-cat="taunt" data-id="${item.id}">
    <div class="tauntLine">&ldquo;${esc(item.name)}&rdquo;</div>
    <div class="itemTag ${tag.cls}">${esc(tag.text)}</div>
    <button class="equipBtn" data-equip="taunt:${item.id}">${equipped ? "Equipped ✓" : "Use this line"}</button>
  </div>`;
}

function renderTabs() {
  $("#catTabs").innerHTML = CATS.map((c) =>
    `<button type="button" class="${c.key === activeCat ? "on" : ""}" data-tab="${c.key}">${c.label}</button>`).join("");
}

function renderGrid() {
  const list = REG[activeCat];
  const grid = $("#wardrobeGrid");
  grid.innerHTML = activeCat === "taunt"
    ? list.map(tauntCardHTML).join("")
    : list.map((item) => itemCardHTML(activeCat, item)).join("");
  if (activeCat !== "taunt") {
    list.forEach((item) => {
      if (item.id === "none") return;
      const cv = grid.querySelector(`canvas[data-icon="${activeCat}:${item.id}"]`);
      if (!cv) return;
      const ctx = cv.getContext("2d");
      const color = item.colors ? item.colors[currentColorIdx(activeCat, item)] : null;
      SP.drawIcon(ctx, cv.width, cv.height, activeCat, item.id, color);
    });
  }
}

function renderProgress() {
  const earners = Object.entries(REG).flatMap(([cat, list]) => list.filter((i) => i.tag === "earn").map((i) => ({ cat, ...i })));
  const bits = earners.map((i) => {
    const have = progress.practiceRaces >= i.threshold;
    return `<span class="${have ? "progOn" : "progOff"}">${esc(i.name)} ${have ? "✓" : `${progress.practiceRaces}/${i.threshold}`}</span>`;
  }).join(" · ");
  $("#progressStrip").innerHTML = `🏁 Practice heats run: <b>${progress.practiceRaces}</b><br><span class="progList">${bits}</span>`;
}

function equip(cat, id, idxOverride) {
  const item = REG[cat].find((i) => i.id === id);
  if (!item) return;
  if (cat === "taunt") { outfit.taunt = id; }
  else {
    let color = null;
    if (item.colors) {
      const idx = idxOverride !== undefined ? idxOverride : currentColorIdx(cat, item);
      color = item.colors[idx];
    }
    outfit[cat] = { id, color };
  }
  saveOutfit();
  renderGrid();
}

function setBase(base) {
  outfit.base = base;
  saveOutfit();
  $("#baseDuckBtn").classList.toggle("on", base === "duck");
  $("#baseCapyBtn").classList.toggle("on", base === "capy");
  $("#baseLabel").textContent = base === "duck" ? "🦆 Rubber Duck" : "🍊 Capybara";
}

// ---------- live preview (bobbing, always animating) ----------
let previewRAF = null;
function sizePreview() {
  const cv = $("#previewCanvas");
  const w = Math.min(cv.parentElement.clientWidth, 400);
  cv.width = w * devicePixelRatio;
  cv.height = 200 * devicePixelRatio;
  cv.style.width = w + "px";
  cv.style.height = "200px";
}
function drawPreview(tSec) {
  const cv = $("#previewCanvas"); const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, cv.height);
  const water = outfit.base === "duck" ? ["#0d3b66", "#1b6ca8"] : ["#0e4d45", "#1f7a6d"];
  g.addColorStop(0, water[0]); g.addColorStop(1, water[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 1.5 * devicePixelRatio;
  for (let i = 0; i < 5; i++) {
    const y = (cv.height * 0.2) + i * cv.height * 0.16 + E.dsin(tSec * 0.6 + i) * 6 * devicePixelRatio;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke();
  }
  const bob = E.dsin(tSec * 2.1);
  const s = cv.height * 0.34;
  SP.drawRacer(ctx, cv.width / 2, cv.height / 2 + s * 0.15, s, bob, true, outfit.base, outfit, tSec);
}
function previewLoop(now) {
  drawPreview(now / 1000);
  previewRAF = requestAnimationFrame(previewLoop);
}

// ---------- mini race ----------
const DAY = E.todayKey();
const CLIPS = [
  "{L} has found the fast water!", "{L} leads — the current is DOING THINGS.",
  "{L} working the inside line like a professional.", "An eddy! {L} holds on!",
  "Absolute scenes. {L} by half a length.", "{L} refuses to acknowledge the rocks.",
];
let daily = null, live = null, raceDone = false, raceCounted = false;

function computeDaily(name) { daily = E.dailyResult(DAY, [name], FIELD); return daily; }

function sizeRaceCanvas() {
  const cv = $("#raceCanvas");
  const w = Math.min(cv.parentElement.clientWidth, 640);
  cv.width = w * devicePixelRatio;
  cv.height = Math.floor(Math.min(innerHeight * 0.5, 440) * devicePixelRatio);
  cv.style.width = w + "px";
  cv.style.height = cv.height / devicePixelRatio + "px";
}

function myLive(name) {
  const k = E.normName(name).toUpperCase();
  return live.racers.find((r) => r.name.toUpperCase() === k) || null;
}
function livePosition(r) {
  let p = 1;
  for (const o of live.racers) {
    if (o === r) continue;
    if (o.done ? (r.done ? o.time < r.time : true) : (!r.done && o.y > r.y)) p++;
  }
  return p;
}

function startRace() {
  racerName = E.normName($("#racerNameInput").value) || "You";
  localStorage.setItem("studio_name", racerName);
  computeDaily(racerName);
  live = E.makeRace(DAY, daily.race.racers.slice(FIELD).map((r) => r.name), FIELD);
  raceDone = false; raceCounted = false;
  $("#raceHeat").textContent = "STUDIO HEAT · " + DAY + " · vs " + FIELD + " rivals";
  $("#raceTicker").textContent = "🎙 They're in the water…";
  show("race");
  sizeRaceCanvas();
  raceLast = performance.now();
  raceLastClip = 0;
  requestAnimationFrame(raceTick);
}

let raceLast = 0, raceLastClip = 0;
function raceTick(now) {
  if (raceDone) return;
  const dtReal = Math.min(1.0, (now - raceLast) / 1000);
  raceLast = now;
  const SPEED = 26;
  let simAcc = dtReal * SPEED;
  let alive = 1;
  while (simAcc >= E.DT) {
    simAcc -= E.DT;
    alive = E.step(live);
    if (alive === 0) break;
  }
  if (now - raceLastClip > 3200 && alive > 0) {
    raceLastClip = now;
    let lead = live.racers[0];
    for (const r of live.racers) if (!r.done && r.y > lead.y) lead = r;
    const line = CLIPS[Math.floor(live.clock / 3) % CLIPS.length].replace("{L}", lead.name);
    $("#raceTicker").textContent = "🎙 " + line;
  }
  drawRace();
  const me = myLive(racerName);
  if (me) $("#livePos2").textContent = (me.done ? "FINISHED P" : "P") + livePosition(me);
  if (alive === 0 || live.clock > 240) {
    raceDone = true;
    setTimeout(finishRace, 700);
    return;
  }
  requestAnimationFrame(raceTick);
}

function drawRace() {
  const cv = $("#raceCanvas"); const ctx = cv.getContext("2d");
  const water = outfit.base === "duck" ? { w0: "#0d3b66", w1: "#1b6ca8", bank: "#092a4a" } : { w0: "#0e4d45", w1: "#1f7a6d", bank: "#0a332e" };
  const scale = cv.width / E.COURSE.width;
  const me = myLive(racerName);
  let target = me;
  if (!target || target.done) {
    target = live.racers[0];
    for (const r of live.racers) if (!r.done && r.y > (target.done ? -1 : target.y)) target = r;
  }
  const camY = Math.max(0, Math.min(E.COURSE.length - cv.height / scale + 80, target.y - cv.height / scale * 0.3));
  const w2s = (x, y) => [x * scale, (y - camY) * scale];
  const t = live.clock;

  const g = ctx.createLinearGradient(0, 0, 0, cv.height);
  g.addColorStop(0, water.w0); g.addColorStop(1, water.w1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 2 * devicePixelRatio;
  for (let i = 0; i < 12; i++) {
    const wx = (i * 73) % E.COURSE.width;
    const wy = (i * 431 + t * 26) % E.COURSE.length;
    const [sx, sy] = w2s(wx + E.dsin(wy * 0.02 + i) * 6, wy);
    if (sy < -40 || sy > cv.height + 40) continue;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + E.dsin(i + t * 0.4) * 6 * devicePixelRatio, sy + 26 * devicePixelRatio); ctx.stroke();
  }
  ctx.fillStyle = water.bank;
  ctx.fillRect(0, 0, 6 * devicePixelRatio, cv.height);
  ctx.fillRect(cv.width - 6 * devicePixelRatio, 0, 6 * devicePixelRatio, cv.height);
  for (const rock of live.course.rocks) {
    const [rx, ry] = w2s(rock.x, rock.y);
    if (ry < -60 || ry > cv.height + 60) continue;
    ctx.fillStyle = "#5c6b73";
    ctx.beginPath(); ctx.arc(rx, ry, rock.r * scale, 0, 7); ctx.fill();
  }
  {
    const [, fy] = w2s(0, E.COURSE.length);
    if (fy > -30 && fy < cv.height + 30) {
      const sq = 10 * devicePixelRatio;
      for (let i = 0; i * sq < cv.width; i++) {
        ctx.fillStyle = i % 2 ? "#111" : "#fff"; ctx.fillRect(i * sq, fy - sq, sq, sq);
        ctx.fillStyle = i % 2 ? "#fff" : "#111"; ctx.fillRect(i * sq, fy, sq, sq);
      }
    }
  }
  const spriteS = 7 * devicePixelRatio;
  for (const r of live.racers) {
    if (r.done) continue;
    const [x, y] = w2s(r.x, r.y);
    if (y < -30 || y > cv.height + 30) continue;
    const isMe = r === me;
    const bob = E.dsin(t * 2.1 + r.t.phase);
    if (isMe) SP.drawRacer(ctx, x, y, spriteS * 1.6, bob, true, outfit.base, outfit, t);
    else SP.drawRacer(ctx, x, y, spriteS, bob, false, outfit.base, {}, t);
    if (isMe) {
      ctx.font = `${11 * devicePixelRatio}px -apple-system,system-ui,sans-serif`;
      ctx.textAlign = "center"; ctx.fillStyle = "#fff";
      ctx.fillText(r.name, x, y - spriteS * 2.4);
    }
  }
}

function bumpProgress() {
  progress.practiceRaces = (progress.practiceRaces || 0) + 1;
  saveProgress();
}

function finishRace() {
  const my = daily.lookup(racerName);
  const N = daily.results.length;
  const pts = E.pointsFor(my, N);
  if (!raceCounted) { bumpProgress(); raceCounted = true; renderProgress(); renderGrid(); }
  const tauntItem = TAUNTS.find((t) => t.id === outfit.taunt) || TAUNTS[0];
  $("#resultHeat2").textContent = "STUDIO HEAT · " + DAY;
  $("#resultSummary").innerHTML = `
    <div class="bigPos">P${my.position}<span class="ofN"> / ${N}</span></div>
    <div class="cardName">${esc(my.name)}</div>
    <div class="beatLine">beat <b>${E.percentile(my, N)}%</b> of the field</div>
    <div class="statRow">
      <div><span>${my.time.toFixed(1)}s</span><label>time</label></div>
      <div><span>×${my.sailed.toFixed(2)}</span><label>sailed</label></div>
      <div><span>+${pts}</span><label>points</label></div>
    </div>
    ${my.waterWorked ? '<div class="award">🌊 WATER WORKED — sailed the longest line of the top half (+5)</div>' : ""}`;
  $("#tauntQuote").textContent = `${my.name}: "${tauntItem.name}"`;
  drawResultCard(my, N, pts, tauntItem);
  $("#raceAgainNote").textContent = "Same river, same name, same result — anywhere on Earth. That's the whole point.";
  show("result");
}

function drawResultCard(my, N, pts, tauntItem) {
  const cv = $("#resultCanvas"); const ctx = cv.getContext("2d");
  const water = outfit.base === "duck" ? ["#0d3b66", "#1b6ca8"] : ["#0e4d45", "#1f7a6d"];
  const g = ctx.createLinearGradient(0, 0, 1200, 630);
  g.addColorStop(0, water[0]); g.addColorStop(1, water[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 630);
  ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    for (let x = 0; x <= 1200; x += 12) {
      const y = 80 + i * 62 + E.dsin(x * 0.012 + i * 1.7) * 14;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 28px -apple-system,system-ui,sans-serif";
  ctx.fillText("THE STUDIO — DRESSED RACER PREVIEW", 60, 74);
  ctx.font = "22px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "#ffd447";
  ctx.fillText("STUDIO HEAT · " + DAY, 60, 110);
  ctx.fillStyle = "#fff";
  ctx.font = "800 160px -apple-system,system-ui,sans-serif";
  ctx.fillText("P" + my.position, 60, 320);
  ctx.font = "600 42px -apple-system,system-ui,sans-serif";
  ctx.fillText(E.normName(my.name), 60, 392);
  ctx.font = "28px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`beat ${E.percentile(my, N)}% of ${N} racers  ·  +${pts} pts`, 60, 436);
  ctx.font = "italic 26px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(`"${tauntItem.name}"`, 60, 484);
  SP.drawRacer(ctx, 1010, 250, 100, 0.12, false, outfit.base, outfit, 2.0);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "24px -apple-system,system-ui,sans-serif";
  ctx.fillText("Dress yours free — " + (location.host || "the studio"), 60, 570);
}

function downloadCard() {
  const cv = $("#resultCanvas");
  const a = document.createElement("a");
  a.download = `studio-${E.normName(racerName).replace(/\W+/g, "_")}.png`;
  a.href = cv.toDataURL("image/png");
  a.click();
  toast("Card saved.");
}

// ---------- views ----------
function show(view) {
  for (const v of ["wardrobe", "race", "result"]) $("#" + v + "View").classList.toggle("hidden", v !== view);
}

// ---------- wire up ----------
function init() {
  setBase(outfit.base);
  renderTabs();
  renderGrid();
  renderProgress();
  $("#racerNameInput").value = racerName;

  $("#baseDuckBtn").addEventListener("click", () => setBase("duck"));
  $("#baseCapyBtn").addEventListener("click", () => setBase("capy"));

  $("#catTabs").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-tab]");
    if (!btn) return;
    activeCat = btn.dataset.tab;
    renderTabs(); renderGrid();
  });

  $("#wardrobeGrid").addEventListener("click", (ev) => {
    const swatchBtn = ev.target.closest("[data-swatch]");
    if (swatchBtn) {
      const [cat, id, idxStr] = swatchBtn.dataset.swatch.split(":");
      equip(cat, id, +idxStr);
      return;
    }
    const buyBtn = ev.target.closest("[data-buy]");
    if (buyBtn) {
      toast("Preview only — payments arm at launch. The Season Pass unlocks everything at once.");
      return;
    }
    const equipBtn = ev.target.closest("[data-equip]");
    if (equipBtn) {
      const [cat, id] = equipBtn.dataset.equip.split(":");
      equip(cat, id);
    }
  });

  $("#seasonPassBtn").addEventListener("click", () => {
    toast(`Preview only — payments arm at launch. Season Pass: $9.99 for $${PREMIUM_TOTAL.toFixed(2)} of premium gear.`);
  });

  $("#seeRaceBtn").addEventListener("click", startRace);
  $("#skipRaceBtn").addEventListener("click", () => { if (!raceDone) { raceDone = true; finishRace(); } });
  $("#raceAgainBtn").addEventListener("click", startRace);
  $("#backWardrobeBtn").addEventListener("click", () => show("wardrobe"));
  $("#saveCardBtn").addEventListener("click", downloadCard);
  $("#resetProgressLink").addEventListener("click", (ev) => {
    ev.preventDefault();
    localStorage.removeItem("studio_outfit_v1");
    localStorage.removeItem("studio_progress_v1");
    outfit = defaultOutfit(); progress = loadProgress();
    setBase(outfit.base); renderGrid(); renderProgress();
    toast("Studio progress reset.");
  });

  window.addEventListener("resize", () => {
    sizePreview();
    if ($("#raceView").classList.contains("hidden") === false) sizeRaceCanvas();
  });

  sizePreview();
  previewRAF = requestAnimationFrame(previewLoop);
  show("wardrobe");
}

init();
})();
