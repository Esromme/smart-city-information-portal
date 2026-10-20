-- =============================================================================
-- Read-only verification for the demo database
-- =============================================================================
-- Run after 000_baseline_schema.sql (and after `npm run seed` if you want the
-- row counts to match the demonstration data). This script only SELECTs.
--
-- Expected after a clean baseline + seed:
--   announcements     6 rows
--   services         12 rows
--   service_locations 12 rows
-- =============================================================================

-- 1. Columns, types, nullability and defaults -------------------------------
select table_name,
       ordinal_position,
       column_name,
       data_type,
       character_maximum_length,
       is_nullable,
       column_default,
       is_identity,
       identity_generation
  from information_schema.columns
 where table_schema = 'public'
   and table_name in ('announcements', 'services', 'service_locations')
 order by table_name, ordinal_position;

-- 2. Constraints (expected: three primary keys, nothing else) ---------------
select c.relname as table_name,
       con.conname as constraint_name,
       case con.contype
         when 'p' then 'primary key'
         when 'f' then 'foreign key'
         when 'u' then 'unique'
         when 'c' then 'check'
         else con.contype::text
       end as constraint_type,
       pg_get_constraintdef(con.oid) as definition
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('announcements', 'services', 'service_locations')
 order by c.relname, con.conname;

-- 3. Indexes (expected: primary-key indexes only) ---------------------------
select tablename, indexname, indexdef
  from pg_indexes
 where schemaname = 'public'
   and tablename in ('announcements', 'services', 'service_locations')
 order by tablename, indexname;

-- 4. Row Level Security (expected: enabled = true, forced = false) ----------
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('announcements', 'services', 'service_locations')
 order by c.relname;

-- 5. Policies (expected: none) ----------------------------------------------
select tablename, policyname, roles, cmd
  from pg_policies
 where schemaname = 'public'
   and tablename in ('announcements', 'services', 'service_locations');

-- 6. Row counts --------------------------------------------------------------
select 'announcements' as table_name, count(*)::int as rows from public.announcements
union all
select 'services', count(*)::int from public.services
union all
select 'service_locations', count(*)::int from public.service_locations;

-- 7. Category values actually present (demo seed uses legacy values) --------
select 'announcements' as table_name, category, count(*)::int as rows
  from public.announcements group by category
union all
select 'services', category, count(*)::int from public.services group by category
union all
select 'service_locations', category, count(*)::int
  from public.service_locations group by category
 order by table_name, category;
