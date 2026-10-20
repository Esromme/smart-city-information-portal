import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAPTILER_DARK_STYLE,
  DEFAULT_MAPTILER_LIGHT_STYLE,
  MAPTILER_ATTRIBUTION,
  OSM_ATTRIBUTION,
  buildBasemap,
} from './mapStyle.js';

describe('buildBasemap', () => {
  it('falls back to OpenStreetMap when no key is configured', () => {
    const source = buildBasemap({ theme: 'light' });
    expect(source.provider).toBe('openstreetmap');
    expect(source.url).toBe('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(source.attribution).toBe(OSM_ATTRIBUTION);
  });

  it('treats a blank or whitespace key as no key', () => {
    expect(buildBasemap({ theme: 'light', key: '' }).provider).toBe('openstreetmap');
    expect(buildBasemap({ theme: 'light', key: '   ' }).provider).toBe('openstreetmap');
  });

  it('uses MapTiler when a key is configured', () => {
    const source = buildBasemap({ theme: 'light', key: 'abc123' });
    expect(source.provider).toBe('maptiler');
    expect(source.url).toContain('/maps/streets-v4/256/');
    expect(source.url).toContain('key=abc123');
    expect(source.attribution).toBe(MAPTILER_ATTRIBUTION);
    expect(source.maxZoom).toBeGreaterThan(0);
  });

  it('uses the dark style for the dark theme', () => {
    const source = buildBasemap({ theme: 'dark', key: 'abc123' });
    expect(source.url).toContain('/maps/streets-v4-dark/256/');
  });

  it('honours explicit style overrides', () => {
    const light = buildBasemap({
      theme: 'light',
      key: 'k',
      lightStyle: 'dataviz-v4',
      darkStyle: 'dataviz-v4-dark',
    });
    const dark = buildBasemap({
      theme: 'dark',
      key: 'k',
      lightStyle: 'dataviz-v4',
      darkStyle: 'dataviz-v4-dark',
    });
    expect(light.url).toContain('/maps/dataviz-v4/256/');
    expect(dark.url).toContain('/maps/dataviz-v4-dark/256/');
  });

  it('falls back to the default style names when overrides are blank', () => {
    const source = buildBasemap({ theme: 'light', key: 'k', lightStyle: '   ' });
    expect(source.url).toContain(`/maps/${DEFAULT_MAPTILER_LIGHT_STYLE}/256/`);
    expect(
      buildBasemap({ theme: 'dark', key: 'k', darkStyle: '' }).url
    ).toContain(`/maps/${DEFAULT_MAPTILER_DARK_STYLE}/256/`);
  });

  it('trims the key and percent-encodes it', () => {
    const source = buildBasemap({ theme: 'light', key: '  a b/c  ' });
    expect(source.url).toContain('key=a%20b%2Fc');
  });

  it('requests 256px tiles so each tile is one API request', () => {
    const source = buildBasemap({ theme: 'light', key: 'k' });
    expect(source.url).toContain('/256/{z}/{x}/{y}.png');
    expect(source.url).not.toContain('@2x');
  });
});
