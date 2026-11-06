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
            Complete Skills &amp; Traditions Reference (21 Total)
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
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  RANGED_COMBAT_REF,
  MELEE_COMBAT_REF,
  ADDITIONAL_RULES_REF,
  ATTRIBUTES_RULES_REF,
  PSA_RULES_REF,
} from '../constants/combatReference.js';
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

// Empty state check per active category
const noResults = computed(() => {
  if (!searchQuery.value.trim()) return false;
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
</style>
