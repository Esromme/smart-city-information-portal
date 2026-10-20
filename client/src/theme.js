import { useSyncExternalStore } from 'react';

/**
 * Colour theme handling for the portal.
 *
 * A "preference" is what the user picked: `light`, `dark` or `system`.
 * The "theme" is the preference resolved to something concrete: `light` or
 * `dark`. `system` follows the operating system setting and updates live.
 *
 * Keep `THEME_STORAGE_KEY` in sync with the bootstrap script in index.html.
 */
export const THEME_STORAGE_KEY = 'kombolcha-theme';
export const THEMES = ['light', 'dark', 'system'];
export const DEFAULT_THEME = 'system';

export const THEME_LABELS = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export const THEME_ICONS = {
  light: 'sun',
  dark: 'moon',
  system: 'monitor',
};

const DARK_QUERY = '(prefers-color-scheme: dark)';

function supportsDom() {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}

function isTheme(value) {
  return THEMES.includes(value);
}

function readStoredTheme() {
  if (!supportsDom()) return DEFAULT_THEME;

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function systemPrefersDark() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  try {
    return window.matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

/** Resolve a preference to the concrete theme: `light` or `dark`. */
export function resolveTheme(preference) {
  if (preference === 'system' || !isTheme(preference)) {
    return systemPrefersDark() ? 'dark' : 'light';
  }

  return preference;
}

/** Write the resolved theme to the document so CSS can react to it. */
export function applyTheme(preference) {
  const theme = resolveTheme(preference);

  if (supportsDom()) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-preference', isTheme(preference) ? preference : DEFAULT_THEME);
    root.style.colorScheme = theme;
  }

  return theme;
}

// ---- tiny external store so every consumer stays in sync ----

let preference = readStoredTheme();
let revision = 0;
let snapshot = { preference, revision };
const listeners = new Set();

// Stable object for React's server snapshot; identity must not change.
const SERVER_SNAPSHOT = { preference: DEFAULT_THEME, revision: 0 };

function publish() {
  revision += 1;
  snapshot = { preference, revision };
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function getTheme() {
  return preference;
}

/** Save and apply a new theme preference. */
export function setTheme(next) {
  if (!isTheme(next) || next === preference) {
    // Still re-apply so a caller can force a sync with the document.
    applyTheme(preference);
    return preference;
  }

  preference = next;

  if (supportsDom()) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* Storage may be unavailable (private mode); the theme still applies. */
    }
  }

  applyTheme(preference);
  publish();

  return preference;
}

/** Subscribe to the operating system theme so `system` mode stays current. */
export function watchSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  let query;

  try {
    query = window.matchMedia(DARK_QUERY);
  } catch {
    return () => {};
  }

  const onChange = () => {
    if (preference === 'system') {
      applyTheme('system');
      // Notify subscribers so the resolved theme (and the live region that
      // announces it) stays in sync with the operating system.
      publish();
    }
  };

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }

  // Safari < 14 fallback.
  if (typeof query.addListener === 'function') {
    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }

  return () => {};
}

/** React hook: current preference plus its resolved theme and a setter. */
export function useTheme() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    theme: current.preference,
    resolved: resolveTheme(current.preference),
    setTheme,
  };
}

// Apply the stored preference as soon as this module loads. This is a safety
// net in addition to the inline bootstrap script in index.html.
if (supportsDom()) {
  applyTheme(preference);
}
