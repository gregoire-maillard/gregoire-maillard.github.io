// One-off / occasional helper: adds past years' Airbus deliveries by customer to fleet-orders.json.
//
//   node scripts/fleet-orders/merge-airbus-history.mjs DIR [--json assets/data/fleet-orders.json]
//
// Why: Airbus's annual archives (orders-and-deliveries-YYYY.zip) sit behind a bot filter, so the
// GitHub Action can't download them. They open fine in a normal browser. DIR holds one
// YYYY.json per year with the December workbook's "Deliveries" sheet, as
//   { "file": "<workbook name>", "rows": [[rowNumber, [["B", "AIR CANADA"], ["D", 45291], ...]], ...] }
// (extracted in the browser; see README.md, "Airbus delivery history").
//
// The years land in customers[].h / customers[].hA and sources.airbus.historyYears, which
// update.mjs already carries over from run to run, so this only has to be done once per year.
import fs from "node:fs";
import path from "node:path";
import { excelDate, num, familyOf, nameKey, MAKER } from "./lib.mjs";

const dir = process.argv[2];
const ji = process.argv.indexOf("--json");
const JSON_PATH = path.resolve(ji > 0 ? process.argv[ji + 1] : "assets/data/fleet-orders.json");
if (!dir) { console.error("usage: merge-airbus-history.mjs DIR [--json FILE]"); process.exit(1); }

const colIndex = (letters) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

function toRows(compact) {
  const rows = [];
  for (const [rn, cells] of compact) { const r = []; for (const [ref, v] of cells) r[colIndex(ref)] = v; rows[rn - 1] = r; }
  for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
  return rows;
}
function asOf(rows) {
  for (const r of rows.slice(0, 12)) for (const c of r) {
    const m = /Summary to (\d{1,2})(?:st|nd|rd|th)? (\w{3})\w* (\d{4})/i.exec(String(c ?? ""));
    if (m && m[2].toLowerCase() in MON) return new Date(Date.UTC(+m[3], MON[m[2].toLowerCase()], +m[1])).toISOString().slice(0, 10);
  }
  return null;
}
// same parser as update.mjs
function deliveries(rows) {
  const h = rows.findIndex((r) => r && r.some((c) => String(c ?? "").trim() === "CUSTOMER") && r.some((c) => /date of delivery/i.test(String(c ?? ""))));
  if (h < 0) return null;
  const head = rows[h];
  const nc = head.findIndex((c) => String(c ?? "").trim() === "CUSTOMER");
  const dateCol = head.findIndex((c) => /date of delivery/i.test(String(c ?? "")));
  const types = [];
  head.forEach((c, j) => { if (j > dateCol && c != null && String(c).trim() && String(c).trim() !== "TOTAL") types.push([j, String(c).trim()]); });
  const list = [];
  for (const r of rows.slice(h + 1)) {
    const name = String(r?.[nc] ?? "").trim();
    if (!name || /^TOTAL/i.test(name)) continue;
    const d = r[dateCol];
    const date = typeof d === "number" ? excelDate(d) : d ? new Date(d) : null;
    for (const [j, type] of types) { const n = num(r[j]); if (n) list.push({ name, date, type, n }); }
  }
  return list;
}

const D = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const byId = new Map(D.customers.map((c) => [c.id, c]));
const years = D.sources.airbus.historyYears || [];
const added = [];
for (const f of fs.readdirSync(dir).filter((f) => /^\d{4}\.json$/.test(f)).sort()) {
  const src = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const rows = toRows(src.rows);
  const date = asOf(rows), list = deliveries(rows);
  const y = +f.slice(0, 4);
  if (!date || !list || +date.slice(0, 4) !== y) { console.error(`${f}: not a ${y} Deliveries sheet, skipped`); continue; }
  if (years.some((x) => x.year === y)) { console.error(`${f}: ${y} is already in the data, skipped`); continue; }
  // wipe any Airbus figures for that year, then add (Boeing figures for the year are untouched)
  for (const c of D.customers) {
    if (c.h?.[y]) for (const fam of Object.keys(c.h[y])) if (MAKER(fam) === "Airbus") delete c.h[y][fam];
    if (c.hA?.[y]) delete c.hA[y];
  }
  let total = 0, matched = 0;
  for (const d of list) {
    total += d.n;
    const fam = familyOf(d.type) || "Other";
    const m = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(d.name);
    const add = (key, via) => {
      const c = byId.get(key); if (!c) return false;
      const e = ((c.h ||= {})[y] ||= {})[fam] ||= [0, 0]; e[via ? 1 : 0] += d.n;
      const a = ((c.hA ||= {})[y] ||= {})[fam] ||= [0, 0]; a[via ? 1 : 0] += d.n;
      return true;
    };
    let hit = false;
    if (m) { hit = add(nameKey(m[1]), false) | add(nameKey(m[2]), true); } else hit = add(nameKey(d.name), false);
    if (hit) matched += d.n;
  }
  years.push({ year: y, asOf: date, file: src.file });
  added.push(`${y}: ${total} deliveries, ${matched} to customers on the page`);
}
years.sort((a, b) => a.year - b.year);
D.sources.airbus.historyYears = years;
fs.writeFileSync(JSON_PATH, JSON.stringify(D));
console.log(added.join("\n") || "nothing added");
