# Fleet orders data

Builds `fleet-orders.json`, the data behind `/fleetorders.html`.

- `update.mjs`: downloads and parses the sources, writes the JSON. No dependencies (Node 20+).
- `lib.mjs`: zip / xlsx / CSV readers, aircraft families, customer-name matching.
- `inbox/`: drop source files here by hand (ignored by git).

## Automatic refresh

`.github/workflows/fleet-orders.yml` runs on the 14th and 22nd of each month and publishes
to the `fleet-orders-data` branch (not `main`, so Pages doesn't rebuild). The page reads that
branch and falls back to `assets/data/fleet-orders.json` in the repo, whichever is newer.
Run it by hand from the Actions tab ("Fleet orders" → Run workflow).

If a source can't be downloaded, the previous month's figures are kept and the page
says the refresh failed. Airbus's website sits behind a bot filter (Incapsula), so the
Airbus download is the most likely to fail from GitHub's servers.

## Manual refresh (when a download fails)

1. Download the files in a browser and put them in `scripts/fleet-orders/inbox/`:
   - **Airbus**: the latest monthly `.xlsx` from
     <https://www.airbus.com/en/products-services/commercial-aircraft/orders-and-deliveries>
     (any file name). Optional, once: the annual archives `orders-and-deliveries-2021.zip`
     … `2025.zip` from the same page. They add Airbus deliveries by customer for past years.
   - **Boeing**: <https://public.tableau.com/views/BoeingCommercialOrdersDeliveries_16788064876590/OrdersandDeliveries.csv>
     saved as `boeing-orders-deliveries.csv`, and
     <https://public.tableau.com/views/BoeingCommercialOrdersDeliveries_16788064876590/MinorModels.csv>
     saved as `boeing-minor-models.csv`.
   - **Registers** (only if their downloads fail): `ccarcsdb.zip` from Transport Canada,
     `ReleasableAircraft.zip` from the FAA.
2. From the repo root: `node scripts/fleet-orders/update.mjs`
   (writes `assets/data/fleet-orders.json`; anything not in the inbox is downloaded).
3. Commit and push `assets/data/fleet-orders.json`. Empty the inbox afterwards, because files there take
   priority over downloads. The Boeing file's date is taken from the day you saved it.

Airbus workbooks are picked by the "Summary to <date>" inside them, so file names don't matter.
Past Airbus years are kept from run to run once they've been read.
