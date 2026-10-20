import { describe, expect, it } from 'vitest';
import {
  asyncRoute,
  badRequest,
  HttpError,
  notFound,
  optionalNumber,
  optionalString,
  parseId,
  parseLimit,
  requireString,
} from './http.js';

describe('parseId', () => {
  it('accepts positive safe integers', () => {
    expect(parseId('12')).toBe(12);
    expect(parseId(3)).toBe(3);
  });

  it('rejects zero, negatives and non-numeric values', () => {
    for (const value of ['0', '-1', 'abc', '1.5', '', undefined]) {
      expect(() => parseId(value)).toThrow(HttpError);
      expect(() => parseId(value)).toThrow(/Invalid id/);
    }
  });
});

describe('requireString', () => {
  it('trims and returns valid text', () => {
    expect(requireString('  hello  ', 'title')).toBe('hello');
  });

  it('enforces required and maximum length', () => {
    expect(() => requireString('', 'title')).toThrow(/title is required|at least/);
    expect(() => requireString('x', 'title', { min: 2 })).toThrow(/at least 2/);
    expect(() => requireString('abcd', 'title', { max: 3 })).toThrow(/at most 3/);
    expect(() => requireString(5, 'title')).toThrow(/title is required/);
  });
});

describe('optionalString', () => {
  it('normalises empty values to null', () => {
    expect(optionalString(undefined, 'note')).toBeNull();
    expect(optionalString('', 'note')).toBeNull();
    expect(optionalString('   ', 'note')).toBeNull();
  });

  it('returns trimmed text and enforces max length', () => {
    expect(optionalString('  note ', 'note')).toBe('note');
    expect(() => optionalString('abcd', 'note', { max: 2 })).toThrow(/at most 2/);
    expect(() => optionalString(7, 'note')).toThrow(/must be text/);
  });
});

describe('optionalNumber', () => {
  it('coerces numeric strings and enforces range', () => {
    expect(optionalNumber('11.5', 'lat')).toBe(11.5);
    expect(() => optionalNumber(120, 'lat', { min: -90, max: 90 })).toThrow(/between/);
    expect(() => optionalNumber('abc', 'lat')).toThrow(/must be a number/);
    expect(optionalNumber('', 'lat')).toBeNull();
  });
});

describe('parseLimit', () => {
  it('falls back for invalid values and caps large ones', () => {
    expect(parseLimit(undefined)).toBe(100);
    expect(parseLimit('0')).toBe(100);
    expect(parseLimit('abc')).toBe(100);
    expect(parseLimit('25')).toBe(25);
    expect(parseLimit('9999', 100, 200)).toBe(200);
  });
});

describe('helpers', () => {
  it('builds typed errors', () => {
    expect(badRequest('nope').status).toBe(400);
    expect(notFound().status).toBe(404);
  });

  it('asyncRoute forwards rejections to next', async () => {
    const error = new Error('boom');
    let captured;
    const wrapped = asyncRoute(async () => {
      throw error;
    });

    await wrapped({}, {}, (err) => {
      captured = err;
    });

    expect(captured).toBe(error);
  });
});
