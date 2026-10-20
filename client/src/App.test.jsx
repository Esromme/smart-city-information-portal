import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  me: vi.fn(),
  health: vi.fn(),
  stats: vi.fn(),
  announcementsList: vi.fn(),
}));

vi.mock('./lib/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
  },
}));

vi.mock('./api.js', () => ({
  api: {
    health: mocks.health,
    stats: mocks.stats,
    weather: vi.fn().mockResolvedValue({ data: null }),
    auth: { me: mocks.me },
    announcements: { list: mocks.announcementsList },
    services: { list: vi.fn().mockResolvedValue({ data: [] }) },
    locations: { list: vi.fn().mockResolvedValue({ data: [] }) },
  },
}));

let App;

beforeEach(async () => {
  Object.values(mocks).forEach((mock) => mock.mockReset());

  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))
  );

  mocks.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mocks.health.mockResolvedValue({ status: 'ok' });
  mocks.stats.mockResolvedValue({
    data: {
      totals: { announcements: 0, services: 0, locations: 0 },
      byCategory: { services: [], locations: [] },
    },
  });
  mocks.announcementsList.mockResolvedValue({ data: [] });

  vi.resetModules();
  ({ default: App } = await import('./App.jsx'));
});

describe('App theme selector', () => {
  it('renders the theme selector for public visitors', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<App />);

    expect(
      await screen.findByRole('group', { name: /colour theme/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /admin sign in/i })
    ).toBeInTheDocument();
  });

  it('renders the theme selector for administrators', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'token', user: { email: 'admin@kombolcha.gov.et' } } },
      error: null,
    });
    mocks.me.mockResolvedValue({ isAdmin: true });

    render(<App />);

    expect(
      await screen.findByRole('group', { name: /colour theme/i })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    );
  });
});
