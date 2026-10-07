#!/usr/bin/env node
// Runs the belly cargo capacity model of bellycapacity.html in Node and prints the figures the page shows,
// so they can be checked without a browser. Uses the exact engine embedded in the page (between the bcap-engine markers).
// Also checks the booking-limit rule (tender-weighted critical fractile) against a brute-force search.
// Run from the repo root:  node scripts/bellycapacity/check.js
// No heavy precompute is needed: the page computes everything in the browser in about two seconds.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const html = fs.readFileSync(path.join(root, "bellycapacity.html"), "utf8");
const m = html.match(/\/\/ <bcap-engine>([\s\S]*?)\/\/ <\/bcap-engine>/);
if (!m) throw new Error("engine markers not found in bellycapacity.html");
const B = new Function(m[1] + "\nreturn BCAP;")();
const data = JSON.parse(fs.readFileSync(path.join(root, "assets/data/bellycapacity.json"), "utf8"));
const M = B.model(data);
const kg = v => Math.round(v).toLocaleString("en-US");
const q = (a, p) => B.quantile(a, p);

// ---- the aircraft and the fuel model ----
const ac = M.ac;
console.log("787-9 limits: MTOW", kg(ac.mtow), "MLW", kg(ac.mlw), "MZFW", kg(ac.mzfw), "fuel", kg(ac.fuelCap));
// still-air range with a full cabin, its bags and no cargo, at MTOW: find the distance where the MTOW limit leaves 0 cargo
{
  const pax = ac.seats, bags = Math.round(pax * 1.15);
  let lo = 5000, hi = 20000;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; const M2 = Object.assign({}, M, { km: mid }); if (B.capacity(M2, pax, bags, 0).lim.mtow > 0) lo = mid; else hi = mid; }
  console.log("Still-air range, 290 passengers and bags, no cargo:", kg(lo), "km");
}
console.log("Booking curve: share booked by 30 days", (B.paxCurve(M, 30) * 100).toFixed(1) + "%", "by 7", (B.paxCurve(M, 7) * 100).toFixed(1) + "%", "by 1", (B.paxCurve(M, 1) * 100).toFixed(1) + "%");
console.log("Cargo requests: share by 30 days", (B.cargoCurve(M, 30) * 100).toFixed(1) + "%", "by 7", (B.cargoCurve(M, 7) * 100).toFixed(1) + "%", "by 1", (B.cargoCurve(M, 1) * 100).toFixed(1) + "%");

// ---- the year ----
const Y = B.year(M);
const C = Y.deps.map(d => d.cap.C).sort((a, b) => a - b);
const binds = {}; Y.deps.forEach(d => { binds[d.cap.bind] = (binds[d.cap.bind] || 0) + 1; });
console.log("\nYear: average capacity", kg(Y.meanC), "kg; P10", kg(q(C, 0.1)), "median", kg(q(C, 0.5)), "P90", kg(q(C, 0.9)), "min", kg(C[0]), "max", kg(C[C.length - 1]));
console.log("Limit that sets the capacity:", JSON.stringify(binds));
const MS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
console.log("Month  restricted  avgCapacity  avgPax  avgHeadwind  avgHours");
for (let i = 0; i < 12; i++) {
  const ds = Y.deps.slice(MS[i], MS[i + 1]), avg = f => ds.reduce((s, d) => s + f(d), 0) / ds.length;
  console.log(String(i + 1).padStart(5), String(ds.filter(d => d.cap.bind === "mtow").length).padStart(11), kg(avg(d => d.cap.C)).padStart(12),
    avg(d => d.boarded).toFixed(0).padStart(7), avg(d => d.hw).toFixed(0).padStart(12), avg(d => d.cap.hours).toFixed(1).padStart(9));
}

// ---- forecasts at the checkpoints ----
const t0 = Date.now();
const fcs = Y.deps.map((dep, d) => M.H.map(h => {
  const f = B.forecast(M, dep, h, M.n, M.seed + d * 7919);
  return { f, pl: B.prepLimit(f), mC: B.mean(f.C), q10: q(f.C, 0.1), q90: q(f.C, 0.9) };
}));
console.log("\nForecasts:", ((Date.now() - t0) / 1000).toFixed(1) + "s");
M.H.forEach((h, i) => console.log("  " + String(h).padStart(2) + " days out: middle 80% width", kg(B.mean(fcs.map(F => F[i].q90 - F[i].q10))), "kg"));

// ---- the booking-limit rule against brute force ----
const r = data.cargo.rate, c = data.cargo.offloadCost;
let worst = 0;
for (const d of [0, 45, 100, 200, 300]) for (const i of [0, 4, 7]) {
  const F = fcs[d][i], L = B.bestLimit(F.pl, r, c), vL = B.expNet(F.f, L, r, c).net;
  let bestV = -Infinity, bestB = 0;
  for (let b = 0; b <= 30000; b += 10) { const v = B.expNet(F.f, b, r, c).net; if (v > bestV) { bestV = v; bestB = b; } }
  worst = Math.max(worst, bestV - vL);
  if (i === 0 && d === 45) console.log("Rule vs brute force (", d, "h=" + M.H[i], "): rule", kg(L), "kg, $" + vL.toFixed(2), "| grid", kg(bestB), "kg, $" + bestV.toFixed(2));
}
console.log("Largest shortfall of the rule against a 10 kg grid search: $" + worst.toFixed(3) + " (should be about zero)");

// ---- the five policies ----
const pf = B.perfectFactor(B.tenderSample(M, 4000, M.seed + 17), r, c);
const sim = B.simulate(M, Y, fcs, r, c, pf);
console.log("\nCritical ratio", (r / (r + c)).toFixed(3), "; with capacity known, sell", (pf * 100).toFixed(1) + "% of it");
console.log("Policy     booked    flown  offloaded  offloadFlights  emptyCap     net");
for (const p of B.POLICIES) {
  const a = sim[p], avg = k => a.reduce((s, x) => s + x[k], 0) / a.length;
  console.log(p.padEnd(8), kg(avg("booked")).padStart(8), kg(avg("flown")).padStart(8), kg(avg("off")).padStart(10),
    ((a.filter(x => x.off > 1).length / a.length) * 100).toFixed(1).padStart(14) + "%", kg(avg("unused")).padStart(9), ("$" + kg(avg("net"))).padStart(8));
}
