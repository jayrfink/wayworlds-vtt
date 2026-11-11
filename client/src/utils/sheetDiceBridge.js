/**
 * Coordinates 3D dice rolls between CharacterSheetsView and RpgVttView
 * so that the settled 3D dice on the VTT canvas, the VTT HUD banner,
 * the Roll Log, and the Character Sheet always display the exact same roll.
 */

const CHANNEL_NAME = 'wayworlds_vtt_dice';
const PENDING_SHEET_ROLL_KEY = 'ww_pending_sheet_vtt_roll';
const ACTIVE_VTT_TS_KEY = 'wayworlds_vtt_dice_active_ts';
const ACTIVE_VTT_TTL_MS = 15000;

let inProcessResponder = null;

function isVttResponderLikelyActive() {
  if (typeof inProcessResponder === 'function') return true;
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(ACTIVE_VTT_TS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && (Date.now() - ts) < ACTIVE_VTT_TTL_MS;
  } catch {
    return false;
  }
}

function markVttResponderActive(active) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (active) {
      localStorage.setItem(ACTIVE_VTT_TS_KEY, String(Date.now()));
    } else {
      localStorage.removeItem(ACTIVE_VTT_TS_KEY);
    }
  } catch {}
}

/**
 * Requests a 3D dice roll from an active, visible RpgVttView tab via BroadcastChannel
 * (or in-process responder). If no visible RpgVttView responder is active, resolves
 * with null immediately on the next microtask without waiting for a timer.
 *
 * @param {{ type: 'percentile' | 'damage', count?: number }} options
 * @param {{ ackTimeoutMs?: number, rollTimeoutMs?: number }} [timeouts]
 * @returns {Promise<Object|null>} Settled roll summary ({ total, tens, ones, valid } or { total, dice, count }) or null
 */
export async function requestVtt3dRoll(options, { ackTimeoutMs = 1000, rollTimeoutMs = 12000 } = {}) {
  const payload = {
    type: options?.type || 'percentile',
    count: options?.count || 1,
  };

  if (typeof inProcessResponder === 'function') {
    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
      try {
        return await inProcessResponder(payload);
      } catch {
        return null;
      }
    }
  }

  if (!isVttResponderLikelyActive() || typeof BroadcastChannel === 'undefined') {
    return null;
  }

  return new Promise((resolve) => {
    let channel = null;
    let ackTimer = null;
    let rollTimer = null;
    let settled = false;
    const requestId = `sheet_roll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const cleanup = (result) => {
      if (settled) return;
      settled = true;
      if (ackTimer) clearTimeout(ackTimer);
      if (rollTimer) clearTimeout(rollTimer);
      try {
        if (channel) channel.close();
      } catch {}
      resolve(result);
    };

    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      return resolve(null);
    }

    channel.onmessage = (event) => {
      const data = event?.data;
      if (!data || data.requestId !== requestId) return;

      if (data.action === 'ACK_3D_ROLL') {
        if (ackTimer) {
          clearTimeout(ackTimer);
          ackTimer = null;
        }
        rollTimer = setTimeout(() => cleanup(null), rollTimeoutMs);
      } else if (data.action === 'RESULT_3D_ROLL') {
        cleanup(data.settled || null);
      }
    };

    ackTimer = setTimeout(() => {
      cleanup(null);
    }, ackTimeoutMs);

    try {
      channel.postMessage({
        action: 'REQUEST_3D_ROLL',
        requestId,
        ...payload,
      });
    } catch {
      cleanup(null);
    }
  });
}

/**
 * Registers RpgVttView as a 3D dice responder on BroadcastChannel (and in-process).
 * Only responds when the VTT document is visible so WebGL requestAnimationFrame is active.
 *
 * @param {(payload: { type: string, count: number }) => Promise<Object|null>} onRollRequest
 * @returns {() => void} Cleanup function
 */
export function registerVtt3dRollResponder(onRollRequest) {
  inProcessResponder = onRollRequest;

  const updateHeartbeat = () => {
    const visible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
    markVttResponderActive(visible);
  };

  updateHeartbeat();
  const heartbeatInterval = setInterval(updateHeartbeat, 5000);
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', updateHeartbeat);
  }

  let channel = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = async (event) => {
        const data = event?.data;
        if (!data || data.action !== 'REQUEST_3D_ROLL' || !data.requestId) return;

        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }

        try {
          channel.postMessage({
            action: 'ACK_3D_ROLL',
            requestId: data.requestId,
          });
        } catch {
          return;
        }

        try {
          const settled = await onRollRequest({
            type: data.type || 'percentile',
            count: data.count || 1,
          });
          channel.postMessage({
            action: 'RESULT_3D_ROLL',
            requestId: data.requestId,
            settled: settled || null,
          });
        } catch {
          try {
            channel.postMessage({
              action: 'RESULT_3D_ROLL',
              requestId: data.requestId,
              settled: null,
            });
          } catch {}
        }
      };
    } catch {
      channel = null;
    }
  }

  return () => {
    if (inProcessResponder === onRollRequest) {
      inProcessResponder = null;
    }
    clearInterval(heartbeatInterval);
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('visibilitychange', updateHeartbeat);
    }
    markVttResponderActive(false);
    try {
      if (channel) channel.close();
    } catch {}
  };
}

/**
 * Stores a pending sheet roll in sessionStorage so that if the user is in a single tab,
 * rolls on the Character Sheet, and then navigates to RPG VTT, the VTT rolls the 3D dice
 * and syncs the settled result.
 */
export function savePendingSheetVttRoll(roll) {
  if (!roll || !roll.id || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      PENDING_SHEET_ROLL_KEY,
      JSON.stringify({
        roll,
        savedAt: Date.now(),
      })
    );
  } catch {}
}

/**
 * Consumes a recent pending sheet roll from sessionStorage (if within maxAgeMs).
 */
export function consumePendingSheetVttRoll(maxAgeMs = 60000) {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PENDING_SHEET_ROLL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_SHEET_ROLL_KEY);
    const parsed = JSON.parse(raw);
    if (!parsed?.roll?.id) return null;
    if (Date.now() - (parsed.savedAt || 0) > maxAgeMs) return null;
    return parsed.roll;
  } catch {
    return null;
  }
}
