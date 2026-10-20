import { describe, expect, it } from 'vitest';
import {
  categoryOptions,
  FILTER_CATEGORIES,
  filterKeyForCategory,
  SERVICE_CATEGORIES,
} from './categories.js';

describe('canonical categories', () => {
  it('exposes exactly the five service areas', () => {
    expect(SERVICE_CATEGORIES).toEqual([
      'waste',
      'water',
      'transportation',
      'weather',
      'emergency',
    ]);
    expect(FILTER_CATEGORIES).toEqual([...SERVICE_CATEGORIES, 'other']);
  });
});

describe('categoryOptions', () => {
  it('offers only canonical values for a canonical record', () => {
    const options = categoryOptions('water');
    expect(options.map((option) => option.value)).toEqual(SERVICE_CATEGORIES);
  });

  it('keeps the current legacy value when editing an older record', () => {
    const options = categoryOptions('health');
    const values = options.map((option) => option.value);
    expect(values).toContain('health');
    expect(values).toEqual([...SERVICE_CATEGORIES, 'health']);
    expect(options.at(-1).label).toMatch(/existing/i);
  });
});

describe('filterKeyForCategory', () => {
  it('maps stored values onto filter chips', () => {
    expect(filterKeyForCategory('transport')).toBe('transportation');
    expect(filterKeyForCategory('transportation')).toBe('transportation');
    expect(filterKeyForCategory('water')).toBe('water');
    expect(filterKeyForCategory('utilities')).toBe('other');
    expect(filterKeyForCategory('health')).toBe('other');
  });
});
