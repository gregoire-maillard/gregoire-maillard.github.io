#!/usr/bin/env python3
"""Build assets/data/farefamilies.json for farefamilies.html.

Synthetic shoppers for one illustrative short-haul market, drawn from a fixed
seed, plus the airline presets (attributes from the airlines' public pages,
prices illustrative). Nothing here is any airline's internal data.

Run from the repo root:  python3 scripts/farefamilies/build_customers.py
Standard library only; the same seed always gives the same file.
"""
import json
import math
import random
from pathlib import Path

SEED = 20260929
N = 2000
OUT = Path(__file__).resolve().parents[2] / "assets" / "data" / "farefamilies.json"

# Attributes a fare family can include. Levels are the share of the attribute's
# full value a customer gets (e.g. changes "with a fee" is worth 40% of free changes).
ATTRS = [
    {"key": "carry",  "label": "Carry-on bag",      "short": "Carry-on", "levels": [0, 1],        "names": ["—", "✓"]},
    {"key": "bag",    "label": "Checked bag",       "short": "Bag",      "levels": [0, 1],        "names": ["—", "✓"]},
    {"key": "seat",   "label": "Seat selection",    "short": "Seat",     "levels": [0, 1],        "names": ["—", "✓"]},
    {"key": "change", "label": "Changes",           "short": "Changes",  "levels": [0, 0.4, 1],   "names": ["—", "Fee", "Free"]},
    {"key": "refund", "label": "Refund",            "short": "Refund",   "levels": [0, 1],        "names": ["—", "✓"]},
    {"key": "status", "label": "Points & status",   "short": "Points",   "levels": [0, 0.5, 1],   "names": ["—", "Reduced", "Full"]},
    {"key": "prio",   "label": "Priority services", "short": "Priority", "levels": [0, 1],        "names": ["—", "✓"]},
]

# Segments: share of shoppers, median willingness to pay for a bare seat (USD,
# one way, ~2 h flight), spread (log-sd), and the median value of each attribute
# at its full level. All illustrative.
SEGMENTS = [
    {
        "key": "price", "label": "Price-driven leisure", "short": "Price-driven", "share": 0.35,
        "wtp": 200, "wtp_sd": 0.30,
        "values": {"carry": 24, "bag": 12, "seat": 8, "change": 10, "refund": 8, "status": 3, "prio": 3},
        "noBasic": False,
        "blurb": "Books early, travels light, and compares on the headline fare.",
    },
    {
        "key": "bags", "label": "Leisure with bags", "short": "With bags", "share": 0.25,
        "wtp": 215, "wtp_sd": 0.30,
        "values": {"carry": 30, "bag": 55, "seat": 22, "change": 15, "refund": 10, "status": 4, "prio": 4},
        "noBasic": False,
        "blurb": "Families and longer stays: a checked bag and seats together matter.",
    },
    {
        "key": "biz", "label": "Business, on a travel policy", "short": "Business", "share": 0.20,
        "wtp": 320, "wtp_sd": 0.30,
        "values": {"carry": 35, "bag": 15, "seat": 25, "change": 80, "refund": 70, "status": 30, "prio": 15},
        "noBasic": True,
        "blurb": "The company pays; the policy rules out Basic fares. Plans change, so flexibility is worth a lot.",
    },
    {
        "key": "elite", "label": "Loyal elites", "short": "Elites", "share": 0.20,
        "wtp": 280, "wtp_sd": 0.30,
        # Elites already get free bags, seats and priority from their status in
        # most programmes, so those attributes are worth little extra to them.
        "values": {"carry": 4, "bag": 3, "seat": 3, "change": 45, "refund": 25, "status": 90, "prio": 2},
        "noBasic": False,
        "blurb": "Status already gives them bags, seats and priority; what they want from the fare is status credit.",
    },
]
VALUE_SD = 0.5  # log-sd of each customer's attribute values around the segment median

rng = random.Random(SEED)


def lognorm(median, sd):
    return median * math.exp(rng.gauss(0.0, sd))


customers = []
cum = []
acc = 0.0
for s in SEGMENTS:
    acc += s["share"]
    cum.append(acc)
for _ in range(N):
    u = rng.random() * acc
    si = next(i for i, c in enumerate(cum) if u <= c)
    s = SEGMENTS[si]
    row = [si, round(lognorm(s["wtp"], s["wtp_sd"]))]
    for a in ATTRS:
        row.append(round(lognorm(s["values"][a["key"]], VALUE_SD), 1))
    customers.append(row)
customers.sort(key=lambda r: r[0])

# Presets. Attribute levels follow the order of ATTRS:
# carry, bag, seat, change, refund, status, prio.
PRESETS = [
    {
        "key": "example", "label": "Example", "basic": 180, "bag": 35, "seat": 15,
        "note": "A generic three-family ladder to start from.",
        "families": [
            {"name": "Basic",    "step": 0,   "attrs": [0, 0, 0, 0, 0, 1, 0]},
            {"name": "Standard", "step": 40,  "attrs": [1, 0, 1, 1, 0, 2, 0]},
            {"name": "Flex",     "step": 110, "attrs": [1, 1, 1, 2, 0, 2, 0]},
        ],
        "sources": [],
    },
    {
        "key": "ac", "label": "Air Canada", "basic": 180, "bag": 35, "seat": 15,
        "note": ("Economy within Canada. Basic has no carry-on, no changes and no Status Qualifying Credits (points only); "
                 "Standard earns 2 SQC per dollar against 4 for the others, and changes cost CA$100–120. "
                 "Comfort (two bags, refundable, same-day changes) is left out to stay within four families; "
                 "priority check-in is only included in Latitude."),
        "checked": "2026-09-29",
        "families": [
            {"name": "Basic",    "step": 0,   "attrs": [0, 0, 0, 0, 0, 1, 0]},
            {"name": "Standard", "step": 35,  "attrs": [1, 0, 0, 1, 0, 1, 0]},
            {"name": "Flex",     "step": 90,  "attrs": [1, 1, 1, 2, 0, 2, 0]},
            {"name": "Latitude", "step": 260, "attrs": [1, 1, 1, 2, 1, 2, 1]},
        ],
        "sources": [
            {"label": "Air Canada, Fare options & fees (economy, Canada)",
             "url": "https://www.aircanada.com/ca/en/aco/home/book/fare-options-and-fees.html",
             "date": "checked 29 Sep 2026; fare grid data file last updated 3 Aug 2026"},
        ],
    },
    {
        "key": "ua", "label": "United", "basic": 180, "bag": 45, "seat": 15,
        "note": ("Economy within the US. Basic Economy: personal item only, seat assigned by United, no changes, "
                 "partial travel credit only after 24 hours, miles and PQP but no Premier qualifying flights, boarding group 6. "
                 "Economy: carry-on, seat choice, no change fee on domestic flights. Neither includes a checked bag in the US "
                 "(first bag from $45 prepaid for tickets bought from 3 Apr 2026). Economy Plus is a seat upgrade, not a fare family, so it isn't modelled."),
        "checked": "2026-09-29",
        "families": [
            {"name": "Basic Economy", "step": 0,  "attrs": [0, 0, 0, 0, 0, 1, 0]},
            {"name": "Economy",       "step": 45, "attrs": [1, 0, 1, 2, 0, 2, 0]},
        ],
        "sources": [
            {"label": "United, Basic Economy", "url": "https://www.united.com/en/us/fly/travel/inflight/basic-economy.html", "date": "checked 29 Sep 2026"},
            {"label": "United, Flexible booking options (change fees)", "url": "https://www.united.com/en/us/fly/travel/trip-planning/flexible-booking-options.html", "date": "checked 29 Sep 2026"},
            {"label": "United, How to earn Premier status (no PQF on Basic Economy)", "url": "https://www.united.com/en/us/fly/mileageplus/premier/qualify.html", "date": "checked 29 Sep 2026"},
        ],
    },
    {
        "key": "af", "label": "Air France", "basic": 180, "bag": 35, "seat": 15,
        "note": ("Long-haul Economy, applied here to the page's short-haul customers. Light and Standard pay for seats and changes, "
                 "Flex has free seats, free changes, refunds and partial SkyPriority. Light includes 0–1 checked bag depending "
                 "on the route (set to none), Standard 1–2. Flying Blue earning isn't listed per fare, so it's set equal. "
                 "Short and medium haul also has a Basic fare without a cabin bag."),
        "checked": "2026-09-29",
        "families": [
            {"name": "Light",    "step": 0,   "attrs": [1, 0, 0, 1, 0, 2, 0]},
            {"name": "Standard", "step": 50,  "attrs": [1, 1, 0, 1, 0, 2, 0]},
            {"name": "Flex",     "step": 160, "attrs": [1, 1, 1, 2, 1, 2, 1]},
        ],
        "sources": [
            {"label": "Air France and KLM, Fare options (economy grid, undated)", "url": "https://image.mail.afkl.biz/lib/fe3411737364047e711072/m/1/EN_Fare_options.pdf", "date": "read 29 Sep 2026"},
            {"label": "Air France, Choosing your seat (Light pays, Flex free)", "url": "https://wwws.airfrance.us/information/aeroport/options/choix-siege-standard", "date": "checked 29 Sep 2026"},
        ],
    },
]

out = {
    "meta": {
        "generated": "2026-09-29",
        "seed": SEED,
        "n": N,
        "valueSd": VALUE_SD,
        "note": "Synthetic shoppers and illustrative values. Attributes of the airline presets come from public pages; all prices are illustrative.",
        "columns": ["segment", "wtp"] + [a["key"] for a in ATTRS],
    },
    "attrs": ATTRS,
    "segments": SEGMENTS,
    "presets": PRESETS,
    "customers": customers,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"wrote {OUT} ({OUT.stat().st_size:,} bytes, {N} customers)")
