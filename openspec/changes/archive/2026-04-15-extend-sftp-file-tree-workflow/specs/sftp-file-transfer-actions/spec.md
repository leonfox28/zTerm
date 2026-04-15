## ADDED Requirements

### Requirement: Users can upload a local file into the current remote directory
The system SHALL allow the user to choose a local file and upload it into the current file tree path for the active SSH connection.

#### Scenario: Upload a file from the remote file tree toolbar
- **WHEN** the user triggers the upload action from the remote file tree toolbar and selects a local file
- **THEN** the system uploads that file into the current file tree path over SFTP
- **AND** the file tree refreshes the current directory after the upload succeeds

#### Scenario: User cancels the upload file picker
- **WHEN** the user triggers the upload action and dismisses the local file picker without selecting a file
- **THEN** the system does not upload anything
- **AND** the current file tree contents remain unchanged

### Requirement: Users can download remote files and folders from the context menu
The system SHALL provide a context menu for remote file and folder entries with a download action.

#### Scenario: Download a remote file
- **WHEN** the user opens the context menu for a remote file entry and selects download
- **THEN** the system prompts for a local destination file path
- **AND** the selected remote file is downloaded over SFTP to that local path

#### Scenario: Download a remote folder
- **WHEN** the user opens the context menu for a remote directory entry and selects download
- **THEN** the system prompts for a local destination directory
- **AND** the selected remote directory is downloaded recursively into that destination

### Requirement: Users can view remote file or folder details from the context menu
The system SHALL provide a context menu action for displaying details about a remote file or folder entry.

#### Scenario: Show details for a remote entry
- **WHEN** the user opens the context menu for a remote file or folder entry and selects the details action
- **THEN** the system displays metadata for that entry including its path, kind, size, and modification time
