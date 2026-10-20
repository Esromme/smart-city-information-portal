import { badRequest } from './http.js';

// Canonical service categories for the Smart City Information Portal.
export const CANONICAL_CATEGORIES = Object.freeze([
  'waste',
  'water',
  'transportation',
  'weather',
  'emergency',
]);

// Categories that already exist in the database. They stay readable and can be
// kept while editing an older record, but new records must use a canonical value.
export const LEGACY_CATEGORIES = Object.freeze([
  'community',
  'education',
  'government',
  'health',
  'safety',
  'transport',
  'utilities',
]);

// Pseudo-category used by the UI to group every record that does not map onto a
// canonical category. It is never assigned automatically to stored data.
export const OTHER_CATEGORY = 'other';

const CANONICAL_SET = new Set(CANONICAL_CATEGORIES);
const LEGACY_SET = new Set(LEGACY_CATEGORIES);
const WRITABLE_SET = new Set([
  ...CANONICAL_CATEGORIES,
  ...LEGACY_CATEGORIES,
  OTHER_CATEGORY,
]);

export function normalizeCategory(
  value,
  { field = 'category', allowLegacy = false } = {}
) {
  if (typeof value !== 'string') {
    throw badRequest(`${field} is required`);
  }

  const key = value.trim().toLowerCase();

  if (!key) {
    throw badRequest(`${field} is required`);
  }

  if (CANONICAL_SET.has(key)) return key;
  if (allowLegacy && WRITABLE_SET.has(key)) return key;

  throw badRequest(
    `${field} must be one of: ${CANONICAL_CATEGORIES.join(', ')}`
  );
}

export function normalizeFilterCategory(value) {
  if (value === undefined || value === null || value === '') return null;

  const key = String(value).trim().toLowerCase();

  if (!key || key === 'all') return null;

  if (
    CANONICAL_SET.has(key) ||
    LEGACY_SET.has(key) ||
    key === OTHER_CATEGORY
  ) {
    return key;
  }

  throw badRequest(`Unknown category filter: ${key}`);
}

// Build a SQL predicate for a category filter. `transport` is an older spelling
// of `transportation` and is included in the canonical filter because the two
// values unambiguously mean the same thing.
export function addCategoryFilter(filters, values, rawCategory) {
  const category = normalizeFilterCategory(rawCategory);

  if (!category) return;

  if (category === OTHER_CATEGORY) {
    filters.push(
      `category not in ('waste', 'water', 'transportation', 'weather', 'emergency', 'transport')`
    );
    return;
  }

  values.push(category);

  if (category === 'transportation') {
    filters.push(`category in ($${values.length}, 'transport')`);
  } else {
    filters.push(`category = $${values.length}`);
  }
}

// Aggregate legacy values for dashboard statistics without changing stored data.
export function canonicalCategoryForStats(value) {
  const key = String(value ?? '').trim().toLowerCase();

  if (key === 'transport') return 'transportation';
  if (CANONICAL_SET.has(key)) return key;

  return OTHER_CATEGORY;
}
