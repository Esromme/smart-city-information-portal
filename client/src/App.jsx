import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabase.js';
import { api } from './api.js';
import { todayLabel } from './utils.js';

import Sidebar from './components/Sidebar.jsx';
import ThemeSelector from './components/ThemeSelector.jsx';
import { watchSystemTheme } from './theme.js';

import Overview from './pages/Overview.jsx';
import Announcements from './pages/Announcements.jsx';
import Services from './pages/Services.jsx';
import Transport from './pages/Transport.jsx';
import Weather from './pages/Weather.jsx';
import MapPage from './pages/MapPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

const ADMIN_PAGE = 'admin';

const PAGES = {
  overview: { label: 'Overview', component: Overview },
  announcements: { label: 'Announcements', component: Announcements },
  services: { label: 'Services', component: Services },
  transport: { label: 'Transport', component: Transport },
  weather: { label: 'Weather', component: Weather },
  map: { label: 'City map', component: MapPage },
};

const PAGE_LABELS = {
  ...Object.fromEntries(
    Object.entries(PAGES).map(([id, page]) => [id, page.label])
  ),
  [ADMIN_PAGE]: 'Administration',
};

function currentPage() {
  const hash = window.location.hash.replace('#', '');
  if (hash === ADMIN_PAGE) return ADMIN_PAGE;
  return PAGES[hash] ? hash : 'overview';
}

export default function App() {
  const [page, setPage] = useState(currentPage);
  const [online, setOnline] = useState(false);

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  // Keep navigation synchronized with the URL hash.
  useEffect(() => {
    const onHashChange = () => setPage(currentPage());

    window.addEventListener('hashchange', onHashChange);

    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  // Follow the operating system theme while "System" is selected.
  useEffect(() => watchSystemTheme(), []);

  const navigate = useCallback((next) => {
    if (next !== ADMIN_PAGE && !PAGES[next]) return;

    setPage(next);

    if (window.location.hash !== `#${next}`) {
      window.location.hash = next;
    }
  }, []);

  // Restore the existing session and listen for login/logout changes.
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (active) {
          setSession(data.session ?? null);
        }
      } catch (error) {
        if (active) {
          setAuthMessage(error.message || 'Could not restore your session.');
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;

      setSession(nextSession ?? null);
      setAuthMessage('');

      if (!nextSession) {
        setIsAdmin(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Ask the backend to verify administrator privileges for the current token.
  useEffect(() => {
    let active = true;

    if (!session?.access_token) {
      setIsAdmin(false);
      setAuthLoading(false);
      return () => {
        active = false;
      };
    }

    setAuthLoading(true);

    (async () => {
      try {
        const result = await api.auth.me(session.access_token);

        if (active) {
          setIsAdmin(result?.isAdmin === true);
        }
      } catch (error) {
        if (!active) return;

        setIsAdmin(false);

        if (error.status === 401) {
          setAuthMessage('Your session has expired. Please sign in again.');
          setSession(null);
          await supabase.auth.signOut().catch(() => {});
        } else if (error.status === 403) {
          setAuthMessage(
            'You are signed in, but this account is not an authorized administrator.'
          );
        } else if (error.status === 503) {
          setAuthMessage(
            'Administrator sign-in is not configured on the server.'
          );
        } else {
          setAuthMessage(error.message || 'Could not verify administrator access.');
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session?.access_token]);

  // Monitor backend and database availability.
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

  async function handleLogout() {
    setSigningOut(true);
    setAuthMessage('');

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setSession(null);
      setIsAdmin(false);
    } catch (error) {
      setAuthMessage(error.message || 'Could not sign out.');
    } finally {
      setSigningOut(false);
    }
  }

  const ActivePage = page === ADMIN_PAGE ? null : PAGES[page].component;

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <Sidebar
        page={page}
        onNavigate={navigate}
        online={online}
      />

      <main className="main" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <div className="crumbs">
            <span>Kombolcha</span>
            <span className="crumb-sep">/</span>
            <strong>{PAGE_LABELS[page]}</strong>
          </div>

          <div className="topbar-right">
            <span className={`live-pill ${online ? 'online' : ''}`}>
              <span
                className={`status-dot ${online ? 'online' : ''}`}
                aria-hidden="true"
              />
              {online ? 'Live' : 'Offline'}
            </span>

            <span className="topbar-date">{todayLabel()}</span>

            <ThemeSelector />

            {isAdmin ? (
              <div className="topbar-admin">
                <button
                  type="button"
                  className={`btn ghost small ${page === ADMIN_PAGE ? 'active' : ''}`}
                  onClick={() => navigate(ADMIN_PAGE)}
                >
                  Admin
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={handleLogout}
                  disabled={signingOut}
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`btn ghost small ${page === ADMIN_PAGE ? 'active' : ''}`}
                onClick={() => navigate(ADMIN_PAGE)}
              >
                Admin sign in
              </button>
            )}
          </div>
        </header>

        <div className="content">
          {page === ADMIN_PAGE ? (
            <AdminPage
              isAdmin={isAdmin}
              authLoading={authLoading}
              session={session}
              authMessage={authMessage}
              onLogin={(nextSession) => {
                setAuthMessage('');
                setSession(nextSession);
              }}
              onLogout={handleLogout}
              signingOut={signingOut}
              onNavigate={navigate}
            />
          ) : (
            <ActivePage onNavigate={navigate} isAdmin={isAdmin} />
          )}
        </div>
      </main>
    </div>
  );
}
