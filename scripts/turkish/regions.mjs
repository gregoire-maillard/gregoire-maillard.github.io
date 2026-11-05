// Builds assets/data/turkish/regions.json (PROJECT.md 5.12): Turkey's 81 provinces and its seven geographical regions,
// for the map of the Culture page (turkishculture.html) and the validator's checks of timeline.json.
//
//   node scripts/turkish/regions.mjs <ne_10m_admin_1_states_provinces.geojson>
//
// Input: Natural Earth's Admin 1 – States, Provinces, 1:10m, version 5.1.2, public domain:
//   https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson
// (about 40 MB; not kept in the repo). Only the 81 features with adm0_a3 "TUR" are used, by their ISO 3166-2 code.
// Shapes are simplified with mapshaper, run through npx (needs network access the first time), so shared borders
// stay shared; the regions are the provinces dissolved. Never edit regions.json by hand: change this script and rerun it.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "assets/data/turkish/regions.json");
const MAPSHAPER = "mapshaper@0.7.101";
const KEEP = "20%";        // share of removable vertices kept (Visvalingam, weighted)
const PRECISION = 0.01;    // degrees, about 1 km: below a pixel at the page's scale

// The seven regions of the First Geography Congress (Ankara, 1941), in this order, with each province in the region it is
// usually listed under (Wikipedia, "Geographical regions of Turkey": Marmara 11, Aegean 8, Mediterranean 8, Central
// Anatolia 13, Black Sea 18, Eastern Anatolia 14, Southeastern Anatolia 9). The 1941 boundaries cross some provinces.
const REGIONS = [
  ["marmara", "Marmara", "Marmara", [10, 11, 16, 17, 22, 34, 39, 41, 54, 59, 77]],
  ["aegean", "Aegean", "Ege", [3, 9, 20, 35, 43, 45, 48, 64]],
  ["mediterranean", "Mediterranean", "Akdeniz", [1, 7, 15, 31, 32, 33, 46, 80]],
  ["central-anatolia", "Central Anatolia", "İç Anadolu", [6, 18, 26, 38, 40, 42, 50, 51, 58, 66, 68, 70, 71]],
  ["black-sea", "Black Sea", "Karadeniz", [5, 8, 14, 19, 28, 29, 37, 52, 53, 55, 57, 60, 61, 67, 69, 74, 78, 81]],
  ["eastern-anatolia", "Eastern Anatolia", "Doğu Anadolu", [4, 12, 13, 23, 24, 25, 30, 36, 44, 49, 62, 65, 75, 76]],
  ["southeastern-anatolia", "Southeastern Anatolia", "Güneydoğu Anadolu", [2, 21, 27, 47, 56, 63, 72, 73, 79]],
];
// Province names as the provinces themselves write them (the file has Elâzığ, Hakkâri and some ASCII spellings).
const NAMES = ["Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
  "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
  "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
  "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
  "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
  "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
  "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"];

const code = n => "TR-" + String(n).padStart(2, "0");
const regionOf = new Map(REGIONS.flatMap(([id, , , ns]) => ns.map(n => [code(n), id])));
if (regionOf.size !== 81 || NAMES.length !== 81) throw new Error("the region lists must cover the 81 provinces once each");

const src = process.argv[2];
if (!src) { console.error("usage: node scripts/turkish/regions.mjs <ne_10m_admin_1_states_provinces.geojson>"); process.exit(1); }
const ne = JSON.parse(readFileSync(src, "utf8"));
const tur = ne.features.filter(f => f.properties.adm0_a3 === "TUR");
const seen = new Set(tur.map(f => f.properties.iso_3166_2));
for (const c of regionOf.keys()) if (!seen.has(c)) throw new Error(`${c} is not in ${src}`);
if (tur.length !== 81) throw new Error(`expected 81 Turkish provinces in ${src}, found ${tur.length}`);

const tmp = mkdtempSync(join(tmpdir(), "regions-"));
try {
  const input = join(tmp, "tur.geojson");
  writeFileSync(input, JSON.stringify({
    type: "FeatureCollection",
    features: tur.map(f => ({ type: "Feature", properties: { id: f.properties.iso_3166_2, region: regionOf.get(f.properties.iso_3166_2) }, geometry: f.geometry })),
  }));
  const ms = (...args) => execFileSync("npx", ["--yes", MAPSHAPER, ...args], { stdio: ["ignore", "ignore", "inherit"] });
  const provFile = join(tmp, "provinces.json"), regFile = join(tmp, "regions.json");
  ms("-i", input, "-simplify", KEEP, "weighted", "keep-shapes", "-clean",
     "-o", provFile, "format=geojson", `precision=${PRECISION}`);
  ms("-i", provFile, "-dissolve", "region", "-clean", "-o", regFile, "format=geojson", `precision=${PRECISION}`);

  const shape = g => {
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    return polys.map(poly => poly.map(ring => ring.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])));
  };
  const provs = JSON.parse(readFileSync(provFile, "utf8")).features;
  const regs = JSON.parse(readFileSync(regFile, "utf8")).features;
  const all = provs.flatMap(f => shape(f.geometry).flat(2));
  const r2 = x => Math.round(x * 100) / 100;
  const bbox = [r2(Math.min(...all.map(p => p[0]))), r2(Math.min(...all.map(p => p[1]))), r2(Math.max(...all.map(p => p[0]))), r2(Math.max(...all.map(p => p[1])))];

  const out = {
    source: {
      title: "Admin 1 – States, Provinces, 1:10m", publisher: "Natural Earth", version: "5.1.2",
      url: "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/",
      file: "https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson",
      licence: "Public domain", credit: "Made with Natural Earth.",
    },
    grouping: {
      title: "Geographical regions of Turkey", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Geographical_regions_of_Turkey",
      note: "The seven regions of the First Geography Congress (Ankara, 1941), with each province in the region it is usually listed under. The 1941 boundaries themselves cross some provinces.",
    },
    method: `The 81 provinces of the source (ISO 3166-2 codes), simplified with ${MAPSHAPER} (-simplify ${KEEP} weighted keep-shapes, -clean), coordinates rounded to ${PRECISION} degrees; the regions are the provinces dissolved. Written by scripts/turkish/regions.mjs.`,
    bbox,
    regions: REGIONS.map(([id, en, tr, ns]) => {
      const f = regs.find(x => x.properties.region === id);
      if (!f) throw new Error(`no dissolved shape for ${id}`);
      return { id, en, tr, provinces: ns.map(code).sort(), shape: shape(f.geometry) };
    }),
    provinces: [...provs].sort((a, b) => a.properties.id.localeCompare(b.properties.id)).map(f => {
      const id = f.properties.id;
      return { id, name: NAMES[Number(id.slice(3)) - 1], region: f.properties.region, shape: shape(f.geometry) };
    }),
  };
  // One line per ring, so the file stays readable and diffs stay small.
  const ring = r => "[" + r.map(([x, y]) => `[${x},${y}]`).join(",") + "]";
  const shp = s => "[" + s.map(poly => "[" + poly.map(ring).join(",\n        ") + "]").join(",\n       ") + "]";
  const head = JSON.stringify({ source: out.source, grouping: out.grouping, method: out.method, bbox: out.bbox }, null, 2).slice(0, -2)
    .replace(/\[\s+([-\d.,\s]+?)\s+\]/g, (m, inner) => "[" + inner.split(/,\s+/).join(", ") + "]");
  const item = (x, keys) => "    {" + keys.map(k => `"${k}": ${JSON.stringify(x[k])}`).join(", ") + ', "shape":\n      ' + shp(x.shape) + "}";
  const text = head + ',\n  "regions": [\n' + out.regions.map(r => item(r, ["id", "en", "tr", "provinces"])).join(",\n") +
    '\n  ],\n  "provinces": [\n' + out.provinces.map(p => item(p, ["id", "name", "region"])).join(",\n") + "\n  ]\n}\n";
  JSON.parse(text);   // must stay valid JSON
  writeFileSync(OUT, text);
  const pts = out.provinces.reduce((n, p) => n + p.shape.flat(2).length, 0);
  console.log(`regions.json: 7 regions, ${out.provinces.length} provinces, ${pts} points, ${Math.round(text.length / 1024)} KB, bbox ${bbox.join(", ")}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
