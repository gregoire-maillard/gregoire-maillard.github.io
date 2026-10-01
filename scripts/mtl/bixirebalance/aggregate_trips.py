#!/usr/bin/env python3
"""Stream a BIXI open-data trip CSV (stdin) into compact station x date x hour counts.

Standard library only (runs on a bare Python 3.9+). Never writes the raw CSV to disk:

    curl -sL <BIXI zip URL> | tar -xOf - | python3 aggregate_trips.py --year 2024 --out ../raw

Outputs (in --out):
  stations_<year>.csv     id, name, arrondissement, lat, lon, starts, ends
  hourly_<year>.csv.gz    date, hour, station_id, starts, ends   (local time, America/Montreal; non-zero rows only)
  summary_<year>.json     row counts, trips per day, data-quality counters
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

hour_cache = {}
def local_slot(ms):
    h = ms // 3_600_000
    v = hour_cache.get(h)
    if v is None:
        dt = datetime.fromtimestamp(h * 3600, tz=timezone.utc).astimezone(TZ)
        v = (dt.strftime("%Y-%m-%d"), dt.hour)
        hour_cache[h] = v
    return v

st_id, st_meta = {}, []   # meta: [name, arr, latsum, lonsum, n, starts, ends]
def sid(name, arr, lat, lon):
    i = st_id.get(name)
    if i is None:
        i = len(st_meta); st_id[name] = i
        st_meta.append([name, arr, 0.0, 0.0, 0, 0, 0])
    m = st_meta[i]
    try:
        m[2] += float(lat); m[3] += float(lon); m[4] += 1
    except ValueError:
        pass
    return i

starts = defaultdict(int)  # (date, hour, sid) -> n
ends = defaultdict(int)
q = defaultdict(int)
daily = defaultdict(int)
dur_bins = defaultdict(int)

reader = csv.reader(io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8-sig", newline=""))
header = next(reader)
col = {c: k for k, c in enumerate(header)}
need = ["STARTSTATIONNAME", "STARTSTATIONARRONDISSEMENT", "STARTSTATIONLATITUDE", "STARTSTATIONLONGITUDE",
        "ENDSTATIONNAME", "ENDSTATIONARRONDISSEMENT", "ENDSTATIONLATITUDE", "ENDSTATIONLONGITUDE",
        "STARTTIMEMS", "ENDTIMEMS"]
missing = [c for c in need if c not in col]
if missing:
    sys.exit(f"Unexpected columns, missing {missing}; header={header}")
I = [col[c] for c in need]

for r in reader:
    q["rows"] += 1
    if q["rows"] % 2_000_000 == 0:
        print(f"  {q['rows']:,} rows", file=sys.stderr, flush=True)
    try:
        sn, sa, sla, slo, en, ea, ela, elo, ts, te = (r[k] for k in I)
    except IndexError:
        q["bad_row"] += 1; continue
    if not ts:
        q["no_start_time"] += 1; continue
    ts = int(ts)
    d, h = local_slot(ts)
    if sn:
        s = sid(sn, sa, sla, slo); st_meta[s][5] += 1
        starts[(d, h, s)] += 1
    else:
        q["no_start_station"] += 1
    daily[d] += 1
    if en and te:
        te = int(te)
        d2, h2 = local_slot(te)
        e = sid(en, ea, ela, elo); st_meta[e][6] += 1
        ends[(d2, h2, e)] += 1
        mins = (te - ts) / 60000
        dur_bins["<0" if mins < 0 else "0-2" if mins < 2 else "2-30" if mins < 30 else "30-60" if mins < 60 else "60-180" if mins < 180 else ">180"] += 1
    else:
        q["no_end"] += 1

y = args.year
with open(os.path.join(args.out, f"stations_{y}.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["id", "name", "arrondissement", "lat", "lon", "starts", "ends"])
    for i, (n, a, la, lo, k, s, e) in enumerate(st_meta):
        w.writerow([i, n, a, round(la / k, 6) if k else "", round(lo / k, 6) if k else "", s, e])

keys = sorted(set(starts) | set(ends))
with gzip.open(os.path.join(args.out, f"hourly_{y}.csv.gz"), "wt", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["date", "hour", "station_id", "starts", "ends"])
    for k in keys:
        w.writerow([k[0], k[1], k[2], starts.get(k, 0), ends.get(k, 0)])

summary = dict(year=y, quality=dict(q), stations=len(st_meta), hourly_rows=len(keys),
               trip_minutes=dict(dur_bins), trips_per_day=dict(sorted(daily.items())))
with open(os.path.join(args.out, f"summary_{y}.json"), "w") as f:
    json.dump(summary, f, indent=1)
print(json.dumps({k: v for k, v in summary.items() if k != "trips_per_day"}, indent=1), file=sys.stderr)
