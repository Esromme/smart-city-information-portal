import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { FILTER_CATEGORIES, categoryMeta } from '../categories.js';
import { useApi } from '../hooks.js';
import { formatDate } from '../utils.js';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { AnnouncementForm } from '../components/Forms.jsx';

// The list endpoint already returns newest first; the toggle only re-orders the
// notices that are loaded on this page.
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

// Notices are long. "Read more" only appears when the preview hides text.
const PREVIEW_LIMIT = 160;

function publishedTime(value) {
  const time = new Date(value ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function hidesText(content) {
  return String(content ?? '').trim().length > PREVIEW_LIMIT;
}

function AdminActions({ item, onEdit, onDelete }) {
  return (
    <div className="card-actions ann-actions">
      <button
        type="button"
        className="icon-btn"
        onClick={() => onEdit(item)}
        aria-label={`Edit ${item.title}`}
        title="Edit announcement"
      >
        <Icon name="pencil" size={17} />
      </button>
      <button
        type="button"
        className="icon-btn danger"
        onClick={() => onDelete(item)}
        aria-label={`Delete ${item.title}`}
        title="Delete announcement"
      >
        <Icon name="trash" size={17} />
      </button>
    </div>
  );
}

function PublishedOn({ value }) {
  if (!value) return null;

  return (
    <span className="ann-meta">
      <Icon name="calendar" size={14} />
      <time dateTime={value}>{formatDate(value)}</time>
    </span>
  );
}

function ReadMore({ item, onOpen }) {
  if (!hidesText(item.content)) return null;

  return (
    <button type="button" className="ann-more" onClick={() => onOpen(item)}>
      Read more
      <Icon name="arrow" size={15} />
    </button>
  );
}

function FeaturedAnnouncement({ item, isAdmin, onOpen, onEdit, onDelete }) {
  const meta = categoryMeta(item.category);

  return (
    <div className="ann-featured-block">
      <span className="ann-featured-eyebrow">Latest announcement</span>
      <article className="ann-featured" style={{ '--tint': meta.color }}>
        <div className="ann-featured-top">
          <span className="ann-icon" aria-hidden="true">
            <Icon name={meta.icon} size={20} />
          </span>
          <span className="pill subtle">{meta.label}</span>
          {isAdmin && (
            <AdminActions item={item} onEdit={onEdit} onDelete={onDelete} />
          )}
        </div>

        <h3 className="ann-featured-title">{item.title}</h3>
        {item.content && <p className="ann-featured-body">{item.content}</p>}

        <footer className="ann-featured-foot">
          <PublishedOn value={item.published_at} />
          <ReadMore item={item} onOpen={onOpen} />
        </footer>
      </article>
    </div>
  );
}

function AnnouncementCard({ item, isAdmin, onOpen, onEdit, onDelete }) {
  const meta = categoryMeta(item.category);

  return (
    <article className="card ann-card" style={{ '--tint': meta.color }}>
      <div className="ann-card-top">
        <span className="ann-icon" aria-hidden="true">
          <Icon name={meta.icon} size={18} />
        </span>
        <span className="pill subtle">{meta.label}</span>
        {isAdmin && (
          <AdminActions item={item} onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>

      <h3 className="ann-card-title">{item.title}</h3>
      {item.content && <p className="ann-card-body">{item.content}</p>}

      <footer className="ann-card-foot">
        <PublishedOn value={item.published_at} />
        <ReadMore item={item} onOpen={onOpen} />
      </footer>
    </article>
  );
}

function AnnouncementsSkeleton() {
  return (
    <div
      className="ann-skeleton"
      role="status"
      aria-label="Loading announcements"
    >
      <div className="card ann-skeleton-hero">
        <span className="skeleton skeleton-icon" />
        <span className="skeleton skeleton-line title" />
        <span className="skeleton skeleton-line" />
        <span className="skeleton skeleton-line short" />
      </div>

      <div className="ann-feed">
        {[0, 1, 2].map((key) => (
          <div className="card ann-card" key={key}>
            <div className="ann-card-top">
              <span className="skeleton skeleton-icon" />
            </div>
            <span className="skeleton skeleton-line title" />
            <span className="skeleton skeleton-line" />
            <span className="skeleton skeleton-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Announcements({ isAdmin = false }) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [detailItem, setDetailItem] = useState(null);
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
    () => api.announcements.list({ category, search: query }),
    [category, query]
  );

  // Aggregate counts come from the existing public stats endpoint so the total
  // stays correct even when the list endpoint caps its page size.
  const stats = useApi(() => api.stats(), []);

  const announcements = data?.data ?? [];
  const listed = announcements.length;
  const filtering = Boolean(query) || category !== 'all';

  const categoryCounts = useMemo(() => {
    const rows = stats.data?.data?.byCategory?.announcements ?? [];
    return new Map(rows.map((row) => [row.category, row.count]));
  }, [stats.data]);

  const statsTotal = stats.data?.data?.totals?.announcements;
  const countsReady = Boolean(stats.data);

  // Prefer the aggregate total; fall back to the unfiltered list when stats are
  // unavailable, and stay quiet rather than showing a misleading number.
  const directoryTotal = Number.isFinite(statsTotal)
    ? statsTotal
    : filtering || loading
      ? null
      : listed;

  const allCount =
    countsReady && Number.isFinite(directoryTotal) ? directoryTotal : null;

  // Keep the newest notice highlighted even when the feed is sorted by oldest.
  const featured = useMemo(() => {
    if (announcements.length === 0) return null;

    return announcements.reduce((latest, item) =>
      publishedTime(item.published_at) > publishedTime(latest.published_at)
        ? item
        : latest
    );
  }, [announcements]);

  const ordered = useMemo(() => {
    if (sort === 'newest') return announcements;

    return [...announcements].sort(
      (a, b) => publishedTime(a.published_at) - publishedTime(b.published_at)
    );
  }, [announcements, sort]);

  // The highlighted notice is never repeated in the feed below it.
  const feed = useMemo(
    () => ordered.filter((item) => item.id !== featured?.id),
    [ordered, featured]
  );

  const resultsTitle = filtering
    ? 'Matching announcements'
    : 'All announcements';

  // A failed first load is explained by the error panel below; the inline alert
  // is only needed when stale results are still on screen beside it.
  const inlineError = actionError || (error && data ? error : null);

  const resultsHint =
    listed === 0
      ? null
      : filtering
        ? directoryTotal !== null && directoryTotal !== listed
          ? `Showing ${listed} of ${directoryTotal} announcements`
          : `Showing ${listed} ${
              listed === 1 ? 'announcement' : 'announcements'
            }`
        : sort === 'newest'
          ? 'Newest first'
          : 'Oldest first';

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
    setSort('newest');
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setActionError(null);
    setActionMessage(null);
    try {
      await api.announcements.remove(item.id);
      setActionMessage('Announcement deleted.');
      if (detailItem?.id === item.id) setDetailItem(null);
      await reload();
      stats.reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  const detailItemMeta = detailItem ? categoryMeta(detailItem.category) : null;

  return (
    <div className="page">
      <header className="page-head ann-head">
        <div className="ann-head-copy">
          <span className="eyebrow">Public notices</span>
          <h1>City Announcements</h1>
          <p>
            Official city updates, public notices and important information for
            Kombolcha residents.
          </p>
          {stats.loading && !stats.data ? (
            <span className="skeleton ann-count-skel" aria-hidden="true" />
          ) : directoryTotal !== null ? (
            <span className="ann-count" role="status" aria-live="polite">
              <span className="ann-count-icon" aria-hidden="true">
                <Icon name="megaphone" size={15} />
              </span>
              <span>
                <strong>{directoryTotal}</strong>{' '}
                {directoryTotal === 1
                  ? 'announcement published'
                  : 'announcements published'}
              </span>
            </span>
          ) : null}
        </div>

        {isAdmin && (
          <button type="button" className="btn primary" onClick={openCreate}>
            <Icon name="plus" size={18} />
            New announcement
          </button>
        )}
      </header>

      <section
        className="ann-panel"
        aria-label="Search and filter announcements"
      >
        <div className="ann-search">
          <Icon name="search" size={18} />
          <input
            type="search"
            name="announcement-search"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search announcements by title or message"
            aria-label="Search announcements by title or message"
          />
          {search && (
            <button
              type="button"
              className="ann-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              title="Clear search"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <div className="ann-controls">
          <div
            className="ann-filters"
            role="group"
            aria-label="Filter by category"
          >
            <button
              type="button"
              className={`ann-filter ${category === 'all' ? 'is-active' : ''}`}
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
            >
              <span className="ann-filter-icon" aria-hidden="true">
                <Icon name="grid" size={16} />
              </span>
              <span className="ann-filter-label">All</span>
              {allCount !== null && (
                <span className="ann-filter-count">{allCount}</span>
              )}
            </button>

            {FILTER_CATEGORIES.map((key) => {
              const meta = categoryMeta(key);
              const count = countsReady ? (categoryCounts.get(key) ?? 0) : null;

              return (
                <button
                  type="button"
                  key={key}
                  className={`ann-filter ${
                    category === key ? 'is-active' : ''
                  }`}
                  style={{ '--tint': meta.color }}
                  aria-pressed={category === key}
                  onClick={() => setCategory(key)}
                >
                  <span className="ann-filter-icon" aria-hidden="true">
                    <Icon name={meta.icon} size={16} />
                  </span>
                  <span className="ann-filter-label">{meta.label}</span>
                  {count !== null && (
                    <span
                      className={`ann-filter-count ${
                        count === 0 ? 'is-zero' : ''
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="ann-sort">
            <Icon name="sort" size={16} />
            <label htmlFor="announcement-sort">Sort</label>
            <select
              id="announcement-sort"
              name="announcement-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
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

      <section className="ann-results" aria-labelledby="ann-results-heading">
        <div className="ann-results-head">
          <h2 id="ann-results-heading">{resultsTitle}</h2>
          <div className="ann-results-side">
            {resultsHint && (
              <span className="ann-results-hint" role="status" aria-live="polite">
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
          <AnnouncementsSkeleton />
        ) : error && !data ? (
          <div className="empty-state" role="alert">
            <span className="empty-icon" aria-hidden="true">
              <Icon name="warning" size={26} />
            </span>
            <h3>Announcements are unavailable right now</h3>
            <p>{error}</p>
            <button type="button" className="btn" onClick={reload}>
              <Icon name="refresh" size={16} />
              Try again
            </button>
          </div>
        ) : listed === 0 ? (
          <EmptyState
            icon="megaphone"
            title={filtering ? 'No matching announcements' : 'No announcements yet'}
            description={
              filtering
                ? 'Try another category or a different search term.'
                : 'Publish the first notice for residents to see here.'
            }
            actionLabel={
              filtering ? 'Reset filters' : isAdmin ? 'New announcement' : undefined
            }
            actionIcon={filtering ? 'refresh' : 'plus'}
            onAction={filtering ? resetFilters : isAdmin ? openCreate : undefined}
          />
        ) : (
          <>
            {featured && (
              <FeaturedAnnouncement
                item={featured}
                isAdmin={isAdmin}
                onOpen={setDetailItem}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            )}

            {feed.length > 0 && (
              <div className="ann-feed">
                {feed.map((item) => (
                  <AnnouncementCard
                    key={item.id}
                    item={item}
                    isAdmin={isAdmin}
                    onOpen={setDetailItem}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {detailItem && (
        <Modal
          title={detailItem.title}
          subtitle={`${detailItemMeta.label}${
            detailItem.published_at
              ? ` · ${formatDate(detailItem.published_at)}`
              : ''
          }`}
          onClose={() => setDetailItem(null)}
        >
          <p className="ann-detail-body">{detailItem.content}</p>
        </Modal>
      )}

      {formOpen && (
        <Modal
          title={formItem ? 'Edit announcement' : 'New announcement'}
          subtitle="This will be visible to everyone using the portal."
          onClose={() => setFormOpen(false)}
        >
          <AnnouncementForm
            initial={formItem}
            onCancel={() => setFormOpen(false)}
            onSaved={async () => {
              setFormOpen(false);
              setActionMessage(
                formItem ? 'Announcement updated.' : 'Announcement published.'
              );
              await reload();
              stats.reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
