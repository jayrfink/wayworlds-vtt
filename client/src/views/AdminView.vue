<template>
  <div class="admin-container">
    <header class="admin-header">
      <h2>⚙️ System Administration</h2>
      <p class="subtitle">Manage user accounts, roles, and access permissions.</p>
    </header>

    <!-- Feedback Banners -->
    <div v-if="error" class="alert alert-error">
      <span>{{ error }}</span>
      <button class="alert-close" @click="error = ''">✕</button>
    </div>
    <div v-if="successMessage" class="alert alert-success">
      <span>{{ successMessage }}</span>
      <button class="alert-close" @click="successMessage = ''">✕</button>
    </div>

    <!-- 50/50 Top Row: User Mgmt & Equipment Management -->
    <div class="admin-top-row">
      <!-- 50% Left Card: User Mgmt -->
      <section class="admin-card user-mgmt-card">
        <div class="card-header-row">
          <h3>User Mgmt</h3>
          <button class="btn-secondary" @click="fetchUsers" :disabled="loading">
            {{ loading ? 'Refreshing...' : '↻ Refresh' }}
          </button>
        </div>

        <!-- Inline Create User form -->
        <form class="create-user-form" @submit.prevent="createUser">
          <div class="form-row">
            <div class="form-group">
              <label for="new-username">Username</label>
              <input
                id="new-username"
                v-model.trim="newUsername"
                type="text"
                required
                placeholder="Username"
                autocomplete="off"
              />
            </div>
            <div class="form-group">
              <label for="new-password">Password</label>
              <input
                id="new-password"
                v-model="newPassword"
                type="password"
                minlength="6"
                required
                placeholder="Min 6 chars"
                autocomplete="new-password"
              />
            </div>
            <div class="form-group">
              <label for="new-role">Role</label>
              <select id="new-role" v-model="newRole" class="role-select">
                <option value="Player">Player</option>
                <option value="GameMaster">GameMaster</option>
              </select>
            </div>
            <div class="form-group form-actions-inline">
              <label class="invisible-label">&nbsp;</label>
              <button type="submit" class="primary btn-create-user" :disabled="creating">
                {{ creating ? 'Creating...' : '+ Create' }}
              </button>
            </div>
          </div>
        </form>

        <div v-if="loading && users.length === 0" class="loading-state">
          Loading users...
        </div>
        <div v-else-if="users.length === 0" class="empty-state">
          No users found.
        </div>
        <div v-else class="table-wrapper user-table-wrapper">
          <table class="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th class="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td class="col-id">#{{ user.id }}</td>
                <td class="col-username">
                  <span class="user-name-text">{{ user.username }}</span>
                  <span v-if="user.id === auth.user?.id" class="current-badge">(You)</span>
                </td>
                <td>
                  <span
                    class="role-badge"
                    :class="user.role === 'GameMaster' ? 'gm' : 'player'"
                  >
                    {{ user.role === 'GameMaster' ? 'GM' : 'Player' }}
                  </span>
                </td>
                <td class="actions-cell">
                  <button
                    class="btn-secondary btn-small"
                    title="Reset password for this user"
                    @click="resetPassword(user)"
                  >
                    Reset Password
                  </button>
                  <button
                    class="btn-danger btn-small"
                    :title="user.id === auth.user?.id ? 'Cannot delete your own account' : 'Delete user'"
                    :disabled="user.id === auth.user?.id"
                    @click="deleteUser(user)"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 50% Right Card: Equipment Management -->
      <section class="admin-card equipment-mgmt-card">
        <div class="card-header-row">
          <h3>Equipment Management</h3>
          <div class="header-actions">
            <button class="btn-secondary btn-add-eq" @click="openAddWeaponModal">+ Add Weapon</button>
            <button class="btn-secondary btn-add-eq" @click="openAddArmorModal">+ Add Armor</button>
            <button class="btn-secondary btn-add-eq" @click="openAddGearModal">+ Add Gear</button>
          </div>
        </div>

        <!-- Filter tabs & search -->
        <div class="eq-tabs-search-row">
          <div class="equipment-category-tabs" role="tablist">
            <button
              v-for="cat in equipmentCategories"
              :key="cat"
              type="button"
              role="tab"
              class="cat-tab"
              :class="{ active: (activeEquipmentCategory || 'All') === cat }"
              @click="activeEquipmentCategory = cat"
            >
              {{ cat }} <span class="cat-count">({{ getEquipmentCategoryCount(cat) }})</span>
            </button>
          </div>
          <input
            v-model.trim="equipmentSearchQuery"
            type="text"
            class="search-input eq-search-input"
            placeholder="Search catalog..."
          />
        </div>

        <div v-if="loadingEquipment && equipmentList.length === 0" class="loading-state">
          Loading equipment...
        </div>
        <div v-else-if="filteredEquipmentList.length === 0" class="empty-state">
          {{ equipmentSearchQuery ? 'No matching equipment found.' : 'No equipment in catalog.' }}
        </div>
        <div v-else class="table-wrapper eq-table-wrapper">
          <table class="assets-table equipment-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Weight</th>
                <th>Properties / Capabilities</th>
                <th class="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredEquipmentList" :key="item.name">
                <td class="col-name"><strong>{{ item.name }}</strong></td>
                <td><span class="eq-cat-tag">{{ item.category }}</span></td>
                <td>{{ item.weight_lbs ?? item.weight ?? 0 }} lbs</td>
                <td class="col-props">
                  <span v-if="item.damage_dice" class="stat-pill">{{ item.damage_dice }}</span>
                  <span v-if="item.armor_dr" class="stat-pill">DR: {{ item.armor_dr }}</span>
                  <span v-if="item.attacker_pct_penalty" class="stat-pill">{{ item.attacker_pct_penalty }}%</span>
                  <span>{{ item.properties || item.capabilities || '' }}</span>
                </td>
                <td class="actions-cell">
                  <button
                    class="btn-secondary btn-small"
                    title="Edit item in catalog"
                    @click="openEditEquipmentModal(item)"
                    style="margin-right: 6px;"
                  >
                    Edit
                  </button>
                  <button
                    class="btn-danger btn-small"
                    title="Delete item from catalog"
                    @click="deleteEquipmentItem(item)"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- Uploads & Assets Manager Card -->
    <section class="admin-card">
      <div class="card-header-row">
        <h3>Uploads &amp; Assets Manager</h3>
        <div class="header-actions">
          <button class="btn-secondary" @click="createFolder">
            + New Folder
          </button>
          <button class="btn-secondary" @click="triggerUploadInput" :disabled="uploading">
            {{ uploading ? 'Uploading...' : 'Upload File Here' }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            class="hidden-file-input"
            @change="handleFileUpload"
          />
          <button class="btn-secondary" @click="fetchFiles" :disabled="loadingFiles">
            {{ loadingFiles ? 'Refreshing...' : '↻ Refresh' }}
          </button>
        </div>
      </div>

      <!-- Breadcrumbs Bar -->
      <nav class="breadcrumbs-bar" aria-label="Breadcrumb">
        <span class="breadcrumb-label">Path:</span>
        <ol class="breadcrumbs-list">
          <li v-for="(crumb, idx) in breadcrumbs" :key="crumb.path" class="breadcrumb-item">
            <span v-if="idx > 0" class="breadcrumb-separator">/</span>
            <button
              type="button"
              class="breadcrumb-btn"
              :class="{ active: currentFolder === crumb.path }"
              @click="navigateToFolder(crumb.path)"
            >
              {{ crumb.name }}
            </button>
          </li>
        </ol>
      </nav>

      <!-- Search Row -->
      <div class="search-row">
        <input
          v-model.trim="searchQuery"
          type="text"
          class="search-input token-search-input"
          placeholder="Search files and folders in current directory..."
        />
      </div>

      <div v-if="loadingFiles && files.length === 0" class="loading-state">
        Loading files and folders...
      </div>
      <div
        v-else-if="filteredSubfolders.length === 0 && filteredFiles.length === 0 && !currentFolder"
        class="empty-state"
      >
        {{ searchQuery ? 'No files or folders matching search.' : 'This folder is empty.' }}
      </div>
      <div
        v-else-if="filteredSubfolders.length === 0 && filteredFiles.length === 0 && currentFolder"
        class="table-wrapper assets-table-wrapper"
      >
        <table class="assets-table tokens-table">
          <thead>
            <tr>
              <th class="col-preview">Type</th>
              <th>Name</th>
              <th>Size</th>
              <th>Modified / Items</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr class="folder-row folder-up-row" @click="goUpOneLevel">
              <td class="col-preview"><span class="folder-icon">📁</span></td>
              <td colspan="3" class="col-name">
                <span class="folder-name-link">.. (Go up one level)</span>
              </td>
              <td class="actions-cell">
                <button class="btn-secondary btn-small" @click.stop="goUpOneLevel">
                  Up
                </button>
              </td>
            </tr>
            <tr>
              <td colspan="5" class="empty-state-cell">
                {{ searchQuery ? 'No files or folders matching search.' : 'This folder is empty.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="table-wrapper assets-table-wrapper">
        <table class="assets-table tokens-table">
          <thead>
            <tr>
              <th class="col-preview">Type</th>
              <th>Name</th>
              <th>Size</th>
              <th>Modified / Items</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Up one level row if inside a subfolder -->
            <tr v-if="currentFolder" class="folder-row folder-up-row" @click="goUpOneLevel">
              <td class="col-preview"><span class="folder-icon">📁</span></td>
              <td colspan="3" class="col-name">
                <span class="folder-name-link">.. (Go up one level)</span>
              </td>
              <td class="actions-cell">
                <button class="btn-secondary btn-small" @click.stop="goUpOneLevel">
                  Up
                </button>
              </td>
            </tr>

            <!-- Subfolders -->
            <tr
              v-for="subfolder in filteredSubfolders"
              :key="'folder-' + subfolder.path"
              class="folder-row"
              @click="navigateToFolder(subfolder.path)"
            >
              <td class="col-preview"><span class="folder-icon">📁</span></td>
              <td class="col-name">
                <span class="folder-name-link">{{ subfolder.name }}/</span>
              </td>
              <td class="col-size">
                <span class="asset-meta">—</span>
              </td>
              <td class="col-meta">
                <span class="asset-meta">
                  {{ subfolder.count === 1 ? '1 item' : `${subfolder.count} items` }}
                </span>
              </td>
              <td class="actions-cell">
                <button
                  class="btn-danger btn-small"
                  :disabled="subfolder.count > 0"
                  :title="subfolder.count > 0 ? 'Folder must be empty to delete' : 'Delete folder'"
                  @click.stop="deleteFolder(subfolder)"
                >
                  Delete Folder
                </button>
              </td>
            </tr>

            <!-- Files -->
            <tr v-for="file in filteredFiles" :key="'file-' + file.relativePath" class="file-row">
              <td class="col-preview">
                <img
                  v-if="isImageFile(file.name)"
                  :src="file.url"
                  :alt="file.name"
                  class="file-thumb token-thumb"
                />
                <span v-else class="file-icon">📄</span>
              </td>
              <td class="col-filename">
                <span class="file-name-text token-name-text">{{ file.name }}</span>
              </td>
              <td class="col-size">
                <span class="asset-meta token-meta">{{ formatFileSize(file.size) }}</span>
              </td>
              <td class="col-date">
                <span class="asset-meta token-meta">{{ formatDate(file.mtime) }}</span>
              </td>
              <td class="actions-cell">
                <button
                  class="btn-secondary btn-small"
                  title="Rename file"
                  @click="renameFile(file)"
                >
                  Rename
                </button>
                <button
                  class="btn-secondary btn-small"
                  title="Move file"
                  @click="openMoveModal(file)"
                >
                  Move
                </button>
                <button
                  class="btn-danger btn-small"
                  title="Delete file"
                  @click="deleteFile(file)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Move File Modal -->
    <div v-if="moveModalOpen" class="modal-overlay" @click.self="closeMoveModal">
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="move-modal-title">
        <div class="modal-header">
          <h4 id="move-modal-title">Move File</h4>
          <button class="modal-close" @click="closeMoveModal">✕</button>
        </div>
        <div class="modal-body">
          <p class="move-target-info">
            Moving: <strong class="move-filename">{{ fileToMove?.name }}</strong>
          </p>
          <div class="form-group">
            <label for="move-destination">Destination Folder</label>
            <select
              id="move-destination"
              v-model="destinationFolder"
              class="folder-select role-select"
            >
              <option
                v-for="folder in availableDestinationFolders"
                :key="folder"
                :value="folder"
                :disabled="folder === (fileToMove?.folder || '')"
              >
                {{ folder === '' ? 'Root (uploads/)' : folder }}{{ folder === (fileToMove?.folder || '') ? ' (current)' : '' }}
              </option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary btn-small" @click="closeMoveModal" :disabled="moving">
            Cancel
          </button>
          <button
            class="primary btn-small"
            @click="confirmMove"
            :disabled="moving || (!destinationFolder && destinationFolder !== '') || destinationFolder === (fileToMove?.folder || '')"
          >
            {{ moving ? 'Moving...' : 'Move File' }}
          </button>
        </div>
      </div>
    </div>
    <!-- Add Weapon Modal -->
    <div v-if="showWeaponModal" class="modal-backdrop modal-overlay" @click.self="showWeaponModal = false">
      <div class="modal-card admin-eq-modal" role="dialog" aria-modal="true" aria-labelledby="weapon-modal-title">
        <div class="modal-header">
          <h3 id="weapon-modal-title">Add New Weapon</h3>
          <button class="modal-close-btn" @click="showWeaponModal = false">✕</button>
        </div>
        <form @submit.prevent="saveWeapon" class="modal-form">
          <div class="form-group">
            <label for="wpn-name">Weapon Name *</label>
            <input id="wpn-name" v-model.trim="weaponForm.name" type="text" required placeholder="e.g. War Pick" autofocus />
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="wpn-weight">Weight (lbs) *</label>
              <input id="wpn-weight" v-model.number="weaponForm.weight_lbs" type="number" step="0.1" min="0" required />
            </div>
            <div class="form-group">
              <label for="wpn-dice">Damage Dice *</label>
              <input id="wpn-dice" v-model.trim="weaponForm.damage_dice" type="text" required placeholder="e.g. 2d10 or 1d10" />
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="wpn-cost">Cost (gp)</label>
              <input id="wpn-cost" v-model.number="weaponForm.cost" type="number" min="0" placeholder="Optional" />
            </div>
            <div class="form-group">
              <label for="wpn-props">Properties / Capabilities</label>
              <input id="wpn-props" v-model.trim="weaponForm.properties" type="text" placeholder="e.g. Versatile, Heavy, Reach" />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showWeaponModal = false">Cancel</button>
            <button type="submit" class="primary" :disabled="savingEquipment">
              {{ savingEquipment ? 'Saving...' : 'Add Weapon' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Armor / Shield Modal -->
    <div v-if="showArmorModal" class="modal-backdrop modal-overlay" @click.self="showArmorModal = false">
      <div class="modal-card admin-eq-modal" role="dialog" aria-modal="true" aria-labelledby="armor-modal-title">
        <div class="modal-header">
          <h3 id="armor-modal-title">Add Armor or Shield</h3>
          <button class="modal-close-btn" @click="showArmorModal = false">✕</button>
        </div>
        <form @submit.prevent="saveArmor" class="modal-form">
          <div class="form-row-2">
            <div class="form-group">
              <label for="arm-name">Armor / Shield Name *</label>
              <input id="arm-name" v-model.trim="armorForm.name" type="text" required placeholder="e.g. Splint Armor or Pavise" autofocus />
            </div>
            <div class="form-group">
              <label for="arm-type">Item Type *</label>
              <select id="arm-type" v-model="armorForm.type" class="role-select">
                <option value="Armor">Armor</option>
                <option value="Shield">Shield</option>
              </select>
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="arm-weight">Weight (lbs) *</label>
              <input id="arm-weight" v-model.number="armorForm.weight_lbs" type="number" step="0.1" min="0" required />
            </div>
            <div class="form-group">
              <label for="arm-dr">Armor DR</label>
              <input id="arm-dr" v-model.trim="armorForm.armor_dr" type="text" placeholder="e.g. 4, half_nonmagical, half_all" />
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="arm-penalty">Attacker % Penalty</label>
              <input id="arm-penalty" v-model.number="armorForm.attacker_pct_penalty" type="number" placeholder="e.g. -10" />
            </div>
            <div class="form-group">
              <label for="arm-cost">Cost (gp)</label>
              <input id="arm-cost" v-model.number="armorForm.cost" type="number" min="0" placeholder="Optional" />
            </div>
          </div>
          <div class="form-group">
            <label for="arm-props">Properties / Description</label>
            <input id="arm-props" v-model.trim="armorForm.properties" type="text" placeholder="e.g. -4 any non magical attack" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showArmorModal = false">Cancel</button>
            <button type="submit" class="primary" :disabled="savingEquipment">
              {{ savingEquipment ? 'Saving...' : 'Add Armor' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Gear Modal -->
    <div v-if="showGearModal" class="modal-backdrop modal-overlay" @click.self="showGearModal = false">
      <div class="modal-card admin-eq-modal" role="dialog" aria-modal="true" aria-labelledby="gear-modal-title">
        <div class="modal-header">
          <h3 id="gear-modal-title">Add Gear / Equipment</h3>
          <button class="modal-close-btn" @click="showGearModal = false">✕</button>
        </div>
        <form @submit.prevent="saveGear" class="modal-form">
          <div class="form-row-2">
            <div class="form-group">
              <label for="gear-name">Item Name *</label>
              <input id="gear-name" v-model.trim="gearForm.name" type="text" required placeholder="e.g. Grappling Hook" autofocus />
            </div>
            <div class="form-group">
              <label for="gear-weight">Weight (lbs) *</label>
              <input id="gear-weight" v-model.number="gearForm.weight_lbs" type="number" step="0.1" min="0" required />
            </div>
          </div>
          <div class="form-group">
            <label for="gear-cost">Cost (gp)</label>
            <input id="gear-cost" v-model.number="gearForm.cost" type="number" min="0" placeholder="Optional" />
          </div>
          <div class="form-group">
            <label for="gear-props">Properties / Capabilities *</label>
            <input id="gear-props" v-model.trim="gearForm.properties" type="text" required placeholder="e.g. Iron hook with 50 ft hemp line" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showGearModal = false">Cancel</button>
            <button type="submit" class="primary" :disabled="savingEquipment">
              {{ savingEquipment ? 'Saving...' : 'Add Gear' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Equipment Modal -->
    <div v-if="showEditEquipmentModal" class="modal-backdrop modal-overlay" @click.self="showEditEquipmentModal = false">
      <div class="modal-card admin-eq-modal" role="dialog" aria-modal="true" aria-labelledby="edit-eq-modal-title">
        <div class="modal-header">
          <h3 id="edit-eq-modal-title">Edit Equipment Item</h3>
          <button class="modal-close-btn" @click="showEditEquipmentModal = false">✕</button>
        </div>
        <form @submit.prevent="saveEditEquipment" class="modal-form">
          <div class="form-row-2">
            <div class="form-group">
              <label for="edit-eq-name">Item Name *</label>
              <input id="edit-eq-name" v-model.trim="editEquipmentForm.name" type="text" required placeholder="Item Name" autofocus />
            </div>
            <div class="form-group">
              <label for="edit-eq-cat">Category *</label>
              <select id="edit-eq-cat" v-model="editEquipmentForm.category" required>
                <option value="Weapon">Weapon</option>
                <option value="Armor">Armor</option>
                <option value="Shield">Shield</option>
                <option value="Gear">Gear</option>
                <option value="Kit">Kit</option>
              </select>
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="edit-eq-weight">Weight (lbs) *</label>
              <input id="edit-eq-weight" v-model.number="editEquipmentForm.weight_lbs" type="number" step="0.1" min="0" required />
            </div>
            <div class="form-group">
              <label for="edit-eq-cost">Cost (gp)</label>
              <input id="edit-eq-cost" v-model.number="editEquipmentForm.cost" type="number" min="0" placeholder="Optional" />
            </div>
          </div>
          <div v-if="editEquipmentForm.category === 'Weapon'" class="form-group">
            <label for="edit-eq-damage">Damage Dice</label>
            <input id="edit-eq-damage" v-model.trim="editEquipmentForm.damage_dice" type="text" placeholder="e.g. 2d10 (1H) / 3d10 (2H)" />
          </div>
          <div v-if="editEquipmentForm.category === 'Armor' || editEquipmentForm.category === 'Shield'" class="form-row-2">
            <div class="form-group">
              <label for="edit-eq-dr">Armor DR</label>
              <input id="edit-eq-dr" v-model="editEquipmentForm.armor_dr" type="text" placeholder="e.g. 4 or half_nonmagical" />
            </div>
            <div class="form-group">
              <label for="edit-eq-pen">Attacker % Penalty</label>
              <input id="edit-eq-pen" v-model.number="editEquipmentForm.attacker_pct_penalty" type="number" placeholder="e.g. -10" />
            </div>
          </div>
          <div class="form-group">
            <label for="edit-eq-props">Properties / Capabilities</label>
            <input id="edit-eq-props" v-model.trim="editEquipmentForm.properties" type="text" placeholder="Traits, notes, reach, etc." />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showEditEquipmentModal = false">Cancel</button>
            <button type="submit" class="primary" :disabled="savingEquipment">
              {{ savingEquipment ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { socket } from '../services/socket.js';

const auth = useAuthStore();

// User management state
const users = ref([]);
const loading = ref(false);
const creating = ref(false);
const error = ref('');
const successMessage = ref('');

const newUsername = ref('');
const newPassword = ref('');
const newRole = ref('Player');

// Equipment Management state
const equipmentList = ref([]);
const loadingEquipment = ref(false);
const savingEquipment = ref(false);
const activeEquipmentCategory = ref('All');
const equipmentCategories = ['All', 'Weapon', 'Armor', 'Gear'];
const equipmentSearchQuery = ref('');

// Equipment Modals state
const showWeaponModal = ref(false);
const showArmorModal = ref(false);
const showGearModal = ref(false);
const showEditEquipmentModal = ref(false);
const editingEquipmentOriginalName = ref('');

const editEquipmentForm = ref({
  name: '',
  category: 'Weapon',
  weight_lbs: 1,
  cost: null,
  damage_dice: '',
  armor_dr: '',
  attacker_pct_penalty: null,
  properties: '',
  capabilities: '',
});

const weaponForm = ref({
  name: '',
  weight_lbs: 2,
  damage_dice: '1d10',
  properties: '',
  cost: null,
});

const armorForm = ref({
  name: '',
  type: 'Armor',
  weight_lbs: 10,
  armor_dr: '',
  attacker_pct_penalty: null,
  properties: '',
  cost: null,
});

const gearForm = ref({
  name: '',
  weight_lbs: 1,
  properties: '',
  cost: null,
});

// Uploads & Assets File Manager state
const files = ref([]);
const allFolders = ref([]);
const currentFolder = ref('');
const loadingFiles = ref(false);
const searchQuery = ref('');
const uploading = ref(false);
const fileInputRef = ref(null);

// Move modal state
const moveModalOpen = ref(false);
const fileToMove = ref(null);
const destinationFolder = ref('');
const moving = ref(false);

// Computed breadcrumbs
const breadcrumbs = computed(() => {
  const crumbs = [{ name: 'uploads', path: '' }];
  if (!currentFolder.value) return crumbs;
  const parts = currentFolder.value.split('/').filter(Boolean);
  let cumulative = '';
  for (const part of parts) {
    cumulative = cumulative ? `${cumulative}/${part}` : part;
    crumbs.push({ name: part, path: cumulative });
  }
  return crumbs;
});

// Computed direct subfolders in current folder
const immediateSubfolders = computed(() => {
  const folderSet = new Set(allFolders.value || []);
  (files.value || []).forEach((f) => {
    if (f.folder) folderSet.add(f.folder);
  });

  const currentPrefix = currentFolder.value ? `${currentFolder.value}/` : '';
  const prefixLen = currentPrefix.length;
  const subfolderMap = new Map();

  for (const f of folderSet) {
    if (!f || f === currentFolder.value) continue;
    let immediateName = '';
    let fullSubPath = '';

    if (currentPrefix === '') {
      const slashIdx = f.indexOf('/');
      immediateName = slashIdx === -1 ? f : f.substring(0, slashIdx);
      fullSubPath = immediateName;
    } else if (f.startsWith(currentPrefix)) {
      const remainder = f.slice(prefixLen);
      const slashIdx = remainder.indexOf('/');
      immediateName = slashIdx === -1 ? remainder : remainder.substring(0, slashIdx);
      fullSubPath = `${currentPrefix}${immediateName}`;
    }

    if (immediateName && !subfolderMap.has(fullSubPath)) {
      const fileCount = (files.value || []).filter(
        (file) => file.folder === fullSubPath || (file.folder && file.folder.startsWith(`${fullSubPath}/`))
      ).length;
      const subDirCount = Array.from(folderSet).filter(
        (folder) => folder !== fullSubPath && folder.startsWith(`${fullSubPath}/`)
      ).length;
      const count = fileCount + subDirCount;

      subfolderMap.set(fullSubPath, {
        name: immediateName,
        path: fullSubPath,
        count,
      });
    }
  }

  return Array.from(subfolderMap.values()).sort((a, b) => a.name.localeCompare(b.name));
});

// Filtered subfolders by search query
const filteredSubfolders = computed(() => {
  if (!searchQuery.value) return immediateSubfolders.value;
  const q = searchQuery.value.toLowerCase();
  return immediateSubfolders.value.filter((sub) => sub.name.toLowerCase().includes(q));
});

// Computed direct files in current folder
const currentFiles = computed(() => {
  if (!files.value || !Array.isArray(files.value)) return [];
  const curr = currentFolder.value || '';
  return files.value.filter((file) => (file.folder || '') === curr);
});

// Filtered files by search query
const filteredFiles = computed(() => {
  if (!searchQuery.value) return currentFiles.value;
  const q = searchQuery.value.toLowerCase();
  return currentFiles.value.filter((f) => f.name && f.name.toLowerCase().includes(q));
});

// Available destination folders for move modal
const availableDestinationFolders = computed(() => {
  const set = new Set(allFolders.value || []);
  set.add('');
  (files.value || []).forEach((f) => {
    if (f.folder) set.add(f.folder);
  });
  const arr = Array.from(set);
  return arr.sort((a, b) => {
    if (a === '') return -1;
    if (b === '') return 1;
    return a.localeCompare(b);
  });
});

// Backward compatibility references
const tokens = computed(() => files.value);
const loadingTokens = computed(() => loadingFiles.value);

// Navigation functions
function navigateToFolder(path) {
  currentFolder.value = path || '';
}

function goUpOneLevel() {
  if (!currentFolder.value) return;
  const idx = currentFolder.value.lastIndexOf('/');
  if (idx === -1) {
    currentFolder.value = '';
  } else {
    currentFolder.value = currentFolder.value.slice(0, idx);
  }
}

// User management API functions
async function fetchUsers() {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/auth/users', { credentials: 'include' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to retrieve users');
    }
    users.value = await res.json();
  } catch (err) {
    error.value = err.message || 'Failed to load users';
  } finally {
    loading.value = false;
  }
}

async function createUser() {
  if (!newUsername.value || !newPassword.value) {
    error.value = 'Username and password are required';
    return;
  }
  if (newPassword.value.length < 6) {
    error.value = 'Password must be at least 6 characters';
    return;
  }

  creating.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: newUsername.value,
        password: newPassword.value,
        role: newRole.value,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create user');
    }

    successMessage.value = `User "${data.username}" created successfully as ${data.role}.`;
    newUsername.value = '';
    newPassword.value = '';
    newRole.value = 'Player';
    await fetchUsers();
  } catch (err) {
    error.value = err.message || 'Failed to create user';
  } finally {
    creating.value = false;
  }
}

async function resetPassword(user) {
  const newPass = window.prompt(`Enter new password for "${user.username}" (minimum 6 characters):`);
  if (newPass === null) return;

  if (!newPass || newPass.length < 6) {
    error.value = 'Password must be at least 6 characters';
    return;
  }

  error.value = '';
  successMessage.value = '';

  try {
    const res = await fetch(`/api/auth/users/${user.id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password: newPass }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update password');
    }

    successMessage.value = `Password for user "${user.username}" updated successfully.`;
  } catch (err) {
    error.value = err.message || 'Failed to update password';
  }
}

async function deleteUser(user) {
  if (user.id === auth.user?.id) {
    error.value = 'Cannot delete your own account';
    return;
  }

  if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
    return;
  }

  error.value = '';
  successMessage.value = '';

  try {
    const res = await fetch(`/api/auth/users/${user.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete user');
    }

    successMessage.value = `User "${user.username}" deleted successfully.`;
    users.value = users.value.filter((u) => u.id !== user.id);
  } catch (err) {
    error.value = err.message || 'Failed to delete user';
  }
}

// Equipment Management API & Handlers
function openAddWeaponModal() {
  weaponForm.value = { name: '', weight_lbs: 2, damage_dice: '1d10', properties: '', cost: null };
  showWeaponModal.value = true;
}

function openAddArmorModal() {
  armorForm.value = { name: '', type: 'Armor', weight_lbs: 10, armor_dr: '', attacker_pct_penalty: null, properties: '', cost: null };
  showArmorModal.value = true;
}

function openAddGearModal() {
  gearForm.value = { name: '', weight_lbs: 1, properties: '', cost: null };
  showGearModal.value = true;
}

async function fetchEquipment() {
  loadingEquipment.value = true;
  try {
    const res = await fetch('/api/equipment', { credentials: 'include' });
    if (res.ok) {
      equipmentList.value = await res.json();
    }
  } catch (err) {
    console.error('Error fetching equipment:', err);
  } finally {
    loadingEquipment.value = false;
  }
}

function getEquipmentCategoryCount(cat) {
  if (!equipmentList.value) return 0;
  if (cat === 'All') return equipmentList.value.length;
  if (cat === 'Weapon') return equipmentList.value.filter(i => i.category === 'Weapon').length;
  if (cat === 'Armor') return equipmentList.value.filter(i => i.category === 'Armor' || i.category === 'Shield').length;
  if (cat === 'Gear') return equipmentList.value.filter(i => i.category !== 'Weapon' && i.category !== 'Armor' && i.category !== 'Shield').length;
  return equipmentList.value.filter(i => i.category === cat).length;
}

const filteredEquipmentList = computed(() => {
  if (!equipmentList.value) return [];
  let list = equipmentList.value;
  if (activeEquipmentCategory.value && activeEquipmentCategory.value !== 'All') {
    if (activeEquipmentCategory.value === 'Armor') {
      list = list.filter(i => i.category === 'Armor' || i.category === 'Shield');
    } else if (activeEquipmentCategory.value === 'Gear') {
      list = list.filter(i => i.category !== 'Weapon' && i.category !== 'Armor' && i.category !== 'Shield');
    } else {
      list = list.filter(i => i.category === activeEquipmentCategory.value);
    }
  }
  if (!equipmentSearchQuery.value) return list;
  const q = equipmentSearchQuery.value.toLowerCase().trim();
  return list.filter(i =>
    (i.name && i.name.toLowerCase().includes(q)) ||
    (i.category && i.category.toLowerCase().includes(q)) ||
    (i.properties && i.properties.toLowerCase().includes(q)) ||
    (i.capabilities && i.capabilities.toLowerCase().includes(q))
  );
});

async function saveWeapon() {
  if (!weaponForm.value.name || !weaponForm.value.name.trim()) return;
  savingEquipment.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: weaponForm.value.name,
        category: 'Weapon',
        weight_lbs: weaponForm.value.weight_lbs,
        damage_dice: weaponForm.value.damage_dice,
        properties: weaponForm.value.properties,
        cost: weaponForm.value.cost,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to save weapon');
    successMessage.value = `Weapon "${data.name}" added to equipment catalog.`;
    showWeaponModal.value = false;
    await fetchEquipment();
  } catch (err) {
    error.value = err.message || 'Failed to save weapon';
  } finally {
    savingEquipment.value = false;
  }
}

async function saveArmor() {
  if (!armorForm.value.name || !armorForm.value.name.trim()) return;
  savingEquipment.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: armorForm.value.name,
        category: armorForm.value.type || 'Armor',
        weight_lbs: armorForm.value.weight_lbs,
        armor_dr: armorForm.value.armor_dr,
        attacker_pct_penalty: armorForm.value.attacker_pct_penalty,
        properties: armorForm.value.properties,
        cost: armorForm.value.cost,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to save armor');
    successMessage.value = `${data.category} "${data.name}" added to equipment catalog.`;
    showArmorModal.value = false;
    await fetchEquipment();
  } catch (err) {
    error.value = err.message || 'Failed to save armor';
  } finally {
    savingEquipment.value = false;
  }
}

async function saveGear() {
  if (!gearForm.value.name || !gearForm.value.name.trim()) return;
  savingEquipment.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: gearForm.value.name,
        category: 'Gear',
        weight_lbs: gearForm.value.weight_lbs,
        properties: gearForm.value.properties,
        cost: gearForm.value.cost,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to save gear');
    successMessage.value = `Gear item "${data.name}" added to equipment catalog.`;
    showGearModal.value = false;
    await fetchEquipment();
  } catch (err) {
    error.value = err.message || 'Failed to save gear';
  } finally {
    savingEquipment.value = false;
  }
}

function openEditEquipmentModal(item) {
  editingEquipmentOriginalName.value = item.name;
  editEquipmentForm.value = {
    name: item.name || '',
    category: item.category || 'Gear',
    weight_lbs: item.weight_lbs ?? item.weight ?? 0,
    cost: item.cost ?? null,
    damage_dice: item.damage_dice || '',
    armor_dr: item.armor_dr ?? '',
    attacker_pct_penalty: item.attacker_pct_penalty ?? null,
    properties: item.properties || item.capabilities || '',
    capabilities: item.capabilities || '',
  };
  showEditEquipmentModal.value = true;
}

async function saveEditEquipment() {
  if (!editEquipmentForm.value.name || !editEquipmentForm.value.name.trim()) return;
  savingEquipment.value = true;
  error.value = '';
  try {
    const origName = editingEquipmentOriginalName.value;
    const payload = {
      name: editEquipmentForm.value.name,
      category: editEquipmentForm.value.category,
      weight_lbs: editEquipmentForm.value.weight_lbs,
      cost: editEquipmentForm.value.cost,
      damage_dice: editEquipmentForm.value.damage_dice,
      armor_dr: editEquipmentForm.value.armor_dr,
      attacker_pct_penalty: editEquipmentForm.value.attacker_pct_penalty,
      properties: editEquipmentForm.value.properties,
      capabilities: editEquipmentForm.value.capabilities || (editEquipmentForm.value.damage_dice ? `Damage: ${editEquipmentForm.value.damage_dice} | ${editEquipmentForm.value.properties}` : editEquipmentForm.value.properties),
    };
    const res = await fetch(`/api/equipment/${encodeURIComponent(origName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to update equipment');
    successMessage.value = `Equipment "${data.name}" updated successfully.`;
    showEditEquipmentModal.value = false;
    await fetchEquipment();
  } catch (err) {
    error.value = err.message || 'Failed to update equipment';
  } finally {
    savingEquipment.value = false;
  }
}

async function deleteEquipmentItem(item) {
  if (!window.confirm(`Are you sure you want to delete "${item.name}" from the equipment catalog?`)) {
    return;
  }
  error.value = '';
  try {
    const res = await fetch(`/api/equipment/${encodeURIComponent(item.name)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to delete equipment');
    successMessage.value = `Item "${item.name}" removed from equipment catalog.`;
    await fetchEquipment();
  } catch (err) {
    error.value = err.message || 'Failed to delete equipment';
  }
}

function handleEquipmentUpdated(payload) {
  if (Array.isArray(payload)) {
    equipmentList.value = payload;
  } else {
    fetchEquipment();
  }
}

// Uploads & Assets API functions
async function fetchFiles() {
  loadingFiles.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/upload/files', { credentials: 'include' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to retrieve uploads');
    }
    const data = await res.json();
    files.value = Array.isArray(data.files) ? data.files : [];
    allFolders.value = Array.isArray(data.folders) ? data.folders : [];
  } catch (err) {
    error.value = err.message || 'Failed to load uploads';
  } finally {
    loadingFiles.value = false;
  }
}

const fetchTokens = fetchFiles;

function triggerUploadInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

async function handleFileUpload(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  uploading.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolder.value) {
      formData.append('folder', currentFolder.value);
    }

    const res = await fetch('/api/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload file');
    }

    successMessage.value = `File "${file.name}" uploaded successfully.`;
    await fetchFiles();
  } catch (err) {
    error.value = err.message || 'Failed to upload file';
  } finally {
    uploading.value = false;
    if (event.target) {
      event.target.value = '';
    }
  }
}

async function createFolder() {
  const folderName = window.prompt('Enter new folder name:');
  if (folderName === null) return;
  const trimmed = folderName.trim();
  if (!trimmed) return;

  const targetPath = currentFolder.value ? `${currentFolder.value}/${trimmed}` : trimmed;

  error.value = '';
  successMessage.value = '';
  try {
    const res = await fetch('/api/upload/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ folder: targetPath }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create folder');
    }

    successMessage.value = `Folder "${trimmed}" created successfully.`;
    await fetchFiles();
  } catch (err) {
    error.value = err.message || 'Failed to create folder';
  }
}

async function deleteFolder(folder) {
  if (folder.count > 0) {
    error.value = 'Cannot delete non-empty folder';
    return;
  }

  if (!window.confirm(`Are you sure you want to delete folder "${folder.name}"?`)) {
    return;
  }

  error.value = '';
  successMessage.value = '';
  try {
    const res = await fetch(`/api/upload/folder?folder=${encodeURIComponent(folder.path)}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete folder');
    }

    successMessage.value = `Folder "${folder.name}" deleted successfully.`;
    await fetchFiles();
  } catch (err) {
    error.value = err.message || 'Failed to delete folder';
  }
}

async function renameFile(file) {
  const newName = window.prompt(`Enter new filename for "${file.name}":`, file.name);
  if (newName === null) return;
  const trimmed = newName.trim();
  if (!trimmed || trimmed === file.name) return;

  error.value = '';
  successMessage.value = '';

  try {
    const res = await fetch('/api/upload/rename', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        oldPath: file.relativePath,
        newName: trimmed,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to rename file');
    }

    successMessage.value = `File renamed to "${trimmed}" successfully.`;
    await fetchFiles();
  } catch (err) {
    error.value = err.message || 'Failed to rename file';
  }
}

const renameToken = renameFile;

async function deleteFile(file) {
  if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
    return;
  }

  error.value = '';
  successMessage.value = '';

  try {
    const res = await fetch(`/api/upload/file?path=${encodeURIComponent(file.relativePath)}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete file');
    }

    successMessage.value = `File "${file.name}" deleted successfully.`;
    files.value = files.value.filter((f) => f.relativePath !== file.relativePath);
  } catch (err) {
    error.value = err.message || 'Failed to delete file';
  }
}

const deleteToken = deleteFile;

function openMoveModal(file) {
  fileToMove.value = file;
  const current = file.folder || '';
  const firstValid = availableDestinationFolders.value.find((f) => f !== current);
  destinationFolder.value = firstValid !== undefined ? firstValid : '';
  moveModalOpen.value = true;
}

function closeMoveModal() {
  moveModalOpen.value = false;
  fileToMove.value = null;
  destinationFolder.value = '';
}

async function confirmMove() {
  if (!fileToMove.value) return;
  moving.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    const res = await fetch('/api/upload/move', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        sourcePath: fileToMove.value.relativePath,
        destinationFolder: destinationFolder.value,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to move file');
    }

    successMessage.value = `File "${fileToMove.value.name}" moved successfully.`;
    closeMoveModal();
    await fetchFiles();
  } catch (err) {
    error.value = err.message || 'Failed to move file';
  } finally {
    moving.value = false;
  }
}

function formatFileSize(bytes) {
  if (!bytes || typeof bytes !== 'number') return '0 KB';
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString();
}

function isImageFile(filename) {
  if (!filename) return false;
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(filename);
}

if (getCurrentInstance()) {
  onMounted(() => {
    fetchUsers();
    fetchFiles();
    fetchEquipment();
    socket.on('equipment:updated', handleEquipmentUpdated);
  });

  onUnmounted(() => {
    socket.off('equipment:updated', handleEquipmentUpdated);
  });
}

defineExpose({
  // Uploads File Manager state & methods
  files,
  allFolders,
  currentFolder,
  loadingFiles,
  searchQuery,
  breadcrumbs,
  immediateSubfolders,
  filteredSubfolders,
  currentFiles,
  filteredFiles,
  availableDestinationFolders,
  navigateToFolder,
  goUpOneLevel,
  createFolder,
  deleteFolder,
  renameFile,
  deleteFile,
  openMoveModal,
  closeMoveModal,
  confirmMove,
  moveModalOpen,
  fileToMove,
  destinationFolder,
  moving,
  handleFileUpload,
  triggerUploadInput,
  fetchFiles,
  formatFileSize,
  formatDate,
  isImageFile,

  // Backward compatibility
  tokens,
  loadingTokens,
  tokenSearchQuery: searchQuery,
  filteredTokens: filteredFiles,
  fetchTokens,
  renameToken,
  deleteToken,

  // User Management
  users,
  loading,
  creating,
  newUsername,
  newPassword,
  newRole,
  fetchUsers,
  createUser,
  resetPassword,
  deleteUser,
  error,
  successMessage,

  // Equipment Management
  equipmentList,
  loadingEquipment,
  savingEquipment,
  activeEquipmentCategory,
  equipmentCategories,
  equipmentSearchQuery,
  filteredEquipmentList,
  showWeaponModal,
  showArmorModal,
  showGearModal,
  showEditEquipmentModal,
  editEquipmentForm,
  weaponForm,
  armorForm,
  gearForm,
  openAddWeaponModal,
  openAddArmorModal,
  openAddGearModal,
  openEditEquipmentModal,
  fetchEquipment,
  getEquipmentCategoryCount,
  saveWeapon,
  saveArmor,
  saveGear,
  saveEditEquipment,
  deleteEquipmentItem,
});
</script>

<style scoped>
.admin-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-top-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: stretch;
}

@media (max-width: 1024px) {
  .admin-top-row {
    grid-template-columns: 1fr;
  }
}

.user-mgmt-card,
.equipment-mgmt-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-mgmt-card .create-user-form {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.user-mgmt-card .form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
}

.user-mgmt-card .form-group {
  flex: 1 1 110px;
  min-width: 100px;
}

.user-mgmt-card .form-actions-inline {
  flex: 0 0 auto;
  min-width: auto;
}

.user-mgmt-card .btn-create-user {
  height: 38px;
  padding: 6px 14px;
  white-space: nowrap;
}

.invisible-label {
  visibility: hidden;
}

.user-table-wrapper,
.eq-table-wrapper {
  max-height: 420px;
  overflow-y: auto;
}

.eq-tabs-search-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.equipment-category-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.equipment-category-tabs .cat-tab {
  background: transparent;
  border: 1px solid transparent;
  color: #8b949e;
  padding: 4px 10px;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.equipment-category-tabs .cat-tab:hover {
  color: #cecece;
  background: rgba(200, 200, 200, 0.08);
}

.equipment-category-tabs .cat-tab.active {
  color: var(--theme-bright, #45acba);
  background: var(--theme-surface-active, rgba(69, 172, 186, 0.15));
  border-color: var(--theme-border-subtle, rgba(69, 172, 186, 0.35));
}

.cat-count {
  font-size: 0.72rem;
  opacity: 0.8;
  margin-left: 2px;
}

.eq-search-input {
  flex: 1 1 160px;
  min-width: 140px;
  height: 32px;
  padding: 4px 10px;
  font-size: 0.82rem;
  background: #000000;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: #cecece;
}

.eq-cat-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(200, 200, 200, 0.1);
  color: #cecece;
  border: 1px solid rgba(200, 200, 200, 0.25);
}

.col-props {
  font-size: 0.8rem;
  color: #8b949e;
  line-height: 1.35;
}

.stat-pill {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--theme-surface-active, rgba(56, 189, 248, 0.15));
  color: var(--theme-bright, #38bdf8);
  border: 1px solid var(--theme-border-subtle, rgba(56, 189, 248, 0.3));
  margin-right: 6px;
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.admin-header h2 {
  font-size: 24px;
  margin-bottom: 4px;
  color: #cecece;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.alert {
  padding: 12px 16px;
  border-radius: var(--radius);
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-error {
  background: rgba(248, 81, 73, 0.15);
  border: 1px solid rgba(248, 81, 73, 0.4);
  color: var(--danger);
}

.alert-success {
  background: rgba(63, 185, 80, 0.15);
  border: 1px solid rgba(63, 185, 80, 0.4);
  color: var(--success);
}

.alert-close {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 14px;
  padding: 0 4px;
  cursor: pointer;
}

.admin-card {
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  box-shadow: var(--theme-glow-subtle, 0 0 6px rgba(192, 192, 192, 0.3));
  border-radius: 8px;
  padding: 20px;
}

.admin-card h3 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #cecece;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.card-header-row h3 {
  margin-bottom: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.hidden-file-input {
  display: none;
}

.breadcrumbs-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  background: rgba(0, 0, 0, 0.35);
  padding: 8px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.breadcrumb-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.breadcrumbs-list {
  display: flex;
  align-items: center;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.breadcrumb-separator {
  color: var(--text-secondary);
  font-size: 13px;
  user-select: none;
}

.breadcrumb-btn {
  background: transparent;
  border: none;
  color: aqua;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: inherit;
  transition: background 0.15s ease-in-out;
}

.breadcrumb-btn:hover:not(.active) {
  text-decoration: underline;
  background: rgba(0, 255, 255, 0.1);
}

.breadcrumb-btn.active {
  font-weight: 700;
  color: #cecece;
  cursor: default;
  text-decoration: none;
}

.create-user-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 140px;
  gap: 12px;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
}

.role-select,
.role-select option {
  background-color: #000000 !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
}

.role-select {
  border: 1px solid #cecece !important;
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 14px;
  height: 38px;
}

.role-select:focus {
  outline: none;
  border-color: #cecece !important;
  box-shadow: 0 0 8px rgba(206, 206, 206, 0.5);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.loading-state,
.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.table-wrapper {
  overflow-x: auto;
}

.assets-table-wrapper {
  max-height: 520px;
  overflow-y: auto;
  overflow-x: auto;
}

.assets-table-wrapper thead th {
  position: sticky;
  top: 0;
  background: var(--bg-card, #161b22);
  z-index: 2;
  box-shadow: 0 1px 0 var(--border, #30363d);
}

.users-table,
.assets-table,
.tokens-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.users-table th,
.users-table td,
.assets-table th,
.assets-table td,
.tokens-table th,
.tokens-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.users-table th,
.assets-table th,
.tokens-table th {
  color: var(--theme-header-color, var(--theme-bright, #45acba));
  text-shadow: var(--theme-header-glow, none);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.col-id {
  width: 60px;
  color: var(--text-secondary);
  font-family: monospace;
}

.col-username {
  font-weight: 500;
}

.current-badge {
  margin-left: 8px;
  font-size: 11px;
  color: var(--text-secondary);
  font-style: italic;
}

.role-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 12px;
}

.role-badge.gm {
  background: rgba(210, 153, 34, 0.2);
  color: #d29922;
  border: 1px solid rgba(210, 153, 34, 0.4);
}

.role-badge.player {
  background: rgba(63, 185, 80, 0.2);
  color: #3fb950;
  border: 1px solid rgba(63, 185, 80, 0.4);
}

.actions-header {
  text-align: right !important;
}

.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-small {
  padding: 4px 10px;
  font-size: 12px;
}

.btn-secondary {
  background-color: #000000 !important;
  background: #000000 !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  border: 1px solid #cecece !important;
  border-radius: var(--radius);
  font-weight: 600;
  transition: all 0.15s ease-in-out;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #000000 !important;
  background: #000000 !important;
  border-color: #cecece !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  box-shadow: 0 0 8px rgba(206, 206, 206, 0.35);
}

.btn-danger {
  background-color: #340c0e !important;
  color: #f85149 !important;
  -webkit-text-fill-color: #f85149;
  border: 1px solid #da3633 !important;
  border-radius: var(--radius);
  cursor: pointer;
  box-shadow: 0 0 6px rgba(218, 54, 51, 0.25);
  transition: all 0.15s ease-in-out;
}

.btn-danger:hover:not(:disabled) {
  background-color: #4a1316 !important;
  border-color: #ff6b6b !important;
  color: #ff8585 !important;
  -webkit-text-fill-color: #ff8585;
  box-shadow: 0 0 10px rgba(248, 81, 73, 0.45);
}

.search-row {
  margin-bottom: 16px;
}

.search-input,
.token-search-input {
  width: 100%;
  padding: 8px 12px;
  background-color: #000000;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 14px;
  box-sizing: border-box;
}

.search-input:focus,
.token-search-input:focus {
  outline: none;
  border-color: aqua;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.col-preview {
  width: 50px;
  text-align: center;
}

.file-thumb,
.token-thumb {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(0, 255, 255, 0.4);
  background: #000;
  display: block;
  margin: 0 auto;
}

.file-icon {
  font-size: 22px;
  display: block;
  text-align: center;
}

.folder-icon {
  font-size: 20px;
  display: block;
  text-align: center;
}

.folder-row {
  cursor: pointer;
}

.folder-row:hover {
  background-color: rgba(0, 255, 255, 0.04);
}

.folder-name-link {
  color: aqua;
  font-weight: 600;
}

.folder-up-row .folder-name-link {
  color: var(--text-secondary);
}

.folder-row:hover .folder-name-link {
  text-decoration: underline;
}

.file-name-text,
.token-name-text {
  font-weight: 500;
  word-break: break-all;
}

.asset-meta,
.token-meta {
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.empty-state-cell {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
}

/* Modal styles */
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

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid aqua;
  border-radius: 8px;
  width: 440px;
  max-width: 90vw;
  padding: 20px;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.25);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}

.modal-header h4 {
  margin: 0;
  font-size: 18px;
  color: aqua;
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}

.modal-close:hover {
  color: #cecece;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.move-target-info {
  font-size: 14px;
  margin: 0;
}

.move-filename {
  color: aqua;
  word-break: break-all;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
</style>
