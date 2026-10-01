# Montréal Mobility Lab — data pipeline

Python scripts behind the pages listed on `/mtlmobility.html`. They read raw downloads from `scripts/mtl/raw/` (git-ignored, never committed) and write small JSON files to `assets/data/mtl/`, which the pages load.

```
scripts/mtl/
  README.md
  build_shared.py              shared layer: municipalities + fare zones, cells, stations
  farezones/build_farezones.py model for /farezones.html
  bixirebalance/aggregate_trips.py   BIXI trip aggregation (streams a trip CSV, standard library only)
  bikenetwork/                 model for /bikenetwork.html (see "bikenetwork" below)
  raw/                         downloads (git-ignored, see below)
assets/data/mtl/
  municipalities.geojson       84 ARTM-territory municipalities, with zone, population, jobs   (~110 KB)
  cells.json                   636 cells = H3 res-7 hexagon x municipality, population, jobs  (~40 KB)
  stations.json                metro, REM and exo stations                                    (~11 KB)
  farezones/farezones.json     precomputed fare-structure solutions                           (~180 KB)
  bikenetwork/network.json     City bike network by class (protected / painted / shared-lane)  (~290 KB)
  bikenetwork/demand.json      BIXI trip ends by H3 res-8 hexagon + busiest OD pairs
  bikenetwork/design.json      candidate stretches, solutions, curves, back-test, counter check
  bikenetwork/flows.json       modelled BIXI flows on today's network (busiest links)
```

## Setup

```
pip install numpy shapely pyproj pyshp h3     # shapely >= 2, h3 >= 4
```

Run everything from the repo root:

```
python3 scripts/mtl/build_shared.py                 # ~20 s
python3 scripts/mtl/farezones/build_farezones.py    # ~2 min
```

## Raw inputs (`scripts/mtl/raw/`)

| File | What | Source |
|---|---|---|
| `census/gaf.zip` | 2021 Geographic Attribute File (92-151-X): every dissemination block with population, DA representative point, municipality (CSD), census tract | Statistics Canada |
| `census/lda_000b21a_e.zip` | 2021 dissemination-area boundary file (Lambert, EPSG:3347) | Statistics Canada |
| `census/98100504-eng.zip` | Table 98-10-0504: workers with a usual place of work, by census tract of work and main mode (2021) | Statistics Canada |
| `gtfs/stm/stops.txt` (and `gtfs_stm.zip`) | STM GTFS (metro stations = `location_type` 1, `STATION_M*`) | STM open data |
| `osm/rem_stations.json` | REM stations, from OpenStreetMap via Overpass (`osm/fetch_rem.sh`) | © OpenStreetMap contributors, ODbL |
| `gtfs/exo_trains.zip` *(optional, missing on 2026-10-01)* | exo trains GTFS. If present, `build_shared.py` uses its stops; if absent, exo stations are approximated (one per served municipality at its population-weighted centre) and flagged `approx` | exo open data, `https://exo.quebec/xdata/trains/google_transit.zip` |
| `boundaries/limites-administratives-agglomeration.geojson` | Montréal agglomeration boundary (not used by the scripts above) | Ville de Montréal open data |
| `hourly_*.csv.gz`, `stations_*.csv`, `weather/` | BIXI and weather inputs for the rebalancing project | BIXI, ECCC |

`build_shared.py` extracts the DA boundary shapefile once into `raw/_lda/`.

## Shared layer: what's in it

- **Fare zones**: ARTM's list of municipalities by zone (https://www.artm.quebec/en/fare-zones/, consulted 2026-10-01), hard-coded in `build_shared.py`. ARTM does not publish zone boundaries as GIS data, so zone shapes are census subdivisions dissolved by that list.
- **Cells**: the part of an H3 resolution-7 hexagon (~5 km²) inside one municipality. Population from the GAF; jobs = workers by census tract of work, spread equally over the tract's DAs. Outside the Montréal CMA (most of zone D) there is no tract data and jobs are set at 0.40 × population (illustrative).
- **Downtown** reference point: Place Ville Marie (45.5009, −73.5684).

## farezones

`build_farezones.py` documents every assumption at the top of the file. In short: travel-time proxy → gravity trip matrix scaled to the ARTM 2023 survey totals → binary logit transit vs car, calibrated per elasticity → exhaustive search over ring / per-km / flat fare parameters for 5 elasticities × 5 objective weights × 3 jump limits × 3 riders-paying-more limits → exact re-evaluation of each chosen solution. Fares come from ARTM's grid in force 2026-07-01. Everything except the fares, zones and survey totals is illustrative.

When the ARTM fare grid changes, update `FARE_GRID` / `ZPRICE` in `build_farezones.py` (and the dates on `farezones.html`), then rerun both scripts.

## bikenetwork

"The next 50 km of bike lanes": which street stretches should become protected lanes, for a budget of 10, 25, 50 or 100 km. Extra packages: `pip install scipy highspy` (on top of the setup above). Run from the repo root, in order:

```
zsh scripts/mtl/bikenetwork/fetch_raw.sh                       # downloads + BIXI OD aggregation, ~15 min
python3 scripts/mtl/bikenetwork/build_network.py --buffers-only  # buffers for lane dating, seconds
python3 scripts/mtl/bikenetwork/date_lanes.py                  # OpenStreetMap history (ohsome API), ~5 min, stdlib only
python3 scripts/mtl/bikenetwork/build_network.py               # OSM street graph + City network matched on it, ~5 min
python3 scripts/mtl/bikenetwork/build_demand.py                # BIXI OD on H3 res-8 hexagons, ~10 s
python3 scripts/mtl/bikenetwork/calibrate.py                   # route-choice penalties from Mon RésoVélo traces, ~20 min
python3 scripts/mtl/bikenetwork/design.py                      # greedy + MIP + back-test + counter check, ~2.5 h (--reuse-pool skips the 20-min route pool)
python3 scripts/mtl/bikenetwork/export.py                      # page JSON
```

Raw inputs (`scripts/mtl/raw/bikenetwork/`, git-ignored; intermediate files in `_work/`):

| File | What | Source |
|---|---|---|
| `reseau_cyclable.geojson` (+ dictionary PDF) | City bike network by facility type, 4-season and REV flags; no construction dates | Ville de Montréal open data, `pistes-cyclables` |
| `Montreal.osm.gz` | OpenStreetMap extract for the region (street graph) | BBBike, © OpenStreetMap contributors, ODbL |
| `od_<year>.csv.gz`, `od_stations_<year>.csv` | BIXI 2024 and 2025 trips counted station to station (`aggregate_od.py`, raw CSV never written) | BIXI open data |
| `trip5000.zip` | Mon RésoVélo GPS traces, 2013-2015 (route-choice calibration only) | Ville de Montréal open data |
| `comptage_velo_2024.csv`, `comptage_velo_2025.csv`, `localisations_globale.csv` | Permanent bike counters (Eco-Compteur sites) | Ville de Montréal open data, `cyclistes` |
| `_work/lane_dates.json` | metres of protected-type OSM ways near each protected City segment, yearly snapshots | ohsome API (HeiGIT) on OpenStreetMap history |

Notes:
- The City portal rejects requests with curl's default User-Agent; the scripts send a browser-like one. The public Overpass servers timed out on the street query on 2026-10-01, hence the BBBike extract; the ohsome geometry endpoints returned 403, so lane dating uses the aggregate `length/groupBy/boundary` endpoint with one buffer per segment.
- Every modelling assumption (penalties before calibration, contraflow and walking penalties, gap bonus, candidate rules) is at the top of `lib.py` and `design.py`, and is labelled on the page.
- `design.py --quick` runs the effort objective on the 3,000 busiest OD pairs with 60-second MIPs, for testing.

