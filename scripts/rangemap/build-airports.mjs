// Builds assets/data/rangemap-airports.json for rangemap.html from OurAirports
// (public domain, https://ourairports.com/data/), the same source the fleet
// tracker uses. Run from the repo root:  node scripts/rangemap/build-airports.mjs
// Keeps large and medium airports with an IATA code and scheduled service, and
// adds the length of each airport's longest open, paved runway.
// No scheduled job: runway lengths rarely change, so re-run by hand once in a while.
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const BASE = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/";
const OUT = "assets/data/rangemap-airports.json";

async function text(name) {
  // Allows offline builds: put airports.csv / runways.csv next to this script.
  const local = new URL(name, import.meta.url);
  if (existsSync(local)) return readFileSync(local, "utf8");
  const r = await fetch(BASE + name);
  if (!r.ok) throw new Error(name + ": HTTP " + r.status);
  return r.text();
}

function parseCSVLine(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out;
}
function rows(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const head = parseCSVLine(lines[0]);
  return lines.slice(1).map((l) => { const r = parseCSVLine(l), o = {}; head.forEach((h, i) => (o[h] = r[i])); return o; });
}

// Same city clean-up idea as scripts/ac-fleet/core.mjs: OurAirports "municipality"
// is sometimes a suburb. Fix the big ones people will look for.
const CITY_FIX = {
  ATH: "Athens", MXP: "Milan", LIN: "Milan", BGY: "Milan", BRU: "Brussels", NRT: "Tokyo", HND: "Tokyo", IAD: "Washington",
  DCA: "Washington", BWI: "Baltimore", EDI: "Edinburgh", PTY: "Panama City", CVG: "Cincinnati", DFW: "Dallas", DAL: "Dallas",
  PVG: "Shanghai", SHA: "Shanghai", PEK: "Beijing", PKX: "Beijing", KIX: "Osaka", ITM: "Osaka", ICN: "Seoul", GMP: "Seoul",
  CDG: "Paris", ORY: "Paris", BVA: "Paris", EZE: "Buenos Aires", AEP: "Buenos Aires", SCL: "Santiago", DXB: "Dubai", DWC: "Dubai",
  DOH: "Doha", BOM: "Mumbai", DEL: "Delhi", KEF: "Reykjavík", MSP: "Minneapolis", YUL: "Montréal", YQB: "Québec City",
  YYZ: "Toronto", YTZ: "Toronto", YVR: "Vancouver", YYC: "Calgary", YEG: "Edmonton", YOW: "Ottawa", YHZ: "Halifax",
  YWG: "Winnipeg", YYT: "St. John's", LHR: "London", LGW: "London", STN: "London", LTN: "London", LCY: "London",
  FCO: "Rome", CIA: "Rome", AMS: "Amsterdam", CPH: "Copenhagen", ARN: "Stockholm", BMA: "Stockholm", OSL: "Oslo",
  HEL: "Helsinki", FRA: "Frankfurt", MUC: "Munich", BER: "Berlin", ZRH: "Zurich", GVA: "Geneva", VIE: "Vienna",
  LIS: "Lisbon", OPO: "Porto", MAD: "Madrid", BCN: "Barcelona", DUB: "Dublin", TLV: "Tel Aviv", IST: "Istanbul",
  SAW: "Istanbul", CAI: "Cairo", HKG: "Hong Kong", SIN: "Singapore", SYD: "Sydney", MEL: "Melbourne", AKL: "Auckland",
  GRU: "São Paulo", GIG: "Rio de Janeiro", BOG: "Bogotá", LIM: "Lima", MEX: "Mexico City", CUN: "Cancún",
  JFK: "New York", LGA: "New York", EWR: "New York", ORD: "Chicago", MDW: "Chicago", LAX: "Los Angeles",
  SFO: "San Francisco", SEA: "Seattle", IAH: "Houston", HOU: "Houston", ATL: "Atlanta", MIA: "Miami", FLL: "Fort Lauderdale",
  BOS: "Boston", DEN: "Denver", PHX: "Phoenix", LAS: "Las Vegas", MCO: "Orlando", TPE: "Taipei", BKK: "Bangkok",
  DMK: "Bangkok", MNL: "Manila", CGK: "Jakarta", KUL: "Kuala Lumpur", AUH: "Abu Dhabi", RUH: "Riyadh", JED: "Jeddah",
  OTP: "Bucharest", SVO: "Moscow", DME: "Moscow", VKO: "Moscow", BUD: "Budapest", PRG: "Prague", WAW: "Warsaw",
  SJU: "San Juan", CGH: "São Paulo", VCP: "Campinas", NAP: "Naples", VCE: "Venice", NCE: "Nice", HNL: "Honolulu", PPT: "Papeete",
  TFS: "Tenerife", TFN: "Tenerife", LPA: "Gran Canaria", PMI: "Palma de Mallorca", AGP: "Málaga", SVQ: "Seville", BLQ: "Bologna",
  DPS: "Denpasar (Bali)", JNB: "Johannesburg", CPT: "Cape Town", NBO: "Nairobi", ADD: "Addis Ababa", LOS: "Lagos", ACC: "Accra", CMN: "Casablanca",
};
function cleanCity(iata, muni, name) {
  if (CITY_FIX[iata]) return CITY_FIX[iata];
  const c = String(muni || "").replace(/\s*\([^)]*\)/g, "").split(" / ")[0].split(",")[0].trim();
  return c || name || iata;
}

const PAVED = /^(ASP|CON|PEM|BIT|PAV|TAR|BET|MAC|ASFALT|HARD)/i;

const [ap, rw] = await Promise.all([text("airports.csv"), text("runways.csv")]);

// Longest open paved runway per airport (metres).
const best = new Map();
for (const r of rows(rw)) {
  if (r.closed === "1") continue;
  const ft = +r.length_ft;
  if (!ft || !PAVED.test((r.surface || "").trim())) continue;
  const m = Math.round(ft * 0.3048);
  if (m > (best.get(r.airport_ident) || 0)) best.set(r.airport_ident, m);
}

const size = { large_airport: "L", medium_airport: "M" };
const out = [];
let noRwy = 0;
for (const a of rows(ap)) {
  const s = size[a.type];
  if (!s || a.scheduled_service !== "yes" || !/^[A-Z]{3}$/.test(a.iata_code || "")) continue;
  const rwy = best.get(a.ident) || 0;
  if (!rwy) noRwy++;
  out.push([a.iata_code, a.name, cleanCity(a.iata_code, a.municipality, a.name), a.iso_country, a.continent,
    +(+a.latitude_deg).toFixed(3), +(+a.longitude_deg).toFixed(3), s, rwy]);
}
out.sort((a, b) => (a[7] === b[7] ? a[0].localeCompare(b[0]) : a[7] === "L" ? -1 : 1));

const doc = {
  source: "OurAirports (public domain), https://ourairports.com/data/",
  built: new Date().toISOString().slice(0, 10),
  fields: ["iata", "name", "city", "country", "continent", "lat", "lon", "size (L = large, M = medium)", "longest open paved runway (m, 0 = none recorded)"],
  airports: out,
};
writeFileSync(OUT, JSON.stringify(doc).replace(/\],\[/g, "],\n["));
console.log(`${out.length} airports (${out.filter((a) => a[7] === "L").length} large), ${noRwy} without a paved runway on record -> ${OUT}`);
