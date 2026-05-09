# Linux Support

OS1 is currently a macOS desktop app that can control Linux machines. It is not yet a Linux desktop app.

This distinction matters:

- **Linux as a target** is supported through Orgo VMs and SSH hosts.
- **Linux as the local desktop OS** is not implemented yet.

## Current support matrix

| Use case | Status | Notes |
| --- | --- | --- |
| Run OS1 on macOS | Supported | Requires macOS 14 or newer. |
| Control an Orgo Linux VM | Supported | The macOS app provisions and controls the VM. |
| Connect to a Linux SSH host | Supported | Requires non-interactive SSH access and `python3`. |
| Run OS1 as a Linux desktop app | Not implemented | Planned as an Electron-based shell. |
| Package OS1 as AppImage | Not implemented | Depends on the Electron shell. |
| Package OS1 as `.deb` | Not implemented | Comes after AppImage. |

## Why Linux desktop is not available yet

The current application is built around macOS-native assumptions:

- SwiftUI and AppKit-style desktop app structure
- macOS app bundle packaging
- macOS signing and designated requirements
- macOS Keychain for stored provider credentials
- Apple-specific build tools such as `xcrun`, `sips`, `iconutil`, `lipo`, and `codesign`
- SwiftTerm integration paths built for the current macOS app surface

Because of that, Linux support should not be treated as a one-line SwiftPM platform change. It needs an explicit desktop path.

## Chosen Linux direction: Electron

The Linux desktop path is **Electron-first**.

The goal is not to replace the macOS Swift app immediately. The goal is to build a Linux shell that can reuse the same product model:

- connection manager
- Orgo workspace and computer picker
- SSH target support
- websocket terminal
- agent install status
- sessions
- files
- skills
- cron jobs
- provider configuration
- diagnostics

## Proposed structure

A future Electron shell can live beside the macOS app instead of forcing both platforms into one UI stack:

```txt
apps/
  macos/
    existing Swift app path, or current root app until reorganized
  linux-electron/
    Electron shell
    renderer UI
    main process
    preload boundary
    Linux packaging scripts
packages/
  core/
    shared API contracts and transport models
  schemas/
    shared request and response schemas
scripts/
  doctor.sh
  build-macos-app.sh
  package-github-release.sh
```

This repo does not need to move everything at once. The first useful step is to document the boundary and add diagnostics.

## Electron packaging target order

1. **Development build**
   - local Electron app
   - direct Orgo API calls
   - terminal connection proof

2. **AppImage**
   - first Linux distribution target
   - easiest broad Linux install story

3. **`.deb` package**
   - Ubuntu/Debian install target
   - useful for production users

4. **Flatpak**
   - optional later target
   - only useful after sandboxing requirements are understood

## Minimum Linux desktop feature set

A first Linux desktop release should not attempt the entire macOS feature set. It should prove the core path:

- save provider/API credentials safely
- list Orgo workspaces
- list Orgo computers
- connect to one computer
- open terminal websocket
- run agent install status check
- show install button when the agent is missing
- support SSH connection records
- show a diagnostics page

Everything else can follow after the terminal and connection model are stable.

## Credential storage

The macOS app currently uses macOS Keychain behavior. Linux needs its own credential layer.

Acceptable Electron/Linux options:

- `keytar` backed by Secret Service / libsecret where available
- encrypted local config as fallback
- environment variables for development only

Secrets must not be stored in plain text project files.

## Diagnostics before porting

Before building the Electron shell, the repo should keep a working preflight script. The script should check:

- operating system
- Swift availability for macOS builds
- Xcode tools on macOS
- `node`
- `npm`
- `npx`
- `git`
- `ssh`
- optional `ORGO_API_KEY`
- optional `OPENAI_API_KEY`

The first version of this check lives in `scripts/doctor.sh`.

## What contributors should avoid

Do not:

- claim the current Swift app runs on Linux
- add fake Linux install instructions
- add AppImage instructions before an Electron app exists
- store API keys in plain text
- mix macOS signing logic into Linux packaging
- make the voice bridge enable shell/admin tools by default

## Good first Linux contributions

- Improve `scripts/doctor.sh`.
- Add Electron architecture notes.
- Add API contract docs for Orgo connection flows.
- Add a credential-store abstraction plan.
- Add screenshots or diagrams for the future Linux flow.
- Add GitHub Actions that validate docs and scripts.

## Current verdict

OS1 is Linux-capable as a controller of Linux machines, but not yet Linux-native as a desktop app.

The correct contribution path is documentation, diagnostics, shared-core planning, then an Electron Linux shell.
