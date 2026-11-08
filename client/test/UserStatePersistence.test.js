import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { getStorageKey, getSafeUserId, getUserState, saveUserState, clearUserStateMemory } from '../src/utils/userState.js';
import router from '../src/router.js';
import { useAuthStore } from '../src/stores/auth.js';

describe('Per-User Tab and View State Persistence', () => {
  beforeEach(() => {
    if (typeof document === 'undefined') {
      globalThis.document = { title: '' };
    }
    setActivePinia(createPinia());
    clearUserStateMemory();
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  describe('Task 1: userState utility & Router navigation persistence', () => {
    it('isolates state between different user IDs', () => {
      saveUserState(101, 'worldVtt', { panX: -240, panY: 180, zoomLevel: 1.5 });
      saveUserState(202, 'worldVtt', { panX: 50, panY: 50, zoomLevel: 0.75 });

      const user1State = getUserState(101, 'worldVtt', { panX: 50, panY: 50, zoomLevel: 1.0 });
      const user2State = getUserState(202, 'worldVtt', { panX: 50, panY: 50, zoomLevel: 1.0 });

      expect(getStorageKey(101)).toBe('ww_vtt_user_state_101');
      expect(getStorageKey(202)).toBe('ww_vtt_user_state_202');
      expect(user1State).toEqual({ panX: -240, panY: 180, zoomLevel: 1.5 });
      expect(user2State).toEqual({ panX: 50, panY: 50, zoomLevel: 0.75 });
    });

    it('merges partial updates into existing section state without overwriting other sections', () => {
      saveUserState(101, 'characterSheets', { selectedCharId: 7 });
      saveUserState(101, 'shipSheets', { selectedShipId: 3 });
      saveUserState(101, 'characterSheets', { mainScrollTop: 320 });

      expect(getUserState(101, 'characterSheets', { selectedCharId: null, mainScrollTop: 0 })).toEqual({
        selectedCharId: 7,
        mainScrollTop: 320,
      });
      expect(getUserState(101, 'shipSheets', { selectedShipId: null })).toEqual({
        selectedShipId: 3,
      });
    });

    it('getSafeUserId returns authenticated user ID or falls back to guest', () => {
      expect(getSafeUserId()).toBe('guest');

      const auth = useAuthStore();
      auth.user = { id: 777, username: 'pilot', role: 'Player' };
      expect(getSafeUserId()).toBe(777);

      setActivePinia(undefined);
      expect(getSafeUserId()).toBe('guest');
    });

    it('guards against corrupt array JSON at root or section level in getUserState and saveUserState', () => {
      const store = new Map();
      const prevStorage = globalThis.localStorage;
      globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, v),
        clear: () => store.clear(),
      };

      try {
        const key = getStorageKey(101);

        // Corrupt root-level array in storage
        store.set(key, JSON.stringify(['corrupt', 'array']));
        expect(getUserState(101, 'rpgVtt', { panX: 50 })).toEqual({ panX: 50 });

        // Saving when root is an array replaces root with an object
        saveUserState(101, 'rpgVtt', { panX: 120 });
        expect(JSON.parse(store.get(key))).toEqual({ rpgVtt: { panX: 120 } });

        // Corrupt section-level array in storage
        store.set(key, JSON.stringify({ rpgVtt: ['bad', 'section'] }));
        expect(getUserState(101, 'rpgVtt', { panX: 50 })).toEqual({ panX: 50 });

        // Saving when section is an array replaces section with an object without spreading array indices
        saveUserState(101, 'rpgVtt', { zoomLevel: 2.0 });
        expect(JSON.parse(store.get(key))).toEqual({ rpgVtt: { zoomLevel: 2.0 } });
      } finally {
        globalThis.localStorage = prevStorage;
      }
    });

    it('saves last visited dashboard tab per user and redirects /dashboard to it', async () => {
      const auth = useAuthStore();
      auth.user = { id: 101, username: 'alice', role: 'Player' };
      auth.checked = true;

      await router.push('/dashboard/world-vtt');
      expect(router.currentRoute.value.path).toBe('/dashboard/world-vtt');

      const navState = getUserState(101, 'navigation', {});
      expect(navState.lastPath).toBe('/dashboard/world-vtt');

      // Navigating to /dashboard root restores /dashboard/world-vtt for user 101
      await router.push('/dashboard');
      expect(router.currentRoute.value.path).toBe('/dashboard/world-vtt');

      // Switching to user 202 who has no saved tab defaults to /dashboard/rpg-vtt
      auth.user = { id: 202, username: 'bob', role: 'Player' };
      await router.push('/dashboard');
      expect(router.currentRoute.value.path).toBe('/dashboard/rpg-vtt');
    });
  });

  describe('Task 2: VTT Canvas & RpgVttView / WorldVttView pan, zoom, and tool state persistence', () => {
    it('VttCanvas and WorldVttCanvas define panX and panY props and update:panX / update:panY emits', async () => {
      const VttCanvas = (await import('../src/components/VttCanvas.vue')).default;
      const WorldVttCanvas = (await import('../src/components/WorldVttCanvas.vue')).default;

      expect(VttCanvas.props.panX).toBeDefined();
      expect(VttCanvas.props.panY).toBeDefined();
      expect(VttCanvas.emits).toContain('update:panX');
      expect(VttCanvas.emits).toContain('update:panY');

      expect(WorldVttCanvas.props.panX).toBeDefined();
      expect(WorldVttCanvas.props.panY).toBeDefined();
      expect(WorldVttCanvas.emits).toContain('update:panX');
      expect(WorldVttCanvas.emits).toContain('update:panY');
    });

    it('RpgVttView and WorldVttView bind v-model:pan-x and v-model:pan-y and persist state via userState', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const rpgContent = fs.readFileSync(path.resolve(__dirname, '../src/views/RpgVttView.vue'), 'utf8');
      const spaceContent = fs.readFileSync(path.resolve(__dirname, '../src/views/WorldVttView.vue'), 'utf8');

      expect(rpgContent).toContain('v-model:pan-x="panX"');
      expect(rpgContent).toContain('v-model:pan-y="panY"');
      expect(rpgContent).toContain("getUserState(");
      expect(rpgContent).toContain("'rpgVtt'");
      expect(rpgContent).toContain("saveUserState(");

      expect(spaceContent).toContain('v-model:pan-x="panX"');
      expect(spaceContent).toContain('v-model:pan-y="panY"');
      expect(spaceContent).toContain("getUserState(");
      expect(spaceContent).toContain("'worldVtt'");
      expect(spaceContent).toContain("saveUserState(");
    });
  });

  describe('Task 3: CharacterSheetsView, ShipSheetsView, and RulebooksView state persistence', () => {
    it('CharacterSheetsView restores saved selectedCharId per user instead of resetting to first character', async () => {
      const CharacterSheetsView = (await import('../src/views/CharacterSheetsView.vue')).default;
      const auth = useAuthStore();
      auth.user = { id: 303, username: 'charPlayer', role: 'Player' };

      // Save character ID 22 as the user's selected character
      saveUserState(303, 'characterSheets', { selectedCharId: 22 });

      const mockChars = [
        { id: 11, name: 'Alpha First', race: 'Dawn Elf', psa: 'Military' },
        { id: 22, name: 'Beta Second', race: 'Vrusk', psa: 'Technological' },
        { id: 33, name: 'Gamma Third', race: 'Yazirian', psa: 'Biosocial' },
      ];

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: true,
        json: async () => mockChars,
      });

      try {
        const vm = {
          characters: [],
          selectedChar: null,
          loading: false,
          normalizeCharacterData: CharacterSheetsView.methods.normalizeCharacterData,
          getCurrentUserId: CharacterSheetsView.methods.getCurrentUserId,
          selectCharacter: CharacterSheetsView.methods.selectCharacter,
          restoreScrollPositions: () => {},
        };

        await CharacterSheetsView.methods.fetchCharacters.call(vm);
        expect(vm.selectedChar).not.toBeNull();
        expect(vm.selectedChar.id).toBe(22);
        expect(vm.selectedChar.name).toBe('Beta Second');

        // Selecting character 33 updates saved state for user 303
        CharacterSheetsView.methods.selectCharacter.call(vm, mockChars[2]);
        expect(getUserState(303, 'characterSheets', {}).selectedCharId).toBe(33);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('RulebooksView and QuickReferenceTables restore saved mode and category per user', async () => {
      const { createSSRApp } = await import('vue');
      const { renderToString } = await import('vue/server-renderer');
      const RulebooksView = (await import('../src/views/RulebooksView.vue')).default;
      const QuickReferenceTables = (await import('../src/components/QuickReferenceTables.vue')).default;

      const auth = useAuthStore();
      auth.user = { id: 505, username: 'loremaster', role: 'Player' };

      saveUserState(505, 'rulebooks', {
        viewMode: 'additional',
        quickRefCategory: 'melee',
      });

      const rbApp = createSSRApp(RulebooksView);
      const rbHtml = await renderToString(rbApp);
      expect(rbHtml).toContain('Horse Movement (Riding Horse)');

      const qrApp = createSSRApp(QuickReferenceTables);
      const qrHtml = await renderToString(qrApp);
      expect(qrHtml).toContain('Unarmed Combat');
    });
  });
});


