# ssh-terminal-sessions Specification

## Purpose
Define SSH-backed terminal sessions within the existing workspace, including I/O forwarding, resize handling, and failure surfacing.

## Requirements
### Requirement: Saved SSH connections can open remote terminal sessions
The system SHALL open a remote terminal session from a saved SSH connection using the existing terminal workspace surface.

#### Scenario: Open SSH-backed terminal tab
- **WHEN** the user activates a valid saved SSH connection item
- **THEN** the system creates a terminal tab backed by an SSH session instead of a local PTY session
- **AND** the remote shell output is rendered in the terminal workspace

### Requirement: SSH terminal sessions forward input, output, and resize events
The system MUST forward terminal input, remote output, and terminal resize events between the renderer terminal instance and the SSH session.

#### Scenario: Send keyboard input to remote shell
- **WHEN** the user types into an active SSH-backed terminal
- **THEN** the system forwards the input to the remote SSH shell session

#### Scenario: Resize remote shell
- **WHEN** the user resizes an SSH-backed terminal pane
- **THEN** the system updates the remote shell dimensions to match the terminal viewport

### Requirement: SSH connection failures are surfaced to the user
The system MUST show a visible failure message when an SSH terminal session cannot be established.

#### Scenario: Authentication failure prevents connection
- **WHEN** the user attempts to open an SSH connection with invalid credentials
- **THEN** the SSH-backed terminal session is not established
- **AND** the terminal UI or workbench UI shows a clear connection failure message
