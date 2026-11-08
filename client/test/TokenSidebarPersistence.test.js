import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createPinia, setActivePinia } from 'pinia';
import {
  getUserState,
  saveUserState,
  clearUserStateMemory,
} from '../src/utils/userState.js';
import { useAuthStore } from '../src/stores/auth.js';

describe('Token Sidebar / Manager State Persistence & Toggle', () => {
  const rpgViewSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/views/RpgVttView.vue'),
    'utf8'
  );
  const spaceViewSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/views/WorldVttView.vue'),
    'utf8'
  );
  const rpgCanvasSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/components/VttCanvas.vue'),
    'utf8'
  );
  const worldCanvasSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/components/WorldVttCanvas.vue'),
    'utf8'
  );

  beforeEach(() => {
    setActivePinia(createPinia());
    clearUserStateMemory();
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  describe('RpgVttView token sidebar persistence', () => {
    it('initializes showTokenSidebar from userState with true default fallback', () => {
      expect(rpgViewSrc).toMatch(/initialVttState\s*=\s*getUserState\([\s\S]*?showTokenSidebar:\s*true/);
      expect(rpgViewSrc).toMatch(/const\s+showTokenSidebar\s*=\s*ref\(initialVttState\.showTokenSidebar\s*\?\?\s*true\)/);
    });

    it('persists showTokenSidebar in persistVttStateNow and includes it in watcher', () => {
      expect(rpgViewSrc).toMatch(/persistVttStateNow\(\)\s*\{[\s\S]*showTokenSidebar:\s*showTokenSidebar\.value/);
      expect(rpgViewSrc).toMatch(/watch\(\[[^\]]*showTokenSidebar[^\]]*\],/);
    });

    it('does not have a Tokens button in the header toolbar, keeping sidebar in DOM', () => {
      expect(rpgViewSrc).not.toMatch(/<button[^>]*class="[^"]*btn-sidebar[^"]*"/);
      expect(rpgViewSrc).toMatch(/<aside\s+class="token-sidebar"\s+:class="\{\s*'token-sidebar-rolled-up':\s*isTokenSidebarRolledUp\s*\}"/);
    });

    it('uses closeTokenSidebar method on sidebar close button', () => {
      expect(rpgViewSrc).toMatch(/<button[^>]*class="close-btn"[^>]*@click="closeTokenSidebar"/);
    });

    it('does not automatically unhide or unroll token inspector when a token is selected or clicked', () => {
      expect(rpgViewSrc).not.toMatch(/function onTokenSelected\([^)]*\)\s*\{[^}]*showTokenSidebar\.value\s*=\s*true;/);
      expect(rpgViewSrc).not.toMatch(/function onTokenSelected\([^)]*\)\s*\{[^}]*isTokenSidebarRolledUp\.value\s*=\s*false;/);
      expect(rpgViewSrc).not.toMatch(/watch\(selectedTokenId,\s*\(newId\)\s*=>/);
    });

    it('ensures .vtt-canvas-wrapper allows shrinking and redraws on resize', () => {
      expect(rpgViewSrc).toMatch(/\.vtt-canvas-wrapper\s*\{[^}]*min-width:\s*0;/);
      expect(rpgViewSrc).not.toMatch(/\.vtt-canvas-wrapper\s*\{[^}]*width:\s*100%;/);
      expect(rpgCanvasSrc).toMatch(/function resizeCanvas\(\)\s*\{[\s\S]*requestRender\(\);/);
    });
  });

  describe('WorldVttView token sidebar persistence', () => {
    it('initializes showTokenSidebar from userState with true default fallback', () => {
      expect(spaceViewSrc).toMatch(/initialVttState\s*=\s*getUserState\([\s\S]*?showTokenSidebar:\s*true/);
      expect(spaceViewSrc).toMatch(/const\s+showTokenSidebar\s*=\s*ref\(initialVttState\.showTokenSidebar\s*\?\?\s*true\)/);
    });

    it('persists showTokenSidebar in persistVttStateNow and includes it in watcher', () => {
      expect(spaceViewSrc).toMatch(/persistVttStateNow\(\)\s*\{[\s\S]*showTokenSidebar:\s*showTokenSidebar\.value/);
      expect(spaceViewSrc).toMatch(/watch\(\[[^\]]*showTokenSidebar[^\]]*\],/);
    });

    it('does not have a Markers button in the header toolbar, keeping sidebar in DOM', () => {
      expect(spaceViewSrc).not.toMatch(/<button[^>]*class="[^"]*btn-sidebar[^"]*"/);
      expect(spaceViewSrc).toMatch(/<aside\s+class="token-sidebar"\s+:class="\{\s*'token-sidebar-rolled-up':\s*isTokenSidebarRolledUp\s*\}"/);
    });

    it('uses closeTokenSidebar method on sidebar close button', () => {
      expect(spaceViewSrc).toMatch(/<button[^>]*class="close-btn"[^>]*@click="closeTokenSidebar"/);
    });

    it('does not automatically unhide or unroll marker inspector when a marker is selected or clicked', () => {
      expect(spaceViewSrc).not.toMatch(/function onMarkerSelected\([^)]*\)\s*\{[^}]*showTokenSidebar\.value\s*=\s*true;/);
      expect(spaceViewSrc).not.toMatch(/function onMarkerSelected\([^)]*\)\s*\{[^}]*isTokenSidebarRolledUp\.value\s*=\s*false;/);
      expect(spaceViewSrc).not.toMatch(/watch\(selectedMarkerId,\s*\(newId\)\s*=>/);
    });

    it('ensures .vtt-canvas-wrapper allows shrinking and redraws on resize', () => {
      expect(spaceViewSrc).toMatch(/\.vtt-canvas-wrapper\s*\{[^}]*min-width:\s*0;/);
      expect(spaceViewSrc).not.toMatch(/\.vtt-canvas-wrapper\s*\{[^}]*width:\s*100%;/);
      expect(worldCanvasSrc).toMatch(/function resizeCanvas\(\)\s*\{[\s\S]*requestRender\(\);/);
    });
  });

  describe('User state retention behavior across tab navigation', () => {
    it('retains showTokenSidebar: false when closed, staying closed on return', () => {
      const auth = useAuthStore();
      auth.user = { id: 701, username: 'scout', role: 'Player' };

      // User closes sidebar on RPG VTT
      saveUserState(701, 'rpgVtt', { showTokenSidebar: false, isTokenSidebarRolledUp: true });
      expect(getUserState(701, 'rpgVtt', { showTokenSidebar: true }).showTokenSidebar).toBe(false);
      expect(getUserState(701, 'rpgVtt', { isTokenSidebarRolledUp: false }).isTokenSidebarRolledUp).toBe(true);

      // User closes sidebar on Space VTT
      saveUserState(701, 'spaceVtt', { showTokenSidebar: false, isTokenSidebarRolledUp: true });
      expect(getUserState(701, 'spaceVtt', { showTokenSidebar: true }).showTokenSidebar).toBe(false);
      expect(getUserState(701, 'spaceVtt', { isTokenSidebarRolledUp: false }).isTokenSidebarRolledUp).toBe(true);

      // User opens sidebar on RPG VTT
      saveUserState(701, 'rpgVtt', { showTokenSidebar: true, isTokenSidebarRolledUp: false });
      expect(getUserState(701, 'rpgVtt', { showTokenSidebar: false }).showTokenSidebar).toBe(true);
      expect(getUserState(701, 'rpgVtt', { isTokenSidebarRolledUp: true }).isTokenSidebarRolledUp).toBe(false);
    });
  });
});
