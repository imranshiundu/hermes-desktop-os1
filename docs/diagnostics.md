# Diagnostics

Diagnostics are the first safety layer for OS1. They should tell a user what is ready, what is missing, and what is unsafe before the app tries to control a remote computer.

This document defines the expected checks for the current macOS app and the planned Electron Linux shell.

## Goals

Diagnostics should:

- confirm local runtime readiness
- confirm provider credentials exist
- confirm remote machine access
- confirm Hermes agent status
- confirm terminal transport health
- expose voice/MCP safety state
- avoid leaking secrets into logs or UI

## Non-goals

Diagnostics should not:

- print API keys
- print SSH private keys
- auto-enable dangerous tools
- silently install system packages
- claim Linux desktop support before the Electron shell exists
- modify remote systems unless the user explicitly starts a repair action

## Check levels

Use three levels:

```txt
ok      ready
warn    usable, but incomplete or optional item missing
fail    required item missing or unsafe state detected
```

Warnings should not block documentation or planning work. Failures should block builds, releases, or remote-control flows when the missing item is required.

## Local checks

### All platforms

| Check | Level on failure | Reason |
| --- | --- | --- |
| `git` available | fail | Needed for development and release metadata. |
| `ssh` available | warn | Needed for SSH target support. |
| `node` available | warn | Needed for Electron/Linux planning and MCP tooling. |
| `npm` available | warn | Needed for Electron/Linux planning and MCP tooling. |
| `npx` available | warn | Needed for Orgo MCP voice bridge. |
| repository docs exist | warn | Keeps platform support clear. |

### macOS native app

| Check | Level on failure | Reason |
| --- | --- | --- |
| `swift` available | fail | Needed to build and test the app. |
| `xcrun` available | fail | Needed for macOS build tooling. |
| `xcode-select` available | fail | Needed to locate developer tools. |
| `sips` available | fail | Needed for icon generation. |
| `iconutil` available | fail | Needed for icon packaging. |
| `lipo` available | fail | Needed for universal binary creation. |
| `codesign` available | fail | Needed for bundle signing. |
| `PlistBuddy` available | fail | Needed for bundle metadata stamping. |

### Linux host

Linux hosts should pass docs/script checks, but should warn that the native desktop app is not yet available.

| Check | Level on failure | Reason |
| --- | --- | --- |
| OS is Linux | warn | Valid for docs and future Electron work, not current Swift app packaging. |
| Electron docs mention Electron | fail in CI | Prevents roadmap drift. |
| README/docs mention Tauri as direction | fail in CI | Linux direction is Electron-first. |

## Credential checks

Credentials must only report presence or absence.

| Credential | Required for | Diagnostic behavior |
| --- | --- | --- |
| `ORGO_API_KEY` | Orgo development and live checks | Warn when missing. Never print value. |
| saved Orgo key | normal app use | Show ok/warn only. Never expose value. |
| `OPENAI_API_KEY` | Realtime voice development | Warn when missing if voice mode is enabled. |
| saved OpenAI key | Realtime voice use | Show ok/warn only. Never expose value. |
| `ORGO_DEFAULT_COMPUTER_ID` | live tests / voice context | Warn when missing for live flows. |

## Remote target checks

Remote diagnostics should run only after the user selects a connection.

### Orgo VM

Checks:

- Orgo API key exists
- Orgo API reachable
- workspaces list successfully
- selected workspace exists
- selected computer exists
- computer has routing metadata
- proxy endpoint responds or gives a known recoverable error
- direct VM endpoint is available when needed
- terminal websocket can open
- Hermes agent status can be read

### SSH host

Checks:

- SSH binary exists locally
- host is configured
- port is configured or defaults to `22`
- non-interactive SSH succeeds
- remote `python3` exists
- Hermes agent status can be checked
- terminal/session command path works

## Voice and MCP safety checks

Voice mode can expose tools that affect a real remote machine. Diagnostics must make this visible.

Checks:

- OpenAI key exists when voice mode is enabled
- `npx` exists when using packaged MCP command
- Orgo MCP package or JS path is configured
- enabled toolsets are visible
- disabled tools are visible
- read-only mode is visible
- `shell` toolset shows a strong warning
- `admin` toolset shows a strong warning

Default safe state:

```txt
OS1_REALTIME_ORGO_TOOLSETS=core,screen,files
OS1_REALTIME_ORGO_DISABLED_TOOLS=orgo_upload_file
OS1_REALTIME_ORGO_READ_ONLY=true
```

`shell` and `admin` must remain opt-in.

## UI expectations

A diagnostics screen should show:

- grouped checks
- status per check
- short reason
- suggested fix
- timestamp of last run
- copy-safe report button

The copy-safe report must redact secrets.

Example:

```txt
[ok] macOS host detected
[ok] swift found at /usr/bin/swift
[warn] ORGO_API_KEY is not set
[fail] selected SSH host does not expose python3
```

## Script behavior

`scripts/doctor.sh` is the first command-line implementation.

It should:

- exit `1` when required checks fail
- exit `0` with warnings when optional checks are missing
- work on Linux without pretending the Swift app can build there
- work on macOS for native app checks
- keep output safe to paste into issues

## CI behavior

CI should validate:

- docs exist
- shell scripts parse with `bash -n`
- `scripts/doctor.sh` runs on Ubuntu
- Swift tests run on macOS
- Linux roadmap remains Electron-first

CI should not:

- attempt a Linux desktop build before the Electron shell exists
- require secrets
- run live Orgo tests by default
- run voice integration by default

## Future repair actions

Diagnostics can later offer explicit repair actions, but only with user confirmation.

Possible repair actions:

- open credential setup screen
- install Hermes agent on selected VM
- retry terminal websocket
- refresh Orgo workspace/computer list
- copy safe diagnostic report

Repair actions must not run silently.

## Current status

Implemented:

- `scripts/doctor.sh`
- CI docs/script validation
- macOS Swift test workflow

Planned:

- in-app diagnostics screen
- copy-safe report output
- remote Orgo diagnostics
- remote SSH diagnostics
- voice/MCP safety diagnostics
