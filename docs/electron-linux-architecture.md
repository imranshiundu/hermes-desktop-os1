# Electron Linux Architecture

This document defines the Linux desktop path for OS1.

The current OS1 app is a native macOS Swift application. Linux desktop support is built as an Electron shell that preserves the same OS1 product behavior, engineering discipline, visual language, and UX. It is not a direct port of the macOS app bundle.

## Chosen stack

The Linux shell stack is:

```txt
Electron
TypeScript
React
Vite
xterm.js for terminal rendering
```

This is the preferred stack because it is lighter and more direct for desktop work than a Next.js-based app shell. Next.js may still be useful for websites, docs, marketing pages, or a hosted web dashboard, but the Linux desktop app should use Vite + React inside Electron.

Do not use Tauri for this project.

## Current implementation

The Linux Electron shell now includes:

- Electron main process
- typed preload bridge
- React renderer shell
- diagnostics panel
- credential status panel
- Orgo verification panel
- Orgo workspace listing panel
- Orgo computer listing panel
- selected workspace state
- selected computer state
- terminal session scaffold
- terminal IPC contract
- Linux Electron CI build job

The terminal websocket is intentionally not wired yet. The app must not display fake terminal output or fake connection success.

## Product parity goal

The Linux shell should not become a separate weak product. It should match OS1 as closely as possible:

- same OS1 identity
- same calm desktop experience
- same connection flow
- same Orgo VM flow
- same SSH flow
- same terminal behavior
- same diagnostics discipline
- same security boundaries
- same safety posture for voice and MCP tools

The first implementation may be smaller, but the target is parity.

## Goals

The Electron Linux shell should make OS1 usable on Linux desktops while preserving the same product model:

- connect to Orgo workspaces
- list cloud computers
- create or select a computer
- connect to terminal websocket
- support SSH hosts
- check Hermes agent status
- install Hermes agent when missing
- browse sessions
- browse files
- view skills
- manage cron jobs
- expose diagnostics
- support voice mode only after safe tool permission controls exist

## Non-goals for the first Linux release

The first Linux shell should not try to match every macOS feature immediately.

Do not include in the first release:

- full voice-mode parity
- shell/admin MCP tools enabled by default
- complex theming system
- plugin marketplace
- auto-update infrastructure
- Flatpak packaging
- Windows packaging
- background daemon model
- Next.js server/runtime assumptions inside the desktop shell

## Repository layout

```txt
apps/
  linux-electron/
    package.json
    index.html
    vite.config.ts
    tsconfig.json
    tsconfig.main.json
    tsconfig.preload.json
    src/
      main/
        index.ts
        diagnostics.ts
        credentials.ts
        orgo.ts
        terminal.ts
      preload/
        index.ts
      renderer/
        App.tsx
        styles.css
        os1-api.d.ts
      shared/
        diagnostics.ts
        credentials.ts
        orgo.ts
        terminal.ts
```

Planned later:

```txt
apps/linux-electron/packaging/appimage
apps/linux-electron/packaging/deb
```

## Process boundaries

Electron should keep strong separation between privileged and unprivileged code.

### Main process

Responsible for:

- credential storage
- Orgo API calls that require secrets
- SSH process management later
- terminal websocket lifecycle later
- filesystem access when needed
- app updates later
- diagnostics execution

### Preload

Responsible for:

- exposing a small typed API to the renderer
- validating IPC payload shapes
- blocking raw Node access from the renderer

### Renderer

Responsible for:

- UI only
- user input
- connection selection
- terminal rendering
- diagnostics display
- sessions/files/skills views

Renderer code must not access Node APIs directly.

## Security rules

Electron settings should follow these defaults:

```txt
nodeIntegration: false
contextIsolation: true
sandbox: true where practical
webSecurity: true
allowRunningInsecureContent: false
```

Do not expose raw secrets to the renderer.

Do not let the renderer execute arbitrary shell commands.

Do not enable voice-mode `shell` or `admin` toolsets by default.

## Credential storage

Linux should use secure OS-backed storage first.

Preferred final order:

1. Secret Service / libsecret through a maintained Electron credential package
2. encrypted local fallback with clear warning
3. environment variables for development only

Current implementation:

1. local `0600` fallback file in Electron `userData`
2. environment variable fallback for development

Current implementation is acceptable only as a first boundary. It is not final secure storage.

Secrets that require protection:

- Orgo API key
- OpenAI API key
- saved provider tokens
- SSH key passphrase if this is ever supported

Secrets must not be stored in plain text project files.

## Orgo connection flow

Current scaffolded flow:

1. User enters Orgo API key.
2. Renderer sends key through preload IPC.
3. Main process stores key.
4. Renderer receives only credential status.
5. User verifies Orgo.
6. Main process tries known Orgo routes.
7. Renderer receives only safe status.
8. User loads workspaces.
9. User selects workspace.
10. User loads computers.
11. User selects computer.
12. Main process prepares terminal session state.

Production flow still needs:

1. confirmed Orgo production routes
2. real terminal websocket route
3. websocket lifecycle in main process
4. xterm.js binding in renderer

## SSH flow

Minimum SSH flow later:

1. User enters host alias, host, port, and optional username.
2. App validates non-interactive SSH access.
3. App checks remote `python3`.
4. App checks Hermes agent status.
5. App stores connection metadata.
6. Terminal opens through a controlled main-process session.

## Terminal model

The terminal renderer should use xterm.js.

Terminal requirements:

- stream bytes in real time
- resize support
- reconnect state
- clear error messages
- no hidden command injection
- explicit confirmation for dangerous actions later

Current terminal behavior:

- selected computer prepares a terminal target
- Connect calls main-process IPC
- main process returns an honest not-implemented state
- no websocket is opened
- no fake terminal output is shown

## Diagnostics page

The Linux shell should include diagnostics before it attempts feature parity.

Checks:

- OS and architecture
- app version
- Electron version
- Node runtime version
- credential backend available
- Orgo key saved
- Orgo API reachable
- OpenAI key saved when voice mode is enabled
- `ssh` available
- selected remote host reachable
- remote `python3` available
- Hermes agent status
- terminal websocket status

## Packaging order

1. Development build
2. AppImage
3. `.deb`
4. Flatpak only if useful later

## First production milestone

The first production Linux milestone should prove only this:

- app launches on Linux
- diagnostics page works
- Orgo key can be saved through the main process
- workspaces can be listed from confirmed Orgo routes
- computers can be listed from confirmed Orgo routes
- terminal websocket can connect to one computer
- terminal stream renders in xterm.js
- disconnect works cleanly

That is enough to prove the Linux direction without building a fake full product.

## Review checklist for Linux PRs

- [ ] Electron + TypeScript + React + Vite is used for Linux desktop work.
- [ ] Next.js is not introduced into the desktop shell.
- [ ] Tauri is not introduced.
- [ ] Renderer has no raw Node integration.
- [ ] Secrets remain in the main process or credential backend.
- [ ] Terminal output comes from a real transport only.
- [ ] No fake Linux install claims are added.
- [ ] AppImage is not documented as available before it exists.
- [ ] macOS build scripts are not broken.
- [ ] `scripts/doctor.sh` still passes or explains expected warnings.
