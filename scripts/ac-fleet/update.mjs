// Air Canada fleet tracker — run by .github/workflows/ac-fleet.yml every few minutes.
//
//   node scripts/ac-fleet/update.mjs <prevDir> <outDir>
//
// prevDir: files from the previous run (fleet-data branch), may be empty.
// outDir : where the new status.json / fleet.json / airports.json are written.
//
// Sources
//   - Fleet list : Transport Canada, Canadian Civil Aircraft Register (open data),
//                  refreshed weekly; aircraft registered to Air Canada, Air Canada
//                  rouge LP and Jazz Aviation LP (Air Canada Express).
//   - Positions  : adsb.lol open ADS-B network (ODbL), /v2/hex endpoint.
//   - Routes     : adsb.lol /api/0/routeset.
//   - Airports   : OurAirports (public domain), refreshed weekly.
// No dependencies: Node 20+ (global fetch, zlib).

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { OPERATORS, typeFromModel, hexFromCanadianReg, buildAirports, computeStatus, parseCSVLine } from "./core.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [prevDir = "prev", outDir = "out"] = process.argv.slice(2);
const WEEK = 7 * 24 * 3600e3;
const UA = "gregoiremaillard.com AC fleet page (github.com/gregoire-maillard/gregoire-maillard.github.io)";
const now = Date.now();

const readJSON = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[ac-fleet]", ...a);

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

async function loadFleet() {
  const prev = readJSON(path.join(prevDir, "fleet.json"));
  if (prev && now - prev.fetched < WEEK) return prev;
  try {
    const aircraft = await fleetFromRegister();
    log(`fleet refreshed from register: ${aircraft.length} aircraft`);
    return { source: "Transport Canada — Canadian Civil Aircraft Register", asOf: new Date(now).toISOString().slice(0, 10), fetched: now, aircraft };
  } catch (e) {
    log("register refresh failed:", e.message);
    if (prev) return { ...prev, fetched: now - WEEK + 24 * 3600e3 }; // retry tomorrow
    const seed = readJSON(path.join(HERE, "seed-fleet.json"));
    return { source: seed.source, asOf: seed.asOf, fetched: now - WEEK + 24 * 3600e3, aircraft: seed.aircraft };
  }
}

async function loadAirports() {
  const prev = readJSON(path.join(prevDir, "airports.json"));
  if (prev && now - prev.fetched < WEEK) return prev;
  try {
    const r = await get("https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv", { timeout: 90000 });
    const rows = buildAirports(await r.text());
    log(`airports refreshed: ${rows.length}`);
    return { source: "OurAirports", fetched: now, airports: rows };
  } catch (e) {
    log("airports refresh failed:", e.message);
    return prev ? { ...prev, fetched: now - WEEK + 24 * 3600e3 } : { source: "none", fetched: 0, airports: [] };
  }
}

// ------------------------------------------------------------ live data
// adsb.lol rate-limits per IP, so ask for the whole fleet in as few calls as
// possible (one call handles 400 codes fine) and back off on 429.
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
    await sleep(3000);
  }
  if (!ok) throw new Error("no live data at all — keeping previous status");
  return out;
}

async function fetchRoutes(live) {
  const planes = live
    .filter((a) => (a.flight || "").trim() && typeof a.lat === "number" && a.alt_baro !== "ground")
    .map((a) => ({ callsign: a.flight.trim(), lat: a.lat, lng: a.lon }));
  const routes = {};
  for (let i = 0; i < planes.length; i += 100) { // the endpoint rejects more than 100 per call
    try {
      const r = await get("https://api.adsb.lol/api/0/routeset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planes: planes.slice(i, i + 100) }),
      });
      for (const x of await r.json()) if (x && x.callsign) routes[x.callsign] = x;
    } catch (e) {
      log("routes failed:", e.message);
    }
    await sleep(1500);
  }
  return routes;
}

// ------------------------------------------------------------ main
const fleet = await loadFleet();
const airports = await loadAirports();
const prevStatus = readJSON(path.join(prevDir, "status.json"));

let live = [];
let liveOk = true;
try { live = await fetchLive(fleet.aircraft.map((a) => a.hex)); }
catch (e) { log(e.message); liveOk = false; }

const routes = liveOk ? await fetchRoutes(live) : {};
const aircraft = liveOk
  ? computeStatus(fleet.aircraft, prevStatus ? prevStatus.aircraft : [], live, routes, airports.airports, now)
  : (prevStatus ? prevStatus.aircraft : computeStatus(fleet.aircraft, [], [], {}, airports.airports, now));

const status = {
  updated: liveOk ? now : (prevStatus ? prevStatus.updated : now),
  checked: now,
  started: (prevStatus && prevStatus.started) || now, // when tracking began (for "never seen" labels)
  liveCount: live.length,
  sources: {
    fleet: `${fleet.source} (as of ${fleet.asOf})`,
    positions: "adsb.lol (ODbL)",
    airports: airports.source,
  },
  aircraft,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "status.json"), JSON.stringify(status));
fs.writeFileSync(path.join(outDir, "fleet.json"), JSON.stringify(fleet));
fs.writeFileSync(path.join(outDir, "airports.json"), JSON.stringify(airports));
const count = (k) => aircraft.filter((a) => a.status === k).length;
log(`live ${live.length} · air ${count("air")} · ground ${count("ground")} · unknown ${count("unknown")}`);
