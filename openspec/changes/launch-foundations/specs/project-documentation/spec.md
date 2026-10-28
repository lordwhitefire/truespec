## Purpose

Make the repository self-explanatory so a new developer or agent can set up, run, test, deploy and understand TrueSpec without reading months of conversation.

## ADDED Requirements

### Requirement: Root README explains the product and the repo
The repository SHALL contain a root `README.md` that explains what TrueSpec is, the public showroom and private office, the stack, the directory layout, local setup, environment variables, database migrations, seed data, tests, build, deployment, and the main/demo distinction.

#### Scenario: New developer starts from the README
- **WHEN** a developer clones the repository and opens the README
- **THEN** it names the prerequisites, the install command, the required environment variables, the migration and seed commands, the test command and the build command

#### Scenario: README explains the two spaces
- **WHEN** the README describes the office
- **THEN** it explains that main is invited and demo is self-serve, that the showroom is main-only, and that demo data resets

### Requirement: Environment example is checked in and value-free
The repository SHALL contain a `.env.example` that names every environment variable the application, scripts, cron routes and demo reset require, marks each as required or optional, and contains no real secret, token, connection string or key.

#### Scenario: Missing configuration points to the example
- **WHEN** a required environment variable is missing at startup
- **THEN** the error names the missing variable and points to `.env.example` and the README section that explains it

#### Scenario: Example contains no secret values
- **WHEN** `.env.example` is scanned for credentials
- **THEN** every value is empty or an obvious placeholder and no production key or connection string is present

### Requirement: Operational commands are documented
The README or a linked operations document SHALL describe the commands for migrations, seed, backup restore, demo snapshot, leak check, store-freshness check and cleanup readiness, and state which are safe to run against production.

#### Scenario: Operator finds the backup command
- **WHEN** an operator needs to restore a backup
- **THEN** the documented command names the script, the required key and the target, and warns against restoring into main

### Requirement: A developer handover exists
The repository SHALL contain a short handover note covering the current architecture, the OpenSpec change workflow, the main/demo environment model, the deployment shape, known open owner decisions, and where task and test records live.

#### Scenario: Next developer finds the handover
- **WHEN** a new developer opens the handover note
- **THEN** it links to the README, the current OpenSpec changes, the task registry and the deployment configuration without duplicating their full content

### Requirement: User-visible changes are recorded
The repository SHALL maintain a changelog or release note for user-visible and deployment-affecting changes, in reverse chronological order, naming the change and its date.

#### Scenario: A release note exists
- **WHEN** a user-visible or deployment-affecting change is completed
- **THEN** a changelog entry names it and its date
