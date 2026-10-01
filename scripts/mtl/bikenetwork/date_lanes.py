#!/usr/bin/env python3
"""Step 2: when did each protected lane appear? (OpenStreetMap history via the ohsome API)

The City's bike network file has no construction date. For every protected City segment,
build_network.py writes a 15 m buffer (_work/protected_buffers.geojson). This script asks the
ohsome API (HeiGIT, full OpenStreetMap history) how many metres of protected-type OSM ways lay
inside each buffer on 1 September of each year. A segment is "on the map" in a year when that
length reaches half the segment's length. This dates when a lane was *mapped*, which usually
trails construction by weeks to months; the page labels it that way.

Standard library only. Run from the repo root:  python3 scripts/mtl/bikenetwork/date_lanes.py   (~5-10 min)
Output: scripts/mtl/raw/bikenetwork/_work/lane_dates.json   {segment id: {date: metres}}
"""
import json, os, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "..", "raw", "bikenetwork", "_work")
URL = "https://api.ohsome.org/v1/elements/length/groupBy/boundary"
UA = "gregoiremaillard-bikenetwork/1.0 (personal research; https://gregoiremaillard.com)"
TIMES = "2014-09-01,2016-09-01,2018-09-01,2019-09-01,2020-09-01,2021-09-01,2022-09-01,2023-09-01,2024-09-01,2025-09-01"
FILTER = ("type:way and (highway=cycleway or cycleway=track or cycleway:both=track or cycleway:left=track "
          "or cycleway:right=track or ((highway=path or highway=footway) and bicycle=designated))")
BATCH = 200

with open(os.path.join(WORK, "protected_buffers.geojson")) as f:
    feats = json.load(f)["features"]
out_path = os.path.join(WORK, "lane_dates.json")
res = {}
if os.path.exists(out_path):
    with open(out_path) as f:
        res = json.load(f)
todo = [ft for ft in feats if ft["id"] not in res]
print(f"{len(feats)} segments, {len(todo)} to query", flush=True)
for i in range(0, len(todo), BATCH):
    chunk = todo[i:i + BATCH]
    body = urllib.parse.urlencode({
        "bpolys": json.dumps({"type": "FeatureCollection", "features": chunk}, separators=(",", ":")),
        "time": TIMES, "filter": FILTER}).encode()
    for attempt in range(4):
        try:
            req = urllib.request.Request(URL, data=body, headers={"User-Agent": UA,
                                         "Content-Type": "application/x-www-form-urlencoded"})
            with urllib.request.urlopen(req, timeout=300) as r:
                data = json.load(r)
            break
        except Exception as e:
            print("  retry", attempt + 1, e, flush=True)
            time.sleep(10 * (attempt + 1))
    else:
        sys.exit("ohsome API kept failing; rerun later (finished batches are kept)")
    for g in data["groupByResult"]:
        res[str(g["groupByObject"])] = {r["timestamp"][:10]: round(r["value"], 1) for r in g["result"]}
    with open(out_path, "w") as f:
        json.dump(res, f)
    print(f"  {min(i + BATCH, len(todo))}/{len(todo)}", flush=True)
print("done ->", out_path)
