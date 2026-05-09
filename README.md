# Hermes Desktop - OS1 Edition

> **OS1 by Element Software** · powered by Orgo · forked from Hermes Desktop

A native macOS interface for an AI agent that lives in a cloud computer.
Inspired by *Her* (2013): warm coral on cream, thin type, calm motion.

Provision a cloud computer, hand it to the agent, and stay in one focused workspace: sessions, kanban, files, skills, cron jobs, and a real terminal. The infrastructure is Orgo; the agent on it is Hermes. The product you touch is OS1.

## Platform status

OS1 is currently a **macOS desktop app**. It can connect to and manage Linux cloud computers or Linux SSH hosts, but the local desktop application does not yet ship as a Linux desktop build.

| Platform | Local desktop app | Remote target support | Status |
| --- | --- | --- | --- |
| macOS 14+ | Yes | Yes | Supported |
| Linux VM / cloud computer | No local app | Yes | Supported as a managed target |
| Linux desktop | Not yet | N/A | Roadmap |
| Windows desktop | Not yet | N/A | Not planned yet |

Linux support today means OS1 can provision, install into, and control Linux cloud computers through Orgo, or connect to Linux hosts over SSH. Linux desktop support will be Electron-first because this codebase currently uses macOS-native Swift packaging, signing, app bundle, Keychain, and Apple terminal/UI assumptions.

See [`docs/linux-support.md`](docs/linux-support.md) for the full Linux support plan.

## What you get

- **Cloud computers, end to end**: paste your API key once, pick a workspace, pick a computer or create one, save. The app talks directly to the platform HTTP API and the per-VM websocket terminal. No SSH gateway or helper service on the VM.
- **Linux VM control**: new Orgo computers default to Linux resources and can be managed from the OS1 macOS app.
- **One-click agent install** on a fresh computer. The first time you open the workspace and the agent is not there, the Overview screen surfaces an "Install Hermes Agent" button. About 60–90 seconds later Sessions, Kanban, Files, Skills, and Cron populate.
- **Real interactive shell** over the per-VM terminal websocket. Bytes stream in real time; resize works; output and history reflow cleanly.
- **SSH connections still supported** for hosts you reach over SSH today. Same flow as the upstream Hermes Desktop fork OS1 was built on.
- **Everything else** from the foundation: native Sessions browser with full-text search, Kanban board, file editor with conflict checks, skills viewer, cron job manager, profile-aware paths, English / Simplified Chinese / Russian localization scaffolding.

## Requirements

### Local app

- macOS 14 or newer
- Apple Silicon or Intel Mac
- One of:
  - An **Orgo account** with an API key from [orgo.ai/settings/api-keys](https://www.orgo.ai/settings/api-keys), or
  - A host you already reach with `ssh` from this Mac without interactive prompts

### Remote Linux / SSH targets

For cloud computers, the app handles VM provisioning, agent installation, and the websocket terminal automatically.

For SSH connections, the remote host needs:

- `python3` available on the non-interactive SSH `PATH`
- Hermes already installed
- SSH access that does not require interactive prompts

## Install

Download the latest `OS1.app.zip` from the GitHub Releases page, unzip it, drag `OS1.app` into `/Applications`, and launch.

The build is universal for Apple Silicon and Intel Macs and is ad-hoc signed. On first launch macOS may say it cannot verify the developer. Right-click the app, choose **Open**, and confirm.

## Setup

### Cloud computer recommended

1. Open the **Connections** tab → click **Add Host**.
2. Switch the transport picker to **Orgo VM**.
3. Paste your API key → click **Verify & Save**. The key persists in the macOS Keychain; subsequent connections reuse it.
4. Pick a workspace from the dropdown.
5. Pick a computer, or click **Create new computer…** to spin one up inline. Defaults: Linux, 8 GB RAM, 4 CPU, 50 GB disk.
6. Save → the connection is selectable from the host list.
7. If the agent is not installed on the VM, the **Overview** screen shows an install banner. One click runs the official Hermes Agent installer. You can use the rest of the app while it runs.

### SSH

Add a connection and switch the transport picker to **SSH**. Provide an alias or host, optional user/port, and optional Hermes profile.

## Build from source

```sh
./scripts/build-macos-app.sh
```

The bundle lands at:

```sh
dist/OS1.app
```

Run tests with:

```sh
swift test
```

Or use the repository test wrapper:

```sh
./scripts/run-tests.sh
```

Run preflight checks with:

```sh
./scripts/doctor.sh
```

## Linux desktop roadmap

The current app is not ready to build as a Linux desktop binary. A serious Linux contribution should not pretend otherwise. The practical roadmap is:

1. **Document Linux support clearly**
   - macOS app: supported
   - Linux machines as remote targets: supported
   - Linux desktop app: planned, not implemented

2. **Extract reusable core logic**
   - Orgo API client
   - SSH connection model
   - agent installer flow
   - terminal transport model
   - provider/key configuration model

3. **Add diagnostics before porting**
   - Orgo API key present
   - OpenAI API key present when voice mode is used
   - `npx` available for Orgo MCP bridge
   - SSH reachable
   - remote `python3` reachable
   - Hermes agent installed
   - terminal websocket reachable

4. **Build an Electron Linux shell**
   - Electron for the Linux desktop UI
   - AppImage first for broad Linux distribution
   - `.deb` after AppImage works
   - Flatpak later only if sandboxing becomes useful

5. **Keep platform-specific code explicit**
   - macOS Keychain should stay behind a credential-store abstraction
   - macOS app bundle/signing should stay in macOS packaging scripts
   - Linux packaging should live in separate Electron scripts and CI jobs

## Contribution ideas

Good first contributions:

- Add or improve the `docs/linux-support.md` page.
- Improve the `scripts/doctor.sh` preflight checker.
- Add a diagnostics screen inside the app.
- Improve README platform clarity.
- Add GitHub Actions for tests.
- Add safer voice-mode indicators for active Orgo MCP toolsets.
- Add clear warnings when `shell` or `admin` MCP tools are enabled.

Larger contributions:

- Extract Orgo and SSH logic into a reusable core module.
- Add an interface around credential storage so macOS Keychain is not hardcoded everywhere.
- Start a separate Electron Linux desktop shell after the core module is clean.
- Add AppImage packaging once the Electron shell exists.

See [`docs/contributing.md`](docs/contributing.md) before opening a large platform PR.

## Realtime voice mode

OS1 includes a minimal WebRTC voice mode using OpenAI Realtime calls with `gpt-realtime-2`. The app starts a loopback session endpoint when the boot animation finishes. The bottom-left **Voice** row toggles the live voice connection on or off; there is no separate voice control panel.

The browser surface in the app sends raw SDP to `POST /session`. The Swift endpoint keeps `OPENAI_API_KEY` server-side, forwards the SDP to `https://api.openai.com/v1/realtime/calls`, and uses multipart `FormData` fields named `sdp` and `session`.

Use the **Providers** tab to save an OpenAI key in the macOS Keychain. For local development, `OPENAI_API_KEY` is also supported as a fallback.

Run from source with an environment fallback:

```sh
OPENAI_API_KEY="sk-..." swift run OS1
```

Run the packaged app from a shell with an environment fallback:

```sh
./scripts/build-macos-app.sh
OPENAI_API_KEY="sk-..." ./dist/OS1.app/Contents/MacOS/OS1
```

The packaging script signs ad-hoc with an explicit designated requirement for `com.elementsoftware.os1`, which gives macOS a stable local app identity so privacy grants such as microphone access can survive rebuilds. For a stronger certificate-backed identity, set `OS1_CODESIGN_IDENTITY` / `HERMES_CODESIGN_IDENTITY`, or set `OS1_AUTO_CODESIGN=1` to use the first available `Apple Development` identity.

After the boot animation completes, the hidden WebRTC view requests microphone access, opens the `oai-events` data channel, registers a sample `check_calendar(date, time)` function with `session.update`, and asks the model to greet with `hello, can you hear me?`.

The same voice session also exposes Orgo MCP tools to the model as Realtime function tools. OS1 starts the MCP server locally, reads tools with `tools/list`, registers them with `session.update`, and forwards model tool calls back to `tools/call`; Orgo credentials stay in the Swift app and are never sent to the browser or model.

By default the Realtime voice bridge exposes `core,screen,files`, disables file upload, uses the saved Orgo API key in OS1 or `ORGO_API_KEY` if no key is saved, and passes the active Orgo connection computer ID as `ORGO_DEFAULT_COMPUTER_ID`.

Voice mode runs `npx -y @orgo-ai/mcp` by default. You can override the bridge with:

```sh
OS1_ORGO_MCP_JS_PATH="/absolute/path/to/dist/index.js"
OS1_ORGO_MCP_PACKAGE="@orgo-ai/mcp"
OS1_REALTIME_ORGO_TOOLSETS="core,screen,files"
OS1_REALTIME_ORGO_DISABLED_TOOLS="orgo_upload_file"
OS1_REALTIME_ORGO_READ_ONLY="true"
```

`shell` and `admin` are opt-in through `OS1_REALTIME_ORGO_TOOLSETS`. Only enable them for agents and computers you are comfortable letting a voice model operate.

Live integration tests skipped by default hit a real cloud computer:

```sh
ORGO_LIVE_TESTS=1 \
ORGO_API_KEY="sk_live_..." \
ORGO_DEFAULT_COMPUTER_ID="<uuid>" \
swift test --filter OrgoTransportLiveTests
```

## How it routes

For cloud connections:

1. **HTTP ops** (`/bash`, `/exec`) try the platform proxy at `https://www.orgo.ai/api/computers/{id}/...` first. On a 5xx that looks like a routing failure, such as ECONNREFUSED, gateway timeout, or stale port, the transport falls back to the direct VM URL `https://<fly_instance_id>.orgo.dev/...` with the VNC password as bearer. Long-running ops such as the agent installer skip the proxy entirely since its 30s request timeout would always trip first.
2. **Terminal** opens a websocket directly to `wss://<fly_instance_id>.orgo.dev/terminal?token=<vncPassword>`, feeding bytes into SwiftTerm.

VM clock drift, missing system git, and stale apt locks from earlier attempts are handled in the install path so you do not have to wrestle with the VM by hand.

## Acknowledgements

OS1 builds on two layers of generous prior work:

- The original native macOS application code is forked from [dodo-reach/hermes-desktop](https://github.com/dodo-reach/hermes-desktop), the SSH-first companion for the Hermes Agent. The conventions, panels, discovery model, and most of the SSH-side code are that author's design.
- The cloud-computer transport, websocket terminal, agent auto-install, and connection picker were added on top to make OS1 work directly with Orgo VMs.

The visual design language, coral on cream, DM Sans, and OS¹ wordmark are the **Element Software** product theme. See [`OS-1`](https://github.com/nickvasilescu/OS-1) for the canonical palette and motion vocabulary that this app borrows.

License: [MIT](LICENSE). All upstream copyrights are preserved.

## Status

This is an early build. Translation polish, GitHub Pages site, signing/notarization, diagnostics, and Electron-based Linux desktop planning are still in progress. Open issues in this repo for bugs and feature requests.
