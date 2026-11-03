<template>
  <nav class="navbar">
    <div class="navbar-brand">SFVTT</div>
    <div class="navbar-tabs">
      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="tab"
        active-class="tab-active"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </router-link>
    </div>
    <div class="navbar-user">
      <div class="color-pkg-switcher" title="Border & Widget Color Package (Dark UI Invariant)">
        <label for="nav-color-pkg-select" class="color-pkg-label">🎨 Theme:</label>
        <select
          id="nav-color-pkg-select"
          v-model="selectedColorPkg"
          class="color-pkg-select"
          aria-label="Color Package Theme"
          @change="onColorPkgChange"
        >
          <option v-for="pkg in colorPackages" :key="pkg.key" :value="pkg.key">
            {{ pkg.label }}
          </option>
        </select>
      </div>
      <span
        class="role-badge"
        :class="auth.user?.role === 'GameMaster' ? 'gm' : 'player'"
      >
        {{ auth.user?.role === 'GameMaster' ? 'GM' : 'Player' }}
      </span>
      <span class="username">{{ auth.user?.username }}</span>
      <button
        v-if="auth.isAuthenticated"
        class="change-password-btn"
        title="Change your password"
        @click="openPasswordModal"
      >
        🔑 Password
      </button>
      <button class="logout-btn" @click="handleLogout">Logout</button>
    </div>
    <ChangePasswordModal
      v-if="showPasswordModal"
      @close="showPasswordModal = false"
    />
  </nav>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import ChangePasswordModal from './ChangePasswordModal.vue';
import { COLOR_PACKAGES, getSavedColorPackage, applyColorPackage } from '../utils/themeManager.js';

const auth = useAuthStore();
const router = useRouter();
const showPasswordModal = ref(false);
const colorPackages = COLOR_PACKAGES;
const selectedColorPkg = ref(getSavedColorPackage());

function onColorPkgChange() {
  selectedColorPkg.value = applyColorPackage(selectedColorPkg.value);
}

onMounted(() => {
  selectedColorPkg.value = applyColorPackage(getSavedColorPackage());
});

function openPasswordModal() {
  showPasswordModal.value = true;
}

defineExpose({
  showPasswordModal,
  openPasswordModal,
  selectedColorPkg,
  onColorPkgChange,
});

const baseTabs = [
  { path: '/dashboard/rpg-vtt', label: 'RPG VTT', icon: '🗺️' },
  { path: '/dashboard/world-vtt', label: 'World VTT', icon: '🧭' },
  { path: '/dashboard/character-sheets', label: 'Character Sheets', icon: '📋' },
  { path: '/dashboard/rulebooks', label: 'Rulebooks', icon: '📖' },
];

const tabs = computed(() => {
  if (auth.user?.role === 'GameMaster') {
    return [
      ...baseTabs,
      { path: '/dashboard/gm-notes', label: 'GM Notes', icon: '📓' },
      { path: '/dashboard/admin', label: 'Admin', icon: '⚙️' },
    ];
  }
  return baseTabs;
});

async function handleLogout() {
  await auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  box-sizing: border-box;
  flex-shrink: 0;
  user-select: none;
}

.navbar-brand {
  font-family: var(--font-family-header, 'Modesto Condensed', 'Modesto', 'Consolas', 'Roboto', sans-serif);
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #cecece;
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
  white-space: nowrap;
  flex-shrink: 0;
}

.navbar-tabs {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 4px;
  overflow-x: auto;
}

.tab {
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, text-shadow 0.15s;
}

.tab:hover {
  color: var(--text-primary);
}

.tab-active {
  color: var(--text-primary);
  border-bottom-color: var(--sci-cyan);
  text-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}

.tab-icon {
  margin-right: 6px;
  font-size: 14px;
}

.tab-icon-svg {
  margin-right: 6px;
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.username {
  font-size: 13px;
  color: var(--text-secondary);
}

.role-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.role-badge.gm {
  background: rgba(210, 153, 34, 0.2);
  color: #d29922;
  border: 1px solid rgba(210, 153, 34, 0.4);
}

.role-badge.player {
  background: rgba(63, 185, 80, 0.2);
  color: #3fb950;
  border: 1px solid rgba(63, 185, 80, 0.4);
}

.change-password-btn {
  padding: 4px 12px;
  font-size: 12px;
  background-color: #000000;
  border: 1px solid #00a8a8;
  color: #00a8a8;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.change-password-btn:hover {
  background-color: #082020;
  border-color: #00dada;
  color: #00dada;
  box-shadow: 0 0 8px rgba(0, 218, 218, 0.4);
}

.logout-btn {
  padding: 4px 12px;
  font-size: 12px;
  background-color: #000000;
  border: 1px solid #00a8a8;
  color: #00a8a8;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.logout-btn:hover {
  background-color: #082020;
  border-color: #00dada;
  color: #00dada;
  box-shadow: 0 0 8px rgba(0, 218, 218, 0.4);
}

.color-pkg-switcher {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.color-pkg-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.color-pkg-select {
  width: auto;
  min-width: 132px;
  padding: 4px 26px 4px 8px;
  font-size: 12px;
  background-color: var(--bg-input, #1c2026);
  border: 1px solid var(--border-color, #521d2a);
  color: #cecece;
  border-radius: var(--radius);
}

.color-pkg-select:focus {
  border-color: var(--widget-color, #853146);
  outline: none;
}
</style>
