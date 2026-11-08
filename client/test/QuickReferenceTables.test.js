/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia, setActivePinia } from 'pinia';
import QuickReferenceTables from '../src/components/QuickReferenceTables.vue';
import { useAuthStore } from '../src/stores/auth.js';

describe('QuickReferenceTables.vue', () => {
  async function renderComponent(props = {}, userRole = 'Player') {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore();
    auth.user = { id: 1, username: 'testuser', role: userRole };

    const app = createSSRApp(QuickReferenceTables, props);
    app.use(pinia);
    const html = await renderToString(app);
    return html;
  }

  it('renders all three category tabs and search input', async () => {
    const html = await renderComponent();
    expect(html).toContain('Ranged Weapon Combat');
    expect(html).toContain('Melee Combat');
    expect(html).toContain('Overland');
    expect(html).toContain('Spells/Martial Techniques');
    expect(html).toMatch(/Filter rules &(amp;)?\s*tables\.\.\./);
  });

  describe('Ranged Combat Tab', () => {
    it('renders turn sequence, fantasy ranged weapons, modifiers, and armor/shields', async () => {
      const html = await renderComponent({ initialCategory: 'ranged' });

      // Turn sequence
      expect(html).toContain('Turn Sequence');
      expect(html).toContain('Initiative');

      // Ranged weapons
      expect(html).toContain('Ranged Weapons');
      expect(html).toContain('Shortbow');
      expect(html).toContain('Longbow');
      expect(html).toContain('Heavy Crossbow');
      expect(html).toContain('RoF');

      // Modifiers
      expect(html).toContain('To-Hit Modifiers');
      expect(html).toContain('Point Blank range');
      expect(html).toContain('+10%');
      expect(html).toContain('Careful Aim');

      // Armor, Shields & Wards
      expect(html).toMatch(/Armor, Shields &(amp;)? Wards/);
      expect(html).toContain('Light Armor');
      expect(html).toContain('Full Plate');
    });
  });

  describe('Melee Combat Tab', () => {
    it('renders turn sequence, base hit formula banner, unarmed combat, weapons, and modifiers', async () => {
      const html = await renderComponent({ initialCategory: 'melee' });

      // Turn sequence
      expect(html).toContain('Turn Sequence');
      expect(html).toContain('Tactical Flow');
      expect(html).toContain('First Spotlight: Any 2 Actions');
      expect(html).toContain('Second Spotlight: Any 2 Actions');

      // Formula callout
      expect(html).toContain('1/2 STR');
      expect(html).toContain('Melee Weapons Skill Rank');

      // Unarmed combat table
      expect(html).toContain('Unarmed Combat');
      expect(html).toContain('40 - 49 (Baseline)');
      expect(html).toContain('80+');
      expect(html).toContain('Punch Damage');
      expect(html).toContain('Kick Damage');

      // Melee weapons
      expect(html).toContain('Melee Weapons');
      expect(html).toContain('Broadsword / Longsword');
      expect(html).toContain('Greatsword / Greataxe / Maul');
      expect(html).toContain('Special Properties');

      // Melee modifiers
      expect(html).toContain('Melee Modifiers');
      expect(html).toContain('Charging Attack');
      expect(html).toContain('Flanking / Rear Attack');
    });
  });

  describe('Overland Tab', () => {
    it('renders horse movement rules and mounts table', async () => {
      const html = await renderComponent({ initialCategory: 'overland' });

      expect(html).toContain('Mounts &amp; Overland Movement');
      expect(html).toContain('Horse Movement (Riding Horse)');
      expect(html).toContain('50 ft / Action (Dash: 100 ft)');
      expect(html).toContain('4 mph (24–32 miles / day); Gallop: 8 mph');
      expect(html).toContain('1 Rider + 250 lbs cargo');
      expect(html).toContain('Rider shares mount movement');
    });
  });

  describe('Primary Attributes Tab', () => {
    it('renders attribute pairs, overview baseline formula, summary table, and resource pools', async () => {
      const html = await renderComponent({ initialCategory: 'attributes' });

      // Overview banner
      expect(html).toContain('Universal d100 Attribute Baseline &amp; Pair Shifting');
      expect(html).toContain('Baseline: 50');
      expect(html).toContain('Target % = ceil(Base Stat / 2) + (Skill Level x 10) + Lineage &amp; Gear Modifiers');

      // Summary table
      expect(html).toContain('Attributes Quick Reference');
      expect(html).toContain('STR');
      expect(html).toContain('STA');
      expect(html).toContain('DEX');
      expect(html).toContain('RS');
      expect(html).toContain('INT');
      expect(html).toContain('HIST/REL');
      expect(html).toContain('WIL');
      expect(html).toContain('PRE');

      // Pairs and cards
      expect(html).toContain('Strength / Stamina (STR / STA)');
      expect(html).toContain('Agility / Reflex Speed (DEX / RS)');
      expect(html).toContain('Intellect / History &amp; Religion (INT / HIST/REL)');
      expect(html).toContain('Willpower / Presence (WIL / PRE)');

      // Resource pools
      expect(html).toContain('Primary Resource Pools');
      expect(html).toContain('Stamina (STA)');
      expect(html).toContain('Essence (ESS)');
    });

    it('filters attributes tab based on search query', async () => {
      const html = await renderComponent({
        initialCategory: 'attributes',
        initialSearch: 'Willpower',
      });

      expect(html).toContain('Willpower');
      expect(html).not.toContain('Agility / Reflex Speed (DEX / RS)');
    });
  });

  describe('Primary System Areas (PSA) Tab', () => {
    it('renders PSA overview banner, XP point-buy table, character tier benchmarks, and areas', async () => {
      const html = await renderComponent({ initialCategory: 'psa' });

      // Overview banner
      expect(html).toContain('Primary System Area (PSA) Doctrine &amp; Universal XP Costs');
      expect(html).toContain('In-PSA: Next Level × 3 XP | Out-of-PSA: Next Level × 6 XP (2× Multiplier)');

      // XP Progression Table
      expect(html).toContain('Universal PSA-Scaled XP Point-Buy Table');
      expect(html).toContain('Level 1');
      expect(html).toContain('Level 6');
      expect(html).toContain('3 XP');
      expect(html).toContain('6 XP');
      expect(html).toContain('18 XP');
      expect(html).toContain('36 XP');

      // Character Tier Benchmarks
      expect(html).toContain('Character Tier Calculation Benchmarks');
      expect(html).toContain('Tier 1');
      expect(html).toContain('Tier 5');
      expect(html).toContain('Legendary Paragon');

      // Areas and Skills
      expect(html).toContain('Martial');
      expect(html).toContain('Melee Weapons');
      expect(html).toContain('Defense &amp; Shield');
      expect(html).toContain('Shadow');
      expect(html).toContain('Ki');

      expect(html).toContain('Mystic');
      expect(html).toContain('Lore &amp; Arcana');
      expect(html).toContain('Tradecraft');
      expect(html).toContain('Arcane');
      expect(html).toContain('Necromancy');
      expect(html).toContain('Eldritch');

      expect(html).toContain('Theurgy');
      expect(html).toContain('Wilderness &amp; Survival');
      expect(html).toContain('Influence &amp; Deception');
      expect(html).toContain('Herbalism &amp; Medicine');
      expect(html).toContain('Blood');
      expect(html).toContain('Druidic');

      // Summary Table
      expect(html).toContain('Complete Skills &amp; Traditions Reference (22 Total)');
      expect(html).toContain('Multi-Magic Fuel Rule:');
      expect(html).toContain('highest governing attribute to fuel their');
    });

    it('filters PSA tab based on search query', async () => {
      const html = await renderComponent({
        initialCategory: 'psa',
        initialSearch: 'Necromancy',
      });

      expect(html).toContain('Necromancy');
      expect(html).not.toContain('Defense &amp; Shield');
    });
  });

  describe('Spells/Martial Techniques Tab', () => {
    it('renders Universal Magnitude Table, traditions, and pre-scribed examples', async () => {
      const html = await renderComponent({ initialCategory: 'spells' }, 'Player');

      // Universal Magnitude Table
      expect(html).toContain('Universal Magnitude Table');
      expect(html).toContain('Universal Casting Cost:');
      expect(html).toContain('Strike (Single Target)');
      expect(html).toContain('Blast / Cleave (Area)');
      expect(html).toContain('Ward / Heal (Defense &amp; Recovery)');
      expect(html).toContain('Hex / Control (Debuff &amp; Summon)');

      // Traditions pills
      expect(html).toContain('The 11 Magic &amp; Ki Traditions');
      expect(html).toContain('All Traditions');
      expect(html).toContain('Arcane');
      expect(html).toContain('Blood');
      expect(html).toContain('Ki');

      // Examples
      expect(html).toContain('Arcane Missile');
      expect(html).toContain('Crimson Lance');
      expect(html).toContain('Iron Palm Strike');

      // For players, + Add Example button is NOT visible
      expect(html).not.toContain('+ Add Example');
    });

    it('renders + Add Example button and editing controls for GameMaster only', async () => {
      const gmHtml = await renderComponent({ initialCategory: 'spells' }, 'GameMaster');
      expect(gmHtml).toContain('+ Add Example');
      expect(gmHtml).toContain('💾 Save');
      expect(gmHtml).toContain('btn-remove-spell');

      const playerHtml = await renderComponent({ initialCategory: 'spells' }, 'Player');
      expect(playerHtml).not.toContain('+ Add Example');
      expect(playerHtml).not.toContain('💾 Save');
    });

    it('filters spell examples by search query', async () => {
      const html = await renderComponent({
        initialCategory: 'spells',
        initialSearch: 'Crimson Lance',
      });

      expect(html).toContain('Crimson Lance');
      expect(html).not.toContain('Arcane Missile');
    });
  });

  describe('Archetypes Tab', () => {
    it('renders the Archetypes tab button with icon and label', async () => {
      const html = await renderComponent();
      expect(html).toContain('Archetypes');
      expect(html).toContain('🏛️');
    });

    it('renders the Altered Species Origin Rule alert banner with notes instructions', async () => {
      const html = await renderComponent({ initialCategory: 'archetypes' });
      expect(html).toContain('Altered Species Origin Rule');
      expect(html).toMatch(/record their character(&#39;|')s original baseline species in their.*Character Sheet Notes/);
      expect(html).toContain('Origin: Dawn Elf');
      expect(html).toContain('Origin: Frost Urkai');
      expect(html).toContain('Origin: Weirgoth Dwarf');
    });

    it('renders all 22 requested archetypes with 3 starting skills (2 In-PSA and 1 Out-of-PSA in order)', async () => {
      const html = await renderComponent({ initialCategory: 'archetypes' });

      const archetypes = [
        'Wizard', 'Sorcerer', 'Priest', 'Shaman', 'Witch', 'Druid',
        'Ranger', 'Warrior', 'Paladin', 'Knight', 'Barbarian', 'Rogue',
        'Assassin', 'Necromancer', 'Runeward', 'Sword Mage', 'Scout',
        'Huntsman', 'Martial Artist', 'Demon Hunter', 'Blood Hunter'
      ];

      for (const name of archetypes) {
        expect(html).toContain(name);
      }

      // Check specific skill loadouts and In-PSA / Out-of-PSA cost badges
      expect(html).toContain('In-PSA (3 XP)');
      expect(html).toContain('Out-of-PSA (6 XP)');

      // Wizard: Arcane, Lore & Arcana, Defense & Shield
      expect(html).toContain('Arcane');
      expect(html).toContain('Lore &amp; Arcana');
      expect(html).toContain('Defense &amp; Shield');

      // Assassin: Stealth & Secrecy, Shadow, Herbalism & Medicine
      expect(html).toContain('Stealth &amp; Secrecy');
      expect(html).toContain('Shadow');
      expect(html).toContain('Herbalism &amp; Medicine');
    });

    it('renders Altered Species Archetype examples for Spirit, Undeath, and Lycan', async () => {
      const html = await renderComponent({ initialCategory: 'archetypes' });

      // Spirit: Warlock, Aasimar / Celestial, Demonic
      expect(html).toContain('Warlock');
      expect(html).toContain('Aasimar / Celestial');
      expect(html).toContain('Demonic');

      // Undeath: Dhampir, Revenant
      expect(html).toContain('Dhampir');
      expect(html).toContain('Revenant');

      // Lycan: Wolf, Tiger
      expect(html).toContain('Wolf');
      expect(html).toContain('Tiger');
    });

    it('renders Playable Lineages & Species blurbs with traits and setting lore', async () => {
      const html = await renderComponent({ initialCategory: 'archetypes' });

      // Lineage Groups
      expect(html).toContain('The Norn (Elven, Dwarven &amp; Wendhya Lineages)');
      expect(html).toContain('The Urkai &amp; Goblinoid Clans');
      expect(html).toContain('The Giants &amp; Primordial Kin');
      expect(html).toContain('Hybrid &amp; Spirit-Infected Lineages');
      expect(html).toContain('Altered Species');

      // Specific species blurbs
      expect(html).toContain('Dawn Elf');
      expect(html).toContain('Dusk Elf');
      expect(html).toContain('Sylvan Elf');
      expect(html).toContain('Weirgoth Dwarf');
      expect(html).toContain('Vanir Dwarf');
      expect(html).toContain('Frost Urkai');
      expect(html).toContain('Giantken / Goliath');
      expect(html).toContain('Spirits');
      expect(html).toContain('Undeath');
      expect(html).toContain('Lycan');
    });

    it('filters archetypes when search query is entered', async () => {
      const html = await renderComponent({
        initialCategory: 'archetypes',
        initialSearch: 'Necromancer',
      });

      expect(html).toContain('Necromancer');
      expect(html).not.toContain('Martial Artist');
    });

    it('contains no occurrences of the word human in rendered Archetypes tab', async () => {
      const html = await renderComponent({ initialCategory: 'archetypes' });
      expect(html.toLowerCase()).not.toMatch(/\bhumans?\b/);
      expect(html.toLowerCase()).not.toMatch(/\bhumanoid\b/);
    });
  });

  describe('Search Filter', () => {
    it('filters tables based on search query', async () => {
      const html = await renderComponent({
        initialCategory: 'ranged',
        initialSearch: 'Crossbow'
      });

      expect(html).toContain('Crossbow');
      expect(html).not.toContain('Shortbow');
    });

    it('shows no-results state when search yields no matches', async () => {
      const html = await renderComponent({
        initialCategory: 'ranged',
        initialSearch: 'NonExistentTermXYZ'
      });

      expect(html).toContain('No matching rules or tables found');
    });
  });
});
