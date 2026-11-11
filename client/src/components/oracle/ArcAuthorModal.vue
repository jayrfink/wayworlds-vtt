<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div class="modal-card arc-author-modal" role="dialog" aria-modal="true" aria-labelledby="arc-author-title">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-title-row">
          <span class="header-icon">📜</span>
          <h3 id="arc-author-title">Write Custom Narrative Arc</h3>
        </div>
        <button type="button" class="btn-close" title="Close" @click="close">✕</button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <div v-if="errorMessage" class="error-banner">
          ⚠️ {{ errorMessage }}
        </div>

        <!-- Environment Selector -->
        <div class="form-group">
          <label for="arc-env-select">Target Regional Environment *</label>
          <select id="arc-env-select" v-model="selectedEnvId" class="form-select">
            <option v-for="env in environments" :key="env.id" :value="env.id">
              {{ env.name }}
            </option>
          </select>
        </div>

        <!-- Arc Title -->
        <div class="form-group">
          <label for="arc-title-input">Arc Title *</label>
          <input
            id="arc-title-input"
            v-model="arcTitle"
            type="text"
            class="form-input"
            placeholder="e.g., The Shadow Over Bastion Kraag"
          />
        </div>

        <!-- Synopsis -->
        <div class="form-group">
          <label for="arc-synopsis-input">Plot Synopsis / Lore Hook</label>
          <textarea
            id="arc-synopsis-input"
            v-model="arcSynopsis"
            rows="2"
            class="form-textarea"
            placeholder="Brief overview of the storyline, conspiracy, or threat driving this module..."
          ></textarea>
        </div>

        <!-- Tab Toggle: Individual Fragments vs Bulk Paste -->
        <div class="mode-toggle-row">
          <button
            type="button"
            class="mode-btn"
            :class="{ active: inputMode === 'structured' }"
            @click="inputMode = 'structured'"
          >
            Structured Fragments ({{ fragments.length }})
          </button>
          <button
            type="button"
            class="mode-btn"
            :class="{ active: inputMode === 'bulk' }"
            @click="inputMode = 'bulk'"
          >
            Bulk Paste Helper
          </button>
        </div>

        <!-- Mode 1: Structured Fragments List -->
        <div v-if="inputMode === 'structured'" class="fragments-section">
          <div class="fragments-header">
            <span class="section-subtitle">Arc-Specific Slots & Templates</span>
            <button type="button" class="btn-add-fragment" @click="addFragmentRow">
              + Add Fragment
            </button>
          </div>

          <div v-if="fragments.length === 0" class="no-fragments-hint">
            No custom fragments added yet. Click "+ Add Fragment" to customize locations, NPCs, threats, and twists for this Arc.
          </div>

          <div class="fragments-list">
            <div
              v-for="(f, idx) in fragments"
              :key="idx"
              class="fragment-row"
            >
              <div class="row-top">
                <select v-model="f.category" class="cat-select" title="Fragment Category">
                  <option value="scene_template">scene_template</option>
                  <option value="location">location</option>
                  <option value="npc">npc</option>
                  <option value="threat">threat</option>
                  <option value="action_trigger">action_trigger</option>
                  <option value="sensory_detail">sensory_detail</option>
                  <option value="twist">twist</option>
                  <option value="tradition_hook">tradition_hook</option>
                </select>

                <select
                  v-if="f.category === 'scene_template'"
                  v-model="f.resolution_weight"
                  class="weight-select"
                  title="Resolution Weight"
                >
                  <option value="any">any</option>
                  <option value="success">success</option>
                  <option value="failure">failure</option>
                  <option value="bypass">bypass</option>
                </select>

                <button
                  type="button"
                  class="btn-remove-row"
                  title="Remove Fragment"
                  @click="removeFragmentRow(idx)"
                >
                  ✕
                </button>
              </div>

              <textarea
                v-model="f.text_value"
                rows="2"
                class="fragment-text"
                :placeholder="getPlaceholder(f.category)"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Mode 2: Bulk Paste Helper -->
        <div v-else class="bulk-paste-section">
          <label class="bulk-label">
            Bulk Fragment Import (Line format: <code>category: text value</code>)
          </label>
          <textarea
            v-model="bulkText"
            rows="6"
            class="form-textarea bulk-textarea"
            placeholder="location: an obsidian gatehouse buried under rime&#10;threat: two Tier 2 Frost Assassins hiding in snowbanks&#10;twist: the bridge is rigged with arcane blasting powder"
          ></textarea>
          <button type="button" class="btn-parse-bulk" @click="parseBulk">
            Import Into Structured List
          </button>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="close">
          Cancel
        </button>
        <button
          type="button"
          class="btn-save"
          :disabled="saving || !arcTitle.trim()"
          @click="saveArc"
        >
          <span v-if="saving">Creating Arc...</span>
          <span v-else>Save Narrative Arc</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  environments: {
    type: Array,
    default: () => [],
  },
  defaultEnvironmentId: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'arc-created']);

const selectedEnvId = ref(props.defaultEnvironmentId || (props.environments[0]?.id ?? 1));
const arcTitle = ref('');
const arcSynopsis = ref('');
const inputMode = ref('structured');
const fragments = ref([
  { category: 'threat', resolution_weight: 'any', text_value: '' },
  { category: 'location', resolution_weight: 'any', text_value: '' },
]);
const bulkText = ref('');
const saving = ref(false);
const errorMessage = ref('');

watch(
  () => props.defaultEnvironmentId,
  (newVal) => {
    if (newVal) selectedEnvId.value = newVal;
  }
);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      errorMessage.value = '';
      if (!selectedEnvId.value && props.environments.length > 0) {
        selectedEnvId.value = props.environments[0].id;
      }
    }
  }
);

function addFragmentRow() {
  fragments.value.push({
    category: 'threat',
    resolution_weight: 'any',
    text_value: '',
  });
}

function removeFragmentRow(index) {
  fragments.value.splice(index, 1);
}

function getPlaceholder(cat) {
  if (cat === 'scene_template') return 'Template with #location#, #threat#, #npc#, #action_trigger#, etc.';
  if (cat === 'threat') return 'e.g., a Tier 3 Blood Witch wielding a curved bone scythe';
  if (cat === 'location') return 'e.g., an altar of basalt leaking black mist';
  if (cat === 'npc') return 'e.g., an exiled clan scout clutching a fractured talisman';
  if (cat === 'action_trigger') return 'e.g., whispers an incantation that freezes the blood';
  if (cat === 'twist') return 'e.g., the target has prepared a concealed escape hatch';
  return 'Fragment text...';
}

function parseBulk() {
  const lines = bulkText.value.split('\n');
  const validCategories = [
    'scene_template',
    'location',
    'npc',
    'threat',
    'action_trigger',
    'sensory_detail',
    'twist',
    'tradition_hook',
  ];

  let addedCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx !== -1) {
      const cat = trimmed.slice(0, colonIdx).trim().toLowerCase();
      const val = trimmed.slice(colonIdx + 1).trim();
      if (validCategories.includes(cat) && val) {
        fragments.value.push({
          category: cat,
          resolution_weight: 'any',
          text_value: val,
        });
        addedCount++;
      }
    } else {
      // Default to threat if no category prefix
      fragments.value.push({
        category: 'threat',
        resolution_weight: 'any',
        text_value: trimmed,
      });
      addedCount++;
    }
  }

  bulkText.value = '';
  inputMode.value = 'structured';
}

async function saveArc() {
  if (!arcTitle.value.trim()) {
    errorMessage.value = 'Please provide an Arc Title';
    return;
  }
  if (!selectedEnvId.value) {
    errorMessage.value = 'Please select a Target Environment';
    return;
  }

  saving.value = true;
  errorMessage.value = '';

  const cleanFragments = fragments.value
    .filter((f) => f.text_value && f.text_value.trim())
    .map((f) => ({
      category: f.category,
      resolution_weight: f.resolution_weight || 'any',
      text_value: f.text_value.trim(),
    }));

  try {
    const res = await fetch('/api/oracle/arcs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environmentId: selectedEnvId.value,
        title: arcTitle.value.trim(),
        synopsis: arcSynopsis.value.trim(),
        fragments: cleanFragments,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save narrative arc');
    }

    const createdArc = await res.json();
    emit('arc-created', createdArc);
    close();
  } catch (err) {
    errorMessage.value = err.message || 'Failed to create arc';
  } finally {
    saving.value = false;
  }
}

function close() {
  arcTitle.value = '';
  arcSynopsis.value = '';
  fragments.value = [
    { category: 'threat', resolution_weight: 'any', text_value: '' },
    { category: 'location', resolution_weight: 'any', text_value: '' },
  ];
  emit('update:modelValue', false);
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(2px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  background: rgba(20, 23, 29, 0.88);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: 1px solid #2d3748;
  border-radius: 8px;
  width: 560px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
  color: #e2e8f0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #232936;
  background: rgba(0, 0, 0, 0.40);
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 16px;
}

.header-title-row h3 {
  margin: 0;
  font-family: var(--font-family-header, 'Modesto Condensed', 'Modesto', 'Modesto Poster', 'Nodesto', 'Consolas', 'Roboto', sans-serif);
  font-size: 16px;
  letter-spacing: 0.05em;
  color: #fff;
}

.btn-close {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
}

.btn-close:hover {
  color: #fff;
}

.modal-body {
  padding: 16px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-banner {
  background: #1f090f;
  border: 1px solid #853146;
  color: #feb2b2;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.04em;
}

.form-input,
.form-select,
.form-textarea {
  background: #0d0f12;
  border: 1px solid #2d3748;
  border-radius: 4px;
  color: #e2e8f0;
  padding: 7px 10px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #38b2ac;
}

.mode-toggle-row {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #28303f;
  padding-bottom: 6px;
  margin-top: 4px;
}

.mode-btn {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.mode-btn.active {
  color: #4fd1c5;
  border-bottom-color: #38b2ac;
  font-weight: 600;
}

.fragments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e0;
}

.btn-add-fragment {
  background: #1a202c;
  border: 1px solid #2d3748;
  color: #4fd1c5;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  cursor: pointer;
}

.btn-add-fragment:hover {
  background: #28303f;
  border-color: #38b2ac;
}

.no-fragments-hint {
  font-size: 12px;
  color: #64748b;
  font-style: italic;
  padding: 8px 0;
}

.fragments-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}

.fragment-row {
  background: #0d0f12;
  border: 1px solid #28303f;
  border-radius: 5px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cat-select,
.weight-select {
  background: #14171d;
  border: 1px solid #2d3748;
  border-radius: 4px;
  color: #4fd1c5;
  font-size: 11px;
  padding: 3px 6px;
  outline: none;
}

.btn-remove-row {
  margin-left: auto;
  background: none;
  border: none;
  color: #718096;
  font-size: 12px;
  cursor: pointer;
}

.btn-remove-row:hover {
  color: #fc8181;
}

.fragment-text {
  width: 100%;
  background: #161a22;
  border: 1px solid #28303f;
  border-radius: 4px;
  color: #e2e8f0;
  padding: 6px 8px;
  font-size: 12px;
  outline: none;
  resize: vertical;
}

.fragment-text:focus {
  border-color: #38b2ac;
}

.bulk-paste-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bulk-label {
  font-size: 11px;
  color: #a0aec0;
}

.bulk-textarea {
  font-family: monospace;
  font-size: 11px;
  line-height: 1.4;
}

.btn-parse-bulk {
  align-self: flex-start;
  background: #1a202c;
  border: 1px solid #38b2ac;
  color: #4fd1c5;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 11px;
  cursor: pointer;
}

.btn-parse-bulk:hover {
  background: rgba(56, 178, 172, 0.2);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid #232936;
  background: #101318;
}

.btn-cancel {
  background: #1a202c;
  border: 1px solid #2d3748;
  color: #a0aec0;
  border-radius: 4px;
  padding: 6px 14px;
  font-size: 12px;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #28303f;
  color: #fff;
}

.btn-save {
  background: linear-gradient(135deg, #1f090f 0%, #853146 100%);
  border: 1px solid #e53e3e;
  color: #fff;
  border-radius: 4px;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #2b0c15 0%, #9b3952 100%);
  box-shadow: 0 0 10px rgba(229, 62, 62, 0.4);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
