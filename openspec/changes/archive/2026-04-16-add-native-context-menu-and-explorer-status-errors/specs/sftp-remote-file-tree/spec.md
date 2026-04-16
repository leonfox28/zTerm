## MODIFIED Requirements

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
