#!/usr/bin/env python3
"""Step 5: budgeted bike network design.

Given the street graph (build_network.py), BIXI OD demand (build_demand.py) and calibrated penalties
(calibrate.py), choose which street stretches to upgrade to protected lanes, total length <= B km.

  * Candidates: stretches of main streets (primary, secondary, tertiary, unclassified, or any street with a
    painted lane) between major intersections, not already protected. Divided boulevards count once.
  * Route choice: every OD pair rides its cheapest perceived path (all-or-nothing, no congestion).
  * Objective A ("cost"): minimise total perceived cost  sum_od f_od * min_path sum_e len_e * pen_e
  * Objective B ("protected"): maximise trip-km ridden on protected lanes, with riders still choosing
    their cheapest perceived route.
  * Connectivity bonus (ASSUMPTION): closing a gap of <= 1.2 km between two separate protected pieces earns
    BETA perceived km per year per km of the smaller piece joined (capped at 5 km).
  * Method 1, greedy: add the stretch with the best (gain + bonus) per km, using a pool of candidate paths
    per OD pair (column generation: new paths are added from full re-assignments on the networks the
    greedy builds, then the greedy is rerun).
  * Method 2, MIP (objective A only): exact over the path pool for the OD pairs carrying 85 % of trips,
    solved with HiGHS (strong linking constraints), warm-started from the greedy; leftover km filled greedily.
  * Every reported solution is re-evaluated by a full shortest-path assignment of all OD pairs.
  * Back-test: remove the protected lanes OpenStreetMap shows appearing after 2020-09-01, give the model
    the same number of km, and compare its picks with what the City built.

Outputs: assets/data/mtl/bikenetwork/design.json (+ flows.json, validation.json). ~30-60 min.
"""
import json, math, os, sys, time, pickle, csv
from collections import defaultdict, Counter
import numpy as np
import shapely
from shapely.geometry import LineString

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import RAW, WORK, OUT, to_xy, to_ll, load_penalties, dump, CONTRAFLOW
from net import Net

T0 = time.time()
def log(*a):
    print(f"[{time.time() - T0:7.1f}s]", *a, flush=True)

BUDGETS = [10, 25, 50, 100]
MIP_BUDGETS = [5, 10, 15, 25, 35, 50, 75, 100]      # extra points draw the exact model's curve
MIP_SHARE = 0.85                                     # OD pairs carrying this share of trips go into the MIP
BMAX = 105
GAP_MAX_M = 1200          # ASSUMPTION: longest gap the connectivity bonus looks at
GAP_CAP_KM = 5.0          # ASSUMPTION: joined length counted at most 5 km
SPEED = 15.0              # km/h, to express perceived km as perceived hours (ASSUMPTION)
MAIN = {"primary", "secondary", "tertiary", "unclassified", "primary_link", "secondary_link", "tertiary_link"}
MAJOR = {"primary", "secondary", "tertiary", "trunk", "primary_link", "secondary_link", "trunk_link"}
QUICK = "--quick" in sys.argv

net = Net(); G = net.G; m = net.m
pen = load_penalties()
log("penalties", pen, "| edges", m, "nodes", net.N)
L_e = G["length"]

# ------------------------------------------------------------------ demand
with open(os.path.join(WORK, "od.json")) as f:
    od = json.load(f)
nxy = np.column_stack(to_xy(G["node_ll"][:, 0], G["node_ll"][:, 1]))
# snap cells to nodes on streets a cyclist can start from (not trunks/steps)
okn = np.zeros(net.N, dtype=bool)
good_e = ~np.isin(G["hw"], ["trunk", "trunk_link", "steps"])
okn[G["u"][good_e]] = True; okn[G["v"][good_e]] = True
ntree = shapely.STRtree(shapely.points(nxy[okn])); okidx = np.where(okn)[0]
cell_ids = [c[0] for c in od["cells"]]
cxy = np.column_stack(to_xy(np.array([c[1] for c in od["cells"]]), np.array([c[2] for c in od["cells"]])))
cell_node = okidx[ntree.query_nearest(shapely.points(cxy))[1]]
cidx = {c: i for i, c in enumerate(cell_ids)}
PAIRS = [(cidx[a], cidx[b], f) for a, b, f, _ in od["pairs"]]
if QUICK:
    PAIRS = PAIRS[:3000]
F = np.array([p[2] for p in PAIRS])
log(f"OD pairs {len(PAIRS):,}, trips/yr {F.sum():,.0f}, cells {len(cell_ids)}")

# ------------------------------------------------------------------ evaluation
def evaluate(infra, keep_paths=False):
    ac = net.arc_cost(infra, pen)
    net.set_cost(ac)
    flows, paths = net.assign(cell_node, PAIRS, keep_paths=keep_paths)
    Larc = np.r_[L_e, L_e]
    infa = np.r_[infra, infra]
    res = {"perceived_km": float((flows * ac).sum() / 1000), "km": float((flows * Larc).sum() / 1000),
           "prot_km": float((flows * Larc * (infa == "P")).sum() / 1000),
           "paint_km": float((flows * Larc * (infa == "B")).sum() / 1000)}
    res["prot_share"] = res["prot_km"] / res["km"]
    return res, flows, paths, ac

base_infra = G["infra"].copy()

# ------------------------------------------------------------------ candidates
def build_candidates(infra):
    hw = G["hw"]; name = G["name"]
    elig = (infra != "P") & (name != "") & (np.isin(hw, list(MAIN)) | (infra == "B"))
    elig &= ~np.isin(hw, ["trunk", "trunk_link", "steps"])
    inc = defaultdict(list)                     # node -> eligible edges
    for k in np.where(elig)[0]:
        inc[G["u"][k]].append(k); inc[G["v"][k]].append(k)
    touch_P = np.zeros(net.N, dtype=bool)
    pe = infra == "P"; touch_P[G["u"][pe]] = True; touch_P[G["v"][pe]] = True
    major_names = defaultdict(set)
    for k in np.where(np.isin(hw, list(MAJOR)))[0]:
        major_names[G["u"][k]].add(name[k]); major_names[G["v"][k]].add(name[k])
    def is_break(node, k):
        same = [e for e in inc[node] if name[e] == name[k]]
        if len(same) != 2:
            return True
        if touch_P[node]:
            return True
        if major_names[node] - {name[k]}:
            return True
        a, b = same
        return infra[a] != infra[b]
    seen = np.zeros(m, dtype=bool); chains = []
    for k0 in np.where(elig)[0]:
        if seen[k0]:
            continue
        seen[k0] = True; chain = [k0]
        for end in (G["v"][k0], G["u"][k0]):
            node, k = end, k0
            seq = []
            while not is_break(node, k):
                nxt = [e for e in inc[node] if name[e] == name[k] and e != k]
                e = nxt[0]
                if seen[e]:
                    break
                seen[e] = True; seq.append(e)
                node = G["v"][e] if G["u"][e] == node else G["u"][e]; k = e
            chain = (seq[::-1] + chain) if end == G["u"][k0] else (chain + seq)
        chains.append(chain)
    # split chains longer than 1.2 km
    out = []
    for ch in chains:
        Ls = L_e[ch]
        if Ls.sum() <= 1200:
            out.append(ch); continue
        npieces = int(math.ceil(Ls.sum() / 1000)); target = Ls.sum() / npieces
        cur, acc = [], 0
        for e in ch:
            cur.append(e); acc += L_e[e]
            if acc >= target and len(out) >= 0:
                out.append(cur); cur, acc = [], 0
        if cur:
            out.append(cur)
    chains = out
    # merge the two carriageways of divided streets (same name, one-way, opposite directions, < 50 m apart)
    geo = [shapely.line_merge(shapely.multilinestrings([LineString(G["geom"][e]) for e in ch])) for ch in chains]
    oneway = [bool(np.all(G["ow"][ch] != 0)) for ch in chains]
    byname = defaultdict(list)
    for i, ch in enumerate(chains):
        if oneway[i]:
            byname[G["name"][ch[0]]].append(i)
    partner = {}
    for nm, ids in byname.items():
        if len(ids) < 2:
            continue
        cents = np.array([shapely.get_coordinates(shapely.centroid(geo[i]))[0] for i in ids])
        for a_i, a in enumerate(ids):
            if a in partner:
                continue
            d = np.hypot(*(cents - cents[a_i]).T)
            for b_i in np.argsort(d):
                b = ids[b_i]
                if b == a or b in partner or d[b_i] > 120:
                    continue
                if shapely.hausdorff_distance(geo[a], geo[b]) < 60:
                    partner[a] = b; partner[b] = a
                    break
    cands, used = [], set()
    for i, ch in enumerate(chains):
        if i in used:
            continue
        edges = list(ch); km = L_e[ch].sum() / 1000; pair = False
        if i in partner:
            j = partner[i]; used.add(j); edges += chains[j]
            km = 0.5 * (L_e[ch].sum() + L_e[chains[j]].sum()) / 1000; pair = True
        used.add(i)
        cands.append({"edges": np.array(edges), "km": km, "name": G["name"][ch[0]], "divided": pair})
    for c in cands:
        e = c["edges"]
        c["hw"] = Counter(G["hw"][e]).most_common(1)[0][0]
        c["from"] = "B" if (infra[e] == "B").mean() >= 0.5 else "N"
        c["contra"] = bool(np.any(G["ow"][e] != 0)) and not c["divided"]
        c["nodes"] = np.unique(np.r_[G["u"][e], G["v"][e]])
    return cands

def p_components(infra):
    """Connected pieces of the protected network: label per node (-1 = not on it) and km per piece."""
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    pe = np.where(infra == "P")[0]
    A = coo_matrix((np.ones(len(pe)), (G["u"][pe], G["v"][pe])), shape=(net.N, net.N))
    _, lab = connected_components(A, directed=False)
    onP = np.zeros(net.N, dtype=bool); onP[G["u"][pe]] = True; onP[G["v"][pe]] = True
    lab = np.where(onP, lab, -1)
    km = defaultdict(float)
    for k in pe:
        km[lab[G["u"][k]]] += L_e[k] / 1000
    return lab, km

def find_gaps(cands, infra):
    """Groups of 1-3 adjacent candidates (<= GAP_MAX_M) that join two separate protected pieces."""
    lab, kmc = p_components(infra)
    touches = []
    node_c = defaultdict(list)
    for i, c in enumerate(cands):
        t = set(int(x) for x in lab[c["nodes"]] if x >= 0 and kmc[x] >= 0.3)
        touches.append(t)
        for n_ in c["nodes"]:
            node_c[n_].append(i)
    adj = defaultdict(set)
    for n_, cs in node_c.items():
        for a in cs:
            for b in cs:
                if a != b:
                    adj[a].add(b)
    best = {}
    for s in range(len(cands)):
        if not touches[s]:
            continue
        stack = [(s, (s,), cands[s]["km"])]
        while stack:
            cur, path, km = stack.pop()
            for A in touches[s]:
                for B in touches[cur]:
                    if A != B:
                        key = (min(A, B), max(A, B))
                        if key not in best or km < best[key][1]:
                            best[key] = (path, km)
            if len(path) >= 3:
                continue
            for nb in adj[cur]:
                if nb not in path and km + cands[nb]["km"] <= GAP_MAX_M / 1000:
                    stack.append((nb, path + (nb,), km + cands[nb]["km"]))
    gaps = []
    seen = set()
    for (A, B), (path, km) in best.items():
        key = tuple(sorted(path))
        val = min(kmc[A], kmc[B], GAP_CAP_KM)
        if key in seen:
            for g in gaps:
                if g["cands"] == key:
                    g["value_km"] = max(g["value_km"], val)
            continue
        seen.add(key)
        gaps.append({"cands": key, "km": km, "value_km": val, "pieces": (A, B)})
    return gaps, lab, kmc

# ------------------------------------------------------------------ path pool
class Pool:
    """Candidate paths per OD pair, with their cost under the base network and per-candidate savings."""
    def __init__(self, cands, infra):
        self.cands = cands
        self.infra = infra
        self.edge_cand = -np.ones(m, dtype=np.int64)
        for i, c in enumerate(cands):
            self.edge_cand[c["edges"]] = i
        self.base_ac = net.arc_cost(infra, pen)
        up = infra.copy(); up[self.edge_cand >= 0] = "P"
        self.up_ac = net.arc_cost(up, pen)
        self.Larc = np.r_[L_e, L_e]
        self.isP = np.r_[infra, infra] == "P"
        self.keys = [set() for _ in PAIRS]
        self.p_pair, self.p_cost, self.p_prot, self.p_km = [], [], [], []
        self.e_p, self.e_c, self.e_s, self.e_l = [], [], [], []

    def add(self, paths):
        new = 0
        for k, arcs in enumerate(paths):
            if arcs is None:
                continue
            key = hash(arcs.tobytes())
            if key in self.keys[k]:
                continue
            self.keys[k].add(key)
            pid = len(self.p_pair)
            self.p_pair.append(k)
            self.p_cost.append(self.base_ac[arcs].sum())
            self.p_prot.append((self.Larc[arcs] * self.isP[arcs]).sum())
            self.p_km.append(self.Larc[arcs].sum())
            cc = self.edge_cand[net.edge_of_arc[arcs]]
            on = cc >= 0
            if on.any():
                sav = self.base_ac[arcs][on] - self.up_ac[arcs][on]
                ln = self.Larc[arcs][on]
                uc, inv = np.unique(cc[on], return_inverse=True)
                self.e_p.extend([pid] * len(uc)); self.e_c.extend(uc.tolist())
                self.e_s.extend(np.bincount(inv, sav).tolist()); self.e_l.extend(np.bincount(inv, ln).tolist())
            new += 1
        return new

    def freeze(self):
        self.P_pair = np.array(self.p_pair); self.P_cost = np.array(self.p_cost)
        self.P_prot = np.array(self.p_prot); self.P_km = np.array(self.p_km)
        self.E_p = np.array(self.e_p, dtype=np.int64); self.E_c = np.array(self.e_c, dtype=np.int64)
        self.E_s = np.array(self.e_s); self.E_l = np.array(self.e_l)
        o = np.lexsort((self.E_p, self.E_c)); self.E_p, self.E_c, self.E_s, self.E_l = self.E_p[o], self.E_c[o], self.E_s[o], self.E_l[o]
        log(f"pool: {len(self.P_pair):,} paths for {len(PAIRS):,} pairs, {len(self.E_p):,} path-candidate entries")

def run_assign_paths(infra):
    _, _, paths, _ = evaluate(infra, keep_paths=True)
    return paths

# ------------------------------------------------------------------ greedy over the pool
def _ranges(starts, Ks):
    """Concatenated index ranges [starts[k], starts[k+1]) for k in Ks, with the segment number of each index."""
    lens = starts[Ks + 1] - starts[Ks]
    tot = int(lens.sum())
    seg = np.repeat(np.arange(len(Ks)), lens)
    off = np.arange(tot) - np.repeat(np.cumsum(lens) - lens, lens)
    return np.repeat(starts[Ks], lens) + off, seg

def greedy(pool, gaps, objective, beta, bmax=BMAX, start=None):
    """Add the stretch (or whole gap group) with the best gain + bonus per km until the budget is spent.
    Gains are kept per (OD pair, stretch) and only recomputed for the OD pairs a pick touches."""
    nc = len(pool.cands); kmc = np.array([c["km"] for c in pool.cands]); npairs = len(PAIRS)
    E_p, E_c, E_s, E_l = pool.E_p, pool.E_c, pool.E_s, pool.E_l
    cost = pool.P_cost.copy(); prot = pool.P_prot.copy(); kmp = pool.P_km
    chosen = np.zeros(nc, dtype=bool)
    # static index structures
    kk_e = pool.P_pair[E_p]
    ordk = np.lexsort((E_c, kk_e))                       # entries by (pair, candidate)
    kk_o, cc_o = kk_e[ordk], E_c[ordk]
    gfirst = np.r_[True, (kk_o[1:] != kk_o[:-1]) | (cc_o[1:] != cc_o[:-1])]
    gid_o = np.cumsum(gfirst) - 1                        # group of each ordered entry
    g_pair, g_c = kk_o[gfirst], cc_o[gfirst]
    ng = len(g_pair)
    ep_start = np.searchsorted(kk_o, np.arange(npairs + 1))
    pord = np.argsort(pool.P_pair, kind="stable")
    pp_start = np.searchsorted(pool.P_pair[pord], np.arange(npairs + 1))
    c_start = np.searchsorted(E_c, np.arange(nc + 1))    # entries sorted by candidate
    cur_cost = np.zeros(npairs); cur_prot = np.zeros(npairs); cur_km = np.zeros(npairs)

    def refresh_pairs(Ks):
        idx, seg = _ranges(pp_start, Ks)
        paths = pord[idx]
        o = np.lexsort((cost[paths], seg))
        first = np.r_[True, seg[o][1:] != seg[o][:-1]]
        best = paths[o][first]; ks = Ks[seg[o][first]]
        cur_cost[ks] = cost[best]; cur_prot[ks] = prot[best]; cur_km[ks] = kmp[best]

    contrib = np.zeros(ng)
    def contributions(Ks):
        pos, _ = _ranges(ep_start, Ks)
        e = ordk[pos]; g = gid_o[pos]
        val = cost[E_p[e]] - E_s[e]
        o = np.lexsort((val, g))
        first = np.r_[True, g[o][1:] != g[o][:-1]]
        gg = g[o][first]; vmin = val[o][first]; eb = e[o][first]
        k = g_pair[gg]
        if objective == "cost":
            c = np.maximum(0.0, cur_cost[k] - vmin) * F[k]
        else:
            better = vmin < cur_cost[k] - 1e-6
            c = np.where(better, (prot[E_p[eb]] + E_l[eb] - cur_prot[k]) * F[k], 0.0)
        c[chosen[g_c[gg]]] = 0.0
        return gg, c

    allK = np.arange(npairs)
    refresh_pairs(allK)
    gg, c0 = contributions(allK); contrib[gg] = c0
    gain = np.bincount(g_c, contrib, minlength=nc)
    gap_val = np.array([beta * g["value_km"] for g in gaps]); gap_done = np.zeros(len(gaps), dtype=bool)
    gap_members = [np.array(g["cands"]) for g in gaps]
    steps = [{"cands": [], "gap": -1, "km": 0.0, "cum_km": 0.0, "est_perceived_km": float((F * cur_cost).sum()) / 1000,
              "est_prot_km": float((F * cur_prot).sum()) / 1000, "est_km": float((F * cur_km).sum()) / 1000}]
    cum = 0.0
    if start:                                            # fixed first picks (used to fill a MIP solution up to the budget)
        st = np.array(sorted(set(start)), dtype=np.int64)
        for c in st:
            chosen[c] = True
            ent = slice(c_start[c], c_start[c + 1])
            cost[E_p[ent]] -= E_s[ent]; prot[E_p[ent]] += E_l[ent]
        refresh_pairs(allK)
        gg, c0 = contributions(allK); contrib[:] = 0; contrib[gg] = c0
        gain = np.bincount(g_c, contrib, minlength=nc)
        for gi, mem in enumerate(gap_members):
            if chosen[mem].all():
                gap_done[gi] = True
        cum = float(kmc[st].sum())
        steps.append({"cands": [int(c) for c in st], "gap": -1, "km": cum, "cum_km": cum,
                      "est_perceived_km": float((F * cur_cost).sum()) / 1000,
                      "est_prot_km": float((F * cur_prot).sum()) / 1000, "est_km": float((F * cur_km).sum()) / 1000})
    while cum < bmax:
        score = np.where(chosen | (kmc > bmax - cum + 1e-9), -np.inf, gain / np.maximum(kmc, 0.02))
        best_single = int(np.argmax(score)); best_val = score[best_single]
        best_gap = -1
        for gi, mem in enumerate(gap_members):          # gap group: first-order gain of its members + bonus
            if gap_done[gi]:
                continue
            rem = mem[~chosen[mem]]
            km_rem = kmc[rem].sum()
            if len(rem) == 0 or km_rem > bmax - cum + 1e-9:
                continue
            sc_ = (gain[rem].sum() + gap_val[gi]) / max(km_rem, 0.02)
            if sc_ > best_val:
                best_val, best_gap = sc_, gi
        if not np.isfinite(best_val) or best_val <= 0:
            break
        picks = gap_members[best_gap][~chosen[gap_members[best_gap]]] if best_gap >= 0 else np.array([best_single])
        touched = []
        for c in picks:
            chosen[c] = True
            ent = slice(c_start[c], c_start[c + 1])
            cost[E_p[ent]] -= E_s[ent]; prot[E_p[ent]] += E_l[ent]
            touched.append(pool.P_pair[E_p[ent]])
        for gi, mem in enumerate(gap_members):
            if not gap_done[gi] and chosen[mem].all():
                gap_done[gi] = True
        Ks = np.unique(np.concatenate(touched)) if touched else np.array([], dtype=np.int64)
        if len(Ks):
            refresh_pairs(Ks)
            gg, cn = contributions(Ks)
            gain -= np.bincount(g_c[gg], contrib[gg], minlength=nc)
            contrib[gg] = cn
            gain += np.bincount(g_c[gg], cn, minlength=nc)
        gain[picks] = 0.0
        add = float(kmc[picks].sum()); cum += add
        steps.append({"cands": [int(c) for c in picks], "gap": int(best_gap), "km": add, "cum_km": cum,
                      "est_perceived_km": float((F * cur_cost).sum()) / 1000,
                      "est_prot_km": float((F * cur_prot).sum()) / 1000, "est_km": float((F * cur_km).sum()) / 1000})
    return steps, chosen

def chosen_upto(steps, B):
    out = []
    for s in steps:
        if s["cum_km"] > B + 1e-6:
            break
        out += s["cands"]
    return out

def infra_with(cands, ids, infra):
    x = infra.copy()
    for i in ids:
        x[cands[i]["edges"]] = "P"
    return x

# ------------------------------------------------------------------ MIP (objective A)
def solve_mip(pool, gaps, beta, B, warm, time_limit=600, share=MIP_SHARE):
    import highspy
    order = np.argsort(-F); cum = np.cumsum(F[order]) / F.sum()
    top = set(order[:np.searchsorted(cum, share) + 1].tolist())
    in_top = np.array([pool.P_pair[p] in top for p in range(len(pool.P_pair))])
    paths = np.where(in_top)[0]
    pidx = {p: i for i, p in enumerate(paths)}
    ent = np.where(in_top[pool.E_p])[0]
    cands_used = np.unique(pool.E_c[ent])
    cidx_ = {c: i for i, c in enumerate(cands_used)}
    gaps_used = [gi for gi, g in enumerate(gaps) if all(c in cidx_ for c in g["cands"])]
    nx, nz, nw, ny = len(cands_used), len(paths), len(ent), len(gaps_used)
    log(f"MIP B={B}: {len(top)} OD pairs ({share:.0%} of trips), {nz:,} paths, {nx:,} candidates, {nw:,} links, {ny} gap groups")
    h = highspy.Highs(); h.setOptionValue("output_flag", False)
    h.setOptionValue("time_limit", float(time_limit)); h.setOptionValue("mip_rel_gap", 0.002)
    inf = highspy.kHighsInf
    fz = F[pool.P_pair[paths]]
    scale = 1e-6
    # variable order: x (nx) | z (nz) | w (nw) | y (ny)
    kmc = np.array([pool.cands[c]["km"] for c in cands_used])
    costs = np.r_[np.zeros(nx), fz * pool.P_cost[paths] * scale, -F[pool.P_pair[pool.E_p[ent]]] * pool.E_s[ent] * scale,
                  -np.array([beta * gaps[g]["value_km"] for g in gaps_used]) * scale]
    nv = nx + nz + nw + ny
    h.addVars(nv, np.zeros(nv), np.ones(nv))
    h.changeColsCost(nv, np.arange(nv, dtype=np.int32), costs)
    h.changeColsIntegrality(nx, np.arange(nx, dtype=np.int32), np.array([highspy.HighsVarType.kInteger] * nx))
    rows_lo, rows_hi, starts, idx, vals = [], [], [], [], []
    def row(cols, coefs, lo, hi):
        starts.append(len(idx)); idx.extend(cols); vals.extend(coefs); rows_lo.append(lo); rows_hi.append(hi)
    # one path per pair
    byk = defaultdict(list)
    for i, p in enumerate(paths):
        byk[pool.P_pair[p]].append(nx + i)
    for k, cols in byk.items():
        row(cols, [1.0] * len(cols), 1.0, 1.0)
    # w_ps <= z_p, and the stronger aggregated form of w_ps <= x_s: one route per pair, so
    # sum over the pair's routes p of w_ps <= x_s for every (pair, stretch)
    byks = defaultdict(list)
    for j, e in enumerate(ent):
        wcol = nx + nz + j
        row([wcol, nx + pidx[pool.E_p[e]]], [1.0, -1.0], -inf, 0.0)
        byks[(pool.P_pair[pool.E_p[e]], pool.E_c[e])].append(wcol)
    for (k, c), cols in byks.items():
        row(cols + [cidx_[c]], [1.0] * len(cols) + [-1.0], -inf, 0.0)
    for j, g in enumerate(gaps_used):
        for c in gaps[g]["cands"]:
            row([nx + nz + nw + j, cidx_[c]], [1.0, -1.0], -inf, 0.0)
    row(list(range(nx)), kmc.tolist(), -inf, float(B))
    h.addRows(len(rows_lo), np.array(rows_lo), np.array(rows_hi), len(idx), np.array(starts, dtype=np.int32),
              np.array(idx, dtype=np.int32), np.array(vals))
    if warm is not None:
        # complete feasible start: x from the greedy, each pair on its cheapest pool route given x, w = z * x
        ws = np.zeros(len(pool.cands), dtype=bool); ws[list(warm)] = True
        xv = np.zeros(nv)
        for c, i in cidx_.items():
            xv[i] = 1.0 if ws[c] else 0.0
        pc = pool.P_cost[paths].copy()
        e_on = ws[pool.E_c[ent]]
        np.subtract.at(pc, np.array([pidx[p_] for p_ in pool.E_p[ent][e_on]], dtype=np.int64), pool.E_s[ent][e_on])
        kp = pool.P_pair[paths]
        o = np.lexsort((pc, kp)); first = np.r_[True, kp[o][1:] != kp[o][:-1]]
        zsel = np.zeros(nz); zsel[o[first]] = 1.0
        xv[nx:nx + nz] = zsel
        wv = zsel[[pidx[p_] for p_ in pool.E_p[ent]]] * e_on
        xv[nx + nz:nx + nz + nw] = wv
        for j, g in enumerate(gaps_used):
            xv[nx + nz + nw + j] = 1.0 if all(ws[c] for c in gaps[g]["cands"]) else 0.0
        sol = highspy.HighsSolution()
        sol.col_value = xv.tolist()
        st_ = h.setSolution(sol)
        log("  warm start from the greedy:", st_)
    t = time.time(); h.run()
    info = h.getInfo(); st = h.modelStatusToString(h.getModelStatus())
    xv = np.array(h.getSolution().col_value[:nx])
    pick = [int(c) for c, i in cidx_.items() if xv[i] > 0.5]
    gap = info.mip_gap
    log(f"  status {st}, {time.time() - t:.0f}s, gap {gap:.4f}, picked {len(pick)} candidates, {kmc[xv > 0.5].sum():.1f} km")
    return pick, {"status": st, "seconds": round(time.time() - t), "mip_gap": round(float(gap), 4),
                  "od_pairs": len(top), "trip_share": share, "paths": nz, "candidates": nx}

# ------------------------------------------------------------------ project summary for the page
def projects(cands, ids, flows, infra0, ac0, ac1):
    """Group selected stretches into street projects and say why each was picked."""
    idset = set(ids)
    node_c = defaultdict(list)
    for i in ids:
        for n_ in cands[i]["nodes"]:
            node_c[(n_, cands[i]["name"])].append(i)
    parent = {i: i for i in ids}
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for key, cs in node_c.items():
        for a in cs[1:]:
            parent[find(a)] = find(cs[0])
    groups = defaultdict(list)
    for i in ids:
        groups[find(i)].append(i)
    out = []
    fe = flows[:m] + flows[m:]
    for g in groups.values():
        e = np.concatenate([cands[i]["edges"] for i in g])
        km = sum(cands[i]["km"] for i in g)
        w = L_e[e]
        trips = float((fe[e] * w).sum() / w.sum())
        saved = float(((ac0[:m][e] - ac1[:m][e]) * flows[:m][e] + (ac0[m:][e] - ac1[m:][e]) * flows[m:][e]).sum() / 1000)
        out.append({"cands": g, "name": cands[g[0]]["name"], "km": round(km, 2), "trips": round(trips),
                    "from": Counter(cands[i]["from"] for i in g).most_common(1)[0][0],
                    "hw": Counter(cands[i]["hw"] for i in g).most_common(1)[0][0],
                    "contra": any(cands[i]["contra"] for i in g), "saved_pkm": round(saved)})
    return out


# ------------------------------------------------------------------ validation against bike counters
def validate(flows0):
    import pandas as pd
    loc = pd.read_csv(os.path.join(RAW, "localisations_globale.csv"), sep=";", encoding="utf-8-sig", dtype=str)
    nm = dict(zip(loc["instance"], loc["Nom Rue Global"]))
    tot = defaultdict(list); pos = {}
    for y in ("2024", "2025"):
        d = pd.read_csv(os.path.join(RAW, f"comptage_velo_{y}.csv"), dtype={"id_compteur": str})
        g = d.groupby("id_compteur").agg(tot=("nb_passages", "sum"), days=("date", "nunique"),
                                         lon=("longitude", "first"), lat=("latitude", "first"))
        for cid, r in g.iterrows():
            if r.days >= 300 and r.tot > 0:
                tot[cid].append(r.tot * 365 / r.days); pos[cid] = (r.lon, r.lat)
    edge_lines = np.array([LineString(g_) for g_ in G["geom"]], dtype=object)
    tree = shapely.STRtree(edge_lines)
    fe = flows0[:m] + flows0[m:]
    rows = []
    for cid, v in tot.items():
        x, y = to_xy(*pos[cid])
        p_ = shapely.Point(x, y)
        near = tree.query(p_, predicate="dwithin", distance=30)
        if len(near) == 0:
            continue
        d = shapely.distance(edge_lines[near], p_)
        bike = np.isin(G["infra"][near], ["P", "B"])
        pick = near[np.argmin(np.where(bike, d, d + 1000))]
        rows.append({"id": cid, "name": nm.get(cid, ""), "lon": pos[cid][0], "lat": pos[cid][1],
                     "counted": round(float(np.mean(v))), "bixi_model": round(float(fe[pick])),
                     "infra": str(G["infra"][pick]), "street": str(G["name"][pick])})
    a = np.array([r["counted"] for r in rows]); b = np.array([r["bixi_model"] for r in rows])
    from scipy.stats import spearmanr, pearsonr
    ok = (a > 0) & (b > 0)
    rho = spearmanr(a, b).statistic
    r_log = pearsonr(np.log(a[ok]), np.log(b[ok])).statistic
    share = np.median(b[ok] / a[ok])
    log(f"counters: {len(rows)} sites, Spearman {rho:.2f}, log-log r {r_log:.2f}, median BIXI/counted {share:.2%}")
    return {"sites": rows, "spearman": round(float(rho), 3), "pearson_log": round(float(r_log), 3),
            "median_bixi_share": round(float(share), 4), "n": len(rows)}

# ------------------------------------------------------------------ back-test against lanes built since 2020
def backtest(beta):
    with open(os.path.join(WORK, "lane_dates.json")) as f:
        dates = json.load(f)
    with open(os.path.join(WORK, "protected_buffers.geojson")) as f:
        blen = {ft["id"]: ft["properties"]["len"] for ft in json.load(f)["features"]}
    def seen(cid, day):
        v = dates.get(str(cid)); L = blen.get(str(cid))
        return None if v is None or L is None else v.get(day, 0) >= 0.5 * L
    new_ids = set()
    for cid, v in dates.items():
        if seen(cid, "2020-09-01") is False and seen(cid, "2025-09-01"):
            new_ids.add(cid)
    built = np.array([(str(c) in new_ids) and G["infra"][k] == "P" and G["infra_src"][k] == "city"
                      for k, c in enumerate(G["city_id"])])
    inf20 = base_infra.copy(); inf20[built] = "N"
    km_new_city = sum(blen[c] for c in new_ids) / 1000
    log(f"back-test: {len(new_ids)} City segments ({km_new_city:.0f} km) appear in OSM between 2020-09 and 2025-09; {built.sum()} graph edges downgraded")
    c20 = build_candidates(inf20)
    gaps20, _, _ = find_gaps(c20, inf20)
    builtset = set(np.where(built)[0].tolist())
    actual = [i for i, c in enumerate(c20) if np.mean([e in builtset for e in c["edges"]]) >= 0.5]
    B = sum(c20[i]["km"] for i in actual)
    off_street_km = float(G["length"][built & ~np.isin(G["hw"], list(MAIN) + ["residential"])].sum() / 1000)
    log(f"  built lanes on candidate streets: {len(actual)} stretches, {B:.1f} km; built off-street or on other ways: {off_street_km:.1f} km (graph)")
    pool = Pool(c20, inf20)
    pool.add(run_assign_paths(inf20)); pool.add(run_assign_paths(infra_with(c20, range(len(c20)), inf20)))
    pool.add(run_assign_paths(infra_with(c20, actual, inf20)))
    pool.freeze()
    steps, _ = greedy(pool, gaps20, "cost", beta, bmax=B)
    pool.add(run_assign_paths(infra_with(c20, chosen_upto(steps, B), inf20))); pool.freeze()
    steps, _ = greedy(pool, gaps20, "cost", beta, bmax=B)
    greedy_pick = chosen_upto(steps, B)
    ids, info = solve_mip(pool, gaps20, beta, B, greedy_pick, time_limit=60 if QUICK else 600)
    fill, _ = greedy(pool, gaps20, "cost", beta, bmax=B, start=ids)
    model = chosen_upto(fill, B)
    ev20, _, _, _ = evaluate(inf20)
    eva, _, _, _ = evaluate(infra_with(c20, actual, inf20))
    evm, _, _, _ = evaluate(infra_with(c20, model, inf20))
    ov = set(model) & set(actual)
    ov_km = sum(c20[i]["km"] for i in ov)
    # near misses: model stretches within 300 m of a built one (parallel street)
    gA = shapely.union_all([shapely.multilinestrings([LineString(G["geom"][e]) for e in c20[i]["edges"]]) for i in actual])
    near_km = sum(c20[i]["km"] for i in model if i not in ov and
                  shapely.distance(shapely.multilinestrings([LineString(G["geom"][e]) for e in c20[i]["edges"]]), gA) <= 300)
    res = {"new_city_segments": len(new_ids), "new_city_km": round(km_new_city, 1), "budget_km": round(B, 1),
           "off_street_km": round(off_street_km, 1),
           "base": ev20, "actual": eva, "model": evm, "overlap_km": round(ov_km, 1), "near_km": round(near_km, 1),
           "actual_ids": actual, "model_ids": model, "cands": c20, "mip": info}
    log(f"  2020 network: perceived {ev20['perceived_km']:,.0f}; actual lanes save {ev20['perceived_km'] - eva['perceived_km']:,.0f}, "
        f"model saves {ev20['perceived_km'] - evm['perceived_km']:,.0f}; overlap {ov_km:.1f} km, within 300 m {near_km:.1f} km")
    return res

# ================================================================== main
def main():
    ev0, flows0, _, ac0 = evaluate(base_infra)
    log(f"base: perceived {ev0['perceived_km']:,.0f} km/yr, ridden {ev0['km']:,.0f} km/yr, protected share {ev0['prot_share']:.3f}")
    with open(os.path.join(WORK, "base_flows.pkl"), "wb") as f:
        pickle.dump({"flows": flows0, "ac": ac0, "eval": ev0}, f)

    cands = build_candidates(base_infra)
    kms = np.array([c["km"] for c in cands])
    log(f"candidates: {len(cands):,}, {kms.sum():,.0f} km (median {np.median(kms) * 1000:.0f} m); divided pairs {sum(c['divided'] for c in cands)}")
    gaps, lab, kmc = find_gaps(cands, base_infra)
    log(f"gap groups: {len(gaps)}, protected pieces >= 0.3 km: {sum(1 for v in kmc.values() if v >= 0.3)}")

    POOLF = os.path.join(WORK, "pool.pkl")
    if "--reuse-pool" in sys.argv and os.path.exists(POOLF):
        with open(POOLF, "rb") as f:
            pool, BETA = pickle.load(f)
        pool.cands = cands
        log(f"reusing the route pool ({len(pool.P_pair):,} routes), BETA {BETA:,.0f}")
    else:
        pool, BETA = build_pool(cands, gaps, ev0)
        with open(POOLF, "wb") as f:
            pickle.dump((pool, BETA), f, protocol=4)
    variants = {("cost", True), ("cost", False), ("protected", True), ("protected", False)}
    if QUICK:
        variants = {("cost", True)}
    run_variants(cands, gaps, pool, BETA, variants, ev0, ac0, flows0)


def build_pool(cands, gaps, ev0):
    # path pool, round 1: base + all-upgraded networks
    pool = Pool(cands, base_infra)
    pool.add(run_assign_paths(base_infra))
    pool.add(run_assign_paths(infra_with(cands, range(len(cands)), base_infra)))
    rng = np.random.default_rng(1)
    for _ in range(2):
        pool.add(run_assign_paths(infra_with(cands, np.where(rng.random(len(cands)) < 0.25)[0], base_infra)))
    pool.freeze()

    # connectivity weight: BETA perceived km/yr per km joined, set relative to the typical first-order gain
    s0, _ = greedy(pool, [], "cost", 0.0, bmax=30)
    g_per_km = np.median([(s0[i - 1]["est_perceived_km"] - s0[i]["est_perceived_km"]) / s0[i]["km"] for i in range(1, len(s0))])
    BETA = float(round(0.25 * g_per_km, -2))      # ASSUMPTION: a joined km is worth 1/4 of a typical picked km
    log(f"median gain of the first 30 km: {g_per_km:,.0f} perceived km/yr per km -> BETA = {BETA:,.0f} per km joined")

    variants = {("cost", True), ("cost", False), ("protected", True), ("protected", False)}
    if QUICK:
        variants = {("cost", True)}
    # column generation: rerun greedy, add paths from its networks, repeat
    for rnd in range(2):
        added = 0
        for obj, bon in sorted(variants):
            steps, _ = greedy(pool, gaps if bon else [], obj, BETA * 1000)
            for B in (25, 60, BMAX):
                added += pool.add(run_assign_paths(infra_with(cands, chosen_upto(steps, B), base_infra)))
        pool.freeze()
        log(f"column generation round {rnd + 1}: +{added:,} paths")
    pool.keys = None; pool.p_pair = pool.p_cost = pool.p_prot = pool.p_km = None
    pool.e_p = pool.e_c = pool.e_s = pool.e_l = None
    return pool, BETA


def run_variants(cands, gaps, pool, BETA, variants, ev0, ac0, flows0):
    sols = {}; seqs = {}
    for obj, bon in sorted(variants):
        vk = f"{obj}|{'bonus' if bon else 'nobonus'}"
        steps, _ = greedy(pool, gaps if bon else [], obj, BETA * 1000)
        seqs[vk] = steps
        log(f"{vk}: greedy reached {steps[-1]['cum_km']:.1f} km in {len(steps)} steps")
        for B in BUDGETS:
            ids = chosen_upto(steps, B)
            inf1 = infra_with(cands, ids, base_infra)
            ev, fl, _, ac1 = evaluate(inf1)
            sols[(vk, "greedy", B)] = (ids, ev, projects(cands, ids, fl, base_infra, ac0, ac1))
            log(f"  greedy B={B}: {sum(cands[i]['km'] for i in ids):.1f} km, perceived saved {ev0['perceived_km'] - ev['perceived_km']:,.0f} km/yr ({1 - ev['perceived_km'] / ev0['perceived_km']:.2%}), protected share {ev['prot_share']:.3f}")
        if obj == "cost":
            for B in (MIP_BUDGETS if bon else BUDGETS):
                warm = chosen_upto(steps, B)
                ids, info = solve_mip(pool, gaps if bon else [], BETA * 1000, B, warm, time_limit=60 if QUICK else 600)
                fill, _ = greedy(pool, gaps if bon else [], "cost", BETA * 1000, bmax=B, start=ids)
                info["filled_km"] = round(sum(cands[i]["km"] for i in chosen_upto(fill, B)) - sum(cands[i]["km"] for i in ids), 2)
                ids = chosen_upto(fill, B)
                inf1 = infra_with(cands, ids, base_infra)
                ev, fl, _, ac1 = evaluate(inf1)
                sols[(vk, "mip", B)] = (ids, ev, projects(cands, ids, fl, base_infra, ac0, ac1), info)
                log(f"  MIP B={B}: perceived saved {ev0['perceived_km'] - ev['perceived_km']:,.0f} km/yr ({1 - ev['perceived_km'] / ev0['perceived_km']:.2%}), protected share {ev['prot_share']:.3f}")

    # exact curve checkpoints for the default variant
    curve_exact = {}
    for vk, steps in seqs.items():
        pts = []
        for B in (5, 15, 35, 75):
            ids = chosen_upto(steps, B)
            ev, _, _, _ = evaluate(infra_with(cands, ids, base_infra))
            pts.append([B, ev["perceived_km"], ev["prot_share"]])
        curve_exact[vk] = pts
        if QUICK:
            break

    val = validate(flows0)
    bt = None if QUICK else backtest(BETA * 1000)
    with open(os.path.join(WORK, "design.pkl"), "wb") as f:
        pickle.dump({"cands": cands, "gaps": gaps, "sols": sols, "seqs": seqs, "ev0": ev0, "BETA": BETA,
                     "curve_exact": curve_exact, "pen": pen, "validation": val, "backtest": bt}, f)
    log("wrote design.pkl")


if __name__ == "__main__":
    main()
