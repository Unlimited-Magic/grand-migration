/* THE STUDIO — racer + accessory rendering. Pure canvas drawing, no state.
 * Body shapes mirror the main game's drawDuck/drawCapy so a dressed racer
 * looks like the same duck, just fancier.
 */
(function (root) {
"use strict";
const E = root.GMEngine;

const ANCHORS = {
  duck: { hatY: 0.14, eyeX: 0.2, eyeY: 0.72, neckY: 0.58, headR: 0.55, bobK: 0.25 },
  capy: { hatY: 0.26, eyeX: 0.16, eyeY: 0.62, neckY: 0.5, headR: 0.45, bobK: 0.18 },
};
// Neutral anchor used when rendering a standalone item icon (not on a head).
const ICON_A = { hatY: 0, eyeX: 0.32, eyeY: 0, neckY: 0, headR: 0.9, bobK: 0 };

function drawDuckBody(ctx, s) {
  ctx.fillStyle = "#ffd447";
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#eab520";
  ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.05, s * 0.45, s * 0.3, 0.5, 0, 7); ctx.fill();
  ctx.fillStyle = "#ffdf6b";
  ctx.beginPath(); ctx.arc(0, s * 0.75, s * 0.55, 0, 7); ctx.fill();
  ctx.fillStyle = "#ff8c00";
  ctx.beginPath(); ctx.ellipse(0, s * 1.25, s * 0.28, s * 0.16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#082033";
  ctx.beginPath(); ctx.arc(-s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.arc(s * 0.2, s * 0.72, s * 0.09, 0, 7); ctx.fill();
}

function drawCapyBody(ctx, s) {
  ctx.fillStyle = "#a8764f";
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.95, s * 0.8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#b5835a";
  ctx.beginPath(); ctx.ellipse(0, s * 0.7, s * 0.5, s * 0.45, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#c69066";
  ctx.beginPath(); ctx.ellipse(0, s * 1.0, s * 0.32, s * 0.22, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#8d5f3d";
  ctx.beginPath(); ctx.arc(-s * 0.34, s * 0.38, s * 0.13, 0, 7); ctx.arc(s * 0.34, s * 0.38, s * 0.13, 0, 7); ctx.fill();
  ctx.fillStyle = "#ff9f1c";
  ctx.beginPath(); ctx.arc(0, s * 0.28, s * 0.18, 0, 7); ctx.fill();
  ctx.strokeStyle = "#10281f"; ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath(); ctx.moveTo(-s * 0.26, s * 0.62); ctx.lineTo(-s * 0.1, s * 0.62);
  ctx.moveTo(s * 0.1, s * 0.62); ctx.lineTo(s * 0.26, s * 0.62); ctx.stroke();
}

const BODY = { duck: drawDuckBody, capy: drawCapyBody };

// ---------- hats ----------
function drawBeanie(ctx, s, a, color) {
  const y = a.hatY * s;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, y, a.headR * s * 0.95, Math.PI, 0, false); ctx.fill();
  ctx.fillRect(-a.headR * s * 0.98, y - s * 0.03, a.headR * s * 1.96, s * 0.09);
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(0, y - a.headR * s * 0.92, s * 0.09, 0, 7); ctx.fill();
}
function drawCap(ctx, s, a, color) {
  const y = a.hatY * s;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, y, a.headR * s * 0.88, a.headR * s * 0.62, 0, Math.PI, 0); ctx.fill();
  ctx.fillRect(-a.headR * s * 0.88, y - s * 0.03, a.headR * s * 1.76, s * 0.07);
  ctx.beginPath(); ctx.ellipse(0, y + a.headR * s * 0.3, a.headR * s * 0.55, s * 0.09, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.arc(0, y - a.headR * s * 0.5, s * 0.045, 0, 7); ctx.fill();
}
function drawTopHat(ctx, s, a, color) {
  const y = a.hatY * s, w = a.headR * s * 1.05;
  ctx.fillStyle = color;
  ctx.fillRect(-w * 0.48, y - s * 0.58, w * 0.96, s * 0.5);
  ctx.beginPath(); ctx.ellipse(0, y, w * 0.78, s * 0.1, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#ffd447";
  ctx.fillRect(-w * 0.48, y - s * 0.16, w * 0.96, s * 0.07);
}
function drawCrown(ctx, s, a, color) {
  const y = a.hatY * s, w = a.headR * s * 1.1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w * 0.5, y + s * 0.06);
  ctx.lineTo(-w * 0.5, y - s * 0.04);
  ctx.lineTo(-w * 0.25, y - s * 0.26);
  ctx.lineTo(0, y - s * 0.04);
  ctx.lineTo(w * 0.25, y - s * 0.26);
  ctx.lineTo(w * 0.5, y - s * 0.04);
  ctx.lineTo(w * 0.5, y + s * 0.06);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#e63946";
  [-w * 0.25, 0, w * 0.25].forEach((px) => { ctx.beginPath(); ctx.arc(px, y - s * 0.13, s * 0.038, 0, 7); ctx.fill(); });
}
const HAT_DRAW = { beanie: drawBeanie, cap: drawCap, tophat: drawTopHat, crown: drawCrown };

// ---------- eyewear ----------
function drawMonocle(ctx, s, a, color) {
  const x = a.eyeX * s, y = a.eyeY * s;
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.045);
  ctx.beginPath(); ctx.arc(x, y, s * 0.14, 0, 7); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.12, y + s * 0.1);
  ctx.quadraticCurveTo(x + s * 0.3, y + s * 0.35, x + s * 0.05, y + s * 0.55);
  ctx.stroke();
}
function drawShades(ctx, s, a, lens) {
  const y = a.eyeY * s;
  ctx.fillStyle = lens;
  ctx.beginPath(); ctx.ellipse(-a.eyeX * s, y, s * 0.16, s * 0.11, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(a.eyeX * s, y, s * 0.16, s * 0.11, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#ffd447"; ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.beginPath(); ctx.moveTo(-a.eyeX * s + s * 0.16, y); ctx.lineTo(a.eyeX * s - s * 0.16, y); ctx.stroke();
}
const EYE_DRAW = { monocle: drawMonocle, shades: drawShades };

// ---------- neck ----------
function drawBowtie(ctx, s, a, color) {
  const y = a.neckY * s;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(-s * 0.24, y - s * 0.13); ctx.lineTo(-s * 0.24, y + s * 0.13); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s * 0.24, y - s * 0.13); ctx.lineTo(s * 0.24, y + s * 0.13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.arc(0, y, s * 0.06, 0, 7); ctx.fill();
}
function drawScarf(ctx, s, a, color) {
  const y = a.neckY * s;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, y, s * 0.52, s * 0.16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#f4ede1";
  ctx.fillRect(-s * 0.08, y, s * 0.16, s * 0.48);
  ctx.fillStyle = color;
  ctx.fillRect(-s * 0.08, y + s * 0.16, s * 0.16, s * 0.11);
}
function drawChain(ctx, s, a, color) {
  const y = a.neckY * s + s * 0.06;
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.beginPath(); ctx.arc(0, y, s * 0.44, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, y + s * 0.28, s * 0.07, 0, 7); ctx.fill();
}
const NECK_DRAW = { bowtie: drawBowtie, scarf: drawScarf, chain: drawChain };

// ---------- trail effects (world space, drawn behind the sprite) ----------
function drawTrail(ctx, x, y, s, t, id) {
  if (!id || id === "none") return;
  if (id === "bubbles") {
    for (let i = 0; i < 6; i++) {
      const rise = (t * 26 + i * 23) % (s * 3);
      const px = x + E.dsin(t * 0.6 + i * 0.9) * s * 0.28;
      const py = y + s * 0.9 + rise;
      const alpha = Math.max(0, 1 - rise / (s * 3));
      ctx.fillStyle = `rgba(220,240,255,${(0.55 * alpha).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(px, py, s * (0.05 + 0.03 * (i % 3)), 0, 7); ctx.fill();
    }
  } else if (id === "sparkle") {
    for (let i = 0; i < 5; i++) {
      const rise = (t * 20 + i * 31) % (s * 2.6);
      const px = x + E.dsin(t * 1.1 + i * 2) * s * 0.3;
      const py = y + s * 0.8 + rise;
      const alpha = Math.max(0, 1 - rise / (s * 2.6)) * (0.5 + 0.5 * E.dsin(t * 4 + i * 2));
      ctx.fillStyle = `rgba(255,212,71,${alpha.toFixed(2)})`;
      const r = s * 0.08;
      ctx.beginPath();
      ctx.moveTo(px, py - r); ctx.lineTo(px + r * 0.3, py - r * 0.3); ctx.lineTo(px + r, py); ctx.lineTo(px + r * 0.3, py + r * 0.3);
      ctx.lineTo(px, py + r); ctx.lineTo(px - r * 0.3, py + r * 0.3); ctx.lineTo(px - r, py); ctx.lineTo(px - r * 0.3, py - r * 0.3);
      ctx.closePath(); ctx.fill();
    }
  } else if (id === "rainbow") {
    for (let i = 0; i < 10; i++) {
      const rise = i * s * 0.22 + ((t * 40) % (s * 0.22));
      const px = x + E.dsin(t * 0.9 - i * 0.5) * s * 0.22;
      const py = y + s * 0.85 + rise;
      const hue = (i * 26 + t * 40) % 360;
      const alpha = Math.max(0, 1 - i / 10);
      ctx.fillStyle = `hsla(${hue.toFixed(0)},85%,60%,${(alpha * 0.8).toFixed(2)})`;
      ctx.beginPath(); ctx.ellipse(px, py, s * 0.16, s * 0.06, 0, 0, 7); ctx.fill();
    }
  }
}

// ---------- composed racer ----------
// outfit = { hat:{id,color}, eyewear:{id,color}, neck:{id,color}, trail:{id} }
function drawRacer(ctx, x, y, s, bob, isMe, base, outfit, t) {
  drawTrail(ctx, x, y, s, t || 0, outfit.trail && outfit.trail.id);
  ctx.save();
  ctx.translate(x, y);
  const a = ANCHORS[base] || ANCHORS.duck;
  ctx.rotate(bob * a.bobK);
  if (isMe) { ctx.shadowColor = "#fff"; ctx.shadowBlur = s * 1.2; }
  (BODY[base] || BODY.duck)(ctx, s);
  if (outfit.neck && NECK_DRAW[outfit.neck.id]) NECK_DRAW[outfit.neck.id](ctx, s, a, outfit.neck.color);
  if (outfit.hat && HAT_DRAW[outfit.hat.id]) HAT_DRAW[outfit.hat.id](ctx, s, a, outfit.hat.color);
  if (outfit.eyewear && EYE_DRAW[outfit.eyewear.id]) EYE_DRAW[outfit.eyewear.id](ctx, s, a, outfit.eyewear.color);
  ctx.restore();
}

// Render a single accessory (or trail) centered in its own icon canvas.
function drawIcon(ctx, cw, ch, cat, id, color) {
  ctx.clearRect(0, 0, cw, ch);
  const s = Math.min(cw, ch) * 0.42;
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  if (cat === "hat" && HAT_DRAW[id]) HAT_DRAW[id](ctx, s, ICON_A, color);
  else if (cat === "eyewear" && EYE_DRAW[id]) EYE_DRAW[id](ctx, s, ICON_A, color);
  else if (cat === "neck" && NECK_DRAW[id]) NECK_DRAW[id](ctx, s, ICON_A, color);
  ctx.restore();
  if (cat === "trail" && id !== "none") drawTrail(ctx, cw / 2, ch * 0.03, Math.min(cw, ch) * 0.25, 2.2, id);
}

const StudioSprites = { ANCHORS, drawRacer, drawTrail, drawIcon, BODY };
if (typeof module !== "undefined" && module.exports) module.exports = StudioSprites;
root.StudioSprites = StudioSprites;
})(typeof globalThis !== "undefined" ? globalThis : this);
