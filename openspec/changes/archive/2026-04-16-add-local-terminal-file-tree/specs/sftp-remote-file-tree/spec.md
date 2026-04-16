## MODIFIED Requirements

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
