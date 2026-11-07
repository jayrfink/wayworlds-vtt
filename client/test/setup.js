// Vitest test setup
// In Node 26+, Node provides an experimental undefined localStorage getter unless --localstorage-file is given.
// Happy-dom provides a full Web Storage API implementation on its Window instance,
// so we ensure globalThis.localStorage delegates to the environment's storage.

if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
  const winStorage = window.localStorage;
  if (globalThis !== window) {
    try {
      delete globalThis.localStorage;
    } catch {}
    try {
      globalThis.localStorage = winStorage;
    } catch {}
  }
} else if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== 'function') {
  const store = new Map();
  const mockStorage = {
    getItem: (key) => store.get(String(key)) ?? null,
    setItem: (key, val) => store.set(String(key), String(val)),
    removeItem: (key) => store.delete(String(key)),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => Array.from(store.keys())[i] ?? null,
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage = mockStorage;
    } catch {}
  }
  try {
    globalThis.localStorage = mockStorage;
  } catch {}
}
