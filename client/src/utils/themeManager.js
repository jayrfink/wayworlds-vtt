export const COLOR_PKG_STORAGE_KEY = 'wayworlds_color_pkg';

export const COLOR_PACKAGES = [
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
    key: 'greens',
    label: 'Greens',
    widgetColor: '#2b8c42',
    borderColor: '#1f542b',
    widgetTrack: '#131c15',
    brightColor: '#34d399',
    headerColor: '#4ade80',
    staColor: '#34d399',
    essColor: '#10b981',
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
    borderColor: '#2b8c42',
    widgetTrack: '#131c15',
    brightColor: '#2dd4bf',
    headerColor: '#5eead4',
    staColor: '#2dd4bf',
    essColor: '#38bdf8',
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

export const DEFAULT_COLOR_PACKAGE = 'maroons';

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
