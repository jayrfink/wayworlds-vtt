# Collapsible Inspector Sidebars (RPG VTT & World VTT) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Token Inspector in RPG VTT and the World Marker Inspector in World VTT collapsable to the top instead of having an `×` close button that dismisses the sidebar.

**Architecture:** Add `isTokenSidebarRolledUp` state in both `RpgVttView.vue` and `WorldVttView.vue` persisted in `userState`. In the sidebar header, replace the static `×` character with a collapsible `▲` (expanded) / `▼` (collapsed) toggle button. When collapsed, position the sidebar absolute at `top: 0; right: 0;` so the underlying canvas automatically expands to 100% full width, while the header remains readily accessible to roll down.

**Tech Stack:** Vue 3, Pinia, CSS3 Flexbox/Absolute Positioning, Vitest.

## Global Constraints
- Never introduce raw white color declarations (`#ffffff`, `#fff`, `white`, `#f0f6fc`, `#e6edf3`, `#e0e0e0`).
- Maintain documentation integrity and preserve all existing comments and docstrings.
- Ensure all 583 client unit tests pass and Vite build completes cleanly.

---

### Task 1: RPG VTT Token Inspector Collapsible Rollup

**Files:**
- Modify: `client/src/views/RpgVttView.vue`
- Test: `client/test/TokenSidebarPersistence.test.js`

- [ ] **Step 1.1**: Update `RpgVttView.vue` state initialization:
  - Add `isTokenSidebarRolledUp` to `initialVttState` defaults (`isTokenSidebarRolledUp: false`).
  - Declare `const isTokenSidebarRolledUp = ref(Boolean(initialVttState.isTokenSidebarRolledUp));`.
  - Include `isTokenSidebarRolledUp: isTokenSidebarRolledUp.value` in `persistVttStateNow()`.
  - Include `isTokenSidebarRolledUp` in the `watch([..., isTokenSidebarRolledUp], ...)` dependencies.
- [ ] **Step 1.2**: Update toggle and close methods in `RpgVttView.vue`:
  - `toggleTokenSidebar()`: if sidebar is not shown, show it and unroll it. If shown and unrolled, roll it up. If shown and rolled up, unroll it.
  - `closeTokenSidebar()`: toggle `isTokenSidebarRolledUp.value = !isTokenSidebarRolledUp.value`.
  - Add `toggleTokenSidebarRollup()`: toggle `isTokenSidebarRolledUp.value = !isTokenSidebarRolledUp.value`.
- [ ] **Step 1.3**: Update `RpgVttView.vue` template:
  - Add `:class="{ 'token-sidebar-rolled-up': isTokenSidebarRolledUp }"` to `<aside v-if="showTokenSidebar" class="token-sidebar">`.
  - Update `.sidebar-header` button to display `{{ isTokenSidebarRolledUp ? '▼' : '▲' }}` with title/aria-label for collapsing/expanding.
  - Wrap/bind `.sidebar-content` with `v-show="!isTokenSidebarRolledUp"`.
- [ ] **Step 1.4**: Add CSS rules in `RpgVttView.vue`:
  - Style `.token-sidebar.token-sidebar-rolled-up` with `position: absolute; right: 0; top: 0; height: auto; z-index: 10; border-bottom: 1px solid var(--border); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);`.
  - Style `.sidebar-header` cursor and button transitions.
- [ ] **Step 1.5**: Run unit tests and verify:
  - Run `PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --prefix client test -- --run client/test/TokenSidebarPersistence.test.js`.

---

### Task 2: World VTT Marker Inspector Collapsible Rollup

**Files:**
- Modify: `client/src/views/WorldVttView.vue`
- Test: `client/test/TokenSidebarPersistence.test.js`

- [ ] **Step 2.1**: Update `WorldVttView.vue` state initialization:
  - Add `isTokenSidebarRolledUp` to `initialVttState` defaults (`isTokenSidebarRolledUp: false`).
  - Declare `const isTokenSidebarRolledUp = ref(Boolean(initialVttState.isTokenSidebarRolledUp));`.
  - Include `isTokenSidebarRolledUp: isTokenSidebarRolledUp.value` in `persistVttStateNow()`.
  - Include `isTokenSidebarRolledUp` in the `watch([..., isTokenSidebarRolledUp], ...)` dependencies.
- [ ] **Step 2.2**: Update toggle and close methods in `WorldVttView.vue`:
  - `toggleTokenSidebar()`: if sidebar is not shown, show it and unroll it. If shown and unrolled, roll it up. If shown and rolled up, unroll it.
  - `closeTokenSidebar()`: toggle `isTokenSidebarRolledUp.value = !isTokenSidebarRolledUp.value`.
  - Add `toggleTokenSidebarRollup()`: toggle `isTokenSidebarRolledUp.value = !isTokenSidebarRolledUp.value`.
- [ ] **Step 2.3**: Update `WorldVttView.vue` template:
  - Add `:class="{ 'token-sidebar-rolled-up': isTokenSidebarRolledUp }"` to `<aside v-if="showTokenSidebar" class="token-sidebar">`.
  - Update `.sidebar-header` button to display `{{ isTokenSidebarRolledUp ? '▼' : '▲' }}` with title/aria-label for collapsing/expanding.
  - Wrap/bind `.sidebar-content` with `v-show="!isTokenSidebarRolledUp"`.
- [ ] **Step 2.4**: Add CSS rules in `WorldVttView.vue`:
  - Style `.token-sidebar.token-sidebar-rolled-up` with `position: absolute; right: 0; top: 0; height: auto; z-index: 10; border-bottom: 1px solid var(--border); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);`.
- [ ] **Step 2.5**: Run unit tests and verify:
  - Run `PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --prefix client test -- --run client/test/TokenSidebarPersistence.test.js`.

---

### Task 3: Comprehensive Regression Testing, Production Build, and Commit

**Files:**
- Test: All 49 test suites
- Build: Client Vite production bundle

- [ ] **Step 3.1**: Run full test suite:
  - `PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --prefix client test -- --run`
- [ ] **Step 3.2**: Run production build:
  - `PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --prefix client run build`
- [ ] **Step 3.3**: Commit and push:
  - `git commit` and `git push origin main`
