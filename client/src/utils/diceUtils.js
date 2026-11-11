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

  // Find tens die: check theme 'custom-tens', known tens colors, groupId 0, or lowest groupId
  let tensDie = flatResults.find(d => d?.theme === 'custom-tens' || d?.groupId === 0 || d?.themeColor?.toLowerCase() === '#1c8780' || d?.themeColor === '#77d19e');
  let onesDie = flatResults.find(d => d !== tensDie && (d?.theme === 'custom-ones' || d?.groupId === 1 || d?.themeColor?.toLowerCase() === '#082b27' || d?.themeColor === '#22384a'));

  if (!tensDie && !onesDie && flatResults.length >= 2) {
    if (typeof flatResults[0]?.groupId === 'number' && typeof flatResults[1]?.groupId === 'number' && flatResults[0].groupId !== flatResults[1].groupId) {
      if (flatResults[0].groupId < flatResults[1].groupId) {
        tensDie = flatResults[0];
        onesDie = flatResults[1];
      } else {
        tensDie = flatResults[1];
        onesDie = flatResults[0];
      }
    }
  }

  if (!tensDie) tensDie = flatResults[0];
  if (!onesDie) onesDie = flatResults.find(d => d !== tensDie) || flatResults[1];

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

  // Find player die: theme 'custom-init-player', groupId 0, or player colors
  let playerDie = flat.find(d =>
    d?.theme === 'custom-init-player' ||
    d?.groupId === 0 ||
    d?.themeColor?.toLowerCase() === '#16425a' ||
    d?.themeColor?.toLowerCase() === '#0b222e' ||
    d?.themeColor?.toLowerCase() === '#17304a'
  );

  // Find opposition die: theme 'custom-init-opp', groupId 1, or opposition colors
  let oppDie = flat.find(d =>
    d !== playerDie && (
      d?.theme === 'custom-init-opp' ||
      d?.groupId === 1 ||
      d?.themeColor?.toLowerCase() === '#031016' ||
      d?.themeColor?.toLowerCase() === '#400a22'
    )
  );

  if (!playerDie && !oppDie && flat.length >= 2) {
    if (typeof flat[0]?.groupId === 'number' && typeof flat[1]?.groupId === 'number' && flat[0].groupId !== flat[1].groupId) {
      if (flat[0].groupId < flat[1].groupId) {
        playerDie = flat[0];
        oppDie = flat[1];
      } else {
        playerDie = flat[1];
        oppDie = flat[0];
      }
    }
  }

  if (!playerDie) playerDie = flat[0];
  if (!oppDie) oppDie = flat.find(d => d !== playerDie) || flat[1];

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

/**
 * Recomputes a Character Sheet roll payload (label, total, breakdown, rollSummary)
 * using the actual settled 3D dice result from @3d-dice/dice-box on the VTT.
 *
 * @param {Object} roll - Existing roll record or draft roll object
 * @param {Object} settled - Output of calculatePercentileRoll() or calculateDamageRoll()
 * @returns {{ label: string, total: number, breakdown: string, rollSummary: Object }}
 */
export function applySettledSheetRoll(roll, settled) {
  const prevSummary = { ...(roll?.rollSummary || {}) };
  const charName = prevSummary.characterName || (typeof roll?.label === 'string' && roll.label.includes(':') ? roll.label.split(':')[0].trim() : 'Character');

  if (roll?.type === 'damage' || prevSummary.actionType === 'd10') {
    const dice = Array.isArray(settled?.dice) ? settled.dice : (Array.isArray(prevSummary.dice) ? prevSummary.dice : []);
    const count = settled?.count || dice.length || prevSummary.count || 1;
    const total = typeof settled?.total === 'number' ? settled.total : dice.reduce((s, v) => s + v, 0);
    const nextSummary = {
      ...prevSummary,
      actionType: 'd10',
      characterName: charName,
      count,
      dice,
      total,
      source: 'sheet',
      rolledOnVtt3d: true,
    };
    return {
      label: `${charName}: ${count}d10`,
      total,
      breakdown: `[${dice.join(', ')}]`,
      rollSummary: nextSummary,
    };
  }

  // Percentile roll (raw % Die, Strike, Shoot, or Grimoire Cast)
  const d100Roll = typeof settled?.total === 'number' && settled.total >= 1 && settled.total <= 100
    ? settled.total
    : (Number(roll?.total) || 1);
  const tens = typeof settled?.tens === 'number'
    ? settled.tens
    : Math.floor((d100Roll === 100 ? 0 : d100Roll) / 10);
  const ones = typeof settled?.ones === 'number'
    ? settled.ones
    : (d100Roll % 10);

  const actionType = prevSummary.actionType || (prevSummary.spellName ? 'cast' : 'percentile');

  if (actionType === 'strike' || actionType === 'shoot') {
    const targetPct = Number(prevSummary.targetPct) || 50;
    const isCrit = d100Roll <= 5 || (d100Roll <= targetPct && d100Roll % 11 === 0);
    const isFumble = d100Roll >= 96 || (d100Roll > targetPct && d100Roll % 11 === 0);
    const success = !isFumble && d100Roll <= targetPct;
    const outcomeLabel = isCrit ? 'CRITICAL HIT' : (isFumble ? 'FUMBLE' : (success ? 'HIT' : 'MISS'));
    const verb = actionType === 'shoot' ? 'Shoot' : 'Strike';
    const nextSummary = {
      ...prevSummary,
      actionType,
      characterName: charName,
      targetPct,
      d100Roll,
      total: d100Roll,
      tens,
      ones,
      success,
      isCrit,
      isFumble,
      outcomeLabel,
      source: 'sheet',
      rolledOnVtt3d: true,
    };
    return {
      label: `${charName}: ${verb} (${targetPct}%) - ${outcomeLabel}`,
      total: d100Roll,
      breakdown: `d100=${d100Roll} <= ${targetPct}% (${outcomeLabel})`,
      rollSummary: nextSummary,
    };
  }

  if (prevSummary.spellName) {
    const targetPct = Number(prevSummary.targetPct) || 50;
    const isWardHeal = Boolean(prevSummary.isWardHeal || prevSummary.category === 'ward_heal');
    const isCrit = d100Roll <= 5 || (d100Roll <= targetPct && d100Roll % 11 === 0);
    const isFumble = isWardHeal ? false : (d100Roll >= 96);
    const success = isWardHeal ? true : (!isFumble && d100Roll <= targetPct);
    const outcomeLabel = isCrit ? 'CRITICAL SUCCESS' : (isFumble ? 'FUMBLE' : (success ? 'SUCCESS' : 'FAILURE'));
    const nextSummary = {
      ...prevSummary,
      characterName: charName,
      targetPct,
      d100Roll,
      total: d100Roll,
      tens,
      ones,
      success,
      isCrit,
      isFumble,
      outcomeLabel,
      source: 'sheet',
      rolledOnVtt3d: true,
    };
    const fuelStr = String(prevSummary.fuel || 'ess').toUpperCase();
    const diceArr = Array.isArray(prevSummary.dice) ? prevSummary.dice : [];
    return {
      label: `${charName}: ${prevSummary.spellName} (${prevSummary.tradition || 'Arcane'} T${prevSummary.castTier || 1}, -${prevSummary.cost || 0} ${fuelStr}) - ${outcomeLabel}`,
      total: d100Roll,
      breakdown: `d100=${d100Roll} <= ${targetPct}% | Magnitude ${prevSummary.diceFormula || '0'}: ${prevSummary.effectTotal || 0} [${diceArr.join(', ')}]`,
      rollSummary: nextSummary,
    };
  }

  // Raw % Die roll from character sheet
  const nextSummary = {
    ...prevSummary,
    actionType: 'percentile',
    characterName: charName,
    d100Roll,
    total: d100Roll,
    tens,
    ones,
    source: 'sheet',
    rolledOnVtt3d: true,
  };
  return {
    label: `${charName}: % Die (d100)`,
    total: d100Roll,
    breakdown: `d100=${d100Roll} [Tens: ${tens * 10}, Ones: ${ones}]`,
    rollSummary: nextSummary,
  };
}
