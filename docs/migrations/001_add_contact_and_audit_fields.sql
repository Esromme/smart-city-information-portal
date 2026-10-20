-- 001_add_contact_and_audit_fields.sql
--
-- STATUS: PROPOSED - NOT APPLIED.
-- Review and run manually against Supabase only after approval.
-- The application does not read or write these columns yet, so it is safe to
-- defer this migration without breaking the running portal.
--
-- Purpose:
--   * Record when a service or announcement was last changed.
--   * Give administrators a place to store a contact phone number, a website
--     and opening hours, which FR-09 (emergency contacts) and the service
--     directory need but the current schema cannot hold.
--
-- Observed schema before this migration (read-only inspection):
--   public.services          id, name, category, description, location, created_at
--   public.announcements     id, title, content, category, published_at
--   public.service_locations id, name, category, latitude, longitude, created_at

begin;

alter table public.services
  add column if not exists contact_phone text,
  add column if not exists website text,
  add column if not exists opening_hours text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.announcements
  add column if not exists updated_at timestamptz not null default now();

-- Keep updated_at accurate on every update without changing application code.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists services_touch_updated_at on public.services;
create trigger services_touch_updated_at
  before update on public.services
  for each row execute function public.touch_updated_at();

drop trigger if exists announcements_touch_updated_at on public.announcements;
create trigger announcements_touch_updated_at
  before update on public.announcements
  for each row execute function public.touch_updated_at();

commit;
