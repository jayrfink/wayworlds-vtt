import { diceRollQueue } from './diceRollQueue.js';
import { calculatePercentileRoll, calculateDamageRoll, calculateInitiativeRoll } from './diceUtils.js';

/**
 * Generate synthetic settled die result structures matching @3d-dice/dice-box output
 * when 3D physics cannot run (headless, rapid succession bypass, or cancelled animation).
 */
export function generateSyntheticRoll(notation) {
  if (!Array.isArray(notation)) return [];
  return notation.flatMap((group, groupIdx) => {
    const qty = Number(group.qty) || 1;
    const sides = Number(group.sides) || 10;
    const theme = group.theme || 'default';
    const themeColor = group.themeColor || '';
    const dice = [];
    for (let i = 0; i < qty; i++) {
      const val = Math.floor(Math.random() * sides) + 1;
      dice.push({
        value: val === 10 ? 0 : val, // In dice-box d10, 0 represents 10 or 0
        sides,
        theme,
        themeColor,
        groupId: groupIdx,
        rollId: `syn_${Date.now()}_${groupIdx}_${i}`
      });
    }
    return dice;
  });
}

let activeRollAborter = null;

/**
 * Aborts any currently animating 3D dice roll, immediately clearing physics meshes.
 */
export function abortCurrentRoll() {
  if (typeof activeRollAborter === 'function') {
    activeRollAborter();
    activeRollAborter = null;
  }
}

/**
 * Executes a 3D dice roll through the serializing DiceRollQueue.
 *
 * If a roll is triggered while a previous roll is active:
 * 1. The previous roll's promise & result are protected and never lost.
 * 2. If rapid rolls arrive in quick succession, each task executes in order.
 * 3. An animation timeout (or cancellation) falls back to synthetic dice calculation
 *    so every single roll is guaranteed to resolve and be logged to the server/HUD.
 *
 * @param {Object} diceBox - DiceBox instance (or null)
 * @param {Array} notation - Array of dice descriptors
 * @param {Object} options
 * @param {number} [options.timeoutMs=4000] - Max time to wait for 3D physics settling
 * @returns {Promise<Array>} Array of settled die results
 */
export async function executeQueuedDiceRoll(diceBox, notation, { timeoutMs = 4000 } = {}) {
  return diceRollQueue.enqueue(async () => {
    if (!diceBox || typeof diceBox.roll !== 'function') {
      return generateSyntheticRoll(notation);
    }

    let timer;
    const timeoutPromise = new Promise((resolve) => {
      timer = setTimeout(() => {
        resolve({ timedOut: true });
      }, timeoutMs);
    });

    let abortResolve;
    const abortPromise = new Promise((resolve) => {
      abortResolve = resolve;
    });
    activeRollAborter = () => {
      abortResolve({ cancelled: true });
    };

    try {
      // Clean notation by stripping reserved internal properties (like groupId) before passing to diceBox.roll()
      const cleanNotation = Array.isArray(notation)
        ? notation.map(({ groupId, ...rest }) => rest)
        : notation;

      const rollPromise = diceBox.roll(cleanNotation).catch((err) => {
        console.warn('3D dice roll error or cancelled:', err);
        return { cancelled: true };
      });

      const res = await Promise.race([rollPromise, timeoutPromise, abortPromise]);
      clearTimeout(timer);
      activeRollAborter = null;

      if (res && !res.timedOut && !res.cancelled && Array.isArray(res) && res.length > 0) {
        return res;
      }

      // If timed out or cancelled, clear diceBox so stuck meshes do not linger
      if (res?.timedOut || res?.cancelled) {
        try {
          if (typeof diceBox.clear === 'function') {
            diceBox.clear();
          }
        } catch (e) {
          console.warn('Failed to clear diceBox on timeout/cancel:', e);
        }
      }

      return generateSyntheticRoll(notation);
    } catch (err) {
      clearTimeout(timer);
      activeRollAborter = null;
      try {
        if (typeof diceBox.clear === 'function') {
          diceBox.clear();
        }
      } catch (e) {}
      console.warn('executeQueuedDiceRoll fallback:', err);
      return generateSyntheticRoll(notation);
    }
  });
}
