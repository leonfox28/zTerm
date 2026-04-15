## 1. Workbench page navigation

- [x] 1.1 Update the Activity Bar to present `Terminal` and `Settings` as top-level items with consistent active-state behavior.
- [x] 1.2 Adjust workbench page state handling so Activity Bar clicks and existing keyboard commands both switch the same top-level page state.
- [x] 1.3 Keep the Terminal workspace mounted while switching pages and verify terminal-only sidebars are shown only on the Terminal page.

## 2. Shared pane shell and workbench chrome cleanup

- [x] 2.1 Extract or consolidate the shared shell structure used by the primary sidebar and auxiliary sidebar for header, title, actions, and content containers.
- [x] 2.2 Refactor `Sidebar` and `AuxiliarySidebar` to use the shared shell while preserving their existing business behavior.
- [x] 2.3 Update workbench styles so the shared shell tokens remain consistent and no duplicate sidebar header/content styling is left behind.

## 3. Settings page VS Code-like layout

- [x] 3.1 Rework `SettingsView` into a VS Code-like settings editor layout with header/search area, left TOC, and right settings content.
- [x] 3.2 Restyle the TOC, typography, spacing, and page framing so the Settings page feels substantially closer to VS Code.
- [x] 3.3 Replace the dominant card-style form presentation with VS Code-like settings rows while preserving the current setting capabilities.

## 4. Validation

- [x] 4.1 Run `npm run lint`.
- [x] 4.2 Run `npx tsc --noEmit`.
- [x] 4.3 Ask the user to run `npm run dev` and verify Terminal page three-column layout, Settings page VS Code-like structure, and Activity Bar page switching manually.
