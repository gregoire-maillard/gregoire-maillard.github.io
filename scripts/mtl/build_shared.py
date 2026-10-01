#!/usr/bin/env python3
"""Montréal Mobility Lab — shared spatial layer.

Builds the small files every Lab page can reuse, from raw inputs kept (git-ignored) in scripts/mtl/raw/:

  assets/data/mtl/municipalities.geojson  ARTM-territory municipalities (2021 census subdivisions),
                                          with their ARTM fare zone, population and jobs
  assets/data/mtl/cells.json              "cells" = H3 resolution-7 hexagon x municipality, with
                                          population, jobs and a population-weighted centre
  assets/data/mtl/stations.json           rapid-transit stations: STM metro, REM, exo trains

Run from the repo root:   python3 scripts/mtl/build_shared.py
Needs: numpy, shapely>=2, pyproj, pyshp, h3>=4   (pip install numpy shapely pyproj pyshp h3)

Raw inputs (see scripts/mtl/README.md for where each comes from):
  raw/census/gaf.zip               Statistics Canada 2021 Geographic Attribute File (92-151-X), blocks + population
  raw/census/lda_000b21a_e.zip     2021 dissemination-area boundary file (Lambert, EPSG:3347)
  raw/census/98100504-eng.zip      StatCan table 98-10-0504: workers by census tract of work and main mode
  raw/gtfs/stm/stops.txt           STM GTFS stops (metro stations = location_type 1, STATION_M*)
  raw/osm/rem_stations.json        REM stations from OpenStreetMap (Overpass, see raw/osm/fetch_rem.sh)
  raw/gtfs/exo_trains.zip          OPTIONAL exo trains GTFS. If missing, exo stations are approximated
                                   (one per served municipality, at its population-weighted centre).
"""
import csv, io, json, math, os, re, sys, unicodedata, zipfile
from collections import defaultdict
from datetime import date

import numpy as np
import h3
import shapefile
from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.ops import transform as shp_transform
import shapely

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW = os.path.join(ROOT, "scripts", "mtl", "raw")
OUT = os.path.join(ROOT, "assets", "data", "mtl")
os.makedirs(OUT, exist_ok=True)

DOWNTOWN = (45.5009, -73.5684)   # Place Ville Marie, used as the reference "centre" across the Lab
H3_RES = 7

# ── ARTM fare zones by municipality ────────────────────────────────────────────────
# Source: https://www.artm.quebec/en/fare-zones/ (consulted 2026-10-01; fare grid in force 2026-07-01).
ZONES_SOURCE = {"url": "https://www.artm.quebec/en/fare-zones/", "consulted": "2026-10-01"}
ARTM_ZONES = {
    "A": ["Baie-D'Urfé", "Beaconsfield", "Côte-Saint-Luc", "Dollard-des-Ormeaux", "Dorval", "Hampstead",
          "Kirkland", "L'Île-Dorval", "Montréal", "Montréal-Est", "Montréal-Ouest", "Mont-Royal",
          "Pointe-Claire", "Sainte-Anne-de-Bellevue", "Senneville", "Westmount"],
    "B": ["Boucherville", "Brossard", "Longueuil", "Saint-Bruno-de-Montarville", "Saint-Lambert", "Laval"],
    "C": ["Blainville", "Boisbriand", "Bois-des-Filion", "Charlemagne", "Deux-Montagnes", "L'Assomption",
          "Lorraine", "Mascouche", "Mirabel", "Oka", "Pointe-Calumet", "Repentigny", "Rosemère",
          "Sainte-Anne-des-Plaines", "Sainte-Marthe-sur-le-Lac", "Sainte-Thérèse", "Saint-Eustache",
          "Saint-Jérôme", "Saint-Joseph-du-Lac", "Saint-Sulpice", "Terrebonne",
          "Beauharnois", "Beloeil", "Candiac", "Carignan", "Chambly", "Châteauguay", "Contrecoeur", "Delson",
          "Hudson", "Kahnawake", "La Prairie", "Léry", "L'Île-Perrot", "McMasterville", "Mercier",
          "Mont-Saint-Hilaire", "Notre-Dame-de-l'Île-Perrot", "Otterburn Park", "Pincourt", "Richelieu",
          "Saint-Amable", "Saint-Basile-le-Grand", "Saint-Constant", "Sainte-Catherine", "Sainte-Julie",
          "Saint-Lazare", "Saint-Mathias-sur-Richelieu", "Saint-Mathieu-de-Beloeil", "Saint-Philippe",
          "Terrasse-Vaudreuil", "Varennes", "Vaudreuil-Dorion", "Verchères"],
    "D": ["L'Épiphanie", "Marieville", "Rigaud", "Sainte-Madeleine", "Sainte-Marie-Madeleine",
          "Sainte-Martine", "Saint-Hyacinthe", "Saint-Placide"],
}
# Sector used to calibrate transit use (ARTM 2023 survey reports transit trips by home region).
SECTOR_OF = {}
NORTH_C = {"Blainville", "Boisbriand", "Bois-des-Filion", "Charlemagne", "Deux-Montagnes", "L'Assomption",
           "Lorraine", "Mascouche", "Mirabel", "Oka", "Pointe-Calumet", "Repentigny", "Rosemère",
           "Sainte-Anne-des-Plaines", "Sainte-Marthe-sur-le-Lac", "Sainte-Thérèse", "Saint-Eustache",
           "Saint-Jérôme", "Saint-Joseph-du-Lac", "Saint-Sulpice", "Terrebonne", "L'Épiphanie", "Saint-Placide"}

# exo train service by municipality — used ONLY when raw/gtfs/exo_trains.zip is absent.
# Approximation: one "station" per served municipality at its population-weighted centre.
# Stations inside Montréal city, Laval and Longueuil are left out (those areas have metro/REM).
EXO_APPROX = {
    "exo1": ["Montréal-Ouest", "Dorval", "Pointe-Claire", "Beaconsfield", "Baie-D'Urfé",
             "Sainte-Anne-de-Bellevue", "L'Île-Perrot", "Pincourt", "Vaudreuil-Dorion", "Hudson"],
    "exo2": ["Rosemère", "Sainte-Thérèse", "Blainville", "Mirabel", "Saint-Jérôme"],
    "exo3": ["Saint-Lambert", "Saint-Basile-le-Grand", "McMasterville", "Mont-Saint-Hilaire"],
    "exo4": ["Delson", "Saint-Constant", "Sainte-Catherine", "Candiac"],
    "exo5": ["Repentigny", "Terrebonne", "Mascouche"],
}


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b\d+\b", "", s)          # "Kahnawake 14" -> "kahnawake"
    return re.sub(r"[^a-z]", "", s)


ZONE_BY_NORM = {norm(n): (z, n) for z, names in ARTM_ZONES.items() for n in names}


def haversine(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dp, dl = p2 - p1, np.radians(np.asarray(lon2) - np.asarray(lon1))
    a = np.sin(dp / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(a))


# ── 1. Blocks → dissemination areas (population, representative point, municipality) ──
print("reading geographic attribute file…")
das = {}            # DAUID -> dict
with zipfile.ZipFile(os.path.join(RAW, "census", "gaf.zip")) as z:
    name = [n for n in z.namelist() if n.lower().endswith(".csv")][0]
    with z.open(name) as fh:
        rd = csv.DictReader(io.TextIOWrapper(fh, encoding="latin-1"))
        for r in rd:
            if r["PRUID_PRIDU"] != "24":
                continue
            hit = ZONE_BY_NORM.get(norm(r["CSDNAME_SDRNOM"]))
            if not hit:
                continue
            lat, lon = float(r["DARPLAT_ADLAT"]), float(r["DARPLONG_ADLONG"])
            if haversine(DOWNTOWN[0], DOWNTOWN[1], lat, lon) > 90:   # same name elsewhere in Québec
                continue
            d = das.get(r["DAUID_ADIDU"])
            if d is None:
                d = das[r["DAUID_ADIDU"]] = dict(
                    csduid=r["CSDUID_SDRIDU"], csd=hit[1], zone=hit[0], ct=r["CTUID_SRIDU"],
                    cma=r["CMAUID_RMRIDU"], lat=lat, lon=lon, pop=0)
            d["pop"] += int(r["DBPOP2021_IDPOP2021"] or 0)

found = {d["csd"] for d in das.values()}
missing = [n for z in ARTM_ZONES.values() for n in z if n not in found]
print(f"  {len(das)} DAs, {len(found)} municipalities, population {sum(d['pop'] for d in das.values()):,}")
if missing:
    print("  WARNING: municipalities not matched:", missing)

# ── 2. Jobs = workers by census tract of work (2021 census, table 98-10-0504) ──
print("reading workers by tract of work…")
ct_jobs, ct_transit = {}, {}
with zipfile.ZipFile(os.path.join(RAW, "census", "98100504-eng.zip")) as z:
    with z.open("98100504.csv") as fh:
        rd = csv.reader(io.TextIOWrapper(fh, encoding="utf-8-sig"))
        hdr = next(rd)
        i_dg, i_time, i_mode, i_tot = hdr.index("DGUID"), 3, 4, 6
        for r in rd:
            if len(r) <= i_tot:
                continue                      # footnote lines at the end of the file
            dg = r[i_dg]
            if not dg.startswith("2021S0507462") or not r[i_time].startswith("Total"):
                continue
            ct = dg[len("2021S0507"):]          # e.g. 4620001.00
            v = float(r[i_tot] or 0)
            if r[i_mode].startswith("Total"):
                ct_jobs[ct] = v
            elif r[i_mode] == "Public transit":
                ct_transit[ct] = v
print(f"  {len(ct_jobs)} tracts, {sum(ct_jobs.values()):,.0f} workers with a usual place of work")

das_by_ct = defaultdict(list)
for k, d in das.items():
    if d["ct"]:
        das_by_ct[d["ct"]].append(k)
JOBS_PER_POP_OUTSIDE = 0.40   # illustrative: jobs proxy for DAs outside the Montréal CMA (no tract data)
jobs_matched = 0.0
for k, d in das.items():
    d["jobs"], d["jobs_proxy"] = 0.0, False
for ct, v in ct_jobs.items():
    ks = das_by_ct.get(ct)
    if not ks:
        continue
    jobs_matched += v
    for k in ks:                       # spread a tract's jobs equally over its DAs
        das[k]["jobs"] += v / len(ks)
for d in das.values():
    if d["cma"] != "462":
        d["jobs"], d["jobs_proxy"] = JOBS_PER_POP_OUTSIDE * d["pop"], True
print(f"  jobs placed {jobs_matched:,.0f}; proxy jobs outside CMA "
      f"{sum(d['jobs'] for d in das.values() if d['jobs_proxy']):,.0f}")

# ── 3. Municipality polygons (dissolve DA boundaries) ──
print("dissolving DA boundaries into municipalities…")
to_wgs = Transformer.from_crs("EPSG:3347", "EPSG:4326", always_xy=True).transform
geoms = defaultdict(list)
with zipfile.ZipFile(os.path.join(RAW, "census", "lda_000b21a_e.zip")) as z:
    tmp = os.path.join(RAW, "_lda")   # extracted once, git-ignored like the rest of raw/
    if not os.path.exists(os.path.join(tmp, "lda_000b21a_e.shp")):
        z.extractall(tmp)
sf = shapefile.Reader(os.path.join(tmp, "lda_000b21a_e.shp"), encoding="latin-1")
fields = [f[0] for f in sf.fields[1:]]
for i, rec in enumerate(sf.iterRecords(fields=["DAUID"])):
    k = rec[0]
    if k in das:
        geoms[das[k]["csduid"]].append(shape(sf.shape(i).__geo_interface__))

muni = {}
for d in das.values():
    m = muni.setdefault(d["csduid"], dict(csduid=d["csduid"], name=d["csd"], zone=d["zone"], pop=0, jobs=0.0,
                                          sx=0.0, sy=0.0))
    m["pop"] += d["pop"]; m["jobs"] += d["jobs"]
    m["sx"] += d["lat"] * max(d["pop"], 1); m["sy"] += d["lon"] * max(d["pop"], 1)
wsum = defaultdict(float)
for d in das.values():
    wsum[d["csduid"]] += max(d["pop"], 1)

features = []
for cid, m in sorted(muni.items(), key=lambda t: -t[1]["pop"]):
    g = shapely.union_all(geoms[cid]).buffer(0)
    g = g.simplify(150, preserve_topology=True)            # metres (Lambert)
    g = shp_transform(to_wgs, g)
    g = shapely.set_precision(g, 0.0001)
    clat, clon = m["sx"] / wsum[cid], m["sy"] / wsum[cid]
    m["clat"], m["clon"] = round(clat, 5), round(clon, 5)
    m["dist_cbd"] = round(float(haversine(DOWNTOWN[0], DOWNTOWN[1], clat, clon)), 2)
    features.append({"type": "Feature", "geometry": mapping(g), "properties": {
        "csduid": cid, "name": m["name"], "zone": m["zone"], "pop": m["pop"], "jobs": round(m["jobs"]),
        "jobs_proxy": any(d["jobs_proxy"] for d in das.values() if d["csduid"] == cid),
        "clat": m["clat"], "clon": m["clon"], "dist_cbd_km": m["dist_cbd"]}})


def round_coords(o):
    if isinstance(o, float):
        return round(o, 4)
    if isinstance(o, (list, tuple)):
        return [round_coords(x) for x in o]
    if isinstance(o, dict):
        return {k: round_coords(v) for k, v in o.items()}
    return o


geo = {"type": "FeatureCollection",
       "metadata": {"built": str(date.today()), "zones_source": ZONES_SOURCE,
                    "geometry_source": "Statistics Canada, 2021 Census dissemination-area boundaries, dissolved by census subdivision (municipality), simplified 150 m",
                    "population_source": "Statistics Canada, 2021 Census, 92-151-X Geographic Attribute File",
                    "jobs_source": "Statistics Canada, 2021 Census, table 98-10-0504 (workers with a usual place of work, by tract of work); outside the Montréal CMA jobs = 0.40 x population (illustrative)"},
       "features": round_coords(features)}
with open(os.path.join(OUT, "municipalities.geojson"), "w") as f:
    json.dump(geo, f, separators=(",", ":"), ensure_ascii=False)

# ── 4. Cells: H3 res-7 hexagon x municipality ──
cells = {}
for d in das.values():
    h = h3.latlng_to_cell(d["lat"], d["lon"], H3_RES)
    c = cells.setdefault((h, d["csduid"]), dict(h3=h, csduid=d["csduid"], zone=d["zone"], pop=0, jobs=0.0,
                                               transit_jobs=0.0, sw=0.0, sx=0.0, sy=0.0))
    w = max(d["pop"], 1) + d["jobs"]
    c["pop"] += d["pop"]; c["jobs"] += d["jobs"]
    c["sw"] += w; c["sx"] += d["lat"] * w; c["sy"] += d["lon"] * w
rows = []
for (h, cid), c in sorted(cells.items()):
    if c["pop"] + c["jobs"] < 1:
        continue
    lat, lon = c["sx"] / c["sw"], c["sy"] / c["sw"]
    rows.append([h, cid, c["zone"], round(lat, 5), round(lon, 5), c["pop"], round(c["jobs"])])
cj = {"metadata": {"built": str(date.today()), "h3_resolution": H3_RES, "downtown": DOWNTOWN,
                   "note": "A cell is the part of one H3 hexagon (res 7, ~5 km2) inside one municipality. lat/lon = population+jobs weighted centre of its dissemination areas."},
      "cols": ["h3", "csduid", "zone", "lat", "lon", "pop", "jobs"], "rows": rows}
with open(os.path.join(OUT, "cells.json"), "w") as f:
    json.dump(cj, f, separators=(",", ":"))
print(f"  {len(rows)} cells, {len({r[0] for r in rows})} hexagons")

# ── 5. Stations ──
st = []
seen = set()
with open(os.path.join(RAW, "gtfs", "stm", "stops.txt"), encoding="utf-8-sig") as f:
    stm = list(csv.DictReader(f))
child_name = {}
for r in stm:                                  # platform stops carry the properly cased name ("Station Angrignon")
    if r["parent_station"].startswith("STATION_M") and r["parent_station"] not in child_name:
        child_name[r["parent_station"]] = re.sub(r"^Station\s+", "", r["stop_name"])
for r in stm:
    if r["location_type"] == "1" and r["stop_id"].startswith("STATION_M") and r["stop_id"] not in seen:
        seen.add(r["stop_id"])
        nm = child_name.get(r["stop_id"]) or r["stop_name"].replace("STATION ", "").title()
        nm = re.sub(r"\s*-\s*Zone [A-D]$", "", nm)      # "Cartier -Zone B" -> "Cartier"
        st.append(dict(name=nm, mode="metro", lat=float(r["stop_lat"]), lon=float(r["stop_lon"]), approx=False))
rem = json.load(open(os.path.join(RAW, "osm", "rem_stations.json")))
for e in rem["elements"]:
    t = e.get("tags", {}); c = e.get("center", e)
    if t.get("railway") == "construction":
        continue                        # only stations in service
    st.append(dict(name=t.get("name"), mode="rem", lat=c["lat"], lon=c["lon"], approx=False))
exo_src = "approx"
exo_zip = os.path.join(RAW, "gtfs", "exo_trains.zip")
if os.path.exists(exo_zip):
    exo_src = "gtfs"
    with zipfile.ZipFile(exo_zip) as z:
        rd = csv.DictReader(io.TextIOWrapper(z.open("stops.txt"), encoding="utf-8-sig"))
        for r in rd:
            if r.get("location_type", "0") in ("1",) or (r.get("location_type", "0") == "0" and not r.get("parent_station")):
                st.append(dict(name=r["stop_name"], mode="exo", lat=float(r["stop_lat"]), lon=float(r["stop_lon"]), approx=False))
else:
    by_name = {m["name"]: m for m in muni.values()}
    for line, names in EXO_APPROX.items():
        for n in names:
            m = by_name.get(n)
            if m:
                st.append(dict(name=f"{n} ({line}, approx.)", mode="exo", lat=m["clat"], lon=m["clon"], approx=True, line=line))
for s in st:
    s["lat"], s["lon"] = round(s["lat"], 5), round(s["lon"], 5)
json.dump({"metadata": {"built": str(date.today()),
                        "metro": "STM GTFS (stops.txt, location_type=1)", "rem": "OpenStreetMap via Overpass (stations in service)",
                        "exo": "exo trains GTFS" if exo_src == "gtfs" else "APPROXIMATE: one point per municipality served by exo lines 1-5, at its population-weighted centre (exo GTFS unavailable at build time)"},
           "stations": st}, open(os.path.join(OUT, "stations.json"), "w"), separators=(",", ":"), ensure_ascii=False)
print(f"  stations: {sum(s['mode']=='metro' for s in st)} metro, {sum(s['mode']=='rem' for s in st)} REM, "
      f"{sum(s['mode']=='exo' for s in st)} exo ({exo_src})")
for fn in ("municipalities.geojson", "cells.json", "stations.json"):
    print(f"  {fn}: {os.path.getsize(os.path.join(OUT, fn))/1024:.0f} KB")
