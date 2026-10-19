import Icon from './Icon.jsx';

const NAV = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'announcements', label: 'Announcements', icon: 'megaphone' },
  { id: 'services', label: 'Services', icon: 'briefcase' },
  { id: 'map', label: 'City map', icon: 'map' },
];

export default function Sidebar({ page, onNavigate, online }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">K</span>
        <span className="brand-text">
          <strong>Kombolcha</strong>
          <span>Smart City</span>
        </span>
      </div>

      <nav className="nav" aria-label="Main navigation">
        <span className="nav-label">Menu</span>
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className={`status-dot ${online ? 'online' : ''}`} aria-hidden="true" />
        <span className="status-text">
          <strong>{online ? 'Systems online' : 'API offline'}</strong>
          <span>{online ? 'Live city data' : 'Check the server'}</span>
        </span>
      </div>
    </aside>
  );
}
