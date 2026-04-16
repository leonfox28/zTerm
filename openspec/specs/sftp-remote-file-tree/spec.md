# sftp-remote-file-tree Specification

## Purpose
Define the auxiliary sidebar experience for browsing a read-only remote file tree over SFTP for SSH-backed terminal sessions.

## Requirements
### Requirement: Auxiliary sidebar shows a remote file tree for the active SSH terminal
The system SHALL display a remote file tree in the auxiliary sidebar when the currently active terminal session is backed by a saved SSH connection, and the tree SHALL be scoped to the file tree's current directory path.

#### Scenario: Active tab is an SSH terminal
- **WHEN** the user activates a terminal tab whose active session has a saved SSH `connectionId`
- **THEN** the auxiliary sidebar shows the remote file tree for that connection
- **AND** the path display shows the current file tree path for that connection
- **AND** the tree is loaded through SFTP instead of local filesystem APIs

#### Scenario: User switches the file tree to the terminal current path
- **WHEN** the active SSH terminal session has a known current working directory and the user triggers the toolbar action to sync the file tree to the terminal path
- **THEN** the system reloads the remote file tree using the terminal current working directory as the current file tree path
- **AND** the path display updates to that directory

#### Scenario: User switches the terminal to the current file tree path
- **WHEN** the user triggers the toolbar action to sync the terminal to the current file tree path
- **THEN** the active SSH terminal session changes its working directory to the current file tree path

### Requirement: Auxiliary sidebar shows an empty state when no terminal session is active
The system MUST show a non-error empty state when the workbench has no active terminal session context for the auxiliary sidebar.

#### Scenario: No terminal tab is active
- **WHEN** there is no active terminal tab or no active terminal session can be resolved
- **THEN** the auxiliary sidebar does not show a local or remote file tree
- **AND** it displays an empty state explaining that file browsing is available from terminal sessions

### Requirement: Remote directories load lazily as the user expands them
The system SHALL load child entries for a remote directory only when that directory is expanded, while still treating the file tree path as the current browsing directory.

#### Scenario: Expand a remote directory node
- **WHEN** the user expands a directory in the remote file tree
- **THEN** the system requests that directory's children over SFTP
- **AND** the returned child entries are rendered under that directory node

### Requirement: Users can refresh the current remote file tree
The system SHALL provide a directory action toolbar between the current path display and the remote file tree for the active SSH connection.

#### Scenario: Toolbar actions are available for the active SSH terminal
- **WHEN** the auxiliary sidebar is showing the remote file tree for the active SSH terminal
- **THEN** the UI shows actions for refreshing the current directory, switching the terminal to the current file tree path, switching the file tree to the terminal's current working directory, and uploading a file into the current file tree path

### Requirement: SFTP failures are surfaced inside the auxiliary sidebar
The system MUST keep the remote file tree visible when remote directory or file transfer actions fail, and it MUST surface the failure in the workbench StatusBar instead of replacing the file tree area with an inline error message.

#### Scenario: SFTP is unavailable for the selected SSH connection
- **WHEN** the system fails to establish or use an SFTP session for the active SSH connection
- **THEN** the auxiliary sidebar keeps the remote file tree UI available
- **AND** the workbench StatusBar shows a visible error message
- **AND** the failure does not mutate connection tree icons or terminal session state

#### Scenario: Remote file action fails
- **WHEN** the user triggers a remote file download, details lookup, upload, or directory read and that action fails
- **THEN** the workbench StatusBar shows the failure message
- **AND** the auxiliary sidebar does not replace the entire file tree with an error panel
- **AND** the user can continue browsing or retrying other Explorer actions

### Requirement: Users can navigate to the parent directory from the current file tree path
The system SHALL render a fixed first row for navigating to the parent directory of the current file tree path whenever the current file tree path is not the remote filesystem root.

#### Scenario: Current file tree path has a parent directory
- **WHEN** the current file tree path is not `/`
- **THEN** the first row in the file tree is a parent-navigation item
- **AND** selecting it reloads the file tree for the parent directory of the current file tree path

#### Scenario: Current file tree path is the remote filesystem root
- **WHEN** the current file tree path is `/`
- **THEN** the file tree does not render a parent-navigation row
