import '@testing-library/jest-dom/vitest';

// Node 25 ships an experimental `localStorage` global that throws unless the
// process is started with `--localstorage-file`. jsdom's own Storage is not
// installed on top of it in this environment, so tests that exercise the theme
// preference would fail with "Cannot initialize local storage". Provide a small
// in-memory implementation instead.
function createMemoryStorage() {
  const store = new Map();

  return {
    get length() {
      return store.size;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key) {
      const value = store.get(String(key));
      return value === undefined ? null : value;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
  };
}

function installStorage(target) {
  if (!target) return;
  try {
    Object.defineProperty(target, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
  } catch {
    /* Leave the existing implementation in place if it cannot be replaced. */
  }
}

installStorage(globalThis);
if (typeof window !== 'undefined' && window !== globalThis) {
  installStorage(window);
}
