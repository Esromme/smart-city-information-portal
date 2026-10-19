import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ANNOUNCEMENT_CATEGORIES, categoryMeta } from '../categories.js';
import { useApi } from '../hooks.js';
import { timeAgo } from '../utils.js';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { AnnouncementForm } from '../components/Forms.jsx';

export default function Announcements() {
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
    () => api.announcements.list({ category, search: query }),
    [category, query]
  );

  const announcements = data?.data ?? [];

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await api.announcements.remove(item.id);
      await reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Public notices</span>
          <h1>Announcements</h1>
          <p>Official updates for residents of Kombolcha.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          <Icon name="plus" size={18} />
          New announcement
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
          {ANNOUNCEMENT_CATEGORIES.map((key) => (
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
            placeholder="Search announcements"
            aria-label="Search announcements"
          />
        </label>
      </div>

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      {loading ? (
        <div className="announcement-grid">
          {[0, 1, 2, 3].map((key) => (
            <div className="card announcement-card" key={key}>
              <div className="skeleton skeleton-line short" />
              <div className="skeleton skeleton-line title" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon="megaphone"
          title={query || category !== 'all' ? 'No matching announcements' : 'No announcements yet'}
          description={
            query || category !== 'all'
              ? 'Try another category or a different search term.'
              : 'Publish the first notice for residents to see here.'
          }
          actionLabel={query || category !== 'all' ? undefined : 'New announcement'}
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="announcement-grid">
          {announcements.map((item) => {
            const meta = categoryMeta(item.category);
            return (
              <article className="card announcement-card" key={item.id}>
                <div className="card-top">
                  <span className="pill" style={{ '--pill': meta.color }}>
                    {meta.label}
                  </span>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => handleDelete(item)}
                    aria-label={`Delete ${item.title}`}
                    title="Delete announcement"
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>
                <h2>{item.title}</h2>
                <p className="clamp">{item.content}</p>
                <footer className="card-meta">
                  <Icon name="calendar" size={15} />
                  <span>{timeAgo(item.published_at)}</span>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {open && (
        <Modal
          title="New announcement"
          subtitle="This will be visible to everyone using the portal."
          onClose={() => setOpen(false)}
        >
          <AnnouncementForm
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
