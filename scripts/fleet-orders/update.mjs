// Fleet orders & backlog tracker — builds the data behind /fleetorders.html.
//
//   node scripts/fleet-orders/update.mjs [--inbox DIR] [--prev FILE] [--out FILE]
//
//   --inbox  folder where source files can be dropped by hand (default scripts/fleet-orders/inbox)
//   --prev   previous output, used to keep anything that can't be refreshed (default = --out)
//   --out    output JSON (default assets/data/fleet-orders.json)
//
// Each source is taken from the inbox if a matching file is there, otherwise downloaded.
// If both fail, the previous output's copy is kept and marked as stale.
//
// Sources
//   Airbus  Orders & Deliveries workbook, monthly (airbus.com). Worldwide sheet: every
//           customer × aircraft type with cumulative Ordered / Delivered / Operated.
//           Deliveries sheet: this year's deliveries by customer ("LESSOR (OPERATOR)").
//           Annual archives (orders-and-deliveries-YYYY.zip) add past years' deliveries.
//   Boeing  Commercial Orders & Deliveries (boeing.com), published as a Tableau Public
//           workbook; its "Orders and Deliveries" view exports as CSV with customer,
//           model series, order year, delivery year and unfilled orders.
//   Ages    Transport Canada Canadian Civil Aircraft Register (Air Canada, Air Canada Rouge)
//           FAA Releasable Aircraft Database (United, mainline)
//   Lists   Fleet tracker snapshot (fleet-data branch): United, Air France and Etihad
//           aircraft seen flying under the airline's callsign.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unzip, readXlsx, excelDate, parseCSV, parseCSVLine, num, FAMILIES, MAKER, familyOf, nameKey, prettyName, LESSOR_RE } from "./lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const INBOX = path.resolve(arg("--inbox", path.join(HERE, "inbox")));
const OUT = path.resolve(arg("--out", path.join(ROOT, "assets/data/fleet-orders.json")));
const PREV = path.resolve(arg("--prev", OUT));
const UA = "gregoiremaillard.com fleet orders page (github.com/gregoire-maillard/gregoire-maillard.github.io)";
const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const log = (...a) => console.log("[fleet-orders]", ...a);
const readJSON = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const prev = readJSON(PREV);
const today = new Date().toISOString().slice(0, 10);

const AIRBUS_PAGE = "https://www.airbus.com/en/products-services/commercial-aircraft/orders-and-deliveries";
const BOEING_WB = "BoeingCommercialOrdersDeliveries_16788064876590";
const BOEING_CSV = `https://public.tableau.com/views/${BOEING_WB}/OrdersandDeliveries.csv?:showVizHome=no`;
const BOEING_MINOR = `https://public.tableau.com/views/${BOEING_WB}/MinorModels.csv?:showVizHome=no`;
const BOEING_META = `https://public.tableau.com/profile/api/workbook/${BOEING_WB}`;
const BOEING_PAGE = "https://www.boeing.com/commercial#orders-deliveries";
const TC_URL = "https://wwwapps.tc.gc.ca/saf-sec-sur/2/ccarcs-riacc/download/ccarcsdb.zip";
const FAA_URL = "https://registry.faa.gov/database/ReleasableAircraft.zip";
const TRACKER_URL = "https://raw.githubusercontent.com/gregoire-maillard/gregoire-maillard.github.io/fleet-data/fleet.json";

async function get(url, { timeout = 60000, browser = false, headers = {} } = {}) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": browser ? BROWSER_UA : UA, ...headers }, signal: AbortSignal.timeout(timeout) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (/text\/html/.test(r.headers.get("content-type") || "") && !/\.html?$|airbus\.com\/en\//.test(url)) throw new Error("got an HTML page instead of a file (blocked?)");
      return { buf, headers: r.headers };
    } catch (e) {
      if (i >= 2) throw new Error(`${url.slice(0, 80)}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}
const inboxFiles = () => { try { return fs.readdirSync(INBOX).map((f) => path.join(INBOX, f)); } catch { return []; } };
const isZip = (b) => b.length > 4 && b.readUInt32LE(0) === 0x04034b50;

// ================================================================ Airbus
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MON3 = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function airbusAsOf(sheets) {
  for (const rows of Object.values(sheets)) for (const r of rows.slice(0, 12)) for (const c of r) {
    const m = /Summary to (\d{1,2})(?:st|nd|rd|th)? (\w{3})\w* (\d{4})/.exec(String(c ?? "")); // "31 Aug 2026" or "31st December 2024"
    if (m && m[2] in MON3) return new Date(Date.UTC(+m[3], MON3[m[2]], +m[1])).toISOString().slice(0, 10);
  }
  return null;
}

// Customer table: header row "CUSTOMER", one column group per type, sub-header Ord / Del / Opr.
function airbusCustomerTable(rows) {
  const h = rows.findIndex((r) => r && r.some((c) => String(c ?? "").trim() === "CUSTOMER"));
  if (h < 0) return null;
  const head = rows[h], sub = rows[h + 1] || [];
  const nc = head.findIndex((c) => String(c ?? "").trim() === "CUSTOMER");
  const starts = [];
  head.forEach((c, j) => { if (j > nc && c != null && String(c).trim() && !/^(Region|Country|TOTAL)$/i.test(String(c).trim())) starts.push([j, String(c).trim()]); });
  const groups = starts.map(([j, type], k) => {
    const end = k + 1 < starts.length ? starts[k + 1][0] : j + 3;
    const col = {};
    for (let x = j; x < end; x++) { const s = String(sub[x] ?? "").trim(); if (/^(Ord|Del|Opr)$/.test(s)) col[s] = x; }
    return { type, col };
  });
  const regionCol = head.findIndex((c) => String(c ?? "").trim() === "Region");
  const countryCol = nc + 4; // name | … | country, same layout on every customer sheet
  const out = [];
  let total = null;
  for (const r of rows.slice(h + 2)) {
    const name = String(r?.[nc] ?? "").trim();
    if (!name) continue;
    const t = {};
    for (const g of groups) {
      const v = [num(r[g.col.Ord]), num(r[g.col.Del]), num(r[g.col.Opr])];
      if (v.some((x) => x)) t[g.type] = v;
    }
    if (/^TOTALS?\b/.test(name)) { total = t; break; }
    out.push({ name, country: String(r[countryCol] ?? "").trim(), region: regionCol >= 0 ? String(r[regionCol] ?? "").trim() : "", t });
  }
  return { customers: out, total };
}

// Deliveries sheet: CUSTOMER | Region | Date of delivery | one column per type | TOTAL
function airbusDeliveries(rows) {
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

async function loadAirbus() {
  // 1. inbox: any workbook with a Worldwide sheet; the most recent "Summary to" wins
  let best = null;
  const archives = {};
  for (const f of inboxFiles()) {
    let books = [];
    try {
      const buf = fs.readFileSync(f);
      if (!isZip(buf)) continue;
      if (/\.xlsx$/i.test(f)) books.push([path.basename(f), buf]);
      else if (/\.zip$/i.test(f) && /airbus|orders[-_ ]?(and[-_ ]?)?deliveries/i.test(f)) {
        for (const [n, b] of Object.entries(unzip(buf, (n) => /\.xlsx$/i.test(n) && !/^__MACOSX/.test(n)))) books.push([n, b]);
      } else continue;
    } catch (e) { log("skipping", path.basename(f), e.message); continue; }
    for (const [n, b] of books) {
      let sheets;
      try { sheets = readXlsx(b); } catch (e) { log("unreadable workbook", n, e.message); continue; }
      const asOf = airbusAsOf(sheets);
      if (!asOf) continue;
      const year = +asOf.slice(0, 4);
      const del = sheets.Deliveries ? airbusDeliveries(sheets.Deliveries) : null;
      if (del && (!archives[year] || archives[year].asOf < asOf)) archives[year] = { asOf, file: n, list: del };
      if (sheets.Worldwide && (!best || best.asOf < asOf)) best = { asOf, file: n, sheets };
    }
  }
  if (best) log(`Airbus: using ${best.file} from the inbox (to ${best.asOf})`);
  // 2. download: the O&D page links each month's workbook (the URL changes every month)
  if (!best || best.asOf < monthAgo()) {
    try {
      const page = (await get(AIRBUS_PAGE, { browser: true })).buf.toString("utf8");
      const links = [...new Set([...page.matchAll(/https:\/\/[^"'<>\s]+\.xlsx\?fileName=([^"'<>\s&]+)/g)].map((m) => m[0]))];
      const dated = links.map((u) => {
        const m = /(january|february|march|april|may|june|july|august|september|october|november|december)-(\d{4})/i.exec(u);
        return m ? { u, k: +m[2] * 12 + MONTHS.indexOf(m[1].toLowerCase()) } : null;
      }).filter(Boolean).sort((a, b) => b.k - a.k);
      if (!dated.length) throw new Error("no workbook link found on the Airbus page");
      const { buf } = await get(dated[0].u, { browser: true, timeout: 120000 });
      const sheets = readXlsx(buf);
      const asOf = airbusAsOf(sheets);
      if (!sheets.Worldwide || !asOf) throw new Error("downloaded workbook has no Worldwide sheet");
      if (!best || asOf > best.asOf) {
        best = { asOf, file: decodeURIComponent(/fileName=([^&]+)/.exec(dated[0].u)[1]), url: dated[0].u, sheets };
        const del = sheets.Deliveries ? airbusDeliveries(sheets.Deliveries) : null;
        if (del) archives[+asOf.slice(0, 4)] = { asOf, file: best.file, list: del };
        log(`Airbus: downloaded ${best.file} (to ${asOf})`);
      }
    } catch (e) { log("Airbus download failed:", e.message); }
  }
  if (!best) return null;

  const table = airbusCustomerTable(best.sheets.Worldwide);
  const region = {}, lessors = new Set();
  for (const [s, rows] of Object.entries(best.sheets)) {
    if (/^(Worldwide|Orders|Deliveries|Historical)/i.test(s) || /Government/i.test(s)) continue;
    const t = airbusCustomerTable(rows);
    if (!t) continue;
    for (const c of t.customers) { if (/Leasing/i.test(s)) lessors.add(c.name); else region[c.name] = s; }
  }
  // Last full year's deliveries (for the page's default delivery pace)
  let lastYear = null;
  const hist = best.sheets["Historical Deliveries"] || [];
  for (let i = 0; i < hist.length && !lastYear; i++) {
    const m = /^(\d{4}) Annual Deliveries/.exec(String((hist[i] || []).find((c) => c != null) ?? ""));
    if (m) { const nums = (hist[i + 1] || []).filter((c) => typeof c === "number"); if (nums.length) lastYear = { year: +m[1], deliveries: nums[nums.length - 1] }; }
  }
  const tot = { ord: 0, del: 0 };
  for (const v of Object.values(table.total || {})) { tot.ord += v[0]; tot.del += v[1]; }
  return { asOf: best.asOf, file: best.file, url: best.url || AIRBUS_PAGE, customers: table.customers, region, lessors, totals: tot, deliveries: archives, lastYear };
}
function monthAgo() { const d = new Date(); d.setUTCDate(d.getUTCDate() - 40); return d.toISOString().slice(0, 10); }

// ================================================================ Boeing
async function loadBoeing() {
  let text = null, minor = null, asOf = null, src = null;
  const inboxCsv = inboxFiles().filter((f) => /\.csv$/i.test(f) && /boeing/i.test(path.basename(f)));
  const main = inboxCsv.find((f) => !/minor/i.test(f));
  const min = inboxCsv.find((f) => /minor/i.test(f));
  if (main) {
    text = fs.readFileSync(main, "utf8");
    minor = min ? fs.readFileSync(min, "utf8") : null;
    src = "inbox";
    // Boeing publishes around the second Tuesday for the month before: date the data to the end of that month
    asOf = endOfPrevMonth(fs.statSync(main).mtime);
    log(`Boeing: using ${path.basename(main)} from the inbox`);
  } else {
    try {
      text = (await get(BOEING_CSV, { timeout: 120000 })).buf.toString("utf8");
      try { minor = (await get(BOEING_MINOR)).buf.toString("utf8"); } catch (e) { log("Boeing minor models:", e.message); }
      try { const meta = JSON.parse((await get(BOEING_META)).buf.toString("utf8")); asOf = endOfPrevMonth(new Date(meta.lastUpdateDate)); } catch { asOf = endOfPrevMonth(new Date()); }
      src = "download";
      log(`Boeing: downloaded the Tableau export (${(text.length / 1e6).toFixed(1)} MB)`);
    } catch (e) { log("Boeing download failed:", e.message); return null; }
  }
  const rows = parseCSV(text);
  if (!rows.length || !("Unfilled Orders" in Object.fromEntries(rows.map((r) => [r["Measure Names"], 1])))) throw new Error("Boeing CSV: unexpected columns " + Object.keys(rows[0] || {}).join(", "));
  const cust = {};
  const yearCol = Object.keys(rows[0]).find((k) => /^Delivery Year/i.test(k));
  let unfilledTotal = 0, ytd = 0, last = 0;
  const thisYear = +asOf.slice(0, 4);
  for (const r of rows) {
    const name = r["Customer Name"];
    if (!name || name === "All" || r.Region === "All" || r["Model Series"] === "All") continue;
    const c = (cust[name] ||= { name, country: r.Country, region: r.Region, u: {}, d: {}, h: {} });
    const model = r["Model Series"];
    if (r["Measure Names"] === "Unfilled Orders") {
      const u = num(r["Measure Values"]);
      if (u) { c.u[model] = (c.u[model] || 0) + u; unfilledTotal += u; }
    } else if (r["Measure Names"] === "Order Total") {
      const d = num(r["Delivery Total"]), y = parseInt(r[yearCol], 10);
      if (d && y) {
        c.d[model] = (c.d[model] || 0) + d;
        (c.h[y] ||= {})[model] = (c.h[y][model] || 0) + d;
        if (y === thisYear) ytd += d;
        if (y === thisYear - 1) last += d;
      }
    }
  }
  const minorModels = {};
  if (minor) for (const r of parseCSV(minor)) {
    const series = (r["Model"] || r["Model "] || "").trim(), mm = (r["Minor Model"] || "").trim();
    if (!series || series === "Total" || !mm) continue;
    const fam = familyOf(series === "777X" ? "777X" : series === "737" && /^737-(7|8|9|10|8-200)$/.test(mm) ? "737 MAX" : mm);
    (minorModels[fam || "Other"] ||= {})[mm] = num(r["Unfilled Orders"]);
  }
  return { asOf, src, url: BOEING_PAGE, customers: Object.values(cust), unfilledTotal, deliveredYTD: ytd, lastYear: { year: thisYear - 1, deliveries: last }, minorModels };
}
// Boeing publishes on the second Tuesday (8th–14th) for the month before, so anything dated
// before the 8th still holds the month before that.
function endOfPrevMonth(d) { const back = d.getUTCDate() < 8 ? 1 : 0; return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 0)).toISOString().slice(0, 10); }

// ================================================================ registers (fleet ages)
async function zipSource(pattern, url, label, want) {
  const f = inboxFiles().find((x) => pattern.test(path.basename(x)));
  if (f) { log(`${label}: using ${path.basename(f)} from the inbox`); return { files: unzip(fs.readFileSync(f), want), date: fs.statSync(f).mtime }; }
  const { buf, headers } = await get(url, { timeout: 300000, browser: true });
  if (!isZip(buf)) throw new Error("not a zip");
  log(`${label}: downloaded ${(buf.length / 1e6).toFixed(1)} MB`);
  return { files: unzip(buf, want), date: new Date(headers.get("last-modified") || Date.now()) };
}

// Air Canada + Air Canada Rouge (Jazz flies Air Canada Express under contract and is left out)
async function loadAC() {
  const { files, date } = await zipSource(/^ccarcsdb.*\.zip$/i, TC_URL, "Transport Canada register", (n) => /carscurr|carsownr/i.test(n));
  const get_ = (n) => files[Object.keys(files).find((k) => k.toLowerCase().includes(n))].toString("latin1");
  const owners = new Map();
  for (const line of get_("carsownr").split(/\r?\n/)) {
    const c = parseCSVLine(line);
    if (c.length < 2) continue;
    const n = c[1].trim();
    if (n === "Air Canada") owners.set(c[0].trim(), "Air Canada");
    else if (/^Air Canada rouge/i.test(n)) owners.set(c[0].trim(), "Air Canada Rouge");
  }
  const aircraft = [];
  for (const line of get_("carscurr").split(/\r?\n/)) {
    const c = parseCSVLine(line);
    if (c.length < 39) continue;
    const op = owners.get(c[0].trim());
    if (!op || c[38].trim() !== "Registered") continue;
    const fam = familyOf(c[4].trim());
    if (!fam) continue;
    const y = parseInt(c[31], 10);
    aircraft.push({ reg: "C-" + c[0].trim(), fam, y: y > 1950 ? y : null, op });
  }
  if (aircraft.length < 150) throw new Error(`only ${aircraft.length} aircraft found`);
  return { source: "Transport Canada, Canadian Civil Aircraft Register", url: "https://wwwapps.tc.gc.ca/saf-sec-sur/2/ccarcs-riacc/", asOf: date.toISOString().slice(0, 10), aircraft,
    scope: "Air Canada and Air Canada Rouge. Air Canada Express (Jazz) is left out." };
}

// United mainline: aircraft registered to United Airlines Inc, plus leased ones (registered to bank
// trustees) that the fleet tracker has seen flying as UAL. Types United no longer flies are dropped.
async function loadUA(tracker) {
  const { files, date } = await zipSource(/^ReleasableAircraft.*\.zip$/i, FAA_URL, "FAA register", (n) => /^(MASTER|ACFTREF)\.txt$/i.test(n));
  const ref = new Map();
  for (const line of files["ACFTREF.txt"].toString("latin1").split(/\r?\n/)) { const c = line.split(","); if (c.length > 2) ref.set(c[0].trim(), c[2].trim()); }
  const seen = new Set(Object.values(tracker?.discovered?.UA || {}).map((a) => String(a.reg || "").toUpperCase()));
  const seenFams = new Set(Object.values(tracker?.discovered?.UA || {}).map((a) => familyOf(a.type)).filter(Boolean));
  const aircraft = [];
  for (const line of files["MASTER.txt"].toString("latin1").split(/\r?\n/)) {
    const c = line.split(",");
    if (c.length < 20) continue;
    const reg = "N" + c[0].trim();
    const own = c[6].trim() === "UNITED AIRLINES INC";
    if (!own && !seen.has(reg)) continue;
    const fam = familyOf(ref.get(c[2].trim()));
    if (!fam || MAKER(fam) === "Other" || (seenFams.size && !seenFams.has(fam))) continue;
    const y = parseInt(c[4], 10);
    aircraft.push({ reg, fam, y: y > 1950 ? y : null, leased: !own });
  }
  if (aircraft.length < 500) throw new Error(`only ${aircraft.length} aircraft found`);
  return { source: "FAA Aircraft Registry (Releasable Aircraft Database)", url: "https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download",
    asOf: date.toISOString().slice(0, 10), aircraft,
    scope: "Mainline aircraft registered to United, plus leased aircraft (registered to trustees) seen flying as United by the fleet tracker. United Express is left out." };
}

async function loadTracker() {
  try { return JSON.parse((await get(TRACKER_URL, { timeout: 60000 })).buf.toString("utf8")); }
  catch (e) { log("fleet tracker snapshot:", e.message); return null; }
}

// ================================================================ build
const FOCUS = {
  AC: { name: "Air Canada", keys: ["AIR CANADA"], group: [] },
  UA: { name: "United Airlines", keys: ["UNITED AIRLINES"], group: [] },
  AF: { name: "Air France", keys: ["AIR FRANCE"], group: ["AIR FRANCE KLM", "KLM ROYAL DUTCH AIRLINES", "TRANSAVIA", "TRANSAVIA FRANCE"] },
  EY: { name: "Etihad Airways", keys: ["ETIHAD AIRWAYS"], group: [] },
};
const YOUNG = new Set(["787-8", "787-9", "787-10", "737 MAX", "777X"]);
const DISPLAY = { // nicer names where the files use legal names
  "PEGASUS AIRLINES": "Pegasus Airlines", "AVOLON": "Avolon", "NAS AVIATION SERVICES": "NAS Aviation Services", "ETHIOPIAN AIRLINES": "Ethiopian Airlines",
  "AIR FRANCE KLM": "Air France-KLM (group orders)", "SAUDIA": "Saudia", "VIETJET": "VietJet", "GOL": "GOL", "ANA": "ANA (All Nippon Airways)",
  "CHINA AIRCRAFT LEASING": "CALC (China Aircraft Leasing)", "GOVERNMENTS EXECUTIVE AND PRIVATE JETS": "Governments & private jets (Airbus)", "TURKISH AIRLINES": "Turkish Airlines", "DAE": "Dubai Aerospace Enterprise",
};
const COUNTRY = { "Usa": "United States", "USA": "United States", "United States Of America": "United States", "Turkiye": "Türkiye", "Turkey": "Türkiye",
  "Uae": "United Arab Emirates", "People's Republic Of China": "China", "Hong Kong Sar": "Hong Kong" };
const REGION = { // coarse regions shared by both manufacturers
  "Europe": "Europe", "North America": "North America", "Asia - Pacific": "Asia-Pacific", "Middle East": "Middle East",
  "Latin America and Caribbean": "Latin America", "Africa": "Africa", "East Asia": "Asia-Pacific", "Southeast Asia": "Asia-Pacific",
  "South Asia": "Asia-Pacific", "Oceania": "Asia-Pacific", "Central Asia": "Asia-Pacific", "South America": "Latin America",
  "Central America and Mexico": "Latin America", "Caribbean": "Latin America", "Russia and Central Asia": "Europe",
};

async function main() {
  const [airbus, boeing, tracker] = await Promise.all([
    loadAirbus().catch((e) => (log("Airbus:", e.message), null)),
    loadBoeing().catch((e) => (log("Boeing:", e.message), null)),
    loadTracker(),
  ]);
  const [ac, ua] = await Promise.all([
    loadAC().catch((e) => (log("Transport Canada:", e.message), null)),
    loadUA(tracker).catch((e) => (log("FAA:", e.message), null)),
  ]);
  if (!airbus && !boeing) {
    if (prev) { log("neither Airbus nor Boeing could be refreshed: keeping the previous file unchanged"); return; }
    throw new Error("no Airbus or Boeing data and no previous output");
  }

  // ---- customers (merged across manufacturers by normalised name)
  const byKey = new Map();
  const cust = (key, name) => { if (!byKey.has(key)) byKey.set(key, { key, names: {}, a: {}, b: {}, h: {} }); const c = byKey.get(key); return c; };
  const stale = {};

  if (airbus) {
    for (const r of airbus.customers) {
      const c = cust(nameKey(r.name));
      c.names.airbus = r.name; c.country ||= r.country; c.regionA = airbus.region[r.name];
      if (airbus.lessors.has(r.name)) c.lessor = true;
      for (const [type, v] of Object.entries(r.t)) {
        const fam = familyOf(type) || "Other";
        const t = (c.a[fam] ||= [0, 0, 0]);
        t[0] += v[0]; t[1] += v[1]; t[2] += v[2];
      }
    }
  } else if (prev) stale.airbus = prev.sources.airbus;

  if (boeing) {
    for (const r of boeing.customers) {
      const c = cust(nameKey(r.name));
      c.names.boeing = r.name; c.country ||= r.country; c.regionB = r.region;
      for (const [model, u] of Object.entries(r.u)) { const fam = familyOf(model) || "Other"; (c.b[fam] ||= [0, 0])[0] += u; }
      for (const [model, d] of Object.entries(r.d)) { const fam = familyOf(model) || "Other"; (c.b[fam] ||= [0, 0])[1] += d; }
      for (const [y, m] of Object.entries(r.h)) {
        if (+y < 2000) continue;
        for (const [model, n] of Object.entries(m)) { const fam = familyOf(model) || "Other"; const e = ((c.h[y] ||= {})[fam] ||= [0, 0]); e[0] += n; }
      }
    }
  }

  // Airbus deliveries by year: "LESSOR (OPERATOR)" counts for the lessor (direct) and the operator (via lessor)
  const airbusYears = [];
  const airbusHist = {}; // year -> [{name, fam, n, via}]
  if (airbus) for (const [y, a] of Object.entries(airbus.deliveries)) {
    airbusYears.push({ year: +y, asOf: a.asOf, file: a.file });
    for (const d of a.list) {
      const fam = familyOf(d.type) || "Other";
      const m = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(d.name);
      const add = (key, via) => { const e = (((cust(key).h[y] ||= {})[fam]) ||= [0, 0]); e[via ? 1 : 0] += d.n; };
      if (m) { add(nameKey(m[1]), false); add(nameKey(m[2]), true); } else add(nameKey(d.name), false);
    }
  }
  // Keep Airbus delivery years from the previous run that aren't in this run's files
  const prevYears = new Set();
  if (prev && prev.customers) {
    const have = new Set(airbusYears.map((x) => x.year));
    const keep = (prev.sources?.airbus?.historyYears || []).filter((x) => !have.has(x.year));
    for (const x of keep) { airbusYears.push(x); prevYears.add(String(x.year)); }
    if (prevYears.size) for (const pc of prev.customers) {
      const c = byKey.get(pc.id) || (pc.hA && Object.keys(pc.hA).some((y) => prevYears.has(y)) ? cust(pc.id) : null);
      if (!c || !pc.hA) continue;
      for (const [y, m] of Object.entries(pc.hA)) if (prevYears.has(y)) for (const [fam, v] of Object.entries(m)) { const e = (((c.h[y] ||= {})[fam]) ||= [0, 0]); e[0] += v[0]; e[1] += v[1]; }
    }
  }
  airbusYears.sort((a, b) => a.year - b.year);
  const airbusYearSet = new Set(airbusYears.map((x) => String(x.year)));

  // ---- output customers: anyone with a backlog, plus the focus airlines and their group
  // when one manufacturer failed, keep last month's customer list so its side can be carried over
  const keepIds = new Set((!airbus || !boeing) && prev?.customers ? prev.customers.map((c) => c.id) : []);
  const focusKeys = new Set(Object.values(FOCUS).flatMap((f) => [...f.keys, ...f.group]));
  const customers = [];
  for (const c of byKey.values()) {
    const backlogA = Object.values(c.a).reduce((s, v) => s + Math.max(0, v[0] - v[1]), 0);
    const backlogB = Object.values(c.b).reduce((s, v) => s + v[0], 0);
    if (!(backlogA + backlogB > 0) && !focusKeys.has(c.key) && !keepIds.has(c.key)) continue;
    const name = c.names.boeing && !/\(|Unidentified/.test(c.names.boeing) ? c.names.boeing.replace(/,?\s+(Inc\.?|Ltd\.?|Limited|LLC|Co\.,? Ltd\.?|PJSC|A\.S\.|S\.A\.|AG|plc)$/i, "") : prettyName(c.names.airbus || c.key);
    const unknown = /UNDISCLOSED|UNIDENTIFIED/.test(c.key);
    const lessor = !unknown && (c.lessor || LESSOR_RE.test(c.names.airbus || "") || LESSOR_RE.test(c.names.boeing || ""));
    const region = unknown ? "Undisclosed" : REGION[c.regionA] || REGION[c.regionB] || (lessor ? "Lessors" : "Other");
    const a = {}, b = {}, h = {}, hA = {};
    for (const [fam, v] of Object.entries(c.a)) a[fam] = v;
    for (const [fam, v] of Object.entries(c.b)) b[fam] = v;
    for (const [y, m] of Object.entries(c.h)) {
      for (const [fam, v] of Object.entries(m)) {
        (h[y] ||= {})[fam] = v;
        if (MAKER(fam) === "Airbus" && airbusYearSet.has(y)) (hA[y] ||= {})[fam] = v;
      }
    }
    const country = prettyName(c.country || "");
    customers.push({ id: c.key, n: unknown ? (c.key.includes("UNDISCLOSED") ? "Undisclosed (Airbus)" : "Unidentified (Boeing)") : DISPLAY[c.key] || name,
      c: COUNTRY[country] || COUNTRY[c.country] || country, r: region, ...(lessor ? { l: 1 } : {}), ...(unknown ? { u: 1 } : {}),
      a, b, h, ...(Object.keys(hA).length ? { hA } : {}) });
  }
  customers.sort((x, y) => backlog(y) - backlog(x));
  function backlog(c) { return Object.values(c.a).reduce((s, v) => s + Math.max(0, v[0] - v[1]), 0) + Object.values(c.b).reduce((s, v) => s + v[0], 0); }

  // If one manufacturer failed this run, carry its figures over from the previous output
  if ((!airbus || !boeing) && prev?.customers) {
    const side = !airbus ? "a" : "b";
    const isSide = (fam) => (MAKER(fam) === "Airbus") === (side === "a");
    const now = new Map(customers.map((c) => [c.id, c]));
    for (const pc of prev.customers) {
      let c = now.get(pc.id);
      if (!c) { c = { ...pc, a: {}, b: {}, h: {} }; delete c.hA; customers.push(c); now.set(c.id, c); }
      c[side] = pc[side] || {};
      for (const [y, m] of Object.entries(pc.h || {})) for (const [fam, v] of Object.entries(m)) if (isSide(fam)) (c.h[y] ||= {})[fam] = v;
      if (side === "a" && pc.hA) c.hA = pc.hA;
    }
    customers.sort((x, y) => backlog(y) - backlog(x));
  }
  const outById = new Map(customers.map((c) => [c.id, c]));

  // ---- fleets
  // Register years earlier than the type's first deliveries are data errors (e.g. a 737 MAX "built" in 2000): ignore them
  const FIRST = { "A220-100": 2015, "A220-300": 2015, "A319neo": 2018, "A320neo": 2015, "A321neo": 2016, "A330-900": 2017, "A350-900": 2014, "A350-1000": 2017,
    "737 MAX": 2016, "787-8": 2010, "787-9": 2013, "787-10": 2017, "777X": 2024 };
  let dropped = 0;
  const agg = (list) => { const o = {}; for (const x of list) {
    const f = (o[x.fam] ||= { n: 0, y: {} }); f.n++;
    if (x.y && x.y < (FIRST[x.fam] || 0)) { dropped++; continue; }
    if (x.y) f.y[x.y] = (f.y[x.y] || 0) + 1;
  } return o; };
  const fleets = {};
  const trackerDate = tracker?.updated ? new Date(tracker.updated).toISOString().slice(0, 10) : null;
  if (ac) fleets.AC = { age: true, source: ac.source, url: ac.url, asOf: ac.asOf, scope: ac.scope, byFam: agg(ac.aircraft), total: ac.aircraft.length };
  else if (prev?.fleets?.AC) fleets.AC = { ...prev.fleets.AC, stale: true };
  if (ua) fleets.UA = { age: true, source: ua.source, url: ua.url, asOf: ua.asOf, scope: ua.scope, byFam: agg(ua.aircraft), total: ua.aircraft.length, leased: ua.aircraft.filter((x) => x.leased).length };
  else if (prev?.fleets?.UA) fleets.UA = { ...prev.fleets.UA, stale: true };
  // Air France and Etihad: no public register with years of manufacture.
  // Airbus types: "operated" count from the Airbus workbook. Other types: aircraft the fleet tracker has seen.
  for (const code of ["AF", "EY"]) {
    const key = FOCUS[code].keys[0];
    const c = outById.get(key);
    if (!c && prev?.fleets?.[code]) { fleets[code] = { ...prev.fleets[code], stale: true }; continue; }
    const byFam = {}, src = {};
    for (const [fam, v] of Object.entries(c?.a || {})) if (v[2] > 0) { byFam[fam] = { n: v[2], y: {} }; src[fam] = "airbus"; }
    const seen = {};
    for (const x of Object.values(tracker?.discovered?.[code] || {})) { const fam = familyOf(x.type); if (fam && MAKER(fam) !== "Airbus") seen[fam] = (seen[fam] || 0) + 1; }
    for (const [fam, n] of Object.entries(seen)) { byFam[fam] = { n, y: {} }; src[fam] = "tracker"; }
    // Boeing types too young to have been retired (787, 737 MAX, 777X): aircraft Boeing delivered new
    // to the airline is a better count than what the tracker has seen so far.
    for (const [fam, v] of Object.entries(c?.b || {})) {
      if (YOUNG.has(fam) && v[1] > (byFam[fam]?.n || 0)) { byFam[fam] = { n: v[1], y: {} }; src[fam] = "boeing"; }
    }
    if (!Object.keys(seen).length && prev?.fleets?.[code]) for (const [fam, s] of Object.entries(prev.fleets[code].src || {})) if (s === "tracker") { byFam[fam] = prev.fleets[code].byFam[fam]; src[fam] = "tracker"; }
    fleets[code] = { age: false, source: "Airbus Orders & Deliveries (aircraft in operation) and the fleet tracker (other types)", asOf: airbus?.asOf || prev?.sources?.airbus?.asOf,
      trackerAsOf: trackerDate, scope: "No public register gives years of manufacture for this airline, so average age and retirements can't be computed.", byFam, src,
      total: Object.values(byFam).reduce((s, v) => s + v.n, 0) };
  }

  if (dropped) log(`ignored ${dropped} implausible year(s) of manufacture`);
  const out = {
    generated: new Date().toISOString(),
    sources: {
      airbus: airbus ? { asOf: airbus.asOf, file: airbus.file, url: airbus.url, page: AIRBUS_PAGE, orders: airbus.totals.ord, deliveries: airbus.totals.del, backlog: airbus.totals.ord - airbus.totals.del, lastYear: airbus.lastYear, historyYears: airbusYears }
        : { ...(prev?.sources?.airbus || {}), stale: true },
      boeing: boeing ? { asOf: boeing.asOf, url: BOEING_PAGE, tableau: `https://public.tableau.com/app/profile/salesoperations/viz/${BOEING_WB}/OrdersandDeliveries`, unfilled: boeing.unfilledTotal, deliveredYTD: boeing.deliveredYTD, lastYear: boeing.lastYear }
        : { ...(prev?.sources?.boeing || {}), stale: true },
      tracker: { asOf: trackerDate },
    },
    families: FAMILIES,
    minor: boeing?.minorModels || prev?.minor || {},
    focus: Object.fromEntries(Object.entries(FOCUS).map(([k, f]) => [k, { name: f.name, id: f.keys[0], group: f.group.filter((g) => customers.some((c) => c.id === g)) }])),
    fleets,
    customers,
  };
  // ---- sanity checks (fail loudly rather than publish something broken)
  const sumA = out.customers.reduce((s, c) => s + Object.values(c.a).reduce((t, v) => t + Math.max(0, v[0] - v[1]), 0), 0);
  const sumB = out.customers.reduce((s, c) => s + Object.values(c.b).reduce((t, v) => t + v[0], 0), 0);
  log(`customers: ${out.customers.length}, Airbus backlog ${sumA}, Boeing unfilled ${sumB}`);
  if (airbus) { const official = airbus.totals.ord - airbus.totals.del; log(`Airbus workbook totals: ${airbus.totals.ord} ordered, ${airbus.totals.del} delivered → ${official} backlog`); if (Math.abs(official - sumA) > 50) log("WARNING: Airbus backlog differs from the workbook total"); }
  if (boeing && Math.abs(boeing.unfilledTotal - sumB) > 5) log("WARNING: Boeing unfilled differs from the export total");
  for (const [k, f] of Object.entries(out.fleets)) log(`fleet ${k}: ${f.total} aircraft${f.age ? "" : " (no ages)"}${f.stale ? " (stale)" : ""}`);
  if (sumA + sumB < 5000) throw new Error("backlog suspiciously small — not writing");

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
}

main().catch((e) => { console.error("[fleet-orders] failed:", e.message); process.exit(1); });
