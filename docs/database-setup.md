# Database setup for a demonstration environment

This guide creates a **separate** database for demonstrating the portal. It
never points at the original Supabase project and never copies production rows.

- Reference schema (verified read-only on 2026-10-20): `docs/data-dictionary.md`
- Baseline SQL: `docs/sql/000_baseline_schema.sql`
- Verification SQL: `docs/sql/verify_schema.sql`
- Demo content: `npm run seed` (illustrative sample data in `server/seed.js`)

> **Do not apply** `docs/migrations/001_*` or `002_*` to reproduce the schema.
> They are proposals that change the *existing* database; they are not a
> from-scratch schema and are not present in the reference project.

## 1. What the reference database actually contains

| Table               | Rows (reference) | Primary key | Relationships |
| ------------------- | ---------------- | ----------- | ------------- |
| `public.announcements`     | 6  | `id` bigint identity | none |
| `public.services`          | 12 | `id` bigint identity | none |
| `public.service_locations` | 12 | `id` bigint identity | none |

Verified facts:

- `announcements`: `id`, `title varchar(200) not null`, `content text not null`,
  `category varchar(50) not null`, `published_at timestamptz default now()`.
- `services`: `id`, `name varchar(150) not null`, `category varchar(50) not null`,
  `description text`, `location text`, `created_at timestamptz default now()`.
- `service_locations`: `id`, `name varchar(150) not null`,
  `category varchar(50) not null`, `latitude double precision`,
  `longitude double precision`, `created_at timestamptz default now()`.
- Only primary-key constraints and indexes exist. No foreign keys, unique
  constraints, check constraints or triggers.
- RLS is enabled on all three tables with **zero policies**.
- Existing category values use a mix of canonical and legacy ids (see
  `docs/data-dictionary.md`). The application handles both.

## 2. Option A — new Supabase project (recommended)

This is the closest reproduction of the reference environment and also supplies
Supabase Auth for administrator sign-in.

1. Create a new project at <https://supabase.com/dashboard> (Free plan is
   enough for a demonstration).
2. Wait for the database to finish provisioning.
3. Open **Project Settings → Database → Connection string** and copy the **URI**
   form. Prefer the **Session pooler** host if your network is IPv4-only; the
   direct host may resolve to IPv6 only.
4. Replace the password placeholder with the database password you set when
   creating the project. Percent-encode special characters in the password
   (`@` → `%40`, `#` → `%23`, `:` → `%3A`).
5. In **SQL Editor**, paste the whole of `docs/sql/000_baseline_schema.sql` and
   run it.
6. Run `docs/sql/verify_schema.sql`. Expected: three tables, three primary keys,
   three primary-key indexes, RLS enabled, no policies.
7. Put the connection string in the root `.env` as `DATABASE_URL`.
8. Insert demo content:

   ```powershell
   npm run seed
   ```

   This inserts 6 announcements, 12 services and 12 locations. It refuses to run
   when the tables already contain data; `npm run seed -- --reset` clears and
   re-inserts **the three portal tables only**.

9. Run `docs/sql/verify_schema.sql` again. Expected counts: 6 / 12 / 12.

> The API connects with the `postgres` role from `DATABASE_URL`. That role owns
> the tables and bypasses RLS. If you connect with a different, non-owner role,
> the API will return zero rows or permission errors because no policies exist.
> Either use the `postgres` connection string (as above) or grant that role
> `bypassrls` explicitly.

## 3. Option B — local PostgreSQL for data + Supabase for Auth

You can run the database locally and still use Supabase Auth:

1. Install PostgreSQL 15+ locally and create a database.
2. Run `docs/sql/000_baseline_schema.sql` with `psql`:

   ```powershell
   psql "postgresql://postgres:YOUR-LOCAL-PASSWORD@localhost:5432/smart_city" `
     -f docs/sql/000_baseline_schema.sql
   ```

3. Set `DATABASE_URL` to the local URL. The server automatically disables SSL
   for `localhost`/`127.0.0.1` (`server/db.js`).
4. Keep `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `ADMIN_EMAILS` pointing at
   a Supabase project so administrator sign-in still works.
5. Run `npm run seed`.

Local PostgreSQL alone is **not** enough: there is no local auth flow in the
application, so administrator sign-in requires Supabase Auth.

## 4. Supabase Auth for administrators

1. In your Supabase project, open **Authentication → Users → Add user**.
2. Use a demonstration email address (for example `demo-admin@example.org`) and
   a strong password. Do not reuse personal credentials.
3. If email confirmation is enabled, confirm the address (the API rejects
   unconfirmed accounts).
4. Add the same address to `ADMIN_EMAILS` in the root `.env`
   (comma-separated, case-insensitive).
5. Restart the API so it reloads `.env` (`node --watch` does not watch `.env`).
6. Set the matching `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in
   `client/.env.local`, then restart the Vite dev server.

The publishable/anon key is intentionally public. The **database password** and
any `service_role` key are secrets and must never be placed in `client/`.

## 5. Safety rules

- Use a dedicated demonstration project. Do not reuse production credentials.
- Never run `npm run seed -- --reset` against the reference/production database:
  it truncates the three portal tables.
- Do not apply `docs/migrations/001_*` or `002_*` without written approval; they
  alter data and schema in an existing database.
- Keep `.env` and `client/.env.local` out of source control (they are
  `.gitignore`d).
- If the database password has ever been shared in plain text, rotate it in
  Supabase before the demonstration.

## 6. Common database errors

| Message | Likely cause | Fix |
| ------- | ------------ | --- |
| `[db] DATABASE_URL is missing` | No root `.env`, or wrong working directory | Create `.env` from `.env.example`; start commands from the project root. |
| `password authentication failed` | Wrong password or unencoded special character | Reset the database password; percent-encode it in the URI. |
| `getaddrinfo ENOTFOUND` / timeout | Direct connection is IPv6-only on your network | Use the Session pooler connection string. |
| `relation "public.announcements" does not exist` | Baseline SQL not run, or run in another project/schema | Run `000_baseline_schema.sql` in the target project. |
| API returns `[]` but rows exist | API role is not the owner and RLS has no policies | Use the `postgres` connection string or grant `bypassrls`. |
| `self-signed certificate` | Remote host with strict TLS | The server already uses `rejectUnauthorized: false` for non-local hosts; confirm the host is not `localhost`. |
| `duplicate key value violates unique constraint` | Identity sequence out of sync after a manual import | Re-seed with `npm run seed -- --reset`, or reset the sequence. |

## 7. Not included

- No production rows, passwords, tokens or `service_role` keys.
- No dump of the reference database.
- No changes to the reference project.
