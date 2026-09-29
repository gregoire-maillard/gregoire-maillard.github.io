// Helpers for scripts/fleet-orders/update.mjs: zip, xlsx and CSV readers, and the
// aircraft "family" used to line up orders (Airbus / Boeing) with fleets (registers).
// No dependencies: Node 20+.

import zlib from "node:zlib";

// ------------------------------------------------------------------ zip
// Returns { name -> Buffer } for the entries whose name passes `want` (all if omitted).
export function unzip(buf, want = () => true) {
  let eocd = buf.length - 22;
  while (eocd > 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd <= 0) throw new Error("not a zip file");
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad zip directory");
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const fnl = buf.readUInt16LE(p + 28), exl = buf.readUInt16LE(p + 30), cml = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + fnl);
    p += 46 + fnl + exl + cml;
    if (name.endsWith("/") || !want(name)) continue;
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const data = buf.subarray(start, start + csize);
    files[name] = method === 0 ? Buffer.from(data) : zlib.inflateRawSync(data);
  }
  return files;
}

// ------------------------------------------------------------------ xlsx
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unxml = (s) => s.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (m, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()]);
const colIndex = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };

// Returns { sheetName -> array of rows (arrays; numbers stay numbers, empty cells are null) }.
export function readXlsx(buf) {
  const f = unzip(buf, (n) => n.startsWith("xl/"));
  const txt = (n) => (f[n] ? f[n].toString("utf8") : "");
  const shared = [];
  for (const m of txt("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    shared.push(unxml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  }
  const rels = {};
  for (const m of txt("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0]), target = /Target="([^"]+)"/.exec(m[0]);
    if (id && target) rels[id[1]] = target[1].replace(/^\/?(xl\/)?/, "xl/");
  }
  const out = {};
  for (const m of txt("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)) {
    const name = unxml((/name="([^"]*)"/.exec(m[0]) || [])[1] || "");
    const rid = (/r:id="([^"]+)"/.exec(m[0]) || [])[1];
    const xml = txt(rels[rid]);
    const rows = [];
    for (const r of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g)) {
      const rn = parseInt((/\br="(\d+)"/.exec(r[1] || r[3] || "") || [])[1] || rows.length + 1, 10) - 1;
      const row = [];
      for (const c of (r[2] || "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1], body = c[2] || "";
        const ref = (/\br="([A-Z]+\d+)"/.exec(attrs) || [])[1];
        const t = (/\bt="([^"]+)"/.exec(attrs) || [])[1];
        const v = (/<v>([\s\S]*?)<\/v>/.exec(body) || [])[1];
        let val = null;
        if (t === "s") val = v != null ? shared[+v] : null;
        else if (t === "inlineStr") val = unxml([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(""));
        else if (t === "str" || t === "e") val = v != null ? unxml(v) : null;
        else if (t === "b") val = v === "1";
        else if (v != null && v !== "") val = Number(v);
        row[ref ? colIndex(ref) : row.length] = val;
      }
      rows[rn] = row;
    }
    for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    out[name] = rows;
  }
  return out;
}

// Excel serial date -> JS Date (1900 date system)
export const excelDate = (n) => new Date(Math.round((n - 25569) * 86400e3));

// ------------------------------------------------------------------ csv
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
export function parseCSV(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.length);
  const head = parseCSVLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((l) => { const c = parseCSVLine(l); const o = {}; head.forEach((h, i) => (o[h] = (c[i] ?? "").trim())); return o; });
}
export const num = (v) => { if (typeof v === "number") return v; const n = parseFloat(String(v ?? "").replace(/,/g, "").trim()); return Number.isFinite(n) ? n : 0; };

// ------------------------------------------------------------------ families
// One key per aircraft family, shared by orders and fleets. Order matters (it's the
// display order on the page). Boeing reports 737 MAX and 777X orders by series only,
// so the fleet side is grouped the same way.
export const FAMILIES = [
  "A220-100", "A220-300", "A318", "A319ceo", "A320ceo", "A321ceo", "A319neo", "A320neo", "A321neo",
  "A300/A310", "A330-200", "A330-300", "A330-200F", "A330-800", "A330-900", "A340", "A350-900", "A350-1000", "A350F", "A380",
  "717", "737 Classic", "737-700", "737-800", "737-900", "737 MAX", "757-200", "757-300", "767-300ER", "767-400ER", "767F",
  "777-200", "777-300ER", "777F", "777X", "787-8", "787-9", "787-10", "747", "MD-80/90", "BBJ", "Boeing military",
  "E-Jet", "E2", "CRJ", "Dash 8", "ATR", "Other",
];
export const MAKER = (fam) => (/^A\d/.test(fam) ? "Airbus" : /^(7\d7|7\d\d|737|747|757|767|777|787|MD|BBJ|Boeing)/.test(fam) ? "Boeing" : "Other");

// Airbus workbook type names, Boeing Tableau "Model Series", FAA / Transport Canada model
// strings and ICAO designators (fleet tracker) all go through this.
export function familyOf(model) {
  const m = String(model || "").toUpperCase().trim();
  const rules = [
    // ICAO designators (fleet tracker)
    [/^BCS1$/, "A220-100"], [/^BCS3$/, "A220-300"], [/^A318$/, "A318"], [/^A319$/, "A319ceo"], [/^A320$/, "A320ceo"], [/^A321$/, "A321ceo"],
    [/^A19N$/, "A319neo"], [/^A20N$/, "A320neo"], [/^A21N$/, "A321neo"], [/^A332$/, "A330-200"], [/^A333$/, "A330-300"],
    [/^A338$/, "A330-800"], [/^A339$/, "A330-900"], [/^A34\d$/, "A340"], [/^A359$/, "A350-900"], [/^A35K$/, "A350-1000"], [/^A388$/, "A380"],
    [/^B73[3-5]$/, "737 Classic"], [/^B737$/, "737-700"], [/^B738$/, "737-800"], [/^B739$/, "737-900"], [/^B3[789X]M$|^B37M$/, "737 MAX"],
    [/^B752$/, "757-200"], [/^B753$/, "757-300"], [/^B763$/, "767-300ER"], [/^B764$/, "767-400ER"], [/^B772$/, "777-200"], [/^B77W$/, "777-300ER"],
    [/^B77L$/, "777F"], [/^B778$|^B779$/, "777X"], [/^B788$/, "787-8"], [/^B789$/, "787-9"], [/^B78X$/, "787-10"], [/^B74/, "747"],
    [/^E17\d$|^E75[LS]$|^E19\d$/, "E-Jet"], [/^E29\d$/, "E2"], [/^CRJ\d$/, "CRJ"], [/^DH8/, "Dash 8"],
    // Airbus workbook names and register model strings
    [/A220-100|BD-500-1A10/, "A220-100"], [/A220-300|BD-500-1A11/, "A220-300"], [/^A318/, "A318"],
    [/^A319NEO|^A319-1\d\dN/, "A319neo"], [/^A320NEO|^A320-2\d\dN/, "A320neo"], [/^A321NEO|^A321-2\d\dN/, "A321neo"],
    [/^A319/, "A319ceo"], [/^A320/, "A320ceo"], [/^A321/, "A321ceo"], [/^A300|^A310/, "A300/A310"],
    [/^A330-200F|^A330-2\d\dF/, "A330-200F"], [/^A330-800|^A330-841/, "A330-800"], [/^A330-900|^A330-941/, "A330-900"],
    [/^A330-2/, "A330-200"], [/^A330-3/, "A330-300"], [/^A340/, "A340"], [/^A350F/, "A350F"], [/^A350-1000|^A350-10\d\d/, "A350-1000"],
    [/^A350/, "A350-900"], [/^A380/, "A380"],
    // Boeing
    [/^737-800A|^767-2C|^KC-|^P-8|^E-7/, "Boeing military"], [/^BBJ/, "BBJ"], [/^717/, "717"],
    [/^737 ?MAX|^737-[789]$|^737-10$|^737-8-200|^737-[789] ?MAX/, "737 MAX"],
    [/^737-[345]/, "737 Classic"], [/^737-[67]/, "737-700"], [/^737-8/, "737-800"], [/^737-9/, "737-900"], [/^737-[12]/, "Other"],
    [/^757-2/, "757-200"], [/^757-3/, "757-300"], [/^767-3\w*F$|^767-300F/, "767F"], [/^767-4/, "767-400ER"], [/^767-3/, "767-300ER"], [/^767/, "767-300ER"],
    [/^777X$|^777-[89]$|^777-8F$/, "777X"], [/^777F$|^777-F|^777-2\w*F$|^777-FS2/, "777F"], [/^777-3\w*ER$|^777-300ER$/, "777-300ER"], [/^777-3/, "777-300ER"],
    [/^777-2\w*LR$/, "777-200"], [/^777/, "777-200"],
    [/^787-10/, "787-10"], [/^787-9/, "787-9"], [/^787-8|^787$/, "787-8"], [/^747/, "747"], [/^MD-[89]|^DC-9-8/, "MD-80/90"],
    // regional
    [/^ERJ 1[79]0|^EMB-1[79]|^ERJ-1[79]|^E1[79]\d/, "E-Jet"], [/^ERJ 190-[34]|^E19\dE2/, "E2"], [/CL-600-2[BCDE]\d\d/, "CRJ"], [/DHC-8/, "Dash 8"], [/^ATR/, "ATR"],
  ];
  for (const [re, fam] of rules) if (re.test(m)) return fam;
  return null;
}

// ------------------------------------------------------------------ names
// Airbus writes customers in capitals, Boeing in mixed case with legal suffixes;
// a normalised key lets the two be merged.
const STOP = new Set(["INC", "LTD", "LIMITED", "CO", "COMPANY", "S", "A", "SA", "AS", "PLC", "PJSC", "LLC", "CORP", "CORPORATION",
  "THE", "GROUP", "AG", "NV", "SPA", "JSC", "PTE", "PTY", "BHD", "LTDA", "SAS", "DAC", "KSC", "QPSC", "SAOC", "LP"]);
export function nameKey(name) {
  const k = String(name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/&/g, " AND ")
    .split(/[^A-Z0-9]+/).filter((w) => w && !STOP.has(w)).join(" ");
  return ALIASES[k] || k;
}
// Same customer, different spelling (checked against the August 2026 files).
const ALIASES = {
  "PEGASUS HAVA TASIMACILIGI": "PEGASUS AIRLINES",
  "AVOLON AEROSPACE LEASING": "AVOLON",
  "BOC AVIATION": "BOC AVIATION",
  "ETHIOPIAN AIRLINES": "ETHIOPIAN AIRLINES",
  "AIR FRANCE KLM": "AIR FRANCE KLM",
  "UNITED AIRLINES PREV CONTINENTAL SEE UAL FOR UNITED AIRLINES": "CONTINENTAL AIRLINES",
  "ALL NIPPON AIRWAYS": "ANA",
  "ALL NIPPON AIRWAYS CO": "ANA",
  "JAPAN AIRLINES": "JAPAN AIRLINES",
  "KOREAN AIR LINES": "KOREAN AIR",
  "SAUDI ARABIAN AIRLINES": "SAUDIA",
  "SAUDI ARABIAN AIRLINES SAUDIA": "SAUDIA",
  "GOL LINHAS AEREAS": "GOL",
  "GOL LINHAS AEREAS INTELIGENTES": "GOL",
  "NORWEGIAN AIR": "NORWEGIAN",
  "NORWEGIAN AIR SHUTTLE": "NORWEGIAN",
  "DUBAI AEROSPACE ENTERPRISE": "DAE",
  "DUBAI AEROSPACE ENTERPRISE DAE": "DAE",
  "CHINA AIRCRAFT LEASING CALC": "CHINA AIRCRAFT LEASING",
  "BANK OF COMMUNICATIONS LEASING": "BOCOMM LEASING",
  "BOCOMM FINANCIAL LEASING": "BOCOMM LEASING",
  "TUI TRAVEL AVIATION FINANCE": "TUI",
  "TUI AG": "TUI",
  "AIR INDIA EXPRESS": "AIR INDIA EXPRESS",
  "LUFTHANSA GERMAN AIRLINES": "LUFTHANSA",
  "DEUTSCHE LUFTHANSA": "LUFTHANSA",
  "CATHAY PACIFIC AIRWAYS": "CATHAY PACIFIC",
  "SINGAPORE AIRLINES": "SINGAPORE AIRLINES",
  "TURKISH AIRLINES": "TURKISH AIRLINES",
  "TURK HAVA YOLLARI": "TURKISH AIRLINES",
  "VIETJET AIR": "VIETJET",
  "VIETJET AVIATION": "VIETJET",
  "QATAR AIRWAYS": "QATAR AIRWAYS",
  "RIYADH AIR": "RIYADH AIR",
  "JEJU AIR": "JEJU AIR",
};

const ACRONYMS = new Set(["KLM", "SAS", "ANA", "IAG", "TAP", "LOT", "EL", "AL", "UPS", "DHL", "TNT", "CDB", "ICBC", "CALC", "BOC", "DAE", "SMBC",
  "ACG", "ALC", "GECAS", "CMB", "CCB", "AVIC", "LATAM", "JAL", "ASL", "USA", "UK", "UAE", "II", "III", "VIP", "PIA", "TAM", "SKY", "NAS", "AAR",
  "SAA", "TAAG", "LAM", "US", "IGO", "ITA", "LEVEL", "AFL", "HK", "BBAM", "NBB", "EVA", "JC", "MNG", "CSA", "AZUL", "NOK"]);
const KEEP = new Set(["IGO", "LEVEL", "AZUL", "NOK", "SKY"]); // brand words that aren't acronyms
export function prettyName(upper) {
  return String(upper).toLowerCase().replace(/[a-z0-9][a-z0-9'.]*/g, (w) => {
    const U = w.toUpperCase();
    if (ACRONYMS.has(U) && !KEEP.has(U)) return U;
    return w[0].toUpperCase() + w.slice(1);
  }).replace(/\bIndigo\b/, "IndiGo").replace(/\bEasyjet\b/, "easyJet").replace(/\bAirasia\b/, "AirAsia").replace(/\bVietjet\b/, "VietJet")
    .replace(/\bJetblue\b/, "JetBlue").replace(/\bWestjet\b/, "WestJet").replace(/\bFlydubai\b/, "flydubai").replace(/\bFlynas\b/, "flynas")
    .replace(/\bJet2\b/, "Jet2").replace(/\bAercap\b/, "AerCap").replace(/\bMcdonnell\b/, "McDonnell");
}

export const LESSOR_RE = /\b(leasing|lease|leasecorp|aviation capital|aercap|avolon|boc aviation|aircastle|dae\b|dubai aerospace|macquarie|jackson square|carlyle|castlelake|air lease|smbc|bocomm|icbc|cdb|calc|minsheng|aviation finance|nordic aviation|goshawk|bba aviation|aviation partners|aviation services|nas aviation|griffin global|aerfin|azorra|zephyrus|willis|avmax|bbam|orix|sky leasing|fly leasing|genesis|merx|acg\b|alc\b|gecas|cmb financial|ccb|jetlease|drake)\b/i;
