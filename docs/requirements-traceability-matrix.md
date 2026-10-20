# Requirements traceability matrix

Every requirement id comes from `Project 1 Documents 3.pdf` §2.4–§2.5.
Status values:

- **Implemented** — present in the running code and verified (tests or manual checks).
- **Partial** — present but with a documented limitation.
- **Deviation** — implemented differently from the wording, by an approved decision.
- **Not applicable** — no runtime behaviour to map (hardware/development constraints).

Evidence paths are relative to the repository root.

## Functional requirements

| ID | Requirement (abridged) | Status | Evidence |
| -- | ---------------------- | ------ | -------- |
| FR-01 | Web-browser access to the portal | Implemented | `client/src/App.jsx`, `server/index.js`; TC-01 |
| FR-02 | Display the defined service categories | Implemented | `client/src/categories.js`, `server/lib/categories.js`; `categories.test.js` |
| FR-03 | Show a category's information when selected | Implemented | Filter chips in `Announcements.jsx`, `Services.jsx`, `MapPage.jsx`; services and announcements chips show live per-category counts from `api.stats()`; TC-03 |
| FR-04 | Organised, easy-to-read service information | Implemented | Cards/panels and skeletons across `client/src/pages/`; redesigned services directory (header count, search, category filters, service cards) in `Services.jsx`; redesigned announcements feed (highlighted latest notice, card feed, search, filters, ordering) in `Announcements.jsx` |
| FR-05 | Message when a category has no information | Implemented | `EmptyState.jsx` used by all list pages; TC-03 |
| FR-06 | Waste management information | Implemented | `waste` canonical category in API/UI; content depends on admin input |
| FR-07 | Water supply information | Implemented | `water` canonical category; legacy water rows visible under "Other" until migration 002 |
| FR-08 | Transportation information | Implemented | `transportation` category + `client/src/pages/Transport.jsx` |
| FR-09 | Emergency services and contacts | Partial | `emergency` category and admin CRUD work; structured contact fields are proposed in migration 001 and not applied |
| FR-10 | Admins can add service information | Implemented | POST routes + create forms; `announcements.test.js`, `locations.test.js` |
| FR-11 | Admins can update service information | Implemented | PUT routes + edit forms (`Forms.jsx`, `api.js`); `announcements.test.js` |
| FR-12 | Admins can manage in-scope service information | Implemented | Full CRUD for announcements, services and locations |
| FR-13 | Prevent invalid/incomplete required data | Implemented | `server/lib/http.js`, `server/lib/categories.js`; `http.test.js` |
| FR-14 | Identify the affected input and show a message | Partial | API returns field-specific messages; the UI shows them at form level rather than per field |
| FR-15 | Relevant updates for urban services | Implemented | Announcements module |
| FR-16 | Admins add/update service updates | Implemented | POST/PUT announcements + forms |
| FR-17 | Updates displayed in an organised manner | Implemented | `Announcements.jsx` grid with search and filters |
| FR-18 | Inform when no update is available | Implemented | Empty states in `Announcements.jsx` |
| FR-19 | Map-based information where geography exists | Implemented | `CityMap.jsx`, `MapPage.jsx`, `locations.js` |
| FR-20 | View service locations through the map | Implemented | `#map` page, markers, place list; TC-04 |
| FR-21 | Obtain map/location information via the selected map service | Deviation | Leaflet with a MapTiler basemap (OpenStreetMap fallback) instead of Google Maps (approved); `CityMap.jsx`, `mapStyle.js` |
| FR-22 | Error message when the map service is unavailable | Implemented | Tile-error overlay in `CityMap.jsx`; API error alerts |
| FR-23 | Handle invalid location data without breaking the portal | Implemented | Range checks in `locations.js` and `CityMap.jsx`; `locations.test.js` |
| FR-24 | Integrate an external weather service | Implemented | `server/routes/weather.js`, `client/src/pages/Weather.jsx`; current conditions, 24 h hourly and 7-day forecast; `weather.test.js`, `Weather.test.jsx` |
| FR-25 | Integrate external transportation information where included | Partial | Maintained directory with an explicit "no real-time data" notice; no live provider identified (`docs/integrations.md`) |
| FR-26 | Request and display external information appropriately | Implemented | Weather normalised server-side before display; unsupported metrics are omitted, never invented (`Weather.test.jsx`) |
| FR-27 | Notify when an external service is unavailable | Implemented | Weather `502`/stale handling; UI messages |
| FR-28 | Do not treat invalid external responses as reliable | Implemented | Normalisation + non-OK/provider-error handling; `weather.test.js` |
| FR-29 | Access to emergency information and resources | Partial | Emergency services visible and filterable; structured contacts deferred (migration 001) |
| FR-30 | Organise emergency information | Partial | Same as FR-29 |
| FR-31 | Admins maintain emergency information | Implemented | Services CRUD covers the `emergency` category |
| FR-32 | Indicate when emergency information is unavailable | Implemented | Empty states on services/map |
| FR-33 | Administrative access for authorized admins | Implemented | Supabase Auth + `ADMIN_EMAILS`; `requireAdmin.js` |
| FR-34 | Restrict administrative functions to authorized users | Implemented | Server middleware on every write; `requireAdmin.test.js` |
| FR-35 | Admins manage in-scope information | Implemented | CRUD routes |
| FR-36 | Deny unauthorized access with a message | Implemented | `401`/`403` responses; `requireAdmin.test.js`; TC-08, TC-09 |
| FR-37 | Validate admin input before storing | Implemented | `http.js`, `categories.js`; route tests |
| FR-38 | Store portal information in the database | Implemented | `server/db.js`, route SQL |
| FR-39 | Retrieve stored information on request | Implemented | GET routes; TC-11, TC-12 |
| FR-40 | Update stored information on a valid change | Implemented | PUT routes; `announcements.test.js` |
| FR-41 | Error message when data cannot be retrieved | Implemented | API JSON errors + UI alerts |
| FR-42 | Consistency between stored and displayed data | Implemented | Single source of truth; stats canonicalisation; `stats.test.js` |
| FR-43 | Validate user input where required | Implemented | Client-side checks + server validation |
| FR-44 | Understandable error messages | Implemented | Consistent `{ error }` payloads; TC-10 |
| FR-45 | Do not save invalid or incomplete information | Implemented | Validation before SQL; route tests |
| FR-46 | Handle DB/external failures without terminating the app | Implemented | Central error handler, weather fallback, rate limiter; `weather.test.js` |
| FR-47 | Inform users when information is temporarily unavailable | Implemented | Weather and map messages; TC-17 |
| FR-48 | Avoid showing invalid external data as valid | Implemented | Weather normalisation and `stale` flag |

## Non-functional requirements

| ID | Requirement (abridged) | Status | Evidence |
| -- | ---------------------- | ------ | -------- |
| NFR-01 | Meet the response-time target in the test plan | Implemented | `docs/test-plan.md` §7 (target ≤ 2000 ms) |
| NFR-02 | Retrieve/display stored data without unnecessary delay | Implemented | Indexed primary keys, limited queries; timings in test plan |
| NFR-03 | External calls do not delay the rest of the portal | Implemented | 8 s weather timeout, 10 min cache, separate route |
| NFR-04 | Evaluated against documented test conditions | Implemented | `docs/test-plan.md` |
| NFR-05 | Clear, understandable UI | Implemented | Consistent layout, labels and empty states |
| NFR-06 | Organise information to avoid unnecessary steps | Implemented | Sidebar navigation, filters and search |
| NFR-07 | Main functions need no specialised knowledge | Implemented | Public pages require no account |
| NFR-08 | Clear error and status messages | Implemented | Alerts, `role="alert"`, `role="status"` |
| NFR-09 | Consistency between stored and displayed information | Implemented | FR-42 evidence |
| NFR-10 | Handle failures without terminating the portal | Implemented | `rateLimit.test.js`, weather fallback, error handler |
| NFR-11 | Do not present invalid external data as reliable | Implemented | Weather normalisation tests |
| NFR-12 | Tested using documented test cases | Implemented | `docs/test-plan.md` §5–§6 |
| NFR-13 | Restrict administrative functions | Implemented | `requireAdmin.test.js` |
| NFR-14 | Prevent unauthorized modification | Implemented | Auth gate on all writes; TC-08 |
| NFR-15 | Validate before storing | Implemented | Route tests |
| NFR-16 | Require authentication for protected functions | Implemented | `requireAdmin.test.js` |
| NFR-17 | Present information accurately from source data | Implemented | No fabricated data; `other` grouping is honest labelling |
| NFR-18 | Avoid presenting incomplete/invalid data as accurate | Implemented | Validation + empty states |
| NFR-19 | Process external data before presenting | Implemented | Weather mapping |
| NFR-20 | Consider accuracy during testing | Implemented | `docs/test-plan.md` |
| NFR-21 | Accessible via browser when services are available | Implemented | TC-01 |
| NFR-22 | Continue non-dependent functions when external service is down | Implemented | Weather outage does not affect other pages; TC-17 |
| NFR-23 | Clearly indicate unavailable external information | Implemented | Stale/`502` messaging |
| NFR-24 | Maintain without unrelated changes | Implemented | Modular routes, components and shared helpers |
| NFR-25 | Admins maintain in-scope information | Implemented | CRUD routes + admin page |
| NFR-26 | Support future modification | Implemented | Documented migration plan and integration points |
| NFR-27 | Web-based application | Implemented | React + Express |
| NFR-28 | Operate within the selected environment | Implemented | Node + PostgreSQL/Supabase |
| NFR-29 | Use external services per their interfaces | Implemented | Open-Meteo documented usage; OSM attribution |

## Interface requirements

| ID | Requirement (abridged) | Status | Evidence |
| -- | ---------------------- | ------ | -------- |
| UI-01 | Web-based UI accessible via browser | Implemented | `client/` |
| UI-02 | Dashboard for main service categories | Implemented | `Overview.jsx` coverage panel |
| UI-03 | Clear navigation between sections | Implemented | `Sidebar.jsx` |
| UI-04 | Organised, understandable information | Implemented | Cards, filters, search; data-driven services directory in `Services.jsx`; data-driven announcements feed in `Announcements.jsx`; `Services.test.jsx`, `Announcements.test.jsx` |
| UI-05 | Input fields/controls for admins | Implemented | `Forms.jsx`, `AdminPage.jsx`; `Announcements.test.jsx` |
| UI-06 | Clear messages when unavailable/invalid | Implemented | Alerts, empty states and retry actions; weather loading skeleton/error/stale states (`Weather.test.jsx`); services skeletons, empty state with filter reset, error + retry (`Services.test.jsx`); announcements skeletons, empty state with filter reset, error + retry (`Announcements.test.jsx`) |
| UI-07 | Consistent layout across sections | Implemented | Shared `styles.css` |
| UI-08 | Access to map-based information | Implemented | `#map`, `#transport` |
| SI-01 | React.js frontend | Implemented | `client/package.json` |
| SI-02 | Frontend talks to the Node.js backend | Implemented | `client/src/api.js` |
| SI-03 | Backend talks to PostgreSQL | Implemented | `server/db.js` |
| SI-04 | Communicate with the Google Maps API | Deviation | Leaflet kept by decision; MapTiler basemap with OpenStreetMap fallback; `docs/integrations.md` |
| SI-05 | Communicate with weather/transport APIs where included | Partial | Weather implemented; transport has no live provider |
| SI-06 | Handle unavailable/invalid external responses | Implemented | `weather.test.js` |
| SI-07 | Deployed portal accessible via browser | Implemented | `server/index.js` static serving + `npm run build` |
| SI-08 | Components operate within the defined environment | Implemented | Node + Supabase |
| HI-01–HI-05 | Device, resources, network and environment constraints | Not applicable | Development/deployment constraint, not runtime code |

## Summary of open items

| Item | Type | Where tracked |
| ---- | ---- | ------------- |
| Structured emergency/service contact fields | Requires migration approval | `docs/migrations/001_add_contact_and_audit_fields.sql` |
| Legacy category remap (`transport`, water office) | Requires data approval | `docs/migrations/002_normalize_legacy_categories.sql` |
| No live transport provider | Product limitation, documented | `docs/integrations.md` |
| Google Maps vs Leaflet/MapTiler | Approved deviation | `docs/integrations.md`, `docs/erd.md` |
| Field-level validation messages in forms | UI improvement | FR-14 status |
| Services directory sorting | Deferred (no server-side sort parameter) | `Services.jsx` keeps the API's name order |
| Announcement ordering | Client-side (`newest` / `oldest`) over the loaded page | The API always returns newest first; ordering applies to the records returned by the list endpoint |
