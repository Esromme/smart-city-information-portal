# Kombolcha Smart City

A full-stack city portal for Kombolcha: public announcements, a directory of city
services, and an interactive map of service locations.

- **Frontend:** React 19 + Vite, Leaflet / OpenStreetMap
- **Backend:** Node.js + Express 5
- **Database:** PostgreSQL (Supabase)

## Features

- **Overview dashboard** with live totals, recent announcements and service coverage by category.
- **Announcements** with category filters, full-text search, publishing and deletion.
- **Services directory** with category filters, search, and add/delete.
- **City map** with colour-coded markers, a searchable place list and add/delete of locations.
- REST API with validation, parameterised queries and consistent JSON errors.
- Responsive layout with skeleton loading states and empty states.

## Getting started

Requirements: Node.js 20+ and the `.env` file described below.

```bash
npm install
npm --prefix client install
npm run seed     # optional: inserts demo content
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:5000/api/health

`npm run dev` starts the API with `node --watch` and the Vite dev server, which
proxies `/api` requests to port 5000.

### Environment variables

Create `.env` in the project root (see `.env.example`):

| Variable        | Required | Description                                              |
| --------------- | -------- | -------------------------------------------------------- |
| `DATABASE_URL`  | yes      | PostgreSQL connection string (Supabase pooler works)     |
| `PORT`          | no       | API port, defaults to `5000`                             |
| `PG_POOL_MAX`   | no       | Postgres pool size, defaults to `5`                      |
| `VITE_API_URL`  | no       | API base URL for the client, defaults to `/api` (proxy)  |

TLS is enabled automatically for non-local hosts.

### Seed data

```bash
npm run seed              # only inserts when the tables are empty
npm run seed -- --reset   # clears the three tables and re-inserts
```

The sample places, descriptions and coordinates are illustrative.

## Production

```bash
npm run build   # builds client/dist
npm start       # Express serves the API and the built client on PORT
```

Open http://localhost:5000.

## API

| Method | Endpoint                    | Description                              |
| ------ | --------------------------- | ---------------------------------------- |
| GET    | `/api/health`               | API + database status                    |
| GET    | `/api/stats`                | Totals and category breakdowns           |
| GET    | `/api/announcements`        | List; `category`, `search`, `limit`      |
| POST   | `/api/announcements`        | Create `{ title, content, category }`    |
| PUT    | `/api/announcements/:id`    | Partial update                           |
| DELETE | `/api/announcements/:id`    | Delete                                   |
| GET    | `/api/services`             | List; `category`, `search`, `limit`      |
| POST   | `/api/services`             | Create `{ name, category, description?, location? }` |
| PUT    | `/api/services/:id`         | Partial update                           |
| DELETE | `/api/services/:id`         | Delete                                   |
| GET    | `/api/service-locations`    | List; `category`, `limit`                |
| POST   | `/api/service-locations`    | Create `{ name, category, latitude, longitude }` |
| PUT    | `/api/service-locations/:id`| Partial update                           |
| DELETE | `/api/service-locations/:id`| Delete                                   |

List responses use `{ "data": [...] , "count": n }`; single records use `{ "data": {...} }`.
Errors return `{ "error": "message" }` with an appropriate status code.

## Project structure

```
kombolcha-smart-city/
├─ server/
│  ├─ index.js              # Express app, static client, error handling
│  ├─ config.js             # env loading, PORT
│  ├─ db.js                 # pg pool + health check
│  ├─ seed.js               # demo data
│  ├─ lib/http.js           # validation helpers, HttpError, asyncRoute
│  └─ routes/               # announcements, services, locations, stats
├─ client/
│  ├─ src/
│  │  ├─ App.jsx            # layout + hash routing
│  │  ├─ api.js             # fetch wrapper
│  │  ├─ hooks.js           # useApi loader hook
│  │  ├─ categories.js      # category labels/colours
│  │  ├─ pages/             # Overview, Announcements, Services, MapPage
│  │  └─ components/        # Sidebar, Modal, forms, CityMap, icons
│  └─ vite.config.js        # dev proxy to :5000
└─ .env                     # local secrets (git-ignored)
```

## Notes

- The database tables (`public.announcements`, `public.services`,
  `public.service_locations`) have RLS enabled. The API connects with the
  `postgres` role, which owns the tables.
- Map tiles are loaded from OpenStreetMap, so the map needs internet access.
- `.env` is git-ignored. Do not commit real database credentials; rotate the
  password if it has been shared in plain text.
- On Windows PowerShell, if `npm` is blocked by the execution policy, use
  `npm.cmd` or set `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
