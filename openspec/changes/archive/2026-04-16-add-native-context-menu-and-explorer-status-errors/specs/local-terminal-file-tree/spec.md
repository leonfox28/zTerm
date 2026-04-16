## MODIFIED Requirements

### Requirement: Local filesystem failures are surfaced inside the auxiliary sidebar
The system MUST keep the local file tree visible for the active local terminal session when a directory read or related Explorer action fails, and it MUST surface the failure in the workbench StatusBar instead of replacing the file tree area with an inline error message.

#### Scenario: Current local path cannot be read
- **WHEN** the system fails to read the current local directory for the active local terminal session
- **THEN** the auxiliary sidebar keeps the local file tree chrome and current browsing UI available
- **AND** the workbench StatusBar shows a visible error message for the failure
- **AND** the failure does not mutate terminal tab state or session selection

#### Scenario: User hits a permission-denied local directory
- **WHEN** the user navigates to or expands a local directory that cannot be read because of filesystem permissions
- **THEN** the workbench StatusBar shows a permission-related error message
- **AND** the auxiliary sidebar does not replace the entire file tree with an error panel
- **AND** the user can continue navigating to other directories
