<template>
  <div class="quick-reference-container">
    <!-- Toolbar: Category Navigation & Search -->
    <header class="ref-toolbar">
      <nav class="category-tabs" aria-label="Reference Categories">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="tab-button"
          :class="{ active: activeCategory === tab.id }"
          @click="activeCategory = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </nav>

      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Filter rules & tables..."
          aria-label="Filter rules and tables"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="clear-search-btn"
          title="Clear filter"
          @click="searchQuery = ''"
        >
          ✕
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="ref-content">
      <!-- Empty State -->
      <div v-if="noResults" class="empty-state">
        <div class="empty-icon">📜</div>
        <h3>No matching rules or tables found</h3>
        <p>No results found matching "{{ searchQuery }}" in {{ currentTabLabel }}.</p>
        <button type="button" class="clear-filter-btn" @click="searchQuery = ''">Clear Filter</button>
      </div>

      <!-- ================= RANGED COMBAT ================= -->
      <div v-else-if="activeCategory === 'ranged'" class="category-panel">
        <!-- Turn Sequence -->
        <section v-if="filteredRangedSequence.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Tactical Flow</span>
            Turn Sequence & Actions
          </h2>
          <div class="sequence-grid">
            <div
              v-for="step in filteredRangedSequence"
              :key="step.step"
              class="step-card"
            >
              <div class="step-header">
                <span class="step-num">Step {{ step.step }}</span>
                <h3 class="step-name">{{ step.name }}</h3>
              </div>
              <p class="step-desc">{{ step.description }}</p>
            </div>
          </div>
        </section>

        <!-- Ranged Weapons Table -->
        <section v-if="filteredRangedWeapons.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Arsenal</span>
            Ranged Weapons
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Damage</th>
                  <th>RoF</th>
                  <th>Short</th>
                  <th>Medium</th>
                  <th>Long</th>
                  <th>Ammo</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="w in filteredRangedWeapons" :key="w.name">
                  <td class="col-name font-bold">{{ w.name }}</td>
                  <td><span class="type-tag">{{ w.category }}</span></td>
                  <td class="col-highlight font-mono">{{ w.damage }}</td>
                  <td class="font-mono text-center">{{ w.rof }}</td>
                  <td class="font-mono text-center">{{ w.shortRange }}</td>
                  <td class="font-mono text-center">{{ w.medRange }}</td>
                  <td class="font-mono text-center">{{ w.longRange }}</td>
                  <td>{{ w.ammo }}</td>
                  <td class="col-notes">{{ w.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- To-Hit Modifiers Table -->
        <section v-if="filteredRangedModifiers.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Targeting</span>
            To-Hit Modifiers
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 260px;">Condition</th>
                  <th style="width: 180px;">Modifier</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in filteredRangedModifiers" :key="m.condition">
                  <td class="col-name font-bold">{{ m.condition }}</td>
                  <td>
                    <span class="modifier-pill" :class="modifierClass(m.modifier)">
                      {{ m.modifier }}
                    </span>
                  </td>
                  <td class="col-notes text-muted">{{ m.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Armor & Wards Table -->
        <section v-if="filteredRangedArmor.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Defense</span>
            Armor, Shields & Wards
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Protection</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in filteredRangedArmor" :key="a.name">
                  <td class="col-name font-bold">{{ a.name }}</td>
                  <td><span class="type-tag">{{ a.type }}</span></td>
                  <td class="col-effect font-medium">{{ a.protection }}</td>
                  <td class="col-notes text-muted">{{ a.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ================= MELEE COMBAT ================= -->
      <div v-else-if="activeCategory === 'melee'" class="category-panel">
        <!-- Turn Sequence -->
        <section v-if="filteredMeleeSequence.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Tactical Flow</span>
            Turn Sequence & Actions
          </h2>
          <div class="sequence-grid">
            <div
              v-for="step in filteredMeleeSequence"
              :key="step.step"
              class="step-card"
            >
              <div class="step-header">
                <span class="step-num">Step {{ step.step }}</span>
                <h3 class="step-name">{{ step.name }}</h3>
              </div>
              <p class="step-desc">{{ step.description }}</p>
            </div>
          </div>
        </section>

        <!-- Formula Callout Banner -->
        <div v-if="showMeleeFormula" class="formula-banner">
          <div class="formula-icon">⚔️</div>
          <div class="formula-details">
            <span class="formula-subtitle">Base Hit Chance Formula</span>
            <div class="formula-code">{{ MELEE_COMBAT_REF.attackBaseFormula }}</div>
          </div>
        </div>

        <!-- Unarmed Combat Table -->
        <section v-if="filteredMeleeUnarmed.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Brawling</span>
            Unarmed Combat
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 200px;">STR Bracket</th>
                  <th style="width: 220px;">Punch Damage</th>
                  <th>Kick Damage</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in filteredMeleeUnarmed" :key="u.strBracket">
                  <td class="col-name font-bold font-mono">{{ u.strBracket }}</td>
                  <td class="col-highlight font-mono">{{ u.punchDamage }}</td>
                  <td class="col-highlight font-mono">{{ u.kickDamage }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Melee Weapons Table -->
        <section v-if="filteredMeleeWeapons.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Weapons</span>
            Melee Weapons
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Damage</th>
                  <th>Weight</th>
                  <th>Special Properties</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="w in filteredMeleeWeapons" :key="w.name">
                  <td class="col-name font-bold">{{ w.name }}</td>
                  <td class="col-highlight font-mono">{{ w.damage }}</td>
                  <td class="font-mono">{{ w.weight }}</td>
                  <td class="col-notes">{{ w.special }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Melee Modifiers Table -->
        <section v-if="filteredMeleeModifiers.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Tactics</span>
            Melee Modifiers
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 260px;">Situation</th>
                  <th style="width: 220px;">Modifier</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in filteredMeleeModifiers" :key="m.situation">
                  <td class="col-name font-bold">{{ m.situation }}</td>
                  <td>
                    <span class="modifier-pill" :class="modifierClass(m.modifier)">
                      {{ m.modifier }}
                    </span>
                  </td>
                  <td class="col-notes text-muted">{{ m.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ================= OVERLAND ================= -->
      <div v-else-if="activeCategory === 'overland' || activeCategory === 'additional'" class="category-panel">
        <!-- Overview Banner -->
        <div class="formula-banner">
          <div class="formula-icon">🐎</div>
          <div class="formula-details">
            <span class="formula-subtitle">Wayworlds d100 Systems &amp; Environment</span>
            <div class="formula-code">{{ ADDITIONAL_RULES_REF.description }}</div>
          </div>
        </div>

        <!-- Mounts & Movement Table -->
        <section v-if="filteredAdditionalMounts.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Mounts &amp; Travel</span>
            Mounts &amp; Overland Movement
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 220px;">Subject / Mount</th>
                  <th style="width: 200px;">Tactical Speed</th>
                  <th style="width: 230px;">Overland Speed</th>
                  <th style="width: 170px;">Capacity</th>
                  <th>Rules &amp; Mechanics</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in filteredAdditionalMounts" :key="r.subject">
                  <td class="col-name font-bold">{{ r.subject }}</td>
                  <td class="col-highlight font-mono">{{ r.tacticalSpeed }}</td>
                  <td class="font-mono">{{ r.overlandSpeed }}</td>
                  <td>{{ r.capacity }}</td>
                  <td class="col-notes">{{ r.mechanics }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ================= PRIMARY ATTRIBUTES ================= -->
      <div v-else-if="activeCategory === 'attributes'" class="category-panel">
        <!-- Overview Banner -->
        <div v-if="filteredAttributesOverview" class="formula-banner">
          <div class="formula-icon">✨</div>
          <div class="formula-details">
            <span class="formula-subtitle">{{ ATTRIBUTES_RULES_REF.overview.title }} (Baseline: {{ ATTRIBUTES_RULES_REF.overview.baseline }})</span>
            <div class="formula-code">{{ ATTRIBUTES_RULES_REF.overview.formula }}</div>
            <p class="formula-desc">{{ ATTRIBUTES_RULES_REF.overview.description }}</p>
          </div>
        </div>

        <!-- Attributes Quick Reference Summary Table -->
        <section v-if="filteredAttributesSummary.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Overview</span>
            Attributes Quick Reference
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 140px;">Acronym</th>
                  <th style="width: 180px;">Attribute</th>
                  <th style="width: 110px;">Paired With</th>
                  <th style="width: 320px;">Governing Role &amp; Mechanical Impact</th>
                  <th>Formula &amp; Thresholds</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in filteredAttributesSummary" :key="stat.acronym">
                  <td class="col-name font-bold font-mono">
                    <span class="attr-pill">{{ stat.acronym }}</span>
                  </td>
                  <td class="font-bold">{{ stat.name }}</td>
                  <td class="font-mono text-center">{{ stat.pair }}</td>
                  <td>{{ stat.baseRole }}</td>
                  <td class="col-highlight font-mono">{{ stat.formulaRole }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Paired Attributes Detail Cards -->
        <section v-for="pair in filteredAttributePairs" :key="pair.acronym" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Pair</span>
            {{ pair.pairName }} ({{ pair.acronym }})
          </h2>
          <div class="pair-meta-desc">{{ pair.title }} &bull; {{ pair.primaryRole }}</div>
          <div class="stat-cards-grid">
            <div v-for="st in pair.stats" :key="st.acronym" class="stat-detail-card">
              <div class="stat-card-header">
                <span class="stat-badge">{{ st.acronym }}</span>
                <div class="stat-card-title-group">
                  <h3 class="stat-card-name">{{ st.name }}</h3>
                  <span class="stat-card-sub">Paired with: {{ st.pairedWith }} &bull; Baseline: {{ st.baseValue }}</span>
                </div>
              </div>
              <p class="stat-card-desc">{{ st.description }}</p>
              <div class="stat-card-governs">
                <span class="governs-label">Governs &amp; Calculations:</span>
                <ul class="governs-list">
                  <li v-for="(rule, idx) in st.governs" :key="idx">{{ rule }}</li>
                </ul>
              </div>
              <div class="stat-card-skills">
                <span class="skills-label">Key Associated Skills &amp; Traditions:</span>
                <span class="skills-text">{{ st.keySkills }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Primary Resource Pools Table -->
        <section v-if="filteredResourcePools.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Vital Pools</span>
            Primary Resource Pools
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 180px;">Resource Pool</th>
                  <th style="width: 280px;">Maximum Capacity Formula</th>
                  <th>Depletion, Spell Costs &amp; Recovery</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pool in filteredResourcePools" :key="pool.acronym">
                  <td class="col-name font-bold">{{ pool.name }}</td>
                  <td class="col-highlight font-mono">{{ pool.metric }}</td>
                  <td class="col-notes">{{ pool.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ================= PRIMARY SYSTEM AREAS (PSA) ================= -->
      <div v-else-if="activeCategory === 'psa'" class="category-panel">
        <!-- Overview Banner -->
        <div v-if="filteredPsaOverview" class="formula-banner">
          <div class="formula-icon">🛡️</div>
          <div class="formula-details">
            <span class="formula-subtitle">{{ PSA_RULES_REF.overview.title }}</span>
            <div class="formula-code">{{ PSA_RULES_REF.overview.formula }}</div>
            <p class="formula-desc">{{ PSA_RULES_REF.overview.description }}</p>
          </div>
        </div>

        <!-- Universal PSA-Scaled XP Progression Table -->
        <section v-if="filteredPsaXpTable.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Advancement</span>
            Universal PSA-Scaled XP Point-Buy Table (Levels 1–6)
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 90px;">Level</th>
                  <th style="width: 110px;">Check Bonus</th>
                  <th style="width: 140px;">In-PSA Cost</th>
                  <th style="width: 170px;">In-PSA Cumulative</th>
                  <th style="width: 160px;">Out-of-PSA Cost</th>
                  <th style="width: 190px;">Out-of-PSA Cumulative</th>
                  <th>Proficiency Rank</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredPsaXpTable" :key="row.level">
                  <td class="font-bold text-center font-mono">Level {{ row.level }}</td>
                  <td class="col-highlight font-mono font-bold text-center">{{ row.bonus }}</td>
                  <td class="font-mono text-center font-bold text-emerald">{{ row.inPsaCost }} XP</td>
                  <td class="font-mono text-center">{{ row.cumInPsa }} XP</td>
                  <td class="font-mono text-center font-bold text-rose">{{ row.outPsaCost }} XP</td>
                  <td class="font-mono text-center">{{ row.cumOutPsa }} XP</td>
                  <td class="col-name">{{ row.rank }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Character Tier Benchmarks Table -->
        <section v-if="filteredPsaCharacterTiers.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Tiers</span>
            Character Tier Calculation Benchmarks
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 100px;">Tier</th>
                  <th style="width: 180px;">Title</th>
                  <th style="width: 260px;">Skill Qualification</th>
                  <th>World &amp; Adversary Benchmark</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tier in filteredPsaCharacterTiers" :key="tier.tier">
                  <td class="col-name font-bold font-mono">
                    <span class="attr-pill">{{ tier.tier }}</span>
                  </td>
                  <td class="font-bold">{{ tier.title }}</td>
                  <td class="col-highlight font-mono">{{ tier.req }}</td>
                  <td class="col-notes">{{ tier.benchmark }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- PSA Detailed Areas Cards -->
        <section v-for="area in filteredPsaAreas" :key="area.id" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Area</span>
            <span class="psa-badge" :class="area.id.toLowerCase()">{{ area.name }}</span>
            {{ area.tagline }}
          </h2>
          <p class="pair-meta-desc">{{ area.description }}</p>

          <!-- Secular Skills in this PSA -->
          <div v-if="area.secularSkills.length > 0" class="psa-subgroup">
            <h3 class="psa-sub-title">Core Secular Skills ({{ area.name }} PSA)</h3>
            <div class="stat-cards-grid">
              <div v-for="sk in area.secularSkills" :key="sk.name" class="stat-detail-card">
                <div class="stat-card-header">
                  <span class="skill-category-tag">{{ sk.type }}</span>
                  <div class="stat-card-title-group">
                    <h4 class="stat-card-name">{{ sk.name }}</h4>
                    <span class="stat-card-sub">Base Stat: {{ sk.baseStat }} &bull; In-PSA: 1× Cost</span>
                  </div>
                </div>
                <p class="stat-card-desc">{{ sk.description }}</p>
                <div class="stat-card-governs">
                  <span class="governs-label">Base Chance Formula:</span>
                  <div class="font-mono col-highlight" style="font-size: 12px;">{{ sk.baseChance }}</div>
                </div>
                <div class="stat-card-skills">
                  <span class="skills-label">Primary Applications:</span>
                  <span class="skills-text">{{ sk.keyUse }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Traditions in this PSA -->
          <div v-if="area.traditions.length > 0" class="psa-subgroup">
            <h3 class="psa-sub-title">Traditions &amp; Disciplines ({{ area.name }} PSA)</h3>
            <div class="stat-cards-grid">
              <div v-for="tr in area.traditions" :key="tr.name" class="stat-detail-card">
                <div class="stat-card-header">
                  <span class="skill-category-tag tradition-tag">{{ tr.type }}</span>
                  <div class="stat-card-title-group">
                    <h4 class="stat-card-name">{{ tr.name }}</h4>
                    <span class="stat-card-sub">Fuel: {{ tr.fuel }} &bull; Base Stat: {{ tr.baseStat }}</span>
                  </div>
                </div>
                <p class="stat-card-desc">{{ tr.description }}</p>
                <div class="stat-card-governs">
                  <span class="governs-label">Base Chance Formula:</span>
                  <div class="font-mono col-highlight" style="font-size: 12px;">{{ tr.baseChance }}</div>
                </div>
                <div class="stat-card-skills">
                  <span class="skills-label">Signature Manifestations:</span>
                  <span class="skills-text">{{ tr.keyUse }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Full Skills & Traditions Summary Table -->
        <section v-if="filteredPsaSummary.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Matrix</span>
            Complete Skills &amp; Traditions Reference (22 Total)
          </h2>
          <div class="rules-note-banner">
            <span class="note-icon">💡</span>
            <div class="note-text">
              <strong>Multi-Magic Fuel Rule:</strong> Players with multiple magic skills or traditions may choose the highest governing attribute to fuel their <strong>ESSENCE/MANA</strong> pool (for example, a caster with Necromancy [INT/HIST] and Demonology [WIL/PRE] uses the higher of the two attributes).
            </div>
          </div>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 180px;">Skill / Tradition</th>
                  <th style="width: 110px;">PSA</th>
                  <th style="width: 130px;">Category</th>
                  <th style="width: 140px;">Base Stat</th>
                  <th style="width: 220px;">Base Hit Formula</th>
                  <th style="width: 120px;">Fuel Cost</th>
                  <th>Tactical Focus &amp; Applications</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredPsaSummary" :key="item.name">
                  <td class="col-name font-bold">{{ item.name }}</td>
                  <td>
                    <span class="psa-badge" :class="item.psa.toLowerCase()">{{ item.psa }}</span>
                  </td>
                  <td>
                    <span class="skill-category-tag" :class="{ 'tradition-tag': item.category === 'Tradition' }">{{ item.category }}</span>
                  </td>
                  <td class="font-mono font-bold">{{ item.baseStat }}</td>
                  <td class="col-highlight font-mono">{{ item.baseChance }}</td>
                  <td class="font-mono">
                    <span
                      class="fuel-pill"
                      :class="{
                        ess: item.fuel.includes('ESS'),
                        sta: item.fuel.includes('STA'),
                        none: item.fuel === '—'
                      }"
                    >{{ item.fuel }}</span>
                  </td>
                  <td class="col-notes">{{ item.keyUse }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ================= SPELLS & MARTIAL TECHNIQUES ================= -->
      <div v-else-if="activeCategory === 'spells'" class="category-panel">
        <!-- Universal Magnitude Table Section -->
        <section v-if="filteredMagnitudeTable.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Universal Framework</span>
            Universal Magnitude Table
          </h2>
          <div class="rules-overview-banner">
            <p>
              <strong>Universal Casting Cost:</strong> <code>Cast Tier &times; 2</code> (paid from <strong>ESS</strong> for Magic/Ki traditions, or directly from <strong>STA</strong> for Blood &amp; Warg). Tier 0 powers (Cantrips &amp; Techniques) cost <strong>0 fuel</strong>.
            </p>
          </div>
          <div class="table-responsive">
            <table class="ref-table magnitude-table">
              <thead>
                <tr>
                  <th style="width: 75px;">Tier</th>
                  <th style="width: 85px;">Cost</th>
                  <th>Strike (Single Target)</th>
                  <th>Blast / Cleave (Area)</th>
                  <th>Ward / Heal (Defense &amp; Recovery)</th>
                  <th>Hex / Control (Debuff &amp; Summon)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredMagnitudeTable" :key="row.tier">
                  <td class="font-bold col-highlight">Tier {{ row.tier }}</td>
                  <td class="font-mono">{{ row.cost }} Fuel</td>
                  <td>
                    <strong class="dice-highlight">{{ row.strike.dice }}</strong>
                    <span class="mag-summary">{{ row.strike.summary }}</span>
                  </td>
                  <td>
                    <strong class="dice-highlight">{{ row.blast_heal.dice }}</strong>
                    <span class="mag-summary">{{ row.blast_heal.summary }}</span>
                  </td>
                  <td>
                    <strong class="dice-highlight">{{ row.ward_buff.dice }}</strong>
                    <span class="mag-summary">{{ row.ward_buff.summary }}</span>
                  </td>
                  <td>
                    <strong class="dice-highlight">{{ row.hex_summon.dice }}</strong>
                    <span class="mag-summary">{{ row.hex_summon.summary }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Magic & Ki Traditions Grid -->
        <section class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Disciplines</span>
            The 11 Magic &amp; Ki Traditions
          </h2>
          <div class="traditions-pill-row">
            <button
              type="button"
              class="tradition-filter-pill"
              :class="{ active: selectedTraditionFilter === 'all' }"
              @click="selectedTraditionFilter = 'all'"
            >
              All Traditions
            </button>
            <button
              v-for="trad in magicTraditionsList"
              :key="trad.name"
              type="button"
              class="tradition-filter-pill"
              :class="{ active: selectedTraditionFilter === trad.name }"
              @click="selectedTraditionFilter = trad.name"
            >
              {{ trad.name }}
            </button>
          </div>
        </section>

        <!-- Pre-scribed Examples Section -->
        <section class="ref-section">
          <div class="section-header-flex">
            <div>
              <h2 class="section-title">
                <span class="title-badge">Grimoire Examples</span>
                Spells &amp; Martial Techniques
              </h2>
              <p class="section-subtitle">
                Canonical examples for players to use, adapt, or scribe into their character sheets.
              </p>
            </div>
            <div class="section-actions">
              <!-- GM Only Add Example Button -->
              <button
                v-if="isGM"
                type="button"
                class="btn-primary btn-add-example"
                @click="openAddSpellModal"
              >
                + Add Example
              </button>
            </div>
          </div>

          <div v-if="spellMessage" :class="['alert', spellMessageType === 'error' ? 'alert-error' : 'alert-success']">
            {{ spellMessage }}
          </div>

          <div v-if="filteredSpellExamples.length === 0" class="empty-list">
            No spell or technique examples found matching the active filter.
          </div>

          <div v-else class="guide-grimoire-list">
            <div
              v-for="spell in filteredSpellExamples"
              :key="spell.spell_id || spell.name"
              class="card guide-grimoire-row"
            >
              <div class="guide-row-top">
                <input
                  type="text"
                  v-model="spell.name"
                  placeholder="Spell / Technique Name"
                  class="spell-name-input"
                  :readonly="!isGM"
                  @change="onSpellChange(spell)"
                />
                <select
                  v-model="spell.tradition"
                  class="spell-tradition-select"
                  :disabled="!isGM"
                  @change="onSpellChange(spell)"
                  title="Tradition"
                >
                  <option v-for="t in magicTraditionsList" :key="t.name" :value="t.name">{{ t.name }}</option>
                </select>
                <select
                  v-model="spell.category"
                  class="spell-category-select"
                  :disabled="!isGM"
                  @change="onSpellChange(spell)"
                  title="Magnitude Category"
                >
                  <option value="strike">Strike</option>
                  <option value="blast">Blast / Cleave</option>
                  <option value="ward_heal">Ward / Heal</option>
                  <option value="hex_summon">Hex / Control</option>
                </select>
                <div class="spell-dial-group">
                  <span class="spell-tier-label">Tier</span>
                  <input
                    type="number"
                    v-model.number="spell.default_tier"
                    min="0"
                    max="6"
                    class="spell-tier-input"
                    :readonly="!isGM"
                    @change="onSpellChange(spell)"
                  />
                </div>
                <span class="spell-cost-badge" :title="'Resource Cost: Cast Tier × 2'">
                  {{ (spell.default_tier || 0) * 2 }} {{ getFuelLabel(spell.tradition) }}
                </span>
                <div v-if="isGM" class="gm-item-actions">
                  <button
                    type="button"
                    class="btn-save-spell"
                    title="Save changes to this example"
                    @click="saveSpell(spell)"
                  >
                    💾 Save
                  </button>
                  <button
                    type="button"
                    class="btn-remove-spell"
                    title="Delete example"
                    @click="deleteSpell(spell)"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div class="guide-row-bot">
                <span class="spell-magnitude-badge">
                  {{ getMagnitudeSummary(spell.category, spell.default_tier) }}
                </span>
                <input
                  type="text"
                  v-model="spell.range_area"
                  placeholder="Range / Area"
                  class="spell-range-input"
                  :readonly="!isGM"
                  @change="onSpellChange(spell)"
                />
                <input
                  type="text"
                  v-model="spell.description"
                  placeholder="Flavor &amp; secondary notes..."
                  class="spell-desc-input"
                  :readonly="!isGM"
                  @change="onSpellChange(spell)"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Add Spell Example Modal (GM Only) -->
    <div v-if="showAddSpellModal && isGM" class="modal-backdrop modal-overlay" @click.self="showAddSpellModal = false">
      <div class="modal-card admin-eq-modal" role="dialog" aria-modal="true" aria-labelledby="add-spell-title">
        <div class="modal-header">
          <h3 id="add-spell-title">Add Spell / Martial Technique Example</h3>
          <button class="modal-close-btn" @click="showAddSpellModal = false">✕</button>
        </div>
        <form @submit.prevent="saveNewSpell" class="modal-form">
          <div class="form-group">
            <label for="example-name">Name *</label>
            <input id="example-name" v-model.trim="newSpellForm.name" type="text" required placeholder="e.g. Gale Blade" autofocus />
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="example-trad">Tradition *</label>
              <select id="example-trad" v-model="newSpellForm.tradition" class="role-select">
                <option v-for="t in magicTraditionsList" :key="t.name" :value="t.name">{{ t.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="example-cat">Category *</label>
              <select id="example-cat" v-model="newSpellForm.category" class="role-select">
                <option value="strike">Strike (Single Target)</option>
                <option value="blast">Blast / Cleave (Area)</option>
                <option value="ward_heal">Ward / Heal (Defense/Recovery)</option>
                <option value="hex_summon">Hex / Control (Debuff/Summon)</option>
              </select>
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="example-tier">Cast Tier (0–6) *</label>
              <input id="example-tier" v-model.number="newSpellForm.default_tier" type="number" min="0" max="6" required />
            </div>
            <div class="form-group">
              <label for="example-range">Range / Area *</label>
              <input id="example-range" v-model.trim="newSpellForm.range_area" type="text" required placeholder="e.g. 60 ft / Single Target" />
            </div>
          </div>
          <div class="form-group">
            <label for="example-desc">Description &amp; Flavor *</label>
            <textarea id="example-desc" v-model.trim="newSpellForm.description" rows="3" required placeholder="Mechanical details, damage type, secondary effects..."></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showAddSpellModal = false">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="savingSpell">
              {{ savingSpell ? 'Saving...' : 'Add Example' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import {
  RANGED_COMBAT_REF,
  MELEE_COMBAT_REF,
  ADDITIONAL_RULES_REF,
  ATTRIBUTES_RULES_REF,
  PSA_RULES_REF,
} from '../constants/combatReference.js';
import {
  MAGIC_TRADITIONS,
  UNIVERSAL_MAGNITUDE_TABLE,
} from '../constants/characterRules.js';
import { useAuthStore } from '../stores/auth.js';
import { socket } from '../services/socket.js';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';

const props = defineProps({
  initialCategory: {
    type: String,
    default: undefined
  },
  initialSearch: {
    type: String,
    default: undefined
  }
});

const tabs = [
  { id: 'attributes', label: 'Primary Attributes', icon: '✨' },
  { id: 'psa', label: 'Primary System Areas (PSA)', icon: '🛡️' },
  { id: 'spells', label: 'Spells/Martial Techniques', icon: '🔮' },
  { id: 'ranged', label: 'Ranged Weapon Combat', icon: '🏹' },
  { id: 'melee', label: 'Melee Combat', icon: '⚔️' },
  { id: 'overland', label: 'Overland', icon: '🐎' },
];

const savedQuickRef = getUserState(getSafeUserId(), 'rulebooks', {
  quickRefCategory: 'ranged',
  quickRefSearch: '',
});

const rawInitial = props.initialCategory ?? (savedQuickRef.quickRefCategory === 'ship' ? 'ranged' : savedQuickRef.quickRefCategory) ?? 'ranged';
const initial = (rawInitial === 'additional' || rawInitial === 'overland') ? 'overland' : rawInitial;
const activeCategory = ref(initial);
const searchQuery = ref(props.initialSearch ?? savedQuickRef.quickRefSearch ?? '');

watch([activeCategory, searchQuery], () => {
  saveUserState(getSafeUserId(), 'rulebooks', {
    quickRefCategory: activeCategory.value,
    quickRefSearch: searchQuery.value,
  });
});

const currentTabLabel = computed(() => {
  const current = tabs.find((t) => t.id === activeCategory.value);
  return current ? current.label : '';
});

// Helper search matcher across all properties of an item
function matchesQuery(item, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return Object.values(item).some((val) => {
    if (val === null || val === undefined) return false;
    return String(val).toLowerCase().includes(q);
  });
}

// Styling helper for modifier pills
function modifierClass(modifierStr) {
  if (!modifierStr) return 'neutral';
  const str = String(modifierStr).trim();
  if (str.startsWith('+')) return 'positive';
  if (str.startsWith('-')) return 'negative';
  return 'neutral';
}

// Filtered Ranged Combat items
const filteredRangedSequence = computed(() =>
  RANGED_COMBAT_REF.sequenceOfPlay.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredRangedWeapons = computed(() =>
  RANGED_COMBAT_REF.weapons.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredRangedModifiers = computed(() =>
  RANGED_COMBAT_REF.modifiers.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredRangedArmor = computed(() =>
  RANGED_COMBAT_REF.armor.filter((item) => matchesQuery(item, searchQuery.value))
);

// Filtered Melee Combat items
const filteredMeleeSequence = computed(() =>
  (MELEE_COMBAT_REF.sequenceOfPlay || []).filter((item) => matchesQuery(item, searchQuery.value))
);
const showMeleeFormula = computed(() => {
  if (!searchQuery.value.trim()) return true;
  const q = searchQuery.value.trim().toLowerCase();
  return (
    MELEE_COMBAT_REF.attackBaseFormula.toLowerCase().includes(q) ||
    'base hit formula attack'.includes(q)
  );
});
const filteredMeleeUnarmed = computed(() =>
  MELEE_COMBAT_REF.unarmedDamage.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredMeleeWeapons = computed(() =>
  MELEE_COMBAT_REF.weapons.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredMeleeModifiers = computed(() =>
  MELEE_COMBAT_REF.modifiers.filter((item) => matchesQuery(item, searchQuery.value))
);

// Filtered Additional Rules items
const filteredAdditionalMounts = computed(() =>
  ADDITIONAL_RULES_REF.mountsAndMovement.filter((item) => matchesQuery(item, searchQuery.value))
);

// Filtered Primary Attributes items
const filteredAttributesOverview = computed(() => {
  if (!searchQuery.value.trim()) return true;
  const q = searchQuery.value.trim().toLowerCase();
  return (
    ATTRIBUTES_RULES_REF.overview.title.toLowerCase().includes(q) ||
    ATTRIBUTES_RULES_REF.overview.formula.toLowerCase().includes(q) ||
    ATTRIBUTES_RULES_REF.overview.description.toLowerCase().includes(q)
  );
});

const filteredAttributesSummary = computed(() =>
  ATTRIBUTES_RULES_REF.summaryTable.filter((item) => matchesQuery(item, searchQuery.value))
);

const filteredAttributePairs = computed(() => {
  if (!searchQuery.value.trim()) return ATTRIBUTES_RULES_REF.pairs;
  const q = searchQuery.value.trim().toLowerCase();
  return ATTRIBUTES_RULES_REF.pairs
    .map((pair) => {
      const pairMatches =
        pair.pairName.toLowerCase().includes(q) ||
        pair.acronym.toLowerCase().includes(q) ||
        pair.title.toLowerCase().includes(q) ||
        pair.primaryRole.toLowerCase().includes(q);
      const matchingStats = pair.stats.filter(
        (st) => pairMatches || matchesQuery(st, searchQuery.value)
      );
      if (matchingStats.length > 0) {
        return {
          ...pair,
          stats: matchingStats,
        };
      }
      return null;
    })
    .filter(Boolean);
});

const filteredResourcePools = computed(() =>
  ATTRIBUTES_RULES_REF.resourcePools.filter((item) => matchesQuery(item, searchQuery.value))
);

// Filtered PSA items
const filteredPsaOverview = computed(() => {
  if (!searchQuery.value.trim()) return true;
  const q = searchQuery.value.trim().toLowerCase();
  return (
    PSA_RULES_REF.overview.title.toLowerCase().includes(q) ||
    PSA_RULES_REF.overview.formula.toLowerCase().includes(q) ||
    PSA_RULES_REF.overview.description.toLowerCase().includes(q)
  );
});

const filteredPsaXpTable = computed(() =>
  PSA_RULES_REF.xpTable.filter((row) => matchesQuery(row, searchQuery.value))
);

const filteredPsaCharacterTiers = computed(() =>
  PSA_RULES_REF.characterTiers.filter((row) => matchesQuery(row, searchQuery.value))
);

const filteredPsaAreas = computed(() => {
  if (!searchQuery.value.trim()) return PSA_RULES_REF.areas;
  const q = searchQuery.value.trim().toLowerCase();
  return PSA_RULES_REF.areas
    .map((area) => {
      const areaMatches =
        area.name.toLowerCase().includes(q) ||
        area.tagline.toLowerCase().includes(q) ||
        area.description.toLowerCase().includes(q);
      const matchingSecular = area.secularSkills.filter(
        (sk) => areaMatches || matchesQuery(sk, searchQuery.value)
      );
      const matchingTraditions = area.traditions.filter(
        (tr) => areaMatches || matchesQuery(tr, searchQuery.value)
      );
      if (areaMatches || matchingSecular.length > 0 || matchingTraditions.length > 0) {
        return {
          ...area,
          secularSkills: matchingSecular,
          traditions: matchingTraditions,
        };
      }
      return null;
    })
    .filter(Boolean);
});

const filteredPsaSummary = computed(() =>
  PSA_RULES_REF.summaryTable.filter((item) => matchesQuery(item, searchQuery.value))
);

// ================= SPELLS & MARTIAL TECHNIQUES =================
let authStore = null;
try {
  authStore = useAuthStore();
} catch {}
const isGM = computed(() => authStore?.user?.role === 'GameMaster');

const magicTraditionsList = MAGIC_TRADITIONS;
const selectedTraditionFilter = ref('all');
const showAddSpellModal = ref(false);
const savingSpell = ref(false);
const spellMessage = ref('');
const spellMessageType = ref('success');

const DEFAULT_SPELL_EXAMPLES = [
  {
    spell_id: 'sp_arcane_missile',
    name: 'Arcane Missile',
    tradition: 'Arcane',
    category: 'strike',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: '60 ft / Single Target',
    description: 'Fires shimmering bolts of pure raw force that unerringly strike a single target for 2d10 damage.',
  },
  {
    spell_id: 'sp_arcane_aegis',
    name: 'Aegis Shield',
    tradition: 'Arcane',
    category: 'ward_heal',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: 'Self / 1 Round',
    description: 'Conjures a translucent crystalline ward absorbing 10 Temp Ward STA or granting -2 DR against incoming blows.',
  },
  {
    spell_id: 'sp_arcane_fireball',
    name: 'Fireball',
    tradition: 'Arcane',
    category: 'blast',
    default_tier: 2,
    cost: 4,
    fuel: 'ess',
    range_area: '90 ft Range / 15 ft Cone or Burst',
    description: 'Detonates a roaring sphere of elemental flame dealing 2d10 damage to all creatures within the blast.',
  },
  {
    spell_id: 'sp_blood_lance',
    name: 'Crimson Lance',
    tradition: 'Blood',
    category: 'strike',
    default_tier: 2,
    cost: 4,
    fuel: 'sta',
    range_area: '90 ft / Single Target',
    description: 'Crystallizes the caster\'s own blood into a hardened needle-sharp spear dealing 3d10 piercing damage.',
  },
  {
    spell_id: 'sp_blood_siphon',
    name: 'Sanguine Siphon',
    tradition: 'Blood',
    category: 'ward_heal',
    default_tier: 1,
    cost: 2,
    fuel: 'sta',
    range_area: 'Touch / Melee',
    description: 'Extracts vital essence from living tissue to restore 1d10 STA to the caster or a willing ally.',
  },
  {
    spell_id: 'sp_shadow_step',
    name: 'Shadowstep Strike',
    tradition: 'Shadow',
    category: 'strike',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: '60 ft / Single Target',
    description: 'Dissolves into darkness and reappears behind a foe, striking with umbral frost for 2d10 damage.',
  },
  {
    spell_id: 'sp_shadow_veil',
    name: 'Shroud of Gloam',
    tradition: 'Shadow',
    category: 'ward_heal',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: 'Self or 10 ft Area',
    description: 'Cloaks the target in supernatural shadow, granting +10% Stealth & Defense and dark concealment.',
  },
  {
    spell_id: 'sp_demonology_hellfire',
    name: 'Hellfire Burst',
    tradition: 'Demonology',
    category: 'blast',
    default_tier: 2,
    cost: 4,
    fuel: 'ess',
    range_area: '60 ft Range / 15 ft Burst',
    description: 'Unleashes brimstone flame from the Nether dealing 2d10 unholy fire damage. May sacrifice 2 STA per 1 ESS.',
  },
  {
    spell_id: 'sp_demonology_imp',
    name: 'Summon Fiend Thrall',
    tradition: 'Demonology',
    category: 'hex_summon',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: '30 ft / 1 Encounter',
    description: 'Summons a chittering Tier 1 minor demon thrall bound to harass and flank foes (-10% penalty).',
  },
  {
    spell_id: 'sp_necro_grave_bolt',
    name: 'Grave Bolt',
    tradition: 'Necromancy',
    category: 'strike',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: '60 ft / Single Target',
    description: 'Hurls a jet of pale necrotic chill draining the target\'s warmth for 2d10 damage.',
  },
  {
    spell_id: 'sp_necro_bone_armor',
    name: 'Bone Armor',
    tradition: 'Necromancy',
    category: 'ward_heal',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: 'Self / 1 Round',
    description: 'Pulls skeletal shards from earth or graves to form interlocking plates granting 10 Temp Ward STA.',
  },
  {
    spell_id: 'sp_eldritch_tendril',
    name: 'Void Tendril',
    tradition: 'Eldritch',
    category: 'strike',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: '60 ft / Single Target',
    description: 'Rips a tear in reality through which a writhing aberrant limb crushes the target for 2d10 psychic impact.',
  },
  {
    spell_id: 'sp_druidic_roots',
    name: 'Entangling Roots',
    tradition: 'Druidic',
    category: 'hex_summon',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: '60 ft Range / 10 ft Burst',
    description: 'Vines and brambles erupt from soil or stone, inflicting -10% Penalty and knocking victims Prone.',
  },
  {
    spell_id: 'sp_druidic_mend',
    name: 'Nature\'s Mend',
    tradition: 'Druidic',
    category: 'ward_heal',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: 'Touch / 1 Target',
    description: 'Channels floral vigor into flesh and bone, restoring 1d10 STA to an injured ally.',
  },
  {
    spell_id: 'sp_spiritual_smite',
    name: 'Radiant Smite',
    tradition: 'Spiritual',
    category: 'strike',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: '60 ft / Single Target',
    description: 'Invokes divine or ancestral light to scourge corruption dealing 2d10 radiant damage.',
  },
  {
    spell_id: 'sp_ki_iron_palm',
    name: 'Iron Palm Strike',
    tradition: 'Ki',
    category: 'strike',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: 'Melee / Close',
    description: 'Channels internal focus into a concussive shockwave dealing 2d10 kinetic damage with knockback.',
  },
  {
    spell_id: 'sp_ki_deflection',
    name: 'Deflecting Stance',
    tradition: 'Ki',
    category: 'ward_heal',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: 'Self / 1 Round',
    description: 'Flowing posture that parries kinetic forces, granting +10% Defense and -2 incoming damage DR.',
  },
  {
    spell_id: 'sp_warg_predator',
    name: 'Predator\'s Surge',
    tradition: 'Warg',
    category: 'ward_heal',
    default_tier: 1,
    cost: 2,
    fuel: 'sta',
    range_area: 'Self / 1 Round',
    description: 'Awakens the primal beast spirit within, granting 10 Temp Ward STA and +10% Melee accuracy.',
  },
  {
    spell_id: 'sp_witchcraft_evil_eye',
    name: 'Evil Eye Curse',
    tradition: 'Witchcraft',
    category: 'hex_summon',
    default_tier: 1,
    cost: 2,
    fuel: 'ess',
    range_area: '60 ft / Single Target',
    description: 'Fixes a malevolent gaze upon an enemy, imposing a -10% Penalty on all their checks for 1 Round.',
  },
];

const spellExamples = ref([...DEFAULT_SPELL_EXAMPLES]);

const newSpellForm = ref({
  name: '',
  tradition: 'Arcane',
  category: 'strike',
  default_tier: 1,
  range_area: '60 ft / Single Target',
  description: '',
});

async function fetchSpells() {
  try {
    const res = await fetch('/api/spells', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        spellExamples.value = data;
      }
    }
  } catch (err) {
    // Keep default examples on error or offline
  }
}

function openAddSpellModal() {
  newSpellForm.value = {
    name: '',
    tradition: selectedTraditionFilter.value !== 'all' ? selectedTraditionFilter.value : 'Arcane',
    category: 'strike',
    default_tier: 1,
    range_area: '60 ft / Single Target',
    description: '',
  };
  showAddSpellModal.value = true;
}

async function saveNewSpell() {
  if (!newSpellForm.value.name.trim()) return;
  savingSpell.value = true;
  try {
    const res = await fetch('/api/spells', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newSpellForm.value),
    });
    if (res.ok) {
      const created = await res.json();
      const existingIdx = spellExamples.value.findIndex(s => s.spell_id === created.spell_id);
      if (existingIdx === -1) {
        spellExamples.value.push(created);
      } else {
        spellExamples.value[existingIdx] = created;
      }
      showAddSpellModal.value = false;
      spellMessage.value = `Added "${created.name}" example for players!`;
      spellMessageType.value = 'success';
      setTimeout(() => { spellMessage.value = ''; }, 3000);
    } else {
      const errData = await res.json().catch(() => ({}));
      spellMessage.value = errData.error || 'Failed to add spell example.';
      spellMessageType.value = 'error';
    }
  } catch {
    spellMessage.value = 'Network error saving spell example.';
    spellMessageType.value = 'error';
  } finally {
    savingSpell.value = false;
  }
}

function onSpellChange(_spell) {
  // Local reactive update; GM can click Save or submit
}

async function saveSpell(spell) {
  if (!spell.spell_id) return;
  try {
    const res = await fetch(`/api/spells/${encodeURIComponent(spell.spell_id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(spell),
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = spellExamples.value.findIndex(s => s.spell_id === updated.spell_id);
      if (idx !== -1) spellExamples.value[idx] = updated;
      spellMessage.value = `Saved changes to "${updated.name}".`;
      spellMessageType.value = 'success';
      setTimeout(() => { spellMessage.value = ''; }, 2500);
    }
  } catch (err) {
    console.error('Failed to update spell:', err);
  }
}

async function deleteSpell(spell) {
  if (!spell.spell_id) return;
  const confirmed = typeof window !== 'undefined' && window.confirm
    ? window.confirm(`Are you sure you want to delete example "${spell.name}"?`)
    : true;
  if (!confirmed) return;
  try {
    const res = await fetch(`/api/spells/${encodeURIComponent(spell.spell_id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      spellExamples.value = spellExamples.value.filter(s => s.spell_id !== spell.spell_id);
      spellMessage.value = `Deleted "${spell.name}".`;
      spellMessageType.value = 'success';
      setTimeout(() => { spellMessage.value = ''; }, 2500);
    }
  } catch (err) {
    console.error('Failed to delete spell:', err);
  }
}

function getMagnitudeSummary(category, tier) {
  const t = Math.max(0, Math.min(6, parseInt(tier, 10) || 0));
  const entry = UNIVERSAL_MAGNITUDE_TABLE.find(m => m.tier === t) || UNIVERSAL_MAGNITUDE_TABLE[0];
  if (!entry) return '—';
  if (category === 'strike') return `${entry.strike.dice} (${entry.strike.summary})`;
  if (category === 'blast') return `${entry.blast_heal.dice} (${entry.blast_heal.summary})`;
  if (category === 'ward_heal') return `${entry.ward_buff.dice} (${entry.ward_buff.summary})`;
  if (category === 'hex_summon') return `${entry.hex_summon.dice} (${entry.hex_summon.summary})`;
  return '—';
}

function getFuelLabel(tradition) {
  const norm = String(tradition || '').toLowerCase();
  return (norm === 'blood' || norm === 'warg') ? 'STA' : 'ESS';
}

const filteredSpellExamples = computed(() => {
  return spellExamples.value.filter((spell) => {
    if (
      selectedTraditionFilter.value !== 'all' &&
      spell.tradition.toLowerCase() !== selectedTraditionFilter.value.toLowerCase()
    ) {
      return false;
    }
    if (!searchQuery.value.trim()) return true;
    const q = searchQuery.value.trim().toLowerCase();
    return (
      (spell.name && spell.name.toLowerCase().includes(q)) ||
      (spell.tradition && spell.tradition.toLowerCase().includes(q)) ||
      (spell.category && spell.category.toLowerCase().includes(q)) ||
      (spell.range_area && spell.range_area.toLowerCase().includes(q)) ||
      (spell.description && spell.description.toLowerCase().includes(q))
    );
  });
});

const filteredMagnitudeTable = computed(() => {
  if (!searchQuery.value.trim()) return UNIVERSAL_MAGNITUDE_TABLE;
  const q = searchQuery.value.trim().toLowerCase();
  return UNIVERSAL_MAGNITUDE_TABLE.filter((row) => {
    return (
      `tier ${row.tier}`.includes(q) ||
      `cost ${row.cost}`.includes(q) ||
      JSON.stringify(row).toLowerCase().includes(q)
    );
  });
});

if (getCurrentInstance()) {
  onMounted(() => {
    fetchSpells();
    if (socket && typeof socket.on === 'function') {
      socket.on('spells:updated', (updated) => {
        if (Array.isArray(updated)) {
          spellExamples.value = updated;
        }
      });
    }
  });

  onUnmounted(() => {
    if (socket && typeof socket.off === 'function') {
      socket.off('spells:updated');
    }
  });
}

// Empty state check per active category
const noResults = computed(() => {
  if (!searchQuery.value.trim()) return false;
  if (activeCategory.value === 'spells') {
    return filteredSpellExamples.value.length === 0 && filteredMagnitudeTable.value.length === 0;
  }
  if (activeCategory.value === 'attributes') {
    return (
      !filteredAttributesOverview.value &&
      filteredAttributesSummary.value.length === 0 &&
      filteredAttributePairs.value.length === 0 &&
      filteredResourcePools.value.length === 0
    );
  }
  if (activeCategory.value === 'psa') {
    return (
      !filteredPsaOverview.value &&
      filteredPsaXpTable.value.length === 0 &&
      filteredPsaCharacterTiers.value.length === 0 &&
      filteredPsaAreas.value.length === 0 &&
      filteredPsaSummary.value.length === 0
    );
  }
  if (activeCategory.value === 'ranged') {
    return (
      filteredRangedSequence.value.length === 0 &&
      filteredRangedWeapons.value.length === 0 &&
      filteredRangedModifiers.value.length === 0 &&
      filteredRangedArmor.value.length === 0
    );
  }
  if (activeCategory.value === 'melee') {
    return (
      filteredMeleeSequence.value.length === 0 &&
      !showMeleeFormula.value &&
      filteredMeleeUnarmed.value.length === 0 &&
      filteredMeleeWeapons.value.length === 0 &&
      filteredMeleeModifiers.value.length === 0
    );
  }
  if (activeCategory.value === 'overland' || activeCategory.value === 'additional') {
    return filteredAdditionalMounts.value.length === 0;
  }
  return false;
});
</script>

<style scoped>
.quick-reference-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
}

/* Toolbar */
.ref-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border: 2px solid var(--border);
  box-shadow: var(--theme-glow-subtle, 0 0 6px rgba(192, 192, 192, 0.25));
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background: var(--border);
  color: var(--text-primary);
}

.tab-button.active {
  background-color: #000000 !important;
  border-color: var(--theme-bright, #d0d0d0) !important;
  color: var(--theme-bright, #d0d0d0) !important;
  -webkit-text-fill-color: var(--theme-bright, #d0d0d0);
  font-weight: 600;
  box-shadow: var(--theme-glow-hover, 0 0 8px rgba(208, 208, 208, 0.3));
}

.tab-icon {
  font-size: 16px;
}

.search-box {
  position: relative;
  min-width: 260px;
  max-width: 380px;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  opacity: 0.6;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 32px;
  background-color: #000000 !important;
  border: 1px solid rgba(0, 128, 128, 0.6) !important;
  border-radius: var(--radius);
  color: #00ffff !important;
  font-size: 13px;
}

.search-input:focus {
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
  outline: none;
}

.clear-search-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.clear-search-btn:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

/* Content Area */
.ref-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.category-panel {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.ref-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--theme-header-color, var(--theme-bright, var(--text-primary)));
  text-shadow: var(--theme-header-glow, none);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.title-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  background: var(--theme-surface-active, rgba(88, 166, 255, 0.15));
  color: var(--theme-bright, var(--accent));
  border: 1px solid var(--theme-border-subtle, rgba(88, 166, 255, 0.3));
  box-shadow: var(--theme-glow-subtle);
  border-radius: 12px;
  letter-spacing: 0.5px;
}

.title-badge.danger {
  background: rgba(248, 81, 73, 0.15);
  color: var(--danger);
  border-color: rgba(248, 81, 73, 0.3);
}

.title-badge.warning {
  background: rgba(210, 153, 34, 0.15);
  color: #e3b341;
  border-color: rgba(210, 153, 34, 0.3);
}

.title-badge.info {
  background: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
  border-color: rgba(88, 166, 255, 0.3);
}

.title-badge.success {
  background: rgba(63, 185, 80, 0.15);
  color: var(--success);
  border-color: rgba(63, 185, 80, 0.3);
}

/* Sequence Grid & Cards */
.sequence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.step-card {
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  box-shadow: var(--theme-glow-subtle, 0 0 6px rgba(192, 192, 192, 0.25));
  border-radius: var(--radius);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.step-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-num {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  background: var(--bg-tertiary);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
}

.step-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.step-desc {
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-secondary);
  margin: 0;
}

/* Formula Callout Banner */
.formula-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(88, 166, 255, 0.08);
  border: 1px solid rgba(88, 166, 255, 0.3);
  border-radius: var(--radius);
}

.formula-icon {
  font-size: 28px;
}

.formula-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.formula-subtitle {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent);
}

.formula-code {
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Tables */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-secondary);
}

.ref-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

.ref-table th {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.ref-table td {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(48, 54, 61, 0.6);
  color: var(--text-primary);
  vertical-align: middle;
}

.ref-table tbody tr:last-child td {
  border-bottom: none;
}

.ref-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.025);
}

.col-name {
  color: #cecece;
  white-space: nowrap;
}

.col-highlight {
  color: var(--accent);
  font-weight: 600;
}

.col-notes {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.col-effect {
  color: var(--text-primary);
  line-height: 1.4;
}

.type-tag {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.roll-cell {
  background: var(--bg-tertiary);
  color: var(--accent);
}

/* Weapon Restrictions & Legend */
.col-restrictions {
  white-space: nowrap;
}

.restriction-pill {
  display: inline-block;
  padding: 2px 7px;
  margin-right: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  border-radius: 4px;
  letter-spacing: 0.5px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  transition: transform 0.15s ease;
}

.restriction-pill.ff {
  background: rgba(210, 153, 34, 0.15);
  color: #e3b341;
  border-color: rgba(210, 153, 34, 0.4);
}

.restriction-pill.t {
  background: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
  border-color: rgba(88, 166, 255, 0.4);
}

.restriction-pill.mpo {
  background: rgba(187, 128, 179, 0.15);
  color: #bc8cff;
  border-color: rgba(187, 128, 179, 0.4);
}

.restriction-pill.rd {
  background: rgba(56, 139, 253, 0.15);
  color: #79c0ff;
  border-color: rgba(56, 139, 253, 0.4);
}

.restriction-pill.ltd {
  background: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
  border-color: rgba(248, 81, 73, 0.4);
}

.restrictions-legend-box {
  margin-top: 16px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.legend-title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.legend-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.legend-desc {
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-secondary);
  margin: 0;
}

/* Modifier Pills */
.modifier-pill {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.modifier-pill.positive {
  background: rgba(63, 185, 80, 0.15);
  color: var(--success);
  border: 1px solid rgba(63, 185, 80, 0.4);
}

.modifier-pill.negative {
  background: rgba(248, 81, 73, 0.15);
  color: var(--danger);
  border: 1px solid rgba(248, 81, 73, 0.4);
}

.modifier-pill.neutral {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

/* Utilities */
.font-bold {
  font-weight: 600;
}

.font-medium {
  font-weight: 500;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.text-center {
  text-align: center;
}

.text-muted {
  color: var(--text-secondary);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  gap: 12px;
}

.empty-icon {
  font-size: 40px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.empty-state p {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 0;
}

.clear-filter-btn {
  margin-top: 8px;
  padding: 6px 14px;
  font-size: 12px;
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.clear-filter-btn:hover {
  background-color: #082020 !important;
  border-color: #00dada !important;
  color: #00dada !important;
  -webkit-text-fill-color: #00dada;
  box-shadow: 0 0 8px rgba(0, 218, 218, 0.4);
}

/* Attribute Cards & Details */
.formula-desc {
  font-size: 13px;
  line-height: 1.4;
  margin: 4px 0 0;
  color: var(--text-secondary);
}

.pair-meta-desc {
  font-size: 13px;
  margin-top: -4px;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.stat-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.stat-detail-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.stat-detail-card:hover {
  border-color: var(--theme-bright, #d0d0d0);
  box-shadow: var(--theme-glow-subtle, 0 0 8px rgba(208, 208, 208, 0.2));
}

.stat-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-badge {
  font-size: 13px;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--theme-surface-active, rgba(88, 166, 255, 0.15));
  border: 1px solid var(--theme-border-subtle, rgba(88, 166, 255, 0.35));
  color: var(--theme-bright, #cecece);
  box-shadow: var(--theme-glow-subtle);
  letter-spacing: 0.5px;
}

.stat-card-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-card-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.stat-card-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

.stat-card-desc {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 0;
}

.stat-card-governs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 14px;
}

.governs-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent);
}

.governs-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.governs-list li {
  margin-bottom: 3px;
}

.stat-card-skills {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.skills-label {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.skills-text {
  color: var(--theme-bright, #cecece);
  font-weight: 500;
}

.attr-pill {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--theme-bright, #cecece);
  font-weight: 700;
}

.text-emerald {
  color: #34d399 !important;
}

.text-rose {
  color: #f87171 !important;
}

.psa-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border: 1px solid var(--theme-border-subtle, rgba(200, 200, 200, 0.3));
}

.psa-badge.martial {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.psa-badge.mystic {
  background: rgba(14, 165, 233, 0.15);
  border-color: rgba(14, 165, 233, 0.4);
  color: #7dd3fc;
}

.psa-badge.theurgy {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
  color: #86efac;
}

.skill-category-tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.skill-category-tag.tradition-tag {
  background: rgba(168, 85, 247, 0.15);
  border-color: rgba(168, 85, 247, 0.4);
  color: #d8b4fe;
}

.fuel-pill {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.fuel-pill.ess {
  background: rgba(56, 189, 248, 0.15);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.35);
}

.fuel-pill.sta {
  background: rgba(248, 113, 113, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(248, 113, 113, 0.35);
}

.fuel-pill.none {
  color: var(--text-secondary);
}

.psa-subgroup {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.psa-sub-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--theme-bright, #cecece);
  margin: 0;
  letter-spacing: 0.3px;
}

.rules-note-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: var(--radius);
}

.rules-note-banner .note-icon {
  font-size: 20px;
  line-height: 1;
}

.rules-note-banner .note-text {
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-primary);
}

.rules-note-banner .note-text strong {
  color: #38bdf8;
}

/* ================= SPELLS & MARTIAL TECHNIQUES ================= */
.magnitude-table td {
  vertical-align: top;
  font-size: 13px;
  line-height: 1.4;
}

.dice-highlight {
  display: block;
  color: var(--theme-bright, #45acba);
  font-family: var(--font-family-mono, monospace);
  font-size: 13px;
}

.mag-summary {
  display: block;
  font-size: 11.5px;
  color: var(--text-secondary);
}

.traditions-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.tradition-filter-pill {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 16px;
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tradition-filter-pill:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #cecece;
  border-color: rgba(255, 255, 255, 0.2);
}

.tradition-filter-pill.active {
  background: var(--theme-surface-active, rgba(69, 172, 186, 0.18));
  border-color: var(--theme-bright, #45acba);
  color: var(--theme-bright, #45acba);
  font-weight: 600;
  box-shadow: var(--theme-glow-subtle);
}

.section-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.section-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0 0;
}

.btn-add-example {
  background: #000000;
  color: #cecece;
  border: 2px solid var(--border);
  box-shadow: var(--theme-glow-subtle, 0 0 6px rgba(192, 192, 192, 0.25));
  border-radius: var(--radius);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-add-example:hover {
  border-color: var(--theme-bright, #45acba);
  color: #ffffff;
}

.guide-grimoire-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.guide-grimoire-row {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: none;
  transition: border-color 0.15s, background-color 0.15s;
}

.guide-grimoire-row:hover {
  border-color: rgba(255, 255, 255, 0.18);
}

.guide-row-top,
.guide-row-bot {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Grimoire form fields blend seamlessly with the card background, matching character sheet input-name style */
.guide-grimoire-row input,
.guide-grimoire-row select {
  background: transparent !important;
  background-color: transparent !important;
  border: 1px solid transparent !important;
  border-color: transparent !important;
  color: #cecece !important;
  border-radius: 4px;
  box-shadow: none !important;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.guide-grimoire-row input:hover,
.guide-grimoire-row select:hover {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  border-color: rgba(255, 255, 255, 0.18) !important;
}

.guide-grimoire-row input:focus,
.guide-grimoire-row select:focus {
  outline: none;
  background: rgba(0, 0, 0, 0.35) !important;
  border: 1px solid var(--theme-bright, #45acba) !important;
  border-color: var(--theme-bright, #45acba) !important;
  box-shadow: 0 0 6px var(--theme-glow, rgba(69, 172, 186, 0.4)) !important;
}

.guide-grimoire-row select option {
  background: #14171c;
  color: #cecece;
}

.guide-grimoire-row .spell-name-input {
  flex: 1 1 160px;
  min-width: 140px;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 4px 8px;
  height: 28px;
  box-sizing: border-box;
}

.guide-grimoire-row .spell-tradition-select,
.guide-grimoire-row .spell-category-select {
  flex: 0 1 125px;
  min-width: 95px;
  padding: 3px 20px 3px 6px !important;
  font-size: 0.8rem;
  height: 28px;
  box-sizing: border-box;
  background-position: right 6px center !important;
}

.guide-grimoire-row .spell-dial-group {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: #8b949e;
  white-space: nowrap;
}

.guide-grimoire-row .spell-tier-label {
  font-size: 0.78rem;
  color: #8b949e;
  font-weight: 600;
}

.guide-grimoire-row .spell-tier-input {
  width: 42px;
  padding: 2px 4px;
  font-size: 0.82rem;
  height: 28px;
  box-sizing: border-box;
  text-align: center;
}

.guide-grimoire-row .spell-cost-badge {
  background: var(--theme-surface-active, rgba(69, 172, 186, 0.12));
  border: 1px solid var(--theme-border-subtle, rgba(69, 172, 186, 0.35));
  color: var(--theme-bright, #45acba);
  box-shadow: var(--theme-glow-subtle);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  height: 28px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.guide-grimoire-row .spell-magnitude-badge {
  background: var(--theme-surface-active, rgba(69, 172, 186, 0.12));
  border: 1px solid var(--theme-border-subtle, rgba(69, 172, 186, 0.35));
  color: var(--theme-bright, #45acba);
  box-shadow: var(--theme-glow-subtle);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.76rem;
  font-weight: 600;
  height: 26px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  flex-shrink: 0;
}

.guide-grimoire-row .spell-range-input {
  flex: 0 1 150px;
  min-width: 110px;
  padding: 3px 8px;
  font-size: 0.8rem;
  height: 26px;
  box-sizing: border-box;
}

.guide-grimoire-row .spell-desc-input {
  flex: 1 1 200px;
  min-width: 150px;
  padding: 3px 8px;
  font-size: 0.8rem;
  height: 26px;
  box-sizing: border-box;
  color: #a0aec0 !important;
}

.gm-item-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.btn-save-spell {
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  height: 26px;
  transition: all 0.15s ease;
}

.btn-save-spell:hover {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #ffffff;
}

.btn-remove-spell {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 2px 6px;
  cursor: pointer;
  line-height: 1;
  transition: color 0.15s ease;
}

.btn-remove-spell:hover {
  color: #f85149;
}

/* Alert notifications */
.alert {
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  margin-bottom: 12px;
}

.alert-success {
  background: rgba(63, 185, 80, 0.15);
  border: 1px solid rgba(63, 185, 80, 0.4);
  color: var(--success, #3fb950);
}

.alert-error {
  background: rgba(248, 81, 73, 0.15);
  border: 1px solid rgba(248, 81, 73, 0.4);
  color: var(--danger, #f85149);
}

/* Floating popup modal applet for GM example adding */
.modal-backdrop,
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.admin-eq-modal {
  max-width: 520px;
  width: 90%;
  background: var(--bg-secondary, #161b22);
  border: 2px solid var(--border);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.75), var(--theme-glow, 0 0 16px rgba(192, 192, 192, 0.4));
  border-radius: 8px;
  padding: 20px;
  position: relative;
  z-index: 1001;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}

.modal-header h3 {
  margin: 0;
  font-size: 17px;
  color: #cecece;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
}

.modal-close-btn:hover {
  color: #cecece;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-group input,
.form-group select,
.form-group textarea {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--theme-bright, #45acba);
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius);
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cecece;
}

.btn-primary {
  background: #000000;
  border: 2px solid var(--border);
  box-shadow: var(--theme-glow-subtle, 0 0 6px rgba(192, 192, 192, 0.25));
  color: #cecece;
  border-radius: var(--radius);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  border-color: var(--theme-bright, #45acba);
  color: #ffffff;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
