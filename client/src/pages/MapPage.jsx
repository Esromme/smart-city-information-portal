import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { categoryMeta } from '../categories.js';
import { useApi } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import CityMap from '../components/CityMap.jsx';
import { LocationForm } from '../components/Forms.jsx';

export default function MapPage() {
  const { data, loading, error, reload } = useApi(() => api.locations.list(), []);
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState(null);

  const locations = useMemo(() => data?.data ?? [], [data]);

  const categories = useMemo(() => {
    const found = new Set(locations.map((location) => location.category));
    return ['all', ...Array.from(found).sort()];
  }, [locations]);

  const filtered = useMemo(
    () => (category === 'all' ? locations : locations.filter((location) => location.category === category)),
    [locations, category]
  );

  useEffect(() => {
    if (selectedId != null && !filtered.some((location) => location.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filtered, selectedId]);

  async function handleDelete(location) {
    if (!window.confirm(`Remove "${location.name}" from the city map?`)) return;
    setActionError(null);
    try {
      await api.locations.remove(location.id);
      setSelectedId(null);
      await reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">City geography</span>
          <h1>Service map</h1>
          <p>Locate public services across Kombolcha.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          <Icon name="plus" size={18} />
          Add location
        </button>
      </header>

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter map by category">
          {categories.map((key) => (
            <button
              type="button"
              key={key}
              className={`chip ${category === key ? 'active' : ''}`}
              onClick={() => setCategory(key)}
            >
              {key === 'all' ? 'All' : categoryMeta(key).label}
            </button>
          ))}
        </div>
        <span className="toolbar-count">
          {filtered.length} {filtered.length === 1 ? 'place' : 'places'}
        </span>
      </div>

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      {loading ? (
        <div className="map-layout">
          <div className="skeleton map-skeleton" />
          <div className="card map-list">
            <div className="skeleton skeleton-line title" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
          </div>
        </div>
      ) : locations.length === 0 ? (
        <EmptyState
          icon="map"
          title="No mapped locations yet"
          description="Add the first service location to start building the city map."
          actionLabel="Add location"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="map-layout">
          <div className="card map-card">
            <CityMap locations={filtered} selectedId={selectedId} onSelect={(location) => setSelectedId(location.id)} />
          </div>

          <aside className="card map-list" aria-label="Mapped locations">
            <header className="map-list-head">
              <h2>Places</h2>
              <span className="muted">{filtered.length}</span>
            </header>
            <ul>
              {filtered.map((location) => {
                const meta = categoryMeta(location.category);
                return (
                  <li key={location.id}>
                    <button
                      type="button"
                      className={`place ${selectedId === location.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(location.id)}
                    >
                      <span className="place-dot" style={{ '--pin': meta.color }} />
                      <span className="place-text">
                        <strong>{location.name}</strong>
                        <span>{meta.label}</span>
                      </span>
                      <span
                        className="icon-btn danger small"
                        role="button"
                        tabIndex={0}
                        aria-label={`Delete ${location.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(location);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            handleDelete(location);
                          }
                        }}
                      >
                        <Icon name="trash" size={15} />
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && <li className="map-list-empty">No places in this category.</li>}
            </ul>
          </aside>
        </div>
      )}

      {open && (
        <Modal
          title="Add a map location"
          subtitle="Coordinates are in decimal degrees (WGS84)."
          onClose={() => setOpen(false)}
        >
          <LocationForm
            onCancel={() => setOpen(false)}
            onSaved={async () => {
              setOpen(false);
              await reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
