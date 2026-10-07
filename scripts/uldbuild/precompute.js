#!/usr/bin/env node
// Precomputes section 4 of uldbuild.html (1,000 shipment lists, every hold layout and weight allowance) and checks every load.
// Uses the exact engine embedded in uldbuild.html (between the uld-engine markers), so page and data can't drift apart.
// Run from the repo root:  node scripts/uldbuild/precompute.js
// Reads assets/data/uldbuild.json, writes assets/data/uldbuild-batch.json. Takes a few seconds.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const html = fs.readFileSync(path.join(root, "uldbuild.html"), "utf8");
const m = html.match(/\/\/ <uld-engine>([\s\S]*?)\/\/ <\/uld-engine>/);
if (!m) throw new Error("engine markers not found in uldbuild.html");
const ULD = new Function(m[1] + "\nreturn ULD;")();
const D = JSON.parse(fs.readFileSync(path.join(root, "assets/data/uldbuild.json"), "utf8"));

const N = 1000, SEED0 = 1;                 // lists 1 to 1,000 (the page opens on list D.seed)
const BIN0 = -10, BINW = 2.5, NBIN = 18;   // histogram of mix vs rate, -10% to +35%, end bars catch the rest
const EPS = 1e-6;

// ---------- invariant checks on one load ----------
let checked = 0;
function check(S, ships, label) {
  const sl = {};
  let gross = 0, cargoW = 0, cargoV = 0;
  const pieces = {};
  for (const u of S.ulds) {
    const spec = D.ulds[u.type];
    if (u.netW + spec.tare > spec.mgw + EPS) throw new Error(label + ": ULD over its maximum gross weight");
    if (u.vol > spec.volM3 * D.stow + EPS) throw new Error(label + ": ULD over its stowable volume");
    if (!u.slot || u.slot.type !== u.type) throw new Error(label + ": ULD in a position of the wrong type");
    if (sl[u.slot.id]) throw new Error(label + ": position used twice");
    sl[u.slot.id] = 1;
    gross += u.netW + u.tare;
    for (const it of u.items) {
      if (!ULD.pieceFits(D, u.type, ships[it.id].dims)) throw new Error(label + ": piece doesn't fit its ULD");
      pieces[it.id] = (pieces[it.id] || 0) + it.n;
      cargoW += it.w; cargoV += it.v;
    }
  }
  if (gross > S.allowance + EPS) throw new Error(label + ": over the weight allowance");
  if (Math.abs(gross - S.gross) > 1e-3) throw new Error(label + ": gross weight doesn't add up");
  for (const id of S.loaded) if (pieces[id] !== ships[id].n) throw new Error(label + ": shipment split or incomplete");
  if (Object.keys(pieces).length !== S.loaded.length) throw new Error(label + ": cargo from a shipment not marked loaded");
  let rev = 0; for (const id of S.loaded) rev += ships[id].rev;
  if (Math.abs(rev - S.rev) > 1e-6) throw new Error(label + ": revenue doesn't add up");
  // chargeable weight: never below actual, equals volume weight for light cargo
  for (const id of S.loaded) {
    const s = ships[id];
    if (s.cw + EPS < s.w || Math.abs(s.cw - Math.max(s.w, s.v * 1e6 / D.volDivisor)) > 1e-6) throw new Error(label + ": chargeable weight");
  }
  checked++;
}

const cells = {};
const t0 = Date.now();
const lists = [];
for (let i = 0; i < N; i++) lists.push(ULD.genShipments(D, SEED0 + i));
for (const cfg of D.configs) for (const al of D.allowances) {
  const acc = { rate: { rev: 0, wFill: 0, vFill: 0, cgOk: 0, n: 0 }, mix: { rev: 0, wFill: 0, vFill: 0, cgOk: 0, n: 0 } };
  const gains = [];
  let wins = 0;
  for (let i = 0; i < N; i++) {
    const ships = lists[i], r = {};
    for (const mode of ["rate", "mix"]) {
      const S = ULD.run(D, ships, cfg.key, al, mode, null, "balanced");
      check(S, ships, cfg.key + "|" + al + "|" + mode + "|list " + (SEED0 + i));
      const a = acc[mode], sm = S.sum;
      a.rev += sm.rev; a.wFill += sm.wFill; a.vFill += sm.vFill; a.cgOk += sm.cgOk ? 1 : 0; a.n += sm.nLoaded;
      r[mode] = sm.rev;
    }
    // the reader's own pick goes through the same build-up: check it on a random half of the list
    if (i % 50 === 0) {
      const picks = ships.filter((s, k) => (k * 7 + i) % 2).map(s => s.id).reverse();
      const S = ULD.run(D, ships, cfg.key, al, "hand", picks, "front");
      check(S, ships, cfg.key + "|" + al + "|hand|list " + (SEED0 + i));
    }
    const g = r.mix / r.rate - 1;
    gains.push(g); if (g > 1e-9) wins++;
  }
  gains.sort((a, b) => a - b);
  const hist = new Array(NBIN).fill(0);
  for (const g of gains) hist[Math.max(0, Math.min(NBIN - 1, Math.floor((g * 100 - BIN0) / BINW)))]++;
  const out = { gainMean: gains.reduce((a, b) => a + b, 0) / N, gainMed: gains[N / 2], winShare: wins / N, hist };
  for (const mode of ["rate", "mix"]) {
    const a = acc[mode];
    out[mode] = { rev: Math.round(a.rev / N), wFill: +(a.wFill / N).toFixed(3), vFill: +(a.vFill / N).toFixed(3), cgOk: +(a.cgOk / N).toFixed(3), nLoaded: +(a.n / N).toFixed(1) };
  }
  out.gainMean = +out.gainMean.toFixed(4); out.gainMed = +out.gainMed.toFixed(4);
  cells[cfg.key + "|" + al] = out;
  console.log(cfg.name.padEnd(20), String(al).padStart(6), "rate $" + out.rate.rev, "mix $" + out.mix.rev,
    "gain " + (out.gainMean * 100).toFixed(1) + "% (median " + (out.gainMed * 100).toFixed(1) + "%)", "mix ahead " + (out.winShare * 100).toFixed(0) + "%",
    "fills rate " + (out.rate.wFill * 100).toFixed(0) + "/" + (out.rate.vFill * 100).toFixed(0) + " mix " + (out.mix.wFill * 100).toFixed(0) + "/" + (out.mix.vFill * 100).toFixed(0),
    "CG ok " + (out.mix.cgOk * 100).toFixed(0) + "%");
}
console.log("checked " + checked + " loads, no violations, " + ((Date.now() - t0) / 1000).toFixed(1) + "s");

const result = {
  about: "Best rate first against mixing dense and light, averages over " + N + " generated lists of " + D.nShipments + " shipments (seeds " + SEED0 + " to " + (SEED0 + N - 1) + "), balanced positions. Key: hold layout | weight allowance in kg. hist: number of lists by mix revenue against best rate first, in % bins from bins[0] of width binW; the end bars hold everything beyond. Generated by scripts/uldbuild/precompute.js from uldbuild.json.",
  generated: new Date().toISOString().slice(0, 10),
  lists: N, seed0: SEED0,
  bins: [BIN0], binW: BINW,
  cells
};
fs.writeFileSync(path.join(root, "assets/data/uldbuild-batch.json"), JSON.stringify(result));
console.log("wrote assets/data/uldbuild-batch.json");
