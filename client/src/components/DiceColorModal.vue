<template>
  <div v-if="modelValue" class="dice-color-modal-backdrop" @click.self="close">
    <div
      class="dice-color-modal-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dice-color-modal-title"
    >
      <div class="dice-color-modal-header">
        <div class="dice-color-modal-title" id="dice-color-modal-title">
          <svg class="tool-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/>
          </svg>
          Dice Colors
        </div>
        <button
          type="button"
          class="btn-dice-color-close"
          @click="close"
          title="Close dialog"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div class="dice-color-modal-body">
        <p class="dice-color-desc">
          Customize the 3D d10 colors for your percentile, action damage, and combat initiative rolls.
        </p>

        <!-- Color Settings List -->
        <div class="dice-color-items">
          <!-- Percentile Tens -->
          <div class="dice-color-row">
            <div class="dice-color-info">
              <span class="dice-color-name">Percentile: Tens Die (00-90)</span>
              <span class="dice-color-hint">Lighter die representing the tens place</span>
            </div>
            <div class="dice-picker-pill">
              <input
                type="color"
                class="dice-native-picker"
                :value="colors.percentileTens"
                @input="updateColor('percentileTens', $event.target.value)"
                title="Choose Tens Die color"
              />
              <span class="dice-color-preview-box" :style="{ backgroundColor: colors.percentileTens }"></span>
              <span class="dice-hex-code">{{ colors.percentileTens.toUpperCase() }}</span>
            </div>
          </div>

          <!-- Percentile Ones -->
          <div class="dice-color-row">
            <div class="dice-color-info">
              <span class="dice-color-name">Percentile: Ones Die (0-9)</span>
              <span class="dice-color-hint">Die representing single digits (1-100)</span>
            </div>
            <div class="dice-picker-pill">
              <input
                type="color"
                class="dice-native-picker"
                :value="colors.percentileOnes"
                @input="updateColor('percentileOnes', $event.target.value)"
                title="Choose Ones Die color"
              />
              <span class="dice-color-preview-box" :style="{ backgroundColor: colors.percentileOnes }"></span>
              <span class="dice-hex-code">{{ colors.percentileOnes.toUpperCase() }}</span>
            </div>
          </div>

          <!-- Damage / d10 Pool -->
          <div class="dice-color-row">
            <div class="dice-color-info">
              <span class="dice-color-name">d10s Pool &amp; Damage Dice</span>
              <span class="dice-color-hint">Color for 1d10 to 20d10 attacks &amp; actions</span>
            </div>
            <div class="dice-picker-pill">
              <input
                type="color"
                class="dice-native-picker"
                :value="colors.damage"
                @input="updateColor('damage', $event.target.value)"
                title="Choose Damage Dice color"
              />
              <span class="dice-color-preview-box" :style="{ backgroundColor: colors.damage }"></span>
              <span class="dice-hex-code">{{ colors.damage.toUpperCase() }}</span>
            </div>
          </div>

          <!-- Initiative Player -->
          <div class="dice-color-row">
            <div class="dice-color-info">
              <span class="dice-color-name">Initiative: Players Die</span>
              <span class="dice-color-hint">Initiative contest die for party players</span>
            </div>
            <div class="dice-picker-pill">
              <input
                type="color"
                class="dice-native-picker"
                :value="colors.initiativePlayer"
                @input="updateColor('initiativePlayer', $event.target.value)"
                title="Choose Players Initiative Die color"
              />
              <span class="dice-color-preview-box" :style="{ backgroundColor: colors.initiativePlayer }"></span>
              <span class="dice-hex-code">{{ colors.initiativePlayer.toUpperCase() }}</span>
            </div>
          </div>

          <!-- Initiative Opposition -->
          <div class="dice-color-row">
            <div class="dice-color-info">
              <span class="dice-color-name">Initiative: Opposition Die</span>
              <span class="dice-color-hint">Initiative contest die for opponents</span>
            </div>
            <div class="dice-picker-pill">
              <input
                type="color"
                class="dice-native-picker"
                :value="colors.initiativeOpp"
                @input="updateColor('initiativeOpp', $event.target.value)"
                title="Choose Opposition Initiative Die color"
              />
              <span class="dice-color-preview-box" :style="{ backgroundColor: colors.initiativeOpp }"></span>
              <span class="dice-hex-code">{{ colors.initiativeOpp.toUpperCase() }}</span>
            </div>
          </div>
        </div>

        <!-- Live Die Face & Contrasting Number Preview Row -->
        <div class="dice-preview-strip">
          <div
            class="dice-preview-badge"
            :style="{
              backgroundColor: colors.percentileTens,
              borderColor: getContrastingNumberColor(colors.percentileTens),
              color: getContrastingNumberColor(colors.percentileTens)
            }"
            title="Tens Die (Face & Contrasting Number)"
          >
            <span class="dice-badge-label">Tens</span>
            <span class="dice-badge-val">80</span>
          </div>

          <div
            class="dice-preview-badge"
            :style="{
              backgroundColor: colors.percentileOnes,
              borderColor: getContrastingNumberColor(colors.percentileOnes),
              color: getContrastingNumberColor(colors.percentileOnes)
            }"
            title="Ones Die (Face & Contrasting Number)"
          >
            <span class="dice-badge-label">Ones</span>
            <span class="dice-badge-val">4</span>
          </div>

          <div
            class="dice-preview-badge"
            :style="{
              backgroundColor: colors.damage,
              borderColor: getContrastingNumberColor(colors.damage),
              color: getContrastingNumberColor(colors.damage)
            }"
            title="Damage Die (Face & Contrasting Number)"
          >
            <span class="dice-badge-label">Damage</span>
            <span class="dice-badge-val">7</span>
          </div>

          <div
            class="dice-preview-badge"
            :style="{
              backgroundColor: colors.initiativePlayer,
              borderColor: getContrastingNumberColor(colors.initiativePlayer),
              color: getContrastingNumberColor(colors.initiativePlayer)
            }"
            title="Party Initiative Die (Face & Contrasting Number)"
          >
            <span class="dice-badge-label">Party</span>
            <span class="dice-badge-val">9</span>
          </div>

          <div
            class="dice-preview-badge"
            :style="{
              backgroundColor: colors.initiativeOpp,
              borderColor: getContrastingNumberColor(colors.initiativeOpp),
              color: getContrastingNumberColor(colors.initiativeOpp)
            }"
            title="Opposition Initiative Die (Face & Contrasting Number)"
          >
            <span class="dice-badge-label">Opposition</span>
            <span class="dice-badge-val">5</span>
          </div>
        </div>
      </div>

      <div class="dice-color-modal-footer">
        <button type="button" class="btn-dice-reset" @click="resetToDefaults">
          Reset Defaults
        </button>
        <button type="button" class="btn-dice-done" @click="close">
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, onMounted } from 'vue';
import {
  DEFAULT_DICE_COLORS,
  getSavedDiceColors,
  saveDiceColors,
  resetDiceColors,
  normalizeHexColor,
  getContrastingNumberColor,
} from '../utils/diceColorManager.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const colors = reactive({ ...DEFAULT_DICE_COLORS });

function loadCurrent() {
  const saved = getSavedDiceColors();
  Object.assign(colors, saved);
}

onMounted(() => {
  loadCurrent();
});

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadCurrent();
  }
});

function updateColor(key, hex) {
  colors[key] = normalizeHexColor(hex);
  saveDiceColors(colors);
  emit('change', { ...colors });
}

function resetToDefaults() {
  resetDiceColors();
  Object.assign(colors, DEFAULT_DICE_COLORS);
  emit('change', { ...colors });
}

function close() {
  emit('update:modelValue', false);
}
</script>

<style scoped>
.dice-color-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
  padding: 16px;
}

.dice-color-modal-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-fade-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-fade-in {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dice-color-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #0d1117;
  border-bottom: 1px solid #30363d;
}

.dice-color-modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #f0f6fc;
}

.btn-dice-color-close {
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  border-radius: 4px;
}
.btn-dice-color-close:hover {
  color: #f0f6fc;
  background: rgba(255, 255, 255, 0.08);
}

.dice-color-modal-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dice-color-desc {
  margin: 0;
  font-size: 12px;
  color: #8b949e;
  line-height: 1.4;
}

.dice-color-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dice-color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  gap: 12px;
}

.dice-color-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dice-color-name {
  font-size: 13px;
  font-weight: 500;
  color: #e6edf3;
}

.dice-color-hint {
  font-size: 11px;
  color: #8b949e;
}

.dice-picker-pill {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
}

.dice-native-picker {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.dice-color-preview-box {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: inline-block;
  pointer-events: none;
}

.dice-hex-code {
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace;
  font-size: 11px;
  color: #c9d1d9;
  letter-spacing: 0.5px;
  pointer-events: none;
}

.dice-preview-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 10px 12px;
  background: #0d1117;
  border: 1px dashed #30363d;
  border-radius: 6px;
}

.dice-preview-badge {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid currentColor;
  border-radius: 6px;
  padding: 8px 4px;
  gap: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
  transition: all 0.15s ease;
}

.dice-badge-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.85;
}

.dice-badge-val {
  font-size: 15px;
  font-weight: 800;
  font-family: monospace;
  line-height: 1;
}

.dice-color-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #0d1117;
  border-top: 1px solid #30363d;
}

.btn-dice-reset {
  background: transparent;
  border: 1px solid #30363d;
  color: #8b949e;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
.btn-dice-reset:hover {
  color: #f85149;
  border-color: #f8514966;
}

.btn-dice-done {
  background: var(--theme-accent, #238636);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.btn-dice-done:hover {
  filter: brightness(1.15);
}
</style>
