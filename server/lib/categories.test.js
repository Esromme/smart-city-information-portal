import { describe, expect, it } from 'vitest';
import {
  addCategoryFilter,
  CANONICAL_CATEGORIES,
  canonicalCategoryForStats,
  normalizeCategory,
  normalizeFilterCategory,
  OTHER_CATEGORY,
} from './categories.js';

describe('normalizeCategory', () => {
  it('accepts every canonical category', () => {
    for (const category of CANONICAL_CATEGORIES) {
      expect(normalizeCategory(category)).toBe(category);
    }
  });

  it('rejects legacy and unknown values for new records', () => {
    expect(() => normalizeCategory('health')).toThrow(/must be one of/);
    expect(() => normalizeCategory('made-up')).toThrow(/must be one of/);
    expect(() => normalizeCategory('')).toThrow(/required/);
  });

  it('allows legacy and other values when editing an existing record', () => {
    expect(normalizeCategory('health', { allowLegacy: true })).toBe('health');
    expect(normalizeCategory('other', { allowLegacy: true })).toBe('other');
    expect(() => normalizeCategory('made-up', { allowLegacy: true })).toThrow();
  });
});

describe('normalizeFilterCategory', () => {
  it('returns null for empty and all', () => {
    expect(normalizeFilterCategory(undefined)).toBeNull();
    expect(normalizeFilterCategory('all')).toBeNull();
  });

  it('accepts canonical, legacy and other', () => {
    expect(normalizeFilterCategory('water')).toBe('water');
    expect(normalizeFilterCategory('health')).toBe('health');
    expect(normalizeFilterCategory('other')).toBe('other');
  });

  it('rejects unknown filters', () => {
    expect(() => normalizeFilterCategory('nonsense')).toThrow(/Unknown category/);
  });
});

describe('addCategoryFilter', () => {
  it('filters canonical values exactly', () => {
    const filters = [];
    const values = [];
    addCategoryFilter(filters, values, 'water');
    expect(filters).toEqual(['category = $1']);
    expect(values).toEqual(['water']);
  });

  it('treats transport as transportation', () => {
    const filters = [];
    const values = [];
    addCategoryFilter(filters, values, 'transportation');
    expect(filters).toEqual(["category in ($1, 'transport')"]);
    expect(values).toEqual(['transportation']);
  });

  it('groups every non-canonical record under other', () => {
    const filters = [];
    const values = [];
    addCategoryFilter(filters, values, 'other');
    expect(filters[0]).toContain('category not in');
    expect(values).toEqual([]);
  });

  it('does nothing for all', () => {
    const filters = [];
    const values = [];
    addCategoryFilter(filters, values, 'all');
    expect(filters).toEqual([]);
    expect(values).toEqual([]);
  });
});

describe('canonicalCategoryForStats', () => {
  it('maps transport to transportation and the rest to other', () => {
    expect(canonicalCategoryForStats('transport')).toBe('transportation');
    expect(canonicalCategoryForStats('emergency')).toBe('emergency');
    expect(canonicalCategoryForStats('utilities')).toBe(OTHER_CATEGORY);
    expect(canonicalCategoryForStats(null)).toBe(OTHER_CATEGORY);
  });
});
