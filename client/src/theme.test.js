import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'kombolcha-theme';

function createMatchMedia(initialMatches) {
  const listeners = new Set();
  const state = { matches: initialMatches };

  return {
    media: '(prefers-color-scheme: dark)',
    get matches() {
      return state.matches;
    },
    addEventListener(type, listener) {
      if (type === 'change') listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === 'change') listeners.delete(listener);
    },
    addListener(listener) {
      listeners.add(listener);
    },
    removeListener(listener) {
      listeners.delete(listener);
    },
    dispatch(next) {
      state.matches = next;
      listeners.forEach((listener) => listener({ matches: next }));
    },
  };
}

let media;

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-theme-preference');
  document.documentElement.style.colorScheme = '';

  media = createMatchMedia(false);
  vi.stubGlobal('matchMedia', vi.fn(() => media));

  vi.resetModules();
});

async function loadTheme() {
  return import('./theme.js');
}

describe('theme preference', () => {
  it('defaults to system and resolves to light when the OS is light', async () => {
    const theme = await loadTheme();

    expect(theme.DEFAULT_THEME).toBe('system');
    expect(theme.getTheme()).toBe('system');
    expect(theme.resolveTheme('system')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('resolves system to dark when the OS prefers dark', async () => {
    media.dispatch(true);
    const theme = await loadTheme();

    expect(theme.resolveTheme('system')).toBe('dark');
  });

  it('applies and reflects the chosen theme on the document', async () => {
    const theme = await loadTheme();

    expect(theme.applyTheme('dark')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme-preference')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    expect(theme.applyTheme('light')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('persists the selection and updates the document', async () => {
    const theme = await loadTheme();

    const result = theme.setTheme('dark');

    expect(result).toBe('dark');
    expect(theme.getTheme()).toBe('dark');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('restores a saved preference on load', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');
    const theme = await loadTheme();

    expect(theme.getTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('ignores invalid stored values and falls back to system', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'neon');
    const theme = await loadTheme();

    expect(theme.getTheme()).toBe('system');
  });

  it('follows OS theme changes while system is selected', async () => {
    const theme = await loadTheme();

    expect(theme.getTheme()).toBe('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    const stop = theme.watchSystemTheme();
    media.dispatch(true);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    media.dispatch(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    stop();
  });

  it('does not follow OS changes once a concrete theme is chosen', async () => {
    const theme = await loadTheme();
    const stop = theme.watchSystemTheme();

    theme.setTheme('light');
    media.dispatch(true);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    stop();
  });
});
