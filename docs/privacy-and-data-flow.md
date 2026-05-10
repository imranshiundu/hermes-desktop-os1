# Privacy and Data Flow

This document explains what OS1 can access, what it should not access, and how provider keys are handled.

## Current Linux Electron shell

The Linux Electron shell currently has these data flows:

```txt
renderer UI -> preload IPC -> main process -> local credential file / provider API
```

The renderer does not receive raw saved provider keys.

The current Linux shell can ask for:

- Orgo API key
- OpenAI API key placeholder/status

The current Linux shell does not yet use the OpenAI key for live voice or model calls.

## Current provider behavior

### Orgo

Used for:

- verifying provider access
- listing workspaces
- listing computers
- preparing terminal target state later

Current Orgo API routes are conservative guesses until the official production routes are confirmed.

### OpenAI

Currently scaffolded as credential status only.

OpenAI should only be required later for voice/model features. It should not be required to launch OS1 or use basic Orgo/SSH connection features.

## What OS1 must not do

OS1 must not:

- upload files silently
- read arbitrary local files silently
- send clipboard contents without explicit action
- send shell history without explicit action
- send environment variables to providers silently
- send API keys to the renderer
- send API keys to a model
- hide terminal commands from the user
- fake provider success
- fake terminal output

## Local storage

Current Linux credential storage is a first boundary:

- keys are written by the main process
- renderer receives status only
- fallback credential file is stored in Electron `userData`
- fallback file should use `0600` permissions

This is not the final Linux security backend. The production target is Secret Service / libsecret first, with local fallback only when secure storage is unavailable.

## Network requests

The Linux shell should only call configured provider endpoints for user-requested actions.

Current provider calls are made only when the user clicks provider actions such as:

- Verify Orgo
- Load workspaces
- Load computers

The app should not perform background analytics, telemetry, or tracking without explicit documentation and consent.

## API key requirement policy

OS1 should not require every key upfront.

Expected key usage:

```txt
Orgo API key: only required for Orgo cloud computer features.
OpenAI API key: only required for OpenAI-backed voice/model features later.
SSH key/passphrase: only required for SSH target features later.
```

A user should still be able to open the app and run local diagnostics without any provider key.

## Contributor checklist

Before adding any new network call, answer:

- What data is sent?
- Which process sends it?
- Is user action required?
- Is the endpoint documented?
- Are secrets redacted from logs?
- Can the app run without this provider?

Before adding any new credential, answer:

- Is it required at startup?
- Can it be optional?
- Is it stored outside the renderer?
- Is it shown only as present/missing?
- Is there a delete path?

## Current audit conclusion

Based on the current Linux Electron scaffold, OS1 is not designed as spyware. It is a remote-control desktop shell, so it is sensitive by nature, but the current code direction keeps provider keys behind the main process and avoids fake background behavior.

The main risks to fix before production are:

- replace local credential fallback with Secret Service / libsecret
- confirm and document official Orgo routes
- ensure terminal tokens are never exposed to the renderer
- add copy-safe diagnostics redaction
- keep OpenAI key optional and only for AI/voice features
- block silent file upload and silent command execution
