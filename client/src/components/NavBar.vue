<template>
  <nav class="navbar">
    <div class="navbar-brand">WayWorld</div>
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
  border-bottom: 1px solid #30363d !important;
  box-sizing: border-box;
  flex-shrink: 0;
  user-select: none;
}

.navbar-brand {
  font-family: var(--font-family-header, 'Modesto Condensed', 'Modesto', 'Consolas', 'Roboto', sans-serif);
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #c3c3c3 !important;
  text-shadow: 0 0 8px rgba(195, 195, 195, 0.35);
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
  border-bottom-color: #c0c0c0 !important;
  text-shadow: 0 0 8px rgba(192, 192, 192, 0.4) !important;
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

.change-password-btn,
.logout-btn {
  padding: 4px 12px;
  font-size: 12px;
  background-color: #000000;
  border: 1px solid #484f58;
  color: #c8c8c8;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.change-password-btn:hover,
.logout-btn:hover {
  background-color: #c8c8c8;
  border-color: #c8c8c8;
  color: #000000;
  box-shadow: 0 0 8px rgba(200, 200, 200, 0.35);
}

.change-password-btn:active,
.logout-btn:active {
  transform: translateY(1px);
  background-color: #b0b0b0;
}

.color-pkg-switcher {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.color-pkg-label {
  font-size: 12px;
  color: #8b949e !important;
  white-space: nowrap;
}

.color-pkg-select {
  width: auto;
  min-width: 132px;
  padding: 4px 26px 4px 8px;
  font-size: 12px;
  background-color: #0d1117 !important;
  border: 1px solid #484f58 !important;
  color: #8b949e !important;
  -webkit-text-fill-color: #8b949e !important;
  box-shadow: none !important;
  border-radius: var(--radius);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='14' viewBox='0 0 24 24' fill='none' stroke='%236e7681' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='7 9 12 4 17 9'%3E%3C/polyline%3E%3Cpolyline points='7 15 12 20 17 15'%3E%3C/polyline%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 8px center !important;
  background-size: 10px 12px !important;
  transition: all 0.15s ease;
}

.color-pkg-select option {
  background-color: #0d1117 !important;
  color: #8b949e !important;
  -webkit-text-fill-color: #8b949e !important;
  background-image: none !important;
}

.color-pkg-select:focus,
.color-pkg-select:hover {
  border-color: #6e7681 !important;
  box-shadow: none !important;
  outline: none;
}
</style>
