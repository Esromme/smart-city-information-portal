# Test plan and results

**Status:** executed. All automated tests pass and the manual scenarios below
were run against the local development environment on 2026-10-19.

## 1. Scope

Covers the functionality required by `Project 1 Documents 3.pdf` §2.4–§2.5:
public browsing, service information, service updates, map-based information,
weather/transportation information, emergency resources, administrative access,
data retrieval and storage, and error handling.

Out of scope: load/performance testing at scale, penetration testing, and any
test that would write to the hosted Supabase database.

## 2. Environment

| Item | Value |
| ---- | ----- |
| OS | Windows |
| Node.js | v25.2.0 |
| API | `http://localhost:5000` (Express 5) |
| Web | `http://localhost:5173` (Vite) |
| Database | Hosted Supabase PostgreSQL (read-only during tests) |
| Server test runner | Vitest 4 (node environment) + Supertest |
| Client test runner | Vitest 4 (jsdom) + Testing Library |

## 3. How to run

```bash
npm test              # server tests, then client tests
npm run test:server   # Vitest, server/**/*.test.js
npm run test:client   # Vitest in client/, src/**/*.test.{js,jsx}
```

## 4. Data safety

- Automated route tests **mock the database** (`vi.mock('../db.js')`); they never
  connect to Supabase.
- Manual checks used `GET` requests and browser navigation only. No create,
  update or delete was performed against the hosted database.
- No migration was applied.

## 5. Automated test results

Executed 2026-10-20 (verified again from a clean copy of the handoff package):
**8 server files / 60 tests passed**, **10 client files / 69 tests passed**
(129 total).

| File | What it covers | Requirements |
| ---- | -------------- | ------------ |
| `server/lib/http.test.js` | Validation helpers, limits, error types, async wrapper | FR-13, FR-14, FR-37, FR-43–FR-45 |
| `server/lib/categories.test.js` | Canonical categories, legacy handling, `other` grouping, stats mapping | FR-02, FR-06–FR-09 |
| `server/lib/rateLimit.test.js` | Request limiting and window reset | NFR-10 |
| `server/middleware/requireAdmin.test.js` | 401 no/invalid token, 403 unconfirmed, 403 non-allowlisted, 200 allowlisted, 503 misconfiguration | FR-33, FR-34, FR-36, NFR-13–NFR-16 |
| `server/routes/announcements.test.js` | Public list, category filters, create/update/delete, auth gate, validation | FR-15–FR-18, FR-43–FR-45 |
| `server/routes/locations.test.js` | Coordinate validation, category alias, auth gate | FR-19–FR-23 |
| `server/routes/stats.test.js` | Canonical aggregation of legacy values | FR-02, FR-42 |
| `server/routes/weather.test.js` | Provider mapping, caching, 502 fallback, stale reading, disabled mode | FR-24, FR-26–FR-28, NFR-11, NFR-23 |
| `client/src/App.test.jsx` | App shell renders the theme selector for public and administrator sessions | UI-04, FR-34 |
| `client/src/categories.test.js` | Five canonical areas, legacy edit option, filter mapping | FR-02, FR-03 |
| `client/src/theme.test.js` | Light/dark/system resolution, persistence, OS-change following | UI-04, NFR-08 |
| `client/src/mapStyle.test.js` | MapTiler vs OpenStreetMap selection, dark style, 256px tiles | FR-19, FR-20, SI-04 |
| `client/src/components/ThemeSelector.test.jsx` | Accessible theme options, applied/persisted selection | UI-04 |
| `client/src/components/AdminLogin.test.jsx` | Login success and error messaging | FR-33, NFR-08 |
| `client/src/pages/Announcements.test.jsx` | Live count, featured notice, previews, search, category filter, ordering, reader dialog, empty/error states, admin gating | FR-15–FR-18, UI-05, UI-06 |
| `client/src/pages/Services.test.jsx` | Live count, category filters, search, records without optional fields, empty/error states, admin CRUD | FR-06–FR-12, UI-05 |
| `client/src/pages/Transport.test.jsx` | Directory count, mapped points, map selection, search/reset, error state, no-live-data notice | FR-08, FR-19–FR-23 |
| `client/src/pages/Weather.test.jsx` | Loading skeleton, current/insights/daily rendering, retry, empty state, stale flag, last reading kept on refresh failure | FR-24–FR-28 |

Command output (abridged, from the clean package copy):

```text
server: Test Files 8 passed (8) | Tests 60 passed (60)
client: Test Files 10 passed (10) | Tests 69 passed (69)
```

## 6. Manual scenarios

| ID | Scenario | Steps | Expected | Result |
| -- | -------- | ----- | -------- | ------ |
| TC-01 | Public browses without login | Open `#overview`, `#announcements`, `#services`, `#transport`, `#weather`, `#map` | All pages render; no login prompt | Pass |
| TC-02 | Public sees no write controls | Inspect announcements/services/map as anonymous | No create, edit or delete controls; no "New announcement" / "Add service" / "Add location" | Pass |
| TC-03 | Category filters | Open announcements and services | Chips: All, Waste, Water, Transportation, Weather, Emergency, Other | Pass |
| TC-04 | Map place search | Type a place name on `#map` | List filters by name; no search on other pages needed | Pass |
| TC-05 | Weather live data | Open `#weather` | Temperature, conditions, wind, humidity and Open-Meteo attribution render | Pass |
| TC-06 | Transport directory | Open `#transport` | Bus station listed; explicit "no real-time data" notice shown | Pass |
| TC-07 | Admin entry for public | Open `#admin` while signed out | Sign-in form shown; no admin content | Pass |
| TC-08 | Anonymous write rejected | `GET /api/auth/me`; `POST /api/announcements` without token | `401` with `WWW-Authenticate: Bearer` | Pass |
| TC-09 | Invalid token rejected | `GET /api/auth/me` with `Bearer not-a-real-token` | `401` | Pass |
| TC-10 | Invalid category rejected | `GET /api/announcements?category=not-real` | `400` with a clear message | Pass |
| TC-11 | Legacy category alias | `GET /api/services?category=transportation` | Returns the bus station stored as `transport` | Pass |
| TC-12 | Legacy visibility | `GET /api/announcements?category=other` | Returns records that do not map to the canonical five | Pass |
| TC-13 | Canonical statistics | `GET /api/stats` | `transport` counted under `transportation`; other legacy values under `other` | Pass |
| TC-14 | Security headers | Inspect any API response | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control: no-store` present | Pass |
| TC-15 | Invalid coordinates | Submit a location with latitude 120 (unit test) | Rejected with `400` | Pass (automated) |
| TC-16 | Non-allowlisted account | Confirmed user not in `ADMIN_EMAILS` (unit test) | `403` | Pass (automated) |
| TC-17 | Weather provider down | Mock fetch rejection (unit test) | `502`, or stale reading flagged `stale: true` | Pass (automated) |

## 7. Response-time observations (NFR-01, NFR-02, NFR-04)

Documented target for the development environment under normal single-user load:
**≤ 2000 ms** per stored-data request.

| Endpoint | Time | Status |
| -------- | ---- | ------ |
| `GET /api/health` | 0.37 s | Pass |
| `GET /api/announcements?limit=20` | 0.24 s | Pass |
| `GET /api/services?limit=20` | 0.23 s | Pass |
| `GET /api/service-locations` | 0.29 s | Pass |
| `GET /api/stats` | 1.74 s | Pass (6 parallel queries; slowest) |
| `GET /api/weather` | 1.10 s | Pass |

These figures include latency to the hosted Supabase pooler and are not a
benchmark. `NFR-03` (external calls not delaying the rest of the portal) is
addressed by the 8-second timeout and 10-minute cache on the weather route.

## 8. Known gaps and limitations

- No live transportation provider is integrated, so FR-25 is satisfied by a
  maintained directory with a clear "not real-time" notice rather than live
  data. See `docs/integrations.md`.
- The weather free tier is non-commercial only; see `docs/integrations.md`.
- Contact/phone fields required for richer emergency information are proposed in
  `docs/migrations/001_add_contact_and_audit_fields.sql` but not applied, so
  FR-09/FR-29 currently rely on free-text descriptions.
- RLS policies are not defined; the API relies on the owner role. This is
  unchanged and documented as an observation.
- Load testing, cross-browser matrix testing and accessibility audits beyond the
  built-in checks were not performed.
