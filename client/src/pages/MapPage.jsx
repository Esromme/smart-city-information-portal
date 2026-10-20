import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { FILTER_CATEGORIES, categoryMeta, filterKeyForCategory } from '../categories.js';
import { useApi } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import CityMap from '../components/CityMap.jsx';
import { LocationForm } from '../components/Forms.jsx';

export default function MapPage({ isAdmin = false }) {
  const { data, loading, error, reload } = useApi(() => api.locations.list(), []);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [formItem, setFormItem] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const locations = useMemo(() => data?.data ?? [], [data]);

  const counts = useMemo(() => {
    const result = {};

    for (const location of locations) {
      const key = filterKeyForCategory(location.category);
      result[key] = (result[key] ?? 0) + 1;
    }

    return result;
  }, [locations]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return locations.filter((location) => {
      if (category !== 'all') {
        const key = filterKeyForCategory(location.category);
        if (key !== category) return false;
      }

      if (term && !location.name.toLowerCase().includes(term)) return false;

      return true;
    });
  }, [locations, category, search]);

  useEffect(() => {
    if (selectedId != null && !filtered.some((location) => location.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filtered, selectedId]);

  function openCreate() {
    setFormItem(null);
    setFormOpen(true);
  }

  function openEdit(location) {
    setFormItem(location);
    setFormOpen(true);
  }

  async function handleDelete(location) {
    if (!window.confirm(`Remove "${location.name}" from the city map?`)) return;
    setActionError(null);
    setActionMessage(null);
    try {
      await api.locations.remove(location.id);
      setSelectedId(null);
      setActionMessage('Location removed.');
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
        {isAdmin && (
          <button type="button" className="btn primary" onClick={openCreate}>
            <Icon name="plus" size={18} />
            Add location
          </button>
        )}
      </header>

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter map by category">
          <button
            type="button"
            className={`chip ${category === 'all' ? 'active' : ''}`}
            onClick={() => setCategory('all')}
          >
            All
          </button>
          {FILTER_CATEGORIES.map((key) => (
            <button
              type="button"
              key={key}
              className={`chip ${category === key ? 'active' : ''}`}
              onClick={() => setCategory(key)}
            >
              {categoryMeta(key).label}
              {counts[key] ? ` (${counts[key]})` : ''}
            </button>
          ))}
        </div>

        <label className="search">
          <Icon name="search" size={18} />
          <input
            type="search"
            name="place-search"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search places"
            aria-label="Search mapped places"
          />
        </label>
      </div>

      {(error || actionError) && (
        <div className="alert" role="alert">{error || actionError}</div>
      )}

      {actionMessage && (
        <div className="alert success" role="status">{actionMessage}</div>
      )}

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
          actionLabel={isAdmin ? 'Add location' : undefined}
          onAction={isAdmin ? openCreate : undefined}
        />
      ) : (
        <div className="map-layout">
          <div className="card map-card">
            <CityMap
              locations={filtered}
              selectedId={selectedId}
              onSelect={(location) => setSelectedId(location.id)}
            />
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
                    <div className={`place-row ${selectedId === location.id ? 'selected' : ''}`}>
                      <button
                        type="button"
                        className="place"
                        onClick={() => setSelectedId(location.id)}
                      >
                        <span className="place-dot" style={{ '--pin': meta.color }} />
                        <span className="place-text">
                          <strong>{location.name}</strong>
                          <span>{meta.label}</span>
                        </span>
                      </button>

                      {isAdmin && (
                        <div className="place-actions">
                          <button
                            type="button"
                            className="icon-btn small"
                            aria-label={`Edit ${location.name}`}
                            title="Edit location"
                            onClick={() => openEdit(location)}
                          >
                            <Icon name="pencil" size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger small"
                            aria-label={`Delete ${location.name}`}
                            title="Delete location"
                            onClick={() => handleDelete(location)}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="map-list-empty">No places match this filter.</li>
              )}
            </ul>
          </aside>
        </div>
      )}

      {formOpen && (
        <Modal
          title={formItem ? 'Edit map location' : 'Add a map location'}
          subtitle="Coordinates are in decimal degrees (WGS84)."
          onClose={() => setFormOpen(false)}
        >
          <LocationForm
            initial={formItem}
            onCancel={() => setFormOpen(false)}
            onSaved={async () => {
              setFormOpen(false);
              setActionMessage(formItem ? 'Location updated.' : 'Location added.');
              await reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
