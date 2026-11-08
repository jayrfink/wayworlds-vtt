# Design: Available Equipment Catalog & Admin Equipment Management

**Date**: 2026-11-07  
**Branch**: `main`  
**Status**: Approved by User  

## 1. Problem Statement
1. In the Character Sheets view, the Available Equipment catalog popup has outdated tabs (`Power`, `Ammunition`, `Medical`, `Toolkit`, and `Defense`), and the `Defense` tab is currently empty because fantasy equipment uses categories `Armor` and `Shield`.
2. On the Admin panel (`AdminView.vue`), "Create User" and "Existing Users" are currently two separate stacked full-width cards. The GM also lacks an interface to manage and add new equipment, weapons, and armor to the catalog.

## 2. Requirements & Architecture

### 2.1 Available Equipment Catalog Popup (`CharacterSheetsView.vue`)
- Category Tabs reduced to: `['All', 'Weapon', 'Armor', 'Gear']`.
- Remove tabs: `Power`, `Ammunition`, `Medical`, `Toolkit`.
- Rename `Defense` tab to `Armor`.
- Under the `Armor` tab:
  - Display items where `category === 'Armor'` or `category === 'Shield'` (e.g. padded, leather, hide, chainmail, full plate, mythril armor, shield).
- Under the `Gear` tab:
  - Display all items that are not weapons and not armor/shields (`category !== 'Weapon' && category !== 'Armor' && category !== 'Shield'`), such as Kits, adventuring supplies, and custom gear.
- Update `getCategoryCount(cat)` and `filteredEquipmentList` to reflect these category mappings.

### 2.2 Admin Panel 50/50 Top Row Layout (`AdminView.vue`)
- Replace the stacked user cards with a 2-column container (`.admin-grid-row-50-50`):
  - **Left (50%) — `User Mgmt` Card**:
    - Title: "User Mgmt"
    - Inline compact Create User section (Username, Password, Role, + Create User button).
    - Existing Users table with ID, Username, Role, Reset Password, and Delete actions.
  - **Right (50%) — `Equipment Management` Card**:
    - Header with action buttons: `+ Add Weapon`, `+ Add Armor`, `+ Add Gear`.
    - Category filter tabs (`All`, `Weapon`, `Armor`, `Gear`) with dynamic count badges and search input.
    - Equipment table listing items (Name, Category, Weight, Properties/Capabilities, Delete action).

### 2.3 Equipment Creation Modals (`AdminView.vue`)
Three dedicated modal dialogs for adding catalog items:
1. **Weapon Modal**:
   - Fields: Name, Weight (lbs), Damage Dice (e.g., `1d10`, `2d10`), Properties (e.g. `Finesse, Light`), Cost (optional).
2. **Armor & Shield Modal**:
   - Fields: Name, Type (`Armor` or `Shield`), Weight (lbs), Armor DR (e.g., `2`, `4`, `half_nonmagical`), Attacker Penalty % (e.g., `-10%`), Properties, Cost (optional).
3. **Gear Modal**:
   - Fields: Name, Weight (lbs), Properties / Description, Cost (optional).

### 2.4 Server API & Data Persistence (`server/src/index.js` or `server/src/equipment.js`)
- `GET /api/equipment`: Returns all items from `data/inventory_items.json`.
- `POST /api/equipment` (Requires GM):
  - Validates item structure (name, category, weight, properties).
  - Appends to `data/inventory_items.json`.
  - Emits socket event `equipment:updated` via `io.emit('equipment:updated', updatedList)`.
- `DELETE /api/equipment/:name` (Requires GM):
  - Removes matching item by name from `data/inventory_items.json`.
  - Emits socket event `equipment:updated`.

### 2.5 Tests
- Update/extend `client/test/CharacterSheetsView.test.js` to verify equipment catalog tabs (`All`, `Weapon`, `Armor`, `Gear`), and that `Armor` populates armors and shields, while `Gear` populates kits/gear.
- Update/extend `client/test/AdminView.test.js` to verify User Mgmt card combining create and list, Equipment Management card rendering, and opening of Weapon/Armor/Gear modals.
- Update/extend `server/test/equipment.test.js` to verify `POST /api/equipment` and `DELETE /api/equipment/:name` endpoints.
