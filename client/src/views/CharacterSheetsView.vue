<template>
  <div class="sheets-layout">
    <!-- Edge Toggle Button (when sidebar is hidden to the left) -->
    <button
      v-if="isSidebarCollapsedLeft"
      type="button"
      class="btn-sidebar-edge-toggle"
      @click="toggleSidebarLeft"
      title="Show Character Navigation (Slide to Right)"
      aria-label="Show Character Navigation"
    >
      ▶ <span class="edge-toggle-text">Characters</span>
    </button>

    <!-- Sidebar -->
    <aside
      class="sidebar"
      :class="{
        'sidebar-collapsed-left': isSidebarCollapsedLeft,
        'sidebar-rolled-up': isSidebarRolledUp
      }"
      aria-label="Characters Navigation"
    >
      <div class="sidebar-header">
        <h3>Characters</h3>
        <div class="sidebar-header-actions">
          <button v-show="!isSidebarRolledUp" class="btn-primary btn-new-character" @click="openCreateModal">+ New</button>
          <div class="sidebar-toggle-group">
            <button
              type="button"
              class="btn-sidebar-ctrl btn-sidebar-rollup"
              @click="toggleSidebarRollup"
              :title="isSidebarRolledUp ? 'Expand Characters Navigation (Roll Down)' : 'Roll Up Characters Navigation'"
              :aria-label="isSidebarRolledUp ? 'Expand Characters Navigation' : 'Roll Up Characters Navigation'"
            >
              {{ isSidebarRolledUp ? '▼' : '▲' }}
            </button>
            <button
              type="button"
              class="btn-sidebar-ctrl btn-sidebar-collapse-left"
              @click="toggleSidebarLeft"
              title="Hide Character Navigation (Slide to Left)"
              aria-label="Hide Character Navigation to Left"
            >
              ◀
            </button>
          </div>
        </div>
      </div>

      <div class="sidebar-body-wrap" :class="{ 'rolled-up': isSidebarRolledUp }">
        <div v-if="loading" class="sidebar-loading">Loading characters...</div>
        <div v-else-if="characters.length === 0" class="sidebar-empty">
          No characters found. Create one to get started!
        </div>
        <ul v-else ref="sidebarList" class="character-list sheet-list" @scroll="onScrollSave">
          <li
            v-for="(char, index) in characters"
            :key="char.id"
            :class="{
              active: selectedChar && selectedChar.id === char.id,
              dragging: draggedCharIndex === index,
              'drag-over': dragOverCharIndex === index && draggedCharIndex !== index
            }"
            :draggable="canReorder(char)"
            @dragstart="onDragStart($event, index)"
            @dragover="onDragOver($event, index)"
            @dragleave="onDragLeave($event, index)"
            @drop="onDrop($event, index)"
            @dragend="onDragEnd"
            @click="selectCharacter(char)"
          >
            <span
              v-if="canReorder(char)"
              class="drag-handle"
              title="Drag to reorder"
              @click.stop
            >⋮⋮</span>
            <div class="char-item-info">
              <span class="char-name">{{ char.name || 'Unnamed' }}</span>
              <span class="char-sub">{{ char.race || 'Unknown Species' }} • Tier {{ getCharTier(char) }} • STA {{ char.current_stamina }}/{{ char.max_stamina }}</span>
            </div>
            <div class="char-item-actions">
              <div v-if="canReorder(char)" class="reorder-actions">
                <button
                  type="button"
                  class="btn-reorder btn-move-up"
                  title="Move Up"
                  :disabled="index === 0"
                  @click.stop="moveCharacter(index, -1)"
                >▲</button>
                <button
                  type="button"
                  class="btn-reorder btn-move-down"
                  title="Move Down"
                  :disabled="index === characters.length - 1"
                  @click.stop="moveCharacter(index, 1)"
                >▼</button>
              </div>
              <button class="btn-delete-small" title="Delete Character" @click.stop="deleteCharacter(char.id)">✕</button>
            </div>
          </li>
        </ul>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main ref="mainScroll" class="sheet-main sheet-detail" @scroll="onScrollSave">
      <!-- Error Feedback Banner (Bug 29) -->
      <div v-if="errorMessage" class="error-banner">
        <span>⚠️ {{ errorMessage }}</span>
        <button type="button" class="btn-dismiss-error" @click="errorMessage = ''">✕</button>
      </div>

      <div v-if="!selectedChar" class="no-selection">
        <div class="stub-icon">📋</div>
        <h2>Select or Create a Character</h2>
        <p>Choose a character sheet from the sidebar or build a new Wayworlds hero.</p>
      </div>

      <div v-else class="sheet-container" :data-color-pkg="characterSheetColorPkg">
        <!-- Header Info -->
        <header class="sheet-header">
          <div class="header-main">
            <div class="portrait-box" @click="openImageBrowser('char')" title="Click to select character portrait">
              <img v-if="selectedChar.avatar_url" :src="selectedChar.avatar_url" class="portrait-img" alt="Character Portrait" />
              <div v-else class="portrait-placeholder">Click to select<br/>Token Image</div>
            </div>
            <div class="header-content">
              <div class="header-top-row">
                <input
                  type="text"
                  v-model="selectedChar.name"
                  @change="updateCharacter"
                  class="input-name"
                  placeholder="Character Name"
                />
                <span class="badge-tier">Tier {{ characterTier }}</span>
                <button
                  class="btn-action-download"
                  @click="downloadAsciiSheet"
                  title="Download ASCII Character Record (.txt)"
                >
                  Download Sheet (.txt)
                </button>
              </div>

              <div class="header-sub-row">
                <div class="race-select-wrap">
                  <label>Species:</label>
                  <select v-model="selectedRaceCategory" class="select-race">
                    <optgroup label="The Norn (Elves, Dwarves & Wendhya)">
                      <option value="Dawn Elves">Dawn Elves</option>
                      <option value="Dusk Elves">Dusk Elves</option>
                      <option value="Sylvan Elves">Sylvan Elves</option>
                      <option value="Wilder Elves">Wilder Elves</option>
                      <option value="Twilight Elves">Twilight Elves</option>
                      <option value="Wendhya">Wendhya</option>
                      <option value="Weirgoth Dwarves">Weirgoth Dwarves</option>
                      <option value="Vanir Dwarves">Vanir Dwarves</option>
                    </optgroup>
                    <optgroup label="The Urkai & Goblinoid Clans">
                      <option value="Frost Urkai">Frost Urkai</option>
                      <option value="Ash Urkai">Ash Urkai</option>
                      <option value="Forest Urkai">Forest Urkai</option>
                      <option value="Stone Urkai">Stone Urkai</option>
                      <option value="Orcish">Orcish</option>
                      <option value="Hobgoblins">Hobgoblins</option>
                      <option value="Goblins">Goblins</option>
                    </optgroup>
                    <optgroup label="The Giants & Primordial Kin">
                      <option value="True Giants">True Giants</option>
                      <option value="Giantken / Goliath">Giantken / Goliath</option>
                      <option value="Trollkin">Trollkin</option>
                      <option value="Ogre">Ogre</option>
                      <option value="Minotaur / Nord Minotaur">Minotaur / Nord Minotaur</option>
                    </optgroup>
                    <optgroup label="Hybrid & Foundation Folk">
                      <option value="Whisperlings">Whisperlings</option>
                      <option value="Mixlanders">Mixlanders</option>
                      <option value="Human">Human</option>
                    </optgroup>
                    <option value="Custom">Custom</option>
                  </select>
                  <input
                    v-if="selectedRaceCategory === 'Custom'"
                    type="text"
                    v-model="selectedChar.race"
                    @change="onCustomRaceChange"
                    class="input-custom-race"
                    placeholder="Custom Species Name"
                  />
                </div>
                <div class="psa-select-wrap">
                  <label>PSA:</label>
                  <select v-model="selectedChar.psa" @change="updateCharacter" class="select-psa">
                    <option value="Martial">Martial</option>
                    <option value="Mystic">Mystic</option>
                    <option value="Theurgy">Theurgy</option>
                  </select>
                </div>
                <div class="char-theme-select-wrap">
                  <label>Theme:</label>
                  <select
                    v-model="selectedChar.color_theme"
                    @change="onCharThemeChange"
                    class="select-char-theme"
                    aria-label="Character Sheet Theme"
                  >
                    <option value="">Default (App Theme)</option>
                    <option v-for="pkg in colorPackages" :key="pkg.key" :value="pkg.key">
                      {{ pkg.label }}
                    </option>
                  </select>
                </div>
                <div v-if="isGm && registeredUsers.length > 0" class="player-select-wrap">
                  <label>Player:</label>
                  <select v-model="selectedChar.user_id" @change="updateCharacter" class="select-player">
                    <option v-for="u in registeredUsers" :key="u.id" :value="u.id">
                      {{ u.username }} ({{ u.role === 'GameMaster' ? 'GM' : 'Player' }})
                    </option>
                  </select>
                </div>
                <div v-else-if="selectedChar.owner_username" class="player-badge-wrap">
                  <span class="badge-player" title="Assigned Player">
                    👤 {{ selectedChar.owner_username }}
                  </span>
                </div>
              </div>

              <!-- 3rd Row: Tactical Stats (IM, Melee Base Hit, Movement, Encumbrance) -->
              <div class="tactical-bar header-tactical-row">
                <div class="tactical-stat">
                  <span class="tactical-label">IM</span>
                  <span class="tactical-value">+{{ derivedIM }}</span>
                </div>
                <div class="tactical-stat">
                  <span class="tactical-label">Melee Base Hit</span>
                  <span class="tactical-value">{{ derivedMeleeHit }}%</span>
                </div>
                <div class="tactical-stat">
                  <span class="tactical-label">Movement (Walk / Dash)</span>
                  <span class="tactical-value">
                    {{ movementRates.walk }} / {{ movementRates.run }} ft
                  </span>
                </div>
                <div class="tactical-stat encumbrance-stat">
                  <span class="tactical-label">Encumbrance ({{ totalInventoryWeight }} / {{ unencumberedMaxWeight }} lbs)</span>
                  <div class="encumbrance-bar-bg">
                    <div
                      class="encumbrance-bar-fill"
                      :style="{ width: encumbrancePct + '%', backgroundColor: encumbranceColor }"
                    ></div>
                  </div>
                  <span class="encumbrance-sub" :class="{ 'over-limit': isOverloaded }">
                    Max Carry: {{ maxCarryWeight }} lbs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Middle Section: Primary Attributes (Left) and Compact Trackers (Right) -->
        <div class="middle-section-grid">
          <!-- Left Column: Primary D100 Stats (2x2 Grid) -->
          <section class="card stats-section">
            <div class="panel-header-simple">
              <span class="tracker-label">PRIMARY ATTRIBUTES</span>
            </div>
            <div class="stats-grid">
              <!-- STR / STA -->
              <div class="stat-pair-box" title="Strength / Stamina">
                <div class="stat-pair-header">STR / STA</div>
                <div class="stat-inputs-row">
                  <div class="sub-stat">
                    <label title="Strength">STR</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.str"
                      @change="onStatChange('str')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div class="shift-controls">
                    <button class="btn-shift" title="Shift point to STR" @click="shiftStat('str', 'sta', 1)">◄</button>
                    <button class="btn-shift" title="Shift point to STA" @click="shiftStat('str', 'sta', -1)">►</button>
                  </div>
                  <div class="sub-stat">
                    <label title="Stamina">STA</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.sta"
                      @change="onStatChange('sta')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <!-- DEX / RS -->
              <div class="stat-pair-box" title="Agility / Reflex Speed">
                <div class="stat-pair-header">DEX / RS</div>
                <div class="stat-inputs-row">
                  <div class="sub-stat">
                    <label title="Agility">DEX</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.dex"
                      @change="onStatChange('dex')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div class="shift-controls">
                    <button class="btn-shift" title="Shift point to DEX" @click="shiftStat('dex', 'rs', 1)">◄</button>
                    <button class="btn-shift" title="Shift point to RS" @click="shiftStat('dex', 'rs', -1)">►</button>
                  </div>
                  <div class="sub-stat">
                    <label title="Reflex Speed">RS</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.rs"
                      @change="onStatChange('rs')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <!-- INT / HIST/REL -->
              <div class="stat-pair-box" title="Intellect / History & Religion">
                <div class="stat-pair-header">INT / HIST/REL</div>
                <div class="stat-inputs-row">
                  <div class="sub-stat">
                    <label title="Intellect">INT</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.int"
                      @change="onStatChange('int')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div class="shift-controls">
                    <button class="btn-shift" title="Shift point to INT" @click="shiftStat('int', 'log', 1)">◄</button>
                    <button class="btn-shift" title="Shift point to HIST/REL" @click="shiftStat('int', 'log', -1)">►</button>
                  </div>
                  <div class="sub-stat">
                    <label title="History & Religion">HIST/REL</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.log"
                      @change="onStatChange('log')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <!-- WIL / PRE -->
              <div class="stat-pair-box" title="Willpower / Presence">
                <div class="stat-pair-header">WIL / PRE</div>
                <div class="stat-inputs-row">
                  <div class="sub-stat">
                    <label title="Willpower">WIL</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.per"
                      @change="onStatChange('per')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div class="shift-controls">
                    <button class="btn-shift" title="Shift point to WIL" @click="shiftStat('per', 'ldr', 1)">◄</button>
                    <button class="btn-shift" title="Shift point to PRE" @click="shiftStat('per', 'ldr', -1)">►</button>
                  </div>
                  <div class="sub-stat">
                    <label title="Presence">PRE</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.ldr"
                      @change="onStatChange('ldr')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Right Column: Compact Trackers (STA, ESS, XP) -->
          <section class="card trackers-section">
            <!-- Stamina Tracker -->
            <div class="tracker-item stamina-section">
              <div class="stamina-header">
                <span class="tracker-label">STAMINA (STA)</span>
                <div class="stamina-header-right">
                  <button class="btn-action-reset" @click="resetCharacterStats" title="Full Rest: Restore STA and ESS to maximum">
                    Rest
                  </button>
                  <div class="stamina-values">
                    <span class="current">{{ selectedChar.current_stamina }}</span> /
                    <input
                      type="number"
                      v-model.number="selectedChar.max_stamina"
                      @change="onMaxStaminaChange"
                      class="input-max-sta"
                      min="1"
                    /> Max
                  </div>
                </div>
              </div>
              <div class="stamina-bar-bg">
                <div
                  class="stamina-bar-fill"
                  :style="{
                    width: staminaPercentage + '%',
                    background: staminaColor,
                    boxShadow: staminaGlow
                  }"
                ></div>
              </div>
              <div class="stamina-controls">
                <div class="stepper-group">
                  <button class="btn-sta btn-sub" @click="adjustStamina(-5)">-5</button>
                  <button class="btn-sta btn-sub" @click="adjustStamina(-1)">-1</button>
                  <button class="btn-sta btn-add" @click="adjustStamina(+1)">+1</button>
                  <button class="btn-sta btn-add" @click="adjustStamina(+5)">+5</button>
                </div>
                <div class="freeform-delta-group">
                  <input
                    type="number"
                    v-model.number="staminaDelta"
                    placeholder="Amt"
                    min="1"
                    class="input-delta"
                    @keydown.enter.prevent="applyStaminaDamage"
                  />
                  <button class="btn-delta btn-sub" @click="applyStaminaDamage" title="Subtract damage from Stamina">- Dmg</button>
                  <button class="btn-delta btn-add" @click="applyStaminaHeal" title="Add healing to Stamina">+ Heal</button>
                </div>
              </div>
            </div>

            <!-- ESS Energy Pool Tracker -->
            <div class="tracker-item ess-section">
              <div class="ess-header">
                <span class="tracker-label">ESS ENERGY POOL</span>
                <div class="ess-header-right">
                  <button class="btn-action-reload" @click="reloadEss" title="Reload: Restore ESS to maximum">
                    Reload
                  </button>
                  <div class="ess-values">
                    <span class="current">{{ selectedChar.current_ess ?? 50 }}</span> /
                    <input
                      type="number"
                      v-model.number="selectedChar.max_ess"
                      @change="onMaxEssChange"
                      class="input-max-ess"
                      min="0"
                    /> Max
                  </div>
                </div>
              </div>
              <div class="ess-bar-bg">
                <div
                  class="ess-bar-fill"
                  :style="{
                    width: essPercentage + '%',
                    background: essColor,
                    boxShadow: essGlow
                  }"
                ></div>
              </div>
              <div class="ess-controls">
                <div class="stepper-group">
                  <button class="btn-ess btn-sub" @click="adjustEss(-5)" title="Channel High-Tier Spell (-5 ESS)">-5</button>
                  <button class="btn-ess btn-sub" @click="adjustEss(-1)" title="Channel Essence (-1 ESS)">-1</button>
                  <button class="btn-ess btn-add" @click="adjustEss(+1)" title="Recover 1 ESS (+1 ESS)">+1</button>
                  <button class="btn-ess btn-add" @click="adjustEss(+5)" title="Recover 5 ESS (+5 ESS)">+5</button>
                </div>
                <div class="freeform-delta-group">
                  <input
                    type="number"
                    v-model.number="essDelta"
                    placeholder="Amt"
                    min="1"
                    class="input-delta"
                    @keydown.enter.prevent="applyEssBurn"
                  />
                  <button class="btn-delta btn-sub" @click="applyEssBurn" title="Burn / Spend ESS">- Spend</button>
                  <button class="btn-delta btn-add" @click="applyEssRecharge" title="Recharge / Add ESS">+ Charge</button>
                </div>
              </div>
            </div>

            <!-- Experience Points (XP) Tracker -->
            <div class="tracker-item xp-section">
              <div class="xp-header">
                <span class="tracker-label">EXPERIENCE POINTS (XP)</span>
                <div class="xp-header-right">
                  <div class="xp-values">
                    <span class="current">{{ selectedChar.current_xp ?? 0 }} XP</span>
                  </div>
                  <div class="freeform-delta-group xp-delta-group">
                    <input
                      type="number"
                      v-model.number="xpDelta"
                      placeholder="Amt"
                      min="1"
                      class="input-delta"
                      @keydown.enter.prevent="applyXpAward"
                    />
                    <button class="btn-delta btn-sub" @click="applyXpSpend" title="Spend XP">- Spend</button>
                    <button class="btn-delta btn-add" @click="applyXpAward" title="Award XP">+ Award</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Detailed Species Abilities Panel -->
        <section class="card racial-panel species-traits-banner">
          <span class="traits-badge">Species Traits &amp; Abilities - {{ selectedChar.race }}</span>
          <div v-if="racesData[selectedChar.race]" class="traits-rule-text">
            <span>
              <strong>{{ racesData[selectedChar.race].trait_name || selectedChar.race }}:</strong>
              {{ racesData[selectedChar.race].abilities }}
            </span>
            <span v-if="racesData[selectedChar.race].modSummary" class="traits-mod-summary">
              <strong>Baseline Modifiers:</strong> {{ racesData[selectedChar.race].modSummary }}
            </span>
          </div>
          <div v-else class="traits-rule-text">
            <span><strong>Custom Species:</strong> Custom lineage without preset cartridge traits.</span>
          </div>
        </section>

        <!-- Lists: Skills & Inventory -->
        <div class="two-column-lists">
          <!-- Skills -->
          <section class="card list-card">
            <div class="list-header">
              <h4>Skills & Experience</h4>
              <button class="btn-secondary btn-add-skill" @click="addSkill">+ Add Skill</button>
            </div>
            <div v-if="!selectedChar.skills || selectedChar.skills.length === 0" class="empty-list">
              No skills added.
            </div>
            <ul v-else class="items-list">
              <li
                v-for="(skill, index) in selectedChar.skills"
                :key="skill.id || index"
                class="item-row skill-row"
                :class="{ 'drag-over': dragOverSkillIndex === index, 'dragging': draggedSkillIndex === index }"
                draggable="true"
                @dragstart="onSkillDragStart($event, index)"
                @dragover="onSkillDragOver($event, index)"
                @dragleave="onSkillDragLeave($event, index)"
                @drop="onSkillDrop($event, index)"
                @dragend="onSkillDragEnd"
              >
                <span
                  class="drag-handle"
                  title="Drag to reorder skill"
                  @click.stop
                >⋮⋮</span>
                <div class="skill-main-select">
                  <select v-model="skill.name" @change="updateCharacter" class="select-official-skill">
                    <option v-for="offSk in officialSkills" :key="offSk.name" :value="offSk.name">
                      {{ offSk.name }} ({{ offSk.psa }})
                    </option>
                  </select>
                  <span class="skill-chance-badge" title="Calculated Success Chance">
                    {{ getSkillSuccessChance(skill) }}%
                  </span>
                </div>
                <div class="level-wrap">
                  <label>Lvl:</label>
                  <input
                    type="number"
                    v-model.number="skill.level"
                    @change="updateCharacter"
                    min="1"
                    max="6"
                    class="item-level-input"
                  />
                  <button
                    v-if="skill.level < 6"
                    class="btn-xp-upgrade"
                    :title="`Upgrade to Level ${skill.level + 1}`"
                    @click="upgradeSkillLevel(index)"
                  >
                    +Lvl ({{ getXPCost(skill.name, skill.level + 1, skill.psa) }} XP)
                  </button>
                </div>
                <div class="reorder-actions">
                  <button
                    type="button"
                    class="btn-reorder btn-move-up"
                    title="Move Skill Up"
                    :disabled="index === 0"
                    @click.stop="moveSkill(index, -1)"
                  >▲</button>
                  <button
                    type="button"
                    class="btn-reorder btn-move-down"
                    title="Move Skill Down"
                    :disabled="index === (selectedChar.skills ? selectedChar.skills.length - 1 : 0)"
                    @click.stop="moveSkill(index, 1)"
                  >▼</button>
                </div>
                <button class="btn-remove" title="Remove Skill" @click="removeSkill(index)">✕</button>
              </li>
            </ul>
          </section>

          <!-- Inventory -->
          <section class="card list-card">
            <div class="list-header">
              <h4>Inventory & Mass</h4>
              <div class="list-header-actions">
                <button class="btn-secondary btn-add-equipment" @click="showEquipmentModal = true">+ Add Equipment</button>
                <button class="btn-secondary btn-open-forge" @click="openForgeApplet">⚒️ Item Forge</button>
                <button class="btn-secondary btn-add-custom-item" @click="addInventoryItem">+ Custom Item</button>
              </div>
            </div>
            <div class="inventory-search-wrap" style="margin-bottom: 12px;">
              <input 
                type="text" 
                v-model="searchInventoryQuery" 
                placeholder="Search Inventory..." 
                class="item-name-input" 
                style="width: 100%; box-sizing: border-box;"
              />
            </div>
            <div v-if="!filteredInventory || filteredInventory.length === 0" class="empty-list">
              {{ searchInventoryQuery ? 'No matching items in inventory.' : 'No equipment in inventory. Search available equipment or add a custom item!' }}
            </div>
            <ul v-else class="items-list">
              <li
                v-for="(item, index) in filteredInventory"
                :key="item.id || index"
                class="item-row inventory-row"
                :class="{ 'drag-over': dragOverInventoryIndex === index, 'dragging': draggedInventoryIndex === index }"
                draggable="true"
                @dragstart="onInventoryDragStart($event, index)"
                @dragover="onInventoryDragOver($event, index)"
                @dragleave="onInventoryDragLeave($event, index)"
                @drop="onInventoryDrop($event, index)"
                @dragend="onInventoryDragEnd"
              >
                <span
                  class="drag-handle"
                  title="Drag to reorder item"
                  @click.stop
                >⋮⋮</span>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                  <input
                    type="text"
                    v-model="item.name"
                    @change="updateCharacter"
                    placeholder="Item Name"
                    class="item-name-input"
                  />
                  <input 
                    type="text"
                    v-model="item.notes"
                    @change="updateCharacter"
                    placeholder="Notes / Capabilities"
                    class="item-name-input"
                    style="font-size: 0.8rem; color: #8b949e; background: transparent; border: 1px dashed #30363d;"
                  />
                </div>
                <div class="item-weight-wrap">
                  <label>Kg:</label>
                  <input
                    type="number"
                    step="0.1"
                    v-model.number="item.weight"
                    @change="updateCharacter"
                    min="0"
                    class="item-weight-input"
                  />
                </div>
                <div class="level-wrap">
                  <label>Qty:</label>
                  <input
                    type="number"
                    v-model.number="item.quantity"
                    @change="updateCharacter"
                    min="1"
                    class="item-level-input"
                  />
                </div>
                <div class="reorder-actions">
                  <button
                    type="button"
                    class="btn-reorder btn-move-up"
                    title="Move Item Up"
                    :disabled="isInventoryMoveDisabled(item, -1)"
                    @click.stop="moveInventoryItem(item, -1)"
                  >▲</button>
                  <button
                    type="button"
                    class="btn-reorder btn-move-down"
                    title="Move Item Down"
                    :disabled="isInventoryMoveDisabled(item, 1)"
                    @click.stop="moveInventoryItem(item, 1)"
                  >▼</button>
                </div>
                <button class="btn-remove" title="Remove Item" @click="removeInventoryItem(item)">✕</button>
              </li>
            </ul>
          </section>
        </div>

        <!-- Sheet Mode / Domain Tabs -->
        <div class="sheet-domain-tabs" role="tablist" aria-label="Character Sheet Sections">
          <button
            type="button"
            role="tab"
            class="domain-tab-btn"
            :class="{ active: activeSheetTab === 'grimoire' }"
            :aria-selected="activeSheetTab === 'grimoire'"
            @click="activeSheetTab = 'grimoire'"
          >
            ✨ Grimoire &amp; Techniques ({{ (selectedChar.grimoire && selectedChar.grimoire.length) || 0 }})
          </button>
          <button
            type="button"
            role="tab"
            class="domain-tab-btn"
            :class="{ active: activeSheetTab === 'forge' }"
            :aria-selected="activeSheetTab === 'forge'"
            @click="openForgeApplet"
          >
            ⚒️ Custom Equipment &amp; Magic Item Forge (Max Tier {{ maxForgeTier }})
          </button>
          <button
            type="button"
            role="tab"
            class="domain-tab-btn"
            :class="{ active: activeSheetTab === 'notes' }"
            :aria-selected="activeSheetTab === 'notes'"
            @click="activeSheetTab = 'notes'"
          >
            📜 Notes ({{ (selectedChar.note_panels && selectedChar.note_panels.length) || 0 }})
          </button>
        </div>

        <!-- Grimoire & Techniques Tab -->
        <section class="card grimoire-section" v-show="activeSheetTab === 'grimoire' || activeSheetTab === 'all'">
          <div class="list-header grimoire-header">
            <div>
              <h4>Grimoire &amp; Martial Techniques</h4>
              <span class="grimoire-sub">Universal Magnitude Table • Cost = Cast Tier &times; 2 (ESS or STA)</span>
            </div>
            <div class="list-header-actions">
              <button type="button" class="btn-secondary btn-add-spell" @click="addGrimoireEntry">+ Write Spell / Technique</button>
            </div>
          </div>

          <div v-if="lastCastResult" class="grimoire-cast-banner">
            <div class="cast-banner-main">
              <strong>{{ lastCastResult.spellName }}</strong>
              <span class="cast-tradition-tag">{{ lastCastResult.tradition }} • Tier {{ lastCastResult.castTier }}</span>
              <span class="cast-cost-tag">-{{ lastCastResult.cost }} {{ lastCastResult.fuel.toUpperCase() }}</span>
            </div>
            <div class="cast-banner-rolls">
              <span class="cast-check-pill" :class="{ success: lastCastResult.success, fail: !lastCastResult.success }">
                d100: {{ lastCastResult.d100Roll }} vs {{ lastCastResult.targetPct }}% ({{ lastCastResult.outcomeLabel }})
              </span>
              <span class="cast-effect-pill">
                Magnitude ({{ lastCastResult.diceFormula }}): <strong>{{ lastCastResult.effectTotal }}</strong> — {{ lastCastResult.summary }}
              </span>
              <button type="button" class="btn-dismiss-cast" @click="lastCastResult = null">✕</button>
            </div>
          </div>

          <div v-if="!selectedChar.grimoire || selectedChar.grimoire.length === 0" class="empty-list grimoire-empty">
            No spells or martial techniques scribed yet. Click <strong>+ Write Spell / Technique</strong> to author a custom power tied to a Magic or Ki Tradition!
          </div>

          <ul v-else class="items-list grimoire-list">
            <li
              v-for="(spell, sIdx) in selectedChar.grimoire"
              :key="spell.spell_id || sIdx"
              class="grimoire-row card"
            >
              <div class="grimoire-row-top">
                <input
                  type="text"
                  v-model="spell.name"
                  @change="updateGrimoire"
                  placeholder="Spell / Technique Name"
                  class="item-name-input spell-name-input"
                />
                <select
                  v-model="spell.category"
                  @change="updateGrimoire"
                  class="select-official-skill spell-category-select"
                  title="Universal Magnitude Category"
                >
                  <option value="strike">Strike</option>
                  <option value="blast">Blast / Cleave</option>
                  <option value="ward_heal">Ward / Heal</option>
                  <option value="hex_summon">Hex / Control</option>
                </select>
                <div class="spell-dial-group" :title="'Cast Tier (0–' + getMaxCastTierForSpell(spell) + ')'">
                  <span class="spell-tier-label">Tier</span>
                  <input
                    type="number"
                    v-model.number="spell.default_tier"
                    @change="clampSpellTier(spell); updateGrimoire()"
                    min="0"
                    :max="getMaxCastTierForSpell(spell)"
                    class="item-level-input spell-tier-input"
                    :title="'Cast Tier (0–' + getMaxCastTierForSpell(spell) + ')'"
                  />
                </div>
                <span class="skill-chance-badge spell-target-badge" :title="'Tradition Target: ' + getSpellTargetPct(spell) + '%'">
                  Tgt {{ getSpellTargetPct(spell) }}%
                </span>
                <span class="spell-cost-badge" :title="'Resource Cost (Cast Tier × 2)'">
                  {{ getSpellCost(spell) }} {{ getSpellFuelLabel(spell) }}
                </span>
                <button
                  type="button"
                  class="btn-xp-upgrade btn-cast-spell"
                  title="Cast / Channel this power"
                  @click="castGrimoireSpell(spell, sIdx)"
                >
                  ⚡ Cast
                </button>
                <button
                  type="button"
                  class="btn-remove btn-remove-spell"
                  title="Delete Spell"
                  @click="removeGrimoireEntry(sIdx)"
                >✕</button>
              </div>

              <div class="grimoire-row-bot">
                <span class="spell-magnitude-badge" :title="'Universal Magnitude: ' + getSpellMagnitudeSummary(spell)">
                  {{ getSpellMagnitudeSummary(spell) }}
                </span>
                <input
                  type="text"
                  v-model="spell.range_area"
                  @change="updateGrimoire"
                  placeholder="Range / Area (e.g. 60 ft)"
                  class="item-name-input spell-range-input"
                />
                <input
                  type="text"
                  v-model="spell.description"
                  @change="updateGrimoire"
                  placeholder="Flavor &amp; secondary effect notes..."
                  class="item-name-input spell-desc-input"
                />
              </div>
            </li>
          </ul>
        </section>

        <!-- Notes Section -->
        <section class="notes-section">
          <div class="section-header notes-section-header">
            <h4>Notes</h4>
            <button
              type="button"
              class="btn-secondary btn-add-note-panel"
              :disabled="selectedChar.note_panels && selectedChar.note_panels.length >= 4"
              @click="addNotePanel"
              :title="selectedChar.note_panels && selectedChar.note_panels.length >= 4 ? 'Maximum of 4 note panels reached' : 'Add Note Panel'"
            >
              + Add Note Panel
            </button>
          </div>
          <div v-if="!selectedChar.note_panels || selectedChar.note_panels.length === 0" class="panels-empty card">
            <p>No note panels yet. Click <strong>+ Add Note Panel</strong> above to create one!</p>
          </div>
          <div v-else class="note-panels-grid">
            <section
              v-for="(panel, index) in selectedChar.note_panels"
              :key="panel.id || index"
              class="note-panel-card card"
              :class="{ 'panel-drag-over': dragOverNotePanelIndex === index }"
              draggable="true"
              @dragstart="onNotePanelDragStart($event, index)"
              @dragover.prevent="onNotePanelDragOver($event, index)"
              @dragleave="onNotePanelDragLeave($event, index)"
              @drop="onNotePanelDrop($event, index)"
              @dragend="onNotePanelDragEnd"
            >
              <div class="panel-card-header">
                <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
                <input
                  type="text"
                  v-model="panel.title"
                  @change="updateNotePanels"
                  class="panel-title-input"
                  placeholder="Note Title"
                />
                <div class="reorder-actions">
                  <button
                    type="button"
                    class="btn-reorder btn-move-up"
                    title="Move Panel Up"
                    :disabled="index === 0"
                    @click.stop="moveNotePanel(index, -1)"
                  >▲</button>
                  <button
                    type="button"
                    class="btn-reorder btn-move-down"
                    title="Move Panel Down"
                    :disabled="index === selectedChar.note_panels.length - 1"
                    @click.stop="moveNotePanel(index, 1)"
                  >▼</button>
                </div>
                <button
                  type="button"
                  class="btn-delete-panel"
                  title="Delete Note Panel"
                  @click="deleteNotePanel(index)"
                >✕</button>
              </div>
              <textarea
                v-model="panel.content"
                @change="updateNotePanels"
                class="notes-textarea panel-content-textarea"
                rows="6"
                placeholder="Write notes, background details, mission logs..."
              ></textarea>
            </section>
          </div>
        </section>
      </div>
    </main>

    <!-- Create Character Modal -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
      <div class="modal-card">
        <h3>Create New Character</h3>
        <form @submit.prevent="createCharacter">
          <div class="form-group">
            <label>Character Name</label>
            <input type="text" v-model="newCharForm.name" required placeholder="e.g. Wilf Tybo" />
          </div>
          <div class="form-group">
            <label>Character Portrait / Avatar (Optional)</label>
            <div class="modal-avatar-row">
              <div v-if="newCharForm.avatar_url" class="modal-avatar-preview" @click="openImageBrowser('create')" title="Click to change image">
                <img :src="newCharForm.avatar_url" alt="Character Avatar Preview" />
                <button type="button" class="btn-remove-avatar" title="Remove image" @click.stop="newCharForm.avatar_url = ''">✕</button>
              </div>
              <button
                type="button"
                class="btn-browse-avatar"
                @click="openImageBrowser('create')"
              >
                Browse Images...
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Species / Lineage</label>
            <select v-model="newCharForm.race" @change="onCreateRaceChange" class="char-create-select">
              <optgroup label="The Norn (Elves, Dwarves & Wendhya)">
                <option value="Dawn Elves">Dawn Elves (+5 INT, +5 HIST/REL, -5 STA)</option>
                <option value="Dusk Elves">Dusk Elves (+5 INT, +5 DEX, -5 STA)</option>
                <option value="Sylvan Elves">Sylvan Elves (+5 DEX, +5 RS, -5 STR)</option>
                <option value="Wilder Elves">Wilder Elves (+5 DEX, +5 WIL, -5 HIST/REL)</option>
                <option value="Twilight Elves">Twilight Elves (+5 DEX, +5 WIL, -5 STR)</option>
                <option value="Wendhya">Wendhya (+5 WIL, +5 RS, -5 STR)</option>
                <option value="Weirgoth Dwarves">Weirgoth Dwarves (+5 STA, +5 WIL, -5 DEX)</option>
                <option value="Vanir Dwarves">Vanir Dwarves (+5 STR, +5 STA, -5 RS)</option>
              </optgroup>
              <optgroup label="The Urkai & Goblinoid Clans">
                <option value="Frost Urkai">Frost Urkai (+5 STR, +5 STA, -5 HIST/REL)</option>
                <option value="Ash Urkai">Ash Urkai (+5 STR, +5 STA, -5 HIST/REL)</option>
                <option value="Forest Urkai">Forest Urkai (+5 STR, +5 DEX, -5 HIST/REL)</option>
                <option value="Stone Urkai">Stone Urkai (+5 STR, +10 STA, -5 DEX, -5 HIST/REL)</option>
                <option value="Orcish">Orcish (+5 STR, +5 STA, -5 INT)</option>
                <option value="Hobgoblins">Hobgoblins (+5 STR, +5 PRE, -5 WIL)</option>
                <option value="Goblins">Goblins (+10 DEX, +5 RS, -10 STR, -5 STA)</option>
              </optgroup>
              <optgroup label="The Giants & Primordial Kin">
                <option value="True Giants">True Giants (+20 STR, +20 STA)</option>
                <option value="Giantken / Goliath">Giantken / Goliath (+10 STR, +10 STA, -10 DEX, -5 HIST/REL)</option>
                <option value="Trollkin">Trollkin (+10 STR, +10 STA, -10 INT, -5 PRE)</option>
                <option value="Ogre">Ogre (+15 STR, +15 STA, -15 INT, -10 DEX)</option>
                <option value="Minotaur / Nord Minotaur">Minotaur / Nord Minotaur (+10 STR, +5 STA, -5 INT)</option>
              </optgroup>
              <optgroup label="Hybrid & Foundation Folk">
                <option value="Whisperlings">Whisperlings (+5 DEX, +5 WIL, -5 STR)</option>
                <option value="Mixlanders">Mixlanders (+5 DEX, +5 INT, -5 STA)</option>
                <option value="Human">Human (+5 INT, +5 PRE)</option>
              </optgroup>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div v-if="racesData[newCharForm.race]" class="form-group lineage-preview-box">
            <div class="lineage-preview-trait">
              <strong>{{ racesData[newCharForm.race].trait_name }}:</strong> {{ racesData[newCharForm.race].abilities }}
            </div>
            <div class="lineage-preview-stats">
              <strong>Lineage Adjusted Baseline (from 50):</strong>
              STR {{ newCharForm.str }} / STA {{ newCharForm.sta }} &bull;
              DEX {{ newCharForm.dex }} / RS {{ newCharForm.rs }} &bull;
              INT {{ newCharForm.int }} / HIST/REL {{ newCharForm.log }} &bull;
              WIL {{ newCharForm.per }} / PRE {{ newCharForm.ldr }}
            </div>
          </div>
          <div v-if="newCharForm.race === 'Custom'" class="form-group custom-race-input-group">
            <label>Custom Species Name</label>
            <input
              type="text"
              v-model="newCharForm.customRaceName"
              class="char-create-input"
              placeholder="Enter custom species name..."
            />
          </div>
          <div class="form-group">
            <label>Primary System Area (PSA)</label>
            <select v-model="newCharForm.psa" class="char-create-select">
              <option value="Martial">Martial</option>
              <option value="Mystic">Mystic</option>
              <option value="Theurgy">Theurgy</option>
            </select>
          </div>
          <div v-if="isGm && registeredUsers.length > 0" class="form-group">
            <label>Assigned Player</label>
            <select v-model="newCharForm.user_id" class="char-create-select">
              <option v-for="u in registeredUsers" :key="u.id" :value="u.id">
                {{ u.username }} ({{ u.role === 'GameMaster' ? 'GM' : 'Player' }})
              </option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-modal-cancel" @click="showCreateModal = false">Cancel</button>
            <button type="submit" class="btn-modal-create" :disabled="creating">Create Character</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Equipment Catalog Modal -->
    <div v-if="showEquipmentModal" class="modal-backdrop" @click.self="showEquipmentModal = false">
      <div class="modal-card equipment-modal">
        <div class="equipment-modal-header">
          <h3>Available Equipment Catalog</h3>
          <button class="btn-close-modal" title="Close" @click="showEquipmentModal = false">✕</button>
        </div>
        <p class="equipment-modal-desc">
          Search weapons, defenses, and gear from the Wayworlds catalog. Click <strong>+ Add</strong> to add an item to your character's inventory.
        </p>

        <!-- Category Filter Tabs -->
        <div class="equipment-category-tabs" role="tablist" aria-label="Equipment Categories">
          <button
            v-for="cat in equipmentCategories"
            :key="cat"
            type="button"
            role="tab"
            class="cat-tab"
            :class="{ active: (activeEquipmentCategory || 'All') === cat }"
            :aria-selected="(activeEquipmentCategory || 'All') === cat"
            @click="activeEquipmentCategory = cat"
          >
            {{ cat }} <span class="cat-count">({{ getCategoryCount(cat) }})</span>
          </button>
        </div>

        <input 
          type="text" 
          v-model="equipmentSearchQuery" 
          placeholder="Search available equipment by name, category, or capability..." 
          class="modal-search"
          autofocus
        />
        <div class="equipment-list">
          <div v-if="filteredEquipmentList.length === 0" class="empty-list">No equipment found matching your search.</div>
          <div v-for="item in filteredEquipmentList" :key="item.name" class="equipment-card">
            <div class="eq-header">
              <span class="eq-name">{{ item.name }}</span>
              <button
                class="btn-secondary eq-add-btn"
                :class="{ 'btn-added': recentlyAddedMap[item.name] }"
                @click="addEquipment(item)"
              >
                {{ recentlyAddedMap[item.name] ? '✓ Added' : '+ Add' }}
              </button>
            </div>
            <div class="eq-details">
              <span class="eq-tag">{{ item.category }}</span>
              <span v-if="item.cost !== undefined" class="eq-cost">{{ item.cost }} gp</span>
              <span class="eq-weight">{{ item.weight ?? item.weight_lbs ?? 0 }} lbs</span>
            </div>
            <div class="eq-capabilities">{{ item.capabilities || item.properties || '' }}</div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="showEquipmentModal = false">Done</button>
        </div>
      </div>
    </div>

    <!-- Custom Equipment & Magic Item Forge Applet Modal -->
    <div v-if="showForgeModal" class="modal-backdrop" @click.self="showForgeModal = false">
      <div class="modal-card equipment-modal forge-applet-modal">
        <div class="equipment-modal-header">
          <h3>⚒️ Custom Equipment &amp; Magic Item Forge</h3>
          <button class="btn-close-modal" title="Close" @click="showForgeModal = false">✕</button>
        </div>
        <p class="equipment-modal-desc">
          Craft mundane, masterwork, or runeforged gear using clean <strong>Nd10</strong> damage and <strong>%</strong> modifiers (no flat + damage numbers).
          <span class="forge-cap-badge">
            Tradecraft Rank: Lvl {{ characterTradecraftRank }} &bull; Max Forge Tier: Tier {{ maxForgeTier }}
          </span>
        </p>

        <div v-if="forgeError" class="error-banner forge-error-banner">
          <span>⚠️ {{ forgeError }}</span>
          <button type="button" class="btn-dismiss-error" @click="forgeError = ''">✕</button>
        </div>
        <div v-if="lastForgeResult" class="grimoire-cast-banner forge-result-banner">
          <span>{{ lastForgeResult.message }}</span>
        </div>

        <form @submit.prevent="submitForgeItem" class="forge-form">
          <div class="form-row">
            <div class="form-group">
              <label>Item Name *</label>
              <input type="text" v-model="forgeForm.name" class="forge-name-input" placeholder="e.g. Rime-Forged Greatsword" required />
            </div>
            <div class="form-group">
              <label>Category</label>
              <select v-model="forgeForm.category" @change="onForgeCategoryChange" class="char-create-select forge-category-select">
                <option value="weapon">Weapon (Nd10 &amp; Hit %)</option>
                <option value="armor">Armor (DR / Halving)</option>
                <option value="shield">Shield (Attacker Hit % Penalty)</option>
                <option value="relic">Relic / Essence Focus</option>
                <option value="kit">Artisan / Medic Kit</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Required Tradecraft Specialization</label>
              <input
                type="text"
                v-model="forgeForm.required_tradecraft"
                class="forge-tradecraft-input"
                placeholder="e.g. Weaponsmith, Armorer, Bowyer"
              />
            </div>
            <div class="form-group">
              <label>Craft Tier (Max: Tier {{ Math.max(1, maxForgeTier) }})</label>
              <select v-model.number="forgeForm.item_tier" @change="onForgeTierChange" class="char-create-select forge-tier-select">
                <option v-for="t in [1, 2, 3, 4, 5]" :key="t" :value="t" :disabled="!isGm && t > Math.max(1, maxForgeTier)">
                  Tier {{ t }} {{ t === 1 ? '(Mundane)' : (t <= 4 ? '(Masterwork)' : '(Runeforged / Magic)') }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="forgeForm.category === 'weapon'" class="form-row">
            <div class="form-group">
              <label>Damage Dice (Nd10 only, no flat + numbers)</label>
              <input
                type="text"
                v-model="forgeForm.damage_dice"
                class="forge-damage-input"
                placeholder="e.g. 2d10 or 3d10 Slashing + 1d10 Cold"
              />
            </div>
            <div class="form-group">
              <label>Attack Hit Bonus (%)</label>
              <select v-model.number="forgeForm.attack_pct_bonus" class="char-create-select forge-atk-bonus-select">
                <option :value="0">+0% (Standard)</option>
                <option :value="5" :disabled="!isGm && forgeForm.item_tier < 2">+5% (Tier 2+ Masterwork)</option>
                <option :value="10" :disabled="!isGm && forgeForm.item_tier < 3">+10% (Tier 3+ Superior)</option>
                <option :value="15" :disabled="!isGm && forgeForm.item_tier < 4">+15% (Tier 4+ Apex)</option>
                <option :value="20" :disabled="!isGm && forgeForm.item_tier < 5">+20% (Tier 5 Runeforged)</option>
              </select>
            </div>
          </div>

          <div v-if="forgeForm.category === 'shield'" class="form-row">
            <div class="form-group">
              <label>Attacker Hit % Penalty</label>
              <select v-model.number="forgeForm.attacker_pct_penalty" class="char-create-select forge-shield-penalty-select">
                <option :value="-10">-10% (Base Shield)</option>
                <option :value="-15" :disabled="!isGm && forgeForm.item_tier < 2">-15% (Tier 2+ Reinforced)</option>
                <option :value="-20" :disabled="!isGm && forgeForm.item_tier < 3">-20% (Tier 3+ Masterwork)</option>
                <option :value="-25" :disabled="!isGm && forgeForm.item_tier < 5">-25% (Tier 5 Runeforged)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Weight (lbs)</label>
              <input type="number" step="0.5" min="0" v-model.number="forgeForm.weight_lbs" />
            </div>
          </div>

          <div v-if="forgeForm.category === 'armor'" class="form-row">
            <div class="form-group">
              <label>Armor DR / Mitigation</label>
              <select v-model="forgeForm.armor_dr_bonus" class="char-create-select">
                <option value="Light Armor (-2 DR per die)">Light Armor (-2 DR per die)</option>
                <option value="Reinforced Light Armor (-3 DR per die)">Reinforced Light Armor (-3 DR per die)</option>
                <option value="Medium Armor (Halves Slashing; -2 DR/die)">Medium Armor (Halves Slashing; -2 DR/die)</option>
                <option value="Heavy Armor (Halves All Physical Damage)">Heavy Armor (Halves All Physical Damage)</option>
                <option value="Apex Fitted Heavy Armor (Halves Physical, No Penalty)">Apex Fitted Heavy Armor (Halves Physical, No Penalty)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Weight (lbs)</label>
              <input type="number" step="0.5" min="0" v-model.number="forgeForm.weight_lbs" />
            </div>
          </div>

          <div v-if="forgeForm.category !== 'shield' && forgeForm.category !== 'armor'" class="form-row">
            <div class="form-group">
              <label>Weight (lbs)</label>
              <input type="number" step="0.5" min="0" v-model.number="forgeForm.weight_lbs" />
            </div>
            <div class="form-group">
              <label>Bound Power / Properties (Optional)</label>
              <input
                type="text"
                v-model="forgeForm.bound_power"
                placeholder="e.g. Bound Tier 2 Frost Strike or Finesse"
              />
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-modal-cancel" @click="showForgeModal = false">Close</button>
            <button type="submit" class="btn-modal-create btn-forge-submit">⚒️ Forge &amp; Add to Inventory</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Image Browser Modal -->
    <ImageBrowserModal
      v-model="showImageBrowser"
      :title="imageBrowserTitle"
      :current-image="currentBrowserImage"
      @select="onImageSelected"
    />
  </div>
</template>

<script>
import { socket } from '../services/socket.js';
import { useAuthStore } from '../stores/auth.js';
import {
  RACES_DATA,
  getLineageBaselineStats,
  OFFICIAL_SKILLS,
  MAGIC_TRADITIONS,
  UNIVERSAL_MAGNITUDE_TABLE,
  calcCharacterTier,
  calcCastCost,
  getMagnitudeEntry,
  getTraditionConfig,
  calcTraditionTargetPct,
  getCharacterTradecraftRank,
  calcMaxForgeTier,
  validateTradecraftSpecialization,
  validateForgeDamageFormula,
  validateForgedItem,
  calcIM,
  calcMeleeHit,
  calcMaxCarry,
  calcUnencumberedMax,
  calcXPCost,
} from '../constants/characterRules.js';
import ImageBrowserModal from '../components/ImageBrowserModal.vue';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';
import { downloadCharacterAscii } from '../utils/characterExport.js';
import { COLOR_PACKAGES } from '../utils/themeManager.js';

export function parseCharacterNotePanels(notes) {
  if (Array.isArray(notes)) {
    return notes.slice(0, 4).map((p, idx) => ({
      id: p.id || `p_${Date.now()}_${idx}`,
      title: p.title !== undefined ? String(p.title) : 'Note',
      content: p.content !== undefined ? String(p.content) : '',
    }));
  }
  if (typeof notes === 'string' && notes.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(notes);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 4).map((p, idx) => ({
          id: p.id || `p_${Date.now()}_${idx}`,
          title: p.title !== undefined ? String(p.title) : 'Note',
          content: p.content !== undefined ? String(p.content) : '',
        }));
      }
    } catch {
      // Fallback to legacy plain string
    }
  }
  if (typeof notes === 'string' && notes.trim()) {
    return [
      { id: 'p_notes', title: 'Notes', content: notes.trim() },
    ];
  }
  return [];
}

export default {
  name: 'CharacterSheetsView',
  components: {
    ImageBrowserModal,
  },
  data() {
    return {
      characters: [],
      selectedChar: null,
      loading: true,
      creating: false,
      errorMessage: '',
      isSidebarCollapsedLeft: false,
      isSidebarRolledUp: false,
      draggedCharIndex: null,
      dragOverCharIndex: null,
      draggedSkillIndex: null,
      dragOverSkillIndex: null,
      draggedInventoryIndex: null,
      dragOverInventoryIndex: null,
      draggedNotePanelIndex: null,
      dragOverNotePanelIndex: null,
      showCreateModal: false,
      showImageBrowser: false,
      imageBrowserTarget: 'char',
      colorPackages: COLOR_PACKAGES,
      racesData: RACES_DATA,
      officialSkills: OFFICIAL_SKILLS,
      equipmentList: [],
      showEquipmentModal: false,
      activeEquipmentCategory: 'All',
      equipmentCategories: ['All', 'Weapon', 'Ammunition', 'Defense', 'Toolkit', 'Medical', 'Gear', 'Power'],
      equipmentSearchQuery: '',
      searchInventoryQuery: '',
      recentlyAddedMap: {},
      registeredUsers: [],
      newCharForm: {
        name: '',
        race: 'Dawn Elves',
        customRaceName: '',
        psa: 'Martial',
        color_theme: '',
        avatar_url: '',
        user_id: null,
        str: 50,
        sta: 45,
        dex: 50,
        rs: 50,
        int: 55,
        log: 55,
        per: 50,
        ldr: 50,
        str_sta: 50,
        dex_rs: 50,
        int_log: 50,
        per_ldr: 50,
        max_stamina: 45,
        current_stamina: 45,
        current_xp: 0,
      },
      staminaDelta: null,
      essDelta: null,
      xpDelta: null,
      activeSheetTab: 'all',
      magicTraditions: MAGIC_TRADITIONS,
      magnitudeTable: UNIVERSAL_MAGNITUDE_TABLE,
      lastCastResult: null,
      showForgeModal: false,
      forgeError: '',
      lastForgeResult: null,
      forgeForm: {
        name: '',
        category: 'weapon',
        required_tradecraft: 'Weaponsmith',
        item_tier: 1,
        damage_dice: '2d10',
        attack_pct_bonus: 0,
        attacker_pct_penalty: -5,
        armor_dr_bonus: 'Light Armor (-2 DR per die)',
        weight_lbs: 3,
        bound_power: '',
      },
    };
  },
  computed: {
    characterSheetColorPkg() {
      return (this.selectedChar && this.selectedChar.color_theme) || null;
    },
    characterTier() {
      return this.getCharTier(this.selectedChar);
    },
    characterTradecraftRank() {
      return getCharacterTradecraftRank(this.selectedChar, this.forgeForm?.required_tradecraft || null);
    },
    maxForgeTier() {
      const rank = getCharacterTradecraftRank(this.selectedChar);
      const effectiveRank = Math.max(1, rank);
      return calcMaxForgeTier(effectiveRank, this.isGm);
    },
    isGm() {
      try {
        const authStore = useAuthStore();
        return authStore.user?.role === 'GameMaster';
      } catch {
        return false;
      }
    },
    currentBrowserImage() {
      if (this.imageBrowserTarget === 'char') {
        return this.selectedChar ? (this.selectedChar.avatar_url || '') : '';
      }
      return this.newCharForm ? (this.newCharForm.avatar_url || '') : '';
    },
    imageBrowserTitle() {
      return this.imageBrowserTarget === 'char' ? 'Select Character Portrait' : 'Select Character Avatar';
    },
    filteredEquipmentList() {
      if (!this.equipmentList) return [];
      let list = this.equipmentList;
      if (this.activeEquipmentCategory && this.activeEquipmentCategory !== 'All') {
        list = list.filter(item => item.category === this.activeEquipmentCategory);
      }
      if (!this.equipmentSearchQuery) return list;
      const q = this.equipmentSearchQuery.toLowerCase().trim();
      return list.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) || 
        (item.category && item.category.toLowerCase().includes(q)) || 
        (item.capabilities && item.capabilities.toLowerCase().includes(q)) ||
        (item.properties && item.properties.toLowerCase().includes(q))
      );
    },
    filteredInventory() {
      if (!this.selectedChar || !this.selectedChar.inventory) return [];
      if (!this.searchInventoryQuery) return this.selectedChar.inventory;
      const q = this.searchInventoryQuery.toLowerCase().trim();
      return this.selectedChar.inventory.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    },
    staminaPercentage() {
      if (!this.selectedChar || !this.selectedChar.max_stamina) return 0;
      const pct = (this.selectedChar.current_stamina / this.selectedChar.max_stamina) * 100;
      return Math.max(0, Math.min(100, pct));
    },
    staminaColor() {
      const pct = typeof this.staminaPercentage === 'number' ? this.staminaPercentage : (this.selectedChar?.max_stamina ? (this.selectedChar.current_stamina / this.selectedChar.max_stamina) * 100 : 0);
      if (pct > 50) return '#79d79b';
      if (pct > 25) return '#fb923c';
      return '#ef4444';
    },
    staminaGlow() {
      const pct = typeof this.staminaPercentage === 'number' ? this.staminaPercentage : (this.selectedChar?.max_stamina ? (this.selectedChar.current_stamina / this.selectedChar.max_stamina) * 100 : 0);
      if (pct > 50) return '0 0 10px rgba(121, 215, 155, 0.7)';
      if (pct > 25) return '0 0 10px rgba(251, 146, 60, 0.7)';
      return '0 0 10px rgba(239, 68, 68, 0.7)';
    },
    essPercentage() {
      if (!this.selectedChar || !this.selectedChar.max_ess) return 0;
      const pct = (this.selectedChar.current_ess / this.selectedChar.max_ess) * 100;
      return Math.max(0, Math.min(100, pct));
    },
    essColor() {
      const pct = typeof this.essPercentage === 'number' ? this.essPercentage : (this.selectedChar?.max_ess ? (this.selectedChar.current_ess / this.selectedChar.max_ess) * 100 : 0);
      if (pct > 50) return '#14b8a6';
      if (pct > 25) return '#fdba74';
      return '#fca5a5';
    },
    essGlow() {
      const pct = typeof this.essPercentage === 'number' ? this.essPercentage : (this.selectedChar?.max_ess ? (this.selectedChar.current_ess / this.selectedChar.max_ess) * 100 : 0);
      if (pct > 50) return '0 0 10px rgba(20, 184, 166, 0.7)';
      if (pct > 25) return '0 0 10px rgba(253, 186, 116, 0.7)';
      return '0 0 10px rgba(252, 165, 165, 0.7)';
    },
    derivedIM() {
      if (!this.selectedChar) return 5;
      return calcIM(this.selectedChar.rs);
    },
    derivedMeleeHit() {
      if (!this.selectedChar) return 25;
      return calcMeleeHit(this.selectedChar.str, this.selectedChar.dex);
    },
    maxCarryWeight() {
      if (!this.selectedChar) return 50;
      return calcMaxCarry(this.selectedChar.str);
    },
    unencumberedMaxWeight() {
      if (!this.selectedChar) return 25;
      return calcUnencumberedMax(this.selectedChar.str);
    },
    totalInventoryWeight() {
      if (!this.selectedChar || !this.selectedChar.inventory) return 0;
      return this.selectedChar.inventory.reduce((sum, item) => {
        const qty = item.quantity || 1;
        const w = Number(item.weight) || 0;
        return sum + qty * w;
      }, 0);
    },
    encumbrancePct() {
      if (!this.maxCarryWeight) return 0;
      return Math.min(100, Math.round((this.totalInventoryWeight / this.maxCarryWeight) * 100));
    },
    encumbranceColor() {
      if (this.totalInventoryWeight > this.maxCarryWeight) return '#f44336';
      if (this.totalInventoryWeight > this.unencumberedMaxWeight) return '#ff9800';
      return '#4caf50';
    },
    isOverloaded() {
      return this.totalInventoryWeight > this.maxCarryWeight;
    },
    selectedRaceCategory: {
      get() {
        if (!this.selectedChar) return 'Dawn Elves';
        if (!this.selectedChar.race) return 'Custom';
        return this.isCustomRace(this.selectedChar.race) ? 'Custom' : this.selectedChar.race;
      },
      set(val) {
        if (!this.selectedChar) return;
        if (val === 'Custom') {
          if (!this.isCustomRace(this.selectedChar.race) || !this.selectedChar.race?.trim()) {
            this.selectedChar.race = 'Custom';
            this.updateCharacter();
          }
        } else {
          this.selectedChar.race = val;
          this.applyLineageStatsToCharacter(this.selectedChar, val);
          this.updateCharacter();
        }
      },
    },
    movementRates() {
      if (!this.selectedChar || !RACES_DATA[this.selectedChar.race]) {
        return { walk: 30, run: 60, glide: 0 };
      }
      return RACES_DATA[this.selectedChar.race].movement;
    },
  },
  mounted() {
    if (typeof localStorage !== 'undefined') {
      try {
        this.isSidebarCollapsedLeft = localStorage.getItem('wayworlds_char_sidebar_left') === 'true';
        this.isSidebarRolledUp = localStorage.getItem('wayworlds_char_sidebar_rollup') === 'true';
      } catch {
        // Ignore localStorage error
      }
    }
    if (this.isGm) {
      this.fetchUsers();
    }
    this.fetchCharacters();
    this.fetchEquipment();
    this.setupSocketListeners();
  },
  beforeUnmount() {
    if (this._scrollSaveTimer) {
      clearTimeout(this._scrollSaveTimer);
      this._scrollSaveTimer = null;
    }
    this.saveScrollPositions();
    this.removeSocketListeners();
  },
  methods: {
    toggleSidebarLeft() {
      this.isSidebarCollapsedLeft = !this.isSidebarCollapsedLeft;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('wayworlds_char_sidebar_left', String(this.isSidebarCollapsedLeft));
        } catch {
          // Ignore quota error
        }
      }
    },
    toggleSidebarRollup() {
      this.isSidebarRolledUp = !this.isSidebarRolledUp;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('wayworlds_char_sidebar_rollup', String(this.isSidebarRolledUp));
        } catch {
          // Ignore quota error
        }
      }
    },
    getCharTier(char) {
      return calcCharacterTier(char);
    },
    getCurrentUserId() {
      return getSafeUserId();
    },
    onScrollSave() {
      if (this._scrollSaveTimer) {
        clearTimeout(this._scrollSaveTimer);
      }
      this._scrollSaveTimer = setTimeout(() => {
        this._scrollSaveTimer = null;
        this.saveScrollPositions();
      }, 150);
    },
    saveScrollPositions() {
      const sidebarEl = this.$refs?.sidebarList || this.$el?.querySelector?.('.sheet-list, .character-list');
      const mainEl = this.$refs?.mainScroll || this.$el?.querySelector?.('.sheet-detail, .sheet-main');
      const updates = {};
      if (sidebarEl && typeof sidebarEl.scrollTop === 'number') {
        updates.sidebarScrollTop = sidebarEl.scrollTop;
      }
      if (mainEl && typeof mainEl.scrollTop === 'number') {
        updates.mainScrollTop = mainEl.scrollTop;
      }
      if (Object.keys(updates).length > 0) {
        const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
        saveUserState(uid, 'characterSheets', updates);
      }
    },
    restoreScrollPositions(saved) {
      const apply = () => {
        const sidebarEl = this.$refs?.sidebarList || this.$el?.querySelector?.('.sheet-list, .character-list');
        const mainEl = this.$refs?.mainScroll || this.$el?.querySelector?.('.sheet-detail, .sheet-main');
        if (sidebarEl && typeof saved?.sidebarScrollTop === 'number') {
          sidebarEl.scrollTop = saved.sidebarScrollTop;
        }
        if (mainEl && typeof saved?.mainScrollTop === 'number') {
          mainEl.scrollTop = saved.mainScrollTop;
        }
      };
      if (typeof this.$nextTick === 'function') {
        this.$nextTick(apply);
      } else {
        apply();
      }
    },
    normalizeCharacterData(char) {
      const c = { ...char };
      if (!c.psa) c.psa = 'Martial';
      else if (c.psa === 'Military' || c.psa === 'Combat') c.psa = 'Martial';
      else if (c.psa === 'Technological' || c.psa === 'Magic') c.psa = 'Mystic';
      else if (c.psa === 'Biosocial') c.psa = 'Theurgy';
      // Ensure individual stats are set from paired stats if missing
      if (c.str === undefined) c.str = c.str_sta || 50;
      if (c.sta === undefined) c.sta = c.max_stamina !== undefined ? c.max_stamina : (c.str_sta || 50);
      c.max_stamina = c.sta;
      c.current_stamina = c.current_sta !== undefined ? c.current_sta : (c.current_stamina !== undefined ? c.current_stamina : c.sta);
      c.max_ess = c.max_ess !== undefined ? Number(c.max_ess) : 50;
      c.current_ess = c.current_ess !== undefined ? Number(c.current_ess) : c.max_ess;
      c.current_xp = Number(c.current_xp || 0);
      c.owner_username = c.owner_username || '';
      c.user_id = c.user_id !== undefined && c.user_id !== null ? Number(c.user_id) : null;

      if (c.dex === undefined) c.dex = c.dex_rs || 50;
      if (c.rs === undefined) c.rs = c.dex_rs || 50;
      c.int = c.int_stat ?? c.int ?? c.int_log ?? 50;
      c.log = c.log_stat ?? c.log ?? c.int_log ?? 50;
      if (c.per === undefined) c.per = c.per_ldr || 50;
      if (c.ldr === undefined) c.ldr = c.per_ldr || 50;

      if (!c.skills) c.skills = [];
      if (!c.inventory) c.inventory = [];
      if (!Array.isArray(c.grimoire)) {
        c.grimoire = Array.isArray(c.racial_abilities?.grimoire)
          ? [...c.racial_abilities.grimoire]
          : [];
      }
      c.avatar_url = c.avatar_url || '';
      c.notes = c.notes || '';
      if (!c.color_theme && c.id && typeof localStorage !== 'undefined') {
        c.color_theme = localStorage.getItem(`wayworlds_char_theme_${c.id}`) || '';
      } else {
        c.color_theme = c.color_theme || '';
      }
      if (Array.isArray(c.note_panels)) {
        c.note_panels = parseCharacterNotePanels(c.note_panels);
      } else {
        c.note_panels = parseCharacterNotePanels(c.notes);
      }
      return c;
    },
    async fetchCharacters() {
      this.loading = true;
      try {
        const res = await fetch('/api/characters', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          this.characters = data.map((c) => this.normalizeCharacterData(c));
          const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
          const saved = getUserState(uid, 'characterSheets', {
            selectedCharId: null,
            sidebarScrollTop: 0,
            mainScrollTop: 0,
          });
          if (this.characters.length > 0 && !this.selectedChar) {
            const match = saved.selectedCharId != null
              ? this.characters.find((c) => String(c.id) === String(saved.selectedCharId))
              : null;
            this.selectedChar = JSON.parse(JSON.stringify(match || this.characters[0]));
            if (this.restoreScrollPositions) {
              this.restoreScrollPositions(saved);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching characters:', err);
      } finally {
        this.loading = false;
      }
    },
    async fetchUsers() {
      try {
        const res = await fetch('/api/auth/users', { credentials: 'include' });
        if (res.ok) {
          this.registeredUsers = await res.json();
        } else {
          this.registeredUsers = [];
        }
      } catch {
        this.registeredUsers = [];
      }
    },
    isCustomRace(race) {
      return !Object.prototype.hasOwnProperty.call(RACES_DATA, race);
    },
    applyLineageStatsToCharacter(targetChar, lineageName) {
      if (!targetChar || !RACES_DATA[lineageName]) return;
      const base = getLineageBaselineStats(lineageName);
      targetChar.str = base.str;
      targetChar.sta = base.sta;
      targetChar.dex = base.dex;
      targetChar.rs = base.rs;
      targetChar.int = base.int;
      targetChar.log = base.log;
      targetChar.int_stat = base.int;
      targetChar.log_stat = base.log;
      targetChar.per = base.per;
      targetChar.ldr = base.ldr;
      targetChar.max_stamina = base.max_stamina;
      targetChar.current_stamina = base.current_stamina;
      targetChar.max_ess = base.max_ess;
      targetChar.current_ess = base.current_ess;
    },
    onCreateRaceChange() {
      if (!this.newCharForm) return;
      const race = this.newCharForm.race;
      if (RACES_DATA[race]) {
        const base = getLineageBaselineStats(race);
        this.newCharForm.str = base.str;
        this.newCharForm.sta = base.sta;
        this.newCharForm.dex = base.dex;
        this.newCharForm.rs = base.rs;
        this.newCharForm.int = base.int;
        this.newCharForm.log = base.log;
        this.newCharForm.per = base.per;
        this.newCharForm.ldr = base.ldr;
        this.newCharForm.max_stamina = base.max_stamina;
        this.newCharForm.current_stamina = base.current_stamina;
      } else {
        this.newCharForm.str = 50;
        this.newCharForm.sta = 50;
        this.newCharForm.dex = 50;
        this.newCharForm.rs = 50;
        this.newCharForm.int = 50;
        this.newCharForm.log = 50;
        this.newCharForm.per = 50;
        this.newCharForm.ldr = 50;
        this.newCharForm.max_stamina = 50;
        this.newCharForm.current_stamina = 50;
      }
    },
    onCustomRaceChange() {
      if (!this.selectedChar) return;
      if (!this.selectedChar.race?.trim()) {
        this.selectedChar.race = 'Custom';
      } else {
        this.selectedChar.race = this.selectedChar.race.trim();
      }
      this.updateCharacter();
    },
    selectCharacter(char) {
      this.selectedChar = JSON.parse(JSON.stringify(this.normalizeCharacterData(char)));
      if (this.selectedChar && this.selectedChar.id !== undefined) {
        const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
        saveUserState(uid, 'characterSheets', { selectedCharId: this.selectedChar.id });
      }
    },
    openCreateModal() {
      let defaultUserId = null;
      try {
        const authStore = useAuthStore();
        defaultUserId = authStore?.user?.id ?? (this.registeredUsers?.[0]?.id ?? null);
      } catch {
        defaultUserId = this.registeredUsers?.[0]?.id ?? null;
      }
      const defaultLineage = 'Dawn Elves';
      const base = getLineageBaselineStats(defaultLineage);
      this.newCharForm = {
        name: '',
        race: defaultLineage,
        customRaceName: '',
        psa: 'Martial',
        color_theme: '',
        avatar_url: '',
        user_id: defaultUserId,
        str: base.str,
        sta: base.sta,
        dex: base.dex,
        rs: base.rs,
        int: base.int,
        log: base.log,
        per: base.per,
        ldr: base.ldr,
        str_sta: 50,
        dex_rs: 50,
        int_log: 50,
        per_ldr: 50,
        max_stamina: base.max_stamina,
        current_stamina: base.current_stamina,
        current_xp: 0,
      };
      this.showCreateModal = true;
    },
    openImageBrowser(target = 'char') {
      this.imageBrowserTarget = target;
      this.showImageBrowser = true;
    },
    onImageSelected(url) {
      if (this.imageBrowserTarget === 'char') {
        if (this.selectedChar) {
          this.selectedChar.avatar_url = url;
          this.updateCharacter();
        }
      } else if (this.imageBrowserTarget === 'create') {
        this.newCharForm.avatar_url = url;
      }
    },
    async createCharacter() {
      if (!this.newCharForm.name.trim()) return;
      this.creating = true;
      this.errorMessage = '';
      try {
        const effectiveRace = this.newCharForm.race === 'Custom'
          ? (this.newCharForm.customRaceName?.trim() || 'Custom')
          : this.newCharForm.race;
        const base = getLineageBaselineStats(effectiveRace);

        const finalStr = Number(this.newCharForm.str ?? base.str);
        const finalSta = Number(this.newCharForm.sta ?? base.sta);
        const finalDex = Number(this.newCharForm.dex ?? base.dex);
        const finalRs = Number(this.newCharForm.rs ?? base.rs);
        const finalInt = Number(this.newCharForm.int ?? this.newCharForm.int_stat ?? base.int);
        const finalLog = Number(this.newCharForm.log ?? this.newCharForm.log_stat ?? base.log);
        const finalPer = Number(this.newCharForm.per ?? base.per);
        const finalLdr = Number(this.newCharForm.ldr ?? base.ldr);
        const finalMaxEss = Math.max(finalPer, finalLog, finalSta);

        const payload = {
          ...this.newCharForm,
          race: effectiveRace,
          avatar_url: this.newCharForm.avatar_url || '',
          str: finalStr,
          sta: finalSta,
          current_sta: finalSta,
          dex: finalDex,
          rs: finalRs,
          int: finalInt,
          log: finalLog,
          int_stat: finalInt,
          log_stat: finalLog,
          per: finalPer,
          ldr: finalLdr,
          max_stamina: finalSta,
          current_stamina: finalSta,
          max_ess: finalMaxEss,
          current_ess: finalMaxEss,
          current_xp: Number(this.newCharForm.current_xp || 0),
          skills: [],
          inventory: [],
        };
        const res = await fetch('/api/characters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const rawCreated = await res.json();
          const created = this.normalizeCharacterData(rawCreated);
          this.showCreateModal = false;
          if (!this.characters.some((c) => c.id === created.id)) {
            this.characters.push(created);
          }
          this.selectedChar = JSON.parse(JSON.stringify(created));
          if (this.selectedChar && this.selectedChar.id !== undefined) {
            const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
            saveUserState(uid, 'characterSheets', { selectedCharId: this.selectedChar.id });
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          this.errorMessage = errData.error || `Failed to create character (HTTP ${res.status})`;
        }
      } catch (err) {
        console.error('Error creating character:', err);
        this.errorMessage = err.message || 'Error creating character';
      } finally {
        this.creating = false;
      }
    },
    onCharThemeChange() {
      if (this.selectedChar) {
        if (this.selectedChar.id && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(`wayworlds_char_theme_${this.selectedChar.id}`, this.selectedChar.color_theme || '');
          } catch {
            // Ignore quota errors
          }
        }
        this.updateCharacter();
      }
    },
    async updateCharacter() {
      if (!this.selectedChar || !this.selectedChar.id) return;
      this.errorMessage = '';
      try {
        if (this.selectedChar.max_stamina !== undefined) {
          this.selectedChar.sta = this.selectedChar.max_stamina;
        }
        const payload = {
          ...this.selectedChar,
          color_theme: this.selectedChar.color_theme || '',
          int_stat: this.selectedChar.int,
          log_stat: this.selectedChar.log,
          sta: this.selectedChar.sta ?? this.selectedChar.max_stamina ?? 50,
          current_sta: this.selectedChar.current_stamina ?? 50,
          max_ess: this.selectedChar.max_ess !== undefined ? this.selectedChar.max_ess : 50,
          current_ess: this.selectedChar.current_ess !== undefined ? this.selectedChar.current_ess : 50,
          current_xp: this.selectedChar.current_xp !== undefined ? Number(this.selectedChar.current_xp) : 0,
        };
        const res = await fetch(`/api/characters/${this.selectedChar.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const rawUpdated = await res.json();
          const updated = this.normalizeCharacterData(rawUpdated);
          const idx = this.characters.findIndex((c) => c.id === updated.id);
          if (idx !== -1) {
            this.characters[idx] = { ...updated };
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          this.errorMessage = errData.error || `Failed to update character (HTTP ${res.status})`;
        }
      } catch (err) {
        console.error('Error updating character:', err);
        this.errorMessage = err.message || 'Error updating character';
      }
    },
    onMaxStaminaChange() {
      if (!this.selectedChar) return;
      if (this.selectedChar.max_stamina !== undefined) {
        if (this.selectedChar.max_stamina < 1) {
          this.selectedChar.max_stamina = 1;
        }
        this.selectedChar.sta = this.selectedChar.max_stamina;
        if ((this.selectedChar.current_stamina || 0) > this.selectedChar.max_stamina) {
          this.selectedChar.current_stamina = this.selectedChar.max_stamina;
        }
      }
      this.updateCharacter();
    },
    shiftStat(statA, statB, amount) {
      if (!this.selectedChar) return;
      const newA = (this.selectedChar[statA] || 50) + amount;
      const newB = (this.selectedChar[statB] || 50) - amount;
      if (newA < 1 || newA > 100 || newB < 1 || newB > 100) return;
      this.selectedChar[statA] = newA;
      this.selectedChar[statB] = newB;
      if (statA === 'sta') this.selectedChar.max_stamina = newA;
      if (statB === 'sta') this.selectedChar.max_stamina = newB;
      if (this.selectedChar.current_stamina > this.selectedChar.max_stamina) {
        this.selectedChar.current_stamina = this.selectedChar.max_stamina;
      }
      this.updateCharacter();
    },
    onStatChange(statName) {
      if (statName === 'sta' && this.selectedChar) {
        this.selectedChar.max_stamina = this.selectedChar.sta;
      }
      this.updateCharacter();
    },
    adjustStamina(amount) {
      if (!this.selectedChar) return;
      let newSta = (this.selectedChar.current_stamina || 0) + amount;
      newSta = Math.max(0, Math.min(this.selectedChar.max_stamina || 100, newSta));
      this.selectedChar.current_stamina = newSta;
      this.updateCharacter();
    },
    applyStaminaDamage() {
      if (!this.selectedChar) return;
      const delta = Number(this.staminaDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      this.selectedChar.current_stamina = Math.max(0, (this.selectedChar.current_stamina || 0) - delta);
      this.staminaDelta = null;
      this.updateCharacter();
    },
    applyStaminaHeal() {
      if (!this.selectedChar) return;
      const delta = Number(this.staminaDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      const max = this.selectedChar.max_stamina || 100;
      this.selectedChar.current_stamina = Math.min(max, (this.selectedChar.current_stamina || 0) + delta);
      this.staminaDelta = null;
      this.updateCharacter();
    },
    downloadAsciiSheet() {
      if (!this.selectedChar) return;
      downloadCharacterAscii(this.selectedChar);
    },
    resetCharacterStats() {
      if (!this.selectedChar) return;
      this.selectedChar.current_stamina = this.selectedChar.max_stamina || 50;
      this.selectedChar.current_ess = this.selectedChar.max_ess !== undefined ? this.selectedChar.max_ess : 50;
      this.updateCharacter();
    },
    adjustEss(amount) {
      if (!this.selectedChar) return;
      const max = this.selectedChar.max_ess !== undefined ? this.selectedChar.max_ess : 50;
      let newEss = (this.selectedChar.current_ess !== undefined ? this.selectedChar.current_ess : max) + amount;
      newEss = Math.max(0, Math.min(max, newEss));
      this.selectedChar.current_ess = newEss;
      this.updateCharacter();
    },
    reloadEss() {
      if (!this.selectedChar) return;
      const max = this.selectedChar.max_ess !== undefined ? this.selectedChar.max_ess : 50;
      this.selectedChar.current_ess = max;
      this.updateCharacter();
    },
    applyEssBurn() {
      if (!this.selectedChar) return;
      const delta = Number(this.essDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      const max = this.selectedChar.max_ess !== undefined ? this.selectedChar.max_ess : 50;
      this.selectedChar.current_ess = Math.max(0, (this.selectedChar.current_ess !== undefined ? this.selectedChar.current_ess : max) - delta);
      this.essDelta = null;
      this.updateCharacter();
    },
    applyEssRecharge() {
      if (!this.selectedChar) return;
      const delta = Number(this.essDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      const max = this.selectedChar.max_ess !== undefined ? this.selectedChar.max_ess : 50;
      this.selectedChar.current_ess = Math.min(max, (this.selectedChar.current_ess || 0) + delta);
      this.essDelta = null;
      this.updateCharacter();
    },
    onMaxEssChange() {
      if (!this.selectedChar) return;
      if (this.selectedChar.max_ess === undefined || this.selectedChar.max_ess < 0) {
        this.selectedChar.max_ess = 0;
      }
      if ((this.selectedChar.current_ess || 0) > this.selectedChar.max_ess) {
        this.selectedChar.current_ess = this.selectedChar.max_ess;
      }
      this.updateCharacter();
    },
    adjustXP(amount) {
      if (!this.selectedChar) return;
      this.selectedChar.current_xp = Math.max(0, (this.selectedChar.current_xp || 0) + amount);
      this.updateCharacter();
    },
    onXpInputChange() {
      if (!this.selectedChar) return;
      this.selectedChar.current_xp = Math.max(0, Math.min(1000000, Number(this.selectedChar.current_xp || 0)));
      this.updateCharacter();
    },
    applyXpSpend() {
      if (!this.selectedChar) return;
      const delta = Number(this.xpDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      this.selectedChar.current_xp = Math.max(0, (this.selectedChar.current_xp || 0) - delta);
      this.xpDelta = null;
      this.updateCharacter();
    },
    applyXpAward() {
      if (!this.selectedChar) return;
      const delta = Number(this.xpDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      this.selectedChar.current_xp = Math.max(0, (this.selectedChar.current_xp || 0) + delta);
      this.xpDelta = null;
      this.updateCharacter();
    },
    async deleteCharacter(id) {
      if (!confirm('Are you sure you want to delete this character?')) return;
      this.errorMessage = '';
      try {
        const res = await fetch(`/api/characters/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (res.ok) {
          this.characters = this.characters.filter((c) => c.id !== id);
          if (this.selectedChar && this.selectedChar.id === id) {
            this.selectedChar = this.characters.length > 0 ? JSON.parse(JSON.stringify(this.characters[0])) : null;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          this.errorMessage = errData.error || `Failed to delete character (HTTP ${res.status})`;
        }
      } catch (err) {
        console.error('Error deleting character:', err);
        this.errorMessage = err.message || 'Error deleting character';
      }
    },
    addSkill() {
      if (!this.selectedChar.skills) this.selectedChar.skills = [];
      const defaultSkill = OFFICIAL_SKILLS[0].name;
      this.selectedChar.skills.push({ name: defaultSkill, level: 1 });
      this.updateCharacter();
    },
    removeSkill(index) {
      this.selectedChar.skills.splice(index, 1);
      this.updateCharacter();
    },
    moveSkill(index, direction) {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.skills)) return;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.selectedChar.skills.length) return;
      const [moved] = this.selectedChar.skills.splice(index, 1);
      this.selectedChar.skills.splice(targetIndex, 0, moved);
      this.updateCharacter();
    },
    onSkillDragStart(event, index) {
      const tag = event.target?.tagName?.toLowerCase();
      if (['input', 'select', 'textarea', 'button'].includes(tag)) {
        event.preventDefault();
        return;
      }
      this.draggedSkillIndex = index;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      }
    },
    onSkillDragOver(event, index) {
      if (this.draggedSkillIndex === null) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.dragOverSkillIndex = index;
    },
    onSkillDragLeave(event, index) {
      if (this.dragOverSkillIndex === index) {
        this.dragOverSkillIndex = null;
      }
    },
    onSkillDrop(event, targetIndex) {
      event.preventDefault();
      const fromIndex = this.draggedSkillIndex;
      this.draggedSkillIndex = null;
      this.dragOverSkillIndex = null;
      if (fromIndex === null || fromIndex === undefined || fromIndex === targetIndex) return;
      if (!this.selectedChar || !Array.isArray(this.selectedChar.skills)) return;
      if (fromIndex < 0 || fromIndex >= this.selectedChar.skills.length) return;
      if (targetIndex < 0 || targetIndex >= this.selectedChar.skills.length) return;

      const [moved] = this.selectedChar.skills.splice(fromIndex, 1);
      this.selectedChar.skills.splice(targetIndex, 0, moved);
      this.updateCharacter();
    },
    onSkillDragEnd() {
      this.draggedSkillIndex = null;
      this.dragOverSkillIndex = null;
    },
    upgradeSkillLevel(index) {
      const sk = this.selectedChar?.skills?.[index];
      if (sk && sk.level < 6) {
        const cost = this.getXPCost(sk.name, sk.level + 1, sk.psa);
        const currentXP = Number(this.selectedChar.current_xp || 0);
        if (currentXP >= cost) {
          this.selectedChar.current_xp = currentXP - cost;
          sk.level += 1;
          this.updateCharacter();
        } else {
          this.errorMessage = `Insufficient XP to upgrade ${sk.name} to Level ${sk.level + 1} (requires ${cost} XP, have ${currentXP} XP)`;
        }
      }
    },
    getXPCost(skillName, targetLevel, skillPSA = null) {
      const charPSA = this.selectedChar ? this.selectedChar.psa || 'Martial' : 'Martial';
      return calcXPCost(skillName, targetLevel, charPSA, skillPSA);
    },
    getSkillSuccessChance(skill) {
      if (!this.selectedChar || !skill) return 0;
      const offSk = OFFICIAL_SKILLS.find((s) => s.name === skill.name);
      let baseVal = 50;
      if (offSk) {
        if (offSk.baseChance === 'Agility' || offSk.baseChance === 'Dexterity') {
          baseVal = Math.ceil((this.selectedChar.dex ?? 50) / 2);
        } else if (offSk.baseChance === 'Reflex Speed' || offSk.baseChance === 'Reaction Speed') {
          baseVal = Math.ceil((this.selectedChar.rs ?? 50) / 2);
        } else if (offSk.baseChance === 'Stamina') {
          baseVal = Math.ceil((this.selectedChar.sta ?? 50) / 2);
        } else if (offSk.baseChance === 'Strength') {
          baseVal = Math.ceil((this.selectedChar.str ?? 50) / 2);
        } else if (offSk.baseChance === 'History & Religion' || offSk.baseChance === 'HIST/REL' || offSk.baseChance === 'Logic') {
          baseVal = Math.ceil((this.selectedChar.log ?? 50) / 2);
        } else if (offSk.baseChance === 'Intellect' || offSk.baseChance === 'Intuition') {
          baseVal = Math.ceil((this.selectedChar.int ?? 50) / 2);
        } else if (offSk.baseChance === 'Willpower' || offSk.baseChance === 'Personality') {
          baseVal = Math.ceil((this.selectedChar.per ?? 50) / 2);
        } else if (offSk.baseChance === 'Presence' || offSk.baseChance === 'Leadership') {
          baseVal = Math.ceil((this.selectedChar.ldr ?? 50) / 2);
        } else if (offSk.baseChance.includes('Melee Base')) {
          baseVal = this.derivedMeleeHit;
        }
      }
      const lvl = (typeof skill.level === 'number' && skill.level > 0) ? skill.level : 0;
      const lvlBonus = lvl * 10;
      return baseVal + lvlBonus;
    },
    async uploadAvatar(e) {
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
          this.selectedChar.avatar_url = data.url;
          this.updateCharacter();
        } else {
          console.error('Upload failed');
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    },
    async fetchEquipment() {
      try {
        const res = await fetch('/api/equipment', { credentials: 'include' });
        if (res.ok) {
          this.equipmentList = await res.json();
        }
      } catch (err) {
        console.error('Error fetching equipment:', err);
      }
    },
    getCategoryCount(category) {
      if (!this.equipmentList) return 0;
      if (category === 'All') return this.equipmentList.length;
      return this.equipmentList.filter(item => item.category === category).length;
    },
    addEquipment(item) {
      if (!this.selectedChar) return;
      if (!this.selectedChar.inventory) this.selectedChar.inventory = [];
      this.selectedChar.inventory.push({
        name: item.name,
        quantity: 1,
        weight: Number(item.weight ?? item.weight_lbs) || 0,
        notes: item.capabilities || item.properties || ''
      });
      this.updateCharacter();
      this.recentlyAddedMap = { ...this.recentlyAddedMap, [item.name]: true };
      setTimeout(() => {
        const copy = { ...this.recentlyAddedMap };
        delete copy[item.name];
        this.recentlyAddedMap = copy;
      }, 1500);
    },
    addInventoryItem() {
      if (!this.selectedChar) return;
      if (!this.selectedChar.inventory) this.selectedChar.inventory = [];
      this.selectedChar.inventory.push({ name: 'New Item', quantity: 1, weight: 1.0, notes: '' });
      this.updateCharacter();
    },
    removeInventoryItem(itemOrIndex) {
      if (!this.selectedChar || !this.selectedChar.inventory) return;
      if (typeof itemOrIndex === 'number') {
        this.selectedChar.inventory.splice(itemOrIndex, 1);
      } else {
        const idx = this.selectedChar.inventory.indexOf(itemOrIndex);
        if (idx !== -1) {
          this.selectedChar.inventory.splice(idx, 1);
        }
      }
      this.updateCharacter();
    },
    isInventoryMoveDisabled(item, direction) {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.inventory)) return true;
      const idx = this.selectedChar.inventory.indexOf(item);
      if (idx === -1) return true;
      const targetIndex = idx + direction;
      return targetIndex < 0 || targetIndex >= this.selectedChar.inventory.length;
    },
    moveInventoryItem(itemOrIndex, direction) {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.inventory)) return;
      const index = typeof itemOrIndex === 'number'
        ? itemOrIndex
        : this.selectedChar.inventory.indexOf(itemOrIndex);
      if (index === -1) return;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.selectedChar.inventory.length) return;
      const [moved] = this.selectedChar.inventory.splice(index, 1);
      this.selectedChar.inventory.splice(targetIndex, 0, moved);
      this.updateCharacter();
    },
    onInventoryDragStart(event, index) {
      const tag = event.target?.tagName?.toLowerCase();
      if (['input', 'select', 'textarea', 'button'].includes(tag)) {
        event.preventDefault();
        return;
      }
      this.draggedInventoryIndex = index;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      }
    },
    onInventoryDragOver(event, index) {
      if (this.draggedInventoryIndex === null) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.dragOverInventoryIndex = index;
    },
    onInventoryDragLeave(event, index) {
      if (this.dragOverInventoryIndex === index) {
        this.dragOverInventoryIndex = null;
      }
    },
    onInventoryDrop(event, targetFilteredIndex) {
      event.preventDefault();
      const fromFilteredIndex = this.draggedInventoryIndex;
      this.draggedInventoryIndex = null;
      this.dragOverInventoryIndex = null;
      if (fromFilteredIndex === null || fromFilteredIndex === undefined || fromFilteredIndex === targetFilteredIndex) return;
      if (!this.selectedChar || !Array.isArray(this.selectedChar.inventory)) return;
      const list = this.filteredInventory;
      const sourceItem = list[fromFilteredIndex];
      const targetItem = list[targetFilteredIndex];
      if (!sourceItem || !targetItem) return;

      const actualFromIndex = this.selectedChar.inventory.indexOf(sourceItem);
      const actualTargetIndex = this.selectedChar.inventory.indexOf(targetItem);
      if (actualFromIndex === -1 || actualTargetIndex === -1) return;

      const [moved] = this.selectedChar.inventory.splice(actualFromIndex, 1);
      this.selectedChar.inventory.splice(actualTargetIndex, 0, moved);
      this.updateCharacter();
    },
    onInventoryDragEnd() {
      this.draggedInventoryIndex = null;
      this.dragOverInventoryIndex = null;
    },
    parseNotePanels(notes) {
      return parseCharacterNotePanels(notes);
    },
    addNotePanel(defaultTitle = 'New Note') {
      if (!this.selectedChar) return;
      if (!Array.isArray(this.selectedChar.note_panels)) {
        this.selectedChar.note_panels = this.parseNotePanels(this.selectedChar.notes);
      }
      if (this.selectedChar.note_panels.length >= 4) return;
      const nextNum = this.selectedChar.note_panels.length + 1;
      const title = typeof defaultTitle === 'string' && defaultTitle !== 'New Note'
        ? defaultTitle
        : `Note ${nextNum}`;
      this.selectedChar.note_panels.push({
        id: `panel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title,
        content: '',
      });
      this.updateNotePanels();
    },
    deleteNotePanel(index) {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.note_panels)) return;
      if (typeof confirm === 'function' && !confirm('Delete this note panel?')) {
        return;
      }
      this.selectedChar.note_panels.splice(index, 1);
      this.updateNotePanels();
    },
    moveNotePanel(index, direction) {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.note_panels)) return;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.selectedChar.note_panels.length) return;
      const [moved] = this.selectedChar.note_panels.splice(index, 1);
      this.selectedChar.note_panels.splice(targetIndex, 0, moved);
      this.updateNotePanels();
    },
    onNotePanelDragStart(event, index) {
      const tag = event.target?.tagName?.toLowerCase();
      if (['input', 'textarea', 'button'].includes(tag)) {
        event.preventDefault();
        return;
      }
      this.draggedNotePanelIndex = index;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      }
    },
    onNotePanelDragOver(event, index) {
      if (this.draggedNotePanelIndex === null) return;
      event.preventDefault();
      if (this.draggedNotePanelIndex !== index) {
        this.dragOverNotePanelIndex = index;
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
      }
    },
    onNotePanelDragLeave(event, index) {
      if (this.dragOverNotePanelIndex === index) {
        this.dragOverNotePanelIndex = null;
      }
    },
    onNotePanelDrop(event, targetIndex) {
      event.preventDefault();
      this.dragOverNotePanelIndex = null;
      const fromIndex = this.draggedNotePanelIndex;
      this.draggedNotePanelIndex = null;
      if (fromIndex === null || fromIndex === undefined || fromIndex === targetIndex) return;
      if (!this.selectedChar || !Array.isArray(this.selectedChar.note_panels)) return;
      const [moved] = this.selectedChar.note_panels.splice(fromIndex, 1);
      this.selectedChar.note_panels.splice(targetIndex, 0, moved);
      this.updateNotePanels();
    },
    onNotePanelDragEnd() {
      this.draggedNotePanelIndex = null;
      this.dragOverNotePanelIndex = null;
    },
    updateNotePanels() {
      if (!this.selectedChar) return;
      this.selectedChar.notes = JSON.stringify(this.selectedChar.note_panels);
      this.updateCharacter();
    },
    addGrimoireEntry(customEntry = null) {
      if (!this.selectedChar) return;
      if (!Array.isArray(this.selectedChar.grimoire)) {
        this.selectedChar.grimoire = [];
      }
      const skills = Array.isArray(this.selectedChar.skills) ? this.selectedChar.skills : [];
      const firstTradSkill = skills.find(s =>
        s && MAGIC_TRADITIONS.some(t => t.name.toLowerCase() === String(s.name || '').toLowerCase())
      );
      const defaultTradition = customEntry?.tradition || firstTradSkill?.name || 'Arcane';
      const maxTier = this.getMaxCastTierForTradition(defaultTradition);
      const entry = {
        spell_id: customEntry?.spell_id || `sp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: customEntry?.name || 'New Spell / Technique',
        tradition: defaultTradition,
        default_tier: customEntry?.default_tier !== undefined
          ? Math.max(0, Math.min(maxTier, Number(customEntry.default_tier) || 0))
          : Math.min(1, maxTier),
        category: customEntry?.category || 'strike',
        range_area: customEntry?.range_area || '60 ft / Single Target',
        description: customEntry?.description || '',
      };
      this.selectedChar.grimoire.push(entry);
      this.updateGrimoire();
      return entry;
    },
    removeGrimoireEntry(index) {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.grimoire)) return;
      this.selectedChar.grimoire.splice(index, 1);
      this.updateGrimoire();
    },
    updateGrimoire() {
      if (!this.selectedChar) return;
      if (!Array.isArray(this.selectedChar.grimoire)) {
        this.selectedChar.grimoire = [];
      }
      if (!this.selectedChar.racial_abilities || typeof this.selectedChar.racial_abilities !== 'object') {
        this.selectedChar.racial_abilities = {};
      }
      this.selectedChar.racial_abilities = {
        ...this.selectedChar.racial_abilities,
        grimoire: [...this.selectedChar.grimoire],
      };
      this.updateCharacter();
    },
    getMaxCastTierForTradition(traditionName) {
      if (!this.selectedChar) return 1;
      const skills = Array.isArray(this.selectedChar.skills) ? this.selectedChar.skills : [];
      const match = skills.find(
        s => s && s.name && String(s.name).trim().toLowerCase() === String(traditionName || '').trim().toLowerCase()
      );
      if (match && Number(match.level) > 0) {
        return Math.min(6, Math.max(0, Number(match.level)));
      }
      // Fallback to character's highest skill level or 1 so players can test/dial spells
      const maxSkill = skills.reduce((m, s) => Math.max(m, Number(s?.level) || 0), 0);
      return Math.min(6, Math.max(1, maxSkill));
    },
    getMaxCastTierForSpell(spell) {
      return this.getMaxCastTierForTradition(spell?.tradition || 'Arcane');
    },
    clampSpellTier(spell) {
      if (!spell) return;
      const maxTier = this.getMaxCastTierForSpell(spell);
      const raw = Number(spell.default_tier);
      const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(maxTier, Math.floor(raw))) : 0;
      spell.default_tier = clamped;
    },
    onSpellTraditionChange(spell) {
      this.clampSpellTier(spell);
      this.updateGrimoire();
    },
    getSpellCost(spell) {
      return calcCastCost(spell?.default_tier ?? 0);
    },
    getSpellFuelLabel(spell) {
      const cfg = getTraditionConfig(spell?.tradition);
      return cfg.fuel === 'sta' ? 'STA' : 'ESS';
    },
    getSpellTargetPct(spell) {
      return calcTraditionTargetPct(this.selectedChar, spell?.tradition || 'Arcane');
    },
    getSpellMagnitudeSummary(spell) {
      const mag = getMagnitudeEntry(spell?.default_tier ?? 0, spell?.category || 'strike');
      return `${mag.dice}: ${mag.summary}`;
    },
    async castGrimoireSpell(spell) {
      if (!this.selectedChar || !spell) return null;
      this.errorMessage = '';
      this.clampSpellTier(spell);
      const castTier = Number(spell.default_tier ?? 0);
      const cost = calcCastCost(castTier);
      const tradCfg = getTraditionConfig(spell.tradition);
      const fuel = tradCfg.fuel === 'sta' ? 'sta' : 'ess';

      if (fuel === 'sta') {
        const curSta = Number(this.selectedChar.current_stamina ?? this.selectedChar.current_sta ?? this.selectedChar.sta ?? 50);
        if (curSta < cost) {
          this.errorMessage = `Insufficient Stamina (STA) to channel ${spell.name} at Tier ${castTier} (requires ${cost} STA, have ${curSta} STA).`;
          return null;
        }
        this.selectedChar.current_stamina = Math.max(0, curSta - cost);
        this.selectedChar.current_sta = this.selectedChar.current_stamina;
      } else {
        const curEss = Number(this.selectedChar.current_ess ?? this.selectedChar.max_ess ?? 50);
        if (curEss < cost) {
          this.errorMessage = `Insufficient Essence (ESS) to channel ${spell.name} at Tier ${castTier} (requires ${cost} ESS, have ${curEss} ESS).`;
          return null;
        }
        this.selectedChar.current_ess = Math.max(0, curEss - cost);
      }

      const targetPct = this.getSpellTargetPct(spell);
      const d100Roll = Math.floor(Math.random() * 100) + 1;
      const isCrit = d100Roll <= 5 || (d100Roll <= targetPct && d100Roll % 11 === 0);
      const isFumble = d100Roll >= 96;
      const success = !isFumble && d100Roll <= targetPct;
      const outcomeLabel = isCrit ? 'CRITICAL SUCCESS' : (isFumble ? 'FUMBLE' : (success ? 'SUCCESS' : 'FAILURE'));

      const mag = getMagnitudeEntry(castTier, spell.category || 'strike');
      const diceList = [];
      let effectTotal = 0;
      if (mag.count > 0) {
        const diceCount = isCrit ? mag.count * 2 : mag.count;
        for (let i = 0; i < diceCount; i++) {
          const r = Math.floor(Math.random() * (mag.sides || 10)) + 1;
          diceList.push(r);
          effectTotal += r;
        }
      } else if (mag.flatHeal) {
        effectTotal = mag.flatHeal;
      }

      const result = {
        spellId: spell.spell_id,
        spellName: spell.name || 'Unnamed Spell',
        tradition: spell.tradition || 'Arcane',
        castTier,
        cost,
        fuel,
        targetPct,
        d100Roll,
        success,
        isCrit,
        isFumble,
        outcomeLabel,
        diceFormula: mag.dice,
        dice: diceList,
        effectTotal,
        summary: mag.summary,
      };
      this.lastCastResult = result;

      await this.updateCharacter();

      try {
        await fetch('/api/rolls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            mode: 'rpg',
            type: 'percentile',
            label: `${this.selectedChar.name}: ${result.spellName} (${result.tradition} T${castTier}, -${cost} ${fuel.toUpperCase()}) - ${outcomeLabel}`,
            total: d100Roll,
            breakdown: `d100=${d100Roll} <= ${targetPct}% | Magnitude ${mag.dice}: ${effectTotal} [${diceList.join(', ')}]`,
            rollSummary: result,
          }),
        });
      } catch {
        // Ignore roll log network errors in offline/unit test contexts
      }

      return result;
    },
    openForgeApplet() {
      this.forgeError = '';
      this.lastForgeResult = null;
      const cap = Math.max(1, this.maxForgeTier || 1);
      if (this.forgeForm.item_tier > cap && !this.isGm) {
        this.forgeForm.item_tier = cap;
      }
      this.showForgeModal = true;
    },
    onForgeCategoryChange() {
      this.forgeError = '';
      if (this.forgeForm.category === 'weapon') {
        this.forgeForm.required_tradecraft = 'Weaponsmith';
        this.forgeForm.damage_dice = '2d10';
        this.forgeForm.weight_lbs = 3;
      } else if (this.forgeForm.category === 'armor') {
        this.forgeForm.required_tradecraft = 'Armorer';
        this.forgeForm.weight_lbs = 25;
      } else if (this.forgeForm.category === 'shield') {
        this.forgeForm.required_tradecraft = 'Armorer';
        this.forgeForm.attacker_pct_penalty = -10;
        this.forgeForm.weight_lbs = 6;
      } else {
        this.forgeForm.required_tradecraft = 'Jeweler';
        this.forgeForm.weight_lbs = 1;
      }
    },
    onForgeTierChange() {
      const t = Number(this.forgeForm.item_tier) || 1;
      if (this.forgeForm.category === 'weapon') {
        this.forgeForm.attack_pct_bonus = t === 1 ? 0 : (t === 2 ? 5 : (t === 3 ? 10 : (t === 4 ? 15 : 20)));
      } else if (this.forgeForm.category === 'shield') {
        this.forgeForm.attacker_pct_penalty = t === 1 ? -10 : (t === 2 ? -15 : (t <= 4 ? -20 : -25));
      }
    },
    validateForgeForm(formOverride = null) {
      const form = formOverride || this.forgeForm;
      const rank = Math.max(0, getCharacterTradecraftRank(this.selectedChar, form.required_tradecraft));
      const fallbackRank = Math.max(rank, getCharacterTradecraftRank(this.selectedChar));
      return validateForgedItem(form, fallbackRank, this.isGm);
    },
    submitForgeItem(formOverride = null) {
      if (!this.selectedChar) return null;
      this.forgeError = '';
      this.lastForgeResult = null;
      const form = formOverride || this.forgeForm;

      const tcSpecCheck = validateTradecraftSpecialization(form.required_tradecraft);
      if (!tcSpecCheck.valid) {
        this.forgeError = tcSpecCheck.error;
        return null;
      }

      const rank = Math.max(
        getCharacterTradecraftRank(this.selectedChar, form.required_tradecraft),
        getCharacterTradecraftRank(this.selectedChar)
      );

      if (!this.isGm && rank <= 0) {
        this.forgeError = 'Your character must have at least Tradecraft Level 1 to forge custom equipment.';
        return null;
      }

      const check = validateForgedItem(form, rank, this.isGm);
      if (!check.valid) {
        this.forgeError = check.error || (check.errors && check.errors[0]) || 'Invalid forged item parameters.';
        return null;
      }

      const itemTier = Math.max(1, Math.min(5, Number(form.item_tier) || 1));
      const baseStat = Math.max(
        Number(this.selectedChar.int ?? 50),
        Number(this.selectedChar.dex ?? 50),
        Number(this.selectedChar.str ?? 50)
      );
      const targetPct = Math.ceil(baseStat / 2) + (rank * 10) - ((itemTier - 1) * 5);
      const d100Roll = Math.floor(Math.random() * 100) + 1;

      const capabilityParts = [`Tier ${itemTier}`];
      if (form.required_tradecraft) capabilityParts.push(`Craft: ${form.required_tradecraft}`);
      if (form.category === 'weapon') {
        capabilityParts.push(`Damage: ${form.damage_dice}`);
        if (Number(form.attack_pct_bonus) > 0) {
          capabilityParts.push(`Hit Bonus: +${form.attack_pct_bonus}%`);
        }
      } else if (form.category === 'shield') {
        capabilityParts.push(`Attacker Hit Penalty: ${form.attacker_pct_penalty}%`);
      } else if (form.category === 'armor') {
        capabilityParts.push(`${form.armor_dr_bonus}`);
      }
      if (form.bound_power && String(form.bound_power).trim()) {
        capabilityParts.push(String(form.bound_power).trim());
      }

      const forgedItem = {
        item_id: `itm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: String(form.name).trim(),
        category: form.category || 'weapon',
        required_tradecraft: String(form.required_tradecraft || 'Weaponsmith').trim(),
        is_magical: itemTier >= 5 || Boolean(form.bound_power),
        item_tier: itemTier,
        weight_lbs: Number(form.weight_lbs) || 1,
        weight: Number(form.weight_lbs) || 1,
        quantity: 1,
        attack_pct_bonus: Number(form.attack_pct_bonus) || 0,
        damage_dice: form.category === 'weapon' ? String(form.damage_dice || '1d10').trim() : '',
        attacker_pct_penalty: form.category === 'shield' ? Number(form.attacker_pct_penalty || -5) : 0,
        armor_dr_bonus: form.category === 'armor' ? String(form.armor_dr_bonus || '') : '',
        bound_power: String(form.bound_power || '').trim(),
        notes: capabilityParts.join(' • '),
      };

      if (!Array.isArray(this.selectedChar.inventory)) {
        this.selectedChar.inventory = [];
      }
      this.selectedChar.inventory.push(forgedItem);
      this.updateCharacter();

      this.lastForgeResult = {
        item: forgedItem,
        d100Roll,
        targetPct,
        message: `Forged ${forgedItem.name} (Tier ${itemTier}) — Tradecraft d100: ${d100Roll} vs ${targetPct}%! Added to Inventory.`,
      };
      return forgedItem;
    },
    canReorder(char) {
      if (!char) return false;
      return this.isGm;
    },
    async moveCharacter(index, direction) {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.characters.length) return;
      const original = [...this.characters];
      const updated = [...this.characters];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);
      this.characters = updated;

      await this.saveCharacterOrder(original);
    },
    onDragStart(event, index) {
      const char = this.characters[index];
      if (!this.canReorder(char)) {
        event.preventDefault();
        return;
      }
      this.draggedCharIndex = index;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      }
    },
    onDragOver(event, index) {
      if (this.draggedCharIndex === null) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.dragOverCharIndex = index;
    },
    onDragLeave(event, index) {
      if (this.dragOverCharIndex === index) {
        this.dragOverCharIndex = null;
      }
    },
    async onDrop(event, targetIndex) {
      event.preventDefault();
      const fromIndex = this.draggedCharIndex;
      this.draggedCharIndex = null;
      this.dragOverCharIndex = null;
      if (fromIndex === null || fromIndex === undefined || fromIndex === targetIndex) return;
      if (fromIndex < 0 || fromIndex >= this.characters.length) return;
      if (targetIndex < 0 || targetIndex >= this.characters.length) return;

      const original = [...this.characters];
      const updated = [...this.characters];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(targetIndex, 0, moved);
      this.characters = updated;

      await this.saveCharacterOrder(original);
    },
    onDragEnd() {
      this.draggedCharIndex = null;
      this.dragOverCharIndex = null;
    },
    async saveCharacterOrder(previousCharacters) {
      this.errorMessage = '';
      try {
        const order = this.characters.map((c) => c.id);
        const res = await fetch('/api/characters/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ order }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          this.errorMessage = errData.error || `Failed to reorder characters (HTTP ${res.status})`;
          this.characters = previousCharacters;
        }
      } catch (err) {
        console.error('Error reordering characters:', err);
        this.errorMessage = err.message || 'Error reordering characters';
        this.characters = previousCharacters;
      }
    },
    setupSocketListeners() {
      socket.on('sheet:created', this.handleSheetCreated);
      socket.on('sheet:updated', this.handleSheetUpdated);
      socket.on('sheet:deleted', this.handleSheetDeleted);
      socket.on('sheets:reordered', this.handleSheetsReordered);
    },
    removeSocketListeners() {
      socket.off('sheet:created', this.handleSheetCreated);
      socket.off('sheet:updated', this.handleSheetUpdated);
      socket.off('sheet:deleted', this.handleSheetDeleted);
      socket.off('sheets:reordered', this.handleSheetsReordered);
    },
    handleSheetsReordered(payload) {
      if (payload && payload.type === 'character' && Array.isArray(payload.order)) {
        const map = new Map(this.characters.map((c) => [c.id, c]));
        const reordered = [];
        for (const id of payload.order) {
          if (map.has(id)) {
            reordered.push(map.get(id));
            map.delete(id);
          }
        }
        for (const remaining of map.values()) {
          reordered.push(remaining);
        }
        this.characters = reordered;
      }
    },
    handleSheetCreated(payload) {
      if (payload && payload.type === 'character' && payload.sheet) {
        const sheet = this.normalizeCharacterData(payload.sheet);
        const idx = this.characters.findIndex((c) => c.id === sheet.id);
        if (idx === -1) {
          this.characters.push(sheet);
        } else {
          this.characters[idx] = sheet;
        }
      }
    },
    handleSheetUpdated(payload) {
      if (payload && payload.type === 'character' && payload.sheet) {
        const sheet = this.normalizeCharacterData(payload.sheet);
        const idx = this.characters.findIndex((c) => c.id === sheet.id);
        if (idx !== -1) {
          this.characters[idx] = sheet;
          if (this.selectedChar && this.selectedChar.id === sheet.id) {
            this.selectedChar = JSON.parse(JSON.stringify(sheet));
          }
        }
      }
    },
    handleSheetDeleted(payload) {
      if (payload && payload.type === 'character') {
        const id = payload.id;
        this.characters = this.characters.filter((c) => c.id !== id);
        if (this.selectedChar && this.selectedChar.id === id) {
          this.selectedChar = this.characters.length > 0 ? JSON.parse(JSON.stringify(this.characters[0])) : null;
        }
      }
    },
  },
};
</script>

<style scoped>
.sheets-layout {
  position: relative;
  display: flex;
  height: 100%;
  background: var(--bg-main, #0d0f12);
  color: var(--text-primary, #cecece);
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 280px;
  min-width: 280px;
  background: #161b22;
  border-right: 1px solid #30363d;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.25s ease;
  z-index: 10;
  position: relative;
}

.sidebar.sidebar-collapsed-left {
  margin-left: -280px;
  transform: translateX(-100%);
  pointer-events: none;
}

.sidebar.sidebar-rolled-up {
  height: auto;
  align-self: flex-start;
  border-bottom: 1px solid #30363d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.sidebar-body-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}

.sidebar-body-wrap.rolled-up {
  max-height: 0 !important;
  opacity: 0;
  pointer-events: none;
}

.sidebar-header {
  padding: 12px 14px;
  border-bottom: 1px solid #30363d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.sidebar-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-toggle-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-sidebar-ctrl {
  background-color: #000000;
  border: 1px solid var(--border-color, #484f58);
  color: var(--theme-bright, #c0c0c0);
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 6px var(--theme-glow, rgba(208, 208, 208, 0.22));
  transition: all 0.15s ease-in-out;
}

.btn-sidebar-ctrl:hover {
  background-color: #14171c;
  border-color: var(--theme-bright, #c0c0c0);
  color: var(--theme-bright-hover, #d4d4d4);
  box-shadow: 0 0 10px var(--theme-glow, rgba(208, 208, 208, 0.35));
}

.btn-sidebar-edge-toggle {
  position: absolute;
  left: 0;
  top: 16px;
  z-index: 20;
  background-color: #000000;
  border: 1px solid var(--border-color, #484f58);
  border-left: none;
  border-radius: 0 6px 6px 0;
  color: var(--theme-bright, #c0c0c0);
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 0 8px var(--theme-glow, rgba(208, 208, 208, 0.22)), 2px 2px 8px rgba(0, 0, 0, 0.6);
  transition: all 0.15s ease-in-out;
}

.btn-sidebar-edge-toggle:hover {
  background-color: #14171c;
  color: var(--theme-bright-hover, #d4d4d4);
  box-shadow: 0 0 12px var(--theme-glow, rgba(208, 208, 208, 0.35)), 2px 2px 10px rgba(0, 0, 0, 0.7);
  transform: translateX(2px);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.21rem;
  color: #c8c8c8 !important;
  text-shadow: none !important;
}

.sidebar-loading,
.sidebar-empty {
  padding: 16px;
  font-size: 0.9rem;
  color: #8b949e;
  text-align: center;
}

.character-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.character-list li {
  padding: 10px 12px;
  border-bottom: 1px solid #21262d;
  border-left: 4px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s, border-color 0.2s, opacity 0.2s;
  user-select: none;
}

.character-list li:hover {
  background: #000000 !important;
  border-left-color: #c0c0c0 !important;
  box-shadow: 0 0 10px rgba(192, 192, 192, 0.4) !important;
}

.character-list li.dragging {
  opacity: 0.4;
  background: #1c2128;
}

.character-list li.drag-over {
  border-top: 2px solid var(--theme-bright, #00e5ff);
  background: var(--theme-glow-bg, rgba(0, 229, 255, 0.08));
}

.character-list li.active {
  background: #282e38 !important;
  border-left: 4px solid #c0c0c0 !important;
  box-shadow: none !important;
  color: #e0e0e0 !important;
}

.character-list li.active:hover {
  background: #000000 !important;
  box-shadow: 0 0 10px rgba(192, 192, 192, 0.4) !important;
}

.character-list li.active .char-name {
  color: #e0e0e0 !important;
  text-shadow: none !important;
}

.character-list li.active .char-sub {
  color: #d4d4d4 !important;
  text-shadow: none !important;
}

.drag-handle {
  cursor: grab;
  color: #6e7681;
  font-size: 14px;
  letter-spacing: -2px;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  user-select: none;
  flex-shrink: 0;
  transition: color 0.15s;
}

.drag-handle:hover {
  color: var(--theme-bright, #00e5ff);
}

.drag-handle:active {
  cursor: grabbing;
}

.char-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
  flex: 1;
}

.char-item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.reorder-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.btn-reorder {
  background: transparent !important;
  border: none !important;
  color: #555b62 !important;
  cursor: pointer;
  padding: 1px 4px;
  font-size: 9px;
  line-height: 1;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
  box-shadow: none !important;
}

.btn-reorder:hover:not(:disabled) {
  color: #8b949e !important;
  background: rgba(255, 255, 255, 0.06) !important;
  box-shadow: none !important;
}

.btn-reorder:disabled {
  opacity: 0.25;
  cursor: not-allowed;
  color: #383e47 !important;
}

.char-name {
  font-weight: 600;
  color: #cecece;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.char-sub {
  font-size: 0.8rem;
  color: #cecece;
}

.btn-delete-small {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
}
.btn-delete-small:hover {
  color: #f85149;
}

/* Main Area */
.sheet-main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8b949e;
}
.stub-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.sheet-container {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: var(--bg-panel, #14171c);
  border: 1px solid var(--border-color, #30363d);
  box-shadow: 0 0 8px var(--theme-glow, rgba(208, 208, 208, 0.22)), 0 0 12px var(--theme-glow, rgba(208, 208, 208, 0.12));
  border-radius: 6px;
  padding: 16px;
}

/* Header */
.sheet-header {
  background: var(--bg-panel, #14171c);
  border: 1px solid var(--border-color, #30363d);
  box-shadow: 0 0 8px var(--theme-glow, rgba(208, 208, 208, 0.22)), 0 0 12px var(--theme-glow, rgba(208, 208, 208, 0.12));
  border-radius: 6px;
  padding: 16px;
}

.header-main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.header-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.header-top-row {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
}

.header-sub-row {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 0.9rem;
  font-size: 0.855rem;
}

.header-sub-row label {
  font-size: 0.855rem;
}

.input-name {
  flex: 1;
  min-width: 180px;
  background: var(--bg-input, #1c2026);
  border: none !important;
  color: #c9c9c9 !important;
  -webkit-text-fill-color: #c9c9c9 !important;
  text-shadow: none !important;
  font-family: var(--font-family-header, 'Modesto Condensed', 'Modesto', sans-serif);
  font-size: 1.4rem;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: 4px;
}

.input-name:focus {
  outline: none;
  border: none !important;
  box-shadow: none !important;
}

.race-select-wrap,
.psa-select-wrap,
.char-theme-select-wrap,
.player-select-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.855rem;
}

.select-race,
.select-psa,
.select-char-theme,
.select-player,
.select-race option,
.select-psa option,
.select-char-theme option,
.select-player option {
  background-color: #000000 !important;
  color: #c9c9c9 !important;
  -webkit-text-fill-color: #c9c9c9;
  background-image: none !important;
}

.select-race,
.select-psa,
.select-char-theme,
.select-player {
  border: 1px solid rgba(201, 201, 201, 0.4) !important;
  border-radius: 4px;
  padding: 5px 26px 5px 9px !important;
  padding-right: 26px !important;
  font-size: 0.855rem;
}

.select-char-theme {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='14' viewBox='0 0 24 24' fill='none' stroke='%236e7681' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='7 9 12 4 17 9'%3E%3C/polyline%3E%3Cpolyline points='7 15 12 20 17 15'%3E%3C/polyline%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 8px center !important;
  background-size: 10px 12px !important;
}

.select-race:hover:not(:disabled),
.select-psa:hover:not(:disabled),
.select-char-theme:hover:not(:disabled),
.select-player:hover:not(:disabled) {
  border-color: #c9c9c9 !important;
  box-shadow: 0 0 6px rgba(201, 201, 201, 0.35);
}

.select-race:focus,
.select-psa:focus,
.select-char-theme:focus,
.select-player:focus {
  outline: none;
  border-color: #c9c9c9 !important;
  box-shadow: 0 0 8px rgba(201, 201, 201, 0.5);
}

.player-badge-wrap {
  display: flex;
  align-items: center;
}

.badge-player {
  border: 1px solid rgba(201, 201, 201, 0.4);
  color: #c9c9c9;
  background: rgba(201, 201, 201, 0.1);
  box-shadow: 0 0 6px rgba(201, 201, 201, 0.25);
  border-radius: 4px;
  padding: 3px 7px;
  font-size: 0.73rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.input-custom-race {
  background: var(--bg-surface-2, #1f293d);
  color: #c9c9c9;
  border: 1px solid rgba(201, 201, 201, 0.4);
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 0.81rem;
  margin-left: 6px;
  min-width: 140px;
  box-sizing: border-box;
}
.input-custom-race:focus {
  border-color: var(--accent-cyan, #00d2ff);
  outline: none;
}
.custom-race-input-group {
  margin-top: 8px;
}

/* Derived Tactical Sub-Stats Bar (3rd row in sheet header) */
.tactical-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr) 2fr;
  gap: 12px;
  align-items: center;
  background: transparent;
  border: none;
  padding: 0;
}

.tactical-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tactical-label {
  font-size: 0.75rem;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tactical-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #c8c8c8 !important;
  text-shadow: none !important;
  transition: color 0.2s ease;
}

.encumbrance-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.encumbrance-bar-bg {
  height: 8px;
  background: #000000;
  border: none !important;
  outline: none !important;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.8);
}

.encumbrance-bar-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.encumbrance-sub {
  font-size: 0.75rem;
  color: #8b949e;
}

.encumbrance-sub.over-limit {
  color: #f85149;
  font-weight: bold;
}

/* Middle Section: Attributes (Left) & Compact Trackers (Right) */
.middle-section-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: stretch;
}

@media (max-width: 820px) {
  .middle-section-grid {
    grid-template-columns: 1fr;
  }
}

.panel-header-simple {
  margin-bottom: 8px;
}

.tracker-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.75px;
  user-select: none;
}

.trackers-section {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}

.tracker-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.tracker-item:not(:last-child) {
  padding-bottom: 8px;
  border-bottom: 1px solid #21262d;
}

/* Stamina & ESS & XP Headers */
.stamina-header,
.ess-header,
.xp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.stamina-header-right,
.ess-header-right,
.xp-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stamina-values,
.ess-values {
  font-size: 0.95rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #c8c8c8 !important;
}

.xp-values {
  font-size: 0.95rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-max-sta,
.input-max-ess {
  width: 48px;
  background: #000000;
  border: 1px solid rgba(200, 200, 200, 0.4);
  color: #c8c8c8 !important;
  -webkit-text-fill-color: #c8c8c8 !important;
  text-align: center;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.85rem;
  color-scheme: dark;
}

.input-max-sta:focus,
.input-max-ess:focus {
  border-color: #c8c8c8 !important;
  box-shadow: 0 0 6px rgba(200, 200, 200, 0.4);
}

.input-max-sta::-webkit-inner-spin-button,
.input-max-sta::-webkit-outer-spin-button,
.input-max-ess::-webkit-inner-spin-button,
.input-max-ess::-webkit-outer-spin-button {
  cursor: pointer;
  opacity: 0.85;
  filter: grayscale(100%) brightness(1.65) !important;
}

.input-max-sta:hover::-webkit-inner-spin-button,
.input-max-ess:hover::-webkit-inner-spin-button {
  opacity: 1;
  filter: grayscale(100%) brightness(1.95) drop-shadow(0 0 2px rgba(200, 200, 200, 0.5)) !important;
}

.stamina-bar-bg,
.ess-bar-bg {
  height: 10px;
  background: #000000;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  overflow: hidden;
  margin: 4px 0;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.8);
}

.stamina-bar-fill {
  height: 100%;
  transition: width 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
  background: #79d79b;
  box-shadow: 0 0 10px rgba(121, 215, 155, 0.7);
}

.ess-bar-fill {
  height: 100%;
  transition: width 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
  background: #14b8a6;
  box-shadow: 0 0 10px rgba(20, 184, 166, 0.7);
}

.stamina-values .current,
.ess-values .current {
  color: #c8c8c8 !important;
  font-size: 1.15rem;
  font-weight: 700;
  text-shadow: none !important;
}

.stamina-section .tracker-label,
.ess-section .tracker-label {
  color: #c8c8c8 !important;
  letter-spacing: 0.5px;
  text-shadow: none !important;
}

.stamina-controls,
.ess-controls,
.xp-controls {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
}

.stepper-group {
  display: flex;
  gap: 3px;
  align-items: center;
}

.freeform-delta-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.input-delta {
  width: 46px;
  background: #000000;
  border: 1px solid rgba(200, 200, 200, 0.4);
  color: #c8c8c8 !important;
  -webkit-text-fill-color: #c8c8c8 !important;
  text-align: center;
  padding: 3px 4px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  color-scheme: dark;
}

.input-delta:focus {
  border-color: #c8c8c8 !important;
  box-shadow: 0 0 6px rgba(200, 200, 200, 0.4);
}

.input-delta::-webkit-inner-spin-button,
.input-delta::-webkit-outer-spin-button {
  cursor: pointer;
  opacity: 0.85;
  filter: grayscale(100%) brightness(1.65) !important;
}

.input-delta:hover::-webkit-inner-spin-button {
  opacity: 1;
  filter: grayscale(100%) brightness(1.95) drop-shadow(0 0 2px rgba(200, 200, 200, 0.5)) !important;
}

.btn-delta {
  padding: 3px 8px;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease-in-out;
}

.btn-action-reset,
.btn-action-reload {
  background: rgba(56, 189, 248, 0.15) !important;
  border: 1px solid rgba(56, 189, 248, 0.4) !important;
  color: #38bdf8 !important;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 58px;
  text-align: center;
  box-shadow: none !important;
}

.btn-action-reset {
  padding: 2px 14px;
}
.btn-action-reset:hover,
.btn-action-reload:hover {
  background: rgba(56, 189, 248, 0.25) !important;
  border-color: #38bdf8 !important;
  color: #38bdf8 !important;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.3) !important;
}

.badge-tier {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(56, 189, 248, 0.15) !important;
  border: 1px solid rgba(56, 189, 248, 0.4) !important;
  color: #38bdf8 !important;
  text-shadow: none !important;
  font-family: var(--font-family-header, 'Modesto Condensed', 'Modesto', sans-serif);
  font-size: 0.85rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  user-select: none;
  box-shadow: none !important;
}

.btn-action-download {
  background: rgba(16, 185, 129, 0.15) !important;
  border: 1px solid rgba(16, 185, 129, 0.4) !important;
  color: #34d399 !important;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  margin-left: auto;
  box-shadow: none !important;
}
.btn-action-download:hover {
  background: rgba(16, 185, 129, 0.25) !important;
  border-color: #34d399 !important;
  color: #34d399 !important;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.35) !important;
}

.btn-sta,
.btn-ess,
.btn-xp {
  padding: 3px 8px;
  font-size: 0.78rem;
  border: none;
  border-radius: 4px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.btn-sta:active,
.btn-ess:active,
.btn-xp:active {
  transform: translateY(1px);
}
.btn-sub,
.btn-sta.btn-sub,
.btn-ess.btn-sub,
.btn-delta.btn-sub {
  background: #000000;
  color: #fca5a5 !important;
  border: 1px solid rgba(252, 165, 165, 0.45) !important;
}
.btn-sub:hover:not(:disabled),
.btn-sta.btn-sub:hover:not(:disabled),
.btn-ess.btn-sub:hover:not(:disabled),
.btn-delta.btn-sub:hover:not(:disabled) {
  background: #000000;
  border-color: #fca5a5 !important;
  color: #fecaca !important;
  box-shadow: 0 0 8px rgba(252, 165, 165, 0.55) !important;
}
.btn-add,
.btn-sta.btn-add,
.btn-ess.btn-add,
.btn-delta.btn-add {
  background: #000000;
  color: #86efac !important;
  border: 1px solid rgba(134, 239, 172, 0.45) !important;
}
.btn-add:hover:not(:disabled),
.btn-sta.btn-add:hover:not(:disabled),
.btn-ess.btn-add:hover:not(:disabled),
.btn-delta.btn-add:hover:not(:disabled) {
  background: #000000;
  color: #bbf7d0 !important;
  border-color: #86efac !important;
  box-shadow: 0 0 8px rgba(134, 239, 172, 0.55) !important;
}

/* Primary Stats Grid (2x2) */
.stats-section h4 {
  margin: 0 0 12px 0;
  color: #c8c8c8 !important;
  text-shadow: none !important;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stat-pair-box {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-pair-header {
  font-weight: 600;
  font-size: 0.78rem;
  color: #cdcdcd !important;
  text-align: center;
  letter-spacing: 0.5px;
}

.stat-inputs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.sub-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.sub-stat label {
  font-size: 0.72rem;
  font-weight: bold;
  color: #cdcdcd !important;
}

.stat-input {
  width: 48px;
  font-size: 1.05rem;
  font-weight: 700;
  text-align: center;
  background: transparent;
  border: none !important;
  color: #cdcdcd !important;
  -webkit-text-fill-color: #cdcdcd !important;
  text-shadow: none !important;
  border-radius: 4px;
  padding: 3px 2px;
  color-scheme: dark;
  transition: all 0.2s ease;
}

.stat-input:focus {
  outline: none;
  border: none !important;
  box-shadow: none !important;
}

.stat-input::-webkit-inner-spin-button,
.stat-input::-webkit-outer-spin-button {
  cursor: pointer;
  opacity: 0.85;
  filter: grayscale(100%) brightness(1.7) !important;
  transition: opacity 0.15s ease, filter 0.15s ease;
}

.stat-input:hover::-webkit-inner-spin-button,
.stat-input:focus::-webkit-inner-spin-button {
  opacity: 1;
  filter: grayscale(100%) brightness(2.0) drop-shadow(0 0 2px rgba(205, 205, 205, 0.6)) !important;
}

.shift-controls {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.btn-shift {
  background: #000000;
  border: 1px solid rgba(205, 205, 205, 0.4) !important;
  color: #cdcdcd !important;
  font-size: 0.65rem;
  padding: 2px 5px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.btn-shift:hover {
  background: rgba(205, 205, 205, 0.15) !important;
  border-color: #cdcdcd !important;
  color: #cdcdcd !important;
  box-shadow: 0 0 4px rgba(205, 205, 205, 0.35);
}
.btn-shift:active {
  transform: translateY(1px);
  box-shadow: var(--theme-glow-strong);
}

/* Species Traits Banner (styled after Ship Sheets Standard Flip Capable banner) */
.racial-panel.species-traits-banner {
  margin-bottom: 20px;
  padding: 10px 14px;
  border-radius: 6px;
  background: rgba(200, 200, 200, 0.04) !important;
  border: 1px solid rgba(200, 200, 200, 0.2) !important;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.traits-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-family-header, 'Modesto Condensed', 'Modesto', sans-serif);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(200, 200, 200, 0.1) !important;
  color: #c8c8c8 !important;
  -webkit-text-fill-color: #c8c8c8 !important;
  border: 1px solid rgba(200, 200, 200, 0.3) !important;
  box-shadow: none !important;
  text-shadow: none !important;
}

.traits-rule-text {
  font-size: 0.8rem;
  color: #8b949e;
  line-height: 1.4;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.traits-rule-text strong {
  color: #cecece;
}

/* Lists */
.two-column-lists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.list-header h4 {
  margin: 0;
  color: #c8c8c8 !important;
  text-shadow: none !important;
}

.empty-list {
  color: #8b949e;
  font-size: 0.85rem;
  font-style: italic;
  padding: 8px 0;
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: border-color 0.15s, background-color 0.15s;
}

.item-row.drag-over {
  border-color: var(--theme-bright, #00e5ff);
  background: var(--theme-glow-bg, rgba(0, 229, 255, 0.08));
  box-shadow: var(--theme-glow-hover, 0 0 8px rgba(0, 229, 255, 0.35));
}

.item-row.dragging {
  opacity: 0.4;
}

.skill-main-select {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.select-official-skill,
.select-official-skill option {
  background-color: #0d1117 !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece !important;
}

.select-official-skill option {
  background-image: none !important;
}

.select-official-skill {
  flex: 1;
  border: 1px solid #30363d !important;
  border-radius: 4px;
  padding: 6px 24px 6px 8px !important;
  padding-right: 24px !important;
  font-size: 0.85rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='14' viewBox='0 0 24 24' fill='none' stroke='%236e7681' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='7 9 12 4 17 9'%3E%3C/polyline%3E%3Cpolyline points='7 15 12 20 17 15'%3E%3C/polyline%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 10px center !important;
  background-size: 12px 14px !important;
}

.select-official-skill:hover {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='14' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='7 9 12 4 17 9'%3E%3C/polyline%3E%3Cpolyline points='7 15 12 20 17 15'%3E%3C/polyline%3E%3C/svg%3E") !important;
  border-color: #484f58 !important;
}

.select-official-skill:focus {
  outline: none;
  border-color: #484f58 !important;
  box-shadow: none !important;
}

.skill-chance-badge {
  background: rgba(200, 200, 200, 0.08) !important;
  color: #cecece !important;
  text-shadow: none !important;
  font-weight: 700;
  font-size: 0.8rem;
  font-family: monospace;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid #484f58 !important;
  box-shadow: none !important;
  letter-spacing: 0.5px;
}

.btn-xp-upgrade {
  background: linear-gradient(135deg, #065f46 0%, #059669 100%) !important;
  border: 1px solid #10b981 !important;
  color: #ecfdf5 !important;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--sci-glow-green) !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  transition: all 0.15s ease-in-out;
}
.btn-xp-upgrade:hover {
  box-shadow: var(--sci-glow-green-hover) !important;
  border-color: #34d399 !important;
  color: #ecfdf5 !important;
}
.btn-xp-upgrade:active {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6) !important;
}

.item-name-input {
  flex: 1;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  padding: 6px 8px;
  border-radius: 4px;
}

.item-weight-wrap,
.level-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #8b949e;
}

.item-weight-input {
  width: 48px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  text-align: center;
  padding: 6px 4px;
  border-radius: 4px;
  color-scheme: dark;
}

.item-level-input {
  width: 42px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  text-align: center;
  padding: 6px 4px;
  border-radius: 4px;
  color-scheme: dark;
}

.item-level-input::-webkit-inner-spin-button,
.item-level-input::-webkit-outer-spin-button,
.item-weight-input::-webkit-inner-spin-button,
.item-weight-input::-webkit-outer-spin-button {
  cursor: pointer;
  opacity: 0.6;
  filter: grayscale(100%) brightness(0.7) !important;
  transition: opacity 0.15s ease, filter 0.15s ease;
}

.item-level-input:hover::-webkit-inner-spin-button,
.item-level-input:focus::-webkit-inner-spin-button,
.item-weight-input:hover::-webkit-inner-spin-button,
.item-weight-input:focus::-webkit-inner-spin-button {
  opacity: 0.9;
  filter: grayscale(100%) brightness(1.0) !important;
}

.btn-remove {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 4px;
}
.btn-remove:hover {
  color: #f85149;
}

/* Buttons & Controls */
.btn-new-character {
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid #d0d0d0 !important;
  color: #d0d0d0 !important;
  -webkit-text-fill-color: #d0d0d0;
  padding: 6px 14px;
  border-radius: 4px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(208, 208, 208, 0.25);
  letter-spacing: 0.3px;
  transition: all 0.15s ease-in-out;
}
.btn-new-character:hover,
.btn-new-character:focus,
.btn-new-character:focus-visible,
.btn-new-character:active {
  background-color: #000000 !important;
  background: #000000 !important;
  border-color: #c0c0c0 !important;
  color: #c0c0c0 !important;
  -webkit-text-fill-color: #c0c0c0 !important;
  box-shadow: 0 0 16px rgba(192, 192, 192, 0.5) !important;
  outline: none !important;
}
.btn-new-character:active {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(192, 192, 192, 0.4) !important;
}

.btn-primary {
  background: linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #14b8a6 100%);
  color: #07131e;
  border: 1px solid #38bdf8;
  padding: 6px 14px;
  border-radius: 4px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.5);
  letter-spacing: 0.3px;
  transition: all 0.15s ease-in-out;
}
.btn-primary:hover {
  background: linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #14b8a6 100%);
  box-shadow: 0 0 18px rgba(6, 182, 212, 0.8);
  border-color: #7dd3fc;
  color: #07131e;
}
.btn-primary:active {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(6, 182, 212, 0.6);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-secondary {
  background-color: #1d1d1d !important;
  background: #1d1d1d !important;
  color: #e0e0e0 !important;
  -webkit-text-fill-color: #e0e0e0 !important;
  border: 1px solid #383838 !important;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.3px;
  transition: all 0.15s ease-in-out;
  box-shadow: none !important;
}
.btn-secondary:hover:not(:disabled) {
  background-color: #2d2d2d !important;
  background: #2d2d2d !important;
  border-color: #505050 !important;
  color: #e0e0e0 !important;
  -webkit-text-fill-color: #e0e0e0 !important;
  box-shadow: 0 0 6px rgba(192, 192, 192, 0.25) !important;
}
.btn-secondary:active:not(:disabled) {
  transform: translateY(1px);
}

.btn-add-skill,
.btn-add-equipment,
.btn-open-forge,
.btn-add-custom-item,
.btn-add-spell,
.btn-add-note-panel {
  background-color: #1d1d1d !important;
  background: #1d1d1d !important;
  border-color: #383838 !important;
}

.btn-add-skill:hover:not(:disabled),
.btn-add-equipment:hover:not(:disabled),
.btn-open-forge:hover:not(:disabled),
.btn-add-custom-item:hover:not(:disabled),
.btn-add-spell:hover:not(:disabled),
.btn-add-note-panel:hover:not(:disabled) {
  background-color: #2d2d2d !important;
  background: #2d2d2d !important;
  border-color: #505050 !important;
  box-shadow: 0 0 6px rgba(192, 192, 192, 0.25) !important;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  background: #161b22;
  border: 1px solid #30363d;
  box-shadow: 0 0 8px var(--theme-glow, rgba(208, 208, 208, 0.22)), 0 0 12px var(--theme-glow, rgba(208, 208, 208, 0.12));
  border-radius: 8px;
  padding: 24px;
  width: 440px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-card h3 {
  margin-top: 0;
  color: #c8c8c8 !important;
  text-shadow: none !important;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.form-group label {
  font-size: 0.85rem;
  color: #8b949e;
}

.form-group input,
.form-group select {
  background-color: #000000;
  border: 1px solid #cecece;
  color: #cecece;
  padding: 8px;
  border-radius: 4px;
}

.char-create-select,
.char-create-select option {
  background-color: #000000 !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  background-image: none !important;
}

.char-create-select {
  border: 1px solid #cecece !important;
  border-radius: var(--radius, 4px);
  padding: 8px 12px;
  padding-right: 28px !important;
  font-size: 14px;
  width: 100%;
}

.char-create-select:focus {
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.modal-card .btn-modal-cancel {
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid #cecece !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  padding: 6px 14px;
  border-radius: var(--radius, 4px);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.modal-card .btn-modal-cancel:hover {
  background-color: #000000 !important;
  border-color: #cecece !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  box-shadow: 0 0 8px rgba(206, 206, 206, 0.4);
}

.modal-card .btn-modal-create {
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid #d0d0d0 !important;
  color: #d0d0d0 !important;
  -webkit-text-fill-color: #d0d0d0;
  padding: 6px 16px;
  border-radius: var(--radius, 4px);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(208, 208, 208, 0.25);
  letter-spacing: 0.3px;
  transition: all 0.15s ease-in-out;
}

.modal-card .btn-modal-create:hover:not(:disabled) {
  background-color: #000000 !important;
  border-color: #d0d0d0 !important;
  color: #d0d0d0 !important;
  -webkit-text-fill-color: #d0d0d0;
  box-shadow: 0 0 16px rgba(208, 208, 208, 0.5);
}

.modal-card .btn-modal-create:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(208, 208, 208, 0.4);
}

.modal-card .btn-modal-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.list-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.equipment-modal {
  max-width: 650px;
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.equipment-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.equipment-modal-header h3 {
  margin: 0;
  color: #c8c8c8 !important;
  text-shadow: none !important;
}

.btn-close-modal {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.btn-close-modal:hover {
  color: var(--text-primary);
}

.equipment-modal-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.equipment-category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.cat-tab {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid #334455;
  color: #8899aa;
  padding: 0.35rem 0.65rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.cat-tab:hover {
  background: rgba(0, 229, 255, 0.1);
  border-color: #00e5ff;
  color: #cecece;
}

.cat-tab.active {
  background: rgba(0, 229, 255, 0.2);
  border-color: #00e5ff;
  color: #00e5ff;
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.3);
  font-weight: bold;
}

.cat-count {
  font-size: 0.75rem;
  opacity: 0.8;
}

.modal-search {
  margin-bottom: 14px;
  padding: 8px 12px;
  background-color: #000000 !important;
  border: 1px solid #cecece !important;
  color: #cecece !important;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}

.modal-search:focus {
  outline: none;
  border-color: #cecece !important;
  box-shadow: 0 0 8px rgba(206, 206, 206, 0.4);
}

.equipment-list {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
  padding-right: 6px;
  max-height: 55vh;
}

.equipment-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  box-shadow: 0 0 8px var(--theme-glow, rgba(208, 208, 208, 0.22)), 0 0 12px var(--theme-glow, rgba(208, 208, 208, 0.12));
  border-radius: 8px;
  padding: 12px;
  transition: border-color 0.15s ease;
}

.equipment-card:hover {
  border-color: rgba(69, 172, 186, 0.5);
}

.eq-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.eq-name {
  font-weight: 700;
  font-size: 15px;
  color: var(--theme-bright, #45acba);
}

.eq-add-btn {
  background-color: #000000;
  border: 1px solid var(--theme-bright, #cecece);
  color: var(--theme-bright, #cecece);
  padding: 4px 14px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--theme-glow-subtle, 0 0 6px rgba(192, 192, 192, 0.3));
  transition: all 0.15s ease;
}

.eq-add-btn:hover {
  background-color: #000000;
  border-color: var(--theme-bright-hover, var(--theme-bright));
  color: var(--theme-bright-hover, var(--theme-bright));
  box-shadow: var(--theme-glow-hover);
}

.eq-add-btn.btn-added {
  background: #0d2818 !important;
  border-color: #4ade80 !important;
  color: #39d353 !important;
}

.eq-details {
  display: flex;
  gap: 14px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  align-items: center;
}

.eq-tag {
  background: var(--theme-surface-active, rgba(69, 172, 186, 0.18));
  color: var(--theme-bright, #45acba);
  border: 1px solid var(--theme-border-subtle, transparent);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.eq-cost {
  color: #cecece;
  font-weight: 500;
}

.eq-weight {
  color: #8b949e;
}

.eq-capabilities {
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-primary);
}

.portrait-box {
  width: 57px;
  height: 57px;
  border: 1px dashed rgba(0, 128, 128, 0.6);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  background: #000000;
  flex-shrink: 0;
  transition: all 0.15s ease-in-out;
}

.portrait-box:hover {
  border-color: aqua;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.portrait-placeholder {
  font-size: 9px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.15;
  padding: 2px;
}

.portrait-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal-avatar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar-preview {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #30363d;
  flex-shrink: 0;
  cursor: pointer;
}

.modal-avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-remove-avatar {
  position: absolute;
  top: 2px;
  right: 2px;
  background: #000000;
  border: 1px solid teal;
  color: aqua;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: all 0.15s ease-in-out;
}

.btn-remove-avatar:hover {
  border-color: aqua;
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.5);
}

.btn-browse-avatar {
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  border-radius: var(--radius, 4px);
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-browse-avatar:hover {
  background-color: #082020 !important;
  border-color: #00dada !important;
  color: #00dada !important;
  -webkit-text-fill-color: #00dada;
  box-shadow: 0 0 8px rgba(0, 218, 218, 0.4);
}

.notes-section {
  margin-top: 1.5rem;
}

.notes-section .section-header {
  padding-bottom: 2%;
}

.notes-section h4 {
  margin: 0;
  color: #45acba;
  color: #c8c8c8 !important;
  text-shadow: none !important;
}

.notes-textarea {
  width: 100%;
  box-sizing: border-box;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  border-radius: 6px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 0.92rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 90px;
}

.notes-textarea:focus {
  outline: none;
  border-color: #cecece;
  box-shadow: 0 0 8px rgba(206, 206, 206, 0.35);
}

.notes-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-add-note-panel {
  font-size: 0.85rem;
  padding: 6px 12px;
}

.btn-add-note-panel:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #30363d;
}

.note-panels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 16px;
}

.note-panel-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title-input {
  flex: 1;
  background: #000000;
  border: 1px solid #cecece;
  color: #cecece;
  font-size: 1rem;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 6px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.panel-title-input:focus {
  outline: none;
  border-color: #cecece;
  box-shadow: 0 0 8px rgba(206, 206, 206, 0.35);
}

.btn-delete-panel {
  background: transparent;
  border: 1px solid transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-delete-panel:hover {
  color: #f87171;
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}

.note-panel-card.panel-drag-over {
  border-color: #cecece;
  box-shadow: 0 0 10px rgba(206, 206, 206, 0.25);
}

.panels-empty {
  text-align: center;
  color: #94a3b8;
  padding: 24px 16px;
}

.error-banner {
  background-color: rgba(220, 53, 69, 0.2);
  border: 1px solid #dc3545;
  color: #ff8591;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.btn-dismiss-error {
  background: transparent;
  border: none;
  color: #ff8591;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0 0.25rem;
}

.btn-dismiss-error:hover {
  color: #cecece;
}

.sheet-domain-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.domain-tab-btn {
  background-color: #000000;
  border: 1px solid var(--border-color, #30363d);
  color: var(--text-secondary, #8b949e);
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 6px var(--theme-glow, rgba(208, 208, 208, 0.22));
  transition: all 0.15s ease;
}

.domain-tab-btn:hover {
  border-color: var(--theme-bright, #45acba);
  color: var(--theme-bright-hover, var(--theme-bright, #cecece));
  box-shadow: var(--theme-glow-subtle);
}

.domain-tab-btn.active {
  background-color: var(--theme-surface-active, #05282e);
  border-color: var(--theme-bright, #45acba);
  color: var(--theme-bright, #45acba);
  box-shadow: var(--theme-glow-hover);
}

.grimoire-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.grimoire-sub {
  font-size: 0.78rem;
  color: #8b949e;
}

.grimoire-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.grimoire-row {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 4px;
  padding: 5px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: none !important;
}

.grimoire-row-top,
.grimoire-row-mid,
.grimoire-row-bot {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.grimoire-row .spell-name-input {
  flex: 1 1 160px;
  min-width: 130px;
  font-weight: 700;
  padding: 3px 6px;
  font-size: 0.82rem;
  height: 26px;
  box-sizing: border-box;
}

.grimoire-row .spell-tradition-select,
.grimoire-row .spell-category-select {
  flex: 0 1 125px;
  min-width: 95px;
  padding: 3px 20px 3px 6px !important;
  font-size: 0.78rem;
  height: 26px;
  box-sizing: border-box;
  background-position: right 6px center !important;
}

.grimoire-row .spell-dial-group {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.76rem;
  color: #8b949e;
  white-space: nowrap;
}

.grimoire-row .spell-tier-label {
  font-size: 0.76rem;
  color: #8b949e;
  font-weight: 600;
  cursor: default;
}

.grimoire-row .spell-tier-input {
  width: 38px;
  padding: 2px 2px;
  font-size: 0.8rem;
  height: 26px;
  box-sizing: border-box;
}

.grimoire-row .spell-target-badge {
  padding: 2px 6px;
  font-size: 0.76rem;
  height: 26px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.grimoire-row .spell-cost-badge {
  background: var(--theme-surface-active, rgba(69, 172, 186, 0.12));
  border: 1px solid var(--theme-border-subtle, rgba(69, 172, 186, 0.35));
  color: var(--theme-bright, #45acba);
  box-shadow: var(--theme-glow-subtle);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.76rem;
  font-weight: 600;
  height: 26px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.grimoire-row .btn-cast-spell {
  padding: 3px 8px;
  font-size: 0.76rem;
  height: 26px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.grimoire-row .btn-remove-spell {
  padding: 2px 6px;
  font-size: 0.8rem;
  height: 26px;
  line-height: 1;
}

.grimoire-row .spell-magnitude-badge {
  background: var(--theme-surface-active, rgba(69, 172, 186, 0.12));
  border: 1px solid var(--theme-border-subtle, rgba(69, 172, 186, 0.35));
  color: var(--theme-bright, #45acba);
  box-shadow: var(--theme-glow-subtle);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  height: 24px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  flex-shrink: 0;
}

.grimoire-row .spell-range-input {
  flex: 0 1 140px;
  min-width: 105px;
  padding: 2px 6px;
  font-size: 0.78rem;
  height: 24px;
  box-sizing: border-box;
}

.grimoire-row .spell-desc-input {
  flex: 1 1 160px;
  min-width: 140px;
  padding: 2px 6px;
  font-size: 0.78rem;
  height: 24px;
  box-sizing: border-box;
  color: #8b949e;
}

.grimoire-cast-banner {
  background: var(--theme-surface-active, rgba(6, 182, 212, 0.12));
  border: 1px solid var(--theme-bright, #45acba);
  box-shadow: var(--theme-glow-subtle);
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #cecece;
}

.cast-banner-main,
.cast-banner-rolls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 0.85rem;
}

.cast-tradition-tag,
.cast-cost-tag {
  background: #000000;
  border: 1px solid var(--theme-border-subtle, #30363d);
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--theme-bright, #45acba);
  font-weight: 600;
}

.cast-check-pill.success {
  color: #34d399;
  font-weight: 700;
}

.cast-check-pill.fail {
  color: #f87171;
  font-weight: 700;
}

.btn-dismiss-cast {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
}

.forge-cap-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--theme-surface-active, rgba(69, 172, 186, 0.15));
  border: 1px solid var(--theme-border-subtle, rgba(69, 172, 186, 0.4));
  color: var(--theme-bright, #45acba);
  box-shadow: var(--theme-glow-subtle);
  font-weight: 700;
}

/* Character Sheet Scoped 1px Theme Borders */
.sheet-container input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]),
.sheet-container select,
.sheet-container textarea {
  border-width: 1px;
}

.sheet-container button:not(.btn-sta):not(.btn-ess):not(.btn-shift) {
  border-width: 1px;
}
</style>
