# OS1 Linux Electron Shell

This directory is reserved for the planned OS1 Linux desktop shell.

The Linux shell will be Electron-first. It is not implemented yet.

## Current status

```txt
status: planned
runtime: Electron
packaging target: AppImage first, .deb later
```

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
