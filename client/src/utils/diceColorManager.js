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
  if (!storage) return;
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
  } catch (e) {
    // silently catch storage quota or security issues
  }
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
