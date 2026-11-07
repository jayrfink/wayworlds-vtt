# Design: Rename Rulebooks Tab to Guides

**Date**: 2026-11-07  
**Branch**: `main`  
**Status**: Approved by User  

## 1. Problem Statement
The user requested to rename the "Rulebooks" navigation tab to "Guides" in the top navigation bar.

## 2. Solution Architecture

### 2.1 Navigation Bar (`client/src/components/NavBar.vue`)
- Update `baseTabs`:
  ```javascript
  { path: '/dashboard/rulebooks', label: 'Guides', icon: '📖' }
  ```

### 2.2 Route Meta Title (`client/src/router.js`)
- Update route `meta.title` on `path: 'rulebooks'` from `'Rulebooks'` to `'Guides'`.
- Retain the path `/dashboard/rulebooks` and route name `Rulebooks` to preserve saved user state and avoid broken URLs.

### 2.3 Tests
- Update `client/test/NavBar.test.js` to assert `expect(html).toContain('Guides')`.
- Update `client/test/router.test.js` to assert route `Rulebooks` has meta title `'Guides'`.
