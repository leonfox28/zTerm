# ssh-connection-ui Specification

## Purpose
Define the workbench UI flow for creating, editing, validating, and launching saved SSH connections.

## Requirements
### Requirement: Users can create and edit SSH connections from the workbench UI
The system SHALL provide a workbench UI flow for creating and editing SSH connection definitions without requiring direct file editing.

#### Scenario: Open new SSH connection form
- **WHEN** the user chooses to create a new SSH connection from the connections area
- **THEN** the workbench displays an SSH connection form in the main work area

#### Scenario: Open edit flow for an existing SSH connection
- **WHEN** the user chooses to edit a saved SSH connection
- **THEN** the workbench displays that connection's saved values in an editable form

### Requirement: SSH connection forms validate required fields before saving
The system MUST prevent saving an SSH connection when required fields for the selected authentication mode are missing.

#### Scenario: Missing host blocks save
- **WHEN** the user attempts to save an SSH connection without a host value
- **THEN** the system rejects the save action
- **AND** the form shows which field must be completed

#### Scenario: Private key auth requires a key path
- **WHEN** the user selects private key authentication and attempts to save without a private key path
- **THEN** the system rejects the save action
- **AND** the form shows that the private key path is required

### Requirement: Users can initiate SSH connections from the connection tree
The system SHALL allow users to start an SSH connection from a saved SSH connection item in the connection tree.

#### Scenario: Start SSH connection from a saved item
- **WHEN** the user activates a saved SSH connection item in the connection tree
- **THEN** the system begins opening an SSH-backed terminal session for that connection
