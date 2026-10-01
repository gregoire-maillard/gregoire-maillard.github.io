#!/usr/bin/env python3
"""Step 6: write the small JSON files the page loads (assets/data/mtl/bikenetwork/).

  design.json      candidates used by any solution (geometry), solutions per variant/method/budget,
                   greedy curves, MIP statistics, penalties and assumptions, back-test, counter check
  flows.json       modelled BIXI flows on today's network (busiest links only), for the map
"""
import json, os, pickle, sys, time
from collections import defaultdict
import numpy as np
import shapely
from shapely.geometry import LineString

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import WORK, OUT, to_ll, dump, PRIOR_PENALTIES, CONTRAFLOW, WALK

with open(os.path.join(WORK, "graph.pkl"), "rb") as f:
    G = pickle.load(f)
with open(os.path.join(WORK, "design.pkl"), "rb") as f:
    D = pickle.load(f)
with open(os.path.join(WORK, "base_flows.pkl"), "rb") as f:
    BF = pickle.load(f)
with open(os.path.join(WORK, "penalties.json")) as f:
    CAL = json.load(f)
with open(os.path.join(WORK, "od.json")) as f:
    OD = json.load(f)["meta"]
m = len(G["u"])
SPEED = 15.0

def line_ll(edges, tol=3):
    g = shapely.line_merge(shapely.multilinestrings([LineString(G["geom"][e]) for e in edges]))
    g = g.simplify(tol)
    parts = g.geoms if g.geom_type == "MultiLineString" else [g]
    out = []
    for p in parts:
        xy = np.array(p.coords)
        ll = np.column_stack(to_ll(xy[:, 0], xy[:, 1]))
        out.append([[round(a, 5), round(b, 5)] for a, b in ll])
    return out

def cand_json(c):
    return {"n": c["name"], "km": round(c["km"], 3), "hw": c["hw"], "from": c["from"], "contra": c["contra"],
            "div": c["divided"], "g": line_ll(c["edges"])}

ev0 = D["ev0"]; cands = D["cands"]; gaps = D["gaps"]
def metrics(ev):
    return {"perceived_km": round(ev["perceived_km"]), "km": round(ev["km"]), "prot_share": round(ev["prot_share"], 4),
            "saved_pct": round(100 * (1 - ev["perceived_km"] / ev0["perceived_km"]), 2),
            "saved_hours": round((ev0["perceived_km"] - ev["perceived_km"]) / SPEED)}

used = set(); variants = {}
for (vk, method, B), val in D["sols"].items():
    if B not in (10, 25, 50, 100):
        continue
    ids, ev, projs = val[0], val[1], val[2]
    used.update(ids)
    idset = set(ids)
    done_gaps = [g for g in gaps if set(g["cands"]) <= idset] if "nobonus" not in vk else [g for g in gaps if set(g["cands"]) <= idset]
    gap_c = set(c for g in done_gaps for c in g["cands"])
    pj = []
    for p in sorted(projs, key=lambda p: -p["saved_pkm"]):
        pj.append({"name": p["name"], "km": p["km"], "trips": p["trips"], "from": p["from"], "hw": p["hw"],
                   "contra": p["contra"], "saved_pkm": p["saved_pkm"], "gap": any(c in gap_c for c in p["cands"]),
                   "ids": p["cands"]})
    sol = {"ids": ids, "km": round(sum(cands[i]["km"] for i in ids), 2), "metrics": metrics(ev), "projects": pj,
           "gaps_closed": len(done_gaps)}
    if method == "mip":
        sol["mip"] = val[3]
    variants.setdefault(vk, {}).setdefault(method, {})[str(B)] = sol

curves = {}
for vk, steps in D["seqs"].items():
    base_est = steps[0]["est_perceived_km"]
    pts = []
    for s in steps:
        pts.append([round(s["cum_km"], 2), round(100 * (1 - s["est_perceived_km"] / base_est), 3),
                    round(s["est_prot_km"] / s["est_km"], 4)])
    # thin to <= 1 point per 0.5 km
    thin, last = [], -1
    for p in pts:
        if p[0] - last >= 0.5 or p is pts[-1]:
            thin.append(p); last = p[0]
    curves[vk] = {"est": thin, "exact": [[b, round(100 * (1 - pk / ev0["perceived_km"]), 2), round(ps, 4)]
                                          for b, pk, ps in D["curve_exact"].get(vk, [])]}
    used.update(c for s in steps if s["cum_km"] <= 100.001 for c in s["cands"])
    if vk.startswith("cost"):
        pts_ = []
        for (k_, meth, B_), v in D["sols"].items():
            if k_ == vk and meth == "mip":
                pts_.append([B_, round(100 * (1 - v[1]["perceived_km"] / ev0["perceived_km"]), 2), round(v[1]["prot_share"], 4)])
        curves[vk]["mip"] = sorted(pts_)

bt = D["backtest"]
bt_out = None
if bt:
    c20 = bt["cands"]
    b0 = bt["base"]["perceived_km"]
    bt_out = {"new_city_segments": bt["new_city_segments"], "new_city_km": bt["new_city_km"], "budget_km": bt["budget_km"],
              "off_street_km": bt["off_street_km"], "overlap_km": bt["overlap_km"], "near_km": bt["near_km"],
              "actual": {"saved_pct": round(100 * (1 - bt["actual"]["perceived_km"] / b0), 2), "prot_share": round(bt["actual"]["prot_share"], 4)},
              "model": {"saved_pct": round(100 * (1 - bt["model"]["perceived_km"] / b0), 2), "prot_share": round(bt["model"]["prot_share"], 4)},
              "base": {"prot_share": round(bt["base"]["prot_share"], 4)},
              "actual_lines": [l for i in bt["actual_ids"] for l in line_ll(c20[i]["edges"])],
              "model_lines": [l for i in bt["model_ids"] for l in line_ll(c20[i]["edges"])],
              "actual_names": sorted(set(c20[i]["name"] for i in bt["actual_ids"])),
              "model_top": [], "both_names": sorted(set(c20[i]["name"] for i in set(bt["model_ids"]) & set(bt["actual_ids"])))}
    km_by = defaultdict(float)
    for i in bt["model_ids"]:
        km_by[c20[i]["name"]] += c20[i]["km"]
    bt_out["model_top"] = [[n, round(k, 2)] for n, k in sorted(km_by.items(), key=lambda kv: -kv[1])[:12]]
    ka = defaultdict(float)
    for i in bt["actual_ids"]:
        ka[c20[i]["name"]] += c20[i]["km"]
    bt_out["actual_top"] = [[n, round(k, 2)] for n, k in sorted(ka.items(), key=lambda kv: -kv[1])[:12]]

pen = D["pen"]
with open(os.path.join(os.path.dirname(WORK), "reseau_cyclable.geojson")) as f:
    _city = json.load(f)["features"]
_matched = set(c for c in G["city_id"] if c is not None)
city_cov = sum(ft["properties"]["LONGUEUR"] or 0 for ft in _city if ft["properties"]["ID_CYCL"] in _matched) / \
    sum(ft["properties"]["LONGUEUR"] or 0 for ft in _city)
design = {
    "meta": {"built": time.strftime("%Y-%m-%d"), "budgets": [10, 25, 50, 100], "speed_kmh": SPEED,
             "penalties": pen, "prior": PRIOR_PENALTIES, "contraflow": CONTRAFLOW, "walk": WALK,
             "calibration": {k: CAL[k] for k in ("overlap_fitted", "overlap_prior", "overlap_shortest_distance", "n_traces")},
             "beta": D["BETA"], "gap_max_m": 1200, "gap_cap_km": 5,
             "base": {"perceived_km": round(ev0["perceived_km"]), "km": round(ev0["km"]), "prot_share": round(ev0["prot_share"], 4),
                      "paint_share": round(ev0["paint_km"] / ev0["km"], 4)},
             "od": OD, "candidates_total": len(cands), "candidates_km": round(sum(c["km"] for c in cands), 1),
             "gap_groups": len(gaps), "graph_links": int(m),
             "city_km_matched_pct": round(100 * city_cov, 1)},
    "cands": {str(i): cand_json(cands[i]) for i in sorted(used)},
    "variants": variants, "curves": curves, "backtest": bt_out, "validation": D["validation"]}
sz = dump(design, os.path.join(OUT, "design.json"))
print(f"design.json {sz / 1024:.0f} KB, {len(used)} candidates")

# busiest links today
fl = BF["flows"]; fe = fl[:m] + fl[m:]
thr = 30000
sel = np.where(fe >= thr)[0]
bins = [30000, 60000, 120000, 250000]
lines = defaultdict(list)
for k in sel:
    b = int(np.searchsorted(bins, fe[k], side="right") - 1)
    lines[b].append(k)
out = {"meta": {"unit": "modelled BIXI trips per year on the link, both directions", "bins": bins},
       "lines": {str(b): line_ll(ks, tol=4) for b, ks in lines.items()}}
sz = dump(out, os.path.join(OUT, "flows.json"))
print(f"flows.json {sz / 1024:.0f} KB, {len(sel)} links >= {thr:,}")
