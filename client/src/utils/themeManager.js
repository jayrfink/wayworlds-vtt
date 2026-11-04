export const COLOR_PKG_STORAGE_KEY = 'wayworlds_color_pkg';

export const COLOR_PACKAGES = [
  {
    key: 'silver',
    label: 'Silver',
    widgetColor: '#7d8590',
    borderColor: '#484f58',
    widgetTrack: '#161b22',
    brightColor: '#c0c0c0',
    headerColor: '#c8c8c8',
    staColor: '#c0c0c0',
    essColor: '#a8b4c0',
  },
  {
    key: 'dark-grey',
    label: 'Dark Grey',
    widgetColor: '#545d68',
    borderColor: '#30363d',
    widgetTrack: '#111418',
    brightColor: '#8b949e',
    headerColor: '#c8c8c8',
    staColor: '#8b949e',
    essColor: '#6e7681',
  },
  {
    key: 'greens',
    label: 'Greens (Emerald)',
    widgetColor: '#1b7a4d',
    borderColor: '#0d3822',
    widgetTrack: '#081a10',
    brightColor: '#10b981',
    headerColor: '#34d399',
    staColor: '#10b981',
    essColor: '#059669',
  },
  {
    key: 'blues',
    label: 'Blues',
    widgetColor: '#4cb2d4',
    borderColor: '#347b93',
    widgetTrack: '#1c4452',
    brightColor: '#38bdf8',
    headerColor: '#7dd3fc',
    staColor: '#38bdf8',
    essColor: '#67e8f9',
  },
  {
    key: 'blues-greens',
    label: 'Blues & Greens',
    widgetColor: '#4cb2d4',
    borderColor: '#0d3822',
    widgetTrack: '#081a10',
    brightColor: '#10b981',
    headerColor: '#34d399',
    staColor: '#10b981',
    essColor: '#38bdf8',
  },
  {
    key: 'maroons',
    label: 'Maroons',
    widgetColor: '#853146',
    borderColor: '#521d2a',
    widgetTrack: '#1f090f',
    brightColor: '#e25b7a',
    headerColor: '#ff7597',
    staColor: '#e25b7a',
    essColor: '#ff7597',
  },
  {
    key: 'oranges-maroon',
    label: 'Oranges & Maroon',
    widgetColor: '#d46a2b',
    borderColor: '#853146',
    widgetTrack: '#1f090f',
    brightColor: '#fb923c',
    headerColor: '#fdba74',
    staColor: '#fb923c',
    essColor: '#f43f5e',
  },
];

export const DEFAULT_COLOR_PACKAGE = 'silver';

export function isValidColorPackage(pkgKey) {
  return COLOR_PACKAGES.some((p) => p.key === pkgKey);
}

export function getSavedColorPackage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(COLOR_PKG_STORAGE_KEY);
      if (saved && isValidColorPackage(saved)) {
        return saved;
      }
    }
  } catch {
    // Ignore storage errors in SSR / restricted contexts
  }
  return DEFAULT_COLOR_PACKAGE;
}

export function applyColorPackage(pkgKey) {
  const validKey = isValidColorPackage(pkgKey) ? pkgKey : DEFAULT_COLOR_PACKAGE;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COLOR_PKG_STORAGE_KEY, validKey);
    }
  } catch {
    // Ignore storage errors
  }
  if (typeof document !== 'undefined') {
    if (document.documentElement) {
      document.documentElement.setAttribute('data-color-pkg', validKey);
    }
    if (document.body) {
      document.body.setAttribute('data-color-pkg', validKey);
    }
  }
  return validKey;
}

export function initColorPackage() {
  const saved = getSavedColorPackage();
  return applyColorPackage(saved);
}
