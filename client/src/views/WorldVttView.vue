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
        <!-- Marker Inspector Toggle -->
        <button
          type="button"
          class="btn-sidebar"
          :class="{ active: showTokenSidebar }"
          @click="toggleTokenSidebar"
          :title="showTokenSidebar ? 'Close Marker Inspector' : 'Open Marker Inspector'"
        >
          Markers {{ markers.length > 0 ? `(${markers.length})` : '' }}
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

        <button v-if="isGm" class="btn-tool btn-initiative" @click="rollInitiative" title="Roll Combat Initiative (Players vs. Opposition 2d10)">
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Initiative
        </button>

        <button class="btn-tool" @click="rollPercentile">
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/><text x="12" y="15" text-anchor="middle" font-size="9" fill="currentColor" stroke="none" font-weight="bold">%</text></svg> Roll d%
        </button>

        <!-- Damage Dice Roller -->
        <div class="dmg-roller-wrapper" ref="dmgMenuRef">
          <div class="dmg-btn-group">
            <button
              class="btn-tool btn-dmg-main"
              :class="{ active: showDmgMenu }"
              @click="toggleDmgMenu"
              title="Click to configure and roll damage dice"
            >
              <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z"/></svg> DMG Die: {{ damageDiceCount }}d10
            </button>
            <button
              class="btn-dmg-step"
              title="Decrease dice count"
              :disabled="damageDiceCount <= 1"
              @click.stop="adjustDamageCount(-1)"
            >
              -
            </button>
            <button
              class="btn-dmg-step"
              title="Increase dice count"
              :disabled="damageDiceCount >= 20"
              @click.stop="adjustDamageCount(1)"
            >
              +
            </button>
          </div>

          <div v-if="showDmgMenu" class="dmg-popover">
            <div class="dmg-popover-header">
              <span>Damage Pool (d10)</span>
              <button class="dmg-popover-close" @click="showDmgMenu = false">×</button>
            </div>
            <div class="dmg-stepper">
              <button class="stepper-btn" :disabled="damageDiceCount <= 1" @click="adjustDamageCount(-1)">-</button>
              <span class="stepper-val">{{ damageDiceCount }}d10</span>
              <button class="stepper-btn" :disabled="damageDiceCount >= 20" @click="adjustDamageCount(1)">+</button>
            </div>
            <div class="dmg-presets">
              <button
                v-for="preset in [1, 2, 3, 4, 5, 6, 8, 10, 12, 15]"
                :key="preset"
                class="preset-btn"
                :class="{ active: damageDiceCount === preset }"
                @click="damageDiceCount = preset"
              >
                {{ preset }}d10
              </button>
            </div>
            <button class="btn-roll-dmg-action" @click="rollDamage">
              Roll {{ damageDiceCount }}d10 Now
            </button>
            <div v-if="lastDamageRoll" class="dmg-last-roll-card">
              <div class="last-roll-header">Last Roll ({{ lastDamageRoll.count }}d10):</div>
              <div class="last-roll-result">
                <span class="last-roll-total">{{ lastDamageRoll.total }}</span>
                <span class="last-roll-breakdown">[{{ lastDamageRoll.dice.join(', ') }}]</span>
              </div>
            </div>
          </div>
        </div>

        <button class="btn-tool" @click="clearDice">
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg> Clear Dice
        </button>

        <div class="toolbar-divider"></div>
        <div class="shortcut-tip">
          <span class="key-badge">Space</span> + Drag to Pan
        </div>
      </nav>

      <!-- Canvas Container -->
      <div class="vtt-canvas-wrapper">
        <!-- Bottom-Left Collapsible Die Roll Log HUD -->
        <div class="roll-log-hud" :class="{ open: isRollLogOpen }">
          <div v-if="!isRollLogOpen" class="roll-log-pill-row">
            <button class="btn-roll-log-pill" @click="isRollLogOpen = true" title="Open Die Roll Log">
              📜 Roll Log ({{ rollLog.length }}) ▲
            </button>
            <button
              class="btn-audio-toggle btn-audio-toggle-pill"
              @click="toggleAudioMute"
              :title="isDiceAudioMuted ? 'Unmute dice audio' : 'Mute dice audio'"
              :aria-label="isDiceAudioMuted ? 'Unmute dice audio' : 'Mute dice audio'"
              :aria-pressed="!isDiceAudioMuted"
            >
              {{ isDiceAudioMuted ? '🔇' : '🔊' }}
            </button>
          </div>
          <div v-else class="roll-log-card">
            <div class="roll-log-header">
              <span class="roll-log-title">📜 Die Roll Log</span>
              <div class="roll-log-actions">
                <button
                  class="btn-audio-toggle"
                  @click="toggleAudioMute"
                  :title="isDiceAudioMuted ? 'Unmute dice audio' : 'Mute dice audio'"
                  :aria-label="isDiceAudioMuted ? 'Unmute dice audio' : 'Mute dice audio'"
                  :aria-pressed="!isDiceAudioMuted"
                >
                  {{ isDiceAudioMuted ? '🔇' : '🔊' }}
                </button>
                <button v-if="isGm" class="btn-roll-log-clear" @click="clearRollLog" :disabled="rollLog.length === 0" title="Clear Log (GM Only)">Clear</button>
                <button class="btn-roll-log-toggle" @click="isRollLogOpen = false" title="Minimize">▼</button>
              </div>
            </div>
            <div class="roll-log-body">
              <div v-if="rollLog.length === 0" class="roll-log-empty">No rolls recorded yet.</div>
              <ul v-else class="roll-log-list">
                <li v-for="item in rollLog" :key="item.id" class="roll-log-item" :class="item.type">
                  <div class="roll-item-meta">
                    <span v-if="item.username" class="roll-user-badge" :class="item.role?.toLowerCase()">
                      {{ item.username }}
                    </span>
                    <span class="roll-item-time">{{ formatRollTime(item) }}</span>
                    <span class="roll-item-badge">{{ item.label }}</span>
                  </div>
                  <div class="roll-item-result">
                    <template v-if="item.type === 'initiative'">
                      <div class="init-log-pills" v-if="(item.rollSummary || item.roll_summary)?.playerRoll">
                        <span class="init-pill-player">Players: {{ (item.rollSummary || item.roll_summary).playerRoll }}</span>
                        <span class="init-pill-opp">Opposition: {{ (item.rollSummary || item.roll_summary).oppRoll }}</span>
                      </div>
                      <span v-else class="roll-item-breakdown">{{ item.breakdown }}</span>
                    </template>
                    <template v-else>
                      <span class="roll-item-total">{{ item.total }}</span>
                      <span class="roll-item-breakdown">{{ item.breakdown }}</span>
                    </template>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Floating Damage HUD Banner -->
        <transition name="hud-pop">
          <div
            v-if="showDamageHud && lastDamageRoll"
            class="damage-hud-banner"
            @click="showDamageHud = false"
          >
            <div class="hud-header">
              <div class="hud-title">
                <span v-if="lastDamageRoll.username" class="hud-user-tag" :class="lastDamageRoll.role?.toLowerCase()">
                  {{ lastDamageRoll.role === 'GameMaster' ? 'GM' : 'PLAYER' }} {{ lastDamageRoll.username }}
                </span>
                💥 Damage Roll ({{ lastDamageRoll.count }}d10)
              </div>
              <button class="hud-close" @click.stop="showDamageHud = false">&times;</button>
            </div>
            <div class="hud-body">
              <span class="hud-total">{{ lastDamageRoll.total }}</span>
              <span class="hud-dice">({{ lastDamageRoll.dice?.length ? lastDamageRoll.dice.join(' + ') : lastDamageRoll.breakdown }})</span>
            </div>
          </div>
        </transition>

        <!-- Floating Percentile HUD Banner -->
        <transition name="hud-pop">
          <div
            v-if="showPercentileHud && lastPercentileRoll"
            class="percentile-hud-banner"
            @click="showPercentileHud = false"
          >
            <div class="hud-header">
              <div class="hud-title">
                <span v-if="lastPercentileRoll.username" class="hud-user-tag" :class="lastPercentileRoll.role?.toLowerCase()">
                  {{ lastPercentileRoll.role === 'GameMaster' ? 'GM' : 'PLAYER' }} {{ lastPercentileRoll.username }}
                </span>
                🎲 Percentile Roll (d%)
              </div>
              <button class="hud-close" @click.stop="showPercentileHud = false">&times;</button>
            </div>
            <div class="hud-body">
              <span class="hud-total">{{ lastPercentileRoll.total }}</span>
              <span class="hud-dice">(<span class="hud-tens-val">Tens: {{ lastPercentileRoll.tens }}</span>, <span class="hud-ones-val">Ones: {{ lastPercentileRoll.ones }}</span>)</span>
            </div>
          </div>
        </transition>

        <!-- Floating Initiative HUD Banner -->
        <transition name="hud-pop">
          <div
            v-if="showInitiativeHud && lastInitiativeRoll"
            class="initiative-hud-banner"
            @click="showInitiativeHud = false"
          >
            <div class="hud-header">
              <div class="hud-title">
                <span v-if="lastInitiativeRoll.username" class="hud-user-tag" :class="lastInitiativeRoll.role?.toLowerCase()">
                  {{ lastInitiativeRoll.role === 'GameMaster' ? 'GM' : 'PLAYER' }} {{ lastInitiativeRoll.username }}
                </span>
                ⚡ Combat Initiative
              </div>
              <button class="hud-close" @click.stop="showInitiativeHud = false">&times;</button>
            </div>
            <div class="hud-body init-hud-body">
              <div class="init-die-box init-player-die">
                <span class="init-label">PLAYERS</span>
                <span class="init-val">{{ lastInitiativeRoll.playerRoll }}</span>
              </div>
              <span class="init-vs">VS</span>
              <div class="init-die-box init-opp-die">
                <span class="init-label">OPPOSITION</span>
                <span class="init-val">{{ lastInitiativeRoll.oppRoll }}</span>
              </div>
            </div>
          </div>
        </transition>

        <!-- Dice Box Overlay -->
        <div id="dice-box" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 200;"></div>

        <WorldVttCanvas
          :map="activeMap"
          :markers="markers"
          :pings="activePingsList"
          :active-tool="activeTool"
          v-model:zoom-level="zoomLevel"
          v-model:pan-x="panX"
          v-model:pan-y="panY"
          :selected-marker-id="selectedMarkerId"
          @marker-moved="onMarkerMoved"
          @marker-selected="onMarkerSelected"
          @markers-updated="markers = $event"
          @map-updated="activeMap = $event"
          @ping-update="onPingUpdate"
          @ping-dismiss="onPingDismiss"
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
      <aside v-if="showTokenSidebar" class="token-sidebar">
        <div class="sidebar-header">
          <h3>World Marker Inspector</h3>
          <button type="button" class="close-btn" @click="closeTokenSidebar" title="Close Marker Inspector">×</button>
        </div>

        <div class="sidebar-content">
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
import { calculateDamageRoll, calculatePercentileRoll, calculateInitiativeRoll } from '../utils/diceUtils.js';
import { executeQueuedDiceRoll } from '../utils/safeDiceRoller.js';
import { diceRollQueue } from '../utils/diceRollQueue.js';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';
import { playDiceSound, toggleMute as toggleDiceMute, isMuted as isDiceMuted } from '../services/diceAudio.js';

const router = useRouter();
const authStore = useAuthStore();
const isGm = computed(() => authStore.user?.role === 'GameMaster');

const isDiceAudioMuted = ref(isDiceMuted());

function toggleAudioMute() {
  const muted = toggleDiceMute();
  isDiceAudioMuted.value = muted;
}

const initialVttState = getUserState(getSafeUserId(), 'worldVtt', {
  panX: 50,
  panY: 50,
  zoomLevel: 1.0,
  activeTool: 'select',
  selectedMarkerId: null,
  isRollLogOpen: false,
  showTokenSidebar: true,
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

let diceBoxInstance = null;
let diceBoxInitPromise = null;

async function initDiceBox() {
  if (diceBoxInstance) return diceBoxInstance;
  if (diceBoxInitPromise) return diceBoxInitPromise;

  diceBoxInitPromise = (async () => {
    try {
      const { default: DiceBox } = await import('@3d-dice/dice-box');
      const box = new DiceBox('#dice-box', {
        assetPath: '/assets/dice-box/',
        origin: window.location.origin,
        theme: 'default',
        themeColor: '#45acba',
        offscreen: false,
        scale: 6,
      });
      await box.init();
      diceBoxInstance = box;
      return box;
    } catch (err) {
      diceBoxInitPromise = null;
      return null;
    }
  })();

  return diceBoxInitPromise;
}

async function getReadyDiceBox() {
  return diceBoxInstance || (await initDiceBox());
}

const damageDiceCount = ref(1);
const showDmgMenu = ref(false);
const dmgMenuRef = ref(null);
const lastDamageRoll = ref(null);
const showDamageHud = ref(false);
let damageHudTimeout = null;

const lastPercentileRoll = ref(null);
const showPercentileHud = ref(false);
let percentileHudTimeout = null;

const lastInitiativeRoll = ref(null);
const showInitiativeHud = ref(false);
let initiativeHudTimeout = null;

const rollLog = ref([]);
const isRollLogOpen = ref(Boolean(initialVttState.isRollLogOpen));

function formatRollTime(item) {
  if (!item) return '';
  const raw = item.createdAt || item.timestamp;
  if (!raw) return '';
  const dateStr = typeof raw === 'string' && raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') + 'Z' : raw;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? String(raw) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

async function fetchRollLog() {
  try {
    const res = await fetch('/api/rolls?mode=world', { credentials: 'include' });
    if (res.ok) {
      rollLog.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch World roll log:', err);
  }
}

async function sendRollToServer(rollData) {
  try {
    const res = await fetch('/api/rolls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        mode: 'world',
        type: rollData.type,
        label: rollData.label,
        total: rollData.total,
        breakdown: rollData.breakdown,
        rollSummary: rollData.rollSummary,
      }),
    });
    if (res.ok) {
      const savedRoll = await res.json();
      if (!rollLog.value.some((r) => r.id === savedRoll.id)) {
        rollLog.value.unshift(savedRoll);
        if (rollLog.value.length > 20) {
          rollLog.value = rollLog.value.slice(0, 20);
        }
      }
    }
  } catch (err) {
    console.error('Failed to post roll to server:', err);
  }
}

async function clearRollLog() {
  if (!isGm.value) return;
  try {
    const res = await fetch('/api/rolls?mode=world', {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      rollLog.value = [];
      clearDice();
    }
  } catch (err) {
    console.error('Failed to clear World roll log on server:', err);
  }
}

function adjustDamageCount(delta) {
  damageDiceCount.value = Math.max(1, Math.min(20, damageDiceCount.value + delta));
}

function toggleDmgMenu() {
  showDmgMenu.value = !showDmgMenu.value;
}

async function rollInitiative() {
  if (!isGm.value) return;
  playDiceSound({ isRemote: false });
  const diceBox = await getReadyDiceBox();
  showInitiativeHud.value = false;
  showPercentileHud.value = false;
  showDamageHud.value = false;
  if (initiativeHudTimeout) clearTimeout(initiativeHudTimeout);

  try {
    const results = await executeQueuedDiceRoll(diceBox, [
      { sides: 10, theme: 'custom-init-player', themeColor: '#0b222e', qty: 1 },
      { sides: 10, theme: 'custom-init-opp', themeColor: '#400a22', qty: 1 },
    ]);
    const rollSummary = calculateInitiativeRoll(results);
    if (rollSummary.valid) {
      lastInitiativeRoll.value = {
        ...rollSummary,
        username: authStore.user?.username,
        role: authStore.user?.role,
      };
      showInitiativeHud.value = true;
      sendRollToServer({
        type: 'initiative',
        label: '⚡ Combat Initiative',
        total: rollSummary.playerRoll,
        breakdown: `Players: ${rollSummary.playerRoll} vs Opposition: ${rollSummary.oppRoll}`,
        rollSummary,
      });
      initiativeHudTimeout = setTimeout(() => {
        showInitiativeHud.value = false;
      }, 9000);
    }
  } catch (err) {
    console.error('Initiative dice roll failed:', err);
  }
}

async function rollPercentile() {
  playDiceSound({ isRemote: false });
  const diceBox = await getReadyDiceBox();
  showPercentileHud.value = false;
  showDamageHud.value = false;
  showInitiativeHud.value = false;
  if (percentileHudTimeout) clearTimeout(percentileHudTimeout);

  try {
    const results = await executeQueuedDiceRoll(diceBox, [
      { sides: 10, theme: 'custom-tens', themeColor: '#77d19e', qty: 1 },
      { sides: 10, theme: 'custom-ones', themeColor: '#22384a', qty: 1 },
    ]);
    const rollSummary = calculatePercentileRoll(results);
    if (rollSummary.valid) {
      lastPercentileRoll.value = {
        ...rollSummary,
        username: authStore.user?.username,
        role: authStore.user?.role,
      };
      showPercentileHud.value = true;
      sendRollToServer({
        type: 'percentile',
        label: 'd%',
        total: rollSummary.total,
        breakdown: `[Tens: ${rollSummary.tens * 10}, Ones: ${rollSummary.ones}]`,
        rollSummary,
      });
      percentileHudTimeout = setTimeout(() => {
        showPercentileHud.value = false;
      }, 8000);
    }
  } catch (err) {
    console.error('Percentile dice roll failed:', err);
  }
}

async function rollDamage() {
  playDiceSound({ isRemote: false });
  const diceBox = await getReadyDiceBox();
  showDamageHud.value = false;
  showPercentileHud.value = false;
  showInitiativeHud.value = false;
  if (damageHudTimeout) clearTimeout(damageHudTimeout);
  showDmgMenu.value = false;

  try {
    const results = await executeQueuedDiceRoll(diceBox, [
      { sides: 10, theme: 'custom-dmg', themeColor: '#140409', qty: damageDiceCount.value },
    ]);
    const rollSummary = calculateDamageRoll(results);
    if (rollSummary.count > 0) {
      lastDamageRoll.value = {
        ...rollSummary,
        username: authStore.user?.username,
        role: authStore.user?.role,
      };
      showDamageHud.value = true;
      sendRollToServer({
        type: 'damage',
        label: `${rollSummary.count}d10`,
        total: rollSummary.total,
        breakdown: `[${rollSummary.dice.join(', ')}]`,
        rollSummary,
      });
      damageHudTimeout = setTimeout(() => {
        showDamageHud.value = false;
      }, 8000);
    }
  } catch (err) {
    console.error('Damage dice roll failed:', err);
  }
}

function clearDice() {
  showDamageHud.value = false;
  showPercentileHud.value = false;
  showInitiativeHud.value = false;
  if (diceBoxInstance) {
    try {
      diceBoxInstance.clear();
    } catch (e) {}
  }
}

function onDocClick(e) {
  if (showDmgMenu.value && dmgMenuRef.value && !dmgMenuRef.value.contains(e.target)) {
    showDmgMenu.value = false;
  }
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
    isRollLogOpen: isRollLogOpen.value,
    showTokenSidebar: showTokenSidebar.value,
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

function toggleTokenSidebar() {
  showTokenSidebar.value = !showTokenSidebar.value;
}

function closeTokenSidebar() {
  showTokenSidebar.value = false;
}

watch([panX, panY, zoomLevel, activeTool, selectedMarkerId, isRollLogOpen, showTokenSidebar], () => {
    persistVttState();
  }
);

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
});

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

function openCreateMapModal() {
  createMapError.value = '';
  newMapForm.name = '';
  newMapForm.map_type = 'world';
  newMapForm.width = 20;
  newMapForm.height = 20;
  newMapForm.grid_size = 40;
  newMapForm.hex_miles = 6;
  newMapForm.background_url = '';
  showCreateMapModal.value = true;
}

async function submitCreateMap() {
  createMapError.value = '';
  try {
    const res = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...newMapForm, map_type: 'world', is_active: 1 }),
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
let onSocketMarkerCreated = null;
let onSocketMarkerUpdated = null;
let onSocketMarkerDeleted = null;
let onSocketRollCreated = null;
let onSocketRollCleared = null;
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

  socket.on('roll:created', onSocketRollCreated = ({ mode, roll }) => {
    if (mode !== 'world') return;
    if (roll.username !== authStore.user?.username) {
      playDiceSound({ isRemote: true });
    }
    if (!rollLog.value.some((r) => r.id === roll.id)) {
      rollLog.value.unshift(roll);
      if (rollLog.value.length > 20) {
        rollLog.value = rollLog.value.slice(0, 20);
      }
    }
    if (roll.userId !== authStore.user?.id) {
      if (roll.type === 'percentile') {
        lastPercentileRoll.value = {
          ...roll.rollSummary,
          username: roll.username,
          role: roll.role,
          total: roll.total,
        };
        showPercentileHud.value = true;
        if (percentileHudTimeout) clearTimeout(percentileHudTimeout);
        percentileHudTimeout = setTimeout(() => {
          showPercentileHud.value = false;
        }, 8000);
      } else if (roll.type === 'damage') {
        lastDamageRoll.value = {
          ...roll,
          dice: Array.isArray(roll.rollSummary?.dice) ? roll.rollSummary.dice : [],
          username: roll.username,
          role: roll.role,
          total: roll.total,
          count: roll.rollSummary?.count || (roll.label ? parseInt(roll.label) : 1),
          breakdown: roll.breakdown,
        };
        showDamageHud.value = true;
        if (damageHudTimeout) clearTimeout(damageHudTimeout);
        damageHudTimeout = setTimeout(() => {
          showDamageHud.value = false;
        }, 8000);
      } else if (roll.type === 'initiative') {
        lastInitiativeRoll.value = {
          ...roll.rollSummary,
          username: roll.username,
          role: roll.role,
        };
        showInitiativeHud.value = true;
        showPercentileHud.value = false;
        showDamageHud.value = false;
        if (initiativeHudTimeout) clearTimeout(initiativeHudTimeout);
        initiativeHudTimeout = setTimeout(() => {
          showInitiativeHud.value = false;
        }, 9000);
      }
    }
  });

  socket.on('roll:cleared', onSocketRollCleared = ({ mode }) => {
    if (mode === 'world') {
      rollLog.value = [];
      showInitiativeHud.value = false;
      clearDice();
    }
  });
}

function cleanupSocketListeners() {
  if (onSocketMapActivated) socket.off('map:activated', onSocketMapActivated);
  if (onSocketMapUpdated) socket.off('map:updated', onSocketMapUpdated);
  if (onSocketMapCreated) socket.off('map:created', onSocketMapCreated);
  if (onSocketMapDeleted) socket.off('map:deleted', onSocketMapDeleted);
  if (onSocketMarkerCreated) socket.off('world-marker:created', onSocketMarkerCreated);
  if (onSocketMarkerUpdated) socket.off('world-marker:updated', onSocketMarkerUpdated);
  if (onSocketMarkerDeleted) socket.off('world-marker:deleted', onSocketMarkerDeleted);
  if (onSocketRollCreated) socket.off('roll:created', onSocketRollCreated);
  if (onSocketRollCleared) socket.off('roll:cleared', onSocketRollCleared);
  if (onSocketPingUpdated) socket.off('ping:updated', onSocketPingUpdated);
  if (onSocketPingCleared) socket.off('ping:cleared', onSocketPingCleared);
  if (onSocketPingsSync) socket.off('pings:sync', onSocketPingsSync);
  if (onSocketConnect) socket.off('connect', onSocketConnect);
}

onMounted(() => {
  fetchRollLog();
  fetchActiveMap();
  if (isGm.value) {
    fetchMapList();
  }
  initDiceBox();
  setupSocketListeners();
  document.addEventListener('click', onDocClick);
});

onBeforeUnmount(() => {
  if (persistStateTimer) {
    clearTimeout(persistStateTimer);
    persistStateTimer = null;
  }
  persistVttStateNow();
  cleanupSocketListeners();
  document.removeEventListener('click', onDocClick);
  if (damageHudTimeout) clearTimeout(damageHudTimeout);
  if (percentileHudTimeout) clearTimeout(percentileHudTimeout);
  if (initiativeHudTimeout) clearTimeout(initiativeHudTimeout);
  if (diceBoxInstance) {
    try {
      diceBoxInstance.clear();
    } catch (e) {}
    diceBoxInstance = null;
    diceBoxInitPromise = null;
  }
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
  border: 1px solid #cecece;
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
  border-color: #cecece;
  color: #cecece;
}

.btn-add-token {
  background-color: #000000 !important;
  border: 1px solid #d0d0d0 !important;
  color: #d0d0d0 !important;
  font-weight: 700;
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
  background: rgba(22, 27, 34, 0.92);
  backdrop-filter: blur(8px);
  padding: 8px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.vtt-toolbar button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 4px;
  text-align: left;
}

.vtt-toolbar > button.active {
  background: #000000;
  color: #cecece;
  font-weight: 600;
  border: 1px solid #cecece;
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

.btn-clear-ping {
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}

.btn-clear-all-pings {
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.3);
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
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: #cecece;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  font-size: 13px;
  cursor: pointer;
}

.btn-dmg-step {
  width: 22px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: #cecece;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
}

.dmg-popover {
  position: absolute;
  top: 0;
  left: calc(100% + 8px);
  width: 200px;
  background: rgba(22, 27, 34, 0.98);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
}

/* Initiative Floating HUD */
.initiative-hud-banner {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(11, 34, 46, 0.95);
  border: 2px solid #b5eeff;
  box-shadow: 0 0 20px rgba(181, 238, 255, 0.45), 0 8px 32px rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  padding: 12px 18px;
  min-width: 290px;
  cursor: pointer;
  z-index: 250;
  backdrop-filter: blur(8px);
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
}
.init-player-die {
  background: #0b222e;
  border: 2px solid #b5eeff;
  color: #b5eeff;
}
.init-player-die .init-val {
  text-shadow: 0 0 10px rgba(181, 238, 255, 0.7);
}
.init-opp-die {
  background: #400a22;
  border: 2px solid #c9abb9;
  color: #c9abb9;
}
.init-opp-die .init-val {
  text-shadow: 0 0 10px rgba(201, 171, 185, 0.7);
}
.init-log-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}
.init-pill-player {
  background: #0b222e;
  color: #b5eeff;
  border: 1px solid #b5eeff;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 700;
}
.init-pill-opp {
  background: #400a22;
  color: #c9abb9;
  border: 1px solid #c9abb9;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 700;
}

.damage-hud-banner {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 4, 9, 0.94);
  border: 2px solid #f29249;
  border-radius: 8px;
  padding: 10px 18px;
  color: #f29249;
  z-index: 250;
}

.percentile-hud-banner {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(34, 56, 74, 0.94);
  border: 2px solid #77d19e;
  border-radius: 8px;
  padding: 10px 18px;
  color: #77d19e;
  z-index: 250;
}

.vtt-canvas-wrapper {
  flex: 1;
  width: 100%;
  height: 100%;
}

.drawer-backdrop,
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

.gm-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 360px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.drawer-header,
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
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
  width: 330px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 5;
}

.section-box {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
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

.linked-scene-box {
  background: rgba(69, 172, 186, 0.1);
  border: 1px solid rgba(69, 172, 186, 0.4);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
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
.world-select {
  background-color: #000000;
  border: 1px solid #cecece;
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 14px;
  color: #cecece;
  width: 100%;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
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
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
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
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  border: none !important;
  box-shadow: 0 0 10px rgba(206, 206, 206, 0.5);
}

.btn-roll-log-pill {
  background: rgba(22, 27, 34, 0.92) !important;
  border: none !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
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
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  border: none !important;
  box-shadow: 0 0 10px rgba(206, 206, 206, 0.5);
}

.roll-log-card {
  width: 290px;
  max-height: 290px;
  background: rgba(22, 27, 34, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
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
  color: #cecece;
  letter-spacing: 0.5px;
  text-shadow: 0 0 6px rgba(206, 206, 206, 0.4);
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
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  font-size: 11px;
  padding: 2px 4px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-roll-log-toggle:hover {
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  text-shadow: 0 0 6px rgba(206, 206, 206, 0.6);
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
  border: 1px solid rgba(16, 185, 129, 0.5);
  color: #34d399;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-toggle-visibility.is-hidden {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(245, 158, 11, 0.6);
  color: #fbbf24;
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
