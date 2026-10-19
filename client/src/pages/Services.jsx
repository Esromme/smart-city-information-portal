import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { SERVICE_CATEGORIES, categoryMeta } from '../categories.js';
import { useApi } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { ServiceForm } from '../components/Forms.jsx';

export default function Services() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, loading, error, reload } = useApi(
    () => api.services.list({ category, search: query }),
    [category, query]
  );

  const services = data?.data ?? [];

  async function handleDelete(item) {
    if (!window.confirm(`Delete the service "${item.name}"?`)) return;
    setActionError(null);
    try {
      await api.services.remove(item.id);
      await reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Directory</span>
          <h1>City services</h1>
          <p>Health, education, utilities and administrative services.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          <Icon name="plus" size={18} />
          Add service
        </button>
      </header>

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`chip ${category === 'all' ? 'active' : ''}`}
            onClick={() => setCategory('all')}
          >
            All
          </button>
          {SERVICE_CATEGORIES.map((key) => (
            <button
              type="button"
              key={key}
              className={`chip ${category === key ? 'active' : ''}`}
              onClick={() => setCategory(key)}
            >
              {categoryMeta(key).label}
            </button>
          ))}
        </div>

        <label className="search">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search services"
            aria-label="Search services"
          />
        </label>
      </div>

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      {loading ? (
        <div className="service-grid">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <div className="card service-card" key={key}>
              <div className="skeleton skeleton-icon" />
              <div className="skeleton skeleton-line title" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon="briefcase"
          title={query || category !== 'all' ? 'No matching services' : 'No services listed'}
          description={
            query || category !== 'all'
              ? 'Try a different category or search term.'
              : 'Add the first city service to the directory.'
          }
          actionLabel={query || category !== 'all' ? undefined : 'Add service'}
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="service-grid">
          {services.map((item) => {
            const meta = categoryMeta(item.category);
            return (
              <article className="card service-card" key={item.id}>
                <div className="card-top">
                  <span className="service-icon" style={{ '--tint': meta.color }}>
                    <Icon name="building" size={22} />
                  </span>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => handleDelete(item)}
                    aria-label={`Delete ${item.name}`}
                    title="Delete service"
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>
                <span className="pill subtle" style={{ '--pill': meta.color }}>
                  {meta.label}
                </span>
                <h2>{item.name}</h2>
                {item.description && <p className="clamp-3">{item.description}</p>}
                {item.location && (
                  <footer className="card-meta">
                    <Icon name="pin" size={15} />
                    <span>{item.location}</span>
                  </footer>
                )}
              </article>
            );
          })}
        </div>
      )}

      {open && (
        <Modal
          title="Add a city service"
          subtitle="Services appear in the public directory."
          onClose={() => setOpen(false)}
        >
          <ServiceForm
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
