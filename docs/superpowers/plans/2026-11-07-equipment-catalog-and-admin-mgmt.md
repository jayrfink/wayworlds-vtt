# Equipment Catalog Categories & Admin Equipment Management Implementation Plan

Consolidate Available Equipment catalog categories into All, Weapon, Armor (including shields), and Gear. Reorganize Admin panel top row into a 50/50 split between "User Mgmt" (combining Create User and Existing Users) and "Equipment Management" with 3 dedicated pop-up forms for adding Weapons, Armor, and Gear.

## User Review Required

> [!IMPORTANT]
> - `CharacterSheetsView.vue` equipment categories are consolidated to `['All', 'Weapon', 'Armor', 'Gear']`.
> - Server adds `POST /api/equipment` and `DELETE /api/equipment/:name` endpoints requiring `GameMaster` role.
> - `AdminView.vue` combines Create User and Existing Users into a unified "User Mgmt" card (50% row width) and adds an "Equipment Management" card (50% row width) with three creation modals.

## Proposed Changes

### Server API & Equipment Persistence

#### [server/src/index.js](file:///Users/jrf/wayworlds-vtt/server/src/index.js)
- Extend `/api/equipment` routes:
  - `GET /api/equipment`: reads and returns `data/inventory_items.json`.
  - `POST /api/equipment`: requires auth + GM role (`requireAuth`, `requireGM`). Validates name, category, weight_lbs, and properties; appends item to `data/inventory_items.json`; emits `equipment:updated` on `io`; returns HTTP 201 with created item.
  - `DELETE /api/equipment/:name`: requires auth + GM role (`requireAuth`, `requireGM`). Removes item with matching name from `data/inventory_items.json`; emits `equipment:updated` on `io`; returns HTTP 200 with `{ success: true, deleted: name }`.

#### [server/test/equipment.test.js](file:///Users/jrf/wayworlds-vtt/server/test/equipment.test.js)
- Add tests for `POST /api/equipment` and `DELETE /api/equipment/:name`:
  - Test GM authorization required (blocks unauthenticated and player users with 401/403).
  - Test successful creation of Weapon, Armor, and Gear items.
  - Test successful deletion of an item.

---

### Character Sheets View: Equipment Catalog Modal

#### [client/src/views/CharacterSheetsView.vue](file:///Users/jrf/wayworlds-vtt/client/src/views/CharacterSheetsView.vue)
- Update `equipmentCategories`:
  - Change to `['All', 'Weapon', 'Armor', 'Gear']`.
- Update `getCategoryCount(cat)`:
  - `All`: total items count.
  - `Weapon`: items with `item.category === 'Weapon'`.
  - `Armor`: items with `item.category === 'Armor' || item.category === 'Shield'`.
  - `Gear`: items with `item.category !== 'Weapon' && item.category !== 'Armor' && item.category !== 'Shield'`.
- Update `filteredEquipmentList`:
  - When `activeEquipmentCategory === 'Armor'`: matches `item.category === 'Armor' || item.category === 'Shield'`.
  - When `activeEquipmentCategory === 'Gear'`: matches `item.category !== 'Weapon' && item.category !== 'Armor' && item.category !== 'Shield'`.
- Listen for `equipment:updated` socket event in `mounted()` and call `this.fetchEquipment()`.

#### [client/test/CharacterSheetsView.test.js](file:///Users/jrf/wayworlds-vtt/client/test/CharacterSheetsView.test.js)
- Update/add tests asserting:
  - `equipmentCategories` contains only `All`, `Weapon`, `Armor`, `Gear`.
  - `filteredEquipmentList` includes Armor and Shields under `Armor` tab.
  - `filteredEquipmentList` includes Kits and miscellaneous items under `Gear` tab.

---

### Admin View: 50/50 Layout & Equipment Management

#### [client/src/views/AdminView.vue](file:///Users/jrf/wayworlds-vtt/client/src/views/AdminView.vue)
- Add top row layout container:
  ```html
  <div class="admin-top-row">
    <!-- 50% Left Card: User Mgmt -->
    <section class="admin-card user-mgmt-card">
      <div class="card-header-row">
        <h3>User Mgmt</h3>
        ...
      </div>
      <!-- Inline Create User form -->
      ...
      <!-- Existing Users Table -->
      ...
    </section>

    <!-- 50% Right Card: Equipment Management -->
    <section class="admin-card equipment-mgmt-card">
      <div class="card-header-row">
        <h3>Equipment Management</h3>
        <div class="header-actions">
          <button class="btn-secondary" @click="openAddWeaponModal">+ Add Weapon</button>
          <button class="btn-secondary" @click="openAddArmorModal">+ Add Armor</button>
          <button class="btn-secondary" @click="openAddGearModal">+ Add Gear</button>
        </div>
      </div>
      <!-- Category filter tabs (All, Weapon, Armor, Gear) & search input -->
      <!-- Equipment catalog table with Delete button -->
    </section>
  </div>
  ```
- Add three modal dialogs:
  - Add Weapon Modal (Name, Weight, Damage Dice, Properties, Cost).
  - Add Armor / Shield Modal (Name, Type, Weight, Armor DR, Attacker Penalty %, Properties, Cost).
  - Add Gear Modal (Name, Weight, Properties/Description, Cost).
- Implement methods:
  - `fetchEquipment()`, `deleteEquipment(item)`, `saveWeapon()`, `saveArmor()`, `saveGear()`.
- Add responsive grid styles for `.admin-top-row` (`display: grid; grid-template-columns: 1fr 1fr; gap: 20px;`).

#### [client/test/AdminView.test.js](file:///Users/jrf/wayworlds-vtt/client/test/AdminView.test.js)
- Add tests verifying:
  - "User Mgmt" card exists and contains both create user form and existing users table.
  - "Equipment Management" card exists with buttons `+ Add Weapon`, `+ Add Armor`, `+ Add Gear`.
  - Pop-up modals open and submit to `/api/equipment`.
  - Equipment deletion calls `DELETE /api/equipment/:name`.

---

## Verification Plan

### Automated Tests
1. `npm --prefix server test -- test/equipment.test.js`
2. `npm --prefix client test -- test/CharacterSheetsView.test.js`
3. `npm --prefix client test -- test/AdminView.test.js`
4. `npm --prefix client test` (all 55 client test files, 663+ tests)
5. `npm --prefix server test` (all server test files)
6. `npm --prefix client run build`

### Manual Verification
- In the browser at `http://localhost:3001/dashboard/character-sheets`, click `+ Add Equipment`:
  - Verify tabs are `All`, `Weapon`, `Armor`, `Gear`.
  - Verify `Armor` tab displays armors and shields.
  - Verify `Gear` tab displays kits and other non-weapon/non-armor items.
- In `http://localhost:3001/dashboard/admin` (as GM):
  - Verify 50/50 split between "User Mgmt" and "Equipment Management".
  - Test adding a new weapon, armor, and gear item via the modals.
  - Verify new items appear in the character sheet equipment popup immediately.
