<template>
  <div class="rulebooks-container">
    <div class="quickref-layout">
      <QuickReferenceTables :initial-category="resolvedCategory" :initial-search="props.initialSearch" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import QuickReferenceTables from '../components/QuickReferenceTables.vue';
import { getUserState, getSafeUserId } from '../utils/userState.js';

const props = defineProps({
  initialCategory: {
    type: String,
    default: undefined,
  },
  initialViewMode: {
    type: String,
    default: undefined,
  },
  initialSearch: {
    type: String,
    default: undefined,
  },
});

const savedRulebooks = getUserState(getSafeUserId(), 'rulebooks', {
  viewMode: 'quickref',
});

const resolvedCategory = computed(() => {
  if (props.initialCategory) {
    return props.initialCategory === 'additional' ? 'overland' : props.initialCategory;
  }
  if (props.initialViewMode === 'additional' || props.initialViewMode === 'overland' || savedRulebooks.viewMode === 'additional') {
    return 'overland';
  }
  return undefined;
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

/* Quick Reference Layout */
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
