# settings-view Specification

## Purpose
TBD - created by archiving change migrate-superpowers-to-openspec. Update Purpose after archive.
## Requirements
### Requirement: Settings view opens in the main workbench area
The system SHALL provide a Settings view inside the main workbench area, opened from the Activity Bar gear entry, without using a modal dialog.

#### Scenario: Open settings from the gear entry
- **WHEN** the user activates the gear entry in the Activity Bar
- **THEN** the main workbench area displays the Settings view
- **AND** the gear entry is shown in its active state

#### Scenario: Return from settings to terminal workspace
- **WHEN** the user activates the Settings view's return action
- **THEN** the main workbench area displays the terminal workspace again

### Requirement: Opening settings must not destroy existing terminal sessions
The system MUST keep the terminal workspace mounted while the Settings view is open so that existing PTY-backed terminal sessions remain alive.

#### Scenario: Existing terminal remains alive after opening settings
- **WHEN** at least one terminal session is open and the user opens the Settings view
- **THEN** the existing terminal session remains available after the user returns to the terminal workspace
- **AND** opening the Settings view does not implicitly kill or recreate that PTY session

### Requirement: Settings view exposes foundational terminal and appearance settings
The system SHALL provide controls for `fontFamily`, `fontSize`, `shellPath`, `loginShell`, and `theme` within the Settings view.

#### Scenario: Display supported settings controls
- **WHEN** the Settings view is rendered
- **THEN** it shows editable controls for terminal font family, terminal font size, shell path, login shell, and theme
- **AND** the theme control offers `Dark+` and `Light+` options

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

