#!/bin/zsh
# Downloads for the "next 50 km of bike lanes" project into scripts/mtl/raw/bikenetwork/ (git-ignored).
# Run from the repo root:  zsh scripts/mtl/bikenetwork/fetch_raw.sh
# The Ville de Montréal portal refuses requests without a browser-like User-Agent, hence -A.
set -e
R=scripts/mtl/raw/bikenetwork; mkdir -p $R; cd $R
UA="Mozilla/5.0 (gregoiremaillard.com research script)"   # the City portal rejects curl's default agent
CK=https://donnees.montreal.ca/dataset

# 1. City bike network (Réseau cyclable) + data dictionary
curl -sL -A "$UA" -o reseau_cyclable.geojson $CK/5ea29f40-1b5b-4f34-85b3-7c67088ff536/resource/0dc6612a-be66-406b-b2d9-59c9e1c65ebf/download/reseau_cyclable.geojson
curl -sL -A "$UA" -o reseau_cyclable_dictionnaire.pdf $CK/5ea29f40-1b5b-4f34-85b3-7c67088ff536/resource/9d689738-154d-4c6f-9f4d-67b1fa5574f1/download/reseau_cyclable_dictionnaire_donnees.pdf

# 2. Permanent bike counters: site locations + 2024 and 2025 counts (Eco-Compteur and City sensors)
CC=$CK/142ff2e9-7d0a-47d6-b4f6-dfeb97041daf/resource
curl -sL -A "$UA" -o localisations_globale.csv $CC/866218c3-dac9-4d8f-bad9-eb04f257206d/download/localisations_globale.csv
curl -sL -A "$UA" -o comptage_velo_2024.csv  $CC/d27ba191-1c4d-4600-97d0-cce568732a91/download/comptage_velo_2024.csv
curl -sL -A "$UA" -o comptage_velo_2025.csv  $CC/4d4f1e35-ee03-477d-b5f9-1aa20fcac220/download/comptage_velo_2025.csv
curl -sL -A "$UA" -o cyclistes_2025.csv      $CC/f02aad32-b89c-4535-b547-dd140435350b/download/cyclistes_2025.csv

# 3. Mon RésoVélo GPS traces (2013-2015), used only to calibrate route-choice penalties
curl -sL -A "$UA" -o trip5000.zip $CK/77f30d2b-c786-45f0-9f33-ebdef46f3b4c/resource/2f05c452-6b63-4fba-8220-ac7104492074/download/trip5000.zip

# 4. OpenStreetMap for the Montréal region (BBBike extract, refreshed weekly), © OpenStreetMap contributors, ODbL.
#    (The public Overpass servers were timing out on a query this size on 2026-10-01.)
curl -sL -A "$UA" -o Montreal.osm.gz https://download.bbbike.org/osm/bbbike/Montreal/Montreal.osm.gz
gzip -t Montreal.osm.gz

# 5. OpenStreetMap history for dating protected lanes: run date_lanes.py after build_network.py --buffers-only

# 6. BIXI trips 2024 and 2025 -> station-to-station counts (streamed; raw CSV never written)
cd ../../bikenetwork
curl -sL -A "$UA" https://cdn.bixi.com/wp-content/uploads/2026/02/DonneesOuvertes2025_010203040506070809101112.zip | tar -xOf - | python3 aggregate_od.py --year 2025 --out ../raw/bikenetwork
curl -sL -A "$UA" https://cdn.bixi.com/wp-content/uploads/2025/01/DonneesOuvertes2024_010203040506070809101112.zip | tar -xOf - | python3 aggregate_od.py --year 2024 --out ../raw/bikenetwork
