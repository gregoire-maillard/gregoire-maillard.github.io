#!/usr/bin/env python3
"""Stream a BIXI open-data trip CSV (stdin) into station-to-station trip counts.

Standard library only (Python 3.9+). Never writes the raw CSV to disk:

    curl -sL <BIXI zip URL> | tar -xOf - | python3 aggregate_od.py --year 2025 --out ../raw/bikenetwork

Outputs (in --out):
  od_<year>.csv.gz        start, end, trips, trips_peak   (station names as in the file;
                          trips_peak = weekday trips starting 06-10h or 15-19h local time)
  od_stations_<year>.csv  name, lat, lon, trips_out, trips_in   (mean coordinates over trips)
  od_summary_<year>.json  row counts and filters applied

Filters: trips with no end station, round trips (start = end), and trips shorter than
1 minute or longer than 90 minutes are counted in the summary and dropped.
"""
import argparse, csv, gzip, io, json, os, sys
from collections import defaultdict
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Montreal")
ap = argparse.ArgumentParser()
ap.add_argument("--year", required=True)
ap.add_argument("--out", required=True)
args = ap.parse_args()
os.makedirs(args.out, exist_ok=True)

slot_cache = {}
def is_peak(ms):
    h = ms // 3_600_000
    v = slot_cache.get(h)
    if v is None:
        dt = datetime.fromtimestamp(h * 3600, tz=timezone.utc).astimezone(TZ)
        v = dt.weekday() < 5 and (6 <= dt.hour < 10 or 15 <= dt.hour < 19)
        slot_cache[h] = v
    return v

meta = {}   # name -> [latsum, lonsum, n, out, in]
def touch(name, lat, lon):
    m = meta.get(name)
    if m is None:
        m = meta[name] = [0.0, 0.0, 0, 0, 0]
    try:
        m[0] += float(lat); m[1] += float(lon); m[2] += 1
    except ValueError:
        pass
    return m

od = defaultdict(lambda: [0, 0])
q = defaultdict(int)
need = ["STARTSTATIONNAME", "STARTSTATIONLATITUDE", "STARTSTATIONLONGITUDE",
        "ENDSTATIONNAME", "ENDSTATIONLATITUDE", "ENDSTATIONLONGITUDE", "STARTTIMEMS", "ENDTIMEMS"]
reader = csv.reader(io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8-sig", newline=""))
I = None
for r in reader:
    if r and r[0].lstrip("﻿") == "STARTSTATIONNAME" or (r and "STARTTIMEMS" in r):
        col = {c.lstrip("﻿"): k for k, c in enumerate(r)}
        missing = [c for c in need if c not in col]
        if missing:
            sys.exit(f"Unexpected columns, missing {missing}; header={r}")
        I = [col[c] for c in need]; q["headers"] += 1
        continue
    if I is None:
        sys.exit("No header found")
    q["rows"] += 1
    if q["rows"] % 2_000_000 == 0:
        print(f"  {q['rows']:,} rows", file=sys.stderr, flush=True)
    try:
        sn, sla, slo, en, ela, elo, ts, te = (r[k] for k in I)
    except IndexError:
        q["bad_row"] += 1; continue
    if not (sn and en and ts and te):
        q["drop_missing"] += 1; continue
    if sn == en:
        q["drop_round_trip"] += 1; continue
    ts, te = int(ts), int(te)
    mins = (te - ts) / 60000
    if mins < 1 or mins > 90:
        q["drop_duration"] += 1; continue
    a = touch(sn, sla, slo); a[3] += 1
    b = touch(en, ela, elo); b[4] += 1
    c = od[(sn, en)]; c[0] += 1
    if is_peak(ts):
        c[1] += 1
    q["kept"] += 1

y = args.year
with gzip.open(os.path.join(args.out, f"od_{y}.csv.gz"), "wt", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["start", "end", "trips", "trips_peak"])
    for (s, e), (n, p) in sorted(od.items()):
        w.writerow([s, e, n, p])
with open(os.path.join(args.out, f"od_stations_{y}.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["name", "lat", "lon", "trips_out", "trips_in"])
    for n, (la, lo, k, o, i) in sorted(meta.items()):
        w.writerow([n, round(la / k, 6) if k else "", round(lo / k, 6) if k else "", o, i])
summary = dict(year=y, counters=dict(q), stations=len(meta), od_pairs=len(od))
with open(os.path.join(args.out, f"od_summary_{y}.json"), "w") as f:
    json.dump(summary, f, indent=1)
print(json.dumps(summary, indent=1), file=sys.stderr)
