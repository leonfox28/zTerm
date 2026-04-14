## ADDED Requirements

### Requirement: Users can create terminals from the keyboard
The system SHALL provide a default keyboard shortcut that creates a new terminal tab from the terminal workspace.

#### Scenario: Create terminal with keyboard shortcut
- **WHEN** the terminal workspace is available and the user presses the default new-terminal shortcut
- **THEN** the system creates a new terminal tab
- **AND** the new tab becomes the active tab

### Requirement: Users can split the active terminal pane from the keyboard
The system SHALL provide default keyboard shortcuts for horizontal and vertical split actions on the active terminal pane.

#### Scenario: Split active pane vertically
- **WHEN** a terminal tab with an active pane exists and the user presses the default vertical split shortcut
- **THEN** the system splits the active pane into a vertical layout
- **AND** the newly created pane becomes available inside the current tab

#### Scenario: Split active pane horizontally
- **WHEN** a terminal tab with an active pane exists and the user presses the default horizontal split shortcut
- **THEN** the system splits the active pane into a horizontal layout
- **AND** the newly created pane becomes available inside the current tab

### Requirement: Users can switch between terminal tabs from the keyboard
The system SHALL provide default keyboard shortcuts to move to the previous and next terminal tabs.

#### Scenario: Move to next tab
- **WHEN** multiple terminal tabs are open and the user presses the default next-tab shortcut
- **THEN** the system activates the tab immediately after the current one
- **AND** wraps to the first tab when the current tab is the last tab

#### Scenario: Move to previous tab
- **WHEN** multiple terminal tabs are open and the user presses the default previous-tab shortcut
- **THEN** the system activates the tab immediately before the current one
- **AND** wraps to the last tab when the current tab is the first tab

### Requirement: Users can close the current terminal tab from the keyboard
The system SHALL provide a default keyboard shortcut that closes the active terminal tab.

#### Scenario: Close active terminal tab
- **WHEN** at least one terminal tab is open and the user presses the default close-tab shortcut
- **THEN** the system closes the active terminal tab
- **AND** activates the appropriate remaining tab using the existing tab removal behavior

### Requirement: Users can switch between terminal workspace and settings from the keyboard
The system SHALL provide default keyboard shortcuts for opening the settings view and returning from settings to the terminal workspace.

#### Scenario: Open settings with keyboard shortcut
- **WHEN** the user presses the default open-settings shortcut
- **THEN** the main workbench area displays the Settings view

#### Scenario: Return to terminal workspace with keyboard shortcut
- **WHEN** the settings view is active and the user presses the default return shortcut
- **THEN** the main workbench area displays the terminal workspace
- **AND** existing terminal sessions remain available after the return