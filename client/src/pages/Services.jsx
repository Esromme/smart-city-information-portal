import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { FILTER_CATEGORIES, categoryMeta } from '../categories.js';
import { useApi } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { ServiceForm } from '../components/Forms.jsx';

function ServiceCard({ item, isAdmin, onEdit, onDelete }) {
  const meta = categoryMeta(item.category);

  return (
    <article className="card svc-card" style={{ '--tint': meta.color }}>
      <div className="svc-card-top">
        <span className="svc-card-icon" aria-hidden="true">
          <Icon name={meta.icon} size={20} />
        </span>
        <span className="pill subtle svc-card-pill">{meta.label}</span>
        {isAdmin && (
          <div className="card-actions svc-card-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => onEdit(item)}
              aria-label={`Edit ${item.name}`}
              title="Edit service"
            >
              <Icon name="pencil" size={17} />
            </button>
            <button
              type="button"
              className="icon-btn danger"
              onClick={() => onDelete(item)}
              aria-label={`Delete ${item.name}`}
              title="Delete service"
            >
              <Icon name="trash" size={17} />
            </button>
          </div>
        )}
      </div>

      <h3 className="svc-card-name">{item.name}</h3>
      {item.description && <p className="svc-card-desc">{item.description}</p>}
      {item.location && (
        <p className="svc-card-meta">
          <Icon name="pin" size={15} />
          <span>{item.location}</span>
        </p>
      )}
    </article>
  );
}

function ServiceSkeleton() {
  return (
    <div className="svc-grid" role="status" aria-label="Loading services">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="card svc-card" key={index}>
          <div className="svc-card-top">
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

export default function Services({ isAdmin = false }) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [formItem, setFormItem] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Debounce typing so the list is not re-fetched on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, loading, error, reload } = useApi(
    () => api.services.list({ category, search: query }),
    [category, query]
  );

  // Aggregate counts come from the existing public stats endpoint so the total
  // stays correct even when the list endpoint caps its page size.
  const stats = useApi(() => api.stats(), []);

  const services = data?.data ?? [];
  const listed = services.length;
  const filtering = Boolean(query) || category !== 'all';

  const categoryCounts = useMemo(() => {
    const rows = stats.data?.data?.byCategory?.services ?? [];
    return new Map(rows.map((row) => [row.category, row.count]));
  }, [stats.data]);

  const statsTotal = stats.data?.data?.totals?.services;
  const countsReady = Boolean(stats.data);

  // Prefer the aggregate total; fall back to the unfiltered list when stats are
  // unavailable, and stay quiet rather than showing a misleading number.
  const directoryTotal = Number.isFinite(statsTotal)
    ? statsTotal
    : filtering || loading
      ? null
      : listed;

  // Every canonical category gets a number once the aggregate is available, so
  // an empty category reads as "0" instead of a missing value.
  const allCount =
    countsReady && Number.isFinite(directoryTotal) ? directoryTotal : null;

  const resultsTitle = filtering ? 'Matching services' : 'All services';

  // A failed first load is explained by the error panel below; the inline alert
  // is only needed when stale results are still on screen beside it.
  const inlineError = actionError || (error && data ? error : null);

  const resultsHint =
    listed === 0
      ? null
      : filtering
        ? directoryTotal !== null && directoryTotal !== listed
          ? `Showing ${listed} of ${directoryTotal} services`
          : `Showing ${listed} ${listed === 1 ? 'service' : 'services'}`
        : 'Sorted A to Z';

  function openCreate() {
    setFormItem(null);
    setFormOpen(true);
  }

  function openEdit(item) {
    setFormItem(item);
    setFormOpen(true);
  }

  function resetFilters() {
    setSearch('');
    setQuery('');
    setCategory('all');
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete the service "${item.name}"?`)) return;
    setActionError(null);
    setActionMessage(null);
    try {
      await api.services.remove(item.id);
      setActionMessage('Service deleted.');
      await reload();
      stats.reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <div className="page services-page">
      <header className="page-head svc-head">
        <div className="svc-head-copy">
          <span className="eyebrow">Directory</span>
          <h1>City Services</h1>
          <p>
            Discover city services and important public resources available to
            Kombolcha residents.
          </p>
          {stats.loading && !stats.data ? (
            <span className="skeleton svc-count-skel" aria-hidden="true" />
          ) : directoryTotal !== null ? (
            <span className="svc-count" role="status" aria-live="polite">
              <span className="svc-count-icon" aria-hidden="true">
                <Icon name="briefcase" size={15} />
              </span>
              <span>
                <strong>{directoryTotal}</strong>{' '}
                {directoryTotal === 1 ? 'service' : 'services'} available
              </span>
            </span>
          ) : null}
        </div>

        {isAdmin && (
          <button type="button" className="btn primary" onClick={openCreate}>
            <Icon name="plus" size={18} />
            Add service
          </button>
        )}
      </header>

      <section
        className="svc-panel"
        aria-label="Search and filter city services"
      >
        <div className="svc-search">
          <Icon name="search" size={18} />
          <input
            type="search"
            name="service-search"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, description or location"
            aria-label="Search services by name, description or location"
          />
          {search && (
            <button
              type="button"
              className="svc-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              title="Clear search"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <div
          className="svc-filters"
          role="group"
          aria-label="Filter by category"
        >
          <button
            type="button"
            className={`svc-filter ${category === 'all' ? 'is-active' : ''}`}
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            <span className="svc-filter-icon" aria-hidden="true">
              <Icon name="grid" size={16} />
            </span>
            <span className="svc-filter-label">All</span>
            {allCount !== null && (
              <span className="svc-filter-count">{allCount}</span>
            )}
          </button>

          {FILTER_CATEGORIES.map((key) => {
            const meta = categoryMeta(key);
            const count = countsReady ? (categoryCounts.get(key) ?? 0) : null;

            return (
              <button
                type="button"
                key={key}
                className={`svc-filter ${category === key ? 'is-active' : ''}`}
                style={{ '--tint': meta.color }}
                aria-pressed={category === key}
                onClick={() => setCategory(key)}
              >
                <span className="svc-filter-icon" aria-hidden="true">
                  <Icon name={meta.icon} size={16} />
                </span>
                <span className="svc-filter-label">{meta.label}</span>
                {count !== null && (
                  <span
                    className={`svc-filter-count ${count === 0 ? 'is-zero' : ''}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {inlineError && (
        <div className="alert" role="alert">
          {inlineError}
        </div>
      )}

      {actionMessage && (
        <div className="alert success" role="status">
          {actionMessage}
        </div>
      )}

      <section className="svc-results" aria-labelledby="svc-results-heading">
        <div className="svc-results-head">
          <h2 id="svc-results-heading">{resultsTitle}</h2>
          <div className="svc-results-side">
            {resultsHint && (
              <span className="svc-results-hint" role="status" aria-live="polite">
                {resultsHint}
              </span>
            )}
            {filtering && listed > 0 && (
              <button
                type="button"
                className="btn ghost small"
                onClick={resetFilters}
              >
                <Icon name="close" size={15} />
                Reset filters
              </button>
            )}
          </div>
        </div>

        {loading && !data ? (
          <ServiceSkeleton />
        ) : error && !data ? (
          <div className="empty-state" role="alert">
            <span className="empty-icon" aria-hidden="true">
              <Icon name="warning" size={26} />
            </span>
            <h3>Services are unavailable right now</h3>
            <p>{error}</p>
            <button type="button" className="btn" onClick={reload}>
              <Icon name="refresh" size={16} />
              Try again
            </button>
          </div>
        ) : listed === 0 ? (
          <EmptyState
            icon="briefcase"
            title={filtering ? 'No matching services' : 'No services listed'}
            description={
              filtering
                ? 'No services match this search. Try a different term or category.'
                : 'City services will appear here once they are added to the directory.'
            }
            actionLabel={
              filtering ? 'Reset filters' : isAdmin ? 'Add service' : undefined
            }
            actionIcon={filtering ? 'refresh' : 'plus'}
            onAction={filtering ? resetFilters : isAdmin ? openCreate : undefined}
          />
        ) : (
          <div className="svc-grid">
            {services.map((item) => (
              <ServiceCard
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      {formOpen && (
        <Modal
          title={formItem ? 'Edit city service' : 'Add a city service'}
          subtitle="Services appear in the public directory."
          onClose={() => setFormOpen(false)}
        >
          <ServiceForm
            initial={formItem}
            onCancel={() => setFormOpen(false)}
            onSaved={async () => {
              setFormOpen(false);
              setActionMessage(formItem ? 'Service updated.' : 'Service added.');
              await reload();
              stats.reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
