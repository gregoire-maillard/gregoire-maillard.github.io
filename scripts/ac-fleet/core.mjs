// Pure logic shared by the updater (Node, GitHub Actions) — no I/O in here.
// Turns a snapshot of live ADS-B positions into a per-aircraft status that
// remembers where each plane last landed, so parked planes keep a location.

// The airlines shown on the page. Air Canada's fleet comes from the Canadian
// register; the others are discovered from aircraft flying under their callsign
// with their country's registration prefix (filters out wet-leased aircraft).
export const AIRLINES = {
  AC: { name: "Air Canada", callsigns: ["ACA", "ROU", "JZA"], reg: /^C-/, fleet: "register" },
  UA: { name: "United Airlines", callsigns: ["UAL"], reg: /^N\d/, fleet: "discover" },
  AF: { name: "Air France", callsigns: ["AFR"], reg: /^F-/, fleet: "discover", cargoTypes: ["B77L"] },
  EY: { name: "Etihad Airways", callsigns: ["ETD"], reg: /^A6-/, fleet: "discover", cargoTypes: ["B77L"] },
};

// Aircraft types scanned for discovery, one group per run (adsb.lol rate limits).
export const DISCOVERY_GROUPS = [
  "A318,A319,A320,A20N,A321,A21N,BCS1,BCS3",
  "B737,B738,B739,B38M,B39M,B752,B753",
  "B763,B764,B772,B77W,B77L,B788,B789,B78X",
  "A332,A333,A339,A359,A35K,A388,E170,E75L,E75S,E190,E195,E290,E295,CRJ7,CRJ9,CRJ1",
];

export const OPERATORS = {
  "Air Canada": "AC",
  "Air Canada rouge LP": "RV",
  "Air Canada rouge LP (Air Canada rouge)": "RV",
  "Jazz Aviation LP": "JZ",
};

// Transport Canada model name -> ICAO type designator used by the page.
export function typeFromModel(model) {
  const m = String(model || "");
  const rules = [
    [/^A320/, "A320"], [/^A321-2\d\dN/, "A21N"], [/^A321/, "A321"], [/^A319/, "A319"],
    [/^A330-3/, "A333"], [/BD-500-1A11|A220-300/, "BCS3"], [/BD-500-1A10|A220-100/, "BCS1"],
    [/^737-8/, "B38M"], [/^737-9/, "B39M"], [/^777-3\d\dER/, "B77W"], [/^777-2\d\dLR/, "B77L"],
    [/^787-10/, "B78X"], [/^787-9/, "B789"], [/^787-8/, "B788"], [/^767-3/, "B763"],
    [/CL-600-2D24/, "CRJ9"], [/CL-600-2C10/, "CRJ7"], [/ERJ 170-200/, "E175"], [/DHC-8-4/, "DH8D"],
    [/DHC-8-3/, "DH8C"], [/DHC-8-1/, "DH8A"],
  ];
  for (const [re, t] of rules) if (re.test(m)) return t;
  return null; // not an airliner we display (e.g. the heritage Lockheed 10A)
}

// Canadian registrations map to ICAO 24-bit addresses algorithmically.
export function hexFromCanadianReg(reg) {
  const m = /^C-([FG])([A-Z])([A-Z])([A-Z])$/.exec(reg);
  if (!m) return null;
  const n = (m[2].charCodeAt(0) - 65) * 676 + (m[3].charCodeAt(0) - 65) * 26 + (m[4].charCodeAt(0) - 65);
  return ((m[1] === "F" ? 0xc00001 : 0xc044a9) + n).toString(16);
}

// ---------------------------------------------------------------- airports
// OurAirports CSV -> compact rows [iata, name, city, country, lat, lon, size]
export function parseCSVLine(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out;
}

// OurAirports "municipality" is sometimes a suburb (Spata for Athens, Ferno for
// Milan Malpensa…). Fix the ones Air Canada flies to; otherwise tidy it up.
export const AIRPORTS_VERSION = 2;
const CITY_FIX = {
  ATH: "Athens", MXP: "Milan", LIN: "Milan", BRU: "Brussels", NRT: "Tokyo", HND: "Tokyo", IAD: "Washington",
  DCA: "Washington", EDI: "Edinburgh", PTY: "Panama City", ANU: "Antigua", CVG: "Cincinnati", SNA: "Orange County",
  DFW: "Dallas", FRA: "Frankfurt", PVG: "Shanghai", PEK: "Beijing", PKX: "Beijing", AUA: "Aruba", SXM: "St. Maarten",
  RDU: "Raleigh-Durham", KIX: "Osaka", ICN: "Seoul", CDG: "Paris", ORY: "Paris", BOG: "Bogotá", CUN: "Cancún",
  SJD: "Los Cabos", LIR: "Liberia, Costa Rica", SJO: "San José, Costa Rica", GIG: "Rio de Janeiro", EZE: "Buenos Aires",
  SCL: "Santiago", DXB: "Dubai", DOH: "Doha", BOM: "Mumbai", DEL: "Delhi", CMN: "Casablanca", ALG: "Algiers",
  KEF: "Reykjavík", MSP: "Minneapolis", PBI: "West Palm Beach", RSW: "Fort Myers", OGG: "Maui", KOA: "Kona",
  LIH: "Kauai", TPE: "Taipei", MNL: "Manila", BKK: "Bangkok", SGN: "Ho Chi Minh City", BCN: "Barcelona",
  YTZ: "Toronto City", YUL: "Montréal", YQB: "Québec City", YXU: "London, Ontario", YYT: "St. John's",
  YXJ: "Fort St. John", STL: "St. Louis", SFO: "San Francisco", EWR: "Newark", LAS: "Las Vegas", MBJ: "Montego Bay",
  PUJ: "Punta Cana", POP: "Puerto Plata", VRA: "Varadero", HOG: "Holguín", CCC: "Cayo Coco", SNU: "Santa Clara",
  GCM: "Grand Cayman", NAS: "Nassau", BGI: "Barbados", UVF: "St. Lucia", POS: "Port of Spain", KIN: "Kingston",
  ZIH: "Ixtapa", PVR: "Puerto Vallarta", HUX: "Huatulco", MID: "Mérida", GDL: "Guadalajara", MEX: "Mexico City",
  LHR: "London", LGW: "London", MAN: "Manchester", DUB: "Dublin", SNN: "Shannon", GLA: "Glasgow",
  FCO: "Rome", VCE: "Venice", NCE: "Nice", LYS: "Lyon", MRS: "Marseille", TLS: "Toulouse", BOD: "Bordeaux",
  ZRH: "Zurich", GVA: "Geneva", AMS: "Amsterdam", CPH: "Copenhagen", LIS: "Lisbon", OPO: "Porto", MAD: "Madrid",
  TLV: "Tel Aviv", IST: "Istanbul", CAI: "Cairo", ACC: "Accra", LOS: "Lagos", HKG: "Hong Kong", SIN: "Singapore",
  SYD: "Sydney", BNE: "Brisbane", AKL: "Auckland", MEL: "Melbourne", GRU: "São Paulo", LIM: "Lima",
};
export function cleanCity(iata, muni, name) {
  if (CITY_FIX[iata]) return CITY_FIX[iata];
  let c = String(muni || "").replace(/\s*\([^)]*\)/g, "").split(" / ")[0].split(",")[0].trim();
  return c || name || iata;
}

export function buildAirports(csvText) {
  const lines = csvText.split(/\r?\n/);
  const head = parseCSVLine(lines[0]);
  const ix = (k) => head.indexOf(k);
  const I = { type: ix("type"), name: ix("name"), lat: ix("latitude_deg"), lon: ix("longitude_deg"),
    cc: ix("iso_country"), city: ix("municipality"), sched: ix("scheduled_service"), iata: ix("iata_code") };
  const size = { large_airport: "L", medium_airport: "M", small_airport: "S" };
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const r = parseCSVLine(lines[i]);
    const s = size[r[I.type]];
    const iata = r[I.iata];
    if (!s || !iata || !/^[A-Z]{3}$/.test(iata)) continue;
    if (s === "S" && r[I.sched] !== "yes" && !MRO_IATA.has(iata)) continue;
    rows.push([iata, r[I.name], cleanCity(iata, r[I.city], r[I.name]), r[I.cc], +(+r[I.lat]).toFixed(4), +(+r[I.lon]).toFixed(4), s]);
  }
  return rows;
}

// Maintenance / storage sites (kept in sync with MRO_SITES in the page).
export const MRO_IATA = new Set(["XMN", "ROW", "VCV", "MZJ", "GYR", "MHV", "IGM", "BFM", "GSO", "YMX",
  "PAE", "BFI", "LDE", "TEV", "ASP", "XSP", "SBD", "CHS", "XFW", "TLS"]);

const R = 6371;
export function distKm(a, b, c, d) {
  const toR = Math.PI / 180, dLat = (c - a) * toR, dLon = (d - b) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a * toR) * Math.cos(c * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Nearest airport within maxKm; big airports win ties against small nearby fields.
export function nearestAirport(airports, lat, lon, maxKm) {
  let best = null, bestScore = Infinity;
  const w = { L: 0.5, M: 0.8, S: 1 };
  for (const a of airports) {
    if (Math.abs(a[4] - lat) > 1.2) continue;
    const d = distKm(lat, lon, a[4], a[5]);
    if (d > maxKm) continue;
    const s = d * w[a[6]];
    if (s < bestScore) { bestScore = s; best = a; }
  }
  return best ? { iata: best[0], name: best[1], city: best[2], cc: best[3], km: +distKm(lat, lon, best[4], best[5]).toFixed(1) } : null;
}

export function airportByIata(airports, iata) {
  const a = airports.find((x) => x[0] === iata);
  return a ? { iata: a[0], name: a[1], city: a[2], cc: a[3] } : { iata };
}

// ---------------------------------------------------------------- routes
// Route databases (adsb.lol, adsbdb) are crowd-sourced and often stale: the same
// callsign can be "BOS-YYZ" in one and "YUL-STL" in the other. So a candidate
// route is only accepted if the aircraft is actually on it: its position must lie
// near the great circle between the two airports and it must be heading towards
// the destination. If we saw where it took off, the route must start there.
export function bearing(lat1, lon1, lat2, lon2) {
  const toR = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * toR) * Math.cos(lat2 * toR);
  const x = Math.cos(lat1 * toR) * Math.sin(lat2 * toR) - Math.sin(lat1 * toR) * Math.cos(lat2 * toR) * Math.cos((lon2 - lon1) * toR);
  return (Math.atan2(y, x) / toR + 360) % 360;
}

export function airportIndex(airports) {
  const m = new Map();
  for (const a of airports) if (!m.has(a[0]) || a[6] === "L") m.set(a[0], a);
  return m;
}

/**
 * @param candidates ["YUL-STL", "YYZ-YUL-MXP", ...]
 * @param fromIata   airport where we saw it take off (or null)
 * @param pos        {lat, lon, trk}
 * @param apt        Map iata -> airport row
 * @returns {from, to} or null
 */
export function resolveRoute(candidates, fromIata, pos, apt) {
  let best = null;
  for (const c of candidates || []) {
    const legs = String(c).split("-").filter((x) => /^[A-Z]{3}$/.test(x));
    for (let i = 0; i < legs.length - 1; i++) {
      const o = apt.get(legs[i]), d = apt.get(legs[i + 1]);
      if (!o || !d || o === d) continue;
      const fromMatch = !!fromIata && legs[i] === fromIata;
      if (fromIata && !fromMatch) continue;
      let score = fromMatch ? -1 : 0;
      if (pos && typeof pos.lat === "number") {
        const dOD = distKm(o[4], o[5], d[4], d[5]);
        const dOP = distKm(o[4], o[5], pos.lat, pos.lon);
        const dPD = distKm(pos.lat, pos.lon, d[4], d[5]);
        const detour = dOP + dPD - dOD;
        if (detour > 0.2 * dOD + 150) continue;             // not on this route
        if (typeof pos.trk === "number" && dOP > 100 && dPD > 100) {
          const diff = Math.abs(((bearing(pos.lat, pos.lon, d[4], d[5]) - pos.trk) + 540) % 360 - 180);
          if (diff > 75) continue;                           // flying away from that destination
        }
        score += detour / (dOD + 1);
      } else if (!fromMatch) continue;
      if (!best || score < best.score) best = { from: legs[i], to: legs[i + 1], score };
    }
  }
  return best ? { from: best.from, to: best.to } : null;
}

// ---------------------------------------------------------------- state machine
export const CFG = {
  groundMatchKm: 6,        // on-ground position -> airport
  landingMatchKm: 30,      // last low-altitude position -> probable landing airport
  landingMaxAltFt: 5000,
  lostAfterMs: 20 * 60e3,  // not heard for this long = not "live" any more
  assumeArrivedMs: 14 * 3600e3, // out of coverage longer than this -> assume it landed at destination
};

function readPos(ac) {
  if (typeof ac.lat === "number") return { lat: ac.lat, lon: ac.lon, age: ac.seen_pos ?? ac.seen ?? 0 };
  if (ac.lastPosition && typeof ac.lastPosition.lat === "number")
    return { lat: ac.lastPosition.lat, lon: ac.lastPosition.lon, age: ac.lastPosition.seen_pos ?? 60 };
  return null;
}

function callsignOf(ac) { return (ac.flight || "").trim() || null; }

/**
 * @param fleet    [{reg, hex, type, op, msn}]
 * @param prev     previous status.json aircraft array (may be empty)
 * @param live     adsb.lol "ac" entries for our hexes
 * @param routes   map callsign -> array of candidate route strings ("YYZ-HND")
 * @param airports compact airport rows
 * @param now      epoch ms (snapshot time)
 */
export function computeStatus(fleet, prev, live, routes, airports, now) {
  const prevBy = new Map((prev || []).map((p) => [p.hex, p]));
  const liveBy = new Map(live.map((a) => [String(a.hex).toLowerCase().replace(/^~/, ""), a]));
  const aptIdx = airportIndex(airports);
  const cityOf = (iata) => (iata && aptIdx.get(iata) ? aptIdx.get(iata)[2] : null);
  const out = [];

  for (const f of fleet) {
    const p = prevBy.get(f.hex) || {};
    const s = {
      reg: f.reg, hex: f.hex, type: f.type, op: f.op, msn: f.msn, cargo: f.cargo,
      status: p.status || "unknown",
      lastSeen: p.lastSeen || null,
      pos: p.pos || null,
      callsign: p.callsign || null,
      airport: p.airport || null,
      groundSince: p.groundSince || null,
      groundExact: p.groundExact || false,
      inferred: p.inferred || false,
      flight: p.flight || null,
      lastFlight: p.lastFlight || null,
    };
    const ac = liveBy.get(f.hex);

    if (ac) {
      const seenAt = now - (ac.seen ?? 0) * 1000;
      const pos = readPos(ac);
      const alt = ac.alt_baro;
      const gs = typeof ac.gs === "number" ? ac.gs : null;
      const cs = callsignOf(ac);
      let onGround = alt === "ground";
      let gndApt = null;
      if (pos) {
        gndApt = nearestAirport(airports, pos.lat, pos.lon, CFG.groundMatchKm);
        if (!onGround && gs !== null && gs < 50 && typeof alt === "number" && alt < 2000 && gndApt) onGround = true;
      }
      s.lastSeen = seenAt;
      if (pos) s.pos = { lat: +pos.lat.toFixed(4), lon: +pos.lon.toFixed(4), alt: alt ?? null, gs, trk: ac.track ?? null, ts: now - pos.age * 1000 };
      if (cs) s.callsign = cs;

      if (onGround) {
        const apt = gndApt || (pos ? nearestAirport(airports, pos.lat, pos.lon, 30) : null) || s.airport;
        const sameSpot = s.status === "ground" && s.airport && apt && s.airport.iata === apt.iata;
        if (s.status === "air") {
          // just landed
          s.lastFlight = { ...(s.flight || {}), cs: (s.flight && s.flight.cs) || cs, to: apt ? apt.iata : (s.flight && s.flight.to) || null, arr: seenAt };
          s.lastFlight.toCity = cityOf(s.lastFlight.to);
          s.flight = null;
          s.groundSince = seenAt;
          s.groundExact = true;
        } else if (!sameSpot || !s.groundSince) {
          // first time we see it here: we only know it has been here "at least since now"
          s.groundSince = seenAt;
          s.groundExact = false;
        }
        s.status = "ground";
        s.airport = apt || null;
        s.inferred = false;
      } else {
        // airborne
        const newFlight = s.status !== "air" || !s.flight || (cs && s.flight.cs && cs !== s.flight.cs);
        if (newFlight) {
          const from = s.status === "ground" && s.airport ? s.airport.iata : null;
          s.flight = { cs, from, to: null, dep: s.status === "ground" ? seenAt : null };
        }
        if (cs) s.flight.cs = cs;
        if (!s.flight.to) {
          const r = resolveRoute(routes[cs], s.flight.from, s.pos, aptIdx);
          if (r) { s.flight.from = r.from; s.flight.to = r.to; }
        }
        s.flight.fromCity = cityOf(s.flight.from);
        s.flight.toCity = cityOf(s.flight.to);
        s.status = "air";
        s.inferred = false;
      }
    } else if (s.status === "air" && s.lastSeen) {
      // Not heard any more. Landed where we lost it, or still over an ocean?
      const age = now - s.lastSeen;
      const pos = s.pos;
      const low = pos && (pos.alt === "ground" || (typeof pos.alt === "number" && pos.alt <= CFG.landingMaxAltFt));
      const apt = low ? nearestAirport(airports, pos.lat, pos.lon, CFG.landingMatchKm) : null;
      const justDeparted = apt && s.flight && s.flight.from === apt.iata && s.flight.dep && (s.lastSeen - s.flight.dep) < 30 * 60e3;
      if (age > CFG.lostAfterMs && apt && !justDeparted) {
        s.lastFlight = { ...(s.flight || {}), to: apt.iata, toCity: apt.city, arr: s.lastSeen };
        s.flight = null; s.status = "ground"; s.airport = apt; s.groundSince = s.lastSeen; s.groundExact = true; s.inferred = true;
      } else if (age > CFG.assumeArrivedMs) {
        if (s.flight && s.flight.to) {
          s.lastFlight = { ...s.flight, arr: null };
          s.status = "ground"; s.airport = airportByIata(airports, s.flight.to); s.groundSince = null; s.groundExact = false; s.inferred = true;
        } else {
          s.status = "unknown";
        }
        s.flight = null;
      }
    }
    out.push(s);
  }
  return out;
}
