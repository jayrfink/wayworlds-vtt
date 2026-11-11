<template>
  <div class="vtt-view">
    <!-- VTT Header -->
    <header class="vtt-header">
      <div class="header-left">
        <h2 class="map-title">{{ activeMap ? activeMap.name : 'No Active Map' }}</h2>
        <span v-if="activeMap" class="map-meta">
          {{ activeMap.width }}x{{ activeMap.height }} grid ({{ activeMap.grid_size }}px)
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
        <!-- Stock Adversary Button -->
        <button v-if="isGm" class="btn-gm btn-stock-encounter" @click="showStockAdversaryModal = true" title="Stock Adversaries on Active Map">
          Stock Adversary
        </button>
        <!-- Deploy Vehicle / Mount Button -->
        <button v-if="isGm" class="btn-gm btn-deploy-vehicle" @click="showDeployVehicleModal = true" title="Deploy Mount(s) on Active Map">
          Mount(s)
        </button>
        <!-- GM Narrative Oracle & Arc Engine Button -->
        <button v-if="isGm" class="btn-gm btn-oracle" @click="showOracleDrawer = !showOracleDrawer" title="GM Narrative Oracle & Arc Engine">
          Narrative Oracle
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="vtt-body">
      <!-- Floating Toolbar -->
      <nav class="vtt-toolbar">
        <button
          :class="{ active: activeTool === 'select' }"
          title="Select / Move Token"
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
          :class="{ active: activeTool === 'measure' }"
          title="Distance Ruler"
          @click="activeTool = 'measure'"
        >
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h18M3 8v8M21 8v8M9 10v4M15 10v4"/></svg> Ruler
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
            Size: {{ fogEraser.size }} sq
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
              title="DMG/HEAL/d10s"
            >
              <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 20 12 16.5 6.5 20 8 13.5 3 9l6.5-.5L12 2z"/></svg> d10s ({{ damageDiceCount }}d10)
            </button>
            <button
              class="btn-dmg-step"
              @click.stop="adjustDamageCount(-1)"
              title="Decrease dice"
              :disabled="damageDiceCount <= 1"
            >−</button>
            <button
              class="btn-dmg-step"
              @click.stop="adjustDamageCount(1)"
              title="Increase dice"
              :disabled="damageDiceCount >= 20"
            >+</button>
          </div>

          <div v-if="showDmgMenu" class="dmg-popover">
            <div class="dmg-popover-header">
              <span><svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 20 12 16.5 6.5 20 8 13.5 3 9l6.5-.5L12 2z"/></svg> d10 dice</span>
              <button class="dmg-popover-close" @click.stop="showDmgMenu = false">×</button>
            </div>
            <div class="dmg-stepper">
              <button type="button" class="stepper-btn" @click.stop="adjustDamageCount(-1)" :disabled="damageDiceCount <= 1">−</button>
              <span class="stepper-val">{{ damageDiceCount }}d10</span>
              <button type="button" class="stepper-btn" @click.stop="adjustDamageCount(1)" :disabled="damageDiceCount >= 20">+</button>
            </div>
            <div class="dmg-presets">
              <button
                v-for="n in [1, 2, 3, 4, 5]"
                :key="n"
                type="button"
                class="preset-btn"
                :class="{ active: damageDiceCount === n }"
                @click.stop="damageDiceCount = n"
              >
                {{ n }}d10
              </button>
            </div>
            <button
              type="button"
              class="btn-roll-dmg-action"
              @click.stop="rollDamage"
            >
              <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/></svg> Roll {{ damageDiceCount }}d10
            </button>
            <div v-if="lastDamageRoll" class="dmg-last-roll-card">
              <div class="last-roll-header">Last Roll ({{ lastDamageRoll.count }}d10):</div>
              <div class="last-roll-result">
                <span class="last-roll-total">{{ lastDamageRoll.total }}</span>
                <span class="last-roll-breakdown">[{{ Array.isArray(lastDamageRoll?.dice) ? lastDamageRoll.dice.join(', ') : '' }}]</span>
              </div>
            </div>
          </div>
        </div>

        <button class="btn-tool" @click="clearDice">
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9l6 6M15 9l-6 6"/></svg> Clear Dice
        </button>

        <button class="btn-tool btn-dice-colors" @click="showDiceColorModal = true" title="Configure 3D Dice Colors">
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg> Dice Colors
        </button>
      </nav>

      <!-- Canvas Area -->
      <div
        class="vtt-canvas-wrapper"
        style="position: relative;"
        @dragover.prevent="onMapDragOver"
        @dragleave.prevent="onMapDragLeave"
        @drop.prevent="onMapFileDrop"
      >
        <!-- Map Drop Overlay for GM -->
        <div v-if="isDraggingMapFile && isGm" class="map-drop-zone-overlay">
          <div class="map-drop-zone-content">
            <span class="map-drop-zone-icon">🗺️</span>
            <strong>Drop Map to Create &amp; Fog</strong>
            <small>Image will be uploaded to a new map</small>
          </div>
        </div>

        <!-- Collapsible Die Roll Log HUD -->
        <div class="roll-log-hud">
          <div v-if="!isRollLogOpen" class="roll-log-pill-row">
            <button
              type="button"
              class="btn-roll-log-pill"
              @click="isRollLogOpen = true"
              title="Open Die Roll Log"
            >
              🎲 Log ({{ rollLog.length }}) ▲
            </button>
            <button
              type="button"
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
              <div class="roll-log-title">🎲 Roll Log ({{ rollLog.length }}/20)</div>
              <div class="roll-log-actions">
                <button
                  type="button"
                  class="btn-audio-toggle"
                  @click="toggleAudioMute"
                  :title="isDiceAudioMuted ? 'Unmute dice audio' : 'Mute dice audio'"
                  :aria-label="isDiceAudioMuted ? 'Unmute dice audio' : 'Mute dice audio'"
                  :aria-pressed="!isDiceAudioMuted"
                >
                  {{ isDiceAudioMuted ? '🔇' : '🔊' }}
                </button>
                <button v-if="isGm" type="button" class="btn-roll-log-clear" @click="clearRollLog" :disabled="rollLog.length === 0" title="Clear log">Clear</button>
                <button type="button" class="btn-roll-log-toggle" @click="isRollLogOpen = false" title="Minimize log">▼</button>
              </div>
            </div>
            <div class="roll-log-body">
              <div v-if="rollLog.length === 0" class="roll-log-empty">
                No rolls recorded yet.
              </div>
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
              <span class="hud-dice">(<span class="hud-tens-val">Tens: {{ lastPercentileRoll.tens != null ? lastPercentileRoll.tens * 10 : Math.floor(((lastPercentileRoll.total || 0) % 100) / 10) * 10 }}</span>, <span class="hud-ones-val">Ones: {{ lastPercentileRoll.ones != null ? lastPercentileRoll.ones : (lastPercentileRoll.total || 0) % 10 }}</span>)</span>
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

        <VttCanvas
          :map="activeMap"
          :tokens="tokens"
          :pings="activePingsList"
          :active-tool="activeTool"
          v-model:zoom-level="zoomLevel"
          v-model:pan-x="panX"
          v-model:pan-y="panY"
          :is-gm="isGm"
          :selected-token-id="selectedTokenId"
          :selected-token-ids="selectedTokenIds"
          @token-moved="onTokenMoved"
          @tokens-moved="onTokensMoved"
          @token-selected="onTokenSelected"
          @tokens-selected="onTokensSelected"
          @token-dblclick="onTokenDblClick"
          @tokens-updated="tokens = $event"
          @map-updated="activeMap = $event"
          @ping-update="onPingUpdate"
          @ping-dismiss="onPingDismiss"
          :fog-eraser="fogEraser"
          @fog-changed="onFogChanged"
        />

        <!-- Click-to-Open Adversary Token HUD (Double Click) -->
        <AdversaryTokenHud
          v-if="activeHudToken && (activeHudToken.template || activeHudToken.template_id) && !activeHudToken.vehicle_data"
          :token="activeHudToken"
          :is-gm="isGm"
          @close="openHudTokenId = null"
          @update:token="onAdversaryTokenUpdate"
          @change-token="openHudTokenImageBrowser"
          @roll-attack="onAdversaryRollAttack"
          @roll-damage="onAdversaryRollDamage"
        />

        <!-- Click-to-Open Vehicle Token HUD (Double Click) -->
        <VehicleTokenHud
          v-if="activeHudToken && activeHudToken.vehicle_data"
          :token="activeHudToken"
          :is-gm="isGm"
          @close="openHudTokenId = null"
          @update:token="onVehicleTokenUpdate"
          @roll-control="onVehicleRollControl"
          @roll-damage="onVehicleRollDamage"
        />

        <!-- No Active Map Overlay -->
        <div v-if="!activeMap" class="no-map-overlay">
          <div class="no-map-card">
            <div class="no-map-icon">🗺️</div>
            <h3>No Active Tactical Map</h3>
            <p v-if="isGm">
              You are logged in as <strong>GameMaster</strong>. Create a tactical map or select an existing map to activate it for all players.
            </p>
            <p v-else>
              Logged in as <strong>Player</strong>. Waiting for the GameMaster to activate a tactical map...
            </p>
            <div v-if="isGm" class="no-map-actions">
              <button class="primary" @click="openCreateMapModal">+ Create New Map</button>
              <button class="btn-gm" @click="showGmDrawer = true">Open GM Map Manager</button>
            </div>
          </div>
        </div>
      </div>

      <!-- GM Drawer / Map Manager Modal -->
      <div v-if="showGmDrawer && isGm" class="drawer-backdrop" @click.self="showGmDrawer = false">
        <aside class="gm-drawer">
          <div class="drawer-header">
            <h3>🗺️ GM Map Manager</h3>
            <button class="close-btn" @click="showGmDrawer = false">×</button>
          </div>

          <div class="drawer-content">
            <!-- Create Map Action -->
            <div class="section-actions">
              <button class="primary" @click="openCreateMapModal">+ Create New Map</button>
            </div>

            <!-- Active Map Settings -->
            <div v-if="activeMap" class="section-box">
              <h4>Active Map Settings</h4>
              <div class="form-group">
                <label>Grid Size (px):</label>
                <input
                  type="number"
                  v-model.number="activeMapForm.grid_size"
                  min="20"
                  max="100"
                  @change="updateActiveMapSettings"
                />
              </div>
              <div class="form-group grid-dimensions-group">
                <label>Grid Dimensions (cells):</label>
                <div class="grid-dimensions-row">
                  <input
                    type="number"
                    list="rpg-grid-dimension-options"
                    class="grid-width-input"
                    v-model.number="activeMapForm.width"
                    min="5"
                    max="100"
                    placeholder="Width"
                    @change="updateActiveMapSettings"
                  />
                  <span class="grid-dimensions-x">×</span>
                  <input
                    type="number"
                    list="rpg-grid-dimension-options"
                    class="grid-height-input"
                    v-model.number="activeMapForm.height"
                    min="5"
                    max="100"
                    placeholder="Height"
                    @change="updateActiveMapSettings"
                  />
                  <datalist id="rpg-grid-dimension-options">
                    <option v-for="n in gridDimensionOptions" :key="n" :value="n"></option>
                  </datalist>
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
                  Show Grid Lines (tokens still snap to grid)
                </label>
              </div>
              <div class="form-group">
                <label>Grid Line Thickness (px):</label>
                <input
                  type="number"
                  list="rpg-grid-line-width-options"
                  class="grid-line-width-input"
                  v-model.number="activeMapForm.grid_line_width"
                  min="0.1"
                  max="10"
                  step="0.1"
                  @change="updateActiveMapSettings"
                />
                <datalist id="rpg-grid-line-width-options">
                  <option v-for="n in gridLineWidthOptions" :key="n" :value="n"></option>
                </datalist>
              </div>
              <div class="form-group">
                <label>Grid Color:</label>
                <input
                  type="color"
                  v-model="activeMapForm.grid_color"
                  @change="updateActiveMapSettings"
                />
              </div>
              <div class="form-group">
                <label>Background Preset:</label>
                <select v-model="activeMapForm.preset_bg" @change="updateActiveMapSettings" class="tactical-map-select">
                  <option value="grid_only">Grid Only</option>
                  <option value="ship_deck">Ship Deck</option>
                  <option value="badlands_desert">Badlands Desert</option>
                  <option value="starfield">Starfield</option>
                  <option value="grassland">Grassland</option>
                </select>
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
              <h4>All Maps</h4>
              <div v-if="mapList.length === 0" class="empty-text">No maps created yet.</div>
              <ul class="map-list">
                <li
                  v-for="m in mapList"
                  :key="m.id"
                  :class="{ active: activeMap && activeMap.id === m.id }"
                >
                  <div class="map-info">
                    <strong>{{ m.name }}</strong>
                    <small>{{ m.width }}x{{ m.height }} ({{ m.preset_bg }})</small>
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

      <!-- Token Inspector Sidebar / Drawer -->
      <aside class="token-sidebar" :class="{ 'token-sidebar-rolled-up': isTokenSidebarRolledUp }">
        <div
          class="sidebar-header"
          @click.self="toggleTokenSidebarRollup"
          :title="isTokenSidebarRolledUp ? 'Click to expand Token Inspector (Roll Down)' : 'Click to collapse Token Inspector to Top (Roll Up)'"
          style="cursor: pointer;"
        >
          <h3 @click="toggleTokenSidebarRollup">Token Inspector</h3>
          <button
            type="button"
            class="close-btn"
            @click="closeTokenSidebar"
            :title="isTokenSidebarRolledUp ? 'Expand Token Inspector (Roll Down)' : 'Collapse Token Inspector to Top (Roll Up)'"
            :aria-label="isTokenSidebarRolledUp ? 'Expand Token Inspector' : 'Collapse Token Inspector to Top'"
          >
            {{ isTokenSidebarRolledUp ? '▼' : '▲' }}
          </button>
        </div>

        <div v-show="!isTokenSidebarRolledUp" class="sidebar-content">
          <!-- Token Creation Button -->
          <button class="primary full-width btn-add-token" @click="openAddTokenModal">+ Add New Token</button>

          <!-- Selected Token Details -->
          <div v-if="selectedToken" class="section-box token-inspector">
            <div v-if="selectedTokenIds.length > 1" class="multi-tokens-badge">
              <span>👥 Group Selected ({{ selectedTokenIds.length }} tokens)</span>
            </div>
            <div class="token-title-row">
              <span
                class="token-color-badge"
                :style="{ backgroundColor: selectedToken.color || '#666666' }"
              ></span>
              <h4>{{ selectedToken.name }}</h4>
            </div>

            <!-- Linked Character -->
            <div class="info-row" v-if="selectedToken.character_id">
              <span class="label">Character:</span>
              <span class="value">Linked (ID: {{ selectedToken.character_id }})</span>
            </div>

            <!-- Position -->
            <div class="info-row">
              <span class="label">Position:</span>
              <span class="value">({{ selectedToken.x }}, {{ selectedToken.y }})</span>
            </div>

            <!-- GM Player Visibility Toggle -->
            <div v-if="isGm" class="form-group visibility-section">
              <label>Player Visibility:</label>
              <button
                type="button"
                class="btn-toggle-visibility full-width"
                :class="{ 'is-hidden': selectedToken.layer === 'gm' }"
                @click="toggleTokenVisibility(selectedToken)"
              >
                {{ selectedToken.layer === 'gm' ? '🙈 Hidden from Players (GM Only)' : '👁️ Visible to Players' }}
              </button>
            </div>

            <!-- Status Icons Toggles -->
            <div class="status-section">
              <label>Status Effects:</label>
              <div class="status-toggles">
                <button
                  :class="{ active: isStatusActive('stunned') }"
                  @click="toggleStatus('stunned')"
                >
                  ⚡ Stunned
                </button>
                <button
                  :class="{ active: isStatusActive('unconscious') }"
                  @click="toggleStatus('unconscious')"
                >
                  💀 Unconscious
                </button>
                <button
                  :class="{ active: isStatusActive('wounded') }"
                  @click="toggleStatus('wounded')"
                >
                  🩸 Wounded
                </button>
              </div>
            </div>

            <!-- Token Color & Size -->
            <div class="form-group">
              <label>Ring Color:</label>
              <input
                type="color"
                v-model="selectedTokenForm.color"
                @input="onColorInput"
                @change="onColorChange"
              />
            </div>

            <div class="form-group">
              <label>Size (grid cells):</label>
              <select v-model.number="selectedTokenForm.size" @change="updateSelectedToken" class="size-select">
                <option :value="1">1x1 (Medium/Small)</option>
                <option :value="2">2x2 (Large)</option>
                <option :value="3">3x3 (Huge)</option>
              </select>
            </div>

            <!-- Action Buttons -->
            <div class="inspector-actions">
              <button
                v-if="(selectedToken.template || selectedToken.template_id || selectedToken.vehicle_data) && openHudTokenId !== selectedToken.id"
                type="button"
                class="secondary full-width btn-open-hud-applet"
                style="margin-bottom: 8px;"
                @click="openHudTokenId = selectedToken.id"
              >
                📖 Open Tactical HUD (Double-Click)
              </button>
              <button class="danger full-width btn-delete-token" @click="deleteSelectedToken">Delete Token</button>
            </div>
          </div>

          <div v-else-if="tokens.length > 0" class="section-box">
            <h4>Map Tokens ({{ tokens.length }})</h4>
            <ul class="token-list">
              <li
                v-for="t in tokens"
                :key="t.id"
                :class="{ active: selectedTokenIds.includes(t.id) || selectedTokenId === t.id, 'token-row-hidden': t.layer === 'gm' }"
                @click="onTokenListClick($event, t)"
                @dblclick="onTokenListDblClick(t)"
              >
                <span class="token-dot" :style="{ backgroundColor: t.color || '#666666' }"></span>
                <strong>{{ t.name }}</strong>
                <span v-if="t.layer === 'gm'" class="token-hidden-badge" title="Hidden from Players">HIDDEN</span>
                <small>({{ t.x }}, {{ t.y }})</small>
                <button
                  v-if="isGm"
                  type="button"
                  class="btn-token-list-visibility"
                  :class="{ 'is-hidden': t.layer === 'gm' }"
                  :title="t.layer === 'gm' ? 'Reveal to Players' : 'Hide from Players'"
                  @click.stop="toggleTokenVisibility(t)"
                >
                  {{ t.layer === 'gm' ? '🙈' : '👁️' }}
                </button>
              </li>
            </ul>
          </div>
          <div v-else class="empty-text">
            No tokens on map. Click "+ Add New Token" above to add one.
          </div>
        </div>
      </aside>
    </div>

    <!-- Modal: Create New Map -->
    <div v-if="showCreateMapModal" class="modal-backdrop" @click.self="showCreateMapModal = false">
      <div class="modal-card">
        <h3>Create New Tactical Map</h3>
        <div v-if="createMapError" class="modal-error-banner">⚠️ {{ createMapError }}</div>
        <form @submit.prevent="submitCreateMap">
          <div class="form-group">
            <label>Map Name *</label>
            <input type="text" v-model="newMapForm.name" required placeholder="ex: Forest" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Width (cells)</label>
              <input type="number" v-model.number="newMapForm.width" min="5" max="100" />
            </div>
            <div class="form-group">
              <label>Height (cells)</label>
              <input type="number" v-model.number="newMapForm.height" min="5" max="100" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Grid Size (px)</label>
              <input type="number" v-model.number="newMapForm.grid_size" min="20" max="100" />
            </div>
            <div class="form-group">
              <label>Grid Color</label>
              <input type="color" v-model="newMapForm.grid_color" />
            </div>
          </div>

          <div class="form-group">
            <label>Background Preset</label>
            <select v-model="newMapForm.preset_bg" class="tactical-map-select">
              <option value="grid_only">Grid Only</option>
              <option value="ship_deck">Ship Deck</option>
              <option value="badlands_desert">Badlands Desert</option>
              <option value="starfield">Starfield</option>
              <option value="grassland">Grassland</option>
            </select>
          </div>

          <div class="form-group">
            <label>Custom Image URL (Optional)</label>
            <input type="text" v-model="newMapForm.background_url" placeholder="Image URL or upload file" />
            <div class="map-bg-btn-row">
              <input type="file" accept="image/*" @change="e => uploadMapImage(e, newMapForm)" class="map-file-input" />
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
            <button type="submit" class="btn-add-token-submit">Create Map</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Add Token -->
    <div v-if="showAddTokenModal" class="modal-backdrop" @click.self="showAddTokenModal = false">
      <div class="modal-card">
        <h3>Add Token to Map</h3>
        <div v-if="createTokenError" class="modal-error-banner">⚠️ {{ createTokenError }}</div>
        <form @submit.prevent="submitAddToken">
          <div class="form-group">
            <label>Link to Character Sheet (Optional)</label>
            <select v-model="selectedCharacterId" @change="onCharacterSelected" class="character-sheet-select">
              <option :value="null">-- None (Custom Token) --</option>
              <option v-for="c in characters" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.race || 'Character' }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Token Name *</label>
            <input type="text" v-model="newTokenForm.name" required placeholder="e.g. Captain UPEX" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Ring Color</label>
              <input type="color" v-model="newTokenForm.color" />
            </div>
            <div class="form-group">
              <label>Size (Cells)</label>
              <select v-model.number="newTokenForm.size" class="character-sheet-select">
                <option :value="1">1x1 (Medium)</option>
                <option :value="2">2x2 (Large)</option>
                <option :value="3">3x3 (Huge)</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Start X</label>
              <input type="number" v-model.number="newTokenForm.x" min="0" />
            </div>
            <div class="form-group">
              <label>Start Y</label>
              <input type="number" v-model.number="newTokenForm.y" min="0" />
            </div>
          </div>

          <div v-if="isGm" class="form-group spawn-hidden-row">
            <label class="spawn-hidden-label">
              <input type="checkbox" v-model="newTokenForm.is_hidden" class="spawn-hidden-checkbox" />
              <span>🙈 Start Hidden from Players (GM Layer)</span>
            </label>
          </div>

          <div class="form-group avatar-upload-section">
            <label>Token Image / Avatar (Optional)</label>
            <div class="avatar-upload-box">
              <div class="avatar-preview-wrapper" :style="{ borderColor: newTokenForm.color || '#666666' }" title="Token Image Preview">
                <img v-if="newTokenForm.avatar_url" :src="newTokenForm.avatar_url" alt="Token Preview" class="token-avatar-preview" />
                <span v-else class="avatar-empty-placeholder">No Image</span>
              </div>
              <div class="avatar-controls">
                <div class="file-btn-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    @change="uploadImage"
                    class="token-file-input"
                    ref="tokenFileInput"
                    :disabled="uploadingAvatar"
                  />
                  <span v-if="uploadingAvatar" class="uploading-spinner">Uploading...</span>
                  <button type="button" class="btn-browse-avatar" @click="openTokenImageBrowser">Browse Uploads</button>
                  <button v-if="newTokenForm.avatar_url" type="button" class="btn-clear-avatar" @click="clearAvatar">Remove</button>
                </div>
                <input
                  type="text"
                  v-model="newTokenForm.avatar_url"
                  placeholder="Or enter image URL (https://...)"
                  class="avatar-url-input"
                />
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-modal-cancel" @click="showAddTokenModal = false">Cancel</button>
            <button type="submit" class="btn-add-token-submit">Add Token</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Stock Adversary Modal -->
    <StockAdversaryModal
      v-model="showStockAdversaryModal"
      :active-map="activeMap"
      :is-gm="isGm"
      :selected-image-url="adversaryImageSelectedUrl"
      @browse-image="openAdversaryImageBrowser"
      @spawned="onAdversariesSpawned"
    />

    <!-- Deploy Vehicle Modal -->
    <DeployVehicleModal
      v-model="showDeployVehicleModal"
      :default-x="deployVehicleCoords.x"
      :default-y="deployVehicleCoords.y"
      :is-gm="isGm"
      @deploy="onDeployVehicle"
    />

    <!-- GM Narrative Oracle & Arc Engine Drawer -->
    <GmOracleDrawer
      v-if="isGm"
      :open="showOracleDrawer"
      :is-gm="isGm"
      :socket="socket"
      @close="showOracleDrawer = false"
      @shared-to-chat="onOracleSharedToChat"
    />

    <!-- Image Browser Modal -->
    <ImageBrowserModal
      v-model="showImageBrowser"
      :title="imageBrowserTitle"
      :current-image="currentBrowserImage"
      @select="onImageSelected"
    />

    <!-- Dice Colors Configuration Modal -->
    <DiceColorModal
      v-model="showDiceColorModal"
      @change="onDiceColorsChanged"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import VttCanvas from '../components/VttCanvas.vue';
import ImageBrowserModal from '../components/ImageBrowserModal.vue';
import AdversaryTokenHud from '../components/AdversaryTokenHud.vue';
import StockAdversaryModal from '../components/StockAdversaryModal.vue';
import VehicleTokenHud from '../components/VehicleTokenHud.vue';
import DeployVehicleModal from '../components/DeployVehicleModal.vue';
import GmOracleDrawer from '../components/oracle/GmOracleDrawer.vue';
import DiceColorModal from '../components/DiceColorModal.vue';
import { useAuthStore } from '../stores/auth.js';
import { socket } from '../services/socket.js';
import { calculateDamageRoll, calculatePercentileRoll, calculateInitiativeRoll, applySettledSheetRoll } from '../utils/diceUtils.js';
import { executeQueuedDiceRoll, abortCurrentRoll } from '../utils/safeDiceRoller.js';
import { diceRollQueue } from '../utils/diceRollQueue.js';
import { registerVtt3dRollResponder, consumePendingSheetVttRoll } from '../utils/sheetDiceBridge.js';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';
import { playDiceSound, toggleMute as toggleDiceMute, isMuted as isDiceMuted } from '../services/diceAudio.js';
import { getSavedDiceColors, saveDiceColors, getContrastingNumberColor } from '../utils/diceColorManager.js';


const authStore = useAuthStore();
const isGm = computed(() => authStore.user?.role === 'GameMaster');

const isDiceAudioMuted = ref(isDiceMuted());

function toggleAudioMute() {
  const nextState = toggleDiceMute();
  isDiceAudioMuted.value = nextState;
}

const initialVttState = getUserState(getSafeUserId(), 'rpgVtt', {
  panX: 50,
  panY: 50,
  zoomLevel: 1.0,
  activeTool: 'select',
  selectedTokenId: null,
  isRollLogOpen: false,
  showTokenSidebar: true,
  isTokenSidebarRolledUp: false,
});


// Dice state
let diceBoxInstance = null;
let diceBoxInitPromise = null;

async function initDiceBox() {
  if (diceBoxInstance) return diceBoxInstance;
  if (!diceBoxInitPromise) {
    diceBoxInitPromise = (async () => {
      const { default: DiceBox } = await import('@3d-dice/dice-box');
      const box = new DiceBox({
        id: "dice-canvas",
        container: "#dice-box",
        assetPath: '/assets/dice-box/',
        theme: 'default',
        scale: 5,
        offscreen: false
      });
      await box.init();
      diceBoxInstance = box;
      return box;
    })().catch((err) => {
      console.warn('DiceBox init failed:', err);
      diceBoxInitPromise = null;
      return null;
    });
  }
  return diceBoxInitPromise;
}

async function getReadyDiceBox() {
  return await initDiceBox();
}

const showDiceColorModal = ref(false);
const activeDiceColors = ref(getSavedDiceColors());

watch(
  () => authStore.user?.preferences?.dice_colors,
  (newDiceColors) => {
    if (newDiceColors && typeof newDiceColors === 'object') {
      saveDiceColors(newDiceColors);
      activeDiceColors.value = getSavedDiceColors();
    }
  },
  { immediate: true, deep: true }
);

function onDiceColorsChanged(newColors) {
  activeDiceColors.value = { ...newColors };
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

const RPG_ROLL_LOG_KEY = 'ww_vtt_rpg_roll_log';
const rollLog = ref([]);
const isRollLogOpen = ref(false);
isRollLogOpen.value = !!initialVttState.isRollLogOpen;

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
    const res = await fetch('/api/rolls?mode=rpg', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      rollLog.value = data;
    }
  } catch (err) {
    console.error('Failed to fetch RPG roll log:', err);
  }
}

async function sendRollToServer(rollData) {
  try {
    const res = await fetch('/api/rolls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        mode: 'rpg',
        type: rollData.type,
        label: rollData.label,
        total: rollData.total,
        breakdown: rollData.breakdown,
        rollSummary: rollData.rollSummary
      })
    });
    if (res.ok) {
      const savedRoll = await res.json();
      if (!rollLog.value.some(r => r.id === savedRoll.id)) {
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

function addRollToLog(entry) {
  sendRollToServer(entry);
}

async function clearRollLog() {
  if (!isGm.value) return;
  try {
    const res = await fetch('/api/rolls?mode=rpg', {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      rollLog.value = [];
      clearDice();
    }
  } catch (err) {
    console.error('Failed to clear RPG roll log on server:', err);
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
      { sides: 10, theme: 'custom-init-player', themeColor: activeDiceColors.value.initiativePlayer, qty: 1 },
      { sides: 10, theme: 'custom-init-opp', themeColor: activeDiceColors.value.initiativeOpp, qty: 1 }
    ]);
    const initSummary = calculateInitiativeRoll(results);
    if (initSummary.valid) {
      const rollData = {
        ...initSummary,
        username: authStore.user?.username,
        role: authStore.user?.role
      };
      lastInitiativeRoll.value = rollData;
      showInitiativeHud.value = true;

      sendRollToServer({
        type: 'initiative',
        label: '⚡ Combat Initiative',
        total: initSummary.playerRoll,
        breakdown: `Players: ${initSummary.playerRoll} vs Opposition: ${initSummary.oppRoll}`,
        rollSummary: rollData
      });

      initiativeHudTimeout = setTimeout(() => {
        showInitiativeHud.value = false;
      }, 9000);
    }
  } catch (err) {
    console.error('Initiative roll failed:', err);
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
      { sides: 10, theme: 'custom-tens', themeColor: activeDiceColors.value.percentileTens, qty: 1 }, // Tens
      { sides: 10, theme: 'custom-ones', themeColor: activeDiceColors.value.percentileOnes, qty: 1 }  // Ones
    ]);
    const rollSummary = calculatePercentileRoll(results);
    if (rollSummary.valid) {
      lastPercentileRoll.value = {
        ...rollSummary,
        username: authStore.user?.username,
        role: authStore.user?.role
      };
      showPercentileHud.value = true;
      sendRollToServer({
        type: 'percentile',
        label: 'd%',
        total: rollSummary.total,
        breakdown: `[Tens: ${rollSummary.tens * 10}, Ones: ${rollSummary.ones}]`,
        rollSummary
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
      { sides: 10, theme: 'custom-dmg', themeColor: activeDiceColors.value.damage, qty: damageDiceCount.value }
    ]);
    const rollSummary = calculateDamageRoll(results);
    if (rollSummary.count > 0) {
      lastDamageRoll.value = {
        ...rollSummary,
        username: authStore.user?.username,
        role: authStore.user?.role
      };
      showDamageHud.value = true;
      sendRollToServer({
        type: 'damage',
        label: `${rollSummary.count}d10`,
        total: rollSummary.total,
        breakdown: `[${rollSummary.dice.join(', ')}]`,
        rollSummary
      });
      damageHudTimeout = setTimeout(() => {
        showDamageHud.value = false;
      }, 8000);
    }
  } catch (err) {
    console.error('Damage dice roll failed:', err);
  }
}

async function clearDice() {
  // 1. Immediately reset HUD states and timers synchronously
  showPercentileHud.value = false;
  showDamageHud.value = false;
  showInitiativeHud.value = false;
  if (percentileHudTimeout) {
    clearTimeout(percentileHudTimeout);
    percentileHudTimeout = null;
  }
  if (damageHudTimeout) {
    clearTimeout(damageHudTimeout);
    damageHudTimeout = null;
  }
  if (initiativeHudTimeout) {
    clearTimeout(initiativeHudTimeout);
    initiativeHudTimeout = null;
  }
  showDmgMenu.value = false;

  // 2. Abort any active in-flight roll animation and clear the queue
  abortCurrentRoll();
  diceRollQueue.clear();

  // 3. Clear existing diceBox instance without awaiting asynchronous re-initialization
  if (diceBoxInstance) {
    try {
      diceBoxInstance.clear();
    } catch (err) {
      console.warn('Failed to clear dice box:', err);
    }
  }

  // 4. Force-clear the visual canvas element if present so no frozen dice meshes remain
  const canvas = diceBoxInstance?.canvas || document.querySelector('#dice-canvas') || document.querySelector('#dice-box canvas');
  if (canvas && typeof canvas.getContext === 'function') {
    try {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      }
    } catch (e) {}
  }
}

function onDocClick(e) {
  if (showDmgMenu.value && dmgMenuRef.value && !dmgMenuRef.value.contains(e.target)) {
    showDmgMenu.value = false;
  }
}

// Map & Token state
const activeMap = ref(null);
const tokens = ref([]);
const mapList = ref([]);
const characters = ref([]);

// UI State
const panX = ref(initialVttState.panX ?? 50);
const panY = ref(initialVttState.panY ?? 50);
const activeTool = ref(initialVttState.activeTool || 'select');
const zoomLevel = ref(initialVttState.zoomLevel ?? 1.0);
const selectedTokenId = ref(initialVttState.selectedTokenId ?? null);
const selectedTokenIds = ref(selectedTokenId.value ? [selectedTokenId.value] : []);

// Tactical Pings State
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

// Fog of War (GM controls; fog_enabled / fog_data live on the map record)
const fogEraser = reactive({ shape: 'circle', size: 3 });
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
  if (typeof window !== 'undefined' && !window.confirm('Cover the entire map in fog again?')) return;
  saveFogPatch({ fog_data: [] });
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
  saveUserState(getSafeUserId(), 'rpgVtt', {
    panX: panX.value,
    panY: panY.value,
    zoomLevel: zoomLevel.value,
    activeTool: activeTool.value,
    selectedTokenId: selectedTokenId.value,
    isRollLogOpen: isRollLogOpen.value,
    showTokenSidebar: showTokenSidebar.value,
    isTokenSidebarRolledUp: isTokenSidebarRolledUp.value,
  });
}

function persistVttState() {
  if (persistStateTimer) {
    clearTimeout(persistStateTimer);
  }
  persistStateTimer = setTimeout(() => {
    persistStateTimer = null;
    persistVttStateNow();
  }, 150);
}

const showGmDrawer = ref(false);
const showOracleDrawer = ref(false);

function onOracleSharedToChat(shared) {
  if (shared?.text) {
    const oracleEntry = {
      id: 'oracle_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      mode: 'rpg',
      username: shared.sender || 'Game Master',
      role: 'GameMaster',
      type: 'initiative',
      label: 'Oracle Chronicle',
      total: 0,
      breakdown: shared.text,
      rollSummary: {
        title: 'Oracle Chronicle',
        text: shared.text,
      },
      createdAt: shared.timestamp || new Date().toISOString(),
    };
    rollLog.value.unshift(oracleEntry);
    if (rollLog.value.length > 20) {
      rollLog.value = rollLog.value.slice(0, 20);
    }
  }
}
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

watch([panX, panY, zoomLevel, activeTool, selectedTokenId, isRollLogOpen, showTokenSidebar, isTokenSidebarRolledUp], () => {
  persistVttState();
});

const showCreateMapModal = ref(false);
const createMapError = ref('');
const showAddTokenModal = ref(false);
const createTokenError = ref('');
const showStockAdversaryModal = ref(false);
const showDeployVehicleModal = ref(false);
const deployVehicleCoords = ref({ x: 0, y: 0 });

watch(showDeployVehicleModal, (isOpen) => {
  if (isOpen) {
    deployVehicleCoords.value = getEmptyCenterCoords();
  }
});
const adversaryImageSelectedUrl = ref('');
const adversaryBrowserCurrentImage = ref('');
const showImageBrowser = ref(false);
const imageBrowserTarget = ref('token');
const tokenFileInput = ref(null);
const uploadingAvatar = ref(false);

// Forms
const gridLineWidthOptions = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];
const gridDimensionOptions = [10, 15, 20, 25, 30, 40, 50, 60, 80, 100];

const activeMapForm = reactive({
  width: 20,
  height: 20,
  grid_line_width: 1,
  grid_visible: true,
  grid_size: 40,
  grid_color: '#333333',
  preset_bg: 'grid_only',
  background_url: '',
});

const newMapForm = reactive({
  name: '',
  map_type: 'rpg',
  width: 20,
  height: 20,
  grid_size: 40,
  grid_color: '#333333',
  preset_bg: 'grid_only',
  background_url: '',
  fog_all: false,
});

const selectedCharacterId = ref(null);
const newTokenForm = reactive({
  name: '',
  color: '#666666',
  avatar_url: '',
  x: 0,
  y: 0,
  size: 1,
  is_hidden: false,
});

const selectedTokenForm = reactive({
  color: '#666666',
  size: 1,
  status_effects: [],
});

const imageBrowserTitle = computed(() => {
  if (imageBrowserTarget.value === 'active_map' || imageBrowserTarget.value === 'new_map') {
    return 'Select Map Background Image';
  }
  if (imageBrowserTarget.value === 'adversary') {
    return 'Select Adversary Portrait Image';
  }
  return 'Select Token Image';
});

const currentBrowserImage = computed(() => {
  if (imageBrowserTarget.value === 'active_map') return activeMapForm.background_url;
  if (imageBrowserTarget.value === 'new_map') return newMapForm.background_url;
  if (imageBrowserTarget.value === 'adversary' || imageBrowserTarget.value === 'hud_adversary_token') {
    return adversaryBrowserCurrentImage.value || adversaryImageSelectedUrl.value;
  }
  return newTokenForm.avatar_url;
});

function openTokenImageBrowser() {
  imageBrowserTarget.value = 'token';
  showImageBrowser.value = true;
}

function openAdversaryImageBrowser(initialUrl = '') {
  adversaryImageSelectedUrl.value = '';
  adversaryBrowserCurrentImage.value = typeof initialUrl === 'string' && initialUrl ? initialUrl : '/uploads/tokens/placeholder.png';
  imageBrowserTarget.value = 'adversary';
  showImageBrowser.value = true;
}

function openHudTokenImageBrowser(token) {
  adversaryImageSelectedUrl.value = '';
  adversaryBrowserCurrentImage.value = token?.avatar_url || token?.template?.token_image_path || '/uploads/tokens/placeholder.png';
  imageBrowserTarget.value = 'hud_adversary_token';
  showImageBrowser.value = true;
}

function onAdversariesSpawned(result) {
  if (result?.tokens && Array.isArray(result.tokens)) {
    for (const t of result.tokens) {
      if (!tokens.value.some((existing) => existing.id === t.id)) {
        tokens.value.push(t);
      }
    }
  }
}

function openMapImageBrowser(target) {
  imageBrowserTarget.value = target;
  showImageBrowser.value = true;
}

const openHudTokenId = ref(null);
const activeHudToken = computed(() => {
  if (!openHudTokenId.value) return null;
  return tokens.value.find((t) => t.id === openHudTokenId.value) || null;
});

const selectedToken = computed(() => {
  if (!selectedTokenId.value) return null;
  return tokens.value.find((t) => t.id === selectedTokenId.value) || null;
});

// Watch selectedToken to sync reactive form (Bugs 12 & 31)
watch(selectedToken, (newToken) => {
  if (newToken) {
    selectedTokenForm.color = newToken.color || '#666666';
    selectedTokenForm.size = newToken.size || 1;
    let effects = newToken.status_effects;
    if (typeof effects === 'string') {
      try {
        effects = JSON.parse(effects);
      } catch {
        effects = [];
      }
    }
    selectedTokenForm.status_effects = Array.isArray(effects) ? [...effects] : [];
  } else {
    selectedTokenForm.color = '#666666';
    selectedTokenForm.size = 1;
    selectedTokenForm.status_effects = [];
  }
});

// Watch activeMap to update local settings form
watch(activeMap, (map) => {
  if (map) {
    activeMapForm.width = map.width || 20;
    activeMapForm.height = map.height || 20;
    activeMapForm.grid_line_width = map.grid_line_width || 1;
    activeMapForm.grid_visible = map.grid_visible !== false && map.grid_visible !== 0;
    activeMapForm.grid_size = map.grid_size || 40;
    activeMapForm.grid_color = map.grid_color || '#333333';
    activeMapForm.preset_bg = map.preset_bg || 'grid_only';
    activeMapForm.background_url = map.background_url || '';
  }
});

// API Calls
async function fetchActiveMap() {
  try {
    const res = await fetch('/api/maps/active?type=rpg', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      activeMap.value = data.map;
      tokens.value = data.tokens || [];
    }
  } catch (err) {
    console.error('Failed to fetch active map:', err);
  }
}

async function fetchMapList() {
  try {
    const res = await fetch('/api/maps?type=rpg', { credentials: 'include' });
    if (res.ok) {
      mapList.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch maps:', err);
  }
}

async function fetchCharacters() {
  try {
    const res = await fetch('/api/characters', { credentials: 'include' });
    if (res.ok) {
      characters.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch characters:', err);
  }
}

// Map Actions
async function activateMap(mapId) {
  try {
    const res = await fetch(`/api/maps/${mapId}/activate`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      activeMap.value = data.map;
      tokens.value = data.tokens || [];
      selectedTokenId.value = null;
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
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback || 20;
  return Math.min(100, Math.max(5, n));
}

async function updateActiveMapSettings() {
  if (!activeMap.value) return;
  try {
    const res = await fetch(`/api/maps/${activeMap.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        background_url: activeMapForm.background_url,
        width: clampGridDimension(activeMapForm.width, activeMap.value.width),
        height: clampGridDimension(activeMapForm.height, activeMap.value.height),
        grid_size: activeMapForm.grid_size,
        grid_line_width: clampGridLineWidth(activeMapForm.grid_line_width),
        grid_visible: Boolean(activeMapForm.grid_visible),
        grid_color: activeMapForm.grid_color,
        preset_bg: activeMapForm.preset_bg,
      }),
    });
    if (res.ok) {
      activeMap.value = await res.json();
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
    } else {
      console.error('Upload failed');
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
  newMapForm.name = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : 'New Tactical Map';
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
  newMapForm.map_type = 'rpg';
  newMapForm.width = 20;
  newMapForm.height = 20;
  newMapForm.grid_size = 40;
  newMapForm.grid_color = '#333333';
  newMapForm.preset_bg = 'grid_only';
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
    console.error('Failed to create map:', err);
    createMapError.value = err.message || 'Error creating map';
  }
}

async function deleteMap(mapId) {
  if (!confirm('Are you sure you want to delete this map?')) return;
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

// Token Actions
function getEmptyCenterCoords() {
  const mapW = activeMap.value?.width || 20;
  const mapH = activeMap.value?.height || 20;
  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);

  const occupied = new Set((tokens.value || []).map((t) => `${t.x},${t.y}`));

  const initialRadius = 2;
  const initialCandidates = [];
  for (let dx = -initialRadius; dx <= initialRadius; dx++) {
    for (let dy = -initialRadius; dy <= initialRadius; dy++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
        if (!occupied.has(`${x},${y}`)) {
          initialCandidates.push({ x, y });
        }
      }
    }
  }

  if (initialCandidates.length > 0) {
    const idx = Math.floor(Math.random() * initialCandidates.length);
    return initialCandidates[idx];
  }

  const maxRadius = Math.max(mapW, mapH);
  for (let r = initialRadius + 1; r <= maxRadius; r++) {
    const ringCandidates = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
          if (!occupied.has(`${x},${y}`)) {
            ringCandidates.push({ x, y });
          }
        }
      }
    }
    if (ringCandidates.length > 0) {
      const idx = Math.floor(Math.random() * ringCandidates.length);
      return ringCandidates[idx];
    }
  }

  return { x: cx, y: cy };
}

function openAddTokenModal() {
  createTokenError.value = '';
  selectedCharacterId.value = null;
  newTokenForm.name = '';
  newTokenForm.color = '#666666';
  newTokenForm.avatar_url = '';
  const spawn = getEmptyCenterCoords();
  newTokenForm.x = spawn.x;
  newTokenForm.y = spawn.y;
  newTokenForm.size = 1;
  newTokenForm.is_hidden = false;
  if (tokenFileInput.value) tokenFileInput.value.value = '';
  showAddTokenModal.value = true;
}

async function uploadImage(event) {
  const file = event.target?.files?.[0];
  if (!file) return;
  uploadingAvatar.value = true;
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
      newTokenForm.avatar_url = data.url || data;
    } else {
      console.error('Failed to upload image: status', res.status);
    }
  } catch (err) {
    console.error('Failed to upload image:', err);
  } finally {
    uploadingAvatar.value = false;
  }
}

function clearAvatar() {
  newTokenForm.avatar_url = '';
  if (tokenFileInput.value) tokenFileInput.value.value = '';
}

async function onImageSelected(url) {
  if (imageBrowserTarget.value === 'active_map') {
    activeMapForm.background_url = url;
    updateActiveMapSettings();
  } else if (imageBrowserTarget.value === 'new_map') {
    newMapForm.background_url = url;
  } else if (imageBrowserTarget.value === 'adversary') {
    adversaryImageSelectedUrl.value = url;
  } else if (imageBrowserTarget.value === 'hud_adversary_token') {
    const hudTok = activeHudToken.value;
    if (hudTok) {
      const tplId = hudTok.template_id || hudTok.template?.template_id;
      if (tplId) {
        try {
          await fetch(`/api/adversaries/${encodeURIComponent(tplId)}/token`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ source_image_url: url, apply_all_tiers: true }),
          });
        } catch (err) {
          console.error('Failed to update adversary template token from HUD:', err);
        }
      } else {
        onAdversaryTokenUpdate({ ...hudTok, avatar_url: url });
      }
    }
  } else {
    newTokenForm.avatar_url = url;
  }
}

function onCharacterSelected() {
  if (!selectedCharacterId.value) return;
  const char = characters.value.find((c) => c.id === selectedCharacterId.value);
  if (char) {
    newTokenForm.name = char.name;
    if (char.avatar_url) newTokenForm.avatar_url = char.avatar_url;
  }
}

async function submitAddToken() {
  createTokenError.value = '';
  if (!activeMap.value) {
    createTokenError.value = 'No active map selected';
    return;
  }
  try {
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        map_id: activeMap.value.id,
        character_id: selectedCharacterId.value,
        name: newTokenForm.name,
        color: newTokenForm.color,
        avatar_url: newTokenForm.avatar_url,
        x: newTokenForm.x,
        y: newTokenForm.y,
        size: newTokenForm.size,
        layer: (isGm.value && newTokenForm.is_hidden) ? 'gm' : 'character',
      }),
    });
    if (res.ok) {
      const created = await res.json();
      showAddTokenModal.value = false;
      const exists = tokens.value.some((t) => t.id === created.id);
      if (!exists) tokens.value.push(created);
      selectedTokenId.value = created.id;
      showTokenSidebar.value = true;
      isTokenSidebarRolledUp.value = false;
      persistVttState();
    } else {
      const data = await res.json().catch(() => ({}));
      createTokenError.value = data.error || `Failed to create token (HTTP ${res.status})`;
    }
  } catch (err) {
    console.error('Failed to create token:', err);
    createTokenError.value = err.message || 'Error creating token';
  }
}

let colorDebounceTimer = null;

async function onTokenMoved(payload) {
  if (Array.isArray(payload)) {
    return onTokensMoved(payload);
  }
  const { id, x, y } = payload;
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
  }
  const currentToken = tokens.value.find((t) => t.id === id);
  const color = (selectedToken.value && selectedToken.value.id === id)
    ? selectedTokenForm.color
    : (currentToken?.color || '#666666');

  if (currentToken) {
    currentToken.x = x;
    currentToken.y = y;
    currentToken.color = color;
  }

  try {
    const res = await fetch(`/api/tokens/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ x, y, color }),
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = tokens.value.findIndex((t) => t.id === id);
      if (idx !== -1) {
        tokens.value[idx] = updated;
        tokens.value = [...tokens.value];
      }
    }
  } catch (err) {
    console.error('Failed to move token:', err);
  }
}

async function onTokensMoved(movedList) {
  if (!Array.isArray(movedList) || movedList.length === 0) return;
  if (movedList.length === 1) {
    return onTokenMoved(movedList[0]);
  }
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
  }

  // 1. Optimistically update local positions immediately
  for (const item of movedList) {
    const cur = tokens.value.find((t) => t.id === item.id);
    if (cur) {
      cur.x = item.x;
      cur.y = item.y;
    }
  }
  tokens.value = [...tokens.value];

  // 2. Persist in parallel
  try {
    const updatePromises = movedList.map(async (item) => {
      const cur = tokens.value.find((t) => t.id === item.id);
      const color = (selectedToken.value && selectedToken.value.id === item.id)
        ? selectedTokenForm.color
        : (cur?.color || '#666666');
      const res = await fetch(`/api/tokens/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ x: item.x, y: item.y, color }),
      });
      if (res.ok) {
        const updated = await res.json();
        const idx = tokens.value.findIndex((t) => t.id === item.id);
        if (idx !== -1) {
          tokens.value[idx] = updated;
        }
      }
    });
    await Promise.allSettled(updatePromises);
    tokens.value = [...tokens.value];
  } catch (err) {
    console.error('Failed to move tokens group:', err);
  }
}

function onTokenSelected(token) {
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
    updateSelectedToken();
  }
  selectedTokenId.value = token ? token.id : null;
  if (!token) {
    selectedTokenIds.value = [];
  } else if (!selectedTokenIds.value.includes(token.id)) {
    selectedTokenIds.value = [token.id];
  }
  if (token) {
    persistVttState();
  }
}

function onTokensSelected(tokenList) {
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
    updateSelectedToken();
  }
  if (!Array.isArray(tokenList) || tokenList.length === 0) {
    selectedTokenId.value = null;
    selectedTokenIds.value = [];
  } else {
    selectedTokenIds.value = tokenList.map((t) => (typeof t === 'object' && t ? t.id : t));
    selectedTokenId.value = selectedTokenIds.value[0] || null;
  }
  persistVttState();
}

function onTokenListClick(e, token) {
  const isShift = Boolean(e && (e.shiftKey || e.ctrlKey || e.metaKey));
  if (isShift) {
    if (selectedTokenIds.value.includes(token.id)) {
      selectedTokenIds.value = selectedTokenIds.value.filter((id) => id !== token.id);
      selectedTokenId.value = selectedTokenIds.value[0] || null;
    } else {
      selectedTokenIds.value = [...selectedTokenIds.value, token.id];
      selectedTokenId.value = token.id;
    }
    persistVttState();
  } else {
    onTokenSelected(token);
  }
}

function onTokenDblClick(token) {
  if (!token) return;
  selectedTokenId.value = token.id;
  persistVttState();
  if (token.template || token.template_id || token.vehicle_data) {
    openHudTokenId.value = token.id;
  }
}

function onTokenListDblClick(token) {
  if (!token) return;
  selectedTokenId.value = token.id;
  persistVttState();
  if (token.template || token.template_id || token.vehicle_data) {
    openHudTokenId.value = token.id;
  }
}

function onColorInput() {
  if (selectedToken.value) {
    selectedToken.value.color = selectedTokenForm.color;
  }
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
  }
  colorDebounceTimer = setTimeout(() => {
    colorDebounceTimer = null;
    updateSelectedToken();
  }, 250);
}

function onColorChange() {
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
  }
  updateSelectedToken();
}

async function updateSelectedToken() {
  const token = selectedToken.value;
  if (!token) return;
  const tokenId = token.id;
  const newColor = selectedTokenForm.color;
  token.color = newColor;

  try {
    const res = await fetch(`/api/tokens/${tokenId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        color: newColor,
        size: selectedTokenForm.size,
        status_effects: selectedTokenForm.status_effects,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = tokens.value.findIndex((t) => t.id === updated.id);
      if (idx !== -1) tokens.value[idx] = updated;
    }
  } catch (err) {
    console.error('Failed to update token:', err);
  }
}

function isStatusActive(statusKey) {
  return selectedTokenForm.status_effects.includes(statusKey);
}

function toggleStatus(statusKey) {
  const idx = selectedTokenForm.status_effects.indexOf(statusKey);
  if (idx === -1) {
    selectedTokenForm.status_effects.push(statusKey);
  } else {
    selectedTokenForm.status_effects.splice(idx, 1);
  }
  updateSelectedToken();
}

async function toggleTokenVisibility(token) {
  if (!isGm.value || !token || !token.id) return;
  const nextLayer = token.layer === 'gm' ? 'character' : 'gm';
  const idx = tokens.value.findIndex((t) => t.id === token.id);
  if (idx !== -1) {
    tokens.value[idx] = { ...tokens.value[idx], layer: nextLayer };
    tokens.value = [...tokens.value];
  }
  try {
    const res = await fetch(`/api/tokens/${token.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ layer: nextLayer }),
    });
    if (res.ok) {
      const updated = await res.json();
      const targetIdx = tokens.value.findIndex((t) => t.id === updated.id);
      if (targetIdx !== -1) {
        tokens.value[targetIdx] = updated;
        tokens.value = [...tokens.value];
      }
    }
  } catch (err) {
    console.error('Failed to toggle token visibility:', err);
  }
}

async function onAdversaryTokenUpdate(updatedToken) {
  if (!updatedToken || !updatedToken.id) return;
  const idx = tokens.value.findIndex((t) => t.id === updatedToken.id);
  if (idx !== -1) {
    tokens.value[idx] = { ...tokens.value[idx], ...updatedToken };
  }

  try {
    const res = await fetch(`/api/tokens/${updatedToken.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        current_hp: updatedToken.current_hp,
        max_hp: updatedToken.max_hp,
        ess_current: updatedToken.ess_current,
        conditions: updatedToken.conditions,
        layer: updatedToken.layer,
      }),
    });
    if (res.ok) {
      const serverToken = await res.json();
      if (idx !== -1) tokens.value[idx] = serverToken;
    }
  } catch (err) {
    console.error('Failed to update adversary token:', err);
  }
}

async function onAdversaryRollAttack({ action, token }) {
  playDiceSound({ isRemote: false });
  const diceBox = await getReadyDiceBox();
  showPercentileHud.value = false;
  showDamageHud.value = false;
  if (percentileHudTimeout) clearTimeout(percentileHudTimeout);

  try {
    const results = await executeQueuedDiceRoll(diceBox, [
      { sides: 10, theme: 'custom-tens', themeColor: activeDiceColors.value.percentileTens, qty: 1 },
      { sides: 10, theme: 'custom-ones', themeColor: activeDiceColors.value.percentileOnes, qty: 1 }
    ]);
    const rollSummary = calculatePercentileRoll(results);
    if (rollSummary.valid) {
      const isHit = rollSummary.total <= (action.target_pct || 50);
      const hitLabel = isHit ? 'HIT!' : 'MISS';
      lastPercentileRoll.value = {
        ...rollSummary,
        username: authStore.user?.username,
        role: authStore.user?.role
      };
      showPercentileHud.value = true;
      sendRollToServer({
        type: 'percentile',
        label: `${token?.name || 'Adversary'}: ${action.name} (${action.target_pct}%) - ${hitLabel}`,
        total: rollSummary.total,
        breakdown: `[Tens: ${rollSummary.tens * 10}, Ones: ${rollSummary.ones}] target <= ${action.target_pct}%`,
        rollSummary
      });
      percentileHudTimeout = setTimeout(() => {
        showPercentileHud.value = false;
      }, 8000);
    }
  } catch (err) {
    console.error('Adversary attack roll failed:', err);
  }
}

async function onAdversaryRollDamage({ action, token }) {
  playDiceSound({ isRemote: false });
  const rawDamage = (action.damage || '').trim();

  // Support flat damage formulas (e.g. "5", "3") (Bug 23)
  const flatMatch = rawDamage.match(/^\d+$/);
  if (flatMatch) {
    const total = parseInt(flatMatch[0], 10);
    showDamageHud.value = false;
    showPercentileHud.value = false;
    if (damageHudTimeout) clearTimeout(damageHudTimeout);
    lastDamageRoll.value = {
      dice: [total],
      count: 0,
      total,
      breakdown: `${total}`,
      username: authStore.user?.username,
      role: authStore.user?.role
    };
    showDamageHud.value = true;
    sendRollToServer({
      type: 'damage',
      label: `${token?.name || 'Adversary'}: ${action.name} Damage (${action.damage})`,
      total,
      breakdown: `${total}`,
      rollSummary: { dice: [total], count: 0, total }
    });
    damageHudTimeout = setTimeout(() => {
      showDamageHud.value = false;
    }, 8000);
    return;
  }

  // Parse dice formulas with support for fractional dice ("1d10/2") and negative modifiers ("1d10-2")
  let diceCount = 1;
  let divisor = 1;
  let modifier = 0;

  const diceMatch = rawDamage.match(/(?:(\d+)\s*)?d10/i);
  if (diceMatch) {
    diceCount = diceMatch[1] ? parseInt(diceMatch[1], 10) : 1;
  }
  const divMatch = rawDamage.match(/\/\s*(\d+)/);
  if (divMatch) {
    divisor = parseInt(divMatch[1], 10) || 1;
  }
  const modMatch = rawDamage.match(/([+-])\s*(\d+)(?!\s*d10)/);
  if (modMatch) {
    const sign = modMatch[1] === '-' ? -1 : 1;
    modifier = sign * parseInt(modMatch[2], 10);
  }

  const diceBox = await getReadyDiceBox();
  showDamageHud.value = false;
  showPercentileHud.value = false;
  showInitiativeHud.value = false;
  if (damageHudTimeout) clearTimeout(damageHudTimeout);

  try {
    const results = await executeQueuedDiceRoll(diceBox, [
      { sides: 10, theme: 'custom-dmg', themeColor: activeDiceColors.value.damage, qty: diceCount }
    ]);
    const rollSummary = calculateDamageRoll(results);
    if (rollSummary.count > 0) {
      const rawSum = rollSummary.total;
      const scaled = divisor > 1 ? Math.ceil(rawSum / divisor) : rawSum;
      const finalTotal = scaled + modifier;

      let breakdownStr = `[${rollSummary.dice.join(', ')}]`;
      if (divisor > 1) breakdownStr += ` / ${divisor}`;
      if (modifier > 0) breakdownStr += ` + ${modifier}`;
      else if (modifier < 0) breakdownStr += ` - ${Math.abs(modifier)}`;

      lastDamageRoll.value = {
        ...rollSummary,
        total: finalTotal,
        breakdown: breakdownStr,
        username: authStore.user?.username,
        role: authStore.user?.role
      };
      showDamageHud.value = true;
      sendRollToServer({
        type: 'damage',
        label: `${token?.name || 'Adversary'}: ${action.name} Damage (${action.damage})`,
        total: finalTotal,
        breakdown: breakdownStr,
        rollSummary: { ...rollSummary, total: finalTotal }
      });
      damageHudTimeout = setTimeout(() => {
        showDamageHud.value = false;
      }, 8000);
    }
  } catch (err) {
    console.error('Adversary damage roll failed:', err);
  }
}

async function onDeployVehicle(payload) {
  if (!activeMap.value) return;
  try {
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        map_id: activeMap.value.id,
        name: payload.name,
        color: payload.color,
        size: payload.size,
        x: payload.x,
        y: payload.y,
        avatar_url: payload.avatar_url,
        vehicle_data: payload.vehicle_data,
        layer: payload.layer || 'character',
      }),
    });
    if (res.ok) {
      const created = await res.json();
      showDeployVehicleModal.value = false;
      const exists = tokens.value.some((t) => t.id === created.id);
      if (!exists) tokens.value.push(created);
      selectedTokenId.value = created.id;
      showTokenSidebar.value = true;
      isTokenSidebarRolledUp.value = false;
      persistVttState();
    }
  } catch (err) {
    console.error('Failed to deploy vehicle token:', err);
  }
}

async function onVehicleTokenUpdate(updatedToken) {
  if (!updatedToken || !updatedToken.id) return;
  const idx = tokens.value.findIndex((t) => t.id === updatedToken.id);
  if (idx !== -1) {
    tokens.value[idx] = { ...tokens.value[idx], ...updatedToken };
  }

  try {
    const res = await fetch(`/api/tokens/${updatedToken.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        vehicle_data: updatedToken.vehicle_data,
        layer: updatedToken.layer,
      }),
    });
    if (res.ok) {
      const serverToken = await res.json();
      if (idx !== -1) tokens.value[idx] = serverToken;
    }
  } catch (err) {
    console.error('Failed to update vehicle token:', err);
  }
}

async function onVehicleRollControl({ token } = {}) {
  playDiceSound({ isRemote: false });
  const diceBox = await getReadyDiceBox();
  showPercentileHud.value = false;
  showDamageHud.value = false;
  if (percentileHudTimeout) clearTimeout(percentileHudTimeout);

  try {
    const results = await executeQueuedDiceRoll(diceBox, [
      { sides: 10, theme: 'custom-tens', themeColor: '#38bdf8', qty: 1 },
      { sides: 10, theme: 'custom-ones', themeColor: '#0369a1', qty: 1 }
    ]);
    const rollSummary = calculatePercentileRoll(results);
    if (rollSummary.valid) {
      lastPercentileRoll.value = {
        ...rollSummary,
        username: authStore.user?.username,
        role: authStore.user?.role
      };
      showPercentileHud.value = true;
      sendRollToServer({
        type: 'percentile',
        label: `${token?.name || 'Vehicle'}: Control Check (d100)`,
        total: rollSummary.total,
        breakdown: `[Tens: ${rollSummary.tens * 10}, Ones: ${rollSummary.ones}] Control Table check`,
        rollSummary
      });
      percentileHudTimeout = setTimeout(() => {
        showPercentileHud.value = false;
      }, 8000);
    }
  } catch (err) {
    console.error('Vehicle control roll failed:', err);
  }
}

async function onVehicleRollDamage({ token } = {}) {
  playDiceSound({ isRemote: false });
  const diceBox = await getReadyDiceBox();
  showDamageHud.value = false;
  showPercentileHud.value = false;
  showInitiativeHud.value = false;
  if (damageHudTimeout) clearTimeout(damageHudTimeout);

  try {
    const results = await executeQueuedDiceRoll(diceBox, [
      { sides: 10, theme: 'custom-dmg', themeColor: '#f97316', qty: 2 }
    ]);
    const rollSummary = calculateDamageRoll(results);
    if (rollSummary.count > 0) {
      lastDamageRoll.value = {
        ...rollSummary,
        username: authStore.user?.username,
        role: authStore.user?.role
      };
      showDamageHud.value = true;
      sendRollToServer({
        type: 'damage',
        label: `${token?.name || 'Vehicle'}: Vehicle Damage Table (2d10)`,
        total: rollSummary.total,
        breakdown: `[${rollSummary.dice.join(', ')}]`,
        rollSummary
      });
      damageHudTimeout = setTimeout(() => {
        showDamageHud.value = false;
      }, 8000);
    }
  } catch (err) {
    console.error('Vehicle damage roll failed:', err);
  }
}

async function deleteSelectedToken() {
  if (!selectedToken.value) return;
  if (!confirm(`Delete token "${selectedToken.value.name}"?`)) return;
  const tokenId = selectedToken.value.id;
  try {
    const res = await fetch(`/api/tokens/${tokenId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      tokens.value = tokens.value.filter((t) => t.id !== tokenId);
      selectedTokenId.value = null;
      if (openHudTokenId.value === tokenId) {
        openHudTokenId.value = null;
      }
    }
  } catch (err) {
    console.error('Failed to delete token:', err);
  }
}

function adjustZoom(delta) {
  let newZoom = Math.min(3.0, Math.max(0.25, zoomLevel.value + delta));
  zoomLevel.value = Math.round(newZoom * 100) / 100;
}

// Socket.io Real-time Event Listeners (Bug 25 - specific handlers)
let onSocketMapActivated = null;
let onSocketMapUpdated = null;
let onSocketMapCreated = null;
let onSocketMapDeleted = null;
let onSocketFogUpdated = null;
let onSocketTokenCreated = null;
let onSocketTokenMoved = null;
let onSocketTokenUpdated = null;
let onSocketTokenDeleted = null;
let onSocketRollCreated = null;
let onSocketRollUpdated = null;
let onSocketRollCleared = null;
const handledRollIds = new Set();
let onSocketPingUpdated = null;
let onSocketPingCleared = null;
let onSocketPingsSync = null;
let onSocketConnect = null;
let onSocketOraclePublicMessage = null;
let cleanupVtt3dResponder = null;
let pendingHiddenSheetRoll = null;

async function updateRollOnServer(rollId, updatedPayload) {
  if (!rollId) return null;
  try {
    const res = await fetch(`/api/rolls/${rollId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        label: updatedPayload.label,
        total: updatedPayload.total,
        breakdown: updatedPayload.breakdown,
        rollSummary: updatedPayload.rollSummary,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to update settled sheet roll on server:', err);
  }
  return null;
}

function showPercentileBannerForRoll(roll) {
  const rollSum = roll.rollSummary || {};
  const tens = rollSum.tens !== undefined ? rollSum.tens : Math.floor((roll.total === 100 ? 0 : roll.total) / 10);
  const ones = rollSum.ones !== undefined ? rollSum.ones : (roll.total % 10);
  lastPercentileRoll.value = {
    ...rollSum,
    id: roll.id,
    username: roll.username,
    role: roll.role,
    total: roll.total,
    tens,
    ones,
  };
  showPercentileHud.value = true;
  if (percentileHudTimeout) clearTimeout(percentileHudTimeout);
  percentileHudTimeout = setTimeout(() => {
    showPercentileHud.value = false;
  }, 8000);
}

function showDamageBannerForRoll(roll) {
  const count = roll.rollSummary?.count || (roll.label ? parseInt(roll.label) : 1) || 1;
  lastDamageRoll.value = {
    ...roll,
    id: roll.id,
    dice: Array.isArray(roll.rollSummary?.dice) ? roll.rollSummary.dice : [],
    username: roll.username,
    role: roll.role,
    total: roll.total,
    count,
    breakdown: roll.breakdown,
  };
  showDamageHud.value = true;
  if (damageHudTimeout) clearTimeout(damageHudTimeout);
  damageHudTimeout = setTimeout(() => {
    showDamageHud.value = false;
  }, 8000);
}

async function executeSheetRollOnVtt(roll) {
  if (!roll) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    pendingHiddenSheetRoll = roll;
    return;
  }

  // Only the roller themselves should animate 3D dice and update the roll with their 3D dice results.
  // Other clients (like the GM or peers) merely display the HUD banner with settled results.
  const isRoller = roll.userId === authStore.user?.id;
  if (!isRoller) {
    if (roll.type === 'percentile') {
      showPercentileBannerForRoll(roll);
    } else if (roll.type === 'damage') {
      showDamageBannerForRoll(roll);
    }
    return;
  }

  if (roll.type === 'percentile') {
    showPercentileHud.value = false;
    showDamageHud.value = false;
    showInitiativeHud.value = false;
    if (percentileHudTimeout) clearTimeout(percentileHudTimeout);

    // Animate 3D percentile dice across the RPG VTT canvas and sync settled result
    try {
      const diceBox = await getReadyDiceBox();
      if (diceBox) {
        const results = await executeQueuedDiceRoll(diceBox, [
          { sides: 10, theme: 'custom-tens', themeColor: activeDiceColors.value.percentileTens, qty: 1 },
          { sides: 10, theme: 'custom-ones', themeColor: activeDiceColors.value.percentileOnes, qty: 1 }
        ]);
        const settled = calculatePercentileRoll(results);
        if (settled.valid && isRoller) {
          const updated = applySettledSheetRoll(roll, settled);
          const mergedRoll = {
            ...roll,
            label: updated.label,
            total: updated.total,
            breakdown: updated.breakdown,
            rollSummary: updated.rollSummary,
          };
          const idx = rollLog.value.findIndex(r => r.id === roll.id);
          if (idx !== -1) {
            rollLog.value[idx] = mergedRoll;
          } else {
            rollLog.value.unshift(mergedRoll);
          }
          showPercentileBannerForRoll(mergedRoll);
          await updateRollOnServer(roll.id, updated);
          return;
        }
      }
    } catch (err) {
      console.warn('RPG VTT percentile 3D roll error:', err);
    }
    showPercentileBannerForRoll(roll);
  } else if (roll.type === 'damage') {
    const count = roll.rollSummary?.count || (roll.label ? parseInt(roll.label) : 1) || 1;
    showDamageHud.value = false;
    showPercentileHud.value = false;
    showInitiativeHud.value = false;
    if (damageHudTimeout) clearTimeout(damageHudTimeout);

    // Animate 3D damage dice across the RPG VTT canvas and sync settled result
    try {
      const diceBox = await getReadyDiceBox();
      if (diceBox) {
        const results = await executeQueuedDiceRoll(diceBox, [
          { sides: 10, theme: 'custom-dmg', themeColor: activeDiceColors.value.damage, qty: count }
        ]);
        const settled = calculateDamageRoll(results);
        if (settled.count > 0 && isRoller) {
          const updated = applySettledSheetRoll(roll, settled);
          const mergedRoll = {
            ...roll,
            label: updated.label,
            total: updated.total,
            breakdown: updated.breakdown,
            rollSummary: updated.rollSummary,
          };
          const idx = rollLog.value.findIndex(r => r.id === roll.id);
          if (idx !== -1) {
            rollLog.value[idx] = mergedRoll;
          } else {
            rollLog.value.unshift(mergedRoll);
          }
          showDamageBannerForRoll(mergedRoll);
          await updateRollOnServer(roll.id, updated);
          return;
        }
      }
    } catch (err) {
      console.warn('RPG VTT damage 3D roll error:', err);
    }
    showDamageBannerForRoll(roll);
  }
}

function onVisibilityChange() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible' && pendingHiddenSheetRoll) {
    const rollToRun = pendingHiddenSheetRoll;
    pendingHiddenSheetRoll = null;
    executeSheetRollOnVtt(rollToRun);
  }
}

function setupSocketListeners() {
  socket.on('map:activated', onSocketMapActivated = (payload) => {
    const map = payload?.map;
    if (map && map.map_type === 'rpg') {
      activeMap.value = map;
      tokens.value = (payload?.tokens || []).filter(t => isGm.value || t.layer !== 'gm');
      selectedTokenId.value = null;
      activePings.value = {};
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
      tokens.value = [];
      selectedTokenId.value = null;
      activePings.value = {};
    }
  });

  socket.on('fog:updated', onSocketFogUpdated = ({ mapId, fog_data }) => {
    if (activeMap.value && activeMap.value.id === mapId) {
      activeMap.value = { ...activeMap.value, fog_data };
    }
  });

  socket.on('token:created', onSocketTokenCreated = ({ token }) => {
    if (activeMap.value && String(token.map_id) === String(activeMap.value.id)) {
      const exists = tokens.value.some((t) => t.id === token.id);
      if (!exists) {
        tokens.value = [...tokens.value, token];
      }
    }
  });

  socket.on('token:moved', onSocketTokenMoved = ({ token }) => {
    if (activeMap.value && String(token.map_id) === String(activeMap.value.id)) {
      const idx = tokens.value.findIndex((t) => t.id === token.id);
      if (idx !== -1) {
        tokens.value[idx] = { ...tokens.value[idx], ...token, x: token.x, y: token.y };
        tokens.value = [...tokens.value];
      } else {
        tokens.value = [...tokens.value, token];
      }
    }
  });

  socket.on('token:updated', onSocketTokenUpdated = ({ token }) => {
    if (activeMap.value && String(token.map_id) === String(activeMap.value.id)) {
      const idx = tokens.value.findIndex((t) => t.id === token.id);
      if (idx !== -1) {
        tokens.value[idx] = token;
        tokens.value = [...tokens.value];
      } else {
        tokens.value = [...tokens.value, token];
      }
    }
  });

  socket.on('token:deleted', onSocketTokenDeleted = ({ id }) => {
    tokens.value = tokens.value.filter((t) => t.id !== id);
    if (selectedTokenId.value === id) {
      selectedTokenId.value = null;
    }
    if (openHudTokenId.value === id) {
      openHudTokenId.value = null;
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

  socket.on('roll:created', onSocketRollCreated = async ({ mode, roll }) => {
    if (mode !== 'rpg') return;
    if (roll?.id) {
      if (handledRollIds.has(roll.id)) return;
      handledRollIds.add(roll.id);
      if (handledRollIds.size > 100) {
        const first = handledRollIds.values().next().value;
        handledRollIds.delete(first);
      }
    }
    const isFromSheet = roll.source === 'sheet' || roll.rollSummary?.source === 'sheet';
    const isMyRoll = roll.userId === authStore.user?.id || (roll.username && roll.username === authStore.user?.username);
    if (roll.username !== authStore.user?.username) {
      playDiceSound({ isRemote: true });
    }
    if (!rollLog.value.some(r => r.id === roll.id)) {
      rollLog.value.unshift(roll);
      if (rollLog.value.length > 20) {
        rollLog.value = rollLog.value.slice(0, 20);
      }
    }
    // 3D physics animation ONLY executes on the roller's own VTT client.
    // Remote users (peers, GM) ONLY see the result popup / HUD banner.
    if (isFromSheet) {
      if (isMyRoll) {
        if (roll.rollSummary?.rolledOnVtt3d) {
          // 3D dice already rolled via BroadcastChannel responder on this client; display settled HUD immediately
          if (roll.type === 'percentile') {
            showPercentileBannerForRoll(roll);
          } else if (roll.type === 'damage') {
            showDamageBannerForRoll(roll);
          }
        } else {
          // My roll from sheet: execute 3D dice animation on my own VTT canvas
          await executeSheetRollOnVtt(roll);
        }
      } else {
        // Remote sheet roll: show result HUD banner only; do not throw 3D dice on remote screens
        if (roll.type === 'percentile') {
          showPercentileBannerForRoll(roll);
        } else if (roll.type === 'damage') {
          showDamageBannerForRoll(roll);
        }
      }
    } else {
      // Non-sheet roll (rolled from VTT toolbar, tokens, combat actions, initiative)
      if (isMyRoll) {
        // The roller already executed 3D animation and displayed HUD locally when clicking roll
      } else {
        // Remote roll: show result HUD banner on other screens, but DO NOT run 3D dice animation
        if (roll.type === 'percentile') {
          showPercentileBannerForRoll(roll);
        } else if (roll.type === 'damage') {
          showDamageBannerForRoll(roll);
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
    }
  });

  socket.on('roll:updated', onSocketRollUpdated = ({ mode, roll }) => {
    if (mode !== 'rpg' || !roll?.id) return;
    const idx = rollLog.value.findIndex(r => r.id === roll.id);
    if (idx !== -1) {
      rollLog.value[idx] = roll;
    } else {
      rollLog.value.unshift(roll);
      if (rollLog.value.length > 20) {
        rollLog.value = rollLog.value.slice(0, 20);
      }
    }
    if (roll.type === 'percentile' && (!lastPercentileRoll.value || lastPercentileRoll.value.id === roll.id || showPercentileHud.value)) {
      showPercentileBannerForRoll(roll);
    } else if (roll.type === 'damage' && (!lastDamageRoll.value || lastDamageRoll.value.id === roll.id || showDamageHud.value)) {
      showDamageBannerForRoll(roll);
    }
  });

  socket.on('roll:cleared', onSocketRollCleared = ({ mode }) => {
    if (mode === 'rpg') {
      rollLog.value = [];
      clearDice();
    }
  });

  socket.on('oracle:public_message', onSocketOraclePublicMessage = (payload) => {
    if (payload?.text) {
      const oracleEntry = {
        id: 'oracle_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        mode: 'rpg',
        username: payload.sender || 'Game Master',
        role: 'GameMaster',
        type: 'initiative',
        label: 'Oracle Chronicle',
        total: 0,
        breakdown: payload.text,
        rollSummary: {
          title: 'Oracle Chronicle',
          text: payload.text,
        },
        createdAt: payload.timestamp || new Date().toISOString(),
      };
      rollLog.value.unshift(oracleEntry);
      if (rollLog.value.length > 20) {
        rollLog.value = rollLog.value.slice(0, 20);
      }
    }
  });
}

function cleanupSocketListeners() {
  if (onSocketMapActivated) socket.off('map:activated', onSocketMapActivated);
  if (onSocketMapUpdated) socket.off('map:updated', onSocketMapUpdated);
  if (onSocketMapCreated) socket.off('map:created', onSocketMapCreated);
  if (onSocketMapDeleted) socket.off('map:deleted', onSocketMapDeleted);
  if (onSocketFogUpdated) socket.off('fog:updated', onSocketFogUpdated);
  if (onSocketTokenCreated) socket.off('token:created', onSocketTokenCreated);
  if (onSocketTokenMoved) socket.off('token:moved', onSocketTokenMoved);
  if (onSocketTokenUpdated) socket.off('token:updated', onSocketTokenUpdated);
  if (onSocketTokenDeleted) socket.off('token:deleted', onSocketTokenDeleted);
  if (onSocketRollCreated) socket.off('roll:created', onSocketRollCreated);
  if (onSocketRollUpdated) socket.off('roll:updated', onSocketRollUpdated);
  if (onSocketRollCleared) socket.off('roll:cleared', onSocketRollCleared);
  if (onSocketPingUpdated) socket.off('ping:updated', onSocketPingUpdated);
  if (onSocketPingCleared) socket.off('ping:cleared', onSocketPingCleared);
  if (onSocketPingsSync) socket.off('pings:sync', onSocketPingsSync);
  if (onSocketConnect) socket.off('connect', onSocketConnect);
  if (onSocketOraclePublicMessage) socket.off('oracle:public_message', onSocketOraclePublicMessage);
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    if (showPercentileHud.value || showDamageHud.value || showDmgMenu.value) {
      clearDice();
    }
  }
}

onMounted(() => {
  fetchRollLog().then(() => {
    const pendingSheetRoll = consumePendingSheetVttRoll();
    if (pendingSheetRoll) {
      handledRollIds.add(pendingSheetRoll.id);
      executeSheetRollOnVtt(pendingSheetRoll);
    }
  });
  fetchActiveMap();
  fetchCharacters();
  if (isGm.value) {
    fetchMapList();
  }
  
  initDiceBox();

  setupSocketListeners();
  cleanupVtt3dResponder = registerVtt3dRollResponder(async ({ type, count }) => {
    showPercentileHud.value = false;
    showDamageHud.value = false;
    showInitiativeHud.value = false;
    if (percentileHudTimeout) clearTimeout(percentileHudTimeout);
    if (damageHudTimeout) clearTimeout(damageHudTimeout);

    const diceBox = await getReadyDiceBox();
    if (!diceBox) return null;

    if (type === 'damage') {
      const qty = Math.max(1, Math.min(20, Number(count) || 1));
      const results = await executeQueuedDiceRoll(diceBox, [
        { sides: 10, theme: 'custom-dmg', themeColor: activeDiceColors.value.damage, qty }
      ]);
      return calculateDamageRoll(results);
    }

    const results = await executeQueuedDiceRoll(diceBox, [
      { sides: 10, theme: 'custom-tens', themeColor: activeDiceColors.value.percentileTens, qty: 1 },
      { sides: 10, theme: 'custom-ones', themeColor: activeDiceColors.value.percentileOnes, qty: 1 }
    ]);
    return calculatePercentileRoll(results);
  });
  document.addEventListener('click', onDocClick);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  if (persistStateTimer) {
    clearTimeout(persistStateTimer);
    persistStateTimer = null;
  }
  persistVttStateNow();
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
    updateSelectedToken();
  }
  cleanupSocketListeners();
  if (cleanupVtt3dResponder) {
    cleanupVtt3dResponder();
    cleanupVtt3dResponder = null;
  }
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('keydown', onKeyDown);
  if (damageHudTimeout) clearTimeout(damageHudTimeout);
  if (percentileHudTimeout) clearTimeout(percentileHudTimeout);
  if (initiativeHudTimeout) clearTimeout(initiativeHudTimeout);
  if (diceBoxInstance) {
    try {
      diceBoxInstance.clear();
    } catch (e) {}

    // Clean up WebGL canvas contexts properly to prevent context leak (Bug 24)
    const canvas = diceBoxInstance.canvas || document.querySelector('#dice-canvas') || document.querySelector('#dice-box canvas');
    if (canvas && typeof canvas.getContext === 'function') {
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const loseContext = gl.getExtension('WEBGL_lose_context');
          if (loseContext) {
            loseContext.loseContext();
          }
        }
      } catch (e) {}
    }
    diceBoxInstance = null;
    diceBoxInitPromise = null;
  }
  const diceBoxContainer = document.querySelector('#dice-box');
  if (diceBoxContainer) {
    diceBoxContainer.innerHTML = '';
  }
});
</script>

<style scoped>
/* 3D Dice Layering & Pointer Pass-Through */
#dice-box,
#dice-box :deep(*),
#dice-canvas,
.dice-box-canvas {
  pointer-events: none !important;
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

/* Roll Log Initiative Pills */
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

.modal-error-banner {
  background: rgba(220, 53, 69, 0.2);
  border: 1px solid #dc3545;
  color: #ff8591;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}
.vtt-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

/* RPG VTT Buttons - Remove outer borders */
.vtt-view button,
.vtt-view button:hover,
.vtt-view button:active,
.vtt-view button:focus {
  border: none !important;
}

/* Header */
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
  color: var(--text-primary);
  margin: 0;
}

.map-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.zoom-controls button {
  padding: 2px 8px;
  font-size: 13px;
  height: 26px;
  border: none !important;
}

.zoom-readout {
  font-size: 13px;
  font-weight: 600;
  min-width: 44px;
  text-align: center;

}

.header-right {
  display: flex;
  gap: 10px;
}

.btn-gm,
.btn-stock-encounter,
.btn-deploy-vehicle,
.btn-sidebar {
  background: #000000;
  border: none !important;
  color: #cecece;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-gm:hover,
.btn-stock-encounter:hover,
.btn-deploy-vehicle:hover,
.btn-sidebar:hover {
  background: #000000;
  border: none !important;
  color: #cecece;
}

.btn-sidebar.active {
  background: #000000;
  border: none !important;
  color: #cecece;
  box-shadow: 0 0 10px rgba(206, 206, 206, 0.4);
}

.btn-stock-adversary-alt,
.btn-deploy-vehicle-alt {
  border: none !important;
}

.btn-add-token {
  background-color: #000000 !important;
  background: #000000 !important;
  border: none !important;
  color: #d0d0d0 !important;
  -webkit-text-fill-color: #d0d0d0;
  font-weight: 700;
  box-shadow: 0 0 10px rgba(208, 208, 208, 0.25);
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

/* Main Body Layout */
.vtt-body {
  position: relative;
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Floating Toolbar */
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
  transition: all 0.15s ease-in-out;
}

.vtt-toolbar button:hover {
  color: var(--theme-bright-hover, #cecece);
  background: var(--theme-btn-bg, rgba(22, 27, 34, 0.85));
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

.tool-icon text {
  fill: currentColor;
  stroke: none;
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

/* Damage Dice Roller */
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
  padding: 8px 10px !important;
  background: var(--theme-btn-bg, #0c181e) !important;
  color: var(--theme-bright, #38bdf8) !important;
  border: 1px solid var(--theme-btn-border, var(--theme-bright)) !important;
  font-weight: 700 !important;
  border-radius: 6px !important;
  cursor: pointer;
  text-align: center !important;
  justify-content: center !important;
  transition: all 0.15s ease;
}

.btn-roll-dmg-action:hover {
  filter: brightness(1.2);
  box-shadow: 0 0 12px var(--theme-glow, rgba(56, 189, 248, 0.5));
}

/* Damage HUD Banner */
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

/* Percentile HUD Banner */
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

/* Transitions */
.hud-pop-enter-active,
.hud-pop-leave-active {
  transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.hud-pop-enter-from,
.hud-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px) scale(0.9);
}

/* DMG Menu Dropdown Card */
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

/* Canvas Area */
.vtt-canvas-wrapper {
  flex: 1;
  min-width: 0;
  height: 100%;
}

/* GM Drawer Backdrop & Modal */
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
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.4);
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
  padding: 0 4px;
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

/* Token Sidebar */
.token-sidebar {
  width: 320px;
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 5;
}

.token-sidebar.token-sidebar-rolled-up {
  position: absolute;
  right: 0;
  top: 0;
  width: 320px;
  height: auto;
  z-index: 10;
  border-bottom: 1px solid var(--border);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.65);
}

.token-sidebar .sidebar-header {
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
  background: var(--bg-tertiary);
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
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
}

.map-list li.active,
.token-list li.active {
  border-color: var(--accent);
  background: rgba(88, 166, 255, 0.1);
}

.multi-tokens-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: 0.03em;
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

.status-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.status-toggles button {
  padding: 4px 8px;
  font-size: 12px;
}

.status-toggles button.active {
  background: var(--accent);
  color: var(--bg-primary);
  border-color: var(--accent);
}

/* Modals */
.modal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  width: 500px;
  max-width: 95vw;
  box-sizing: border-box;
  overflow-x: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
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

.form-group label {
  font-size: 13px;
  color: var(--text-secondary);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.character-sheet-select,
.character-sheet-select option,
.tactical-map-select,
.tactical-map-select option {
  background-color: #000000 !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
}

.character-sheet-select,
.tactical-map-select {
  border: 1px solid #cecece !important;
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
}

.character-sheet-select:focus,
.tactical-map-select:focus {
  outline: none;
  border-color: #cecece !important;
  box-shadow: 0 0 8px rgba(206, 206, 206, 0.5);
}

.modal-card input[type="text"],
.modal-card input[type="number"] {
  color-scheme: dark;
  background-color: #000000 !important;
  border: 1px solid #cecece !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
}

.modal-card input[type="text"]:focus,
.modal-card input[type="number"]:focus {
  outline: none;
  border-color: #cecece !important;
  box-shadow: 0 0 8px rgba(206, 206, 206, 0.4);
}

.token-file-input,
.map-file-input {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  width: auto;
}

.token-file-input::file-selector-button,
.token-file-input::-webkit-file-upload-button,
.map-file-input::file-selector-button,
.map-file-input::-webkit-file-upload-button {
  background-color: #000000 !important;
  border: none !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  border-radius: var(--radius);
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  margin-right: 10px;
  transition: all 0.15s ease-in-out;
}

.token-file-input::file-selector-button:hover,
.token-file-input::-webkit-file-upload-button:hover,
.map-file-input::file-selector-button:hover,
.map-file-input::-webkit-file-upload-button:hover {
  background-color: #000000 !important;
  border: none !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  box-shadow: 0 0 8px rgba(206, 206, 206, 0.4);
}

.map-bg-btn-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.avatar-upload-box {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px;
  box-sizing: border-box;
  max-width: 100%;
}

.avatar-preview-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 3px solid #666666;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.token-avatar-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-empty-placeholder {
  font-size: 10px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.1;
}

.avatar-controls {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
}

.file-btn-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  box-sizing: border-box;
}

.token-file-input {
  max-width: 100%;
  min-width: 0;
}

.btn-browse-avatar {
  background-color: #000000 !important;
  background: #000000 !important;
  border: none !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  border-radius: var(--radius);
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-browse-avatar:hover {
  background-color: #000000 !important;
  border: none !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  box-shadow: 0 0 8px rgba(206, 206, 206, 0.4);
}

.btn-clear-avatar {
  background: #000000 !important;
  border: none !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-clear-avatar:hover {
  background: #000000 !important;
  border: none !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  box-shadow: 0 0 6px rgba(206, 206, 206, 0.4);
}

.uploading-spinner {
  font-size: 12px;
  color: #cecece;
  font-style: italic;
}

.avatar-url-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 12px;
  padding: 6px 10px;
}

.btn-modal-cancel {
  background-color: #000000 !important;
  background: #000000 !important;
  border: none !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-modal-cancel:hover {
  background-color: #000000 !important;
  border: none !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  box-shadow: 0 0 8px rgba(206, 206, 206, 0.4);
}

.btn-add-token-submit {
  background-color: #000000 !important;
  background: #000000 !important;
  border: none !important;
  color: #d0d0d0 !important;
  -webkit-text-fill-color: #d0d0d0;
  font-weight: 700;
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

.full-width {
  width: 100%;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.danger {
  background: var(--danger);
  color: #cecece;
  border: none !important;
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

.size-select,
.size-select option {
  background-color: #000000 !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
}

.size-select {
  border: 1px solid #cecece !important;
  border-radius: var(--radius);
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 500;
  width: 100%;
}

.size-select:focus {
  outline: none;
  border-color: #cecece !important;
  box-shadow: 0 0 6px rgba(206, 206, 206, 0.4);
}

.empty-text {
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: 8px 0;
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
  backdrop-filter: blur(4px);
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
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.no-map-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.no-map-card h3 {
  font-size: 22px;
  color: var(--text-primary, #cecece);
  margin-bottom: 8px;
}

.no-map-card p {
  font-size: 14px;
  color: var(--text-secondary, #8b949e);
  line-height: 1.5;
  margin-bottom: 20px;
}

.no-map-actions {
  display: flex;
  gap: 12px;
}

/* Bottom-Corner Die Roll Log HUD */
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

.btn-audio-toggle-pill {
  color: var(--text-white, #ffffff) !important;
  -webkit-text-fill-color: var(--text-white, #ffffff);
}

.btn-audio-toggle-pill:hover {
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

.hud-user-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-right: 6px;
  text-transform: uppercase;
}
.hud-user-tag.gamemaster, .roll-user-badge.gamemaster {
  background: rgba(229, 192, 123, 0.25);
  color: #e5c07b;
  border: 1px solid rgba(229, 192, 123, 0.4);
}
.hud-user-tag.player, .roll-user-badge.player {
  background: rgba(119, 209, 158, 0.2);
  color: #77d19e;
  border: 1px solid rgba(119, 209, 158, 0.35);
}
.roll-user-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  margin-right: 6px;
}

.grid-dimensions-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grid-dimensions-row input {
  flex: 1;
  min-width: 0;
}

.grid-dimensions-x {
  color: #8b949e;
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
  letter-spacing: 0.4px;
}

.btn-token-list-visibility {
  background: transparent;
  border: none !important;
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 0.75rem;
  cursor: pointer;
  margin-left: auto;
}

.btn-token-list-visibility.is-hidden {
  border: none !important;
  background: rgba(245, 158, 11, 0.12);
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
</style>
