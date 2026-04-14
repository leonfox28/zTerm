## ADDED Requirements

### Requirement: Password-like SSH credentials are protected with platform-secure storage
The system MUST use Electron secure credential storage for saved SSH passwords and saved SSH private key passphrases when that capability is available.

#### Scenario: Save password using secure storage
- **WHEN** the user chooses to save an SSH password and secure credential storage is available
- **THEN** the system stores the password in encrypted form before persisting it

#### Scenario: Save passphrase using secure storage
- **WHEN** the user chooses to save a private key passphrase and secure credential storage is available
- **THEN** the system stores the passphrase in encrypted form before persisting it

### Requirement: Private key contents are never stored in the connection record
The system MUST store only the selected private key file path, not the private key file contents, in persisted connection data.

#### Scenario: Save private key authentication settings
- **WHEN** the user saves an SSH connection using private key authentication
- **THEN** the persisted connection data contains the private key path
- **AND** does not contain the private key file contents

### Requirement: Unavailable secure storage is surfaced as a save limitation
The system MUST inform the user when password-like SSH credentials cannot be saved because secure credential storage is unavailable.

#### Scenario: secure storage unavailable while saving password
- **WHEN** the user attempts to save an SSH password or passphrase and secure credential storage is unavailable
- **THEN** the system keeps the connection definition saveable without the credential
- **AND** informs the user that the credential could not be saved securely