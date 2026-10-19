import { useMemo } from 'react';
import { api } from '../api.js';
import { CATEGORY_META, categoryMeta } from '../categories.js';
import { useApi } from '../hooks.js';
import { timeAgo } from '../utils.js';
import Icon from '../components/Icon.jsx';

function StatCard({ icon, label, value, tone, caption }) {
  return (
    <div className="card stat-card">
      <span className="stat-icon" style={{ '--tint': tone }}>
        <Icon name={icon} size={22} />
      </span>
      <div className="stat-body">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
      {caption && <span className="stat-caption">{caption}</span>}
    </div>
  );
}

export default function Overview({ onNavigate }) {
  const stats = useApi(() => api.stats(), []);
  const recent = useApi(() => api.announcements.list({ limit: 4 }), []);

  const payload = stats.data?.data;
  const totals = payload?.totals ?? { announcements: 0, services: 0, locations: 0 };
  const announcements = recent.data?.data ?? [];

  const coverage = useMemo(() => {
    const byCategory = payload?.byCategory;
    if (!byCategory) return [];

    const rows = Object.keys(CATEGORY_META).map((key) => {
      const services = byCategory.services.find((row) => row.category === key)?.count ?? 0;
      const locations = byCategory.locations.find((row) => row.category === key)?.count ?? 0;
      return { key, services, locations, total: services + locations };
    });

    return rows.filter((row) => row.total > 0).sort((a, b) => b.total - a.total);
  }, [payload]);

  const maxCoverage = Math.max(1, ...coverage.map((row) => row.total));
  const activeCategories = coverage.length;

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-copy">
          <span className="eyebrow">City dashboard</span>
          <h1>Kombolcha, connected.</h1>
          <p>Announcements, public services and essential locations across the city, in one place.</p>
          <div className="hero-actions">
            <button type="button" className="btn primary" onClick={() => onNavigate('announcements')}>
              <Icon name="megaphone" size={18} />
              Read announcements
            </button>
            <button type="button" className="btn ghost" onClick={() => onNavigate('map')}>
              <Icon name="map" size={18} />
              Explore the map
            </button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="hero-orbit orbit-one" />
          <span className="hero-orbit orbit-two" />
          <span className="hero-pin">
            <Icon name="pin" size={26} />
          </span>
          <span className="hero-badge">
            <strong>11.08° N</strong>
            <span>39.74° E</span>
          </span>
        </div>
      </header>

      <section className="stats-grid" aria-label="City data summary">
        {stats.loading ? (
          [0, 1, 2, 3].map((key) => <div className="card stat-card skeleton skeleton-stat" key={key} />)
        ) : (
          <>
            <StatCard
              icon="megaphone"
              label="Announcements"
              value={totals.announcements}
              tone="#0d9488"
              caption="Public notices"
            />
            <StatCard
              icon="briefcase"
              label="Services"
              value={totals.services}
              tone="#6366f1"
              caption="In the directory"
            />
            <StatCard
              icon="pin"
              label="Mapped places"
              value={totals.locations}
              tone="#d97706"
              caption="On the city map"
            />
            <StatCard
              icon="spark"
              label="Active categories"
              value={activeCategories}
              tone="#059669"
              caption="Across the portal"
            />
          </>
        )}
      </section>

      {stats.error && <div className="alert">{stats.error}</div>}

      <div className="overview-grid">
        <section className="card panel">
          <header className="panel-head">
            <div>
              <h2>Latest announcements</h2>
              <p>Recent notices from the city administration.</p>
            </div>
            <button type="button" className="btn ghost small" onClick={() => onNavigate('announcements')}>
              View all
              <Icon name="arrow" size={16} />
            </button>
          </header>

          {recent.loading ? (
            <div className="recent-list">
              {[0, 1, 2].map((key) => (
                <div className="recent-item" key={key}>
                  <div className="skeleton skeleton-dot" />
                  <div className="recent-body">
                    <div className="skeleton skeleton-line title" />
                    <div className="skeleton skeleton-line short" />
                  </div>
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <p className="panel-empty">
              No announcements yet. <button type="button" className="link" onClick={() => onNavigate('announcements')}>Publish the first one</button>.
            </p>
          ) : (
            <ul className="recent-list">
              {announcements.map((item) => {
                const meta = categoryMeta(item.category);
                return (
                  <li key={item.id}>
                    <button type="button" className="recent-item" onClick={() => onNavigate('announcements')}>
                      <span className="recent-dot" style={{ '--dot': meta.color }} />
                      <span className="recent-body">
                        <strong>{item.title}</strong>
                        <span>
                          {meta.label} · {timeAgo(item.published_at)}
                        </span>
                      </span>
                      <Icon name="arrow" size={17} className="recent-arrow" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card panel">
          <header className="panel-head">
            <div>
              <h2>Service coverage</h2>
              <p>Services and mapped places by category.</p>
            </div>
          </header>

          {stats.loading ? (
            <div className="coverage">
              {[0, 1, 2, 3].map((key) => (
                <div className="skeleton skeleton-line" key={key} />
              ))}
            </div>
          ) : coverage.length === 0 ? (
            <p className="panel-empty">Category data will appear once services are added.</p>
          ) : (
            <div className="coverage">
              {coverage.map((row) => {
                const meta = categoryMeta(row.key);
                return (
                  <div className="coverage-row" key={row.key}>
                    <div className="coverage-label">
                      <span className="recent-dot" style={{ '--dot': meta.color }} />
                      <span>{meta.label}</span>
                      <strong>{row.total}</strong>
                    </div>
                    <div className="coverage-track">
                      <span
                        className="coverage-fill"
                        style={{ width: `${Math.max(6, (row.total / maxCoverage) * 100)}%`, background: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button type="button" className="btn ghost small panel-cta" onClick={() => onNavigate('services')}>
            Browse services
            <Icon name="arrow" size={16} />
          </button>
        </section>
      </div>
    </div>
  );
}
