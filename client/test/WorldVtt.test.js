/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import WorldVttCanvas from '../src/components/WorldVttCanvas.vue';
import fs from 'node:fs';
import path from 'node:path';

describe('WorldVttCanvas & WorldVttView - Regional/World Map Mode', () => {
  let mockCtx;

  beforeEach(() => {
    mockCtx = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      clip: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      setLineDash: vi.fn(),
    };
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx);
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    }));
  });

  it('renders WorldMarker pins for party, battle, faction, poi, and hazard and emits marker-selected on click', async () => {
    const markers = [
      { id: 1, marker_type: 'party', name: 'Iron Company', hex_q: 0, hex_r: 0, x_miles: 0, y_miles: 0, color: '#4fc3f7' },
      { id: 2, marker_type: 'battle', name: 'Siege of Crag', hex_q: 2, hex_r: 1, x_miles: 15, y_miles: 5.2, linked_map_id: 9 },
      { id: 3, marker_type: 'faction', name: 'Ulvwylde Banner', hex_q: 4, hex_r: 2, x_miles: 30, y_miles: 10.4 },
      { id: 4, marker_type: 'poi', name: 'Sunken Shrine', hex_q: 1, hex_r: 3, x_miles: 15, y_miles: 15.6 },
      { id: 5, marker_type: 'hazard', name: 'Ash Mire', hex_q: 3, hex_r: 3, x_miles: 27, y_miles: 15.6 },
    ];
    const wrapper = mount(WorldVttCanvas, {
      props: {
        map: { id: 1, width: 20, height: 20, grid_size: 40, hex_miles: 6 },
        markers,
        activeTool: 'select',
        panX: 0,
        panY: 0,
        zoomLevel: 1.0,
      },
    });

    // Click near hex (0,0) center: hexW = sqrt(3)*40 ~= 69.28 -> cx ~= 34.6, cy = 40
    await wrapper.find('.world-vtt-canvas-container').trigger('mousedown', {
      button: 0,
      clientX: 35,
      clientY: 40,
    });
    expect(wrapper.emitted('marker-selected')?.[0]?.[0]).toEqual(markers[0]);
    wrapper.unmount();
  });

  it('WorldVttView supports all 5 marker types, overland miles display, hex q/r, and linked Tactical VTT scenes', () => {
    const viewSrc = fs.readFileSync(path.resolve(__dirname, '../src/views/WorldVttView.vue'), 'utf-8');
    for (const t of ['party', 'battle', 'faction', 'poi', 'hazard']) {
      expect(viewSrc).toContain(`value: '${t}'`);
    }
    expect(viewSrc).toContain('/api/world-markers');
    expect(viewSrc).toContain('x_miles');
    expect(viewSrc).toContain('y_miles');
    expect(viewSrc).toContain('hex_q');
    expect(viewSrc).toContain('hex_r');
    expect(viewSrc).toContain('linked_map_id');
    expect(viewSrc).toContain('launchLinkedTacticalScene');
  });

  it('WorldVttView styles shortcut-tip and key-badge with font-size: 13px to match toolbar fonts', () => {
    const viewSrc = fs.readFileSync(path.resolve(__dirname, '../src/views/WorldVttView.vue'), 'utf-8');
    expect(viewSrc).toMatch(/\.shortcut-tip\s*\{[^}]*font-size:\s*13px;/);
    expect(viewSrc).toMatch(/\.key-badge\s*\{[^}]*font-size:\s*13px;/);
  });
});
