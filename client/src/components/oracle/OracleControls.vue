<template>
  <div class="oracle-controls-deck">
    <!-- Section 1: Forced Directive Hook -->
    <div class="control-group directive-group">
      <label class="control-label" for="oracle-directive-input">
        <span class="label-icon">🎯</span> Forced Directive Hook
        <span class="label-hint">(optional override)</span>
      </label>
      <div class="directive-input-wrapper">
        <input
          id="oracle-directive-input"
          v-model="directiveText"
          type="text"
          class="directive-input"
          placeholder="Force next hook (e.g., Blood magic trap, Urkai scout)..."
          @keydown.enter.prevent="triggerGenerate"
        />
        <button
          v-if="directiveText"
          type="button"
          class="btn-clear-directive"
          title="Clear directive"
          @click="directiveText = ''"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Section 2: Mechanical VTT Outcome Toggles -->
    <div class="control-group">
      <label class="control-label">
        <span class="label-icon">🎲</span> VTT Mechanical Outcome
      </label>
      <div class="toggle-buttons outcome-toggles">
        <button
          type="button"
          class="toggle-btn"
          :class="{ active: resolutionOutcome === 'any' }"
          @click="resolutionOutcome = 'any'"
        >
          [Any]
        </button>
        <button
          type="button"
          class="toggle-btn toggle-success"
          :class="{ active: resolutionOutcome === 'success' }"
          @click="resolutionOutcome = 'success'"
        >
          [After Success]
        </button>
        <button
          type="button"
          class="toggle-btn toggle-failure"
          :class="{ active: resolutionOutcome === 'failure' }"
          @click="resolutionOutcome = 'failure'"
        >
          [After Failure]
        </button>
        <button
          type="button"
          class="toggle-btn toggle-bypass"
          :class="{ active: resolutionOutcome === 'bypass' }"
          @click="resolutionOutcome = 'bypass'"
        >
          [After Bypass]
        </button>
      </div>
    </div>

    <!-- Section 3: Context Triggers & Direct Action -->
    <div class="control-group">
      <label class="control-label">
        <span class="label-icon">⚡</span> Narrative Context Trigger
      </label>
      <div class="context-triggers-grid">
        <button
          type="button"
          class="context-btn btn-explore"
          :class="{ active: selectedContext === 'explore' }"
          :disabled="generating"
          @click="setContextAndGenerate('explore')"
        >
          <span class="btn-icon">🌲</span>
          <span class="btn-text">[Explore]</span>
        </button>
        <button
          type="button"
          class="context-btn btn-combat"
          :class="{ active: selectedContext === 'combat' }"
          :disabled="generating"
          @click="setContextAndGenerate('combat')"
        >
          <span class="btn-icon">⚔️</span>
          <span class="btn-text">[Combat Beat]</span>
        </button>
        <button
          type="button"
          class="context-btn btn-social"
          :class="{ active: selectedContext === 'social' }"
          :disabled="generating"
          @click="setContextAndGenerate('social')"
        >
          <span class="btn-icon">🗣️</span>
          <span class="btn-text">[Social / NPC]</span>
        </button>
        <button
          type="button"
          class="context-btn btn-lore"
          :class="{ active: selectedContext === 'lore' }"
          :disabled="generating"
          @click="setContextAndGenerate('lore')"
        >
          <span class="btn-icon">🔮</span>
          <span class="btn-text">[Tradition / Lore]</span>
        </button>
      </div>
    </div>

    <!-- Section 4: Primary Generate Action -->
    <div class="generate-action-row">
      <button
        type="button"
        class="btn-primary-generate"
        :disabled="generating"
        @click="triggerGenerate"
      >
        <span v-if="generating">Consulting the Oracle...</span>
        <span v-else>🔮 Generate Narrative Beat</span>
      </button>
    </div>

    <!-- Section 5: Manual GM Narrative Notes -->
    <div class="control-group manual-notes-group">
      <label class="control-label" for="oracle-manual-notes">
        <span class="label-icon">✍️</span> Manual GM Chronicle Entry
      </label>
      <textarea
        id="oracle-manual-notes"
        v-model="manualText"
        rows="2"
        class="manual-notes-textarea"
        placeholder="Record customized player deeds, scene changes, or custom GM plot developments..."
        @keydown.ctrl.enter="submitManualLog"
        @keydown.meta.enter="submitManualLog"
      ></textarea>
      <div class="manual-notes-actions">
        <span class="shortcut-hint">Ctrl+Enter to save</span>
        <button
          type="button"
          class="btn-save-manual"
          :disabled="!manualText.trim() || savingManual"
          @click="submitManualLog"
        >
          <span v-if="savingManual">Saving...</span>
          <span v-else>+ Add to Log</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  generating: {
    type: Boolean,
    default: false,
  },
  savingManual: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['generate', 'save-manual-log']);

const directiveText = ref('');
const resolutionOutcome = ref('any');
const selectedContext = ref('explore');
const manualText = ref('');

function setContextAndGenerate(ctx) {
  selectedContext.value = ctx;
  triggerGenerate();
}

function triggerGenerate() {
  emit('generate', {
    contextType: selectedContext.value,
    resolutionOutcome: resolutionOutcome.value,
    directiveText: directiveText.value,
  });
}

function submitManualLog() {
  const content = manualText.value.trim();
  if (!content) return;
  emit('save-manual-log', {
    textContent: content,
    contextType: selectedContext.value,
  });
  manualText.value = '';
}
</script>

<style scoped>
.oracle-controls-deck {
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid #28303f;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
}

.label-icon {
  font-size: 13px;
}

.label-hint {
  font-size: 10px;
  text-transform: none;
  color: #64748b;
  font-weight: normal;
}

/* Directive Input */
.directive-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.directive-input {
  width: 100%;
  background: #0d0f12;
  border: 1px solid #2d3748;
  border-radius: 5px;
  color: #fbd38d;
  font-size: 12px;
  padding: 7px 28px 7px 10px;
  outline: none;
  transition: all 0.2s ease;
}

.directive-input:focus {
  border-color: #38b2ac;
  box-shadow: 0 0 6px rgba(56, 178, 172, 0.3);
}

.directive-input::placeholder {
  color: #4a5568;
}

.btn-clear-directive {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: #718096;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
}

.btn-clear-directive:hover {
  color: #e2e8f0;
}

/* Outcome Toggles */
.outcome-toggles {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.toggle-btn {
  flex: 1;
  min-width: 80px;
  background: #0d0f12;
  border: 1px solid #2d3748;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 11px;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  text-align: center;
}

.toggle-btn:hover {
  border-color: #4a5568;
  color: #e2e8f0;
}

.toggle-btn.active {
  background: #1a202c;
  color: #4fd1c5;
  border-color: #38b2ac;
  font-weight: 600;
}

.toggle-success.active {
  color: #68d391;
  border-color: #48bb78;
}

.toggle-failure.active {
  color: #fc8181;
  border-color: #853146;
  background: #1f090f;
}

.toggle-bypass.active {
  color: #63b3ed;
  border-color: #4299e1;
}

/* Context Triggers Grid */
.context-triggers-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.context-btn {
  background: #0d0f12;
  border: 1px solid #28303f;
  border-radius: 5px;
  padding: 7px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #cbd5e0;
}

.context-btn:hover:not(:disabled) {
  background: #161a22;
  border-color: #38b2ac;
}

.context-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-btn.active {
  background: rgba(56, 178, 172, 0.12);
  border-color: #38b2ac;
  color: #4fd1c5;
}

.btn-icon {
  font-size: 14px;
}

.btn-text {
  font-size: 12px;
  font-weight: 600;
}

/* Primary Generate Button */
.generate-action-row {
  margin-top: 2px;
}

.btn-primary-generate {
  width: 100%;
  background: linear-gradient(135deg, #1f090f 0%, #853146 100%);
  border: 1px solid #e53e3e;
  border-radius: 5px;
  padding: 9px 14px;
  font-family: var(--font-family-header, 'Modesto Condensed', 'Modesto', 'Modesto Poster', 'Nodesto', 'Consolas', 'Roboto', sans-serif);
  font-size: 14px;
  letter-spacing: 0.05em;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 12px rgba(133, 49, 70, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary-generate:hover:not(:disabled) {
  background: linear-gradient(135deg, #2b0c15 0%, #9b3952 100%);
  box-shadow: 0 0 16px rgba(229, 62, 62, 0.5);
  transform: translateY(-1px);
}

.btn-primary-generate:disabled {
  opacity: 0.6;
  cursor: wait;
  transform: none;
}

/* Manual Notes */
.manual-notes-group {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid #1f2532;
}

.manual-notes-textarea {
  width: 100%;
  background: #0d0f12;
  border: 1px solid #2d3748;
  border-radius: 5px;
  color: #e2e8f0;
  font-size: 12px;
  padding: 8px 10px;
  outline: none;
  resize: vertical;
  min-height: 52px;
  transition: all 0.2s ease;
}

.manual-notes-textarea:focus {
  border-color: #38b2ac;
}

.manual-notes-textarea::placeholder {
  color: #4a5568;
}

.manual-notes-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.shortcut-hint {
  font-size: 10px;
  color: #64748b;
}

.btn-save-manual {
  background: #1a202c;
  border: 1px solid #2d3748;
  color: #4fd1c5;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-save-manual:hover:not(:disabled) {
  background: #28303f;
  border-color: #38b2ac;
}

.btn-save-manual:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
