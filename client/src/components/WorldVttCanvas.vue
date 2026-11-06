<template>
  <div
    ref="containerRef"
    class="world-vtt-canvas-container"
    :class="{ 'cursor-pan': isPanning || activeTool === 'pan', 'cursor-ping': activeTool === 'ping', 'cursor-fog': activeTool === 'fog_erase' }"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseLeave"
    @wheel.prevent="onWheel"
  >
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { socket } from '../services/socket.js';
import { drawAllPings, isPingDismissHit } from '../utils/pingRenderer.js';
import {
  clampEraserCells,
  createFogStamp,
  normalizeFogData,
  shouldAddFogStamp,
  appendFogStamps,
  traceFogStamp,
  drawFogLayer,
} from '../utils/fogOfWar.js';

const MARKER_TYPE_GLYPHS = {
  party: '⛺',
  battle: '⚔️',
  faction: '🏴',
  poi: '📍',
  hazard: '⚠️',
};

const props = defineProps({
  map: {
    type: Object,
    default: null,
  },
  markers: {
    type: Array,
    default: () => [],
  },
  pings: {
    type: [Array, Object],
    default: () => [],
  },
  activeTool: {
    type: String,
    default: 'select', // 'select', 'pan', 'ping'
  },
  zoomLevel: {
    type: Number,
    default: 1.0,
  },
  panX: {
    type: Number,
    default: 50,
  },
  panY: {
    type: Number,
    default: 50,
  },
  selectedMarkerId: {
    type: [Number, String],
    default: null,
  },
  isGm: {
    type: Boolean,
    default: false,
  },
  fogEraser: {
    type: Object,
    default: () => ({ shape: 'circle', size: 3 }),
  },
});

const emit = defineEmits([
  'update:zoomLevel',
  'update:panX',
  'update:panY',
  'marker-moved',
  'marker-selected',
  'markers-updated',
  'map-updated',
  'ping-update',
  'ping-dismiss',
  'fog-changed',
]);

const containerRef = ref(null);
const canvasRef = ref(null);

const panX = ref(props.panX);
const panY = ref(props.panY);

watch(() => props.panX, (val) => {
  if (typeof val === 'number' && val !== panX.value) {
    panX.value = val;
    requestRender();
  }
});
watch(() => props.panY, (val) => {
  if (typeof val === 'number' && val !== panY.value) {
    panY.value = val;
    requestRender();
  }
});
watch(() => props.zoomLevel, () => {
  requestRender();
});
watch(() => props.markers, () => {
  requestRender();
}, { deep: true });
watch(() => props.map, () => {
  requestRender();
}, { deep: true });
watch(() => props.selectedMarkerId, () => {
  requestRender();
});

// Fog of War eraser state (GM only)
const isErasingFog = ref(false);
const pendingFogStamps = ref([]);
const fogHoverWorld = ref(null);
let fogScratchCanvas = null;

watch(() => props.fogEraser, () => {
  requestRender();
}, { deep: true });

// Ping state & animation
const isPingDragging = ref(false);
let lastPingPos = { x: 0, y: 0 };
let lastPingEmitTime = 0;
let pingAnimFrameId = null;

const hasActivePings = computed(() => {
  if (!props.pings) return false;
  if (Array.isArray(props.pings)) return props.pings.length > 0;
  if (typeof props.pings === 'object') return Object.keys(props.pings).length > 0;
  return false;
});

function updatePingAnimation() {
  if (hasActivePings.value) {
    if (!pingAnimFrameId) {
      const loop = () => {
        if (!hasActivePings.value) {
          pingAnimFrameId = null;
          requestRender();
          return;
        }
        drawCanvas();
        pingAnimFrameId = requestAnimationFrame(loop);
      };
      pingAnimFrameId = requestAnimationFrame(loop);
    }
  } else {
    if (pingAnimFrameId) {
      cancelAnimationFrame(pingAnimFrameId);
      pingAnimFrameId = null;
      requestRender();
    }
  }
}

watch(
  () => props.pings,
  () => {
    updatePingAnimation();
    requestRender();
  },
  { deep: true }
);

watch(() => props.activeTool, (newTool) => {
  if (newTool !== 'ping' && isPingDragging.value) {
    isPingDragging.value = false;
    emit('ping-update', { x: lastPingPos.x, y: lastPingPos.y, isDragging: false });
  }
  requestRender();
});

const isPanning = ref(false);
const panStart = { x: 0, y: 0 };
const isSpacePressed = ref(false);

const draggingMarker = ref(null);
const dragCell = ref({ q: 0, r: 0 });

const imageCache = new Map();

function getCachedImage(url) {
  if (!url) return null;
  if (imageCache.has(url)) {
    const cached = imageCache.get(url);
    return cached.loaded ? cached.img : null;
  }
  const img = new Image();
  const record = { img, loaded: false };
  imageCache.set(url, record);
  img.onload = () => {
    record.loaded = true;
    requestRender();
  };
  img.onerror = () => {
    imageCache.delete(url);
  };
  img.src = url;
  return null;
}

function handleAssetRenamed({ oldUrl, newUrl }) {
  for (const [key, cached] of Array.from(imageCache.entries())) {
    if (key === oldUrl || key.split('?')[0] === oldUrl) {
      imageCache.delete(key);
      const query = key.includes('?') ? '?' + key.split('?')[1] : '';
      if (newUrl) imageCache.set(newUrl + query, cached);
    }
  }
  if (props.markers && Array.isArray(props.markers)) {
    let changed = false;
    const updated = props.markers.map((m) => {
      if (m.avatar_url === oldUrl) {
        changed = true;
        return { ...m, avatar_url: newUrl };
      } else if (m.avatar_url && m.avatar_url.split('?')[0] === oldUrl) {
        changed = true;
        const query = m.avatar_url.includes('?') ? '?' + m.avatar_url.split('?')[1] : '';
        return { ...m, avatar_url: newUrl + query };
      }
      return m;
    });
    if (changed) emit('markers-updated', updated);
  }
  requestRender();
}

function handleAssetDeleted({ url }) {
  for (const key of Array.from(imageCache.keys())) {
    if (key === url || key.split('?')[0] === url) imageCache.delete(key);
  }
  if (props.markers && Array.isArray(props.markers)) {
    let changed = false;
    const updated = props.markers.map((m) => {
      if (m.avatar_url === url || (m.avatar_url && m.avatar_url.split('?')[0] === url)) {
        changed = true;
        return { ...m, avatar_url: '' };
      }
      return m;
    });
    if (changed) emit('markers-updated', updated);
  }
  requestRender();
}

function handleMapAssetRenamed({ oldUrl, newUrl }) {
  for (const [key, cached] of Array.from(imageCache.entries())) {
    if (key === oldUrl || key.split('?')[0] === oldUrl) {
      imageCache.delete(key);
      const query = key.includes('?') ? '?' + key.split('?')[1] : '';
      if (newUrl) imageCache.set(newUrl + query, cached);
    }
  }
  if (props.map) {
    if (props.map.background_url === oldUrl) {
      emit('map-updated', { ...props.map, background_url: newUrl });
    } else if (props.map.background_url && props.map.background_url.split('?')[0] === oldUrl) {
      const query = props.map.background_url.includes('?') ? '?' + props.map.background_url.split('?')[1] : '';
      emit('map-updated', { ...props.map, background_url: newUrl + query });
    }
  }
  requestRender();
}

function handleMapAssetDeleted({ url }) {
  for (const key of Array.from(imageCache.keys())) {
    if (key === url || key.split('?')[0] === url) imageCache.delete(key);
  }
  if (props.map && (props.map.background_url === url || (props.map.background_url && props.map.background_url.split('?')[0] === url))) {
    emit('map-updated', { ...props.map, background_url: '' });
  }
  requestRender();
}

const hexSize = computed(() => props.map?.grid_size || 40);
const mapCols = computed(() => props.map?.width || 20);
const mapRows = computed(() => props.map?.height || 20);
const hexW = computed(() => Math.sqrt(3) * hexSize.value);
const hexH = computed(() => 2 * hexSize.value);

function getCellCenter(q, r) {
  const w = hexW.value;
  const h = hexH.value;
  const cx = q * w + ((r & 1) * (w / 2)) + w / 2;
  const cy = r * (0.75 * h) + h / 2;
  return { x: cx, y: cy };
}

function getCellFromWorld(wx, wy) {
  const w = hexW.value;
  const h = hexH.value;
  let minDist = Infinity;
  let bestQ = 0;
  let bestR = 0;
  const approxR = Math.floor(wy / (0.75 * h));
  const approxQ = Math.floor(wx / w);
  for (let r = Math.max(0, approxR - 2); r <= Math.min(mapRows.value - 1, approxR + 2); r++) {
    for (let q = Math.max(0, approxQ - 2); q <= Math.min(mapCols.value - 1, approxQ + 2); q++) {
      const center = getCellCenter(q, r);
      const dist = Math.sqrt((wx - center.x) ** 2 + (wy - center.y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        bestQ = q;
        bestR = r;
      }
    }
  }
  if (minDist > hexSize.value * 1.5) return null;
  return { q: bestQ, r: bestR };
}

function getWorldFromScreen(sx, sy) {
  if (!canvasRef.value) return { x: 0, y: 0 };
  const rect = canvasRef.value.getBoundingClientRect();
  const mouseX = sx - rect.left;
  const mouseY = sy - rect.top;
  return {
    x: (mouseX - panX.value) / props.zoomLevel,
    y: (mouseY - panY.value) / props.zoomLevel,
  };
}

function resizeCanvas() {
  if (!containerRef.value || !canvasRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  canvasRef.value.width = Math.round(rect.width * dpr);
  canvasRef.value.height = Math.round(rect.height * dpr);
  canvasRef.value.style.width = `${rect.width}px`;
  canvasRef.value.style.height = `${rect.height}px`;
  requestRender();
}

let animationFrameId = null;
let needsRender = false;

function requestRender() {
  needsRender = true;
  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(() => {
      animationFrameId = null;
      if (needsRender) {
        needsRender = false;
        drawCanvas();
      }
    });
  }
}

function startRenderLoop() {
  requestRender();
}

function stopRenderLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (pingAnimFrameId) {
    cancelAnimationFrame(pingAnimFrameId);
    pingAnimFrameId = null;
  }
  needsRender = false;
}

function drawCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const width = canvas.width;
  const height = canvas.height;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (!props.map) {
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const mapW = mapCols.value * hexW.value + hexW.value / 2;
  const mapH = mapRows.value * (0.75 * hexH.value) + 0.25 * hexH.value;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.translate(panX.value, panY.value);
  ctx.scale(props.zoomLevel, props.zoomLevel);

  drawBackground(ctx, mapW, mapH);
  drawGrid(ctx, mapW, mapH);
  drawMarkers(ctx);

  if (draggingMarker.value) {
    drawGhostMarker(ctx, draggingMarker.value, dragCell.value);
  }

  // Draw Fog of War (above markers so players cannot see hidden areas)
  drawFogOverlay(ctx, mapW, mapH, dpr);

  drawAllPings(ctx, props.pings, performance.now());

  // GM eraser cursor preview
  drawFogEraserPreview(ctx);

  ctx.restore();
}

function fogEraserSizePx() {
  return clampEraserCells(props.fogEraser?.size) * hexW.value;
}

function drawFogOverlay(ctx, mapW, mapH, dpr) {
  if (!props.map || !props.map.fog_enabled) return;
  const canvas = canvasRef.value;
  if (!canvas || typeof document === 'undefined') return;
  if (!fogScratchCanvas) fogScratchCanvas = document.createElement('canvas');
  if (fogScratchCanvas.width !== canvas.width) fogScratchCanvas.width = canvas.width;
  if (fogScratchCanvas.height !== canvas.height) fogScratchCanvas.height = canvas.height;

  const stamps = pendingFogStamps.value.length
    ? [...normalizeFogData(props.map.fog_data), ...pendingFogStamps.value]
    : normalizeFogData(props.map.fog_data);

  drawFogLayer({
    ctx,
    scratch: fogScratchCanvas,
    transform: [
      dpr * props.zoomLevel, 0, 0, dpr * props.zoomLevel,
      dpr * panX.value, dpr * panY.value,
    ],
    mapW,
    mapH,
    stamps,
    isGm: props.isGm,
  });
}

function drawFogEraserPreview(ctx) {
  if (!props.isGm || props.activeTool !== 'fog_erase' || !props.map?.fog_enabled) return;
  if (!fogHoverWorld.value) return;
  const size = fogEraserSizePx();
  ctx.save();
  ctx.beginPath();
  traceFogStamp(ctx, createFogStamp(props.fogEraser?.shape, fogHoverWorld.value.x, fogHoverWorld.value.y, size));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  ctx.lineWidth = Math.max(1, 2 / props.zoomLevel);
  ctx.strokeStyle = '#ffffff';
  ctx.setLineDash([6 / props.zoomLevel, 4 / props.zoomLevel]);
  ctx.stroke();
  ctx.restore();
}

function addFogStampAt(worldPos) {
  const size = fogEraserSizePx();
  const list = pendingFogStamps.value;
  const last = list.length ? list[list.length - 1] : null;
  if (!shouldAddFogStamp(last, worldPos.x, worldPos.y, size)) return;
  list.push(createFogStamp(props.fogEraser?.shape, worldPos.x, worldPos.y, size));
}

function commitFogErase() {
  isErasingFog.value = false;
  if (!pendingFogStamps.value.length) return;
  const next = appendFogStamps(props.map?.fog_data, pendingFogStamps.value);
  pendingFogStamps.value = [];
  emit('fog-changed', next);
  requestRender();
}

function drawBackground(ctx, mapW, mapH) {
  ctx.fillStyle = '#11181c';
  ctx.fillRect(0, 0, mapW, mapH);

  if (props.map?.background_url) {
    const bgImg = getCachedImage(props.map.background_url);
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, mapW, mapH);
    }
  }
}

function drawGrid(ctx) {
  if (!props.map) return;
  if (props.map.grid_visible === false || props.map.grid_visible === 0) return;
  const hs = props.map.grid_size || 40;

  ctx.strokeStyle = props.map.grid_color || '#334155';
  ctx.lineWidth = Number(props.map.grid_line_width) > 0 ? Number(props.map.grid_line_width) : 1;

  ctx.beginPath();
  for (let r = 0; r < mapRows.value; r++) {
    for (let q = 0; q < mapCols.value; q++) {
      const center = getCellCenter(q, r);
      for (let i = 0; i < 6; i++) {
        const angleRad = (Math.PI / 180) * (60 * i - 30);
        const x = center.x + hs * Math.cos(angleRad);
        const y = center.y + hs * Math.sin(angleRad);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
  }
  ctx.stroke();
}

function drawMarkers(ctx) {
  if (!props.markers || !Array.isArray(props.markers)) return;
  for (const marker of props.markers) {
    if (draggingMarker.value && draggingMarker.value.id === marker.id) continue;
    renderSingleMarker(ctx, marker, marker.hex_q, marker.hex_r, false);
  }
}

function drawGhostMarker(ctx, marker, cell) {
  ctx.save();
  ctx.globalAlpha = 0.6;
  renderSingleMarker(ctx, marker, cell.q, cell.r, true);
  ctx.restore();
}

function renderSingleMarker(ctx, marker, q, r, isGhost) {
  const center = getCellCenter(q ?? 0, r ?? 0);
  const cx = center.x;
  const cy = center.y;
  const radius = hexSize.value * 0.58;
  const isSelected = !isGhost && String(marker.id) === String(props.selectedMarkerId);
  const isHidden = Boolean(marker.hidden);

  if (isSelected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(69, 172, 186, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#45acba';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  if (isHidden) ctx.globalAlpha *= 0.55;

  // Pin backdrop circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  if (marker.avatar_url) {
    const img = getCachedImage(marker.avatar_url);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();
    } else {
      drawMarkerGlyph(ctx, marker, cx, cy, radius);
    }
  } else {
    drawMarkerGlyph(ctx, marker, cx, cy, radius);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = marker.color || '#4fc3f7';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (isHidden) {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Name & coords label
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#cecece';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  ctx.fillText(marker.name || 'Marker', cx, cy + radius + 4);
  ctx.restore();
}

function drawMarkerGlyph(ctx, marker, cx, cy, radius) {
  const glyph = MARKER_TYPE_GLYPHS[marker.marker_type] || '📍';
  ctx.font = `${Math.round(radius * 1.05)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#cecece';
  ctx.fillText(glyph, cx, cy);
}

function onMouseDown(e) {
  if (!props.map) return;
  const worldPos = getWorldFromScreen(e.clientX, e.clientY);
  const cell = getCellFromWorld(worldPos.x, worldPos.y);

  if (e.button === 1 || isSpacePressed.value || props.activeTool === 'pan') {
    if (e.button === 1) e.preventDefault();
    isPanning.value = true;
    panStart.x = e.clientX - panX.value;
    panStart.y = e.clientY - panY.value;
    return;
  }

  if (e.button === 0) {
    const pingList = Array.isArray(props.pings)
      ? props.pings
      : (props.pings && typeof props.pings === 'object')
      ? Object.values(props.pings)
      : [];
    for (const ping of pingList) {
      if (ping && isPingDismissHit(ping, worldPos.x, worldPos.y)) {
        emit('ping-dismiss', { userId: ping.userId });
        return;
      }
    }

    if (props.activeTool === 'ping') {
      isPingDragging.value = true;
      lastPingPos = { x: worldPos.x, y: worldPos.y };
      lastPingEmitTime = performance.now();
      emit('ping-update', { x: worldPos.x, y: worldPos.y, isDragging: true });
      return;
    }

    if (props.activeTool === 'fog_erase' && props.isGm) {
      if (props.map?.fog_enabled) {
        isErasingFog.value = true;
        pendingFogStamps.value = [];
        fogHoverWorld.value = { x: worldPos.x, y: worldPos.y };
        addFogStampAt(worldPos);
        requestRender();
      }
      return;
    }

    if (props.activeTool === 'select') {
      const candidates = props.markers.filter((m) => {
        if (cell && m.hex_q === cell.q && m.hex_r === cell.r) return true;
        const center = getCellCenter(m.hex_q, m.hex_r);
        const radius = hexSize.value * 0.7;
        const dist = Math.sqrt((worldPos.x - center.x) ** 2 + (worldPos.y - center.y) ** 2);
        return dist <= radius;
      });

      let hitMarker = null;
      if (candidates.length > 0) {
        if (props.selectedMarkerId && candidates.some((m) => m.id === props.selectedMarkerId)) {
          const currentIdx = candidates.findIndex((m) => m.id === props.selectedMarkerId);
          hitMarker = candidates[(currentIdx + 1) % candidates.length];
        } else {
          hitMarker = candidates[0];
        }
      }

      if (hitMarker) {
        draggingMarker.value = hitMarker;
        dragCell.value = { q: hitMarker.hex_q, r: hitMarker.hex_r };
        emit('marker-selected', hitMarker);
      } else {
        emit('marker-selected', null);
      }
      requestRender();
    }
  }
}

function onMouseMove(e) {
  const worldPos = getWorldFromScreen(e.clientX, e.clientY);
  const cell = getCellFromWorld(worldPos.x, worldPos.y);

  if (isPanning.value) {
    panX.value = e.clientX - panStart.x;
    panY.value = e.clientY - panStart.y;
    emit('update:panX', panX.value);
    emit('update:panY', panY.value);
    requestRender();
    return;
  }

  if (isPingDragging.value) {
    const now = performance.now();
    lastPingPos = { x: worldPos.x, y: worldPos.y };
    if (now - lastPingEmitTime >= 30) {
      lastPingEmitTime = now;
      emit('ping-update', { x: worldPos.x, y: worldPos.y, isDragging: true });
    }
    return;
  }

  if (props.activeTool === 'fog_erase' && props.isGm) {
    fogHoverWorld.value = { x: worldPos.x, y: worldPos.y };
    if (isErasingFog.value) addFogStampAt(worldPos);
    requestRender();
    return;
  }

  if (cell && draggingMarker.value) {
    dragCell.value = cell;
    requestRender();
  }
}

function onMouseLeave(e) {
  fogHoverWorld.value = null;
  onMouseUp(e);
}

function onMouseUp(e) {
  if (isErasingFog.value) {
    commitFogErase();
    return;
  }
  if (isPingDragging.value) {
    isPingDragging.value = false;
    let posX = lastPingPos.x;
    let posY = lastPingPos.y;
    if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      const worldPos = getWorldFromScreen(e.clientX, e.clientY);
      posX = worldPos.x;
      posY = worldPos.y;
    }
    emit('ping-update', { x: posX, y: posY, isDragging: false });
    return;
  }

  if (isPanning.value) {
    isPanning.value = false;
    requestRender();
  }

  if (draggingMarker.value) {
    if (dragCell.value.q !== draggingMarker.value.hex_q || dragCell.value.r !== draggingMarker.value.hex_r) {
      emit('marker-moved', {
        id: draggingMarker.value.id,
        hex_q: dragCell.value.q,
        hex_r: dragCell.value.r,
      });
    }
    draggingMarker.value = null;
    requestRender();
  }
}

function onWheel(e) {
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  let newZoom = Math.min(3.0, Math.max(0.25, props.zoomLevel * zoomFactor));
  newZoom = Math.round(newZoom * 100) / 100;

  if (newZoom === props.zoomLevel) return;

  if (canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    panX.value = mouseX - ((mouseX - panX.value) * newZoom) / props.zoomLevel;
    panY.value = mouseY - ((mouseY - panY.value) * newZoom) / props.zoomLevel;
    emit('update:panX', panX.value);
    emit('update:panY', panY.value);
  }

  emit('update:zoomLevel', newZoom);
  requestRender();
}

function onKeyDown(e) {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    if (!isSpacePressed.value) {
      isSpacePressed.value = true;
    }
  }
}

function onKeyUp(e) {
  if (e.code === 'Space') {
    isSpacePressed.value = false;
  }
}

watch(() => props.activeTool, (newTool) => {
  if (newTool !== 'fog_erase') {
    commitFogErase();
    fogHoverWorld.value = null;
  }
  if (newTool !== 'ping' && isPingDragging.value) {
    isPingDragging.value = false;
    emit('ping-update', { x: lastPingPos.x, y: lastPingPos.y, isDragging: false });
  }
});

let resizeObserver = null;

onMounted(() => {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(containerRef.value);
  }

  startRenderLoop();
  if (hasActivePings.value) {
    updatePingAnimation();
  }

  socket.on('token:asset-renamed', handleAssetRenamed);
  socket.on('token:asset-deleted', handleAssetDeleted);
  socket.on('map:asset-renamed', handleMapAssetRenamed);
  socket.on('map:asset-deleted', handleMapAssetDeleted);
});

onBeforeUnmount(() => {
  stopRenderLoop();
  if (pingAnimFrameId) {
    cancelAnimationFrame(pingAnimFrameId);
    pingAnimFrameId = null;
  }
  socket.off('token:asset-renamed', handleAssetRenamed);
  socket.off('token:asset-deleted', handleAssetDeleted);
  socket.off('map:asset-renamed', handleMapAssetRenamed);
  socket.off('map:asset-deleted', handleMapAssetDeleted);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  window.removeEventListener('resize', resizeCanvas);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});
</script>

<style scoped>
.world-vtt-canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #0d1117;
  user-select: none;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.cursor-pan {
  cursor: grab;
}

.cursor-pan:active {
  cursor: grabbing;
}

.cursor-fog {
  cursor: crosshair;
}

.cursor-ping {
  cursor: crosshair;
}
</style>
