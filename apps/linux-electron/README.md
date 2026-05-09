# OS1 Linux Electron Shell

This directory contains the planned OS1 Linux desktop shell.

The Linux shell is Electron-first and uses TypeScript, React, Vite, and xterm.js.

## Chosen stack

```txt
Electron
TypeScript
React
Vite
xterm.js
```

No Tauri.

No Next.js inside the desktop shell. Next.js can be used later for websites, docs, marketing, or hosted dashboards, but the Linux desktop app should stay Vite + React inside Electron.

## Current status

```txt
status: early scaffold
runtime: Electron
language: TypeScript
renderer: React + Vite
terminal: xterm.js planned
packaging target: AppImage first, .deb later
```

Implemented now:

- secure Electron main process defaults
- typed preload bridge
- React renderer shell
- diagnostics page
- local command and credential-presence checks
- credential status bridge
- write-only credential form
- local `0600` credential fallback in Electron `userData`

Not implemented yet:

- Linux Secret Service / libsecret storage
- Orgo key verification
- Orgo login
- workspace/computer listing
- terminal websocket
- SSH target flow
- packaging

## Credential warning

The current credential implementation is a first boundary, not the final Linux security backend.

It keeps raw keys out of the renderer and stores local fallback credentials with restricted file permissions. The final Linux path should use Secret Service / libsecret where available, then keep the local encrypted fallback only for systems without a usable secure store.

## Run locally

From this directory:

```sh
npm install
npm run build
npm start
```

For renderer development:

```sh
npm run dev
```

In another terminal:

```sh
OS1_ELECTRON_DEV=1 npm start
```

## Product target

The Linux shell should preserve the OS1 experience, not become a different product.

Target:

- same OS1 identity
- same visual direction
- same UX discipline
- same Orgo VM flow
- same SSH flow
- same terminal discipline
- same diagnostics and safety model

## Scope for first implementation

The first implementation should prove only the minimum Linux path:

- launch an Electron window on Linux
- show a diagnostics page
- run safe local checks
- verify secure credential storage path
- connect to Orgo API without exposing secrets to the renderer
- list workspaces
- list computers
- open one terminal websocket

## Non-goals for the first implementation

Do not add these in the first pass:

- full voice mode
- shell/admin MCP tool access
- auto-updates
- Flatpak packaging
- Windows packaging
- plugin system
- full macOS feature parity
- Next.js runtime/server model

## Security boundaries

The Electron shell must keep strict boundaries:

- main process owns credentials and remote-control operations
- preload exposes a small typed bridge
- renderer stays UI-only
- renderer must not receive raw API keys or terminal tokens

See:

- [`../../docs/electron-linux-architecture.md`](../../docs/electron-linux-architecture.md)
- [`../../docs/security.md`](../../docs/security.md)
- [`../../docs/diagnostics.md`](../../docs/diagnostics.md)

## Implementation order

1. Add schemas and contracts.
2. Add structured doctor output.
3. Scaffold Electron shell.
4. Add credential storage boundary.
5. Add Orgo workspace discovery.
6. Add terminal proof.
7. Add AppImage packaging.
