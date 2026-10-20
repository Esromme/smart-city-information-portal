import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { categoryMeta } from '../categories.js';
import { useApi } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import CityMap from '../components/CityMap.jsx';

// Every record on this page belongs to the canonical transport category; the
// API also accepts the legacy `transport` spelling through the same filter.
const TRANSPORT_CATEGORY = 'transportation';

function formatCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(4) : '—';
}

function pointKey(name) {
  return String(name ?? '').trim().toLowerCase();
}

function TransportCard({ item, point, onLocate }) {
  const meta = categoryMeta(item.category);

  return (
    <article className="card tr-card" style={{ '--tint': meta.color }}>
      <div className="tr-card-top">
        <span className="tr-icon" aria-hidden="true">
          <Icon name={meta.icon} size={20} />
        </span>
        <span className="pill subtle">{meta.label}</span>
      </div>

      <h3 className="tr-card-name">{item.name}</h3>
      {item.description && <p className="tr-card-desc">{item.description}</p>}

      {(item.location || point) && (
        <footer className="tr-card-foot">
          {item.location ? (
            <span className="tr-meta">
              <Icon name="pin" size={15} />
              <span>{item.location}</span>
            </span>
          ) : (
            <span />
          )}

          {point && (
            <button
              type="button"
              className="tr-link"
              onClick={() => onLocate(point.id)}
              aria-label={`Show ${item.name} on the map`}
            >
              <Icon name="map" size={15} />
              Show on map
            </button>
          )}
        </footer>
      )}
    </article>
  );
}

function TransportSkeleton() {
  return (
    <div className="tr-grid" role="status" aria-label="Loading transport services">
      {[0, 1, 2].map((key) => (
        <div className="card tr-card" key={key}>
          <div className="tr-card-top">
            <span className="skeleton skeleton-icon" />
          </div>
          <span className="skeleton skeleton-line title" />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

export default function Transport({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const mapSectionRef = useRef(null);

  // Debounce typing so the service list is not re-fetched on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const services = useApi(
    () => api.services.list({ category: TRANSPORT_CATEGORY, search: query }),
    [query]
  );
  const locations = useApi(
    () => api.locations.list({ category: TRANSPORT_CATEGORY }),
    []
  );

  // Aggregate counts come from the existing public stats endpoint.
  const stats = useApi(() => api.stats(), []);

  const listings = services.data?.data ?? [];
  const allPoints = useMemo(() => locations.data?.data ?? [], [locations.data]);
  const meta = categoryMeta(TRANSPORT_CATEGORY);

  // The locations endpoint has no search parameter, so points are filtered here.
  const points = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return allPoints;
    return allPoints.filter((point) =>
      String(point.name ?? '').toLowerCase().includes(term)
    );
  }, [allPoints, query]);

  const pointsByName = useMemo(() => {
    const result = new Map();
    allPoints.forEach((point) => {
      result.set(pointKey(point.name), point);
    });
    return result;
  }, [allPoints]);

  // A listing is locatable when a mapped point carries the same name.
  function pointFor(item) {
    const point = pointsByName.get(pointKey(item.name));
    if (!point) return null;
    return points.some((candidate) => candidate.id === point.id) ? point : null;
  }

  function countFor(collection) {
    const rows = stats.data?.data?.byCategory?.[collection] ?? [];
    const row = rows.find((entry) => entry.category === TRANSPORT_CATEGORY);
    return Number.isFinite(row?.count) ? row.count : null;
  }

  const statsListings = countFor('services');
  const statsPoints = countFor('locations');
  const loadingStats = stats.loading && !stats.data;

  // Prefer the aggregate total; fall back to the unfiltered list when stats are
  // unavailable, and stay quiet rather than showing a misleading number.
  const listingTotal = Number.isFinite(statsListings)
    ? statsListings
    : query
      ? null
      : listings.length;

  const pointTotal = Number.isFinite(statsPoints)
    ? statsPoints
    : allPoints.length;

  const filtering = Boolean(query);
  const listed = listings.length;

  const hint = filtering
    ? listingTotal !== null && listingTotal !== listed
      ? `Showing ${listed} of ${listingTotal} service listings`
      : `Showing ${listed} ${
          listed === 1 ? 'service listing' : 'service listings'
        }`
    : 'Sorted A to Z';

  const inlineError = services.error && services.data ? services.error : null;

  function resetSearch() {
    setSearch('');
    setQuery('');
  }

  function goToMap(event) {
    if (!onNavigate) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate('map');
  }

  function locate(pointId) {
    setSelectedId(pointId);

    const reduceMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    mapSectionRef.current?.scrollIntoView?.({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }

  function retryAll() {
    services.reload();
    locations.reload();
    stats.reload();
  }

  return (
    <div className="page">
      <header className="page-head">
        <div className="tr-head-copy">
          <span className="eyebrow">Getting around</span>
          <h1>City Transportation</h1>
          <p>
            Explore transportation services and mapped mobility points available
            to residents of Kombolcha.
          </p>

          <div className="tr-head-meta">
            {loadingStats ? (
              <span className="skeleton tr-count-skel" aria-hidden="true" />
            ) : listingTotal !== null ? (
              <span className="tr-count" role="status" aria-live="polite">
                <span className="tr-count-icon" aria-hidden="true">
                  <Icon name="bus" size={15} />
                </span>
                <span>
                  <strong>{listingTotal}</strong>{' '}
                  {listingTotal === 1
                    ? 'transport listing'
                    : 'transport listings'}
                </span>
              </span>
            ) : null}

            <a className="btn ghost small" href="#map" onClick={goToMap}>
              <Icon name="map" size={16} />
              View on map
            </a>
          </div>
        </div>
      </header>

      <div className="notice tr-notice">
        <Icon name="bus" size={18} />
        <div>
          <strong>Directory information</strong>
          <p>
            This page lists transport services maintained by the city. Live
            vehicle tracking and real-time arrival times are not available for
            Kombolcha, so no estimate is shown.
          </p>
        </div>
      </div>

      <section className="card tr-overview" aria-labelledby="tr-overview-heading">
        <div className="tr-overview-intro">
          <span className="tr-icon" style={{ '--tint': meta.color }} aria-hidden="true">
            <Icon name="bus" size={22} />
          </span>
          <div className="tr-overview-copy">
            <h2 id="tr-overview-heading">Transportation directory</h2>
            <p>
              Stations, offices and mapped mobility points recorded for
              Kombolcha.
            </p>
          </div>
        </div>

        <dl className="tr-metrics">
          <div className="tr-metric">
            <dt className="tr-metric-label">Service listings</dt>
            <dd className="tr-metric-value">
              {loadingStats ? (
                <span className="skeleton tr-metric-skel" aria-hidden="true" />
              ) : (
                (listingTotal ?? '—')
              )}
            </dd>
          </div>
          <div className="tr-metric">
            <dt className="tr-metric-label">Mapped points</dt>
            <dd className="tr-metric-value">
              {loadingStats ? (
                <span className="skeleton tr-metric-skel" aria-hidden="true" />
              ) : (
                pointTotal
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="tr-panel"
        aria-label="Search transportation services"
      >
        <div className="tr-search">
          <Icon name="search" size={18} />
          <input
            type="search"
            name="transport-search"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, description or location"
            aria-label="Search transport services by name, description or location"
          />
          {search && (
            <button
              type="button"
              className="tr-search-clear"
              onClick={resetSearch}
              aria-label="Clear search"
              title="Clear search"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      </section>

      {inlineError && (
        <div className="alert" role="alert">
          {inlineError}
        </div>
      )}

      <section className="tr-results" aria-labelledby="tr-services-heading">
        <div className="tr-results-head">
          <h2 id="tr-services-heading">
            {filtering ? 'Matching services' : 'Transport services'}
          </h2>
          <div className="tr-results-side">
            <span className="tr-results-hint" role="status" aria-live="polite">
              {services.loading && !services.data
                ? 'Loading directory'
                : hint}
            </span>
            {filtering && listed > 0 && (
              <button
                type="button"
                className="btn ghost small"
                onClick={resetSearch}
              >
                <Icon name="close" size={15} />
                Reset search
              </button>
            )}
          </div>
        </div>

        {services.loading && !services.data ? (
          <TransportSkeleton />
        ) : services.error && !services.data ? (
          <div className="empty-state" role="alert">
            <span className="empty-icon" aria-hidden="true">
              <Icon name="warning" size={26} />
            </span>
            <h3>Transport services are unavailable right now</h3>
            <p>{services.error}</p>
            <button type="button" className="btn" onClick={retryAll}>
              <Icon name="refresh" size={16} />
              Try again
            </button>
          </div>
        ) : listed === 0 ? (
          <EmptyState
            icon="bus"
            title={
              filtering
                ? 'No matching transport services'
                : 'No transport services listed'
            }
            description={
              filtering
                ? 'No service matches this search. Try a different term.'
                : 'Transport services will appear here once they are added to the city directory.'
            }
            actionLabel={filtering ? 'Reset search' : undefined}
            actionIcon="refresh"
            onAction={filtering ? resetSearch : undefined}
          />
        ) : (
          <div className="tr-grid">
            {listings.map((item) => (
              <TransportCard
                key={item.id}
                item={item}
                point={pointFor(item)}
                onLocate={locate}
              />
            ))}
          </div>
        )}
      </section>

      <section
        className="tr-map-section"
        ref={mapSectionRef}
        aria-labelledby="tr-map-heading"
      >
        <div className="tr-results-head">
          <h2 id="tr-map-heading">Transport map</h2>
          <div className="tr-results-side">
            {allPoints.length > 0 && (
              <span className="tr-results-hint">
                {points.length} of {allPoints.length}{' '}
                {allPoints.length === 1 ? 'point' : 'points'} shown
              </span>
            )}
            <a className="btn ghost small" href="#map" onClick={goToMap}>
              Open full map
              <Icon name="arrow" size={15} />
            </a>
          </div>
        </div>

        {locations.loading && !locations.data ? (
          <div className="skeleton tr-map-skeleton" aria-hidden="true" />
        ) : locations.error && !locations.data ? (
          <div className="empty-state" role="alert">
            <span className="empty-icon" aria-hidden="true">
              <Icon name="warning" size={26} />
            </span>
            <h3>Mapped points are unavailable right now</h3>
            <p>{locations.error}</p>
            <button type="button" className="btn" onClick={retryAll}>
              <Icon name="refresh" size={16} />
              Try again
            </button>
          </div>
        ) : allPoints.length === 0 ? (
          <div className="card tr-map-empty">
            <Icon name="pin" size={18} />
            <div>
              <strong>No mapped transport points yet</strong>
              <p>
                Transport locations added from the city map will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="tr-map-layout">
            <div className="card map-card">
              <CityMap
                locations={points}
                selectedId={selectedId}
                onSelect={(location) => setSelectedId(location.id)}
              />
            </div>

            <aside className="card tr-points" aria-label="Mapped transport points">
              <header className="tr-points-head">
                <h3>Mapped points</h3>
                <span className="muted">{points.length}</span>
              </header>
              <ul>
                {points.map((point) => (
                  <li key={point.id}>
                    <button
                      type="button"
                      className={`tr-point ${
                        selectedId === point.id ? 'is-selected' : ''
                      }`}
                      onClick={() => setSelectedId(point.id)}
                    >
                      <span
                        className="tr-point-dot"
                        style={{ '--pin': categoryMeta(point.category).color }}
                      />
                      <span className="tr-point-text">
                        <strong>{point.name}</strong>
                        <span>
                          {formatCoordinate(point.latitude)},{' '}
                          {formatCoordinate(point.longitude)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                {points.length === 0 && (
                  <li className="tr-point-empty">
                    No mapped points match this search.
                  </li>
                )}
              </ul>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
