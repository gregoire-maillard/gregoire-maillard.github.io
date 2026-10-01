#!/usr/bin/env python3
"""Redrawing the fare zones — model behind /farezones.html (Montréal Mobility Lab).

Reads the shared Lab layer (assets/data/mtl/cells.json, stations.json, municipalities.geojson; build it with
scripts/mtl/build_shared.py) and writes assets/data/mtl/farezones/farezones.json.

Everything here is ILLUSTRATIVE: there is no ticket-sales or origin-destination data in the model.
  1. Travel times: a simple proxy (crow-fly distances, mode speeds, waits) — not a timetable router.
  2. Demand: doubly-constrained gravity model on population and jobs (2021 census), scaled to the
     ARTM 2023 survey's published totals.
  3. Price response: binary logit transit vs car; the fare coefficient is set so the average fare
     elasticity matches the chosen value (range from Paulley et al. 2006); region constants are
     calibrated to the ARTM 2023 survey's transit trips by home region.
  4. Structures: (a) current ARTM zones, (b) four concentric rings around downtown (pure or snapped to
     municipalities), (c) distance-based fare (base + per km, capped), (d) flat fare. (b)-(d) are
     optimized for every combination of elasticity x objective weight x fairness limits.

Run from the repo root:  python3 scripts/mtl/farezones/build_farezones.py      (numpy + h3; ~1-2 min)
"""
import base64, itertools, json, math, os, time
from collections import defaultdict
from datetime import date

import numpy as np
import h3

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SHARED = os.path.join(ROOT, "assets", "data", "mtl")
OUT = os.path.join(SHARED, "farezones")
os.makedirs(OUT, exist_ok=True)

# ════════════════════════ Assumptions (all adjustable, all illustrative unless sourced) ════════════════════
FARE_GRID = {   # ARTM, single trip, regular, all modes — in force 2026-07-01 (consulted 2026-10-01)
    "source": "https://www.artm.quebec/wp-content/uploads/2026/06/22189-ARTM_Grille_tarifaire_TC_FR_VF.pdf",
    "in_force": "2026-07-01", "consulted": "2026-10-01",
    "single": {"A": 3.75, "AB": 5.00, "ABC": 7.00, "ABCD": 9.50},
    "monthly": {"A": 110.00, "AB": 170.00, "ABC": 206.00, "ABCD": 281.00},
    "bus_single": 3.75,
}
ZPRICE = np.array([3.75, 5.00, 7.00, 9.50])          # by outermost zone A, B, C, D
BUS_ONLY = 3.75                                       # "Bus" titles: my reading of the grid, valid on buses in A-C (and D)

SURVEY = {  # ARTM, Enquête métropolitaine 2023 Perspectives mobilité, published highlights (fall 2023 weekday)
    "source": "https://www.artm.quebec/wp-content/uploads/2024/10/ARTM_Enquete2023_Faits_Saillants.pdf",
    "trips_per_day": 8.9e6, "car_share": 0.66, "transit_share": 0.13, "population_surveyed": 4.6e6,
    "am_transit_trips_by_home_region": {"MTL": 236000, "LGL": 37000, "LAV": 33000, "NC": 20000, "SC": 23000},
}
ELASTICITIES = [-0.2, -0.3, -0.4, -0.5, -0.6]   # Paulley et al. (2006): metro -0.3 SR, bus -0.4 SR, rail -0.6 SR, metro -0.6 LR
WEIGHTS = [0.0, 0.25, 0.5, 0.75, 1.0]           # objective = (1-w) revenue index + w ridership index
JUMPS = [1.00, 1.50, 2.50]                      # max fare step between neighbouring rings ($)
SHARES = [0.10, 0.25, 0.40]                     # max share of today's riders who pay more
REV_FLOOR = 0.95                                # every option must keep >= 95% of today's (model) revenue

GRAVITY_BETA = 0.16          # /km, deterrence exp(-beta d)            (illustrative)
ATTR_POP_WEIGHT = 0.35       # destinations = jobs + 0.35 x population  (illustrative: non-work trips)
B_TIME = -0.035              # utility per minute of travel time        (illustrative)
CAR_COST_PER_KM = 0.20       # $ variable cost per road km              (illustrative)
PARKING = [(1.5, 8.0), (4.0, 3.0)]   # $ per trip if destination within x km of downtown (illustrative)
ROAD_DETOUR, TRANSIT_DETOUR = 1.30, 1.25
INTRA_KM = 1.0               # distance of a trip inside one cell
WALK_KMH, FEEDER_KMH, BUS_KMH = 4.8, 18.0, 17.0
MODE = {  # line-haul speed km/h, average wait at boarding (min)
    "metro": (32.0, 3.0), "rem": (38.0, 4.0), "exo": (45.0, 15.0)}
K_NEAREST = 5
BIG_CITIES = {"Montréal", "Laval", "Longueuil"}   # cut along hexagons even in "snapped" rings
# What is redesigned: the all-modes ("Tous modes") single fare. Bus-only trips keep ARTM's $3.75 bus title in
# every structure, or the all-modes fare if that is cheaper (a rider buys the cheaper valid ticket).


def b64i8(a):
    return base64.b64encode(np.asarray(a, dtype=np.int8).tobytes()).decode()


t0 = time.time()
# ════════════════════════ Load shared layer ════════════════════════
cj = json.load(open(os.path.join(SHARED, "cells.json")))
cols = cj["cols"]; rows = cj["rows"]
H = [r[cols.index("h3")] for r in rows]
CSD = [r[cols.index("csduid")] for r in rows]
ZONE = np.array(["ABCD".index(r[cols.index("zone")]) for r in rows])
lat = np.array([r[cols.index("lat")] for r in rows]); lon = np.array([r[cols.index("lon")] for r in rows])
POP = np.array([r[cols.index("pop")] for r in rows], float); JOBS = np.array([r[cols.index("jobs")] for r in rows], float)
N = len(rows)
muni = {f["properties"]["csduid"]: f["properties"]
        for f in json.load(open(os.path.join(SHARED, "municipalities.geojson")))["features"]}
NAME = [muni[c]["name"] for c in CSD]
stations = json.load(open(os.path.join(SHARED, "stations.json")))["stations"]
lat0, lon0 = cj["metadata"]["downtown"]
KX, KY = 111.32 * math.cos(math.radians(lat0)), 110.57


def xy(la, lo):
    return (np.asarray(lo) - lon0) * KX, (np.asarray(la) - lat0) * KY


X, Y = xy(lat, lon)
DCBD = np.hypot(X, Y)
D = np.hypot(X[:, None] - X[None, :], Y[:, None] - Y[None, :])
np.fill_diagonal(D, INTRA_KM)

# Regions for calibration (ARTM survey groups): Montréal agglo, Laval, Longueuil agglo, north / south suburbs
NORTH = {"Blainville", "Boisbriand", "Bois-des-Filion", "Charlemagne", "Deux-Montagnes", "L'Assomption", "Lorraine",
         "Mascouche", "Mirabel", "Oka", "Pointe-Calumet", "Repentigny", "Rosemère", "Sainte-Anne-des-Plaines",
         "Sainte-Marthe-sur-le-Lac", "Sainte-Thérèse", "Saint-Eustache", "Saint-Jérôme", "Saint-Joseph-du-Lac",
         "Saint-Sulpice", "Terrebonne", "L'Épiphanie", "Saint-Placide"}
LGL = {"Longueuil", "Boucherville", "Brossard", "Saint-Bruno-de-Montarville", "Saint-Lambert"}
REGIONS = ["MTL", "LAV", "LGL", "NC", "SC"]
REG = np.array([0 if ZONE[i] == 0 else 1 if NAME[i] == "Laval" else 2 if NAME[i] in LGL else 3 if NAME[i] in NORTH else 4
                for i in range(N)])

# ════════════════════════ 1. Travel-time proxy ════════════════════════
SX, SY = xy([s["lat"] for s in stations], [s["lon"] for s in stations])
SM = [s["mode"] for s in stations]
S = len(stations)
a_km = np.hypot(X[:, None] - SX[None, :], Y[:, None] - SY[None, :]) * TRANSIT_DETOUR
walk = np.where(a_km <= 1.2, a_km / WALK_KMH * 60, np.inf)
feeder = 8 + a_km / FEEDER_KMH * 60 + 2
pnr = np.where(DCBD[:, None] > 12, 5 + a_km / 40 * 60 + 3, np.inf)      # park-and-ride in the suburbs
ACC = np.minimum(np.minimum(walk, feeder), pnr)
sd = np.hypot(SX[:, None] - SX[None, :], SY[:, None] - SY[None, :]) * TRANSIT_DETOUR
v = np.array([MODE[m][0] for m in SM]); w = np.array([MODE[m][1] for m in SM])
vv = np.maximum(v[:, None], v[None, :])          # the faster mode carries most of the distance
xfer = np.where(np.array(SM)[:, None] != np.array(SM)[None, :], 4.0, 0.0)
LH = w[:, None] + sd / vv * 60 + xfer
np.fill_diagonal(LH, np.inf)
near = np.argsort(ACC, axis=1)[:, :K_NEAREST]
TR = np.full((N, N), np.inf)
for a in range(K_NEAREST):
    sa = near[:, a]
    for b in range(K_NEAREST):
        sb = near[:, b]
        cand = ACC[np.arange(N), sa][:, None] + LH[sa[:, None], sb[None, :]] + ACC[np.arange(N), sb][None, :]
        np.minimum(TR, cand, out=TR)
TB = 7 + 3 + D * TRANSIT_DETOUR / BUS_KMH * 60
RAIL = TR < TB
TT = np.minimum(TR, TB)
vcar = 22 + 28 * (1 - np.exp(-D / 12))
TC = 3 + D * ROAD_DETOUR / vcar * 60 + np.where(DCBD[None, :] < 2.5, 6, 0)
PARK = np.zeros(N)
for r_, p_ in sorted(PARKING, reverse=True):
    PARK[DCBD < r_] = p_
CARCOST = CAR_COST_PER_KM * D * ROAD_DETOUR + PARK[None, :]

# ════════════════════════ 2. Demand: gravity ════════════════════════
O = POP.copy(); A = JOBS + ATTR_POP_WEIGHT * POP
F = np.exp(-GRAVITY_BETA * D)
scale = SURVEY["trips_per_day"] * (SURVEY["car_share"] + SURVEY["transit_share"]) * POP.sum() / SURVEY["population_surveyed"]
O = O / O.sum() * scale; A = A / A.sum() * scale
bj = np.ones(N)
for _ in range(60):
    ai = O / (F @ bj)
    bj = A / (F.T @ ai)
T = ai[:, None] * F * bj[None, :]
mean_len = float((T * D).sum() / T.sum())
print(f"gravity: {T.sum()/1e6:.2f} M motorized trips/day, mean crow-fly length {mean_len:.1f} km  [{time.time()-t0:.0f}s]")

# Current fares: all-modes fare by outermost zone; trips whose fastest path is bus-only pay the $3.75 bus title
ZMAX = np.maximum(ZONE[:, None], ZONE[None, :])
CF_ALL = ZPRICE[ZMAX]


def effective(f_all):
    return np.where(RAIL, f_all, np.minimum(BUS_ONLY, f_all))


CF = effective(CF_ALL)
CFCLS = np.where(RAIL, np.searchsorted(ZPRICE, CF_ALL), 4)   # 0..3 = rail at 3.75/5/7/9.50, 4 = bus-only at 3.75
NCLS = 5

# ════════════════════════ 3. Price response: logit, calibrated per elasticity ════════════════════════
share_target = SURVEY["transit_share"] / (SURVEY["transit_share"] + SURVEY["car_share"])
am = np.array([SURVEY["am_transit_trips_by_home_region"][r] for r in REGIONS], float)
target_by_reg = share_target * T.sum() * am / am.sum()
DU0 = B_TIME * (TT - TC)                     # time part of U_transit - U_car


def ptransit(asc_i, bc, fare):
    return 1.0 / (1.0 + np.exp(-(asc_i[:, None] + DU0 + bc * (fare - CARCOST))))


calib = {}
for e in ELASTICITIES:
    asc = np.zeros(5); bc = -0.1
    for it in range(200):
        P = ptransit(asc[REG], bc, CF)
        Nij = T * P
        by = np.bincount(REG, weights=Nij.sum(1), minlength=5)
        asc += np.log(target_by_reg / by)
        el = (Nij * CF * (1 - P)).sum() / Nij.sum()     # point elasticity = bc * that
        bc = e / el
    P = ptransit(asc[REG], bc, CF); Nij = T * P
    calib[e] = dict(asc=asc.copy(), bc=bc, N0=Nij, R0=float((Nij * CF).sum()), n0=float(Nij.sum()))
    print(f"  e={e}: bc={bc:.4f}/$, implied value of time ${B_TIME/bc*60:.1f}/h, transit share "
          f"{Nij.sum()/T.sum():.3f}, asc={np.round(asc,2)}")

# ════════════════════════ 4. Tables for fast optimization ════════════════════════
PF = np.round(np.arange(1.00, 14.0001, 0.05), 2)             # fine price grid ($0.05)
PR_IDX = [i for i, p in enumerate(PF) if p >= 2.0 - 1e-9 and abs(round(p / 0.25) * 0.25 - p) < 1e-9 and p <= 12 + 1e-9]
PR = PF[PR_IDX]                                               # ring/flat grid ($0.25, 2..12)
NB = 70                                                       # 1-km distance-from-downtown bins
DSNAP = np.array([DCBD[i] if NAME[i] in BIG_CITIES else muni[CSD[i]]["dist_cbd_km"] for i in range(N)])
bin_pure = np.minimum(DCBD.astype(int), NB - 1); bin_snap = np.minimum(DSNAP.astype(int), NB - 1)


def pairkey(b):
    lo = np.minimum(b[:, None], b[None, :]); hi = np.maximum(b[:, None], b[None, :])
    return (lo * NB + hi)


KEY = {"pure": pairkey(bin_pure).ravel(), "snap": pairkey(bin_snap).ravel()}
DB = 0.5
NDB = 160
dbin = np.minimum((D / DB).astype(int), NDB - 1).ravel()
DMID = (np.arange(NDB) + 0.5) * DB
cf_flat = CFCLS.ravel()
Tflat = T.ravel()
railflat = RAIL.ravel()

tables = {}
for e in ELASTICITIES:
    c = calib[e]
    asc_i = c["asc"][REG]
    base = (asc_i[:, None] + DU0 - c["bc"] * CARCOST).ravel()
    ring = {k: np.zeros((NB * NB * NCLS, len(PR))) for k in KEY}
    dist = np.zeros((NDB * NCLS, len(PF)))
    ring_col = {pi: j for j, pi in enumerate(PR_IDX)}
    for pi, p in enumerate(PF):
        Np = Tflat / (1 + np.exp(-(base + c["bc"] * np.where(railflat, p, min(BUS_ONLY, p)))))
        dist[:, pi] = np.bincount(dbin * NCLS + cf_flat, weights=Np, minlength=NDB * NCLS)
        if pi in ring_col:
            for k in KEY:
                ring[k][:, ring_col[pi]] = np.bincount(KEY[k] * NCLS + cf_flat, weights=Np, minlength=NB * NB * NCLS)
    N0f = c["N0"].ravel()
    tables[e] = dict(
        ring={k: ring[k].reshape(NB * NB, NCLS, len(PR)) for k in KEY},
        ring0={k: np.bincount(KEY[k] * NCLS + cf_flat, weights=N0f, minlength=NB * NB * NCLS).reshape(NB * NB, NCLS) for k in KEY},
        dist=dist.reshape(NDB, NCLS, len(PF)),
        dist0=np.bincount(dbin * NCLS + cf_flat, weights=N0f, minlength=NDB * NCLS).reshape(NDB, NCLS))
print(f"tables built [{time.time()-t0:.0f}s]")

# neighbours: same hexagon (other municipality) or adjacent hexagon
by_h = defaultdict(list)
for i, h in enumerate(H):
    by_h[h].append(i)
NBR = []
for i, h in enumerate(H):
    s = set()
    for g in h3.grid_disk(h, 1):
        s.update(by_h.get(g, []))
    s.discard(i); NBR.append(sorted(s))
nbr_i = np.array([i for i in range(N) for j in NBR[i]]); nbr_j = np.array([j for i in range(N) for j in NBR[i]])
HAS_NBR = np.array([len(x) > 0 for x in NBR])
NBR_START = np.concatenate([[0], np.cumsum([len(x) for x in NBR])[:-1]])[HAS_NBR]

NBR_SEP = float(np.hypot(X[nbr_i] - X[nbr_j], Y[nbr_i] - Y[nbr_j]).max())   # km, farthest pair of neighbouring cells

SCEN = list(itertools.product(range(len(WEIGHTS)), range(len(JUMPS)), range(len(SHARES))))


def pick(rev, rid, more, maxjump, R0, n0, N0tot, best):
    """best[(wi,ji,si)] = (score, payload_index) — keep the max objective under constraints."""
    ri, di, mi = rev / R0, rid / n0, more / N0tot
    ok_floor = ri >= REV_FLOOR
    out = {}
    for (wi, ji, si) in SCEN:
        m = ok_floor & (mi <= SHARES[si] + 1e-12) & (maxjump <= JUMPS[ji] + 1e-9)
        if m.any():
            sc = np.where(m, (1 - WEIGHTS[wi]) * ri + WEIGHTS[wi] * di, -np.inf)
            k = int(np.argmax(sc)); out[(wi, ji, si)] = (float(sc[k]), k, False)
            continue
        # no option meets every limit: closest one = fewest riders paying more, among those meeting the
        # revenue floor and the jump limit (ties: best objective). Flagged "relaxed" on the page.
        m2 = ok_floor & (maxjump <= JUMPS[ji] + 1e-9)
        if not m2.any():
            out[(wi, ji, si)] = None; continue
        sc = np.where(m2, -mi * 1e6 + (1 - WEIGHTS[wi]) * ri + WEIGHTS[wi] * di, -np.inf)
        k = int(np.argmax(sc)); out[(wi, ji, si)] = (-1e9 + float(sc[k]), k, True)
    return out


# ── (b) rings ─────────────────────────────────────────────────────
RADII = list(range(4, 41, 2))
lo_b = np.repeat(np.arange(NB), NB); hi_b = np.tile(np.arange(NB), NB)
p0_opts = [i for i, p in enumerate(PR) if p <= 5.0 + 1e-9]
inc_opts = list(range(0, 11))                                     # 0..2.50 in $0.25
combos = np.array([(a, a + i1, a + i1 + i2, a + i1 + i2 + i3) for a in p0_opts for i1 in inc_opts for i2 in inc_opts
                   for i3 in inc_opts if a + i1 + i2 + i3 < len(PR)])
cmaxjump = np.max(np.diff(PR[combos], axis=1), axis=1)
CFV = np.append(ZPRICE, BUS_ONLY)            # current fare by class


def more_less(n0c, p):
    """today's riders (by current-fare class) paying more / less at all-modes price p"""
    newf = np.append(np.full(4, p), min(BUS_ONLY, p))
    return n0c[..., newf > CFV + 1e-9].sum(-1), n0c[..., newf < CFV - 1e-9].sum(-1)


def ring_of(b, radii):
    return np.searchsorted(np.array(radii), b, side="right")      # radii integer, b = floor(dist)


def optimize_rings(e, kind):
    tb = tables[e]["ring"][kind]; t0b = tables[e]["ring0"][kind]
    cbin = bin_pure if kind == "pure" else bin_snap
    c = calib[e]; R0, n0 = c["R0"], c["n0"]
    best = {}
    for radii in itertools.combinations(RADII, 3):
        rlo, rhi = ring_of(lo_b, radii), ring_of(hi_b, radii)
        cls = rhi                                                 # pay for the outermost ring touched
        onehot = np.zeros((4, NB * NB)); onehot[cls, np.arange(NB * NB)] = 1
        Nkc = np.einsum("kb,bcp->kcp", onehot, tb)               # riders by ring class, current-fare class, price
        Nk = Nkc.sum(1)
        N0k = onehot @ t0b                                        # today's riders by class and current-fare class
        Rk = Nkc[:, :4].sum(1) * PR[None, :] + Nkc[:, 4] * np.minimum(BUS_ONLY, PR)[None, :]
        # boundary jump: neighbouring cells in rings a < b -> a trip to the centre costs p_b - p_a more
        rc = ring_of(cbin, radii)
        ra, rb = np.minimum(rc[nbr_i], rc[nbr_j]), np.maximum(rc[nbr_i], rc[nbr_j])
        adj = {(int(a), int(b)) for a, b in zip(ra, rb) if a != b}
        jump = np.zeros(len(combos))
        for a, b in adj:
            jump = np.maximum(jump, PR[combos[:, b]] - PR[combos[:, a]])
        moreK = np.array([[more_less(N0k[k], p)[0] for p in PR] for k in range(4)])
        rev = sum(Rk[k, combos[:, k]] for k in range(4))
        rid = sum(Nk[k, combos[:, k]] for k in range(4))
        more = sum(moreK[k, combos[:, k]] for k in range(4))
        res = pick(rev, rid, more, jump, R0, n0, n0, best)
        for sc, v in res.items():
            if v and (sc not in best or v[0] > best[sc][0] + 1e-12):
                best[sc] = (v[0], dict(radii=list(radii), prices=[float(x) for x in PR[combos[v[1]]]]), v[2])
    return best


# ── (c) distance-based ───────────────────────────────────────────────
BASES = np.round(np.arange(1.50, 4.5001, 0.25), 2); RATES = np.round(np.arange(0.0, 0.4001, 0.02), 2)
CAPS = np.round(np.arange(4.0, 12.0001, 0.5), 2)
dcombos = np.array([(b, r, c) for b in BASES for r in RATES for c in CAPS if c >= b])
dfare = np.minimum(dcombos[:, 2:3], dcombos[:, 0:1] + dcombos[:, 1:2] * DMID[None, :])
dfare_idx = np.clip(np.round((dfare - 1.0) / 0.05).astype(int), 0, len(PF) - 1)
dfare_r = PF[dfare_idx]


def optimize_distance(e):
    tb = tables[e]["dist"]; t0b = tables[e]["dist0"]; c = calib[e]
    rid = np.zeros(len(dcombos)); rev = np.zeros(len(dcombos)); more = np.zeros(len(dcombos))
    for b in range(NDB):
        fb = dfare_r[:, b]
        nb = tb[b][:, dfare_idx[:, b]]                            # classes x combos
        rid += nb.sum(0)
        rev += nb[:4].sum(0) * fb + nb[4] * np.minimum(BUS_ONLY, fb)
        newf = np.column_stack([fb] * 4 + [np.minimum(BUS_ONLY, fb)])
        more += (t0b[b][None, :] * (newf > CFV[None, :] + 1e-9)).sum(1)
    # largest gap between neighbouring cells: per-km rate x their distance (+ one 0.5-km fare band), capped
    jump = np.minimum(dcombos[:, 2] - dcombos[:, 0], dcombos[:, 1] * (NBR_SEP + DB))
    res = pick(rev, rid, more, jump, c["R0"], c["n0"], c["n0"], {})
    return {sc: (v[0], dict(base=float(dcombos[v[1], 0]), per_km=float(dcombos[v[1], 1]), cap=float(dcombos[v[1], 2])), v[2])
            for sc, v in res.items() if v}


def optimize_flat(e):
    tb = tables[e]["dist"].sum(0); t0b = tables[e]["dist0"].sum(0); c = calib[e]
    idx = np.array(PR_IDX)
    rid = tb[:, idx].sum(0); rev = tb[:4, idx].sum(0) * PF[idx] + tb[4, idx] * np.minimum(BUS_ONLY, PF[idx])
    more = np.array([more_less(t0b, p)[0] for p in PF[idx]])
    res = pick(rev, rid, more, np.zeros(len(idx)), c["R0"], c["n0"], c["n0"], {})
    return {sc: (v[0], dict(price=float(PF[idx][v[1]])), v[2]) for sc, v in res.items() if v}


# ════════════════════════ 5. Exact evaluation of chosen solutions ════════════════════════
def fare_matrix(struct, prm):
    """all-modes fare matrix of a structure"""
    if struct == "current":
        return CF_ALL
    if struct in ("rings", "rings_snap"):
        dd = DCBD if struct == "rings" else DSNAP
        r = np.searchsorted(np.array(prm["radii"], float), np.floor(dd), side="right")
        p = np.array(prm["prices"])
        return p[np.maximum(r[:, None], r[None, :])]
    if struct == "distance":
        dmid = (np.minimum((D / DB).astype(int), NDB - 1) + 0.5) * DB
        return np.round(np.minimum(prm["cap"], prm["base"] + prm["per_km"] * dmid) / 0.05) * 0.05
    if struct == "flat":
        return np.full((N, N), prm["price"])


# Areas for winners/losers: municipalities; the 3 big cities split by H3 res-6 parent hexagon
AREA_KEY = [(NAME[i], h3.cell_to_parent(H[i], 6)) if NAME[i] in BIG_CITIES else (NAME[i], "") for i in range(N)]
akeys = sorted(set(AREA_KEY), key=lambda k: (k[0], k[1]))
AIDX = np.array([akeys.index(k) for k in AREA_KEY])
NA = len(akeys)


def area_label(k):
    """readable name: municipality, or 'Montréal · 12 km north-east' (distance and direction from downtown)"""
    if not k[1]:
        return k[0]
    ii = np.where(AIDX == akeys.index(k))[0]
    w_ = POP[ii] + 1
    ax_, ay_ = (X[ii] * w_).sum() / w_.sum(), (Y[ii] * w_).sum() / w_.sum()
    dist_ = math.hypot(ax_, ay_)
    if dist_ < 2.5:
        return f"{k[0]} · downtown"
    ang = math.degrees(math.atan2(ay_, ax_)) % 360
    dirs = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"]
    return f"{k[0]} · {dist_:.0f} km {dirs[int(((ang + 22.5) % 360) // 45)]} of downtown"


NAME_ARR = np.array(NAME)
ALABEL = [area_label(k) for k in akeys]
seen_l = defaultdict(int)
for i_, l_ in enumerate(ALABEL):          # keep labels unique
    seen_l[l_] += 1
    if seen_l[l_] > 1:
        ALABEL[i_] = f"{l_} ({seen_l[l_]})"


def evaluate(struct, prm, e):
    c = calib[e]
    f_all = fare_matrix(struct, prm)
    f = effective(f_all)
    P = ptransit(c["asc"][REG], c["bc"], f); Nij = T * P
    N0 = c["N0"]
    dlt = f - CF
    more = float(N0[dlt > 1e-6].sum()); less = float(N0[dlt < -1e-6].sum())
    # cliff: largest fare drop available by starting one cell over, same destination
    gap = f_all[nbr_i, :] - f_all[nbr_j, :]                              # (pairs of neighbours) x destinations
    maxjump = float(np.abs(gap).max())
    worst = np.zeros((N, N))
    worst[HAS_NBR] = np.maximum.reduceat(gap, NBR_START, axis=0)
    cliff = float(N0[worst >= 1.0 - 1e-9].sum() / N0.sum())
    by_area_n0 = np.bincount(AIDX, weights=N0.sum(1), minlength=NA)
    by_area_d = np.bincount(AIDX, weights=(N0 * dlt).sum(1), minlength=NA)
    avgd = np.where(by_area_n0 > 0, by_area_d / np.maximum(by_area_n0, 1e-9), 0)
    more_a = np.bincount(AIDX, weights=(N0 * (dlt > 1e-6)).sum(1), minlength=NA)
    return dict(rev=round(100 * float((Nij * f).sum()) / c["R0"], 2), rid=round(100 * float(Nij.sum()) / c["n0"], 2),
                more=round(more / c["n0"], 4), less=round(less / c["n0"], 4),
                more_trips=round(more), less_trips=round(less),
                avg_fare=round(float((Nij * f).sum() / Nij.sum()), 3),
                maxjump=round(maxjump, 2), cliff=round(cliff, 4),
                area_delta=b64i8(np.clip(np.round(avgd / 0.05), -127, 127)),
                area_more=b64i8(np.clip(np.round(100 * more_a / np.maximum(by_area_n0, 1e-9)), 0, 100)))


solutions = []; sol_key = {}


def add_solution(struct, prm, e, relaxed=False):
    key = (struct, json.dumps(prm, sort_keys=True), e, relaxed)
    if key not in sol_key:
        sol_key[key] = len(solutions)
        solutions.append(dict(s=struct, p=prm, e=e, relaxed=relaxed, **evaluate(struct, prm, e)))
    return sol_key[key]


index = {}
for ei, e in enumerate(ELASTICITIES):
    t1 = time.time()
    res = {"rings": optimize_rings(e, "pure"), "rings_snap": optimize_rings(e, "snap"),
           "distance": optimize_distance(e), "flat": optimize_flat(e)}
    cur = add_solution("current", {}, e)
    for (wi, ji, si) in SCEN:
        row = {"current": cur}
        for st_, best in res.items():
            v = best.get((wi, ji, si))
            row[st_] = add_solution(st_, v[1], e, v[2]) if v else -1
        index[f"{ei}{wi}{ji}{si}"] = row
    print(f"  e={e}: optimized + evaluated in {time.time()-t1:.0f}s, {len(solutions)} unique solutions so far")

# ════════════════════════ 6. Diagnostics, example trips, output ════════════════════════
c = calib[-0.4]
by_reg = np.bincount(REG, weights=c["N0"].sum(1), minlength=5)


def cell_near(la, lo):
    x, y = xy(la, lo); return int(np.argmin(np.hypot(X - x, Y - y)))


cbd = cell_near(lat0, lon0)
examples = {}
for nm, (la, lo) in {"Laval (Chomedey)": (45.555, -73.745), "Brossard (Quartier)": (45.447, -73.435),
                     "Saint-Jérôme": (45.78, -74.0), "Pointe-Claire": (45.45, -73.82), "Longueuil (Vieux)": (45.537, -73.51),
                     "Montréal (Rosemont)": (45.55, -73.58)}.items():
    i = cell_near(la, lo)
    examples[nm] = dict(transit_min=round(float(TT[i, cbd])), car_min=round(float(TC[i, cbd])), rail=bool(RAIL[i, cbd]),
                        fare_now=float(CF[i, cbd]), transit_share=round(float(c["N0"][i, cbd] / T[i, cbd]), 3))
print("examples to downtown:", json.dumps(examples, ensure_ascii=False))

out = {
    "meta": {
        "built": str(date.today()),
        "illustrative": True,
        "fare_grid": FARE_GRID,
        "zones_source": {"url": "https://www.artm.quebec/en/fare-zones/", "consulted": "2026-10-01"},
        "survey": SURVEY,
        "elasticity_source": "Paulley, N. et al. (2006), The demand for public transport: the effects of fares, quality of service, income and car ownership, Transport Policy 13(4), 295-306",
        "params": dict(gravity_beta=GRAVITY_BETA, attr_pop_weight=ATTR_POP_WEIGHT, b_time=B_TIME,
                       car_cost_per_km=CAR_COST_PER_KM, parking=PARKING, road_detour=ROAD_DETOUR,
                       transit_detour=TRANSIT_DETOUR, modes=MODE, walk_kmh=WALK_KMH, feeder_kmh=FEEDER_KMH,
                       bus_kmh=BUS_KMH, rev_floor=REV_FLOOR, bus_only=BUS_ONLY, intra_km=INTRA_KM,
                       ring_radii_km=RADII, ring_price_step=0.25, distance_grid=dict(base=[float(BASES[0]), float(BASES[-1])],
                       per_km=[float(RATES[0]), float(RATES[-1])], cap=[float(CAPS[0]), float(CAPS[-1])]),
                       big_cities_unsnapped=sorted(BIG_CITIES)),
        "model_totals": dict(motorized_trips=round(float(T.sum())), mean_trip_km=round(mean_len, 1),
                             transit_trips=round(c["n0"]), avg_fare_today=round(c["R0"] / c["n0"], 3),
                             transit_by_region={r: round(float(by_reg[k])) for k, r in enumerate(REGIONS)},
                             rail_share_of_transit=round(float((c["N0"] * RAIL).sum() / c["n0"]), 3)),
        "calibration": {str(e): dict(bc=round(calib[e]["bc"], 5), vot_per_h=round(B_TIME / calib[e]["bc"] * 60, 1),
                                     asc=[round(float(a), 3) for a in calib[e]["asc"]]) for e in ELASTICITIES},
        "examples_to_downtown": examples,
    },
    "axes": {"elasticity": ELASTICITIES, "weight": WEIGHTS, "jump": JUMPS, "share": SHARES},
    "structures": ["current", "rings_snap", "rings", "distance", "flat"],
    "cells": {"dsnap": [round(float(x), 2) for x in DSNAP], "area": AIDX.tolist(), "region": REG.tolist()},
    "areas": [{"name": ALABEL[i], "muni": k[0], "riders": round(float(c["N0"].sum(1)[AIDX == i].sum()))}
              for i, k in enumerate(akeys)],
    "solutions": solutions,
    "index": index,
}
fn = os.path.join(OUT, "farezones.json")
with open(fn, "w") as f:
    json.dump(out, f, separators=(",", ":"), ensure_ascii=False)
print(f"wrote {fn}: {os.path.getsize(fn)/1024:.0f} KB, {len(solutions)} solutions, {NA} areas [{time.time()-t0:.0f}s]")
