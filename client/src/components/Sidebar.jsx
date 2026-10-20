import Icon from './Icon.jsx';
import SmartCityLogo from './SmartCityLogo.jsx';

const NAV = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'announcements', label: 'Announcements', icon: 'megaphone' },
  { id: 'services', label: 'Services', icon: 'briefcase' },
  { id: 'transport', label: 'Transport', icon: 'bus' },
  { id: 'weather', label: 'Weather', icon: 'cloud' },
  { id: 'map', label: 'City map', icon: 'map' },
];

export default function Sidebar({ page, onNavigate, online }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <SmartCityLogo size={40} showWordmark />
      </div>

      <nav className="nav" aria-label="Main navigation">
        <span className="nav-label">Menu</span>
        {NAV.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            aria-current={page === item.id ? 'page' : undefined}
            onClick={(event) => {
              // Let modified clicks open the page in a new tab as usual.
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
              }
              event.preventDefault();
              onNavigate(item.id);
            }}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </a>
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
