# Hub banks data

Builds `assets/data/hubbanks.json`, the data behind `/hubbanks.html`: one weekday of
scheduled Air Canada and WestJet departures and arrivals at YYZ, YUL, YVR and YYC.

- `fetch.mjs`: calls AeroDataBox, keeps the two airlines' operated flights, writes the JSON. No dependencies (Node 20+).
- `raw/`: every API response, saved so the JSON can be rebuilt without spending units (ignored by git).

## Getting a key (once, free)

1. Create a RapidAPI account and subscribe to the **Basic** (free) plan of
   [AeroDataBox](https://rapidapi.com/aedbx-aedbx/api/aerodatabox/pricing): 400 units a month.
2. Copy your `X-RapidAPI-Key`.

A run makes 8 calls (4 hubs × two 12-hour windows) at 2 units each: 16 units.

## Refreshing the data

From the repo root:

```sh
AERODATABOX_KEY=your-key node scripts/hubbanks/fetch.mjs
```

This fetches the most recent Wednesday at least two days back. Add `--date 2026-10-21` to
pick another day (local date at the hubs). If the API says the date is out of range for
your plan, try a closer one.

The script prints the number of arrivals and departures per airline and hub. Check that
they look plausible, then commit and push `assets/data/hubbanks.json`.

If the numbers look wrong (for example zero flights), the raw responses are in `raw/<date>/`.
After fixing the parser, rebuild without calling the API:

```sh
node scripts/hubbanks/fetch.mjs --date 2026-09-23 --from-raw
```

There is no scheduled job: a hub's bank structure only changes with the season, so a manual
refresh once or twice a year (for example after the late-October and late-March schedule changes)
is enough.
