// Vitest test setup
// In Node 26+, Node provides an experimental undefined localStorage getter unless --localstorage-file is given.
// Happy-dom provides a full Web Storage API implementation on its Window instance,
// so we ensure globalThis.localStorage delegates to the environment's storage.

if (typeof window !== 'undefined' && window.localStorage) {
  delete globalThis.localStorage;
  globalThis.localStorage = window.localStorage;
} else if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== 'function') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(String(key)) ?? null,
    setItem: (key, val) => store.set(String(key), String(val)),
    removeItem: (key) => store.delete(String(key)),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => Array.from(store.keys())[i] ?? null,
  };
}
