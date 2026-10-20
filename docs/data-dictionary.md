# Data dictionary

Two sections:

1. **Observed schema** — verified against the hosted Supabase database using
   read-only queries on 2026-10-20 (PostgreSQL 17.11). This is what the code
   reads and writes today.
2. **Proposed schema** — prepared but **not applied** (see
   `docs/migrations/001_add_contact_and_audit_fields.sql`). It is listed here so
   reviewers can see the intended shape.

Column order matches `ordinal_position` in `information_schema`.

## 1. Observed schema

### `public.announcements`

Service updates and public notices. Requirement links: FR-15–FR-18.

| Column         | Type           | Null | Default | Description |
| -------------- | -------------- | ---- | ------- | ----------- |
| `id`           | `bigint`       | no   | identity (`GENERATED ALWAYS`) | Primary key. |
| `title`        | `varchar(200)` | no   | — | Short headline shown on the card. |
| `content`      | `text`         | no   | — | Full message. Validated at ≤10,000 characters by the API. |
| `category`     | `varchar(50)`  | no   | — | Service area. Canonical target: `waste`, `water`, `transportation`, `weather`, `emergency`. Legacy values exist in current data. |
| `published_at` | `timestamptz`  | yes  | `now()` | Publication time, used for ordering and "time ago" labels. |

### `public.services`

Directory of city services. Requirement links: FR-06–FR-12, FR-29–FR-31.

| Column        | Type           | Null | Default | Description |
| ------------- | -------------- | ---- | ------- | ----------- |
| `id`          | `bigint`       | no   | identity (`GENERATED ALWAYS`) | Primary key. |
| `name`        | `varchar(150)` | no   | — | Service name. |
| `category`    | `varchar(50)`  | no   | — | Service area (see above). |
| `description` | `text`         | yes  | — | Optional detail. Today this is also where contact text is placed because there is no phone column. |
| `location`    | `text`         | yes  | — | Human-readable address. |
| `created_at`  | `timestamptz`  | yes  | `now()` | Row creation time. Not currently displayed. |

### `public.service_locations`

Coordinates used by the Leaflet city map. Requirement links: FR-19–FR-23.

| Column       | Type               | Null | Default | Description |
| ------------ | ------------------ | ---- | ------- | ----------- |
| `id`         | `bigint`           | no   | identity (`GENERATED ALWAYS`) | Primary key. |
| `name`       | `varchar(150)`     | no   | — | Place name. |
| `category`   | `varchar(50)`      | no   | — | Service area (see above). |
| `latitude`   | `double precision` | yes  | — | WGS84 latitude, validated to −90…90 by the API. |
| `longitude`  | `double precision` | yes  | — | WGS84 longitude, validated to −180…180 by the API. |
| `created_at` | `timestamptz`      | yes  | `now()` | Row creation time. |

### Constraints, indexes and relationships (observed)

- **Primary keys:** `announcements_pkey`, `services_pkey` and
  `service_locations_pkey`, each on `id`.
- **Foreign keys:** none. `services` and `service_locations` are independent;
  the UI aligns them by matching `name` (used for the "Show on map" action on
  the Transportation page). This is a presentation convenience, not a stored
  relationship.
- **Unique / check constraints:** none.
- **Indexes:** only the three primary-key indexes. No index on `category`,
  `published_at` or `created_at`.
- **Triggers:** none.

### Row Level Security and privileges (observed)

- RLS is **enabled** on all three tables and **not forced**; **no policies** are
  defined.
- `anon`, `authenticated`, `service_role` and `postgres` hold the default broad
  table privileges (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER).
  Those grants are Supabase defaults, not application code.
- Because there are no policies, row access through the `anon`/`authenticated`
  roles is denied. The Express API connects with the `postgres` owner role
  (`DATABASE_URL`), which bypasses RLS, so the API works.
- `TRUNCATE` is not row-filtered by RLS. The browser key is publishable and
  should be treated as public; never expose the database password or a
  `service_role` key.
- No RLS policy or privilege change is included in this project.

### Observed category values

| Table | Values present |
| ----- | -------------- |
| `announcements` (6) | `community`, `education`, `health`, `safety`, `transport`, `utilities` |
| `services` (12) | `community`, `education`, `emergency` (×2), `government` (×2), `health` (×2), `transport`, `utilities` (×2) |
| `service_locations` (12) | same shape as `services` |

## 2. Proposed schema (not applied)

Added by `docs/migrations/001_add_contact_and_audit_fields.sql`.

| Table           | Column          | Type          | Null | Description |
| --------------- | --------------- | ------------- | ---- | ----------- |
| `announcements` | `updated_at`    | `timestamptz` | no   | Auto-maintained last-modified time. |
| `services`      | `contact_phone` | `text`        | yes  | Emergency/service contact number (FR-09, FR-29). |
| `services`      | `website`       | `text`        | yes  | Optional official website. |
| `services`      | `opening_hours` | `text`        | yes  | Optional opening hours. |
| `services`      | `updated_at`    | `timestamptz` | no   | Auto-maintained last-modified time. |

A `public.touch_updated_at()` trigger function sets `updated_at = now()` on every
`update`.

## 3. API-only fields (not stored)

These appear in API responses but are not database columns:

| Field | Source | Endpoint |
| ----- | ------ | -------- |
| `fetchedAt` | Server clock when the reading was retrieved | `GET /api/weather` |
| `stale` | `true` when the last successful reading is being shown after a provider failure | `GET /api/weather` |
| `warning` | Human-readable explanation for stale weather data | `GET /api/weather` |
| `source` | Open-Meteo attribution and licence | `GET /api/weather` |
| `isDay` | Whether the current reading is during daylight | `GET /api/weather` |
| `dewPointC`, `uvIndex`, `visibilityKm` | Current-hour detail read from the hourly block | `GET /api/weather` |
| `sunrise`, `sunset` | Wall-clock daylight window in the city timezone | `GET /api/weather` |
| `hourly[]` | 24-step hourly forecast (`time`, `temperatureC`, `weatherCode`, `description`, `precipitationProbability`, `windKph`, `isDay`) | `GET /api/weather` |
| `daily[]` | 7-day forecast (`date`, `maxC`, `minC`, `weatherCode`, `description`, `precipitationProbabilityMax`, `precipitationMm`, `uvIndexMax`, `windKphMax`, `sunrise`, `sunset`) | `GET /api/weather` |

These are normalised copies of the provider payload; nothing in this table is
persisted. See `docs/integrations.md` §1 for the mapping and the provider
licence terms.

## 4. Validation rules (enforced in the API)

| Field | Rule | Where |
| ----- | ---- | ----- |
| `title`, `name` | Required, trimmed, ≤200 chars | `server/lib/http.js` |
| `content` | Required, trimmed, ≤10,000 chars | `server/lib/http.js` |
| `description` | Optional, ≤5,000 chars | `server/lib/http.js` |
| `location` | Optional, ≤500 chars | `server/lib/http.js` |
| `category` | Must be canonical on create; legacy accepted when editing an existing row | `server/lib/categories.js` |
| `latitude` | Number, −90…90 | `server/lib/http.js`, `server/routes/locations.js` |
| `longitude` | Number, −180…180 | `server/lib/http.js`, `server/routes/locations.js` |
| `limit` | Positive integer, capped (200 default, 500 for map) | `server/lib/http.js` |
| `id` path parameter | Positive safe integer | `server/lib/http.js` |
| Request body | ≤256 KB | `server/index.js` |

> **Known mismatch:** the API accepts `name` up to 200 characters, but
> `services.name` and `service_locations.name` are `varchar(150)`. Names of
> 151–200 characters pass validation and then fail at the database. Align the
> API limit to 150 or widen the columns (schema change requiring approval).
