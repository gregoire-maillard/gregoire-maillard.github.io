#!/usr/bin/env node
// Checks the fleet assignment page's numbers outside the browser.
// Runs the exact engine embedded in fleetassign.html (between the fam-engine markers) in Node, with the same HiGHS
// build the page loads (the highs npm package, 1.15.3), for both fleets and all three demand levels, and checks:
//   - every plan covers each flight once, balances at every node and stays within the fleet counts;
//   - the greedy plans never cost less than the optimum, and the LP relaxation never more;
//   - OR 101's worked example: 160 ± 30 passengers, $250 fare, 2.5 hours gives $22,407 on 150 seats and $22,125 on 190;
//   - 1,000 simulated days average out close to the expected cost.
//
//   npm i highs@1.15.3        (once)
//   node scripts/fleetassign/check.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import loadHighs from "highs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const html = fs.readFileSync(path.join(ROOT, "fleetassign.html"), "utf8");
const m = html.match(/\/\/ <fam-engine>([\s\S]*?)\/\/ <\/fam-engine>/);
if (!m) throw new Error("engine markers not found in fleetassign.html");
const FAM = new Function(m[1] + "\nreturn FAM;")();
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/data/fleetassign.json"), "utf8"));
const highs = await loadHighs();

let failures = 0;
function check(cond, msg) { if (!cond) { failures++; console.log("  FAIL " + msg); } }
const usd = v => "$" + Math.round(v).toLocaleString("en-US");

// OR 101, chapter 05 example
{
  const leg = { block: 150, fare: 250 }, dem = { mean: 160, sd: 30 };
  const m150 = FAM.legCost(leg, dem, { seats: 150, costBH: 7200 }, 0), m190 = FAM.legCost(leg, dem, { seats: 190, costBH: 8600 }, 0);
  console.log(`OR 101 example: 150 seats ${usd(m150.op)} + ${m150.spill.toFixed(1)} spilled = ${usd(m150.total)}; 190 seats ${usd(m190.op)} + ${m190.spill.toFixed(1)} = ${usd(m190.total)}`);
  check(Math.round(m150.total) === 22407 && Math.round(m190.total) === 22125, "OR 101 example costs");
}

const flights = FAM.schedule(data);
console.log(`\n${flights.length} flights, ${flights.reduce((s, f) => s + f.block, 0) / 60} block hours\n`);
console.log("fleet  demand   optimum    LP relax   largest    cheapest   each-cheapest  aircraft opt/largest/cheapest   1,000 days (opt, largest)");
for (const p of data.fleetPresets) for (const lv of data.demandLevels) {
  const fleets = data.fleets.map(f => ({ ...f, count: p.counts[f.key] || 0 }));
  const dems = FAM.demand(data, flights, data.demand.seed, lv.mult);
  const I = FAM.instance(flights, dems, fleets, data.recapture, FAM.mins(data.countLine));
  const o = FAM.optimum(highs, I), g = FAM.greedy(highs, I, "largest"), c = FAM.greedy(highs, I, "cheapest");
  const tag = `${p.key}/${lv.key}`;
  if (!o.ok || !g.ok || !c.ok) { check(false, tag + " solve failed"); continue; }
  const ks = fleets.map((f, k) => k).filter(k => fleets[k].count > 0);
  const lb = flights.reduce((s, f, i) => s + Math.min(...ks.map(k => I.C[i][k].total)), 0);
  const used = [o, g, c].map(r => {
    const fl = FAM.planFlows(I, r.plan);
    fleets.forEach((f, k) => {
      if (r.plan.some(x => x === k)) check(f.count > 0, tag + " uses a type with no aircraft");
      Object.values(fl[k].stations).forEach(st => check(Number.isFinite(st.overnight) && st.onGround.every(v => v >= 0), tag + " balance"));
      check(fl[k].used <= f.count, `${tag} ${f.key} uses ${fl[k].used} of ${f.count}`);
    });
    check(r.plan.length === flights.length && r.plan.every(k => k >= 0), tag + " cover");
    return fl.map(x => x.used).join("");
  });
  check(Math.abs(FAM.planCost(I, o.plan).total - o.obj) < 1, tag + " objective matches plan cost");
  check(g.obj >= o.obj - 1 && c.obj >= o.obj - 1, tag + " greedy below optimum");
  check(o.lpObj <= o.obj + 1 && lb <= o.lpObj + 1, tag + " bounds");
  const sim = FAM.simulate(I, [o.plan, g.plan], data.simDays, data.simSeed, data.recapture).map(a => a.reduce((s, v) => s + v, 0) / a.length);
  check(Math.abs(sim[0] / o.obj - 1) < 0.01, tag + " simulation far from expected cost");
  console.log(`${p.key.padEnd(6)} ${lv.key.padEnd(8)} ${usd(o.obj).padStart(9)}  ${usd(o.lpObj).padStart(9)}  ${usd(g.obj).padStart(9)}  ${usd(c.obj).padStart(9)}  ${usd(lb).padStart(12)}   ${used.join(" / ").padEnd(30)} ${usd(sim[0])}, ${usd(sim[1])}`);
}
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
