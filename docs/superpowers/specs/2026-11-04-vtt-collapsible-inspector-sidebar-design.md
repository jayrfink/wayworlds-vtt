# Design: Collapsible Top-Docked Inspector Sidebars (RPG VTT & World VTT)

**Date**: 2026-11-04  
**Status**: Approved  

---

## 1. Problem Statement
On the RPG VTT and World VTT, the right-hand Inspector sidebars (Token Inspector on RPG VTT, World Marker Inspector on World VTT) currently feature an `×` close button in their headers. Clicking `×` completely removes the sidebar from the DOM (`v-if="showTokenSidebar"` becomes `false`), forcing the user to return to the top navigation bar to toggle it back open.

The user requested:
> "On the rpg vtt make the Token Inspector collapsable to the top instead of an X to get rid of it. Do the same to the World marker sidebar on the World VTT."

The user approved **Approach 1 (Floating Top-Right Bar)**:
When collapsed, the inspector rolls up into a compact header bar anchored at the top-right corner (`position: absolute; right: 0; top: 0;`), allowing the map canvas underneath to expand to 100% full width for maximum tactical / overland visibility.

---

## 2. Requirements & Behavior

1. **Header Toggle Control**:
   - Replace the static `×` character in `.sidebar-header .close-btn` with a collapsible indicator:
     - `▲` when expanded (title: "Collapse to Top (Roll Up)")
     - `▼` when collapsed (title: "Expand Inspector (Roll Down)")
   - Keep the existing CSS class `.close-btn` and `@click="closeTokenSidebar"` so existing automated unit tests continue to match the element selector.
   - Allow clicking either the collapse button or the `.sidebar-header` bar itself to toggle the collapsed state.

2. **Roll-Up / Collapse Behavior**:
   - Introduce a reactive state `isTokenSidebarRolledUp` in both `RpgVttView.vue` and `WorldVttView.vue`.
   - When `isTokenSidebarRolledUp` is `true`:
     - The `<aside class="token-sidebar">` receives the CSS class `.token-sidebar-rolled-up`.
     - In `.token-sidebar-rolled-up`, the aside is styled as:
       ```css
       .token-sidebar.token-sidebar-rolled-up {
         position: absolute;
         right: 0;
         top: 0;
         height: auto;
         z-index: 10;
         box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
         border-bottom: 1px solid var(--border);
       }
       ```
     - The `.sidebar-content` is hidden (`max-height: 0; opacity: 0; pointer-events: none; overflow: hidden;` with smooth CSS transition, or `v-show="!isTokenSidebarRolledUp"`).
     - Because the collapsed sidebar is positioned absolute, `.vtt-canvas-wrapper` (`flex: 1`) smoothly expands to the full width of `.vtt-body`.
   - When expanded (`isTokenSidebarRolledUp` is `false`):
     - The aside returns to its standard in-flow flex layout (`width: 320px` in RPG VTT / `330px` in World VTT), docking beside the canvas.

3. **Top Navbar Button Coordination**:
   - The `Tokens (N)` (RPG VTT) and `Markers (N)` (World VTT) button in the top navbar:
     - If the sidebar is rolled up: clicking the button expands it down.
     - If the sidebar is fully open: clicking the button rolls it up.
     - Active styling `:class="{ active: showTokenSidebar && !isTokenSidebarRolledUp }"` reflects the open state.

4. **State Persistence**:
   - `isTokenSidebarRolledUp` is persisted in `userState` (`rpgVtt` and `spaceVtt` sections) via `getUserState` and `saveUserState`.
   - Re-opening or refreshing the page retains the user's preferred roll-up state.

5. **Style and Palette Constraints**:
   - Zero raw white declarations (`#fff`, `#ffffff`, `white`, etc.). All colors must use dark UI variables (`var(--bg-secondary)`, `var(--border)`, `var(--theme-bright)`, `#cecece`, `#8b949e`).

---

## 3. Implementation Plan

1. **RpgVttView.vue**:
   - Add `isTokenSidebarRolledUp = ref(initialVttState.isTokenSidebarRolledUp ?? false)`.
   - Include `isTokenSidebarRolledUp` in `initialVttState`, `persistVttStateNow`, and `watch`.
   - Update `toggleTokenSidebar` and `closeTokenSidebar` to handle rolling up/down.
   - Update `.sidebar-header` button to show `isTokenSidebarRolledUp ? '▼' : '▲'`.
   - Add `.token-sidebar-rolled-up` CSS styling.

2. **WorldVttView.vue**:
   - Apply identical state, methods, markup, and CSS styling for the World Marker Inspector.

3. **Verification**:
   - Run Vitest suite (`npm --prefix client test -- --run`).
   - Run production Vite build (`npm --prefix client run build`).
   - Commit and push to `origin/main`.
