// Airline fleet tracker (Air Canada, United, Air France, Etihad) — run by
// .github/workflows/ac-fleet.yml every few minutes.
//
//   node scripts/ac-fleet/update.mjs <prevDir> <outDir>
//
// prevDir: files from the previous run (fleet-data branch), may be empty.
// outDir : where the new files are written:
//            status-AC.json, status-UA.json, status-AF.json, status-EY.json  (read by fleettracker.html)
//            status.json   (= Air Canada, kept for older copies of the page)
//            fleet.json    (internal state carried from run to run)
//            airports.json (compact airport list, refreshed weekly)
//
// Sources
//   - Air Canada fleet : Transport Canada, Canadian Civil Aircraft Register (open data),
//                        refreshed weekly; aircraft registered to Air Canada, Air Canada
//                        rouge LP and Jazz Aviation LP (Air Canada Express).
//   - Other fleets     : built up from what is seen flying: every aircraft transmitting an
//                        airline's callsign (UAL…, AFR…, ETD…) with that airline's country
//                        registration prefix. adsb.lol can't search by airline, so each run
//                        scans one group of aircraft types (rotating) to discover new ones.
//   - Positions        : adsb.lol open ADS-B network (ODbL), /v2/hex and /v2/type.
//   - Routes           : adsb.lol /api/0/routeset + adsbdb.com, cached, then checked
//                        against the aircraft's actual position and heading (core.mjs).
//   - Airports         : OurAirports (public domain), refreshed weekly.
// No dependencies: Node 20+ (global fetch, zlib).

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { OPERATORS, AIRLINES, DISCOVERY_GROUPS, typeFromModel, hexFromCanadianReg, buildAirports, computeStatus, parseCSVLine, AIRPORTS_VERSION } from "./core.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [prevDir = "prev", outDir = "out"] = process.argv.slice(2);
const WEEK = 7 * 24 * 3600e3;
const DAY = 24 * 3600e3;
const UA = "gregoiremaillard.com airline fleet page (github.com/gregoire-maillard/gregoire-maillard.github.io)";
const now = Date.now();

const readJSON = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[fleet]", ...a);

async function get(url, opts = {}, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { ...opts, headers: { "User-Agent": UA, ...(opts.headers || {}) }, signal: AbortSignal.timeout(opts.timeout || 30000) });
      if (r.status === 429 && i < tries) { await sleep(15000 * i); continue; }
      if (!r.ok) throw new Error(`${r.status} ${url.slice(0, 70)}`);
      return r;
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(2000 * i);
    }
  }
}

// ------------------------------------------------------------ fleet (weekly)
function unzip(buf) {
  let eocd = buf.length - 22;
  while (eocd > 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const fnl = buf.readUInt16LE(p + 28), exl = buf.readUInt16LE(p + 30), cml = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + fnl).toLowerCase();
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const data = buf.subarray(start, start + csize);
    files[name] = (method === 0 ? data : zlib.inflateRawSync(data)).toString("latin1");
    p += 46 + fnl + exl + cml;
  }
  return files;
}

async function fleetFromRegister() {
  const r = await get("https://wwwapps.tc.gc.ca/saf-sec-sur/2/ccarcs-riacc/download/ccarcsdb.zip", { timeout: 90000 });
  const files = unzip(Buffer.from(await r.arrayBuffer()));
  const owners = new Map();
  for (const line of files["carsownr.txt"].split(/\r?\n/)) {
    if (!line) continue;
    const c = parseCSVLine(line).map((x) => x.trim());
    const op = OPERATORS[c[1]];
    if (op) owners.set(c[0], op);
  }
  const fleet = [];
  for (const line of files["carscurr.txt"].split(/\r?\n/)) {
    if (!line) continue;
    const c = parseCSVLine(line).map((x) => x.trim());
    const op = owners.get(c[0]);
    if (!op || c[38] !== "Registered") continue;
    const type = typeFromModel(c[4]);
    if (!type) continue;
    const reg = "C-" + c[0];
    const bin = c[42];
    const hex = /^[01]{24}$/.test(bin) ? parseInt(bin, 2).toString(16).padStart(6, "0") : hexFromCanadianReg(reg);
    fleet.push({ reg, hex, type, op: op === "AC" && type === "B763" ? "CG" : op, msn: c[5] });
  }
  fleet.sort((a, b) => a.reg.localeCompare(b.reg));
  if (fleet.length < 200) throw new Error(`register gave only ${fleet.length} aircraft`);
  return fleet;
}

async function loadACFleet(prev) {
  if (prev && now - prev.fetched < WEEK) return prev;
  try {
    const aircraft = await fleetFromRegister();
    log(`Air Canada fleet refreshed from register: ${aircraft.length} aircraft`);
    return { source: "Transport Canada — Canadian Civil Aircraft Register", asOf: new Date(now).toISOString().slice(0, 10), fetched: now, aircraft };
  } catch (e) {
    log("register refresh failed:", e.message);
    if (prev) return { ...prev, fetched: now - WEEK + DAY }; // retry tomorrow
    const seed = readJSON(path.join(HERE, "seed-fleet.json"));
    return { source: seed.source, asOf: seed.asOf, fetched: now - WEEK + DAY, aircraft: seed.aircraft };
  }
}

async function loadAirports() {
  const prev = readJSON(path.join(prevDir, "airports.json"));
  if (prev && prev.version === AIRPORTS_VERSION && now - prev.fetched < WEEK) return prev;
  try {
    const r = await get("https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv", { timeout: 90000 });
    const rows = buildAirports(await r.text());
    log(`airports refreshed: ${rows.length}`);
    return { source: "OurAirports", version: AIRPORTS_VERSION, fetched: now, airports: rows };
  } catch (e) {
    log("airports refresh failed:", e.message);
    return prev ? { ...prev, fetched: now - WEEK + 24 * 3600e3 } : { source: "none", fetched: 0, airports: [] };
  }
}

// ------------------------------------------------------------ previous state
// fleet.json holds everything carried between runs. The first version of this
// script (Air Canada only) stored the AC fleet there and the AC state in status.json.
function loadState() {
  const f = readJSON(path.join(prevDir, "fleet.json"));
  const st = readJSON(path.join(prevDir, "status.json"));
  if (f && f.version === 2) return f;
  const state = { version: 2, acFleet: null, discovered: {}, status: {}, started: {}, routeCache: {}, discoveryIdx: 0 };
  if (f && f.aircraft) state.acFleet = { source: f.source, asOf: f.asOf, fetched: f.fetched, aircraft: f.aircraft };
  if (st && st.aircraft) {
    state.status.AC = st.aircraft;
    state.started.AC = st.started || now;
    state.routeCache = st.routeCache || {};
  }
  return state;
}

// ------------------------------------------------------------ discovery
function csAirline(cs) {
  for (const [code, a] of Object.entries(AIRLINES)) {
    for (const p of a.callsigns) if (cs.startsWith(p) && /^\d/.test(cs.slice(p.length))) return code;
  }
  return null;
}

// Add/refresh aircraft seen flying under a discovered airline's callsign.
function absorb(list, discovered, acHexes) {
  let added = 0;
  for (const a of list) {
    const cs = (a.flight || "").trim();
    const code = cs && csAirline(cs);
    if (!code || AIRLINES[code].fleet !== "discover") continue;
    const hex = String(a.hex).toLowerCase();
    if (acHexes.has(hex) || hex.startsWith("~")) continue;
    if (!AIRLINES[code].reg.test(a.r || "")) continue; // wet-leased or mislabelled aircraft
    const d = (discovered[code] ||= {});
    if (!d[hex]) { d[hex] = { reg: a.r, hex, type: a.t, first: now }; added++; }
    d[hex].last = now;
    if (a.t) d[hex].type = a.t;
    if (a.r) d[hex].reg = a.r;
    // an aircraft moves to another airline: drop it from the others
    for (const [other, od] of Object.entries(discovered)) if (other !== code && od[hex]) delete od[hex];
  }
  return added;
}

async function discover(state, acHexes) {
  const i = (state.discoveryIdx || 0) % DISCOVERY_GROUPS.length;
  state.discoveryIdx = i + 1;
  try {
    const r = await get(`https://api.adsb.lol/v2/type/${DISCOVERY_GROUPS[i]}`, { timeout: 60000 }, 3);
    const j = await r.json();
    const added = absorb(j.ac || [], state.discovered, acHexes);
    log(`discovery group ${i + 1}/${DISCOVERY_GROUPS.length}: ${(j.ac || []).length} aircraft scanned, ${added} new`);
  } catch (e) {
    log("discovery failed:", e.message);
  }
}

// ------------------------------------------------------------ live data
// adsb.lol rate-limits per IP, so ask in as few calls as possible (400 codes per
// call works) and back off on 429.
async function fetchLive(hexes) {
  const out = [];
  let ok = 0;
  for (let i = 0; i < hexes.length; i += 400) {
    const chunk = hexes.slice(i, i + 400);
    try {
      const r = await get(`https://api.adsb.lol/v2/hex/${chunk.join(",")}`, {}, 4);
      const j = await r.json();
      out.push(...(j.ac || []));
      ok++;
    } catch (e) {
      log("live chunk failed:", e.message);
    }
    await sleep(4000);
  }
  if (!ok) throw new Error("no live data at all — keeping previous status");
  return out;
}

// Route candidates per callsign, from two crowd-sourced databases. Answers are
// cached in routes.json (callsign routes rarely change) so each run only asks
// about callsigns it hasn't seen recently.
const ROUTE_TTL = 3 * 24 * 3600e3;
const stats = { callsigns: 0, cached: 0, asked: 0, adsblol: 0, adsbdb: 0, errors: [] };

async function fetchRoutes(live, cache) {
  const flying = live.filter((a) => (a.flight || "").trim() && typeof a.lat === "number" && a.alt_baro !== "ground");
  stats.callsigns = flying.length;
  const need = flying.filter((a) => { const c = cache[a.flight.trim()]; return !c || now - c.t > ROUTE_TTL; });
  stats.cached = flying.length - need.length;
  stats.asked = need.length;

  // 1) adsb.lol, 100 callsigns per call
  const planes = need.map((a) => ({ callsign: a.flight.trim(), lat: a.lat, lng: a.lon }));
  const fresh = {};
  for (const p of planes) fresh[p.callsign] = { t: now, c: [] };
  for (let i = 0; i < planes.length; i += 100) {
    try {
      const r = await get("https://api.adsb.lol/api/0/routeset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planes: planes.slice(i, i + 100) }),
      }, 3);
      for (const x of await r.json()) {
        const route = x && x._airport_codes_iata;
        if (x && fresh[x.callsign] && route && /^[A-Z]{3}(-[A-Z]{3})+$/.test(route)) { fresh[x.callsign].c.push(route); stats.adsblol++; }
      }
    } catch (e) {
      stats.errors.push("adsb.lol routes: " + e.message);
      log("adsb.lol routes failed:", e.message);
    }
    await sleep(2000);
  }

  // 2) adsbdb.com, one callsign per call (404 = unknown callsign)
  let n = 0;
  for (const cs of Object.keys(fresh)) {
    if (n++ >= 150) break;
    try {
      const r = await fetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(cs)}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
      if (r.status === 429) { stats.errors.push("adsbdb: 429"); break; }
      if (r.ok) {
        const f = (await r.json()).response?.flightroute;
        const codes = f ? [f.origin?.iata_code, f.midpoint?.iata_code, f.destination?.iata_code].filter(Boolean) : [];
        if (codes.length >= 2) { fresh[cs].c.push(codes.join("-")); stats.adsbdb++; }
      }
    } catch (e) {
      stats.errors.push("adsbdb: " + e.message);
      if (stats.errors.length > 10) break;
    }
    await sleep(250);
  }

  for (const [cs, v] of Object.entries(fresh)) cache[cs] = v;
  for (const [cs, v] of Object.entries(cache)) if (now - v.t > 2 * ROUTE_TTL) delete cache[cs];
  const out = {};
  for (const a of flying) { const cs = a.flight.trim(); out[cs] = (cache[cs] && cache[cs].c) || []; }
  return out;
}

// ------------------------------------------------------------ main
const state = loadState();
const airports = await loadAirports();
state.acFleet = await loadACFleet(state.acFleet);
const acHexes = new Set(state.acFleet.aircraft.map((a) => a.hex));

// prune aircraft not seen under their airline's callsign for 4 months
for (const d of Object.values(state.discovered)) for (const [hex, a] of Object.entries(d)) if (now - (a.last || 0) > 120 * DAY) delete d[hex];

await discover(state, acHexes);
await sleep(8000);

function fleetOf(code) {
  if (code === "AC") return state.acFleet.aircraft;
  const cargoTypes = AIRLINES[code].cargoTypes || [];
  return Object.values(state.discovered[code] || {})
    .map((a) => ({ reg: a.reg, hex: a.hex, type: a.type, op: code, cargo: cargoTypes.includes(a.type) || undefined, first: a.first }))
    .sort((a, b) => a.reg.localeCompare(b.reg));
}

let live = [];
let liveOk = true;
const allHexes = Object.keys(AIRLINES).flatMap((c) => fleetOf(c).map((a) => a.hex));
try { live = await fetchLive(allHexes); }
catch (e) { log(e.message); liveOk = false; }
if (liveOk) absorb(live, state.discovered, acHexes); // keeps "last seen as <airline>" fresh

const routes = liveOk ? await fetchRoutes(live, state.routeCache) : {};

fs.mkdirSync(outDir, { recursive: true });
const liveHex = new Set(live.map((a) => String(a.hex).toLowerCase()));
const summary = [];
for (const code of Object.keys(AIRLINES)) {
  const fleet = fleetOf(code);
  state.started[code] ||= now;
  const prevAc = state.status[code] || [];
  // no live data this run: keep the previous picture rather than aging it
  const aircraft = liveOk
    ? computeStatus(fleet, prevAc, live, routes, airports.airports, now)
    : (prevAc.length ? prevAc : computeStatus(fleet, [], [], {}, airports.airports, now));
  state.status[code] = aircraft;
  const status = {
    airline: code,
    updated: liveOk ? now : (state.updated || now),
    checked: now,
    started: state.started[code],
    liveCount: fleet.filter((a) => liveHex.has(a.hex)).length,
    sources: {
      fleet: code === "AC" ? `${state.acFleet.source} (as of ${state.acFleet.asOf})` : "aircraft seen flying under the airline's callsign (adsb.lol)",
      positions: "adsb.lol (ODbL)",
      routes: "adsb.lol + adsbdb.com, checked against position and heading",
      airports: airports.source,
    },
    aircraft,
  };
  fs.writeFileSync(path.join(outDir, `status-${code}.json`), JSON.stringify(status));
  if (code === "AC") fs.writeFileSync(path.join(outDir, "status.json"), JSON.stringify(status));
  const n = (k) => aircraft.filter((a) => a.status === k).length;
  const wr = aircraft.filter((a) => a.status === "air" && a.flight && a.flight.to).length;
  summary.push(`${code}: ${aircraft.length} aircraft · air ${n("air")} (${wr} with route) · ground ${n("ground")}`);
}
if (liveOk) state.updated = now;
state.routeStats = stats;
fs.writeFileSync(path.join(outDir, "fleet.json"), JSON.stringify(state));
fs.writeFileSync(path.join(outDir, "airports.json"), JSON.stringify(airports));
log(`live ${live.length}`);
for (const l of summary) log(l);
log("routes:", JSON.stringify(stats));
