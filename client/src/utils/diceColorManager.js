/**
 * Dice color configuration utility for Wayworlds VTT.
 * Manages user-customized dice colors for:
 * 1. Percentile Tens die
 * 2. Percentile Ones die
 * 3. Action / Damage d10s pool
 * 4. Initiative Players die
 * 5. Initiative Opposition die
 */

export const DEFAULT_DICE_COLORS = Object.freeze({
  percentileTens: '#77d19e', // Mint Green
  percentileOnes: '#38bdf8', // Azure Sky Blue
  damage: '#e38836',         // Amber / Crimson Fire
  initiativePlayer: '#0b222e', // Deep Navy Midnight
  initiativeOpp: '#400a22',    // Dark Wine Crimson
});

export const DICE_COLORS_STORAGE_KEY = 'wayworlds_dice_colors';

/**
 * Validates whether a given string is a valid 3- or 6-digit hex color code.
 * @param {string} val
 * @returns {boolean}
 */
export function isValidHexColor(val) {
  if (typeof val !== 'string') return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val.trim());
}

/**
 * Normalizes a hex color to 6-digit lowercase format.
 * @param {string} hex
 * @returns {string}
 */
export function normalizeHexColor(hex) {
  if (!isValidHexColor(hex)) return '#77d19e';
  const clean = hex.trim().toLowerCase();
  if (clean.length === 4) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return clean;
}

/**
 * Converts a hex color to RGB object.
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }}
 */
export function parseHexToRgb(hex) {
  let clean = String(hex || '').trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 119, g: 209, b: 158 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Computes standard relative luminance per WCAG 2.1 specs.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number}
 */
export function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Converts RGB to HSL.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{ h: number, s: number, l: number }}
 */
export function rgbToHsl(r, g, b) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }
  return { h, s, l };
}

/**
 * Converts HSL to 6-digit hex color string.
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {string}
 */
export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;

  if (h >= 0 && h < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (h >= 60 && h < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (h >= 120 && h < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (h >= 180 && h < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (h >= 240 && h < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  const toHex = (n) => Math.max(0, Math.min(255, Math.round((n + m) * 255))).toString(16).padStart(2, '0');
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

/**
 * Calculates WCAG contrast ratio between two hex colors.
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number}
 */
export function getContrastRatio(hex1, hex2) {
  const { r: r1, g: g1, b: b1 } = parseHexToRgb(hex1);
  const { r: r2, g: g2, b: b2 } = parseHexToRgb(hex2);
  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Automatically computes a high-contrast number color for a given die face background color.
 * If the die is dark blue, returns light blue. If dark red, returns light red.
 * If the color is desaturated or extreme (pitch black/white), returns near-white or near-black
 * to ensure numbers remain readable.
 *
 * @param {string} bgHex
 * @returns {string} High-contrast hex color for die face numbers
 */
export function getContrastingNumberColor(bgHex) {
  const normalized = normalizeHexColor(bgHex);
  const { r, g, b } = parseHexToRgb(normalized);
  const { h, s } = rgbToHsl(r, g, b);

  // Candidate 1: Light tint of the same hue (soft pastel / tinted light)
  const lightCandidate = hslToHex(h, Math.min(s * 0.7, 0.45), 0.94);
  // Candidate 2: Dark shade of the same hue (deep rich dark)
  const darkCandidate = hslToHex(h, Math.min(s * 0.85, 0.8), 0.08);

  const ratioLight = getContrastRatio(normalized, lightCandidate);
  const ratioDark = getContrastRatio(normalized, darkCandidate);

  if (ratioLight >= ratioDark) {
    // If contrast is below readable threshold (e.g. 4.5:1), push closer to pure white
    if (ratioLight < 4.5) {
      return hslToHex(h, Math.min(s * 0.25, 0.15), 0.98);
    }
    return lightCandidate;
  } else {
    // If contrast is below readable threshold, push closer to pure black
    if (ratioDark < 4.5) {
      return hslToHex(h, Math.min(s * 0.25, 0.15), 0.04);
    }
    return darkCandidate;
  }
}

/**
 * Loads saved dice colors from localStorage, merged with defaults.
 * @param {Storage} [storage=localStorage]
 * @returns {{ percentileTens: string, percentileOnes: string, damage: string, initiativePlayer: string, initiativeOpp: string }}
 */
export function getSavedDiceColors(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return { ...DEFAULT_DICE_COLORS };
  try {
    const raw = storage.getItem(DICE_COLORS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DICE_COLORS };
    const parsed = JSON.parse(raw);
    return {
      percentileTens: isValidHexColor(parsed?.percentileTens) ? normalizeHexColor(parsed.percentileTens) : DEFAULT_DICE_COLORS.percentileTens,
      percentileOnes: isValidHexColor(parsed?.percentileOnes) ? normalizeHexColor(parsed.percentileOnes) : DEFAULT_DICE_COLORS.percentileOnes,
      damage: isValidHexColor(parsed?.damage) ? normalizeHexColor(parsed.damage) : DEFAULT_DICE_COLORS.damage,
      initiativePlayer: isValidHexColor(parsed?.initiativePlayer) ? normalizeHexColor(parsed.initiativePlayer) : DEFAULT_DICE_COLORS.initiativePlayer,
      initiativeOpp: isValidHexColor(parsed?.initiativeOpp) ? normalizeHexColor(parsed.initiativeOpp) : DEFAULT_DICE_COLORS.initiativeOpp,
    };
  } catch (e) {
    return { ...DEFAULT_DICE_COLORS };
  }
}

/**
 * Saves dice colors to localStorage.
 * @param {Object} colors
 * @param {Storage} [storage=localStorage]
 */
export function saveDiceColors(colors, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return { ...DEFAULT_DICE_COLORS };
  try {
    const current = getSavedDiceColors(storage);
    const updated = {
      percentileTens: isValidHexColor(colors?.percentileTens) ? normalizeHexColor(colors.percentileTens) : current.percentileTens,
      percentileOnes: isValidHexColor(colors?.percentileOnes) ? normalizeHexColor(colors.percentileOnes) : current.percentileOnes,
      damage: isValidHexColor(colors?.damage) ? normalizeHexColor(colors.damage) : current.damage,
      initiativePlayer: isValidHexColor(colors?.initiativePlayer) ? normalizeHexColor(colors.initiativePlayer) : current.initiativePlayer,
      initiativeOpp: isValidHexColor(colors?.initiativeOpp) ? normalizeHexColor(colors.initiativeOpp) : current.initiativeOpp,
    };
    storage.setItem(DICE_COLORS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return getSavedDiceColors(storage);
  }
}

/**
 * Synchronizes user account dice color preferences with local storage.
 * If user has saved preferences, writes them to localStorage and returns them.
 * @param {Object} user User object containing optional preferences.dice_colors
 * @param {Storage} [storage=localStorage]
 * @returns {Object} Updated dice colors
 */
export function syncDiceColorsWithUser(user, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (user?.preferences?.dice_colors && typeof user.preferences.dice_colors === 'object') {
    return saveDiceColors(user.preferences.dice_colors, storage);
  }
  return getSavedDiceColors(storage);
}

/**
 * Resets dice colors in localStorage to defaults.
 * @param {Storage} [storage=localStorage]
 */
export function resetDiceColors(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return;
  try {
    storage.removeItem(DICE_COLORS_STORAGE_KEY);
  } catch (e) {}
}
