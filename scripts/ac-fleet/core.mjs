// Pure logic shared by the updater (Node, GitHub Actions) — no I/O in here.
// Turns a snapshot of live ADS-B positions into a per-aircraft status that
// remembers where each plane last landed, so parked planes keep a location.

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
    rows.push([iata, r[I.name], r[I.city], r[I.cc], +(+r[I.lat]).toFixed(4), +(+r[I.lon]).toFixed(4), s]);
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
// adsb.lol /api/0/routeset answers "YUL-NRT" style routes from a crowd-sourced
// database. We only trust a route if it is geographically plausible or if it
// starts where we saw the plane take off.
export function pickRoute(route, fromIata) {
  if (!route || !route._airport_codes_iata) return null;
  const legs = route._airport_codes_iata.split("-").filter((x) => /^[A-Z]{3}$/.test(x));
  if (legs.length < 2) return null;
  if (fromIata && legs.includes(fromIata)) {
    const i = legs.indexOf(fromIata);
    if (i < legs.length - 1) return { from: legs[i], to: legs[i + 1] };
  }
  if (route.plausible) return { from: legs[legs.length - 2], to: legs[legs.length - 1] };
  return null;
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
 * @param routes   map callsign -> adsb.lol route object
 * @param airports compact airport rows
 * @param now      epoch ms (snapshot time)
 */
export function computeStatus(fleet, prev, live, routes, airports, now) {
  const prevBy = new Map((prev || []).map((p) => [p.hex, p]));
  const liveBy = new Map(live.map((a) => [String(a.hex).toLowerCase().replace(/^~/, ""), a]));
  const out = [];

  for (const f of fleet) {
    const p = prevBy.get(f.hex) || {};
    const s = {
      reg: f.reg, hex: f.hex, type: f.type, op: f.op, msn: f.msn,
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
        const r = pickRoute(routes[cs], s.flight.from);
        if (r) { if (!s.flight.from) s.flight.from = r.from; if (s.flight.from === r.from || !s.flight.to) s.flight.to = r.to; }
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
        s.lastFlight = { ...(s.flight || {}), to: apt.iata, arr: s.lastSeen };
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
