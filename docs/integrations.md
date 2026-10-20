# External integrations

This document records what the portal integrates with, what is deliberately
**not** integrated, and the constraints that come with each choice.

## 1. Weather — Open-Meteo (live, no API key)

**Status:** implemented and verified against the live provider.

| Item | Value |
| ---- | ----- |
| Provider | Open-Meteo (`https://open-meteo.com/`) |
| Endpoint used | `GET https://api.open-meteo.com/v1/forecast` |
| Authentication | None (no API key) |
| Fields requested (current) | `temperature_2m`, `relative_humidity_2m`, `apparent_temperature`, `precipitation`, `weather_code`, `wind_speed_10m`, `wind_direction_10m`, `is_day` |
| Fields requested (hourly) | `temperature_2m`, `weather_code`, `precipitation_probability`, `is_day`, `wind_speed_10m`, `uv_index`, `visibility`, `dew_point_2m` |
| Fields requested (daily) | `temperature_2m_max`, `temperature_2m_min`, `precipitation_probability_max`, `weather_code`, `sunrise`, `sunset`, `uv_index_max`, `precipitation_sum`, `wind_speed_10m_max` |
| Forecast horizon | 7 days (`FORECAST_DAYS`), 24 hourly steps (`HOURLY_WINDOW`) |
| Timezone | `Africa/Addis_Ababa` |
| Default location | 11.0849, 39.7392 (Kombolcha) |
| Server route | `GET /api/weather` (`server/routes/weather.js`) |
| Client page | `#weather` (`client/src/pages/Weather.jsx`) |
| Caching | 10 minutes in memory (`WEATHER_CACHE_SECONDS`) |
| Timeout | 8 seconds (`WEATHER_TIMEOUT_MS`) |
| Licence | CC BY 4.0 — attribution is shown on the page |

### Normalised response

The route maps the provider payload onto a stable, camelCase shape. Everything
added for the forecast redesign is **additive** — the original current-condition
fields are unchanged, so existing consumers keep working.

| Field | Notes |
| ----- | ----- |
| `temperatureC`, `apparentC`, `humidity`, `precipitationMm`, `windKph`, `windDirectionDeg`, `weatherCode`, `description`, `today` | Current conditions (unchanged). |
| `isDay` | `true`/`false` when the provider reports it, otherwise `null`. Drives the day/night icons. |
| `dewPointC`, `uvIndex`, `visibilityKm` | Taken from the hourly block for the hour containing the current reading. Provider `visibility` (metres) is converted to km. |
| `sunrise`, `sunset` | Wall-clock strings in the city timezone (`2026-10-19T06:12`) so the client never needs timezone maths. |
| `hourly[]` | Up to 24 steps from the current hour: `time`, `temperatureC`, `weatherCode`, `description`, `precipitationProbability`, `windKph`, `isDay`. |
| `daily[]` | Up to 7 days: `date`, `maxC`, `minC`, `weatherCode`, `description`, `precipitationProbabilityMax`, `precipitationMm`, `uvIndexMax`, `windKphMax`, `sunrise`, `sunset`. |

Missing provider values become `null` and the matching UI card is simply not
rendered — no placeholder or invented numbers are ever shown (FR-26, FR-28,
NFR-19).

### Failure handling (FR-27, FR-28, NFR-11, NFR-23)

- The provider is only called from the server, so the browser never exposes a
  key or a provider URL to the client.
- If the live call fails and a reading is cached, the last successful reading is
  returned with `"stale": true` and a `warning`. The UI shows the warning text, a
  "Cached reading" badge and the last-updated time.
- If the live call fails and nothing is cached, the API returns `502` and the
  page shows "Weather is unavailable right now" with the API message and a retry
  action.
- If the call succeeds but returns no usable reading, the page falls back to a
  friendly empty state ("No weather reading available") that leaves the rest of
  the portal untouched.
- A failed manual refresh keeps the previous reading on screen instead of
  blanking the page.
- Responses are normalised server-side before display; raw provider payloads
  are never forwarded.

### Constraints you must respect

> **Non-commercial use only.** The Open-Meteo free tier is licensed for
> non-commercial use, subject to CC BY 4.0 attribution and rate limits
> (< 10,000 calls/day, 5,000/hour, 600/minute). A municipal, non-advertising
> portal normally qualifies, but **confirm this before any commercial use**. If
> the deployment becomes commercial, subscribe to an Open-Meteo paid plan or
> switch providers, and update `WEATHER_*` settings accordingly.
>
> Source: <https://open-meteo.com/en/terms> (verified during implementation).

The default 10-minute cache means roughly 144 provider calls per day, well
inside the free limits.

### Configuration

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `WEATHER_ENABLED` | `true` | Set to `false` to serve `503` and hide live weather without a deploy. |
| `WEATHER_LAT` / `WEATHER_LON` | `11.0849` / `39.7392` | Override the location if the portal is reused elsewhere. |
| `WEATHER_CACHE_SECONDS` | `600` | Cache window. |
| `WEATHER_TIMEOUT_MS` | `8000` | Provider request timeout. |

No paid service is required, and no API key is stored for weather.

## 2. Transportation — maintained directory (no live feed)

**Status:** implemented as a clearly labelled directory. **No live data is
shown, and none is fabricated.**

| Item | Value |
| ---- | ----- |
| Client page | `#transport` (`client/src/pages/Transport.jsx`) |
| Data source | The portal's own `services` and `service_locations` tables, filtered to the `transportation` category |
| Route prefix shown | Mapped bus station: "Kombolcha Bus Station" |
| Real-time arrivals / vehicle positions | Not available |

### Why there is no live integration

FR-25 asks the system to integrate transportation information "where included in
the system". No reliable, free, key-free, real-time transport API for Kombolcha
(Ethiopia) was identified. Rather than invent or scrape data, the portal:

1. Presents the transport services administrators already maintain.
2. Displays an explicit notice: *"Live vehicle tracking and real-time arrival
   times are not available for Kombolcha, so no estimate is shown."*
3. Keeps the data source as the database, so an administrator can add or update
   entries without a code change.

### Future integration points

If a provider becomes available later, add it the same way as weather:

- A new server route (`server/routes/transport.js`) with caching, timeout and a
  stale fallback.
- Normalise the provider response before display (`FR-26`, `NFR-19`).
- Keep the directory page fallback for when the provider is unavailable
  (`NFR-22`, `NFR-23`).

## 3. Maps — Leaflet + MapTiler (OpenStreetMap fallback)

**Status:** implemented. MapTiler is used when a key is configured; otherwise the
map falls back to OpenStreetMap tiles.

| Item | Value |
| ---- | ----- |
| Library | Leaflet 1.9 (`client/src/components/CityMap.jsx`) |
| Basemap config | `client/src/mapStyle.js` (`buildBasemap`) |
| Primary tiles | `https://api.maptiler.com/maps/{style}/256/{z}/{x}/{y}.png?key=…` |
| Primary styles | `streets-v4` (light), `streets-v4-dark` (dark) — overridable |
| Fallback tiles | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Attribution | MapTiler: `© MapTiler` + `© OpenStreetMap contributors`; OSM: `© OpenStreetMap contributors` |
| Search | Client-side place-name filter on the map page |
| Tile failure | Rendered overlay: "Map tiles could not be loaded" |

### How the provider is selected

`buildBasemap({ theme, key })` returns the active source. When
`VITE_MAPTILER_KEY` is empty or unset the map uses the OpenStreetMap tiles
exactly as before, so the portal keeps working with no account. When a key is
present it uses MapTiler and serves a real dark style in dark mode (the
`invert()` CSS filter is applied only to the OpenStreetMap fallback).

### API key handling (important)

- The key lives in `client/.env.local` (git-ignored) as `VITE_MAPTILER_KEY` and
  is referenced via `import.meta.env`. It is **never** committed.
- Vite bakes client variables into the built bundle, so the key **is** visible in
  the browser. This is unavoidable for a browser map and is exactly how MapTiler
  expects web keys to be used. Protection comes from MapTiler's **Allowed HTTP
  origin** allowlist, which makes a copied key useless off your domains.
- A server-side tile proxy is **prohibited** by MapTiler's Cloud Terms
  (§6.1 proxy, §7.2 caching/redistribution) unless separately agreed in writing
  with additional fees, so the key cannot be hidden behind this API.

### Plan, limits and attribution requirements

- **Free plan:** $0, non-commercial + R&D use only (§1.2), the **MapTiler logo
  is required** on the map, **100k API requests/month**, 1 API key. When the
  quota is exhausted the map service pauses until the next month (no charge).
- Because the map uses Leaflet (a third-party SDK), usage is metered as **API
  requests**, not MapTiler "map sessions". Each 256px raster tile is 1 request;
  512px/HiDPI tiles count as 4, so the portal requests 256px tiles and does not
  enable `detectRetina`. A typical map view is ~10–16 requests, i.e. roughly
  **6,000–10,000 views/month** on the Free plan.
- Attribution must stay visible and may not be hidden or altered (§7.5):
  `© MapTiler` links to `maptiler.com/copyright/`, `© OpenStreetMap
  contributors` links to `openstreetmap.org/copyright`, and the logo links to
  `maptiler.com`.
- A paid **Flex** plan ($30/month) removes the logo requirement and allows
  commercial use. No paid plan or billing is enabled by the code.

### Deviation from the SRS

Requirement **SI-04** names the Google Maps API. The project owner chose to keep
**Leaflet** instead. The basemap is an isolated, swappable decision: the provider
lives entirely in `client/src/mapStyle.js` + `CityMap.jsx`.

### Constraints

- Both providers require attribution (already present) and reasonable,
  non-bulk usage. The portal uses an interactive map only.
- Invalid coordinates are rejected by the API and skipped by the map, so a bad
  row cannot break the page (`FR-22`, `FR-23`).
- All existing map behaviour is unchanged: colour-coded markers, popups,
  click-to-select, fit-to-bounds, place search, category filters and the
  tile-error overlay.

## 4. Authentication provider — Supabase Auth

**Status:** implemented.

- Email/password sign-in is handled by Supabase Auth in the browser.
- The server verifies the bearer token with Supabase and enforces an
  `ADMIN_EMAILS` allowlist (`server/middleware/requireAdmin.js`).
- Public reads never require a token; every write requires one.
- If `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` are missing, admin writes return
  `503` instead of crashing the server.
