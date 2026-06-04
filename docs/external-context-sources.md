# External context source verification (Group 8)

Verified on 2026-06-04 with web extraction and `curl -L -s -o /dev/null -w '%{http_code} %{content_type}'` checks. These public APIs are used only as contextual signals. They are not promoted to incidents, official orders, action cards, or source-ledger rows, and user-facing signals keep only sanitized refs/hashes/ids.

## Kartverket

Official evidence:
- https://ws.geonorge.no/adresser/v1/ returned 200 and documents base URL `ws.geonorge.no/adresser/v1`, no authentication requirement, `GET /sok`, and `GET /punktsok`.
- https://ws.geonorge.no/adresser/v1/openapi.json returned 200 application/json.
- https://api.kartverket.no/stedsnavn/v1/openapi.json returned 200 application/json.
- https://api.kartverket.no/kommuneinfo/v1/openapi.json returned 200 application/json.

Enabled conservative endpoints:
- `https://ws.geonorge.no/adresser/v1/sok?sok=...&treffPerSide=5`
- `https://api.kartverket.no/stedsnavn/v1/navn?sok=...&treffPerSide=5`
- `https://api.kartverket.no/kommuneinfo/v1/sok?knavn=...`
- `https://api.kartverket.no/kommuneinfo/v1/punkt?nord=...&ost=...&koordsys=4326`

## MET Norway

Official evidence:
- https://api.met.no/doc/GettingStarted documents required contact-bearing User-Agent, 403 for missing/invalid identification, 304 caching, 429/rate limiting, and max 4 decimals for coordinates.
- https://api.met.no/weatherapi/locationforecast/2.0/documentation documents `GET /weatherapi/locationforecast/2.0/compact?lat=...&lon=...`; status URL returned 200 application/json.
- https://api.met.no/weatherapi/metalerts/2.0/documentation documents `current.json`, lat/lon and language filters, CAP immutability, and warning semantics; status URL returned 200.
- https://api.met.no/weatherapi/nowcast/2.0/documentation documents public Nowcast `complete` endpoint, 2-hour / 5-minute updates, Nordic/radar coverage, and 422/429 behavior; status URL returned 200 application/json.

Enabled conservative endpoints:
- `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=...&lon=...`
- `https://api.met.no/weatherapi/metalerts/2.0/current.json?lat=...&lon=...&lang=no`

Production User-Agent policy:
- `MET_USER_AGENT` must be configured in production with a real email address or URL and must not be a placeholder/generic client string.
- Test fixtures may use `example.invalid`, but production guard rejects that.

Deferred:
- MET Nowcast is verified public and useful for immediate precipitation, but not enabled in the MVP because it updates every 5 minutes, depends on radar coverage, and there is no user-initiated target-location refresh UX yet. The app must not claim Nowcast support until fetch cadence/rate-limit handling and coverage UI are implemented.

## NVE / Varsom

Official evidence:
- https://api.nve.no/doc/flomvarsling/ returned 200 and documents base `https://api01.nve.no/hydrology/forecast/flood/v1.0.10`, REST GET, JSON/XML/text, and `/Warning/Municipality/{Kommunenummer}/{Språknøkkel}/{Startdato}/{Sluttdato}`.
- https://api.nve.no/doc/jordskredvarsling/ returned 200 and documents base `https://api01.nve.no/hydrology/forecast/landslide/v1.0.10`, REST GET, JSON/XML, and `/Warning/Municipality/{Kommunenummer}/{Språknøkkel}/{Startdato}/{Sluttdato}`.
- https://github.com/NVE/python-varsom-avalanche-client documents an NVE avalanche forecast client and no-auth API concept, but attempted live `api01.nve.no/hydrology/forecast/avalanche/v5.0.1/...` and common older avalanche URL variants returned 404 on 2026-06-04.

Enabled conservative endpoints:
- `https://api01.nve.no/hydrology/forecast/flood/v1.0.10/api/Warning/Municipality/{Kommunenummer}/1/{Start}/{Slutt}`
- `https://api01.nve.no/hydrology/forecast/landslide/v1.0.10/api/Warning/Municipality/{Kommunenummer}/1/{Start}/{Slutt}`

Disabled/pending:
- NVE avalanche normalization is not enabled because a live official endpoint could not be confidently verified. Code records the pending status and tests assert that hazard fetching does not call unsupported avalanche endpoints.

## Local source settings

The `/datakilder` page stores source toggles in `localStorage` under `beredskapsboka-external-data-sources-v1`. Settings are browser-local only: no backend sync, no account sync, and no deletion of last-known-good stale mission context. Disabled sources should not be treated as fresh/active; stale last-known-good context may remain visible with stale/disabled warning text.
