#!/usr/bin/env python3
"""Step 4: calibrate route-choice penalties on Mon RésoVélo GPS traces (2013-2015).

For a set of penalties theta, every recorded trip is re-routed on the cheapest perceived path between its
first and last GPS point, and compared with the streets the cyclist actually used (GPS points matched to
graph edges). The score is a geometric path overlap: the share of the model route lying within 30 m of the GPS trace
and the share of the trace lying within 30 m of the model route, combined as their harmonic mean (F1).
Working with geometry rather than edge IDs keeps a trace on a street and a model route on the cycle
track beside it from counting as a miss. A coordinate search over (painted, local street, arterial)
penalties maximises the mean F1; protected = 1 by definition.

Network state: lanes are taken as they are today, except protected City segments that OpenStreetMap
did not show on 2014-09-01 (date_lanes.py), which are downgraded to "nothing" for the calibration.

Output: _work/penalties.json  (fitted penalties, fit statistics, the search path)
"""
import json, math, os, sys, time, zipfile
import numpy as np
import shapely
from shapely.geometry import LineString

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import RAW, WORK, to_xy, PRIOR_PENALTIES
from net import Net

T0 = time.time()
def log(*a):
    print(f"[{time.time() - T0:6.1f}s]", *a, flush=True)

net = Net(); G = net.G
rng = np.random.default_rng(7)

# ------------------------------------------------------------------ network as of 2014
with open(os.path.join(WORK, "lane_dates.json")) as f:
    dates = json.load(f)
with open(os.path.join(WORK, "protected_buffers.geojson")) as f:
    blen = {ft["id"]: ft["properties"]["len"] for ft in json.load(f)["features"]}
def on_map(cid, day):
    v = dates.get(str(cid))
    return v is None or v.get(day, 0) >= 0.5 * blen.get(str(cid), 1e9) or all(x < 0.5 * blen.get(str(cid), 1e9) for x in v.values())
infra_2014 = G["infra"].copy()
for k, cid in enumerate(G["city_id"]):
    if cid is not None and G["infra"][k] == "P" and G["infra_src"][k] == "city" and not on_map(cid, "2014-09-01"):
        infra_2014[k] = "N"
log("protected km today / in 2014 (model):", round(G["length"][G["infra"] == "P"].sum() / 1000), "/",
    round(G["length"][infra_2014 == "P"].sum() / 1000))

# ------------------------------------------------------------------ traces
with zipfile.ZipFile(os.path.join(RAW, "trip5000.zip")) as z:
    feats = json.loads(z.read("trip5000.json"))["features"]
edge_lines = np.array([LineString(g) for g in G["geom"]], dtype=object)
tree = shapely.STRtree(edge_lines)
nxy = np.column_stack(to_xy(G["node_ll"][:, 0], G["node_ll"][:, 1]))
ntree = shapely.STRtree(shapely.points(nxy))

trips = []
for ft in feats:
    g = ft["geometry"]
    if not g or g["type"] != "LineString" or len(g["coordinates"]) < 10:
        continue
    a = np.array(g["coordinates"])[:, :2]
    xy = np.column_stack(to_xy(a[:, 0], a[:, 1]))
    ls = LineString(xy)
    L = ls.length
    crow = math.dist(xy[0], xy[-1])
    if not (1000 <= L <= 12000) or crow < 800 or L / crow > 2.5:      # skip loops and joyrides
        continue
    trips.append(ls)
log(f"usable traces: {len(trips)} of {len(feats)}")
rng.shuffle(trips)
trips = trips[:1400]

def matched_edges(ls):
    L = ls.length
    ds = np.arange(5, L - 5, 15.0)
    pts = shapely.line_interpolate_point(ls, ds)
    a = shapely.line_interpolate_point(ls, np.maximum(ds - 8, 0)); b = shapely.line_interpolate_point(ls, np.minimum(ds + 8, L))
    bx, by = shapely.get_x(b) - shapely.get_x(a), shapely.get_y(b) - shapely.get_y(a)
    pi, ei = tree.query(pts, predicate="dwithin", distance=20)
    if len(pi) == 0:
        return set(), 0.0
    El = edge_lines[ei]
    s = shapely.line_locate_point(El, pts[pi]); ln = shapely.length(El)
    ea = shapely.line_interpolate_point(El, np.maximum(s - 4, 0)); eb = shapely.line_interpolate_point(El, np.minimum(s + 4, ln))
    ex, ey = shapely.get_x(eb) - shapely.get_x(ea), shapely.get_y(eb) - shapely.get_y(ea)
    cosang = np.abs(ex * bx[pi] + ey * by[pi]) / (np.hypot(ex, ey) * np.hypot(bx[pi], by[pi]) + 1e-9)
    d = shapely.distance(pts[pi], El)
    sc = np.where(cosang > math.cos(math.radians(35)), d, np.inf)
    o = np.lexsort((sc, pi)); first = np.r_[True, pi[o][1:] != pi[o][:-1]]
    best = ei[o][first][np.isfinite(sc[o][first])]
    share = np.isfinite(sc[o][first]).sum() / len(pts)
    return set(best.tolist()), share

T = []
for ls in trips:
    E, share = matched_edges(ls)
    if share < 0.8:
        continue
    c0, c1 = ls.coords[0], ls.coords[-1]
    o = int(ntree.query_nearest(shapely.Point(c0))[0]); d = int(ntree.query_nearest(shapely.Point(c1))[0])
    if o == d:
        continue
    tp = shapely.line_interpolate_point(ls, np.arange(0, ls.length, 20.0))
    T.append((o, d, ls, tp))
    if len(T) >= 1000:
        break
log(f"traces matched (>= 80 % of points on the graph): {len(T)}")

def score(pen):
    net.set_cost(net.arc_cost(infra_2014, pen))
    ov = []
    q = np.array([0.125, 0.375, 0.625, 0.875])
    for o, d, ls, tp in T:
        dist, pred = net.sp_tree([o])
        arcs = net.path_arcs(pred[0], o, d)
        if not arcs:
            continue
        edges = net.edge_of_arc[np.array(arcs)]
        lens = G["length"][edges]
        # precision: share of the route length within 30 m of the trace (4 points per edge)
        pts = shapely.line_interpolate_point(edge_lines[edges][:, None], q[None, :], normalized=True)
        P = (lens * shapely.dwithin(pts, ls, 30).mean(axis=1)).sum() / lens.sum()
        # recall: share of the trace within 30 m of the route
        route = shapely.multilinestrings(list(edge_lines[edges]))
        R = shapely.dwithin(tp, route, 30).mean()
        ov.append(0.0 if P + R == 0 else 2 * P * R / (P + R))
    return float(np.mean(ov))

base_len = score({"P": 1, "B": 1, "L": 1, "A": 1})
log(f"overlap, shortest distance (all penalties 1): {base_len:.3f}")
prior = score(PRIOR_PENALTIES)
log(f"overlap, prior penalties {PRIOR_PENALTIES}: {prior:.3f}")

cur = dict(PRIOR_PENALTIES); best = prior
path = [dict(cur, score=prior)]
steps = {"B": [0.4, 0.2, 0.1], "L": [0.4, 0.2, 0.1], "A": [0.8, 0.4, 0.2]}
for rnd in range(3):
    improved = True
    while improved:
        improved = False
        for k in ("B", "L", "A"):
            for sgn in (+1, -1):
                trial = dict(cur); trial[k] = round(max(1.0, cur[k] + sgn * steps[k][rnd]), 2)
                if trial[k] == cur[k]:
                    continue
                s = score(trial)
                path.append(dict(trial, score=s))
                if s > best + 1e-4:
                    best, cur, improved = s, trial, True
                    log(f"  {cur} -> {best:.3f}")
log(f"fitted {cur}, overlap {best:.3f}")
res = {"penalties": cur, "overlap_fitted": round(best, 4), "overlap_prior": round(prior, 4),
       "overlap_shortest_distance": round(base_len, 4), "prior": PRIOR_PENALTIES, "n_traces": len(T),
       "search": path, "network_state": "today's lanes minus protected segments not in OpenStreetMap on 2014-09-01"}
with open(os.path.join(WORK, "penalties.json"), "w") as f:
    json.dump(res, f, indent=1)
log("wrote penalties.json")
