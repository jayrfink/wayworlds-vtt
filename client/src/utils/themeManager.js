export const COLOR_PKG_STORAGE_KEY = 'wayworlds_color_pkg';

export const THEME_KEY_ALIASES = {
  greens: 'emerald',
  blues: 'azure',
  maroons: 'plum',
  'oranges-maroon': 'copper',
  'blues-greens': 'silver',
  'dark-grey': 'shadow',
  dark_grey: 'shadow',
};

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
    key: 'shadow',
    label: 'Shadow',
    widgetColor: '#545d68',
    borderColor: '#30363d',
    widgetTrack: '#111418',
    brightColor: '#8b949e',
    headerColor: '#c8c8c8',
    staColor: '#8b949e',
    essColor: '#6e7681',
  },
  {
    key: 'emerald',
    label: 'Emerald',
    widgetColor: '#1b7a4d',
    borderColor: '#0d3822',
    widgetTrack: '#081a10',
    brightColor: '#10b981',
    headerColor: '#34d399',
    staColor: '#10b981',
    essColor: '#059669',
  },
  {
    key: 'azure',
    label: 'Azure',
    widgetColor: '#4cb2d4',
    borderColor: '#347b93',
    widgetTrack: '#1c4452',
    brightColor: '#38bdf8',
    headerColor: '#7dd3fc',
    staColor: '#38bdf8',
    essColor: '#67e8f9',
  },
  {
    key: 'plum',
    label: 'Plum',
    widgetColor: '#bc3846',
    borderColor: '#72222a',
    widgetTrack: '#2d0b0f',
    brightColor: '#f4a9b0',
    headerColor: '#fbc5cb',
    staColor: '#f4a9b0',
    essColor: '#fbc5cb',
  },
  {
    key: 'copper',
    label: 'Copper',
    widgetColor: '#d46a2b',
    borderColor: '#853146',
    widgetTrack: '#1f090f',
    brightColor: '#fb923c',
    headerColor: '#fdba74',
    staColor: '#fb923c',
    essColor: '#f43f5e',
  },
  {
    key: 'rust',
    label: 'Rust',
    widgetColor: '#7f513e',
    borderColor: '#543325',
    widgetTrack: '#180e0a',
    brightColor: '#c27a59',
    headerColor: '#c8c8c8',
    staColor: '#c27a59',
    essColor: '#7f513e',
  },
  {
    key: 'oceanic',
    label: 'Oceanic',
    widgetColor: '#27b3a7',
    borderColor: '#186d66',
    widgetTrack: '#092522',
    brightColor: '#8ee6df',
    headerColor: '#c8c8c8',
    staColor: '#8ee6df',
    essColor: '#27b3a7',
  },
  {
    key: 'crimson',
    label: 'Crimson',
    widgetColor: '#b3273a',
    borderColor: '#6d1823',
    widgetTrack: '#25090d',
    brightColor: '#e68e9a',
    headerColor: '#c8c8c8',
    staColor: '#e68e9a',
    essColor: '#b3273a',
  },
  {
    key: 'forest',
    label: 'Forest',
    widgetColor: '#3dd465',
    borderColor: '#1d8639',
    widgetTrack: '#092511',
    brightColor: '#abedbd',
    headerColor: '#c8c8c8',
    staColor: '#abedbd',
    essColor: '#3dd465',
  },
  {
    key: 'indiglo',
    label: 'Indiglo',
    widgetColor: '#2d798a',
    borderColor: '#1b4a55',
    widgetTrack: '#0b1e23',
    brightColor: '#69bcce',
    headerColor: '#c8c8c8',
    staColor: '#69bcce',
    essColor: '#2d798a',
  },
  {
    key: 'fire',
    label: 'Fire',
    widgetColor: '#fa982f',
    borderColor: '#9e4e0c',
    widgetTrack: '#251205',
    brightColor: '#ffb259',
    headerColor: '#c8c8c8',
    staColor: '#ffb259',
    essColor: '#fa982f',
  },
  {
    key: 'lime',
    label: 'Lime',
    widgetColor: '#bdff7a',
    borderColor: '#578f1e',
    widgetTrack: '#172509',
    brightColor: '#ccf7a1',
    headerColor: '#c8c8c8',
    staColor: '#ccf7a1',
    essColor: '#bdff7a',
  },
  {
    key: 'brighteal',
    label: 'Brighteal',
    widgetColor: '#bffff7',
    borderColor: '#236b65',
    widgetTrack: '#092321',
    brightColor: '#bffff7',
    headerColor: '#c8c8c8',
    staColor: '#bffff7',
    essColor: '#7afff0',
  },
];

export const DEFAULT_COLOR_PACKAGE = 'silver';

export function normalizeColorPackage(pkgKey) {
  if (!pkgKey) return DEFAULT_COLOR_PACKAGE;
  return THEME_KEY_ALIASES[pkgKey] || pkgKey;
}

export function isValidColorPackage(pkgKey) {
  if (pkgKey === 'blues-greens') return false;
  const normalized = normalizeColorPackage(pkgKey);
  return COLOR_PACKAGES.some((p) => p.key === normalized);
}

export function getSavedColorPackage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(COLOR_PKG_STORAGE_KEY);
      if (saved && isValidColorPackage(saved)) {
        return normalizeColorPackage(saved);
      }
    }
  } catch {
    // Ignore storage errors in SSR / restricted contexts
  }
  return DEFAULT_COLOR_PACKAGE;
}

export function applyColorPackage(pkgKey) {
  const normalized = normalizeColorPackage(pkgKey);
  const validKey = isValidColorPackage(normalized) ? normalized : DEFAULT_COLOR_PACKAGE;
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
