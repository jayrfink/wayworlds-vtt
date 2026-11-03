<template>
  <div class="rulebooks-container">
    <!-- Top-Level Navigation Bar -->
    <header class="top-nav-bar">
      <nav class="mode-toggle" aria-label="Rulebook View Modes">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: viewMode === 'quickref' }"
          @click="viewMode = 'quickref'"
        >
          Quick Reference Tables
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: viewMode === 'additional' }"
          @click="viewMode = 'additional'"
        >
          Additional Rules
        </button>
      </nav>
    </header>

    <!-- Quick Reference Tables View -->
    <div v-if="viewMode === 'quickref'" class="quickref-layout">
      <QuickReferenceTables key="quickref" initial-category="ranged" />
    </div>

    <!-- Additional Rules View -->
    <div v-else-if="viewMode === 'additional'" class="quickref-layout">
      <QuickReferenceTables key="additional" initial-category="additional" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import QuickReferenceTables from '../components/QuickReferenceTables.vue';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';

const props = defineProps({
  initialViewMode: {
    type: String,
    default: undefined,
  },
});

const savedRulebooks = getUserState(getSafeUserId(), 'rulebooks', {
  viewMode: 'quickref',
});

const viewMode = ref(
  props.initialViewMode ??
  (savedRulebooks.viewMode === 'pdf' ? 'additional' : savedRulebooks.viewMode) ??
  'quickref'
);

watch(viewMode, (newVal) => {
  saveUserState(getSafeUserId(), 'rulebooks', {
    viewMode: newVal,
  });
});
</script>

<style scoped>
.rulebooks-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  gap: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Top Navigation Bar */
.top-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  flex-shrink: 0;
}

.mode-toggle {
  display: flex;
  gap: 6px;
  background: var(--bg-tertiary);
  padding: 3px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.mode-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s ease;
}

.mode-btn:hover {
  color: var(--text-primary);
}

.mode-btn.active {
  background-color: #000000 !important;
  border: 1px solid #d0d0d0 !important;
  color: #d0d0d0 !important;
  -webkit-text-fill-color: #d0d0d0;
  box-shadow: 0 0 8px rgba(208, 208, 208, 0.3);
}

/* Quick Reference / Additional Rules Layout */
.quickref-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Scrollbars */
.pdf-sidebar,
.search-results-list,
.toc-tree-list,
.quickref-layout {
  scrollbar-width: thin;
  scrollbar-color: rgba(58, 133, 156, 0.5) #161b22;
}

.pdf-sidebar::-webkit-scrollbar,
.search-results-list::-webkit-scrollbar,
.toc-tree-list::-webkit-scrollbar,
.quickref-layout::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.pdf-sidebar::-webkit-scrollbar-track,
.search-results-list::-webkit-scrollbar-track,
.toc-tree-list::-webkit-scrollbar-track,
.quickref-layout::-webkit-scrollbar-track {
  background: #161b22;
  border-radius: 4px;
}

.pdf-sidebar::-webkit-scrollbar-thumb,
.search-results-list::-webkit-scrollbar-thumb,
.toc-tree-list::-webkit-scrollbar-thumb,
.quickref-layout::-webkit-scrollbar-thumb {
  background: rgba(58, 133, 156, 0.5);
  border: 1px solid rgba(58, 133, 156, 0.7);
  border-radius: 4px;
}

.pdf-sidebar::-webkit-scrollbar-thumb:hover,
.search-results-list::-webkit-scrollbar-thumb:hover,
.toc-tree-list::-webkit-scrollbar-thumb:hover,
.quickref-layout::-webkit-scrollbar-thumb:hover {
  background: rgba(78, 162, 187, 0.8);
  border-color: #4ea2bb;
}
</style>
