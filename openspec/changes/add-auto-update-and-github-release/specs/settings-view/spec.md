## ADDED Requirements

### Requirement: Settings view exposes update controls
The system SHALL provide an `Updates` category in the Settings view for application update actions and status.

#### Scenario: Display update settings category
- **WHEN** the Settings view is rendered
- **THEN** the settings category navigation includes an `Updates` category
- **AND** selecting it shows the current app version and update status

#### Scenario: Check for updates from Settings
- **WHEN** the user selects the `Updates` category
- **AND** activates `Check for Updates`
- **THEN** the Settings view routes the request through the updater preload API
- **AND** the Settings view updates to reflect the latest updater state

#### Scenario: Restart install action is available after download
- **WHEN** an update has been downloaded but not installed
- **THEN** the `Updates` category provides an action to restart and install the update
