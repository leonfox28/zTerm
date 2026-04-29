## ADDED Requirements

### Requirement: Packaged app checks for updates on startup
The system SHALL check for application updates once on every packaged application launch after the main window is created.

#### Scenario: Startup check runs in packaged app
- **WHEN** the user launches a packaged zTerm build
- **THEN** the system starts one update check for that launch
- **AND** the terminal workspace remains usable while the check is running

#### Scenario: Development mode skips real update checks
- **WHEN** zTerm is running in development mode
- **THEN** the system does not perform a real updater network check
- **AND** update state reports that updates are unavailable in development mode

### Requirement: User can manually check for updates
The system SHALL allow the user to manually check for updates from the Settings view.

#### Scenario: Manual check starts from Settings
- **WHEN** the user activates `Check for Updates` in Settings
- **THEN** the system starts an update check unless another check or download is already in progress
- **AND** the Settings view shows that an update check is running

#### Scenario: Manual check reports no update
- **WHEN** the user manually checks for updates and the current version is latest
- **THEN** the Settings view reports that zTerm is up to date
- **AND** no download is started

### Requirement: Update download requires user confirmation
The system MUST ask the user before downloading an available update.

#### Scenario: User accepts available update
- **WHEN** the system detects an update newer than the current app version
- **THEN** the system prompts the user to download and install the update
- **AND** if the user accepts, the system starts downloading the update

#### Scenario: User declines available update
- **WHEN** the system detects an update newer than the current app version
- **AND** the user declines the download prompt
- **THEN** the system does not download the update
- **AND** the current zTerm session continues without interruption

### Requirement: Download progress is visible and non-blocking
The system SHALL expose update download progress while keeping terminal sessions, SSH sessions, and Explorer interactions usable.

#### Scenario: Update is downloading
- **WHEN** an accepted update download is in progress
- **THEN** the Settings view shows download progress or a downloading state
- **AND** existing terminal sessions remain usable

### Requirement: Installing a downloaded update requires restart confirmation
The system MUST ask the user before restarting zTerm to install a downloaded update.

#### Scenario: User restarts to install downloaded update
- **WHEN** an update has finished downloading
- **THEN** the system prompts the user to restart and install the update
- **AND** if the user accepts, the system quits and installs the downloaded update

#### Scenario: User postpones downloaded update
- **WHEN** an update has finished downloading
- **AND** the user declines the restart prompt
- **THEN** zTerm keeps running the current version
- **AND** Settings provides an action to restart and install the downloaded update later

### Requirement: Update errors are visible without blocking work
The system SHALL surface update check and download failures to the user without replacing terminal, SSH, or Explorer content.

#### Scenario: Update check fails
- **WHEN** an update check fails because the update feed cannot be reached
- **THEN** the system displays a non-blocking update error state
- **AND** existing terminal and Explorer workflows remain usable

#### Scenario: Update download fails
- **WHEN** an accepted update download fails
- **THEN** the system displays a non-blocking update error state
- **AND** no install or restart is attempted

### Requirement: Update operations are not duplicated
The system MUST prevent concurrent update checks and downloads from starting duplicate updater operations.

#### Scenario: Manual check during active startup check
- **WHEN** the startup update check is already running
- **AND** the user activates `Check for Updates`
- **THEN** the system keeps the existing check active
- **AND** the Settings view reflects the current updater state

#### Scenario: Manual check during active download
- **WHEN** an update download is already running
- **AND** the user activates `Check for Updates`
- **THEN** the system does not start another check or download
- **AND** the Settings view continues showing the active download state
