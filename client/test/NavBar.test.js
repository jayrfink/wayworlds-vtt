import { describe, it, expect, vi } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import NavBar from '../src/components/NavBar.vue';
import { useAuthStore } from '../src/stores/auth.js';

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSSRContext: () => ({ modules: new Set() }),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn() }),
  };
});


describe('NavBar.vue', () => {
  async function renderNavBar(userData = null) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore();
    if (userData) {
      auth.user = userData;
    }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/dashboard/rpg-vtt', component: { template: '<div />' } },
        { path: '/dashboard/world-vtt', component: { template: '<div />' } },
        { path: '/dashboard/character-sheets', component: { template: '<div />' } },
        { path: '/dashboard/rulebooks', component: { template: '<div />' } },
        { path: '/dashboard/gm-notes', component: { template: '<div />' } },
        { path: '/dashboard/admin', component: { template: '<div />' } },
        { path: '/login', component: { template: '<div />' } },
      ]
    });
    const app = createSSRApp(NavBar);
    app.use(pinia);
    app.use(router);
    const html = await renderToString(app);
    return html;
  }

  it('renders WayWorld brand text without star icon', async () => {
    const html = await renderNavBar();
    expect(html).toContain('WayWorld');
    expect(html).not.toContain('⭐');
    expect(html).not.toContain('Wayworlds VTT');
    expect(html).not.toContain('WWVTT');
  });

  it('renders standard navigation tabs for all users', async () => {
    const html = await renderNavBar({ username: 'PlayerOne', role: 'Player' });
    expect(html).toContain('RPG VTT');
    expect(html).toContain('/dashboard/rpg-vtt');
    expect(html).toContain('World VTT');
    expect(html).toContain('/dashboard/world-vtt');
    expect(html).toContain('Character Sheets');
    expect(html).toContain('/dashboard/character-sheets');
    expect(html).toContain('Rulebooks');
    expect(html).toContain('/dashboard/rulebooks');
  });

  it('renders compass icon for World VTT tab and no rocket or ship tabs', async () => {
    const html = await renderNavBar({ username: 'PlayerOne', role: 'Player' });
    expect(html).toContain('🧭');
    expect(html).not.toContain('Ship Sheets');
    expect(html).not.toContain('Space VTT');
  });

  it('does not render Admin tab for non-GM users', async () => {
    const html = await renderNavBar({ username: 'PlayerOne', role: 'Player' });
    expect(html).not.toContain('Admin');
    expect(html).not.toContain('/dashboard/admin');
  });

  it('does not render GM Notes tab for non-GM users', async () => {
    const html = await renderNavBar({ username: 'PlayerOne', role: 'Player' });
    expect(html).not.toContain('GM Notes');
    expect(html).not.toContain('/dashboard/gm-notes');
  });

  it('renders Admin tab for GameMaster users', async () => {
    const html = await renderNavBar({ username: 'GMUser', role: 'GameMaster' });
    expect(html).toContain('Admin');
    expect(html).toContain('/dashboard/admin');
  });

  it('renders GM Notes tab for GameMaster users', async () => {
    const html = await renderNavBar({ username: 'GMUser', role: 'GameMaster' });
    expect(html).toContain('GM Notes');
    expect(html).toContain('/dashboard/gm-notes');
  });

  it('renders user info, role badge, and logout button', async () => {
    const htmlGM = await renderNavBar({ username: 'TheGM', role: 'GameMaster' });
    expect(htmlGM).toContain('TheGM');
    expect(htmlGM).toContain('GM');
    expect(htmlGM).toContain('Logout');

    const htmlPlayer = await renderNavBar({ username: 'Cadet', role: 'Player' });
    expect(htmlPlayer).toContain('Cadet');
    expect(htmlPlayer).toContain('Player');
    expect(htmlPlayer).toContain('Logout');
  });

  it('renders Password button when user is authenticated and hides when not', async () => {
    const htmlAuth = await renderNavBar({ username: 'Cadet', role: 'Player' });
    expect(htmlAuth).toContain('🔑 Password');
    expect(htmlAuth).toContain('change-password-btn');

    const htmlUnauth = await renderNavBar(null);
    expect(htmlUnauth).not.toContain('🔑 Password');
  });

  it('opens ChangePasswordModal when Password button is clicked', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore();
    auth.user = { username: 'Cadet', role: 'Player' };
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/login', component: { template: '<div />' } },
      ],
    });

    let exposed = {};
    NavBar.setup({}, {
      expose: (obj) => {
        Object.assign(exposed, obj);
      },
      emit: () => {},
      slots: {},
      attrs: {}
    });

    expect(exposed.showPasswordModal.value).toBe(false);
    exposed.openPasswordModal();
    expect(exposed.showPasswordModal.value).toBe(true);
  });

  it('renders Colors Scheme button and color picker in navbar and does not render preset dropdown', async () => {
    const html = await renderNavBar({ username: 'PlayerOne', role: 'Player' });
    expect(html).not.toContain('color-pkg-select');
    expect(html).toContain('btn-color-scheme');
    expect(html).toContain('Colors Scheme');
    expect(html).toContain('nav-custom-color-picker');
  });
});
