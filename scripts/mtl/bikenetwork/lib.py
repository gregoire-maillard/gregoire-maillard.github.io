"""Shared helpers for the bike network design project (scripts/mtl/bikenetwork/).

Paths, a local metric projection, infrastructure classes and the route-choice penalties.
Every number marked ASSUMPTION is a modelling choice, not data; the page labels them the same way.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
RAW = os.path.join(ROOT, "scripts", "mtl", "raw", "bikenetwork")
WORK = os.path.join(RAW, "_work")                      # intermediate files (git-ignored)
BOUNDS = os.path.join(ROOT, "scripts", "mtl", "raw", "boundaries", "limites-administratives-agglomeration.geojson")
OUT = os.path.join(ROOT, "assets", "data", "mtl", "bikenetwork")
os.makedirs(WORK, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- projection
# Local equirectangular projection centred on the island. Distortion < 0.3 % over the island,
# which is far below the noise in everything else; avoids a pyproj dependency.
LAT0, LON0 = 45.55, -73.65
KX = 111_320.0 * math.cos(math.radians(LAT0))
KY = 110_574.0

def to_xy(lon, lat):
    return ((lon - LON0) * KX, (lat - LAT0) * KY)

def to_ll(x, y):
    return (x / KX + LON0, y / KY + LAT0)

# ---------------------------------------------------------------- infrastructure classes
# City of Montréal TYPE_VOIE_CODE -> display class
#   P protected : 4 piste cyclable sur rue, 5 piste en site propre, 6 piste au niveau du trottoir, 7 sentier polyvalent
#   B painted   : 3 bande cyclable, 8 vélorue, 9 voie partagée bus-vélo, 2 accotement asphalté
#   D designated roadway (1 chaussée désignée): shared-lane markings only, routed like a street with nothing
CITY_CLASS = {"4": "P", "5": "P", "6": "P", "7": "P", "3": "B", "8": "B", "9": "B", "2": "B", "1": "D"}

# Street classes for links with no bike facility (from OSM highway=*)
LOCAL = {"residential", "living_street", "unclassified", "service", "pedestrian", "track", "path", "footway", "bridleway", "steps"}
COLLECTOR = {"tertiary", "tertiary_link"}
ARTERIAL = {"secondary", "secondary_link", "primary", "primary_link", "trunk", "trunk_link"}

def street_class(hw):
    if hw in ARTERIAL:
        return "A"
    if hw in COLLECTOR:
        return "T"
    return "L"

# ASSUMPTION: perceived-cost multipliers per metre (1.0 = protected). Starting values before
# calibration on Mon RésoVélo traces; calibrate.py overwrites WORK/penalties.json.
PRIOR_PENALTIES = {"P": 1.0, "B": 1.4, "L": 1.6, "A": 2.6}
CONTRAFLOW = 4.0      # ASSUMPTION: riding against a one-way street with no contraflow facility (or walking the bike)
WALK = 4.0            # ASSUMPTION: walking the bike (steps, footways signed "dismount")

def load_penalties():
    p = os.path.join(WORK, "penalties.json")
    if os.path.exists(p):
        with open(p) as f:
            return json.load(f)["penalties"]
    return dict(PRIOR_PENALTIES)

def penalty_of(infra, sclass, pen):
    """infra in P/B/N (N = nothing or designated roadway); sclass in L/T/A."""
    if infra == "P":
        return pen["P"]
    if infra == "B":
        return pen["B"]
    if sclass == "L":
        return pen["L"]
    if sclass == "A":
        return pen["A"]
    return 0.5 * (pen["L"] + pen["A"])      # collector: halfway between local and arterial

def dump(obj, path, nd=None):
    with open(path, "w") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)
    return os.path.getsize(path)
