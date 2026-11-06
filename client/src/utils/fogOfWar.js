/**
 * Fog of War helpers for the RPG VTT.
 *
 * Fog covers the whole map while `map.fog_enabled` is true. The GM erases it with
 * stamps; each stamp is stored compactly as `[shape, x, y, size]` in `map.fog_data`:
 *   shape: 0 = circle (size is the diameter), 1 = square (size is the side length)
 *   x, y : stamp center in world pixels
 *   size : world pixels
 */

export const FOG_SHAPE_CIRCLE = 0;
export const FOG_SHAPE_SQUARE = 1;

/** Hard cap so fog_data always fits inside the default 100 KB API body limit (~18 bytes per stamp). */
export const MAX_FOG_STAMPS = 4000;

export const MIN_ERASER_CELLS = 0.5;
export const MAX_ERASER_CELLS = 20;

export function clampEraserCells(value, fallback = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_ERASER_CELLS, Math.max(MIN_ERASER_CELLS, n));
}

export function shapeToCode(shape) {
  return shape === 'square' ? FOG_SHAPE_SQUARE : FOG_SHAPE_CIRCLE;
}

/** Build a stamp (rounded to whole pixels to keep the payload small). */
export function createFogStamp(shape, x, y, sizePx) {
  return [shapeToCode(shape), Math.round(x), Math.round(y), Math.max(1, Math.round(sizePx))];
}

/**
 * Accept only well-formed stamps; ignores legacy/garbage entries
 * (e.g. the old cell-rect objects) and enforces the stamp cap.
 */
export function normalizeFogData(data) {
  let list = data;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const s of list) {
    if (
      Array.isArray(s) &&
      s.length >= 4 &&
      (s[0] === FOG_SHAPE_CIRCLE || s[0] === FOG_SHAPE_SQUARE) &&
      Number.isFinite(s[1]) &&
      Number.isFinite(s[2]) &&
      Number.isFinite(s[3]) &&
      s[3] > 0
    ) {
      out.push([s[0], s[1], s[2], s[3]]);
    }
  }
  return out.length > MAX_FOG_STAMPS ? out.slice(out.length - MAX_FOG_STAMPS) : out;
}

/** Returns the stamp spacing (px) that keeps a dragged stroke visually continuous. */
export function fogStampSpacing(sizePx) {
  return Math.max(2, sizePx / 4);
}

/** True when the pointer moved far enough from the last stamp to place another. */
export function shouldAddFogStamp(last, x, y, sizePx) {
  if (!last) return true;
  const dx = x - last[1];
  const dy = y - last[2];
  return Math.hypot(dx, dy) >= fogStampSpacing(sizePx);
}

/** Append stamps to existing fog data, honouring the cap (oldest dropped first). */
export function appendFogStamps(existing, added) {
  const merged = [...normalizeFogData(existing), ...added];
  return merged.length > MAX_FOG_STAMPS ? merged.slice(merged.length - MAX_FOG_STAMPS) : merged;
}

/** Trace one stamp into the current path of a 2D context. */
export function traceFogStamp(ctx, stamp) {
  const [shape, x, y, size] = stamp;
  const half = size / 2;
  if (shape === FOG_SHAPE_SQUARE) {
    ctx.rect(x - half, y - half, size, size);
  } else {
    ctx.moveTo(x + half, y);
    ctx.arc(x, y, half, 0, Math.PI * 2);
  }
}

/**
 * Draw the fog layer. `scratch` is a reusable offscreen canvas the same size as the
 * main canvas. `transform` is the world->device matrix [a, b, c, d, e, f] used by the
 * main canvas. GMs get a translucent fog so they can still see the map; players get
 * an opaque fog.
 */
export function drawFogLayer({ ctx, scratch, transform, mapW, mapH, stamps, isGm }) {
  const sctx = scratch.getContext('2d');
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalCompositeOperation = 'source-over';
  sctx.clearRect(0, 0, scratch.width, scratch.height);

  sctx.setTransform(...transform);
  sctx.fillStyle = '#05070a';
  sctx.fillRect(0, 0, mapW, mapH);

  if (stamps.length) {
    sctx.globalCompositeOperation = 'destination-out';
    sctx.fillStyle = '#000';
    sctx.beginPath();
    for (const stamp of stamps) traceFogStamp(sctx, stamp);
    sctx.fill();
    sctx.globalCompositeOperation = 'source-over';
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = isGm ? 0.5 : 1;
  ctx.drawImage(scratch, 0, 0);
  ctx.restore();
}
