# OS1 Linux Electron Shell

This directory contains the OS1 Linux desktop shell.

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

No Next.js inside the desktop shell. Next.js can still be used later for websites, docs, marketing, or hosted dashboards, but the Linux desktop app should stay Vite + React inside Electron.

## Current status

```txt
status: Linux foundation implemented
runtime: Electron
language: TypeScript
renderer: React + Vite
terminal: scaffolded, real websocket not wired
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
- Orgo key verification route
- Orgo workspace listing route
- Orgo computer listing route
- selected workspace state
- selected computer state
- terminal session contract
- terminal IPC route
- terminal session scaffold UI
- Linux Electron CI build job
- Linux install/build helper script

Not implemented yet:

- Linux Secret Service / libsecret storage
- confirmed production Orgo API route map
- Orgo login flow
- real terminal websocket transport
- xterm.js terminal binding
- SSH target flow
- AppImage packaging
- `.deb` packaging

## Current Linux boundary

The Linux app can launch, render the shell, save provider keys through the main process, verify/list Orgo resources through IPC, select a computer, and prepare a terminal session.

It does not fake terminal access. The Connect button currently returns an honest not-implemented state until the real Orgo websocket route is confirmed.

## Credential warning

The current credential implementation is a first boundary, not the final Linux security backend.

It keeps raw keys out of the renderer and stores local fallback credentials with restricted file permissions. The final Linux path should use Secret Service / libsecret where available, then keep the local encrypted fallback only for systems without a usable secure store.

## Orgo routes

The current implementation tries conservative Orgo API routes:

```txt
/api/workspaces
/api/orgo/workspaces
/api/computers
/api/orgo/computers
/api/workspaces/:workspaceId/computers
/api/orgo/workspaces/:workspaceId/computers
```

If Orgo uses different production routes, the app reports a warning instead of pretending success.

## Install on Linux

From the repository root:

```sh
git clone https://github.com/imranshiundu/hermes-desktop-os1.git
cd hermes-desktop-os1
chmod +x scripts/install-linux-electron.sh
./scripts/install-linux-electron.sh
```

Then run:

```sh
cd apps/linux-electron
npm start
```

Requirements:

```txt
Node.js 22 or newer
npm
Linux desktop session capable of running Electron
```

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

## Scope for first production pass

The next production pass should prove only the minimum live Linux path:

- confirm the real Orgo route map
- verify Orgo key against the official route
- list real workspaces
- list real computers
- open one real terminal websocket
- bind websocket I/O to xterm.js
- disconnect cleanly
- package as AppImage

## Non-goals for the first production pass

Do not add these yet:

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
- terminal output must come from a real transport only
- failed provider calls must stay `warn` or `fail`, never fake success

See:

- [`../../docs/electron-linux-architecture.md`](../../docs/electron-linux-architecture.md)
- [`../../docs/security.md`](../../docs/security.md)
- [`../../docs/diagnostics.md`](../../docs/diagnostics.md)

## Implementation order

1. Confirm CI build.
2. Fix TypeScript/build failures.
3. Confirm Orgo production API routes.
4. Replace conservative route guesses with confirmed routes.
5. Add xterm.js terminal component.
6. Add real terminal websocket in main process.
7. Add AppImage packaging.
