## ADDED Requirements

### Requirement: Auxiliary sidebar shows a remote file tree for the active SSH terminal
The system SHALL display a read-only remote file tree in the auxiliary sidebar when the currently active terminal session is backed by a saved SSH connection.

#### Scenario: Active tab is an SSH terminal
- **WHEN** the user activates a terminal tab whose active session has a saved SSH `connectionId`
- **THEN** the auxiliary sidebar shows the remote file tree for that connection
- **AND** the tree is loaded through SFTP instead of local filesystem APIs

### Requirement: Auxiliary sidebar shows an empty state for local terminals
The system MUST show a non-error empty state when the currently active terminal session is local and has no SSH connection context.

#### Scenario: Active tab is a local terminal
- **WHEN** the user activates a local terminal tab
- **THEN** the auxiliary sidebar does not show a remote file tree
- **AND** it displays an empty state explaining that remote files are only available for SSH terminals

### Requirement: Remote directories load lazily as the user expands them
The system SHALL load child entries for a remote directory only when that directory is expanded.

#### Scenario: Expand a remote directory node
- **WHEN** the user expands a directory in the remote file tree
- **THEN** the system requests that directory's children over SFTP
- **AND** the returned child entries are rendered under that directory node

### Requirement: Users can refresh the current remote file tree
The system SHALL provide a refresh action for the active SSH connection's remote file tree.

#### Scenario: Refresh the remote file tree
- **WHEN** the user triggers the refresh action from the auxiliary sidebar header
- **THEN** the system reloads the remote root for the active SSH connection
- **AND** the auxiliary sidebar updates its displayed entries with the latest result

### Requirement: SFTP failures are surfaced inside the auxiliary sidebar
The system MUST show a clear error state in the auxiliary sidebar when the remote file tree cannot be loaded over SFTP.

#### Scenario: SFTP is unavailable for the selected SSH connection
- **WHEN** the system fails to establish or use an SFTP session for the active SSH connection
- **THEN** the auxiliary sidebar shows a visible error message
- **AND** the failure does not mutate connection tree icons or terminal session state