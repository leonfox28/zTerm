# ssh-connection-management Specification

## Purpose
Define persisted SSH connection records, authentication metadata, folder placement, and their presentation in the connection tree.

## Requirements
### Requirement: SSH connections are persisted as manageable connection records
The system SHALL persist SSH connections as connection records that can be created, updated, deleted, and assigned to a folder.

#### Scenario: Save a new SSH connection
- **WHEN** the user submits a valid new SSH connection form
- **THEN** the system stores a new connection record in the persisted `connections` collection
- **AND** the saved record appears in the connection tree under its selected folder or the root list

#### Scenario: Update an existing SSH connection
- **WHEN** the user saves changes to an existing SSH connection
- **THEN** the persisted connection record is updated
- **AND** the connection tree reflects the latest saved name and placement

#### Scenario: Delete an SSH connection
- **WHEN** the user deletes an existing SSH connection
- **THEN** the system removes that connection record from persisted storage
- **AND** the deleted connection no longer appears in the connection tree

### Requirement: Connection records support password and private key authentication metadata
The system SHALL support SSH connection records containing the metadata required for password-based and private-key-based authentication.

#### Scenario: Save a password-auth connection definition
- **WHEN** the user selects password authentication and saves the connection
- **THEN** the connection record stores the host, port, username, authentication type, and any saved password credential reference

#### Scenario: Save a private-key connection definition
- **WHEN** the user selects private key authentication and saves the connection
- **THEN** the connection record stores the host, port, username, authentication type, private key path, and any saved passphrase credential reference

### Requirement: Sidebar shows connection items separately from the local terminal shortcut
The system SHALL show saved SSH connection items in the connection tree without replacing the existing local terminal entry.

#### Scenario: Render local and SSH entries together
- **WHEN** the connection tree is displayed and saved SSH connections exist
- **THEN** the tree still shows the local terminal shortcut
- **AND** the saved SSH connection items are rendered as separate connection entries
