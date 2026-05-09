# OS1 Core Contracts

This directory is reserved for shared core contracts between platform-specific app shells.

It does not contain executable code yet.

## Purpose

The macOS app and future Electron Linux shell should agree on core behavior before sharing or rewriting implementation details.

Core contracts should define interfaces for:

- Orgo API operations
- SSH target operations
- credential presence and validation
- terminal lifecycle
- diagnostics checks
- safe redaction
- voice/MCP permission state

## Planned contracts

```txt
transport
credentials
diagnostics
terminal
redaction
voice-permissions
```

## Rules

- Keep contracts platform-neutral.
- Keep secrets out of renderer-facing contracts.
- Keep terminal tokens out of logs and UI contracts.
- Separate metadata from secret material.
- Prefer explicit status values over boolean-only state.

## Example boundaries

### Platform shell

Responsible for:

- UI
- native window lifecycle
- platform packaging
- platform-specific credential backend

### Core contracts

Responsible for:

- data shapes
- status values
- error categories
- redaction expectations
- transport lifecycle language

### Provider implementation

Responsible for:

- actual Orgo requests
- SSH process execution
- websocket lifecycle
- agent install calls
- live validation

The contract layer should not directly execute remote commands.
