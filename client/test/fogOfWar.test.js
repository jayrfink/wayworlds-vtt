import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_FOG_STAMPS,
  clampEraserCells,
  createFogStamp,
  normalizeFogData,
  shouldAddFogStamp,
  appendFogStamps,
  traceFogStamp,
  drawFogLayer,
} from '../src/utils/fogOfWar.js';

describe('fogOfWar helpers', () => {
  it('creates rounded circle and square stamps', () => {
    expect(createFogStamp('circle', 10.4, 20.6, 80)).toEqual([0, 10, 21, 80]);
    expect(createFogStamp('square', 5, 5, 40.2)).toEqual([1, 5, 5, 40]);
  });

  it('clamps eraser size in grid cells', () => {
    expect(clampEraserCells(0)).toBe(0.5);
    expect(clampEraserCells(99)).toBe(20);
    expect(clampEraserCells('abc')).toBe(3);
    expect(clampEraserCells(4.5)).toBe(4.5);
  });

  it('normalizes fog data and drops legacy or malformed entries', () => {
    expect(normalizeFogData(null)).toEqual([]);
    expect(normalizeFogData('not json')).toEqual([]);
    expect(normalizeFogData([{ x: 5, y: 5, w: 2, h: 2 }])).toEqual([]);
    expect(normalizeFogData([[0, 1, 2, 3], [9, 1, 2, 3], [0, 'x', 2, 3], [1, 4, 5, 0]])).toEqual([[0, 1, 2, 3]]);
    expect(normalizeFogData(JSON.stringify([[1, 4, 5, 6]]))).toEqual([[1, 4, 5, 6]]);
  });

  it('caps stamp count, keeping the newest', () => {
    const many = Array.from({ length: MAX_FOG_STAMPS + 10 }, (_, i) => [0, i, 0, 10]);
    const out = appendFogStamps(many, [[0, 99999, 0, 10]]);
    expect(out.length).toBe(MAX_FOG_STAMPS);
    expect(out[out.length - 1][1]).toBe(99999);
  });

  it('spaces stamps along a drag', () => {
    expect(shouldAddFogStamp(null, 0, 0, 80)).toBe(true);
    const last = [0, 100, 100, 80];
    expect(shouldAddFogStamp(last, 105, 100, 80)).toBe(false);
    expect(shouldAddFogStamp(last, 125, 100, 80)).toBe(true);
  });

  it('traces circle via arc and square via rect', () => {
    const ctx = { rect: vi.fn(), arc: vi.fn(), moveTo: vi.fn() };
    traceFogStamp(ctx, [0, 50, 60, 40]);
    expect(ctx.arc).toHaveBeenCalledWith(50, 60, 20, 0, Math.PI * 2);
    traceFogStamp(ctx, [1, 50, 60, 40]);
    expect(ctx.rect).toHaveBeenCalledWith(30, 40, 40, 40);
  });

  it('draws opaque fog for players and translucent fog for the GM', () => {
    const makeScratch = () => {
      const sctx = {
        setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(),
        beginPath: vi.fn(), fill: vi.fn(), rect: vi.fn(), arc: vi.fn(), moveTo: vi.fn(),
        globalCompositeOperation: 'source-over',
      };
      return { width: 100, height: 100, getContext: () => sctx, sctx };
    };
    const makeCtx = () => ({ save: vi.fn(), restore: vi.fn(), setTransform: vi.fn(), drawImage: vi.fn(), globalAlpha: 1 });

    const scratch = makeScratch();
    const ctx = makeCtx();
    let alphaAtDraw = null;
    ctx.drawImage = vi.fn(() => { alphaAtDraw = ctx.globalAlpha; });
    drawFogLayer({ ctx, scratch, transform: [1, 0, 0, 1, 0, 0], mapW: 100, mapH: 100, stamps: [[0, 10, 10, 20]], isGm: false });
    expect(scratch.sctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 100);
    expect(scratch.sctx.fill).toHaveBeenCalled();
    expect(alphaAtDraw).toBe(1);

    const ctx2 = makeCtx();
    ctx2.drawImage = vi.fn(() => { alphaAtDraw = ctx2.globalAlpha; });
    drawFogLayer({ ctx: ctx2, scratch: makeScratch(), transform: [1, 0, 0, 1, 0, 0], mapW: 100, mapH: 100, stamps: [], isGm: true });
    expect(alphaAtDraw).toBe(0.5);
  });
});

describe('RPG VTT fog wiring', () => {
  const canvasSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/VttCanvas.vue'), 'utf-8');
  const viewSrc = fs.readFileSync(path.resolve(__dirname, '../src/views/RpgVttView.vue'), 'utf-8');

  it('canvas draws fog above tokens, only erases for the GM, and emits fog-changed', () => {
    expect(canvasSrc).toContain("'fog-changed'");
    expect(canvasSrc).toMatch(/drawFogLayer\(/);
    expect(canvasSrc.indexOf('drawTokens(ctx);')).toBeLessThan(canvasSrc.indexOf('drawFogOverlay(ctx'));
    expect(canvasSrc).toMatch(/activeTool === 'fog_erase'\s*&&\s*props\.isGm/);
  });

  it('view exposes GM-only fog controls with shape and size', () => {
    expect(viewSrc).toMatch(/v-if="isGm"[^>]*\n?[^>]*toggleFog/);
    expect(viewSrc).toContain("activeTool = 'fog_erase'");
    expect(viewSrc).toContain('fogEraser.shape');
    expect(viewSrc).toContain('fogEraser.size');
    expect(viewSrc).toContain('@fog-changed="onFogChanged"');
  });
});
