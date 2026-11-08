/**
 * Processes an array of settled die objects from @3d-dice/dice-box for damage rolls.
 * In Wayworlds, d10 damage values range from 1 to 10. If the physics engine
 * returns 0 on a 10-sided die face, it represents a 10.
 *
 * @param {Array<{ value?: number }>} results
 * @returns {{ total: number, dice: number[], count: number }}
 */
export function calculateDamageRoll(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return { total: 0, dice: [], count: 0 };
  }

  const flatResults = results.flat(Infinity);
  const dice = flatResults.map((d) => {
    const rawVal = Number(d?.value) || 0;
    return rawVal === 0 ? 10 : rawVal;
  });

  const total = dice.reduce((sum, val) => sum + val, 0);

  return {
    total,
    dice,
    count: dice.length
  };
}

/**
 * Processes settled die objects from @3d-dice/dice-box for percentile (d%) rolls.
 * The tens die is the lighter colored die (#77d19e, group 0).
 * The ones die is the darker colored die (#22384a, group 1).
 * On a d10 face showing 0 (raw value 0 or 10), the digit value is 0.
 * In Wayworlds, rolling 00 (tens 0 and ones 0) is 100.
 * All other rolls are tensDigit * 10 + onesDigit.
 *
 * @param {Array} results
 * @returns {{ total: number, tens: number, ones: number, valid: boolean }}
 */
export function calculatePercentileRoll(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return { total: 0, tens: 0, ones: 0, valid: false };
  }

  const flatResults = results.flat(Infinity);
  if (flatResults.length < 2) {
    return { total: 0, tens: 0, ones: 0, valid: false };
  }

  // Find tens die (group 0, theme 'custom-tens', or lighter color #1c8780 / #77d19e)
  const tensDie = flatResults.find(d => d?.groupId === 0 || d?.theme === 'custom-tens' || d?.themeColor?.toLowerCase() === '#1c8780' || d?.themeColor === '#77d19e') || flatResults[0];
  // Find ones die (group 1, theme 'custom-ones', or darker color #082b27 / #22384a)
  const onesDie = flatResults.find(d => d !== tensDie && (d?.groupId === 1 || d?.theme === 'custom-ones' || d?.themeColor?.toLowerCase() === '#082b27' || d?.themeColor === '#22384a')) ||
    flatResults.find(d => d !== tensDie) ||
    flatResults[1];

  const tensRaw = Number(tensDie?.value) || 0;
  const onesRaw = Number(onesDie?.value) || 0;

  const tensDigit = tensRaw % 10;
  const onesDigit = onesRaw % 10;

  let total;
  if (tensDigit === 0 && onesDigit === 0) {
    total = 100;
  } else {
    total = tensDigit * 10 + onesDigit;
  }

  return {
    total,
    tens: tensDigit,
    ones: onesDigit,
    valid: true
  };
}

/**
 * Processes settled die objects from @3d-dice/dice-box for combat initiative.
 * Die #1 (Players): theme 'custom-init-player', themeColor '#0b222e'.
 * Die #2 (Opposition): theme 'custom-init-opp', themeColor '#400a22'.
 * On a d10 face showing 0 (raw value 0 or 10), the roll value is 10 (range 1-10).
 *
 * @param {Array} results
 * @returns {{ playerRoll: number, oppRoll: number, winner: 'players'|'opposition'|'tie', valid: boolean }}
 */
export function calculateInitiativeRoll(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return { playerRoll: 0, oppRoll: 0, winner: 'tie', valid: false };
  }

  const flat = results.flat(Infinity);
  if (flat.length < 2) {
    return { playerRoll: 0, oppRoll: 0, winner: 'tie', valid: false };
  }

  // Find player die: groupId 0, theme 'custom-init-player', or themeColor '#16425a' / '#0b222e' / '#17304a'
  const playerDie = flat.find(d =>
    d?.groupId === 0 ||
    d?.theme === 'custom-init-player' ||
    d?.themeColor?.toLowerCase() === '#16425a' ||
    d?.themeColor?.toLowerCase() === '#0b222e' ||
    d?.themeColor?.toLowerCase() === '#17304a'
  ) || flat[0];

  // Find opposition die: groupId 1, theme 'custom-init-opp', or themeColor '#031016' / '#400a22'
  const oppDie = flat.find(d =>
    d !== playerDie && (
      d?.groupId === 1 ||
      d?.theme === 'custom-init-opp' ||
      d?.themeColor?.toLowerCase() === '#031016' ||
      d?.themeColor?.toLowerCase() === '#400a22'
    )
  ) || flat.find(d => d !== playerDie) || flat[1];

  const rawPlayer = Number(playerDie?.value) || 0;
  const rawOpp = Number(oppDie?.value) || 0;

  const playerRoll = (rawPlayer === 0 || rawPlayer === 10) ? 10 : (rawPlayer % 10 || 10);
  const oppRoll = (rawOpp === 0 || rawOpp === 10) ? 10 : (rawOpp % 10 || 10);

  let winner = 'tie';
  if (playerRoll > oppRoll) {
    winner = 'players';
  } else if (oppRoll > playerRoll) {
    winner = 'opposition';
  }

  return {
    playerRoll,
    oppRoll,
    winner,
    valid: true,
  };
}
