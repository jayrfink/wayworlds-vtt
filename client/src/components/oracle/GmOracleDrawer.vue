<template>
  <div v-if="isGm && open" class="oracle-drawer-backdrop" @click.self="closeDrawer">
    <aside class="gm-oracle-drawer" role="dialog" aria-modal="true" aria-labelledby="oracle-drawer-title">
      <!-- Drawer Header -->
      <div class="drawer-header">
        <div class="header-branding">
          <span class="branding-icon">🔮</span>
          <h3 id="oracle-drawer-title" class="branding-title">Narrative Oracle & Arc Engine</h3>
        </div>
        <button type="button" class="close-btn" title="Close Oracle" @click="closeDrawer">✕</button>
      </div>

      <!-- Top Narrative Selector Bar -->
      <div class="narrative-selector-bar">
        <!-- Environment Dropdown -->
        <div class="selector-item">
          <label for="oracle-env-select" class="selector-label">Environment</label>
          <select
            id="oracle-env-select"
            v-model.number="selectedEnvironmentId"
            class="selector-dropdown"
            @change="onEnvironmentChanged"
          >
            <option v-for="env in environments" :key="env.id" :value="env.id">
              {{ env.name }}
            </option>
          </select>
        </div>

        <!-- Active Narrative Arc Dropdown -->
        <div class="selector-item">
          <label for="oracle-arc-select" class="selector-label">Active Narrative Arc</label>
          <select
            id="oracle-arc-select"
            v-model.number="selectedArcId"
            class="selector-dropdown"
          >
            <option :value="null">[All / Sandbox]</option>
            <option v-for="arc in filteredArcs" :key="arc.id" :value="arc.id">
              {{ arc.title }} {{ arc.is_custom ? '(Custom)' : '' }}
            </option>
          </select>
        </div>

        <!-- New Arc Author Button -->
        <div class="selector-action">
          <button
            type="button"
            class="btn-new-arc"
            title="Write and register custom storylines and fragments"
            @click="showAuthorModal = true"
          >
            + New Arc
          </button>
        </div>
      </div>

      <!-- Active Arc Synopsis Banner (if an Arc is chosen) -->
      <div v-if="activeArc" class="arc-synopsis-banner">
        <span class="synopsis-label">ARC SYNOPSIS:</span>
        <span class="synopsis-text">{{ activeArc.synopsis }}</span>
      </div>

      <!-- Main Drawer Content: Controls on top, Chronicle Feed below -->
      <div class="drawer-body">
        <div class="controls-panel">
          <OracleControls
            :generating="generating"
            :saving-manual="savingManual"
            @generate="handleGenerate"
            @save-manual-log="handleSaveManualLog"
          />
        </div>

        <div class="feed-panel">
          <OracleFeed
            :logs="sessionLogs"
            @clear-logs="handleClearLogs"
            @share-log="handleShareLog"
          />
        </div>
      </div>

      <!-- Custom Arc Author Modal -->
      <ArcAuthorModal
        v-model="showAuthorModal"
        :environments="environments"
        :default-environment-id="selectedEnvironmentId"
        @arc-created="handleArcCreated"
      />
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import OracleControls from './OracleControls.vue';
import OracleFeed from './OracleFeed.vue';
import ArcAuthorModal from './ArcAuthorModal.vue';

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  isGm: {
    type: Boolean,
    default: false,
  },
  socket: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close', 'shared-to-chat']);

const environments = ref([]);
const arcs = ref([]);
const sessionLogs = ref([]);
const selectedEnvironmentId = ref(null);
const selectedArcId = ref(null);
const generating = ref(false);
const savingManual = ref(false);
const showAuthorModal = ref(false);

const filteredArcs = computed(() => {
  if (!selectedEnvironmentId.value) return arcs.value;
  return arcs.value.filter((a) => Number(a.environment_id) === Number(selectedEnvironmentId.value));
});

const activeArc = computed(() => {
  if (!selectedArcId.value) return null;
  return arcs.value.find((a) => Number(a.id) === Number(selectedArcId.value)) || null;
});

function onEnvironmentChanged() {
  // If active arc does not belong to new environment, reset arc to null
  if (selectedArcId.value) {
    const belongs = filteredArcs.value.some((a) => a.id === selectedArcId.value);
    if (!belongs) {
      selectedArcId.value = null;
    }
  }
}

async function fetchInitData() {
  if (!props.isGm) return;
  try {
    const res = await fetch('/api/oracle/init');
    if (!res.ok) return;
    const data = await res.json();
    environments.value = data.environments || [];
    arcs.value = data.arcs || [];
    sessionLogs.value = data.logs || [];

    if (!selectedEnvironmentId.value && environments.value.length > 0) {
      selectedEnvironmentId.value = environments.value[0].id;
    }
  } catch (err) {
    console.warn('Failed to load oracle init data:', err);
  }
}

async function handleGenerate({ contextType, resolutionOutcome, directiveText }) {
  if (!selectedEnvironmentId.value) return;
  generating.value = true;
  try {
    const res = await fetch('/api/oracle/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environmentId: selectedEnvironmentId.value,
        arcId: selectedArcId.value,
        contextType,
        resolutionOutcome,
        directiveText,
      }),
    });

    if (res.ok) {
      const newLog = await res.json();
      sessionLogs.value = [newLog, ...sessionLogs.value.filter((l) => l.id !== newLog.id)];
    }
  } catch (err) {
    console.error('Error generating narrative prompt:', err);
  } finally {
    generating.value = false;
  }
}

async function handleSaveManualLog({ textContent, contextType }) {
  savingManual.value = true;
  try {
    const res = await fetch('/api/oracle/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environmentId: selectedEnvironmentId.value,
        arcId: selectedArcId.value,
        textContent,
        contextType,
      }),
    });

    if (res.ok) {
      const newLog = await res.json();
      sessionLogs.value = [newLog, ...sessionLogs.value.filter((l) => l.id !== newLog.id)];
    }
  } catch (err) {
    console.error('Error saving manual narrative note:', err);
  } finally {
    savingManual.value = false;
  }
}

async function handleClearLogs() {
  try {
    const res = await fetch('/api/oracle/logs', { method: 'DELETE' });
    if (res.ok) {
      sessionLogs.value = [];
    }
  } catch (err) {
    console.error('Error clearing oracle logs:', err);
  }
}

async function handleShareLog(log) {
  try {
    const res = await fetch('/api/oracle/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textContent: log.text_content,
        source: log.source,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      emit('shared-to-chat', data.shared);
    }
  } catch (err) {
    console.error('Error sharing oracle message to chat:', err);
  }
}

function handleArcCreated(newArc) {
  if (newArc && newArc.id) {
    arcs.value = [...arcs.value, newArc];
    selectedEnvironmentId.value = newArc.environment_id;
    selectedArcId.value = newArc.id;
  }
}

function closeDrawer() {
  emit('close');
}

// Socket listener for GM-only oracle sync
function setupSocket() {
  if (props.socket && typeof props.socket.on === 'function') {
    props.socket.on('oracle:log_added', (log) => {
      if (log && log.id) {
        sessionLogs.value = [log, ...sessionLogs.value.filter((l) => l.id !== log.id)];
      }
    });

    props.socket.on('oracle:arc_created', (arc) => {
      if (arc && arc.id && !arcs.value.some((a) => a.id === arc.id)) {
        arcs.value = [...arcs.value, arc];
      }
    });

    props.socket.on('oracle:logs_cleared', () => {
      sessionLogs.value = [];
    });
  }
}

function cleanupSocket() {
  if (props.socket && typeof props.socket.off === 'function') {
    props.socket.off('oracle:log_added');
    props.socket.off('oracle:arc_created');
    props.socket.off('oracle:logs_cleared');
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      fetchInitData();
    }
  }
);

onMounted(() => {
  if (props.open) {
    fetchInitData();
  }
  setupSocket();
});

onBeforeUnmount(() => {
  cleanupSocket();
});

defineExpose({
  selectedEnvironmentId,
  selectedArcId,
  sessionLogs,
  environments,
  arcs,
  filteredArcs,
  activeArc,
  fetchInitData,
  handleGenerate,
  handleSaveManualLog,
  handleClearLogs,
  handleShareLog,
});
</script>

<style scoped>
.oracle-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(1.5px);
  z-index: 1200;
  display: flex;
  justify-content: flex-end;
}

.gm-oracle-drawer {
  width: 520px;
  max-width: 95vw;
  height: 100vh;
  background: rgba(13, 15, 18, 0.85);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-left: 1px solid #28303f;
  box-shadow: -6px 0 24px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #e2e8f0;
  animation: slideInRight 0.22s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

/* Header */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.45);
  border-bottom: 1px solid #232936;
}

.header-branding {
  display: flex;
  align-items: center;
  gap: 8px;
}

.branding-icon {
  font-size: 18px;
}

.branding-title {
  margin: 0;
  font-family: var(--font-family-header, 'Modesto Condensed', 'Modesto', 'Modesto Poster', 'Nodesto', 'Consolas', 'Roboto', sans-serif);
  font-size: 16px;
  letter-spacing: 0.06em;
  color: #fff;
  text-transform: uppercase;
}

.close-btn {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

/* Selector Bar */
.narrative-selector-bar {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid #232936;
  flex-wrap: wrap;
}

.selector-item {
  flex: 1;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.selector-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.04em;
}

.selector-dropdown {
  background: #0d0f12;
  border: 1px solid #2d3748;
  border-radius: 4px;
  color: #4fd1c5;
  font-size: 12px;
  padding: 6px 8px;
  outline: none;
  transition: border-color 0.2s ease;
}

.selector-dropdown:focus {
  border-color: #38b2ac;
}

.selector-action {
  align-self: flex-end;
}

.btn-new-arc {
  background: linear-gradient(135deg, #1f090f 0%, #853146 100%);
  border: 1px solid #e53e3e;
  border-radius: 4px;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.btn-new-arc:hover {
  background: linear-gradient(135deg, #2b0c15 0%, #9b3952 100%);
  box-shadow: 0 0 8px rgba(229, 62, 62, 0.4);
}

/* Arc Synopsis Banner */
.arc-synopsis-banner {
  padding: 6px 16px;
  background: rgba(133, 49, 70, 0.15);
  border-bottom: 1px solid rgba(133, 49, 70, 0.3);
  font-size: 11px;
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.synopsis-label {
  color: #feb2b2;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.synopsis-text {
  color: #e2e8f0;
  line-height: 1.35;
}

/* Main Drawer Body */
.drawer-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.controls-panel {
  flex-shrink: 0;
}

.feed-panel {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
