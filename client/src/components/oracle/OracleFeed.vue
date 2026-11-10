<template>
  <div class="oracle-feed-container">
    <div class="feed-header">
      <div class="feed-title">
        <span class="feed-icon">📜</span>
        <h4>Chronicle Feed</h4>
        <span class="log-count" v-if="logs.length">({{ logs.length }})</span>
      </div>
      <button
        v-if="logs.length"
        type="button"
        class="btn-clear-feed"
        title="Clear Oracle Session Logs"
        @click="$emit('clear-logs')"
      >
        Clear Logs
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="!logs || logs.length === 0" class="feed-empty">
      <p class="empty-text">No narrative logs recorded yet.</p>
      <p class="empty-subtext">Trigger a context hook above or write manual notes to seed your chronicle.</p>
    </div>

    <!-- Feed List -->
    <div v-else class="feed-list" ref="feedListRef">
      <div
        v-for="log in logs"
        :key="log.id"
        class="feed-card"
        :class="{
          'card-engine': log.source === 'engine',
          'card-manual': log.source === 'gm_manual',
          'card-twist': log.source === 'twist',
        }"
      >
        <!-- Card Top Bar -->
        <div class="card-meta">
          <div class="badge-group">
            <span
              class="source-badge"
              :class="'badge-' + log.source"
            >
              {{ log.source === 'twist' ? '⚡ TWIST' : log.source === 'gm_manual' ? 'GM LOG' : 'ENGINE' }}
            </span>
            <span v-if="log.context_type" class="context-badge">
              {{ formatContext(log.context_type) }}
            </span>
            <span v-if="log.arc_title" class="arc-badge" :title="log.arc_title">
              {{ log.arc_title }}
            </span>
          </div>
          <span class="timestamp">{{ formatTime(log.created_at) }}</span>
        </div>

        <!-- Card Body -->
        <div class="card-content">
          <div class="narrative-body" v-html="renderNarrative(log.text_content)"></div>
        </div>

        <!-- Card Action Buttons -->
        <div class="card-actions">
          <button
            type="button"
            class="action-btn btn-share-chat"
            :class="{ 'btn-shared': sharedId === log.id }"
            @click="shareToPublicChat(log)"
            title="Reveal this narrative entry to all player screens in public chat"
          >
            <span v-if="sharedId === log.id">✓ Sent to Chat</span>
            <span v-else>📢 Send to Public Chat</span>
          </button>
          <button
            type="button"
            class="action-btn btn-copy"
            @click="copyText(log.text_content, log.id)"
            title="Copy text to clipboard"
          >
            <span v-if="copiedId === log.id">✓ Copied</span>
            <span v-else>📋 Copy</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  logs: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['clear-logs', 'share-log']);

const feedListRef = ref(null);
const copiedId = ref(null);
const sharedId = ref(null);

function formatContext(ctx) {
  if (!ctx) return '';
  if (ctx === 'combat') return 'Combat Beat';
  if (ctx === 'social') return 'Social / NPC';
  if (ctx === 'lore') return 'Tradition / Lore';
  if (ctx === 'explore') return 'Explore';
  return ctx;
}

function formatTime(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function renderNarrative(text) {
  if (!text) return '';
  // Highlight bracketed directives / twists
  return text
    .replace(/\[TWIST\]:\s*(.*)/g, '<strong class="twist-highlight">⚡ TWIST: $1</strong>')
    .replace(/\[DIRECTIVE\]:\s*(.*)/g, '<span class="directive-highlight">🎯 DIRECTIVE: $1</span>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

async function copyText(text, id) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    copiedId.value = id;
    setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null;
    }, 2000);
  } catch (err) {
    console.warn('Clipboard copy error:', err);
  }
}

function shareToPublicChat(log) {
  emit('share-log', log);
  sharedId.value = log.id;
  setTimeout(() => {
    if (sharedId.value === log.id) sharedId.value = null;
  }, 2500);
}
</script>

<style scoped>
.oracle-feed-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0d0f12;
  color: #e2e8f0;
  overflow: hidden;
}

.feed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #14171d;
  border-bottom: 1px solid #232936;
}

.feed-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feed-title h4 {
  margin: 0;
  font-family: var(--font-modesto, 'Modesto Expanded', serif);
  font-size: 15px;
  letter-spacing: 0.05em;
  color: #e2e8f0;
  text-transform: uppercase;
}

.feed-icon {
  font-size: 15px;
}

.log-count {
  font-size: 12px;
  color: #718096;
}

.btn-clear-feed {
  background: transparent;
  color: #a0aec0;
  border: 1px solid #2d3748;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-feed:hover {
  background: #1a202c;
  color: #fc8181;
  border-color: #853146;
}

.feed-empty {
  padding: 32px 20px;
  text-align: center;
  color: #718096;
}

.empty-text {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #a0aec0;
}

.empty-subtext {
  font-size: 12px;
  line-height: 1.4;
}

.feed-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feed-card {
  background: #161920;
  border-radius: 6px;
  border: 1px solid #28303f;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.2s ease;
}

/* Color coding by source */
.card-engine {
  border-left: 4px solid #38b2ac;
}

.card-engine:hover {
  border-color: #38b2ac;
}

.card-manual {
  border-left: 4px solid #a0aec0;
}

.card-manual:hover {
  border-color: #718096;
}

.card-twist {
  border: 1px solid #853146;
  border-left: 4px solid #e53e3e;
  background: #1f090f;
  box-shadow: 0 0 10px rgba(133, 49, 70, 0.25);
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.badge-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.source-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.04em;
}

.badge-engine {
  background: rgba(56, 178, 172, 0.15);
  color: #4fd1c5;
  border: 1px solid rgba(56, 178, 172, 0.4);
}

.badge-gm_manual {
  background: rgba(160, 174, 192, 0.12);
  color: #cbd5e0;
  border: 1px solid rgba(160, 174, 192, 0.3);
}

.badge-twist {
  background: #853146;
  color: #feb2b2;
  border: 1px solid #e53e3e;
  animation: pulseTwist 2s infinite ease-in-out;
}

@keyframes pulseTwist {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.context-badge {
  font-size: 10px;
  background: #1f2532;
  color: #94a3b8;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #2d3748;
}

.arc-badge {
  font-size: 10px;
  background: rgba(133, 49, 70, 0.2);
  color: #f687b3;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid rgba(133, 49, 70, 0.4);
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timestamp {
  font-size: 11px;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.card-content {
  font-size: 13px;
  line-height: 1.55;
  color: #e2e8f0;
}

.card-manual .narrative-body {
  color: #cbd5e0;
  font-style: italic;
}

:deep(.twist-highlight) {
  display: block;
  margin-top: 6px;
  color: #feb2b2;
  font-weight: 600;
  background: rgba(133, 49, 70, 0.3);
  padding: 6px 8px;
  border-radius: 4px;
  border-left: 3px solid #e53e3e;
}

:deep(.directive-highlight) {
  color: #fbd38d;
  font-weight: 600;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.action-btn {
  background: #1a202c;
  border: 1px solid #2d3748;
  color: #a0aec0;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.action-btn:hover {
  background: #232b3a;
  color: #e2e8f0;
  border-color: #4a5568;
}

.btn-share-chat {
  border-color: #38b2ac;
  color: #4fd1c5;
}

.btn-share-chat:hover {
  background: rgba(56, 178, 172, 0.15);
  color: #81e6d9;
}

.btn-shared {
  background: #234e52 !important;
  color: #81e6d9 !important;
  border-color: #38b2ac !important;
}

.btn-copy:hover {
  border-color: #718096;
}
</style>
