# settings-view Specification

## Purpose
Define the persistent workbench settings page that edits terminal and appearance settings without destroying active terminal sessions.
## Requirements
### Requirement: Settings view opens in the main workbench area
The system SHALL provide a Settings view inside the main workbench area as one of the two top-level workbench pages, opened from the Activity Bar `Settings` entry without using a modal dialog.

#### Scenario: Open settings from the Activity Bar
- **WHEN** the user activates the `Settings` item in the Activity Bar
- **THEN** the main workbench area displays the Settings view
- **AND** the `Settings` item is shown in its active state

#### Scenario: Return from settings to terminal workspace
- **WHEN** the user activates the `Terminal` item in the Activity Bar
- **THEN** the main workbench area displays the terminal workspace again
- **AND** the `Terminal` item is shown in its active state

### Requirement: Opening settings must not destroy existing terminal sessions
The system MUST keep the terminal workspace mounted while the Settings view is open so that existing PTY-backed terminal sessions remain alive.

#### Scenario: Existing terminal remains alive after opening settings
- **WHEN** at least one terminal session is open and the user opens the Settings view
- **THEN** the existing terminal session remains available after the user returns to the terminal workspace
- **AND** opening the Settings view does not implicitly kill or recreate that PTY session

### Requirement: Settings view exposes foundational terminal and appearance settings
The system SHALL provide controls for `fontFamily`, `fontSize`, `shellPath`, `loginShell`, `copyOnSelect`, and `theme` within the Settings view, organized under page-level settings categories.

#### Scenario: Display supported settings controls
- **WHEN** the Settings view is rendered
- **THEN** it shows editable controls for terminal font family, terminal font size, shell path, login shell, copy-on-selection, and theme
- **AND** the theme control offers `Dark+` and `Light+` options
- **AND** the controls are grouped under visible settings categories in the page

### Requirement: Settings are persisted through the existing settings store
The system SHALL persist Settings view changes into the existing `settings` store schema so the latest values are restored on application restart.

#### Scenario: Persist a changed setting
- **WHEN** the user changes any supported setting in the Settings view
- **THEN** the updated value is written to the persisted `settings` record

#### Scenario: Restore persisted settings on startup
- **WHEN** the application starts and persisted settings exist
- **THEN** the Settings view and runtime behavior initialize from those persisted values

### Requirement: Theme changes apply immediately across the workbench
The system SHALL apply the selected theme immediately after the user changes the theme setting.

#### Scenario: Switch from Dark+ to Light+
- **WHEN** the user changes the theme setting from `dark-plus` to `light-plus`
- **THEN** the workbench UI updates to the Light+ theme without requiring restart

### Requirement: Terminal font settings apply to running terminal instances
The system SHALL apply `fontFamily` and `fontSize` changes to running terminal instances without requiring the user to recreate those terminals.

#### Scenario: Update font size for an open terminal
- **WHEN** the user changes the terminal font size while terminal sessions are already open
- **THEN** the open terminal instances update their rendered font configuration
- **AND** each affected terminal is refit after the configuration change

### Requirement: Shell launch settings apply only to newly created terminals
The system MUST apply `shellPath` and `loginShell` changes only when creating new PTY sessions, leaving existing sessions unchanged.

#### Scenario: Login shell change affects only new terminal
- **WHEN** the user changes the login shell setting after one terminal is already open and then opens a new terminal
- **THEN** the existing terminal keeps its original launch behavior
- **AND** the new terminal uses the updated login shell setting

#### Scenario: Empty shell path falls back to system default shell
- **WHEN** the user leaves the shell path setting empty and opens a new terminal
- **THEN** the new terminal launches with the system default shell

### Requirement: Invalid shell path failures are surfaced in the terminal UI
The system MUST surface terminal creation failures caused by an invalid shell path so the user can understand why the new terminal did not start.

#### Scenario: Shell path points to a non-existent executable
- **WHEN** the user saves an invalid shell path and opens a new terminal
- **THEN** terminal creation returns a failure to the renderer
- **AND** the terminal UI displays a clear failure message instead of failing silently

### Requirement: Settings view uses a VS Code-like settings editor layout
The system SHALL render the Settings view with a VS Code-like settings editor structure that includes a header area, an in-page TOC navigation column on the left, and a settings content column on the right.

#### Scenario: Settings page shows header, TOC, and content
- **WHEN** the Settings view is rendered
- **THEN** the page shows a header area at the top of the settings page
- **AND** the left side shows settings categories for in-page navigation
- **AND** the right side shows the settings controls for the selected category

### Requirement: Settings category navigation is page-internal navigation
The system MUST treat the Settings category list as navigation inside the Settings page rather than as a workbench sidebar part.

#### Scenario: Settings categories do not reopen workbench parts
- **WHEN** the user switches between categories inside the Settings view
- **THEN** the selected category content updates inside the Settings page
- **AND** the workbench does not show the terminal page sidebars as part of that category switch

### Requirement: Settings content uses VS Code-like setting rows
The system SHALL present setting controls in a VS Code-like settings list style with labeled rows, secondary description text, and aligned value controls rather than large form cards being the dominant presentation.

#### Scenario: Settings controls appear as settings rows
- **WHEN** the Settings view is rendered
- **THEN** each setting is shown with a label and secondary description text
- **AND** the control is aligned within a setting row presentation that is visually closer to VS Code than the previous card-style form layout

### Requirement: Terminal clipboard setting defaults to enabled
The system MUST default the terminal copy-on-selection setting to enabled when no persisted override exists.

#### Scenario: Initialize default clipboard setting
- **WHEN** the application starts without a persisted `copyOnSelect` value in settings storage
- **THEN** the Settings view shows the copy-on-selection control as enabled
- **AND** terminal selections immediately copy to the system clipboard by default

#### Scenario: Restore persisted clipboard setting
- **WHEN** the application starts with a persisted `copyOnSelect` value in settings storage
- **THEN** the Settings view reflects that persisted enabled or disabled state
- **AND** terminal copy-on-selection behavior uses the restored setting
