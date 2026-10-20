import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CITY_CENTER, categoryMeta } from '../categories.js';
import { buildBasemap, MAPTILER_LOGO_URL } from '../mapStyle.js';
import { useTheme } from '../theme.js';

// MapTiler is used when a publishable, origin-restricted key is configured
// (`client/.env.local`). Without a key the map falls back to OpenStreetMap so
// the portal keeps working. See docs/integrations.md.
const MAPTILER_KEY = (import.meta.env.VITE_MAPTILER_KEY || '').trim();
const MAPTILER_LIGHT_STYLE = import.meta.env.VITE_MAPTILER_STYLE;
const MAPTILER_DARK_STYLE = import.meta.env.VITE_MAPTILER_STYLE_DARK;

function basemapFor(theme) {
  return buildBasemap({
    theme,
    key: MAPTILER_KEY,
    lightStyle: MAPTILER_LIGHT_STYLE,
    darkStyle: MAPTILER_DARK_STYLE,
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]
  );
}

export default function CityMap({ locations, selectedId, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const groupRef = useRef(null);
  const tileRef = useRef(null);
  const markersRef = useRef(new Map());
  const onSelectRef = useRef(onSelect);
  const [tileError, setTileError] = useState(false);
  const { resolved } = useTheme();
  const usesMapTiler = Boolean(MAPTILER_KEY);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return undefined;

    const map = L.map(container, {
      center: CITY_CENTER,
      zoom: 13,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    // The MapTiler Free plan requires the MapTiler logo on the map.
    if (MAPTILER_KEY) {
      const logo = L.control({ position: 'bottomleft' });
      logo.onAdd = () => {
        const element = L.DomUtil.create('div', 'map-provider-logo');
        element.innerHTML =
          `<a href="https://www.maptiler.com" target="_blank" rel="noopener noreferrer">` +
          `<img src="${MAPTILER_LOGO_URL}" alt="MapTiler logo" /></a>`;
        L.DomEvent.disableClickPropagation(element);
        return element;
      };
      logo.addTo(map);
    }

    groupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    const timer = window.setTimeout(handleResize, 200);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
      groupRef.current = null;
      tileRef.current = null;
    };
  }, []);

  // Base tiles follow the resolved theme, so dark mode gets a real dark style
  // (MapTiler) or the inverted-light fallback (OpenStreetMap).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const source = basemapFor(resolved);
    const tiles = L.tileLayer(source.url, {
      maxZoom: source.maxZoom,
      crossOrigin: source.crossOrigin,
      attribution: source.attribution,
    });

    // Surface a readable fallback instead of an empty grey map if tiles fail.
    tiles.on('tileerror', () => setTileError(true));
    tiles.on('tileload', () => setTileError(false));
    tiles.addTo(map);

    const previous = tileRef.current;
    tileRef.current = tiles;
    if (previous) map.removeLayer(previous);

    return undefined;
  }, [resolved]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    group.clearLayers();
    markersRef.current.clear();

    const bounds = [];
    (locations || []).forEach((location) => {
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return;
      }

      const meta = categoryMeta(location.category);
      const marker = L.marker([latitude, longitude], {
        title: location.name,
        icon: L.divIcon({
          className: 'map-marker',
          html: `<span style="--pin:${meta.color}"></span>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          popupAnchor: [0, -12],
        }),
      });

      marker.bindPopup(
        `<div class="map-popup"><strong>${escapeHtml(location.name)}</strong><span>${escapeHtml(
          meta.label
        )}</span></div>`
      );
      marker.on('click', () => onSelectRef.current?.(location));
      marker.addTo(group);

      markersRef.current.set(String(location.id), marker);
      bounds.push([latitude, longitude]);
    });

    if (bounds.length && mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [locations]);

  useEffect(() => {
    if (selectedId == null) return;
    const marker = markersRef.current.get(String(selectedId));
    if (marker && mapRef.current) {
      mapRef.current.panTo(marker.getLatLng());
      marker.openPopup();
    }
  }, [selectedId]);

  return (
    <div className={`map-shell ${usesMapTiler ? 'map-shell--maptiler' : 'map-shell--fallback'}`}>
      <div
        className="city-map"
        ref={containerRef}
        role="application"
        aria-label="Map of Kombolcha services"
      />
      {tileError && (
        <div className="map-fallback" role="status">
          <strong>Map tiles could not be loaded</strong>
          <span>You can still browse the full list of places next to the map.</span>
        </div>
      )}
    </div>
  );
}
