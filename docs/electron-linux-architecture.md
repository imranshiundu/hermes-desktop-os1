# Electron Linux Architecture

This document defines the planned Linux desktop path for OS1.

The current OS1 app is a native macOS Swift application. Linux desktop support should be built as an Electron shell that preserves the same OS1 product behavior, engineering discipline, visual language, and UX. It is not a direct port of the macOS app bundle.

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

## Proposed repository layout

```txt
apps/
  linux-electron/
    package.json
    electron.vite.config.ts
    tsconfig.json
    src/
      main/
        index.ts
        security.ts
        credentials.ts
        orgo-ipc.ts
        ssh-ipc.ts
      preload/
        index.ts
      renderer/
        app.tsx
        routes/
          connections.tsx
          terminal.tsx
          diagnostics.tsx
          files.tsx
          sessions.tsx
        components/
          shell.tsx
          connection-list.tsx
          terminal-view.tsx
          status-pill.tsx
    packaging/
      appimage/
      deb/
packages/
  schemas/
    connection.schema.json
    diagnostics.schema.json
    provider.schema.json
    terminal.schema.json
  core-contracts/
    README.md
```

This layout is a proposal, not a requirement for the current macOS app.

## Process boundaries

Electron should keep strong separation between privileged and unprivileged code.

### Main process

Responsible for:

- credential storage
- Orgo API calls that require secrets
- SSH process management
- terminal websocket lifecycle
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

Preferred order:

1. Secret Service / libsecret through a maintained Electron credential package
2. encrypted local fallback with clear warning
3. environment variables for development only

Secrets that require protection:

- Orgo API key
- OpenAI API key
- saved provider tokens
- SSH key passphrase if this is ever supported

Secrets must not be stored in plain text project files.

## Orgo connection flow

Minimum Linux flow:

1. User opens Connections.
2. User enters Orgo API key.
3. Main process verifies key.
4. Renderer receives only verification status.
5. User selects workspace.
6. User selects or creates computer.
7. App saves connection metadata.
8. Terminal page opens websocket through the main process.
9. Renderer receives terminal stream events.

## SSH flow

Minimum SSH flow:

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

## First implementation milestone

The first Electron milestone should prove only this:

- app launches on Linux
- diagnostics page works
- Orgo key can be saved securely
- workspaces can be listed
- computers can be listed
- terminal websocket can connect to one computer

That is enough to prove the Linux direction without building a fake full product.

## Review checklist for Linux PRs

- [ ] Electron + TypeScript + React + Vite is used for Linux desktop work.
- [ ] Next.js is not introduced into the desktop shell.
- [ ] Tauri is not introduced.
- [ ] Renderer has no raw Node integration.
- [ ] Secrets remain in the main process or credential backend.
- [ ] No fake Linux install claims are added.
- [ ] AppImage is not documented as available before it exists.
- [ ] macOS build scripts are not broken.
- [ ] `scripts/doctor.sh` still passes or explains expected warnings.
