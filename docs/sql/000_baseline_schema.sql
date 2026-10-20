-- =============================================================================
-- Smart City Information Portal - baseline schema for a NEW demo database
-- =============================================================================
--
-- Purpose
--   Recreates the three public tables used by the application in a fresh
--   Supabase (or plain PostgreSQL) project. It is derived from a read-only
--   inspection of the reference Supabase project performed on 2026-10-20
--   (PostgreSQL 17.11), not from the proposed migrations in docs/migrations/.
--
--   The reference project contains only:
--     - primary keys on id
--     - identity columns
--     - defaults of now() on the timestamp columns
--     - no foreign keys, unique constraints, check constraints or triggers
--     - no indexes beyond the three primary-key indexes
--
-- What this file intentionally does NOT do
--   - It does not copy production rows. Run `npm run seed` for demo content.
--   - It does not apply migration 001 (contact/audit fields) or 002
--     (category normalisation). Those are proposals and are not present in the
--     reference database.
--   - It does not grant table privileges to anon/authenticated. The reference
--     project inherits Supabase's default grants, but Row Level Security with
--     zero policies blocks row access for those roles. The API connects as the
--     table owner, so it does not need those grants.
--
-- Safe to run more than once in an empty demo project: every statement is
-- guarded with IF NOT EXISTS / idempotent RLS enablement.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- public.announcements - civic notices (id, title, content, category, date)
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id           bigint generated always as identity primary key,
  title        character varying(200) not null,
  content      text                    not null,
  category     character varying(50)   not null,
  published_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------------
-- public.services - service directory (no contact/hours columns in the
-- reference schema; migration 001 would add them but is NOT applied)
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id           bigint generated always as identity primary key,
  name         character varying(150) not null,
  category     character varying(50)   not null,
  description  text,
  location     text,
  created_at   timestamp with time zone default now()
);

-- ---------------------------------------------------------------------------
-- public.service_locations - coordinates for the Leaflet map
-- ---------------------------------------------------------------------------
create table if not exists public.service_locations (
  id           bigint generated always as identity primary key,
  name         character varying(150) not null,
  category     character varying(50)   not null,
  latitude     double precision,
  longitude    double precision,
  created_at   timestamp with time zone default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: enabled on all three tables, with no policies, matching
-- the reference project. The API's database role is the owner and bypasses RLS.
-- The browser's publishable (anon) key therefore cannot read or write rows
-- directly, even if the demo project applies Supabase's default grants.
-- ---------------------------------------------------------------------------
alter table public.announcements     enable row level security;
alter table public.services          enable row level security;
alter table public.service_locations enable row level security;

commit;

-- ---------------------------------------------------------------------------
-- Optional (NOT part of the reference schema)
-- ---------------------------------------------------------------------------
-- The reference project has no index beyond the primary keys. For a demo with
-- a handful of rows this is fine. If the data set grows, review these before
-- adding them:
--
--   create index if not exists announcements_category_idx
--     on public.announcements (category);
--   create index if not exists announcements_published_at_idx
--     on public.announcements (published_at desc nulls last);
--   create index if not exists services_category_idx
--     on public.services (category);
--   create index if not exists service_locations_category_idx
--     on public.service_locations (category);
-- ---------------------------------------------------------------------------
