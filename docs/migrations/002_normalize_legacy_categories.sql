-- 002_normalize_legacy_categories.sql
--
-- STATUS: PROPOSED - NOT APPLIED.
-- This migration REWRITES data. It must only be run after an administrator has
-- reviewed the mapping below and confirmed that a database backup exists.
--
-- Context:
--   The canonical categories are: waste, water, transportation, weather,
--   emergency. Existing rows also use: community, education, government,
--   health, safety, transport, utilities.
--
--   Only two mappings are safe enough to state exactly:
--     * transport  -> transportation   (same meaning, older spelling)
--     * the Kombolcha Water Supply Office rows (utilities, ids 6)
--         -> water
--
--   The remaining legacy rows (health, education, government, community,
--   safety and the Electric Utility Office) have no canonical equivalent and
--   are intentionally left untouched. The portal shows them under the "Other"
--   filter, so nothing is hidden while this decision is pending.
--
-- Before running, verify the target rows still have the expected ids:
--   select id, name, category from public.services order by id;
--   select id, name, category from public.service_locations order by id;

begin;

update public.services
   set category = 'transportation'
 where category = 'transport';

update public.service_locations
   set category = 'transportation'
 where category = 'transport';

update public.announcements
   set category = 'transportation'
 where category = 'transport';

update public.services
   set category = 'water'
 where category = 'utilities'
   and name = 'Kombolcha Water Supply Office';

update public.service_locations
   set category = 'water'
 where category = 'utilities'
   and name = 'Kombolcha Water Supply Office';

commit;

-- Remaining after this migration (expected):
--   services: health, education, government, community, utilities (electric)
--   announcements: health, education, community, safety, utilities
-- These are visible under the "Other" filter until a further decision is made.
