#!/usr/bin/env python3
"""Step 3: BIXI origin-destination demand on the hexagon grid.

Inputs : _work-free raw files od_<year>.csv.gz and od_stations_<year>.csv (from aggregate_od.py), 2024 and 2025
Outputs: _work/od.json         cell-to-cell average annual trips (H3 resolution 8, island of Montréal only)
         assets/data/mtl/bikenetwork/demand.json   hexagons with trip ends and the busiest desire lines (for the map)

Resolution 8 cells (~0.74 km², ~460 m edge) are the parents of the shared res-9 grid in assets/data/mtl/hexgrid.json.
"""
import csv, gzip, json, os, sys
from collections import defaultdict
import numpy as np
import h3
import shapely
from shapely.geometry import shape
from shapely.ops import unary_union

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import RAW, WORK, OUT, BOUNDS, to_xy, dump

YEARS = ["2024", "2025"]
RES = 8

with open(BOUNDS) as f:
    island = unary_union([shape(ft["geometry"]) for ft in json.load(f)["features"]]).buffer(0.0003)
shapely.prepare(island)

st = {}
for y in YEARS:                      # later year wins for coordinates
    with open(os.path.join(RAW, f"od_stations_{y}.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["lat"]:
                st[r["name"]] = (float(r["lon"]), float(r["lat"]))
names = list(st)
lon = np.array([st[n][0] for n in names]); lat = np.array([st[n][1] for n in names])
on_island = shapely.contains_xy(island, lon, lat)
cell = {n: h3.latlng_to_cell(st[n][1], st[n][0], RES) for n, ok in zip(names, on_island) if ok}
print(f"stations: {len(names)}, on the island: {len(cell)}")

tot = defaultdict(float); peak = defaultdict(float)
q = defaultdict(float)
for y in YEARS:
    with gzip.open(os.path.join(RAW, f"od_{y}.csv.gz"), "rt", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            n = int(r["trips"]); q["trips"] += n
            a, b = cell.get(r["start"]), cell.get(r["end"])
            if a is None or b is None:
                q["off_island"] += n; continue
            if a == b:
                q["same_cell"] += n; continue
            tot[(a, b)] += n / len(YEARS); peak[(a, b)] += int(r["trips_peak"]) / len(YEARS)
            q["kept"] += n
print({k: f"{v:,.0f}" for k, v in q.items()}, "pairs", len(tot))

# representative point per cell: trip-weighted mean of its stations
ends = defaultdict(float); wx = defaultdict(float); wy = defaultdict(float)
for (a, b), n in tot.items():
    ends[a] += n; ends[b] += n
st_w = defaultdict(float)
for y in YEARS:
    with open(os.path.join(RAW, f"od_stations_{y}.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["name"] in cell:
                st_w[r["name"]] += int(r["trips_out"]) + int(r["trips_in"])
for n, c in cell.items():
    w = st_w[n] + 1e-6
    wx[c] += w * st[n][0]; wy[c] += w * st[n][1]
cw = defaultdict(float)
for n, c in cell.items():
    cw[c] += st_w[n] + 1e-6
cells = sorted(ends, key=lambda c: -ends[c])
pt = {c: (wx[c] / cw[c], wy[c] / cw[c]) for c in cells}

pairs = sorted(tot.items(), key=lambda kv: -kv[1])
od = {"meta": {"years": YEARS, "h3_resolution": RES, "unit": "average trips per year",
               "trips_total_both_years": q["trips"], "dropped_off_island": q["off_island"],
               "dropped_same_cell": q["same_cell"], "kept_both_years": q["kept"]},
      "cells": [[c, round(pt[c][0], 6), round(pt[c][1], 6), round(ends[c], 1)] for c in cells],
      "pairs": [[a, b, round(n, 2), round(peak[(a, b)], 2)] for (a, b), n in pairs]}
dump(od, os.path.join(WORK, "od.json"))
ann = sum(n for _, n in pairs)
cum = np.cumsum([n for _, n in pairs]) / ann
print(f"annual trips kept {ann:,.0f}; pairs for 80/90/95 %: {np.searchsorted(cum, .8)}, {np.searchsorted(cum, .9)}, {np.searchsorted(cum, .95)}")

# page layer: hexagons (trip ends) + top desire lines
hexes = []
for c in cells:
    b = h3.cell_to_boundary(c)
    hexes.append({"h": c, "e": round(ends[c]), "b": [[round(lo, 5), round(la, 5)] for la, lo in b]})
lines = [[round(pt[a][0], 5), round(pt[a][1], 5), round(pt[b][0], 5), round(pt[b][1], 5), round(n)]
         for (a, b), n in pairs[:400]]
sz = dump({"meta": {"years": YEARS, "unit": "average trips per year (both directions summed for trip ends)",
                    "annual_trips": round(ann), "cells": len(cells), "pairs": len(pairs)},
           "hexes": hexes, "lines": lines}, os.path.join(OUT, "demand.json"))
print(f"demand.json {sz / 1024:.0f} KB")
