# Database migration plan (proposed, not applied)

This plan describes how the Smart City Information Portal database could be changed to
support the remaining requirements. **Nothing in this document has been applied
to the hosted Supabase database.** The SQL files are provided for review only.

- Prepared SQL: [`docs/migrations/`](./migrations/)
- Observed schema: [`docs/data-dictionary.md`](./data-dictionary.md)
- Diagram: [`docs/erd.md`](./erd.md)

## 1. Observed state (verified read-only)

The managed Supabase project currently contains three tables in the `public`
schema:

| Table               | Rows | Primary key | Notes                          |
| ------------------- | ---- | ----------- | ------------------------------ |
| `announcements`     | 6    | `id`        | Service updates and notices    |
| `services`          | 12   | `id`        | Service directory              |
| `service_locations` | 12   | `id`        | Coordinates for the city map   |

Facts confirmed by read-only inspection:

- `id` is `bigint GENERATED ALWAYS AS IDENTITY`.
- Row Level Security (RLS) is **enabled** on all three tables and **no policies**
  exist. The Express API connects as the `postgres` owner role, which bypasses
  RLS, so the API works while direct anon-key access is denied.
- No `updated_at`, `contact_phone`, `website` or `opening_hours` columns exist.
- `announcements` stores `published_at`; `services` and `service_locations`
  store `created_at`.
- Existing `category` values predate the canonical five service areas.

## 2. Why changes are proposed

| Requirement | Gap |
| ----------- | --- |
| FR-09, FR-29, FR-30 (emergency contacts) | No structured contact/phone column; contacts would have to live in free-text `description`. |
| FR-11, FR-40 (update tracking) | No `updated_at`; edits cannot be timestamped or audited. |
| FR-02, FR-06–FR-09 (canonical categories) | Existing rows use legacy category values (`transport`, `utilities`, `health`, …). |
| NFR-24 (maintainability) | A stable, documented schema reduces ad-hoc changes. |

## 3. Proposed migration 001 — contact and audit fields

File: `docs/migrations/001_add_contact_and_audit_fields.sql`
Rollback: `docs/migrations/001_add_contact_and_audit_fields.rollback.sql`

Adds, using `add column if not exists` so it is safe to re-run:

- `services.contact_phone text`
- `services.website text`
- `services.opening_hours text`
- `services.updated_at timestamptz not null default now()`
- `announcements.updated_at timestamptz not null default now()`
- A `touch_updated_at()` trigger on `services` and `announcements`.

**Application impact:** none until the API is updated to use the new columns.
This migration can therefore be deferred with no downtime or code change.

**Decision required:** approve the three new contact columns. If only
`updated_at` is wanted, remove the three `contact_*`/`website`/`opening_hours`
lines before running.

## 4. Proposed migration 002 — normalise legacy categories

File: `docs/migrations/002_normalize_legacy_categories.sql`
Rollback: `docs/migrations/002_normalize_legacy_categories.rollback.sql` (partial)

Canonical categories: `waste`, `water`, `transportation`, `weather`,
`emergency`.

Proposed, intentional, row-level mappings:

| Current value | Rows | Proposed value | Reason |
| ------------- | ---- | -------------- | ------ |
| `transport` | Bus Station (services id 10, locations id 10), plus one announcement | `transportation` | Identical meaning. |
| `utilities` (Kombolcha Water Supply Office, id 6) | services + locations | `water` | The row is explicitly a water service. |

Deliberately **not** remapped:

| Value | Rows | Why left as-is |
| ----- | ---- | -------------- |
| `utilities` (Electric Utility Office, id 7) | services + locations | The five canonical areas have no electricity category. The row shows under "Other". |
| `health`, `education`, `government`, `community`, `safety` | services, locations, announcements | No canonical equivalent; deciding a home is a product decision, not a data-cleaning step. |

The application already presents these rows under an **Other** filter, so no
information is hidden while the decision is pending.

## 5. Migration safety checklist (before applying)

1. Take a fresh backup / confirm point-in-time recovery for the Supabase project.
2. Re-read the actual rows: `select id, name, category from public.services order by id;`
   and the equivalent for `service_locations` and `announcements`.
3. Confirm the ids and names in migration 002 still match.
4. Run the forward migration inside a transaction during a low-traffic window.
5. Apply `002` only with explicit written approval — it rewrites data.
6. After applying `001`, optionally update the API to read/write the new
   columns in a separate change so the two steps can be rolled back
   independently.
7. Re-run the test suite (`npm test`) and the manual checks in
   `docs/test-plan.md`.

## 6. Non-goals

- Enabling or changing RLS policies is out of scope for this plan.
- No table, column or row is dropped by these migrations except in rollback.
- No production seeding, deployment or configuration change is included.
