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
      <div class="color-scheme-wrap" title="Customize Site Color Scheme">
        <button
          type="button"
          class="btn-color-scheme"
          @click="openSiteColorPicker"
          title="Click to customize site color scheme"
        >
          Colors Scheme
        </button>
        <input
          ref="siteColorInput"
          id="nav-custom-color-picker"
          type="color"
          v-model="siteCustomColor"
          class="hidden-color-input"
          aria-label="Sitewide Color Scheme Picker"
          @input="onCustomColorInput"
          @change="onCustomColorChange"
        />
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
import {
  getSavedCustomColor,
  applyColorPackage,
  setSavedCustomColor,
} from '../utils/themeManager.js';

const auth = useAuthStore();
const router = useRouter();
const showPasswordModal = ref(false);
const siteColorInput = ref(null);
const siteCustomColor = ref(getSavedCustomColor());

function openSiteColorPicker() {
  if (siteColorInput.value) {
    if (typeof siteColorInput.value.showPicker === 'function') {
      try {
        siteColorInput.value.showPicker();
        return;
      } catch {
        // Fallback to click
      }
    }
    siteColorInput.value.click();
  }
}

function onCustomColorInput() {
  applyColorPackage(siteCustomColor.value);
}

function onCustomColorChange() {
  setSavedCustomColor(siteCustomColor.value);
  applyColorPackage(siteCustomColor.value);
}

function openPasswordModal() {
  showPasswordModal.value = true;
}

onMounted(() => {
  const saved = getSavedCustomColor();
  siteCustomColor.value = saved;
  applyColorPackage(saved);
});

defineExpose({
  showPasswordModal,
  openPasswordModal,
  siteColorInput,
  siteCustomColor,
  openSiteColorPicker,
  onCustomColorInput,
  onCustomColorChange,
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

.color-scheme-wrap {
  display: inline-flex;
  align-items: center;
  position: relative;
}
</style>
