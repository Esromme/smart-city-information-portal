# Handoff and demonstration guide

**Smart City Information Portal** — Kombolcha
React + Vite frontend · Express 5 API · Supabase PostgreSQL · Supabase Auth ·
Leaflet/MapTiler · Open-Meteo

This guide is written for the person who will run the project locally and
demonstrate it to an academic advisor. It assumes Windows + PowerShell, but the
commands are the same on macOS/Linux.

---

## 1. What is in this package

| Included | Notes |
| -------- | ----- |
| `client/` | Complete React 19 + Vite frontend, tests, config, favicon. |
| `server/` | Complete Express 5 API, validation, auth middleware, tests, seed script. |
| `docs/` | Handoff guide, database setup, verified schema, ERD, data dictionary, integration notes, test plan, traceability matrix, proposed migrations. |
| `package.json`, `package-lock.json` | Root (server + tooling) manifests with a lockfile. |
| `client/package.json`, `client/package-lock.json` | Frontend manifests with a lockfile. |
| `.env.example`, `client/.env.example` | Placeholders only. |
| `vitest.config.js`, `client/vitest.config.js` | Test configuration. |
| `.gitignore` | Keeps `.env`, `.env.local`, `node_modules` and `dist` out of Git. |

**Deliberately excluded:** `node_modules/`, `client/dist/`, the real `.env` and
`client/.env.local`, any database password, Supabase keys, MapTiler key, real
administrator accounts, `.git/`, editor/agent tooling and OS cache files.

You will receive the real configuration **privately**; it is not in this folder.
The separate private checklist lists exactly what must be supplied outside the
package.

---

## 2. Quick start (about 10 minutes)

```powershell
# 1. Install dependencies
npm install
npm --prefix client install

# 2. Create the two environment files from the examples
Copy-Item .env.example .env
Copy-Item client\.env.example client\.env.local
#    ...then fill in the values described in section 4

# 3. Prepare the database (see docs/database-setup.md)
#    - run docs/sql/000_baseline_schema.sql in a NEW Supabase project
#    - put its connection string in .env as DATABASE_URL

# 4. Insert demo content (only when the tables are empty)
npm run seed

# 5. Start both servers
npm run dev
```

Open <http://localhost:5173>. The API health check is
<http://localhost:5000/api/health>.

To run the production build instead:

```powershell
npm run build
npm start
```

Then open <http://localhost:5000> — Express serves the built frontend and the
API from one process.

---

## 3. Prerequisites (Windows)

1. **Node.js 20 or newer** (verified with Node 25.2.0 / npm 11.6.2).
   Download the LTS installer from <https://nodejs.org>. Verify:

   ```powershell
   node -v
   npm -v
   ```

2. **PowerShell** with network access. If `npm` is blocked by the execution
   policy, use `npm.cmd` or run once:

   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```

3. **A modern browser** (Chrome, Edge or Firefox).
4. **Internet access** for:
   - npm package installation,
   - Open-Meteo weather requests (server-side),
   - map tiles (Leaflet; MapTiler or OpenStreetMap).
5. **A demonstration Supabase project** (Free plan). Required for the database
   and for administrator sign-in.
6. Optional: **MapTiler** account and an origin-restricted key. Without it, the
   map falls back to OpenStreetMap and still works.

No Docker, Python or global CLI tools are required.

---

## 4. Environment configuration

Two files are needed. Both are git-ignored in development. **Never commit real
values.**

### 4.1 Server — `.env` (project root)

Copy `.env.example` to `.env`.

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `DATABASE_URL` | **Yes** | PostgreSQL URI for the demonstration database. |
| `PORT` | No | API port (default `5000`). |
| `SUPABASE_URL` | **Yes for admin** | Project URL used to verify bearer tokens. |
| `SUPABASE_PUBLISHABLE_KEY` | **Yes for admin** | Publishable/anon key used to verify tokens. Never a `service_role` key. |
| `ADMIN_EMAILS` | **Yes for admin** | Comma-separated allowlist. Only these confirmed accounts may write. |
| `PG_POOL_MAX` | No | Connection pool size (default `5`). |
| `CORS_ORIGINS` | No | Comma-separated browser origins. Defaults to localhost:5173/5000. |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | No | In-memory rate limit (default 60 s / 300 requests). |
| `TRUST_PROXY` | No | Set `1` only behind a trusted reverse proxy. |
| `WEATHER_ENABLED` | No | `false` disables the weather endpoint. |
| `WEATHER_LAT`, `WEATHER_LON` | No | Weather coordinates (default Kombolcha 11.0849, 39.7392). |
| `WEATHER_CACHE_SECONDS` | No | Server cache window (default `600`). |
| `WEATHER_TIMEOUT_MS` | No | Provider timeout (default `8000`). |

Without Supabase values, public pages still work but every write returns
`503`. Without `ADMIN_EMAILS`, nobody can administer content.

### 4.2 Client — `client/.env.local`

Copy `client/.env.example` to `client/.env.local`.

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `VITE_SUPABASE_URL` | **Yes for admin** | Must match the server's Supabase project. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Yes for admin** | Must match the server's key. |
| `VITE_API_URL` | No | Defaults to `/api`, proxied by Vite to port 5000. |
| `VITE_MAPTILER_KEY` | No | MapTiler key. Empty = OpenStreetMap fallback. |
| `VITE_MAPTILER_STYLE` | No | Defaults to `streets-v4`. |
| `VITE_MAPTILER_STYLE_DARK` | No | Defaults to `streets-v4-dark`. |

> `VITE_*` values are read by Vite from `client/.env.local` **only**. They are
> baked into the bundle at build time, so change them before `npm run build`,
> not after. Restart the dev server after editing them.

### 4.3 Which parts work with which configuration

| Configuration | Public pages | Admin sign-in | CRUD |
| ------------- | ------------ | ------------- | ---- |
| `DATABASE_URL` only | Yes (except weather needs internet) | No | No |
| `DATABASE_URL` + Supabase server values + `ADMIN_EMAILS` | Yes | Yes, in the API | Yes |
| Also `VITE_SUPABASE_*` | Yes | Yes, in the browser | Yes |
| No `VITE_MAPTILER_KEY` | Map uses OpenStreetMap | — | — |

### 4.4 MapTiler (optional but recommended for the demo)

1. Create a Free-plan key at <https://cloud.maptiler.com/account/keys>.
2. Restrict the key to your origins: `http://localhost:5173`,
   `http://localhost:5000` (and any other demo origin).
3. Set `VITE_MAPTILER_KEY` in `client/.env.local` and restart Vite.
4. Keep the MapTiler logo and attribution — Leaflet renders both; the Free plan
   requires them. Do not remove or obscure them.

Without a key, the map loads OpenStreetMap public tiles and inverts them in dark
mode. Both providers need internet access.

---

## 5. Database setup

Follow **`docs/database-setup.md`** in full. In short:

1. Create a **new** Supabase project (do not reuse production).
2. Run `docs/sql/000_baseline_schema.sql` in the SQL editor.
3. Verify with `docs/sql/verify_schema.sql`.
4. Put the connection string in `.env` as `DATABASE_URL`.
5. Run `npm run seed` (6 announcements, 12 services, 12 locations).

The reference schema, verified read-only on 2026-10-20, has three independent
tables, three primary keys, no foreign keys, no extra indexes and RLS enabled
with no policies. `docs/migrations/001_*` and `002_*` are **proposals** and are
not part of the baseline.

---

## 6. Running the application

### Development (two processes)

```powershell
npm run dev
```

- Vite dev server: <http://localhost:5173>
- Express API: <http://localhost:5000>
- Vite proxies `/api` → `http://localhost:5000`.

You can also run them separately:

```powershell
npm run dev:server
npm run dev:client
```

### Production-style (one process)

```powershell
npm run build
npm start
```

- Open <http://localhost:5000>.
- Express serves `client/dist` and the API.
- `npm start` does not rebuild; run `npm run build` after any frontend change.

Note: `npm --prefix client run preview` serves `dist` but **does not proxy
`/api`**. Use `npm start` for a single-process demo.

---

## 7. Administrator setup and secure access

1. **Create the account** in Supabase: *Authentication → Users → Add user*.
   Use a demonstration address (for example `demo-admin@example.org`), not a
   personal account.
2. **Confirm the email.** The API rejects accounts without a confirmed address.
3. **Allowlist the email** in the root `.env`:

   ```dotenv
   ADMIN_EMAILS=demo-admin@example.org
   ```

   Multiple addresses are comma-separated. Comparison is case-insensitive.
4. **Restart the API** (`Ctrl+C`, then `npm run dev`). `node --watch` watches
   source files, not `.env`.
5. **Set the client values** `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` in `client/.env.local`, then restart Vite.
6. In the portal, click **Admin sign in** in the top bar (or open `#admin`) and
   sign in. The Administration page shows the session, quick links to the three
   management screens and a sign-out button.

How authorization works:

- The browser signs in with Supabase Auth and stores a session.
- Every write sends `Authorization: Bearer <access_token>`.
- The API verifies the token with Supabase, requires `email_confirmed_at`, and
  checks the lower-cased email against `ADMIN_EMAILS`.
- Missing configuration → `503`; missing/invalid token → `401`; signed in but
  not allowlisted → `403`.
- Public visitors never see create/edit/delete controls, and the server enforces
  the same rule even if someone calls the API directly.

Security practices for the demonstration:

- Use a dedicated demo Supabase project and a demo administrator account.
- Never place the database password or a `service_role` key in `client/`.
- Change the demo password after the presentation, or delete the demo user.
- Do not screen-share the `.env` file.
- The publishable/anon key is designed to be public; the password is not.

---

## 8. Tests and production build

```powershell
npm test              # server then client
npm run test:server   # Vitest (node) + Supertest, database mocked
npm run test:client   # Vitest (jsdom) + Testing Library
npm run build         # production bundle in client/dist
```

What the automated tests cover:

- **Server (60 tests):** route validation, category filters and aliases, admin
  authorization (401/403/503), HTTP error shape, rate limiter, weather
  parsing/cache/stale fallback.
- **Client (69 tests):** theme persistence, category helpers, map style
  selection, announcements feed, services directory, transportation page,
  weather page, admin login, app shell.

Tests never touch the hosted database. Weather tests mock `fetch`. Route tests
mock the database module.

The production build is expected to print a **chunk-size warning** for the main
JS bundle (≈680 kB, dominated by React + Leaflet). It is not an error. The build
succeeds.

### Verification performed for this package (2026-10-20)

- The package was copied to a clean temporary folder with **no `.env`, no
  `client/.env.local`, no `node_modules` and no `dist`**.
- `npm ci` installed 174 packages; `npm --prefix client ci` installed 159
  packages — both from the committed lockfiles.
- `npm test` in that clean copy: **8 server files / 60 tests passed** and
  **10 client files / 69 tests passed**.
- `npm run build` in that clean copy: **succeeded** (same chunk-size warning).
- A secret scan of all 87 packaged files found **no real credentials**. The only
  matches were the intentional placeholders `USER:PASSWORD@HOST` in
  `.env.example` and `YOUR-LOCAL-PASSWORD` in `docs/database-setup.md`.
- The reference schema was verified read-only against the original project; the
  baseline SQL was derived from that metadata. It was **not executed** against
  any database as part of packaging, because doing so requires the private demo
  credentials.
- A browser walkthrough was **not** repeated from the clean copy. Run the
  pre-demonstration checklist in section 13 before presenting.

See `docs/test-plan.md` for manual scenarios and the traceability matrix for
requirement coverage.

---

## 9. Demonstration script for the advisor

Suggested length: 12–15 minutes. Everything below reads from the demo database;
nothing is mocked in the UI.

### 9.1 Overview (`#overview`)

- Live totals for announcements, services and mapped places.
- Recent announcements and category coverage.
- Point out that figures come from the API (`/api/stats`), not hardcoded.

### 9.2 Announcements (`#announcements`)

1. The header count comes from the database.
2. The newest notice is highlighted as **Latest announcement** (computed from
   `published_at`, not from array position).
3. Type in the search box (for example `road`) and show the debounced results
   and "Showing N of M" hint.
4. Use a category chip. Explain the canonical categories and that legacy rows
   are grouped under **Other**; `transport` is treated as `transportation`.
5. Change **Newest first / Oldest first**. Note that ordering applies to the
   loaded page (the API always returns newest-first, limit 100).
6. Open **Read more** to show the full notice in an accessible dialog (Escape
   closes it).
7. Reset filters to restore the full feed.

### 9.3 Services (`#services`)

1. Header count and per-category counts come from `/api/stats`.
2. Search by name, description or location.
3. Filter by category; zero-count canonical categories are shown dimmed.
4. Explain that cards only display fields that exist in the database. Contact
   phone, website and opening hours are **not** stored yet (proposed migration
   001), so they are not shown rather than invented.

### 9.4 Transportation (`#transport`)

1. Header count and the "Service listings / Mapped points" metrics are real.
2. Read the **Directory information** notice aloud: there is no live vehicle
   tracking, no arrival estimates and no fares in the data.
3. Search the directory.
4. Show the transport map and its point list. Clicking a point pans the map and
   opens its popup; **Show on map** on a listing does the same when a mapped
   point shares its name.
5. Open the full city map with **Open full map**.

### 9.5 Weather (`#weather`)

1. Current conditions, feels-like, humidity, wind and dew point.
2. 24-hour hourly strip and 7-day outlook.
3. Insight cards: wind, UV, visibility, daylight, precipitation.
4. Attribution: "Weather data by Open-Meteo.com" (CC BY 4.0).
5. If the provider is unreachable, the page shows the last successful reading
   with a stale warning instead of a blank page.

### 9.6 City map (`#map`)

1. Colour-coded markers by category.
2. Search the place list; select a place to pan/open its popup.
3. Switch theme to dark and show the dark basemap.
4. As an administrator, add/edit/delete a location, then undo the change.

### 9.7 Administration (`#admin`)

1. Sign in with the demo administrator account.
2. Show the session panel and quick links.
3. Create an announcement, edit it, then delete it.
4. Sign out and show that public pages hide the management controls again.

### 9.8 Themes and accessibility

- Use the top-bar selector: **Light**, **Dark**, **System**.
- Reload: the preference persists (localStorage key `kombolcha-theme`) with no
  flash of the wrong theme.
- Keyboard: Tab through the search field, category chips, cards and dialogs;
  focus rings are visible; Escape closes dialogs.
- Show the responsive layout by narrowing the window (single-column cards,
  stacked map, compact theme selector).

---

## 10. Architecture overview

```
Browser (React 19 + Vite)
├─ Hash routing (#overview, #announcements, #services, #transport,
│  #weather, #map, #admin)
├─ Supabase JS client ── sign-in only (email + password)
│   └─ access token attached to writes as Bearer
├─ Leaflet + MapTiler (or OSM fallback) ── map tiles
└─ fetch('/api/...')
        │  (Vite dev proxy → :5000)
        ▼
Express 5 API (:5000)
├─ security headers, CORS allowlist, JSON 256 kB limit,
│  in-memory rate limit, Cache-Control: no-store
├─ requireAdmin ── verifies the bearer token with Supabase,
│                  confirmed email + ADMIN_EMAILS allowlist
├─ pg Pool (DATABASE_URL)  ── SQL, parameterised queries
├─ /api/weather ── Open-Meteo (server-side, 10-min cache,
│                  timeout + last-good fallback)
└─ serves client/dist when built
        ▼
Supabase PostgreSQL (public.announcements, public.services,
                     public.service_locations; RLS on, no policies)
```

Key design points:

- **No database access from the browser.** All reads/writes go through the API.
- **Two independent integrations:** weather is fetched server-side with no key;
  map tiles are fetched by the browser.
- **Category model:** five canonical ids (`waste`, `water`, `transportation`,
  `weather`, `emergency`) plus a UI-only **Other** group for legacy values;
  `transport` is an accepted alias for `transportation`. The API normalises on
  create and preserves legacy values when editing existing rows.
- **Theming:** CSS custom properties with `[data-theme]`; the theme is applied by
  a small bootstrap script in `client/index.html` before React mounts.
- **No live transport feed:** the page is a directory and states that clearly.

### Data model

```
announcements              services                 service_locations
─────────────              ────────                 ─────────────────
id (PK)                    id (PK)                  id (PK)
title varchar(200)         name varchar(150)        name varchar(150)
content text               category varchar(50)     category varchar(50)
category varchar(50)       description text         latitude float8
published_at timestamptz   location text            longitude float8
                           created_at timestamptz   created_at timestamptz
```

No foreign keys. `services` and `service_locations` are aligned in the UI by
name; this is a display convenience, not a stored relationship.

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `npm` is not recognised / blocked | PowerShell execution policy or PATH | Use `npm.cmd`, reopen the terminal, or set `RemoteSigned`. |
| `[db] DATABASE_URL is missing` | No `.env` in the project root | Copy `.env.example` → `.env`. |
| API returns `503` on writes | Supabase env values missing, or `ADMIN_EMAILS` empty | Fill both in `.env`; restart the API. |
| Sign-in works but writes return `401` | Client and server use different Supabase projects | Make `VITE_SUPABASE_URL` match `SUPABASE_URL`. |
| Writes return `403` | Email not allowlisted or not confirmed | Add the exact email to `ADMIN_EMAILS`; confirm the address. |
| Sign-in fails in the browser | Missing `client/.env.local` values | Add `VITE_SUPABASE_*` and restart Vite. |
| Weather card shows an error/stale notice | No outbound internet, provider outage or rate limit | Check `WEATHER_ENABLED`, connectivity and server logs; the last good reading is shown when available. |
| Map is grey/blank | No internet, blocked tiles, or a restricted MapTiler key | Open the browser console; the map shows a fallback banner on tile errors. Check the key's origin allowlist. |
| Map is light in dark mode | MapTiler dark style is misconfigured, or OSM fallback inversion is disabled | Use the default styles or clear `VITE_MAPTILER_STYLE_DARK`. |
| `EADDRINUSE` on 5000/5173 | Another process is using the port | Stop it, or change `PORT` and the Vite proxy target together. |
| `npm run seed` says tables contain data | Seed is intentionally non-destructive | Use `npm run seed -- --reset` (demo database only). |
| `vite preview` shows API 404s | Preview does not proxy `/api` | Use `npm start` after `npm run build`. |
| Too many `429` responses | Rate limit hit during rapid testing | Wait for the window, or raise `RATE_LIMIT_MAX`. |
| Windows Firewall prompt | Node is listening on a port | Allow private networks for local testing. |
| Fresh clone cannot install | Network/proxy or Node too old | Use Node 20+, check the proxy, delete `node_modules` and retry. |

---

## 12. Known limitations and open items

These are documented so the advisor sees an honest scope, not hidden gaps.

1. **No live transportation data.** No reliable free live feed for Kombolcha was
   found. The page shows directory listings and mapped points only, and says so.
   There are no fabricated ETAs, fares, vehicle positions or schedules.
2. **No contact/website/opening-hours columns.** Migration 001 is prepared but
   **not applied**. Service cards therefore do not show contact details.
3. **Legacy categories remain in the data.** `transport`, `utilities`, `health`,
   `education`, `government`, `community` and `safety` are displayed under their
   legacy labels or **Other**. Migration 002 (normalisation) is prepared but not
   applied.
4. **Name length mismatch.** The API accepts service/location names up to 200
   characters, but the columns are `varchar(150)`. A 151–200 character name will
   pass validation and then fail at the database. Recommend aligning the API
   limit to 150 or raising the column to `varchar(200)` (a schema change needing
   approval).
5. **Announcement ordering is client-side over the loaded page.** The API always
   returns newest-first with a limit of 100; the Oldest-first option re-sorts
   only the loaded set.
6. **No server-side sorting for services.** The list is alphabetical
   (name ascending) and capped at 100 rows by default.
7. **Weather is non-commercial.** Open-Meteo's free tier is for non-commercial
   use with CC BY 4.0 attribution. Confirm the deployment context.
8. **MapTiler Free plan** requires the MapTiler logo and attribution; respect the
   plan limits and keep the key origin-restricted.
9. **RLS has no policies.** The API uses the owner role. This is deliberate and
   unchanged; adding policies is future work.
10. **Rate limiting and weather caching are in-memory.** Each API process has its
    own window/cache; multiple instances would not share state.
11. **No pagination or full-text search.** Search uses `ILIKE` and capped lists,
    which is adequate for the current data volume.
12. **Single city.** The weather coordinates and map centre are configured for
    Kombolcha.
13. **No i18n or offline mode.** The UI is English-only and needs network access
    for weather and map tiles.
14. **No audit log.** `updated_at` tracking is proposed in migration 001 but not
    applied.

---

## 13. Pre-demonstration checklist

Configuration:

- [ ] Demo Supabase project created; baseline SQL run; verification queries pass.
- [ ] `npm run seed` completed (6 / 12 / 12 rows).
- [ ] Root `.env` filled: `DATABASE_URL`, `SUPABASE_URL`,
      `SUPABASE_PUBLISHABLE_KEY`, `ADMIN_EMAILS`.
- [ ] `client/.env.local` filled with the matching `VITE_SUPABASE_*` values.
- [ ] Optional: `VITE_MAPTILER_KEY` set and origin-restricted.
- [ ] Demo administrator user created and confirmed.
- [ ] API restarted after the last `.env` change; Vite restarted after the last
      `client/.env.local` change.

Application:

- [ ] `npm test` passes (server 60, client 69).
- [ ] `npm run build` succeeds.
- [ ] `npm run dev` opens <http://localhost:5173> without console errors.
- [ ] `/api/health` returns `status: ok` and the database name.
- [ ] All seven screens load: Overview, Announcements, Services, Transport,
      Weather, Map, Administration.
- [ ] Weather shows live data (internet available).
- [ ] Map tiles load in light and dark themes.
- [ ] Admin sign-in works; a test create/edit/delete succeeds; test record
      removed afterwards.

Presentation:

- [ ] Light, Dark and System themes checked; preference persists after reload.
- [ ] Responsive layout checked by narrowing the window.
- [ ] Search, filters, sorting, dialogs and reset actions checked.
- [ ] Browser zoom at 100 %, notifications muted, `.env` never on screen.
- [ ] Screenshots or a screen recording captured as a fallback for network
      failures.
- [ ] Known-limitations list ready (section 12), especially the transport notice.
