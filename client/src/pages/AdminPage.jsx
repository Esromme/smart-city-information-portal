import AdminLogin from '../components/AdminLogin.jsx';
import Icon from '../components/Icon.jsx';

const QUICK_LINKS = [
  { id: 'announcements', label: 'Manage announcements', icon: 'megaphone' },
  { id: 'services', label: 'Manage services', icon: 'briefcase' },
  { id: 'map', label: 'Manage map locations', icon: 'map' },
];

export default function AdminPage({
  isAdmin,
  authLoading,
  session,
  authMessage,
  onLogin,
  onLogout,
  signingOut,
  onNavigate,
}) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Restricted area</span>
          <h1>Administration</h1>
          <p>Sign in to publish announcements and manage the city directory.</p>
        </div>
      </header>

      {authLoading ? (
        <div className="card admin-card">
          <p role="status">Checking administrator session…</p>
        </div>
      ) : isAdmin ? (
        <section className="card admin-card" aria-label="Administrator session">
          <div className="admin-identity">
            <span className="admin-avatar" aria-hidden="true">
              <Icon name="shield" size={22} />
            </span>
            <div>
              <strong>Signed in as administrator</strong>
              <span>{session?.user?.email}</span>
            </div>
          </div>

          <div className="admin-links">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.id}
                className="admin-link"
                href={`#${link.id}`}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  onNavigate?.(link.id);
                }}
              >
                <Icon name={link.icon} size={18} />
                {link.label}
                <Icon name="arrow" size={16} className="admin-link-arrow" />
              </a>
            ))}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={onLogout}
              disabled={signingOut}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </section>
      ) : (
        <section className="admin-panel">
          <AdminLogin onLogin={onLogin} />

          {authMessage && (
            <p className="alert" role="status">{authMessage}</p>
          )}

          <p className="field-hint">
            Public visitors can browse announcements, services and the map
            without signing in. Only authorized administrators can publish or
            edit content.
          </p>
        </section>
      )}
    </div>
  );
}
