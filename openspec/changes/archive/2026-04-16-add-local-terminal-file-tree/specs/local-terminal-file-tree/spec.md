## ADDED Requirements

### Requirement: Auxiliary sidebar shows a local file tree for the active local terminal
The system SHALL display a local file tree in the auxiliary sidebar when the currently active terminal session is a local terminal session, and the tree SHALL be scoped to that session's current local directory path.

#### Scenario: Active tab is a local terminal
- **WHEN** the user activates a terminal tab whose active session is a local terminal session
- **THEN** the auxiliary sidebar shows a local file tree for that session
- **AND** the path display shows the current local file tree path for that session
- **AND** the tree is loaded through local filesystem APIs instead of SFTP APIs

### Requirement: Local file tree can sync with the active local terminal path
The system SHALL allow the local file tree and the active local terminal session to switch to each other's current path.

#### Scenario: User switches the file tree to the terminal current path
- **WHEN** the active local terminal session has a known current working directory and the user triggers the toolbar action to sync the file tree to the terminal path
- **THEN** the system reloads the local file tree using the terminal current working directory as the current file tree path
- **AND** the path display updates to that directory

#### Scenario: User switches the terminal to the current file tree path
- **WHEN** the user triggers the toolbar action to sync the terminal to the current file tree path
- **THEN** the active local terminal session changes its working directory to the current file tree path

### Requirement: Local directories load lazily as the user expands them
The system SHALL load child entries for a local directory only when that directory is expanded, while still treating the file tree path as the current browsing directory.

#### Scenario: Expand a local directory node
- **WHEN** the user expands a directory in the local file tree
- **THEN** the system requests that directory's children from the local filesystem
- **AND** the returned child entries are rendered under that directory node

### Requirement: Users can refresh the current local file tree
The system SHALL provide a directory action toolbar between the current path display and the local file tree for the active local terminal session.

#### Scenario: Toolbar actions are available for the active local terminal
- **WHEN** the auxiliary sidebar is showing the local file tree for the active local terminal session
- **THEN** the UI shows actions for refreshing the current directory, switching the terminal to the current file tree path, and switching the file tree to the terminal's current working directory

### Requirement: Users can navigate to the parent directory from the current local file tree path
The system SHALL render a fixed first row for navigating to the parent directory of the current local file tree path whenever the current local file tree path is not the local filesystem root.

#### Scenario: Current local file tree path has a parent directory
- **WHEN** the current local file tree path is not the local filesystem root
- **THEN** the first row in the file tree is a parent-navigation item
- **AND** selecting it reloads the file tree for the parent directory of the current local file tree path

#### Scenario: Current local file tree path is the local filesystem root
- **WHEN** the current local file tree path is the local filesystem root
- **THEN** the file tree does not render a parent-navigation row

### Requirement: Local filesystem failures are surfaced inside the auxiliary sidebar
The system MUST show a clear error state in the auxiliary sidebar when the local file tree cannot be loaded for the active local terminal session.

#### Scenario: Current local path cannot be read
- **WHEN** the system fails to read the current local directory for the active local terminal session
- **THEN** the auxiliary sidebar shows a visible error message
- **AND** the failure does not mutate terminal tab state or session selection
