import { describe, it, expect } from 'vitest';
import { hexToMiles, milesToHex, hexDistance } from '../src/worldHex.js';

describe('worldHex', () => {
  it('converts origin and neighbours to miles with 6-mile hexes', () => {
    expect(hexToMiles(0, 0, 6)).toEqual({ x_miles: 0, y_miles: 0 });
    expect(hexToMiles(1, 0, 6).x_miles).toBe(6);
    expect(hexToMiles(0, 1, 6).x_miles).toBeCloseTo(3);
    expect(hexToMiles(0, 1, 6).y_miles).toBeCloseTo(6 * Math.sqrt(3) / 2);
  });

  it('round-trips hex -> miles -> hex', () => {
    for (const [q, r] of [[0, 0], [3, -2], [-4, 5], [10, 10], [-7, -1]]) {
      const { x_miles, y_miles } = hexToMiles(q, r, 12);
      expect(milesToHex(x_miles, y_miles, 12)).toEqual({ q, r });
    }
  });

  it('snaps arbitrary mile positions to the nearest hex', () => {
    expect(milesToHex(1, 1, 6)).toEqual({ q: 0, r: 0 });
    expect(milesToHex(5.5, 0.4, 6)).toEqual({ q: 1, r: 0 });
  });

  it('computes hex distance', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -2 })).toBe(2);
    expect(hexDistance({ q: -3, r: 2 }, { q: 3, r: -1 })).toBe(6);
  });
});
