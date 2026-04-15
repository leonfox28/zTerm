## MODIFIED Requirements

### Requirement: Settings view exposes foundational terminal and appearance settings
The system SHALL provide controls for `fontFamily`, `fontSize`, `shellPath`, `loginShell`, `copyOnSelect`, and `theme` within the Settings view, organized under page-level settings categories.

#### Scenario: Display supported settings controls
- **WHEN** the Settings view is rendered
- **THEN** it shows editable controls for terminal font family, terminal font size, shell path, login shell, copy-on-selection, and theme
- **AND** the theme control offers `Dark+` and `Light+` options
- **AND** the controls are grouped under visible settings categories in the page

## ADDED Requirements

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