<template>
  <div class="vtt-view">
    <!-- VTT Header -->
    <header class="vtt-header">
      <div class="header-left">
        <h2 class="map-title">{{ activeMap ? activeMap.name : 'No Active World Map' }}</h2>
        <span v-if="activeMap" class="map-meta">
          {{ activeMap.width }}x{{ activeMap.height }} hexes ({{ activeMap.hex_miles || 6 }} mi/hex)
        </span>
      </div>

      <!-- Zoom Controls -->
      <div class="header-center">
        <div class="zoom-controls">
          <button title="Zoom Out" @click="adjustZoom(-0.15)">-</button>
          <span class="zoom-readout">{{ Math.round(zoomLevel * 100) }}%</span>
          <button title="Zoom In" @click="adjustZoom(0.15)">+</button>
          <button title="Reset Zoom" class="btn-sm" @click="zoomLevel = 1.0; panX = 50; panY = 50">Reset</button>
        </div>
      </div>

      <div class="header-right">
        <!-- GM Controls Drawer Toggle -->
        <button v-if="isGm" class="btn-gm" @click="showGmDrawer = !showGmDrawer">
          GM Map Manager
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="vtt-body">
      <!-- Floating Toolbar -->
      <nav class="vtt-toolbar">
        <button
          :class="{ active: activeTool === 'select' }"
          title="Select / Move Marker"
          @click="activeTool = 'select'"
        >
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l3 3"/></svg> Move
        </button>
        <button
          :class="{ active: activeTool === 'pan' }"
          title="Pan Map (or hold Space / Middle Click)"
          @click="activeTool = 'pan'"
        >
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg> Pan
        </button>
        <button
          :class="{ active: activeTool === 'ping' }"
          title="Tactical Ping (Click or drag on map)"
          @click="activeTool = 'ping'"
        >
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg> Ping
        </button>
        <button
          v-if="hasMyActivePing"
          class="btn-tool btn-clear-ping"
          title="Clear your tactical ping"
          @click="clearMyPing"
        >
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg> Clear Ping
        </button>
        <button
          v-if="isGm && activePingsList.length > 0"
          class="btn-tool btn-clear-all-pings"
          title="Clear all tactical pings"
          @click="clearAllPings"
        >
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg> Clear All Pings
        </button>

        <!-- GM Fog of War controls -->
        <button
          v-if="isGm"
          class="btn-tool btn-fog-toggle"
          :class="{ active: fogEnabled }"
          :title="fogEnabled ? 'Turn Fog of War off (reveals the whole map)' : 'Turn Fog of War on (hides the map from players)'"
          @click="toggleFog"
        >
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1A4.5 4.5 0 0 1 17 18H6z"/></svg> {{ fogEnabled ? 'Fog Off' : 'Fog On' }}
        </button>
        <button
          v-if="isGm && fogEnabled"
          class="btn-tool btn-fog-erase"
          :class="{ active: activeTool === 'fog_erase' }"
          title="Erase Fog (click or drag on the map to reveal)"
          @click="activeTool = 'fog_erase'"
        >
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 15l8-8 7 7-5 5H8l-4-4zM9 10l7 7"/></svg> Erase Fog
        </button>
        <div v-if="isGm && fogEnabled && activeTool === 'fog_erase'" class="fog-eraser-options">
          <div class="fog-shape-row">
            <button
              type="button"
              class="fog-shape-btn"
              :class="{ selected: fogEraser.shape === 'circle' }"
              title="Circular eraser"
              @click="fogEraser.shape = 'circle'"
            >● Circle</button>
            <button
              type="button"
              class="fog-shape-btn"
              :class="{ selected: fogEraser.shape === 'square' }"
              title="Square eraser"
              @click="fogEraser.shape = 'square'"
            >■ Square</button>
          </div>
          <label class="fog-size-label">
            Size: {{ fogEraser.size }} hex
            <input
              type="range"
              class="fog-size-slider"
              min="0.5"
              max="20"
              step="0.5"
              v-model.number="fogEraser.size"
            />
          </label>
          <button type="button" class="fog-cover-btn" title="Cover the whole map in fog again" @click="coverAllFog">Cover All</button>
        </div>

        <div class="toolbar-divider"></div>
        <div class="shortcut-tip">
          <span class="key-badge">Space</span> + Drag to Pan
        </div>
      </nav>

      <!-- Canvas Container -->
      <div
        class="vtt-canvas-wrapper"
        @dragover.prevent="onMapDragOver"
        @dragleave.prevent="onMapDragLeave"
        @drop.prevent="onMapFileDrop"
      >
        <!-- Map Drop Overlay for GM -->
        <div v-if="isDraggingMapFile && isGm" class="map-drop-zone-overlay">
          <div class="map-drop-zone-content">
            <span class="map-drop-zone-icon">🗺️</span>
            <strong>Drop Map to Create &amp; Fog</strong>
            <small>Image will be uploaded to a new world map</small>
          </div>
        </div>

        <WorldVttCanvas
          :map="activeMap"
          :markers="markers"
          :pings="activePingsList"
          :active-tool="activeTool"
          v-model:zoom-level="zoomLevel"
          v-model:pan-x="panX"
          v-model:pan-y="panY"
          :selected-marker-id="selectedMarkerId"
          :is-gm="isGm"
          :fog-eraser="fogEraser"
          @marker-moved="onMarkerMoved"
          @marker-selected="onMarkerSelected"
          @markers-updated="markers = $event"
          @map-updated="activeMap = $event"
          @ping-update="onPingUpdate"
          @ping-dismiss="onPingDismiss"
          @fog-changed="onFogChanged"
        />

        <!-- No Active Map Overlay -->
        <div v-if="!activeMap" class="no-map-overlay">
          <div class="no-map-card">
            <div class="no-map-icon">🧭</div>
            <h3>No Active World Map</h3>
            <p v-if="isGm">
              You are logged in as <strong>GameMaster</strong>. Create a regional or world map or select an existing map to activate it for all players.
            </p>
            <p v-else>
              Logged in as <strong>Player</strong>. Waiting for the GameMaster to activate a regional or world map...
            </p>
            <div v-if="isGm" class="no-map-actions">
              <button class="primary" @click="openCreateMapModal">+ Create World Map</button>
              <button class="btn-gm" @click="showGmDrawer = true">Open GM Map Manager</button>
            </div>
          </div>
        </div>
      </div>

      <!-- GM Drawer / Map Manager Modal -->
      <div v-if="showGmDrawer && isGm" class="drawer-backdrop" @click.self="showGmDrawer = false">
        <aside class="gm-drawer">
          <div class="drawer-header">
            <h3>🧭 GM World Map Manager</h3>
            <button class="close-btn" @click="showGmDrawer = false">×</button>
          </div>

          <div class="drawer-content">
            <div class="section-actions">
              <button class="primary full-width" @click="openCreateMapModal">+ Create New World Map</button>
            </div>

            <!-- Active Map Settings -->
            <div v-if="activeMap" class="section-box">
              <h4>Active Map Settings</h4>
              <div class="form-group">
                <label>Map Name:</label>
                <input
                  type="text"
                  v-model="activeMapForm.name"
                  @change="updateActiveMapSettings"
                />
              </div>
              <div class="form-group">
                <label>Grid Dimensions (Width × Height in hexes):</label>
                <div class="grid-dimensions-row">
                  <input
                    type="number"
                    list="world-grid-dimension-options"
                    class="grid-width-input"
                    v-model.number="activeMapForm.width"
                    min="5"
                    max="250"
                    step="1"
                    aria-label="Map Width in Hexes"
                    @change="updateActiveMapSettings"
                  />
                  <span class="grid-dimensions-x">×</span>
                  <input
                    type="number"
                    list="world-grid-dimension-options"
                    class="grid-height-input"
                    v-model.number="activeMapForm.height"
                    min="5"
                    max="250"
                    step="1"
                    aria-label="Map Height in Hexes"
                    @change="updateActiveMapSettings"
                  />
                  <datalist id="world-grid-dimension-options">
                    <option v-for="n in gridDimensionOptions" :key="n" :value="n"></option>
                  </datalist>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Hex Size (px):</label>
                  <input
                    type="number"
                    v-model.number="activeMapForm.grid_size"
                    min="10"
                    max="200"
                    @change="updateActiveMapSettings"
                  />
                </div>
                <div class="form-group">
                  <label>Miles per Hex:</label>
                  <input
                    type="number"
                    v-model.number="activeMapForm.hex_miles"
                    min="0.5"
                    max="1000"
                    step="0.5"
                    @change="updateActiveMapSettings"
                  />
                </div>
              </div>
              <div class="form-group grid-visible-group">
                <label class="grid-visible-label">
                  <input
                    type="checkbox"
                    class="grid-visible-checkbox"
                    v-model="activeMapForm.grid_visible"
                    @change="updateActiveMapSettings"
                  />
                  Show Grid Lines (markers still snap to hexes)
                </label>
              </div>
              <div class="form-group">
                <label>Grid Line Thickness (px):</label>
                <input
                  type="number"
                  list="world-grid-line-width-options"
                  class="grid-line-width-input"
                  v-model.number="activeMapForm.grid_line_width"
                  min="0.1"
                  max="10"
                  step="0.1"
                  @change="updateActiveMapSettings"
                />
                <datalist id="world-grid-line-width-options">
                  <option v-for="n in gridLineWidthOptions" :key="n" :value="n"></option>
                </datalist>
              </div>
              <div class="form-group">
                <label>Grid Line Color:</label>
                <input
                  type="color"
                  v-model="activeMapForm.grid_color"
                  @change="updateActiveMapSettings"
                />
              </div>
              <div class="form-group">
                <label>Background Image:</label>
                <input
                  type="text"
                  v-model="activeMapForm.background_url"
                  placeholder="Image URL or upload file"
                  @change="updateActiveMapSettings"
                />
                <div class="map-bg-btn-row">
                  <input type="file" accept="image/*" @change="onActiveMapUpload" class="map-file-input" />
                  <button type="button" class="btn-browse-avatar" @click="openMapImageBrowser('active_map')">Browse Uploads</button>
                </div>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="activeMapForm.fog_enabled"
                    @change="updateActiveMapSettings"
                  />
                  Enable Fog of War
                </label>
              </div>
            </div>

            <!-- Map List -->
            <div class="section-box">
              <h4>All World Maps</h4>
              <div v-if="mapList.length === 0" class="empty-text">No world maps created yet.</div>
              <ul class="map-list">
                <li
                  v-for="m in mapList"
                  :key="m.id"
                  :class="{ active: activeMap && activeMap.id === m.id }"
                >
                  <div class="map-info">
                    <strong>{{ m.name }}</strong>
                    <small>{{ m.width }}x{{ m.height }} hexes ({{ m.hex_miles || 6 }} mi/hex)</small>
                  </div>
                  <div class="map-btn-group">
                    <button
                      v-if="!activeMap || activeMap.id !== m.id"
                      class="btn-sm primary"
                      @click="activateMap(m.id)"
                    >
                      Activate
                    </button>
                    <span v-else class="active-badge">Active</span>
                    <button class="btn-sm danger" @click="deleteMap(m.id)">Delete</button>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <!-- Marker Inspector Sidebar -->
      <aside class="token-sidebar" :class="{ 'token-sidebar-rolled-up': isTokenSidebarRolledUp }">
        <div
          class="sidebar-header"
          @click.self="toggleTokenSidebarRollup"
          :title="isTokenSidebarRolledUp ? 'Click to expand Marker Inspector (Roll Down)' : 'Click to collapse Marker Inspector to Top (Roll Up)'"
          style="cursor: pointer;"
        >
          <h3 @click="toggleTokenSidebarRollup">World Marker Inspector</h3>
          <button
            type="button"
            class="close-btn"
            @click="closeTokenSidebar"
            :title="isTokenSidebarRolledUp ? 'Expand Marker Inspector (Roll Down)' : 'Collapse Marker Inspector to Top (Roll Up)'"
            :aria-label="isTokenSidebarRolledUp ? 'Expand Marker Inspector' : 'Collapse Marker Inspector to Top'"
          >
            {{ isTokenSidebarRolledUp ? '▼' : '▲' }}
          </button>
        </div>

        <div v-show="!isTokenSidebarRolledUp" class="sidebar-content">
          <button v-if="isGm" class="primary full-width btn-add-token" @click="openAddMarkerModal">+ Place World Marker</button>

          <!-- Selected Marker Inspector -->
          <div v-if="selectedMarker" class="section-box token-inspector">
            <div class="token-title-row">
              <span
                class="token-color-badge"
                :style="{ backgroundColor: selectedMarker.color || '#4fc3f7' }"
              ></span>
              <h4>{{ selectedMarker.name }}</h4>
            </div>

            <div class="info-row">
              <span class="label">Type:</span>
              <span class="value">{{ markerTypeLabel(selectedMarker.marker_type) }}</span>
            </div>
            <div class="info-row">
              <span class="label">Hex (q, r):</span>
              <span class="value">({{ selectedMarker.hex_q }}, {{ selectedMarker.hex_r }})</span>
            </div>
            <div class="info-row">
              <span class="label">Overland Miles:</span>
              <span class="value">{{ Number(selectedMarker.x_miles || 0).toFixed(1) }} mi, {{ Number(selectedMarker.y_miles || 0).toFixed(1) }} mi</span>
            </div>

            <!-- Linked Tactical VTT Scene -->
            <div v-if="selectedMarkerLinkedScene" class="linked-scene-box">
              <div class="info-row">
                <span class="label">Tactical Scene:</span>
                <span class="value">{{ selectedMarkerLinkedScene.name }}</span>
              </div>
              <button
                v-if="isGm"
                type="button"
                class="primary full-width btn-launch-scene"
                @click="launchLinkedTacticalScene(selectedMarker.linked_map_id)"
              >
                ⚔️ Open Tactical VTT Scene
              </button>
            </div>

            <!-- GM Visibility Toggle -->
            <div v-if="isGm" class="visibility-section">
              <button
                type="button"
                class="btn-toggle-visibility full-width"
                :class="{ 'is-hidden': selectedMarker.hidden }"
                @click="toggleMarkerVisibility(selectedMarker)"
              >
                {{ selectedMarker.hidden ? '🙈 Hidden from Players (Click to Reveal)' : '👁️ Visible to Players (Click to Hide)' }}
              </button>
            </div>

            <!-- GM Editable Fields -->
            <template v-if="isGm">
              <div class="form-group">
                <label>Marker Name:</label>
                <input type="text" v-model="selectedMarkerForm.name" @change="updateSelectedMarker" />
              </div>
              <div class="form-group">
                <label>Marker Type:</label>
                <select v-model="selectedMarkerForm.marker_type" @change="updateSelectedMarker" class="world-select">
                  <option v-for="opt in markerTypeOptions" :key="opt.value" :value="opt.value">
                    {{ opt.icon }} {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Hex Q:</label>
                  <input type="number" v-model.number="selectedMarkerForm.hex_q" @change="updateSelectedMarker" />
                </div>
                <div class="form-group">
                  <label>Hex R:</label>
                  <input type="number" v-model.number="selectedMarkerForm.hex_r" @change="updateSelectedMarker" />
                </div>
              </div>
              <div class="form-group">
                <label>Linked Tactical VTT Scene:</label>
                <select v-model="selectedMarkerForm.linked_map_id" @change="updateSelectedMarker" class="world-select">
                  <option :value="null">-- None --</option>
                  <option v-for="tm in tacticalMaps" :key="tm.id" :value="tm.id">
                    {{ tm.name }} ({{ tm.width }}x{{ tm.height }})
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Pin Color:</label>
                <input type="color" v-model="selectedMarkerForm.color" @change="updateSelectedMarker" />
              </div>
              <div class="form-group">
                <label>Notes / Description:</label>
                <input type="text" v-model="selectedMarkerForm.description" @change="updateSelectedMarker" />
              </div>

              <div class="inspector-actions">
                <button type="button" class="danger full-width btn-delete-token" @click="deleteSelectedMarker">
                  Delete Marker
                </button>
              </div>
            </template>
          </div>

          <!-- All Markers on Map -->
          <div class="section-box">
            <h4>World Markers ({{ markers.length }})</h4>
            <div v-if="markers.length === 0" class="empty-text">No markers placed on this map.</div>
            <ul v-else class="token-list">
              <li
                v-for="m in markers"
                :key="m.id"
                :class="{ active: selectedMarkerId === m.id, 'token-row-hidden': m.hidden }"
                @click="onMarkerSelected(m)"
              >
                <div class="token-item-left">
                  <span class="token-dot" :style="{ backgroundColor: m.color || '#4fc3f7' }"></span>
                  <span>{{ markerGlyph(m.marker_type) }} {{ m.name }}</span>
                  <span v-if="m.hidden" class="token-hidden-badge">HIDDEN</span>
                </div>
                <div class="token-item-right">
                  <small>({{ m.hex_q }}, {{ m.hex_r }})</small>
                  <button
                    v-if="isGm"
                    type="button"
                    class="btn-token-list-visibility"
                    :class="{ 'is-hidden': m.hidden }"
                    :title="m.hidden ? 'Reveal marker to players' : 'Hide marker from players'"
                    @click.stop="toggleMarkerVisibility(m)"
                  >
                    {{ m.hidden ? '🙈' : '👁️' }}
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>

    <!-- Create World Map Modal -->
    <div v-if="showCreateMapModal" class="modal-backdrop" @click.self="showCreateMapModal = false">
      <div class="modal-card">
        <h3>Create World Map</h3>
        <div v-if="createMapError" class="modal-error-banner">{{ createMapError }}</div>
        <div class="form-group">
          <label>Map Name:</label>
          <input type="text" v-model="newMapForm.name" placeholder="e.g. Kingdom of Ulvwylde" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Width (hexes):</label>
            <input type="number" v-model.number="newMapForm.width" min="5" max="250" />
          </div>
          <div class="form-group">
            <label>Height (hexes):</label>
            <input type="number" v-model.number="newMapForm.height" min="5" max="250" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Hex Size (px):</label>
            <input type="number" v-model.number="newMapForm.grid_size" min="10" max="200" />
          </div>
          <div class="form-group">
            <label>Miles per Hex:</label>
            <input type="number" v-model.number="newMapForm.hex_miles" min="0.5" max="1000" step="0.5" />
          </div>
        </div>
        <div class="form-group">
          <label>Background Image:</label>
          <input type="text" v-model="newMapForm.background_url" placeholder="Optional background image URL" />
          <div class="map-bg-btn-row">
            <input type="file" accept="image/*" @change="uploadMapImage($event, newMapForm)" class="map-file-input" />
            <button type="button" class="btn-browse-avatar" @click="openMapImageBrowser('new_map')">Browse Uploads</button>
          </div>
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="newMapForm.fog_all" class="fog-all-checkbox" />
            <span>Fog All (fog the whole map at initial loading)</span>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-modal-cancel" @click="showCreateMapModal = false">Cancel</button>
          <button type="button" class="primary" @click="submitCreateMap">Create & Activate</button>
        </div>
      </div>
    </div>

    <!-- Place World Marker Modal -->
    <div v-if="showAddTokenModal" class="modal-backdrop" @click.self="showAddTokenModal = false">
      <div class="modal-card">
        <h3>Place World Marker</h3>
        <div v-if="createTokenError" class="modal-error-banner">{{ createTokenError }}</div>
        <div class="form-group">
          <label>Marker Name:</label>
          <input type="text" v-model="newTokenForm.name" placeholder="e.g. Company of the Wolf" />
        </div>
        <div class="form-group">
          <label>Marker Type:</label>
          <select v-model="newTokenForm.marker_type" class="world-select">
            <option v-for="opt in markerTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.icon }} {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Hex Q:</label>
            <input type="number" v-model.number="newTokenForm.hex_q" />
          </div>
          <div class="form-group">
            <label>Hex R:</label>
            <input type="number" v-model.number="newTokenForm.hex_r" />
          </div>
          <div class="form-group">
            <label>Pin Color:</label>
            <input type="color" v-model="newTokenForm.color" />
          </div>
        </div>
        <div class="form-group">
          <label>Linked Tactical VTT Scene (Optional):</label>
          <select v-model="newTokenForm.linked_map_id" class="world-select">
            <option :value="null">-- None --</option>
            <option v-for="tm in tacticalMaps" :key="tm.id" :value="tm.id">
              {{ tm.name }} ({{ tm.width }}x{{ tm.height }})
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Marker Icon / Portrait:</label>
          <div class="avatar-upload-box">
            <div class="avatar-preview-wrapper" :style="{ borderColor: newTokenForm.color || '#4fc3f7' }">
              <img v-if="newTokenForm.avatar_url" :src="newTokenForm.avatar_url" alt="Marker preview" class="token-avatar-preview" />
              <span v-else class="avatar-empty-placeholder">{{ markerGlyph(newTokenForm.marker_type) }}</span>
            </div>
            <div class="avatar-controls">
              <div class="file-btn-wrapper">
                <input ref="tokenFileInput" type="file" accept="image/*" class="token-file-input" @change="uploadImage" />
                <button type="button" class="btn-browse-avatar" @click="openTokenImageBrowser">Browse Uploads</button>
                <button v-if="newTokenForm.avatar_url" type="button" class="btn-clear-avatar" @click="clearAvatar">Clear</button>
              </div>
              <input type="text" v-model="newTokenForm.avatar_url" class="avatar-url-input" placeholder="Or paste image URL..." />
            </div>
          </div>
        </div>
        <div v-if="isGm" class="spawn-hidden-row">
          <label class="spawn-hidden-label">
            <input type="checkbox" v-model="newTokenForm.hidden" />
            🙈 Start Hidden from Players
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-modal-cancel" @click="showAddTokenModal = false">Cancel</button>
          <button type="button" class="btn-add-token-submit" @click="submitAddMarker">Place Marker</button>
        </div>
      </div>
    </div>

    <ImageBrowserModal
      v-model="showImageBrowser"
      :title="imageBrowserTitle"
      :current-image="currentBrowserImage"
      @select="onImageSelected"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import WorldVttCanvas from '../components/WorldVttCanvas.vue';
import ImageBrowserModal from '../components/ImageBrowserModal.vue';
import { useAuthStore } from '../stores/auth.js';
import { socket } from '../services/socket.js';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';

const router = useRouter();
const authStore = useAuthStore();
const isGm = computed(() => authStore.user?.role === 'GameMaster');

const initialVttState = getUserState(getSafeUserId(), 'worldVtt', {
  panX: 50,
  panY: 50,
  zoomLevel: 1.0,
  activeTool: 'select',
  selectedMarkerId: null,
  showTokenSidebar: true,
  isTokenSidebarRolledUp: false,
});

const markerTypeOptions = [
  { value: 'party', label: 'Party', icon: '⛺' },
  { value: 'battle', label: 'Battle', icon: '⚔️' },
  { value: 'faction', label: 'Faction', icon: '🏴' },
  { value: 'poi', label: 'Point of Interest', icon: '📍' },
  { value: 'hazard', label: 'Hazard', icon: '⚠️' },
];

function markerGlyph(type) {
  return markerTypeOptions.find((o) => o.value === type)?.icon || '📍';
}

function markerTypeLabel(type) {
  return markerTypeOptions.find((o) => o.value === type)?.label || type;
}

const activeMap = ref(null);
const markers = ref([]);
const mapList = ref([]);
const tacticalMaps = ref([]);

const panX = ref(initialVttState.panX ?? 50);
const panY = ref(initialVttState.panY ?? 50);
const activeTool = ref(initialVttState.activeTool || 'select');
const zoomLevel = ref(initialVttState.zoomLevel ?? 1.0);
const selectedMarkerId = ref(initialVttState.selectedMarkerId ?? null);

const activePings = ref({});
const activePingsList = computed(() => Object.values(activePings.value));
const hasMyActivePing = computed(() => {
  const myId = authStore.user?.id;
  return myId ? !!activePings.value[myId] : false;
});

watch(
  () => activeMap.value?.id,
  (newId) => {
    activePings.value = {};
    if (newId) {
      socket.emit('ping:request_sync', { mapId: newId });
    }
  }
);

function onPingUpdate({ x, y, isDragging }) {
  if (!activeMap.value?.id) return;
  const currentUserId = authStore.user?.id;
  const currentUsername = authStore.user?.username || 'Player';

  socket.emit('ping:update', {
    mapId: activeMap.value.id,
    x,
    y,
    isDragging,
  });

  if (currentUserId) {
    activePings.value = {
      ...activePings.value,
      [currentUserId]: {
        userId: currentUserId,
        username: currentUsername,
        x,
        y,
        isDragging,
        updatedAt: Date.now(),
      },
    };
  }
}

function onPingDismiss({ userId }) {
  if (!activeMap.value?.id) return;
  socket.emit('ping:clear', {
    mapId: activeMap.value.id,
    targetUserId: userId,
  });
  if (userId && activePings.value[userId]) {
    const next = { ...activePings.value };
    delete next[userId];
    activePings.value = next;
  }
}

function clearMyPing() {
  if (!activeMap.value?.id) return;
  const currentUserId = authStore.user?.id;
  socket.emit('ping:clear', {
    mapId: activeMap.value.id,
    targetUserId: currentUserId,
  });
  if (currentUserId && activePings.value[currentUserId]) {
    const next = { ...activePings.value };
    delete next[currentUserId];
    activePings.value = next;
  }
}

function clearAllPings() {
  if (!activeMap.value?.id) return;
  socket.emit('ping:clear', {
    mapId: activeMap.value.id,
    all: true,
  });
  activePings.value = {};
}

let persistStateTimer = null;

function persistVttStateNow() {
  saveUserState(getSafeUserId(), 'worldVtt', {
    panX: panX.value,
    panY: panY.value,
    zoomLevel: zoomLevel.value,
    activeTool: activeTool.value,
    selectedMarkerId: selectedMarkerId.value,
    showTokenSidebar: showTokenSidebar.value,
    isTokenSidebarRolledUp: isTokenSidebarRolledUp.value,
  });
}

function persistVttState() {
  if (persistStateTimer) clearTimeout(persistStateTimer);
  persistStateTimer = setTimeout(() => {
    persistStateTimer = null;
    persistVttStateNow();
  }, 150);
}

const showGmDrawer = ref(false);
const showTokenSidebar = ref(initialVttState.showTokenSidebar ?? true);
const isTokenSidebarRolledUp = ref(Boolean(initialVttState.isTokenSidebarRolledUp));

function toggleTokenSidebar() {
  isTokenSidebarRolledUp.value = !isTokenSidebarRolledUp.value;
  persistVttState();
}

function toggleTokenSidebarRollup() {
  isTokenSidebarRolledUp.value = !isTokenSidebarRolledUp.value;
  persistVttState();
}

function closeTokenSidebar() {
  isTokenSidebarRolledUp.value = !isTokenSidebarRolledUp.value;
  persistVttState();
}

watch([panX, panY, zoomLevel, activeTool, selectedMarkerId, showTokenSidebar, isTokenSidebarRolledUp], () => {
  persistVttState();
});

const showCreateMapModal = ref(false);
const createMapError = ref('');
const showAddTokenModal = ref(false);
const createTokenError = ref('');
const showImageBrowser = ref(false);
const imageBrowserTarget = ref('token');
const tokenFileInput = ref(null);

const gridLineWidthOptions = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];
const gridDimensionOptions = [10, 15, 20, 25, 30, 40, 50, 60, 80, 100];

const activeMapForm = reactive({
  name: '',
  width: 20,
  height: 20,
  grid_size: 40,
  hex_miles: 6,
  grid_visible: true,
  grid_line_width: 1,
  grid_color: '#334155',
  background_url: '',
  fog_enabled: false,
});

const newMapForm = reactive({
  name: '',
  map_type: 'world',
  width: 20,
  height: 20,
  grid_size: 40,
  hex_miles: 6,
  grid_visible: true,
  grid_line_width: 1,
  grid_color: '#334155',
  background_url: '',
  fog_all: false,
});

// Fog of War (GM controls)
const fogEraser = reactive({
  shape: 'circle',
  size: 3,
});

const fogEnabled = computed(() => Boolean(activeMap.value?.fog_enabled));

async function saveFogPatch(patch) {
  if (!isGm.value || !activeMap.value?.id) return;
  const previous = activeMap.value;
  activeMap.value = { ...previous, ...patch };
  try {
    const res = await fetch(`/api/maps/${previous.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      activeMap.value = await res.json();
    } else {
      activeMap.value = previous;
    }
  } catch (err) {
    console.error('Failed to save fog:', err);
    activeMap.value = previous;
  }
}

function toggleFog() {
  const next = !fogEnabled.value;
  if (!next && activeTool.value === 'fog_erase') activeTool.value = 'select';
  saveFogPatch({ fog_enabled: next });
}

function onFogChanged(fogData) {
  saveFogPatch({ fog_data: fogData });
}

function coverAllFog() {
  if (typeof window !== 'undefined' && !window.confirm('Cover the entire world map in fog again?')) return;
  saveFogPatch({ fog_data: [] });
}

const newTokenForm = reactive({
  name: '',
  marker_type: 'poi',
  hex_q: 0,
  hex_r: 0,
  color: '#4fc3f7',
  avatar_url: '',
  linked_map_id: null,
  hidden: false,
});

const selectedMarkerForm = reactive({
  name: '',
  marker_type: 'poi',
  hex_q: 0,
  hex_r: 0,
  color: '#4fc3f7',
  description: '',
  linked_map_id: null,
});

const imageBrowserTitle = computed(() => {
  if (imageBrowserTarget.value === 'active_map' || imageBrowserTarget.value === 'new_map') {
    return 'Select World Map Background';
  }
  return 'Select Marker Image';
});

const currentBrowserImage = computed(() => {
  if (imageBrowserTarget.value === 'active_map') return activeMapForm.background_url;
  if (imageBrowserTarget.value === 'new_map') return newMapForm.background_url;
  return newTokenForm.avatar_url;
});

function openTokenImageBrowser() {
  imageBrowserTarget.value = 'token';
  showImageBrowser.value = true;
}

function openMapImageBrowser(target) {
  imageBrowserTarget.value = target;
  showImageBrowser.value = true;
}

function onImageSelected(url) {
  if (imageBrowserTarget.value === 'active_map') {
    activeMapForm.background_url = url;
    updateActiveMapSettings();
    return;
  }
  if (imageBrowserTarget.value === 'new_map') {
    newMapForm.background_url = url;
    return;
  }
  newTokenForm.avatar_url = url;
}

const selectedMarker = computed(() => {
  if (selectedMarkerId.value === null || selectedMarkerId.value === undefined) return null;
  return markers.value.find((m) => m.id === selectedMarkerId.value) || null;
});

const selectedMarkerLinkedScene = computed(() => {
  if (!selectedMarker.value?.linked_map_id) return null;
  return tacticalMaps.value.find((m) => m.id === selectedMarker.value.linked_map_id) || {
    id: selectedMarker.value.linked_map_id,
    name: `Tactical Scene #${selectedMarker.value.linked_map_id}`,
  };
});

watch(selectedMarker, (m) => {
  if (!m) return;
  selectedMarkerForm.name = m.name || '';
  selectedMarkerForm.marker_type = m.marker_type || 'poi';
  selectedMarkerForm.hex_q = m.hex_q ?? 0;
  selectedMarkerForm.hex_r = m.hex_r ?? 0;
  selectedMarkerForm.color = m.color || '#4fc3f7';
  selectedMarkerForm.description = m.description || '';
  selectedMarkerForm.linked_map_id = m.linked_map_id ?? null;
});

function syncActiveMapForm(map) {
  if (!map) return;
  activeMapForm.name = map.name || '';
  activeMapForm.width = map.width || 20;
  activeMapForm.height = map.height || 20;
  activeMapForm.grid_size = map.grid_size || 40;
  activeMapForm.hex_miles = map.hex_miles || 6;
  activeMapForm.grid_visible = map.grid_visible !== false;
  activeMapForm.grid_line_width = map.grid_line_width || 1;
  activeMapForm.grid_color = map.grid_color || '#334155';
  activeMapForm.background_url = map.background_url || '';
  activeMapForm.fog_enabled = Boolean(map.fog_enabled);
}

watch(activeMap, (map) => {
  syncActiveMapForm(map);
});

async function fetchMarkersForMap(mapId) {
  if (!mapId) {
    markers.value = [];
    return;
  }
  try {
    const res = await fetch(`/api/world-markers?map_id=${mapId}`, { credentials: 'include' });
    if (res.ok) {
      markers.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch world markers:', err);
  }
}

async function fetchActiveMap() {
  try {
    const res = await fetch('/api/maps/active?type=world', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      activeMap.value = data.map;
      await fetchMarkersForMap(data.map?.id);
    }
  } catch (err) {
    console.error('Failed to fetch active world map:', err);
  }
}

async function fetchMapList() {
  try {
    const [worldRes, rpgRes] = await Promise.all([
      fetch('/api/maps?type=world', { credentials: 'include' }),
      fetch('/api/maps?type=rpg', { credentials: 'include' }),
    ]);
    if (worldRes.ok) mapList.value = await worldRes.json();
    if (rpgRes.ok) tacticalMaps.value = await rpgRes.json();
  } catch (err) {
    console.error('Failed to fetch maps:', err);
  }
}

async function activateMap(mapId) {
  try {
    const res = await fetch(`/api/maps/${mapId}/activate`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      activeMap.value = data.map;
      selectedMarkerId.value = null;
      await fetchMarkersForMap(data.map?.id);
      if (isGm.value) fetchMapList();
    }
  } catch (err) {
    console.error('Failed to activate map:', err);
  }
}

function clampGridLineWidth(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(10, Math.max(0.1, n));
}

function clampGridDimension(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback || 20;
  return Math.min(250, Math.max(5, Math.round(n)));
}

async function updateActiveMapSettings() {
  if (!activeMap.value) return;
  try {
    const payload = {
      name: activeMapForm.name,
      width: clampGridDimension(activeMapForm.width, activeMap.value.width),
      height: clampGridDimension(activeMapForm.height, activeMap.value.height),
      grid_size: activeMapForm.grid_size,
      hex_miles: activeMapForm.hex_miles || 6,
      grid_visible: Boolean(activeMapForm.grid_visible),
      grid_line_width: clampGridLineWidth(activeMapForm.grid_line_width),
      grid_color: activeMapForm.grid_color,
      background_url: activeMapForm.background_url,
      fog_enabled: activeMapForm.fog_enabled ? 1 : 0,
    };
    const res = await fetch(`/api/maps/${activeMap.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      activeMap.value = await res.json();
      fetchMapList();
    }
  } catch (err) {
    console.error('Failed to update map settings:', err);
  }
}

async function uploadMapImage(e, formObject) {
  const file = e.target.files?.[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      formObject.background_url = data.url;
    }
  } catch (err) {
    console.error('Upload error:', err);
  }
}

async function onActiveMapUpload(e) {
  await uploadMapImage(e, activeMapForm);
  updateActiveMapSettings();
}

const isDraggingMapFile = ref(false);

function onMapDragOver(e) {
  if (!isGm.value) return;
  if (e.dataTransfer?.types?.includes('Files')) {
    e.dataTransfer.dropEffect = 'copy';
    isDraggingMapFile.value = true;
  }
}

function onMapDragLeave(e) {
  if (!e.currentTarget || !e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) {
    isDraggingMapFile.value = false;
  }
}

async function onMapFileDrop(e) {
  isDraggingMapFile.value = false;
  if (!isGm.value) return;
  const file = e.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;

  openCreateMapModal();
  const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
  newMapForm.name = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : 'New World Map';
  newMapForm.fog_all = true;

  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      newMapForm.background_url = data.url;
    }
  } catch (err) {
    console.error('Failed to upload dropped map file:', err);
  }
}

function openCreateMapModal() {
  createMapError.value = '';
  newMapForm.name = '';
  newMapForm.map_type = 'world';
  newMapForm.width = 20;
  newMapForm.height = 20;
  newMapForm.grid_size = 40;
  newMapForm.hex_miles = 6;
  newMapForm.background_url = '';
  newMapForm.fog_all = false;
  showCreateMapModal.value = true;
}

async function submitCreateMap() {
  createMapError.value = '';
  try {
    const res = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...newMapForm,
        map_type: 'world',
        is_active: 1,
        fog_enabled: newMapForm.fog_all ? 1 : 0,
        fog_data: [],
      }),
    });
    if (res.ok) {
      const created = await res.json();
      showCreateMapModal.value = false;
      fetchMapList();
      activateMap(created.id);
    } else {
      const data = await res.json().catch(() => ({}));
      createMapError.value = data.error || `Failed to create map (HTTP ${res.status})`;
    }
  } catch (err) {
    createMapError.value = err.message || 'Error creating map';
  }
}

async function deleteMap(mapId) {
  try {
    const res = await fetch(`/api/maps/${mapId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      fetchMapList();
      if (activeMap.value && activeMap.value.id === mapId) {
        fetchActiveMap();
      }
    }
  } catch (err) {
    console.error('Failed to delete map:', err);
  }
}

function openAddMarkerModal() {
  createTokenError.value = '';
  newTokenForm.name = '';
  newTokenForm.marker_type = 'poi';
  newTokenForm.hex_q = Math.floor((activeMap.value?.width || 20) / 2);
  newTokenForm.hex_r = Math.floor((activeMap.value?.height || 20) / 2);
  newTokenForm.color = '#4fc3f7';
  newTokenForm.avatar_url = '';
  newTokenForm.linked_map_id = null;
  newTokenForm.hidden = false;
  showAddTokenModal.value = true;
}

async function uploadImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      newTokenForm.avatar_url = data.url;
    }
  } catch (err) {
    console.error('Failed to upload marker image:', err);
  }
}

function clearAvatar() {
  newTokenForm.avatar_url = '';
}

async function submitAddMarker() {
  if (!activeMap.value) return;
  createTokenError.value = '';
  try {
    const res = await fetch('/api/world-markers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        map_id: activeMap.value.id,
        name: newTokenForm.name,
        marker_type: newTokenForm.marker_type,
        hex_q: newTokenForm.hex_q,
        hex_r: newTokenForm.hex_r,
        color: newTokenForm.color,
        avatar_url: newTokenForm.avatar_url,
        linked_map_id: newTokenForm.linked_map_id,
        hidden: newTokenForm.hidden,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      if (!markers.value.some((m) => m.id === created.id)) {
        markers.value = [...markers.value, created];
      }
      selectedMarkerId.value = created.id;
      showTokenSidebar.value = true;
      isTokenSidebarRolledUp.value = false;
      persistVttState();
      showAddTokenModal.value = false;
    } else {
      const data = await res.json().catch(() => ({}));
      createTokenError.value = data.error || 'Failed to place marker';
    }
  } catch (err) {
    createTokenError.value = err.message || 'Error placing marker';
  }
}

async function onMarkerMoved({ id, hex_q, hex_r }) {
  try {
    const res = await fetch(`/api/world-markers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hex_q, hex_r }),
    });
    if (res.ok) {
      const updated = await res.json();
      markers.value = markers.value.map((m) => (m.id === updated.id ? updated : m));
    }
  } catch (err) {
    console.error('Failed to move marker:', err);
  }
}

function onMarkerSelected(marker) {
  selectedMarkerId.value = marker ? marker.id : null;
  if (marker) {
    persistVttState();
  }
}

async function toggleMarkerVisibility(marker) {
  if (!isGm.value || !marker) return;
  try {
    const res = await fetch(`/api/world-markers/${marker.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hidden: !marker.hidden }),
    });
    if (res.ok) {
      const updated = await res.json();
      markers.value = markers.value.map((m) => (m.id === updated.id ? updated : m));
    }
  } catch (err) {
    console.error('Failed to toggle marker visibility:', err);
  }
}

async function updateSelectedMarker() {
  if (!isGm.value || !selectedMarker.value) return;
  try {
    const res = await fetch(`/api/world-markers/${selectedMarker.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: selectedMarkerForm.name,
        marker_type: selectedMarkerForm.marker_type,
        hex_q: selectedMarkerForm.hex_q,
        hex_r: selectedMarkerForm.hex_r,
        color: selectedMarkerForm.color,
        description: selectedMarkerForm.description,
        linked_map_id: selectedMarkerForm.linked_map_id,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      markers.value = markers.value.map((m) => (m.id === updated.id ? updated : m));
    }
  } catch (err) {
    console.error('Failed to update marker:', err);
  }
}

async function deleteSelectedMarker() {
  if (!isGm.value || !selectedMarker.value) return;
  const targetId = selectedMarker.value.id;
  try {
    const res = await fetch(`/api/world-markers/${targetId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      markers.value = markers.value.filter((m) => m.id !== targetId);
      selectedMarkerId.value = null;
    }
  } catch (err) {
    console.error('Failed to delete marker:', err);
  }
}

async function launchLinkedTacticalScene(linkedMapId) {
  if (!linkedMapId) return;
  try {
    await fetch(`/api/maps/${linkedMapId}/activate`, {
      method: 'POST',
      credentials: 'include',
    });
    router.push('/dashboard/rpg-vtt');
  } catch (err) {
    console.error('Failed to activate linked tactical scene:', err);
  }
}

function adjustZoom(delta) {
  zoomLevel.value = Math.round(Math.min(3.0, Math.max(0.25, zoomLevel.value + delta)) * 100) / 100;
}

let onSocketMapActivated = null;
let onSocketMapUpdated = null;
let onSocketMapCreated = null;
let onSocketMapDeleted = null;
let onSocketFogUpdated = null;
let onSocketMarkerCreated = null;
let onSocketMarkerUpdated = null;
let onSocketMarkerDeleted = null;
let onSocketPingUpdated = null;
let onSocketPingCleared = null;
let onSocketPingsSync = null;
let onSocketConnect = null;

function setupSocketListeners() {
  socket.on('map:activated', onSocketMapActivated = (payload) => {
    const map = payload?.map;
    if (map && map.map_type === 'world') {
      activeMap.value = map;
      selectedMarkerId.value = null;
      activePings.value = {};
      fetchMarkersForMap(map.id);
      socket.emit('ping:request_sync', { mapId: map.id });
    }
  });

  socket.on('map:updated', onSocketMapUpdated = ({ map }) => {
    if (activeMap.value && activeMap.value.id === map.id) {
      activeMap.value = map;
    }
  });

  socket.on('map:created', onSocketMapCreated = () => {
    if (isGm.value) fetchMapList();
  });

  socket.on('map:deleted', onSocketMapDeleted = ({ id }) => {
    if (isGm.value) fetchMapList();
    if (activeMap.value && activeMap.value.id === id) {
      activeMap.value = null;
      markers.value = [];
      selectedMarkerId.value = null;
      activePings.value = {};
    }
  });

  socket.on('fog:updated', onSocketFogUpdated = ({ mapId, fog_data }) => {
    if (activeMap.value && activeMap.value.id === mapId) {
      activeMap.value = { ...activeMap.value, fog_data };
    }
  });

  socket.on('world-marker:created', onSocketMarkerCreated = ({ marker }) => {
    if (activeMap.value && String(marker.map_id) === String(activeMap.value.id)) {
      if (!markers.value.some((m) => m.id === marker.id)) {
        markers.value = [...markers.value, marker];
      }
    }
  });

  socket.on('world-marker:updated', onSocketMarkerUpdated = ({ marker }) => {
    if (activeMap.value && String(marker.map_id) === String(activeMap.value.id)) {
      const exists = markers.value.some((m) => m.id === marker.id);
      if (exists) {
        markers.value = markers.value.map((m) => (m.id === marker.id ? marker : m));
      } else {
        markers.value = [...markers.value, marker];
      }
    }
  });

  socket.on('world-marker:deleted', onSocketMarkerDeleted = ({ id }) => {
    markers.value = markers.value.filter((m) => m.id !== id);
    if (selectedMarkerId.value === id) {
      selectedMarkerId.value = null;
    }
  });

  socket.on('ping:updated', onSocketPingUpdated = ({ mapId, ping }) => {
    if (activeMap.value && String(mapId) === String(activeMap.value.id) && ping?.userId) {
      activePings.value = {
        ...activePings.value,
        [ping.userId]: ping,
      };
    }
  });

  socket.on('ping:cleared', onSocketPingCleared = ({ mapId, userId, all }) => {
    if (activeMap.value && String(mapId) === String(activeMap.value.id)) {
      if (all) {
        activePings.value = {};
      } else if (userId) {
        const next = { ...activePings.value };
        delete next[userId];
        activePings.value = next;
      }
    }
  });

  socket.on('pings:sync', onSocketPingsSync = ({ mapId, pings }) => {
    if (activeMap.value && String(mapId) === String(activeMap.value.id)) {
      const next = {};
      if (Array.isArray(pings)) {
        for (const p of pings) {
          if (p?.userId) next[p.userId] = p;
        }
      }
      activePings.value = next;
    }
  });

  socket.on('connect', onSocketConnect = () => {
    fetchActiveMap();
    if (activeMap.value?.id) {
      socket.emit('ping:request_sync', { mapId: activeMap.value.id });
    }
  });
}

function cleanupSocketListeners() {
  if (onSocketMapActivated) socket.off('map:activated', onSocketMapActivated);
  if (onSocketMapUpdated) socket.off('map:updated', onSocketMapUpdated);
  if (onSocketMapCreated) socket.off('map:created', onSocketMapCreated);
  if (onSocketMapDeleted) socket.off('map:deleted', onSocketMapDeleted);
  if (onSocketFogUpdated) socket.off('fog:updated', onSocketFogUpdated);
  if (onSocketMarkerCreated) socket.off('world-marker:created', onSocketMarkerCreated);
  if (onSocketMarkerUpdated) socket.off('world-marker:updated', onSocketMarkerUpdated);
  if (onSocketMarkerDeleted) socket.off('world-marker:deleted', onSocketMarkerDeleted);
  if (onSocketPingUpdated) socket.off('ping:updated', onSocketPingUpdated);
  if (onSocketPingCleared) socket.off('ping:cleared', onSocketPingCleared);
  if (onSocketPingsSync) socket.off('pings:sync', onSocketPingsSync);
  if (onSocketConnect) socket.off('connect', onSocketConnect);
}

onMounted(() => {
  fetchActiveMap();
  if (isGm.value) {
    fetchMapList();
  }
  setupSocketListeners();
});

onBeforeUnmount(() => {
  if (persistStateTimer) {
    clearTimeout(persistStateTimer);
    persistStateTimer = null;
  }
  persistVttStateNow();
  cleanupSocketListeners();
});
</script>

<style scoped>
.vtt-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  color: #cecece;
  overflow: hidden;
}

/* World VTT Buttons - Remove outer borders */
.vtt-view button,
.vtt-view button:hover,
.vtt-view button:active,
.vtt-view button:focus {
  border: none !important;
}

.vtt-header {
  position: relative;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  height: 50px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.map-title {
  font-size: 18px;
  font-weight: 600;
  color: #cecece;
}

.map-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.header-center .zoom-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-gm,
.btn-sidebar {
  background: #000000;
  border: none !important;
  color: #cecece;
  padding: 6px 12px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.btn-sidebar.active {
  background: #000000;
  border: none !important;
  color: #cecece;
}

.btn-add-token {
  background-color: #000000 !important;
  background: #000000 !important;
  border: none !important;
  color: #d0d0d0 !important;
  -webkit-text-fill-color: #d0d0d0;
  box-shadow: 0 0 10px rgba(208, 208, 208, 0.25);
  font-weight: 600;
  letter-spacing: 0.3px;
  text-shadow: none;
  transition: all 0.15s ease-in-out;
}

.btn-add-token:hover {
  background-color: #000000 !important;
  background: #000000 !important;
  border: none !important;
  color: #d0d0d0 !important;
  -webkit-text-fill-color: #d0d0d0;
  box-shadow: 0 0 16px rgba(208, 208, 208, 0.5);
}

.btn-add-token:active {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(127, 255, 212, 0.4);
}

.vtt-body {
  position: relative;
  flex: 1;
  display: flex;
  overflow: hidden;
}

.vtt-toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(22, 27, 34, 0.80);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  padding: 8px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.vtt-toolbar button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 4px;
  text-align: left;
  border: none !important;
  color: var(--theme-bright, #cecece);
  background: rgba(0, 0, 0, 0.55);
  letter-spacing: 0.3px;
  font-weight: 500;
  transition: all 0.15s ease-in-out;
}

.vtt-toolbar button:hover {
  color: var(--theme-bright-hover, #cecece);
  background: var(--theme-btn-bg, rgba(22, 27, 34, 0.85));
}

.vtt-toolbar > button.active {
  background: rgba(0, 0, 0, 0.75);
  color: var(--theme-bright, #cecece);
  font-weight: 600;
  border: none !important;
  box-shadow: 0 0 8px var(--theme-glow, rgba(206, 206, 206, 0.4));
}

.vtt-toolbar > button.active:hover {
  background: rgba(0, 0, 0, 0.85);
  color: var(--theme-bright-hover, #cecece);
  border: none !important;
  box-shadow: 0 0 12px var(--theme-glow, rgba(206, 206, 206, 0.6));
}

.fog-eraser-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.35);
}

.fog-shape-row {
  display: flex;
  gap: 4px;
}

.vtt-toolbar .fog-shape-btn {
  flex: 1;
  justify-content: center;
  padding: 5px 6px;
  font-size: 12px;
  color: var(--theme-bright, #cecece);
}

.vtt-toolbar .fog-shape-btn.selected {
  background: rgba(0, 0, 0, 0.75);
  color: var(--theme-bright, #cecece);
  font-weight: 600;
  box-shadow: 0 0 6px var(--theme-glow, rgba(206, 206, 206, 0.4));
}

.fog-size-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--theme-bright, #cecece);
  font-weight: 500;
}

.fog-size-slider {
  width: 100%;
  accent-color: var(--theme-bright, #cecece);
}

.vtt-toolbar .fog-cover-btn {
  justify-content: center;
  padding: 5px 6px;
  font-size: 12px;
  color: var(--theme-bright, #cecece);
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary, #cecece);
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.map-drop-zone-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(13, 17, 23, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  pointer-events: none;
  border: 3px dashed var(--accent, #4fc3f7);
  margin: 12px;
  border-radius: 12px;
}

.map-drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #cecece;
  font-size: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.map-drop-zone-icon {
  font-size: 42px;
}

.tool-icon {
  width: 14px;
  height: 14px;
  display: inline-block;
  vertical-align: -2px;
  margin-right: 5px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  filter: drop-shadow(0 0 3px currentColor);
  transition: all 0.15s ease-in-out;
}

.vtt-toolbar button.active .tool-icon,
.vtt-toolbar button:hover .tool-icon {
  filter: drop-shadow(0 0 6px currentColor);
}

.toolbar-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.shortcut-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: 13px;
  color: #8b949e;
  text-align: center;
  user-select: none;
}

.key-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  font-size: 13px;
  font-family: inherit;
  font-weight: 600;
  color: var(--text-primary, #cecece);
  background: var(--bg-tertiary, #1f242c);
  border: 1px solid var(--border, #30363d);
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.btn-clear-ping {
  color: #f87171;
  border: none !important;
}

.btn-clear-ping:hover {
  background: rgba(239, 68, 68, 0.15);
  border: none !important;
  color: #fca5a5;
}

.btn-clear-all-pings {
  color: #fbbf24;
  border: none !important;
}

.btn-clear-all-pings:hover {
  background: rgba(245, 158, 11, 0.15);
  border: none !important;
  color: #fde68a;
}

.dmg-roller-wrapper {
  position: relative;
}

.dmg-btn-group {
  display: flex;
  align-items: stretch;
}

.btn-dmg-main {
  flex: 1;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  background: var(--theme-btn-bg, var(--bg-secondary));
  border: none !important;
  color: var(--theme-bright, #38bdf8);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-dmg-main:hover,
.btn-dmg-main.active {
  border: none !important;
  color: var(--theme-bright-hover, #7dd3fc);
  box-shadow: 0 0 10px var(--theme-glow, rgba(56, 189, 248, 0.4));
}

.btn-dmg-step {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  padding: 0 !important;
  background: var(--theme-btn-bg, var(--bg-primary));
  border: none !important;
  color: var(--theme-bright, #38bdf8);
  font-size: 13px !important;
  font-weight: bold;
  cursor: pointer;
  border-radius: 0 !important;
  transition: all 0.15s ease;
}

.btn-dmg-step:last-child {
  border-top-right-radius: 4px !important;
  border-bottom-right-radius: 4px !important;
}

.btn-dmg-step:hover:not(:disabled) {
  background: var(--theme-btn-bg, var(--bg-secondary));
  color: var(--theme-bright-hover, #7dd3fc);
  border: none !important;
  box-shadow: 0 0 8px var(--theme-glow, rgba(56, 189, 248, 0.4));
}

.btn-dmg-step:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dmg-popover {
  position: absolute;
  top: 0;
  left: calc(100% + 8px);
  width: 200px;
  background: rgba(22, 27, 34, 0.85);
  border: 1px solid var(--theme-border-subtle, var(--border));
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px var(--theme-glow, rgba(56, 189, 248, 0.2));
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.dmg-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--theme-bright, #38bdf8);
}

.dmg-popover-close {
  background: transparent !important;
  border: none !important;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px !important;
  line-height: 1;
}

.dmg-popover-close:hover {
  color: var(--theme-bright-hover, #7dd3fc);
}

.dmg-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-primary);
  border: 1px solid var(--theme-border-subtle, var(--border));
  border-radius: 6px;
  padding: 4px;
}

.stepper-btn {
  width: 28px;
  height: 28px;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme-btn-bg, var(--bg-secondary));
  border: none !important;
  border-radius: 4px;
  color: var(--theme-bright, #38bdf8);
  cursor: pointer;
  transition: all 0.15s ease;
}

.stepper-btn:hover:not(:disabled) {
  background: var(--theme-btn-bg, var(--bg-secondary));
  color: var(--theme-bright-hover, #7dd3fc);
  box-shadow: 0 0 8px var(--theme-glow, rgba(56, 189, 248, 0.4));
  border: none !important;
}

.stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stepper-val {
  font-size: 15px;
  font-weight: 700;
  color: var(--theme-bright, #38bdf8);
  text-align: center;
}

.dmg-presets {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.preset-btn {
  padding: 4px 0 !important;
  font-size: 11px !important;
  text-align: center !important;
  justify-content: center !important;
  border-radius: 4px;
  background: var(--bg-primary);
  border: none !important;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-btn:hover {
  border: none !important;
  color: var(--theme-bright-hover, #7dd3fc);
}

.preset-btn.active {
  background: var(--theme-glow-bg, rgba(56, 189, 248, 0.18));
  border: none !important;
  color: var(--theme-bright, #38bdf8);
  font-weight: 600;
}

.btn-roll-dmg-action {
  padding: 8px !important;
  font-size: 12px;
  font-weight: 700 !important;
  background: var(--theme-btn-bg, var(--bg-primary)) !important;
  color: var(--theme-bright, #38bdf8) !important;
  border: none !important;
  border-radius: 6px !important;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center !important;
  gap: 6px;
  transition: all 0.15s ease;
}

.btn-roll-dmg-action:hover {
  color: var(--theme-bright-hover, #7dd3fc) !important;
  box-shadow: 0 0 10px var(--theme-glow, rgba(56, 189, 248, 0.4));
  border: none !important;
}

.btn-roll-dmg-action:hover {
  filter: brightness(1.2);
  box-shadow: 0 0 12px var(--theme-glow, rgba(56, 189, 248, 0.5));
}

/* Initiative Floating HUD */
.initiative-hud-banner {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(13, 17, 23, 0.95);
  border: 2px solid var(--theme-bright, #b5eeff);
  box-shadow: 0 0 20px rgba(181, 238, 255, 0.45), 0 8px 32px rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  padding: 12px 18px;
  min-width: 290px;
  cursor: pointer;
  z-index: 250;
  backdrop-filter: blur(8px);
}
.initiative-hud-banner .hud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}
.initiative-hud-banner .hud-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--theme-bright, rgba(181, 238, 255, 0.85));
  text-transform: uppercase;
  text-shadow: 0 0 8px var(--theme-glow, rgba(181, 238, 255, 0.4));
}
.initiative-hud-banner .hud-close {
  background: transparent;
  border: none;
  color: var(--theme-bright, #b5eeff);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  text-shadow: 0 0 8px var(--theme-glow, rgba(181, 238, 255, 0.5));
  transition: color 0.15s ease;
}
.initiative-hud-banner .hud-close:hover {
  color: var(--theme-bright-hover, #b5eeff);
}
.init-hud-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 10px 0;
}
.init-die-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.4);
}
.init-player-die {
  background: var(--theme-btn-bg, #0b222e);
  border: 2px solid var(--theme-bright, #b5eeff);
  color: var(--theme-bright, #b5eeff);
  box-shadow: 0 0 12px var(--theme-glow, rgba(181, 238, 255, 0.4)), inset 0 2px 4px rgba(255, 255, 255, 0.1);
}
.init-player-die .init-val {
  color: var(--theme-bright, #b5eeff);
  text-shadow: 0 0 10px rgba(181, 238, 255, 0.7);
}
.init-opp-die {
  background: var(--theme-btn-bg, #400a22);
  border: 2px solid var(--theme-accent, #c9abb9);
  color: var(--theme-accent, #c9abb9);
  box-shadow: 0 0 12px var(--theme-glow, rgba(201, 171, 185, 0.4)), inset 0 2px 4px rgba(255, 255, 255, 0.1);
}
.init-opp-die .init-val {
  color: var(--theme-accent, #c9abb9);
  text-shadow: 0 0 10px var(--theme-glow, rgba(201, 171, 185, 0.7));
}
.init-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  opacity: 0.9;
}
.init-val {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  font-family: monospace;
}
.init-vs {
  font-size: 14px;
  font-weight: 900;
  color: var(--text-secondary, #64748b);
  text-shadow: 0 0 6px rgba(100, 116, 139, 0.5);
}
.init-log-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}
.init-pill-player {
  background: #161b22;
  color: var(--text-white, #ffffff);
  border: 1px solid var(--border);
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 700;
}
.init-pill-opp {
  background: #161b22;
  color: var(--text-white, #ffffff);
  border: 1px solid var(--border);
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 700;
}

.damage-hud-banner {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(13, 17, 23, 0.94);
  border: 2px solid var(--theme-bright, #38bdf8);
  border-radius: 8px;
  padding: 10px 18px;
  color: var(--theme-bright, #38bdf8);
  z-index: 250;
  box-shadow: 0 0 20px var(--theme-glow, rgba(56, 189, 248, 0.45)), 0 8px 32px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  backdrop-filter: blur(8px);
}

.damage-hud-banner .hud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.damage-hud-banner .hud-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--theme-bright, #38bdf8);
  opacity: 0.85;
  text-transform: uppercase;
}

.damage-hud-banner .hud-close {
  background: transparent;
  border: none;
  color: var(--theme-bright, #38bdf8);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s ease;
}

.damage-hud-banner .hud-close:hover {
  color: var(--theme-bright-hover, #7dd3fc);
}

.damage-hud-banner .hud-body {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.damage-hud-banner .hud-total {
  font-size: 32px;
  font-weight: 900;
  color: var(--theme-bright, #38bdf8);
  text-shadow: 0 0 12px var(--theme-glow, rgba(56, 189, 248, 0.7));
  line-height: 1;
}

.damage-hud-banner .hud-dice {
  font-size: 13px;
  color: var(--theme-accent, #7dd3fc);
  font-weight: 600;
}

.percentile-hud-banner {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(13, 17, 23, 0.94);
  border: 2px solid var(--theme-bright, #38bdf8);
  border-radius: 8px;
  padding: 10px 18px;
  color: var(--theme-bright, #38bdf8);
  z-index: 250;
  box-shadow: 0 0 20px var(--theme-glow, rgba(56, 189, 248, 0.45)), 0 8px 32px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  backdrop-filter: blur(8px);
}

.percentile-hud-banner .hud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.percentile-hud-banner .hud-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--theme-bright, #38bdf8);
  opacity: 0.85;
  text-transform: uppercase;
}

.percentile-hud-banner .hud-close {
  background: transparent;
  border: none;
  color: var(--theme-bright, #38bdf8);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s ease;
}

.percentile-hud-banner .hud-close:hover {
  color: var(--theme-bright-hover, #7dd3fc);
}

.percentile-hud-banner .hud-body {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.percentile-hud-banner .hud-total {
  font-size: 32px;
  font-weight: 900;
  color: var(--theme-bright, #38bdf8);
  text-shadow: 0 0 12px var(--theme-glow, rgba(56, 189, 248, 0.7));
  line-height: 1;
}

.percentile-hud-banner .hud-dice {
  font-size: 13px;
  color: var(--text-secondary, #8b949e);
  font-weight: 600;
}

.percentile-hud-banner .hud-tens-val {
  color: var(--theme-bright, #38bdf8);
  font-weight: 700;
}

.percentile-hud-banner .hud-ones-val {
  color: var(--theme-accent, #7dd3fc);
  font-weight: 700;
}

.dmg-last-roll-card {
  margin-top: 8px;
  padding: 6px 8px;
  background: rgba(13, 17, 23, 0.9);
  border: 1px solid var(--theme-border-subtle, var(--border));
  border-radius: 4px;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dmg-last-roll-card .last-roll-header {
  color: var(--text-secondary, #8b949e);
}

.dmg-last-roll-card .last-roll-result {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.dmg-last-roll-card .last-roll-total {
  color: var(--theme-bright, #38bdf8);
  font-weight: 800;
  font-size: 14px;
  text-shadow: 0 0 6px var(--theme-glow, rgba(56, 189, 248, 0.4));
}

.dmg-last-roll-card .last-roll-breakdown {
  color: var(--theme-accent, #7dd3fc);
  font-size: 11px;
}

.vtt-canvas-wrapper {
  flex: 1;
  min-width: 0;
  height: 100%;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gm-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 360px;
  background: rgba(22, 27, 34, 0.64);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.drawer-header,
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid var(--border);
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary);
}

.drawer-content,
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.token-sidebar {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 320px;
  height: 100%;
  background: rgba(22, 27, 34, 0.64);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.token-sidebar.token-sidebar-rolled-up {
  position: absolute;
  right: 0;
  top: 0;
  bottom: auto;
  width: 320px;
  height: auto;
  z-index: 10;
  background: rgba(22, 27, 34, 0.64);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.65);
}

.token-sidebar .sidebar-header {
  background: rgba(0, 0, 0, 0.35);
  user-select: none;
}

.token-sidebar .close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.token-sidebar .close-btn:hover {
  background-color: var(--bg-tertiary, #1f242c);
  color: var(--theme-bright, #cecece);
}

.section-box {
  background: rgba(0, 0, 0, 0.35);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-box h4 {
  font-size: 15.5px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  padding-bottom: 6px;
  margin-bottom: 2px;
}

.map-list,
.token-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-list li,
.token-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.40);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
}

.map-list li.active,
.token-list li.active {
  border-color: var(--accent);
  background: rgba(88, 166, 255, 0.1);
}

.token-dot,
.token-color-badge {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.token-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.info-row .label {
  color: var(--text-secondary);
}

.linked-scene-box {
  background: rgba(0, 0, 0, 0.40);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-launch-scene {
  background-color: #000000 !important;
  border: none !important;
  color: var(--theme-bright, #cecece) !important;
  box-shadow: 0 0 8px var(--theme-glow, rgba(69, 172, 186, 0.3));
  font-weight: 600;
  padding: 8px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-launch-scene:hover {
  background-color: #000000 !important;
  color: var(--theme-bright-hover, #cecece) !important;
  box-shadow: 0 0 14px var(--theme-glow, rgba(69, 172, 186, 0.5));
}

.btn-delete-token,
.inspector-actions .danger {
  background: #340c0e !important;
  color: #f85149 !important;
  border: none !important;
  box-shadow: 0 0 6px rgba(218, 54, 51, 0.25);
  transition: all 0.15s ease-in-out;
}

.btn-delete-token:hover:not(:disabled),
.inspector-actions .danger:hover:not(:disabled) {
  background: #4a1316 !important;
  border: none !important;
  color: #ff8585 !important;
  box-shadow: 0 0 10px rgba(248, 81, 73, 0.45);
}

.modal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  width: 500px;
  max-width: 95vw;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.form-group select,
.world-select,
.world-select option {
  background-color: #000000 !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
}

.world-select {
  border: 1px solid #cecece !important;
  border-radius: var(--radius);
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 500;
  width: 100%;
}

.world-select:focus {
  outline: none;
  border-color: #cecece !important;
  box-shadow: 0 0 6px rgba(206, 206, 206, 0.4);
}

.form-group input[type="text"],
.form-group input[type="number"],
.token-inspector input[type="text"],
.token-inspector input[type="number"] {
  color-scheme: dark;
  background-color: #000000 !important;
  border: 1px solid #cecece !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  border-radius: var(--radius);
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 500;
  width: 100%;
  box-sizing: border-box;
}

.form-group input[type="text"]:focus,
.form-group input[type="number"]:focus,
.token-inspector input[type="text"]:focus,
.token-inspector input[type="number"]:focus {
  outline: none;
  border-color: #cecece !important;
  box-shadow: 0 0 6px rgba(206, 206, 206, 0.4);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.btn-add-token-submit {
  background-color: #000000 !important;
  background: #000000 !important;
  border: none !important;
  color: #d0d0d0 !important;
  -webkit-text-fill-color: #d0d0d0;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: var(--radius);
  box-shadow: 0 0 10px rgba(208, 208, 208, 0.25);
  transition: all 0.15s ease-in-out;
}

.btn-add-token-submit:hover:not(:disabled) {
  background-color: #000000 !important;
  background: #000000 !important;
  border: none !important;
  color: #d0d0d0 !important;
  -webkit-text-fill-color: #d0d0d0;
  box-shadow: 0 0 16px rgba(208, 208, 208, 0.5);
}

.btn-add-token-submit:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(208, 208, 208, 0.4);
}

.modal-card input[type="text"],
.modal-card input[type="number"] {
  color-scheme: dark;
  background-color: #000000 !important;
  border: 1px solid #cecece !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
}

.roll-log-hud {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 105;
  pointer-events: auto;
}

.roll-log-pill-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-audio-toggle {
  background: transparent !important;
  border: none !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-audio-toggle:hover {
  background: #000000 !important;
  border: none !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  box-shadow: 0 0 8px rgba(206, 206, 206, 0.4);
}

.btn-audio-toggle-pill {
  background: rgba(22, 27, 34, 0.92) !important;
  border: none !important;
  color: var(--text-white, #ffffff) !important;
  -webkit-text-fill-color: var(--text-white, #ffffff);
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-audio-toggle-pill:hover {
  background: #000000 !important;
  color: var(--text-white, #ffffff) !important;
  -webkit-text-fill-color: var(--text-white, #ffffff);
  border: none !important;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.btn-roll-log-pill {
  background: rgba(22, 27, 34, 0.92) !important;
  border: none !important;
  color: var(--text-white, #ffffff) !important;
  -webkit-text-fill-color: var(--text-white, #ffffff);
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-roll-log-pill:hover {
  background: #000000 !important;
  color: var(--text-white, #ffffff) !important;
  -webkit-text-fill-color: var(--text-white, #ffffff);
  border: none !important;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.roll-log-card {
  width: 290px;
  max-height: 290px;
  background: rgba(13, 17, 23, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.roll-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(13, 17, 23, 0.85);
  border-bottom: 1px solid var(--border);
}

.roll-log-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-white, #ffffff);
  letter-spacing: 0.5px;
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
}

.roll-log-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-roll-log-clear {
  background: transparent !important;
  border: none !important;
  color: #8b949e !important;
  -webkit-text-fill-color: #8b949e;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-roll-log-clear:hover:not(:disabled) {
  border: none !important;
  color: #f85149 !important;
  -webkit-text-fill-color: #f85149;
}

.btn-roll-log-toggle {
  background: transparent !important;
  border: none !important;
  color: var(--text-white, #ffffff) !important;
  -webkit-text-fill-color: var(--text-white, #ffffff);
  font-size: 11px;
  padding: 2px 4px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-roll-log-toggle:hover {
  color: var(--text-white, #ffffff) !important;
  -webkit-text-fill-color: var(--text-white, #ffffff);
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
}

.roll-log-body {
  padding: 6px 10px;
  max-height: 240px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 255, 255, 0.45) rgba(5, 15, 20, 0.8);
}

.roll-log-body::-webkit-scrollbar {
  width: 6px;
}

.roll-log-body::-webkit-scrollbar-track {
  background: rgba(5, 15, 20, 0.8);
  border-radius: 3px;
}

.roll-log-body::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.4);
  border: 1px solid rgba(0, 255, 255, 0.6);
  border-radius: 3px;
}

.roll-log-body::-webkit-scrollbar-thumb:hover {
  background: #00ffff;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
}

.roll-log-empty {
  font-size: 11px;
  color: var(--text-white, #ffffff);
  opacity: 0.7;
  text-align: center;
  padding: 12px 0;
  font-style: italic;
}

.roll-log-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.roll-log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  background: rgba(22, 27, 34, 0.85);
  border: 1px solid var(--border);
  border-radius: 4px;
  border-left: 3px solid #ffffff;
}

.roll-log-item.percentile {
  border-left: 3px solid #ffffff;
}

.roll-log-item.damage {
  border-left: 3px solid #ffffff;
}

.roll-log-item.initiative {
  border-left: 3px solid #ffffff;
}

.roll-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.roll-item-time {
  font-size: 10px;
  color: var(--text-white, #ffffff);
  opacity: 0.7;
  font-family: monospace;
}

.roll-item-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  background: #0d1117;
  color: var(--text-white, #ffffff);
  border: 1px solid var(--border);
}

.roll-log-item.damage .roll-item-badge {
  background: #0d1117;
  color: var(--text-white, #ffffff);
  border-color: var(--border);
  box-shadow: none;
}

.roll-log-item.initiative .roll-item-badge {
  background: #0d1117;
  color: var(--text-white, #ffffff);
  border-color: var(--border);
  box-shadow: none;
}

.roll-item-result {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.roll-item-total {
  font-size: 14px;
  font-weight: 800;
  color: var(--text-white, #ffffff);
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}

.roll-log-item.damage .roll-item-total {
  color: var(--text-white, #ffffff);
}

.roll-item-breakdown {
  font-size: 10px;
  color: var(--text-white, #ffffff);
  opacity: 0.85;
  font-family: monospace;
}

.grid-dimensions-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.visibility-section {
  margin-top: 8px;
}

.btn-toggle-visibility {
  background: rgba(16, 185, 129, 0.14);
  border: none !important;
  color: #34d399;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-toggle-visibility:hover {
  background: rgba(16, 185, 129, 0.25);
  border: none !important;
}

.btn-toggle-visibility.is-hidden {
  background: rgba(245, 158, 11, 0.16);
  border: none !important;
  color: #fbbf24;
}

.btn-toggle-visibility.is-hidden:hover {
  background: rgba(245, 158, 11, 0.28);
  border: none !important;
}

.token-row-hidden {
  opacity: 0.72;
}

.token-hidden-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #fbbf24;
}

.btn-token-list-visibility {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 0.75rem;
  cursor: pointer;
  margin-left: auto;
}

.spawn-hidden-row {
  margin-top: 4px;
}

.spawn-hidden-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #fbbf24;
  cursor: pointer;
}

.no-map-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(13, 17, 23, 0.85);
  z-index: 10;
}

.no-map-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 440px;
  padding: 32px;
  background: var(--bg-secondary, #161b22);
  border: 1px solid var(--border, #30363d);
  border-radius: 12px;
}
</style>
