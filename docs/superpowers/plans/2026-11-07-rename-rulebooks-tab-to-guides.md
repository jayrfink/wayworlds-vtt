# Rename Rulebooks Tab to Guides Implementation Plan

Update top navigation bar tab label from "Rulebooks" to "Guides" and update route meta title accordingly.

## Proposed Changes

### Client Navigation & Router

#### [NavBar.vue](file:///Users/jrf/wayworlds-vtt/client/src/components/NavBar.vue)
- Update `baseTabs` entry to label `'Guides'`.

#### [router.js](file:///Users/jrf/wayworlds-vtt/client/src/router.js)
- Update `meta.title` of `/dashboard/rulebooks` to `'Guides'`.

### Tests

#### [NavBar.test.js](file:///Users/jrf/wayworlds-vtt/client/test/NavBar.test.js)
- Update assertion to check for `'Guides'`.

#### [router.test.js](file:///Users/jrf/wayworlds-vtt/client/test/router.test.js)
- Update assertion for `Rulebooks` meta title to `'Guides'`.

## Verification Plan

### Automated Tests
1. `npm --prefix client test -- test/NavBar.test.js test/router.test.js`
2. `npm --prefix client test` (all 55 test files, 663+ tests)
3. `npm --prefix client run build`

### Manual Verification
- In the browser at `http://localhost:3001`, confirm "📖 Guides" appears in the top navigation bar.
