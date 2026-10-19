import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CITY_CENTER, categoryMeta } from '../categories.js';

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
  const markersRef = useRef(new Map());
  const onSelectRef = useRef(onSelect);

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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

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
    };
  }, []);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    group.clearLayers();
    markersRef.current.clear();

    const bounds = [];
    (locations || []).forEach((location) => {
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

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

  return <div className="city-map" ref={containerRef} role="application" aria-label="Map of Kombolcha services" />;
}
