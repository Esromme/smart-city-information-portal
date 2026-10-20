/**
 * Basemap configuration for the Leaflet map.
 *
 * The portal uses MapTiler raster tiles when a publishable, origin-restricted
 * `VITE_MAPTILER_KEY` is configured, and falls back to the OpenStreetMap public
 * tiles otherwise so the map keeps working without an account or a key.
 *
 * Keeping this pure (no Leaflet import) makes the URL/attribution rules easy to
 * unit test. `CityMap.jsx` turns the result into a Leaflet tile layer.
 */

export const MAPTILER_ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">&copy; MapTiler</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">&copy; OpenStreetMap contributors</a>';

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export const MAPTILER_LOGO_URL = 'https://api.maptiler.com/resources/logo.svg';

export const DEFAULT_MAPTILER_LIGHT_STYLE = 'streets-v4';
export const DEFAULT_MAPTILER_DARK_STYLE = 'streets-v4-dark';
export const MAX_ZOOM = 19;

/**
 * Resolve the active basemap for a theme.
 *
 * @param {object} options
 * @param {'light'|'dark'} options.theme  Resolved colour theme.
 * @param {string} [options.key]          MapTiler publishable key (empty = fallback).
 * @param {string} [options.lightStyle]   MapTiler style used in light mode.
 * @param {string} [options.darkStyle]    MapTiler style used in dark mode.
 * @returns {{provider: 'maptiler'|'openstreetmap', url: string, attribution: string, maxZoom: number, crossOrigin: boolean}}
 */
export function buildBasemap({ theme, key, lightStyle, darkStyle } = {}) {
  const trimmedKey = String(key ?? '').trim();

  if (!trimmedKey) {
    return {
      provider: 'openstreetmap',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: OSM_ATTRIBUTION,
      maxZoom: MAX_ZOOM,
      crossOrigin: false,
    };
  }

  const useDark = theme === 'dark';
  const styleId =
    (useDark ? darkStyle : lightStyle)?.trim() ||
    (useDark ? DEFAULT_MAPTILER_DARK_STYLE : DEFAULT_MAPTILER_LIGHT_STYLE);

  return {
    provider: 'maptiler',
    // 256px raster tiles keep the request cost at 1 per tile (512px/HiDPI tiles
    // count as 4), which matters for the MapTiler Free monthly request quota.
    url: `https://api.maptiler.com/maps/${styleId}/256/{z}/{x}/{y}.png?key=${encodeURIComponent(
      trimmedKey
    )}`,
    attribution: MAPTILER_ATTRIBUTION,
    maxZoom: MAX_ZOOM,
    crossOrigin: true,
  };
}
