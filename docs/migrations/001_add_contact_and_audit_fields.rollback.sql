-- 001_add_contact_and_audit_fields.rollback.sql
--
-- STATUS: PROPOSED - NOT APPLIED.
-- Reverses docs/migrations/001_add_contact_and_audit_fields.sql.
-- Dropping a column also drops its stored values. Export any contact details
-- an administrator has entered before running this.

begin;

drop trigger if exists services_touch_updated_at on public.services;
drop trigger if exists announcements_touch_updated_at on public.announcements;
drop function if exists public.touch_updated_at();

alter table public.services
  drop column if exists contact_phone,
  drop column if exists website,
  drop column if exists opening_hours,
  drop column if exists updated_at;

alter table public.announcements
  drop column if exists updated_at;

commit;
