// Hub bank visualizer data — builds assets/data/hubbanks.json, read by /hubbanks.html.
//
//   AERODATABOX_KEY=... node scripts/hubbanks/fetch.mjs [--date YYYY-MM-DD] [--from-raw]
//
// For one weekday, downloads the scheduled departures and arrivals at each hub from
// AeroDataBox's airport board endpoint (FIDS), keeps the flights operated by the
// airlines below, and writes one compact JSON file.
//
// Key: a free "Basic" subscription to AeroDataBox on RapidAPI
//      (https://rapidapi.com/aedbx-aedbx/api/aerodatabox) gives 400 units a month.
//      Each call covers 12 hours and costs 2 units, so one run = 4 hubs x 2 calls = 16 units.
//      Keys from API.Market work too: set APIMARKET_KEY instead of AERODATABOX_KEY.
//
// --date      schedule day (local time at each hub). Default: the most recent Wednesday
//             at least two days ago.
// --from-raw  don't call the API; rebuild the JSON from scripts/hubbanks/raw/<date>/
//             (every response is saved there, so a parsing fix costs no units).
//
// No dependencies: Node 20+ (global fetch).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUT = path.join(ROOT, "assets/data/hubbanks.json");

const HUBS = {
  YYZ: { name: "Toronto Pearson", city: "Toronto" },
  YUL: { name: "Montréal–Trudeau", city: "Montréal" },
  YVR: { name: "Vancouver International", city: "Vancouver" },
  YYC: { name: "Calgary International", city: "Calgary" },
};
// Flights are assigned to an airline by the prefix of their (operating) flight number.
// AC covers Air Canada mainline, Air Canada Rouge and Air Canada Express (Jazz, PAL),
// which all fly AC numbers; WS covers WestJet and WestJet Encore.
const AIRLINES = {
  AC: { name: "Air Canada", prefixes: ["AC"] },
  WS: { name: "WestJet", prefixes: ["WS", "WR"] },
};

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const FROM_RAW = args.includes("--from-raw");
const DATE = opt("--date") || defaultDate();
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) die(`--date must look like 2026-09-23, got "${DATE}"`);
const RAW = path.join(HERE, "raw", DATE);

const RAPID_KEY = process.env.AERODATABOX_KEY;
const MARKET_KEY = process.env.APIMARKET_KEY;
const API = MARKET_KEY
  ? { base: "https://prod.api.market/api/v1/aedbx/aerodatabox", headers: { "x-api-market-key": MARKET_KEY } }
  : { base: "https://aerodatabox.p.rapidapi.com", headers: { "X-RapidAPI-Key": RAPID_KEY, "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com" } };

const WINDOWS = [["00:00", "11:59"], ["12:00", "23:59"]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function die(msg) { console.error("[hubbanks] " + msg); process.exit(1); }
const log = (...a) => console.log("[hubbanks]", ...a);

function defaultDate() {
  const d = new Date(Date.now() - 2 * 864e5);
  while (d.getUTCDay() !== 3) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function call(hub, from, to) {
  const qs = new URLSearchParams({
    withLeg: "false", direction: "Both", withCancelled: "true",
    withCodeshared: "false", withCargo: "false", withPrivate: "false", withLocation: "false",
  });
  const url = `${API.base}/flights/airports/iata/${hub}/${DATE}T${from}/${DATE}T${to}?${qs}`;
  for (let i = 1; ; i++) {
    const r = await fetch(url, { headers: API.headers, signal: AbortSignal.timeout(60000) });
    if (r.status === 429 && i < 4) { log(`rate limited, waiting ${10 * i}s`); await sleep(10000 * i); continue; }
    if (r.status === 204) return { departures: [], arrivals: [] };
    const text = await r.text();
    if (!r.ok) die(`${r.status} for ${hub} ${from}–${to}: ${text.slice(0, 300)}\n` +
      (r.status === 400 ? "The date may be outside what your plan allows. Try another --date (a recent past weekday, or one in the coming weeks)." : ""));
    return JSON.parse(text);
  }
}

async function download() {
  if (!RAPID_KEY && !MARKET_KEY) die("Set AERODATABOX_KEY (RapidAPI) or APIMARKET_KEY (API.Market). See the top of this file.");
  fs.mkdirSync(RAW, { recursive: true });
  for (const hub of Object.keys(HUBS)) {
    for (const [from, to] of WINDOWS) {
      const f = path.join(RAW, `${hub}-${from.slice(0, 2)}.json`);
      if (fs.existsSync(f)) { log(`${hub} ${from}: already downloaded`); continue; }
      log(`${hub} ${DATE} ${from}–${to}`);
      fs.writeFileSync(f, JSON.stringify(await call(hub, from, to)));
      await sleep(1500);
    }
  }
}

// --- parsing ---------------------------------------------------------------
// AeroDataBox has used two layouts for board entries: { departure: {...}, arrival: {...} }
// and an older { movement: {...} }. Both are read. On a departure entry the hub's own
// side carries the time and the other side carries the destination airport; on an
// arrival entry it's the reverse.
function localTime(side) {
  if (!side) return null;
  return side.scheduledTime?.local || side.scheduledTimeLocal || null;
}
function countryFromIcao(icao = "") {
  if (/^C/.test(icao)) return "CA";
  if (/^(K|PH|PA|PG|TJ|TI)/.test(icao)) return "US"; // incl. Hawaii, Alaska, Guam, Puerto Rico, USVI
  return null;
}
function airlineOf(number = "") {
  const pre = number.trim().split(/\s+/)[0].replace(/\d+$/, "").toUpperCase();
  for (const [code, a] of Object.entries(AIRLINES)) if (a.prefixes.includes(pre)) return code;
  return null;
}

function parse() {
  const out = {
    schedule_date: DATE,
    weekday: new Date(DATE + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }),
    generated: new Date().toISOString(),
    source: "AeroDataBox airport departures and arrivals (scheduled times, operating flights only)",
    hubs: HUBS, airlines: Object.fromEntries(Object.entries(AIRLINES).map(([k, v]) => [k, v.name])),
    airports: {}, models: [], ops: {},
  };
  const modelIdx = new Map();
  const seen = new Set();
  let entries = 0, kept = 0, cancelled = 0, sample = null;

  for (const hub of Object.keys(HUBS)) {
    for (const a of Object.keys(AIRLINES)) out.ops[`${a}-${hub}`] = { arr: [], dep: [] };
    for (const [from] of WINDOWS) {
      const f = path.join(RAW, `${hub}-${from.slice(0, 2)}.json`);
      if (!fs.existsSync(f)) die(`missing ${path.relative(ROOT, f)} — run without --from-raw first`);
      const data = JSON.parse(fs.readFileSync(f, "utf8"));
      for (const dir of ["departures", "arrivals"]) {
        for (const it of data[dir] || []) {
          entries++;
          sample ??= it;
          const isDep = dir === "departures";
          const airline = airlineOf(it.number);
          if (!airline) continue;
          if (it.codeshareStatus === "IsCodeshared" || it.isCargo) continue;
          const here = isDep ? it.departure : it.arrival;
          const there = isDep ? it.arrival : it.departure;
          const t = localTime(here) || localTime(it.movement);
          const ap = there?.airport || it.movement?.airport;
          if (!t || !ap) continue;
          if (!t.startsWith(DATE)) continue; // the 12-hour windows can spill over midnight
          const m = +t.slice(11, 13) * 60 + +t.slice(14, 16);
          const code = ap.iata || ap.icao;
          if (!code || code === hub) continue;
          const number = it.number.trim().replace(/\s+/g, " ");
          const key = `${hub}|${dir}|${number}|${m}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (/cancel/i.test(it.status || "")) cancelled++;
          if (!out.airports[code]) {
            const country = ap.countryCode || countryFromIcao(ap.icao) || "";
            out.airports[code] = [ap.municipalityName || ap.shortName || ap.name || code, country.toUpperCase()];
          }
          const model = it.aircraft?.model || "";
          if (!modelIdx.has(model)) { modelIdx.set(model, out.models.length); out.models.push(model); }
          out.ops[`${airline}-${hub}`][isDep ? "dep" : "arr"].push([m, number, code, modelIdx.get(model)]);
          kept++;
        }
      }
    }
  }
  for (const o of Object.values(out.ops)) for (const k of ["arr", "dep"]) o[k].sort((x, y) => x[0] - y[0] || x[1].localeCompare(y[1]));

  log(`${entries} board entries read, ${kept} Air Canada / WestJet flights kept (${cancelled} marked cancelled, kept as scheduled)`);
  for (const [k, o] of Object.entries(out.ops)) log(`  ${k.padEnd(7)} ${String(o.arr.length).padStart(4)} arrivals ${String(o.dep.length).padStart(4)} departures`);
  const noCountry = Object.entries(out.airports).filter(([, v]) => !v[1]).map(([k]) => k);
  if (noCountry.length) log(`  no country for: ${noCountry.join(", ")} (shown as international)`);
  if (!kept) die("no flights parsed. First board entry, to check the response layout:\n" + JSON.stringify(sample, null, 2)?.slice(0, 2000));
  return out;
}

if (!FROM_RAW) await download();
const data = parse();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(data));
log(`wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB) for ${data.weekday} ${DATE}`);
