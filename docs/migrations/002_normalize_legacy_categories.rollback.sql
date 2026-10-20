-- 002_normalize_legacy_categories.rollback.sql
--
-- STATUS: PROPOSED - NOT APPLIED.
-- PARTIAL ROLLBACK ONLY.
--
-- The forward migration merged several legacy values into canonical ones and
-- cannot be reversed exactly: once transport, transportation and the water
-- supply rows are normalised, the original per-row value is no longer stored.
--
-- Options, in order of preference:
--   1. Restore the affected rows from the pre-migration backup with
--      point-in-time recovery (recommended).
--   2. Run the statements below, which restore only the spellings that were
--      changed and then require an administrator to re-check the water rows.
--
-- Do NOT run this blindly on a live database.

begin;

-- Only revert rows that still describe the original transport services.
update public.services
   set category = 'transport'
 where category = 'transportation'
   and id = 10;

update public.service_locations
   set category = 'transport'
 where category = 'transportation'
   and id = 10;

-- The water supply office rows are re-labelled as the legacy utilities value.
update public.services
   set category = 'utilities'
 where category = 'water'
   and name = 'Kombolcha Water Supply Office';

update public.service_locations
   set category = 'utilities'
 where category = 'water'
   and name = 'Kombolcha Water Supply Office';

commit;
