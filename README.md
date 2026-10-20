# Smart City Information Portal

A full-stack city portal for Kombolcha: public announcements, a directory of city
services, an interactive map of service locations, current weather from
Open-Meteo and a transport directory for residents.

> **Handing the project over or preparing a demonstration?** Start with
> [`docs/HANDOFF_GUIDE.md`](docs/HANDOFF_GUIDE.md), then
> [`docs/database-setup.md`](docs/database-setup.md).

- **Frontend:** React 19 + Vite, Leaflet (MapTiler basemap, OpenStreetMap fallback)
- **Backend:** Node.js + Express 5
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth with an `ADMIN_EMAILS` server-side allowlist

Public visitors browse everything without an account. Only allowlisted
administrators can create, edit or delete content, and the check is enforced on
the server for every write.

## Features

- **Overview dashboard** with live totals, recent announcements and service
  coverage across the five canonical categories.
- **Announcements** as a civic feed: a highlighted latest notice, a responsive
  card feed, a live record count, debounced search, per-category filters with
  counts, newest/oldest ordering, a full-notice reader and admin
  create/edit/delete.
- **Services directory** covering waste, water, transportation, weather and
  emergency, with a live record count, search, per-category result counts,
  accessible category filters and admin CRUD.
- **Transport page** listing transport services and mapped transport points,
  with a clear notice that no real-time data is available.
- **Weather page** showing current conditions, a 24-hour hourly forecast and a
  7-day outlook from Open-Meteo, with insight cards (wind, UV, visibility,
  daylight, precipitation), provider attribution, a loading skeleton and a
  graceful fallback when the provider is unavailable.
- **City map** with colour-coded markers, a searchable place list, a tile-error
  fallback and admin location management.
- REST API with validation, parameterised queries and consistent JSON errors.
- Security headers, a configurable CORS allowlist and in-memory rate limiting.
- **Appearance themes**: Light, Dark and System (follows the OS), persisted in
  `localStorage`, applied across the whole UI including a dark map presentation.
- Automated server and client tests.

## Getting started

Requirements: Node.js 20+.

```bash
npm install
npm --prefix client install

# Configure both environments (see below):
#   .env                (server)
#   client/.env.local   (Vite)

npm run seed     # optional: inserts demo content when tables are empty
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:5000/api/health

`npm run dev` starts the API with `node --watch` and the Vite dev server, which
proxies `/api` requests to port 5000.

### Environment variables

Copy the examples and fill in your own values. Never commit real values.

**Server — `.env`** (from `.env.example`):

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DATABASE_URL` | yes | PostgreSQL connection string (Supabase pooler works). |
| `PORT` | no | API port, defaults to `5000`. |
| `SUPABASE_URL` | for writes | Supabase project URL used to verify tokens. |
| `SUPABASE_PUBLISHABLE_KEY` | for writes | Supabase anon/publishable key used to verify tokens. |
| `ADMIN_EMAILS` | for writes | Comma-separated allowlist of administrator emails. |
| `PG_POOL_MAX` | no | Postgres pool size, defaults to `5`. |
| `CORS_ORIGINS` | no | Comma-separated allowed browser origins. Defaults to local dev origins. |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | no | Rate limit window (ms) and request cap, defaults 60000 / 300. |
| `TRUST_PROXY` | no | Set to `1` only behind a trusted reverse proxy. |
| `WEATHER_ENABLED` | no | Set to `false` to disable live weather without a deploy. |
| `WEATHER_LAT` / `WEATHER_LON` | no | Weather location, defaults to Kombolcha (11.0849, 39.7392). |
| `WEATHER_CACHE_SECONDS` | no | Weather cache window, defaults to `600`. |
| `WEATHER_TIMEOUT_MS` | no | Weather provider timeout, defaults to `8000`. |

If `SUPABASE_URL` or `SUPABASE_PUBLISHABLE_KEY` is missing, public reads still
work but protected writes return `503` instead of crashing the server.

**Client — `client/.env.local`** (from `client/.env.example`):

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `VITE_SUPABASE_URL` | for admin | Must match the server's Supabase project. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | for admin | Must match the server's Supabase project. |
| `VITE_API_URL` | no | API base URL; defaults to `/api` (Vite proxy). |
| `VITE_MAPTILER_KEY` | no | MapTiler basemap key. Empty = OpenStreetMap fallback. |
| `VITE_MAPTILER_STYLE` | no | Light style; defaults to `streets-v4`. |
| `VITE_MAPTILER_STYLE_DARK` | no | Dark style; defaults to `streets-v4-dark`. |

> `VITE_*` variables are read from `client/.env.local`, not from the root `.env`.

### Administrator access

1. Create a user in Supabase Auth and confirm the email.
2. Add that email to `ADMIN_EMAILS` in the server `.env`.
3. Sign in from the **Admin sign in** button in the top bar, then visit the
   **Administration** page.

Verification happens on the server: the API checks the bearer token with
Supabase, requires a confirmed email, and enforces the allowlist. A signed-in
but non-allowlisted account receives `403`.

### Seed data

```bash
npm run seed              # only inserts when the tables are empty
npm run seed -- --reset   # clears the three tables and re-inserts
```

The sample places, descriptions and coordinates are illustrative.

## Service categories

Canonical categories used by new records:

| Id | Label |
| -- | ----- |
| `waste` | Waste |
| `water` | Water |
| `transportation` | Transportation |
| `weather` | Weather |
| `emergency` | Emergency |

Existing rows may still use older values (`transport`, `utilities`, `health`,
`education`, `government`, `community`, `safety`). Nothing was rewritten: the
portal shows those rows under an **Other** filter, and `transport` is treated as
`transportation` because the meaning is identical. A reviewed data migration is
prepared but **not applied** — see `docs/database-migration-plan.md`.

## API

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/api/health` | public | API + database status |
| GET | `/api/auth/me` | admin | Verify the bearer token and allowlist |
| GET | `/api/stats` | public | Totals and canonical category breakdowns |
| GET | `/api/weather` | public | Current weather for Kombolcha (Open-Meteo) |
| GET | `/api/announcements` | public | List; `category`, `search`, `limit` |
| POST | `/api/announcements` | admin | Create `{ title, content, category }` |
| PUT | `/api/announcements/:id` | admin | Partial update |
| DELETE | `/api/announcements/:id` | admin | Delete |
| GET | `/api/services` | public | List; `category`, `search`, `limit` |
| POST | `/api/services` | admin | Create `{ name, category, description?, location? }` |
| PUT | `/api/services/:id` | admin | Partial update |
| DELETE | `/api/services/:id` | admin | Delete |
| GET | `/api/service-locations` | public | List; `category`, `limit` (valid coordinates only) |
| POST | `/api/service-locations` | admin | Create `{ name, category, latitude, longitude }` |
| PUT | `/api/service-locations/:id` | admin | Partial update |
| DELETE | `/api/service-locations/:id` | admin | Delete |

List responses use `{ "data": [...] , "count": n }`; single records use
`{ "data": {...} }`. Errors return `{ "error": "message" }` with an appropriate
status code. Admin requests need `Authorization: Bearer <access_token>`.

Category filters accept the canonical ids, the legacy ids, and `other`
(everything outside the canonical five).

## Testing

```bash
npm test              # server tests, then client tests
npm run test:server   # Vitest (node) + Supertest, mocks the database
npm run test:client   # Vitest (jsdom) + Testing Library
```

Automated tests never touch the hosted database. See `docs/test-plan.md` for the
scenarios, results and response-time observations.

## Production

```bash
npm run build   # builds client/dist
npm start       # Express serves the API and the built client on PORT
```

Open http://localhost:5000.

Before deploying, set `CORS_ORIGINS` to your public origin and make sure the
server `.env` contains `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and
`ADMIN_EMAILS`.

## Documentation

| Document | Contents |
| -------- | -------- |
| `docs/HANDOFF_GUIDE.md` | Setup, demonstration script, architecture, troubleshooting, limitations and pre-demo checklist. |
| `docs/database-setup.md` | Safe reproduction of the schema in a new demo database (Supabase or local PostgreSQL). |
| `docs/sql/` | Baseline schema for a new database and read-only verification queries. |
| `docs/database-migration-plan.md` | Proposed migrations, safety checklist, approval steps (not applied). |
| `docs/migrations/` | The prepared forward and rollback SQL. |
| `docs/erd.md` | Entity relationship diagram and category model. |
| `docs/data-dictionary.md` | Observed vs proposed columns and validation rules. |
| `docs/test-plan.md` | Test approach, automated + manual results, timings. |
| `docs/requirements-traceability-matrix.md` | Every FR/NFR/UI/SI requirement mapped to evidence. |
| `docs/integrations.md` | Weather, transport, maps and their constraints. |

## Project structure

```
kombolcha-smart-city/
├─ server/
│  ├─ index.js              # Express app, security headers, static client, errors
│  ├─ config.js             # env loading, PORT
│  ├─ db.js                 # pg pool + health check
│  ├─ seed.js               # demo data
│  ├─ lib/
│  │  ├─ http.js            # validation helpers, HttpError, asyncRoute
│  │  ├─ categories.js      # canonical/legacy category rules
│  │  └─ rateLimit.js       # in-memory rate limiter
│  ├─ middleware/requireAdmin.js
│  ├─ routes/               # announcements, services, locations, stats, weather
│  └─ test/buildApp.js      # shared app builder for route tests
├─ client/
│  ├─ src/
│  │  ├─ App.jsx            # layout, hash routing, admin session state
│  │  ├─ api.js             # fetch wrapper with bearer tokens
│  │  ├─ categories.js      # canonical categories + legacy display
│  │  ├─ hooks.js           # useApi loader hook
│  │  ├─ theme.js           # light/dark/system theme store + helpers
│  │  ├─ pages/             # Overview, Announcements, Services, Transport, Weather, Map, Admin
│  │  └─ components/        # Sidebar, Modal, forms, CityMap, icons, login, ThemeSelector
│  ├─ .env.example          # Vite client variables
│  └─ vite.config.js        # dev proxy to :5000
├─ docs/                    # handoff, database setup, ERD, dictionary, tests, traceability
│  ├─ HANDOFF_GUIDE.md      # start here for running and demonstrating the project
│  ├─ database-setup.md     # new demo database, step by step
│  └─ sql/                  # baseline schema + verification queries
├─ .env.example             # server variables
└─ vitest.config.js         # server test config
```

## Security notes and limitations

- **RLS observation:** RLS is enabled on all three tables with no policies. The
  API connects as the `postgres` owner role, which bypasses RLS. Direct
  anonymous-key access is denied. No policy changes are included in this work.
- **Weather licence:** the Open-Meteo free tier is for **non-commercial** use
  with CC BY 4.0 attribution and rate limits. Confirm this fits your deployment
  before relying on it. See `docs/integrations.md`.
- **Transport:** no reliable live transport API for Kombolcha was found, so the
  Transport page shows directory data only and says so explicitly. No data is
  fabricated.
- **Map:** the basemap uses MapTiler when `VITE_MAPTILER_KEY` is set in
  `client/.env.local` (Free plan: MapTiler logo + attribution required), and
  otherwise falls back to the OpenStreetMap public tiles. Either way the map
  needs internet access, and attribution is rendered by Leaflet. See
  `docs/integrations.md`.
- **Migrations:** the files under `docs/migrations/` are proposals. They have
  **not** been applied to the hosted database.
- `.env` and `client/.env.local` are git-ignored. Do not commit real credentials;
  rotate the database password if it has been shared in plain text.
- On Windows PowerShell, if `npm` is blocked by the execution policy, use
  `npm.cmd` or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
