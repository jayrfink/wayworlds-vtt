import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Grimoire Field Blending & Floating Modals Verification', () => {
  it('verifies CharacterSheetsView grimoire inputs blend seamlessly with card background', () => {
    const filePath = path.resolve(__dirname, '../src/views/CharacterSheetsView.vue');
    const content = fs.readFileSync(filePath, 'utf8');

    // Check grimoire input styling
    expect(content).toMatch(/\.grimoire-row\s+input,\s*\n?\.grimoire-row\s+select/);
    expect(content).toContain('background: transparent !important');
    expect(content).toContain('border: 1px solid transparent !important');
    expect(content).toContain('.grimoire-row input:hover');
    expect(content).toContain('.grimoire-row input:focus');
  });

  it('verifies QuickReferenceTables Spells tab inputs blend seamlessly with card background', () => {
    const filePath = path.resolve(__dirname, '../src/components/QuickReferenceTables.vue');
    const content = fs.readFileSync(filePath, 'utf8');

    // Check guide grimoire input styling
    expect(content).toMatch(/\.guide-grimoire-row\s+input,\s*\n?\.guide-grimoire-row\s+select/);
    expect(content).toContain('.guide-grimoire-row input:hover');
    expect(content).toContain('.guide-grimoire-row input:focus');
    expect(content).toContain('btn-add-example');
    expect(content).toContain('Spells/Martial Techniques');
  });

  it('verifies AdminView equipment modals use floating popup modal-overlay styling', () => {
    const filePath = path.resolve(__dirname, '../src/views/AdminView.vue');
    const content = fs.readFileSync(filePath, 'utf8');

    // Modals must have modal-backdrop modal-overlay
    expect(content).toContain('class="modal-backdrop modal-overlay"');
    expect(content).toMatch(/\.modal-backdrop,\s*\n?\.modal-overlay\s*\{[^}]*position:\s*fixed/);
    expect(content).toMatch(/\.admin-eq-modal\s*\{[^}]*z-index:\s*1001/);
  });
});
