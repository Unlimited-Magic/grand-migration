/* THE COLLECTIBLE CONCEPT — mint mockup + permanent-record demo. Classic script; engine in ../js/engine.js. */
(function () {
"use strict";
const E = window.GMEngine;
const $ = (s) => document.querySelector(s);
const FIELD = 400;

function esc(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }

function serialFor(name) {
  const h = E.xmur3("MINT:" + E.normName(name).toUpperCase())();
  return String(h % 100000).padStart(5, "0");
}

// ---------- mint preview mockup ----------
$("#mintBtn").addEventListener("click", () => {
  const raw = $("#mintName").value;
  const name = E.normName(raw);
  const box = $("#mintPreview");
  if (!name) {
    box.innerHTML = '<div class="dim">Type a racer name above to preview a token.</div>';
    box.classList.remove("hidden");
    return;
  }
  const tier = $("#mintTier").value;
  const serial = serialFor(name);
  const today = E.todayKey();
  box.innerHTML = `
    <div class="tokenCard">
      <div class="tokenTop">
        <span class="tokenTier">${esc(tier)}</span>
        <span class="tokenSerial">#${serial}</span>
      </div>
      <div class="tokenName">${esc(name)}</div>
      <div class="tokenSub">Minted ${today} · races forever, provably from name + date</div>
      <div class="tokenNote">Preview only — no wallet connected, no blockchain call made. This is what the card would show.</div>
    </div>`;
  box.classList.remove("hidden");
});

// ---------- permanent record demo ----------
$("#recordBtn").addEventListener("click", () => {
  const raw = $("#recordName").value;
  const name = E.normName(raw);
  const box = $("#recordResult");
  if (!name) {
    box.innerHTML = '<div class="dim">Type a name to compute its record.</div>';
    box.classList.remove("hidden");
    return;
  }
  const rows = [];
  const base = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - i));
    const dateKey = d.toISOString().slice(0, 10);
    const daily = E.dailyResult(dateKey, [name], FIELD);
    const r = daily.lookup(name);
    rows.push({ dateKey, r, N: daily.results.length });
  }
  box.innerHTML = `
    <table class="miniTable">
      <thead><tr><th>date</th><th>finish</th><th>beat</th><th>time</th></tr></thead>
      <tbody>${rows.map((x) => `<tr><td>${x.dateKey}</td><td>P${x.r.position} / ${x.N}</td><td>${E.percentile(x.r, x.N)}%</td><td>${x.r.time.toFixed(1)}s</td></tr>`).join("")}</tbody>
    </table>
    <div class="dim" style="margin-top:8px;">Recomputed live, right here, from nothing but the name and each date. Anyone can run the same numbers with the open engine — no server lookup, no oracle to trust.</div>`;
  box.classList.remove("hidden");
});

})();
