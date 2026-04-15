## MODIFIED Requirements

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
The system SHALL provide controls for `fontFamily`, `fontSize`, `shellPath`, `loginShell`, and `theme` within the Settings view, organized under page-level settings categories.

#### Scenario: Display supported settings controls
- **WHEN** the Settings view is rendered
- **THEN** it shows editable controls for terminal font family, terminal font size, shell path, login shell, and theme
- **AND** the theme control offers `Dark+` and `Light+` options
- **AND** the controls are grouped under visible settings categories in the page

## ADDED Requirements

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
