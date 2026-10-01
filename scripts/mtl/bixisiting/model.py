#!/usr/bin/env python3
"""Where should the next BIXI stations go?  Scoring + MCLP + p-median + 2024->2025 back-test.

Reads the shared Lab layers in assets/data/mtl/ (built by scripts/mtl/build_shared.py) and writes
assets/data/mtl/bixisiting/{sites,solutions,backtest}.json for bixisiting.html.

Requires: numpy, scipy, pulp, highspy.   Run from repo root:  python3 scripts/mtl/bixisiting/model.py
All radii and weights below are ASSUMPTIONS, shown as such on the page.
"""
import json, os, time, math, random, datetime
import numpy as np
from scipy.spatial import cKDTree
from scipy.optimize import linear_sum_assignment
import pulp

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DATA = os.path.join(ROOT, "assets", "data", "mtl")
OUT = os.path.join(DATA, "bixisiting")
os.makedirs(OUT, exist_ok=True)

# ------------------------------------------------------------------ assumptions
R_COVER = 400        # m: a hex is "covered" if its centre is within this walking radius of a station
R_EXCLUDE = 300      # m: a hex centre within this distance of an existing station is not a candidate site
MIN_LAND = 0.5       # candidate hexes must be at least half land in the study area
TRANSIT_REACH = 800  # m: metro/REM pull decays linearly to zero at this distance (~10 min walk)
BIXI_SIGMA = 300     # m: Gaussian kernel spreading observed station trips onto nearby hexes
PMED_CAP = 1000      # m: p-median distance cap (anything farther counts as 1 km)
PMED_TIME = 90.0     # s: p-median time limit per solve (gap is reported)
NEW_MIN_TRIPS = 500  # back-test: a 2025 station counts as a real addition only with >= 500 trips (filters pop-ups)
NEW_GAP = 150        # m: ... and only if no 2024 station was within this distance (filters relocations)
MATCH_R = 400        # m: a model pick "anticipates" a real addition if within this distance (one-to-one)
PRESETS = {
    "balanced":  {"label": "Balanced",      "w": {"pop": 0.40, "jobs": 0.20, "transit": 0.15, "bixi": 0.25}},
    "residents": {"label": "Residents first", "w": {"pop": 0.70, "jobs": 0.10, "transit": 0.20, "bixi": 0.00}},
    "proven":    {"label": "Proven demand", "w": {"pop": 0.15, "jobs": 0.15, "transit": 0.10, "bixi": 0.60}},
}
NS = [10, 25, 50, 100]
CURVE_NS = list(range(0, 151, 10))
SOLVER = pulp.HiGHS(msg=False, timeLimit=120, gapRel=0.001)

# ------------------------------------------------------------------ geometry helpers (local equirectangular, metres)
LAT0 = 45.53
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540


def xy(lat, lon):
    return np.column_stack([(np.asarray(lon) + 73.6) * KX, (np.asarray(lat) - LAT0) * KY])


hg = json.load(open(os.path.join(DATA, "hexgrid.json")))
H = hg["rows"]
hid = [r[0] for r in H]
hlat = np.array([r[1] for r in H]); hlon = np.array([r[2] for r in H])
POP = np.array([r[3] for r in H], float); JOBS = np.array([r[4] for r in H], float)
UNIT = np.array([r[5] for r in H]); LAND = np.array([r[6] for r in H])
HXY = xy(hlat, hlon)
htree = cKDTree(HXY)
units = json.load(open(os.path.join(DATA, "units.json")))["units"]
rt = json.load(open(os.path.join(DATA, "rapid_transit.json")))["stations"]
bx = json.load(open(os.path.join(DATA, "bixi_stations.json")))
print(f"{len(H)} hexes, {POP.sum():,.0f} people, {JOBS.sum():,.0f} workers")

# coverage neighbourhoods (fixed geometry): hexes within R_COVER of each hex centre
NB = htree.query_ball_point(HXY, R_COVER)


def scenario(existing_ll, transit_ll, trips_ll_w):
    """Per-hex demand components + coverage/candidate flags for one 'state of the world'."""
    ex = xy(*zip(*existing_ll)) if existing_ll else np.zeros((0, 2))
    d_ex, _ = cKDTree(ex).query(HXY)
    tr = xy(*zip(*transit_ll))
    transit = np.zeros(len(H))
    for i, js in enumerate(cKDTree(tr).query_ball_point(HXY, TRANSIT_REACH)):
        for j in js:
            transit[i] += 1 - np.hypot(*(HXY[i] - tr[j])) / TRANSIT_REACH
    st = xy([t[0] for t in trips_ll_w], [t[1] for t in trips_ll_w]); w = np.array([t[2] for t in trips_ll_w], float)
    bixi = np.zeros(len(H))
    for i, js in enumerate(cKDTree(st).query_ball_point(HXY, 3 * BIXI_SIGMA)):
        if js:
            dd = np.hypot(*(st[js] - HXY[i]).T)
            bixi[i] = (w[js] * np.exp(-dd ** 2 / (2 * BIXI_SIGMA ** 2))).sum()
    covered = d_ex <= R_COVER
    cand = (d_ex > R_EXCLUDE) & (LAND >= MIN_LAND)
    comps = {"pop": POP, "jobs": JOBS, "transit": transit, "bixi": bixi}
    shares = {k: v / v.sum() for k, v in comps.items()}
    return dict(d_ex=d_ex, covered=covered, cand=cand, comps=comps, shares=shares, n_existing=len(existing_ll))


def demand(sc, w):
    return sum(w[k] * sc["shares"][k] for k in w) * 1e4   # demand index: total over study area = 10,000


def mclp(sc, D, N, quota=None):
    """max sum_h D_h y_h  s.t.  y_h <= sum_{j in C, |j-h|<=R} x_j,  sum x_j = N  (only uncovered demand counts).
       quota (optional): {unit index: number of stations} -> sum_{j in unit u} x_j = quota[u]  (back-test variant)."""
    if N == 0:
        return []
    cand = np.where(sc["cand"])[0]
    dem = [h for h in np.where((~sc["covered"]) & (D > 0))[0]]
    reach = {h: [j for j in NB[h] if sc["cand"][j]] for h in dem}
    dem = [h for h in dem if reach[h]]
    used = sorted({j for h in dem for j in reach[h]})
    m = pulp.LpProblem("mclp", pulp.LpMaximize)
    x = {j: pulp.LpVariable(f"x{j}", cat="Binary") for j in used}
    y = {h: pulp.LpVariable(f"y{h}", 0, 1) for h in dem}
    m += pulp.lpSum(D[h] * y[h] for h in dem)
    for h in dem:
        m += y[h] <= pulp.lpSum(x[j] for j in reach[h])
    if quota:   # a unit can't get more stations than it has usable candidate sites (dense, already-covered boroughs)
        avail = np.bincount(UNIT[used], minlength=len(units))
        quota = {u: min(q, int(avail[u])) for u, q in quota.items()}
        N = sum(quota.values())
        for u, q in quota.items():
            m += pulp.lpSum(x[j] for j in used if UNIT[j] == u) == q
    m += pulp.lpSum(x.values()) == min(N, len(used))
    m.solve(SOLVER)
    picks = [j for j in used if x[j].value() > 0.5]
    return order_greedy(sc, D, picks)


def pmedian(sc, D, N):
    """min sum_h D_h * min(e_h, d(h, new))  ==  max sum_h sum_j D_h (e_h - d_hj) z_hj
       s.t. sum_j z_hj <= 1 (each hex re-assigned at most once), z_hj <= x_j, sum_j x_j = N.
       e_h = distance to the nearest existing station, capped at PMED_CAP. Built directly in HiGHS (PuLP is too slow
       to build ~150k assignment variables)."""
    import highspy
    from collections import defaultdict
    e = np.minimum(sc["d_ex"], PMED_CAP)
    cand = np.where(sc["cand"])[0]; ctree = cKDTree(HXY[cand])
    zh, zj, g = [], [], []
    for h in np.where((e > R_EXCLUDE) & (D > 0))[0]:
        ks = ctree.query_ball_point(HXY[h], e[h])
        if not ks:
            continue
        js = cand[ks]; gg = D[h] * (e[h] - np.hypot(*(HXY[js] - HXY[h]).T)); ok = gg > 0
        zh += [h] * int(ok.sum()); zj += list(js[ok]); g += list(gg[ok])
    J = sorted(set(zj)); jix = {j: i for i, j in enumerate(J)}; nx, nz = len(J), len(g)
    hs = highspy.Highs(); hs.setOptionValue("output_flag", False)
    hs.setOptionValue("mip_rel_gap", 1e-3); hs.setOptionValue("time_limit", PMED_TIME)
    inf = highspy.kHighsInf
    hs.addVars(nx + nz, np.zeros(nx + nz), np.ones(nx + nz))
    hs.changeColsCost(nx + nz, np.arange(nx + nz, dtype=np.int32), np.concatenate([np.zeros(nx), -np.array(g)]))
    hs.changeColsIntegrality(nx, np.arange(nx, dtype=np.int32), np.array([highspy.HighsVarType.kInteger] * nx))
    byh = defaultdict(list)
    for k, h in enumerate(zh):
        byh[h].append(nx + k)
    st, idx, val, lo, hi = [], [], [], [], []
    for ks in byh.values():
        st.append(len(idx)); idx += ks; val += [1.0] * len(ks); lo.append(-inf); hi.append(1.0)
    for k in range(nz):
        st.append(len(idx)); idx += [nx + k, jix[zj[k]]]; val += [1.0, -1.0]; lo.append(-inf); hi.append(0.0)
    st.append(len(idx)); idx += list(range(nx)); val += [1.0] * nx; lo.append(N); hi.append(N)
    hs.addRows(len(lo), np.array(lo), np.array(hi), len(idx), np.array(st, dtype=np.int32),
               np.array(idx, dtype=np.int32), np.array(val))
    hs.run()
    x = hs.getSolution().col_value
    gap = hs.getInfo().mip_gap
    picks = [int(J[i]) for i in range(nx) if x[i] > 0.5]
    return order_greedy(sc, D, picks), float(gap)


def mean_dist(sc, D, picks):
    """Demand-weighted mean walking distance (straight line, m, capped) to the nearest station."""
    d = np.minimum(sc["d_ex"], PMED_CAP)
    if picks:
        d = np.minimum(d, cKDTree(HXY[picks]).query(HXY)[0])
    return float((D * d).sum() / D.sum())


def order_greedy(sc, D, picks):
    """Order an optimal set by marginal covered demand (so the map can label #1, #2, ...)."""
    cov = sc["covered"].copy(); out = []; left = set(picks)
    while left:
        best = max(left, key=lambda j: D[[h for h in NB[j] if not cov[h]]].sum())
        out.append(int(best)); left.remove(best)
        cov[NB[best]] = True
    return out


def greedy(sc, D, N):
    cov = sc["covered"].copy(); out = []
    cand = list(np.where(sc["cand"])[0])
    for _ in range(N):
        best = max(cand, key=lambda j: D[[h for h in NB[j] if not cov[h]]].sum())
        out.append(int(best)); cand.remove(best); cov[NB[best]] = True
    return out


def coverage(sc, D, picks):
    cov = sc["covered"].copy()
    for j in picks:
        cov[NB[j]] = True
    upop = np.bincount(UNIT[cov], weights=POP[cov], minlength=len(units))
    return dict(pop=float(POP[cov].sum() / POP.sum()), demand=float(D[cov].sum() / D.sum()), unit_pop=upop)


def comp_rows(sc):
    c = sc["comps"]
    return {"transit": [round(v, 2) for v in c["transit"]], "bixi": [int(round(v)) for v in c["bixi"]],
            "covered": "".join("1" if v else "0" for v in sc["covered"]),
            "cand": "".join("1" if v else "0" for v in sc["cand"])}


# ================================================================== forward: current network
cur = bx["current"]
fwd = scenario([(s[1], s[2]) for s in cur],
               [(s["lat"], s["lon"]) for s in rt],                          # all metro + REM open today
               [(s[1], s[2], s[3] + s[4]) for s in bx["y2025"]])            # latest full year of trips
print(f"forward: {fwd['covered'].sum()} covered hexes, {fwd['cand'].sum()} candidates, "
      f"pop covered today {POP[fwd['covered']].sum()/POP.sum():.1%}")

sol = {"meta": {}, "presets": {}, "curve": {}}
t0 = time.time()
BT_ONLY = bool(os.environ.get("BT_ONLY"))   # re-run only the back-test, keep solutions.json
for key, p in (PRESETS.items() if not BT_ONLY else []):
    D = demand(fwd, p["w"])
    base = coverage(fwd, D, [])
    res = {"label": p["label"], "weights": p["w"], "base": {"pop": base["pop"], "demand": base["demand"], "dist": mean_dist(fwd, D, []),
                                                              "unit_pop": [int(v) for v in base["unit_pop"]]}, "N": {}}
    for N in NS:
        a = time.time(); m_p = mclp(fwd, D, N); tm = time.time() - a
        a = time.time(); p_p, gap = pmedian(fwd, D, N); tp = time.time() - a
        g_p = greedy(fwd, D, N)
        cm, cp, cg = coverage(fwd, D, m_p), coverage(fwd, D, p_p), coverage(fwd, D, g_p)
        res["N"][N] = {"mclp": m_p, "pmed": p_p,
                       "mclp_cov": {"pop": cm["pop"], "demand": cm["demand"], "unit_pop": [int(v) for v in cm["unit_pop"]]},
                       "pmed_cov": {"pop": cp["pop"], "demand": cp["demand"]}, "pmed_gap": gap,
                       "mclp_dist": mean_dist(fwd, D, m_p), "pmed_dist": mean_dist(fwd, D, p_p),
                       "greedy_demand": cg["demand"], "overlap": len(set(m_p) & set(p_p)),
                       "secs": [round(tm, 1), round(tp, 1)]}
        print(f"  {key:9s} N={N:3d}  MCLP pop {cm['pop']:.1%} dem {cm['demand']:.1%} ({tm:.1f}s) | "
              f"p-med pop {cp['pop']:.1%} dem {cp['demand']:.1%} ({tp:.1f}s, gap {gap:.2%}) | dist {mean_dist(fwd, D, m_p):.0f}/{mean_dist(fwd, D, p_p):.0f} m | greedy dem {cg['demand']:.1%} | overlap {len(set(m_p)&set(p_p))}")
    curve = []
    for N in CURVE_NS:
        c = coverage(fwd, D, mclp(fwd, D, N))
        curve.append([N, round(c["pop"], 4), round(c["demand"], 4)])
    sol["curve"][key] = curve
    sol["presets"][key] = res
print(f"forward solves: {time.time()-t0:.0f}s")

# ================================================================== back-test: 2024 network -> 2025 additions
b24 = [s for s in bx["y2024"] if s[3] + s[4] >= 50]
b25 = bx["y2025"]
e24 = xy([s[1] for s in b24], [s[2] for s in b24]); t24 = cKDTree(e24)
d25, _ = t24.query(xy([s[1] for s in b25], [s[2] for s in b25]))
adds = [dict(name=s[0], lat=s[1], lon=s[2], trips=s[3] + s[4], gap=round(float(d)),
             kind="expansion" if d > R_EXCLUDE else "infill")
        for s, d in zip(b25, d25) if d > NEW_GAP and s[3] + s[4] >= NEW_MIN_TRIPS]
axy = xy([a["lat"] for a in adds], [a["lon"] for a in adds])
for a, p in zip(adds, axy):
    a["unit"] = int(UNIT[htree.query(p)[1]])
n_adds = len(adds)
print(f"back-test: {len(b24)} stations in 2024, {n_adds} real 2025 additions "
      f"({sum(a['kind']=='expansion' for a in adds)} expansion, {sum(a['kind']=='infill' for a in adds)} infill)")
bt_sc = scenario([(s[1], s[2]) for s in b24],
                 [(s["lat"], s["lon"]) for s in rt if s["mode"] == "metro" or s["opened"] < "2025"],
                 [(s[1], s[2], s[3] + s[4]) for s in b24])


def match(picks, radius=MATCH_R):
    if not picks:
        return 0, 0, []
    P = HXY[picks]
    dm = np.hypot(axy[:, None, 0] - P[None, :, 0], axy[:, None, 1] - P[None, :, 1])
    cost = np.where(dm <= radius, dm, 1e9)
    r, c = linear_sum_assignment(cost)
    ok = [(int(i), int(j)) for i, j in zip(r, c) if cost[i, j] < 1e9]
    exp_hits = sum(adds[i]["kind"] == "expansion" for i, _ in ok)
    return len(ok), exp_hits, ok


bt = {"meta": {}, "adds": adds, "existing2024": [[s[1], s[2]] for s in b24], "presets": {}}
for key, p in PRESETS.items():
    D = demand(bt_sc, p["w"])
    picks = mclp(bt_sc, D, n_adds)
    hits, eh, pairs = match(picks)
    hits6, _, _ = match(picks, 600)
    quota = {u: int(c) for u, c in enumerate(np.bincount([a["unit"] for a in adds], minlength=len(units))) if c}
    qpicks = mclp(bt_sc, D, n_adds, quota)
    qh, qeh, qpairs = match(qpicks)
    qn = len(qpicks)
    top = [int(i) for i in np.argsort(-np.where(bt_sc["cand"], D, -1))[:n_adds]]
    th, teh, _ = match(top)
    bt["presets"][key] = {"picks": picks, "hits": hits, "exp_hits": eh, "hits600": hits6, "pairs": pairs,
                          "top_demand_hits": th, "quota_picks": qpicks, "quota_hits": qh, "quota_n": qn, "quota_pairs": qpairs, "picks_by_unit": np.bincount(UNIT[picks], minlength=len(units)).tolist()}
    print(f"  {key:9s} MCLP hits {hits}/{n_adds} (expansion {eh}), within 600 m {hits6}; with city quotas {qh}/{qn}; top-demand baseline {th}")
rng = random.Random(42)
cand_bt = list(np.where(bt_sc["cand"])[0])
rnd = [match(rng.sample(cand_bt, n_adds))[0] for _ in range(300)]
bt["random"] = {"mean": float(np.mean(rnd)), "p5": float(np.percentile(rnd, 5)), "p95": float(np.percentile(rnd, 95))}
bt["adds_by_unit"] = np.bincount([a["unit"] for a in adds], minlength=len(units)).tolist()
print(f"  random baseline: mean {bt['random']['mean']:.1f} (90% {bt['random']['p5']:.0f}-{bt['random']['p95']:.0f})")

# ================================================================== write
stamp = datetime.date.today().isoformat()
assum = {"R_COVER": R_COVER, "R_EXCLUDE": R_EXCLUDE, "MIN_LAND": MIN_LAND, "TRANSIT_REACH": TRANSIT_REACH,
         "BIXI_SIGMA": BIXI_SIGMA, "PMED_CAP": PMED_CAP, "PMED_TIME": PMED_TIME, "NEW_MIN_TRIPS": NEW_MIN_TRIPS, "NEW_GAP": NEW_GAP,
         "MATCH_R": MATCH_R}
sites = {"meta": {"built": stamp, "assumptions": assum,
                  "fields": "per-hex arrays aligned with hexgrid rows; transit = sum of linear metro/REM pull; bixi = kernel-smoothed annual trips; covered/cand = '0'/'1' strings",
                  "forward": f"existing = BIXI GBFS snapshot ({len(cur)} stations in study area); trips = 2025; transit = all open metro + REM",
                  "backtest": f"existing = 2024 trip-file stations with >=50 trips ({len(b24)}); trips = 2024; transit = metro + REM South Shore"},
         "h3": hid,  # centres: h3.cellToLatLng in the page
         "pop": [int(v) for v in POP], "jobs": [int(v) for v in JOBS], "unit": [int(v) for v in UNIT],
         "fwd": comp_rows(fwd), "bt": comp_rows(bt_sc),
         "existing": [[s[1], s[2], s[3]] for s in cur], "transit": [[s["name"], s["mode"], s["lat"], s["lon"], s["opened"]] for s in rt],
         "units": [[u["name"], u["type"], u["pop2021"]] for u in units]}
sol["meta"] = {"built": stamp, "assumptions": assum, "presets": PRESETS, "solver": "MCLP: PuLP + HiGHS (rel. gap 0.1%); p-median: HiGHS direct, rel. gap 0.1% or 90 s limit (gap reported)"}
bt["meta"] = {"built": stamp, "assumptions": assum, "n_adds": n_adds, "n_2024": len(b24)}
for name, obj in [("sites.json", sites), ("solutions.json", sol), ("backtest.json", bt)]:
    if BT_ONLY and name == "solutions.json":
        continue
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {name} ({os.path.getsize(os.path.join(OUT, name))/1024:.0f} KB)")
