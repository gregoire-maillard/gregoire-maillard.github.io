#!/usr/bin/env python3
"""Step 1: street graph of the island from OpenStreetMap, with the City's bike network matched onto it.

Inputs  (scripts/mtl/raw/bikenetwork/): Montreal.osm.gz (BBBike extract of OpenStreetMap),
        reseau_cyclable.geojson (Ville de Montréal), ../boundaries/limites-administratives-agglomeration.geojson
Outputs (scripts/mtl/raw/bikenetwork/_work/): graph.pkl  (nodes, edges, geometry, infrastructure)
        assets/data/mtl/bikenetwork/network.json  (City network by class, simplified, for the page)

Run from the repo root:  python3 scripts/mtl/bikenetwork/build_network.py      (~3-5 min, mostly XML parsing)
"""
import gzip, json, math, os, pickle, sys, time
from array import array
from collections import Counter, defaultdict
import xml.etree.ElementTree as ET
import numpy as np
import shapely
from shapely.geometry import shape, LineString, Point
from shapely.ops import unary_union

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import RAW, WORK, OUT, BOUNDS, to_xy, to_ll, CITY_CLASS, street_class, dump

T0 = time.time()
def log(*a):
    print(f"[{time.time() - T0:6.1f}s]", *a, flush=True)

# ------------------------------------------------------------------ 1. island polygon
with open(BOUNDS) as f:
    bd = json.load(f)
island_ll = unary_union([shape(ft["geometry"]) for ft in bd["features"]])
def proj_geom(g):
    return shapely.transform(g, lambda c: np.column_stack(to_xy(c[:, 0], c[:, 1])))
island = proj_geom(island_ll).buffer(25)
shapely.prepare(island)
log("island area km2", round(island.area / 1e6, 1))

# ------------------------------------------------------------------ 1b. buffers around protected City lanes (for date_lanes.py)
def write_protected_buffers():
    with open(os.path.join(RAW, "reseau_cyclable.geojson")) as f:
        feats = json.load(f)["features"]
    out = []
    for ft in feats:
        p = ft["properties"]
        if CITY_CLASS[p["TYPE_VOIE_CODE"]] != "P":
            continue
        g = proj_geom(shape(ft["geometry"])).simplify(2)
        if g.length < 5:
            continue
        b = g.buffer(15, cap_style="flat").simplify(3)
        if b.is_empty:
            continue
        b = shapely.transform(b, lambda c: np.column_stack(to_ll(c[:, 0], c[:, 1])))
        gj = shapely.geometry.mapping(b)
        gj = json.loads(json.dumps(gj), parse_float=lambda s: round(float(s), 6))
        out.append({"type": "Feature", "id": str(p["ID_CYCL"]), "properties": {"len": round(g.length, 1)}, "geometry": gj})
    with open(os.path.join(WORK, "protected_buffers.geojson"), "w") as f:
        json.dump({"type": "FeatureCollection", "features": out}, f, separators=(",", ":"))
    log(f"wrote protected_buffers.geojson ({len(out)} protected City segments)")

write_protected_buffers()
if "--buffers-only" in sys.argv:
    sys.exit(0)

def parse_osm():
    global use
    # ------------------------------------------------------------------ 2. parse OSM (single pass)
    KEEP_HW = {"trunk", "trunk_link", "primary", "primary_link", "secondary", "secondary_link", "tertiary",
               "tertiary_link", "unclassified", "residential", "living_street", "cycleway", "pedestrian", "track",
               "service", "path", "footway", "bridleway", "steps"}
    BAD_SERVICE = {"parking_aisle", "driveway", "drive-through", "emergency_access"}
    BIKE_OK = {"yes", "designated", "permissive"}

    def keep_way(t):
        hw = t.get("highway")
        if hw not in KEEP_HW or t.get("area") == "yes":
            return False
        bic = t.get("bicycle")
        if bic in ("no", "use_sidepath"):
            return False
        if t.get("access") in ("private", "no") and bic not in BIKE_OK:
            return False
        if hw == "service" and t.get("service") in BAD_SERVICE:
            return False
        if hw in ("footway", "bridleway", "steps") and bic not in BIKE_OK and bic != "dismount":
            return False
        if hw == "path" and bic not in BIKE_OK and bic is not None and bic != "dismount":
            return False
        if t.get("indoor") == "yes":
            return False
        return True

    TAGS_KEPT = ("highway", "name", "oneway", "oneway:bicycle", "junction", "bicycle", "cycleway", "cycleway:left",
                 "cycleway:right", "cycleway:both", "cycleway:left:oneway", "cycleway:right:oneway", "service",
                 "surface", "bridge", "tunnel", "segregated")
    nid = array("q"); nlat = array("d"); nlon = array("d")
    ways = []                                    # (osm_id, [node ids], tags)
    src = os.path.join(RAW, "Montreal.osm.gz")
    BB = (-73.99, 45.39, -73.46, 45.72)        # island bounding box (+ margin); other nodes are not stored
    with gzip.open(src, "rb") as fh:
        cur = None; root = None; nseen = 0
        for ev, el in ET.iterparse(fh, events=("start", "end")):
            tag = el.tag
            if ev == "start":
                if root is None:
                    root = el
                elif tag == "way":
                    cur = ([], {})
                continue
            if tag == "node":
                la, lo = float(el.get("lat")), float(el.get("lon"))
                if BB[0] <= lo <= BB[2] and BB[1] <= la <= BB[3]:
                    nid.append(int(el.get("id"))); nlat.append(la); nlon.append(lo)
                nseen += 1
                if nseen % 200_000 == 0:
                    root.clear()
            elif tag == "nd" and cur is not None:
                cur[0].append(int(el.get("ref")))
            elif tag == "tag" and cur is not None:
                cur[1][el.get("k")] = el.get("v")
            elif tag == "way":
                nds, t = cur
                if keep_way(t):
                    ways.append((int(el.get("id")), nds, {k: t[k] for k in TAGS_KEPT if k in t}))
                cur = None
                nseen += 1
                if nseen % 200_000 == 0:
                    root.clear()
            elif tag == "relation":
                el.clear()
                break                                # relations come last; not needed
    log(f"OSM nodes {len(nid):,}, kept ways {len(ways):,}")
    nid = np.frombuffer(nid, dtype=np.int64); order = np.argsort(nid)
    nid = nid[order]; nlat = np.frombuffer(nlat)[order]; nlon = np.frombuffer(nlon)[order]

    def coords_of(ids):
        i = np.searchsorted(nid, ids)
        ok = (i < len(nid)) & (nid[np.minimum(i, len(nid) - 1)] == ids)
        return i, ok

    # ------------------------------------------------------------------ 3. split ways into edges at shared nodes
    use = Counter()
    for _, nds, _ in ways:
        use.update(set(nds))
        use[nds[0]] += 1; use[nds[-1]] += 1

    def oneway_dir(t):
        """+1 forward only, -1 backward only, 0 both directions allowed for bikes."""
        ow = t.get("oneway")
        d = 1 if ow in ("yes", "true", "1") else -1 if ow == "-1" else 0
        if t.get("junction") in ("roundabout", "circular") and ow != "no":
            d = 1
        if d == 0:
            return 0
        if t.get("oneway:bicycle") == "no":
            return 0
        for k in ("cycleway", "cycleway:left", "cycleway:right", "cycleway:both"):
            if str(t.get(k, "")).startswith("opposite"):
                return 0
        for k in ("cycleway:left:oneway", "cycleway:right:oneway"):
            if t.get(k) in ("no", "-1"):
                return 0
        return d

    def osm_infra(t):
        """Bike facility from OSM tags only (fallback when the City layer has nothing)."""
        hw = t.get("highway")
        if hw == "cycleway":
            return "P"
        if hw in ("path", "footway", "pedestrian", "bridleway") and t.get("bicycle") == "designated":
            return "P"
        vals = [t.get(k, "") for k in ("cycleway", "cycleway:left", "cycleway:right", "cycleway:both")]
        if any(v in ("track", "separate") for v in vals):
            return "P"
        if any(v in ("lane", "share_busway", "opposite_lane", "opposite_track") for v in vals):
            return "B"
        return "N"

    node_index = {}
    node_ll = []
    def node_of(osm_node, lon, lat):
        k = node_index.get(osm_node)
        if k is None:
            k = node_index[osm_node] = len(node_ll)
            node_ll.append((lon, lat))
        return k

    E_u, E_v, E_len, E_geom, E_hw, E_name, E_ow, E_osm, E_osminfra, E_way, E_walk = [], [], [], [], [], [], [], [], [], [], []
    dropped_out = 0
    for wid, nds, t in ways:
        ids = np.array(nds, dtype=np.int64)
        ix, ok = coords_of(ids)
        if not ok.all():
            keep = ok
            ids, ix = ids[keep], ix[keep]
            if len(ids) < 2:
                continue
        lon, lat = nlon[ix], nlat[ix]
        x, y = to_xy(lon, lat)
        inside = shapely.contains_xy(island, x, y)
        hw = t.get("highway"); ow = oneway_dir(t); oi = osm_infra(t); nm = t.get("name", "")
        walk = hw == "steps" or t.get("bicycle") == "dismount"
        start = 0
        for j in range(1, len(ids)):
            if use[int(ids[j])] >= 2 or j == len(ids) - 1:
                seg = slice(start, j + 1)
                if inside[seg].all():
                    xs, ys = x[seg], y[seg]
                    L = float(np.hypot(np.diff(xs), np.diff(ys)).sum())
                    if L > 0.5:
                        u = node_of(int(ids[start]), float(lon[start]), float(lat[start]))
                        v = node_of(int(ids[j]), float(lon[j]), float(lat[j]))
                        if u != v:
                            E_u.append(u); E_v.append(v); E_len.append(L)
                            E_geom.append(np.column_stack([xs, ys]).astype(np.float32))
                            E_hw.append(hw); E_name.append(nm); E_ow.append(ow); E_osminfra.append(oi); E_way.append(wid); E_walk.append(walk)
                else:
                    dropped_out += 1
                start = j
    log(f"edges {len(E_u):,} (dropped {dropped_out:,} outside the island), nodes {len(node_ll):,}")

    # keep the largest connected component (undirected)
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    n = len(node_ll)
    A = coo_matrix((np.ones(len(E_u)), (E_u, E_v)), shape=(n, n))
    ncomp, lab = connected_components(A, directed=False)
    big = np.bincount(lab).argmax()
    keep_e = np.array([lab[u] == big for u in E_u])
    log(f"components {ncomp}, largest has {np.sum(lab == big):,} nodes; keeping {keep_e.sum():,} edges")
    drop_km = Counter()
    for k in np.where(~keep_e)[0]:
        drop_km[E_hw[k]] += E_len[k] / 1000
    log("km left out (not connected to the main network):", {h: round(v, 1) for h, v in drop_km.most_common(8)})
    remap = -np.ones(n, dtype=np.int64); remap[lab == big] = np.arange(np.sum(lab == big))
    node_ll = np.array(node_ll)[lab == big]
    sel = np.where(keep_e)[0]
    E = dict(u=remap[np.array(E_u)[sel]], v=remap[np.array(E_v)[sel]], length=np.array(E_len)[sel],
             hw=[E_hw[i] for i in sel], name=[E_name[i] for i in sel], ow=np.array(E_ow)[sel],
             osminfra=[E_osminfra[i] for i in sel], way=np.array(E_way)[sel], walk=np.array(E_walk)[sel])
    geom = [E_geom[i] for i in sel]
    m = len(sel)
    return node_ll, E, geom

CACHE = os.path.join(WORK, "osm_edges.pkl")
if os.path.exists(CACHE) and "--reparse" not in sys.argv:
    with open(CACHE, "rb") as f:
        node_ll, E, geom = pickle.load(f)
    log(f"loaded cached OSM edges ({len(geom):,}); pass --reparse to rebuild from Montreal.osm.gz")
else:
    node_ll, E, geom = parse_osm()
    with open(CACHE, "wb") as f:
        pickle.dump((node_ll, E, geom), f, protocol=4)
m = len(geom)

# ------------------------------------------------------------------ 4. City bike network
with open(os.path.join(RAW, "reseau_cyclable.geojson")) as f:
    city = json.load(f)["features"]
CONTRA = {"30", "31", "33", "41", "43", "83", "84"}      # TYPE_VOIE2 codes with a contraflow facility
c_lines, c_cls, c_props = [], [], []
for ft in city:
    g = ft["geometry"]
    parts = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
    p = ft["properties"]
    for part in parts:
        a = np.array(part)
        xy = np.column_stack(to_xy(a[:, 0], a[:, 1]))
        c_lines.append(LineString(xy)); c_cls.append(CITY_CLASS[p["TYPE_VOIE_CODE"]]); c_props.append(p)
c_lines = np.array(c_lines, dtype=object)
tree = shapely.STRtree(c_lines)
log(f"City segments {len(c_lines):,}")

# sample points along every OSM edge, every <= 12 m, skipping the first/last 4 m (intersections)
S_edge, S_x, S_y, S_bx, S_by = [], [], [], [], []
for k, g in enumerate(geom):
    ls = LineString(g); L = ls.length
    if L < 10:
        ds = np.array([L / 2])
    else:
        nseg = max(2, int(math.ceil((L - 8) / 12)) + 1)
        ds = np.linspace(4, L - 4, nseg)
    pts = shapely.line_interpolate_point(ls, ds)
    a = shapely.line_interpolate_point(ls, np.maximum(ds - 3, 0)); b = shapely.line_interpolate_point(ls, np.minimum(ds + 3, L))
    ax, ay = shapely.get_x(a), shapely.get_y(a); bx, by = shapely.get_x(b), shapely.get_y(b)
    S_edge.append(np.full(len(ds), k)); S_x.append(shapely.get_x(pts)); S_y.append(shapely.get_y(pts))
    S_bx.append(bx - ax); S_by.append(by - ay)
S_edge = np.concatenate(S_edge); S_x = np.concatenate(S_x); S_y = np.concatenate(S_y)
S_bx = np.concatenate(S_bx); S_by = np.concatenate(S_by)
S_pts = shapely.points(S_x, S_y)
log(f"samples {len(S_pts):,}")

def match(points, bdx, bdy, lines, line_tree, maxd, maxang):
    """For each sample point, the index of the best aligned line within maxd metres (or -1)."""
    pi, li = line_tree.query(points, predicate="dwithin", distance=maxd)
    if len(pi) == 0:
        return -np.ones(len(points), dtype=np.int64), np.full(len(points), np.inf)
    L = lines[li]
    s = shapely.line_locate_point(L, points[pi])
    ln = shapely.length(L)
    a = shapely.line_interpolate_point(L, np.maximum(s - 3, 0)); b = shapely.line_interpolate_point(L, np.minimum(s + 3, ln))
    lx, ly = shapely.get_x(b) - shapely.get_x(a), shapely.get_y(b) - shapely.get_y(a)
    ex, ey = bdx[pi], bdy[pi]
    cosang = np.abs(lx * ex + ly * ey) / (np.hypot(lx, ly) * np.hypot(ex, ey) + 1e-9)
    d = shapely.distance(points[pi], L)
    ok = cosang >= math.cos(math.radians(maxang))
    score = np.where(ok, d, np.inf)
    best = -np.ones(len(points), dtype=np.int64); bestd = np.full(len(points), np.inf)
    o = np.lexsort((score, pi))
    pi_o, li_o, sc_o = pi[o], li[o], score[o]
    first = np.r_[True, pi_o[1:] != pi_o[:-1]]
    f_pi, f_li, f_sc = pi_o[first], li_o[first], sc_o[first]
    good = np.isfinite(f_sc)
    best[f_pi[good]] = f_li[good]; bestd[f_pi[good]] = f_sc[good]
    return best, bestd

best, bestd = match(S_pts, S_bx, S_by, c_lines, tree, 12.0, 30.0)
log(f"samples matched to a City segment: {np.mean(best >= 0):.1%}")

city_infra = ["N"] * m; city_id = [None] * m; contra = np.zeros(m, dtype=bool); four = np.zeros(m, dtype=bool)
rev = [None] * m; city_type = [None] * m
order = np.argsort(S_edge, kind="stable")
bounds = np.searchsorted(S_edge[order], np.arange(m + 1))
for k in range(m):
    idx = order[bounds[k]:bounds[k + 1]]
    b = best[idx]
    if len(b) == 0:
        continue
    hit = b[b >= 0]
    if len(hit) < 0.5 * len(b):
        continue
    cnt = Counter(c_cls[i] for i in hit)
    cls_ = max(cnt, key=lambda c: (cnt[c], c == "P"))
    j = Counter(int(i) for i in hit if c_cls[i] == cls_).most_common(1)[0][0]
    p = c_props[j]
    city_infra[k] = cls_; city_id[k] = p["ID_CYCL"]; city_type[k] = p["TYPE_VOIE_CODE"]
    contra[k] = (p.get("TYPE_VOIE2_CODE") in CONTRA) or (p.get("NBR_VOIE") == 2)
    four[k] = p.get("SAISONS4") == "Oui"; rev[k] = p.get("REV_AVANCEMENT_CODE")

# coverage of the City layer by matched edges
matched_city = set(c for c in city_id if c is not None)
cov_len = sum(ft["properties"]["LONGUEUR"] or 0 for ft in city if ft["properties"]["ID_CYCL"] in matched_city)
tot_len = sum(ft["properties"]["LONGUEUR"] or 0 for ft in city)
log(f"City km matched to at least one OSM edge: {cov_len / 1000:.0f} of {tot_len / 1000:.0f}")

# final infrastructure: City class first (D = designated roadway counts as nothing), OSM tags as fallback
infra = []
src_ = []
STREETS = {"residential", "living_street", "unclassified", "tertiary", "tertiary_link", "secondary", "secondary_link",
           "primary", "primary_link", "trunk", "trunk_link", "cycleway", "service"}
for k in range(m):
    c = city_infra[k]
    hwk = E["hw"][k]
    # a City lane only transfers to a street or a bike path; a sidewalk next to it stays a sidewalk
    if c == "P" and hwk not in STREETS and (E["walk"][k] or E["osminfra"][k] != "P"):
        c = "N"
    if c == "B" and hwk not in STREETS:
        c = "N"
    if c in ("P", "B"):
        infra.append(c); src_.append("city")
    elif c == "D":
        infra.append("N"); src_.append("city-D")
    else:
        infra.append(E["osminfra"][k]); src_.append("osm" if E["osminfra"][k] != "N" else "none")
infra = np.array(infra)
ow = E["ow"].copy()
ow[contra & (infra != "N")] = 0          # City says there is a contraflow or two-way facility
sclass = np.array([street_class(h) for h in E["hw"]])
km = lambda mask: E["length"][mask].sum() / 1000
log("graph km by infra:", {c: round(km(infra == c)) for c in ("P", "B", "N")},
    "| from City:", round(km(np.array(src_) == "city")), "| OSM fallback P/B:", round(km((np.array(src_) == "osm"))))

G = dict(node_ll=node_ll, u=E["u"], v=E["v"], length=E["length"], hw=np.array(E["hw"]), name=np.array(E["name"]),
         ow=ow, infra=infra, infra_src=np.array(src_), sclass=sclass, city_id=city_id, city_type=city_type,
         city_four=four, city_rev=rev, way=E["way"], walk=E["walk"], geom=geom)
with open(os.path.join(WORK, "graph.pkl"), "wb") as f:
    pickle.dump(G, f, protocol=4)
log("wrote graph.pkl")

# ------------------------------------------------------------------ 5. City network for the page (simplified)
out = {"P": [], "B": [], "D": []}
for ft in city:
    p = ft["properties"]; c = CITY_CLASS[p["TYPE_VOIE_CODE"]]
    g = shape(ft["geometry"])
    for part in (g.geoms if g.geom_type == "MultiLineString" else [g]):
        xy = np.column_stack(to_xy(*np.array(part.coords).T))
        s = LineString(xy).simplify(4)
        ll = np.column_stack(to_ll(*np.array(s.coords).T))
        out[c].append([[round(a, 5), round(b, 5)] for a, b in ll])
def merge_lines(lines):
    """Chain lines sharing endpoints to cut the file size."""
    ends = defaultdict(list)
    for i, l in enumerate(lines):
        ends[tuple(l[0])].append(i); ends[tuple(l[-1])].append(i)
    used = [False] * len(lines); res = []
    for i in range(len(lines)):
        if used[i]:
            continue
        used[i] = True; cur = list(lines[i])
        for _ in range(2):
            while True:
                nxt = [j for j in ends[tuple(cur[-1])] if not used[j]]
                if not nxt:
                    break
                j = nxt[0]; used[j] = True
                l = lines[j]
                cur += (l[1:] if tuple(l[0]) == tuple(cur[-1]) else l[::-1][1:])
            cur = cur[::-1]
        res.append(cur)
    return res
net = {"meta": {"source": "Ville de Montréal, Réseau cyclable (donnees.montreal.ca), downloaded " + time.strftime("%Y-%m-%d"),
                "classes": {"P": "protected (types 4, 5, 6, 7)", "B": "painted lane, vélorue, bus-bike lane (2, 3, 8, 9)",
                            "D": "designated roadway / shared-lane markings (1)"},
                "km": {c: round(sum(ft["properties"]["LONGUEUR"] or 0 for ft in city if CITY_CLASS[ft["properties"]["TYPE_VOIE_CODE"]] == c) / 1000, 1) for c in out}},
       "lines": {c: merge_lines(v) for c, v in out.items()}}
sz = dump(net, os.path.join(OUT, "network.json"))
log(f"wrote network.json ({sz / 1024:.0f} KB)")
