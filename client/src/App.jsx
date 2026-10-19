import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { todayLabel } from './utils.js';
import Sidebar from './components/Sidebar.jsx';
import Overview from './pages/Overview.jsx';
import Announcements from './pages/Announcements.jsx';
import Services from './pages/Services.jsx';
import MapPage from './pages/MapPage.jsx';

const PAGES = {
  overview: { label: 'Overview', component: Overview },
  announcements: { label: 'Announcements', component: Announcements },
  services: { label: 'Services', component: Services },
  map: { label: 'City map', component: MapPage },
};

function currentPage() {
  const hash = window.location.hash.replace('#', '');
  return PAGES[hash] ? hash : 'overview';
}

export default function App() {
  const [page, setPage] = useState(currentPage);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const onHashChange = () => setPage(currentPage());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next) => {
    setPage(next);
    if (window.location.hash !== `#${next}`) {
      window.location.hash = next;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        await api.health();
        if (active) setOnline(true);
      } catch {
        if (active) setOnline(false);
      }
    }

    check();
    const timer = window.setInterval(check, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const ActivePage = PAGES[page].component;

  return (
    <div className="app">
      <Sidebar page={page} onNavigate={navigate} online={online} />

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            <span>Kombolcha</span>
            <span className="crumb-sep">/</span>
            <strong>{PAGES[page].label}</strong>
          </div>
          <div className="topbar-right">
            <span className={`live-pill ${online ? 'online' : ''}`}>
              <span className={`status-dot ${online ? 'online' : ''}`} aria-hidden="true" />
              {online ? 'Live' : 'Offline'}
            </span>
            <span className="topbar-date">{todayLabel()}</span>
          </div>
        </header>

        <div className="content">
          <ActivePage onNavigate={navigate} />
        </div>
      </main>
    </div>
  );
}
